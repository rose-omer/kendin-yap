# Parça ve pin rehberi

Bu dosya `scripts/parca-rehberi.mjs` ile üretilir. Elle düzenleme.
Pin adlarını bağlantılarda aynen yaz. Boyut: piksel (en x boy). Pin konumu: parçanın sol üst köşesine göre (x,y).

## Kart

### `wokwi-esp32-devkit-v1` — ESP32 DevKit V1
Wi-Fi ve Bluetooth'lu kart. Pinleri 3,3 V çalışır. Boyut: 107x208.
- Mantık gerilimi: 3.3 V. Besleme çıkışları: VIN = 5 V, 3V3 = 3.3 V.
- Yalnız giriş: D34, D35, VP, VN.
- Açılış pinleri (kaçın): D2, D5, D12, D15.
- Pinler: `VIN`@5,159 `GND.2`@5,149 `D13`@5,140 `D12`@5,130 `D14`@5,120 `D27`@5,111 `D26`@5,101 `D25`@5,91 `D33`@5,82 `D32`@5,72 `D35`@5,63 `D34`@5,53 `VN`@5,44 `VP`@5,34 `EN`@5,24 `3V3`@101,159 `GND.1`@101,149 `D15`@101,140 `D2`@101,130 `D4`@101,120 `RX2`@101,111 `TX2`@101,101 `D5`@101,91 `D18`@101,82 `D19`@101,72 `D21`@101,63 `RX0`@101,53 `TX0`@101,44 `D22`@101,34 `D23`@101,24

### `wokwi-arduino-uno` — Arduino Uno
En yaygın başlangıç kartı. Pinleri 5 V çalışır. Boyut: 274x206.
- Mantık gerilimi: 5 V. Besleme çıkışları: 5V = 5 V, 3.3V = 3.3 V.
- Pinler: `A5.2`@87,9 `A4.2`@97,9 `AREF`@106,9 `GND.1`@116,9 `13`@125,9 `12`@135,9 `11`@144,9 `10`@154,9 `9`@163,9 `8`@173,9 `7`@189,9 `6`@199,9 `5`@208,9 `4`@218,9 `3`@227,9 `2`@237,9 `1`@246,9 `0`@256,9 `IOREF`@131,192 `RESET`@141,192 `3.3V`@150,192 `5V`@160,192 `GND.2`@170,192 `GND.3`@179,192 `VIN`@189,192 `A0`@208,192 `A1`@218,192 `A2`@227,192 `A3`@237,192 `A4`@246,192 `A5`@256,192

### `wokwi-arduino-nano` — Arduino Nano
Uno'nun küçüğü; breadboard'a takılır. 5 V. Boyut: 170x71.
- Mantık gerilimi: 5 V. Besleme çıkışları: 5V = 5 V, 3.3V = 3.3 V.
- Pinler: `12`@20,5 `11`@29,5 `10`@39,5 `9`@49,5 `8`@58,5 `7`@68,5 `6`@77,5 `5`@87,5 `4`@97,5 `3`@106,5 `2`@116,5 `GND.2`@125,5 `RESET.2`@135,5 `0`@145,5 `1`@154,5 `13`@20,62 `3.3V`@29,62 `AREF`@39,62 `A0`@49,62 `A1`@58,62 `A2`@68,62 `A3`@77,62 `A4`@87,62 `A5`@97,62 `A6`@106,62 `A7`@116,62 `5V`@125,62 `RESET`@135,62 `GND.1`@145,62 `VIN`@154,62 `12.2`@164,43 `5V.2`@154,43 `13.2`@164,34 `11.2`@154,34 `RESET.3`@164,24 `GND.3`@154,24

