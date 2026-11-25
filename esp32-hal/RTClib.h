// RTClib taklidi: DateTime, TimeSpan, RTC_DS1307 ve RTC_DS3231. Saat, Wire üzerinden işçideki
// DS1307 taklidinden okunur (src/simulasyon/cihazlar.js); modül bağlı değilse begin() false döner.
#pragma once
#include <stdio.h>
#include <string.h>
#include "Arduino.h"
#include "Wire.h"

#define SECONDS_FROM_1970_TO_2000 946684800UL

class TimeSpan {
 public:
  TimeSpan(int32_t sn = 0) : sn_(sn) {}
  TimeSpan(int16_t gun, int8_t saat, int8_t dk, int8_t sn) : sn_((int32_t)gun * 86400L + (int32_t)saat * 3600 + (int32_t)dk * 60 + sn) {}
  int16_t days() const { return sn_ / 86400L; }
  int8_t hours() const { return sn_ / 3600 % 24; }
  int8_t minutes() const { return sn_ / 60 % 60; }
  int8_t seconds() const { return sn_ % 60; }
  int32_t totalseconds() const { return sn_; }
  TimeSpan operator+(const TimeSpan &r) const { return TimeSpan(sn_ + r.sn_); }
  TimeSpan operator-(const TimeSpan &r) const { return TimeSpan(sn_ - r.sn_); }

 private:
  int32_t sn_;
};

class DateTime {
 public:
  DateTime(uint32_t t = SECONDS_FROM_1970_TO_2000) {
    t -= SECONDS_FROM_1970_TO_2000;
    ss_ = t % 60;
    t /= 60;
    mm_ = t % 60;
    t /= 60;
    hh_ = t % 24;
    uint16_t gun = t / 24;
    uint8_t artik;
    for (yOff_ = 0;; ++yOff_) {
      artik = yOff_ % 4 == 0;
      if (gun < 365U + artik) break;
      gun -= 365 + artik;
    }
    for (m_ = 1; m_ < 12; ++m_) {
      uint8_t ayGunu = ayUzunlugu(m_ - 1);
      if (artik && m_ == 2) ++ayGunu;
      if (gun < ayGunu) break;
      gun -= ayGunu;
    }
    d_ = gun + 1;
  }
  DateTime(uint16_t yil, uint8_t ay, uint8_t gun, uint8_t saat = 0, uint8_t dk = 0, uint8_t sn = 0)
      : yOff_(yil >= 2000 ? yil - 2000 : yil), m_(ay), d_(gun), hh_(saat), mm_(dk), ss_(sn) {}
  // __DATE__ ("Nov 25 2026") ve __TIME__ ("09:41:00") biçimi.
  DateTime(const char *tarih, const char *zaman) {
    static const char AYLAR[] = "JanFebMarAprMayJunJulAugSepOctNovDec";
    char ay[4] = {tarih[0], tarih[1], tarih[2], 0};
    const char *bul = strstr(AYLAR, ay);
    m_ = bul ? (bul - AYLAR) / 3 + 1 : 1;
    d_ = atoi(tarih + 4);
    yOff_ = atoi(tarih + 7) - 2000;
    hh_ = atoi(zaman);
    mm_ = atoi(zaman + 3);
    ss_ = atoi(zaman + 6);
  }
  uint16_t year() const { return 2000U + yOff_; }
  uint8_t month() const { return m_; }
  uint8_t day() const { return d_; }
  uint8_t hour() const { return hh_; }
  uint8_t twelveHour() const { return hh_ == 0 || hh_ == 12 ? 12 : hh_ % 12; }
  uint8_t isPM() const { return hh_ >= 12; }
  uint8_t minute() const { return mm_; }
  uint8_t second() const { return ss_; }
  uint8_t dayOfTheWeek() const { return (gunler(yOff_, m_, d_) + 6) % 7; } // 0 = Pazar
  uint32_t secondstime() const { return ((gunler(yOff_, m_, d_) * 24UL + hh_) * 60 + mm_) * 60 + ss_; }
  uint32_t unixtime() const { return secondstime() + SECONDS_FROM_1970_TO_2000; }
  bool isValid() const { return m_ >= 1 && m_ <= 12 && d_ >= 1 && d_ <= 31 && hh_ < 24 && mm_ < 60 && ss_ < 60; }
  // "YYYY", "MM", "DD", "hh", "mm", "ss" yerine değerleri yazar (RTClib gibi).
  char *toString(char *k) const {
    for (char *p = k; *p; p++) {
      auto koy = [&](int n, int hane) {
        char t[8];
        snprintf(t, sizeof t, hane == 4 ? "%04d" : "%02d", n);
        memcpy(p, t, hane);
        p += hane - 1;
      };
      if (!strncmp(p, "YYYY", 4)) koy(year(), 4);
      else if (!strncmp(p, "YY", 2)) koy(year() % 100, 2);
      else if (!strncmp(p, "MM", 2)) koy(m_, 2);
      else if (!strncmp(p, "DD", 2)) koy(d_, 2);
      else if (!strncmp(p, "hh", 2)) koy(hh_, 2);
      else if (!strncmp(p, "mm", 2)) koy(mm_, 2);
      else if (!strncmp(p, "ss", 2)) koy(ss_, 2);
    }
    return k;
  }
  String timestamp() const {
    char t[24];
    snprintf(t, sizeof t, "%04u-%02u-%02uT%02u:%02u:%02u", year(), m_, d_, hh_, mm_, ss_);
    return String(t);
  }
  DateTime operator+(const TimeSpan &s) const { return DateTime(unixtime() + s.totalseconds()); }
  DateTime operator-(const TimeSpan &s) const { return DateTime(unixtime() - s.totalseconds()); }
  TimeSpan operator-(const DateTime &r) const { return TimeSpan((int32_t)(unixtime() - r.unixtime())); }
  bool operator<(const DateTime &r) const { return unixtime() < r.unixtime(); }
  bool operator>(const DateTime &r) const { return r < *this; }
  bool operator<=(const DateTime &r) const { return !(r < *this); }
  bool operator>=(const DateTime &r) const { return !(*this < r); }
  bool operator==(const DateTime &r) const { return unixtime() == r.unixtime(); }
  bool operator!=(const DateTime &r) const { return !(*this == r); }

