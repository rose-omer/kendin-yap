import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Ana from './sayfalar/Ana.jsx';
import Proje, { ADIMLAR } from './sayfalar/Proje.jsx';
import Kutuphane from './sayfalar/Kutuphane.jsx';
import Yardim from './sayfalar/Yardim.jsx';
import Logo from './bilesenler/Logo.jsx';
import { BildirimAlani } from './bilesenler/Bildirim.jsx';

const TEMALAR = [
  { deger: 'sistem', ad: 'Sistem teması', simge: '◐' },
  { deger: 'light', ad: 'Açık tema', simge: '☀' },
  { deger: 'dark', ad: 'Koyu tema', simge: '☾' },
];

function TemaDugmesi() {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('ky.tema') || 'sistem';
    } catch {
      return 'sistem';
    }
  });
  const simdiki = TEMALAR.find((t) => t.deger === tema) || TEMALAR[0];
  const sonraki = TEMALAR[(TEMALAR.indexOf(simdiki) + 1) % TEMALAR.length];
  function degistir() {
    const yeni = sonraki.deger;
    const uygula = () => {
      if (yeni === 'sistem') delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = yeni;
      flushSync(() => setTema(yeni));
    };
    try {
      localStorage.setItem('ky.tema', yeni);
    } catch {
      // depolama kapalı: tema yalnız bu oturumda geçerli
    }
    gecis(uygula);
  }
  return (
    <button type="button" className="tema-dugmesi" onClick={degistir} aria-label={`${simdiki.ad}. Değiştirmek için bas.`} title={`${simdiki.ad} (değiştir)`}>
      <span aria-hidden="true">{simdiki.simge}</span>
    </button>
  );
}

const adimSirasi = (adres) => {
  const [, bolum, , adim] = adres.split('/');
  return bolum === 'proje' ? ADIMLAR.findIndex((a) => a.id === adim) : -1;
};

// Görünüm geçişi başlat; üst üste gelen geçişte tarayıcının "atlandı" hatasını yut.
function gecis(uygula) {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    uygula();
    return;
  }
  const g = document.startViewTransition(uygula);
  g.ready.catch(() => {});
  g.finished.catch(() => {});
}

// Adres değişince sayfayı View Transitions ile değiştir. Proje adımlarında ileri/geri yönü işaretlenir.
function useAdres() {
  const [adres, setAdres] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    let onceki = window.location.hash.slice(1) || '/';
    const degisti = () => {
      const yeni = window.location.hash.slice(1) || '/';
      const a = adimSirasi(onceki);
      const b = adimSirasi(yeni);
      const ayniProje = onceki.split('/')[2] === yeni.split('/')[2];
      document.documentElement.dataset.yon = ayniProje && a >= 0 && b >= 0 ? (b > a ? 'ileri' : b < a ? 'geri' : '') : '';
      onceki = yeni;
      gecis(() => flushSync(() => setAdres(yeni)));
    };
    window.addEventListener('hashchange', degisti);
    return () => window.removeEventListener('hashchange', degisti);
  }, []);
  return adres;
}

const MENU = [
  { yol: '/', ad: 'Projeler', simge: 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z' },
  { yol: '/parcalar', ad: 'Parçalar', simge: 'M8 3v4M16 3v4M8 17v4M16 17v4M3 8h4M3 16h4M17 8h4M17 16h4M7 7h10v10H7z' },
  { yol: '/yardim', ad: 'Yardım', simge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17h.01' },
];

function Simge({ yol }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={yol} />
    </svg>
  );
}

export default function App() {
  const adres = useAdres();
  const [, bolum, id, adim] = adres.split('/');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [bolum, id]);

  let sayfa;
  if (bolum === 'proje' && id) sayfa = <Proje key={id} id={decodeURIComponent(id)} adim={adim} />;
  else if (bolum === 'parcalar') sayfa = <Kutuphane />;
  else if (bolum === 'yardim') sayfa = <Yardim />;
  else sayfa = <Ana />;

  const etkin = ['parcalar', 'yardim'].includes(bolum) ? `/${bolum}` : '/';
  const menu = (sinif) => (
    <ul className={sinif}>
      {MENU.map((m) => (
        <li key={m.yol}>
          <a href={`#${m.yol}`} aria-current={etkin === m.yol ? 'page' : undefined}>
            <Simge yol={m.simge} />
            <span>{m.ad}</span>
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <a className="atla" href="#icerik" onClick={(e) => { e.preventDefault(); document.getElementById('icerik')?.focus(); }}>İçeriğe geç</a>
      <header className="ust">
        <a className="logo" href="#/">
          <Logo />
          Kendin Yap
        </a>
        <nav aria-label="Ana menü" className="ust-menu">{menu('')}</nav>
        <TemaDugmesi />
      </header>
      <main id="icerik" tabIndex={-1}>{sayfa}</main>
      <nav aria-label="Alt menü" className="alt-menu">{menu('')}</nav>
      <BildirimAlani />
    </>
  );
}
