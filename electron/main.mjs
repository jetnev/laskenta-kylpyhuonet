import { app, BrowserWindow, dialog, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const { autoUpdater } = electronUpdater;

const HOST = '127.0.0.1';
const APP_ID = 'fi.jetnev.projekta';
const DEFAULT_UPDATE_FEED_URL = 'https://projekta.fi/';
const UPDATE_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let mainWindow = null;
let localServer = null;
let updateInterval = null;
let updateCheckStarted = false;
let updateCheckInProgress = null;
let currentUpdateFeedUrl = null;
let storeMutationQueue = Promise.resolve();

const desktopUpdateState = {
  enabled: false,
  feedUrl: null,
  status: 'disabled',
  currentVersion: app.getVersion(),
  latestVersion: null,
  downloadedVersion: null,
  lastCheckedAt: null,
  lastDownloadedAt: null,
  needsRestart: false,
  error: null,
  downloadProgress: null,
};

function getDistPath() {
  return path.join(app.getAppPath(), 'dist');
}

function getStorePath() {
  return path.join(app.getPath('userData'), 'desktop-kv.json');
}

function getStoreBackupPath() {
  return `${getStorePath()}.bak`;
}

async function parseStoreFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

async function readStore() {
  try {
    return await parseStoreFile(getStorePath());
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return {};
    }

    try {
      const backup = await parseStoreFile(getStoreBackupPath());
      await fs.mkdir(path.dirname(getStorePath()), { recursive: true });
      await fs.writeFile(getStorePath(), JSON.stringify(backup, null, 2), 'utf8');
      return backup;
    } catch {
      console.error('Desktop KV store is unreadable, starting from an empty store:', error);
      const corruptPath = `${getStorePath()}.corrupt-${Date.now()}.json`;
      await fs.rename(getStorePath(), corruptPath).catch(() => {});
      return {};
    }
  }
}

async function writeStore(data) {
  const storePath = getStorePath();
  const backupPath = getStoreBackupPath();
  const tempPath = `${storePath}.tmp`;
  const serialized = JSON.stringify(data, null, 2);

  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(tempPath, serialized, 'utf8');
  await fs.writeFile(backupPath, serialized, 'utf8');
  try {
    await fs.rename(tempPath, storePath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error.code === 'EEXIST' || error.code === 'EPERM')
    ) {
      await fs.rm(storePath, { force: true });
      await fs.rename(tempPath, storePath);
    } else {
      throw error;
    }
  }
}

