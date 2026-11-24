// ESP32Servo kütüphanesinin taklidi: açı doğrudan çalıştırıcıya gider.
#pragma once
#include "Arduino.h"
#include "ky_host.h"

class ESP32PWM {
 public:
  static void allocateTimer(int) {}
};

class Servo {
 public:
  int attach(int pin) { return attach(pin, 544, 2400); }
  int attach(int pin, int min_us, int max_us) {
    pin_ = pin;
    min_ = min_us;
    max_ = max_us;
    ky_pin_modu(pin, OUTPUT);
    return 1;
  }
  void setPeriodHertz(int) {}
  void detach() { pin_ = -1; }
  bool attached() const { return pin_ >= 0; }
  void write(int value) {
    if (value < 200) {
      aci_ = constrain(value, 0, 180);
      if (pin_ >= 0) ky_servo(pin_, aci_);
    } else {
      writeMicroseconds(value);
    }
  }
  void writeMicroseconds(int us) {
    us = constrain(us, min_, max_);
    aci_ = (int)((long)(us - min_) * 180 / (max_ - min_));
    if (pin_ >= 0) ky_servo(pin_, aci_);
  }
  int read() const { return aci_; }
  int readMicroseconds() const { return min_ + (long)aci_ * (max_ - min_) / 180; }

 private:
  int pin_ = -1;
  int min_ = 544;
  int max_ = 2400;
  int aci_ = 90;
};
