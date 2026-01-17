import { useRef, useEffect, useState } from 'react';
import { SpectrogramCanvas } from './SpectrogramCanvas';
import { useSpectrogram } from './useSpectrogram';

interface SpectrogramViewerProps {
  file: File | null;
  currentTime: number;
  zoomLevel: number;
  scrollX: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onTimeChange?: (time: number) => void;
  onSelectionChange?: (start: number, end: number) => void;
  onZoomChange?: (zoom: number) => void;
  onScrollChange?: (scroll: number) => void;
}

const containerStyle = {
  height: '256px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--color-bg-secondary, #1a1a1a)',
  borderRadius: '8px',
} as const;

export function SpectrogramViewer({
  file,
  currentTime,
  zoomLevel,
  scrollX,
  selectionStart,
  selectionEnd,
  onTimeChange,
  onSelectionChange,
  onZoomChange,
  onScrollChange,
}: SpectrogramViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 256 });

  const { data, isLoading, error } = useSpectrogram(file);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(height, 200) });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleTimeClick = (time: number) => {
    onTimeChange?.(time);
    onSelectionChange?.(time, time); // Clear selection on click
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(zoomLevel * delta, 100));
      onZoomChange?.(newZoom);
    } else if (e.shiftKey) {
      const newScroll = Math.max(0, scrollX + e.deltaY);
      onScrollChange?.(newScroll);
    }
  };

  if (!file) {
    return (
      <div ref={containerRef} style={{ ...containerStyle, border: '2px dashed var(--color-border, #333)', color: 'var(--color-text-muted, #888)' }}>
        Open an audio file to view the spectrogram
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={containerRef} style={{ ...containerStyle, color: 'var(--color-text-muted, #888)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>Analyzing...</div>
          <div style={{ fontSize: '14px' }}>Generating spectrogram</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} style={{ ...containerStyle, color: '#ef4444' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>Failed to generate spectrogram</div>
          <div style={{ fontSize: '14px', color: 'var(--color-text-muted, #888)' }}>{error.message}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      ref={containerRef}
      style={{ ...containerStyle, overflow: 'hidden', position: 'relative', display: 'block' }}
      onWheel={handleWheel}
    >
      <SpectrogramCanvas
        data={data}
        width={dimensions.width}
        height={dimensions.height}
        zoomLevel={zoomLevel}
        scrollX={scrollX}
        playheadPosition={currentTime}
        selectionStart={selectionStart}
        selectionEnd={selectionEnd}
        onTimeClick={handleTimeClick}
        onSelectionChange={onSelectionChange}
      />

      <div style={{ position: 'absolute', bottom: '4px', left: '8px', fontSize: '11px', color: 'var(--color-text-muted, #888)' }}>
        {data.duration.toFixed(2)}s | {data.sample_rate} Hz
      </div>

      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
        {[
          { label: '+', ariaLabel: 'Zoom in', action: () => onZoomChange?.(Math.min(zoomLevel * 1.5, 100)) },
          { label: '-', ariaLabel: 'Zoom out', action: () => onZoomChange?.(Math.max(zoomLevel / 1.5, 0.1)) },
          { label: 'Fit', ariaLabel: 'Fit to view', action: () => { onZoomChange?.(1); onScrollChange?.(0); } },
        ].map(({ label, ariaLabel, action }) => (
          <button
            type="button"
            key={label}
            onClick={action}
            aria-label={ariaLabel}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--color-bg-tertiary, #333)',
              border: 'none',
              borderRadius: '4px',
              color: 'var(--color-text, #fff)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SpectrogramViewer;
