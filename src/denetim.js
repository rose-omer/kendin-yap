// Bağlantı denetimi. Saf JS: tarayıcıda ve Node'da (scripts/denetle.mjs) aynı kod koşar.
import { KARTLAR, PARCALAR, parcaBilgi, parcaOlcu, parcaAdi, pinGND } from './veri/katalog.js';

export function ucCoz(uc) {
  const i = uc.indexOf(':');
  return i < 0 ? { id: uc, pin: '' } : { id: uc.slice(0, i), pin: uc.slice(i + 1) };
}

function volt(v) {
  return `${String(v).replace('.', ',')} V`;
}

// Hatları (net) birleşim-bul ile kurar. Aynı kartın GND.1/GND.2 gibi pinleri içeride bağlıdır.
export function hatlariKur(proje, pinVeri) {
  const ata = new Map();
  const bul = (x) => {
    if (!ata.has(x)) ata.set(x, x);
    let k = x;
    while (ata.get(k) !== k) k = ata.get(k);
    ata.set(x, k);
    return k;
  };
  const birlestir = (a, b) => ata.set(bul(a), bul(b));

  const parcalar = new Map(proje.parts.map((p) => [p.id, p]));
  for (const p of proje.parts) {
    if (!KARTLAR[p.type]) continue;
    const olcu = parcaOlcu(p, pinVeri);
    const gruplar = {};
    for (const pin of olcu?.pins || []) {
      const kok = pin.name.split('.')[0];
      (gruplar[kok] ||= []).push(`${p.id}:${pin.name}`);
    }
    for (const uyeler of Object.values(gruplar)) uyeler.slice(1).forEach((u) => birlestir(uyeler[0], u));
  }
  proje.connections.forEach(([a, b]) => birlestir(a, b));

  const hatlar = new Map();
  const ekle = (uc, baglanti) => {
    const kok = bul(uc);
    if (!hatlar.has(kok)) hatlar.set(kok, { uclar: new Set(), baglantilar: new Set() });
    const h = hatlar.get(kok);
    h.uclar.add(uc);
    if (baglanti != null) h.baglantilar.add(baglanti);
  };
  proje.connections.forEach(([a, b], i) => {
    ekle(a, i);
    ekle(b, i);
  });
  for (const k of ata.keys()) ekle(k, null);
  return { hatlar: [...hatlar.values()], hatBul: (uc) => hatlar.get(bul(uc)), parcalar };
}

