# Kendin Yap

ESP32 ve Arduino projelerini fikirden çalışan devreye adım adım kuran yerel web sitesi. Ücretsiz; hesap yok.

![Ana sayfa: canlı demo ve 6 adım](docs/ekran/1-ana-sayfa.png)

## Ekran görüntüleri

| Hazır projeler | Proje tanıtımı ve canlı demo |
|---|---|
| ![Hazır projeler](docs/ekran/2-projeler.png) | ![Proje tanıtımı](docs/ekran/3-proje-tanitimi.png) |

| Parçalar ve mağaza fiyatları | Bağlantılar: etkileşimli şema |
|---|---|
| ![Fiyat karşılaştırma](docs/ekran/4-parcalar-fiyat.png) | ![Bağlantılar](docs/ekran/5-baglantilar.png) |

| ESP32 simülasyonu: DHT22 + OLED | Wi-Fi: ESP32'nin web sayfası |
|---|---|
| ![ESP32 simülasyonu](docs/ekran/6-esp32-simulasyon.png) | ![Wi-Fi web sayfası](docs/ekran/7-wifi-web-sayfasi.png) |

| Kontrol: bağlantı denetimi | Kod: CodeMirror ve pin vurgusu |
|---|---|
| ![Kontrol](docs/ekran/8-kontrol.png) | ![Kod](docs/ekran/9-kod.png) |

Koyu tema (Grafit):

![Koyu tema](docs/ekran/10-koyu-tema.png)

## Başlatma

- `Başlat.cmd` dosyasını çift tıkla. Site `http://127.0.0.1:8200/` adresinde açılır.
- Ya da: `npm install`, sonra `npm run dev`.
- Port 8200 dolu olursa site açılmaz (`strictPort`). Bu makinede 8000, 1984, 8554, 8555 canlı IyexVMS'e ayrılmıştır; bunları kullanma.

## Neler var?

| Özellik | Nerede |
|---|---|
| 57 hazır proje, Çok kolay'dan İleri'ye: LED, buton, sensör, servo, röle, web sunucusu, MQTT, Bluetooth, BLE, internetten veri, akıllı saat, hediyelik (kalp lamba, müzik kutusu, aşk mesajı ekranı). Hepsi simülasyonda çalışır ve canlı demoyla gelir | Ana sayfa |
| Proje vitrini: kartta devre resmi ve özellik etiketleri; ilk adımda "Ne işe yarar / Nasıl çalışır / Ne öğreneceksin" ve kendi kendine oynayan canlı demo | Ana sayfa, Fikir |
| Her proje 6 adım: Fikir, Parçalar, Bağlantılar, Kontrol, Kod, Test | Proje sayfası |
| Gerçek görünüşlü etkileşimli şema: pin adı, bağlandığı yer, adım adım kablo | Bağlantılar |
| Parçayı sürükle, iki pine tıklayarak kablo çiz; "Canlı dene" ile buton ve düğmeyi oynat | Bağlantılar |
| Simülasyon (ESP32, Uno, Nano): kod yerelde derlenir, tarayıcıda çalışır; LED, RGB LED, buzzer, servo, buton, anahtar, potansiyometre, HC-SR04, PIR, LDR, NTC, DHT22, OLED, LCD 16x2 (paralel ve I2C), 4x4 tuş takımı, 7 segment, NeoPixel, joystick, döner enkoder, gaz, alev, ses, IR alıcı (panelde kumanda), DS1307, MPU6050, HX711, step motor, röle (modül ve çıplak), pompa, toprak nemi, kapı sensörü, seri ekran. Katalogdaki her parça simülasyonda tepki verir | Bağlantılar › ▶ Simülasyonu başlat |
| Fiyat karşılaştırma: Robotistan, Direnc.net, Motorobit; en ucuz ürün ve tek mağaza toplamı | Parçalar › Fiyatları karşılaştır |
| Bağlantı denetimi: kısa devre, 5 V → 3,3 V pin, yalnız giriş pini, direnç yok, ortak GND yok… | Kontrol |
| Kod, kablolardan üretilen pin tanımları, yükleme adımları, Wokwi'de ücretsiz simülasyon | Kod |
| Montaj ve test listesi, ilerleme, proje dosyasını indirme, yazdırma | Test |
| 40+ parçanın görünümü ve pin açıklamaları | Parçalar sayfası |

## Tasarım kuralları

