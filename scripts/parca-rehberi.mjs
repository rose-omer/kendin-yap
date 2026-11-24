// Claude skill'inin okuduğu parça ve pin rehberini üretir: docs/parca-rehberi.md
// Katalog ya da pinler.json değişince yeniden çalıştır: node scripts/parca-rehberi.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { KARTLAR, KY_MODUL, MODUL_HAZIR, PARCALAR } from '../src/veri/katalog.js';

const pinVeri = JSON.parse(readFileSync(new URL('../src/veri/pinler.json', import.meta.url), 'utf8'));
const s = [];
s.push('# Parça ve pin rehberi');
s.push('');
s.push('Bu dosya `scripts/parca-rehberi.mjs` ile üretilir. Elle düzenleme.');
s.push('Pin adlarını bağlantılarda aynen yaz. Boyut: piksel (en x boy). Pin konumu: parçanın sol üst köşesine göre (x,y).');
s.push('');

const kategoriler = {};
for (const [tur, b] of Object.entries(PARCALAR)) {
  if (tur === KY_MODUL || !pinVeri[tur]) continue;
  (kategoriler[b.kategori] ||= []).push([tur, b]);
}
for (const [kategori, liste] of Object.entries(kategoriler)) {
  s.push(`## ${kategori}`);
  s.push('');
  for (const [tur, b] of liste) {
    const v = pinVeri[tur];
    s.push(`### \`${tur}\` — ${b.ad}`);
    s.push(`${b.ozet} Boyut: ${Math.round(v.w)}x${Math.round(v.h)}.`);
    const kart = KARTLAR[tur];
    if (kart) {
      s.push(`- Mantık gerilimi: ${kart.mantik} V. Besleme çıkışları: ${Object.entries(kart.kaynak).map(([p, g]) => `${p} = ${g} V`).join(', ')}.`);
      if (kart.yalnizGiris) s.push(`- Yalnız giriş: ${kart.yalnizGiris.join(', ')}.`);
      if (kart.acilisPinleri) s.push(`- Açılış pinleri (kaçın): ${Object.keys(kart.acilisPinleri).join(', ')}.`);
    }
    if (b.besleme) s.push(`- Besleme: ${Object.entries(b.besleme).map(([p, [a, z]]) => `${p} ${a}–${z} V`).join(', ')}.`);
    if (b.cikis5v) s.push(`- 5 V ile beslenince 5 V sinyal veren pinler: ${b.cikis5v.join(', ')}.`);
    if (b.varsayilan) s.push(`- Varsayılan attrs: \`${JSON.stringify(b.varsayilan)}\`.`);
    if (b.not) s.push(`- Not: ${b.not}`);
    s.push(`- Pinler: ${v.pins.map((p) => `\`${p.name}\`@${Math.round(p.x)},${Math.round(p.y)}`).join(' ')}`);
    s.push('');
  }
}

s.push('## Wokwi\'de olmayan modüller (`ky-modul`)');
s.push('');
s.push('Tür her zaman `ky-modul`. Pinleri `attrs.sol` (sol kenar, x=0) ve `attrs.sag` (sağ kenar, x=140) belirler.');
s.push('Kutu eni 140. Pin y = 45 + 22 × sıra (sıra 0\'dan başlar). Boy = 42 + 22 × en uzun taraftaki pin sayısı.');
s.push('Kartın soluna koyduğun modülde pinleri `sag`a, sağına koyduğunda `sol`a yaz; teller kısa olur.');
s.push('attrs alanları (hepsi yazı): `baslik`, `sol`, `sag`, `besleme` ("PIN:enaz-ençok"), `kaynak` ("PIN:volt"), `gnd` (GND pinleri), `mcuCikis` (kartın sürdüğü pinler), `renk`, `arama` (satıcı arama sözcüğü), `ozet`.');
s.push('');
for (const [anahtar, m] of Object.entries(MODUL_HAZIR)) {
  s.push(`### ${m.baslik} (hazır: \`${anahtar}\`)`);
  s.push('```json');
  s.push(JSON.stringify({ type: KY_MODUL, id: anahtar.split('-')[0], left: 0, top: 0, attrs: m }));
  s.push('```');
  s.push('');
}

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/parca-rehberi.md', import.meta.url), s.join('\n'));
console.log(`docs/parca-rehberi.md yazıldı (${s.length} satır).`);
