// Adafruit NeoPixel taklidi: show() renkleri kablodaki sırayla (G, R, B) tarayıcıya gönderir.
// Tarayıcı LED'leri DIN'in bağlı olduğu GPIO'dan başlayarak DOUT → DIN zinciri boyunca boyar.
#pragma once
#include <math.h>
#include <stdlib.h>
#include "Arduino.h"
#include "ky_host.h"

#define NEO_RGB ((0 << 6) | (0 << 4) | (1 << 2) | (2))
#define NEO_RBG ((0 << 6) | (0 << 4) | (2 << 2) | (1))
#define NEO_GRB ((1 << 6) | (1 << 4) | (0 << 2) | (2))
#define NEO_GBR ((2 << 6) | (2 << 4) | (0 << 2) | (1))
#define NEO_BRG ((1 << 6) | (1 << 4) | (2 << 2) | (0))
#define NEO_BGR ((2 << 6) | (2 << 4) | (1 << 2) | (0))
#define NEO_RGBW ((3 << 6) | (0 << 4) | (1 << 2) | (2))
#define NEO_GRBW ((3 << 6) | (1 << 4) | (0 << 2) | (2))
#define NEO_KHZ800 0x0000
#define NEO_KHZ400 0x0100
typedef uint16_t neoPixelType;

class Adafruit_NeoPixel {
 public:
  Adafruit_NeoPixel(uint16_t n, int16_t pin = 6, neoPixelType = NEO_GRB + NEO_KHZ800) : pin_(pin) { updateLength(n); }
  Adafruit_NeoPixel() {}
  ~Adafruit_NeoPixel() { free(renk_); }
  void begin() {
    if (pin_ >= 0) pinMode(pin_, OUTPUT);
  }
  void show() {
    if (pin_ < 0 || !renk_) return;
    uint8_t *kablo = (uint8_t *)malloc(n_ * 3 + 1);
    for (uint16_t i = 0; i < n_; i++) {
      uint32_t c = renk_[i];
      uint8_t w = c >> 24;
      kablo[i * 3] = olcek(((c >> 8) & 0xff) + w);
      kablo[i * 3 + 1] = olcek(((c >> 16) & 0xff) + w);
      kablo[i * 3 + 2] = olcek((c & 0xff) + w);
    }
    ky_neopiksel(pin_, kablo, n_ * 3);
    free(kablo);
  }
  bool canShow() { return true; }
  void setPin(int16_t p) { pin_ = p; begin(); }
  void updateLength(uint16_t n) {
    free(renk_);
    renk_ = (uint32_t *)calloc(n ? n : 1, sizeof(uint32_t));
    n_ = n;
  }
  void updateType(neoPixelType) {}
  void setPixelColor(uint16_t i, uint8_t r, uint8_t g, uint8_t b) { setPixelColor(i, Color(r, g, b)); }
  void setPixelColor(uint16_t i, uint8_t r, uint8_t g, uint8_t b, uint8_t w) { setPixelColor(i, Color(r, g, b, w)); }
  void setPixelColor(uint16_t i, uint32_t c) {
    if (i < n_) renk_[i] = c;
  }
  void fill(uint32_t c = 0, uint16_t ilk = 0, uint16_t say = 0) {
    uint16_t son = say ? ilk + say : n_;
    for (uint16_t i = ilk; i < son && i < n_; i++) renk_[i] = c;
  }
  void clear() { fill(0); }
  void setBrightness(uint8_t b) { parlaklik_ = b + 1; }
  uint8_t getBrightness() const { return parlaklik_ - 1; }
  uint16_t numPixels() const { return n_; }
  int16_t getPin() const { return pin_; }
  uint32_t getPixelColor(uint16_t i) const { return i < n_ ? renk_[i] : 0; }
  uint8_t *getPixels() const { return (uint8_t *)renk_; }

  static uint32_t Color(uint8_t r, uint8_t g, uint8_t b) { return ((uint32_t)r << 16) | ((uint32_t)g << 8) | b; }
  static uint32_t Color(uint8_t r, uint8_t g, uint8_t b, uint8_t w) { return ((uint32_t)w << 24) | Color(r, g, b); }
  // Adafruit'in HSV dönüşümü: ton 0–65535.
  static uint32_t ColorHSV(uint16_t ton, uint8_t doy = 255, uint8_t deger = 255) {
    uint8_t r, g, b;
    uint32_t h = ((uint32_t)ton * 1530L + 32768) / 65536;
    if (h < 510) { b = 0; if (h < 255) { r = 255; g = h; } else { r = 510 - h; g = 255; } }
    else if (h < 1020) { r = 0; if (h < 765) { g = 255; b = h - 510; } else { g = 1020 - h; b = 255; } }
    else if (h < 1530) { g = 0; if (h < 1275) { r = h - 1020; b = 255; } else { r = 255; b = 1530 - h; } }
    else { r = 255; g = b = 0; }
    uint32_t v1 = 1 + deger;
    uint16_t s1 = 1 + doy;
    uint8_t s2 = 255 - doy;
    return ((((((r * s1) >> 8) + s2) * v1) & 0xff00) << 8) | (((((g * s1) >> 8) + s2) * v1) & 0xff00) |
           (((((b * s1) >> 8) + s2) * v1) >> 8);
  }
  static uint8_t gamma8(uint8_t x) { return (uint8_t)(pow(x / 255.0, 2.6) * 255.0 + 0.5); }
  static uint32_t gamma32(uint32_t c) {
    return ((uint32_t)gamma8(c >> 24) << 24) | ((uint32_t)gamma8(c >> 16) << 16) | ((uint32_t)gamma8(c >> 8) << 8) | gamma8(c);
  }
  static uint8_t sine8(uint8_t x) { return (uint8_t)((sin(x / 256.0 * 2 * M_PI) + 1) * 127.5); }

 private:
  uint8_t olcek(uint16_t v) const {
    if (v > 255) v = 255;
    return parlaklik_ ? (uint8_t)((v * parlaklik_) >> 8) : (uint8_t)v;
  }
  int16_t pin_ = -1;
  uint16_t n_ = 0;
  uint32_t *renk_ = nullptr;
  uint16_t parlaklik_ = 0; // 0: tam parlak (setBrightness çağrılmadı)
};
