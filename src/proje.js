// Projeleri yükler ve saklar. Üç kaynak var:
// 1. Hazır şablonlar (src/sablonlar/*.json)
// 2. Claude'un yazdığı projeler (projeler/*.json) — Claude skill'i buraya yazar, site kendiliğinden görür.
// 3. Tarayıcıda düzenlenen kopyalar (localStorage). Aynı id varsa yerel kopya kazanır.
import pinVeri from './veri/pinler.json';
import { KARTLAR, KY_MODUL, parcaAdi, parcaBilgi } from './veri/katalog.js';
import { ucCoz } from './denetim.js';

export { pinVeri };

const sablonlar = Object.values(import.meta.glob('./sablonlar/*.json', { eager: true, import: 'default' }));
const claudeProjeleri = Object.values(import.meta.glob('../projeler/*.json', { eager: true, import: 'default' }));

const ANAHTAR = 'ky.projeler';

function yerelOku() {
  try {
    return JSON.parse(localStorage.getItem(ANAHTAR)) || {};
  } catch {
    return {};
  }
}

function yerelYaz(veri) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(veri));
    return true;
  } catch {
    return false;
  }
}

export function hazirProjeler() {
  return sablonlar.map((p) => ({ ...p, kaynak: 'sablon' }));
}

export function benimProjelerim() {
  const yerel = yerelOku();
  const liste = new Map();
  for (const p of claudeProjeleri) liste.set(p.id, { ...p, kaynak: 'claude' });
  for (const p of Object.values(yerel)) {
    const onceki = liste.get(p.id) || sablonlar.find((s) => s.id === p.id);
    liste.set(p.id, { ...p, kaynak: onceki ? 'kopya' : 'yerel' });
  }
  return [...liste.values()].sort((a, b) => (b.guncelleme || '').localeCompare(a.guncelleme || ''));
}

export function projeGetir(id) {
  const yerel = yerelOku()[id];
  if (yerel) return yerel;
  return claudeProjeleri.find((p) => p.id === id) || sablonlar.find((p) => p.id === id) || null;
}

// Şablonun ya da Claude projesinin değiştirilmemiş hâli.
export function asilProje(id) {
  return claudeProjeleri.find((p) => p.id === id) || sablonlar.find((p) => p.id === id) || null;
}

export function projeKaydet(proje) {
  const yerel = yerelOku();
  yerel[proje.id] = { ...proje, guncelleme: new Date().toISOString() };
  return yerelYaz(yerel);
}

export function yerelKopyaVar(id) {
  return id in yerelOku();
}

export function projeSil(id) {
  const yerel = yerelOku();
  delete yerel[id];
  yerelYaz(yerel);
}

export function yeniProje(baslik) {
  const kok = (baslik || 'proje')
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proje';
  const proje = {
    surum: 1,
    id: `${kok}-${Date.now().toString(36)}`,
    baslik: baslik || 'Yeni proje',
    ozet: '',
    zorluk: 'Kolay',
    sure: '',
    gereksinimler: [],
    parts: [],
    connections: [],
    kod: { dosya: 'sketch.ino', kutuphaneler: [], icerik: '' },
    montaj: [],
    testler: [],
  };
  projeKaydet(proje);
  return proje;
}

// Kod için pin tanımları: kart pini ↔ parça pini bağlantılarından üretilir.
export function pinTanimlari(proje) {
  const parcalar = new Map(proje.parts.map((p) => [p.id, p]));
  const satirlar = [];
  const goruldu = new Set();
  for (const [a, b] of proje.connections) {
    for (const [k, d] of [[a, b], [b, a]]) {
      const ku = ucCoz(k);
      const du = ucCoz(d);
      const kart = parcalar.get(ku.id);
      const diger = parcalar.get(du.id);
      if (!kart || !diger || !KARTLAR[kart.type] || KARTLAR[diger.type]) continue;
      const no = KARTLAR[kart.type].kodPini(ku.pin);
      if (no == null || /^GND/.test(ku.pin)) continue;
      const ad = `${du.id}_${du.pin}`.toUpperCase().replace(/[^A-Z0-9]+/g, '_') + '_PIN';
      if (goruldu.has(ad)) continue;
      goruldu.add(ad);
      satirlar.push(`const int ${ad} = ${typeof no === 'number' ? no : no}; // ${parcaAdi(kart)} ${ku.pin} → ${parcaAdi(diger)} ${du.pin}`);
    }
  }
  return satirlar.join('\n');
}

