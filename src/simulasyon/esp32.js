// ESP32 simülasyonu (ana sayfa tarafı): işçiyi başlatır, kablolardan hatları çözer,
// girişleri ortak belleğe yazar, işçiden gelen pin durumlarıyla parçaları canlandırır.
import { KARTLAR, parcaOlcu, parcaBilgi, pinGND } from '../veri/katalog.js';
import { ucCoz } from '../denetim.js';
import { pinVeri } from '../proje.js';
import { Birlesim, oledCiz, oledTemizle, sesYoneticisi } from './ortak.js';
import { F_DARBE, F_DHT, I_ANALOG, I_GIRIS, K_DUR, K_UYKU, PIN_SAYISI, W_DURUM, W_KAPASITE, W_UZUNLUK, O_DURUM, O_UZUNLUK, O_KAPASITE, AYRAC, ortakBellek } from './esp32-ortak.js';

const TURLER = new Set([
  'wokwi-esp32-devkit-v1', 'wokwi-led', 'wokwi-rgb-led', 'wokwi-resistor', 'wokwi-buzzer', 'wokwi-servo',
  'wokwi-pushbutton', 'wokwi-potentiometer', 'wokwi-slide-switch', 'wokwi-hc-sr04', 'wokwi-pir-motion-sensor',
  'wokwi-photoresistor-sensor', 'wokwi-ntc-temperature-sensor', 'wokwi-dht22', 'wokwi-ssd1306', 'ky-modul',
]);
export const ESP32_DESTEKLI = (p) => TURLER.has(p.type);

const modulBaslik = (p) => (p.attrs?.baslik || '').toLocaleLowerCase('tr');

