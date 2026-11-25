// Keypad kütüphanesinin taklidi. Gerçeği gibi sütunları sırayla LOW yapıp satırları okur;
// tarayıcı basılı tuşu bir satır ve bir sütun GPIO'su arasında kısa devre olarak verir.
#pragma once
#include "Arduino.h"

typedef char KeypadEvent;
typedef enum { IDLE, PRESSED, HOLD, RELEASED } KeyState;
#define NO_KEY '\0'
#define makeKeymap(x) ((char *)x)

class Keypad {
 public:
  Keypad(char *harita, byte *satirlar, byte *sutunlar, byte satirSayisi, byte sutunSayisi)
      : harita_(harita), satir_(satirlar), sutun_(sutunlar), ns_(satirSayisi), nc_(sutunSayisi) {}

  char getKey() {
    tara();
    if (!yeni_) return NO_KEY;
    yeni_ = false;
    return tus_;
  }
  char waitForKey() {
    for (;;) {
      char k = getKey();
      if (k != NO_KEY) return k;
      delay(1);
    }
  }
  KeyState getState() { return durum_; }
  bool keyStateChanged() {
    tara();
    bool d = degisti_;
    degisti_ = false;
    return d;
  }
  bool isPressed(char k) {
    tara();
    return tus_ == k && (durum_ == PRESSED || durum_ == HOLD);
  }
  void setDebounceTime(unsigned int ms) { bekleme_ = ms < 1 ? 1 : ms; }
  void setHoldTime(unsigned int ms) { tutma_ = ms; }
  void addEventListener(void (*dinleyici)(char)) { dinleyici_ = dinleyici; }
  void begin(char *harita) { harita_ = harita; }

 private:
  void tara() {
    unsigned long simdi = millis();
    if (simdi - sonTarama_ < bekleme_) return;
    sonTarama_ = simdi;
    char bulunan = NO_KEY;
    for (byte r = 0; r < ns_; r++) pinMode(satir_[r], INPUT_PULLUP);
    for (byte c = 0; c < nc_ && bulunan == NO_KEY; c++) {
      pinMode(sutun_[c], OUTPUT);
      digitalWrite(sutun_[c], LOW);
      for (byte r = 0; r < ns_; r++) {
        if (!digitalRead(satir_[r])) {
          bulunan = harita_[r * nc_ + c];
          break;
        }
      }
      digitalWrite(sutun_[c], HIGH);
      pinMode(sutun_[c], INPUT);
    }
    if (bulunan != tus_) {
      if (tus_ != NO_KEY) durumYaz(RELEASED, tus_);
      tus_ = bulunan;
      basla_ = simdi;
      if (bulunan != NO_KEY) {
        yeni_ = true;
        durumYaz(PRESSED, bulunan);
      }
    } else if (tus_ == NO_KEY) {
      if (durum_ == RELEASED) durumYaz(IDLE, NO_KEY, false);
    } else if (durum_ == PRESSED && simdi - basla_ > tutma_) {
      durumYaz(HOLD, tus_);
    }
  }
  void durumYaz(KeyState s, char k, bool olay = true) {
    durum_ = s;
    degisti_ = true;
    if (olay && dinleyici_) dinleyici_(k);
  }

  char *harita_;
  byte *satir_;
  byte *sutun_;
  byte ns_;
  byte nc_;
  char tus_ = NO_KEY;
  bool yeni_ = false;
  bool degisti_ = false;
  KeyState durum_ = IDLE;
  unsigned long sonTarama_ = 0;
  unsigned long basla_ = 0;
  unsigned int bekleme_ = 10;
  unsigned int tutma_ = 500;
  void (*dinleyici_)(char) = nullptr;
};
