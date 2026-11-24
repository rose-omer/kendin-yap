// Seri port: yazılanlar seri ekrana gider; simülasyon panelinden yazılanlar read() ile okunur.
#pragma once
#include "Stream.h"

class HardwareSerial : public Stream {
 public:
  HardwareSerial() : Stream(0) {}
  void begin(unsigned long, uint32_t = 0, int8_t = -1, int8_t = -1) {}
  void end() {}
  operator bool() const { return true; }
  size_t write(uint8_t c) override;
  size_t write(const uint8_t *buf, size_t n) override;
  using Print::write;
};

extern HardwareSerial Serial;
extern HardwareSerial Serial1;
extern HardwareSerial Serial2;
