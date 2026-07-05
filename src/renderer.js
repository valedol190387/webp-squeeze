const dropEl = document.getElementById('drop');
const filesEl = document.getElementById('files');
const presetsEl = document.getElementById('presets');
const qualityEl = document.getElementById('quality');
const qvalEl = document.getElementById('qval');
const outDirEl = document.getElementById('outDir');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const summaryEl = document.getElementById('summary');
const langEl = document.getElementById('lang');

// --- Локализация: авто RU/EN по языку системы, с ручным переключателем ---
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* file:// без хранилища */ } },
};

// Приоритет: ручной выбор из прошлого запуска → иначе язык системы
let LANG = store.get('lang') || ((navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en');

const DICT = {
  ru: {
    subtitle: '— умное сжатие изображений',
    drop_big: 'Перетащи изображения сюда',
    drop_small: 'PNG · JPG · JPEG · или нажми, чтобы выбрать',
    preset_label: 'Пресет',
    preset_max: 'Макс. качество',
    preset_balance: 'Баланс',
    preset_min: 'Макс. сжатие',
    preset_lossless: 'Без потерь',
    quality_label: 'Качество',
    outdir_label: 'Сохранять в',
    outdir_default: 'рядом с оригиналом',
    outdir_tooltip: 'Нажми, чтобы выбрать папку',
    convert: 'Сжать в WebP',
    converting: 'Сжимаю…',
    clear: 'Очистить',
    error_prefix: 'ошибка: ',
  },
  en: {
    subtitle: '— smart image compression',
    drop_big: 'Drop images here',
    drop_small: 'PNG · JPG · JPEG · or click to choose',
    preset_label: 'Preset',
    preset_max: 'Max quality',
    preset_balance: 'Balance',
    preset_min: 'Max compression',
    preset_lossless: 'Lossless',
    quality_label: 'Quality',
    outdir_label: 'Save to',
    outdir_default: 'next to original',
    outdir_tooltip: 'Click to choose a folder',
    convert: 'Squeeze to WebP',
    converting: 'Squeezing…',
    clear: 'Clear',
    error_prefix: 'error: ',
  },
};

const t = (key) => (DICT[LANG][key] ?? DICT.en[key] ?? key);

function summaryText(n, a, b, p) {
  return LANG === 'ru'
    ? `Готово: ${n} шт · ${a} → ${b} · экономия <b>${p}%</b>. Клик по файлу — показать в папке.`
    : `Done: ${n} · ${a} → ${b} · saved <b>${p}%</b>. Click a file to reveal it.`;
}

function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

function markLangActive() {
  langEl.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.lang === LANG));
}

// Смена языка вручную — переприменяем статику и обновляем динамические подписи
function setLang(lang) {
  if (lang === LANG) return;
  LANG = lang;
  store.set('lang', lang);
  applyStaticI18n();
  markLangActive();
  if (!state.busy) convertBtn.textContent = t('convert');
  if (!state.outputDir) {
    outDirEl.textContent = t('outdir_default');
    outDirEl.title = t('outdir_tooltip');
  }
  qvalEl.textContent = state.mode === 'lossless' ? '—' : state.quality;
}

langEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) setLang(btn.dataset.lang);
});

applyStaticI18n();
markLangActive();

const state = {
  files: [],        // { path, name, el }
  quality: 82,
  mode: 'lossy',    // 'lossy' | 'lossless'
  outputDir: null,  // null = рядом с оригиналом
  busy: false,
};

const SUPPORTED = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'avif'];

function fmtSize(bytes) {
  const u = LANG === 'ru' ? ['Б', 'КБ', 'МБ'] : ['B', 'KB', 'MB'];
  if (bytes < 1024) return bytes + ' ' + u[0];
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' ' + u[1];
  return (bytes / 1024 / 1024).toFixed(1) + ' ' + u[2];
}

function extOk(name) {
  const ext = name.split('.').pop().toLowerCase();
  return SUPPORTED.includes(ext);
}

