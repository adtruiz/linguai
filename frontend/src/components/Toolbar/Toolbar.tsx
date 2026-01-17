import { useCallback, useRef } from 'react';

interface ToolbarProps {
  onFileOpen?: (file: File) => void;
  onExport?: (format: 'textgrid' | 'json' | 'csv') => void;
  hasFile?: boolean;
}

export function Toolbar({ onFileOpen, onExport, hasFile = false }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {hasFile && (
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
          <option value="" disabled>Export As...</option>
          <option value="textgrid">TextGrid (Praat)</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </select>
      )}

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={() => alert('Keyboard shortcuts:\n\nSpace: Play/Pause\n← →: Skip 5 seconds\nCtrl/Cmd + scroll: Zoom\nShift + scroll: Pan\nDouble-click tier: Create annotation\nDouble-click segment: Edit text')}
        style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #888)', border: '1px solid var(--color-border, #333)', borderRadius: '4px', cursor: 'pointer' }}
      >
        Shortcuts
      </button>
    </div>
  );
}

export default Toolbar;
