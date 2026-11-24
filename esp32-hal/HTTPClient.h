// HTTPClient taklidi: istek yerel sunucunun vekili üzerinden gerçek internete gider.
// Güvenlik için yerel ağ adreslerine (localhost, 192.168.x.x gibi) istek gönderilmez.
#pragma once
#include "Arduino.h"
#include "WiFi.h"

#define HTTP_CODE_OK 200
#define HTTP_CODE_MOVED_PERMANENTLY 301
#define HTTP_CODE_FOUND 302
#define HTTP_CODE_BAD_REQUEST 400
#define HTTP_CODE_NOT_FOUND 404
#define HTTPC_ERROR_CONNECTION_REFUSED (-1)
#define HTTPC_ERROR_SEND_HEADER_FAILED (-2)
#define HTTPC_ERROR_NOT_CONNECTED (-4)
#define HTTPC_ERROR_READ_TIMEOUT (-11)

class HTTPClient {
 public:
  bool begin(const String &url) { adres = url; basliklar = ""; return true; }
  bool begin(WiFiClient &, const String &url) { return begin(url); }
  bool begin(const String &host, uint16_t port, const String &yol, bool https = false) {
    return begin(String(https ? "https://" : "http://") + host + ":" + String((unsigned int)port) + yol);
  }
  void end() {}
  void setTimeout(uint16_t) {}
  void setConnectTimeout(int32_t) {}
  void setFollowRedirects(int) {}
  void setUserAgent(const String &) {}
  void setAuthorization(const char *, const char *) {}
  void addHeader(const String &ad, const String &deger) { basliklar += ad + ": " + deger + "\r"; }
  int GET() { return sendRequest("GET"); }
  int POST(const String &govde) { return sendRequest("POST", govde); }
  int POST(uint8_t *govde, size_t n) { return sendRequest("POST", String(std::string((const char *)govde, n))); }
  int PUT(const String &govde) { return sendRequest("PUT", govde); }
  int PATCH(const String &govde) { return sendRequest("PATCH", govde); }
  int sendRequest(const char *yontem, const String &govde = String());
  String getString() { return yanit; }
  int getSize() { return (int)yanit.length(); }
  String errorToString(int kod) { return kod < 0 ? String("baglanti hatasi") : String(kod); }

 private:
  String adres;
  String basliklar;
  String yanit;
};
