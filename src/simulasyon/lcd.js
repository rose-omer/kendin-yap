// LCD 16x2 ve tuş takımı: Uno ve ESP32 simülasyonlarının ortak parçaları.
import { fontA00 } from '@wokwi/elements';

const SATIR_UZUNLUGU = 40; // HD44780 her satırda 40 karakter saklar; ekranda 16'sı görünür.

// HD44780 denetleyicisinin taklidi. Komut ve veri baytlarını işler, ekran görüntüsünü verir.
export class Hd44780 {
  constructor(sutun = 16, satir = 2) {
    this.sutun = sutun;
    this.satir = satir;
    this.ddram = new Uint8Array(SATIR_UZUNLUGU * 2).fill(32);
    this.cgram = new Uint8Array(64);
    this.ac = 0; // adres sayacı: satır * 40 + sütun (DDRAM) ya da 0–63 (CGRAM)
    this.cg = false;
    this.artis = 1;
    this.kaydir = false;
    this.acik = false;
    this.imlec = false;
    this.yanip = false;
    this.ofset = 0;
    this.dortBit = false;
    this.yarim = null;
    this.degisti = true;
    this.fontDegisti = false;
  }

  // E ucunun düşen kenarı. bayt: D7..D0. 4 bit bağlantıda yalnız D7..D4 anlamlıdır.
  darbe(rs, bayt) {
    if (!this.dortBit) return this.yaz(rs, bayt);
    if (this.yarim == null) {
      this.yarim = bayt >> 4;
      return;
    }
    const tam = (this.yarim << 4) | (bayt >> 4);
    this.yarim = null;
    this.yaz(rs, tam);
  }

  yaz(rs, b) {
    this.degisti = true;
    if (rs) this.veri(b);
    else this.komut(b);
  }

  adim(yon) {
    const s = Math.floor(this.ac / SATIR_UZUNLUGU);
    const k = this.ac % SATIR_UZUNLUGU + yon;
    if (k >= SATIR_UZUNLUGU) this.ac = ((s + 1) % 2) * SATIR_UZUNLUGU;
    else if (k < 0) this.ac = ((s + 1) % 2) * SATIR_UZUNLUGU + SATIR_UZUNLUGU - 1;
    else this.ac = s * SATIR_UZUNLUGU + k;
  }

  veri(b) {
    if (this.cg) {
      this.cgram[this.ac & 63] = b & 0x1f;
      this.ac = (this.ac + this.artis) & 63;
      this.fontDegisti = true;
      return;
    }
    this.ddram[this.ac] = b;
    this.adim(this.artis);
    if (this.kaydir) this.ofset += this.artis;
  }

  komut(b) {
    if (b & 0x80) {
      const adres = b & 0x7f;
      this.cg = false;
      this.ac = (adres >= 0x40 ? SATIR_UZUNLUGU : 0) + ((adres & 0x3f) % SATIR_UZUNLUGU);
    } else if (b & 0x40) {
      this.cg = true;
      this.ac = b & 0x3f;
    } else if (b & 0x20) {
      this.dortBit = !(b & 0x10);
      this.yarim = null;
    } else if (b & 0x10) {
      const yon = b & 0x04 ? 1 : -1;
      if (b & 0x08) this.ofset -= yon;
      else this.adim(yon);
    } else if (b & 0x08) {
      this.acik = !!(b & 0x04);
      this.imlec = !!(b & 0x02);
      this.yanip = !!(b & 0x01);
    } else if (b & 0x04) {
      this.artis = b & 0x02 ? 1 : -1;
      this.kaydir = !!(b & 0x01);
    } else if (b & 0x02) {
      this.ac = 0;
      this.ofset = 0;
      this.cg = false;
    } else if (b & 0x01) {
      this.ddram.fill(32);
      this.ac = 0;
      this.ofset = 0;
      this.artis = 1;
      this.cg = false;
    }
  }

  // Wokwi LCD öğesine çiz. guc: VDD beslenmiş mi; isik: arka ışık yanıyor mu.
  ciz(el, guc, isik) {
    if (!el) return;
    const durum = `${guc}|${isik}`;
    if (!this.degisti && !this.fontDegisti && this.sonDurum === durum) return;
    this.sonDurum = durum;
    const gorunur = guc && this.acik;
    const karakterler = new Uint8Array(this.sutun * this.satir).fill(32);
    if (gorunur) {
      for (let s = 0; s < this.satir; s++) {
        for (let k = 0; k < this.sutun; k++) {
          const yer = (((k + this.ofset) % SATIR_UZUNLUGU) + SATIR_UZUNLUGU) % SATIR_UZUNLUGU;
          karakterler[s * this.sutun + k] = this.ddram[(s % 2) * SATIR_UZUNLUGU + yer];
        }
      }
    }
    if (this.fontDegisti) {
      // CGRAM'de 4. bit en soldaki noktadır; Wokwi yazı tipinde 0. bit. Bitleri ters çevir.
      const font = new Uint8Array(fontA00);
      for (let i = 0; i < 64; i++) {
        let ters = 0;
        for (let px = 0; px < 5; px++) if (this.cgram[i] & (1 << (4 - px))) ters |= 1 << px;
        font[i] = ters;
        font[64 + i] = ters; // 8–15 kodları 0–7'nin kopyasıdır
      }
      el.font = font;
      this.fontDegisti = false;
    }
    el.characters = karakterler;
    el.backlight = !!(guc && isik);
    const sutunYeri = this.ac % SATIR_UZUNLUGU;
    el.cursorX = ((((sutunYeri - this.ofset) % SATIR_UZUNLUGU) + SATIR_UZUNLUGU) % SATIR_UZUNLUGU);
    el.cursorY = Math.floor(this.ac / SATIR_UZUNLUGU);
    el.cursor = gorunur && this.imlec && !this.cg;
    el.blink = gorunur && this.yanip && !this.cg;
    this.degisti = false;
  }
}

export function lcdTemizle(el) {
  if (!el) return;
  el.characters = new Uint8Array(32).fill(32);
  el.backlight = true;
  el.cursor = false;
  el.blink = false;
  el.font = fontA00;
}

// Tuş takımında basılı tuşlar: her biri bir satır ve bir sütun ucunu kısa devre eder.
// Wokwi öğesi tuş adlarını tutar; sıra "123A456B789C*0#D" düzenindedir.
export function basiliTuslar(p, el) {
  const ciftler = [];
  if (!el?.pressedKeys || !el.keys) return ciftler;
  for (const tus of el.pressedKeys) {
    const i = el.keys.indexOf(tus);
    if (i < 0) continue;
    ciftler.push([`${p.id}:R${Math.floor(i / 4) + 1}`, `${p.id}:C${(i % 4) + 1}`]);
  }
  return ciftler;
}

export const TUS_UCLARI = ['R1', 'R2', 'R3', 'R4', 'C1', 'C2', 'C3', 'C4'];
