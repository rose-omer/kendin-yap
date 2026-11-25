import { useEffect, useId, useRef, useState } from 'react';
import { MODUL_HAZIR, PARCALAR, KY_MODUL } from '../veri/katalog.js';
import { bildir } from './Bildirim.jsx';

export function KopyalaDugme({ metin, etiket = 'Kopyala', className = 'dugme ikincil' }) {
  const [durum, setDurum] = useState('');
  async function kopyala() {
    try {
      await navigator.clipboard.writeText(typeof metin === 'function' ? metin() : metin);
      setDurum('Kopyalandı');
      bildir('Panoya kopyalandı');
    } catch {
      setDurum('Kopyalanamadı');
    }
    setTimeout(() => setDurum(''), 1800);
  }
  return (
    <button type="button" className={className} onClick={kopyala}>
      {durum || etiket}
      <span className="gizli" role="status">{durum}</span>
    </button>
  );
}

// Katalogdaki parçalar + hazır modüller tek listede.
export function katalogListesi() {
  const liste = Object.entries(PARCALAR)
    .filter(([tur]) => tur !== KY_MODUL)
    .map(([anahtar, b]) => ({ anahtar, tur: b.tur || anahtar, ad: b.ad, kategori: b.kategori, ozet: b.ozet, attrs: b.varsayilan }));
  for (const [anahtar, m] of Object.entries(MODUL_HAZIR)) {
    const { arama, ozet, ...attrs } = m;
    liste.push({ anahtar, tur: KY_MODUL, ad: m.baslik, kategori: 'Modül', ozet, attrs: { ...attrs, arama, ozet } });
  }
  return liste;
}

export const KATEGORILER = ['Kart', 'Sensör', 'Işık ve ses', 'Giriş', 'Ekran', 'Hareket', 'Modül', 'Temel'];

export function yeniParca(oge, proje) {
  const ham = oge.tur === KY_MODUL ? oge.anahtar.split('-')[0] : oge.tur.replace('wokwi-', '').split('-')[0];
  const kok = ham.replace(/\d+$/, '') || ham;
  let n = 1;
  while (proje.parts.some((p) => p.id === `${kok}${n}`)) n += 1;
  const sag = proje.parts.reduce((m, p) => Math.max(m, p.left + 200), 0);
  const ust = proje.parts.length ? Math.min(...proje.parts.map((p) => p.top)) : 0;
  return { type: oge.tur, id: `${kok}${n}`, left: sag + 40, top: ust, attrs: { ...(oge.attrs || {}) } };
}

export function ParcaSecici({ acik, onKapat, onSec }) {
  const dialogRef = useRef(null);
  const aramaRef = useRef(null);
  const aramaId = useId();
  const [arama, setArama] = useState('');
  const [kategori, setKategori] = useState('');

  useEffect(() => {
    const d = dialogRef.current;
    if (acik && !d.open) {
      d.showModal();
      aramaRef.current?.focus();
    }
    if (!acik && d.open) d.close();
  }, [acik]);

  const kucuk = (s) => (s || '').toLocaleLowerCase('tr');
  const liste = katalogListesi().filter(
    (o) => (!kategori || o.kategori === kategori) && (!arama || kucuk(o.ad + ' ' + o.ozet).includes(kucuk(arama))),
  );

  return (
    <dialog ref={dialogRef} className="pencere" onClose={onKapat} aria-labelledby={`${aramaId}-baslik`}>
      <div className="pencere-ust">
        <h2 id={`${aramaId}-baslik`}>Parça ekle</h2>
        <button type="button" className="dugme ikincil" onClick={onKapat}>Kapat</button>
      </div>
      <label htmlFor={aramaId}>Parça ara</label>
      <input ref={aramaRef} id={aramaId} type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="ör. sıcaklık, röle, LED" />
      <div className="cipler" role="group" aria-label="Kategori">
        <button type="button" className="cip" aria-pressed={!kategori} onClick={() => setKategori('')}>Hepsi</button>
        {KATEGORILER.map((k) => (
          <button key={k} type="button" className="cip" aria-pressed={kategori === k} onClick={() => setKategori(k)}>{k}</button>
        ))}
      </div>
      <ul className="secici-liste">
        {liste.map((o) => (
          <li key={o.anahtar}>
            <div>
              <strong>{o.ad}</strong>
              <span className="soluk-yazi">{o.ozet}</span>
            </div>
            <button type="button" className="dugme" onClick={() => onSec(o)}>Ekle</button>
          </li>
        ))}
        {!liste.length && <li className="soluk-yazi">Bu aramayla parça yok.</li>}
      </ul>
    </dialog>
  );
}