### `wokwi-arduino-mega` — Arduino Mega 2560
Çok pinli büyük kart. 5 V. Boyut: 388x196.
- Mantık gerilimi: 5 V. Besleme çıkışları: 5V = 5 V, 3.3V = 3.3 V.
- Pinler: `SCL`@90,9 `SDA`@100,9 `AREF`@109,9 `GND.1`@119,9 `13`@129,9 `12`@138,9 `11`@148,9 `10`@158,9 `9`@168,9 `8`@177,9 `7`@190,9 `6`@200,9 `5`@210,9 `4`@219,9 `3`@229,9 `2`@238,9 `1`@248,9 `0`@258,9 `14`@271,9 `15`@280,9 `16`@290,9 `17`@299,9 `18`@309,9 `19`@319,9 `20`@328,9 `21`@338,9 `5V.1`@361,8 `5V.2`@371,8 `22`@361,18 `23`@371,18 `24`@361,27 `25`@371,27 `26`@361,37 `27`@371,37 `28`@361,46 `29`@371,46 `30`@361,56 `31`@371,56 `32`@361,66 `33`@371,66 `34`@361,75 `35`@371,75 `36`@361,85 `37`@371,85 `38`@361,94 `39`@371,94 `40`@361,104 `41`@371,104 `42`@361,114 `43`@371,114 `44`@361,123 `45`@371,123 `46`@361,133 `47`@371,133 `48`@361,142 `49`@371,142 `50`@361,152 `51`@371,152 `52`@361,162 `53`@371,162 `GND.4`@361,171 `GND.5`@371,171 `IOREF`@136,185 `RESET`@146,185 `3.3V`@155,185 `5V`@165,185 `GND.2`@174,185 `GND.3`@184,185 `VIN`@194,185 `A0`@209,185 `A1`@218,185 `A2`@228,185 `A3`@237,185 `A4`@247,185 `A5`@256,185 `A6`@266,185 `A7`@276,185 `A8`@290,185 `A9`@300,185 `A10`@310,185 `A11`@319,185 `A12`@329,185 `A13`@339,185 `A14`@348,185 `A15`@358,185

### `wokwi-nano-rp2040-connect` — Arduino Nano RP2040 Connect
Wi-Fi'lı küçük kart. 3,3 V. Boyut: 168x72.
- Mantık gerilimi: 3.3 V. Besleme çıkışları: 3.3V = 3.3 V.
- Pinler: `D12`@20,1 `D11`@30,1 `D10`@39,1 `D9`@49,1 `D8`@59,1 `D7`@68,1 `D6`@78,1 `D5`@87,1 `D4`@97,1 `D3`@107,1 `D2`@116,1 `GND.1`@125,1 `RESET`@135,1 `RX`@154,1 `TX`@145,1 `D13`@20,68 `3.3V`@30,68 `AREF`@39,68 `A0`@49,68 `A1`@59,68 `A2`@68,68 `A3`@78,68 `A4`@87,68 `A5`@97,68 `A6`@107,68 `A7`@116,68 `5V`@126,68 `RESET.2`@135,68 `GND.2`@145,68 `VIN`@154,68

## Işık ve ses

### `wokwi-led` — LED
Uzun bacak (A, anot) +, kısa bacak (C, katot) GND. Boyut: 40x50.
- Varsayılan attrs: `{"color":"red"}`.
- Pinler: `A`@25,42 `C`@15,42

### `wokwi-rgb-led` — RGB LED
Üç renk tek LED'de. Her renge ayrı direnç tak. Boyut: 42x77.
- Pinler: `R`@9,44 `COM`@18,54 `G`@26,44 `B`@36,44

### `wokwi-neopixel` — NeoPixel (WS2812B) LED
Tek kabloyla rengi ayarlanan akıllı LED. Boyut: 21x23.
- Besleme: VDD 3.5–5.5 V.
- Pinler: `VDD`@1,4 `DOUT`@1,14 `VSS`@21,14 `DIN`@21,4

### `wokwi-buzzer` — Buzzer
Bip sesi verir. 2 = +, 1 = GND. Boyut: 75x84.
- Not: Pasif buzzer tone() ile öter; aktif buzzer digitalWrite(HIGH) ile öter. Küçük buzzer pinden yaklaşık 30 mA çeker; daha büyüğü için transistör kullan.
- Pinler: `1`@27,84 `2`@37,84

