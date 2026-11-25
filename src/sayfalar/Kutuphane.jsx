import { useId, useRef, useState } from 'react';
import Sema, { pinAciklama } from '../bilesenler/Sema.jsx';
import { KATEGORILER, katalogListesi } from '../bilesenler/Ortak.jsx';
import { parcaOlcu, pinNotu, PARCALAR } from '../veri/katalog.js';
import { pinVeri, SATICILAR } from '../proje.js';

export default function Kutuphane() {
  const aramaId = useId();
  const [arama, setArama] = useState('');
  const [kategori, setKategori] = useState('');
  const [secili, setSecili] = useState(null);
  const detayRef = useRef(null);
  function sec(o) {
    setSecili(o);
    // Dar ekranda ayrıntı listenin altında kalır; kullanıcı kaybolmasın diye oraya kaydır.
    if (window.matchMedia('(max-width: 980px)').matches) setTimeout(() => detayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
  const kucuk = (s) => (s || '').toLocaleLowerCase('tr');
  const liste = katalogListesi().filter(
    (o) => (!kategori || o.kategori === kategori) && (!arama || kucuk(o.ad + ' ' + o.ozet).includes(kucuk(arama))),
  );
  const parca = secili ? { type: secili.tur, id: 'parca', left: 0, top: 0, attrs: secili.attrs || {}, ad: secili.ad } : null;
  const olcu = parca ? parcaOlcu(parca, pinVeri) : null;

  return (
    <div className="sayfa genis">
      <h1>Parça kütüphanesi</h1>
      <p className="buyuk-yazi">Bir parçaya tıkla: gerçek görünümü ve her pinin ne işe yaradığı açılır.</p>
      <div className="kutuphane">
        <div>
          <label htmlFor={aramaId}>Parça ara</label>
          <input id={aramaId} type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="ör. sensör, ekran, motor" />
          <div className="cipler" role="group" aria-label="Kategori">
            <button type="button" className="cip" aria-pressed={!kategori} onClick={() => setKategori('')}>Hepsi</button>
            {KATEGORILER.map((k) => (
              <button key={k} type="button" className="cip" aria-pressed={kategori === k} onClick={() => setKategori(k)}>{k}</button>
            ))}
          </div>
          <ul className="parca-listesi">
            {liste.map((o) => (
              <li key={o.anahtar}>
                <button type="button" aria-pressed={secili?.anahtar === o.anahtar} onClick={() => sec(o)}>
                  <strong>{o.ad}</strong>
                  <span className="soluk-yazi">{o.kategori}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="parca-detay" aria-live="polite" ref={detayRef}>
          {parca && olcu ? (
            <>
              <h2>{secili.ad}</h2>
              <p>{secili.ozet}</p>
              {PARCALAR[secili.anahtar]?.not && <p className="kutu bilgi">{PARCALAR[secili.anahtar].not}</p>}
              <div className="tek-parca">
                <Sema key={secili.anahtar} proje={{ id: `tek-${secili.anahtar}`, parts: [parca], connections: [] }} etiketGoster={false} varsayilanKip="canli" />
              </div>
              <h3>Pinler</h3>
              <ul className="pin-tablosu">
                {olcu.pins.map((p) => (
                  <li key={p.name}><span className="pin-adi">{p.name}</span> <span className="soluk-yazi">{[pinAciklama(p.signals) || 'Sinyal', pinNotu(secili.tur, p.name)].filter(Boolean).join(' · ')}</span></li>
                ))}
              </ul>
              <p>
                Satın al:{' '}
                {SATICILAR.map((v, i) => (
                  <span key={v.ad}>{i > 0 && ' · '}<a href={v.url(PARCALAR[secili.anahtar]?.arama || secili.attrs?.arama || secili.ad)} target="_blank" rel="noreferrer">{v.ad}</a></span>
                ))}
              </p>
            </>
          ) : (
            <p className="kutu">Soldan bir parça seç.</p>
          )}
        </div>
      </div>
    </div>
  );
}
