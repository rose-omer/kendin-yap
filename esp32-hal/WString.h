// Arduino String sınıfının sade karşılığı (std::string üstüne).
#pragma once
#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

class String {
 public:
  std::string s;
  String() {}
  String(const char *c) : s(c ? c : "") {}
  String(const std::string &x) : s(x) {}
  String(char c) : s(1, c) {}
  String(int v, unsigned char base = 10) { sayi((long)v, base); }
  String(unsigned int v, unsigned char base = 10) { usayi((unsigned long)v, base); }
  String(long v, unsigned char base = 10) { sayi(v, base); }
  String(unsigned long v, unsigned char base = 10) { usayi(v, base); }
  String(float v, unsigned int decimals = 2) { ondalik(v, decimals); }
  String(double v, unsigned int decimals = 2) { ondalik(v, decimals); }

  unsigned int length() const { return (unsigned int)s.size(); }
  bool isEmpty() const { return s.empty(); }
  const char *c_str() const { return s.c_str(); }
  char charAt(unsigned int i) const { return i < s.size() ? s[i] : 0; }
  char operator[](unsigned int i) const { return charAt(i); }
  char &operator[](unsigned int i) { return s[i]; }
  void setCharAt(unsigned int i, char c) { if (i < s.size()) s[i] = c; }

  String &operator+=(const String &o) { s += o.s; return *this; }
  String &operator+=(const char *o) { s += o ? o : ""; return *this; }
  String &operator+=(char c) { s += c; return *this; }
  String &operator+=(int v) { return *this += String(v); }
  String &operator+=(unsigned int v) { return *this += String(v); }
  String &operator+=(long v) { return *this += String(v); }
  String &operator+=(unsigned long v) { return *this += String(v); }
  String &operator+=(float v) { return *this += String(v); }
  String &operator+=(double v) { return *this += String(v); }
  bool concat(const String &o) { s += o.s; return true; }

  bool operator==(const String &o) const { return s == o.s; }
  bool operator==(const char *o) const { return s == (o ? o : ""); }
  bool operator!=(const String &o) const { return s != o.s; }
  bool operator!=(const char *o) const { return !(*this == o); }
  bool operator<(const String &o) const { return s < o.s; }
  bool equals(const String &o) const { return s == o.s; }
  bool equalsIgnoreCase(const String &o) const {
    if (s.size() != o.s.size()) return false;
    for (size_t i = 0; i < s.size(); i++) if (tolower(s[i]) != tolower(o.s[i])) return false;
    return true;
  }
  bool startsWith(const String &o) const { return s.rfind(o.s, 0) == 0; }
  bool endsWith(const String &o) const { return s.size() >= o.s.size() && s.compare(s.size() - o.s.size(), o.s.size(), o.s) == 0; }
  int indexOf(char c, unsigned int from = 0) const { size_t p = s.find(c, from); return p == std::string::npos ? -1 : (int)p; }
  int indexOf(const String &o, unsigned int from = 0) const { size_t p = s.find(o.s, from); return p == std::string::npos ? -1 : (int)p; }
  int lastIndexOf(char c) const { size_t p = s.rfind(c); return p == std::string::npos ? -1 : (int)p; }
  String substring(unsigned int a) const { return a >= s.size() ? String() : String(s.substr(a)); }
  String substring(unsigned int a, unsigned int b) const {
    if (a > b) { unsigned int t = a; a = b; b = t; }
    if (a >= s.size()) return String();
    return String(s.substr(a, b - a));
  }
  void trim() {
    size_t a = s.find_first_not_of(" \t\r\n");
    size_t b = s.find_last_not_of(" \t\r\n");
    s = a == std::string::npos ? "" : s.substr(a, b - a + 1);
  }
  void toUpperCase() { for (auto &c : s) c = toupper(c); }
  void toLowerCase() { for (auto &c : s) c = tolower(c); }
  void replace(const String &a, const String &b) {
    if (a.s.empty()) return;
    size_t p = 0;
    while ((p = s.find(a.s, p)) != std::string::npos) { s.replace(p, a.s.size(), b.s); p += b.s.size(); }
  }
  void remove(unsigned int i) { if (i < s.size()) s.erase(i); }
  void remove(unsigned int i, unsigned int n) { if (i < s.size()) s.erase(i, n); }
  long toInt() const { return atol(s.c_str()); }
  float toFloat() const { return (float)atof(s.c_str()); }
  double toDouble() const { return atof(s.c_str()); }
  void reserve(unsigned int n) { s.reserve(n); }
  operator std::string() const { return s; }

 private:
  void usayi(unsigned long v, unsigned char base) {
    if (base < 2) base = 10;
    char b[40]; int i = 39; b[i] = 0;
    do { int d = v % base; b[--i] = d < 10 ? '0' + d : 'A' + d - 10; v /= base; } while (v && i > 0);
    s = &b[i];
  }
  void sayi(long v, unsigned char base) {
    if (v < 0 && base == 10) { usayi((unsigned long)(-v), base); s = "-" + s; }
    else usayi((unsigned long)v, base);
  }
  void ondalik(double v, unsigned int d) { char b[64]; snprintf(b, sizeof b, "%.*f", (int)d, v); s = b; }
};

inline String operator+(const String &a, const String &b) { String r(a); r += b; return r; }
inline String operator+(const String &a, const char *b) { String r(a); r += b; return r; }
inline String operator+(const char *a, const String &b) { String r(a); r += b; return r; }
inline String operator+(const String &a, char b) { String r(a); r += b; return r; }
inline String operator+(const String &a, int b) { String r(a); r += b; return r; }
inline String operator+(const String &a, unsigned int b) { String r(a); r += b; return r; }
inline String operator+(const String &a, long b) { String r(a); r += b; return r; }
inline String operator+(const String &a, unsigned long b) { String r(a); r += b; return r; }
inline String operator+(const String &a, float b) { String r(a); r += b; return r; }
inline String operator+(const String &a, double b) { String r(a); r += b; return r; }
