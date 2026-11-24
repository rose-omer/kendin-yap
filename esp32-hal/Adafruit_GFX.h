// Adafruit GFX taklidi: çizimler komut listesine yazılır; tarayıcı listeyi ekrana çizer.
// Komutlar satır satır: "C" temizle, "P x y r" nokta, "L x0 y0 x1 y1 r" çizgi, "R x y w h r" çerçeve,
// "F x y w h r" dolu dikdörtgen, "O x y yr r" daire, "Q x y yr r" dolu daire, "T x y boyut r k" karakter (k: kod), "I 0/1" ters.
#pragma once
#include "Arduino.h"

class Adafruit_GFX : public Print {
 public:
  Adafruit_GFX(int16_t w, int16_t h) : genislik(w), yukseklik(h) {}

  virtual void drawPixel(int16_t x, int16_t y, uint16_t renk) { ekle("P %d %d %u", x, y, renk); }
  void drawLine(int16_t x0, int16_t y0, int16_t x1, int16_t y1, uint16_t r) { ekle("L %d %d %d %d %u", x0, y0, x1, y1, r); }
  void drawFastHLine(int16_t x, int16_t y, int16_t w, uint16_t r) { drawLine(x, y, x + w - 1, y, r); }
  void drawFastVLine(int16_t x, int16_t y, int16_t h, uint16_t r) { drawLine(x, y, x, y + h - 1, r); }
  void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t r) { ekle("R %d %d %d %d %u", x, y, w, h, r); }
  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t r) { ekle("F %d %d %d %d %u", x, y, w, h, r); }
  void fillScreen(uint16_t r) { fillRect(0, 0, genislik, yukseklik, r); }
  void drawCircle(int16_t x, int16_t y, int16_t yr, uint16_t r) { ekle("O %d %d %d %u", x, y, yr, r); }
  void fillCircle(int16_t x, int16_t y, int16_t yr, uint16_t r) { ekle("Q %d %d %d %u", x, y, yr, r); }
  void drawRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t, uint16_t r) { drawRect(x, y, w, h, r); }
  void fillRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t, uint16_t r) { fillRect(x, y, w, h, r); }
  void drawTriangle(int16_t x0, int16_t y0, int16_t x1, int16_t y1, int16_t x2, int16_t y2, uint16_t r) {
    drawLine(x0, y0, x1, y1, r);
    drawLine(x1, y1, x2, y2, r);
    drawLine(x2, y2, x0, y0, r);
  }

  void setCursor(int16_t x, int16_t y) { imlecX = x; imlecY = y; }
  int16_t getCursorX() const { return imlecX; }
  int16_t getCursorY() const { return imlecY; }
  void setTextSize(uint8_t s) { boyut = s ? s : 1; }
  void setTextSize(uint8_t sx, uint8_t) { setTextSize(sx); }
  void setTextColor(uint16_t r) { yaziRengi = r; }
  void setTextColor(uint16_t r, uint16_t) { yaziRengi = r; }
  void setTextWrap(bool w) { sar = w; }
  void cp437(bool = true) {}
  void setRotation(uint8_t) {}
  void setFont(const void * = nullptr) {}
  int16_t width() const { return genislik; }
  int16_t height() const { return yukseklik; }
  void getTextBounds(const char *s, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h) {
    *x1 = x;
    *y1 = y;
    *w = (uint16_t)(strlen(s) * 6 * boyut);
    *h = (uint16_t)(8 * boyut);
  }
  void getTextBounds(const String &s, int16_t x, int16_t y, int16_t *x1, int16_t *y1, uint16_t *w, uint16_t *h) {
    getTextBounds(s.c_str(), x, y, x1, y1, w, h);
  }

  size_t write(uint8_t c) override {
    if (c == '\n') { imlecX = 0; imlecY += 8 * boyut; return 1; }
    if (c == '\r') return 1;
    if (sar && imlecX + 6 * boyut > genislik) { imlecX = 0; imlecY += 8 * boyut; }
    ekle("T %d %d %d %u %u", imlecX, imlecY, boyut, yaziRengi, (unsigned)c);
    imlecX += 6 * boyut;
    return 1;
  }
  using Print::write;

 protected:
  std::string komutlar;
  int16_t genislik, yukseklik;
  int16_t imlecX = 0, imlecY = 0;
  uint8_t boyut = 1;
  uint16_t yaziRengi = 1;
  bool sar = true;

  void ekle(const char *fmt, ...) __attribute__((format(printf, 2, 3))) {
    char b[96];
    va_list a;
    va_start(a, fmt);
    vsnprintf(b, sizeof b, fmt, a);
    va_end(a);
    komutlar += b;
    komutlar += '\n';
    if (komutlar.size() > 200000) komutlar.erase(0, komutlar.find('\n', 100000) + 1);  // taşmayı önle
  }
};
