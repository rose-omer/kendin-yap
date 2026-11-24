// Uno/Nano simülasyonu: derlenmiş kodu avr8js ile çalıştırır, kablolar üzerinden parçaları sürer.
// Hatlar her karede yeniden çözülür (butona basılınca hat değişir). Zamana duyarlı sinyaller
// (servo darbesi, HC-SR04 yankısı, buzzer frekansı) port dinleyicisiyle döngü hassasiyetinde ölçülür.
import { AvrMakine, FREKANS, PinState, unoPin } from './avr.js';
import { KARTLAR, parcaAdi, parcaBilgi, parcaOlcu, pinGND } from '../veri/katalog.js';
import { ucCoz } from '../denetim.js';
import { pinVeri } from '../proje.js';
import { Birlesim, kontrolListesi, sesYoneticisi } from './ortak.js';
import { ESP32_DESTEKLI, esp32Baslat } from './esp32.js';

export const SIM_KARTLARI = ['wokwi-arduino-uno', 'wokwi-arduino-nano', 'wokwi-esp32-devkit-v1'];

// Simülasyonda davranışı olan parçalar. Gerisi şemada durur ama tepki vermez.
const DESTEKLI = new Set([
  'wokwi-led', 'wokwi-rgb-led', 'wokwi-resistor', 'wokwi-buzzer', 'wokwi-servo', 'wokwi-pushbutton',
  'wokwi-potentiometer', 'wokwi-slide-switch', 'wokwi-hc-sr04', 'wokwi-pir-motion-sensor',
  'wokwi-photoresistor-sensor', 'wokwi-ntc-temperature-sensor', 'wokwi-arduino-uno', 'wokwi-arduino-nano',
]);

export function simulasyonHazirlik(proje) {
  const kart = proje.parts.find((p) => KARTLAR[p.type]);
  if (!kart) return { uygun: false, neden: 'Projede kart yok.' };
  if (!SIM_KARTLARI.includes(kart.type)) {
    return { uygun: false, neden: `${parcaAdi(kart)} için simülasyon henüz yok. Çalışan kartlar: ESP32 DevKit V1, Arduino Uno, Arduino Nano.` };
  }
  const tur = kart.type === 'wokwi-esp32-devkit-v1' ? 'esp32' : 'avr';
  const destekli = tur === 'esp32' ? (p) => ESP32_DESTEKLI(p) : (p) => DESTEKLI.has(p.type);
  const desteksiz = proje.parts.filter((p) => !destekli(p)).map((p) => parcaAdi(p));
  return { uygun: true, kart, tur, destekli, desteksiz };
}

export function simulasyonKontrolleri(proje) {
  const h = simulasyonHazirlik(proje);
  return h.uygun ? kontrolListesi(proje, h.destekli, parcaAdi) : [];
}

