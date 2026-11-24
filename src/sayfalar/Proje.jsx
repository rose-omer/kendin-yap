import { useEffect, useId, useRef, useState } from 'react';
import { pinVeri, projeGetir, projeKaydet, projeSil, yerelKopyaVar, asilProje, parcaListesi, pinTanimlari, SATICILAR, fiyatGetir, tl, ozellikEtiketleri, wokwiDiagram, wokwiYeniAdres, dosyaIndir } from '../proje.js';
import { denetle, ucCoz } from '../denetim.js';
import { KARTLAR, PARCALAR, parcaAdi, parcaBilgi, parcaOlcu } from '../veri/katalog.js';
import Sema, { KABLO_RENKLERI, renkAdi, renkKodu } from '../bilesenler/Sema.jsx';
import { KopyalaDugme, ParcaSecici, yeniParca } from '../bilesenler/Ortak.jsx';
import { useSimulasyon, SimAraCubugu, SimKontrolleri, KablosuzSekmesi, SeriDok, kablosuzVar } from '../bilesenler/SimulasyonPaneli.jsx';
import Tanitim from '../bilesenler/Tanitim.jsx';
import { bildir } from '../bilesenler/Bildirim.jsx';
import IlkRehber from '../bilesenler/IlkRehber.jsx';
import KodDuzenleyici, { hatalariAyikla } from '../bilesenler/KodDuzenleyici.jsx';
import { simulasyonHazirlik } from '../simulasyon/simulasyon.js';

export const ADIMLAR = [
  { id: 'fikir', ad: 'Fikir', kisa: 'Ne yapacağız?', ne: 'Projenin ne işe yaradığını oku, canlı demoyu oynat. Bitince nasıl görüneceğini gör.' },
  { id: 'parcalar', ad: 'Parçalar', kisa: 'Ne alacağız?', ne: 'Alınacak parçaları gör. Eksik parça varsa ekle.' },
  { id: 'baglanti', ad: 'Bağlantılar', kisa: 'Kablolar nereye?', ne: 'Kabloları sırayla tak. Her adımda hangi pinin nereye gittiği yanar.' },
  { id: 'kontrol', ad: 'Kontrol', kisa: 'Hata var mı?', ne: 'Kartı USB\'ye takmadan önce bağlantı hatalarını gör.' },
  { id: 'kod', ad: 'Kod', kisa: 'Karta ne yükleyeceğiz?', ne: 'Kodu kopyala, karta yükle. Önce Bağlantılar adımında ▶ ile simülasyonda dene.' },
  { id: 'test', ad: 'Test', kisa: 'Çalışıyor mu?', ne: 'Montaj ve test listesini tek tek işaretle.' },
];

function parcaAdiId(proje, uc) {
  const { id, pin } = ucCoz(uc);
  const p = proje.parts.find((x) => x.id === id);
  return { parca: p ? parcaAdi(p) : id, pin };
}

