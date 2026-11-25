// Adafruit Unified Sensor türleri (yalnız ölçüm olayları için gerekenler).
#pragma once
#include <stdint.h>

#define SENSORS_GRAVITY_EARTH (9.80665F)
#define SENSORS_GRAVITY_STANDARD (SENSORS_GRAVITY_EARTH)
#define SENSORS_DPS_TO_RADS (0.017453293F)
#define SENSORS_RADS_TO_DPS (57.29577793F)

typedef struct {
  union {
    float v[3];
    struct {
      float x;
      float y;
      float z;
    };
  };
  int8_t status;
  uint8_t reserved[3];
} sensors_vec_t;

typedef struct {
  int32_t version;
  int32_t sensor_id;
  int32_t type;
  int32_t reserved0;
  int32_t timestamp;
  union {
    float data[4];
    sensors_vec_t acceleration;
    sensors_vec_t gyro;
    float temperature;
  };
} sensors_event_t;

typedef struct {
  char name[12];
  int32_t version;
  int32_t sensor_id;
  int32_t type;
  float max_value;
  float min_value;
  float resolution;
  int32_t min_delay;
} sensor_t;
