// Wi-Fi, WebServer ve HTTPClient taklitlerinin gövdeleri.
#include <time.h>
#include "HTTPClient.h"
#include "WebServer.h"
#include "WiFi.h"
#include "ky_host.h"

WiFiClass WiFi;

// Çalıştırıcının "al" tamponundaki veriyi String olarak getir.
static String al() {
  int n = ky_al_uzunluk();
  std::string s(n, '\0');
  if (n) ky_al_kopyala(&s[0], n);
  return String(s);
}

wl_status_t WiFiClass::begin(const char *ssid, const char *, int32_t, const uint8_t *, bool) {
  agAdi = ssid ? ssid : "";
  ky_wifi_baglan(agAdi.c_str(), (int)agAdi.length(), 0);
  return status();
}
wl_status_t WiFiClass::status() { return (wl_status_t)ky_wifi_durum(); }
bool WiFiClass::disconnect(bool, bool) { ky_wifi_kes(); return true; }
IPAddress WiFiClass::localIP() { return status() == WL_CONNECTED ? IPAddress(ky_wifi_ip()) : IPAddress(); }
bool WiFiClass::softAP(const char *ssid, const char *, int, int, int) {
  agAdi = ssid ? ssid : "";
  kip = WIFI_AP;
  ky_wifi_baglan(agAdi.c_str(), (int)agAdi.length(), 1);
  return true;
}

// --- WebServer ---
static String yuzdeCoz(const String &s) {
  std::string r;
  for (size_t i = 0; i < s.s.size(); i++) {
    char c = s.s[i];
    if (c == '+') r += ' ';
    else if (c == '%' && i + 2 < s.s.size()) {
      r += (char)strtol(s.s.substr(i + 1, 2).c_str(), nullptr, 16);
      i += 2;
    } else r += c;
  }
  return String(r);
}

void WebServer::begin(uint16_t port) {
  port_ = port;
  ky_web_basla(port);
}

void WebServer::handleClient() {
  if (!ky_web_istek()) return;
  // Biçim: YÖNTEM \n YOL \n SORGU \n GÖVDE
  String ham = al();
  int a = ham.indexOf('\n');
  int b = ham.indexOf('\n', a + 1);
  int c = ham.indexOf('\n', b + 1);
  String yontem = ham.substring(0, a);
  yol_ = ham.substring(a + 1, b);
  String sorgu = ham.substring(b + 1, c);
  String govde = c >= 0 ? ham.substring(c + 1) : String();
  yontem_ = yontem == "POST" ? HTTP_POST : yontem == "PUT" ? HTTP_PUT : yontem == "DELETE" ? HTTP_DELETE : HTTP_GET;
  argumanlar.clear();
  String hepsi = sorgu;
  if (yontem_ == HTTP_POST && govde.length()) {
    if (hepsi.length()) hepsi += "&";
    hepsi += govde;
  }
  int bas = 0;
  while (bas < (int)hepsi.length()) {
    int son = hepsi.indexOf('&', bas);
    if (son < 0) son = hepsi.length();
    String parca = hepsi.substring(bas, son);
    int esit = parca.indexOf('=');
    if (parca.length()) {
      argumanlar.push_back(esit < 0 ? std::make_pair(yuzdeCoz(parca), String())
                                    : std::make_pair(yuzdeCoz(parca.substring(0, esit)), yuzdeCoz(parca.substring(esit + 1))));
    }
    bas = son + 1;
  }
  if (yontem_ == HTTP_POST) argumanlar.push_back({String("plain"), govde});
  basliklar = "";
  ekGovde = "";
  yanitlandi = false;
  for (auto &y : yollar) {
    if (y.yol == yol_ && (y.yontem == HTTP_ANY || y.yontem == yontem_)) {
      y.f();
      if (!yanitlandi) send(200, "text/plain", ekGovde);
      return;
    }
  }
  if (bulunamadi) {
    bulunamadi();
    if (!yanitlandi) send(404, "text/plain", "Bulunamadi");
  } else {
    send(404, "text/plain", "Bulunamadi");
  }
}

void WebServer::send(int kod, const char *tur, const String &govde) {
  String tamam = govde + ekGovde;
  ky_web_yanit(kod, tur, (int)strlen(tur), tamam.c_str(), (int)tamam.length(), basliklar.c_str(), (int)basliklar.length());
  yanitlandi = true;
}

String WebServer::arg(const String &ad) const {
  for (auto &a : argumanlar) if (a.first == ad) return a.second;
  return String();
}
bool WebServer::hasArg(const String &ad) const {
  for (auto &a : argumanlar) if (a.first == ad) return true;
  return false;
}

// --- HTTPClient ---
int HTTPClient::sendRequest(const char *yontem, const String &govde) {
  if (WiFi.status() != WL_CONNECTED) return HTTPC_ERROR_NOT_CONNECTED;
  String istek = String(yontem) + "\n" + adres + "\n" + basliklar + "\n" + govde;
  int kod = ky_http(istek.c_str(), (int)istek.length());
  yanit = al();
  return kod;
}

// --- Saat (NTP yerine bilgisayarın saati) ---
static long saatOfseti = 0;
void configTime(long gmtOffset_sec, int daylightOffset_sec, const char *, const char *, const char *) {
  saatOfseti = gmtOffset_sec + daylightOffset_sec;
  ky_saat_ofset((int)saatOfseti);
}
bool getLocalTime(struct tm *info, uint32_t) {
  if (WiFi.status() != WL_CONNECTED) return false;
  time_t simdi = time(nullptr) + saatOfseti;
  gmtime_r(&simdi, info);
  return true;
}
