// Генерирует фон окна DMG (assets/dmg-background.png + @2x) с инструкцией
// и стрелкой «перетащи в Applications» + предупреждением про «повреждено».
const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
const W = 600, H = 520;

const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#12151b"/>
      <stop offset="1" stop-color="#0d0f13"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <style>
    .t  { font-family: -apple-system, 'SF Pro Text', Helvetica, Arial, sans-serif; }
  </style>

  <!-- Заголовок -->
  <text x="300" y="40" text-anchor="middle" class="t" font-size="17" font-weight="600" fill="#e7ebf2">
    Drag WebP Squeeze onto the Applications folder
  </text>

  <!-- Предупреждение -->
  <rect x="44" y="60" width="512" height="112" rx="14" fill="#f0a44e" fill-opacity="0.09" stroke="#e0973a" stroke-opacity="0.55"/>
  <text x="66" y="92" class="t" font-size="15" font-weight="700" fill="#f2ac57">⚠  First launch: macOS may say the app is “damaged”</text>
  <text x="66" y="118" class="t" font-size="13.5" fill="#c7cdd8">It isn’t — it’s just unsigned (a free app can’t pay Apple’s $99/yr).</text>
  <text x="66" y="140" class="t" font-size="13.5" fill="#c7cdd8">Fix: right-click the app → Open. Or read “READ ME FIRST”.</text>
  <text x="66" y="160" class="t" font-size="12.5" fill="#8b93a4">Повреждено? Это норма — открой «READ ME FIRST» внутри. Инструкция там.</text>

  <!-- Стрелка между иконками -->
  <g stroke="#5b8cff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="238" y1="285" x2="352" y2="285"/>
    <polyline points="336,270 356,285 336,300"/>
  </g>

  <!-- Подсказка к файлу READ ME -->
  <text x="300" y="372" text-anchor="middle" class="t" font-size="13" fill="#8b93a4">First launch blocked? Open this file ↓</text>
</svg>`;

async function main() {
  const buf = Buffer.from(svg);
  await sharp(buf).png().toFile(path.join(assetsDir, 'dmg-background.png'));
  await sharp(buf).resize(W * 2, H * 2).png().toFile(path.join(assetsDir, 'dmg-background@2x.png'));
  console.log(`✅ dmg-background.png (${W}×${H}) + @2x`);
}

main().catch((e) => { console.error(e); process.exit(1); });
