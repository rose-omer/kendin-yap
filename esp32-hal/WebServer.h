// ESP32 WebServer taklidi: istekler simülasyon panelindeki mini tarayıcıdan gelir.
#pragma once
#include <functional>
#include <vector>
#include "Arduino.h"
#include "WiFi.h"

typedef enum { HTTP_ANY = 0, HTTP_GET = 1, HTTP_POST = 2, HTTP_PUT = 3, HTTP_DELETE = 4, HTTP_PATCH = 5, HTTP_HEAD = 6, HTTP_OPTIONS = 7 } HTTPMethod;

class WebServer {
 public:
  typedef std::function<void(void)> THandlerFunction;
  explicit WebServer(int port = 80) : port_(port) {}
  void begin() { begin(port_); }
  void begin(uint16_t port);
  void close() {}
  void stop() {}
  void handleClient();
  void on(const String &yol, THandlerFunction f) { on(yol, HTTP_ANY, f); }
  void on(const String &yol, HTTPMethod m, THandlerFunction f) { yollar.push_back({yol, m, f}); }
  void onNotFound(THandlerFunction f) { bulunamadi = f; }
  void send(int kod, const char *tur = "text/plain", const String &govde = String());
  void send(int kod, const String &tur, const String &govde) { send(kod, tur.c_str(), govde); }
  void send_P(int kod, const char *tur, const char *govde) { send(kod, tur, String(govde)); }
  void sendHeader(const String &ad, const String &deger, bool = false) { basliklar += ad + ": " + deger + "\n"; }
  void setContentLength(size_t) {}
  void sendContent(const String &s) { ekGovde += s; }
  String arg(const String &ad) const;
  String arg(int i) const { return i >= 0 && i < (int)argumanlar.size() ? argumanlar[i].second : String(); }
  String argName(int i) const { return i >= 0 && i < (int)argumanlar.size() ? argumanlar[i].first : String(); }
  int args() const { return (int)argumanlar.size(); }
  bool hasArg(const String &ad) const;
  String uri() const { return yol_; }
  HTTPMethod method() const { return yontem_; }
  String header(const String &) const { return String(); }
  bool hasHeader(const String &) const { return false; }
  WiFiClient client() { return WiFiClient(); }

 private:
  struct Yol { String yol; HTTPMethod yontem; THandlerFunction f; };
  int port_;
  std::vector<Yol> yollar;
  THandlerFunction bulunamadi;
  std::vector<std::pair<String, String>> argumanlar;
  String yol_;
  HTTPMethod yontem_ = HTTP_GET;
  String basliklar;
  String ekGovde;
  bool yanitlandi = false;
};
