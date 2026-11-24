// Kendin Yap logosu "Fikirden ışığa": boş halkadan (fikir) çıkan devre yolu yanan bir LED'de biter.
// Renk temadan gelir (--ana). Sekme simgesi index.html içinde aynı çizimdir.
export default function Logo({ boyut = 34 }) {
  return (
    <svg className="logo-svg" width={boyut} height={boyut} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M7 21V15l5-5h8l5 5v3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="24" r="2.8" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="25" cy="23" r="7" fill="currentColor" opacity="0.22" />
      <circle cx="25" cy="23" r="3.6" fill="currentColor" />
    </svg>
  );
}
