// ATmega328P (Arduino Uno / Nano) makinesi: avr8js üzerine ince katman.
import {
  AVRADC, AVRIOPort, AVRTimer, AVRUSART, CPU, PinState, adcConfig, avrInstruction,
  portBConfig, portCConfig, portDConfig, timer0Config, timer1Config, timer2Config, usart0Config,
} from 'avr8js';

export const FREKANS = 16e6;
export { PinState };

// Intel HEX → program belleği (32 KB flash).
export function hexOku(hex) {
  const program = new Uint16Array(0x4000);
  const bayt = new Uint8Array(program.buffer);
  let taban = 0;
  for (const satir of hex.split(/\r?\n/)) {
    if (!satir.startsWith(':')) continue;
    const uzunluk = parseInt(satir.slice(1, 3), 16);
    const adres = parseInt(satir.slice(3, 7), 16);
    const tur = parseInt(satir.slice(7, 9), 16);
    if (tur === 0) {
      for (let i = 0; i < uzunluk; i++) bayt[taban + adres + i] = parseInt(satir.slice(9 + i * 2, 11 + i * 2), 16);
    } else if (tur === 2) {
      taban = parseInt(satir.slice(9, 13), 16) << 4;
    } else if (tur === 4) {
      taban = parseInt(satir.slice(9, 13), 16) << 16;
    }
  }
  return program;
}

// Uno/Nano pin adı → port ve bit. "12.2" gibi kopya pinler aynı pine gider.
export function unoPin(ad) {
  const kok = ad.split('.')[0];
  if (/^\d+$/.test(kok)) {
    const n = Number(kok);
    if (n < 8) return { port: 'D', bit: n };
    if (n < 14) return { port: 'B', bit: n - 8 };
    return null;
  }
  const a = /^A(\d)$/.exec(kok);
  if (a && Number(a[1]) < 6) return { port: 'C', bit: Number(a[1]), adc: Number(a[1]) };
  if (a) return { adc: Number(a[1]) }; // A6, A7 (Nano): yalnız analog
  return null;
}

export class AvrMakine {
  constructor(hex) {
    this.cpu = new CPU(hexOku(hex));
    this.zamanlayicilar = [timer0Config, timer1Config, timer2Config].map((c) => new AVRTimer(this.cpu, c));
    this.port = {
      B: new AVRIOPort(this.cpu, portBConfig),
      C: new AVRIOPort(this.cpu, portCConfig),
      D: new AVRIOPort(this.cpu, portDConfig),
    };
    this.seri = new AVRUSART(this.cpu, usart0Config, FREKANS);
    this.adc = new AVRADC(this.cpu, adcConfig);
  }

  get zamanSn() {
    return this.cpu.cycles / FREKANS;
  }

  calistir(dongu) {
    const { cpu } = this;
    const hedef = cpu.cycles + dongu;
    while (cpu.cycles < hedef) {
      avrInstruction(cpu);
      cpu.tick();
    }
  }
}
