import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// İlk ziyaret rehberi: bir projeye ilk girişte 3 kısa ipucu gösterir, sonra bir daha çıkmaz.
const ANAHTAR = 'ky.rehber';
const ADIMLAR = [
  { hedef: '.adim-ilerleme', baslik: 'Buradan başla', metin: 'Her proje 6 adımdır. Bu çubuktan sırayla ilerle; bitirdiğin adımda ✓ çıkar.' },
  { hedef: '.demo-sahne, .adim-baslik', baslik: 'Önce demoyu izle', metin: 'Canlı demo, proje bitince nasıl çalışacağını gösterir. Kod gerçekten çalışır.' },
  { hedef: '.adimlar a[href$="/baglanti"]', baslik: 'Kabloları tak, simülasyonu başlat', metin: 'Bağlantılar adımında kabloları tek tek tak. ▶ Simülasyonu başlat ile devreyi dene.' },
];

function gorulduMu() {
  try {
    return localStorage.getItem(ANAHTAR) === 'bitti';
  } catch {
    return true;
  }
}

export default function IlkRehber() {
  const [adim, setAdim] = useState(() => (gorulduMu() ? -1 : 0));
  const [konum, setKonum] = useState(null);
  const kartRef = useRef(null);

  function bitir() {
    try {
      localStorage.setItem(ANAHTAR, 'bitti');
    } catch {
      // depolama kapalı: rehber bu oturumda kapanır
    }
    setAdim(-1);
  }

  useLayoutEffect(() => {
    if (adim < 0) return undefined;
    const hesapla = () => {
      const el = document.querySelector(ADIMLAR[adim].hedef);
      if (!el) return setKonum(null);
      const r = el.getBoundingClientRect();
      setKonum({ x: r.left, y: r.top, w: r.width, h: r.height });
    };
    const el = document.querySelector(ADIMLAR[adim].hedef);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    hesapla();
    const zaman = setTimeout(hesapla, 450);
    window.addEventListener('scroll', hesapla, { passive: true });
    window.addEventListener('resize', hesapla);
    return () => {
      clearTimeout(zaman);
      window.removeEventListener('scroll', hesapla);
      window.removeEventListener('resize', hesapla);
    };
  }, [adim]);

  useEffect(() => {
    if (adim >= 0) kartRef.current?.focus();
  }, [adim]);

  if (adim < 0 || !konum) return null;
  const a = ADIMLAR[adim];
  const altta = konum.y + konum.h + 190 < window.innerHeight;
  const kartSol = Math.max(12, Math.min(konum.x, window.innerWidth - 332));
  return (
    <div className="rehber" role="dialog" aria-modal="false" aria-labelledby="rehber-baslik" onKeyDown={(e) => e.key === 'Escape' && bitir()}>
      <div className="rehber-cerceve" style={{ left: konum.x - 6, top: konum.y - 6, width: konum.w + 12, height: konum.h + 12 }} />
      <div
        ref={kartRef}
        tabIndex={-1}
        className="rehber-kart"
        style={{ left: kartSol, top: altta ? konum.y + konum.h + 14 : Math.max(12, konum.y - 176) }}
      >
        <div className="soluk-yazi rehber-sayac">{adim + 1} / {ADIMLAR.length}</div>
        <h3 id="rehber-baslik">{a.baslik}</h3>
        <p>{a.metin}</p>
        <div className="satir arasi">
          <button type="button" className="dugme bag" onClick={bitir}>Rehberi kapat</button>
          <button type="button" className="dugme" onClick={() => (adim < ADIMLAR.length - 1 ? setAdim(adim + 1) : bitir())}>
            {adim < ADIMLAR.length - 1 ? 'İleri →' : 'Başlayalım'}
          </button>
        </div>
      </div>
    </div>
  );
}
