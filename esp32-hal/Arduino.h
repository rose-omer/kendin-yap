// Kendin Yap ESP32 taklidi: Arduino-ESP32 API'sinin hobi projelerinde kullanılan bölümü.
// Kod WebAssembly'ye derlenir; pinler ve zaman tarayıcıdaki çalıştırıcıdan gelir.
// Bu dosya Espressif'in kodundan kopyalanmadı; API imzaları belgelere göre yazıldı.
#pragma once

#include <math.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>

typedef uint8_t byte;
typedef bool boolean;
typedef unsigned int word;

#define HIGH 0x1
#define LOW 0x0
#define INPUT 0x01
#define OUTPUT 0x03
#define PULLUP 0x04
#define INPUT_PULLUP 0x05
#define PULLDOWN 0x08
#define INPUT_PULLDOWN 0x09
#define OPEN_DRAIN 0x10
#define OUTPUT_OPEN_DRAIN 0x13

#define RISING 0x01
#define FALLING 0x02
#define CHANGE 0x03
#define ONLOW 0x04
#define ONHIGH 0x05

#define DEC 10
#define HEX 16
#define OCT 8
#define BIN 2

#define LED_BUILTIN 2
#define BUILTIN_LED 2

// ESP32 DevKit analog adları.
static const uint8_t A0 = 36;
static const uint8_t A3 = 39;
static const uint8_t A4 = 32;
static const uint8_t A5 = 33;
static const uint8_t A6 = 34;
static const uint8_t A7 = 35;
static const uint8_t A10 = 4;
static const uint8_t A11 = 0;
static const uint8_t A12 = 2;
static const uint8_t A13 = 15;
static const uint8_t A14 = 13;
static const uint8_t A15 = 12;
static const uint8_t A16 = 14;
static const uint8_t A17 = 27;
static const uint8_t A18 = 25;
static const uint8_t A19 = 26;
static const uint8_t SDA = 21;
static const uint8_t SCL = 22;
static const uint8_t SS = 5;
static const uint8_t MOSI = 23;
static const uint8_t MISO = 19;
static const uint8_t SCK = 18;
static const uint8_t TX = 1;
static const uint8_t RX = 3;

#define PI 3.1415926535897932384626433832795
#define HALF_PI 1.5707963267948966192313216916398
#define TWO_PI 6.283185307179586476925286766559
#define DEG_TO_RAD 0.017453292519943295769236907684886
#define RAD_TO_DEG 57.295779513082320876798154814105

#define radians(deg) ((deg) * DEG_TO_RAD)
#define degrees(rad) ((rad) * RAD_TO_DEG)
#define sq(x) ((x) * (x))
#define lowByte(w) ((uint8_t)((w) & 0xff))
#define highByte(w) ((uint8_t)((w) >> 8))
#define bitRead(value, bit) (((value) >> (bit)) & 0x01)
#define bitSet(value, bit) ((value) |= (1UL << (bit)))
#define bitClear(value, bit) ((value) &= ~(1UL << (bit)))
#define bitWrite(value, bit, bitvalue) ((bitvalue) ? bitSet(value, bit) : bitClear(value, bit))
#define bit(b) (1UL << (b))
#define F(s) (s)
#define PROGMEM
#define IRAM_ATTR
#define pgm_read_byte(addr) (*(const uint8_t *)(addr))

template <class T, class L, class H>
inline auto constrain(T x, L a, H b) -> decltype(x + a + b) {
  return x < a ? a : (x > b ? b : x);
}
template <class A, class B>
inline auto min(A a, B b) -> decltype(a + b) { return a < b ? a : b; }
template <class A, class B>
inline auto max(A a, B b) -> decltype(a + b) { return a > b ? a : b; }

long map(long x, long in_min, long in_max, long out_min, long out_max);
long random(long howbig);
long random(long howsmall, long howbig);
void randomSeed(unsigned long seed);

void pinMode(uint8_t pin, uint8_t mode);
void digitalWrite(uint8_t pin, uint8_t val);
int digitalRead(uint8_t pin);
uint16_t analogRead(uint8_t pin);
uint32_t analogReadMilliVolts(uint8_t pin);
void analogReadResolution(uint8_t bits);
void analogSetAttenuation(int);
void analogWrite(uint8_t pin, int value);
void analogWriteResolution(uint8_t bits);

// LEDC (PWM). Hem 3.x (pin ile) hem 2.x (kanal ile) API'si.
bool ledcAttach(uint8_t pin, uint32_t freq, uint8_t resolution);
bool ledcAttachChannel(uint8_t pin, uint32_t freq, uint8_t resolution, uint8_t channel);
bool ledcDetach(uint8_t pin);
uint32_t ledcSetup(uint8_t channel, uint32_t freq, uint8_t resolution);
void ledcAttachPin(uint8_t pin, uint8_t channel);
void ledcDetachPin(uint8_t pin);
bool ledcWrite(uint8_t pinOrChannel, uint32_t duty);
uint32_t ledcWriteTone(uint8_t pinOrChannel, uint32_t freq);
uint32_t ledcRead(uint8_t pinOrChannel);

void tone(uint8_t pin, unsigned int frequency, unsigned long duration = 0);
void noTone(uint8_t pin);

unsigned long pulseIn(uint8_t pin, uint8_t state, unsigned long timeout = 1000000L);
unsigned long pulseInLong(uint8_t pin, uint8_t state, unsigned long timeout = 1000000L);

unsigned long millis();
unsigned long micros();
void delay(uint32_t ms);
void delayMicroseconds(uint32_t us);
void yield();

typedef void (*voidFuncPtr)(void);
void attachInterrupt(uint8_t pin, voidFuncPtr handler, int mode);
void detachInterrupt(uint8_t pin);
#define digitalPinToInterrupt(p) (p)
#define interrupts()
#define noInterrupts()

#include "WString.h"
#include "Print.h"
#include "HardwareSerial.h"

// Saat: Wi-Fi bağlıyken gerçek tarih ve saat döner.
#include <time.h>
void configTime(long gmtOffset_sec, int daylightOffset_sec, const char *server1, const char *server2 = nullptr, const char *server3 = nullptr);
bool getLocalTime(struct tm *info, uint32_t ms = 5000);

void setup();
void loop();
