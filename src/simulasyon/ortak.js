// Uno ve ESP32 simülasyonlarının ortak parçaları.

export class Birlesim {
  constructor() { this.ata = new Map(); }
  bul(x) {
    if (!this.ata.has(x)) this.ata.set(x, x);
    let k = x;
    while (this.ata.get(k) !== k) k = this.ata.get(k);
    this.ata.set(x, k);
    return k;
  }
  birlestir(a, b) { this.ata.set(this.bul(a), this.bul(b)); }
}

// Elle ayarlanan sensörler: panelde kaydırıcı ya da düğme olur. Bir parçanın birden çok ayarı olabilir.
export const KONTROLLER = {
  'wokwi-hc-sr04': [{ tur: 'kaydirici', etiket: 'Mesafe', birim: 'cm', min: 2, max: 400, ilk: 100 }],
  'wokwi-photoresistor-sensor': [{ tur: 'kaydirici', etiket: 'Işık', birim: '%', min: 0, max: 100, ilk: 50 }],
  'wokwi-ntc-temperature-sensor': [{ tur: 'kaydirici', etiket: 'Sıcaklık', birim: '°C', min: -20, max: 80, ilk: 25 }],
  'wokwi-pir-motion-sensor': [{ tur: 'dugme', etiket: 'Hareket et (3 sn)' }],
  'wokwi-dht22': [
    { alan: 'sicaklik', tur: 'kaydirici', etiket: 'Sıcaklık', birim: '°C', min: -20, max: 60, ilk: 24 },
    { alan: 'nem', tur: 'kaydirici', etiket: 'Nem', birim: '%', min: 0, max: 100, ilk: 45 },
  ],
  'ky-modul:toprak': [{ tur: 'kaydirici', etiket: 'Toprak nemi', birim: '%', min: 0, max: 100, ilk: 20 }],
  'ky-modul:kapi': [{ tur: 'anahtar', etiket: 'Kapı açık', ilk: 0 }],
};

// Toprak nem sensörü bir ky-modul; başlığından tanınır.
export function kontrolTuru(p) {
  if (p.type === 'ky-modul' && /toprak/i.test(p.attrs?.baslik || '')) return 'ky-modul:toprak';
  if (p.type === 'ky-modul' && /kapı|kapi|reed/i.test(p.attrs?.baslik || '')) return 'ky-modul:kapi';
  return p.type;
}

export function kontrolListesi(proje, destekli, adBul) {
  return proje.parts
    .filter((p) => KONTROLLER[kontrolTuru(p)] && destekli(p))
    .flatMap((p) => KONTROLLER[kontrolTuru(p)].map((k) => ({ ...k, id: p.id, anahtar: k.alan ? `${p.id}:${k.alan}` : p.id, ad: adBul(p) })));
}

// Buzzer sesi: her parça için bir osilatör.
export function sesYoneticisi(sessiz = false) {
  let ses = null;
  const sesler = {};
  return {
    cal(id, frekans) {
      if (sessiz) return;
      try {
        ses ||= new AudioContext();
        if (!sesler[id]) {
          const osc = ses.createOscillator();
          const kazanc = ses.createGain();
          osc.type = 'square';
          kazanc.gain.value = 0;
          osc.connect(kazanc).connect(ses.destination);
          osc.start();
          sesler[id] = { osc, kazanc };
        }
        const s = sesler[id];
        if (frekans) s.osc.frequency.setTargetAtTime(frekans, ses.currentTime, 0.005);
        s.kazanc.gain.setTargetAtTime(frekans ? 0.05 : 0, ses.currentTime, 0.005);
      } catch {
        // Ses açılamazsa simülasyon sessiz sürer.
      }
    },
    kapat() {
      try { ses?.close(); } catch { /* kapalı */ }
    },
  };
}

// OLED (SSD1306) komut listesini parçanın ekranına çizer. Komut biçimi: esp32-hal/Adafruit_GFX.h
let tuval = null;
export function oledCiz(el, komutlar) {
  if (!el?.imageData) return;
  const w = el.imageData.width;
  const h = el.imageData.height;
  tuval ||= new OffscreenCanvas(w, h);
  const c = tuval.getContext('2d', { willReadFrequently: true });
  c.fillStyle = '#000';
  c.fillRect(0, 0, w, h);
  let ters = false;
  const renk = (r) => (Number(r) === 0 ? '#000' : '#fff');
  for (const satir of komutlar.split('\n')) {
    const [k, ...a] = satir.split(' ');
    const s = a.map(Number);
    if (k === 'C') { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); }
    if (k === 'P') { c.fillStyle = renk(s[2]); c.fillRect(s[0], s[1], 1, 1); }
    if (k === 'F') { c.fillStyle = renk(s[4]); c.fillRect(s[0], s[1], s[2], s[3]); }
    if (k === 'R') { c.strokeStyle = renk(s[4]); c.lineWidth = 1; c.strokeRect(s[0] + 0.5, s[1] + 0.5, s[2] - 1, s[3] - 1); }
    if (k === 'L') { c.strokeStyle = renk(s[4]); c.lineWidth = 1; c.beginPath(); c.moveTo(s[0] + 0.5, s[1] + 0.5); c.lineTo(s[2] + 0.5, s[3] + 0.5); c.stroke(); }
    if (k === 'O' || k === 'Q') {
      c.beginPath();
      c.arc(s[0] + 0.5, s[1] + 0.5, s[2], 0, Math.PI * 2);
      if (k === 'Q') { c.fillStyle = renk(s[3]); c.fill(); } else { c.strokeStyle = renk(s[3]); c.stroke(); }
    }
    if (k === 'T') {
      const [x, y, boyut, r, kod] = s;
      c.fillStyle = renk(r);
      c.font = `${8 * boyut}px monospace`;
      c.textBaseline = 'top';
      c.fillText(String.fromCharCode(kod), x, y, 6 * boyut);
    }
    if (k === 'I') ters = s[0] === 1;
  }
  const veri = c.getImageData(0, 0, w, h);
  // Keskin piksel görünümü: griyi siyah ya da beyaza yuvarla.
  for (let i = 0; i < veri.data.length; i += 4) {
    let v = veri.data[i] > 100 ? 255 : 0;
    if (ters) v = 255 - v;
    veri.data[i] = v;
    veri.data[i + 1] = v;
    veri.data[i + 2] = v;
    veri.data[i + 3] = 255;
  }
  el.imageData.data.set(veri.data);
  el.redraw?.();
}

export function oledTemizle(el) {
  if (!el?.imageData) return;
  el.imageData.data.fill(0);
  el.redraw?.();
}
