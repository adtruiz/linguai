import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        show: false,
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// File dialog handlers
ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'ogg', 'm4a'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });
    return result;
});
ipcMain.handle('dialog:saveFile', async (_event, defaultPath) => {
    const result = await dialog.showSaveDialog({
        defaultPath,
        filters: [
            { name: 'TextGrid', extensions: ['TextGrid'] },
            { name: 'JSON', extensions: ['json'] },
            { name: 'CSV', extensions: ['csv'] },
        ],
    });
    return result;
});
// File read/write handlers
ipcMain.handle('file:read', async (_event, filePath) => {
    const buffer = await readFile(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    // Determine MIME type
    const mimeTypes = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    return {
        data: buffer.toString('base64'),
        fileName,
        mimeType,
    };
});
ipcMain.handle('file:write', async (_event, filePath, content) => {
    await writeFile(filePath, content, 'utf-8');
    return { success: true };
});
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