function render() {
  filesEl.innerHTML = '';
  state.files.forEach((f, idx) => {
    const row = document.createElement('div');
    row.className = 'file';
    row.innerHTML = `
      <span class="name">${escapeHtml(f.name)}</span>
      <span class="meta" data-role="meta"></span>
      <span class="rm" data-idx="${idx}">✕</span>`;
    f.el = row;
    filesEl.appendChild(row);
  });
  convertBtn.disabled = state.files.length === 0 || state.busy;
  clearBtn.disabled = state.busy;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function addPaths(paths) {
  const existing = new Set(state.files.map((f) => f.path));
  for (const p of paths) {
    if (!p || existing.has(p)) continue;
    const name = p.split('/').pop();
    if (!extOk(name)) continue;
    state.files.push({ path: p, name });
    existing.add(p);
  }
  summaryEl.textContent = '';
  render();
}

// --- Drag & Drop ---
['dragenter', 'dragover'].forEach((ev) =>
  dropEl.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropEl.classList.add('over'); })
);
['dragleave', 'drop'].forEach((ev) =>
  dropEl.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropEl.classList.remove('over'); })
);
dropEl.addEventListener('drop', (e) => {
  const paths = [];
  for (const file of e.dataTransfer.files) {
    paths.push(window.api.getPathForFile(file));
  }
  addPaths(paths);
});

// Клик по зоне — открыть диалог выбора файлов
dropEl.addEventListener('click', async () => {
  const paths = await window.api.pickFiles();
  addPaths(paths);
});

// Удаление файла из списка
filesEl.addEventListener('click', (e) => {
  const rm = e.target.closest('.rm');
  if (rm && !state.busy) {
    state.files.splice(Number(rm.dataset.idx), 1);
    render();
    return;
  }
  // Клик по готовому файлу — показать в Finder
  const row = e.target.closest('.file.done');
  if (row && row.dataset.out) window.api.reveal(row.dataset.out);
});

// --- Пресеты и слайдер ---
presetsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  [...presetsEl.children].forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  const preset = btn.dataset.preset;
  state.mode = preset === 'lossless' ? 'lossless' : 'lossy';
  state.quality = Number(btn.dataset.q);
  qualityEl.value = state.quality;
  qvalEl.textContent = state.mode === 'lossless' ? '—' : state.quality;
  qualityEl.disabled = state.mode === 'lossless';
});

qualityEl.addEventListener('input', () => {
  state.quality = Number(qualityEl.value);
  qvalEl.textContent = state.quality;
  // Ручная правка слайдера сбрасывает пресет в "свой"
  [...presetsEl.children].forEach((b) => b.classList.remove('active'));
  state.mode = 'lossy';
});

// --- Папка вывода ---
outDirEl.addEventListener('click', async () => {
  const dir = await window.api.pickOutputDir();
  if (dir) {
    state.outputDir = dir;
    outDirEl.textContent = dir.split('/').pop() || dir;
    outDirEl.title = dir;
  }
});

// --- Конвертация ---
convertBtn.addEventListener('click', async () => {
  if (state.busy || state.files.length === 0) return;
  state.busy = true;
  render();
  convertBtn.textContent = t('converting');

  let totalIn = 0, totalOut = 0, okCount = 0;

  for (const f of state.files) {
    const meta = f.el.querySelector('[data-role="meta"]');
    const rm = f.el.querySelector('.rm');
    if (rm) rm.remove();
    meta.innerHTML = '<span class="spin"></span>';

    const res = await window.api.convert({
      filePath: f.path,
      quality: state.quality,
      mode: state.mode,
      outputDir: state.outputDir,
    });

    if (res.ok) {
      okCount++;
      totalIn += res.inputSize;
      totalOut += res.outputSize;
      const pct = Math.round(res.saved * 100);
      meta.innerHTML = `${fmtSize(res.inputSize)} → ${fmtSize(res.outputSize)} <span class="saved">−${pct}%</span>`;
      f.el.classList.add('done');
      f.el.dataset.out = res.outPath;
    } else {
      meta.innerHTML = `<span class="err">${t('error_prefix')}${escapeHtml(res.error)}</span>`;
    }
  }

  state.busy = false;
  convertBtn.textContent = t('convert');
  render();

  if (okCount > 0) {
    const totalPct = Math.round((1 - totalOut / totalIn) * 100);
    summaryEl.innerHTML = summaryText(okCount, fmtSize(totalIn), fmtSize(totalOut), totalPct);
  }
});

clearBtn.addEventListener('click', () => {
  if (state.busy) return;
  state.files = [];
  summaryEl.textContent = '';
  render();
});