// ---------- 1. Fikir ----------
function Fikir({ proje, guncelle }) {
  const id = useId();
  const [yeniMadde, setYeniMadde] = useState('');
  const alan = (ad) => (e) => guncelle({ ...proje, [ad]: e.target.value });
  return (
    <>
    <Tanitim proje={proje} />
    <details className="duzenle-kutusu" open={!proje.parts.length}>
      <summary>Projeyi düzenle: ad, açıklama, gereksinimler</summary>
    <div className="adim-icerik dar">
      <label htmlFor={`${id}-baslik`}>Proje adı</label>
      <input id={`${id}-baslik`} value={proje.baslik} onChange={alan('baslik')} />
      <label htmlFor={`${id}-ozet`}>Ne yapacak?</label>
      <textarea id={`${id}-ozet`} rows={3} value={proje.ozet} onChange={alan('ozet')} placeholder="ör. Toprak kuruyunca pompa 5 saniye su verir." />
      <div className="satir iki">
        <div>
          <label htmlFor={`${id}-zorluk`}>Zorluk</label>
          <select id={`${id}-zorluk`} value={proje.zorluk || 'Kolay'} onChange={alan('zorluk')}>
            <option>Çok kolay</option><option>Kolay</option><option>Orta</option><option>Zor</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-sure`}>Tahmini süre</label>
          <input id={`${id}-sure`} value={proje.sure || ''} onChange={alan('sure')} placeholder="ör. 1 saat" />
        </div>
      </div>
      <h3>Gereksinimler</h3>
      <p className="soluk-yazi">Proje bitince doğru olması gerekenler. Test adımında bunları denersin.</p>
      <ul className="madde-liste">
        {(proje.gereksinimler || []).map((g, i) => (
          <li key={i}>
            <span>{g}</span>
            <button type="button" className="dugme bag" aria-label={`"${g}" gereksinimini sil`} onClick={() => guncelle({ ...proje, gereksinimler: proje.gereksinimler.filter((_, j) => j !== i) })}>Sil</button>
          </li>
        ))}
      </ul>
      <form className="satir" onSubmit={(e) => { e.preventDefault(); if (!yeniMadde.trim()) return; guncelle({ ...proje, gereksinimler: [...(proje.gereksinimler || []), yeniMadde.trim()] }); setYeniMadde(''); }}>
        <label htmlFor={`${id}-madde`} className="gizli">Yeni gereksinim</label>
        <input id={`${id}-madde`} value={yeniMadde} onChange={(e) => setYeniMadde(e.target.value)} placeholder="ör. Sıcaklığı ekranda göstersin" />
        <button type="submit" className="dugme ikincil">Ekle</button>
      </form>
    </div>
    </details>
    </>
  );
}

// ---------- 2. Parçalar ----------
function Parcalar({ proje, guncelle }) {
  const [secici, setSecici] = useState(false);
  const [fiyatlar, setFiyatlar] = useState({});
  const [fiyatDurum, setFiyatDurum] = useState({ calisiyor: false, bitti: 0 });
  const liste = parcaListesi(proje);
  function kaldir(pid) {
    const ad = parcaAdi(proje.parts.find((p) => p.id === pid));
    if (!window.confirm(`${ad} ve ona giden kablolar kaldırılsın mı?`)) return;
    guncelle({
      ...proje,
      parts: proje.parts.filter((p) => p.id !== pid),
      connections: proje.connections.filter(([a, b]) => ucCoz(a).id !== pid && ucCoz(b).id !== pid),
    });
  }
  async function fiyatlariGetir() {
    setFiyatDurum({ calisiyor: true, bitti: 0 });
    for (const [i, s] of liste.entries()) {
      try {
        const veri = await fiyatGetir(s);
        setFiyatlar((f) => ({ ...f, [s.ad]: veri }));
      } catch {
        setFiyatlar((f) => ({ ...f, [s.ad]: 'hata' }));
      }
      setFiyatDurum({ calisiyor: i < liste.length - 1, bitti: i + 1 });
    }
  }

  // Mağaza başına: o mağazada uygun ve stokta olan en ucuz ürün.
  const magazaEnIyi = (veri, ad) => veri?.magazalar?.find((m) => m.ad === ad)?.urunler
    .filter((u) => u.stok && u.uygunluk === 1)
    .sort((a, b) => a.fiyat - b.fiyat)[0];
  const fiyatVar = liste.some((s) => fiyatlar[s.ad] && fiyatlar[s.ad] !== 'hata');
  const enUcuzToplam = liste.reduce((t, s) => t + (fiyatlar[s.ad]?.enUcuz ? fiyatlar[s.ad].enUcuz.fiyat * (s.ek ? 1 : s.adet) : 0), 0);
  const eksik = liste.filter((s) => fiyatlar[s.ad] && !fiyatlar[s.ad]?.enUcuz).length;
  const magazaToplamlari = SATICILAR.map((v) => {
    let toplam = 0;
    let yok = 0;
    for (const s of liste) {
      const u = magazaEnIyi(fiyatlar[s.ad], v.ad);
      if (u) toplam += u.fiyat * (s.ek ? 1 : s.adet);
      else yok += 1;
    }
    return { ad: v.ad, toplam, yok };
  });

  return (
    <div className="adim-icerik">
      <div className="satir arasi">
        <h3>Alışveriş listesi</h3>
        <div className="satir">
          {liste.length > 0 && (
            <button type="button" className="dugme" onClick={fiyatlariGetir} disabled={fiyatDurum.calisiyor}>
              {fiyatDurum.calisiyor ? `Fiyatlar alınıyor… ${fiyatDurum.bitti}/${liste.length}` : 'Fiyatları karşılaştır'}
            </button>
          )}
          <button type="button" className="dugme ikincil" onClick={() => setSecici(true)}>+ Parça ekle</button>
        </div>
      </div>
      <p className="soluk-yazi">"Fiyatları karşılaştır" Robotistan, Direnc.net ve Motorobit'te arar; stokta olan en ucuz uygun ürünü bulur.</p>
      {!liste.length && <p className="kutu">Henüz parça yok. "+ Parça ekle" ile kart ve sensör seç.</p>}
      {liste.length > 0 && (
        <div className="tablo-kap">
          <table className="tablo">
            <thead>
              <tr>
                <th scope="col">Adet</th>
                <th scope="col">Parça</th>
                <th scope="col">En ucuz</th>
                {SATICILAR.map((v) => <th key={v.ad} scope="col">{v.ad}</th>)}
                <th scope="col"><span className="gizli">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {liste.map((s) => {
                const veri = fiyatlar[s.ad];
                return (
                  <tr key={s.ad}>
                    <td className="adet">{s.adet}</td>
                    <td><strong>{s.ad}</strong><br /><span className="soluk-yazi">{s.ozet}</span></td>
                    <td className="en-ucuz">
                      {veri === 'hata' && <span className="soluk-yazi">Alınamadı</span>}
                      {veri && veri !== 'hata' && (veri.enUcuz ? (
                        <a href={veri.enUcuz.url} target="_blank" rel="noreferrer">
                          <strong>{tl(veri.enUcuz.fiyat)}</strong> · {veri.enUcuz.magaza}
                          <span className="urun-adi">{veri.enUcuz.ad}</span>
                        </a>
                      ) : <span className="soluk-yazi">Uygun ürün bulunamadı. Mağazada elle ara.</span>)}
                      {!veri && <span className="soluk-yazi">—</span>}
                    </td>
                    {SATICILAR.map((v) => {
                      const u = magazaEnIyi(veri, v.ad);
                      return (
                        <td key={v.ad} className="magaza-hucre">
                          {u ? (
                            <a href={u.url} target="_blank" rel="noreferrer" title={u.ad}>{tl(u.fiyat)}</a>
                          ) : (
                            <a href={v.url(s.arama)} target="_blank" rel="noreferrer" className="soluk-yazi">{veri && veri !== 'hata' ? 'yok · ara' : 'ara'}</a>
                          )}
                        </td>
                      );
                    })}
                    <td>
                      {!s.ek && s.idler.length === 1 && (
                        <button type="button" className="dugme bag" onClick={() => kaldir(s.idler[0])}>Kaldır</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {fiyatVar && (
        <div className="kutu">
          <p><strong>En ucuzlarla toplam: {tl(enUcuzToplam)}</strong>{eksik ? ` (${eksik} parça bulunamadı)` : ''}. Kargo dahil değil; parçalar farklı mağazalardan gelir.</p>
          <p>Hepsini tek mağazadan alırsan (tek kargo):</p>
          <ul>
            {magazaToplamlari.map((m) => (
              <li key={m.ad}><strong>{m.ad}:</strong> {tl(m.toplam)}{m.yok ? ` — ${m.yok} parça bu mağazada yok` : ''}</li>
            ))}
          </ul>
          <p className="soluk-yazi">Fiyatlar mağaza sitelerinden şimdi alındı (KDV dahil). Satın almadan önce ürün sayfasında modeli kontrol et.</p>
        </div>
      )}
      {proje.parts.some((p) => parcaBilgi(p).not) && (
        <div className="kutu bilgi">
          <h3>Parça notları</h3>
          <ul>
            {proje.parts.filter((p) => parcaBilgi(p).not).map((p) => <li key={p.id}><strong>{parcaAdi(p)}:</strong> {parcaBilgi(p).not}</li>)}
          </ul>
        </div>
      )}
      <ParcaSecici
        acik={secici}
        onKapat={() => setSecici(false)}
        onSec={(o) => { guncelle({ ...proje, parts: [...proje.parts, yeniParca(o, proje)] }); setSecici(false); }}
      />
    </div>
  );
}

// ---------- 3. Bağlantılar ----------
function Baglanti({ proje, guncelle, secili, setSecili }) {
  const [duzenle, setDuzenle] = useState(false);
  const [seciliParca, setSeciliParca] = useState(null);
  const [kabloRengi, setKabloRengi] = useState('green');
  const [secici, setSecici] = useState(false);
  const semaRef = useRef(null);
  const notId = useId();
  const n = proje.connections.length;
  const bag = secili != null ? proje.connections[secili] : null;

  useEffect(() => {
    if (duzenle) return undefined;
    const tus = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') setSecili((s) => (s == null ? 0 : Math.min(n - 1, s + 1)));
      if (e.key === 'ArrowLeft') setSecili((s) => (s == null ? 0 : Math.max(0, s - 1)));
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [duzenle, n, setSecili]);

  function baglantiDegis(alanlar) {
    guncelle({ ...proje, connections: proje.connections.map((c, i) => (i === secili ? Object.assign([...c], alanlar) : c)) });
  }
  function kabloSil() {
    guncelle({ ...proje, connections: proje.connections.filter((_, i) => i !== secili) });
    setSecili(null);
  }
  function sirala(yon) {
    const j = secili + yon;
    if (j < 0 || j >= n) return;
    const c = [...proje.connections];
    [c[secili], c[j]] = [c[j], c[secili]];
    guncelle({ ...proje, connections: c });
    setSecili(j);
  }
  const parca = proje.parts.find((p) => p.id === seciliParca);
  const s = useSimulasyon(proje, semaRef);
  const [sekme, setSekme] = useState('kablolar');
  const [tamEkran, setTamEkran] = useState(false);
  const kablosuzProje = ozellikEtiketleri(proje).some((e) => e.tur === 'kablosuz');

  // Simülasyon başlayınca ya da hata verince ilgili sekmeye geç.
  useEffect(() => {
    if (s.durum === 'calisiyor' || s.durum === 'hata' || s.durum === 'calismaHatasi') setSekme('simulasyon');
  }, [s.durum]);
  useEffect(() => {
    if (!tamEkran) return undefined;
    const tus = (e) => e.key === 'Escape' && setTamEkran(false);
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [tamEkran]);

  const SEKMELER = [
    { id: 'kablolar', ad: `Kablolar (${n})` },
    { id: 'simulasyon', ad: 'Simülasyon' },
    ...(kablosuzProje ? [{ id: 'kablosuz', ad: 'Wi-Fi ve Bluetooth' }] : []),
  ];

  const kablolar = (
    <>
      <div className="satir arasi">
        <h3>{duzenle ? 'Kablo ve parça ayarları' : 'Kablo adımları'}</h3>
        <button type="button" className={duzenle ? 'dugme' : 'dugme ikincil'} aria-pressed={duzenle} onClick={() => { setDuzenle((d) => !d); setSeciliParca(null); }}>
          {duzenle ? 'Bitti' : 'Renk, not, sil'}
        </button>
      </div>

      {bag ? (
        <div className="adim-karti" aria-live="polite">
          <div className="soluk-yazi">Adım {secili + 1} / {n}</div>
          {(() => {
            const a = parcaAdiId(proje, bag[0]);
            const b = parcaAdiId(proje, bag[1]);
            return (
              <p className="baglanti-cumle">
                <span><strong>{a.parca}</strong> üzerindeki <span className="pin-adi">{a.pin}</span></span>
                <span className="ok" aria-hidden="true">↓</span>
                <span><strong>{b.parca}</strong> üzerindeki <span className="pin-adi">{b.pin}</span></span>
              </p>
            );
          })()}
          <p><span className="renk-nokta" style={{ background: renkKodu(bag[2]) }} aria-hidden="true" /> {renkAdi(bag[2])} kablo</p>
          {bag[4] && <p className="kutu bilgi">{bag[4]}</p>}
          {duzenle && (
            <>
              <fieldset className="renkler">
                <legend>Kablo rengi</legend>
                {KABLO_RENKLERI.map(([r, ad]) => (
                  <button key={r} type="button" className="renk-sec" aria-pressed={bag[2] === r} aria-label={ad} style={{ background: renkKodu(r) }} onClick={() => baglantiDegis({ 2: r })} />
                ))}
              </fieldset>
              <label htmlFor={notId}>Not (isteğe bağlı)</label>
              <input id={notId} value={bag[4] || ''} onChange={(e) => baglantiDegis({ 3: bag[3] || [], 4: e.target.value })} placeholder="ör. Uzun bacak (anot)" />
              <div className="satir">
                <button type="button" className="dugme ikincil" onClick={() => sirala(-1)} disabled={secili === 0}>Öne al</button>
                <button type="button" className="dugme ikincil" onClick={() => sirala(1)} disabled={secili === n - 1}>Sona al</button>
                <button type="button" className="dugme tehlike" onClick={kabloSil}>Kabloyu sil</button>
              </div>
            </>
          )}
          <div className="satir">
            <button type="button" className="dugme ikincil" disabled={secili === 0} onClick={() => setSecili(secili - 1)}>← Önceki</button>
            <button type="button" className="dugme" disabled={secili === n - 1} onClick={() => setSecili(secili + 1)}>Sonraki →</button>
          </div>
          <button type="button" className="dugme bag" onClick={() => setSecili(null)}>Tüm kabloları göster</button>
        </div>
      ) : (
        <div className="adim-karti">
          {n ? (
            <>
              <p>Tüm kablolar görünüyor. Tek tek takmak için ilk adımdan başla.</p>
              <button type="button" className="dugme" onClick={() => setSecili(0)}>1. kablodan başla</button>
            </>
          ) : (
            <p>Henüz kablo yok. Şemada bir pine, sonra ikinci pine tıkla.</p>
          )}
        </div>
      )}

      {duzenle && (
        <div className="kutu">
          <fieldset className="renkler">
            <legend>Yeni kablo rengi</legend>
            {KABLO_RENKLERI.map(([r, ad]) => (
              <button key={r} type="button" className="renk-sec" aria-pressed={kabloRengi === r} aria-label={ad} style={{ background: renkKodu(r) }} onClick={() => setKabloRengi(r)} />
            ))}
          </fieldset>
          <p className="soluk-yazi">Kırmızı: + besleme. Siyah: GND. Diğer renkler: sinyal.</p>
          <button type="button" className="dugme ikincil" onClick={() => setSecici(true)}>+ Parça ekle</button>
          {parca && (
            <div className="secili-parca">
              <strong>{parcaAdi(parca)}</strong>
              <div className="satir">
                <button type="button" className="dugme ikincil" onClick={() => guncelle({ ...proje, parts: proje.parts.map((p) => (p.id === parca.id ? { ...p, rotate: ((p.rotate || 0) + 90) % 360 } : p)) })}>90° döndür</button>
                <button
                  type="button"
                  className="dugme tehlike"
                  onClick={() => {
                    guncelle({ ...proje, parts: proje.parts.filter((p) => p.id !== parca.id), connections: proje.connections.filter(([a, b]) => ucCoz(a).id !== parca.id && ucCoz(b).id !== parca.id) });
                    setSeciliParca(null);
                    setSecili(null);
                  }}
                >
                  Parçayı sil
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!duzenle && n > 0 && (
        <ol className="kablo-listesi">
          {proje.connections.map((c, i) => {
            const a = parcaAdiId(proje, c[0]);
            const b = parcaAdiId(proje, c[1]);
            return (
              <li key={i}>
                <button type="button" aria-current={secili === i ? 'step' : undefined} onClick={() => setSecili(i)}>
                  <span className="renk-nokta" style={{ background: renkKodu(c[2]) }} aria-hidden="true" />
                  {a.parca} <b>{a.pin}</b> → {b.parca} <b>{b.pin}</b>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  return (
    <div className={`masa${tamEkran ? ' tam-ekran' : ''}`}>
      <div className="masa-ust">
        <SimAraCubugu s={s} />
        <button type="button" className="dugme ikincil" aria-pressed={tamEkran} onClick={() => setTamEkran((t) => !t)}>
          {tamEkran ? 'Küçült (Esc)' : '⤢ Tam ekran'}
        </button>
      </div>
      <div className="masa-govde">
        <div className="masa-sema" ref={semaRef}>
          <Sema
            zorlaCanli={s.calisiyor}
            proje={proje}
            duzenle={duzenle}
            secili={secili}
            onSec={setSecili}
            onDegis={guncelle}
            seciliParca={seciliParca}
            onParcaSec={setSeciliParca}
            kabloRengi={kabloRengi}
          />
        </div>
        <aside className="masa-yan" aria-label="Kablolar ve simülasyon">
          <div role="tablist" aria-label="Panel" className="sekmeler">
            {SEKMELER.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`sekme-${t.id}`}
                aria-selected={sekme === t.id}
                aria-controls={`sekme-panel-${t.id}`}
                onClick={() => setSekme(t.id)}
              >
                {t.ad}
                {t.id === 'kablosuz' && kablosuzVar(s) && <span className="sekme-nokta" aria-label="etkin" />}
                {t.id === 'simulasyon' && s.calisiyor && <span className="sekme-nokta" aria-label="çalışıyor" />}
              </button>
            ))}
          </div>
          {/* Paneller gizlenir ama sökülmez: mini tarayıcı, mesajlar ve yazılanlar kaybolmasın. */}
          <div role="tabpanel" id="sekme-panel-kablolar" aria-labelledby="sekme-kablolar" hidden={sekme !== 'kablolar'} className="sekme-panel">{kablolar}</div>
          <div role="tabpanel" id="sekme-panel-simulasyon" aria-labelledby="sekme-simulasyon" hidden={sekme !== 'simulasyon'} className="sekme-panel"><SimKontrolleri s={s} /></div>
          {kablosuzProje && (
            <div role="tabpanel" id="sekme-panel-kablosuz" aria-labelledby="sekme-kablosuz" hidden={sekme !== 'kablosuz'} className="sekme-panel"><KablosuzSekmesi s={s} /></div>
          )}
        </aside>
      </div>
      <SeriDok s={s} />
      <p className="soluk-yazi ipucu-satiri">
        Parçayı sürükle; kablo için bir pine, sonra ikinci pine tıkla. Simülasyon çalışırken butona bas, düğmeyi çevir. Pinin üstüne gel: adı görünür. ← → tuşlarıyla kablo adımlarında gez.
      </p>
      <ParcaSecici
        acik={secici}
        onKapat={() => setSecici(false)}
        onSec={(o) => { guncelle({ ...proje, parts: [...proje.parts, yeniParca(o, proje)] }); setSecici(false); }}
      />
    </div>
  );
}

// ---------- 4. Kontrol ----------
const SEVIYE = { hata: 'Hata', uyari: 'Uyarı', bilgi: 'Bilgi' };

function Kontrol({ proje, git }) {
  const sira = { hata: 0, uyari: 1, bilgi: 2 };
  const sonuc = denetle(proje, pinVeri).sort((a, b) => sira[a.seviye] - sira[b.seviye]);
  const say = (s) => sonuc.filter((x) => x.seviye === s).length;
  const [odak, setOdak] = useState(null); // üstüne gelinen ya da seçilen bulgu

  // Şemadaki işaretler: her kablo ve parça için en ağır seviye.
  const isaretler = { kablolar: {}, parcalar: {} };
  const agirlik = (a, b) => (a == null || sira[b] < sira[a] ? b : a);
  for (const s of sonuc) {
    if (s.seviye === 'bilgi') continue;
    for (const k of s.baglantilar) isaretler.kablolar[k] = agirlik(isaretler.kablolar[k], s.seviye);
    for (const p of s.parcalar) isaretler.parcalar[p] = agirlik(isaretler.parcalar[p], s.seviye);
  }
  const odakBulgu = odak != null ? sonuc[odak] : null;
  if (odakBulgu) isaretler.odak = { kablolar: odakBulgu.baglantilar, parcalar: odakBulgu.parcalar };

  return (
    <div className="kontrol-duzen">
      <div>
        {say('hata') === 0 && say('uyari') === 0 ? (
          <div className="kutu basari"><strong>Hata bulunmadı.</strong> Yine de USB'yi takmadan önce kabloları bir kez daha gözünle kontrol et.</div>
        ) : (
          <div className={`kutu ${say('hata') ? 'hata' : 'uyari'}`}>
            <strong>{say('hata')} hata, {say('uyari')} uyarı.</strong> Hataları düzeltmeden karta güç verme. Şemada kırmızı ve sarı yanan yerlere bak.
          </div>
        )}
        <p className="soluk-yazi">Bu denetim yaygın hataları yakalar; her hatayı yakalayamaz. Şüphede datasheet'e bak.</p>
        <ul className="denetim-listesi">
          {sonuc.map((s, i) => (
            <li
              key={i}
              className={`${s.seviye}${odak === i ? ' odak' : ''}`}
              onMouseEnter={() => setOdak(i)}
              onMouseLeave={() => setOdak(null)}
            >
              <span className="rozet">{SEVIYE[s.seviye]}</span>
              <div>
                <strong>{s.baslik}</strong>
                <p>{s.mesaj}</p>
                <div className="satir">
                  {(s.baglantilar.length > 0 || s.parcalar.length > 0) && (
                    <button type="button" className="dugme bag" onClick={() => setOdak(odak === i ? null : i)} onFocus={() => setOdak(i)}>
                      {odak === i ? 'İşareti kaldır' : 'Şemada işaretle'}
                    </button>
                  )}
                  {s.baglantilar.length > 0 && (
                    <button type="button" className="dugme bag" onClick={() => git('baglanti', s.baglantilar[0])}>Bağlantılarda düzelt →</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="kontrol-sema">
        <Sema proje={proje} isaretler={isaretler} onSec={(i) => {
          const b = sonuc.findIndex((s) => s.baglantilar.includes(i));
          setOdak(b >= 0 ? b : null);
        }} />
        <p className="soluk-yazi">Kırmızı: hata. Sarı: uyarı. Bir bulgunun üstüne gel; ilgili kablo ve parça öne çıkar.</p>
      </div>
    </div>
  );
}

// ---------- 5. Kod ----------
// Koddaki pin sabitlerini (const int X = 4; #define X 4) kart pinlerine ve kablolara eşler.
function pinSabitleri(proje) {
  const kart = proje.parts.find((p) => KARTLAR[p.type]);
  const kod = proje.kod?.icerik || '';
  const sabitler = {};
  if (!kart) return sabitler;
  const kartPinleri = parcaOlcu(kart, pinVeri)?.pins || [];
  for (const m of kod.matchAll(/(?:const\s+(?:int|uint8_t|byte|unsigned\s+int)\s+(\w+)\s*=\s*(A?\d+)\s*;|#define\s+(\w+)\s+(A?\d+)\b)/g)) {
    const ad = m[1] || m[3];
    const ham = m[2] || m[4];
    const deger = /^\d+$/.test(ham) ? Number(ham) : ham;
    const pin = kartPinleri.find((p) => KARTLAR[kart.type].kodPini(p.name) === deger);
    if (!pin) continue;
    const uc = `${kart.id}:${pin.name}`;
    const baglantilar = proje.connections.map((c, i) => (c[0] === uc || c[1] === uc ? i : -1)).filter((i) => i >= 0);
    const karsilar = baglantilar.map((i) => {
      const c = proje.connections[i];
      return parcaAdiId(proje, c[0] === uc ? c[1] : c[0]);
    });
    sabitler[ad] = {
      baglantilar,
      metin: `${ad} = ${ham} → ${parcaAdi(kart)} ${pin.name}${karsilar.length ? ` → ${karsilar.map((k) => `${k.parca} ${k.pin}`).join(', ')}` : ' (kablo yok)'}`,
    };
  }
  return sabitler;
}

function Kod({ proje, guncelle }) {
  const kart = proje.parts.find((p) => KARTLAR[p.type]);
  const tanimlar = pinTanimlari(proje);
  const kod = proje.kod || { dosya: 'sketch.ino', kutuphaneler: [], icerik: '' };
  const diagram = JSON.stringify(wokwiDiagram(proje), null, 2);
  const disarida = proje.parts.filter((p) => !PARCALAR[p.type] || p.type === 'ky-modul');
  const [derleme, setDerleme] = useState({ durum: 'yok', hatalar: [], cikti: '' });
  const [ustundeki, setUstundeki] = useState(null);
  const sabitler = pinSabitleri(proje);
  const hazirlik = simulasyonHazirlik(proje);

  async function derle() {
    setDerleme({ durum: 'derleniyor', hatalar: [], cikti: '' });
    try {
      const y = await fetch('/__derle', { method: 'POST', body: JSON.stringify({ kart: kart?.type, kod: kod.icerik }) });
      const sonuc = await y.json();
      const hatalar = hatalariAyikla(sonuc.cikti);
      setDerleme({ durum: sonuc.tamam ? 'tamam' : 'hata', hatalar, cikti: sonuc.cikti });
      bildir(sonuc.tamam ? 'Kod derlendi' : `${hatalar.filter((h) => h.seviye === 'hata').length || 1} derleme hatası`, sonuc.tamam ? 'bilgi' : 'hata');
    } catch {
      setDerleme({ durum: 'hata', hatalar: [], cikti: 'Derleme sunucusuna ulaşılamadı.' });
    }
  }

  const odak = ustundeki && sabitler[ustundeki] ? { kablolar: sabitler[ustundeki].baglantilar, parcalar: [] } : null;

  return (
    <div className="kod-duzen">
      <div className="kod-sol">
        <div className="kod-arac">
          <strong>{kod.dosya || 'sketch.ino'}</strong>
          <div className="satir">
            {hazirlik.uygun && (
              <button type="button" className="dugme" onClick={derle} disabled={derleme.durum === 'derleniyor'}>
                {derleme.durum === 'derleniyor' ? 'Derleniyor…' : 'Derle ve denetle'}
              </button>
            )}
            <KopyalaDugme metin={kod.icerik} etiket="Kodu kopyala" />
            <button type="button" className="dugme ikincil" onClick={() => { dosyaIndir(kod.dosya || 'sketch.ino', kod.icerik, 'text/plain'); bildir('Kod indirildi'); }}>İndir</button>
          </div>
        </div>
        {derleme.durum === 'tamam' && <p className="kutu basari belir">Kod hatasız derlendi.</p>}
        {derleme.durum === 'hata' && (
          <div className="kutu hata belir">
            <strong>{derleme.hatalar.filter((h) => h.seviye === 'hata').length || 'Bir'} hata.</strong> Hatalı satırlar kırmızı işaretli; işaretin üstüne gelince açıklama çıkar.
            {!derleme.hatalar.length && <pre className="hata-ciktisi">{derleme.cikti}</pre>}
          </div>
        )}
        <KodDuzenleyici
          deger={kod.icerik}
          etiket={`Kod: ${kod.dosya || 'sketch.ino'}`}
          hatalar={derleme.hatalar}
          onChange={(icerik) => guncelle({ ...proje, kod: { ...kod, icerik } })}
          pinIpucu={(kelime) => sabitler[kelime]?.metin}
          onPinUstunde={setUstundeki}
        />
        <p className="soluk-yazi">Pin sabitinin (ör. <code>{Object.keys(sabitler)[0] || 'LED_PIN'}</code>) üstüne gel: hangi pine ve parçaya gittiği yazar, sağdaki şemada kablosu yanar.</p>
      </div>

      <div className="kod-sag">
        <div className="kod-sema">
          <Sema proje={proje} etiketGoster isaretler={odak ? { kablolar: {}, parcalar: {}, odak } : null} />
        </div>
        <details className="kod-detay" open>
          <summary>Karta yükle</summary>
          {kart ? <ol className="numarali">{KARTLAR[kart.type].yukleme.map((s, i) => <li key={i}>{s}</li>)}</ol> : <p>Önce Parçalar adımında bir kart ekle.</p>}
          {kod.kutuphaneler?.length ? (
            <p>Kütüphaneler (Araçlar › Kütüphaneleri yönet): {kod.kutuphaneler.map((k) => <code key={k} className="kutuphane">{k}</code>)}</p>
          ) : <p className="soluk-yazi">Ek kütüphane gerekmiyor.</p>}
        </details>
        <details className="kod-detay">
          <summary>Kablolardan çıkan pin tanımları</summary>
          <pre className="kod-kutu">{tanimlar || '// Kartla parça arasında kablo yok.'}</pre>
          {tanimlar && <KopyalaDugme metin={tanimlar} />}
        </details>
        <details className="kod-detay">
          <summary>Wokwi'de dene</summary>
          <ol className="numarali">
            <li><a href={wokwiYeniAdres(proje)} target="_blank" rel="noreferrer">Wokwi'de yeni proje aç<span className="gizli"> (yeni sekmede açılır)</span></a>.</li>
            <li>"diagram.json" sekmesine yapıştır: <KopyalaDugme metin={diagram} etiket="diagram.json'u kopyala" /></li>
            <li>"sketch.ino" sekmesine kodu yapıştır, ▶'e bas.</li>
          </ol>
          {disarida.length > 0 && <p className="soluk-yazi">Wokwi'de olmayan parçalar görünmez: {disarida.map((p) => parcaAdi(p)).join(', ')}.</p>}
        </details>
      </div>
    </div>
  );
}

// ---------- 6. Test ----------
function Test({ proje, guncelle }) {
  const durum = proje.durum || { montaj: [], testler: [] };
  const isaretle = (alan, i) => {
    const liste = new Set(durum[alan] || []);
    liste.has(i) ? liste.delete(i) : liste.add(i);
    guncelle({ ...proje, durum: { ...durum, [alan]: [...liste] } });
  };
  const toplam = (proje.montaj?.length || 0) + (proje.testler?.length || 0);
  const biten = (durum.montaj?.length || 0) + (durum.testler?.length || 0);
  const liste = (alan, baslik, maddeler) => (
    <section>
      <h3>{baslik}</h3>
      {maddeler?.length ? (
        <ul className="kontrol-listesi">
          {maddeler.map((m, i) => (
            <li key={i}>
              <label>
                <input type="checkbox" checked={durum[alan]?.includes(i) || false} onChange={() => isaretle(alan, i)} />
                <span>{m}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : <p className="soluk-yazi">Liste boş.</p>}
    </section>
  );
  return (
    <div className="adim-icerik dar">
      {toplam > 0 && (
        <div className="ilerleme">
          <div className="ilerleme-cubuk" role="progressbar" aria-valuemin={0} aria-valuemax={toplam} aria-valuenow={biten} aria-label="Tamamlanan maddeler">
            <span style={{ width: `${(biten / toplam) * 100}%` }} />
          </div>
          <span>{biten} / {toplam} tamam</span>
        </div>
      )}
      {liste('montaj', 'Montaj', proje.montaj)}
      {liste('testler', 'Test', proje.testler)}
      {proje.gereksinimler?.length > 0 && (
        <section>
          <h3>Gereksinimleri karşılıyor mu?</h3>
          <ul>{proje.gereksinimler.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </section>
      )}
      <section className="kutu">
        <h3>Projeyi sakla ya da paylaş</h3>
        <div className="satir">
          <button type="button" className="dugme ikincil" onClick={() => dosyaIndir(`${proje.id}.json`, JSON.stringify(proje, null, 2))}>Proje dosyasını indir</button>
          <button type="button" className="dugme ikincil" onClick={() => window.print()}>Yazdır</button>
        </div>
      </section>
    </div>
  );
}

// ---------- Proje sayfası ----------
export default function Proje({ id, adim }) {
  const [proje, setProje] = useState(() => projeGetir(id));
  const [secili, setSecili] = useState(null);
  const [kayitHatasi, setKayitHatasi] = useState(false);
  const [kopya, setKopya] = useState(() => yerelKopyaVar(id));

  if (!proje) {
    return (
      <div className="sayfa">
        <h1>Proje bulunamadı</h1>
        <p><a href="#/">Ana sayfaya dön</a></p>
      </div>
    );
  }

  const sira = Math.max(0, ADIMLAR.findIndex((a) => a.id === adim));
  const simdiki = ADIMLAR[sira];

  function guncelle(yeni) {
    setProje(yeni);
    const tamam = projeKaydet(yeni);
    setKayitHatasi(!tamam);
    setKopya(true);
    if (tamam) bildir('Kaydedildi');
  }
  function git(adimId, baglanti = null) {
    setSecili(baglanti);
    window.location.hash = `#/proje/${encodeURIComponent(proje.id)}/${adimId}`;
  }
  function bastan() {
    if (!window.confirm('Bu projedeki değişikliklerin silinsin mi? Proje ilk hâline döner.')) return;
    projeSil(proje.id);
    const ilk = projeGetir(proje.id);
    if (!ilk) { window.location.hash = '#/'; return; }
    setProje(ilk);
    setKopya(false);
  }
  const hataSayisi = denetle(proje, pinVeri).filter((s) => s.seviye === 'hata').length;

  const yuzde = Math.round((sira / (ADIMLAR.length - 1)) * 100);
  const adres = (a) => `#/proje/${encodeURIComponent(proje.id)}/${a}`;

  return (
    <div className={`sayfa genis${simdiki.id === 'baglanti' ? ' masa-sayfasi' : ''}`}>
      <div className="proje-ust">
        <div>
          <nav aria-label="Konum" className="kirinti">
            <a href="#/">Projeler</a> <span aria-hidden="true">›</span> <span>{proje.baslik}</span>
          </nav>
          <h1>{proje.baslik}</h1>
        </div>
        <div className="proje-ust-sag">
          <span className="soluk-yazi kayit-notu">Değişiklikler kendiliğinden saklanır</span>
          {kopya && asilProje(proje.id) && (
            <button type="button" className="dugme bag" onClick={bastan}>Değişiklikleri geri al</button>
          )}
        </div>
      </div>
      {kayitHatasi && <p className="kutu hata" role="alert">Değişiklik kaydedilemedi. Tarayıcı depolaması kapalı olabilir; "Proje dosyasını indir" ile sakla.</p>}

      <nav aria-label="Proje adımları" className="adim-ilerleme" style={{ '--ilerleme': `${yuzde}%` }}>
        <ol className="adimlar">
          {ADIMLAR.map((a, i) => (
            <li key={a.id}>
              <a href={adres(a.id)} aria-current={i === sira ? 'step' : undefined} className={i < sira ? 'gecti' : ''} title={a.kisa}>
                <span className="adim-no" aria-hidden="true">{i < sira ? '✓' : i + 1}</span>
                <span className="adim-ad">{a.ad}</span>
                {a.id === 'kontrol' && hataSayisi > 0 && <span className="hata-sayisi" aria-label={`${hataSayisi} hata`}>{hataSayisi}</span>}
              </a>
            </li>
          ))}
        </ol>
        <span className="adim-sayaci" aria-hidden="true">{sira + 1}/{ADIMLAR.length}</span>
      </nav>

      <div className="adim-alani">
        <div className="adim-baslik">
          <h2>{simdiki.ad}</h2>
          <p>{simdiki.ne}</p>
        </div>

        {simdiki.id === 'fikir' && <Fikir proje={proje} guncelle={guncelle} />}
        {simdiki.id === 'parcalar' && <Parcalar proje={proje} guncelle={guncelle} />}
        {simdiki.id === 'baglanti' && <Baglanti proje={proje} guncelle={guncelle} secili={secili} setSecili={setSecili} />}
        {simdiki.id === 'kontrol' && <Kontrol proje={proje} git={git} />}
        {simdiki.id === 'kod' && <Kod proje={proje} guncelle={guncelle} />}
        {simdiki.id === 'test' && <Test proje={proje} guncelle={guncelle} />}

        <nav className="alt-gezinti" aria-label="Önceki ve sonraki adım">
          {sira > 0 ? (
            <a className="dugme ikincil" href={adres(ADIMLAR[sira - 1].id)}>← {ADIMLAR[sira - 1].ad}</a>
          ) : <span />}
          <span className="soluk-yazi">Adım {sira + 1} / {ADIMLAR.length}</span>
          {sira < ADIMLAR.length - 1 ? (
            <a className="dugme" href={adres(ADIMLAR[sira + 1].id)}>Sonraki: {ADIMLAR[sira + 1].ad} →</a>
          ) : <a className="dugme" href="#/">Projelere dön</a>}
        </nav>
      </div>
      <IlkRehber />
    </div>
  );
}
