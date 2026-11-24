// ESP32 çalıştırıcısı (Web Worker): derlenmiş sketch.wasm'ı koşturur.
// delay() işçiyi gerçekten bekletir (Atomics.wait); girişler ortak bellekten okunur,
// çıkışlar ~60 Hz ile ana sayfaya gönderilir.
import { F_DARBE, F_DHT, I_ANALOG, I_GIRIS, K_DUR, K_UYKU, PIN_SAYISI, W_DURUM, W_UZUNLUK, O_DURUM, O_UZUNLUK, AYRAC, gorunumler } from './esp32-ortak.js';

const INPUT = 0x01;
const OUTPUT = 0x03;
const PULLUP = 0x04;

let int;
let float;
let posta;
let olayKutusu;
let bellek;
let disa;
const t0 = performance.now();
const pinMod = new Int32Array(PIN_SAYISI);
const cikis = new Int32Array(PIN_SAYISI);
const kesmeModu = new Int32Array(PIN_SAYISI);
const sonGiris = new Int32Array(PIN_SAYISI);
let degisen = {};
let seri = '';
let ekran = null;
let sonGonderim = 0;
let kesmede = false;

// --- Ağ durumu ---
const wifi = { durum: 'kapali', ssid: '', ap: false, zaman: 0 };
const IP_STA = 0xc0a80132; // 192.168.1.50
const IP_AP = 0xc0a80401; // 192.168.4.1
let alBayt = new Uint8Array(0); // C++'a aktarılacak son veri (web isteği ya da HTTP yanıtı)
const kodla = new TextEncoder();

// --- Kablosuz ve seri giriş durumu ---
const girisler = [[], []]; // 0: Serial, 1: Bluetooth seri (bayt dizileri)
let btBagli = 0;
const mqttKuyruk = [];
let olayda = false;
let btCikis = '';

// Ana sayfanın olay kutusuna bıraktığı olayı işle (seri giriş, MQTT, Bluetooth, BLE).
function olaylariIsle() {
  if (olayda || Atomics.load(int, O_DURUM) !== 1) return;
  const n = Atomics.load(int, O_UZUNLUK);
  const [kanal, ...alanlar] = new TextDecoder().decode(olayKutusu.slice(0, n)).split(AYRAC);
  Atomics.store(int, O_DURUM, 0);
  if (kanal === 'seri' || kanal === 'bt') girisler[kanal === 'seri' ? 0 : 1].push(...kodla.encode(alanlar[0]));
  if (kanal === 'btbaglan') btBagli = Number(alanlar[0]);
  if (kanal === 'mqtt') mqttKuyruk.push(`${alanlar[0]}${AYRAC}${alanlar[1]}`);
  if (kanal === 'ble') {
    const [tur, no, veri = ''] = alanlar;
    alBayt = kodla.encode(veri);
    olayda = true;
    try {
      disa.ky_ble_olay(Number(tur), Number(no));
    } finally {
      olayda = false;
    }
  }
}

function btGonder() {
  if (btCikis) {
    postMessage({ tur: 'ag', bt: { veri: btCikis } });
    btCikis = '';
  }
}

function wifiDurumu() {
  if (wifi.durum === 'baglaniyor' && performance.now() - wifi.zaman > 1500) {
    wifi.durum = 'bagli';
    postMessage({ tur: 'ag', wifi: { durum: 'bagli', ssid: wifi.ssid, ap: wifi.ap, ip: wifi.ap ? '192.168.4.1' : '192.168.1.50' } });
  }
  return wifi.durum === 'bagli' ? 3 : 6;
}

// İnternet isteği: işçide eşzamanlı XHR, yerel sunucunun vekiline gider.
// Biçim: YÖNTEM, URL, başlıklar (CR ile ayrılmış), GÖVDE; her biri yeni satırla ayrılır.
function httpIstek(ham) {
  const [yontem, url, basliklarHam, ...govdeParcalari] = ham.split('\n');
  const basliklar = Object.fromEntries((basliklarHam || '').split('\r').filter(Boolean).map((b) => {
    const i = b.indexOf(':');
    return [b.slice(0, i).trim(), b.slice(i + 1).trim()];
  }));
  try {
    const x = new XMLHttpRequest();
    x.open('POST', '/__vekil', false);
    x.setRequestHeader('Content-Type', 'application/json');
    x.send(JSON.stringify({ yontem, url, basliklar, govde: govdeParcalari.join('\n') }));
    const y = JSON.parse(x.responseText);
    alBayt = kodla.encode(y.govde || y.hata || '');
    postMessage({ tur: 'ag', http: { yontem, url, kod: y.kod ?? -1, hata: y.hata } });
    return y.kod ?? -1;
  } catch (e) {
    alBayt = new Uint8Array(0);
    postMessage({ tur: 'ag', http: { yontem, url, kod: -1, hata: String(e.message || e) } });
    return -1;
  }
}

