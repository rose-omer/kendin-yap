// Stream: okunabilir akış (Serial, SerialBT). Veri çalıştırıcıdaki giriş tamponundan gelir.
#pragma once
#include "Print.h"
#include "ky_host.h"

class Stream : public Print {
 public:
  explicit Stream(int kanal) : kanal_(kanal) {}
  int available() { return ky_akis_say(kanal_); }
  int read() { return ky_akis_oku(kanal_); }
  int peek() { return ky_akis_bak(kanal_); }
  void setTimeout(unsigned long ms) { zamanAsimi = ms; }
  String readString() {
    String s;
    unsigned long bas = millis_();
    while (millis_() - bas < zamanAsimi) {
      int c = read();
      if (c >= 0) { s += (char)c; bas = millis_(); }
      else if (!s.isEmpty()) break;
      else ky_bekle(5);
    }
    return s;
  }
  String readStringUntil(char son) {
    String s;
    unsigned long bas = millis_();
    while (millis_() - bas < zamanAsimi) {
      int c = read();
      if (c < 0) { ky_bekle(5); continue; }
      if (c == son) break;
      s += (char)c;
      bas = millis_();
    }
    return s;
  }
  long parseInt() { return readStringUntil('\n').toInt(); }
  float parseFloat() { return readStringUntil('\n').toFloat(); }
  size_t readBytes(char *b, size_t n) {
    size_t i = 0;
    while (i < n) { int c = read(); if (c < 0) break; b[i++] = (char)c; }
    return i;
  }

 protected:
  int kanal_;
  unsigned long zamanAsimi = 1000;
  static unsigned long millis_() { return (unsigned long)(ky_zaman_us() / 1000.0); }
};