// Parça listesi: aynı tür ve ayarlar tek satırda toplanır.
export function parcaListesi(proje) {
  const gruplar = new Map();
  for (const p of proje.parts) {
    const ad = parcaAdi(p);
    const deger = p.type === 'wokwi-resistor' ? ` ${p.attrs?.value || '220'} Ω` : '';
    const anahtar = ad + deger;
    const bilgi = parcaBilgi(p);
    const g = gruplar.get(anahtar) || {
      ad: ad + deger,
      adet: 0,
      arama: deger ? `${deger.trim().replace(' Ω', '')} ohm direnç` : bilgi.arama || ad,
      iceren: deger ? ['direnç', deger.trim().replace(' Ω', '')] : bilgi.iceren || [],
      haric: bilgi.haric || [],
      ozet: bilgi.ozet,
      idler: [],
    };
    g.adet += Number(p.adet || 1);
    g.idler.push(p.id);
    gruplar.set(anahtar, g);
  }
  const liste = [...gruplar.values()];
  if (proje.connections.length) {
    liste.push({ ad: 'Breadboard (400 delik)', adet: 1, arama: 'breadboard', iceren: ['breadboard'], haric: ['kit', 'set', 'güç', 'power', 'modül', 'kablo', 'tutucu', 'mini', '170'], ozet: 'Lehimsiz deney tahtası.', ek: true });
    liste.push({ ad: 'Jumper kablo seti', adet: 1, arama: '40 adet jumper kablo', iceren: ['jumper', '40'], haric: [], ozet: `Bu proje için en az ${Math.ceil(proje.connections.length * 1.5)} kablo gerekir; 40'lı set yeter.`, ek: true });
  }
  return liste;
}

// Kartlarda ve tanıtımda gösterilen özellik etiketleri: koddan ve parçalardan çıkarılır.
export function ozellikEtiketleri(proje) {
  const kod = proje.kod?.icerik || '';
  const etiketler = [];
  const ekle = (ad, tur) => { if (!etiketler.some((e) => e.ad === ad)) etiketler.push({ ad, tur }); };
  if (/<WiFi.h>/.test(kod)) ekle('Wi-Fi', 'kablosuz');
  if (/<WebServer.h>/.test(kod)) ekle('Web sayfası', 'kablosuz');
  if (/<HTTPClient.h>/.test(kod)) ekle('İnternet', 'kablosuz');
  if (/<PubSubClient.h>/.test(kod)) ekle('MQTT', 'kablosuz');
  if (/<BluetoothSerial.h>|<BLEDevice.h>/.test(kod)) ekle('Bluetooth', 'kablosuz');
  for (const p of proje.parts) {
    const k = parcaBilgi(p).kategori;
    if (k === 'Ekran') ekle('Ekran', 'parca');
    if (k === 'Sensör' || /sensör/i.test(p.attrs?.baslik || '')) ekle('Sensör', 'parca');
    if (k === 'Hareket' || /pompa|motor|röle/i.test(p.attrs?.baslik || '')) ekle('Hareket', 'parca');
    if (p.type === 'wokwi-buzzer') ekle('Ses', 'parca');
    if (/led/.test(p.type)) ekle('Işık', 'parca');
    if (k === 'Giriş' || /kapı/i.test(p.attrs?.baslik || '')) ekle('Düğme', 'parca');
  }
  return etiketler;
}

export const SATICILAR = [
  { ad: 'Robotistan', url: (q) => `https://www.robotistan.com/arama?q=${encodeURIComponent(q)}` },
  { ad: 'Direnc.net', url: (q) => `https://www.direnc.net/arama?q=${encodeURIComponent(q)}` },
  { ad: 'Motorobit', url: (q) => `https://www.motorobit.com/arama?q=${encodeURIComponent(q)}` },
];

// Yerel fiyat ucundan (sunucu/fiyat.js) bir satır için fiyat ister.
export async function fiyatGetir(satir) {
  const p = new URLSearchParams({ q: satir.arama, iceren: (satir.iceren || []).join(','), haric: (satir.haric || []).join(',') });
  const yanit = await fetch(`/__fiyat?${p}`);
  if (!yanit.ok) throw new Error(`HTTP ${yanit.status}`);
  return yanit.json();
}

export function tl(sayi) {
  return `${sayi.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

// Wokwi simülatörü için diagram.json. Wokwi'de olmayan modüller ve bağlantıları çıkarılır.
export function wokwiDiagram(proje) {
  const disarida = new Set(proje.parts.filter((p) => p.type === KY_MODUL).map((p) => p.id));
  return {
    version: 1,
    author: 'Kendin Yap',
    editor: 'wokwi',
    parts: proje.parts
      .filter((p) => !disarida.has(p.id))
      .map(({ type, id, top, left, rotate, attrs }) => ({ type, id, top, left, ...(rotate ? { rotate } : {}), attrs: attrs || {} })),
    connections: proje.connections
      .filter(([a, b]) => !disarida.has(ucCoz(a).id) && !disarida.has(ucCoz(b).id))
      .map(([a, b, renk, yol]) => [a, b, renk || 'green', yol || []]),
  };
}

export function wokwiYeniAdres(proje) {
  const kart = proje.parts.find((p) => KARTLAR[p.type]);
  if (kart?.type === 'wokwi-esp32-devkit-v1') return 'https://wokwi.com/projects/new/esp32';
  if (kart?.type === 'wokwi-arduino-mega') return 'https://wokwi.com/projects/new/arduino-mega';
  if (kart?.type === 'wokwi-arduino-nano') return 'https://wokwi.com/projects/new/arduino-nano';
  return 'https://wokwi.com/projects/new/arduino-uno';
}

export function dosyaIndir(ad, icerik, tur = 'application/json') {
  const url = URL.createObjectURL(new Blob([icerik], { type: tur }));
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  a.click();
  URL.revokeObjectURL(url);
}
