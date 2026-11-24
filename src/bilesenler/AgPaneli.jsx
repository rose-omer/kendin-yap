import { useEffect, useId, useRef, useState } from 'react';

// Mini tarayıcıya gömülen yardımcı betik: link, form ve fetch() isteklerini ana sayfaya iletir;
// ana sayfa da onları simülasyondaki ESP32 web sunucusuna gönderir.
const ARA_BETIK = `<script>(function(){
var gonder=function(yontem,url,govde){parent.postMessage({kyWeb:{yontem:yontem,url:url,govde:govde||''}},'*');};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||/^(mailto|tel|javascript):/i.test(h))return;e.preventDefault();gonder('GET',h);});
document.addEventListener('submit',function(e){e.preventDefault();var f=e.target;var v=new URLSearchParams(new FormData(f)).toString();var y=(f.getAttribute('method')||'GET').toUpperCase();var h=f.getAttribute('action')||'';if(y==='GET'){gonder('GET',h.split('?')[0]+'?'+v);}else{gonder('POST',h,v);}});
var no=0,bek={};
window.fetch=function(url,opt){opt=opt||{};return new Promise(function(c,r){var id=++no;bek[id]={c:c,r:r};parent.postMessage({kyFetch:{id:id,url:String(url),yontem:(opt.method||'GET').toUpperCase(),govde:opt.body?String(opt.body):''}},'*');});};
window.addEventListener('message',function(e){var m=e.data&&e.data.kyFetchYanit;if(!m||!bek[m.id])return;var b=bek[m.id];delete bek[m.id];if(m.hata){b.r(new Error(m.hata));}else{b.c(new Response(m.govde,{status:m.kod,headers:{'Content-Type':m.tur||'text/plain'}}));}});
})();<\/script>`;

const kacis = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

function sayfaYap(yanit) {
  if (!yanit) return '<p style="font-family:sans-serif;color:#555">Bir adres aç.</p>';
  if (/html/i.test(yanit.icerikTuru)) return ARA_BETIK + yanit.govde;
  return `${ARA_BETIK}<pre style="white-space:pre-wrap;font:14px monospace">${kacis(yanit.govde)}</pre>`;
}