 private:
  static uint8_t ayUzunlugu(uint8_t i) {
    static const uint8_t G[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    return G[i];
  }
  static uint16_t gunler(uint16_t y, uint8_t m, uint8_t d) {
    uint16_t g = d;
    for (uint8_t i = 1; i < m; ++i) g += ayUzunlugu(i - 1);
    if (m > 2 && y % 4 == 0) ++g;
    return g + 365 * y + (y + 3) / 4 - 1;
  }
  uint8_t yOff_, m_, d_, hh_, mm_, ss_;
};

class RTC_DS1307 {
 public:
  bool begin(TwoWire *w = &Wire) {
    w_ = w;
    w_->begin();
    w_->beginTransmission(ADRES);
    return w_->endTransmission() == 0;
  }
  uint8_t isrunning() { return !(oku(0) >> 7); }
  void adjust(const DateTime &t) {
    w_->beginTransmission(ADRES);
    w_->write((uint8_t)0);
    w_->write(bcd(t.second()));
    w_->write(bcd(t.minute()));
    w_->write(bcd(t.hour()));
    w_->write(bcd(t.dayOfTheWeek() + 1));
    w_->write(bcd(t.day()));
    w_->write(bcd(t.month()));
    w_->write(bcd(t.year() - 2000U));
    w_->endTransmission();
  }
  DateTime now() {
    w_->beginTransmission(ADRES);
    w_->write((uint8_t)0);
    w_->endTransmission();
    w_->requestFrom(ADRES, 7);
    uint8_t ss = ikili(w_->read() & 0x7f);
    uint8_t mm = ikili(w_->read());
    uint8_t hh = ikili(w_->read() & 0x3f);
    w_->read();
    uint8_t d = ikili(w_->read());
    uint8_t m = ikili(w_->read());
    uint16_t y = ikili(w_->read()) + 2000U;
    return DateTime(y, m, d, hh, mm, ss);
  }
  bool lostPower() { return false; }
  float getTemperature() { return 25.0f; }

 protected:
  static const int ADRES = 0x68;
  static uint8_t bcd(uint8_t v) { return v + 6 * (v / 10); }
  static uint8_t ikili(int v) { return (uint8_t)(v - 6 * (v >> 4)); }
  uint8_t oku(uint8_t y) {
    w_->beginTransmission(ADRES);
    w_->write(y);
    w_->endTransmission();
    w_->requestFrom(ADRES, 1);
    return (uint8_t)w_->read();
  }
  TwoWire *w_ = &Wire;
};

// DS3231 de aynı adres ve saat yazmaçlarını kullanır.
class RTC_DS3231 : public RTC_DS1307 {};
