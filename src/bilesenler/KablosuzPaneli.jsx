import { useId, useState } from 'react';

// Simülasyon panelinin MQTT ve Bluetooth bölümleri. Panel burada "telefon uygulaması" gibi davranır.

const ozellikAdlari = (oz) => [oz & 1 && 'okuma', oz & 2 && 'yazma', oz & 4 && 'bildirim', oz & 32 && 'yanıtsız yazma'].filter(Boolean).join(', ');

export function agBirlestir(a, d) {
  const y = { ...a };
  if (d.wifi) y.wifi = { ...a.wifi, ...d.wifi };
  if (d.web) y.web = d.web;
  if (d.http) y.http = [...(a.http || []), d.http].slice(-20);
  if (d.mqtt) {
    const m = { abonelikler: [], mesajlar: [], ...a.mqtt };
    if (d.mqtt.durum) Object.assign(m, { durum: d.mqtt.durum, sunucu: d.mqtt.sunucu ?? m.sunucu, port: d.mqtt.port ?? m.port, kimlik: d.mqtt.kimlik ?? m.kimlik });
    if (d.mqtt.abone != null) m.abonelikler = d.mqtt.acik ? [...new Set([...m.abonelikler, d.mqtt.abone])] : m.abonelikler.filter((x) => x !== d.mqtt.abone);
    if (d.mqtt.yayin) m.mesajlar = [...m.mesajlar, { yon: 'esp', ...d.mqtt.yayin, zaman: Date.now() }].slice(-40);
    if (d.mqtt.gelen) m.mesajlar = [...m.mesajlar, { yon: 'panel', ...d.mqtt.gelen, zaman: Date.now() }].slice(-40);
    y.mqtt = m;
  }
  if (d.bt) {
    const b = { mesajlar: [], ...a.bt };
    if (d.bt.ad) b.ad = d.bt.ad;
    if (d.bt.veri) b.mesajlar = [...b.mesajlar, { yon: 'esp', veri: d.bt.veri }].slice(-60);
    if (d.bt.giden) b.mesajlar = [...b.mesajlar, { yon: 'panel', veri: d.bt.giden }].slice(-60);
    if (d.bt.bagli != null) b.bagli = d.bt.bagli;
    y.bt = b;
  }
  if (d.ble) {
    const b = { ozellikler: {}, bildirimler: [], ...a.ble };
    if (d.ble.ad) b.ad = d.ble.ad;
    if (d.ble.yayin != null) b.yayin = d.ble.yayin;
    if (d.ble.bagli != null) b.bagli = d.ble.bagli;
    if (d.ble.ozellik) b.ozellikler = { ...b.ozellikler, [d.ble.ozellik.no]: { deger: '', ...b.ozellikler[d.ble.ozellik.no], ...d.ble.ozellik } };
    if (d.ble.deger) b.ozellikler = { ...b.ozellikler, [d.ble.deger.no]: { ...b.ozellikler[d.ble.deger.no], deger: d.ble.deger.veri } };
    if (d.ble.bildir != null) {
      const o = b.ozellikler[d.ble.bildir];
      b.bildirimler = [...b.bildirimler, { no: d.ble.bildir, veri: o?.deger ?? '', zaman: Date.now() }].slice(-30);
    }
    y.ble = b;
  }
  return y;
}

