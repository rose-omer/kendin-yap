import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { derlemeUcu } from './sunucu/derle.js';
import { fiyatUcu } from './sunucu/fiyat.js';
import { vekilUcu } from './sunucu/vekil.js';

// Yalnız geliştirmede: pin-dokum.html Wokwi parçalarının pin verisini buraya gönderir,
// biz de src/veri/pinler.json dosyasına yazarız. Claude skill'i ve denetim betiği bu dosyayı okur.
function pinDokumu() {
  return {
    name: 'pin-dokumu',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__pinler', (req, res) => {
        if (req.method !== 'POST') return res.writeHead(405).end();
        let govde = '';
        req.on('data', (parca) => (govde += parca));
        req.on('end', async () => {
          const veri = JSON.parse(govde);
          await writeFile(new URL('./src/veri/pinler.json', import.meta.url), JSON.stringify(veri, null, 1) + '\n');
          res.writeHead(200).end('ok');
        });
      });
    },
  };
}

// Port 8200: bu makinede 8000, 1984, 8554, 8555 canlı IyexVMS'e ayrılmış.
export default defineConfig({
  plugins: [react(), pinDokumu(), derlemeUcu(fileURLToPath(new URL('.', import.meta.url))), fiyatUcu(), vekilUcu()],
  server: {
    host: '127.0.0.1',
    port: 8200,
    strictPort: true,
    // ESP32 simülasyonu SharedArrayBuffer kullanır; tarayıcı bunun için yalıtım ister.
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' },
  },
});
