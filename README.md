<div align="center">
  <img src="assets/icon-source.png" width="140" alt="WebP Squeeze" />
  <h1>WebP Squeeze 🗜️</h1>
  <p><b>Минималистичный офлайн-конвертер изображений в WebP для macOS и Windows.</b><br/>
  Качество сжатия на уровне CloudConvert — тот же кодек <code>libwebp</code>, только локально, бесплатно и без лимитов.</p>

  <img alt="platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="built with" src="https://img.shields.io/badge/built%20with-Electron%20%2B%20sharp-5b8cff" />
</div>

---

## ✨ Возможности

- **Drag & drop** PNG / JPG / JPEG → WebP (и TIFF/GIF/AVIF на вход)
- **Пресеты**: Макс. качество · Баланс · Макс. сжатие · Без потерь + ручной слайдер
- **Батч** — сотни файлов за раз
- Показывает экономию по каждому файлу и суммарно
- Сохраняет рядом с оригиналом или в выбранную папку
- Клик по готовому файлу — открыть в проводнике / Finder
- 100% офлайн: картинки никуда не уходят, работает без интернета

## 📦 Установка

Скачай готовый установщик со страницы **[Releases](https://github.com/valedol190387/webp-squeeze/releases/latest)**:

| ОС | Файл |
|----|------|
| **macOS** (Apple Silicon) | `WebP Squeeze-x.x.x-arm64.dmg` |
| **Windows** (x64) | `WebP Squeeze Setup x.x.x.exe` (установщик) или `...portable.exe` (без установки) |

### macOS — первый запуск
Приложение не подписано сертификатом Apple ($99/год), поэтому macOS попросит подтверждение:
правый клик по иконке → **Открыть** → **Открыть**. Один раз — дальше как обычно.
Если всё равно блокирует:
```bash
xattr -cr "/Applications/WebP Squeeze.app"
```

### Windows — первый запуск
SmartScreen может показать «Windows защитила ваш компьютер» → **Подробнее** → **Выполнить в любом случае** (приложение не подписано EV-сертификатом).

## 🛠 Сборка из исходников

```bash
pnpm install
pnpm run icon      # сгенерировать иконки из assets/icon-source.png (один раз)
pnpm start         # запустить в режиме разработки

pnpm run dist      # собрать под текущую ОС
pnpm run dist:mac  # только macOS (.dmg)
pnpm run dist:win  # только Windows (.exe) — требует Windows или CI
```

> Кросс-сборка Windows на macOS не поддерживается надёжно (нативный модуль `sharp` + NSIS).
> Обе платформы собираются автоматически через **GitHub Actions** — см. ниже.

## 🤖 Релиз через GitHub Actions

Сборка `.dmg` и `.exe` идёт на нативных раннерах GitHub. Чтобы выпустить релиз:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Workflow [`.github/workflows/build.yml`](.github/workflows/build.yml) соберёт установщики под macOS и Windows и приложит их к GitHub Release автоматически.

## 🧩 Как это работает

- **Electron** — окно и упаковка в нативное приложение
- **sharp** (libvips + libwebp) — движок сжатия, `quality` + `effort: 6` + `smartSubsample` (настройки уровня CloudConvert)

---

## English

**WebP Squeeze** is a minimalist, fully offline image-to-WebP converter for macOS and Windows. It uses the same `libwebp` codec as CloudConvert (`effort 6`, smart subsampling) — top-tier compression, locally and for free.

Drag & drop PNG/JPG, pick a quality preset or slider, hit convert. Batch supported, shows per-file and total savings. Grab a build from [Releases](https://github.com/valedol190387/webp-squeeze/releases/latest), or build from source with `pnpm install && pnpm start`.

Built with Electron + sharp. MIT licensed.

## 📄 Лицензия

[MIT](LICENSE) © Valentin Bryukhantsev
