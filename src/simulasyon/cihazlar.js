// Parça içindeki yongaların taklitleri: DS1307, MPU6050 (I2C), step motor sayacı, NEC kızılötesi kodu,
// DHT22 ve HX711 verisi. Sayfa nesnesi kullanmaz; hem ana sayfa (Uno) hem ESP32 işçisi içe aktarır.

const bcd = (n) => ((Math.floor(n / 10) << 4) | (n % 10)) & 0xff;
const bcdCoz = (b) => (b >> 4) * 10 + (b & 0x0f);

// Yazmaçlı I2C cihazı: yazmada ilk bayt yazmaç adresidir, sonrakiler sırayla yazılır.
// Okuma, son adresten başlar ve kendiliğinden ilerler.
class YazmacliCihaz {
  constructor(boyut) {
    this.y = new Uint8Array(boyut);
    this.isaret = 0;
    this.ilkBayt = false;
  }
  basla(yazma) {
    this.ilkBayt = yazma;
    if (!yazma) this.okumaBasla?.();
  }
  yaz(b) {
    if (this.ilkBayt) {
      this.isaret = b % this.y.length;
      this.ilkBayt = false;
      return true;
    }
    this.yazmacYaz(this.isaret, b);
    this.isaret = (this.isaret + 1) % this.y.length;
    return true;
  }
  oku() {
    const v = this.yazmacOku(this.isaret);
    this.isaret = (this.isaret + 1) % this.y.length;
    return v;
  }
  dur() {}
  yazmacYaz(i, b) { this.y[i] = b; }
  yazmacOku(i) { return this.y[i]; }
}

// DS1307 gerçek zaman saati. Bilgisayarın saatiyle başlar; adjust() ile yazılan saat ileri sayar.
export class Ds1307 extends YazmacliCihaz {
  constructor() {
    super(64);
    this.fark = 0; // ms; yazılan saat ile bilgisayar saati arasındaki fark
    this.durdu = false;
    this.zamaniYukle();
  }
  zamaniYukle() {
    const t = new Date(Date.now() + this.fark);
    this.y[0] = bcd(t.getSeconds()) | (this.durdu ? 0x80 : 0);
    this.y[1] = bcd(t.getMinutes());
    this.y[2] = bcd(t.getHours());
    this.y[3] = t.getDay() + 1;
    this.y[4] = bcd(t.getDate());
    this.y[5] = bcd(t.getMonth() + 1);
    this.y[6] = bcd(t.getFullYear() % 100);
  }
  okumaBasla() { this.zamaniYukle(); }
  basla(yazma) {
    super.basla(yazma);
    if (yazma) {
      this.zamaniYukle();
      this.saatYazildi = false;
    }
  }
  yazmacYaz(i, b) {
    this.y[i] = b;
    if (i < 7) this.saatYazildi = true;
  }
  dur() {
    if (!this.saatYazildi) return;
    this.saatYazildi = false;
    const y = this.y;
    this.durdu = !!(y[0] & 0x80);
    const saat = y[2] & 0x40 ? (bcdCoz(y[2] & 0x1f) % 12) + (y[2] & 0x20 ? 12 : 0) : bcdCoz(y[2] & 0x3f);
    const yeni = new Date(2000 + bcdCoz(y[6]), bcdCoz(y[5] & 0x1f) - 1, bcdCoz(y[4] & 0x3f), saat, bcdCoz(y[1] & 0x7f), bcdCoz(y[0] & 0x7f));
    this.fark = yeni.getTime() - Date.now();
  }
}

// MPU6050 ivme ve jiroskop. deger(): { ax, ay, az (g), gx, gy, gz (°/s), sicaklik (°C) }
export class Mpu6050 extends YazmacliCihaz {
  constructor(deger) {
    super(128);
    this.deger = deger;
    this.y[0x6b] = 0x40; // uyku
    this.y[0x75] = 0x68; // WHO_AM_I
  }
  yazmacYaz(i, b) {
    if (i === 0x6b && b & 0x80) {
      // Sıfırlama: yazmaçlar ilk değerine döner, sıfırlama biti hemen kalkar.
      this.y.fill(0);
      this.y[0x6b] = 0x40;
      this.y[0x75] = 0x68;
      return;
    }
    if (i === 0x75) return;
    this.y[i] = b;
  }
  okumaBasla() {
    const d = this.deger();
    const ivmeLsb = 16384 / 2 ** ((this.y[0x1c] >> 3) & 3);
    const donmeLsb = 131 / 2 ** ((this.y[0x1b] >> 3) & 3);
    const ham = [d.ax * ivmeLsb, d.ay * ivmeLsb, d.az * ivmeLsb, (d.sicaklik - 36.53) * 340, d.gx * donmeLsb, d.gy * donmeLsb, d.gz * donmeLsb];
    ham.forEach((v, k) => {
      const s = Math.max(-32768, Math.min(32767, Math.round(v))) & 0xffff;
      this.y[0x3b + k * 2] = s >> 8;
      this.y[0x3c + k * 2] = s & 0xff;
    });
  }
}

