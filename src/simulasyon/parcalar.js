// Kartlardan bağımsız parça davranışları: modüller, sensörler, enkoder, röle, 7 segment, NeoPixel.
// Uno (simulasyon.js) ve ESP32 (esp32.js) simülasyonları ortak kullanır. Zamana duyarlı protokoller
// (DHT22, HX711, IR, NeoPixel çözümü) Uno'da simulasyon.js içinde, ESP32'de esp32-hal taklitlerindedir.
import { parcaOlcu } from '../veri/katalog.js';
import { pinVeri } from '../proje.js';

export const modulBaslik = (p) => (p.attrs?.baslik || '').toLocaleLowerCase('tr');
export function kyTuru(p) {
  if (p.type !== 'ky-modul') return null;
  const b = modulBaslik(p);
  if (/röle/.test(b)) return 'role';
  if (/kapı|kapi|reed/.test(b)) return 'kapi';
  if (/toprak/.test(b)) return 'toprak';
  return 'diger';
}

// Şema yeniden çizilirse öğe değişir; dinleyici her karede yeni öğeye taşınır.
export function olayDinleyici(elemanBul, id, olaylar) {
  let el = null;
  const bag = (yeni) => {
    if (yeni === el) return;
    for (const [ad, fn] of Object.entries(olaylar)) {
      el?.removeEventListener(ad, fn);
      yeni?.addEventListener(ad, fn);
    }
    el = yeni;
  };
  bag(elemanBul(id) || null);
  return { guncelle: () => bag(elemanBul(id) || null), kaldir: () => bag(null) };
}

// KY-040 enkoder: her tık CLK ve DT'de dört evreli gri kod üretir; her evre bir kare sürer.
const SAG = [[0, 1], [0, 0], [1, 0], [1, 1]];
const SOL = [[1, 0], [0, 0], [0, 1], [1, 1]];

export function parcaDurumu(proje, elemanBul) {
  const d = { roleAktif: new Set(), enkoder: new Map(), sesBitis: {}, dinleyiciler: [] };
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-ky-040')) {
    const e = { kuyruk: [], evre: -1, yon: 1, clk: 1, dt: 1, basili: false };
    d.enkoder.set(p.id, e);
    d.dinleyiciler.push(olayDinleyici(elemanBul, p.id, {
      'rotate-cw': () => e.kuyruk.push(1),
      'rotate-ccw': () => e.kuyruk.push(-1),
      'button-press': () => { e.basili = true; },
      'button-release': () => { e.basili = false; },
    }));
  }
  return d;
}

// Her karenin başında: dinleyicileri tazele, enkoderi bir evre ilerlet.
export function kareBasi(d) {
  for (const x of d.dinleyiciler) x.guncelle();
  for (const e of d.enkoder.values()) {
    if (e.evre < 0 && e.kuyruk.length) {
      e.yon = e.kuyruk.shift();
      e.evre = 0;
    }
    if (e.evre < 0) continue;
    [e.clk, e.dt] = (e.yon > 0 ? SAG : SOL)[e.evre];
    e.evre = e.evre === 3 ? -1 : e.evre + 1;
  }
}

export function parcaKapat(d) {
  for (const x of d.dinleyiciler) x.kaldir();
}

// Basılınca ya da çekince değişen bağlar.
export function dinamikBaglar(proje, elemanBul, b, d, ayar) {
  for (const p of proje.parts) {
    const ky = kyTuru(p);
    if (ky === 'role') b.birlestir(`${p.id}:COM`, d.roleAktif.has(p.id) ? `${p.id}:NO` : `${p.id}:NC`);
    if (ky === 'kapi' && !ayar[p.id]) {
      const [a, c] = parcaOlcu(p, pinVeri).pins.map((x) => x.name);
      if (a && c) b.birlestir(`${p.id}:${a}`, `${p.id}:${c}`);
    }
    if (p.type === 'wokwi-ks2e-m-dc5') {
      const ac = d.roleAktif.has(p.id) ? 'NO' : 'NC';
      b.birlestir(`${p.id}:P1`, `${p.id}:${ac}1`);
      b.birlestir(`${p.id}:P2`, `${p.id}:${ac}2`);
    }
    if (p.type === 'wokwi-analog-joystick' && elemanBul(p.id)?.pressed) b.birlestir(`${p.id}:SEL`, `${p.id}:GND`);
    if (p.type === 'wokwi-ky-040' && d.enkoder.get(p.id)?.basili) b.birlestir(`${p.id}:SW`, `${p.id}:GND`);
  }
}

