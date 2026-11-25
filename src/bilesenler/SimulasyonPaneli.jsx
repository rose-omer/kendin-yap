import { useEffect, useId, useRef, useState } from 'react';
import { simulasyonBaslat, simulasyonHazirlik, simulasyonKontrolleri } from '../simulasyon/simulasyon.js';
import AgPaneli from './AgPaneli.jsx';
import KablosuzPaneli, { agBirlestir } from './KablosuzPaneli.jsx';
import { bildir } from './Bildirim.jsx';

const DURUM_YAZI = {
  hazir: 'Hazır. Kod bu bilgisayarda derlenir ve tarayıcıda çalışır.',
  derleniyor: 'Kod derleniyor… İlk derleme 10–30 saniye sürebilir.',
  calisiyor: 'Çalışıyor. Butona bas, düğmeyi çevir, kaydırıcıyı oynat.',
  hata: 'Kod derlenemedi. Ayrıntı Simülasyon sekmesinde.',
  calismaHatasi: 'Kod çalışırken durdu. Ayrıntı Simülasyon sekmesinde.',
};

// Simülasyonun bütün durumu tek yerde: Bağlantılar adımındaki çalışma masası bunu paylaşır.
export function useSimulasyon(proje, semaRef) {
  const [durum, setDurum] = useState('hazir');
  const [cikti, setCikti] = useState('');
  const [seri, setSeri] = useState('');
  const [ayarlar, setAyarlar] = useState({});
  const [ag, setAg] = useState({});
  const simRef = useRef(null);
  const hazirlik = simulasyonHazirlik(proje);
  const kontroller = hazirlik.uygun ? simulasyonKontrolleri(proje) : [];

  useEffect(() => () => simRef.current?.durdur(), []);

  function durdur() {
    simRef.current?.durdur();
    simRef.current = null;
    setDurum('hazir');
  }

  async function baslat() {
    simRef.current?.durdur();
    simRef.current = null;
    setDurum('derleniyor');
    setCikti('');
    setSeri('');
    setAg({});
    let sonuc;
    try {
      const yanit = await fetch('/__derle', { method: 'POST', body: JSON.stringify({ kart: hazirlik.kart.type, kod: proje.kod?.icerik || '' }) });
      sonuc = await yanit.json();
    } catch {
      sonuc = { tamam: false, cikti: 'Derleme sunucusuna ulaşılamadı. Siteyi Başlat.cmd ile açtığından emin ol.' };
    }
    if (!sonuc.tamam) {
      setCikti(sonuc.cikti);
      setDurum('hata');
      bildir('Kod derlenemedi', 'hata');
      return;
    }
    setAyarlar(Object.fromEntries(kontroller.map((k) => [k.anahtar, k.ilk ?? 0])));
    setDurum('calisiyor');
    // Şema canlı kipe geçsin diye bir kare bekle, sonra parçaları bul.
    requestAnimationFrame(() => {
      simRef.current = simulasyonBaslat({
        proje,
        hex: sonuc.hex,
        wasm: sonuc.wasm,
        onHata: (mesaj) => { setCikti(mesaj); setDurum('calismaHatasi'); },
        onAg: (d) => setAg((a) => agBirlestir(a, d)),
        elemanBul: (id) => semaRef.current?.querySelector(`[data-parca-id="${CSS.escape(id)}"]`)?.firstElementChild,
        onSeri: (metin) => setSeri((s) => (s + metin).slice(-6000)),
      });
      bildir('Simülasyon başladı');
    });
  }

  function ayarla(anahtar, deger) {
    setAyarlar((a) => ({ ...a, [anahtar]: deger }));
    simRef.current?.ayarla(anahtar, deger);
  }

  return {
    durum, cikti, seri, setSeri, ayarlar, ag, setAg, hazirlik, kontroller,
    calisiyor: durum === 'calisiyor',
    sim: () => simRef.current,
    baslat, durdur, ayarla,
  };
}

export function SimAraCubugu({ s }) {
  if (!s.hazirlik.uygun) return <p className="soluk-yazi sim-cubuk-not">Simülasyon: {s.hazirlik.neden}</p>;
  return (
    <div className="sim-cubuk">
      {s.calisiyor ? (
        <button type="button" className="dugme tehlike" onClick={s.durdur}>■ Durdur</button>
      ) : (
        <button type="button" className="dugme" onClick={s.baslat} disabled={s.durum === 'derleniyor'}>
          {s.durum === 'derleniyor' ? 'Derleniyor…' : '▶ Simülasyonu başlat'}
        </button>
      )}
      <span className={`sim-durum ${s.durum}`} role="status">{DURUM_YAZI[s.durum]}</span>
      {s.durum === 'derleniyor' && <span className="ilerleme-seridi" aria-hidden="true" />}
    </div>
  );
}

