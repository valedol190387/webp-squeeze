// Снимает чистый скриншот реального UI приложения для README.
// Загружает index.html, наполняет список правдоподобными данными
// (через настоящие функции рендера) и сохраняет PNG со скруглёнными углами.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', 'assets');

// JS, исполняемый в контексте страницы: ставим язык и наполняем список
function populateScript(lang) {
  return `(() => {
    setLang('${lang}');
    // Пресет «Баланс» уже активен по умолчанию
    const samples = [
      ['hero-banner.png', 2411000, 214000],
      ['product-photo.jpg', 1830000, 268000],
      ['team-portrait.jpg', 992000, 141000],
      ['screenshot-ui.png', 640000, 88000],
    ];
    let ti = 0, to = 0;
    filesEl.innerHTML = samples.map(([n, a, b]) => {
      ti += a; to += b;
      const pct = Math.round((1 - b / a) * 100);
      return '<div class="file done"><span class="name">' + n + '</span>' +
        '<span class="meta">' + fmtSize(a) + ' → ' + fmtSize(b) +
        ' <span class="saved">−' + pct + '%</span></span></div>';
    }).join('');
    convertBtn.disabled = false;
    summaryEl.innerHTML = summaryText(samples.length, fmtSize(ti), fmtSize(to), Math.round((1 - to / ti) * 100));
    return Math.ceil(summaryEl.getBoundingClientRect().bottom);
  })()`;
}

async function shoot(win, lang, outName) {
  const contentH = await win.webContents.executeJavaScript(populateScript(lang));
  await new Promise((r) => setTimeout(r, 400));
  const img = win.webContents.capturePage();
  const png = (await img).toPNG();

  const meta = await sharp(png).metadata();
  const scale = meta.width / win.getBounds().width; // retina-фактор
  const cropH = Math.min(meta.height, Math.round((contentH + 20) * scale)); // + низ. поле

  // Обрезаем по контенту, затем скругляем углы (маска dest-in) — плавающее окно
  const cropped = await sharp(png).extract({ left: 0, top: 0, width: meta.width, height: cropH }).png().toBuffer();
  const r = 26;
  const mask = Buffer.from(
    `<svg width="${meta.width}" height="${cropH}"><rect width="${meta.width}" height="${cropH}" rx="${r}" ry="${r}"/></svg>`
  );
  await sharp(cropped)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(path.join(assetsDir, outName));
  console.log('✅', outName, `${meta.width}×${cropH}`);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 660,
    height: 900,
    show: true,
    x: -3000, // за пределами экрана, чтобы не мигало
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await new Promise((r) => setTimeout(r, 500));

  fs.mkdirSync(assetsDir, { recursive: true });
  await shoot(win, 'en', 'screenshot.png');     // для README.md (английский)
  await shoot(win, 'ru', 'screenshot-ru.png');  // для README.ru.md (русский)

  app.quit();
});