// Bir projedeki I2C cihazları. tanimlar: [{ tur: 'ds1307' | 'mpu6050', adres, deger? }]
export function i2cCihazlari(tanimlar) {
  const harita = new Map();
  for (const t of tanimlar) {
    if (t.tur === 'ds1307') harita.set(t.adres, new Ds1307());
    if (t.tur === 'mpu6050') harita.set(t.adres, new Mpu6050(t.deger));
  }
  return harita;
}

// Step motor: bobin uçlarının seviyesinden adım sayar. Yarım adım 0,9° (200 adımlı motor).
const FAZ = { '1,0': 0, '1,1': 1, '0,1': 2, '-1,1': 3, '-1,0': 4, '-1,-1': 5, '0,-1': 6, '1,-1': 7 };
export class AdimSayaci {
  constructor() {
    this.faz = null;
    this.yarimAdim = 0;
  }
  guncelle(aArti, aEksi, bArti, bEksi) {
    const f = FAZ[`${(aArti ? 1 : 0) - (aEksi ? 1 : 0)},${(bArti ? 1 : 0) - (bEksi ? 1 : 0)}`];
    if (f == null) return;
    if (this.faz != null) {
      const fark = ((f - this.faz + 12) % 8) - 4; // -4..3
      if (fark !== -4) this.yarimAdim += fark;
    }
    this.faz = f;
  }
  get aci() {
    return (((this.yarimAdim * 0.9) % 360) + 360) % 360;
  }
}

// NEC kızılötesi çerçevesi: [süre µs, seviye] listesi. Alıcı çıkışı ışık varken LOW verir.
export function necDalgasi(adres, komut) {
  const baytlar = [adres & 0xff, ~adres & 0xff, komut & 0xff, ~komut & 0xff];
  const d = [[9000, 0], [4500, 1]];
  for (const b of baytlar) {
    for (let i = 0; i < 8; i++) d.push([562, 0], [(b >> i) & 1 ? 1687 : 562, 1]);
  }
  d.push([562, 0]);
  return d;
}

// Eski IRremote sürümlerinin results.value değeri: 32 bit, ilk gelen bit en üstte.
export function necEskiDeger(adres, komut) {
  const ham = ((~komut & 0xff) << 24) | ((komut & 0xff) << 16) | ((~adres & 0xff) << 8) | (adres & 0xff);
  let ters = 0;
  for (let i = 0; i < 32; i++) if (ham & (1 << i)) ters |= 1 << (31 - i);
  return ters >>> 0;
}

// DHT22 yanıtı: 40 bit (nem ×10, sıcaklık ×10, sağlama). [süre µs, seviye] listesi.
export function dht22Dalgasi(sicaklik, nem) {
  const n = Math.round(Math.max(0, Math.min(100, nem)) * 10);
  const s = Math.round(Math.abs(sicaklik) * 10) | (sicaklik < 0 ? 0x8000 : 0);
  const baytlar = [n >> 8, n & 0xff, s >> 8, s & 0xff];
  baytlar.push(baytlar.reduce((a, b) => a + b, 0) & 0xff);
  const d = [[30, 1], [80, 0], [80, 1]];
  for (const b of baytlar) {
    for (let i = 7; i >= 0; i--) d.push([50, 0], [(b >> i) & 1 ? 70 : 26, 1]);
  }
  d.push([50, 0]);
  return d;
}

// HX711 ham değeri: şablonlardaki kalibrasyonla uyumlu, 1 g = 420 birim. 24 bit sınırında.
export const HX711_BIRIM = 420;
export const hx711Ham = (gram) => Math.max(-8388608, Math.min(8388607, Math.round(gram * HX711_BIRIM)));

// Yaygın 21 tuşlu kumandanın NEC komutları (adres 0x00).
export const IR_TUSLARI = [
  ['CH-', 0x45], ['CH', 0x46], ['CH+', 0x47],
  ['⏮', 0x44], ['⏭', 0x40], ['⏯', 0x43],
  ['−', 0x07], ['+', 0x15], ['EQ', 0x09],
  ['0', 0x16], ['100+', 0x19], ['200+', 0x0d],
  ['1', 0x0c], ['2', 0x18], ['3', 0x5e],
  ['4', 0x08], ['5', 0x1c], ['6', 0x5a],
  ['7', 0x42], ['8', 0x52], ['9', 0x4a],
];