// Röle modülü VCC beslenmiş ve IN LOW iken çeker. Çıplak rölenin bobininde gerilim farkı varsa çeker.
export function roleleriGuncelle(proje, cozum, d) {
  for (const p of proje.parts) {
    let aktif = null;
    if (kyTuru(p) === 'role') aktif = cozum.hatDegeri(`${p.id}:VCC`) === 1 && cozum.hatDegeri(`${p.id}:IN`) === 0;
    if (p.type === 'wokwi-ks2e-m-dc5') {
      const a = cozum.hatDegeri(`${p.id}:COIL1`);
      const c = cozum.hatDegeri(`${p.id}:COIL2`);
      aktif = a != null && c != null && a !== c;
    }
    if (aktif === null) continue;
    if (aktif) d.roleAktif.add(p.id);
    else d.roleAktif.delete(p.id);
  }
}

const sesVar = (p, ayar, d) => ayar[`${p.id}:seviye`] > 50 || (d.sesBitis[p.id] || 0) > performance.now();

// Sensörlerin dijital çıkışları: yaz(uc, 0|1).
export function parcaCikislari(proje, ayar, d, yaz) {
  for (const p of proje.parts) {
    if (p.type === 'wokwi-gas-sensor') yaz(`${p.id}:DOUT`, ayar[p.id] > 50 ? 0 : 1);
    if (p.type === 'wokwi-flame-sensor') yaz(`${p.id}:DOUT`, ayar[p.id] > 50 ? 0 : 1);
    if (p.type === 'wokwi-small-sound-sensor') yaz(`${p.id}:DOUT`, sesVar(p, ayar, d) ? 1 : 0);
    if (p.type === 'wokwi-ky-040') {
      const e = d.enkoder.get(p.id);
      yaz(`${p.id}:CLK`, e.clk);
      yaz(`${p.id}:DT`, e.dt);
    }
  }
}

// Analog çıkışlar: [uç, oran 0–1] listesi. Kart oranı kendi ölçeğine çevirir (Uno 0–5 V, ESP32 0–4095).
export function analogOranlari(proje, elemanBul, ayar, d) {
  const liste = [];
  for (const p of proje.parts) {
    if (p.type === 'wokwi-analog-joystick') {
      const el = elemanBul(p.id);
      liste.push([`${p.id}:HORZ`, ((el?.xValue ?? 0) + 1) / 2], [`${p.id}:VERT`, ((el?.yValue ?? 0) + 1) / 2]);
    }
    if (p.type === 'wokwi-gas-sensor') liste.push([`${p.id}:AOUT`, 0.1 + (0.85 * ayar[p.id]) / 100]);
    if (p.type === 'wokwi-flame-sensor') liste.push([`${p.id}:AOUT`, 1 - (0.9 * ayar[p.id]) / 100]);
    if (p.type === 'wokwi-small-sound-sensor') {
      const seviye = (d.sesBitis[p.id] || 0) > performance.now() ? 100 : ayar[`${p.id}:seviye`];
      liste.push([`${p.id}:AOUT`, 0.05 + (0.9 * seviye) / 100]);
    }
    if (kyTuru(p) === 'toprak') liste.push([`${p.id}:AO`, (3500 - ayar[p.id] * 20) / 4095]);
  }
  return liste;
}