const metin = (p, n) => new TextDecoder().decode(new Uint8Array(bellek.buffer, p, n));
const durdu = () => Atomics.load(int, K_DUR) === 1;

function pinDegisti(pin, alan, deger) {
  (degisen[pin] ||= {})[alan] = deger;
}

function gonder(zorla = false) {
  const simdi = performance.now();
  if (!zorla && simdi - sonGonderim < 16) return;
  sonGonderim = simdi;
  if (Object.keys(degisen).length || seri || ekran != null) {
    postMessage({ tur: 'durum', pinler: degisen, seri, ekran });
    degisen = {};
    seri = '';
    ekran = null;
  }
}

function girisOku(pin) {
  if (pin < 0 || pin >= PIN_SAYISI) return 0;
  if (pinMod[pin] === OUTPUT) return cikis[pin];
  const v = Atomics.load(int, I_GIRIS + pin);
  if (v === -1) return pinMod[pin] & PULLUP ? 1 : 0;
  return v;
}

// İzlenen pinlerde kenar varsa kesme fonksiyonunu çağır.
function kesmeleriDenetle() {
  if (kesmede) return;
  for (let pin = 0; pin < PIN_SAYISI; pin++) {
    const mod = kesmeModu[pin];
    if (!mod) continue;
    const v = girisOku(pin);
    const eski = sonGiris[pin];
    sonGiris[pin] = v;
    const yukselen = !eski && v;
    const dusen = eski && !v;
    // RISING 1, FALLING 2, CHANGE 3, ONLOW 4, ONHIGH 5
    if ((mod === 1 && yukselen) || (mod === 2 && dusen) || (mod === 3 && (yukselen || dusen)) || (mod === 4 && !v) || (mod === 5 && v)) {
      kesmede = true;
      try {
        disa.ky_kesme(pin);
      } finally {
        kesmede = false;
      }
    }
  }
}

function bekle(ms) {
  gonder(true);
  btGonder();
  const bitis = performance.now() + ms;
  for (;;) {
    if (durdu()) throw new Error('durdu');
    olaylariIsle();
    kesmeleriDenetle();
    const kalan = bitis - performance.now();
    if (kalan <= 0) return;
    if (kalan < 1) continue; // mikro saniye beklemeleri: kısa döngü
    Atomics.wait(int, K_UYKU, 0, Math.min(kalan, 10));
  }
}

