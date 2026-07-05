const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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
function uniquePath(dir, base) {
  let candidate = path.join(dir, `${base}.webp`);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${i}).webp`);
    i++;
  }
  return candidate;
}

// Диалог выбора файлов вручную (по кнопке)
ipcMain.handle('pick-files', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'avif'] }],
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

// Основная конвертация одного файла
ipcMain.handle('convert', async (_e, { filePath, quality, mode, outputDir }) => {
  try {
    const stat = fs.statSync(filePath);
    const inputSize = stat.size;
    const dir = outputDir || path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const outPath = uniquePath(dir, base);

    // Параметры webp по режиму. effort 6 = максимальное усилие кодека (как у CloudConvert)
    const webpOptions = {
      quality: quality,
      effort: 6,
      smartSubsample: true,
    };
    if (mode === 'lossless') {
      webpOptions.lossless = true;
      webpOptions.nearLossless = false;
    }

    // rotate() без аргументов — авто-разворот по EXIF, чтобы не терять ориентацию
    await sharp(filePath, { failOn: 'none', animated: true })
      .rotate()
      .webp(webpOptions)
      .toFile(outPath);

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
