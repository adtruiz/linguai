import { useRef, useEffect, useState } from 'react';
import { SpectrogramCanvas } from './SpectrogramCanvas';
import { useSpectrogram } from './useSpectrogram';
import { useFormants } from './useFormants';
import { usePitch } from './usePitch';

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
  const [showFormants, setShowFormants] = useState(true);
  const [showPitch, setShowPitch] = useState(true);

  const { data, isLoading, error } = useSpectrogram(file);
  const { data: formantData } = useFormants(file, { enabled: showFormants && !!file });
  const { data: pitchData } = usePitch(file, { enabled: showPitch && !!file });

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
        formantData={formantData}
        pitchData={pitchData}
        showFormants={showFormants}
        showPitch={showPitch}
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
          ...(selectionStart !== null && selectionEnd !== null && selectionStart !== selectionEnd ? [{
            label: 'Sel',
            ariaLabel: 'Zoom to selection',
            action: () => {
              const selectionDuration = Math.abs(selectionEnd - selectionStart);
              if (selectionDuration > 0 && data) {
                // Calculate zoom to fit selection with 5% padding
                const targetZoom = (data.duration / selectionDuration) * 0.9;
                const newZoom = Math.max(1, Math.min(targetZoom, 100));
                onZoomChange?.(newZoom);
                // Calculate scroll to center selection
                const pixelsPerSecond = (dimensions.width * newZoom) / data.duration;
                const selectionStartPx = Math.min(selectionStart, selectionEnd) * pixelsPerSecond;
                const padding = dimensions.width * 0.05;
                onScrollChange?.(Math.max(0, selectionStartPx - padding));
              }
            },
          }] : []),
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

      {/* Overlay toggles */}
      <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
        <button
          type="button"
          onClick={() => setShowFormants(!showFormants)}
          aria-label="Toggle formants"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: showFormants ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-bg-tertiary, #333)',
            border: showFormants ? '1px solid #ef4444' : '1px solid transparent',
            borderRadius: '4px',
            color: showFormants ? '#ef4444' : 'var(--color-text-muted, #888)',
            cursor: 'pointer',
          }}
        >
          F1-F4
        </button>
        <button
          type="button"
          onClick={() => setShowPitch(!showPitch)}
          aria-label="Toggle pitch"
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            backgroundColor: showPitch ? 'rgba(59, 130, 246, 0.3)' : 'var(--color-bg-tertiary, #333)',
            border: showPitch ? '1px solid #3b82f6' : '1px solid transparent',
            borderRadius: '4px',
            color: showPitch ? '#3b82f6' : 'var(--color-text-muted, #888)',
            cursor: 'pointer',
          }}
        >
          F0
        </button>
      </div>
    </div>
  );
}

export default SpectrogramViewer;