const env = {
  ky_pin_modu(pin, mod) {
    if (pin < 0 || pin >= PIN_SAYISI) return;
    pinMod[pin] = mod;
    sonGiris[pin] = girisOku(pin);
    pinDegisti(pin, 'mod', mod === OUTPUT ? 'cikis' : 'giris');
  },
  ky_yaz(pin, deger) {
    if (pin < 0 || pin >= PIN_SAYISI) return;
    if (pinMod[pin] !== OUTPUT) {
      pinMod[pin] = OUTPUT;
      pinDegisti(pin, 'mod', 'cikis');
    }
    cikis[pin] = deger;
    pinDegisti(pin, 'deger', deger);
    pinDegisti(pin, 'pwm', null);
    gonder();
  },
  ky_oku(pin) {
    const v = girisOku(pin);
    gonder();
    return v;
  },
  ky_analog_oku(pin) {
    gonder();
    return pin >= 0 && pin < PIN_SAYISI ? Atomics.load(int, I_ANALOG + pin) : 0;
  },
  ky_pwm(pin, oran) {
    if (pin < 0 || pin >= PIN_SAYISI) return;
    pinMod[pin] = OUTPUT;
    cikis[pin] = oran > 0 ? 1 : 0;
    pinDegisti(pin, 'mod', 'cikis');
    pinDegisti(pin, 'pwm', Math.max(0, Math.min(1, oran)));
    gonder();
  },
  ky_ton(pin, frekans, sure) {
    pinDegisti(pin, 'ton', { frekans, sure, zaman: performance.timeOrigin + performance.now() });
    gonder(true);
  },
  ky_servo(pin, aci) {
    pinDegisti(pin, 'servo', aci);
    gonder();
  },
  ky_seri(p, n) {
    seri += metin(p, n);
    if (seri.length > 4000) gonder(true);
  },
  ky_bekle: bekle,
  ky_zaman_us: () => (performance.now() - t0) * 1000,
  ky_darbe(pin, seviye, zamanAsimiUs) {
    const us = pin >= 0 && pin < PIN_SAYISI ? float[F_DARBE + pin] : 0;
    if (us > 0) {
      bekle(us / 1000);
      return us;
    }
    bekle(Math.min(zamanAsimiUs / 1000, 50));
    return 0;
  },
  ky_dht(pin, tur) {
    return pin >= 0 && pin < PIN_SAYISI ? float[F_DHT + pin * 2 + tur] : NaN;
  },
  ky_ekran(p, n) {
    ekran = metin(p, n);
    gonder();
  },
  ky_kesme_izle(pin, mod) {
    if (pin < 0 || pin >= PIN_SAYISI) return;
    kesmeModu[pin] = mod;
    sonGiris[pin] = girisOku(pin);
  },
  ky_rastgele: () => (Math.random() * 2 ** 31) | 0,

  ky_wifi_baglan(p, n, ap) {
    wifi.ssid = metin(p, n);
    wifi.ap = !!ap;
    wifi.durum = ap ? 'bagli' : 'baglaniyor';
    wifi.zaman = performance.now();
    postMessage({ tur: 'ag', wifi: { durum: wifi.durum, ssid: wifi.ssid, ap: wifi.ap, ip: ap ? '192.168.4.1' : '' } });
  },
  ky_wifi_durum: wifiDurumu,
  ky_wifi_kes() {
    wifi.durum = 'kapali';
    postMessage({ tur: 'ag', wifi: { durum: 'kapali', ssid: wifi.ssid } });
  },
  ky_wifi_ip: () => (wifiDurumu() === 3 ? (wifi.ap ? IP_AP : IP_STA) : 0),
  ky_web_basla(port) {
    postMessage({ tur: 'ag', web: { port } });
  },
  ky_web_istek() {
    if (Atomics.load(int, W_DURUM) !== 1) return 0;
    const n = Atomics.load(int, W_UZUNLUK);
    alBayt = posta.slice(0, n);
    Atomics.store(int, W_DURUM, 2);
    return 1;
  },
  ky_web_yanit(kod, tp, tn, gp, gn, bp, bn) {
    postMessage({ tur: 'webYanit', kod, icerikTuru: metin(tp, tn), govde: metin(gp, gn), basliklar: metin(bp, bn) });
    Atomics.store(int, W_DURUM, 0);
    gonder(true);
  },
  ky_http(p, n) {
    gonder(true);
    return httpIstek(metin(p, n));
  },
  ky_al_uzunluk: () => alBayt.length,
  ky_al_kopyala(p, n) {
    new Uint8Array(bellek.buffer, p, n).set(alBayt.subarray(0, n));
  },
  ky_akis_say(k) {
    olaylariIsle();
    return girisler[k]?.length || 0;
  },
  ky_akis_oku(k) {
    olaylariIsle();
    return girisler[k]?.length ? girisler[k].shift() : -1;
  },
  ky_akis_bak(k) {
    return girisler[k]?.length ? girisler[k][0] : -1;
  },
  ky_mqtt_baglan(sp, sn, port, kp, kn) {
    const sunucu = metin(sp, sn);
    postMessage({ tur: 'ag', mqtt: { durum: 'bagli', sunucu, port, kimlik: metin(kp, kn) } });
    return 1;
  },
  ky_mqtt_kes() {
    postMessage({ tur: 'ag', mqtt: { durum: 'kapali' } });
  },
  ky_mqtt_abone(p, n, abone) {
    postMessage({ tur: 'ag', mqtt: { abone: metin(p, n), acik: !!abone } });
  },
  ky_mqtt_yayinla(kp, kn, vp, vn, kalici) {
    postMessage({ tur: 'ag', mqtt: { yayin: { konu: metin(kp, kn), veri: metin(vp, vn), kalici: !!kalici } } });
  },
  ky_mqtt_al() {
    olaylariIsle();
    if (!mqttKuyruk.length) return 0;
    alBayt = kodla.encode(mqttKuyruk.shift());
    return 1;
  },
  ky_bt_basla(p, n) {
    postMessage({ tur: 'ag', bt: { ad: metin(p, n) } });
  },
  ky_bt_yaz(p, n) {
    btCikis += metin(p, n);
    if (btCikis.length > 2000 || btCikis.includes('\n')) btGonder();
  },
  ky_bt_bagli() {
    olaylariIsle();
    return btBagli;
  },
  ky_ble_basla(p, n) {
    postMessage({ tur: 'ag', ble: { ad: metin(p, n) } });
  },
  ky_ble_ozellik(no, up, un, sp, sn, oz) {
    postMessage({ tur: 'ag', ble: { ozellik: { no, uuid: metin(up, un), servis: metin(sp, sn), oz } } });
  },
  ky_ble_deger(no, p, n) {
    postMessage({ tur: 'ag', ble: { deger: { no, veri: metin(p, n) } } });
  },
  ky_ble_bildir(no) {
    postMessage({ tur: 'ag', ble: { bildir: no } });
  },
  ky_ble_yayin(acik) {
    postMessage({ tur: 'ag', ble: { yayin: !!acik } });
  },
  ky_saat_ofset() {},
};

