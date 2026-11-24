// ESP32 BLE Arduino kütüphanesinin taklidi (sunucu tarafı). Simülasyon panelindeki
// "telefon" cihaza bağlanır, özellikleri okur, yazar ve bildirimleri görür.
#pragma once
#include <string>
#include <vector>
#include "Arduino.h"

class BLEServer;
class BLECharacteristic;

class BLEUUID {
 public:
  BLEUUID() {}
  BLEUUID(const char *s) : deger(s ? s : "") {}
  BLEUUID(const String &s) : deger(s) {}
  std::string toString() const { return deger.s; }
  String deger;
};

class BLEServerCallbacks {
 public:
  virtual ~BLEServerCallbacks() {}
  virtual void onConnect(BLEServer *) {}
  virtual void onDisconnect(BLEServer *) {}
};

class BLECharacteristicCallbacks {
 public:
  virtual ~BLECharacteristicCallbacks() {}
  virtual void onRead(BLECharacteristic *) {}
  virtual void onWrite(BLECharacteristic *) {}
};

class BLEDescriptor {
 public:
  BLEDescriptor() {}
  explicit BLEDescriptor(const char *) {}
  explicit BLEDescriptor(BLEUUID) {}
  virtual ~BLEDescriptor() {}
  void setValue(const char *) {}
};

class BLE2902 : public BLEDescriptor {
 public:
  void setNotifications(bool) {}
  void setIndications(bool) {}
};

class BLECharacteristic {
 public:
  static const uint32_t PROPERTY_READ = 1 << 0;
  static const uint32_t PROPERTY_WRITE = 1 << 1;
  static const uint32_t PROPERTY_NOTIFY = 1 << 2;
  static const uint32_t PROPERTY_BROADCAST = 1 << 3;
  static const uint32_t PROPERTY_INDICATE = 1 << 4;
  static const uint32_t PROPERTY_WRITE_NR = 1 << 5;

  BLECharacteristic(const char *uuid, uint32_t ozellikler, const String &servis);
  void setCallbacks(BLECharacteristicCallbacks *g) { geri = g; }
  void addDescriptor(BLEDescriptor *) {}
  void setValue(const String &v) { deger = v; bildirDeger(); }
  void setValue(const std::string &v) { deger = String(v); bildirDeger(); }
  void setValue(const char *v) { deger = String(v); bildirDeger(); }
  void setValue(uint8_t *v, size_t n) { deger = String(std::string((const char *)v, n)); bildirDeger(); }
  void setValue(int v) { deger = String(v); bildirDeger(); }
  void setValue(uint32_t v) { deger = String((unsigned long)v); bildirDeger(); }
  void setValue(float v) { deger = String(v, 2); bildirDeger(); }
  void setValue(double v) { deger = String(v, 2); bildirDeger(); }
  String getValue() const { return deger; }
  uint8_t *getData() { return (uint8_t *)deger.s.data(); }
  size_t getLength() const { return deger.length(); }
  BLEUUID getUUID() const { return BLEUUID(uuid); }
  void notify(bool = true);
  void indicate() { notify(); }

  // Çalıştırıcıdan gelen olaylar
  int no;
  String uuid;
  String deger;
  BLECharacteristicCallbacks *geri = nullptr;

 private:
  void bildirDeger();
};

class BLEService {
 public:
  BLEService(const char *uuid) : uuid_(uuid ? uuid : "") {}
  BLECharacteristic *createCharacteristic(const char *uuid, uint32_t ozellikler);
  BLECharacteristic *createCharacteristic(BLEUUID uuid, uint32_t ozellikler) { return createCharacteristic(uuid.deger.c_str(), ozellikler); }
  void start() {}
  void stop() {}
  BLEUUID getUUID() const { return BLEUUID(uuid_); }

 private:
  String uuid_;
};

class BLEAdvertising {
 public:
  void addServiceUUID(const char *) {}
  void addServiceUUID(BLEUUID) {}
  void setScanResponse(bool) {}
  void setMinPreferred(uint16_t) {}
  void setMaxPreferred(uint16_t) {}
  void setAppearance(uint16_t) {}
  void start();
  void stop();
};

class BLEServer {
 public:
  BLEService *createService(const char *uuid) { return new BLEService(uuid); }
  BLEService *createService(BLEUUID uuid) { return new BLEService(uuid.deger.c_str()); }
  void setCallbacks(BLEServerCallbacks *g) { geri = g; }
  BLEAdvertising *getAdvertising();
  void startAdvertising();
  uint32_t getConnectedCount() const { return bagli ? 1 : 0; }
  void disconnect(uint16_t) {}
  BLEServerCallbacks *geri = nullptr;
  bool bagli = false;
};

class BLEDevice {
 public:
  static void init(const String &ad);
  static BLEServer *createServer();
  static BLEAdvertising *getAdvertising();
  static void startAdvertising();
  static void stopAdvertising();
  static void setPower(int) {}
  static void setMTU(uint16_t) {}
  static String getAddress() { return String("24:6F:28:4B:59:12"); }
  static void deinit(bool = false) {}
};

typedef BLEDevice BLEDeviceClass;
