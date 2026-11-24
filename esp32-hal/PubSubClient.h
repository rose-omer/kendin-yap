// PubSubClient (MQTT) taklidi: simülasyondaki sanal MQTT sunucusuna bağlanır.
// Panelden gönderilen mesajlar loop() çağrılınca geri çağırma fonksiyonuna gelir.
#pragma once
#include <functional>
#include "Arduino.h"
#include "WiFi.h"

#define MQTT_CONNECTED 0
#define MQTT_DISCONNECTED -1
#define MQTT_CONNECT_FAILED -2
#define MQTT_MAX_PACKET_SIZE 256

class PubSubClient {
 public:
  typedef std::function<void(char *, uint8_t *, unsigned int)> Geri;
  PubSubClient() {}
  explicit PubSubClient(WiFiClient &) {}
  PubSubClient(const char *sunucu, uint16_t port, WiFiClient &) { setServer(sunucu, port); }
  PubSubClient &setServer(const char *sunucu, uint16_t port) { sunucu_ = sunucu ? sunucu : ""; port_ = port; return *this; }
  PubSubClient &setServer(IPAddress ip, uint16_t port) { sunucu_ = ip.toString(); port_ = port; return *this; }
  PubSubClient &setCallback(Geri g) { geri = g; return *this; }
  PubSubClient &setClient(WiFiClient &) { return *this; }
  PubSubClient &setKeepAlive(uint16_t) { return *this; }
  PubSubClient &setSocketTimeout(uint16_t) { return *this; }
  bool setBufferSize(uint16_t) { return true; }
  bool connect(const char *kimlik);
  bool connect(const char *kimlik, const char *, const char *) { return connect(kimlik); }
  bool connect(const char *kimlik, const char *, const char *, const char *, uint8_t, bool, const char *, bool = true) { return connect(kimlik); }
  void disconnect();
  bool connected() const { return bagli; }
  int state() const { return bagli ? MQTT_CONNECTED : MQTT_DISCONNECTED; }
  bool publish(const char *konu, const char *veri) { return publish(konu, (const uint8_t *)veri, veri ? strlen(veri) : 0, false); }
  bool publish(const char *konu, const char *veri, bool kalici) { return publish(konu, (const uint8_t *)veri, veri ? strlen(veri) : 0, kalici); }
  bool publish(const char *konu, const uint8_t *veri, unsigned int n) { return publish(konu, veri, n, false); }
  bool publish(const char *konu, const uint8_t *veri, unsigned int n, bool kalici);
  bool subscribe(const char *konu, uint8_t = 0);
  bool unsubscribe(const char *konu);
  bool loop();

 private:
  String sunucu_;
  uint16_t port_ = 1883;
  bool bagli = false;
  Geri geri;
};