## Temel

### `wokwi-resistor` — Direnç
Akımı sınırlar. LED için 220 Ω yaygındır. Boyut: 59x18.
- Varsayılan attrs: `{"value":"220"}`.
- Pinler: `1`@0,6 `2`@59,6

## Giriş

### `wokwi-pushbutton` — Buton
Basınca devreyi kapatır. Bir bacak GND'ye, öbürü INPUT_PULLUP pine gider. Boyut: 67x49.
- Varsayılan attrs: `{"color":"green"}`.
- Pinler: `1.l`@0,13 `2.l`@0,32 `1.r`@67,13 `2.r`@67,32

### `wokwi-potentiometer` — Potansiyometre
Döndürülebilir ayar. Ortası (SIG) analog pine gider. Boyut: 76x80.
- Besleme: VCC 0–5.5 V.
- Pinler: `GND`@29,69 `SIG`@39,69 `VCC`@49,69

### `wokwi-slide-switch` — Kaydırmalı anahtar
Açık/kapalı anahtar. Ortadaki bacak (2) ortaktır. Boyut: 32x39.
- Pinler: `1`@7,34 `2`@16,34 `3`@26,34

### `wokwi-ky-040` — Döner enkoder (KY-040)
Sonsuz dönen ayar düğmesi; basılabilir. Boyut: 116x74.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `CLK`@116,8 `DT`@116,17 `SW`@116,27 `VCC`@116,36 `GND`@116,46

### `wokwi-membrane-keypad` — 4x4 tuş takımı
16 tuşlu klavye. 8 pin kullanır. Boyut: 266x291.
- Pinler: `R1`@100,338 `R2`@110,338 `R3`@120,338 `R4`@129,338 `C1`@139,338 `C2`@148,338 `C3`@158,338 `C4`@168,338

### `wokwi-analog-joystick` — Joystick
İki eksenli kol ve buton. Boyut: 103x124.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `VCC`@33,116 `VERT`@43,116 `HORZ`@52,116 `SEL`@62,116 `GND`@71,116

## Sensör

### `wokwi-dht22` — DHT22 sıcaklık ve nem sensörü
Sıcaklık ve nem ölçer. Veri pini SDA. Boyut: 57x121.
- Besleme: VCC 3.3–6 V.
- Not: Çıplak sensörde SDA ile VCC arasına 10 kΩ direnç koy. Modülde çoğu zaman vardır.
- Pinler: `VCC`@15,115 `SDA`@25,115 `NC`@34,115 `GND`@44,115

### `wokwi-hc-sr04` — HC-SR04 mesafe sensörü
2–400 cm mesafe ölçer. 5 V ile çalışır. Boyut: 170x98.
- Besleme: VCC 4.5–5.5 V.
- 5 V ile beslenince 5 V sinyal veren pinler: ECHO.
- Pinler: `VCC`@71,95 `TRIG`@81,95 `ECHO`@91,95 `GND`@101,95

### `wokwi-pir-motion-sensor` — PIR hareket sensörü
İnsan hareketini algılar. OUT çıkışı 3,3 V'tur. Boyut: 91x96.
- Besleme: VCC 4.5–20 V.
- Pinler: `VCC`@36,92 `OUT`@46,92 `GND`@56,92

### `wokwi-photoresistor-sensor` — Işık sensörü (LDR modülü)
Ortam ışığını ölçer. AO analog, DO dijital. Boyut: 174x65.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `VCC`@172,16 `GND`@172,26 `DO`@172,36 `AO`@172,46

### `wokwi-ntc-temperature-sensor` — NTC sıcaklık sensörü
Analog sıcaklık ölçer. Boyut: 135x76.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `GND`@135,26 `VCC`@135,36 `OUT`@135,46

