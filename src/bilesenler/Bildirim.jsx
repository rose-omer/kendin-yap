import { useEffect, useState } from 'react';

// Küçük bildirimler: "Kaydedildi", "Kopyalandı" gibi. Sağ altta 2,2 saniye görünür.
// Her yerden bildir('mesaj') çağrılır; React bağlamı gerekmez.
const dinleyiciler = new Set();
let sayac = 0;
let sonMesaj = { metin: '', zaman: 0 };

export function bildir(metin, tur = 'bilgi') {
  // Aynı mesajı kısa aralıkla yığma (ör. her tuşta "Kaydedildi").
  const simdi = Date.now();
  if (sonMesaj.metin === metin && simdi - sonMesaj.zaman < 2500) return;
  sonMesaj = { metin, zaman: simdi };
  const b = { id: ++sayac, metin, tur };
  for (const d of dinleyiciler) d(b);
}

export function BildirimAlani() {
  const [liste, setListe] = useState([]);
  useEffect(() => {
    const ekle = (b) => {
      setListe((l) => [...l.slice(-2), b]);
      setTimeout(() => setListe((l) => l.map((x) => (x.id === b.id ? { ...x, cikiyor: true } : x))), 2000);
      setTimeout(() => setListe((l) => l.filter((x) => x.id !== b.id)), 2300);
    };
    dinleyiciler.add(ekle);
    return () => dinleyiciler.delete(ekle);
  }, []);
  return (
    <div className="bildirimler" role="status" aria-live="polite">
      {liste.map((b) => (
        <div key={b.id} className={`bildirim ${b.tur}${b.cikiyor ? ' cikiyor' : ''}`}>
          <span aria-hidden="true">{b.tur === 'hata' ? '!' : '✓'}</span> {b.metin}
        </div>
      ))}
    </div>
  );
}