// Görseller. seviye(uç): hattı süren pinin doluluğu 0–1 (PWM dahil).
export function gorseller(p, el, cozum, seviye, d, ayar) {
  const besli = (uc) => cozum.hatDegeri(`${p.id}:${uc}`) === 1;
  if (p.type === 'wokwi-7segment') {
    const katot = (p.attrs?.common || 'anode') === 'cathode';
    const com = cozum.hatDegeri(`${p.id}:COM.1`) ?? cozum.hatDegeri(`${p.id}:COM.2`);
    const yeni = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'].map((s) => {
      const v = cozum.hatDegeri(`${p.id}:${s}`);
      if (v == null || com == null) return 0;
      return katot ? (com === 0 && seviye(`${p.id}:${s}`) > 0.05 ? 1 : 0) : (com === 1 && seviye(`${p.id}:${s}`) < 0.95 ? 1 : 0);
    });
    if (String(yeni) !== String(el.values)) el.values = yeni;
  }
  if (p.type === 'wokwi-gas-sensor') el.ledPower = besli('VCC');
  if (p.type === 'wokwi-flame-sensor') {
    el.ledPower = besli('VCC');
    el.ledSignal = besli('VCC') && ayar[p.id] > 50;
  }
  if (p.type === 'wokwi-small-sound-sensor') {
    el.ledPower = besli('VCC');
    el.ledSignal = besli('VCC') && sesVar(p, ayar, d);
  }
  if (p.type === 'ky-modul') {
    for (const s of el.querySelectorAll('[data-pin]')) s.classList.toggle('yuksek', cozum.hatDegeri(`${p.id}:${s.dataset.pin}`) === 1);
    const calisiyor = kyTuru(p) === 'role'
      ? d.roleAktif.has(p.id)
      : cozum.hatDegeri(`${p.id}:+`) === 1 && cozum.hatDegeri(`${p.id}:-`) === 0;
    el.classList.toggle('calisiyor', calisiyor);
  }
}

export function gorselTemizle(p, el) {
  if (p.type === 'wokwi-7segment') el.values = [0, 0, 0, 0, 0, 0, 0, 0];
  if (p.type === 'wokwi-gas-sensor') el.ledPower = false;
  if (p.type === 'wokwi-flame-sensor' || p.type === 'wokwi-small-sound-sensor') {
    el.ledPower = false;
    el.ledSignal = false;
  }
  if (p.type === 'wokwi-neopixel') {
    el.r = 0;
    el.g = 0;
    el.b = 0;
  }
  if (p.type === 'ky-modul') {
    el.classList.remove('calisiyor');
    for (const s of el.querySelectorAll('[data-pin]')) s.classList.remove('yuksek');
  }
}

// NeoPixel zincirleri: DIN'i karta bağlı ilk LED'den DOUT → DIN boyunca. pinBul(uç) → kart pini anahtarı.
export function neopikselZincirleri(proje, ayniHat, pinBul) {
  const ledler = proje.parts.filter((p) => p.type === 'wokwi-neopixel');
  const zincirler = new Map(); // pin anahtarı → [id]
  for (const ilk of ledler) {
    const pin = pinBul(`${ilk.id}:DIN`);
    if (pin == null) continue;
    const zincir = [ilk.id];
    let son = ilk;
    for (;;) {
      const sonraki = ledler.find((q) => !zincir.includes(q.id) && ayniHat(`${son.id}:DOUT`, `${q.id}:DIN`));
      if (!sonraki) break;
      zincir.push(sonraki.id);
      son = sonraki;
    }
    zincirler.set(pin, zincir);
  }
  return zincirler;
}

// Kablodan geçen baytlar (WS2812B: G, R, B sırası) LED'lere.
export function neopikselCiz(elemanBul, zincir, baytlar) {
  zincir.forEach((id, i) => {
    const el = elemanBul(id);
    if (!el || i * 3 + 2 >= baytlar.length) return;
    el.g = baytlar[i * 3] / 255;
    el.r = baytlar[i * 3 + 1] / 255;
    el.b = baytlar[i * 3 + 2] / 255;
  });
}

// I2C cihazları: SDA ve SCL karta bağlıysa vardır. MPU6050'de AD0 beslenmişse adres 0x69.
export function i2cTanimlari(proje, sdaSclBagli, kaynakMi) {
  const liste = [];
  for (const p of proje.parts) {
    if (!sdaSclBagli(p)) continue;
    if (p.type === 'wokwi-ds1307') liste.push({ id: p.id, tur: 'ds1307', adres: 0x68 });
    if (p.type === 'wokwi-mpu6050') liste.push({ id: p.id, tur: 'mpu6050', adres: kaynakMi(`${p.id}:AD0`) ? 0x69 : 0x68 });
  }
  return liste;
}

// MPU6050 kaydırıcılarından (eğim X, eğim Y, dönme Z) ölçüm değeri.
export function mpuDegeri(ayar, id) {
  const x = ((ayar[`${id}:x`] ?? 0) * Math.PI) / 180;
  const y = ((ayar[`${id}:y`] ?? 0) * Math.PI) / 180;
  return { ax: Math.sin(x), ay: Math.sin(y), az: Math.cos(x) * Math.cos(y), gx: 0, gy: 0, gz: ayar[`${id}:donme`] ?? 0, sicaklik: 25 };
}
