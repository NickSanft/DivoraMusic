// Optimize the artist photo for the web.
//
// Reads public/divora.png (the canonical source — checked into git
// and used by anything that wants the raw photo), emits:
//   - public/divora.webp           — same dimensions, ~3× smaller
//   - public/divora@2x.webp        — original-size webp for retina
//
// `<picture>` in index.html prefers webp and falls back to PNG.
//
// Usage: npm run images:optimize  (re-run when the source PNG changes)

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'divora.png');

async function main() {
  const meta = await sharp(SRC).metadata();
  // eslint-disable-next-line no-console
  console.log(`source: ${meta.width}×${meta.height} ${meta.format}`);

  // Target a tighter base size: the about-photo container caps at
  // 420px wide × ~560px tall, with `aspect-ratio: 3/4`. Source is
  // 528×493 — close to 1:1. We resize to 528×528 max (preserving
  // aspect) and let the browser scale within the container.
  const targetW = 528;

  const baseBuf = await sharp(SRC)
    .resize({ width: targetW, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toBuffer();
  const retinaBuf = await sharp(SRC)
    .resize({ width: targetW * 2, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toBuffer();

  const base = path.join(ROOT, 'public', 'divora.webp');
  const retina = path.join(ROOT, 'public', 'divora@2x.webp');
  await fs.writeFile(base, baseBuf);
  await fs.writeFile(retina, retinaBuf);

  const baseSize = (baseBuf.length / 1024).toFixed(1);
  const retinaSize = (retinaBuf.length / 1024).toFixed(1);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote divora.webp  (${baseSize} KB)`);
  // eslint-disable-next-line no-console
  console.log(`✓ wrote divora@2x.webp  (${retinaSize} KB)`);
}

main().catch((err) => {
  console.error('image optimization failed:', err);
  process.exit(1);
});
