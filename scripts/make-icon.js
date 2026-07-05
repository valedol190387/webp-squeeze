// Делает иконки приложения из готовой картинки assets/icon-source.png:
//  • assets/icon.icns — для macOS (скруглённый «squircle», поля по краям)
//  • assets/icon.ico  — для Windows (полноквадратная)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const assetsDir = path.join(__dirname, '..', 'assets');
const source = path.join(assetsDir, 'icon-source.png');
const iconset = path.join(assetsDir, 'icon.iconset');

// Параметры сетки иконки macOS (Big Sur+): арт занимает ~80% холста
const CANVAS = 1024;
const CONTENT = 824;             // размер арта на холсте 1024
const MARGIN = (CANVAS - CONTENT) / 2; // 100
const RADIUS = Math.round(CONTENT * 0.2246); // фирменное скругление ~185

async function buildMaster() {
  // 1024-й арт, ужатый в 824 и наложенный на прозрачный холст со скруглением
  const roundedMask = Buffer.from(
    `<svg width="${CONTENT}" height="${CONTENT}"><rect width="${CONTENT}" height="${CONTENT}" rx="${RADIUS}" ry="${RADIUS}"/></svg>`
  );

  const art = await sharp(source)
    .resize(CONTENT, CONTENT, { fit: 'cover' })
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, top: MARGIN, left: MARGIN }])
    .png()
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error('❌ Нет assets/icon-source.png');
    process.exit(1);
  }
  fs.rmSync(iconset, { recursive: true, force: true });
  fs.mkdirSync(iconset, { recursive: true });

  const master = await buildMaster();
  const sizes = [16, 32, 64, 128, 256, 512, 1024];

  for (const size of sizes) {
    await sharp(master).resize(size, size).png().toFile(path.join(iconset, `icon_${size}x${size}.png`));
    if (size <= 512) {
      await sharp(master).resize(size * 2, size * 2).png().toFile(path.join(iconset, `icon_${size}x${size}@2x.png`));
    }
  }

  try {
    execSync(`iconutil -c icns "${iconset}" -o "${path.join(assetsDir, 'icon.icns')}"`);
    console.log('✅ assets/icon.icns создан (macOS)');
  } catch (e) {
    console.warn('⚠️  iconutil не сработал (нужен macOS).');
  }

  // Windows .ico — полноквадратная картинка в наборе размеров
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoBuffers = await Promise.all(
    icoSizes.map((s) => sharp(source).resize(s, s, { fit: 'cover' }).png().toBuffer())
  );
  const ico = await pngToIco(icoBuffers);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), ico);
  console.log('✅ assets/icon.ico создан (Windows)');
}

main().catch((e) => { console.error(e); process.exit(1); });
