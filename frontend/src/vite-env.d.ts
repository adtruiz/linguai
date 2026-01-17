/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface FileReadResult {
  data: string; // base64 encoded
  fileName: string;
  mimeType: string;
}

interface ElectronAPI {
  openFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveFile: (defaultPath?: string) => Promise<{ canceled: boolean; filePath?: string }>;
  readFile: (filePath: string) => Promise<FileReadResult>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean }>;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
