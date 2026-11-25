// IRremote taklidi (4.x ve eski 2.x arayüzü). Simülasyon panelindeki kumandada basılan tuş
// NEC kodu olarak gelir (adres 0x00). Yeni: IrReceiver.decode() / decodedIRData; eski: irrecv.decode(&results).
#pragma once
#include "Arduino.h"
#include "ky_host.h"

typedef enum {
  UNKNOWN = 0, PULSE_WIDTH, PULSE_DISTANCE, APPLE, DENON, JVC, LG, LG2, NEC, NEC2, ONKYO, PANASONIC,
  KASEIKYO, KASEIKYO_DENON, KASEIKYO_SHARP, KASEIKYO_JVC, KASEIKYO_MITSUBISHI, RC5, RC6, SAMSUNG,
  SAMSUNGLG, SAMSUNG48, SHARP, SONY, BANG_OLUFSEN, BOSEWAVE, LEGO_PF, MAGIQUEST, WHYNTER, FAST
} decode_type_t;

#define IRDATA_FLAGS_EMPTY 0x00
#define IRDATA_FLAGS_IS_REPEAT 0x01
#define IRDATA_FLAGS_IS_AUTO_REPEAT 0x02
#define IRDATA_FLAGS_PARITY_FAILED 0x04
#define ENABLE_LED_FEEDBACK true
#define DISABLE_LED_FEEDBACK false
#define USE_DEFAULT_FEEDBACK_LED_PIN 0

struct IRData {
  decode_type_t protocol = UNKNOWN;
  uint16_t address = 0;
  uint16_t command = 0;
  uint16_t extra = 0;
  uint16_t numberOfBits = 0;
  uint8_t flags = 0;
  uint32_t decodedRawData = 0;
};

struct decode_results {
  decode_type_t decode_type = UNKNOWN;
  uint16_t address = 0;
  uint32_t value = 0;
  uint16_t bits = 0;
  uint16_t command = 0;
};

inline const char *getProtocolString(decode_type_t p) { return p == NEC ? "NEC" : "UNKNOWN"; }

class IRrecv {
 public:
  IRrecv() {}
  explicit IRrecv(uint_fast8_t pin) : pin_(pin) {}
  IRrecv(uint_fast8_t pin, uint_fast8_t) : pin_(pin) {}
  void begin(uint_fast8_t pin, bool = false, uint_fast8_t = 0) {
    pin_ = pin;
    pinMode(pin, INPUT);
  }
  void start() {}
  void enableIRIn() {}
  void stop() {}
  void disableIRIn() {}
  void blink13(bool) {}
  bool isIdle() { return true; }
  bool available() { return decode(); }
  bool decode() {
    if (hazir_) return true;
    int k = ky_ir_al();
    if (k < 0) return false;
    uint8_t adres = 0;
    uint8_t komut = (uint8_t)k;
    decodedIRData.protocol = NEC;
    decodedIRData.address = adres;
    decodedIRData.command = komut;
    decodedIRData.numberOfBits = 32;
    decodedIRData.flags = IRDATA_FLAGS_EMPTY;
    decodedIRData.decodedRawData = ((uint32_t)(uint8_t)~komut << 24) | ((uint32_t)komut << 16) | ((uint32_t)(uint8_t)~adres << 8) | adres;
    hazir_ = true;
    return true;
  }
  bool decode(decode_results *r) {
    if (!decode()) return false;
    uint32_t ham = decodedIRData.decodedRawData;
    uint32_t ters = 0;
    for (int i = 0; i < 32; i++) if (ham & (1UL << i)) ters |= 1UL << (31 - i);
    r->decode_type = NEC;
    r->address = decodedIRData.address;
    r->command = decodedIRData.command;
    r->value = ters;
    r->bits = 32;
    return true;
  }
  void resume() { hazir_ = false; }
  void printIRResultShort(Print *p, bool = true) {
    p->print("Protocol=");
    p->print(getProtocolString(decodedIRData.protocol));
    p->print(" Address=0x");
    p->print(decodedIRData.address, HEX);
    p->print(" Command=0x");
    p->print(decodedIRData.command, HEX);
    p->print(" Raw-Data=0x");
    p->print((unsigned long)decodedIRData.decodedRawData, HEX);
    p->println(" 32 bits LSB first");
  }
  void printIRResultMinimal(Print *p) { printIRResultShort(p); }
  void printIRSendUsage(Print *) {}

  IRData decodedIRData;

 private:
  uint_fast8_t pin_ = 0;
  bool hazir_ = false;
};

inline IRrecv IrReceiver;
