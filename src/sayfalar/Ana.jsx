import { useId, useMemo, useState } from 'react';
import { benimProjelerim, hazirProjeler, ozellikEtiketleri, projeSil, yeniProje } from '../proje.js';
import { KARTLAR, parcaAdi } from '../veri/katalog.js';
import { KopyalaDugme } from '../bilesenler/Ortak.jsx';
import { ADIMLAR } from './Proje.jsx';
import { SIM_KARTLARI } from '../simulasyon/simulasyon.js';
import Sema from '../bilesenler/Sema.jsx';
import { CanliDemo } from '../bilesenler/Tanitim.jsx';

const KAYNAK_ADI = { claude: 'Claude yazdı', kopya: 'Hazır projeden', yerel: 'Senin', sablon: 'Hazır' };

function ProjeKarti({ proje, onSil }) {
  const kart = proje.parts.find((p) => KARTLAR[p.type]);
  const adres = `#/proje/${encodeURIComponent(proje.id)}/fikir`;
  return (
    <li className="kart proje-karti">
      {proje.parts.length > 0 && (
        <div className="kart-onizleme" aria-hidden="true">
          <Sema proje={proje} onizleme etiketGoster={false} />
        </div>
      )}
      <div className="kart-ust">
        <span className={`rozet ${proje.kaynak}`}>{KAYNAK_ADI[proje.kaynak]}</span>
        {proje.zorluk && <span className="rozet">{proje.zorluk}</span>}
        {kart && SIM_KARTLARI.includes(kart.type) && <span className="rozet sim">▶ Simülasyon</span>}
      </div>
      <h3>
        <a
          href={adres}
          className="kart-baglanti"
          onClick={(e) => {
            // Bu kartın resmi, açılan projenin vitrinine büyüyerek dönüşsün (View Transitions).
            const resim = e.currentTarget.closest('.proje-karti')?.querySelector('.kart-onizleme');
            if (resim) resim.style.viewTransitionName = 'proje-onizleme';
          }}
        >
          {proje.baslik}
        </a>
      </h3>
      <p className="kart-ozet">{proje.ozet || 'Açıklama yok.'}</p>
      <ul className="etiketler" aria-label="Özellikler">
        {ozellikEtiketleri(proje).map((e) => <li key={e.ad} className={`etiket ${e.tur}`}>{e.ad}</li>)}
      </ul>
      <p className="soluk-yazi">
        {kart ? parcaAdi(kart) : 'Kart seçilmedi'} · {proje.parts.length} parça{proje.sure ? ` · ${proje.sure}` : ''}
      </p>
      {onSil && (
        <button type="button" className="dugme bag kart-sil" onClick={onSil}>
          {proje.kaynak === 'kopya' ? 'Değişiklikleri sil' : 'Sil'}
        </button>
      )}
    </li>
  );
}

