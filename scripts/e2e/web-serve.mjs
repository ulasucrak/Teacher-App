#!/usr/bin/env node
// dist/ klasörünü sunan küçük statik sunucu (ek bağımlılık yok). Bilinmeyen yollar index.html'e
// düşer (SPA geri dönüşü), böylece /class/… gibi adresler yenilemede de açılır.
// Kullanım: node scripts/e2e/web-serve.mjs [port]   (varsayılan PORT ya da 8099)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { root } from './web-env.mjs';

const dist = resolve(process.env.DIST_DIR || join(root, 'dist'));
const port = Number(process.argv[2] || process.env.PORT || 8099);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(join(dist, 'index.html'))) {
  console.error(`${dist}/index.html yok; önce node scripts/e2e/web-build.mjs (ya da npm run build:web).`);
  process.exit(1);
}

createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = normalize(join(dist, pathname));
  if (file !== dist && !file.startsWith(dist + sep)) {
    res.writeHead(403).end();
    return;
  }
  const isFile = existsSync(file) && statSync(file).isFile();
  if (!isFile) {
    // Uzantılı bir dosya yoksa 404; diğer her şey uygulama yolu → index.html.
    if (extname(pathname) && extname(pathname) !== '.html') {
      res.writeHead(404).end();
      return;
    }
    file = join(dist, 'index.html');
  }
  res.writeHead(200, {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`dist/ sunuluyor: http://localhost:${port}`);
});
