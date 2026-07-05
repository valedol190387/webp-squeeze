const dropEl = document.getElementById('drop');
const filesEl = document.getElementById('files');
const presetsEl = document.getElementById('presets');
const qualityEl = document.getElementById('quality');
const qvalEl = document.getElementById('qval');
const outDirEl = document.getElementById('outDir');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const summaryEl = document.getElementById('summary');

const state = {
  files: [],        // { path, name, el }
  quality: 82,
  mode: 'lossy',    // 'lossy' | 'lossless'
  outputDir: null,  // null = рядом с оригиналом
  busy: false,
};

const SUPPORTED = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'gif', 'avif'];

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' КБ';
  return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
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
  convertBtn.textContent = 'Сжимаю…';

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
      meta.innerHTML = `<span class="err">ошибка: ${escapeHtml(res.error)}</span>`;
    }
  }

  state.busy = false;
  convertBtn.textContent = 'Сжать в WebP';
  render();

  if (okCount > 0) {
    const totalPct = Math.round((1 - totalOut / totalIn) * 100);
    summaryEl.innerHTML = `Готово: ${okCount} шт · ${fmtSize(totalIn)} → ${fmtSize(totalOut)} · экономия <b>${totalPct}%</b>. Клик по файлу — показать в Finder.`;
  }
});

clearBtn.addEventListener('click', () => {
  if (state.busy) return;
  state.files = [];
  summaryEl.textContent = '';
  render();
});
