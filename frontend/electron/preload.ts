import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // Platform info
  platform: process.platform,
  isElectron: true,
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<Electron.OpenDialogReturnValue>;
      saveFile: (defaultPath?: string) => Promise<Electron.SaveDialogReturnValue>;
      platform: NodeJS.Platform;
      isElectron: boolean;
    };
  }
}
