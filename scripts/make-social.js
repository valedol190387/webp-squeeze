// Генерирует assets/social-preview.png (1280×640) — карточка для шаринга
// ссылки на репозиторий в соцсетях (GitHub Settings → Social preview).
const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const source = path.join(assetsDir, 'icon-source.png');
const W = 1280, H = 640;

async function main() {
  // Иконка со скруглением
  const iconSize = 300;
  const rmask = Buffer.from(`<svg width="${iconSize}" height="${iconSize}"><rect width="${iconSize}" height="${iconSize}" rx="64" ry="64"/></svg>`);
  const icon = await sharp(source)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .composite([{ input: rmask, blend: 'dest-in' }])
    .png().toBuffer();

  const bg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0f1115"/>
          <stop offset="1" stop-color="#161b16"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.28" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#3fae5a" stop-opacity="0.25"/>
          <stop offset="1" stop-color="#3fae5a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
    </svg>`);

  const text = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .t { font-family: -apple-system, 'SF Pro Display', Helvetica, Arial, sans-serif; fill: #e7ebf2; }
      </style>
      <text x="470" y="250" class="t" font-size="76" font-weight="700" letter-spacing="-2">WebP Squeeze</text>
      <text x="472" y="315" class="t" font-size="34" font-weight="400" fill="#aeb6c4">Minimalist offline image → WebP / AVIF</text>
      <text x="472" y="360" class="t" font-size="34" font-weight="400" fill="#aeb6c4">converter for macOS &amp; Windows</text>
      <text x="472" y="452" class="t" font-size="26" font-weight="600" fill="#46d19e" letter-spacing="1">CloudConvert-grade · free · open-source</text>
    </svg>`);

  await sharp(bg)
    .composite([
      { input: icon, left: 110, top: 170 },
      { input: text, left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(assetsDir, 'social-preview.png'));
  console.log('✅ assets/social-preview.png создан');
}

main().catch((e) => { console.error(e); process.exit(1); });
