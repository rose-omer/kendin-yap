// Kendin Yap ESP32 taklidi: Arduino.h fonksiyonlarının gövdeleri.
#include "Arduino.h"
#include "ky_host.h"

HardwareSerial Serial;
HardwareSerial Serial1;
HardwareSerial Serial2;

size_t HardwareSerial::write(uint8_t c) {
  char b = (char)c;
  ky_seri(&b, 1);
  return 1;
}
size_t HardwareSerial::write(const uint8_t *buf, size_t n) {
  ky_seri((const char *)buf, (int)n);
  return n;
}

long map(long x, long in_min, long in_max, long out_min, long out_max) {
  if (in_max == in_min) return out_min;
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

static unsigned long tohum = 1;
void randomSeed(unsigned long seed) { tohum = seed ? seed : 1; }
static unsigned long sonraki() {
  tohum = tohum * 1103515245UL + 12345UL + (unsigned long)ky_rastgele();
  return tohum >> 1;
}
long random(long howbig) { return howbig <= 0 ? 0 : (long)(sonraki() % (unsigned long)howbig); }
long random(long howsmall, long howbig) { return howsmall >= howbig ? howsmall : howsmall + random(howbig - howsmall); }

void pinMode(uint8_t pin, uint8_t mode) { ky_pin_modu(pin, mode); }
void digitalWrite(uint8_t pin, uint8_t val) { ky_yaz(pin, val ? 1 : 0); }
int digitalRead(uint8_t pin) { return ky_oku(pin); }

static uint8_t okumaCozunurlugu = 12;
void analogReadResolution(uint8_t bits) { okumaCozunurlugu = bits < 1 ? 1 : (bits > 16 ? 16 : bits); }
void analogSetAttenuation(int) {}
uint16_t analogRead(uint8_t pin) {
  int v = ky_analog_oku(pin);  // 0–4095
  if (okumaCozunurlugu == 12) return (uint16_t)v;
  return (uint16_t)((long)v * ((1L << okumaCozunurlugu) - 1) / 4095);
}
uint32_t analogReadMilliVolts(uint8_t pin) { return (uint32_t)ky_analog_oku(pin) * 3300 / 4095; }

// --- LEDC ---
static const int PIN_SAYISI = 40;
static int8_t kanalPini[16] = {-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1};
static uint8_t kanalCozunurluk[16] = {8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8};
static uint8_t pinCozunurluk[PIN_SAYISI];
static uint32_t pinGorev[PIN_SAYISI];
static uint8_t yazmaCozunurlugu = 8;

static int pinBul(uint8_t pinOrChannel, uint8_t *cozunurluk) {
  if (pinOrChannel < 16 && kanalPini[pinOrChannel] >= 0) {
    *cozunurluk = kanalCozunurluk[pinOrChannel];
    return kanalPini[pinOrChannel];
  }
  *cozunurluk = pinOrChannel < PIN_SAYISI && pinCozunurluk[pinOrChannel] ? pinCozunurluk[pinOrChannel] : 8;
  return pinOrChannel;
}

bool ledcAttach(uint8_t pin, uint32_t, uint8_t resolution) {
  if (pin < PIN_SAYISI) pinCozunurluk[pin] = resolution;
  ky_pin_modu(pin, OUTPUT);
  return true;
}
bool ledcAttachChannel(uint8_t pin, uint32_t freq, uint8_t resolution, uint8_t channel) {
  if (channel < 16) { kanalPini[channel] = pin; kanalCozunurluk[channel] = resolution; }
  return ledcAttach(pin, freq, resolution);
}
bool ledcDetach(uint8_t pin) { ky_pwm(pin, 0); return true; }
uint32_t ledcSetup(uint8_t channel, uint32_t freq, uint8_t resolution) {
  if (channel < 16) kanalCozunurluk[channel] = resolution;
  return freq;
}
void ledcAttachPin(uint8_t pin, uint8_t channel) {
  if (channel < 16) kanalPini[channel] = pin;
  ky_pin_modu(pin, OUTPUT);
}
void ledcDetachPin(uint8_t pin) { ky_pwm(pin, 0); }
bool ledcWrite(uint8_t pinOrChannel, uint32_t duty) {
  uint8_t c;
  int pin = pinBul(pinOrChannel, &c);
  if (pin < PIN_SAYISI) pinGorev[pin] = duty;
  ky_pwm(pin, (double)duty / (double)((1UL << c) - 1));
  return true;
}
uint32_t ledcRead(uint8_t pinOrChannel) {
  uint8_t c;
  int pin = pinBul(pinOrChannel, &c);
  return pin < PIN_SAYISI ? pinGorev[pin] : 0;
}
uint32_t ledcWriteTone(uint8_t pinOrChannel, uint32_t freq) {
  uint8_t c;
  ky_ton(pinBul(pinOrChannel, &c), freq, 0);
  return freq;
}
void analogWriteResolution(uint8_t bits) { yazmaCozunurlugu = bits; }
void analogWrite(uint8_t pin, int value) {
  ky_pin_modu(pin, OUTPUT);
  ky_pwm(pin, (double)value / (double)((1UL << yazmaCozunurlugu) - 1));
}

void tone(uint8_t pin, unsigned int frequency, unsigned long duration) { ky_ton(pin, frequency, (double)duration); }
void noTone(uint8_t pin) { ky_ton(pin, 0, 0); }

unsigned long pulseIn(uint8_t pin, uint8_t state, unsigned long timeout) {
  return (unsigned long)ky_darbe(pin, state ? 1 : 0, (double)timeout);
}
unsigned long pulseInLong(uint8_t pin, uint8_t state, unsigned long timeout) { return pulseIn(pin, state, timeout); }

unsigned long millis() { return (unsigned long)(ky_zaman_us() / 1000.0); }
unsigned long micros() { return (unsigned long)ky_zaman_us(); }
void delay(uint32_t ms) { ky_bekle((double)ms); }
void delayMicroseconds(uint32_t us) { ky_bekle(us / 1000.0); }
void yield() { ky_bekle(0); }

// --- Kesmeler: çalıştırıcı pini izler, kenar görünce ky_kesme(pin) çağırır ---
static voidFuncPtr kesmeler[PIN_SAYISI];
void attachInterrupt(uint8_t pin, voidFuncPtr handler, int mode) {
  if (pin >= PIN_SAYISI) return;
  kesmeler[pin] = handler;
  ky_kesme_izle(pin, mode);
}
void detachInterrupt(uint8_t pin) {
  if (pin >= PIN_SAYISI) return;
  kesmeler[pin] = nullptr;
  ky_kesme_izle(pin, 0);
}

extern "C" {
__attribute__((export_name("ky_kur"))) void ky_kur() { setup(); }
__attribute__((export_name("ky_dongu"))) void ky_dongu() { loop(); }
__attribute__((export_name("ky_kesme"))) void ky_kesme(int pin) {
  if (pin >= 0 && pin < PIN_SAYISI && kesmeler[pin]) kesmeler[pin]();
}
}
