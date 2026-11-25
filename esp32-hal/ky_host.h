// Tarayıcıdaki çalıştırıcının (src/simulasyon/esp32-isci.js) verdiği fonksiyonlar.
// Her biri WebAssembly "env" modülünden içe aktarılır.
#pragma once
#include <stdint.h>

#define KY_ICE(ad) __attribute__((import_module("env"), import_name(#ad)))

extern "C" {
KY_ICE(ky_pin_modu) void ky_pin_modu(int pin, int mod);
KY_ICE(ky_yaz) void ky_yaz(int pin, int deger);
KY_ICE(ky_oku) int ky_oku(int pin);
KY_ICE(ky_analog_oku) int ky_analog_oku(int pin);
KY_ICE(ky_pwm) void ky_pwm(int pin, double oran);
KY_ICE(ky_ton) void ky_ton(int pin, double frekans, double sure_ms);
KY_ICE(ky_servo) void ky_servo(int pin, double aci);
KY_ICE(ky_seri) void ky_seri(const char *metin, int uzunluk);
KY_ICE(ky_bekle) void ky_bekle(double ms);
KY_ICE(ky_zaman_us) double ky_zaman_us();
KY_ICE(ky_darbe) double ky_darbe(int pin, int seviye, double zaman_asimi_us);
KY_ICE(ky_dht) double ky_dht(int pin, int tur);
KY_ICE(ky_ekran) void ky_ekran(const char *komutlar, int uzunluk);
KY_ICE(ky_lcd) void ky_lcd(int e_pini, int rs, int bayt);
// I2C veri yolu (cihazlar işçide: src/simulasyon/cihazlar.js). Yazma: 0 onay, 2 cihaz yok.
KY_ICE(ky_i2c_yaz) int ky_i2c_yaz(int adres, const uint8_t *veri, int n);
KY_ICE(ky_i2c_oku) int ky_i2c_oku(int adres, uint8_t *hedef, int n);
// Parça ölçümleri ve sinyalleri
KY_ICE(ky_hx711) double ky_hx711(int dout_pini);
KY_ICE(ky_neopiksel) void ky_neopiksel(int pin, const uint8_t *grb, int n);
KY_ICE(ky_ir_al) int ky_ir_al();
KY_ICE(ky_kesme_izle) void ky_kesme_izle(int pin, int mod);
KY_ICE(ky_rastgele) int ky_rastgele();
// Ağ
KY_ICE(ky_wifi_baglan) void ky_wifi_baglan(const char *ssid, int uzunluk, int ap);
KY_ICE(ky_wifi_durum) int ky_wifi_durum();
KY_ICE(ky_wifi_kes) void ky_wifi_kes();
KY_ICE(ky_wifi_ip) unsigned int ky_wifi_ip();
KY_ICE(ky_web_basla) void ky_web_basla(int port);
KY_ICE(ky_web_istek) int ky_web_istek();
KY_ICE(ky_web_yanit) void ky_web_yanit(int kod, const char *tur, int tur_n, const char *govde, int govde_n, const char *basliklar, int basliklar_n);
KY_ICE(ky_http) int ky_http(const char *istek, int uzunluk);
KY_ICE(ky_al_uzunluk) int ky_al_uzunluk();
KY_ICE(ky_al_kopyala) void ky_al_kopyala(char *hedef, int uzunluk);
KY_ICE(ky_saat_ofset) void ky_saat_ofset(int saniye);
// Akışlar (0: Serial, 1: Bluetooth seri)
KY_ICE(ky_akis_say) int ky_akis_say(int kanal);
KY_ICE(ky_akis_oku) int ky_akis_oku(int kanal);
KY_ICE(ky_akis_bak) int ky_akis_bak(int kanal);
// MQTT
KY_ICE(ky_mqtt_baglan) int ky_mqtt_baglan(const char *sunucu, int sn, int port, const char *kimlik, int kn);
KY_ICE(ky_mqtt_kes) void ky_mqtt_kes();
KY_ICE(ky_mqtt_abone) void ky_mqtt_abone(const char *konu, int n, int abone);
KY_ICE(ky_mqtt_yayinla) void ky_mqtt_yayinla(const char *konu, int kn, const char *veri, int vn, int kalici);
KY_ICE(ky_mqtt_al) int ky_mqtt_al();
// Bluetooth seri
KY_ICE(ky_bt_basla) void ky_bt_basla(const char *ad, int n);
KY_ICE(ky_bt_yaz) void ky_bt_yaz(const char *veri, int n);
KY_ICE(ky_bt_bagli) int ky_bt_bagli();
// BLE
KY_ICE(ky_ble_basla) void ky_ble_basla(const char *ad, int n);
KY_ICE(ky_ble_ozellik) void ky_ble_ozellik(int no, const char *uuid, int un, const char *servis, int sn, int ozellikler);
KY_ICE(ky_ble_deger) void ky_ble_deger(int no, const char *veri, int n);
KY_ICE(ky_ble_bildir) void ky_ble_bildir(int no);
KY_ICE(ky_ble_yayin) void ky_ble_yayin(int acik);
}
