// Хук electron-builder: после упаковки .app накладываем валидную ad-hoc
// подпись на НАШ бандл. Без этого на Apple Silicon скачанное приложение
// ругается «повреждено» (унаследованная подпись Electron ломается при сборке).
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log('afterPack: ad-hoc signing', app);
  // --force перезаписывает сломанную подпись, --deep подписывает вложенный код
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' });
};
