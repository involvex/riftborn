const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const forceDist =
  app.isPackaged ||
  process.argv.includes('--dist') ||
  process.env.ELECTRON_FORCE_DIST === '1';

function findDistIndex() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

async function loadApp(win) {
  if (forceDist) {
    const found = findDistIndex();
    if (!found) {
      dialog.showErrorBox(
        'Riftborn',
        'Game build not found (dist/index.html).\nRun: bun run build',
      );
      app.quit();
      return;
    }
    await win.loadFile(found);
    return;
  }

  const url = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
  try {
    await win.loadURL(url);
    if (!app.isPackaged) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } catch (err) {
    const found = findDistIndex();
    if (found) {
      await win.loadFile(found);
      return;
    }
    dialog.showErrorBox(
      'Riftborn',
      `Could not reach the Vite dev server at ${url}.\n\n` +
        `Use:\n  bun run desktop\n` +
        `or:\n  bun run desktop:prod\n\n` +
        String(err?.message ?? err),
    );
    app.quit();
  }
}

async function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'Riftborn',
    backgroundColor: '#0a0c10',
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.removeMenu();
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await loadApp(win);
}

app.whenReady().then(() => {
  createWindow().catch((err) => {
    dialog.showErrorBox('Riftborn', String(err?.message ?? err));
    app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(() => app.quit());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