export function SimKontrolleri({ s }) {
  const kimlik = useId();
  return (
    <div className="sim-sekme">
      {s.hazirlik.desteksiz?.length > 0 && <p className="soluk-yazi">Simülasyonda tepki vermez: {s.hazirlik.desteksiz.join(', ')}.</p>}
      {(s.durum === 'hata' || s.durum === 'calismaHatasi') && <pre className="kod-kutu hata-ciktisi">{s.cikti}</pre>}
      {!s.calisiyor && s.durum !== 'hata' && s.durum !== 'calismaHatasi' && (
        <p className="soluk-yazi">Başlatınca sensör ayarları burada görünür. Şemadaki buton ve düğmelere de basabilirsin.</p>
      )}
      {s.calisiyor && !s.kontroller.length && <p className="soluk-yazi">Bu projede elle ayarlanan sensör yok. Şemadaki buton ve düğmeleri kullan.</p>}
      {s.calisiyor && s.kontroller.length > 0 && (
        <div className="sim-kontroller">
          {s.kontroller.map((k) => (
            <div key={k.anahtar} className="sim-kontrol">
              {k.tur === 'kaydirici' ? (
                <>
                  <label htmlFor={`${kimlik}-${k.anahtar}`}>{k.ad} · {k.etiket}: <strong>{s.ayarlar[k.anahtar]} {k.birim}</strong></label>
                  <input id={`${kimlik}-${k.anahtar}`} type="range" min={k.min} max={k.max} value={s.ayarlar[k.anahtar] ?? k.ilk} onChange={(e) => s.ayarla(k.anahtar, Number(e.target.value))} />
                </>
              ) : k.tur === 'kumanda' ? (
                <fieldset className="sim-kumanda">
                  <legend>{k.ad} · {k.etiket}</legend>
                  {k.tuslar.map(([ad, kod]) => (
                    <button key={kod} type="button" className="dugme ikincil" aria-label={`Kumanda tuşu ${ad}`} onClick={() => s.sim()?.ir?.(k.id, kod)}>{ad}</button>
                  ))}
                </fieldset>
              ) : k.tur === 'anahtar' ? (
                <label className="sim-anahtar">
                  <input type="checkbox" checked={!!s.ayarlar[k.anahtar]} onChange={(e) => s.ayarla(k.anahtar, e.target.checked ? 1 : 0)} />
                  {k.ad}: {k.etiket}
                </label>
              ) : (
                <button type="button" className="dugme ikincil" onClick={() => s.sim()?.hareket(k.id)}>{k.ad}: {k.etiket}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function kablosuzVar(s) {
  return s.calisiyor && !!(s.ag.wifi || s.ag.http?.length || s.ag.mqtt || s.ag.bt || s.ag.ble);
}

export function KablosuzSekmesi({ s }) {
  const sim = s.sim();
  if (!s.calisiyor || !sim) return <p className="soluk-yazi">Simülasyon çalışınca Wi-Fi, MQTT ve Bluetooth burada görünür.</p>;
  return (
    <>
      {sim.webIstek && <AgPaneli ag={s.ag} webIstek={sim.webIstek} />}
      {sim.mqttYayinla && <KablosuzPaneli ag={s.ag} sim={sim} onKayit={(d) => s.setAg((a) => agBirlestir(a, d))} />}
    </>
  );
}

// Alttaki seri ekran: açılıp kapanır.
export function SeriDok({ s }) {
  const [acik, setAcik] = useState(true);
  const [giris, setGiris] = useState('');
  const seriRef = useRef(null);
  const kimlik = useId();
  useEffect(() => {
    const kutu = seriRef.current;
    if (kutu) kutu.scrollTop = kutu.scrollHeight;
  }, [s.seri, acik]);
  const satirSayisi = s.seri ? s.seri.split('\n').filter(Boolean).length : 0;
  return (
    <section className={`seri-dok${acik ? ' acik' : ''}`} aria-labelledby={`${kimlik}-b`}>
      <div className="seri-dok-ust">
        <button type="button" className="seri-dok-ac" aria-expanded={acik} aria-controls={`${kimlik}-govde`} onClick={() => setAcik((a) => !a)}>
          <span aria-hidden="true">{acik ? '▾' : '▸'}</span> <span id={`${kimlik}-b`}>Seri ekran</span>
          {satirSayisi > 0 && <span className="rozet">{satirSayisi}</span>}
        </button>
        {acik && s.seri && <button type="button" className="dugme bag" onClick={() => s.setSeri('')}>Temizle</button>}
      </div>
      <div id={`${kimlik}-govde`} hidden={!acik}>
        <pre ref={seriRef} className="seri-ekran" role="log" aria-label="Seri ekran çıktısı">{s.seri || (s.calisiyor ? 'Henüz yazı yok.' : 'Simülasyon başlayınca kodun yazdıkları burada görünür.')}</pre>
        {s.calisiyor && s.sim()?.seriGonder && (
          <form
            className="satir seri-giris"
            onSubmit={(e) => {
              e.preventDefault();
              s.sim()?.seriGonder(`${giris}\n`);
              s.setSeri((x) => `${x}> ${giris}\n`);
              setGiris('');
            }}
          >
            <label htmlFor={`${kimlik}-g`} className="gizli">Seri porta yaz</label>
            <input id={`${kimlik}-g`} value={giris} onChange={(e) => setGiris(e.target.value)} placeholder="ESP32'ye yaz (Serial.read), Enter ile gönder" />
            <button type="submit" className="dugme ikincil">Gönder</button>
          </form>
        )}
      </div>
    </section>
  );
}
