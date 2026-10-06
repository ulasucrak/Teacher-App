// Cloudflare Pages does not upload any directory named `node_modules`.
// `expo export -p web` places package assets (fonts, icons) under
// dist/assets/node_modules/..., so those files would 404 (served as index.html).
// This step moves them to dist/assets/vendor/ and rewrites references.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (!fs.existsSync(from)) {
  console.log('fix-web-assets: no assets/node_modules, nothing to do');
  process.exit(0);
}
fs.rmSync(to, { recursive: true, force: true });
fs.renameSync(from, to);

const textExt = new Set(['.js', '.html', '.json', '.css', '.map']);
let changed = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (textExt.has(path.extname(entry.name))) {
      const src = fs.readFileSync(p, 'utf8');
      const out = src.replaceAll('assets/node_modules/', 'assets/vendor/');
      if (out !== src) {
        fs.writeFileSync(p, out);
        changed++;
      }
    }
  }
};
walk(dist);
console.log(`fix-web-assets: moved assets/node_modules -> assets/vendor, updated ${changed} file(s)`);
