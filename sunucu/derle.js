// Yerel derleme ucu: POST /__derle {kart, kod} → {tamam, hex, cikti}
// Kod bu bilgisayardaki arduino-cli ile derlenir (araclar/ klasörü). İnternete bir şey gitmez.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Yalnız bu kartlar derlenir; istemci FQBN gönderemez.
const FQBN = {
  'wokwi-arduino-uno': 'arduino:avr:uno',
  'wokwi-arduino-nano': 'arduino:avr:nano',
};
const ESP32_KARTLARI = new Set(['wokwi-esp32-devkit-v1']);
const EN_BUYUK_GOVDE = 200 * 1024;

// Yorumları ve yazıları ("…", '…', R"(…)") boşlukla değiştir; satır sonları kalır.
// Böylece web sayfası metnindeki "function ad() {" ya da "http://" fonksiyon ya da yorum sanılmaz.
export function kodIskeleti(kod) {
  const bosalt = (parca) => parca.replace(/[^\n]/g, ' ');
  let cikti = '';
  let i = 0;
  while (i < kod.length) {
    const c = kod[i];
    const ham = c === 'R' && !/\w/.test(kod[i - 1] || '') ? /^R"([^()\\\s]{0,16})\(/.exec(kod.slice(i, i + 20)) : null;
    let son;
    if (ham) {
      const kapanis = `)${ham[1]}"`;
      const bit = kod.indexOf(kapanis, i + ham[0].length);
      son = bit < 0 ? kod.length : bit + kapanis.length;
    } else if (c === '/' && kod[i + 1] === '/') {
      const bit = kod.indexOf('\n', i);
      son = bit < 0 ? kod.length : bit;
    } else if (c === '/' && kod[i + 1] === '*') {
      const bit = kod.indexOf('*/', i + 2);
      son = bit < 0 ? kod.length : bit + 2;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < kod.length && kod[j] !== c && kod[j] !== '\n') j += kod[j] === '\\' ? 2 : 1;
      son = Math.min(j + 1, kod.length);
    } else {
      cikti += c;
      i++;
      continue;
    }
    cikti += bosalt(kod.slice(i, son));
    i = son;
  }
  return cikti;
}

