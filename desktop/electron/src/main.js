const { app, BrowserWindow, shell, protocol, net, ipcMain } = require('electron');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

if (require('electron-squirrel-startup')) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'portshare',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const VITE_DEV_URL = process.env.PORTSHARE_VITE_URL || 'http://127.0.0.1:5173';

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'te',
  'trailer',
  'upgrade',
  'accept-encoding',
  'origin',
  'referer',
]);

const SKIP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-encoding',
]);

function sanitizeRequestHeaders(input, port) {
  const headers = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (SKIP_REQUEST_HEADERS.has(String(key).toLowerCase())) continue;
    if (Array.isArray(value)) headers[key] = value.join(', ');
    else if (value != null) headers[key] = String(value);
  }
  headers.Host = `127.0.0.1:${port}`;
  return headers;
}

function normalizeResponseHeaders(raw) {
  const headers = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (SKIP_RESPONSE_HEADERS.has(String(key).toLowerCase())) continue;
    if (value == null) continue;
    headers[key] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  return headers;
}

function localRequest({ port, method, path: requestPath, headers, bodyBase64 }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: requestPath || '/',
        method: method || 'GET',
        headers: sanitizeRequestHeaders(headers, port),
        timeout: 55_000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 502,
            headers: normalizeResponseHeaders(res.headers),
            body: Buffer.concat(chunks).toString('base64'),
          });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Local service timed out')));
    req.on('error', reject);
    if (bodyBase64) {
      req.write(Buffer.from(bodyBase64, 'base64'));
    }
    req.end();
  });
}

ipcMain.handle('portshare:local-request', async (_event, payload) => {
  const port = Number(payload?.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid local port');
  }
  try {
    return await localRequest(payload);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Local service unavailable');
  }
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'PortShare',
    backgroundColor: '#08090B',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.setMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(VITE_DEV_URL).catch(() => {
      const fallback = path.join(__dirname, '../../frontend/dist/index.html');
      void mainWindow.loadFile(fallback);
    });
    return;
  }

  void mainWindow.loadURL('portshare://app/');
};

app.whenReady().then(() => {
  if (app.isPackaged) {
    const distRoot = path.join(process.resourcesPath, 'dist');
    protocol.handle('portshare', (request) => {
      const { pathname } = new URL(request.url);
      let relative = decodeURIComponent(pathname);
      if (!relative || relative === '/') relative = '/index.html';
      const filePath = path.normalize(path.join(distRoot, relative.replace(/^[/\\]+/, '')));
      if (!filePath.startsWith(distRoot)) {
        return new Response('Forbidden', { status: 403 });
      }
      return net.fetch(pathToFileURL(filePath).toString());
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
