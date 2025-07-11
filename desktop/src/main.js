const { app, BrowserWindow, clipboard, ipcMain, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const os = require('os');
const AutoLaunch = require('auto-launch');
const Store = require('electron-store');

let mainWindow;
let tray;
const store = new Store();

app.isQuitting = false;

const autoLauncher = new AutoLaunch({
    name: 'ClipSync',
    path: app.getPath('exe'),
});

async function checkAutoLaunch() {
    try {
        const isEnabled = await autoLauncher.isEnabled();
        if (!isEnabled) await autoLauncher.enable();
    } catch (err) {
        console.error('Auto launch error:', err);
    }
}

function createTray() {
    tray = new Tray(path.resolve(__dirname, '../assets/icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        {
            label: 'Auto Start',
            type: 'checkbox',
            checked: store.get('autoStart', true),
            click: async (menuItem) => {
                store.set('autoStart', menuItem.checked);
                menuItem.checked ? await autoLauncher.enable() : await autoLauncher.disable();
            }
        },
        { type: 'separator' },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('ClipSync');
    tray.setContextMenu(contextMenu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

app.whenReady().then(async () => {
    createWindow();
    createTray();

    if (store.get('autoStart', true)) await checkAutoLaunch();

    ipcMain.handle('clipboard:readText', () => clipboard.readText());
    ipcMain.handle('clipboard:writeText', (_, text) => { clipboard.writeText(text); return true; });
    ipcMain.handle('system:getLocalIP', () => {
        const interfaces = os.networkInterfaces();
        for (const name in interfaces) {
            for (const net of interfaces[name]) {
                if (net.family === 'IPv4' && !net.internal) return net.address;
            }
        }
        return 'unknown';
    });

    globalShortcut.register('CommandOrControl+Shift+V', () => {
        mainWindow.webContents.send('global-paste');
    });
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
});
app.on('before-quit', () => {
    app.isQuitting = true;
    globalShortcut.unregisterAll();
});
