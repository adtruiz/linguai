import { useCallback, useRef } from 'react';
import type { ImportResult } from '../../utils/importParsers';

interface ToolbarProps {
  onFileOpen?: (file: File) => void;
  onAnnotationImport?: (result: ImportResult) => void;
  onExport?: (format: 'textgrid' | 'json' | 'csv') => void;
  onImageExport?: (format: 'png' | 'svg') => void;
  hasFile?: boolean;
}

export function Toolbar({ onFileOpen, onAnnotationImport, onExport, onImageExport, hasFile = false }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const { data, fileName, mimeType } = await window.electronAPI.readFile(filePath);

        // Convert base64 to File
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const file = new File([bytes], fileName, { type: mimeType });
        onFileOpen?.(file);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [onFileOpen]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileOpen?.(file);
      }
      e.target.value = '';
    },
    [onFileOpen]
  );

  const handleAnnotationImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const { parseAnnotationFile } = await import('../../utils/importParsers');
        const result = parseAnnotationFile(content, file.name);
        onAnnotationImport?.(result);
      } catch (error) {
        console.error('Failed to parse annotation file:', error);
        alert(`Failed to import annotations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      e.target.value = '';
    },
    [onAnnotationImport]
  );

  const handleExport = useCallback(
    (format: 'textgrid' | 'json' | 'csv') => {
      onExport?.(format);
    },
    [onExport]
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--color-bg-secondary, #1a1a1a)', borderBottom: '1px solid var(--color-border, #333)' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={annotationInputRef}
        type="file"
        accept=".TextGrid,.textgrid,.eaf,.xml"
        onChange={handleAnnotationImport}
        style={{ display: 'none' }}
      />

      <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text, #fff)', marginRight: '16px' }}>
        LinguAI
      </div>

      <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border, #333)', marginRight: '8px' }} />

      <button
        type="button"
        onClick={handleOpenClick}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-primary, #3b82f6)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Open Audio
      </button>

      <button
        type="button"
        onClick={() => annotationInputRef.current?.click()}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-bg-tertiary, #333)', color: 'var(--color-text, #fff)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        title="Import TextGrid or ELAN annotations"
      >
        Import Annotations
      </button>

      {hasFile && (
        <>
          <select
            onChange={(e) => {
              const format = e.target.value as 'textgrid' | 'json' | 'csv';
              if (format) {
                handleExport(format);
                e.target.value = '';
              }
            }}
            style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-bg-tertiary, #333)', color: 'var(--color-text, #fff)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            defaultValue=""
          >
            <option value="" disabled>Export Annotations...</option>
            <option value="textgrid">TextGrid (Praat)</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>

          <select
            onChange={(e) => {
              const format = e.target.value as 'png' | 'svg';
              if (format) {
                onImageExport?.(format);
                e.target.value = '';
              }
            }}
            style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'var(--color-bg-tertiary, #333)', color: 'var(--color-text, #fff)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            defaultValue=""
          >
            <option value="" disabled>Export Image...</option>
            <option value="png">PNG (High Resolution)</option>
            <option value="svg">SVG (Vector)</option>
          </select>
        </>
      )}

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={() => alert(`Keyboard shortcuts:

Playback:
  Space: Play/Pause
  P: Play selection (loops)
  ← →: Seek 0.1s
  Home/End: Go to start/end

Selection:
  Shift + ← →: Extend selection
  Esc: Clear selection
  F: Zoom to selection

Navigation:
  [ ]: Previous/next boundary
  Ctrl + +/-: Zoom in/out
  Ctrl + 0: Fit to view
  Ctrl/Cmd + scroll: Zoom
  Shift + scroll: Pan

Annotation:
  Ctrl + Enter: Create annotation
  Ctrl + Z: Undo
  Ctrl + Shift + Z: Redo
  Double-click tier: Create annotation
  Double-click segment: Edit text`)}
        style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #888)', border: '1px solid var(--color-border, #333)', borderRadius: '4px', cursor: 'pointer' }}
      >
        Shortcuts
      </button>
    </div>
  );
}

export default Toolbar;
