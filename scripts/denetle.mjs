// Proje dosyasını sitenin denetim kurallarıyla denetler.
// Kullanım: node scripts/denetle.mjs projeler/ornek.json [başka.json ...]
// Çıkış kodu: hata varsa 1, yoksa 0.
import { readFileSync } from 'node:fs';
import { denetle } from '../src/denetim.js';

const pinVeri = JSON.parse(readFileSync(new URL('../src/veri/pinler.json', import.meta.url), 'utf8'));
const dosyalar = process.argv.slice(2);
if (!dosyalar.length) {
  console.error('Kullanım: node scripts/denetle.mjs <proje.json> [...]');
  process.exit(2);
}

const ZORUNLU = ['id', 'baslik', 'parts', 'connections'];
let hataVar = false;
for (const dosya of dosyalar) {
  let proje;
  try {
    proje = JSON.parse(readFileSync(dosya, 'utf8'));
  } catch (e) {
    console.log(`\n${dosya}\n  HATA  Dosya okunamadı ya da JSON bozuk: ${e.message}`);
    hataVar = true;
    continue;
  }
  const eksik = ZORUNLU.filter((k) => !(k in proje));
  console.log(`\n${dosya} — ${proje.baslik ?? '(başlık yok)'}`);
  if (eksik.length) {
    console.log(`  HATA  Eksik alan: ${eksik.join(', ')}`);
    hataVar = true;
    continue;
  }
  const ids = proje.parts.map((p) => p.id);
  const tekrar = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (tekrar.length) {
    console.log(`  HATA  Aynı parça kimliği birden çok kez var: ${[...new Set(tekrar)].join(', ')}`);
    hataVar = true;
  }
  const sonuc = denetle(proje, pinVeri);
  const etiket = { hata: 'HATA ', uyari: 'UYARI', bilgi: 'bilgi' };
  for (const s of sonuc) console.log(`  ${etiket[s.seviye]} ${s.baslik}: ${s.mesaj}`);
  if (!sonuc.length) console.log('  Sorun yok.');
  if (sonuc.some((s) => s.seviye === 'hata')) hataVar = true;
}
process.exit(hataVar ? 1 : 0);