function mutateStore(mutator) {
  const run = async () => {
    const currentStore = await readStore();
    const nextStore = await mutator({ ...currentStore });
    await writeStore(nextStore);
    return nextStore;
  };

  const pending = storeMutationQueue.catch(() => {}).then(run);
  storeMutationQueue = pending.catch(() => {});
  return pending;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, body = '') {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeFeedUrl(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function snapshotDesktopUpdateState() {
  return {
    ...desktopUpdateState,
    downloadProgress: desktopUpdateState.downloadProgress
      ? { ...desktopUpdateState.downloadProgress }
      : null,
  };
}

function isAutoUpdateDisabled() {
  return process.env.PROJEKTA_DISABLE_AUTO_UPDATE === '1' || process.env.LASKENTA_DISABLE_AUTO_UPDATE === '1';
}

async function resolveDesktopUpdateFeedUrl() {
  const envFeedUrl = normalizeFeedUrl(process.env.PROJEKTA_UPDATE_FEED_URL || process.env.LASKENTA_UPDATE_FEED_URL);
  if (envFeedUrl) {
    return envFeedUrl;
  }

  try {
    const store = await readStore();
    const settings = store.settings;
    const storedFeedUrl = normalizeFeedUrl(settings && typeof settings === 'object' ? settings.updateFeedUrl : null);
    return storedFeedUrl || DEFAULT_UPDATE_FEED_URL;
  } catch (error) {
    console.error('Unable to read desktop update feed from store:', error);
    return DEFAULT_UPDATE_FEED_URL;
  }
}

async function syncDesktopUpdateFeed(force = false) {
  if (!app.isPackaged || isAutoUpdateDisabled()) {
    desktopUpdateState.enabled = false;
    desktopUpdateState.status = 'disabled';
    desktopUpdateState.feedUrl = null;
    desktopUpdateState.error = 'Päivitykset on poistettu käytöstä.';
    return null;
  }

  const feedUrl = await resolveDesktopUpdateFeedUrl();
  if (!feedUrl) {
    desktopUpdateState.enabled = false;
    desktopUpdateState.status = 'disabled';
    desktopUpdateState.feedUrl = null;
    desktopUpdateState.error = 'Päivitysfeediä ei ole määritetty.';
    return null;
  }

  if (force || currentUpdateFeedUrl !== feedUrl) {
    autoUpdater.setFeedURL(feedUrl);
    currentUpdateFeedUrl = feedUrl;
    console.log(`Desktop update feed configured: ${feedUrl}`);
  }

  desktopUpdateState.enabled = true;
  desktopUpdateState.feedUrl = feedUrl;
  desktopUpdateState.error = null;
  return feedUrl;
}

async function checkForDesktopUpdates() {
  if (updateCheckInProgress) {
    return updateCheckInProgress;
  }

  updateCheckInProgress = (async () => {
    if (!app.isPackaged || isAutoUpdateDisabled()) {
      desktopUpdateState.enabled = false;
      desktopUpdateState.status = 'disabled';
      desktopUpdateState.feedUrl = null;
      desktopUpdateState.error = 'Päivitykset on poistettu käytöstä.';
      return snapshotDesktopUpdateState();
    }

    await syncDesktopUpdateFeed();
    if (!desktopUpdateState.enabled) {
      return snapshotDesktopUpdateState();
    }

    desktopUpdateState.status = 'checking';
    desktopUpdateState.error = null;
    desktopUpdateState.lastCheckedAt = nowIso();

    try {
      await autoUpdater.checkForUpdates();
      return snapshotDesktopUpdateState();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown desktop update error.';
      desktopUpdateState.status = 'error';
      desktopUpdateState.error = message;
      console.error('Desktop update check failed:', error);
      return snapshotDesktopUpdateState();
    }
  })();

  try {
    return await updateCheckInProgress;
  } finally {
    updateCheckInProgress = null;
  }
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function handleSparkRequest(request, response, pathname) {
  if (pathname === '/_spark/loaded' && request.method === 'POST') {
    sendText(response, 204);
    return true;
  }

  if (pathname === '/_spark/user' && request.method === 'GET') {
    sendJson(response, 200, {
      id: 'desktop-local',
      login: 'desktop',
      name: 'Desktop user',
      email: '',
    });
    return true;
  }

  if (pathname === '/_spark/llm') {
    sendJson(response, 501, {
      error: 'Spark LLM endpoint is not configured in the desktop build.',
    });
    return true;
  }

  if (pathname === '/_desktop/update/status' && request.method === 'GET') {
    await syncDesktopUpdateFeed();
    sendJson(response, 200, snapshotDesktopUpdateState());
    return true;
  }

  if (pathname === '/_desktop/update/check' && request.method === 'POST') {
    const state = await checkForDesktopUpdates();
    sendJson(response, 200, state);
    return true;
  }

  if (pathname === '/_desktop/update/restart' && request.method === 'POST') {
    if (!desktopUpdateState.needsRestart && desktopUpdateState.status !== 'downloaded') {
      sendJson(response, 409, {
        error: 'Päivitystä ei ole vielä ladattu.',
      });
      return true;
    }

    sendJson(response, 200, {
      ok: true,
      restarting: true,
    });
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return true;
  }

  if (pathname === '/_spark/kv' && request.method === 'GET') {
    const store = await readStore();
    sendJson(response, 200, Object.keys(store));
    return true;
  }

  if (pathname.startsWith('/_spark/kv/')) {
    const key = decodeURIComponent(pathname.slice('/_spark/kv/'.length));

    if (request.method === 'GET') {
      const store = await readStore();
      if (!(key in store)) {
        sendText(response, 404, 'Not found');
        return true;
      }
      sendText(response, 200, JSON.stringify(store[key]));
      return true;
    }

    if (request.method === 'POST') {
      const body = await readRequestBody(request);
      const value = body ? JSON.parse(body) : null;
      await mutateStore((store) => {
        store[key] = value;
        return store;
      });
      sendText(response, 200, 'OK');
      return true;
    }

    if (request.method === 'DELETE') {
      await mutateStore((store) => {
        delete store[key];
        return store;
      });
      sendText(response, 200, 'OK');
      return true;
    }
  }

  return false;
}

async function serveStaticFile(response, pathname) {
  const distPath = getDistPath();
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distPath, relativePath);

  if (!resolvedPath.startsWith(distPath)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isFile()) {
      const extension = path.extname(resolvedPath).toLowerCase();
      const body = await fs.readFile(resolvedPath);
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      });
      response.end(body);
      return;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  const indexPath = path.join(distPath, 'index.html');
  const indexBody = await fs.readFile(indexPath);
  response.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
  response.end(indexBody);
}

async function startLocalServer() {
  if (localServer) {
    return localServer;
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', `http://${HOST}`);
      if (await handleSparkRequest(request, response, url.pathname)) {
        return;
      }
      await serveStaticFile(response, url.pathname);
    } catch (error) {
      console.error('Desktop server error:', error);
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : 'Unknown desktop server error.',
      });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Desktop server did not return a TCP address.');
  }

  localServer = {
    server,
    url: `http://${HOST}:${address.port}`,
  };
  return localServer;
}