export default function Ana() {
  const [benim, setBenim] = useState(benimProjelerim);
  const [yeniAcik, setYeniAcik] = useState(false);
  const [claudeAcik, setClaudeAcik] = useState(false);
  const [ad, setAd] = useState('');
  const adId = useId();
  const hazir = hazirProjeler();
  const ornek = 'kendin-yap: Saksıdaki toprak kuruyunca su pompası 5 saniye çalışsın. ESP32 kullan.';

  function olustur(e) {
    e.preventDefault();
    const p = yeniProje(ad.trim() || 'Yeni proje');
    window.location.hash = `#/proje/${encodeURIComponent(p.id)}/fikir`;
  }

  function sil(p) {
    const soru = p.kaynak === 'kopya' ? `"${p.baslik}" üzerindeki değişikliklerin silinsin mi? Hazır proje ilk hâline döner.` : `"${p.baslik}" silinsin mi? Geri alınamaz.`;
    if (!window.confirm(soru)) return;
    projeSil(p.id);
    setBenim(benimProjelerim());
  }

  const demoProje = hazir.find((p) => p.id === 'servo-ayar') || hazir[0];
  const [suzgec, setSuzgec] = useState({ kart: '', ozellik: '', zorluk: '', arama: '' });
  const suzgecVar = Object.values(suzgec).some(Boolean);
  const tumOzellikler = useMemo(
    () => [...new Set([...hazir, ...benim].flatMap((p) => ozellikEtiketleri(p).map((e) => e.ad)))],
    [hazir, benim],
  );
  const kucuk = (x) => (x || '').toLocaleLowerCase('tr');
  const uyar = (p) => {
    const kart = p.parts.find((x) => KARTLAR[x.type])?.type || '';
    if (suzgec.kart === 'esp32' && !kart.includes('esp32')) return false;
    if (suzgec.kart === 'arduino' && !kart.includes('arduino')) return false;
    if (suzgec.ozellik && !ozellikEtiketleri(p).some((e) => e.ad === suzgec.ozellik)) return false;
    if (suzgec.zorluk && p.zorluk !== suzgec.zorluk) return false;
    if (suzgec.arama && !kucuk(`${p.baslik} ${p.ozet}`).includes(kucuk(suzgec.arama))) return false;
    return true;
  };
  const hazirSuzulmus = hazir.filter(uyar);
  const benimSuzulmus = benim.filter(uyar);
  const cip = (alan, deger, ad) => (
    <button type="button" className="cip" aria-pressed={suzgec[alan] === deger} onClick={() => setSuzgec((x) => ({ ...x, [alan]: x[alan] === deger ? '' : deger }))}>{ad}</button>
  );

  return (
    <div className="sayfa genis">
      <section className="kahraman belir">
        <div className="kahraman-metin">
          <p className="ust-baslik">ESP32 ve Arduino · ücretsiz · bu bilgisayarda</p>
          <h1>Fikrinden çalışan devreye, adım adım.</h1>
          <p className="buyuk-yazi">Parçaları seç, kabloları gerçek pinlere tak, kodu simülasyonda dene, sonra gerçek karta yükle.</p>
          <div className="kahraman-dugmeler">
            <a className="dugme buyuk" href="#hazir" onClick={(e) => { e.preventDefault(); document.getElementById('hazir')?.scrollIntoView({ behavior: 'smooth' }); }}>Hazır projeyle başla</a>
            <button type="button" className="dugme ikincil buyuk" aria-expanded={yeniAcik} onClick={() => { setYeniAcik((a) => !a); setClaudeAcik(false); }}>Boş proje aç</button>
            <button type="button" className="dugme ikincil buyuk" aria-expanded={claudeAcik} onClick={() => { setClaudeAcik((a) => !a); setYeniAcik(false); }}>Claude'a anlat</button>
          </div>
          {yeniAcik && (
            <form className="kutu belir" onSubmit={olustur}>
              <label htmlFor={adId}>Projenin adı</label>
              <div className="satir">
                <input id={adId} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="ör. Kapı alarmı" autoFocus />
                <button type="submit" className="dugme">Projeyi aç</button>
              </div>
            </form>
          )}
          {claudeAcik && (
            <div className="kutu belir">
              <h3>Claude ile proje kur</h3>
              <ol>
                <li>Claude Code'u aç.</li>
                <li>Fikrini "kendin-yap:" ile başlayarak yaz. Örnek:
                  <pre className="kod-kutu">{ornek}</pre>
                  <KopyalaDugme metin={ornek} etiket="Örneği kopyala" />
                </li>
                <li>Claude parçaları seçer, kabloları planlar, kodu yazar ve denetler.</li>
                <li>Proje bu sayfada "Projelerim" altında belirir. Sayfayı yenile.</li>
              </ol>
            </div>
          )}
        </div>
        {demoProje && (
          <div className="kahraman-demo">
            <CanliDemo proje={demoProje} otomatik />
            <p className="soluk-yazi">Canlı: "{demoProje.baslik}" projesi bu sayfada gerçekten çalışıyor.</p>
          </div>
        )}
      </section>

      <section aria-labelledby="nasil" className="zaman-bolumu">
        <h2 id="nasil" className="gizli">Her proje 6 adımda ilerler</h2>
        <ol className="zaman-cizgisi">
          {ADIMLAR.map((a, i) => (
            <li key={a.id}><span className="adim-no">{i + 1}</span><span><strong>{a.ad}</strong><span className="soluk-yazi"> · {a.kisa}</span></span></li>
          ))}
        </ol>
      </section>

      <section className="suzgec" aria-label="Projeleri süz">
        <div className="suzgec-satir">
          <label htmlFor={`${adId}-ara`} className="gizli">Projelerde ara</label>
          <input id={`${adId}-ara`} type="search" value={suzgec.arama} onChange={(e) => setSuzgec((x) => ({ ...x, arama: e.target.value }))} placeholder="Projelerde ara: alarm, sıcaklık, LED…" />
        </div>
        <div className="cipler" role="group" aria-label="Kart">
          {cip('kart', 'esp32', 'ESP32')}
          {cip('kart', 'arduino', 'Arduino')}
          <span className="cip-ayrac" aria-hidden="true" />
          {tumOzellikler.map((o) => <span key={o}>{cip('ozellik', o, o)}</span>)}
          <span className="cip-ayrac" aria-hidden="true" />
          {['Çok kolay', 'Kolay', 'Orta'].map((z) => <span key={z}>{cip('zorluk', z, z)}</span>)}
          {suzgecVar && <button type="button" className="dugme bag" onClick={() => setSuzgec({ kart: '', ozellik: '', zorluk: '', arama: '' })}>Süzgeci temizle</button>}
        </div>
      </section>

      {benimSuzulmus.length > 0 && (
        <section aria-labelledby="benim">
          <h2 id="benim">Projelerim</h2>
          <ul className="izgara">
            {benimSuzulmus.map((p) => <ProjeKarti key={p.id} proje={p} onSil={p.kaynak === 'claude' ? null : () => sil(p)} />)}
          </ul>
        </section>
      )}

      <section aria-labelledby="hazir-baslik" id="hazir">
        <h2 id="hazir-baslik">Hazır projeler <span className="soluk-yazi sayi">{hazirSuzulmus.length}</span></h2>
        {hazirSuzulmus.length ? (
          <ul className="izgara">
            {hazirSuzulmus.map((p) => <ProjeKarti key={p.id} proje={p} />)}
          </ul>
        ) : (
          <p className="kutu">Bu süzgeçle proje yok. <button type="button" className="dugme bag" onClick={() => setSuzgec({ kart: '', ozellik: '', zorluk: '', arama: '' })}>Süzgeci temizle</button></p>
        )}
      </section>
    </div>
  );
}
