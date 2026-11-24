// MQTT, Bluetooth seri ve BLE taklitlerinin gövdeleri.
#include "BLEDevice.h"
#include "BluetoothSerial.h"
#include "PubSubClient.h"
#include "ky_host.h"

static String alVeri() {
  int n = ky_al_uzunluk();
  std::string s(n, '\0');
  if (n) ky_al_kopyala(&s[0], n);
  return String(s);
}

// --- MQTT ---
bool PubSubClient::connect(const char *kimlik) {
  if (WiFi.status() != WL_CONNECTED) { bagli = false; return false; }
  String k = kimlik ? kimlik : "";
  bagli = ky_mqtt_baglan(sunucu_.c_str(), (int)sunucu_.length(), port_, k.c_str(), (int)k.length()) != 0;
  return bagli;
}
void PubSubClient::disconnect() {
  bagli = false;
  ky_mqtt_kes();
}
bool PubSubClient::publish(const char *konu, const uint8_t *veri, unsigned int n, bool kalici) {
  if (!bagli || !konu) return false;
  ky_mqtt_yayinla(konu, (int)strlen(konu), (const char *)veri, (int)n, kalici ? 1 : 0);
  return true;
}
bool PubSubClient::subscribe(const char *konu, uint8_t) {
  if (!bagli || !konu) return false;
  ky_mqtt_abone(konu, (int)strlen(konu), 1);
  return true;
}
bool PubSubClient::unsubscribe(const char *konu) {
  if (!bagli || !konu) return false;
  ky_mqtt_abone(konu, (int)strlen(konu), 0);
  return true;
}
bool PubSubClient::loop() {
  if (!bagli) return false;
  // Bekleyen her mesaj: "konu\x1fveri"
  while (ky_mqtt_al()) {
    String m = alVeri();
    int ayrac = m.indexOf('\x1f');
    String konu = m.substring(0, ayrac);
    String veri = m.substring(ayrac + 1);
    if (geri) {
      std::string k = konu.s;
      std::string v = veri.s;
      geri(&k[0], (uint8_t *)v.data(), (unsigned int)v.size());
    }
  }
  return true;
}

// --- BLE ---
static std::vector<BLECharacteristic *> ozellikler;
static BLEServer *sunucu = nullptr;
static BLEAdvertising yayin;

BLECharacteristic::BLECharacteristic(const char *u, uint32_t oz, const String &servis) : uuid(u ? u : "") {
  no = (int)ozellikler.size();
  ozellikler.push_back(this);
  ky_ble_ozellik(no, uuid.c_str(), (int)uuid.length(), servis.c_str(), (int)servis.length(), (int)oz);
}
void BLECharacteristic::bildirDeger() { ky_ble_deger(no, deger.c_str(), (int)deger.length()); }
void BLECharacteristic::notify(bool) { ky_ble_bildir(no); }

BLECharacteristic *BLEService::createCharacteristic(const char *u, uint32_t oz) { return new BLECharacteristic(u, oz, uuid_); }

void BLEAdvertising::start() { ky_ble_yayin(1); }
void BLEAdvertising::stop() { ky_ble_yayin(0); }
BLEAdvertising *BLEServer::getAdvertising() { return &yayin; }
void BLEServer::startAdvertising() { yayin.start(); }

void BLEDevice::init(const String &ad) { ky_ble_basla(ad.c_str(), (int)ad.length()); }
BLEServer *BLEDevice::createServer() {
  if (!sunucu) sunucu = new BLEServer();
  return sunucu;
}
BLEAdvertising *BLEDevice::getAdvertising() { return &yayin; }
void BLEDevice::startAdvertising() { yayin.start(); }
void BLEDevice::stopAdvertising() { yayin.stop(); }

// Çalıştırıcı panelden gelen BLE olaylarını buradan iletir.
// tur 1: telefon bağlandı, 2: ayrıldı, 3: özelliğe yazdı (değer "al" tamponunda), 4: okudu
extern "C" __attribute__((export_name("ky_ble_olay"))) void ky_ble_olay(int tur, int no) {
  if (tur == 1 || tur == 2) {
    if (!sunucu) return;
    sunucu->bagli = tur == 1;
    if (sunucu->geri) {
      if (tur == 1) sunucu->geri->onConnect(sunucu);
      else sunucu->geri->onDisconnect(sunucu);
    }
    return;
  }
  if (no < 0 || no >= (int)ozellikler.size()) return;
  BLECharacteristic *o = ozellikler[no];
  if (tur == 3) {
    o->deger = alVeri();
    if (o->geri) o->geri->onWrite(o);
  } else if (tur == 4 && o->geri) {
    o->geri->onRead(o);
  }
}
