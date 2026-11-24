// Print: Serial ve ekran ortak yazma sınıfı.
#pragma once
#include <stdarg.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include "WString.h"
#include "ky_host.h"

class Print;

// Kendini yazdırabilen nesneler (IPAddress gibi).
class Printable {
 public:
  virtual ~Printable() {}
  virtual size_t printTo(Print &p) const = 0;
};

class Print {
 public:
  virtual ~Print() {}
  virtual size_t write(uint8_t c) = 0;
  virtual size_t write(const uint8_t *buf, size_t n) {
    size_t t = 0;
    while (n--) t += write(*buf++);
    return t;
  }
  size_t write(const char *s) { return s ? write((const uint8_t *)s, strlen(s)) : 0; }
  size_t write(const char *s, size_t n) { return write((const uint8_t *)s, n); }

  size_t print(const char *s) { return write(s); }
  size_t print(const String &s) { return write(s.c_str(), s.length()); }
  size_t print(char c) { return write((uint8_t)c); }
  size_t print(unsigned char v, int base = DEC_) { return print(String((unsigned int)v, base)); }
  size_t print(int v, int base = DEC_) { return print(String(v, base)); }
  size_t print(unsigned int v, int base = DEC_) { return print(String(v, base)); }
  size_t print(long v, int base = DEC_) { return print(String(v, base)); }
  size_t print(unsigned long v, int base = DEC_) { return print(String(v, base)); }
  size_t print(long long v, int base = DEC_) { return print(String((long)v, base)); }
  size_t print(unsigned long long v, int base = DEC_) { return print(String((unsigned long)v, base)); }
  size_t print(double v, int digits = 2) { return print(String(v, (unsigned int)digits)); }
  size_t print(const Printable &x) { return x.printTo(*this); }

  size_t println() { return write("\r\n"); }
  template <class T>
  size_t println(T v) { size_t n = print(v); return n + println(); }
  template <class T>
  size_t println(T v, int b) { size_t n = print(v, b); return n + println(); }

  size_t printf(const char *fmt, ...) __attribute__((format(printf, 2, 3))) {
    char kucuk[256];
    va_list a;
    va_start(a, fmt);
    int n = vsnprintf(kucuk, sizeof kucuk, fmt, a);
    va_end(a);
    if (n < 0) return 0;
    if ((size_t)n < sizeof kucuk) return write(kucuk, n);
    std::string buyuk(n + 1, '\0');
    va_start(a, fmt);
    vsnprintf(&buyuk[0], n + 1, fmt, a);
    va_end(a);
    return write(buyuk.c_str(), n);
  }
  virtual void flush() {}

 private:
  static const int DEC_ = 10;
};