export default function AgPaneli({ ag, webIstek }) {
  const [yol, setYol] = useState('/');
  const [adresYazisi, setAdresYazisi] = useState('/');
  const [yanit, setYanit] = useState(null);
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sayfaNo, setSayfaNo] = useState(0);
  const cerceveRef = useRef(null);
  const siraRef = useRef(Promise.resolve());
  const yolRef = useRef('/');
  const kimlik = useId();
  const ip = ag.wifi?.ip;
  const webVar = !!ag.web && ag.wifi?.durum === 'bagli';

  // ESP32 aynı anda tek istek işler: istekleri sıraya koy.
  function sirayla(yontem, hedef, govde) {
    const u = new URL(hedef, `http://esp32${yolRef.current}`);
    const is = siraRef.current.then(() => webIstek(yontem, u.pathname, u.search.slice(1), govde));
    siraRef.current = is.catch(() => {});
    return { u, is };
  }

  async function ac(yontem, hedef, govde = '', atlama = 0) {
    setHata('');
    setYukleniyor(true);
    const { u, is } = sirayla(yontem, hedef, govde);
    try {
      const y = await is;
      const konum = /^location:\s*(.+)$/im.exec(y.basliklar || '')?.[1];
      if (y.kod >= 300 && y.kod < 400 && konum && atlama < 3) return ac('GET', konum.trim(), '', atlama + 1);
      yolRef.current = u.pathname + u.search;
      setYol(yolRef.current);
      setAdresYazisi(yolRef.current);
      setYanit(y);
      setSayfaNo((n) => n + 1);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  }

  // Web sunucusu açılınca ana sayfayı bir kez yükle.
  const ilkAcildi = useRef(false);
  useEffect(() => {
    if (webVar && !ilkAcildi.current) {
      ilkAcildi.current = true;
      ac('GET', '/');
    }
  });

  useEffect(() => {
    const dinle = async (e) => {
      if (e.source !== cerceveRef.current?.contentWindow) return;
      const d = e.data || {};
      if (d.kyWeb) ac(d.kyWeb.yontem, d.kyWeb.url, d.kyWeb.govde);
      if (d.kyFetch) {
        const { id, url, yontem, govde } = d.kyFetch;
        const { is } = sirayla(yontem, url, govde);
        let mesaj;
        try {
          const y = await is;
          mesaj = { id, kod: y.kod, tur: y.icerikTuru, govde: y.govde };
        } catch (h) {
          mesaj = { id, hata: h.message };
        }
        cerceveRef.current?.contentWindow?.postMessage({ kyFetchYanit: mesaj }, '*');
      }
    };
    window.addEventListener('message', dinle);
    return () => window.removeEventListener('message', dinle);
  });

  if (!ag.wifi && !ag.http?.length) return null;
  const durumYazi = { baglaniyor: 'bağlanıyor…', bagli: 'bağlı', kapali: 'bağlı değil' }[ag.wifi?.durum] || '';

  return (
    <section className="ag-paneli" aria-labelledby={`${kimlik}-baslik`}>
      <h4 id={`${kimlik}-baslik`}>Wi-Fi</h4>
      {ag.wifi && (
        <p>
          <span className={`wifi-nokta ${ag.wifi.durum}`} aria-hidden="true" /> {ag.wifi.ap ? 'Erişim noktası' : 'Ağ'} <strong>{ag.wifi.ssid || '(adsız)'}</strong>: {durumYazi}
          {ip && ag.wifi.durum === 'bagli' && <> · IP <code>{ip}</code></>}
        </p>
      )}
      <p className="soluk-yazi">Sanal ağ: her ağ adına bağlanır, parola denetlenmez. İnternet istekleri gerçekten gider; bu bilgisayara ve yerel ağa gitmez.</p>

      {webVar && (
        <div className="mini-tarayici">
          <form
            className="adres-cubugu"
            onSubmit={(e) => {
              e.preventDefault();
              ac('GET', adresYazisi.startsWith('/') ? adresYazisi : `/${adresYazisi}`);
            }}
          >
            <span className="adres-on">http://{ip}{ag.web.port && ag.web.port !== 80 ? `:${ag.web.port}` : ''}</span>
            <label htmlFor={`${kimlik}-adres`} className="gizli">Sayfa yolu</label>
            <input id={`${kimlik}-adres`} value={adresYazisi} onChange={(e) => setAdresYazisi(e.target.value)} />
            <button type="submit" className="dugme ikincil">Git</button>
            <button type="button" className="dugme ikincil" onClick={() => ac('GET', yol)} aria-label="Yenile">↻</button>
          </form>
          {hata && <p className="kutu hata" role="alert">{hata}</p>}
          {/* Her sayfada çerçeve baştan kurulur: srcdoc'u yerinde değiştirmek bazı tarayıcılarda boş ekran bırakıyor. */}
          <iframe
            key={sayfaNo}
            ref={cerceveRef}
            title="ESP32 web sayfası"
            sandbox="allow-scripts allow-forms"
            srcDoc={sayfaYap(yanit)}
            className={yukleniyor ? 'yukleniyor' : ''}
          />
          {yanit && <p className="soluk-yazi">Yanıt: {yanit.kod} · {yanit.icerikTuru || 'tür yok'}</p>}
        </div>
      )}

      {ag.http?.length > 0 && (
        <>
          <h4>İnternet istekleri</h4>
          <ul className="http-kaydi">
            {ag.http.slice(-6).reverse().map((h, i) => (
              <li key={i}>
                <code>{h.yontem}</code> {h.url} → <strong className={h.kod >= 200 && h.kod < 400 ? 'iyi' : 'kotu'}>{h.kod > 0 ? h.kod : 'hata'}</strong>
                {h.hata && <span className="soluk-yazi"> ({h.hata})</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
