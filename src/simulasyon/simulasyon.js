// Uno/Nano simülasyonu: derlenmiş kodu avr8js ile çalıştırır, kablolar üzerinden parçaları sürer.
// Hatlar her karede yeniden çözülür (butona basılınca hat değişir). Zamana duyarlı sinyaller
// (servo darbesi, HC-SR04 yankısı, buzzer frekansı, DHT22, HX711, IR, NeoPixel) port dinleyicisiyle
// ve saat olaylarıyla döngü hassasiyetinde işlenir.
import { AvrMakine, FREKANS, PinState, unoPin } from './avr.js';
import { KARTLAR, parcaAdi, parcaBilgi, parcaOlcu, pinGND } from '../veri/katalog.js';
import { ucCoz } from '../denetim.js';
import { pinVeri } from '../proje.js';
import { Birlesim, kontrolListesi, sesYoneticisi } from './ortak.js';
import { ESP32_DESTEKLI, esp32Baslat } from './esp32.js';
import { Hd44780, TUS_UCLARI, lcdTemizle } from './lcd.js';
import {
  analogOranlari, dinamikBaglar, gorselTemizle, gorseller, i2cTanimlari, kareBasi, mpuDegeri,
  neopikselCiz, neopikselZincirleri, olayDinleyici, parcaCikislari as modulCikislari, parcaDurumu, parcaKapat,
  roleleriGuncelle,
} from './parcalar.js';
import { AdimSayaci, Pcf8574Lcd, dht22Dalgasi, hx711Ham, i2cCihazlari, necDalgasi } from './cihazlar.js';

export const SIM_KARTLARI = ['wokwi-arduino-uno', 'wokwi-arduino-nano', 'wokwi-esp32-devkit-v1'];

