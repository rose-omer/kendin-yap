// ESP32 çalıştırıcısı ile ana sayfa arasında paylaşılan bellek düzeni.
// Ana sayfa girişleri (buton, sensör) buraya yazar; işçi kodu bekletmeden okur.
export const PIN_SAYISI = 40;

// Int32 bölgesi
export const K_DUR = 0; // 1 olunca işçi durur
export const K_UYKU = 1; // Atomics.wait için boş hücre
export const I_GIRIS = 2; // [40] dijital giriş: -1 sürülmüyor, 0, 1
export const I_ANALOG = I_GIRIS + PIN_SAYISI; // [40] 0–4095
// Web isteği posta kutusu: 0 boş, 1 istek bekliyor, 2 işçi aldı
export const W_DURUM = I_ANALOG + PIN_SAYISI;
export const W_UZUNLUK = W_DURUM + 1;
// Olay kutusu (seri giriş, MQTT, Bluetooth, BLE): 0 boş, 1 olay bekliyor
export const O_DURUM = W_UZUNLUK + 1;
export const O_UZUNLUK = O_DURUM + 1;
// Tuş takımı: basılı tuşların birleştirdiği GPIO çiftleri [satır, sütun]; -1 boş
export const KISA_SAYISI = 8;
export const I_KISA = O_UZUNLUK + 1;
const INT_SAYISI = I_KISA + KISA_SAYISI * 2;

// Float64 bölgesi (8 bayt hizalı)
const F_BASLANGIC = Math.ceil((INT_SAYISI * 4) / 8) * 8;
export const F_DARBE = 0; // [40] pulseIn sonucu, µs (0: darbe yok)
export const F_DHT = F_DARBE + PIN_SAYISI; // [40*2] sıcaklık, nem (NaN: sensör yok)
export const F_OLCU = F_DHT + PIN_SAYISI * 2; // [40] pine bağlı ölçüm: HX711 ham değeri (NaN: yok)
export const F_CIHAZ = F_OLCU + PIN_SAYISI; // [8*8] I2C cihazlarının ölçümleri (MPU6050: ax ay az gx gy gz sıcaklık)
export const CIHAZ_ALANI = 8;
const FLOAT_SAYISI = F_CIHAZ + CIHAZ_ALANI * 8;
const W_BASLANGIC = F_BASLANGIC + FLOAT_SAYISI * 8;
export const W_KAPASITE = 32 * 1024; // istek en çok 32 KB
const O_BASLANGIC = W_BASLANGIC + W_KAPASITE;
export const O_KAPASITE = 16 * 1024;
export const AYRAC = String.fromCharCode(31); // olay alanları arasındaki ayraç (ASCII 31)

export function ortakBellek() {
  const sab = new SharedArrayBuffer(O_BASLANGIC + O_KAPASITE);
  return gorunumler(sab);
}

export function gorunumler(sab) {
  const int = new Int32Array(sab, 0, INT_SAYISI);
  const float = new Float64Array(sab, F_BASLANGIC, FLOAT_SAYISI);
  const posta = new Uint8Array(sab, W_BASLANGIC, W_KAPASITE);
  const olayKutusu = new Uint8Array(sab, O_BASLANGIC, O_KAPASITE);
  return { sab, int, float, posta, olayKutusu };
}
