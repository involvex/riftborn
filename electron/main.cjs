const { app, BrowserWindow, dialog, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const forceDist =
  app.isPackaged ||
  process.argv.includes('--dist') ||
  process.env.ELECTRON_FORCE_DIST === '1';

const BOUNDS_FILE = 'window-bounds.json';

function boundsPath() {
  return path.join(app.getPath('userData'), BOUNDS_FILE);
}

function loadBounds() {
  try {
    const raw = fs.readFileSync(boundsPath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.width === 'number' &&
      typeof parsed?.height === 'number'
    ) {
      return parsed;
    }
  } catch {
    /* first run */
  }
  return null;
}

function saveBounds(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) return;
  const bounds = win.getBounds();
  const payload = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: win.isMaximized(),
  };
  try {
    fs.writeFileSync(boundsPath(), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function clampBounds(bounds) {
  const displays = screen.getAllDisplays();
  const intersects = displays.some((d) => {
    const b = d.bounds;
    return (
      bounds.x < b.x + b.width &&
      bounds.x + bounds.width > b.x &&
      bounds.y < b.y + b.height &&
      bounds.y + bounds.height > b.y
    );
  });
  if (intersects) return bounds;
  const primary = screen.getPrimaryDisplay().workArea;
  return {
    ...bounds,
    x: primary.x + 40,
    y: primary.y + 40,
  };
}

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
  const saved = loadBounds();
  const opts = {
    width: saved?.width ?? 1280,
    height: saved?.height ?? 720,
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
  };
  if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
    const clamped = clampBounds({
      x: saved.x,
      y: saved.y,
      width: opts.width,
      height: opts.height,
    });
    opts.x = clamped.x;
    opts.y = clamped.y;
  }

  const win = new BrowserWindow(opts);

  win.removeMenu();
  win.once('ready-to-show', () => {
    if (saved?.isMaximized) win.maximize();
    win.show();
  });

  const persist = () => saveBounds(win);
  win.on('resize', persist);
  win.on('move', persist);
  win.on('close', persist);

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url);
      if (protocol === 'https:' || protocol === 'http:') {
        void shell.openExternal(url);
      }
    } catch {
      /* ignore malformed / non-URL open attempts */
    }
    return { action: 'deny' };
  });

  await loadApp(win);
}

// Taskbar grouping for portable/dev. Store AppX already owns the AUMID —
// overriding it with a non-package id breaks jump lists / toast grouping.
if (process.platform === 'win32' && !process.windowsStore) {
  app.setAppUserModelId(process.env.APPX_IDENTITY_NAME || 'dev.riftborn.game');
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
