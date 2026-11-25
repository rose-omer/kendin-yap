// Parça kataloğu: Türkçe adlar, besleme aralıkları ve güvenlik bilgisi.
// Pin konumları src/veri/pinler.json dosyasından gelir (Wokwi parçalarından döküldü).
// Tarayıcıda ve Node'da (scripts/denetle.mjs) aynı dosya kullanılır; bu yüzden pinler dışarıdan verilir.

export const KY_MODUL = 'ky-modul';

// Kartlar: mantık gerilimi, besleme çıkışları ve kod içindeki pin numarası.
export const KARTLAR = {
  'wokwi-esp32-devkit-v1': {
    mantik: 3.3,
    kaynak: { VIN: 5, '3V3': 3.3 },
    yalnizGiris: ['D34', 'D35', 'VP', 'VN'],
    acilisPinleri: {
      D2: 'Açılış pini: yükleme sırasında LOW kalmalı. LED ya da sensör çoğu zaman sorun çıkarmaz.',
      D5: 'Açılış pini: açılışta HIGH olmalı.',
      D12: 'Açılış pini: açılışta HIGH olursa kart başlamaz. Buraya pull-up koyma.',
      D15: 'Açılış pini: açılışta HIGH olmalı.',
    },
    kodPini(ad) {
      const ozel = { RX2: 16, TX2: 17, RX0: 3, TX0: 1, VP: 36, VN: 39 };
      if (ad in ozel) return ozel[ad];
      const m = /^D(\d+)$/.exec(ad);
      return m ? Number(m[1]) : null;
    },
    yukleme: [
      'Arduino IDE\'yi aç. Dosya › Tercihler › "Ek kart yöneticisi adresleri" kutusuna şunu yaz: https://espressif.github.io/arduino-esp32/package_esp32_index.json',
      'Araçlar › Kart › Kart Yöneticisi\'nde "esp32" ara ve "esp32 by Espressif" paketini kur.',
      'Araçlar › Kart › "ESP32 Dev Module" seç.',
      'Kartı USB ile bağla. Araçlar › Port\'tan yeni çıkan COM portunu seç.',
      'Yükle (→) düğmesine bas. "Connecting..." yazısında takılırsa karttaki BOOT düğmesine 2 saniye bas.',
    ],
  },
  'wokwi-arduino-uno': {
    mantik: 5,
    kaynak: { '5V': 5, '3.3V': 3.3 },
    kodPini: arduinoPini,
    yukleme: arduinoYukleme('Arduino Uno'),
  },
  'wokwi-arduino-nano': {
    mantik: 5,
    kaynak: { '5V': 5, '3.3V': 3.3 },
    kodPini: arduinoPini,
    yukleme: [
      ...arduinoYukleme('Arduino Nano'),
      'Klon Nano yüklenmezse Araçlar › İşlemci › "ATmega328P (Old Bootloader)" seç.',
    ],
  },
  'wokwi-arduino-mega': {
    mantik: 5,
    kaynak: { '5V': 5, '3.3V': 3.3 },
    kodPini: arduinoPini,
    yukleme: arduinoYukleme('Arduino Mega or Mega 2560'),
  },
  'wokwi-nano-rp2040-connect': {
    mantik: 3.3,
    kaynak: { '3.3V': 3.3 },
    kodPini: (ad) => (/^(D\d+|A\d)$/.test(ad) ? ad : null),
    yukleme: arduinoYukleme('Arduino Nano RP2040 Connect'),
  },
};

function arduinoPini(ad) {
  if (/^\d+$/.test(ad)) return Number(ad);
  if (/^A\d+$/.test(ad)) return ad;
  return null;
}

function arduinoYukleme(kart) {
  return [
    'Arduino IDE\'yi aç.',
    `Araçlar › Kart › "${kart}" seç.`,
    'Kartı USB ile bağla. Araçlar › Port\'tan yeni çıkan COM portunu seç.',
    'Yükle (→) düğmesine bas. "Yükleme tamamlandı" yazısını bekle.',
  ];
}