// Simülasyonda davranışı olan parçalar. Gerisi şemada durur ama tepki vermez.
const DESTEKLI = new Set([
  'wokwi-led', 'wokwi-rgb-led', 'wokwi-resistor', 'wokwi-buzzer', 'wokwi-servo', 'wokwi-pushbutton',
  'wokwi-potentiometer', 'wokwi-slide-switch', 'wokwi-hc-sr04', 'wokwi-pir-motion-sensor',
  'wokwi-photoresistor-sensor', 'wokwi-ntc-temperature-sensor', 'wokwi-arduino-uno', 'wokwi-arduino-nano',
  'wokwi-lcd1602', 'wokwi-membrane-keypad', 'wokwi-neopixel', 'wokwi-ky-040', 'wokwi-analog-joystick',
  'wokwi-dht22', 'wokwi-mpu6050', 'wokwi-gas-sensor', 'wokwi-flame-sensor', 'wokwi-small-sound-sensor',
  'wokwi-hx711', 'wokwi-ir-receiver', 'wokwi-ds1307', 'wokwi-7segment', 'wokwi-stepper-motor',
  'wokwi-ks2e-m-dc5', 'ky-modul',
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

const US = FREKANS / 1e6; // bir mikro saniyedeki döngü

export function simulasyonBaslat({ proje, hex, wasm, elemanBul, onSeri, onHata, onAg, sessiz = false }) {
  const { kart, tur } = simulasyonHazirlik(proje);
  if (tur === 'esp32') return esp32Baslat({ proje, kart, wasm, elemanBul, onSeri, onHata, onAg, sessiz, ayarlar: simulasyonKontrolleri(proje) });
  const makine = new AvrMakine(hex);
  const ayar = Object.fromEntries(simulasyonKontrolleri(proje).map((k) => [k.anahtar, k.ilk ?? 0]));
  const pirBitis = {};
  const durum = parcaDurumu(proje, elemanBul);

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

  // Bir parça pininin bağlı olduğu kart pinini bul (sabit bağlarla).
  const sabit = new Birlesim();
  for (const [x, y] of sabitBaglar) sabit.birlestir(x, y);
  const kartPiniBul = (uc) => {
    const k = sabit.bul(uc);
    for (const [u, m] of mcu) if (sabit.bul(u) === k) return m;
    return null;
  };
  const ayniHat = (a, b) => sabit.bul(a) === sabit.bul(b);
  const kaynakMi = (uc) => [...kaynak.keys()].some((k) => ayniHat(k, uc));
  // Döngü hassasiyetinde sürülen giriş pinleri (HC-SR04 ECHO, DHT22, HX711 DOUT, IR): hat çözümü dokunmaz.
  const ozelGirisler = new Set();
  const ozelYap = (m) => {
    for (const [u, mm] of mcu) if (mm === m) ozelGirisler.add(u);
  };

  // --- Pin ölçümleri: süre, kenar sayısı, darbe genişliği ---
  const olcum = {};
  const olcumAl = (port, bit) => (olcum[port + bit] ||= { deger: 0, son: 0, yuksek: 0, yukselen: 0, darbeBas: 0, darbe: 0 });
  let kareBas = 0;
  const kenarDinleyicileri = [];
  const portDinleyicileri = []; // { port, fn() }: porta her yazımda (mod değişimi dahil)
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
          o.darbe = (simdi - o.darbeBas) / US; // µs
        }
        for (const d of kenarDinleyicileri) if (d.port === ad && d.bit === bit) d.fn(yeni, o);
      }
      for (const d of portDinleyicileri) if (d.port === ad) d.fn();
      // Tuş takımı: bu porttaki tuş pinleri (mod değişmiş olabilir) ve basılı tuşların karşı uçları.
      if (tusPinleri.size) {
        for (const m of tusPinleri.values()) if (m.port === ad) tusPiniCoz(m);
        for (const [a, b] of tusCiftleri) {
          tusPiniCoz(a);
          tusPiniCoz(b);
        }
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
    modulCikislari(proje, ayar, durum, (uc, v) => c.set(uc, v));
    return c;
  };

  // Hat çözümü: dinamik bağlarla birlikte hatları kurar, her hattın değerini bulur.
  function hatlariCoz() {
    const b = new Birlesim();
    for (const [x, y] of sabitBaglar) b.birlestir(x, y);
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (p.type === 'wokwi-pushbutton' && el?.pressed) b.birlestir(`${p.id}:1.l`, `${p.id}:2.l`);
      if (p.type === 'wokwi-slide-switch') b.birlestir(`${p.id}:2`, el?.value ? `${p.id}:3` : `${p.id}:1`);
    }
    dinamikBaglar(proje, elemanBul, b, durum, ayar);
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
  let sonCozum = hatlariCoz();
  const besli = (p, vcc = 'VCC', gnd = 'GND') => sonCozum.hatDegeri(`${p.id}:${vcc}`) === 1 && sonCozum.hatDegeri(`${p.id}:${gnd}`) === 0;

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

  // --- Analog girişler ---
  function analogGuncelle() {
    const volt = new Array(8).fill(0);
    const oranlar = analogOranlari(proje, elemanBul, ayar, durum);
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (p.type === 'wokwi-potentiometer' && el) {
        const min = Number(el.min ?? 0);
        const max = Number(el.max ?? 1023);
        oranlar.push([`${p.id}:SIG`, (Number(el.value) - min) / (max - min || 1)]);
      }
      if (p.type === 'wokwi-photoresistor-sensor') oranlar.push([`${p.id}:AO`, 1 - ayar[p.id] / 100]);
      if (p.type === 'wokwi-ntc-temperature-sensor') oranlar.push([`${p.id}:OUT`, 1 / (1 + Math.exp((ayar[p.id] - 25) / 25))]);
    }
    for (const [uc, oran] of oranlar) {
      const m = kartPiniBul(uc);
      if (m?.adc != null) volt[m.adc] = Math.max(0, Math.min(1, oran)) * 5;
    }
    volt.forEach((v, i) => { makine.adc.channelValues[i] = v; });
  }

  // Bir pine [süre µs, seviye] dalgası çal (sensörün sürdüğü tek telli protokoller). Bitiş döngüsünü verir.
  function dalgaCal(m, dalga) {
    let t = 0;
    for (const [sure, seviye] of dalga) {
      makine.cpu.addClockEvent(() => makine.port[m.port].setPin(m.bit, !!seviye), Math.max(1, Math.round(t * US)));
      t += sure;
    }
    makine.cpu.addClockEvent(() => makine.port[m.port].setPin(m.bit, true), Math.round(t * US));
    return makine.cpu.cycles + t * US;
  }

  // --- HC-SR04: TRIG düşünce ECHO darbesi üret ---
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-hc-sr04')) {
    const trig = kartPiniBul(`${p.id}:TRIG`);
    const echo = kartPiniBul(`${p.id}:ECHO`);
    if (!trig?.port || !echo?.port) continue;
    ozelYap(echo);
    kenarDinleyicileri.push({
      port: trig.port,
      bit: trig.bit,
      fn: (yeni, o) => {
        if (yeni || o.darbe < 8) return;
        const cm = Number(ayar[p.id]);
        const gecikme = 200 * US;
        const sure = cm * 58 * US;
        makine.cpu.addClockEvent(() => makine.port[echo.port].setPin(echo.bit, true), gecikme);
        makine.cpu.addClockEvent(() => makine.port[echo.port].setPin(echo.bit, false), gecikme + sure);
      },
    });
  }

  // --- DHT22: kart hattı en az 0,5 ms LOW tutup bırakınca 40 bitlik yanıt ---
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-dht22')) {
    const m = kartPiniBul(`${p.id}:SDA`);
    if (!m?.port) continue;
    ozelYap(m);
    makine.port[m.port].setPin(m.bit, true);
    let dusukBas = 0;
    let mesgulBitis = 0;
    portDinleyicileri.push({
      port: m.port,
      fn: () => {
        const s = makine.port[m.port].pinState(m.bit);
        const simdi = makine.cpu.cycles;
        if (s === PinState.Low) {
          if (!dusukBas) dusukBas = simdi;
          return;
        }
        if (s === PinState.High) {
          dusukBas = 0;
          return;
        }
        const sure = dusukBas ? simdi - dusukBas : 0;
        dusukBas = 0;
        if (sure < 500 * US || simdi < mesgulBitis || !besli(p)) return;
        mesgulBitis = dalgaCal(m, dht22Dalgasi(ayar[`${p.id}:sicaklik`], ayar[`${p.id}:nem`]));
      },
    });
  }

  // --- HX711: DOUT LOW = ölçüm hazır. SCK'nin her yükselişinde sıradaki bit (24 bit, önce en anlamlı) ---
  const tartilar = [];
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-hx711')) {
    const dt = kartPiniBul(`${p.id}:DT`);
    const sck = kartPiniBul(`${p.id}:SCK`);
    if (!dt?.port || !sck?.port) continue;
    ozelYap(dt);
    const t = { p, dt, hazir: false, bit: 0, deger: 0, belirtec: 0 };
    tartilar.push(t);
    const hazirla = () => {
      t.hazir = besli(t.p);
      t.bit = 0;
      t.deger = hx711Ham(ayar[p.id]) & 0xffffff;
      makine.port[dt.port].setPin(dt.bit, !t.hazir);
    };
    t.hazirla = hazirla;
    kenarDinleyicileri.push({
      port: sck.port,
      bit: sck.bit,
      fn: (yeni) => {
        if (yeni) {
          const v = t.bit < 24 ? (t.deger >> (23 - t.bit)) & 1 : 1;
          t.bit += 1;
          makine.port[dt.port].setPin(dt.bit, !!v);
          return;
        }
        // Son darbeden 100 µs sonra yeni ölçüm hazır.
        const belirtec = ++t.belirtec;
        makine.cpu.addClockEvent(() => {
          if (belirtec === t.belirtec && t.bit >= 25) hazirla();
        }, 100 * US);
      },
    });
  }

  // --- IR alıcı: panelden gelen kumanda tuşu NEC dalgası olarak DAT'a (LOW etkin) ---
  const irKuyrugu = new Map(); // parça id → [komut]
  const irAlicilar = [];
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-ir-receiver')) {
    const m = kartPiniBul(`${p.id}:DAT`);
    if (!m?.port) continue;
    ozelYap(m);
    makine.port[m.port].setPin(m.bit, true);
    irAlicilar.push({ p, m, bitis: 0 });
    irKuyrugu.set(p.id, []);
  }
  function irGonder() {
    for (const a of irAlicilar) {
      const kuyruk = irKuyrugu.get(a.p.id);
      if (!kuyruk.length || makine.cpu.cycles < a.bitis + 40000 * US) continue;
      const komut = kuyruk.shift();
      if (besli(a.p)) a.bitis = dalgaCal(a.m, necDalgasi(0, komut));
    }
  }

  // --- NeoPixel: DIN'deki darbe genişliği bitleri verir (0,8 µs = 1; 0,4 µs = 0), 50 µs boşluk = yeni çerçeve ---
  const neopiksel = [];
  const neoPinleri = new Map();
  const zincirler = neopikselZincirleri(proje, ayniHat, (uc) => {
    const m = kartPiniBul(uc);
    if (!m?.port) return null;
    neoPinleri.set(m.port + m.bit, m);
    return m.port + m.bit;
  });
  for (const [anahtar, zincir] of zincirler) {
    const m = neoPinleri.get(anahtar);
    const n = { zincir, baytlar: [], bitler: 0, bayt: 0, yukselis: 0, sonDusus: 0, cizildi: true };
    neopiksel.push(n);
    kenarDinleyicileri.push({
      port: m.port,
      bit: m.bit,
      fn: (yeni) => {
        const simdi = makine.cpu.cycles;
        if (yeni) {
          if (simdi - n.sonDusus > 50 * US) {
            n.baytlar = [];
            n.bitler = 0;
            n.bayt = 0;
          }
          n.yukselis = simdi;
          return;
        }
        n.bayt = (n.bayt << 1) | (simdi - n.yukselis > 9 ? 1 : 0);
        n.bitler += 1;
        if (n.bitler === 8) {
          n.baytlar.push(n.bayt);
          n.bitler = 0;
          n.bayt = 0;
        }
        n.sonDusus = simdi;
        n.cizildi = false;
      },
    });
  }

  // --- Step motor: bobin uçlarının seviyesi değiştikçe adım say ---
  const stepler = [];
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-stepper-motor')) {
    const pinler = ['A+', 'A-', 'B+', 'B-'].map((u) => kartPiniBul(`${p.id}:${u}`));
    if (!pinler.some((m) => m?.port)) continue;
    const s = { p, pinler, sayac: new AdimSayaci() };
    stepler.push(s);
    for (const port of new Set(pinler.filter((m) => m?.port).map((m) => m.port))) {
      portDinleyicileri.push({ port, fn: () => s.sayac.guncelle(...s.pinler.map((m) => (m?.port ? pinCikis(m) === 1 : false))) });
    }
  }

  // --- I2C: DS1307 ve MPU6050. Uno'da SDA = A4, SCL = A5 ---
  const i2cPin = (uc, bit) => {
    const m = kartPiniBul(uc);
    return m?.port === 'C' && m.bit === bit;
  };
  const i2cBaglandi = (p) => i2cPin(`${p.id}:SDA`, 4) && i2cPin(`${p.id}:SCL`, 5);
  const i2c = i2cTanimlari(proje, i2cBaglandi, kaynakMi)
    .map((t) => ({ ...t, deger: () => mpuDegeri(ayar, t.id) }));
  const i2cAygitlari = i2cCihazlari(i2c);

  // --- I2C LCD (PCF8574 arka kart): baytlar Wire'dan gelir, Hd44780'e nibble olarak yazılır ---
  const i2cLcdler = new Map(); // parça id → { lcd, pcf }
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-lcd1602' && x.attrs?.pins === 'i2c')) {
    if (!i2cBaglandi(p)) continue;
    const adres = Number(p.attrs?.adres ?? 0x27);
    const lcd = new Hd44780();
    const pcf = new Pcf8574Lcd(lcd);
    i2cLcdler.set(p.id, { lcd, pcf });
    if (!i2cAygitlari.has(adres)) i2cAygitlari.set(adres, pcf);
  }
  makine.i2cBagla(i2cAygitlari);

  // --- LCD 16x2 (paralel): E düşünce RS ve veri uçlarını oku ---
  const lcdler = new Map(); // parça id → Hd44780
  for (const p of proje.parts.filter((x) => x.type === 'wokwi-lcd1602' && x.attrs?.pins !== 'i2c')) {
    const e = kartPiniBul(`${p.id}:E`);
    const rs = kartPiniBul(`${p.id}:RS`);
    if (!e?.port || !rs?.port) continue;
    const veri = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => kartPiniBul(`${p.id}:D${i}`));
    const lcd = new Hd44780();
    lcdler.set(p.id, lcd);
    kenarDinleyicileri.push({
      port: e.port,
      bit: e.bit,
      fn: (yeni) => {
        if (yeni) return;
        let bayt = 0;
        veri.forEach((m, i) => {
          if (m?.port && pinCikis(m) === 1) bayt |= 1 << i;
        });
        lcd.darbe(pinCikis(rs) === 1 ? 1 : 0, bayt);
      },
    });
  }

  // --- Tuş takımı: basılı tuş bir satır ve bir sütun ucunu birleştirir. Keypad kütüphanesi
  // sütunları mikro saniyeler içinde tarar; bu yüzden giriş, çıkış değiştiği anda güncellenir.
  const tusTakimlari = proje.parts.filter((x) => x.type === 'wokwi-membrane-keypad');
  const tusPinleri = new Map(); // parça ucu → kart pini
  for (const p of tusTakimlari) {
    for (const u of TUS_UCLARI) {
      const m = kartPiniBul(`${p.id}:${u}`);
      if (!m?.port) continue;
      tusPinleri.set(`${p.id}:${u}`, m);
      ozelYap(m);
    }
  }
  // Basımlar olayla yakalanır, kuyruğa girer ve simülasyon zamanında sırayla işlenir: her biri
  // en az 60 ms basılı kalır, arada 60 ms boşluk olur. Sayfa yavaş çizilse de (arka planda kare
  // hızı düşer) hızlı ya da aynı tuşa art arda basımlar kaçmaz.
  const EN_AZ_BASIM = 0.06 * FREKANS;
  const tusKuyrugu = []; // { ad, a, b, birakildi }
  let etkinTus = null;
  let bosBitis = 0;
  const tusDinleyicileri = tusTakimlari.map((p) => {
    const anahtar = (d) => `${p.id}:${d.key}`;
    return olayDinleyici(elemanBul, p.id, {
      'button-press': (e) => tusKuyrugu.push({
        ad: anahtar(e.detail),
        a: tusPinleri.get(`${p.id}:R${e.detail.row + 1}`),
        b: tusPinleri.get(`${p.id}:C${e.detail.column + 1}`),
        birakildi: false,
      }),
      'button-release': (e) => {
        const ad = anahtar(e.detail);
        const t = [etkinTus, ...tusKuyrugu].find((x) => x?.ad === ad && !x.birakildi);
        if (t) t.birakildi = true;
      },
    });
  });
  function tusCiftleriniAl() {
    for (const d of tusDinleyicileri) d.guncelle();
    const simdi = makine.cpu.cycles;
    if (etkinTus?.birakildi && simdi - etkinTus.bas >= EN_AZ_BASIM) {
      etkinTus = null;
      bosBitis = simdi + EN_AZ_BASIM;
    }
    if (!etkinTus && tusKuyrugu.length && simdi >= bosBitis) {
      etkinTus = tusKuyrugu.shift();
      etkinTus.bas = simdi;
    }
    return etkinTus?.a && etkinTus.b ? [[etkinTus.a, etkinTus.b]] : [];
  }
  function tusPiniCoz(m) {
    const s = makine.port[m.port].pinState(m.bit);
    if (s !== PinState.Input && s !== PinState.InputPullUp) return;
    let surulen = null;
    for (const [a, b] of tusCiftleri) {
      const diger = a === m ? b : b === m ? a : null;
      const v = diger ? pinCikis(diger) : null;
      if (v != null) surulen = surulen === 0 ? 0 : v;
    }
    makine.port[m.port].setPin(m.bit, !!(surulen ?? (s === PinState.InputPullUp ? 1 : 0)));
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
    const seviye = (uc) => {
      const m = kartPiniBul(uc);
      return m?.port ? doluluk(m) : cozum.hatDegeri(uc) === 1 ? 1 : 0;
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
      if (p.type === 'wokwi-lcd1602' && p.attrs?.pins !== 'i2c') {
        const guc = cozum.hatDegeri(`${p.id}:VDD`) === 1 && cozum.hatDegeri(`${p.id}:VSS`) === 0;
        const isik = cozum.hatDegeri(`${p.id}:A`) === 1 && cozum.hatDegeri(`${p.id}:K`) === 0;
        lcdler.get(p.id)?.ciz(el, guc, isik);
      }
      if (p.type === 'wokwi-lcd1602' && p.attrs?.pins === 'i2c') {
        const g = i2cLcdler.get(p.id);
        if (g) g.lcd.ciz(el, cozum.hatDegeri(`${p.id}:VCC`) === 1 && cozum.hatDegeri(`${p.id}:GND`) === 0, g.pcf.isik);
      }
      gorseller(p, el, cozum, seviye, durum, ayar);
    }
    for (const n of neopiksel) {
      if (n.cizildi || makine.cpu.cycles - n.sonDusus < 50 * US) continue;
      neopikselCiz(elemanBul, n.zincir, n.baytlar);
      n.cizildi = true;
    }
    for (const s of stepler) {
      const el = elemanBul(s.p.id);
      if (el) el.angle = s.sayac.aci;
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
  let tusCiftleri = [];
  let calisiyor = true;
  let son = performance.now();
  function kare(simdi) {
    if (!calisiyor) return;
    const dt = Math.min(0.05, (simdi - son) / 1000);
    son = simdi;
    const dongu = Math.max(1, Math.floor(dt * FREKANS));
    kareBasi(durum);
    roleleriGuncelle(proje, sonCozum, durum);
    analogGuncelle();
    irGonder();
    for (const t of tartilar) if (!t.hazir && t.bit === 0) t.hazirla();
    // Girişleri kare içinde birkaç kez yenile: döngüdeki digitalRead değişikliği yakalasın.
    const parca = 4;
    kareBas = makine.cpu.cycles;
    tusCiftleri = tusCiftleriniAl();
    for (const m of tusPinleri.values()) tusPiniCoz(m);
    for (let i = 0; i < parca; i++) {
      sonCozum = hatlariCoz();
      girisleriGuncelle(sonCozum);
      makine.calistir(Math.floor(dongu / parca));
    }
    sonCozum = hatlariCoz();
    gorselleriGuncelle(sonCozum, dongu);
    if (seriTampon) {
      onSeri?.(seriTampon);
      seriTampon = '';
    }
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);

  return {
    ayarla(id, deger) { ayar[id] = deger; },
    hareket(id) {
      pirBitis[id] = performance.now() + 3000;
      durum.sesBitis[id] = performance.now() + 120;
    },
    ir(id, komut) { irKuyrugu.get(id)?.push(komut); },
    zaman: () => makine.zamanSn,
    durdur() {
      calisiyor = false;
      for (const d of tusDinleyicileri) d.kaldir();
      parcaKapat(durum);
      for (const p of proje.parts) {
        const el = elemanBul(p.id);
        if (!el) continue;
        if (p.type === 'wokwi-led') { el.value = false; el.brightness = 0; }
        if (p.type === 'wokwi-rgb-led') { el.ledRed = 0; el.ledGreen = 0; el.ledBlue = 0; }
        if (p.type === 'wokwi-buzzer') el.hasSignal = false;
        if (p.type === 'wokwi-pir-motion-sensor') el.ledOn = false;
        if (p.type === 'wokwi-lcd1602') lcdTemizle(el);
        gorselTemizle(p, el);
      }
      ses.kapat();
    },
  };
}
