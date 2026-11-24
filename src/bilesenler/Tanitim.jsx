import { useEffect, useRef, useState } from 'react';
import Sema from './Sema.jsx';
import { simulasyonBaslat, simulasyonHazirlik } from '../simulasyon/simulasyon.js';
import { asilProje, ozellikEtiketleri } from '../proje.js';

// Projenin vitrini: ne işe yarar, nasıl çalışır, bitince nasıl görünür ve kendi kendine oynayan canlı demo.
// Demo adımları proje dosyasındaki tanitim.demo listesinden gelir:
//   { sure: ms, yazi: 'açıklama', eylem: { tur: 'ayarla' | 'bas' | 'birak' | 'pot' | 'anahtar' | 'hareket'
//     | 'mqtt' | 'btbaglan' | 'bt' | 'blebaglan' | 'bleyaz' | 'web', ... } }

function eylemUygula(e, sim, elemanBul) {
  if (!e || !sim) return;
  const el = e.id ? elemanBul(e.id) : null;
  if (e.tur === 'ayarla') sim.ayarla(e.anahtar, e.deger);
  if (e.tur === 'bas' && el) el.pressed = true;
  if (e.tur === 'birak' && el) el.pressed = false;
  if (e.tur === 'pot' && el) el.value = e.deger;
  if (e.tur === 'anahtar') sim.ayarla(e.anahtar, e.deger);
  if (e.tur === 'hareket') sim.hareket(e.id);
  if (e.tur === 'mqtt') sim.mqttYayinla?.(e.konu, e.veri);
  if (e.tur === 'btbaglan') sim.btBaglan?.(true);
  if (e.tur === 'bt') sim.btGonder?.(`${e.veri}\n`);
  if (e.tur === 'blebaglan') sim.bleBaglan?.(true);
  if (e.tur === 'bleyaz') sim.bleYaz?.(e.no, e.veri);
  if (e.tur === 'web') sim.webIstek?.('GET', e.yol, e.sorgu || '').catch(() => {});
}