// Parça bilgisi. besleme: pin → [en az, en çok] volt. mcuCikis: kartın sürdüğü pinler.
// cikis5v: parça 5 V ile beslenince bu pinler 5 V sinyal verir.
export const PARCALAR = {
  'wokwi-esp32-devkit-v1': { ad: 'ESP32 DevKit V1', kategori: 'Kart', arama: 'ESP32', iceren: ['esp32', 'kart'], haric: ['cam', 'kamera', 's3', 'c3', 'c6', 's2', 'shield', 'genişletme', 'genisletme', 'lora', 'ttgo', 'oled', 'espduino', 'wemos', 'd1'], ozet: 'Wi-Fi ve Bluetooth\'lu kart. Pinleri 3,3 V çalışır.' },
  'wokwi-arduino-uno': { ad: 'Arduino Uno', kategori: 'Kart', arama: 'Arduino Uno', iceren: ['uno'], haric: ['kutu', 'muhafaza', 'shield', 'kablo', 'pleksi', 'kit', 'set', 'başlangıç'], ozet: 'En yaygın başlangıç kartı. Pinleri 5 V çalışır.' },
  'wokwi-arduino-nano': { ad: 'Arduino Nano', kategori: 'Kart', arama: 'Arduino Nano', iceren: ['nano'], haric: ['shield', 'kablo', '33', 'every', 'rp2040', 'esp32', 'ble', 'iot', 'kit'], ozet: 'Uno\'nun küçüğü; breadboard\'a takılır. 5 V.' },
  'wokwi-arduino-mega': { ad: 'Arduino Mega 2560', kategori: 'Kart', arama: 'Arduino Mega 2560', iceren: ['mega', '2560', 'kart'], haric: ['kutu', 'pleksi', 'shield', 'kablo', 'kit', 'ramps', 'etiket', 'header'], ozet: 'Çok pinli büyük kart. 5 V.' },
  'wokwi-nano-rp2040-connect': { ad: 'Arduino Nano RP2040 Connect', kategori: 'Kart', arama: 'Nano RP2040', iceren: ['rp2040'], haric: [], ozet: 'Wi-Fi\'lı küçük kart. 3,3 V.' },

  'wokwi-led': { ad: 'LED', kategori: 'Işık ve ses', arama: '5mm led', iceren: ['led'], haric: ['distans', 'standoff', 'rgb', 'şerit', 'serit', 'ampul', 'modül', 'lamba'], ozet: 'Uzun bacak (A, anot) +, kısa bacak (C, katot) GND.', mcuCikis: ['A'], direncIster: true, varsayilan: { color: 'red' } },
  'wokwi-rgb-led': { ad: 'RGB LED', kategori: 'Işık ve ses', arama: 'RGB LED', iceren: ['rgb'], haric: ['şerit', 'serit', 'modül', 'ws2812', 'halka'], ozet: 'Üç renk tek LED\'de. Her renge ayrı direnç tak.', mcuCikis: ['R', 'G', 'B'], gnd: ['COM'], direncIster: true },
  'wokwi-neopixel': { ad: 'NeoPixel (WS2812B) LED', kategori: 'Işık ve ses', arama: 'WS2812B', iceren: ['ws2812'], haric: ['şerit', 'serit', 'halka', 'matris', 'panel'], ozet: 'Tek kabloyla rengi ayarlanan akıllı LED.', besleme: { VDD: [3.5, 5.5] }, gnd: ['VSS'], mcuCikis: ['DIN'] },
  'wokwi-buzzer': { ad: 'Buzzer', kategori: 'Işık ve ses', arama: 'buzzer', iceren: ['buzzer'], haric: ['modül'], ozet: 'Bip sesi verir. 2 = +, 1 = GND.', gnd: ['1'], mcuCikis: ['2'], not: 'Pasif buzzer tone() ile öter; aktif buzzer digitalWrite(HIGH) ile öter. Küçük buzzer pinden yaklaşık 30 mA çeker; daha büyüğü için transistör kullan.' },
  'wokwi-resistor': { ad: 'Direnç', kategori: 'Temel', arama: 'direnç 1/4W', iceren: ['direnç'], haric: ['set', 'kit', 'paket'], ozet: 'Akımı sınırlar. LED için 220 Ω yaygındır.', varsayilan: { value: '220' } },
  'wokwi-pushbutton': { ad: 'Buton', kategori: 'Giriş', arama: 'push buton', iceren: ['buton'], haric: ['kapak', 'modül', 'set', 'kit'], ozet: 'Basınca devreyi kapatır. Bir bacak GND\'ye, öbürü INPUT_PULLUP pine gider.', varsayilan: { color: 'green' } },
  'wokwi-potentiometer': { ad: 'Potansiyometre', kategori: 'Giriş', arama: '10K potansiyometre', iceren: ['potansiyometre'], haric: ['düğme', 'dugme', 'kapak', 'trimpot', 'sürgülü', 'surgulu', 'çift', 'cift'], ozet: 'Döndürülebilir ayar. Ortası (SIG) analog pine gider.', besleme: { VCC: [0, 5.5] }, gnd: ['GND'] },
  'wokwi-slide-switch': { ad: 'Kaydırmalı anahtar', kategori: 'Giriş', arama: 'slide switch', iceren: ['switch'], haric: [], ozet: 'Açık/kapalı anahtar. Ortadaki bacak (2) ortaktır.' },
  'wokwi-ky-040': { ad: 'Döner enkoder (KY-040)', kategori: 'Giriş', arama: 'rotary encoder', iceren: ['encoder'], haric: ['motor'], ozet: 'Sonsuz dönen ayar düğmesi; basılabilir.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-membrane-keypad': { ad: '4x4 tuş takımı', kategori: 'Giriş', arama: '4x4 tuş takımı', iceren: ['4x4'], haric: [], ozet: '16 tuşlu klavye. 8 pin kullanır.' },
  'wokwi-analog-joystick': { ad: 'Joystick', kategori: 'Giriş', arama: 'joystick modülü', iceren: ['joystick'], haric: [], ozet: 'İki eksenli kol ve buton.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },

  'wokwi-dht22': { ad: 'DHT22 sıcaklık ve nem sensörü', kategori: 'Sensör', arama: 'DHT22', iceren: ['dht22'], haric: [], ozet: 'Sıcaklık ve nem ölçer. Veri pini SDA.', besleme: { VCC: [3.3, 6] }, gnd: ['GND'], not: 'Çıplak sensörde SDA ile VCC arasına 10 kΩ direnç koy. Modülde çoğu zaman vardır.' },
  'wokwi-hc-sr04': { ad: 'HC-SR04 mesafe sensörü', kategori: 'Sensör', arama: 'HC-SR04', iceren: ['sr04'], haric: ['tutucu', 'tutucusu', 'braket', 'aparat'], ozet: '2–400 cm mesafe ölçer. 5 V ile çalışır.', besleme: { VCC: [4.5, 5.5] }, gnd: ['GND'], mcuCikis: ['TRIG'], cikis5v: ['ECHO'] },
  'wokwi-pir-motion-sensor': { ad: 'PIR hareket sensörü', kategori: 'Sensör', arama: 'HC-SR501', iceren: ['sr501'], haric: ['tutucu', 'lens'], ozet: 'İnsan hareketini algılar. OUT çıkışı 3,3 V\'tur.', besleme: { VCC: [4.5, 20] }, gnd: ['GND'] },
  'wokwi-photoresistor-sensor': { ad: 'Işık sensörü (LDR modülü)', kategori: 'Sensör', arama: 'LDR sensör', iceren: ['ldr', 'ışık'], haric: ['ses', 'kayıt', 'kayit', 'paket', 'set'], ozet: 'Ortam ışığını ölçer. AO analog, DO dijital.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-ntc-temperature-sensor': { ad: 'NTC sıcaklık sensörü', kategori: 'Sensör', arama: 'NTC sensör modülü', iceren: ['ntc', 'modül'], haric: ['rs485', 'modbus', 'kanallı', 'kanalli'], ozet: 'Analog sıcaklık ölçer.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-mpu6050': { ad: 'MPU6050 ivme ve jiroskop', kategori: 'Sensör', arama: 'MPU6050', iceren: ['mpu6050'], haric: [], ozet: 'Eğim ve hareket ölçer. I2C ile bağlanır.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-gas-sensor': { ad: 'Gaz sensörü (MQ-2)', kategori: 'Sensör', arama: 'MQ-2', iceren: ['mq'], haric: [], ozet: 'Duman ve yanıcı gaz algılar. 5 V ister, ısınır.', besleme: { VCC: [4.5, 5.5] }, gnd: ['GND'], cikis5v: ['AOUT', 'DOUT'] },
  'wokwi-flame-sensor': { ad: 'Alev sensörü', kategori: 'Sensör', arama: 'alev sensörü', iceren: ['alev'], haric: [], ozet: 'Alevin kızılötesi ışığını algılar.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-small-sound-sensor': { ad: 'Ses sensörü', kategori: 'Sensör', arama: 'ses sensörü', iceren: ['ses', 'sensör'], haric: ['kayıt', 'kayit', 'çalma', 'calma', 'titreşim', 'titresim', 'aydınlatma', 'dolap', 'kontrollü', 'ttl', 'rs485', '28v', 'wifi', 'duvar'], ozet: 'Ses şiddetini algılar.', besleme: { VCC: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-hx711': { ad: 'HX711 tartı modülü', kategori: 'Sensör', arama: 'HX711', iceren: ['hx711'], haric: ['entegre', 'entegresi'], ozet: 'Yük hücresiyle ağırlık ölçer.', besleme: { VCC: [2.6, 5.5] }, gnd: ['GND'] },
  'wokwi-ir-receiver': { ad: 'IR alıcı', kategori: 'Sensör', arama: 'IR alıcı', iceren: ['ir'], haric: [], ozet: 'Kumanda sinyalini alır.', besleme: { VCC: [2.7, 5.5] }, gnd: ['GND'] },
  'wokwi-ds1307': { ad: 'DS1307 saat modülü', kategori: 'Sensör', arama: 'DS1307', iceren: ['ds1307', 'modül'], haric: ['entegre', 'dip8'], ozet: 'Elektrik gitse de saati tutar. 5 V ister.', besleme: { '5V': [4.5, 5.5] }, gnd: ['GND'] },

  'wokwi-ssd1306': { ad: 'OLED ekran 0,96" (SSD1306, I2C)', kategori: 'Ekran', arama: '0.96 OLED', iceren: ['oled'], haric: ['1.3', 'spi', 'renkli'], ozet: 'Küçük ekran. DATA = SDA, CLK = SCL.', besleme: { VIN: [3.3, 5.5] }, gnd: ['GND'] },
  'wokwi-lcd1602': { ad: 'LCD 16x2 (paralel)', kategori: 'Ekran', arama: '16x2 LCD', iceren: ['16x2'], haric: ['çerçeve', 'cerceve', 'i2c'], ozet: '2 satır yazı ekranı. 5 V ister.', besleme: { VDD: [4.5, 5.5] }, gnd: ['VSS', 'RW'] },
  // Çeşit: aynı Wokwi öğesi, attrs.pins = "i2c". PCF8574 arka kartlı LCD, LiquidCrystal_I2C ile.
  'wokwi-lcd1602-i2c': { tur: 'wokwi-lcd1602', varsayilan: { pins: 'i2c' }, ad: 'LCD 16x2 (I2C)', kategori: 'Ekran', arama: '16x2 I2C LCD', iceren: ['16x2', 'i2c'], haric: ['çerçeve', 'cerceve'], ozet: '2 satır yazı ekranı; 4 kablo yeter (SDA, SCL). Adres çoğunlukla 0x27. 5 V ister.', besleme: { VCC: [4.5, 5.5] }, gnd: ['GND'] },
  'wokwi-7segment': { ad: '7 segment gösterge', kategori: 'Ekran', arama: '7 segment display', iceren: ['segment'], haric: ['4 dijit', '4 hane', 'modül'], ozet: 'Tek basamak sayı gösterir.' },

  'wokwi-servo': { ad: 'Servo motor (SG90)', kategori: 'Hareket', arama: 'SG90', iceren: ['sg90'], haric: ['tutucu', 'braket', 'pan', 'tilt'], ozet: '0–180° döner. Kahverengi GND, kırmızı V+, turuncu PWM.', besleme: { 'V+': [4.8, 6] }, gnd: ['GND'], mcuCikis: ['PWM'], not: 'Servo ani akım çeker. İki servodan fazlası için ayrı 5 V kaynak kullan.' },
  'wokwi-stepper-motor': { ad: 'Step motor', kategori: 'Hareket', arama: '28BYJ-48 step motor', iceren: ['step'], haric: ['paralel', 'bağlantı', 'baglanti'], ozet: 'Adım adım döner. Sürücü kartı ister.' },
  'wokwi-ks2e-m-dc5': { ad: 'Çıplak röle (5 V)', kategori: 'Hareket', arama: '5V röle', iceren: ['röle'], haric: ['modül', 'modülü', 'usb', 'kart'], ozet: 'Çıplak röle. Karttan doğrudan sürülmez.', not: 'Bobini doğrudan pine bağlama: transistör ve diyot gerekir. Hazır röle modülü kullan.' },

  [KY_MODUL]: { ad: 'Modül', kategori: 'Modül', arama: '', ozet: 'Wokwi\'de olmayan modüller için genel kutu.' },
};

// Wokwi'de olmayan yaygın modüller. Hepsi KY_MODUL türünde; ayrımı attrs yapar.
// attrs değerleri Wokwi biçimine uymak için yazıdır. besleme "PIN:en az-en çok", kaynak "PIN:volt".
export const MODUL_HAZIR = {
  'role-modulu': { baslik: 'Röle modülü (5 V, 1 kanal)', sol: 'VCC,GND,IN', sag: 'NO,COM,NC', besleme: 'VCC:4.5-5.5', gnd: 'GND', mcuCikis: 'IN', renk: '#1d6fd8', arama: '5V röle kartı', iceren: ['röle', 'kart'], haric: ['usb', '2 kanal', '4 kanal', '8 kanal', '16 kanal', '2 kanallı', '8 kanallı', '16 kanallı', 'solid', 'ssr', '12v', 'kumandalı', 'raspberry'], ozet: 'Kartla pompa, lamba gibi yükleri açıp kapatır. NO: normalde açık, COM: ortak. 220 V işini ustaya bırak.' },
  'toprak-nem': { baslik: 'Toprak nem sensörü', sol: 'VCC,GND,AO,DO', besleme: 'VCC:3.3-5.5', gnd: 'GND', renk: '#7a5230', arama: 'toprak nem sensörü', iceren: ['toprak'], haric: [], ozet: 'Topraktaki nemi ölçer. AO analog çıkış.' },
  'kapi-sensoru': { baslik: 'Manyetik kapı sensörü (MC-38)', sol: '1,2', renk: '#64748b', arama: 'manyetik kapı sensörü', iceren: ['manyetik'], haric: [], ozet: 'Mıknatıs yakınken iki kablo birbirine değer. Bir ucu GND\'ye, öbürü INPUT_PULLUP pine gider.' },
  'su-pompasi': { baslik: 'Mini su pompası (5 V)', sol: '+,-', renk: '#0e8a8a', arama: 'su pompası', iceren: ['pompa'], haric: ['hortum', '12v', '24v', '220v'], ozet: 'Suyu hortumla basar. Karttan değil, röle üzerinden beslenir.' },
  'guc-5v': { baslik: '5 V güç kaynağı', sag: '+5V,GND', kaynak: '+5V:5', gnd: 'GND', renk: '#c2410c', arama: '5V 2A adaptör', iceren: ['adaptör', '5v', '2a'], haric: ['esp-01', 'modül'], ozet: 'Motor, pompa gibi akım çeken parçaları besler. GND\'si karta da bağlanır.' },
  'dc-motor': { baslik: 'DC motor', sol: '+,-', renk: '#4b5563', arama: 'DC motor 3-6V', iceren: ['motor'], haric: ['sürücü', 'surucu', 'tutucu', 'tekerlek', 'redüktör', 'reduktor'], ozet: 'Döner. Motor sürücüsü ister.' },
  'l298n': { baslik: 'L298N motor sürücü', sol: 'IN1,IN2,IN3,IN4,ENA,ENB', sag: 'OUT1,OUT2,OUT3,OUT4,12V,GND,5V', besleme: '12V:5-35', gnd: 'GND', mcuCikis: 'IN1,IN2,IN3,IN4,ENA,ENB', renk: '#b91c1c', arama: 'L298N', iceren: ['l298n'], haric: ['entegre', 'entegresi', 'multiwatt'], ozet: 'İki DC motoru ileri/geri sürer.' },
  'pil-18650': { baslik: '18650 pil (3,7 V)', sag: '+,-', kaynak: '+:3.7', gnd: '-', renk: '#15803d', arama: '18650 pil', iceren: ['18650'], haric: ['yuva', 'yuvası', 'şarj', 'sarj', 'kutu', 'bms'], ozet: 'Şarj edilebilir pil. Koruma devreli olanı seç.' },
  'voltaj-dusurucu': { baslik: 'Voltaj düşürücü (LM2596)', sol: 'IN+,IN-', sag: 'OUT+,OUT-', besleme: 'IN+:4-40', kaynak: 'OUT+:5', gnd: 'IN-,OUT-', renk: '#1e40af', arama: 'LM2596', iceren: ['lm2596', 'düşürücü'], haric: ['entegre', 'entegresi', 'to220'], ozet: '12 V\'u 5 V\'a düşürür. Bağlamadan önce çıkışı ölç ve ayarla.' },
  'seviye-donusturucu': { baslik: 'Seviye dönüştürücü (4 kanal)', sol: 'LV,GND,LV1,LV2', sag: 'HV,GND2,HV1,HV2', besleme: 'LV:1.8-3.6,HV:3.6-5.5', gnd: 'GND,GND2', renk: '#6d28d9', arama: 'lojik seviye dönüştürücü', iceren: ['seviye'], haric: [], ozet: '5 V sinyali 3,3 V\'a güvenle çevirir.' },
};

const MODUL_EN = 140;
const MODUL_UST = 34;
const MODUL_ARALIK = 22;

function liste(yazi) {
  return yazi ? String(yazi).split(',').map((s) => s.trim()).filter(Boolean) : [];
}

// Katalog anahtarı: çoğunlukla tür. Çeşitlerde (ör. I2C LCD) tür aynıdır, ayrımı varsayılan attrs yapar.
export function katalogAnahtari(parca) {
  for (const [anahtar, b] of Object.entries(PARCALAR)) {
    if (b.tur === parca.type && Object.entries(b.varsayilan || {}).every(([a, v]) => parca.attrs?.[a] === v)) return anahtar;
  }
  return parca.type;
}

// Bir parçanın boyutu ve pinleri. pinVeri = pinler.json içeriği.
export function parcaOlcu(parca, pinVeri) {
  if (parca.type === KY_MODUL) {
    const a = parca.attrs || {};
    const sol = liste(a.sol);
    const sag = liste(a.sag);
    const satir = Math.max(sol.length, sag.length, 1);
    const h = MODUL_UST + satir * MODUL_ARALIK + 8;
    const pins = [
      ...sol.map((name, i) => ({ name, x: 0, y: MODUL_UST + i * MODUL_ARALIK + MODUL_ARALIK / 2, taraf: 'sol' })),
      ...sag.map((name, i) => ({ name, x: MODUL_EN, y: MODUL_UST + i * MODUL_ARALIK + MODUL_ARALIK / 2, taraf: 'sag' })),
    ];
    return { w: MODUL_EN, h, pins };
  }
  const v = pinVeri[katalogAnahtari(parca)] || pinVeri[parca.type];
  return v ? { w: v.w, h: v.h, pins: v.pins } : null;
}

// Parçanın güvenlik bilgisi: katalog + modül attrs birleşir.
export function parcaBilgi(parca) {
  if (parca.type === KY_MODUL) {
    const a = parca.attrs || {};
    const aralik = {};
    for (const p of liste(a.besleme)) {
      const [pin, deger] = p.split(':');
      const [min, max] = deger.split('-').map(Number);
      aralik[pin] = [min, max];
    }
    const kaynak = {};
    for (const p of liste(a.kaynak)) {
      const [pin, volt] = p.split(':');
      kaynak[pin] = Number(volt);
    }
    const hazir = Object.values(MODUL_HAZIR).find((m) => m.baslik === a.baslik);
    return { ad: a.baslik || 'Modül', kategori: 'Modül', besleme: aralik, kaynak, gnd: liste(a.gnd), mcuCikis: liste(a.mcuCikis), arama: hazir?.arama || a.arama || a.baslik, iceren: hazir?.iceren || [], haric: hazir?.haric || [], ozet: a.ozet };
  }
  const k = PARCALAR[katalogAnahtari(parca)] || { ad: parca.type.replace('wokwi-', ''), kategori: 'Diğer' };
  const kart = KARTLAR[parca.type];
  return { ...k, kaynak: kart ? kart.kaynak : {}, besleme: k.besleme || {}, gnd: k.gnd || [], mcuCikis: k.mcuCikis || [] };
}

export function parcaAdi(parca) {
  return parca.ad || parcaBilgi(parca).ad;
}

// Kartın pinine özel not: yalnız giriş ya da açılış pini.
export function pinNotu(tur, pin) {
  const kart = KARTLAR[tur];
  if (!kart) return '';
  if (kart.yalnizGiris?.includes(pin)) return 'Yalnız giriş';
  if (kart.acilisPinleri?.[pin]) return 'Açılış pini';
  return '';
}

export function pinGND(parca, pin, pinVeri) {
  if (/^GND/.test(pin)) return true;
  const b = parcaBilgi(parca);
  if (b.gnd.includes(pin)) return true;
  const olcu = parcaOlcu(parca, pinVeri);
  const p = olcu?.pins.find((x) => x.name === pin);
  return !!p?.signals?.some((s) => s.type === 'power' && s.signal === 'GND');
}
