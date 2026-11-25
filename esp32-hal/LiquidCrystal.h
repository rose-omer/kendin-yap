// LiquidCrystal taklidi: HD44780 komut ve veri baytları tarayıcıdaki LCD parçasına gider.
// Tarayıcı LCD'yi E ucunun bağlı olduğu GPIO ile bulur (src/simulasyon/lcd.js).
#pragma once
#include "Arduino.h"
#include "Print.h"
#include "ky_host.h"

#define LCD_CLEARDISPLAY 0x01
#define LCD_RETURNHOME 0x02
#define LCD_ENTRYMODESET 0x04
#define LCD_DISPLAYCONTROL 0x08
#define LCD_CURSORSHIFT 0x10
#define LCD_FUNCTIONSET 0x20
#define LCD_SETCGRAMADDR 0x40
#define LCD_SETDDRAMADDR 0x80
#define LCD_5x8DOTS 0x00
#define LCD_5x10DOTS 0x04

class LiquidCrystal : public Print {
 public:
  LiquidCrystal(uint8_t rs, uint8_t en, uint8_t, uint8_t, uint8_t, uint8_t) : en_(en) { (void)rs; }
  LiquidCrystal(uint8_t rs, uint8_t, uint8_t en, uint8_t, uint8_t, uint8_t, uint8_t) : en_(en) { (void)rs; }
  LiquidCrystal(uint8_t rs, uint8_t en, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t)
      : en_(en) { (void)rs; }
  LiquidCrystal(uint8_t rs, uint8_t, uint8_t en, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t, uint8_t,
                uint8_t)
      : en_(en) { (void)rs; }

  void begin(uint8_t cols, uint8_t rows, uint8_t = LCD_5x8DOTS) {
    (void)cols;
    satir_ = rows;
    command(LCD_FUNCTIONSET | 0x08);
    kontrol_ = 0x04;
    command(LCD_DISPLAYCONTROL | kontrol_);
    clear();
    mod_ = 0x02;
    command(LCD_ENTRYMODESET | mod_);
  }
  void clear() { command(LCD_CLEARDISPLAY); delayMicroseconds(2000); }
  void home() { command(LCD_RETURNHOME); delayMicroseconds(2000); }
  void setRowOffsets(int a, int b, int c, int d) { ofset_[0] = a; ofset_[1] = b; ofset_[2] = c; ofset_[3] = d; }
  void setCursor(uint8_t col, uint8_t row) {
    if (row >= 4) row = 3;
    if (row >= satir_ && satir_ > 0) row = satir_ - 1;
    command(LCD_SETDDRAMADDR | (col + ofset_[row]));
  }
  void noDisplay() { kontrolYaz(kontrol_ & ~0x04); }
  void display() { kontrolYaz(kontrol_ | 0x04); }
  void noCursor() { kontrolYaz(kontrol_ & ~0x02); }
  void cursor() { kontrolYaz(kontrol_ | 0x02); }
  void noBlink() { kontrolYaz(kontrol_ & ~0x01); }
  void blink() { kontrolYaz(kontrol_ | 0x01); }
  void scrollDisplayLeft() { command(LCD_CURSORSHIFT | 0x08); }
  void scrollDisplayRight() { command(LCD_CURSORSHIFT | 0x08 | 0x04); }
  void leftToRight() { modYaz(mod_ | 0x02); }
  void rightToLeft() { modYaz(mod_ & ~0x02); }
  void autoscroll() { modYaz(mod_ | 0x01); }
  void noAutoscroll() { modYaz(mod_ & ~0x01); }
  void createChar(uint8_t yer, const uint8_t harita[]) {
    command(LCD_SETCGRAMADDR | ((yer & 7) << 3));
    for (int i = 0; i < 8; i++) write(harita[i]);
  }
  void createChar(uint8_t yer, const char harita[]) { createChar(yer, (const uint8_t *)harita); }
  void command(uint8_t v) { ky_lcd(en_, 0, v); }
  size_t write(uint8_t v) override {
    ky_lcd(en_, 1, v);
    return 1;
  }
  using Print::write;

 private:
  void kontrolYaz(uint8_t k) { kontrol_ = k; command(LCD_DISPLAYCONTROL | kontrol_); }
  void modYaz(uint8_t m) { mod_ = m; command(LCD_ENTRYMODESET | mod_); }
  uint8_t en_;
  uint8_t satir_ = 2;
  uint8_t kontrol_ = 0x04;
  uint8_t mod_ = 0x02;
  int ofset_[4] = {0x00, 0x40, 0x14, 0x54};
};
