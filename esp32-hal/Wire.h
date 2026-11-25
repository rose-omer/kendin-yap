// I2C: baytlar işçideki cihaz taklitlerine gider (DS1307, MPU6050). Adreste cihaz yoksa
// endTransmission() 2 döner, requestFrom() 0 döner; gerçek veri yolu gibi.
// OLED (Adafruit_SSD1306) kendi taklidini kullanır, bu yoldan geçmez.
#pragma once
#include "Arduino.h"
#include "ky_host.h"

class TwoWire {
 public:
  bool begin(int = -1, int = -1, uint32_t = 0) { return true; }
  void end() {}
  void setClock(uint32_t) {}
  void setTimeOut(uint16_t) {}
  void setTimeout(uint16_t) {}
  void beginTransmission(uint8_t a) {
    adres_ = a;
    n_ = 0;
  }
  void beginTransmission(int a) { beginTransmission((uint8_t)a); }
  uint8_t endTransmission(bool = true) { return (uint8_t)ky_i2c_yaz(adres_, tx_, n_); }
  uint8_t endTransmission(uint8_t dur) { return endTransmission((bool)dur); }
  size_t write(uint8_t b) {
    if (n_ >= (int)sizeof tx_) return 0;
    tx_[n_++] = b;
    return 1;
  }
  size_t write(const uint8_t *v, size_t n) {
    size_t k = 0;
    while (k < n && write(v[k])) k++;
    return k;
  }
  size_t write(const char *s) { return write((const uint8_t *)s, strlen(s)); }
  size_t write(int b) { return write((uint8_t)b); }
  size_t write(unsigned int b) { return write((uint8_t)b); }
  size_t write(long b) { return write((uint8_t)b); }
  size_t write(unsigned long b) { return write((uint8_t)b); }
  uint8_t requestFrom(uint8_t a, uint8_t n) { return oku(a, n); }
  uint8_t requestFrom(uint8_t a, uint8_t n, uint8_t) { return oku(a, n); }
  uint8_t requestFrom(int a, int n) { return oku(a, n); }
  uint8_t requestFrom(int a, int n, int) { return oku(a, n); }
  uint8_t requestFrom(uint16_t a, size_t n, bool) { return oku(a, n); }
  int available() { return rxN_ - rxI_; }
  int read() { return rxI_ < rxN_ ? rx_[rxI_++] : -1; }
  int peek() { return rxI_ < rxN_ ? rx_[rxI_] : -1; }
  void flush() {}

 private:
  uint8_t oku(int a, int n) {
    if (n > (int)sizeof rx_) n = sizeof rx_;
    rxN_ = n > 0 ? ky_i2c_oku(a, rx_, n) : 0;
    rxI_ = 0;
    return (uint8_t)rxN_;
  }
  uint8_t adres_ = 0;
  uint8_t tx_[128];
  int n_ = 0;
  uint8_t rx_[128];
  int rxN_ = 0;
  int rxI_ = 0;
};

extern TwoWire Wire;
extern TwoWire Wire1;
