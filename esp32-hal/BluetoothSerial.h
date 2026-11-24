// Klasik Bluetooth seri (SPP) taklidi: simülasyon panelindeki "telefon terminali" ile konuşur.
#pragma once
#include "Arduino.h"
#include "Stream.h"
#include "ky_host.h"

class BluetoothSerial : public Stream {
 public:
  BluetoothSerial() : Stream(1) {}
  bool begin(const String &ad = "ESP32", bool = false) {
    ad_ = ad;
    ky_bt_basla(ad_.c_str(), (int)ad_.length());
    return true;
  }
  void end() {}
  bool hasClient() { return ky_bt_bagli() != 0; }
  bool connected(int = 0) { return hasClient(); }
  bool setPin(const char *) { return true; }
  size_t write(uint8_t c) override {
    char b = (char)c;
    ky_bt_yaz(&b, 1);
    return 1;
  }
  size_t write(const uint8_t *buf, size_t n) override {
    ky_bt_yaz((const char *)buf, (int)n);
    return n;
  }
  using Print::write;

 private:
  String ad_;
};
