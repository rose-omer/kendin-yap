#pragma once
#include "Print.h"

class IPAddress : public Printable {
 public:
  IPAddress() : adres{0, 0, 0, 0} {}
  IPAddress(uint8_t a, uint8_t b, uint8_t c, uint8_t d) : adres{a, b, c, d} {}
  explicit IPAddress(uint32_t v) : adres{(uint8_t)(v >> 24), (uint8_t)(v >> 16), (uint8_t)(v >> 8), (uint8_t)v} {}
  uint8_t operator[](int i) const { return adres[i]; }
  String toString() const {
    char b[16];
    snprintf(b, sizeof b, "%u.%u.%u.%u", adres[0], adres[1], adres[2], adres[3]);
    return String(b);
  }
  bool fromString(const char *) { return true; }
  size_t printTo(Print &p) const override { return p.print(toString()); }
  bool operator==(const IPAddress &o) const { return memcmp(adres, o.adres, 4) == 0; }

 private:
  uint8_t adres[4];
};