// WASI: yalnız printf (fd_write) ve saat gerçekten kullanılır; gerisi boş döner.
const wasi = {
  fd_write(fd, iovs, iovsLen, yazilanPtr) {
    const g = new DataView(bellek.buffer);
    let toplam = 0;
    for (let i = 0; i < iovsLen; i++) {
      const p = g.getUint32(iovs + i * 8, true);
      const n = g.getUint32(iovs + i * 8 + 4, true);
      if (fd === 1 || fd === 2) seri += metin(p, n);
      toplam += n;
    }
    g.setUint32(yazilanPtr, toplam, true);
    return 0;
  },
  clock_time_get(id, hassasiyet, ptr) {
    // id 0: gerçek saat (time()), diğerleri: çalışma süresi
    const ns = id === 0 ? (performance.timeOrigin + performance.now()) * 1e6 : (performance.now() - t0) * 1e6;
    new DataView(bellek.buffer).setBigUint64(ptr, BigInt(Math.round(ns)), true);
    return 0;
  },
  random_get(ptr, n) {
    crypto.getRandomValues(new Uint8Array(bellek.buffer, ptr, n));
    return 0;
  },
  proc_exit() {
    throw new Error('durdu');
  },
};
const wasiVekil = new Proxy(wasi, { get: (h, ad) => h[ad] || (() => 52) }); // 52: ENOSYS

onmessage = async ({ data }) => {
  if (data.tur !== 'baslat') return;
  ({ int, float, posta, olayKutusu } = gorunumler(data.sab));
  try {
    const { instance } = await WebAssembly.instantiate(data.wasm, { env, wasi_snapshot_preview1: wasiVekil });
    disa = instance.exports;
    bellek = disa.memory;
    disa._initialize?.();
    postMessage({ tur: 'basladi' });
    disa.ky_kur();
    let sonUyku = performance.now();
    while (!durdu()) {
      disa.ky_dongu();
      olaylariIsle();
      kesmeleriDenetle();
      btGonder();
      gonder();
      // delay() kullanmayan loop() işlemciyi tamamen yemesin.
      if (performance.now() - sonUyku > 15) {
        Atomics.wait(int, K_UYKU, 0, 1);
        sonUyku = performance.now();
      }
    }
  } catch (e) {
    if (e.message !== 'durdu') {
      gonder(true);
      postMessage({ tur: 'hata', mesaj: `Kod çalışırken durdu: ${e.message}` });
      return;
    }
  }
  gonder(true);
  postMessage({ tur: 'bitti' });
};