export function CanliDemo({ proje, otomatik = false }) {
  const [durum, setDurum] = useState('hazir'); // hazir | yukleniyor | oynuyor | hata
  const [adim, setAdim] = useState(0);
  const [sonSatir, setSonSatir] = useState('');
  const [hata, setHata] = useState('');
  const kapRef = useRef(null);
  const simRef = useRef(null);
  const zamanRef = useRef(null);
  const adimlar = (proje.tanitim || asilProje(proje.id)?.tanitim)?.demo || [];
  const hazirlik = simulasyonHazirlik(proje);
  const elemanBul = (id) => kapRef.current?.querySelector(`[data-parca-id="${CSS.escape(id)}"]`)?.firstElementChild;

  function durdur() {
    clearTimeout(zamanRef.current);
    simRef.current?.durdur();
    simRef.current = null;
    setDurum('hazir');
    setAdim(0);
  }
  useEffect(() => () => { clearTimeout(zamanRef.current); simRef.current?.durdur(); }, []);

  // Otomatik kip (ana sayfa): görünür olunca oynat, görünmez olunca durdur. Hareketi azalt açıksa oynatma.
  const durumRef = useRef(durum);
  durumRef.current = durum;
  useEffect(() => {
    if (!otomatik || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const kap = kapRef.current;
    const gozcu = new IntersectionObserver(([g]) => {
      if (g.isIntersecting && durumRef.current === 'hazir') oynat();
      if (!g.isIntersecting && durumRef.current === 'oynuyor') durdur();
    }, { threshold: 0.4 });
    gozcu.observe(kap);
    return () => gozcu.disconnect();
    // oynat/durdur her çizimde yeniden tanımlanır; gözcü yalnız bir kez kurulmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otomatik]);

  async function oynat() {
    setDurum('yukleniyor');
    setHata('');
    setSonSatir('');
    let sonuc;
    try {
      const y = await fetch('/__derle', { method: 'POST', body: JSON.stringify({ kart: hazirlik.kart.type, kod: proje.kod?.icerik || '' }) });
      sonuc = await y.json();
    } catch {
      sonuc = { tamam: false, cikti: 'Derleme sunucusuna ulaşılamadı.' };
    }
    if (!sonuc.tamam) {
      setHata('Kod derlenemedi; ayrıntı için Bağlantılar adımındaki simülasyonu aç.');
      setDurum('hata');
      return;
    }
    setDurum('oynuyor');
    const baslat = () => {
      simRef.current?.durdur();
      simRef.current = simulasyonBaslat({
        proje,
        hex: sonuc.hex,
        wasm: sonuc.wasm,
        elemanBul,
        sessiz: true,
        onSeri: (m) => {
          const satirlar = m.split('\n').map((x) => x.trim()).filter(Boolean);
          if (satirlar.length) setSonSatir(satirlar.at(-1));
        },
        onHata: () => {},
      });
      // Adımları sırayla oynat; bitince baştan başla (gif gibi).
      const oyna = (i) => {
        if (i >= adimlar.length) {
          zamanRef.current = setTimeout(baslat, 1200);
          return;
        }
        setAdim(i);
        eylemUygula(adimlar[i].eylem, simRef.current, elemanBul);
        zamanRef.current = setTimeout(() => oyna(i + 1), adimlar[i].sure || 2500);
      };
      oyna(0);
    };
    requestAnimationFrame(baslat);
  }

  const yazi = durum === 'oynuyor' ? adimlar[adim]?.yazi : null;
  return (
    <div className="demo">
      <div className="demo-sahne" ref={kapRef}>
        <Sema proje={proje} onizleme zorlaCanli={durum === 'oynuyor'} />
        {durum !== 'oynuyor' && (
          <div className="demo-ortu">
            {hazirlik.uygun && adimlar.length > 0 ? (
              <button type="button" className="dugme demo-oynat" onClick={oynat} disabled={durum === 'yukleniyor'}>
                {durum === 'yukleniyor' ? 'Hazırlanıyor…' : '▶ Canlı demoyu oynat'}
              </button>
            ) : (
              <span className="soluk-yazi demo-not">Bitince böyle görünecek</span>
            )}
          </div>
        )}
        {yazi && (
          <div className="demo-yazi" aria-live="polite">
            <span className="demo-no">{adim + 1}/{adimlar.length}</span> {yazi}
          </div>
        )}
      </div>
      {durum === 'oynuyor' && (
        <div className="demo-alt">
          <span className="soluk-yazi demo-seri" title="Seri ekrandaki son satır">{sonSatir ? `Seri: ${sonSatir}` : ' '}</span>
          <button type="button" className="dugme ikincil" onClick={durdur}>■ Durdur</button>
        </div>
      )}
      {hata && <p className="kutu hata">{hata}</p>}
    </div>
  );
}

export default function Tanitim({ proje }) {
  // Yerel kopyada tanıtım yoksa (eski kopya) asıl şablondakini göster.
  const t = proje.tanitim || asilProje(proje.id)?.tanitim || {};
  return (
    <section className="tanitim" aria-label="Proje tanıtımı">
      <div className="tanitim-gorsel">
        <CanliDemo proje={proje} />
        <p className="soluk-yazi">Gerçek görünümde devre. Demo, kodu gerçekten çalıştırır; düğmelere kendisi basar.</p>
      </div>
      <div className="tanitim-metin">
        <ul className="etiketler" aria-label="Özellikler">
          {ozellikEtiketleri(proje).map((e) => <li key={e.ad} className={`etiket ${e.tur}`}>{e.ad}</li>)}
        </ul>
        <h3>Ne işe yarar?</h3>
        <p>{t.amac || proje.ozet || 'Açıklama yok.'}</p>
        {t.nasil?.length > 0 && (
          <>
            <h3>Nasıl çalışır?</h3>
            <ol className="nasil-adimlari">
              {t.nasil.map((n, i) => <li key={i}>{n}</li>)}
            </ol>
          </>
        )}
        {t.ogrenilenler?.length > 0 && (
          <>
            <h3>Ne öğreneceksin?</h3>
            <ul className="etiketler">
              {t.ogrenilenler.map((o) => <li key={o} className="etiket ogren">{o}</li>)}
            </ul>
          </>
        )}
        <p className="tanitim-ozet soluk-yazi">
          {proje.zorluk && <>Zorluk: <strong>{proje.zorluk}</strong> · </>}
          {proje.sure && <>Süre: <strong>{proje.sure}</strong> · </>}
          {proje.parts.length} parça · {proje.connections.length} kablo
        </p>
      </div>
    </section>
  );
}
