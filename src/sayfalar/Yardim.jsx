const SOZLUK = [
  ['Kart (mikrodenetleyici)', 'Kodu çalıştıran küçük bilgisayar. ESP32 ya da Arduino Uno gibi.'],
  ['Pin', 'Kartın ya da parçanın kablo takılan bacağı. Her pinin bir adı var: D4, GND, 5V gibi.'],
  ['GND', 'Eksi uç, toprak. Bütün parçaların GND\'si birbirine bağlanır.'],
  ['VCC, 5V, 3V3', 'Artı uç, besleme. Parça hangi gerilimi istiyorsa ona bağlanır.'],
  ['GPIO', 'Kodla açıp kapattığın ya da okuduğun pin. ESP32\'de D2, D4 gibi.'],
  ['3,3 V ve 5 V', 'ESP32 pinleri 3,3 V kaldırır; 5 V verirsen pin yanabilir. Arduino Uno pinleri 5 V\'tur.'],
  ['Direnç', 'Akımı sınırlar. LED\'i karta bağlarken araya 220 Ω direnç koyarsın.'],
  ['Breadboard', 'Lehimsiz deney tahtası. Aynı sıradaki delikler içeriden birbirine bağlıdır.'],
  ['I2C (SDA, SCL)', 'İki kabloyla birçok parçayı bağlayan yol. ESP32\'de SDA = D21, SCL = D22.'],
  ['PWM', 'Pini çok hızlı açıp kapatarak parlaklık ya da hız ayarlama.'],
  ['Röle', 'Kartın, pompa ya da lamba gibi büyük yükleri açıp kapatmasını sağlayan anahtar.'],
];

export default function Yardim() {
  return (
    <div className="sayfa dar-sayfa">
      <h1>Yardım</h1>

      <section>
        <h2>Bu site nasıl kullanılır?</h2>
        <ol className="numarali">
          <li>Ana sayfada hazır bir proje seç ya da boş proje aç.</li>
          <li>Üstteki 6 adımı sırayla izle: Fikir, Parçalar, Bağlantılar, Kontrol, Kod, Test.</li>
          <li>Her sayfanın altında "Sonraki" düğmesi var. Kaybolursan üstteki adım numaralarına bak.</li>
          <li>Bağlantılar adımında kabloları tek tek tak. Seçili kablonun iki ucundaki pinler yanar ve adları yazar.</li>
          <li>Kontrol adımında kırmızı hata varsa karta güç verme.</li>
        </ol>
      </section>

      <section>
        <h2>Claude ile proje kurmak</h2>
        <p>Claude Code'a fikrini "kendin-yap:" ile başlayarak yaz. Claude parçaları seçer, kabloları planlar, kodu yazar ve denetimden geçirir. Proje dosyası bu sitenin <code>projeler</code> klasörüne yazılır; sayfayı yenileyince "Projelerim" altında görünür.</p>
      </section>

      <section>
        <h2>Güvenlik</h2>
        <ul>
          <li>Kabloları takarken ya da değiştirirken kartın USB'sini çıkar.</li>
          <li>220 V şebeke elektriğiyle çalışma. Röle kullanacaksan yalnız düşük gerilimli yük bağla ya da bir ustaya danış.</li>
          <li>Bir parça ısınırsa ya da koku gelirse hemen USB'yi çıkar.</li>
          <li>Pil ve adaptörün + ve − uçlarını ters bağlama.</li>
        </ul>
      </section>

      <section>
        <h2>Sözlük</h2>
        <dl className="sozluk">
          {SOZLUK.map(([t, a]) => (
            <div key={t}><dt>{t}</dt><dd>{a}</dd></div>
          ))}
        </dl>
      </section>

      <section>
        <h2>Neler ücretsiz?</h2>
        <p>Sitenin tamamı bu bilgisayarda çalışır; hesap ya da ödeme yok. Parça görünümleri açık kaynak Wokwi Elements (MIT lisansı) kütüphanesinden gelir. Simülasyon için wokwi.com'un ücretsiz planı kullanılır.</p>
      </section>
    </div>
  );
}