### `wokwi-mpu6050` — MPU6050 ivme ve jiroskop
Eğim ve hareket ölçer. I2C ile bağlanır. Boyut: 82x65.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `INT`@7,6 `AD0`@17,6 `XCL`@26,6 `XDA`@36,6 `SDA`@46,6 `SCL`@55,6 `GND`@65,6 `VCC`@74,6

### `wokwi-gas-sensor` — Gaz sensörü (MQ-2)
Duman ve yanıcı gaz algılar. 5 V ister, ısınır. Boyut: 137x67.
- Besleme: VCC 4.5–5.5 V.
- 5 V ile beslenince 5 V sinyal veren pinler: AOUT, DOUT.
- Pinler: `AOUT`@137,17 `DOUT`@137,26 `GND`@137,37 `VCC`@137,46

### `wokwi-flame-sensor` — Alev sensörü
Alevin kızılötesi ışığını algılar. Boyut: 200x65.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `VCC`@199,15 `GND`@199,24 `DOUT`@199,34 `AOUT`@199,44

### `wokwi-small-sound-sensor` — Ses sensörü
Ses şiddetini algılar. Boyut: 133x54.
- Besleme: VCC 3.3–5.5 V.
- Pinler: `AOUT`@0,11 `GND`@0,21 `VCC`@0,31 `DOUT`@0,41

### `wokwi-hx711` — HX711 tartı modülü
Yük hücresiyle ağırlık ölçer. Boyut: 219x167.
- Besleme: VCC 2.6–5.5 V.
- Pinler: `VCC`@7,55 `DT`@7,36 `SCK`@7,46 `GND`@7,27

### `wokwi-ir-receiver` — IR alıcı
Kumanda sinyalini alır. Boyut: 61x93.
- Besleme: VCC 2.7–5.5 V.
- Pinler: `GND`@21,88 `VCC`@31,88 `DAT`@40,88

### `wokwi-ds1307` — DS1307 saat modülü
Elektrik gitse de saati tutar. 5 V ister. Boyut: 98x88.
- Besleme: 5V 4.5–5.5 V.
- Pinler: `GND`@10,15 `5V`@10,25 `SDA`@10,35 `SCL`@10,44 `SQW`@10,54

## Ekran

### `wokwi-ssd1306` — OLED ekran 0,96" (SSD1306, I2C)
Küçük ekran. DATA = SDA, CLK = SCL. Boyut: 150x120.
- Besleme: VIN 3.3–5.5 V.
- Pinler: `DATA`@37,13 `CLK`@46,13 `DC`@55,13 `RST`@65,13 `CS`@75,13 `3V3`@84,13 `VIN`@94,13 `GND`@104,12

### `wokwi-lcd1602` — LCD 16x2 (paralel)
2 satır yazı ekranı. 5 V ister. Boyut: 302x140.
- Besleme: VDD 4.5–5.5 V.
- Pinler: `VSS`@32,131 `VDD`@42,131 `V0`@52,131 `RS`@61,131 `RW`@71,131 `E`@80,131 `D0`@90,131 `D1`@100,131 `D2`@109,131 `D3`@119,131 `D4`@128,131 `D5`@138,131 `D6`@147,131 `D7`@157,131 `A`@167,131 `K`@176,131

### `wokwi-lcd1602` — LCD 16x2 (I2C)
2 satır yazı ekranı; 4 kablo yeter (SDA, SCL). Adres çoğunlukla 0x27. 5 V ister. Boyut: 302x140.
- Besleme: VCC 4.5–5.5 V.
- Varsayılan attrs: `{"pins":"i2c"}`.
- Pinler: `GND`@4,32 `VCC`@4,42 `SDA`@4,51 `SCL`@4,61

### `wokwi-7segment` — 7 segment gösterge
Tek basamak sayı gösterir. Boyut: 47x87.
- Pinler: `COM.1`@24,72 `COM.2`@24,4 `A`@33,4 `B`@43,4 `C`@33,72 `D`@14,72 `E`@5,72 `F`@14,4 `G`@5,4 `DP`@43,72

