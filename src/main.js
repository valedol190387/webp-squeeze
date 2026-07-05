const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const sharp = require('sharp');

const REPO = 'valedol190387/webp-squeeze';

// Отключаем ограничение sharp по кэшу — работаем с большими картинками
sharp.cache(false);
sharp.concurrency(Math.max(1, require('os').cpus().length - 1));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 640,
    height: 720,
    minWidth: 480,
    minHeight: 560,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Проверка обновлений один раз после загрузки интерфейса
  mainWindow.webContents.once('did-finish-load', () => checkForUpdates());
}

// Сравнение версий вида 1.2.0 — true, если remote новее local
function isNewer(remote, local) {
  const r = String(remote).replace(/^v/, '').split('.').map(Number);
  const l = String(local).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    https
      .get(
        `https://api.github.com/repos/${REPO}/releases/latest`,
        { headers: { 'User-Agent': 'WebP-Squeeze', Accept: 'application/vnd.github+json' } },
        (res) => {
          if (res.statusCode !== 200) { res.resume(); return reject(new Error('status ' + res.statusCode)); }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
        }
      )
      .on('error', reject);
  });
}

// Тихо проверяем последний релиз; если новее — шлём баннер в интерфейс
async function checkForUpdates() {
  try {
    const rel = await fetchLatestRelease();
    if (rel && rel.tag_name && isNewer(rel.tag_name, app.getVersion())) {
      mainWindow.webContents.send('update-available', {
        version: String(rel.tag_name).replace(/^v/, ''),
        url: rel.html_url,
      });
    }
  } catch {
    /* оффлайн или лимит GitHub API — молча игнорируем */
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Форматы, которые принимаем на вход
const SUPPORTED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.gif', '.avif']);

function isSupported(filePath) {
  return SUPPORTED.has(path.extname(filePath).toLowerCase());
}

// Уникальное имя, чтобы не перезатирать существующие файлы
function uniquePath(dir, base, ext) {
  let candidate = path.join(dir, `${base}.${ext}`);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${i}).${ext}`);
    i++;
  }
  return candidate;
}

// Язык интерфейса системных диалогов — по локали ОС
const isRu = () => app.getLocale().toLowerCase().startsWith('ru');

// Диалог выбора файлов вручную (по кнопке)
ipcMain.handle('pick-files', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: isRu() ? 'Изображения' : 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'avif'] }],
  });
  if (res.canceled) return [];
  return res.filePaths.filter(isSupported);
});

// Диалог выбора папки для сохранения
ipcMain.handle('pick-output-dir', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('reveal', async (_e, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle('open-external', async (_e, url) => {
  // Открываем только http(s), чтобы не дёргать произвольные схемы
  if (/^https?:\/\//i.test(url)) shell.openExternal(url);
});

// Основная конвертация одного файла
ipcMain.handle('convert', async (_e, { filePath, quality, mode, format, outputDir }) => {
  try {
    const stat = fs.statSync(filePath);
    const inputSize = stat.size;
    const dir = outputDir || path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const isAvif = format === 'avif';
    const ext = isAvif ? 'avif' : 'webp';
    const outPath = uniquePath(dir, base, ext);

    // Параметры кодека. effort — максимальное усилие (как у CloudConvert):
    // у webp шкала 0–6, у avif 0–9 (9 слишком медленный, держим разумный баланс)
    const options = {
      quality: quality,
      effort: isAvif ? 4 : 6,
    };
    if (!isAvif) options.smartSubsample = true;
    if (mode === 'lossless') options.lossless = true;

    // rotate() без аргументов — авто-разворот по EXIF, чтобы не терять ориентацию.
    // animated только для webp (gif → анимированный webp)
    const pipeline = sharp(filePath, { failOn: 'none', animated: !isAvif }).rotate();
    await (isAvif ? pipeline.avif(options) : pipeline.webp(options)).toFile(outPath);

    const outputSize = fs.statSync(outPath).size;
    return {
      ok: true,
      filePath,
      outPath,
      inputSize,
      outputSize,
      saved: inputSize > 0 ? 1 - outputSize / inputSize : 0,
    };
  } catch (err) {
    return { ok: false, filePath, error: err.message };
  }
});
