// DHT sensör kütüphanesinin taklidi: değerler simülasyon panelindeki kaydırıcılardan gelir.
#pragma once
#include "Arduino.h"
#include "ky_host.h"

#define DHT11 11
#define DHT12 12
#define DHT21 21
#define DHT22 22
#define AM2301 21

class DHT {
 public:
  DHT(uint8_t pin, uint8_t type, uint8_t = 6) : pin_(pin), type_(type) {}
  void begin(uint8_t = 55) { ky_pin_modu(pin_, INPUT_PULLUP); }
  float readTemperature(bool fahrenheit = false, bool = false) {
    double c = ky_dht(pin_, 0);
    if (isnan(c)) return NAN;
    return fahrenheit ? (float)(c * 1.8 + 32) : (float)c;
  }
  float readHumidity(bool = false) { return (float)ky_dht(pin_, 1); }
  float convertCtoF(float c) { return c * 1.8f + 32; }
  float convertFtoC(float f) { return (f - 32) * 0.55555f; }
  float computeHeatIndex(float t, float h, bool fahrenheit = true) {
    float f = fahrenheit ? t : convertCtoF(t);
    float hi = 0.5f * (f + 61.0f + ((f - 68.0f) * 1.2f) + (h * 0.094f));
    return fahrenheit ? hi : convertFtoC(hi);
  }

 private:
  uint8_t pin_;
  uint8_t type_;
};
