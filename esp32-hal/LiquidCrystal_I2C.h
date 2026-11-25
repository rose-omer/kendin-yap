// LiquidCrystal_I2C taklidi: PCF8574 arka kartı Wire üzerinden sürer. Baytlar işçiden ana sayfaya
// gider, oradaki HD44780 taklidi ekrana çizer (src/simulasyon/cihazlar.js Pcf8574Lcd).
// Bit eşlemesi gerçek kütüphaneyle aynı: RS=bit0, RW=bit1, En=bit2, arka ışık=bit3, veri=bit4–7.
#pragma once
#include "Arduino.h"
#include "Print.h"
#include "Wire.h"

#define LCD_I2C_En 0x04
#define LCD_I2C_Rw 0x02
#define LCD_I2C_Rs 0x01
#define LCD_I2C_BACKLIGHT 0x08
#define LCD_5x8DOTS_I2C 0x00

class LiquidCrystal_I2C : public Print {
 public:
  LiquidCrystal_I2C(uint8_t adres, uint8_t sutun, uint8_t satir) : adres_(adres), sutun_(sutun), satir_(satir) {}

  void init() { begin(sutun_, satir_); }
  void begin(uint8_t sutun = 0, uint8_t satir = 0, uint8_t = LCD_5x8DOTS_I2C) {
    if (sutun) sutun_ = sutun;
    if (satir) satir_ = satir;
    Wire.begin();
    delay(50);
    // 4 bit init: 0x03 üç kez, sonra 0x02.
    nibbleYaz(0x03 << 4);
    delayMicroseconds(4500);
    nibbleYaz(0x03 << 4);
    delayMicroseconds(4500);
    nibbleYaz(0x03 << 4);
    delayMicroseconds(150);
    nibbleYaz(0x02 << 4);
    command(0x20 | 0x08); // function set: 4 bit, 2 satır
    kontrol_ = 0x04;
    command(0x08 | kontrol_);
    clear();
    mod_ = 0x02;
    command(0x04 | mod_);
    home();
  }
  void clear() { command(0x01); delayMicroseconds(2000); }
  void home() { command(0x02); delayMicroseconds(2000); }
  void setCursor(uint8_t col, uint8_t row) {
    static const int OFS[] = {0x00, 0x40, 0x14, 0x54};
    if (row >= satir_ && satir_) row = satir_ - 1;
    command(0x80 | (col + OFS[row & 3]));
  }
  void noDisplay() { kontrolYaz(kontrol_ & ~0x04); }
  void display() { kontrolYaz(kontrol_ | 0x04); }
  void noCursor() { kontrolYaz(kontrol_ & ~0x02); }
  void cursor() { kontrolYaz(kontrol_ | 0x02); }
  void noBlink() { kontrolYaz(kontrol_ & ~0x01); }
  void blink() { kontrolYaz(kontrol_ | 0x01); }
  void scrollDisplayLeft() { command(0x10 | 0x08); }
  void scrollDisplayRight() { command(0x10 | 0x08 | 0x04); }
  void leftToRight() { modYaz(mod_ | 0x02); }
  void rightToLeft() { modYaz(mod_ & ~0x02); }
  void autoscroll() { modYaz(mod_ | 0x01); }
  void noAutoscroll() { modYaz(mod_ & ~0x01); }
  void noBacklight() { isik_ = 0; expanderYaz(0); }
  void backlight() { isik_ = LCD_I2C_BACKLIGHT; expanderYaz(0); }
  void setBacklight(uint8_t v) { v ? backlight() : noBacklight(); }
  bool getBacklight() { return isik_ != 0; }
  void createChar(uint8_t yer, const uint8_t harita[]) {
    command(0x40 | ((yer & 7) << 3));
    for (int i = 0; i < 8; i++) write(harita[i]);
  }
  void createChar(uint8_t yer, const char harita[]) { createChar(yer, (const uint8_t *)harita); }
  void command(uint8_t v) { gonder(v, 0); }
  size_t write(uint8_t v) override {
    gonder(v, LCD_I2C_Rs);
    return 1;
  }
  using Print::write;
  // Eski adlar
  void printstr(const char *s) { print(s); }
  void blink_on() { blink(); }
  void blink_off() { noBlink(); }
  void cursor_on() { cursor(); }
  void cursor_off() { noCursor(); }
  void setBacklightPin(uint8_t, uint8_t) {}

 private:
  void kontrolYaz(uint8_t k) { kontrol_ = k; command(0x08 | kontrol_); }
  void modYaz(uint8_t m) { mod_ = m; command(0x04 | mod_); }
  void gonder(uint8_t v, uint8_t mod) {
    nibbleYaz((v & 0xf0) | mod);
    nibbleYaz(((v << 4) & 0xf0) | mod);
  }
  void nibbleYaz(uint8_t v) {
    expanderYaz(v);
    expanderYaz(v | LCD_I2C_En);
    delayMicroseconds(1);
    expanderYaz(v & ~LCD_I2C_En);
    delayMicroseconds(50);
  }
  void expanderYaz(uint8_t v) {
    Wire.beginTransmission(adres_);
    Wire.write((uint8_t)(v | isik_));
    Wire.endTransmission();
  }
  uint8_t adres_;
  uint8_t sutun_;
  uint8_t satir_;
  uint8_t isik_ = LCD_I2C_BACKLIGHT;
  uint8_t kontrol_ = 0x04;
  uint8_t mod_ = 0x02;
};