// Arduino IDE gibi: dosyada tanımlanan fonksiyonların bildirimlerini başa ekle,
// böylece tanımından önce çağrılan fonksiyon da derlenir.
export function inoDonustur(kod) {
  const ayiklanmis = kodIskeleti(kod);
  const bildirimler = new Set();
  const desen = /^([A-Za-z_][\w:<>*&\s]*?[\s*&])([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{/gm;
  const anahtar = new Set(['if', 'for', 'while', 'switch', 'return', 'else', 'do', 'sizeof', 'catch']);
  let derinlik = 0;
  let son = 0;
  for (const m of ayiklanmis.matchAll(desen)) {
    for (const c of ayiklanmis.slice(son, m.index)) derinlik += c === '{' ? 1 : c === '}' ? -1 : 0;
    son = m.index;
    if (derinlik !== 0 || anahtar.has(m[2]) || /\b(class|struct|enum|namespace|return)\b/.test(m[1])) continue;
    if (m[2] === 'setup' || m[2] === 'loop') continue;
    const varsayilansiz = m[3].replace(/=[^,]*/g, '');
    bildirimler.add(`${m[1].trim()} ${m[2]}(${varsayilansiz});`);
  }
  return ['#include "Arduino.h"', ...bildirimler, '#line 1 "sketch.ino"', kod].join('\n');
}
const SURE_SINIRI_MS = 180_000;

function calistir(komut, argumanlar, ortam) {
  return new Promise((coz) => {
    const cocuk = spawn(komut, argumanlar, { env: { ...process.env, ...ortam }, windowsHide: true });
    let cikti = '';
    cocuk.stdout.on('data', (v) => (cikti += v));
    cocuk.stderr.on('data', (v) => (cikti += v));
    const zaman = setTimeout(() => cocuk.kill(), SURE_SINIRI_MS);
    cocuk.on('close', (kod) => {
      clearTimeout(zaman);
      coz({ kod, cikti });
    });
    cocuk.on('error', (e) => {
      clearTimeout(zaman);
      coz({ kod: -1, cikti: String(e) });
    });
  });
}

export function derlemeUcu(kok) {
  const araclar = join(kok, 'araclar');
  const cli = join(araclar, 'arduino-cli', 'arduino-cli.exe');
  const ortam = {
    ARDUINO_DIRECTORIES_DATA: join(araclar, 'arduino15'),
    ARDUINO_DIRECTORIES_DOWNLOADS: join(araclar, 'arduino15', 'staging'),
    ARDUINO_DIRECTORIES_USER: join(araclar, 'sketchbook'),
  };
  let sira = Promise.resolve();

  const zig = join(araclar, 'zig', 'zig.exe');
  const hal = join(kok, 'esp32-hal');

  async function derleEsp32(kod) {
    if (!existsSync(zig)) return { tamam: false, cikti: "Zig bulunamadı (araclar/zig). README'deki kurulum adımlarına bak." };
    const halDosyalari = (await readdir(hal)).sort();
    let halOzet = '';
    for (const d of halDosyalari) halOzet += d + (await readFile(join(hal, d), 'utf8'));
    const ozet = createHash('sha256').update(['esp32', halOzet, kod].join('\n')).digest('hex').slice(0, 16);
    const klasor = join(araclar, 'derleme', 'esp32-' + ozet);
    const wasmYolu = join(klasor, 'sketch.wasm');
    if (existsSync(wasmYolu)) return { tamam: true, wasm: (await readFile(wasmYolu)).toString('base64'), cikti: 'Önbellekten.' };
    await mkdir(klasor, { recursive: true });
    await writeFile(join(klasor, 'sketch.cpp'), inoDonustur(kod));
    const kaynaklar = halDosyalari.filter((d) => d.endsWith('.cpp')).map((d) => join(hal, d));
    const { kod: cikis, cikti } = await calistir(zig, [
      'c++', '-target', 'wasm32-wasi', '-mexec-model=reactor', '-O2', '-fno-exceptions', '-fno-rtti', '-s',
      '-I', hal, '-o', wasmYolu, ...kaynaklar, join(klasor, 'sketch.cpp'),
    ], {});
    if (cikis !== 0 || !existsSync(wasmYolu)) {
      const eksik = /fatal error: '([^']+)' file not found/.exec(cikti);
      const ek = eksik
        ? `\n\nBu kütüphane ESP32 simülasyonunda yok: ${eksik[1]}. Desteklenen: Arduino.h, Wire, Servo/ESP32Servo, DHT, Adafruit_SSD1306, Adafruit_GFX, SPI.`
        : '';
      return { tamam: false, cikti: cikti.replaceAll(klasor + '\\', '').replaceAll(hal + '\\', '').trim() + ek };
    }
    return { tamam: true, wasm: (await readFile(wasmYolu)).toString('base64'), cikti: 'Derlendi.' };
  }

  async function derle(kart, kod) {
    if (ESP32_KARTLARI.has(kart)) return derleEsp32(kod);
    const fqbn = FQBN[kart];
    if (!fqbn) return { tamam: false, cikti: 'Bu kart için simülasyon yok. Desteklenen: ESP32 DevKit V1, Arduino Uno, Arduino Nano.' };
    if (!existsSync(cli)) return { tamam: false, cikti: 'arduino-cli bulunamadı (araclar/arduino-cli). README\'deki kurulum adımlarına bak.' };
    const ozet = createHash('sha256').update(fqbn + '\n' + kod).digest('hex').slice(0, 16);
    const klasor = join(araclar, 'derleme', ozet);
    const hexYolu = join(klasor, 'cikti', 'sketch.ino.hex');
    if (existsSync(hexYolu)) return { tamam: true, hex: await readFile(hexYolu, 'utf8'), cikti: 'Önbellekten.' };
    await mkdir(join(klasor, 'sketch'), { recursive: true });
    await writeFile(join(klasor, 'sketch', 'sketch.ino'), kod);
    const { kod: cikis, cikti } = await calistir(cli, ['compile', '--fqbn', fqbn, '--output-dir', join(klasor, 'cikti'), join(klasor, 'sketch')], ortam);
    if (cikis !== 0 || !existsSync(hexYolu)) {
      return { tamam: false, cikti: cikti.replaceAll(join(klasor, 'sketch') + '\\', '').trim() };
    }
    return { tamam: true, hex: await readFile(hexYolu, 'utf8'), cikti: cikti.trim() };
  }

  return {
    name: 'derleme-ucu',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__derle', (req, res) => {
        if (req.method !== 'POST') return res.writeHead(405).end();
        let govde = '';
        req.on('data', (parca) => {
          govde += parca;
          if (govde.length > EN_BUYUK_GOVDE) req.destroy();
        });
        req.on('end', () => {
          let istek;
          try {
            istek = JSON.parse(govde);
          } catch {
            return res.writeHead(400).end();
          }
          // Aynı anda tek derleme: makineyi yormasın.
          sira = sira.then(() => derle(String(istek.kart), String(istek.kod || ''))).then(
            (sonuc) => res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(sonuc)),
            (hata) => res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ tamam: false, cikti: String(hata) })),
          );
        });
      });
    },
  };
}