export function denetle(proje, pinVeri) {
  const sonuc = [];
  const ekle = (seviye, baslik, mesaj, ek = {}) => sonuc.push({ seviye, baslik, mesaj, baglantilar: [], parcalar: [], ...ek });
  const parcalar = new Map(proje.parts.map((p) => [p.id, p]));

  // 1. Uçlar var mı?
  let bozuk = false;
  proje.connections.forEach(([a, b], i) => {
    for (const uc of [a, b]) {
      const { id, pin } = ucCoz(uc);
      const p = parcalar.get(id);
      if (!p) {
        ekle('hata', 'Bilinmeyen parça', `"${uc}" bağlantısındaki "${id}" parçası projede yok.`, { baglantilar: [i] });
        bozuk = true;
        continue;
      }
      const olcu = parcaOlcu(p, pinVeri);
      if (!olcu) {
        ekle('hata', 'Bilinmeyen parça türü', `${id} parçasının türü (${p.type}) tanınmıyor.`, { parcalar: [id] });
        bozuk = true;
      } else if (!olcu.pins.some((x) => x.name === pin)) {
        ekle('hata', 'Bilinmeyen pin', `${parcaAdi(p)} parçasında "${pin}" pini yok. Var olanlar: ${olcu.pins.map((x) => x.name).join(', ')}.`, { baglantilar: [i], parcalar: [id] });
        bozuk = true;
      }
    }
  });
  if (bozuk) return sonuc;

  const kartlar = proje.parts.filter((p) => KARTLAR[p.type]);
  if (!kartlar.length) ekle('uyari', 'Kart yok', 'Projede bir mikrodenetleyici kartı (ESP32, Arduino) yok.');

  const { hatlar, hatBul } = hatlariKur(proje, pinVeri);

  // Her ucun özellikleri.
  const ucBilgi = (uc) => {
    const { id, pin } = ucCoz(uc);
    const p = parcalar.get(id);
    const bilgi = parcaBilgi(p);
    const kart = KARTLAR[p.type];
    const olcu = parcaOlcu(p, pinVeri);
    const pinTanim = olcu.pins.find((x) => x.name === pin);
    let kaynakV = bilgi.kaynak?.[pin] ?? bilgi.kaynak?.[pin.split('.')[0]];
    if (kaynakV == null && kart) {
      const s = pinTanim?.signals?.find((x) => x.type === 'power' && x.signal === 'VCC' && x.voltage);
      if (s) kaynakV = s.voltage;
    }
    const gnd = pinGND(p, pin, pinVeri);
    const gpio = kart && !gnd && kaynakV == null && kart.kodPini(pin) != null ? kart : null;
    return { uc, id, pin, p, bilgi, kart, kaynakV, gnd, gpio, kaynakParca: kart || Object.keys(bilgi.kaynak || {}).length > 0 };
  };

  for (const h of hatlar) {
    const uclar = [...h.uclar].map(ucBilgi);
    const bag = [...h.baglantilar];
    if (!bag.length) continue;
    const kaynaklar = uclar.filter((u) => u.kaynakV != null);
    const gndVar = uclar.some((u) => u.gnd);
    const ad = (u) => `${parcaAdi(u.p)} ${u.pin}`;

    if (gndVar && kaynaklar.length) {
      ekle('hata', 'Kısa devre', `${ad(kaynaklar[0])} (${volt(kaynaklar[0].kaynakV)}) doğrudan GND'ye bağlı. Kart ya da kaynak yanar.`, { baglantilar: bag });
    }
    const gerilimler = [...new Set(kaynaklar.map((u) => u.kaynakV))];
    if (gerilimler.length > 1) {
      ekle('hata', 'İki gerilim aynı hatta', `${kaynaklar.map((u) => `${ad(u)} (${volt(u.kaynakV)})`).join(' ve ')} birbirine bağlı.`, { baglantilar: bag });
    }
    for (const g of uclar.filter((u) => u.gpio)) {
      if (gndVar) {
        ekle('hata', 'Pin doğrudan GND\'de', `${ad(g)} pini doğrudan GND'ye bağlı. Pin HIGH olunca kısa devre olur.`, { baglantilar: bag });
      }
      const yuksek = kaynaklar.find((u) => u.kaynakV > g.gpio.mantik + 0.3);
      if (yuksek) {
        ekle('hata', 'Pine fazla gerilim', `${ad(yuksek)} (${volt(yuksek.kaynakV)}) doğrudan ${ad(g)} pinine gidiyor. Bu pin en çok ${volt(g.gpio.mantik)} kaldırır.`, { baglantilar: bag });
      }
      if (g.gpio.mantik < 4) {
        for (const c of uclar.filter((u) => PARCALAR[u.p.type]?.cikis5v?.includes(u.pin))) {
          const vcc = Object.keys(c.bilgi.besleme || {})[0];
          const besleme = vcc ? hatBul(`${c.id}:${vcc}`) : null;
          const v = besleme ? Math.max(0, ...[...besleme.uclar].map(ucBilgi).map((u) => u.kaynakV ?? 0)) : 0;
          if (v >= 4.5) {
            ekle('uyari', '5 V sinyal 3,3 V pine', `${ad(c)} 5 V sinyal verir; ${ad(g)} 3,3 V pindir. Araya gerilim bölücü (1 kΩ + 2 kΩ) ya da seviye dönüştürücü koy.`, { baglantilar: bag });
          }
        }
      }
      if (g.gpio.yalnizGiris?.includes(g.pin) && uclar.some((u) => u.bilgi.mcuCikis?.includes(u.pin))) {
        ekle('hata', 'Yalnız giriş pini', `${ad(g)} yalnız giriş pinidir; çıkış veremez. Başka bir pine taşı.`, { baglantilar: bag });
      }
      const acilis = g.gpio.acilisPinleri?.[g.pin];
      if (acilis) ekle(g.pin === 'D12' ? 'uyari' : 'bilgi', `${g.pin} açılış pini`, `${ad(g)}: ${acilis}`, { baglantilar: bag });
    }
  }

  // Parça başına denetim.
  const topraklar = new Set();
  for (const p of proje.parts) {
    const bilgi = parcaBilgi(p);
    const ad = parcaAdi(p);
    const bagliMi = proje.connections.some(([a, b]) => ucCoz(a).id === p.id || ucCoz(b).id === p.id);
    if (!bagliMi) {
      ekle('bilgi', 'Bağlantısız parça', `${ad} hiçbir yere bağlı değil.`, { parcalar: [p.id] });
      continue;
    }
    for (const [pin, [min, max]] of Object.entries(bilgi.besleme || {})) {
      const h = hatBul(`${p.id}:${pin}`);
      const kaynaklar = h ? [...h.uclar].map(ucBilgi).filter((u) => u.kaynakV != null) : [];
      const bag = h ? [...h.baglantilar] : [];
      if (!kaynaklar.length) {
        ekle('uyari', 'Besleme yok', `${ad} ${pin} pini bir güç kaynağına (5V, 3V3) bağlı değil.`, { parcalar: [p.id], baglantilar: bag });
        continue;
      }
      const v = kaynaklar[0].kaynakV;
      if (v > max + 0.25) ekle('hata', 'Fazla gerilim', `${ad} en çok ${volt(max)} ister; ${pin} pinine ${volt(v)} bağlı.`, { parcalar: [p.id], baglantilar: bag });
      else if (v < min - 0.25) ekle('uyari', 'Düşük gerilim', `${ad} en az ${volt(min)} ister; ${pin} pinine ${volt(v)} bağlı. Düzgün çalışmayabilir.`, { parcalar: [p.id], baglantilar: bag });
    }
    const gndPinleri = parcaOlcu(p, pinVeri).pins.filter((x) => pinGND(p, x.name, pinVeri)).map((x) => x.name);
    const kaynakli = KARTLAR[p.type] || Object.keys(bilgi.kaynak || {}).length;
    for (const g of gndPinleri) {
      const h = hatBul(`${p.id}:${g}`);
      const uclar = h ? [...h.uclar].map(ucBilgi) : [];
      if (kaynakli && h && h.baglantilar.size) topraklar.add(h);
      if (!kaynakli && Object.keys(bilgi.besleme || {}).length && !uclar.some((u) => u.gnd && u.kaynakParca)) {
        ekle('uyari', 'GND bağlı değil', `${ad} ${g} pini kartın ya da kaynağın GND'sine bağlı değil.`, { parcalar: [p.id] });
      }
    }
    if (PARCALAR[p.type]?.direncIster) {
      const pinler = parcaOlcu(p, pinVeri).pins.map((x) => x.name);
      const direncli = pinler.some((pin) => {
        const h = hatBul(`${p.id}:${pin}`);
        return h && [...h.uclar].some((u) => parcalar.get(ucCoz(u).id)?.type === 'wokwi-resistor');
      });
      if (!direncli) ekle('uyari', 'LED\'e direnç yok', `${ad} için seri direnç (220 Ω) koy. Yoksa LED ya da pin yanabilir.`, { parcalar: [p.id] });
    }
    if (p.type === 'wokwi-ks2e-m-dc5') {
      ekle('uyari', 'Çıplak röle', `${ad}: ${PARCALAR[p.type].not}`, { parcalar: [p.id] });
    }
    if (p.type === 'wokwi-esp32-devkit-v1') {
      const vin = hatBul(`${p.id}:VIN`);
      if (vin && vin.baglantilar.size) ekle('bilgi', 'ESP32 VIN', 'VIN pininden 5 V yalnız kart USB\'den beslenirken gelir.', { parcalar: [p.id], baglantilar: [...vin.baglantilar] });
    }
  }
  if (topraklar.size > 1) {
    ekle('uyari', 'Ortak GND yok', 'Kartın GND\'si ile harici güç kaynağının GND\'si birbirine bağlı değil. İkisini bir kabloyla birleştir.');
  }
  return sonuc;
}