export function esp32Baslat({ proje, kart, wasm, elemanBul, onSeri, onHata, onAg, ayarlar, sessiz = false }) {
  const { sab, int, float, posta, olayKutusu } = ortakBellek();
  let bekleyenWeb = null;
  for (let g = 0; g < PIN_SAYISI; g++) {
    int[I_GIRIS + g] = -1;
    float[F_DHT + g * 2] = NaN;
    float[F_DHT + g * 2 + 1] = NaN;
  }
  const ayar = Object.fromEntries(ayarlar.map((k) => [k.anahtar, k.ilk ?? 0]));
  const pirBitis = {};
  const pinDurum = Array.from({ length: PIN_SAYISI }, () => ({ mod: null, deger: 0, pwm: null, ton: null, servo: null }));
  let ekranKomutlari = null;
  const ses = sesYoneticisi(sessiz);

  // --- Uçların sınıfı ---
  const kartBilgi = KARTLAR[kart.type];
  const mcu = new Map(); // uc → gpio
  const kaynak = new Map(); // uc → volt
  const toprak = new Set();
  for (const pin of parcaOlcu(kart, pinVeri).pins) {
    const uc = `${kart.id}:${pin.name}`;
    const kok = pin.name.split('.')[0];
    if (pinGND(kart, pin.name, pinVeri)) toprak.add(uc);
    else if (kartBilgi.kaynak[kok] != null) kaynak.set(uc, kartBilgi.kaynak[kok]);
    else {
      const g = kartBilgi.kodPini(pin.name);
      if (typeof g === 'number' && g < PIN_SAYISI) mcu.set(uc, g);
    }
  }
  for (const p of proje.parts) {
    if (KARTLAR[p.type]) continue;
    const b = parcaBilgi(p);
    for (const [pin, v] of Object.entries(b.kaynak || {})) kaynak.set(`${p.id}:${pin}`, v);
    if (Object.keys(b.kaynak || {}).length) for (const g of b.gnd || []) toprak.add(`${p.id}:${g}`);
  }

  // --- Sabit bağlar ---
  const sabitBaglar = proje.connections.map(([a, b]) => [a, b]);
  for (const p of proje.parts) {
    if (p.type === 'wokwi-resistor') sabitBaglar.push([`${p.id}:1`, `${p.id}:2`]);
    if (p.type === 'wokwi-pushbutton') sabitBaglar.push([`${p.id}:1.l`, `${p.id}:1.r`], [`${p.id}:2.l`, `${p.id}:2.r`]);
  }
  const kartGruplari = {};
  for (const pin of parcaOlcu(kart, pinVeri).pins) (kartGruplari[pin.name.split('.')[0]] ||= []).push(`${kart.id}:${pin.name}`);
  for (const g of Object.values(kartGruplari)) g.slice(1).forEach((u) => sabitBaglar.push([g[0], u]));
  const sabit = new Birlesim();
  for (const [x, y] of sabitBaglar) sabit.birlestir(x, y);
  const gpioBul = (uc) => {
    const k = sabit.bul(uc);
    for (const [u, g] of mcu) if (sabit.bul(u) === k) return g;
    return null;
  };

  const cikisDegeri = (g) => {
    const d = pinDurum[g];
    if (d.mod !== 'cikis') return null;
    return d.pwm != null ? (d.pwm > 0 ? 1 : 0) : d.deger;
  };
  const roleAktif = new Set();

  function hatlariCoz() {
    const b = new Birlesim();
    for (const [x, y] of sabitBaglar) b.birlestir(x, y);
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (p.type === 'wokwi-pushbutton' && el?.pressed) b.birlestir(`${p.id}:1.l`, `${p.id}:2.l`);
      if (p.type === 'wokwi-slide-switch') b.birlestir(`${p.id}:2`, el?.value ? `${p.id}:3` : `${p.id}:1`);
      if (p.type === 'ky-modul' && /röle/.test(modulBaslik(p))) b.birlestir(`${p.id}:COM`, roleAktif.has(p.id) ? `${p.id}:NO` : `${p.id}:NC`);
      if (p.type === 'ky-modul' && /kapı|kapi|reed/.test(modulBaslik(p)) && !ayar[p.id]) {
        const [a, c] = parcaOlcu(p, pinVeri).pins.map((x) => x.name);
        if (a && c) b.birlestir(`${p.id}:${a}`, `${p.id}:${c}`);
      }
    }
    const deger = new Map();
    const yaz = (uc, v) => {
      const k = b.bul(uc);
      if (!deger.has(k)) deger.set(k, v);
    };
    for (const uc of toprak) yaz(uc, 0);
    for (const uc of kaynak.keys()) yaz(uc, 1);
    for (const [uc, g] of mcu) {
      const v = cikisDegeri(g);
      if (v != null) yaz(uc, v);
    }
    const simdi = performance.now();
    for (const p of proje.parts) {
      if (p.type === 'wokwi-pir-motion-sensor') yaz(`${p.id}:OUT`, (pirBitis[p.id] || 0) > simdi ? 1 : 0);
      if (p.type === 'wokwi-photoresistor-sensor') yaz(`${p.id}:DO`, ayar[p.id] > 50 ? 0 : 1);
    }
    return { hatDegeri: (uc) => deger.get(b.bul(uc)) ?? null };
  }

  // Röle modülü: VCC beslenmiş ve IN LOW ise çeker (yaygın modüller düşük seviyede tetiklenir).
  function roleleriGuncelle(cozum) {
    for (const p of proje.parts) {
      if (p.type !== 'ky-modul' || !/röle/.test(modulBaslik(p))) continue;
      const aktif = cozum.hatDegeri(`${p.id}:VCC`) === 1 && cozum.hatDegeri(`${p.id}:IN`) === 0;
      if (aktif) roleAktif.add(p.id);
      else roleAktif.delete(p.id);
    }
  }

  function girisleriYaz(cozum) {
    for (const [uc, g] of mcu) {
      if (pinDurum[g].mod === 'cikis') continue;
      const v = cozum.hatDegeri(uc);
      Atomics.store(int, I_GIRIS + g, v == null ? -1 : v);
    }
    const analog = new Array(PIN_SAYISI).fill(null);
    const darbe = new Array(PIN_SAYISI).fill(0);
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      const beslendi = (pin) => cozum.hatDegeri(`${p.id}:${pin}`) === 1;
      let uc = null;
      let oran = null;
      if (p.type === 'wokwi-potentiometer' && el) {
        uc = `${p.id}:SIG`;
        const min = Number(el.min ?? 0);
        const max = Number(el.max ?? 1023);
        oran = (Number(el.value) - min) / (max - min || 1);
      }
      if (p.type === 'wokwi-photoresistor-sensor') { uc = `${p.id}:AO`; oran = 1 - ayar[p.id] / 100; }
      if (p.type === 'wokwi-ntc-temperature-sensor') { uc = `${p.id}:OUT`; oran = 1 / (1 + Math.exp((ayar[p.id] - 25) / 25)); }
      if (p.type === 'ky-modul' && /toprak/.test(modulBaslik(p))) { uc = `${p.id}:AO`; oran = (3500 - ayar[p.id] * 20) / 4095; }
      if (uc) {
        const g = gpioBul(uc);
        if (g != null) analog[g] = Math.round(Math.max(0, Math.min(1, oran)) * 4095);
      }
      if (p.type === 'wokwi-hc-sr04') {
        const echo = gpioBul(`${p.id}:ECHO`);
        if (echo != null && beslendi('VCC') && gpioBul(`${p.id}:TRIG`) != null) darbe[echo] = ayar[p.id] * 58;
      }
      if (p.type === 'wokwi-dht22') {
        const g = gpioBul(`${p.id}:SDA`);
        if (g != null) {
          const acik = beslendi('VCC') && cozum.hatDegeri(`${p.id}:GND`) === 0;
          float[F_DHT + g * 2] = acik ? ayar[`${p.id}:sicaklik`] : NaN;
          float[F_DHT + g * 2 + 1] = acik ? ayar[`${p.id}:nem`] : NaN;
        }
      }
    }
    for (let g = 0; g < PIN_SAYISI; g++) {
      if (analog[g] != null) Atomics.store(int, I_ANALOG + g, analog[g]);
      float[F_DARBE + g] = darbe[g];
    }
  }

  function gorselleriGuncelle(cozum) {
    const simdi = performance.now();
    const parlaklik = (uc) => {
      const g = gpioBul(uc);
      if (g != null && pinDurum[g].mod === 'cikis') return pinDurum[g].pwm ?? pinDurum[g].deger;
      return cozum.hatDegeri(uc) === 1 ? 1 : 0;
    };
    for (const p of proje.parts) {
      const el = elemanBul(p.id);
      if (!el) continue;
      if (p.type === 'wokwi-led') {
        const isik = cozum.hatDegeri(`${p.id}:C`) === 0 ? parlaklik(`${p.id}:A`) : 0;
        el.value = isik > 0.01;
        el.brightness = isik > 0.01 ? Math.max(0.2, isik) : 0;
      }
      if (p.type === 'wokwi-rgb-led') {
        const com = cozum.hatDegeri(`${p.id}:COM`) === 0;
        el.ledRed = com ? parlaklik(`${p.id}:R`) : 0;
        el.ledGreen = com ? parlaklik(`${p.id}:G`) : 0;
        el.ledBlue = com ? parlaklik(`${p.id}:B`) : 0;
      }
      if (p.type === 'wokwi-buzzer') {
        const g = gpioBul(`${p.id}:2`);
        const t = g != null ? pinDurum[g].ton : null;
        const calsin = t && t.frekans > 0 && (!t.sure || performance.timeOrigin + simdi < t.zaman + t.sure) && cozum.hatDegeri(`${p.id}:1`) === 0;
        el.hasSignal = !!calsin;
        ses.cal(p.id, calsin ? Math.min(t.frekans, 8000) : 0);
      }
      if (p.type === 'wokwi-servo') {
        const g = gpioBul(`${p.id}:PWM`);
        if (g != null && pinDurum[g].servo != null) el.angle = pinDurum[g].servo;
      }
      if (p.type === 'wokwi-pir-motion-sensor') el.ledOn = (pirBitis[p.id] || 0) > simdi;
      if (p.type === 'wokwi-ssd1306' && ekranKomutlari != null) {
        const besli = cozum.hatDegeri(`${p.id}:VIN`) === 1 || cozum.hatDegeri(`${p.id}:3V3`) === 1;
        if (besli && gpioBul(`${p.id}:DATA`) != null) oledCiz(el, ekranKomutlari);
      }
      if (p.type === 'ky-modul') {
        for (const s of el.querySelectorAll('[data-pin]')) s.classList.toggle('yuksek', cozum.hatDegeri(`${p.id}:${s.dataset.pin}`) === 1);
        const calisiyor = /röle/.test(modulBaslik(p))
          ? roleAktif.has(p.id)
          : cozum.hatDegeri(`${p.id}:+`) === 1 && cozum.hatDegeri(`${p.id}:-`) === 0;
        el.classList.toggle('calisiyor', calisiyor);
      }
    }
    ekranKomutlari = null;
  }

  // --- Olay kutusu: seri giriş, MQTT, Bluetooth, BLE. Sırayla, kutu boşaldıkça gönderilir. ---
  const olayKuyrugu = [];
  function olayGonder(...alanlar) {
    olayKuyrugu.push(alanlar.join(AYRAC));
  }
  function olayKutusunuDoldur() {
    if (!olayKuyrugu.length || Atomics.load(int, O_DURUM) !== 0) return;
    const bayt = new TextEncoder().encode(olayKuyrugu.shift()).subarray(0, O_KAPASITE);
    olayKutusu.set(bayt);
    Atomics.store(int, O_UZUNLUK, bayt.length);
    Atomics.store(int, O_DURUM, 1);
  }

  // --- Sanal MQTT sunucusu: ESP32 ve panel aynı sunucuya bağlı gibi davranır. ---
  const mqtt = { abonelikler: new Set(), kalicilar: new Map() };
  const konuEslesir = (desen, konu) => {
    const d = desen.split('/');
    const k = konu.split('/');
    for (let i = 0; i < d.length; i++) {
      if (d[i] === '#') return true;
      if (i >= k.length || (d[i] !== '+' && d[i] !== k[i])) return false;
    }
    return d.length === k.length;
  };
  const espAboneMi = (konu) => [...mqtt.abonelikler].some((a) => konuEslesir(a, konu));
  function mqttOlayi(m) {
    if (m.abone != null) {
      if (m.acik) {
        mqtt.abonelikler.add(m.abone);
        for (const [konu, veri] of mqtt.kalicilar) if (konuEslesir(m.abone, konu)) olayGonder('mqtt', konu, veri);
      } else {
        mqtt.abonelikler.delete(m.abone);
      }
    }
    if (m.yayin) {
      if (m.yayin.kalici) mqtt.kalicilar.set(m.yayin.konu, m.yayin.veri);
      if (espAboneMi(m.yayin.konu)) olayGonder('mqtt', m.yayin.konu, m.yayin.veri);
    }
  }
  // Panelden (telefon uygulaması gibi) mesaj yayınla.
  function mqttYayinla(konu, veri, kalici = false) {
    if (kalici) mqtt.kalicilar.set(konu, veri);
    if (espAboneMi(konu)) olayGonder('mqtt', konu, veri);
    onAg?.({ mqtt: { gelen: { konu, veri } } });
  }

  // --- İşçi ---
  const isci = new Worker(new URL('./esp32-isci.js', import.meta.url), { type: 'module' });
  isci.onmessage = ({ data }) => {
    if (data.tur === 'durum') {
      for (const [pin, d] of Object.entries(data.pinler)) Object.assign(pinDurum[pin], d);
      if (data.seri) onSeri?.(data.seri);
      if (data.ekran != null) ekranKomutlari = data.ekran;
    }
    if (data.tur === 'hata') onHata?.(data.mesaj);
    if (data.tur === 'ag') {
      if (data.mqtt) mqttOlayi(data.mqtt);
      onAg?.(data);
    }
    if (data.tur === 'webYanit' && bekleyenWeb) {
      clearTimeout(bekleyenWeb.zaman);
      bekleyenWeb.coz(data);
      bekleyenWeb = null;
    }
  };
  isci.onerror = (e) => onHata?.(`Çalıştırıcı açılamadı: ${e.message}`);
  const bayt = Uint8Array.from(atob(wasm), (c) => c.charCodeAt(0));
  isci.postMessage({ tur: 'baslat', sab, wasm: bayt.buffer }, [bayt.buffer]);

  let calisiyor = true;
  function kare() {
    if (!calisiyor) return;
    let cozum = hatlariCoz();
    roleleriGuncelle(cozum);
    cozum = hatlariCoz();
    girisleriYaz(cozum);
    gorselleriGuncelle(cozum);
    olayKutusunuDoldur();
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);

  // Mini tarayıcıdan ESP32 web sunucusuna istek: posta kutusuna yaz, handleClient() alsın.
  function webIstek(yontem, yol, sorgu = '', govde = '') {
    return new Promise((coz, reddet) => {
      if (bekleyenWeb || Atomics.load(int, W_DURUM) !== 0) return reddet(new Error('ESP32 önceki isteği bitirmedi.'));
      const bayt = new TextEncoder().encode(`${yontem}
${yol}
${sorgu}
${govde}`);
      if (bayt.length > W_KAPASITE) return reddet(new Error('İstek çok büyük.'));
      posta.set(bayt);
      Atomics.store(int, W_UZUNLUK, bayt.length);
      Atomics.store(int, W_DURUM, 1);
      const zaman = setTimeout(() => {
        bekleyenWeb = null;
        Atomics.store(int, W_DURUM, 0);
        reddet(new Error('ESP32 5 saniyede yanıt vermedi. loop() içinde server.handleClient() çağrılıyor mu?'));
      }, 5000);
      bekleyenWeb = { coz, zaman };
    });
  }

  return {
    webIstek,
    seriGonder: (metin) => olayGonder('seri', metin),
    mqttYayinla,
    btBaglan: (acik) => olayGonder('btbaglan', acik ? 1 : 0),
    btGonder: (metin) => olayGonder('bt', metin),
    bleBaglan: (acik) => olayGonder('ble', acik ? 1 : 2, -1),
    bleYaz: (no, veri) => olayGonder('ble', 3, no, veri),
    bleOku: (no) => olayGonder('ble', 4, no),
    ayarla(anahtar, deger) { ayar[anahtar] = deger; },
    hareket(id) { pirBitis[id] = performance.now() + 3000; },
    durdur() {
      calisiyor = false;
      Atomics.store(int, K_DUR, 1);
      Atomics.notify(int, K_UYKU);
      setTimeout(() => isci.terminate(), 200);
      for (const p of proje.parts) {
        const el = elemanBul(p.id);
        if (!el) continue;
        if (p.type === 'wokwi-led') { el.value = false; el.brightness = 0; }
        if (p.type === 'wokwi-rgb-led') { el.ledRed = 0; el.ledGreen = 0; el.ledBlue = 0; }
        if (p.type === 'wokwi-buzzer') el.hasSignal = false;
        if (p.type === 'wokwi-pir-motion-sensor') el.ledOn = false;
        if (p.type === 'wokwi-ssd1306') oledTemizle(el);
        if (p.type === 'ky-modul') {
          el.classList.remove('calisiyor');
          for (const s of el.querySelectorAll('[data-pin]')) s.classList.remove('yuksek');
        }
      }
      ses.kapat();
    },
  };
}
