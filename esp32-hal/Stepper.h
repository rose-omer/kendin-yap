// Arduino Stepper kütüphanesinin taklidi (2 ve 4 telli). Bobinleri digitalWrite ile sürer;
// işçi pin değişimlerinden adım sayar, şemadaki motor döner.
#pragma once
#include <stdlib.h>
#include "Arduino.h"

class Stepper {
 public:
  Stepper(int adim, int p1, int p2) : adim_(adim), pin_{p1, p2, -1, -1}, tel_(2) { kur(); }
  Stepper(int adim, int p1, int p2, int p3, int p4) : adim_(adim), pin_{p1, p2, p3, p4}, tel_(4) { kur(); }
  void setSpeed(long rpm) { bekleme_ = rpm > 0 ? 60L * 1000L * 1000L / adim_ / rpm : 1000000L; }
  void step(int n) {
    int kalan = abs(n);
    while (kalan > 0) {
      unsigned long simdi = micros();
      if (simdi - son_ >= (unsigned long)bekleme_) {
        son_ = simdi;
        if (n > 0) {
          if (++no_ == adim_) no_ = 0;
        } else {
          if (no_ == 0) no_ = adim_;
          no_--;
        }
        kalan--;
        sur(no_ % 4);
      } else {
        delayMicroseconds(bekleme_ - (simdi - son_));
      }
    }
  }
  int version() { return 5; }

 private:
  void kur() {
    for (int p : pin_) if (p >= 0) pinMode(p, OUTPUT);
  }
  void sur(int a) {
    static const uint8_t DORT[4][4] = {{1, 0, 1, 0}, {0, 1, 1, 0}, {0, 1, 0, 1}, {1, 0, 0, 1}};
    static const uint8_t IKI[4][2] = {{0, 1}, {1, 1}, {1, 0}, {0, 0}};
    for (int i = 0; i < tel_; i++) digitalWrite(pin_[i], tel_ == 4 ? DORT[a][i] : IKI[a][i]);
  }
  int adim_;
  int pin_[4];
  int tel_;
  long bekleme_ = 1000000L;
  int no_ = 0;
  unsigned long son_ = 0;
};