- Renk, yazı ölçeği (`--yazi-*`), 8 piksellik boşluk (`--b1`…`--b7`) ve hareket (`--sure-kisa` 150 ms, `--sure-orta` 200 ms, `--sure-uzun` 320 ms, `--egri`) `src/stil.css` başındaki değişkenlerde.
- Tema: sistem / açık / koyu (üst çubuktaki düğme, `localStorage: ky.tema`). Açık tema "Teknik çizim" (gök mavisi `#0284c7`, eş aralıklı başlıklar), koyu tema "Grafit" (kehribar `#f59e0b`).
- Logo: "Fikirden ışığa": boş halkadan (fikir) çıkan devre yolu yanan bir LED'de biter. Çizim `src/bilesenler/Logo.jsx` içinde; renk temadan gelir (`--ana`). Sekme simgesi `index.html` içinde aynı çizim.
- Sayfa geçişleri View Transitions ile: kart resmi proje vitrinine büyür; adımlar ileri/geri yönde kayar. "Hareketi azalt" ayarında hepsi kapanır.
- Bağlantılar adımı çalışma masası düzenindedir: ortada şema, sağda sekmeler (Kablolar, Simülasyon, Wi-Fi ve Bluetooth), altta seri ekran, "Tam ekran" kipi.
- Kod adımı CodeMirror 6 (MIT) kullanır: derleme hataları satırda, pin sabiti ipucu ve şemada vurgu.

Düzenlemeler tarayıcıda (localStorage) saklanır. Kalıcı yedek için Test adımında "Proje dosyasını indir".

## Simülasyon ve fiyat altyapısı

