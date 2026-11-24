import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { hoverTooltip } from '@codemirror/view';
import { lintGutter, setDiagnostics } from '@codemirror/lint';

// Sitenin renklerine uyan düzenleyici teması (açık ve koyu temada CSS değişkenleriyle çalışır).
const tema = EditorView.theme({
  '&': { backgroundColor: 'var(--yuzey)', color: 'var(--yazi)', border: '1px solid var(--cizgi)', borderRadius: 'var(--yaricap)', fontSize: 'var(--yazi-s)' },
  '&.cm-focused': { outline: 'none', borderColor: 'var(--ana)', boxShadow: '0 0 0 3px var(--ana-acik)' },
  '.cm-scroller': { fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace", lineHeight: '1.55' },
  '.cm-gutters': { backgroundColor: 'var(--yuzey-2)', color: 'var(--yazi-2)', border: 'none', borderRadius: 'var(--yaricap) 0 0 var(--yaricap)' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--ana-acik) 45%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--ana-acik)' },
  '.cm-cursor': { borderLeftColor: 'var(--ana)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--ana-acik) !important' },
  '.cm-tooltip': { backgroundColor: 'var(--yazi)', color: 'var(--zemin)', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: 'var(--yazi-s)' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--hata)' },
});

export default function KodDuzenleyici({ deger, onChange, hatalar = [], pinIpucu, onPinUstunde, etiket }) {
  const kapRef = useRef(null);
  const gorunumRef = useRef(null);
  const geriRef = useRef({ onChange, pinIpucu, onPinUstunde });
  geriRef.current = { onChange, pinIpucu, onPinUstunde };

  useEffect(() => {
    // Pin sabitinin üstüne gelince ipucu göster ve şemada o pini yak.
    const ipucu = hoverTooltip((gorunum, konum) => {
      const satir = gorunum.state.doc.lineAt(konum);
      const metin = satir.text;
      let bas = konum - satir.from;
      let son = bas;
      while (bas > 0 && /\w/.test(metin[bas - 1])) bas--;
      while (son < metin.length && /\w/.test(metin[son])) son++;
      const kelime = metin.slice(bas, son);
      const bilgi = kelime && geriRef.current.pinIpucu?.(kelime);
      if (!bilgi) return null;
      geriRef.current.onPinUstunde?.(kelime);
      return {
        pos: satir.from + bas,
        end: satir.from + son,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.textContent = bilgi;
          return { dom, destroy: () => geriRef.current.onPinUstunde?.(null) };
        },
      };
    }, { hoverTime: 250 });

    const gorunum = new EditorView({
      doc: deger,
      parent: kapRef.current,
      extensions: [
        basicSetup,
        cpp(),
        tema,
        EditorView.lineWrapping,
        lintGutter(),
        ipucu,
        EditorView.contentAttributes.of({ 'aria-label': etiket || 'Kod düzenleyici' }),
        EditorView.updateListener.of((g) => {
          if (g.docChanged) geriRef.current.onChange?.(g.state.doc.toString());
        }),
      ],
    });
    gorunumRef.current = gorunum;
    return () => gorunum.destroy();
    // Düzenleyici bir kez kurulur; değer değişimi aşağıdaki etkiyle aktarılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dışarıdan gelen değer (ör. "Değişiklikleri geri al") düzenleyicidekinden farklıysa güncelle.
  useEffect(() => {
    const g = gorunumRef.current;
    if (g && g.state.doc.toString() !== deger) g.dispatch({ changes: { from: 0, to: g.state.doc.length, insert: deger } });
  }, [deger]);

  // Derleme hataları: satırın başında kırmızı işaret ve açıklama.
  useEffect(() => {
    const g = gorunumRef.current;
    if (!g) return;
    const doc = g.state.doc;
    const tani = hatalar
      .filter((h) => h.satir >= 1 && h.satir <= doc.lines)
      .map((h) => {
        const satir = doc.line(h.satir);
        const from = Math.min(satir.from + Math.max(0, (h.sutun || 1) - 1), satir.to);
        return { from, to: Math.max(from, satir.to), severity: h.seviye === 'uyari' ? 'warning' : 'error', message: h.mesaj };
      });
    g.dispatch(setDiagnostics(g.state, tani));
  }, [hatalar]);

  return <div ref={kapRef} className="kod-duzenleyici" />;
}

// Derleyici çıktısından "sketch.ino:12:5: error: ..." satırlarını ayıklar.
export function hatalariAyikla(cikti) {
  const hatalar = [];
  for (const m of (cikti || '').matchAll(/sketch\.ino:(\d+):(\d+):\s*(fatal error|error|warning):\s*(.+)/g)) {
    hatalar.push({ satir: Number(m[1]), sutun: Number(m[2]), seviye: m[3] === 'warning' ? 'uyari' : 'hata', mesaj: m[4].trim() });
  }
  return hatalar;
}
