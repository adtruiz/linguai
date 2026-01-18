import { useState, useCallback, useRef, useEffect } from 'react';
import { Toolbar } from '../components/Toolbar';
import { SpectrogramViewer } from '../components/SpectrogramViewer';
import { WaveformViewer } from '../components/WaveformViewer';
import { AnnotationPanel } from '../components/AnnotationPanel';
import { AudioPlayer } from '../components/AudioPlayer';
import type { AudioPlayerRef } from '../components/AudioPlayer';
import { IPAKeyboard } from '../components/IPAKeyboard';
import { captureViewport } from '../utils/exportImage';
import type { ImportResult } from '../utils/importParsers';
import { useKeyboardShortcuts, useUndoRedo } from '../hooks';
import type { Annotation, TierConfig } from '../types/api';

function HomePage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const {
    state: annotations,
    set: setAnnotations,
    undo: undoAnnotation,
    redo: redoAnnotation,
    reset: resetAnnotations,
    canUndo,
    canRedo,
  } = useUndoRedo<Annotation[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [tierNames, setTierNames] = useState<string[]>([]);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [showIPAKeyboard, setShowIPAKeyboard] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleFileOpen = useCallback((file: File) => {
    setAudioFile(file);
    resetAnnotations([]);
    setTierNames([]);
    setTierConfigs([]);
    setCurrentTime(0);
    setSelectionStart(null);
    setSelectionEnd(null);
    setZoomLevel(1);
    setScrollX(0);
  }, [resetAnnotations]);

  const handleSelectionChange = useCallback((start: number, end: number) => {
    if (start === end) {
      setSelectionStart(null);
      setSelectionEnd(null);
    } else {
      setSelectionStart(Math.min(start, end));
      setSelectionEnd(Math.max(start, end));
    }
  }, []);

  const handleAnnotationCreate = useCallback((tier: string, start: number, end: number, type: 'interval' | 'point' = 'interval') => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      tier,
      start,
      end,
      text: '',
      type,
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  }, [setAnnotations]);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAddTier = useCallback((name: string, type: 'interval' | 'point' = 'interval') => {
    setTierNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setTierConfigs((prev) => {
      // Only add if not already configured
      if (prev.find((c) => c.name === name)) return prev;
      return [...prev, { name, type }];
    });
  }, []);

  const handleImageExport = useCallback((format: 'png' | 'svg') => {
    const container = containerRef.current;
    if (!container) return;

    const filename = audioFile ? audioFile.name.replace(/\.[^.]+$/, '') : 'linguai-export';
    captureViewport(container, {
      format,
      filename,
      scale: format === 'png' ? 2 : 1,
      backgroundColor: '#1a1a1a',
    });
  }, [audioFile]);

  const handleAnnotationImport = useCallback((result: ImportResult) => {
    // Merge imported annotations with existing ones
    setAnnotations((prev) => [...prev, ...result.annotations]);

    // Merge tier configs
    setTierConfigs((prev) => {
      const existingNames = new Set(prev.map((c) => c.name));
      const newConfigs = result.tierConfigs.filter((c) => !existingNames.has(c.name));
      return [...prev, ...newConfigs];
    });

    // Add tier names
    setTierNames((prev) => {
      const existingNames = new Set(prev);
      const newNames = result.tierConfigs.map((c) => c.name).filter((n) => !existingNames.has(n));
      return [...prev, ...newNames];
    });

    // Update duration if imported is longer (useful when importing without audio)
    if (result.duration > duration) {
      setDuration(result.duration);
    }
  }, [duration, setAnnotations]);

  const handleIPASymbolClick = useCallback((symbol: string) => {
    // Try to insert into active element if it's an input
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart ?? 0;
      const end = activeElement.selectionEnd ?? 0;
      const value = activeElement.value;
      activeElement.value = value.slice(0, start) + symbol + value.slice(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + symbol.length;
      // Trigger input event for React
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // Copy to clipboard as fallback
      navigator.clipboard.writeText(symbol).catch(() => {});
    }
  }, []);

  // Merge explicit tiers with tiers derived from annotations (moved before keyboard shortcuts)
  const allTiers = [...new Set([...tierNames, ...annotations.map((a) => a.tier)])];

  // Find next/previous annotation boundary for navigation
  const findBoundaries = useCallback(() => {
    const boundaries = new Set<number>();
    annotations.forEach((a) => {
      boundaries.add(a.start);
      boundaries.add(a.end);
    });
    return Array.from(boundaries).sort((a, b) => a - b);
  }, [annotations]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: !!audioFile,
    onPlayPause: () => audioPlayerRef.current?.togglePlay(),
    onSeekForward: (amount) => audioPlayerRef.current?.seekBy(amount),
    onSeekBackward: (amount) => audioPlayerRef.current?.seekBy(-amount),
    onGoToStart: () => audioPlayerRef.current?.goToStart(),
    onGoToEnd: () => audioPlayerRef.current?.goToEnd(),
    onPlaySelection: () => audioPlayerRef.current?.playSelection(),
    onZoomIn: () => setZoomLevel((z) => Math.min(z * 1.5, 100)),
    onZoomOut: () => setZoomLevel((z) => Math.max(z / 1.5, 0.1)),
    onFitToView: () => {
      setZoomLevel(1);
      setScrollX(0);
    },
    onZoomToSelection: () => {
      if (selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd && duration > 0) {
        const selectionDuration = Math.abs(selectionEnd - selectionStart);
        // Calculate zoom to fit selection with 10% padding
        const targetZoom = (duration / selectionDuration) * 0.9;
        const newZoom = Math.max(1, Math.min(targetZoom, 100));
        setZoomLevel(newZoom);
        // Calculate scroll to position selection at left with padding
        const pixelsPerSecond = (containerWidth * newZoom) / duration;
        const selectionStartPx = Math.min(selectionStart, selectionEnd) * pixelsPerSecond;
        const padding = containerWidth * 0.05;
        setScrollX(Math.max(0, selectionStartPx - padding));
      }
    },
    onClearSelection: () => {
      setSelectionStart(null);
      setSelectionEnd(null);
    },
    onPreviousBoundary: () => {
      const boundaries = findBoundaries();
      const prev = boundaries.filter((b) => b < currentTime - 0.01).pop();
      if (prev !== undefined) setCurrentTime(prev);
    },
    onNextBoundary: () => {
      const boundaries = findBoundaries();
      const next = boundaries.find((b) => b > currentTime + 0.01);
      if (next !== undefined) setCurrentTime(next);
    },
    onExtendSelectionLeft: () => {
      if (selectionStart === null) {
        setSelectionStart(currentTime);
        setSelectionEnd(currentTime);
      } else {
        setSelectionStart((s) => Math.max(0, (s ?? currentTime) - 0.05));
      }
    },
    onExtendSelectionRight: () => {
      if (selectionEnd === null) {
        setSelectionStart(currentTime);
        setSelectionEnd(currentTime);
      } else {
        setSelectionEnd((e) => Math.min(duration, (e ?? currentTime) + 0.05));
      }
    },
    onCreateAnnotation: () => {
      if (selectionStart !== null && selectionEnd !== null && allTiers.length > 0) {
        handleAnnotationCreate(allTiers[0], selectionStart, selectionEnd);
      }
    },
    onDeleteAnnotation: () => {
      // Delete annotation at current time (if any)
      const atTime = annotations.find(
        (a) => a.start <= currentTime && a.end >= currentTime
      );
      if (atTime) {
        handleAnnotationDelete(atTime.id);
      }
    },
    onUndo: canUndo ? undoAnnotation : undefined,
    onRedo: canRedo ? redoAnnotation : undefined,
  });

  const handleExport = useCallback(
    (format: 'textgrid' | 'json' | 'csv') => {
      const allTiers = [...new Set([...tierNames, ...annotations.map((a) => a.tier)])];

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'json') {
        content = JSON.stringify({ annotations, duration }, null, 2);
        mimeType = 'application/json';
        extension = 'json';
      } else if (format === 'csv') {
        const header = 'tier,start,end,text\n';
        const rows = annotations
          .map((a) => `"${a.tier}",${a.start},${a.end},"${a.text.replace(/"/g, '""')}"`)
          .join('\n');
        content = header + rows;
        mimeType = 'text/csv';
        extension = 'csv';
      } else {
        const lines = [
          'File type = "ooTextFile"',
          'Object class = "TextGrid"',
          '',
          'xmin = 0',
          `xmax = ${duration}`,
          'tiers? <exists>',
          `size = ${allTiers.length}`,
          'item []:',
        ];

        allTiers.forEach((tierName, tierIdx) => {
          const tierAnnotations = annotations
            .filter((a) => a.tier === tierName)
            .sort((a, b) => a.start - b.start);

          lines.push(`    item [${tierIdx + 1}]:`);
          lines.push('        class = "IntervalTier"');
          lines.push(`        name = "${tierName}"`);
          lines.push('        xmin = 0');
          lines.push(`        xmax = ${duration}`);
          lines.push(`        intervals: size = ${tierAnnotations.length}`);

          tierAnnotations.forEach((a, idx) => {
            lines.push(`        intervals [${idx + 1}]:`);
            lines.push(`            xmin = ${a.start}`);
            lines.push(`            xmax = ${a.end}`);
            lines.push(`            text = "${a.text}"`);
          });
        });

        content = lines.join('\n');
        mimeType = 'text/plain';
        extension = 'TextGrid';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `annotations.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [annotations, duration, tierNames]
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg, #0a0a0a)', color: 'var(--color-text, #fff)' }}>
      <Toolbar onFileOpen={handleFileOpen} onAnnotationImport={handleAnnotationImport} onExport={handleExport} onImageExport={handleImageExport} hasFile={!!audioFile} />

      <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', overflow: 'hidden' }}>
        {/* Waveform View */}
        <div style={{ flex: '0 0 80px' }}>
          <WaveformViewer
            file={audioFile}
            currentTime={currentTime}
            zoomLevel={zoomLevel}
            scrollX={scrollX}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onTimeChange={setCurrentTime}
            onSelectionChange={handleSelectionChange}
            height={80}
          />
        </div>

        {/* Spectrogram View */}
        <div style={{ flex: '0 0 220px' }}>
          <SpectrogramViewer
            file={audioFile}
            currentTime={currentTime}
            zoomLevel={zoomLevel}
            scrollX={scrollX}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onTimeChange={setCurrentTime}
            onSelectionChange={handleSelectionChange}
            onZoomChange={setZoomLevel}
            onScrollChange={setScrollX}
          />
        </div>

        <div style={{ flex: 1, minHeight: '120px', overflow: 'auto' }}>
          <AnnotationPanel
            annotations={annotations}
            tierNames={allTiers}
            tierConfigs={tierConfigs}
            duration={duration}
            zoomLevel={zoomLevel}
            scrollX={scrollX}
            containerWidth={containerWidth}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={handleAnnotationDelete}
            onAnnotationCreate={handleAnnotationCreate}
            onAddTier={handleAddTier}
          />
        </div>

        <div style={{ flexShrink: 0 }}>
          <AudioPlayer
            ref={audioPlayerRef}
            file={audioFile}
            currentTime={currentTime}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
          />
        </div>
      </div>

      {/* IPA Keyboard Toggle Button */}
      <button
        type="button"
        onClick={() => setShowIPAKeyboard((prev) => !prev)}
        title="Toggle IPA Keyboard"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: showIPAKeyboard ? 'var(--color-primary, #3b82f6)' : 'var(--color-bg-tertiary, #2a2a2a)',
          border: '1px solid var(--color-border, #333)',
          color: 'var(--color-text, #fff)',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 999,
        }}
      >
        ipa
      </button>

      {/* IPA Keyboard */}
      <IPAKeyboard
        isOpen={showIPAKeyboard}
        onClose={() => setShowIPAKeyboard(false)}
        onSymbolClick={handleIPASymbolClick}
      />
    </div>
  );
}

export default HomePage;
