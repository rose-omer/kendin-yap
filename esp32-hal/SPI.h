#pragma once
#include "Arduino.h"
class SPIClass { public: void begin(int8_t = -1, int8_t = -1, int8_t = -1, int8_t = -1) {} void end() {} uint8_t transfer(uint8_t) { return 0; } };
extern SPIClass SPI;
