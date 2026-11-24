// Yerel fiyat ucu: GET /__fiyat?q=DHT22 → mağazaların arama sayfasından ad, fiyat, stok, link.
// Tarayıcı başka sitelere doğrudan istek atamaz (CORS); bu yüzden istek geliştirme sunucusundan gider.
// Sonuçlar 6 saat önbellekte kalır; mağazalara gereksiz yük bindirmez.

const ONBELLEK_MS = 6 * 60 * 60 * 1000;
const ZAMAN_ASIMI_MS = 12_000;
const TARAYICI = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function sayi(yazi) {
  return Number(String(yazi).replace(/\./g, '').replace(',', '.'));
}

// Ürün adındaki HTML işaretlerini çöz: &quot; → ", &amp; → &, &#39; → ' …
const ADLI = { quot: '"', amp: '&', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
function htmlCoz(yazi) {
  return String(yazi ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, ad) => ADLI[ad.toLowerCase()] ?? m)
    .trim();
}

// T-Soft altyapılı mağazalar sayfaya PRODUCT_DATA.push(JSON.parse('...')) ile ürün verisi koyar.
function tsoftAyikla(html, kok) {
  const urunler = [];
  for (const m of html.matchAll(/PRODUCT_DATA\.push\(JSON\.parse\('(.*?)'\)\);/g)) {
    try {
      const o = JSON.parse(JSON.parse(`"${m[1].replace(/\\'/g, "'")}"`));
      urunler.push({
        ad: htmlCoz(o.name),
        fiyat: Number(o.total_sale_price ?? o.total_price),
        url: `${kok}/${String(o.url).replace(/^\//, '')}`,
        stok: Number(o.quantity) > 0 && o.available !== false,
      });
    } catch {
      // Bozuk kayıt: atla.
    }
  }
  return urunler;
}

function direncAyikla(html, kok) {
  const urunler = [];
  const desen = /<a href="([^"]+)" data-toggle="product-url"[^>]*><span data-toggle="product-title">([^<]+)<\/span><\/a>[\s\S]*?data-toggle="price-sell-vat">([\d.,]+)<\/span>/g;
  let onceki = 0;
  for (const m of html.matchAll(desen)) {
    const parca = html.slice(onceki, m.index + m[0].length);
    onceki = m.index + m[0].length;
    urunler.push({
      ad: htmlCoz(m[2]),
      fiyat: sayi(m[3]),
      url: `${kok}/${m[1].replace(/^\//, '')}`,
      stok: !/Tükendi/.test(parca.slice(-4000)),
    });
  }
  return urunler;
}

export const MAGAZALAR = [
  { ad: 'Robotistan', kok: 'https://www.robotistan.com', arama: (q) => `https://www.robotistan.com/arama?q=${encodeURIComponent(q)}`, ayikla: tsoftAyikla },
  { ad: 'Direnc.net', kok: 'https://www.direnc.net', arama: (q) => `https://www.direnc.net/arama?q=${encodeURIComponent(q)}`, ayikla: direncAyikla },
  { ad: 'Motorobit', kok: 'https://www.motorobit.com', arama: (q) => `https://www.motorobit.com/arama?q=${encodeURIComponent(q)}`, ayikla: tsoftAyikla },
];

const yalin = (s) => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c');

// Ürün adının parçaya uygunluğu (0–1). iceren: adda geçmesi gereken sözcükler; haric: geçmemesi gerekenler.
// Aksesuar sözcükleri (kutu, tutucu…) her zaman elenir; aranan parça zaten oysa elenmez.
const AKSESUAR = ['kutu', 'kutusu', 'muhafaza', 'tutucu', 'tutucusu', 'braket', 'distans', 'standoff', 'kapak', 'yedek'];
export function uygunluk(sorgu, ad, iceren = [], haric = []) {
  const hedef = yalin(ad);
  const sorguYalin = yalin(sorgu);
  if ([...haric, ...AKSESUAR.filter((a) => !sorguYalin.includes(a))].some((h) => hedef.includes(yalin(h)))) return 0;
  const kelimeler = (iceren.length ? iceren.map(yalin) : sorguYalin.split(/[^a-z0-9]+/)).filter((k) => k.length > 1);
  if (!kelimeler.length) return 0;
  return kelimeler.filter((k) => hedef.includes(k)).length / kelimeler.length;
}

async function magazaAra(magaza, sorgu, iceren, haric) {
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS);
  try {
    const yanit = await fetch(magaza.arama(sorgu), { headers: { 'User-Agent': TARAYICI, 'Accept-Language': 'tr-TR,tr' }, signal: kontrol.signal });
    if (!yanit.ok) return { ad: magaza.ad, aramaUrl: magaza.arama(sorgu), urunler: [], hata: `HTTP ${yanit.status}` };
    const urunler = magaza.ayikla(await yanit.text(), magaza.kok)
      .filter((u) => u.ad && Number.isFinite(u.fiyat) && u.fiyat > 0)
      .map((u) => ({ ...u, uygunluk: uygunluk(sorgu, u.ad, iceren, haric) }))
      .slice(0, 8);
    return { ad: magaza.ad, aramaUrl: magaza.arama(sorgu), urunler };
  } catch (e) {
    return { ad: magaza.ad, aramaUrl: magaza.arama(sorgu), urunler: [], hata: e.name === 'AbortError' ? 'Zaman aşımı' : 'Ulaşılamadı' };
  } finally {
    clearTimeout(zaman);
  }
}

const onbellek = new Map();

export async function fiyatAra(sorgu, iceren = [], haric = []) {
  const anahtar = yalin([sorgu.trim(), ...iceren, '|', ...haric].join(' '));
  const kayit = onbellek.get(anahtar);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_MS) return kayit.veri;
  const magazalar = await Promise.all(MAGAZALAR.map((m) => magazaAra(m, sorgu, iceren, haric)));
  // Aşırı pahalı eşleşmeyi ele: uygun ürünlerin en ucuzunun 5 katından pahalı olan büyük ihtimalle başka bir üründür.
  const uygunFiyatlar = magazalar.flatMap((m) => m.urunler).filter((u) => u.uygunluk === 1).map((u) => u.fiyat);
  if (uygunFiyatlar.length) {
    const taban = Math.min(...uygunFiyatlar);
    for (const m of magazalar) for (const u of m.urunler) if (u.uygunluk === 1 && u.fiyat > taban * 5) u.uygunluk = 0.5;
  }
  // En ucuz: stokta ve adı parçaya uyan ürün.
  const adaylar = magazalar.flatMap((m) => m.urunler.map((u) => ({ ...u, magaza: m.ad })));
  const esik = 1;
  const uygun = adaylar.filter((u) => u.stok && u.uygunluk >= esik).sort((a, b) => a.fiyat - b.fiyat);
  const veri = { sorgu, zaman: new Date().toISOString(), enUcuz: uygun[0] || null, magazalar };
  onbellek.set(anahtar, { zaman: Date.now(), veri });
  return veri;
}

export function fiyatUcu() {
  return {
    name: 'fiyat-ucu',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__fiyat', async (req, res) => {
        const p = new URL(req.url, 'http://yerel').searchParams;
        const q = p.get('q') || '';
        const liste = (ad) => (p.get(ad) || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
        if (!q.trim() || q.length > 120) return res.writeHead(400).end();
        const veri = await fiyatAra(q, liste('iceren'), liste('haric'));
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(veri));
      });
    },
  };
}
