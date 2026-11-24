// Ham TCP istemcisi simülasyonda yok; derlensin diye boş sınıf. HTTP için HTTPClient kullan.
#pragma once
#include "Arduino.h"

class WiFiClient : public Print {
 public:
  int connect(const char *, uint16_t) { return 0; }
  bool connected() { return false; }
  int available() { return 0; }
  int read() { return -1; }
  void stop() {}
  size_t write(uint8_t) override { return 0; }
  using Print::write;
  operator bool() { return false; }
};

class WiFiClientSecure : public WiFiClient {
 public:
  void setInsecure() {}
  void setCACert(const char *) {}
};
