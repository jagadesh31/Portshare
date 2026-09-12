const { app, BrowserWindow, shell, protocol, net } = require('electron');
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