function MqttBolumu({ mqtt, sim }) {
  const kimlik = useId();
  const [konu, setKonu] = useState(mqtt.abonelikler[0] || '');
  const [veri, setVeri] = useState('');
  function gonder(e) {
    e.preventDefault();
    if (!konu.trim()) return;
    sim.mqttYayinla(konu.trim(), veri); // sayfa tarafı kaydı onAg ile kendisi ekler
    setVeri('');
  }
  return (
    <section aria-labelledby={`${kimlik}-b`}>
      <h4 id={`${kimlik}-b`}>MQTT</h4>
      <p>
        <span className={`wifi-nokta ${mqtt.durum === 'bagli' ? 'bagli' : ''}`} aria-hidden="true" /> Sunucu <code>{mqtt.sunucu || '?'}:{mqtt.port || 1883}</code>
        {' '}· {mqtt.durum === 'bagli' ? 'bağlı' : 'bağlı değil'}{mqtt.kimlik ? ` · istemci ${mqtt.kimlik}` : ''}
      </p>
      <p className="soluk-yazi">Sanal sunucu: mesajlar bu bilgisayardan çıkmaz. Panel, sunucuya bağlı ikinci bir cihaz gibidir.</p>
      {mqtt.abonelikler.length > 0 && <p>ESP32'nin dinlediği konular: {mqtt.abonelikler.map((a) => <code key={a} className="konu">{a}</code>)}</p>}
      <form className="satir mqtt-form" onSubmit={gonder}>
        <label htmlFor={`${kimlik}-k`} className="gizli">Konu</label>
        <input id={`${kimlik}-k`} value={konu} onChange={(e) => setKonu(e.target.value)} placeholder="konu, ör. ev/led" list={`${kimlik}-l`} />
        <datalist id={`${kimlik}-l`}>{mqtt.abonelikler.map((a) => <option key={a} value={a.replace(/[#+]$/, '')} />)}</datalist>
        <label htmlFor={`${kimlik}-v`} className="gizli">Mesaj</label>
        <input id={`${kimlik}-v`} value={veri} onChange={(e) => setVeri(e.target.value)} placeholder="mesaj, ör. ac" />
        <button type="submit" className="dugme ikincil">Yayınla</button>
      </form>
      <ul className="mesaj-kaydi" aria-label="MQTT mesajları">
        {mqtt.mesajlar.slice(-12).reverse().map((m, i) => (
          <li key={i} className={m.yon}>
            <span className="yon">{m.yon === 'esp' ? 'ESP32 →' : '→ ESP32'}</span> <code>{m.konu}</code> {m.veri}
          </li>
        ))}
        {!mqtt.mesajlar.length && <li className="soluk-yazi">Henüz mesaj yok.</li>}
      </ul>
    </section>
  );
}

function BtBolumu({ bt, sim, onKayit }) {
  const kimlik = useId();
  const [metin, setMetin] = useState('');
  return (
    <section aria-labelledby={`${kimlik}-b`}>
      <h4 id={`${kimlik}-b`}>Bluetooth (seri)</h4>
      <p>
        Cihaz <strong>{bt.ad}</strong> · {bt.bagli ? 'telefon bağlı' : 'bağlantı bekliyor'}{' '}
        <button type="button" className="dugme bag" onClick={() => { sim.btBaglan(!bt.bagli); onKayit({ bt: { bagli: !bt.bagli } }); }}>
          {bt.bagli ? 'Bağlantıyı kes' : 'Telefonla bağlan'}
        </button>
      </p>
      <pre className="seri-ekran bt-ekran" role="log" aria-label="Bluetooth mesajları">
        {bt.mesajlar.map((m, i) => <span key={i} className={m.yon}>{m.yon === 'panel' ? '> ' : ''}{m.veri}{m.yon === 'panel' ? '\n' : ''}</span>)}
      </pre>
      <form className="satir" onSubmit={(e) => { e.preventDefault(); if (!bt.bagli) return; sim.btGonder(`${metin}\n`); onKayit({ bt: { giden: metin } }); setMetin(''); }}>
        <label htmlFor={`${kimlik}-m`} className="gizli">Telefondan gönder</label>
        <input id={`${kimlik}-m`} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={bt.bagli ? 'telefondan gönder, ör. ac' : 'önce bağlan'} disabled={!bt.bagli} />
        <button type="submit" className="dugme ikincil" disabled={!bt.bagli}>Gönder</button>
      </form>
    </section>
  );
}

function BleBolumu({ ble, sim, onKayit }) {
  const kimlik = useId();
  const [yazilar, setYazilar] = useState({});
  const ozellikler = Object.values(ble.ozellikler);
  return (
    <section aria-labelledby={`${kimlik}-b`}>
      <h4 id={`${kimlik}-b`}>Bluetooth LE</h4>
      <p>
        Cihaz <strong>{ble.ad}</strong> · {ble.bagli ? 'telefon bağlı' : ble.yayin ? 'görünür, bağlantı bekliyor' : 'yayın kapalı'}{' '}
        {(ble.yayin || ble.bagli) && (
          <button type="button" className="dugme bag" onClick={() => { sim.bleBaglan(!ble.bagli); onKayit({ ble: { bagli: !ble.bagli } }); }}>
            {ble.bagli ? 'Bağlantıyı kes' : 'Telefonla bağlan'}
          </button>
        )}
      </p>
      {ozellikler.length > 0 && (
        <ul className="ble-liste">
          {ozellikler.map((o) => (
            <li key={o.no}>
              <div><code className="uuid">{o.uuid}</code> <span className="soluk-yazi">({ozellikAdlari(o.oz)})</span></div>
              <div>Değer: <strong>{o.deger || '—'}</strong>{o.oz & 1 && ble.bagli ? <> <button type="button" className="dugme bag" onClick={() => sim.bleOku(o.no)}>Oku</button></> : null}</div>
              {o.oz & 34 && ble.bagli ? (
                <form className="satir" onSubmit={(e) => { e.preventDefault(); sim.bleYaz(o.no, yazilar[o.no] || ''); setYazilar((y) => ({ ...y, [o.no]: '' })); }}>
                  <label htmlFor={`${kimlik}-${o.no}`} className="gizli">Değer yaz</label>
                  <input id={`${kimlik}-${o.no}`} value={yazilar[o.no] || ''} onChange={(e) => setYazilar((y) => ({ ...y, [o.no]: e.target.value }))} placeholder="değer yaz, ör. 1" />
                  <button type="submit" className="dugme ikincil">Yaz</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {ble.bildirimler.length > 0 && (
        <>
          <p>Son bildirimler:</p>
          <ul className="mesaj-kaydi">
            {ble.bildirimler.slice(-6).reverse().map((b, i) => <li key={i} className="esp"><span className="yon">ESP32 →</span> {b.veri}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}

export default function KablosuzPaneli({ ag, sim, onKayit }) {
  if (!ag.mqtt && !ag.bt && !ag.ble) return null;
  return (
    <div className="ag-paneli kablosuz">
      {ag.mqtt && <MqttBolumu mqtt={ag.mqtt} sim={sim} />}
      {ag.bt && <BtBolumu bt={ag.bt} sim={sim} onKayit={onKayit} />}
      {ag.ble && <BleBolumu ble={ag.ble} sim={sim} onKayit={onKayit} />}
    </div>
  );
}
