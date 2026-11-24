import { createElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@wokwi/elements';
import { KY_MODUL, parcaAdi, parcaOlcu, pinNotu } from '../veri/katalog.js';
import { ucCoz } from '../denetim.js';
import { pinVeri } from '../proje.js';

const RENKLER = {
  green: '#16a34a', red: '#dc2626', black: '#1f2937', blue: '#2563eb', orange: '#ea580c', yellow: '#ca8a04',
  purple: '#7c3aed', violet: '#7c3aed', gray: '#6b7280', white: '#d1d5db', brown: '#92400e', cyan: '#0891b2',
  magenta: '#c026d3', gold: '#b45309', limegreen: '#65a30d',
};
export const KABLO_RENKLERI = [
  ['red', 'Kırmızı'], ['black', 'Siyah'], ['green', 'Yeşil'], ['blue', 'Mavi'],
  ['yellow', 'Sarı'], ['orange', 'Turuncu'], ['purple', 'Mor'], ['white', 'Beyaz'],
];
const RENK_ADI = Object.fromEntries(KABLO_RENKLERI);
RENK_ADI.gray = 'Gri'; RENK_ADI.brown = 'Kahverengi'; RENK_ADI.cyan = 'Turkuaz'; RENK_ADI.violet = 'Mor';
export const renkKodu = (r) => RENKLER[r] || r || RENKLER.green;
export const renkAdi = (r) => RENK_ADI[r] || r || 'Yeşil';

export function pinAciklama(signals = []) {
  return signals.map((s) => {
    if (s.type === 'power') return s.signal === 'GND' ? 'GND (eksi, toprak)' : `Besleme${s.voltage ? ` ${String(s.voltage).replace('.', ',')} V` : ''}`;
    if (s.type === 'analog') return 'Analog giriş';
    if (s.type === 'pwm') return 'PWM';
    if (s.type === 'i2c') return `I2C ${s.signal}`;
    if (s.type === 'spi') return `SPI ${s.signal}`;
    if (s.type === 'uart' || s.type === 'usart') return `Seri ${s.signal}`;
    return s.type;
  }).join(' · ');
}

function dondur(parca, olcu, x, y) {
  const r = ((parca.rotate || 0) * Math.PI) / 180;
  const cx = olcu.w / 2;
  const cy = olcu.h / 2;
  const dx = x - cx;
  const dy = y - cy;
  return { x: parca.left + cx + dx * Math.cos(r) - dy * Math.sin(r), y: parca.top + cy + dx * Math.sin(r) + dy * Math.cos(r) };
}

function kabloYolu(a, b, sira) {
  const ara = Math.round((a.x + b.x) / 2 + ((sira % 5) - 2) * 6);
  return `M ${a.x} ${a.y} H ${ara} V ${b.y} H ${b.x}`;
}

function KyModul({ attrs = {}, olcu }) {
  return (
    <div className="ky-modul" style={{ '--modul-renk': attrs.renk || '#475569', width: olcu.w, height: olcu.h }}>
      <div className="ky-modul-baslik" title={attrs.baslik}>{attrs.baslik || 'Modül'}</div>
      {olcu.pins.map((p) => (
        <span key={p.name} data-pin={p.name} className={`ky-modul-pin ${p.taraf}`} style={{ top: p.y - 8 }}>{p.name}</span>
      ))}
    </div>
  );
}

export default function Sema({
  proje, duzenle = false, secili = null, onSec, onDegis, seciliParca = null, onParcaSec, kabloRengi = 'green', etiketGoster = true, varsayilanKip = 'tasi', zorlaCanli = false, onizleme = false, isaretler = null,
}) {
  const kapRef = useRef(null);
  const islemRef = useRef(null);
  const [gorunum, setGorunum] = useState({ x: 0, y: 0, s: 1 });
  const [surukleme, setSurukleme] = useState(null);
  const [bekleyen, setBekleyen] = useState(null);
  const [ipucu, setIpucu] = useState(null);
  // tasi: parçaları sürükle, pinlere tıklayarak kablo çiz. canli: butona bas, düğmeyi çevir.
  const [kip, setKip] = useState(varsayilanKip);
  const canli = zorlaCanli || kip === 'canli';

  const parcalar = proje.parts
    .map((p) => (surukleme?.id === p.id ? { ...p, left: surukleme.left, top: surukleme.top } : p))
    .map((p) => ({ p, olcu: parcaOlcu(p, pinVeri) }))
    .filter((x) => x.olcu);

  const konumlar = new Map();
  for (const { p, olcu } of parcalar) {
    for (const pin of olcu.pins) konumlar.set(`${p.id}:${pin.name}`, { ...dondur(p, olcu, pin.x, pin.y), parca: p, pin });
  }
  const bagliUclar = new Set(proje.connections.flatMap(([a, b]) => [a, b]));
  const seciliUclar = secili != null && proje.connections[secili] ? proje.connections[secili].slice(0, 2) : [];

  const sigdir = useCallback(() => {
    const kap = kapRef.current;
    if (!kap || !proje.parts.length) return false;
    // Kap henüz boyut almadıysa (yerleşim sürüyor) sığdırma; sonra yeniden denenir.
    if (kap.clientWidth < 60 || kap.clientHeight < 60) return false;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const p of proje.parts) {
      const o = parcaOlcu(p, pinVeri);
      if (!o) continue;
      for (const [x, y] of [[0, 0], [o.w, 0], [0, o.h], [o.w, o.h]]) {
        const k = dondur(p, o, x, y);
        x0 = Math.min(x0, k.x); y0 = Math.min(y0, k.y - 20); x1 = Math.max(x1, k.x); y1 = Math.max(y1, k.y);
      }
    }
    const pay = onizleme ? 8 : 40;
    const s = Math.max(0.1, Math.min((kap.clientWidth - pay * 2) / (x1 - x0), (kap.clientHeight - pay * 2) / (y1 - y0), 2.2));
    setGorunum({ s, x: (kap.clientWidth - (x1 - x0) * s) / 2 - x0 * s, y: (kap.clientHeight - (y1 - y0) * s) / 2 - y0 * s });
    return true;
  }, [proje.parts, onizleme]);

  // Proje değişince (başka proje açılınca) ekrana sığdır.
  const ilkSigdir = useRef(null);
  const elleOynandi = useRef(false);
  useLayoutEffect(() => {
    if (ilkSigdir.current === proje.id) return;
    ilkSigdir.current = proje.id;
    elleOynandi.current = false;
    sigdir();
  }, [proje.id, sigdir]);

  // Kap boyutu değişince (ilk yerleşim, tam ekran, pencere) kullanıcı elle oynamadıysa yeniden sığdır.
  useEffect(() => {
    const kap = kapRef.current;
    if (!kap || typeof ResizeObserver === 'undefined') return undefined;
    const gozcu = new ResizeObserver(() => {
      if (!elleOynandi.current) sigdir();
    });
    gozcu.observe(kap);
    return () => gozcu.disconnect();
  }, [sigdir]);

  // Fare tekerleğiyle yakınlaştır; sayfa kaymasın diye pasif olmayan dinleyici.
  useEffect(() => {
    const kap = kapRef.current;
    const tekerlek = (e) => {
      e.preventDefault();
      elleOynandi.current = true;
      const r = kap.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setGorunum((g) => {
        const s = Math.min(4, Math.max(0.25, g.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        return { s, x: mx - ((mx - g.x) * s) / g.s, y: my - ((my - g.y) * s) / g.s };
      });
    };
    kap.addEventListener('wheel', tekerlek, { passive: false });
    return () => kap.removeEventListener('wheel', tekerlek);
  }, []);

  function yakinlastir(kat) {
    elleOynandi.current = true;
    const kap = kapRef.current;
    const mx = kap.clientWidth / 2;
    const my = kap.clientHeight / 2;
    setGorunum((g) => {
      const s = Math.min(4, Math.max(0.25, g.s * kat));
      return { s, x: mx - ((mx - g.x) * s) / g.s, y: my - ((my - g.y) * s) / g.s };
    });
  }

  function arkaPlanBas(e) {
    if (e.button !== 0) return;
    islemRef.current = { tur: 'kaydir', sx: e.clientX, sy: e.clientY, ox: gorunum.x, oy: gorunum.y };
    kapRef.current.setPointerCapture(e.pointerId);
    onParcaSec?.(null);
  }

  function parcaBas(e, p) {
    e.stopPropagation();
    if (canli || e.button !== 0) return;
    islemRef.current = { tur: 'parca', id: p.id, sx: e.clientX, sy: e.clientY, ol: p.left, ot: p.top, oynadi: false };
    kapRef.current.setPointerCapture(e.pointerId);
    onParcaSec?.(p.id);
  }

  function hareket(e) {
    const i = islemRef.current;
    if (!i) return;
    const dx = e.clientX - i.sx;
    const dy = e.clientY - i.sy;
    if (i.tur === 'kaydir') {
      if (Math.abs(dx) + Math.abs(dy) > 3) elleOynandi.current = true;
      setGorunum((g) => ({ ...g, x: i.ox + dx, y: i.oy + dy }));
    }
    if (i.tur === 'parca') {
      if (Math.abs(dx) + Math.abs(dy) > 3) i.oynadi = true;
      setSurukleme({ id: i.id, left: Math.round(i.ol + dx / gorunum.s), top: Math.round(i.ot + dy / gorunum.s) });
    }
  }

  function birak() {
    const i = islemRef.current;
    islemRef.current = null;
    if (i?.tur === 'parca' && i.oynadi && surukleme) {
      onDegis?.({ ...proje, parts: proje.parts.map((p) => (p.id === surukleme.id ? { ...p, left: surukleme.left, top: surukleme.top } : p)) });
    }
    setSurukleme(null);
  }

  function pinTikla(e, uc) {
    e.stopPropagation();
    if (canli || !onDegis) {
      const i = proje.connections.findIndex(([a, b]) => a === uc || b === uc);
      if (i >= 0) onSec?.(i);
      return;
    }
    if (!bekleyen) return setBekleyen(uc);
    if (bekleyen === uc) return setBekleyen(null);
    const zatenVar = proje.connections.findIndex(([a, b]) => (a === bekleyen && b === uc) || (a === uc && b === bekleyen));
    setBekleyen(null);
    if (zatenVar >= 0) return onSec?.(zatenVar);
    onDegis?.({ ...proje, connections: [...proje.connections, [bekleyen, uc, kabloRengi, []]] });
    onSec?.(proje.connections.length);
  }

  function pinUzerinde(e, uc) {
    const k = konumlar.get(uc);
    const r = kapRef.current.getBoundingClientRect();
    const karsilar = proje.connections
      .filter(([a, b]) => a === uc || b === uc)
      .map(([a, b]) => (a === uc ? b : a))
      .map((d) => {
        const { id, pin } = ucCoz(d);
        const p = proje.parts.find((x) => x.id === id);
        return p ? `${parcaAdi(p)} ${pin}` : d;
      });
    setIpucu({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      baslik: `${parcaAdi(k.parca)} · ${k.pin.name}`,
      tur: [pinAciklama(k.pin.signals), pinNotu(k.parca.type, k.pin.name)].filter(Boolean).join(' · '),
      bagli: karsilar,
    });
  }

  function tus(e) {
    if (e.key === 'Escape') setBekleyen(null);
    if (duzenle && (e.key === 'Delete' || e.key === 'Backspace') && secili != null) {
      e.preventDefault();
      onDegis?.({ ...proje, connections: proje.connections.filter((_, i) => i !== secili) });
      onSec?.(null);
    }
  }

  return (
    <div className={`sema${onizleme ? ' onizleme' : ''}`}>
      <div
        ref={kapRef}
        className={`sema-kap${canli ? ' canli' : ' tasi'}`}
        onPointerDown={arkaPlanBas}
        onPointerMove={hareket}
        onPointerUp={birak}
        onPointerCancel={birak}
        onKeyDown={tus}
        tabIndex={0}
        role="application"
        aria-label="Bağlantı şeması. Sürükleyerek kaydır, tekerlekle yakınlaştır."
      >
        <div className="sema-sahne" style={{ transform: `translate(${gorunum.x}px, ${gorunum.y}px) scale(${gorunum.s})` }}>
          {parcalar.map(({ p, olcu }) => (
            <div key={p.id}>
              {etiketGoster && (
                <div className="sema-etiket" style={{ left: p.left, top: p.top - 22 }}>{parcaAdi(p)}</div>
              )}
              <div
                className={`sema-parca${seciliParca === p.id ? ' secili' : ''}${isaretler?.parcalar?.[p.id] ? ` isaret-${isaretler.parcalar[p.id]}` : ''}${isaretler?.odak && !isaretler.odak.parcalar?.includes(p.id) && isaretler.odak.parcalar?.length ? ' soluk-parca' : ''}`}
                style={{ left: p.left, top: p.top, width: olcu.w, height: olcu.h, transform: p.rotate ? `rotate(${p.rotate}deg)` : undefined }}
                data-parca-id={p.id}
                onPointerDown={(e) => parcaBas(e, p)}
              >
                {p.type === KY_MODUL ? <KyModul attrs={p.attrs} olcu={olcu} /> : createElement(p.type, { ...(p.attrs || {}), style: { display: 'block' } })}
              </div>
            </div>
          ))}
          <svg className="sema-katman" width="1" height="1" aria-hidden="true">
            {proje.connections.map(([a, b, renk], i) => {
              const pa = konumlar.get(a);
              const pb = konumlar.get(b);
              if (!pa || !pb) return null;
              const d = kabloYolu(pa, pb, i);
              const isaret = isaretler?.kablolar?.[i];
              const odakta = isaretler?.odak?.kablolar?.includes(i);
              const soluk = (secili != null && secili !== i) || (isaretler?.odak && !odakta);
              return (
                <g key={i} className={`kablo${secili === i ? ' secili' : ''}${soluk ? ' soluk' : ''}${isaret ? ` isaret-${isaret}` : ''}${odakta ? ' odakta' : ''}`} onClick={(e) => { e.stopPropagation(); onSec?.(i); }} onPointerDown={(e) => e.stopPropagation()}>
                  <path d={d} className="kablo-tutamak" />
                  {(secili === i || isaret) && <path d={d} className="kablo-hale" />}
                  <path d={d} className="kablo-kenar" pathLength={1} />
                  <path d={d} className="kablo-cizgi" pathLength={1} style={{ stroke: renkKodu(renk), '--sira': i }} />
                </g>
              );
            })}
            {[...konumlar.entries()].map(([uc, k]) => {
              const bagli = bagliUclar.has(uc);
              const vurgu = seciliUclar.includes(uc) || bekleyen === uc;
              return (
                <circle
                  key={uc}
                  cx={k.x}
                  cy={k.y}
                  r={vurgu ? 7 : 4}
                  className={`pin${bagli ? ' bagli' : ''}${vurgu ? ' vurgu' : ''}${!canli && onDegis ? ' secilebilir' : ''}`}
                  onPointerEnter={(e) => pinUzerinde(e, uc)}
                  onPointerLeave={() => setIpucu(null)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => pinTikla(e, uc)}
                />
              );
            })}
            {seciliUclar.map((uc) => {
              const k = konumlar.get(uc);
              if (!k) return null;
              const yazi = k.pin.name;
              const en = yazi.length * 7.5 + 14;
              return (
                <g key={`etiket-${uc}`} className="pin-etiket" transform={`translate(${k.x + 10}, ${k.y - 26})`}>
                  <rect width={en} height="20" rx="5" />
                  <text x={en / 2} y="14">{yazi}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {ipucu && (
          <div className="sema-ipucu" style={{ left: ipucu.x + 14, top: ipucu.y + 14 }} role="status">
            <strong>{ipucu.baslik}</strong>
            {ipucu.tur && <span>{ipucu.tur}</span>}
            {ipucu.bagli.length > 0 ? <span>Bağlı: {ipucu.bagli.join(', ')}</span> : <span className="soluk-yazi">Boş pin</span>}
          </div>
        )}
        {bekleyen && (
          <div className="sema-durum" role="status">İkinci pini seç. Vazgeçmek için Esc.</div>
        )}
      </div>
      {!onizleme && <div className="sema-kipler" role="group" aria-label="Şema kipi">
        {onDegis && !zorlaCanli && (
          <button type="button" aria-pressed={!canli} onClick={() => { setKip('tasi'); }}>✋ Taşı ve bağla</button>
        )}
        {!zorlaCanli && <button type="button" aria-pressed={canli} onClick={() => { setKip('canli'); setBekleyen(null); }}>▶ Canlı dene</button>}
      </div>}
      {!onizleme && <div className="sema-araclar">
        <button type="button" onClick={() => yakinlastir(1.25)} aria-label="Yakınlaştır">+</button>
        <button type="button" onClick={() => yakinlastir(0.8)} aria-label="Uzaklaştır">−</button>
        <button type="button" onClick={() => { elleOynandi.current = false; sigdir(); }}>Sığdır</button>
      </div>}
    </div>
  );
}
