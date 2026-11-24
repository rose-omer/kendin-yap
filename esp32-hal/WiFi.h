// Sanal Wi-Fi: her ağ adına ~1,5 saniyede bağlanır. Web sunucusu simülasyon panelindeki
// mini tarayıcıdan, HTTPClient gerçek internetten (yerel sunucu üzerinden) çalışır.
#pragma once
#include "Arduino.h"
#include "IPAddress.h"
#include "WiFiClient.h"

typedef enum {
  WL_NO_SHIELD = 255,
  WL_IDLE_STATUS = 0,
  WL_NO_SSID_AVAIL = 1,
  WL_SCAN_COMPLETED = 2,
  WL_CONNECTED = 3,
  WL_CONNECT_FAILED = 4,
  WL_CONNECTION_LOST = 5,
  WL_DISCONNECTED = 6
} wl_status_t;

typedef enum { WIFI_OFF = 0, WIFI_STA = 1, WIFI_AP = 2, WIFI_AP_STA = 3 } wifi_mode_t;
#define WIFI_MODE_STA WIFI_STA
#define WIFI_MODE_AP WIFI_AP

class WiFiClass {
 public:
  bool mode(wifi_mode_t m) { kip = m; return true; }
  wifi_mode_t getMode() const { return kip; }
  wl_status_t begin(const char *ssid, const char *parola = nullptr, int32_t = 0, const uint8_t * = nullptr, bool = true);
  wl_status_t begin(const String &ssid, const String &parola) { return begin(ssid.c_str(), parola.c_str()); }
  wl_status_t status();
  bool isConnected() { return status() == WL_CONNECTED; }
  bool disconnect(bool = false, bool = false);
  bool reconnect() { return true; }
  bool setAutoReconnect(bool) { return true; }
  bool setHostname(const char *) { return true; }
  bool config(IPAddress, IPAddress = IPAddress(), IPAddress = IPAddress(), IPAddress = IPAddress(), IPAddress = IPAddress()) { return true; }
  IPAddress localIP();
  IPAddress gatewayIP() { return IPAddress(192, 168, 1, 1); }
  IPAddress subnetMask() { return IPAddress(255, 255, 255, 0); }
  IPAddress dnsIP(uint8_t = 0) { return IPAddress(192, 168, 1, 1); }
  String SSID() const { return agAdi; }
  int32_t RSSI() { return status() == WL_CONNECTED ? -48 : 0; }
  String macAddress() const { return String("24:6F:28:4B:59:10"); }
  bool softAP(const char *ssid, const char *parola = nullptr, int = 1, int = 0, int = 4);
  IPAddress softAPIP() { return IPAddress(192, 168, 4, 1); }
  bool softAPdisconnect(bool = false) { return true; }
  int16_t scanNetworks(bool = false, bool = false) { return 2; }
  String SSID(uint8_t i) const { return i == 0 ? String("KendinYap-WiFi") : String("Komsu-Ag"); }
  int32_t RSSI(uint8_t i) const { return i == 0 ? -45 : -78; }
  void scanDelete() {}

 private:
  wifi_mode_t kip = WIFI_STA;
  String agAdi;
};

extern WiFiClass WiFi;
