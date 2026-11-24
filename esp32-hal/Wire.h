// I2C: simülasyonda gerçek veri yolu yok. Ekran ve sensör kütüphaneleri kendi taklidini kullanır.
#pragma once
#include "Arduino.h"

class TwoWire {
 public:
  bool begin(int = -1, int = -1, uint32_t = 0) { return true; }
  void setClock(uint32_t) {}
  void beginTransmission(uint8_t a) { adres = a; }
  uint8_t endTransmission(bool = true) { return 0; }
  size_t write(uint8_t) { return 1; }
  size_t write(const uint8_t *, size_t n) { return n; }
  uint8_t requestFrom(uint8_t, uint8_t n, bool = true) { return 0 * n; }
  int available() { return 0; }
  int read() { return -1; }

 private:
  uint8_t adres = 0;
};

extern TwoWire Wire;
extern TwoWire Wire1;