async function createMainWindow() {
  const desktopStartUrl = process.env.DESKTOP_START_URL;
  const startUrl = desktopStartUrl || (await startLocalServer()).url;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(startUrl);
}

function configureAutoUpdater() {
  if (!app.isPackaged || isAutoUpdateDisabled()) {
    desktopUpdateState.enabled = false;
    desktopUpdateState.status = 'disabled';
    desktopUpdateState.feedUrl = null;
    desktopUpdateState.error = 'Päivitykset on poistettu käytöstä.';
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;

  autoUpdater.on('checking-for-update', () => {
    console.log('Desktop update: checking for updates');
    desktopUpdateState.status = 'checking';
    desktopUpdateState.error = null;
    desktopUpdateState.lastCheckedAt = nowIso();
    desktopUpdateState.downloadProgress = null;
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`Desktop update available: ${info.version}`);
    desktopUpdateState.status = 'downloading';
    desktopUpdateState.latestVersion = info.version;
    desktopUpdateState.error = null;
    desktopUpdateState.downloadProgress = null;
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log(`Desktop update not available: ${info.version}`);
    desktopUpdateState.status = 'idle';
    desktopUpdateState.latestVersion = info.version;
    desktopUpdateState.error = null;
    desktopUpdateState.downloadProgress = null;
    desktopUpdateState.needsRestart = false;
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Desktop update download progress: ${Math.round(progress.percent)}%`);
    desktopUpdateState.status = 'downloading';
    desktopUpdateState.downloadProgress = {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    };
  });

  autoUpdater.on('error', (error) => {
    console.error('Desktop update error:', error);
    desktopUpdateState.status = 'error';
    desktopUpdateState.error = error instanceof Error ? error.message : 'Unknown desktop update error.';
  });

  autoUpdater.on('update-downloaded', async (info) => {
    console.log(`Desktop update downloaded: ${info.version}`);
    desktopUpdateState.status = 'downloaded';
    desktopUpdateState.downloadedVersion = info.version;
    desktopUpdateState.latestVersion = info.version;
    desktopUpdateState.lastDownloadedAt = nowIso();
    desktopUpdateState.needsRestart = true;
    desktopUpdateState.downloadProgress = null;
    desktopUpdateState.error = null;
    const windowForDialog = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const result = await dialog.showMessageBox(windowForDialog, {
      type: 'info',
      buttons: ['Käynnistä uudelleen', 'Myöhemmin'],
      defaultId: 0,
      cancelId: 1,
      title: 'Päivitys valmis',
      message: `Versio ${info.version} on ladattu.`,
      detail: 'Käynnistä sovellus uudelleen, jotta uusi versio tulee käyttöön. Muussa tapauksessa päivitys asennetaan seuraavan sulkemisen yhteydessä.',
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
}

function startAutoUpdateLoop() {
  if (updateCheckStarted || !app.isPackaged || isAutoUpdateDisabled()) {
    return;
  }

  updateCheckStarted = true;
  void checkForDesktopUpdates();
  updateInterval = setInterval(() => {
    void checkForDesktopUpdates();
  }, UPDATE_CHECK_INTERVAL_MS);
}

app.whenReady().then(async () => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(APP_ID);
  }

  configureAutoUpdater();
  await createMainWindow();
  setTimeout(() => {
    startAutoUpdateLoop();
  }, UPDATE_CHECK_DELAY_MS);

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (localServer?.server) {
    await new Promise((resolve) => localServer.server.close(resolve));
    localServer = null;
  }
});