## Hareket

### `wokwi-servo` — Servo motor (SG90)
0–180° döner. Kahverengi GND, kırmızı V+, turuncu PWM. Boyut: 170x124.
- Besleme: V+ 4.8–6 V.
- Not: Servo ani akım çeker. İki servodan fazlası için ayrı 5 V kaynak kullan.
- Pinler: `GND`@0,50 `V+`@0,60 `PWM`@0,69

### `wokwi-stepper-motor` — Step motor
Adım adım döner. Sürücü kartı ister. Boyut: 220x239.
- Pinler: `A-`@95,235 `A+`@105,235 `B+`@114,235 `B-`@124,235

### `wokwi-ks2e-m-dc5` — Çıplak röle (5 V)
Çıplak röle. Karttan doğrudan sürülmez. Boyut: 79x42.
- Not: Bobini doğrudan pine bağlama: transistör ve diyot gerekir. Hazır röle modülü kullan.
- Pinler: `NO2`@6,5 `NC2`@25,5 `P2`@45,5 `COIL2`@74,5 `NO1`@6,33 `NC1`@25,33 `P1`@45,33 `COIL1`@74,33

## Wokwi'de olmayan modüller (`ky-modul`)

Tür her zaman `ky-modul`. Pinleri `attrs.sol` (sol kenar, x=0) ve `attrs.sag` (sağ kenar, x=140) belirler.
Kutu eni 140. Pin y = 45 + 22 × sıra (sıra 0'dan başlar). Boy = 42 + 22 × en uzun taraftaki pin sayısı.
Kartın soluna koyduğun modülde pinleri `sag`a, sağına koyduğunda `sol`a yaz; teller kısa olur.
attrs alanları (hepsi yazı): `baslik`, `sol`, `sag`, `besleme` ("PIN:enaz-ençok"), `kaynak` ("PIN:volt"), `gnd` (GND pinleri), `mcuCikis` (kartın sürdüğü pinler), `renk`, `arama` (satıcı arama sözcüğü), `ozet`.

### Röle modülü (5 V, 1 kanal) (hazır: `role-modulu`)
```json
{"type":"ky-modul","id":"role","left":0,"top":0,"attrs":{"baslik":"Röle modülü (5 V, 1 kanal)","sol":"VCC,GND,IN","sag":"NO,COM,NC","besleme":"VCC:4.5-5.5","gnd":"GND","mcuCikis":"IN","renk":"#1d6fd8","arama":"5V röle kartı","iceren":["röle","kart"],"haric":["usb","2 kanal","4 kanal","8 kanal","16 kanal","2 kanallı","8 kanallı","16 kanallı","solid","ssr","12v","kumandalı","raspberry"],"ozet":"Kartla pompa, lamba gibi yükleri açıp kapatır. NO: normalde açık, COM: ortak. 220 V işini ustaya bırak."}}
```

### Toprak nem sensörü (hazır: `toprak-nem`)
```json
{"type":"ky-modul","id":"toprak","left":0,"top":0,"attrs":{"baslik":"Toprak nem sensörü","sol":"VCC,GND,AO,DO","besleme":"VCC:3.3-5.5","gnd":"GND","renk":"#7a5230","arama":"toprak nem sensörü","iceren":["toprak"],"haric":[],"ozet":"Topraktaki nemi ölçer. AO analog çıkış."}}
```

### Manyetik kapı sensörü (MC-38) (hazır: `kapi-sensoru`)
```json
{"type":"ky-modul","id":"kapi","left":0,"top":0,"attrs":{"baslik":"Manyetik kapı sensörü (MC-38)","sol":"1,2","renk":"#64748b","arama":"manyetik kapı sensörü","iceren":["manyetik"],"haric":[],"ozet":"Mıknatıs yakınken iki kablo birbirine değer. Bir ucu GND'ye, öbürü INPUT_PULLUP pine gider."}}
```

### Mini su pompası (5 V) (hazır: `su-pompasi`)
```json
{"type":"ky-modul","id":"su","left":0,"top":0,"attrs":{"baslik":"Mini su pompası (5 V)","sol":"+,-","renk":"#0e8a8a","arama":"su pompası","iceren":["pompa"],"haric":["hortum","12v","24v","220v"],"ozet":"Suyu hortumla basar. Karttan değil, röle üzerinden beslenir."}}
```

### 5 V güç kaynağı (hazır: `guc-5v`)
```json
{"type":"ky-modul","id":"guc","left":0,"top":0,"attrs":{"baslik":"5 V güç kaynağı","sag":"+5V,GND","kaynak":"+5V:5","gnd":"GND","renk":"#c2410c","arama":"5V 2A adaptör","iceren":["adaptör","5v","2a"],"haric":["esp-01","modül"],"ozet":"Motor, pompa gibi akım çeken parçaları besler. GND'si karta da bağlanır."}}
```

### DC motor (hazır: `dc-motor`)
```json
{"type":"ky-modul","id":"dc","left":0,"top":0,"attrs":{"baslik":"DC motor","sol":"+,-","renk":"#4b5563","arama":"DC motor 3-6V","iceren":["motor"],"haric":["sürücü","surucu","tutucu","tekerlek","redüktör","reduktor"],"ozet":"Döner. Motor sürücüsü ister."}}
```

### L298N motor sürücü (hazır: `l298n`)
```json
{"type":"ky-modul","id":"l298n","left":0,"top":0,"attrs":{"baslik":"L298N motor sürücü","sol":"IN1,IN2,IN3,IN4,ENA,ENB","sag":"OUT1,OUT2,OUT3,OUT4,12V,GND,5V","besleme":"12V:5-35","gnd":"GND","mcuCikis":"IN1,IN2,IN3,IN4,ENA,ENB","renk":"#b91c1c","arama":"L298N","iceren":["l298n"],"haric":["entegre","entegresi","multiwatt"],"ozet":"İki DC motoru ileri/geri sürer."}}
```

### 18650 pil (3,7 V) (hazır: `pil-18650`)
```json
{"type":"ky-modul","id":"pil","left":0,"top":0,"attrs":{"baslik":"18650 pil (3,7 V)","sag":"+,-","kaynak":"+:3.7","gnd":"-","renk":"#15803d","arama":"18650 pil","iceren":["18650"],"haric":["yuva","yuvası","şarj","sarj","kutu","bms"],"ozet":"Şarj edilebilir pil. Koruma devreli olanı seç."}}
```

### Voltaj düşürücü (LM2596) (hazır: `voltaj-dusurucu`)
```json
{"type":"ky-modul","id":"voltaj","left":0,"top":0,"attrs":{"baslik":"Voltaj düşürücü (LM2596)","sol":"IN+,IN-","sag":"OUT+,OUT-","besleme":"IN+:4-40","kaynak":"OUT+:5","gnd":"IN-,OUT-","renk":"#1e40af","arama":"LM2596","iceren":["lm2596","düşürücü"],"haric":["entegre","entegresi","to220"],"ozet":"12 V'u 5 V'a düşürür. Bağlamadan önce çıkışı ölç ve ayarla."}}
```

### Seviye dönüştürücü (4 kanal) (hazır: `seviye-donusturucu`)
```json
{"type":"ky-modul","id":"seviye","left":0,"top":0,"attrs":{"baslik":"Seviye dönüştürücü (4 kanal)","sol":"LV,GND,LV1,LV2","sag":"HV,GND2,HV1,HV2","besleme":"LV:1.8-3.6,HV:3.6-5.5","gnd":"GND,GND2","renk":"#6d28d9","arama":"lojik seviye dönüştürücü","iceren":["seviye"],"haric":[],"ozet":"5 V sinyali 3,3 V'a güvenle çevirir."}}
```
