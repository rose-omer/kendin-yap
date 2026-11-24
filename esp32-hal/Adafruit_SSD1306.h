// Adafruit SSD1306 taklidi: display() çağrılınca komut listesi tarayıcıdaki OLED parçasına gider.
#pragma once
#include "Adafruit_GFX.h"
#include "Wire.h"
#include "ky_host.h"

#define SSD1306_BLACK 0
#define SSD1306_WHITE 1
#define SSD1306_INVERSE 2
#define BLACK SSD1306_BLACK
#define WHITE SSD1306_WHITE
#define INVERSE SSD1306_INVERSE
#define SSD1306_SWITCHCAPVCC 0x02
#define SSD1306_EXTERNALVCC 0x01

class Adafruit_SSD1306 : public Adafruit_GFX {
 public:
  Adafruit_SSD1306(uint8_t w, uint8_t h, TwoWire * = &Wire, int8_t = -1, uint32_t = 400000UL, uint32_t = 100000UL)
      : Adafruit_GFX(w, h) {}
  Adafruit_SSD1306(int8_t, int8_t) : Adafruit_GFX(128, 64) {}
  bool begin(uint8_t = SSD1306_SWITCHCAPVCC, uint8_t = 0x3C, bool = true, bool = true) { return true; }
  void clearDisplay() { komutlar = "C\n"; }
  void display() { ky_ekran(komutlar.c_str(), (int)komutlar.size()); }
  void invertDisplay(bool i) { ekle("I %d", i ? 1 : 0); }
  void dim(bool) {}
  void ssd1306_command(uint8_t) {}
  void startscrollright(uint8_t, uint8_t) {}
  void startscrollleft(uint8_t, uint8_t) {}
  void stopscroll() {}
};