- `araclar/` (git dışı, ~460 MB): arduino-cli 1.6.0, `arduino:avr` 1.8.8 çekirdeği, Servo kütüphanesi. Yeniden kurmak için:
  1. arduino-cli 1.6.0 Windows zip'ini `github.com/arduino/arduino-cli/releases` adresinden indir, `araclar/arduino-cli/` içine aç.
  2. `ARDUINO_DIRECTORIES_DATA`, `_DOWNLOADS`, `_USER` değişkenlerini `araclar/arduino15`, `araclar/arduino15/staging`, `araclar/sketchbook` yap.
  3. `arduino-cli core install arduino:avr` ve `arduino-cli lib install Servo Stepper LiquidCrystal Keypad "Adafruit NeoPixel" IRremote RTClib "HX711 Arduino Library" "DHT sensor library" "Adafruit SSD1306" "Adafruit MPU6050"` çalıştır (Adafruit kütüphaneleri BusIO ve Unified Sensor'ı da kurar).
- `sunucu/derle.js`: `POST /__derle` kodu yerelde derler, `.hex` döner. Yalnız Uno ve Nano.
- `src/simulasyon/`: avr8js (MIT) ile ATmega328P; parça davranışları `simulasyon.js` içinde.
- LCD 16x2 ve tuş takımı: `src/simulasyon/lcd.js`. Uno'da E ucunun düşen kenarında RS ve D0–D7 okunur, HD44780 taklidine gider (4 ve 8 bit). Tuş takımında basılı tuş satır ve sütun pinini kısa devre eder; Keypad kütüphanesi hızlı taradığı için giriş, çıkış değiştiği anda güncellenir; basımlar kuyruğa girer, simülasyon zamanında en az 60 ms sürer.
- I2C LCD (`wokwi-lcd1602`, `attrs.pins = "i2c"`, `LiquidCrystal_I2C`): PCF8574 arka kartı Wire üzerinden sürülür (`Pcf8574Lcd` içinde HD44780; `src/simulasyon/cihazlar.js`). Baytlar I2C yolundan gelir, En düşerken nibble yazılır; adres varsayılan 0x27 (`attrs.adres` ile değişir). ESP32'de baytlar işçiden ana sayfaya yönlendirilir.
- Öteki parçalar: kartlardan bağımsız davranışlar `src/simulasyon/parcalar.js` (modüller, röle, enkoder, 7 segment, NeoPixel zinciri, analog sensörler); yonga taklitleri `src/simulasyon/cihazlar.js` (DS1307, MPU6050, step sayacı, NEC, DHT22 ve HX711 verisi). Uno'da bunlar gerçek kütüphaneyle konuşur: DHT22 ve IR saat olaylarıyla dalga olarak çalınır, HX711 SCK kenarında bit verir, NeoPixel DIN'deki darbe genişliğinden çözülür, I2C cihazları avr8js TWI ile bağlanır. HX711: 1 g = 420 birim.
- `sunucu/fiyat.js`: `GET /__fiyat` mağazaların arama sayfasını okur, 6 saat önbellekte tutar. Mağaza sayfa yapısı değişirse ayıklayıcıyı güncelle.
- ESP32: `esp32-hal/` Arduino-ESP32 API taklidi (Arduino.h, Serial, ledc, tone, pulseIn, kesmeler, Wire, Servo/ESP32Servo, DHT, Adafruit_GFX/SSD1306, SPI, LiquidCrystal, Keypad, Adafruit_NeoPixel, IRremote, HX711, RTClib, Adafruit_MPU6050, Stepper). Wire gerçek veri yoludur: baytlar işçideki I2C cihaz taklitlerine gider. Kod `araclar/zig` (Zig 0.17.1) ile `wasm32-wasi`'ye derlenir, `src/simulasyon/esp32-isci.js` Web Worker'ında koşar. Gerçek işlemci değil; ham TCP (`WiFiClient`), BLE istemci tarafı ve taklidi olmayan kütüphaneler çalışmaz.
- MQTT: `PubSubClient` taklidi sayfadaki sanal sunucuya bağlanır (joker konular `+`/`#`, kalıcı mesaj). Panel ikinci istemci gibi yayın yapar.
- Bluetooth: `BluetoothSerial` (panelde telefon terminali) ve BLE sunucu (özellik okuma/yazma/bildirim). `Serial.read()` panelden beslenir.
- Olaylar (seri, MQTT, Bluetooth) ortak bellekteki olay kutusuyla işçiye gider (`src/simulasyon/esp32-ortak.js`).
- Wi-Fi: sanal ağ (IP 192.168.1.50). `WebServer` sayfası simülasyon panelindeki mini tarayıcıda açılır. `HTTPClient` istekleri `sunucu/vekil.js` (`POST /__vekil`) üzerinden gerçek internete gider; localhost, 10.x, 172.16–31.x, 192.168.x ve benzeri yerel adresler DNS çözümlemesinden sonra da engellenir, yönlendirmeler tek tek denetlenir. `configTime`/`getLocalTime` bilgisayarın saatini verir.
- Zig kurulumu: `ziglang.org/download` adresinden 0.17.1 Windows zip'ini indir, `araclar/zig/` içine aç.
- ESP32 çalıştırıcısı `SharedArrayBuffer` kullanır; bu yüzden `vite.config.js` COOP/COEP başlıklarını gönderir.

## Claude ile proje kurma

Claude Code'a fikrini "kendin-yap:" ile başlayarak yaz. `kendin-yap` skill'i (`~/.claude/skills/kendin-yap`) projeyi `projeler/<id>.json` olarak yazar ve denetler. Site bu klasörü kendiliğinden okur.

Bu klasörde açılan Claude oturumu ayrıca şu skill'leri kullanır:

- `.claude/skills/electronics`, `.claude/skills/esp32-development` (magnus919/agent-skills, MIT).
- `embedded-engineering-skills` eklentisi (wedsamuel1230, MIT). `.claude/settings.json` içinde tanımlı; Claude Code ilk açılışta kurulum onayı ister.

## Klasörler

| Yol | İçerik |
|---|---|
| `src/sablonlar/` | Hazır projeler |
| `projeler/` | Claude'un yazdığı projeler |
| `src/veri/katalog.js` | Parça adları, besleme aralıkları, kart bilgisi |
| `src/veri/pinler.json` | Wokwi parçalarının pin konumları (üretilmiş) |
| `src/denetim.js` | Bağlantı denetimi (site ve betik ortak kullanır) |
| `docs/parca-rehberi.md` | Claude için parça ve pin rehberi (üretilmiş) |

## Komutlar

```powershell
node scripts/denetle.mjs projeler/ornek.json
```

Projeyi denetler. Hata varsa çıkış kodu 1 olur.

```powershell
node scripts/parca-rehberi.mjs
```

Katalog değişince `docs/parca-rehberi.md` dosyasını yeniden üretir.

Wokwi Elements sürümü değişince pin verisini yenile: siteyi başlat, `http://127.0.0.1:8200/pin-dokum.html` adresini aç. Sayfa `src/veri/pinler.json` dosyasını yeniden yazar. Sonra `parca-rehberi.mjs` betiğini çalıştır.

## Lisanslar

- Parça görünümleri: [Wokwi Elements](https://github.com/wokwi/wokwi-elements), MIT.
- Bu proje kendi kodunu içerir; başka sitelerin kodu ya da görseli kopyalanmamıştır.
