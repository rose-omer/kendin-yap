// İnternet vekili: POST /__vekil {yontem, url, basliklar, govde} → {kod, govde, tur}
// ESP32 simülasyonundaki HTTPClient istekleri buradan gerçek internete çıkar.
// Güvenlik: yalnız http/https; bu bilgisayara ve yerel ağa (localhost, 10.x, 192.168.x, …) istek yok.
// Yönlendirmeler elle izlenir ki bir site isteği yerel adrese yönlendiremesin.
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ZAMAN_ASIMI_MS = 10_000;
const EN_BUYUK_YANIT = 512 * 1024;
const EN_BUYUK_GOVDE = 64 * 1024;
const YONTEMLER = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function ozelAdres(ip) {
  if (isIP(ip) === 6) {
    const k = ip.toLowerCase();
    if (k === '::1' || k === '::' || k.startsWith('fe80') || k.startsWith('fc') || k.startsWith('fd')) return true;
    const v4 = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(k);
    return v4 ? ozelAdres(v4[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function adresDenetle(adres) {
  let url;
  try {
    url = new URL(adres);
  } catch {
    return 'Adres geçersiz.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Yalnız http ve https adreslerine istek gönderilir.';
  const ad = url.hostname.replace(/^\[|\]$/g, '');
  if (ad === 'localhost' || ad.endsWith('.localhost') || ad.endsWith('.local')) return 'Bu bilgisayara ve yerel ağa istek gönderilmez.';
  try {
    const adresler = isIP(ad) ? [{ address: ad }] : await lookup(ad, { all: true });
    if (adresler.some((x) => ozelAdres(x.address))) return 'Bu bilgisayara ve yerel ağa istek gönderilmez.';
  } catch {
    return `Sunucu bulunamadı: ${ad}`;
  }
  return null;
}

async function istekGonder({ yontem = 'GET', url, basliklar = {}, govde = '' }) {
  yontem = String(yontem).toUpperCase();
  if (!YONTEMLER.has(yontem)) return { kod: -1, hata: 'Desteklenmeyen yöntem.' };
  if (String(govde).length > EN_BUYUK_GOVDE) return { kod: -1, hata: 'Gövde çok büyük.' };
  const temizBasliklar = {};
  for (const [k, v] of Object.entries(basliklar || {})) {
    if (!/^(host|cookie|connection|content-length)$/i.test(k)) temizBasliklar[k] = String(v);
  }
  let adres = String(url);
  for (let atlama = 0; atlama < 4; atlama++) {
    const hata = await adresDenetle(adres);
    if (hata) return { kod: -1, hata };
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS);
    try {
      const yanit = await fetch(adres, {
        method: yontem,
        headers: { 'User-Agent': 'ESP32HTTPClient (Kendin Yap simulasyonu)', ...temizBasliklar },
        body: yontem === 'GET' || yontem === 'DELETE' ? undefined : govde,
        redirect: 'manual',
        signal: kontrol.signal,
      });
      if (yanit.status >= 300 && yanit.status < 400 && yanit.headers.get('location')) {
        adres = new URL(yanit.headers.get('location'), adres).href;
        if (yanit.status === 303) yontem = 'GET';
        continue;
      }
      const tampon = new Uint8Array(await yanit.arrayBuffer());
      const metin = new TextDecoder().decode(tampon.subarray(0, EN_BUYUK_YANIT));
      return { kod: yanit.status, govde: metin, tur: yanit.headers.get('content-type') || '' };
    } catch (e) {
      return { kod: -1, hata: e.name === 'AbortError' ? 'Zaman aşımı (10 sn).' : 'Bağlanılamadı.' };
    } finally {
      clearTimeout(zaman);
    }
  }
  return { kod: -1, hata: 'Çok fazla yönlendirme.' };
}

export function vekilUcu() {
  return {
    name: 'internet-vekili',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__vekil', (req, res) => {
        if (req.method !== 'POST') return res.writeHead(405).end();
        let govde = '';
        req.on('data', (p) => {
          govde += p;
          if (govde.length > EN_BUYUK_GOVDE * 2) req.destroy();
        });
        req.on('end', async () => {
          let istek;
          try {
            istek = JSON.parse(govde);
          } catch {
            return res.writeHead(400).end();
          }
          const sonuc = await istekGonder(istek);
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(sonuc));
        });
      });
    },
  };
}

export { istekGonder, ozelAdres };
