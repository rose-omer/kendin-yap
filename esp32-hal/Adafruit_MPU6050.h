// Adafruit MPU6050 taklidi: yazmaçlar Wire üzerinden işçideki MPU6050 taklidine gider
// (src/simulasyon/cihazlar.js). Değerler simülasyon panelindeki eğim ve dönme kaydırıcılarından gelir.
#pragma once
#include "Adafruit_Sensor.h"
#include "Arduino.h"
#include "Wire.h"

#define MPU6050_I2CADDR_DEFAULT 0x68
#define MPU6050_DEVICE_ID 0x68

typedef enum { MPU6050_RANGE_2_G = 0, MPU6050_RANGE_4_G, MPU6050_RANGE_8_G, MPU6050_RANGE_16_G } mpu6050_accel_range_t;
typedef enum { MPU6050_RANGE_250_DEG = 0, MPU6050_RANGE_500_DEG, MPU6050_RANGE_1000_DEG, MPU6050_RANGE_2000_DEG } mpu6050_gyro_range_t;
typedef enum {
  MPU6050_BAND_260_HZ = 0, MPU6050_BAND_184_HZ, MPU6050_BAND_94_HZ, MPU6050_BAND_44_HZ,
  MPU6050_BAND_21_HZ, MPU6050_BAND_10_HZ, MPU6050_BAND_5_HZ
} mpu6050_bandwidth_t;
typedef enum { MPU6050_HIGHPASS_DISABLE = 0, MPU6050_HIGHPASS_5_HZ, MPU6050_HIGHPASS_2_5_HZ, MPU6050_HIGHPASS_1_25_HZ, MPU6050_HIGHPASS_0_63_HZ, MPU6050_HIGHPASS_UNUSED, MPU6050_HIGHPASS_HOLD } mpu6050_highpass_t;
typedef enum { MPU6050_CYCLE_1_25_HZ = 0, MPU6050_CYCLE_5_HZ, MPU6050_CYCLE_20_HZ, MPU6050_CYCLE_40_HZ } mpu6050_cycle_rate_t;

class Adafruit_MPU6050 {
 public:
  bool begin(uint8_t adres = MPU6050_I2CADDR_DEFAULT, TwoWire *w = &Wire, int32_t = 0) {
    adres_ = adres;
    w_ = w;
    w_->begin();
    if (oku(0x75) != MPU6050_DEVICE_ID) return false;
    yaz(0x6b, 0x80);
    delay(100);
    yaz(0x6b, 0x01);
    setFilterBandwidth(MPU6050_BAND_260_HZ);
    setGyroRange(MPU6050_RANGE_500_DEG);
    setAccelerometerRange(MPU6050_RANGE_2_G);
    return true;
  }
  void setAccelerometerRange(mpu6050_accel_range_t r) { yaz(0x1c, r << 3); }
  mpu6050_accel_range_t getAccelerometerRange() { return (mpu6050_accel_range_t)((oku(0x1c) >> 3) & 3); }
  void setGyroRange(mpu6050_gyro_range_t r) { yaz(0x1b, r << 3); }
  mpu6050_gyro_range_t getGyroRange() { return (mpu6050_gyro_range_t)((oku(0x1b) >> 3) & 3); }
  void setFilterBandwidth(mpu6050_bandwidth_t b) { yaz(0x1a, b); }
  mpu6050_bandwidth_t getFilterBandwidth() { return (mpu6050_bandwidth_t)(oku(0x1a) & 7); }
  void setSampleRateDivisor(uint8_t b) { yaz(0x19, b); }
  uint8_t getSampleRateDivisor() { return oku(0x19); }
  void setHighPassFilter(mpu6050_highpass_t) {}
  void setMotionInterrupt(bool) {}
  void setMotionDetectionThreshold(uint8_t) {}
  void setMotionDetectionDuration(uint8_t) {}
  void setInterruptPinLatch(bool) {}
  void setInterruptPinPolarity(bool) {}
  bool getMotionInterruptStatus() { return false; }
  bool enableSleep(bool) { return true; }
  bool enableCycle(bool) { return true; }
  void setCycleRate(mpu6050_cycle_rate_t) {}
  void reset() { yaz(0x6b, 0x80); }

  bool getEvent(sensors_event_t *ivme, sensors_event_t *donme, sensors_event_t *sicaklik) {
    w_->beginTransmission(adres_);
    w_->write((uint8_t)0x3b);
    if (w_->endTransmission(false) != 0) return false;
    if (w_->requestFrom(adres_, (uint8_t)14) != 14) return false;
    int16_t h[7];
    for (int i = 0; i < 7; i++) {
      int y = w_->read();
      h[i] = (int16_t)((y << 8) | w_->read());
    }
    float ivmeLsb = 16384.0f / (1 << getAccelerometerRange());
    float donmeLsb = 131.0f / (1 << getGyroRange());
    olay(ivme, 1);
    ivme->acceleration.x = h[0] / ivmeLsb * SENSORS_GRAVITY_STANDARD;
    ivme->acceleration.y = h[1] / ivmeLsb * SENSORS_GRAVITY_STANDARD;
    ivme->acceleration.z = h[2] / ivmeLsb * SENSORS_GRAVITY_STANDARD;
    olay(sicaklik, 13);
    sicaklik->temperature = h[3] / 340.0f + 36.53f;
    olay(donme, 4);
    donme->gyro.x = h[4] / donmeLsb * SENSORS_DPS_TO_RADS;
    donme->gyro.y = h[5] / donmeLsb * SENSORS_DPS_TO_RADS;
    donme->gyro.z = h[6] / donmeLsb * SENSORS_DPS_TO_RADS;
    return true;
  }

 private:
  static void olay(sensors_event_t *e, int32_t tur) {
    memset(e, 0, sizeof *e);
    e->version = sizeof *e;
    e->type = tur;
    e->timestamp = millis();
  }
  uint8_t oku(uint8_t y) {
    w_->beginTransmission(adres_);
    w_->write(y);
    w_->endTransmission(false);
    w_->requestFrom(adres_, (uint8_t)1);
    return (uint8_t)w_->read();
  }
  void yaz(uint8_t y, uint8_t v) {
    w_->beginTransmission(adres_);
    w_->write(y);
    w_->write(v);
    w_->endTransmission();
  }
  uint8_t adres_ = MPU6050_I2CADDR_DEFAULT;
  TwoWire *w_ = &Wire;
};
