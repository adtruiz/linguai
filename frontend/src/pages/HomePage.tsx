import { useState, useCallback, useRef, useEffect } from 'react';
import { Toolbar } from '../components/Toolbar';
import { SpectrogramViewer } from '../components/SpectrogramViewer';
import { AnnotationPanel } from '../components/AnnotationPanel';
import { AudioPlayer } from '../components/AudioPlayer';
import type { Annotation } from '../types/api';

function HomePage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [tierNames, setTierNames] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
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
    setAnnotations([]);
    setTierNames([]);
    setCurrentTime(0);
    setSelectionStart(null);
    setSelectionEnd(null);
    setZoomLevel(1);
    setScrollX(0);
  }, []);

  const handleSelectionChange = useCallback((start: number, end: number) => {
    if (start === end) {
      setSelectionStart(null);
      setSelectionEnd(null);
    } else {
      setSelectionStart(Math.min(start, end));
      setSelectionEnd(Math.max(start, end));
    }
  }, []);

  const handleAnnotationCreate = useCallback((tier: string, start: number, end: number) => {
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      tier,
      start,
      end,
      text: '',
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
  }, []);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAddTier = useCallback((name: string) => {
    setTierNames((prev) => (prev.includes(name) ? prev : [...prev, name]));
  }, []);

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

  // Merge explicit tiers with tiers derived from annotations
  const allTiers = [...new Set([...tierNames, ...annotations.map((a) => a.tier)])];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg, #0a0a0a)', color: 'var(--color-text, #fff)' }}>
      <Toolbar onFileOpen={handleFileOpen} onExport={handleExport} hasFile={!!audioFile} />

      <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', overflow: 'hidden' }}>
        <div style={{ flex: '0 0 256px' }}>
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
            file={audioFile}
            currentTime={currentTime}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            onTimeUpdate={setCurrentTime}
            onDurationChange={setDuration}
          />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