export function simulasyonBaslat({ proje, hex, wasm, elemanBul, onSeri, onHata, onAg, sessiz = false }) {
  const { kart, tur } = simulasyonHazirlik(proje);
  if (tur === 'esp32') return esp32Baslat({ proje, kart, wasm, elemanBul, onSeri, onHata, onAg, sessiz, ayarlar: simulasyonKontrolleri(proje) });
  const makine = new AvrMakine(hex);
  const parcalar = new Map(proje.parts.map((p) => [p.id, p]));
  const ayar = Object.fromEntries(simulasyonKontrolleri(proje).map((k) => [k.anahtar, k.ilk ?? 0]));
  const pirBitis = {};

  // --- Uçların sınıfı (değişmez) ---
  const mcu = new Map(); // uc → {port, bit, adc}
  const kaynak = new Map(); // uc → volt
  const toprak = new Set();
  for (const pin of parcaOlcu(kart, pinVeri).pins) {
    const uc = `${kart.id}:${pin.name}`;
    const kok = pin.name.split('.')[0];
    if (pinGND(kart, pin.name, pinVeri)) toprak.add(uc);
    else if (KARTLAR[kart.type].kaynak[kok] != null) kaynak.set(uc, KARTLAR[kart.type].kaynak[kok]);
    else {
      const m = unoPin(pin.name);
      if (m) mcu.set(uc, m);
    }
  }
  for (const p of proje.parts) {
    const b = parcaBilgi(p);
    for (const [pin, v] of Object.entries(b.kaynak || {})) if (!KARTLAR[p.type]) kaynak.set(`${p.id}:${pin}`, v);
    if (Object.keys(b.kaynak || {}).length && !KARTLAR[p.type]) for (const g of b.gnd || []) toprak.add(`${p.id}:${g}`);
  }

  // --- Sabit bağlar: kablolar, dirençler, kartın aynı adlı pinleri, butonun iç bağları ---
  const sabitBaglar = proje.connections.map(([a, b]) => [a, b]);
  for (const p of proje.parts) {
    if (p.type === 'wokwi-resistor') sabitBaglar.push([`${p.id}:1`, `${p.id}:2`]);
    if (p.type === 'wokwi-pushbutton') sabitBaglar.push([`${p.id}:1.l`, `${p.id}:1.r`], [`${p.id}:2.l`, `${p.id}:2.r`]);
  }
  const kartGruplari = {};
  for (const uc of [...mcu.keys(), ...kaynak.keys(), ...toprak]) {
    if (ucCoz(uc).id !== kart.id) continue;
    const k = ucCoz(uc).pin.split('.')[0];
    (kartGruplari[k] ||= []).push(uc);
  }
  for (const g of Object.values(kartGruplari)) g.slice(1).forEach((u) => sabitBaglar.push([g[0], u]));

  // --- Pin ölçümleri: süre, kenar sayısı, darbe genişliği ---
  const olcum = {};
  const olcumAl = (port, bit) => (olcum[port + bit] ||= { deger: 0, son: 0, yuksek: 0, yukselen: 0, darbeBas: 0, darbe: 0 });
  let kareBas = 0;
  const kenarDinleyicileri = [];
  for (const [ad, port] of Object.entries(makine.port)) {
    port.addListener((deger, eski) => {
      const simdi = makine.cpu.cycles;
      for (let bit = 0; bit < 8; bit++) {
        const maske = 1 << bit;
        if (((deger ^ eski) & maske) === 0) continue;
        const o = olcumAl(ad, bit);
        const yeni = deger & maske ? 1 : 0;
        if (o.deger) o.yuksek += simdi - Math.max(o.son, kareBas);
        o.son = simdi;
        o.deger = yeni;
        if (yeni) {
          o.yukselen += 1;
          o.darbeBas = simdi;
        } else {
          o.darbe = (simdi - o.darbeBas) / (FREKANS / 1e6); // µs
        }
        for (const d of kenarDinleyicileri) if (d.port === ad && d.bit === bit) d.fn(yeni, o);
      }
    });
  }

  const pinCikis = (m) => {
    const s = makine.port[m.port].pinState(m.bit);
    if (s === PinState.High) return 1;
    if (s === PinState.Low) return 0;
    return null;
  };

  // --- Parça çıkışları (sensörlerin verdiği dijital değerler) ---
  const parcaCikislari = () => {
    const c = new Map();
    const simdi = performance.now();
    for (const p of proje.parts) {
      if (p.type === 'wokwi-pir-motion-sensor') c.set(`${p.id}:OUT`, (pirBitis[p.id] || 0) > simdi ? 1 : 0);
      if (p.type === 'wokwi-photoresistor-sensor') c.set(`${p.id}:DO`, ayar[p.id] > 50 ? 0 : 1);
    }
    return c;
  };

  // Hat çözümü: dinamik bağlarla birlikte hatları kurar, her hattın değerini bulur.
  const ozelGirisler = new Set(); // HC-SR04 ECHO gibi döngü hassasiyetinde sürülen pinler
  function hatlariCoz() {
    const b = new Birlesim();
    for (const [x, y] of sabitBaglar) b.birlestir(x, y);
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (p.type === 'wokwi-pushbutton' && el?.pressed) b.birlestir(`${p.id}:1.l`, `${p.id}:2.l`);
      if (p.type === 'wokwi-slide-switch') b.birlestir(`${p.id}:2`, el?.value ? `${p.id}:3` : `${p.id}:1`);
    }
    const cikislar = parcaCikislari();
    const deger = new Map(); // kök → 0/1
    const yaz = (uc, v) => {
      const k = b.bul(uc);
      if (!deger.has(k)) deger.set(k, v);
    };
    for (const uc of toprak) yaz(uc, 0);
    for (const uc of kaynak.keys()) yaz(uc, 1);
    for (const [uc, m] of mcu) {
      if (m.port == null) continue;
      const v = pinCikis(m);
      if (v != null) yaz(uc, v);
    }
    for (const [uc, v] of cikislar) yaz(uc, v);
    return { b, deger, hatDegeri: (uc) => deger.get(b.bul(uc)) ?? null };
  }

  function girisleriGuncelle(cozum) {
    for (const [uc, m] of mcu) {
      if (m.port == null || ozelGirisler.has(uc)) continue;
      const s = makine.port[m.port].pinState(m.bit);
      if (s !== PinState.Input && s !== PinState.InputPullUp) continue;
      let v = cozum.hatDegeri(uc);
      if (v == null) v = s === PinState.InputPullUp ? 1 : 0;
      makine.port[m.port].setPin(m.bit, !!v);
    }
  }

  // Bir parça pininin bağlı olduğu kart pinini bul (sabit bağlarla).
  const sabit = new Birlesim();
  for (const [x, y] of sabitBaglar) sabit.birlestir(x, y);
  const kartPiniBul = (uc) => {
    const k = sabit.bul(uc);
    for (const [u, m] of mcu) if (sabit.bul(u) === k) return m;
    return null;
  };

  // --- Analog girişler ---
  function analogGuncelle() {
    const volt = new Array(8).fill(0);
    for (const p of proje.parts) {
      let uc = null;
      let oran = null;
      const el = elemanBul(p.id);
      if (p.type === 'wokwi-potentiometer' && el) {
        uc = `${p.id}:SIG`;
        const min = Number(el.min ?? 0);
        const max = Number(el.max ?? 1023);
        oran = (Number(el.value) - min) / (max - min || 1);
      }
      if (p.type === 'wokwi-photoresistor-sensor') { uc = `${p.id}:AO`; oran = 1 - ayar[p.id] / 100; }
      if (p.type === 'wokwi-ntc-temperature-sensor') { uc = `${p.id}:OUT`; oran = 1 / (1 + Math.exp((ayar[p.id] - 25) / 25)); }
      if (uc == null) continue;
      const m = kartPiniBul(uc);
      if (m?.adc != null) volt[m.adc] = Math.max(0, Math.min(1, oran)) * 5;
    }
    volt.forEach((v, i) => { makine.adc.channelValues[i] = v; });
  }

  // --- HC-SR04: TRIG düşünce ECHO darbesi üret ---
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-hc-sr04')) {
    const trig = kartPiniBul(`${p.id}:TRIG`);
    const echo = kartPiniBul(`${p.id}:ECHO`);
    if (!trig?.port || !echo?.port) continue;
    for (const [u, m] of mcu) if (m === echo) ozelGirisler.add(u);
    kenarDinleyicileri.push({
      port: trig.port,
      bit: trig.bit,
      fn: (yeni, o) => {
        if (yeni || o.darbe < 8) return;
        const cm = Number(ayar[p.id]);
        const gecikme = 200 * (FREKANS / 1e6);
        const sure = cm * 58 * (FREKANS / 1e6);
        makine.cpu.addClockEvent(() => makine.port[echo.port].setPin(echo.bit, true), gecikme);
        makine.cpu.addClockEvent(() => makine.port[echo.port].setPin(echo.bit, false), gecikme + sure);
      },
    });
  }

  const ses = sesYoneticisi(sessiz);

  // --- Görsel güncelleme ---
  function gorselleriGuncelle(cozum, kareDongu) {
    const sure = kareDongu / FREKANS;
    const doluluk = (m) => {
      const o = olcum[m.port + m.bit];
      if (!o) return pinCikis(m) ? 1 : 0;
      const yuksek = o.yuksek + (o.deger ? makine.cpu.cycles - Math.max(o.son, kareBas) : 0);
      return Math.max(0, Math.min(1, yuksek / kareDongu));
    };
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (!el) continue;
      if (p.type === 'wokwi-led') {
        const a = cozum.hatDegeri(`${p.id}:A`);
        const c = cozum.hatDegeri(`${p.id}:C`);
        const m = kartPiniBul(`${p.id}:A`);
        const parlak = a === 1 || (m?.port && doluluk(m) > 0) ? (m?.port ? doluluk(m) : 1) : 0;
        const yanar = c === 0 && parlak > 0.01;
        el.value = yanar;
        el.brightness = yanar ? Math.max(0.2, parlak) : 0;
      }
      if (p.type === 'wokwi-rgb-led') {
        const com = cozum.hatDegeri(`${p.id}:COM`);
        for (const [pin, ozellik] of [['R', 'ledRed'], ['G', 'ledGreen'], ['B', 'ledBlue']]) {
          const m = kartPiniBul(`${p.id}:${pin}`);
          el[ozellik] = com === 0 && m?.port ? doluluk(m) : 0;
        }
      }
      if (p.type === 'wokwi-buzzer') {
        const m = kartPiniBul(`${p.id}:2`);
        const o = m?.port ? olcum[m.port + m.bit] : null;
        const frekans = o ? o.yukselen / sure : 0;
        const calsin = frekans > 30 && cozum.hatDegeri(`${p.id}:1`) === 0;
        el.hasSignal = calsin;
        ses.cal(p.id, calsin ? Math.min(frekans, 8000) : 0);
      }
      if (p.type === 'wokwi-servo') {
        const m = kartPiniBul(`${p.id}:PWM`);
        const o = m?.port ? olcum[m.port + m.bit] : null;
        if (o && o.darbe > 400 && o.darbe < 2600) el.angle = Math.round(((o.darbe - 544) / (2400 - 544)) * 180);
      }
      if (p.type === 'wokwi-pir-motion-sensor') el.ledOn = (pirBitis[p.id] || 0) > performance.now();
    }
    for (const o of Object.values(olcum)) {
      o.yuksek = 0;
      o.yukselen = 0;
    }
  }

  // --- Seri ekran ---
  let seriTampon = '';
  makine.seri.onByteTransmit = (b) => { seriTampon += String.fromCharCode(b); };

  // --- Ana döngü ---
  let calisiyor = true;
  let son = performance.now();
  function kare(simdi) {
    if (!calisiyor) return;
    const dt = Math.min(0.05, (simdi - son) / 1000);
    son = simdi;
    const dongu = Math.max(1, Math.floor(dt * FREKANS));
    analogGuncelle();
    // Girişleri kare içinde birkaç kez yenile: döngüdeki digitalRead değişikliği yakalasın.
    const parca = 4;
    kareBas = makine.cpu.cycles;
    for (let i = 0; i < parca; i++) {
      girisleriGuncelle(hatlariCoz());
      makine.calistir(Math.floor(dongu / parca));
    }
    gorselleriGuncelle(hatlariCoz(), dongu);
    if (seriTampon) {
      onSeri?.(seriTampon);
      seriTampon = '';
    }
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);

  return {
    ayarla(id, deger) { ayar[id] = deger; },
    hareket(id) { pirBitis[id] = performance.now() + 3000; },
    zaman: () => makine.zamanSn,
    durdur() {
      calisiyor = false;
      for (const p of proje.parts) {
        const el = elemanBul(p.id);
        if (!el) continue;
        if (p.type === 'wokwi-led') { el.value = false; el.brightness = 0; }
        if (p.type === 'wokwi-rgb-led') { el.ledRed = 0; el.ledGreen = 0; el.ledBlue = 0; }
        if (p.type === 'wokwi-buzzer') el.hasSignal = false;
        if (p.type === 'wokwi-pir-motion-sensor') el.ledOn = false;
      }
      ses.kapat();
    },
  };
}
