// HX711 (bogde) kütüphanesinin taklidi. Ham değer simülasyon panelindeki ağırlık kaydırıcısından gelir:
// 1 g = 420 birim (src/simulasyon/cihazlar.js). Modül beslenmemişse ya da bağlı değilse hazır olmaz.
#pragma once
#include <math.h>
#include "Arduino.h"
#include "ky_host.h"

class HX711 {
 public:
  void begin(byte dout, byte sck, byte kazanc = 128) {
    dout_ = dout;
    pinMode(sck, OUTPUT);
    pinMode(dout, INPUT);
    set_gain(kazanc);
  }
  bool is_ready() { return !isnan(ky_hx711(dout_)); }
  void set_gain(byte k) { bolen_ = k == 64 ? 2 : k == 32 ? 4 : 1; }
  long read() {
    wait_ready();
    double v = ky_hx711(dout_);
    return isnan(v) ? 0 : (long)v / bolen_;
  }
  void wait_ready(unsigned long ms = 0) {
    while (!is_ready()) delay(ms ? ms : 1);
  }
  bool wait_ready_retry(int deneme = 3, unsigned long ms = 0) {
    while (deneme-- > 0) {
      if (is_ready()) return true;
      delay(ms ? ms : 1);
    }
    return false;
  }
  bool wait_ready_timeout(unsigned long sure = 1000, unsigned long ms = 0) {
    unsigned long bas = millis();
    while (millis() - bas < sure) {
      if (is_ready()) return true;
      delay(ms ? ms : 1);
    }
    return false;
  }
  long read_average(byte kez = 10) {
    if (!kez) return 0;
    long t = 0;
    for (byte i = 0; i < kez; i++) t += read();
    return t / kez;
  }
  double get_value(byte kez = 1) { return read_average(kez) - ofset_; }
  float get_units(byte kez = 1) { return get_value(kez) / olcek_; }
  void tare(byte kez = 10) { set_offset(read_average(kez)); }
  void set_scale(float s = 1.f) { olcek_ = s; }
  float get_scale() { return olcek_; }
  void set_offset(long o = 0) { ofset_ = o; }
  long get_offset() { return ofset_; }
  void power_down() {}
  void power_up() {}

 private:
  byte dout_ = 0;
  long bolen_ = 1;
  float olcek_ = 1.f;
  long ofset_ = 0;
};
