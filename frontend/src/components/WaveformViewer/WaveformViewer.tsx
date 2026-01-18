import { useEffect, useRef, useState, useCallback } from 'react';
import type { WaveformResponse } from '../../types/api';
import { api } from '../../services/api';

interface WaveformViewerProps {
  file: File | null;
  currentTime: number;
  zoomLevel: number;
  scrollX: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onTimeChange?: (time: number) => void;
  onSelectionChange?: (start: number, end: number) => void;
  height?: number;
}

export function WaveformViewer({
  file,
  currentTime,
  zoomLevel,
  scrollX,
  selectionStart,
  selectionEnd,
  onTimeChange,
  onSelectionChange,
  height = 100,
}: WaveformViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<WaveformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

  // Fetch waveform data when file changes
  useEffect(() => {
    if (!file) {
      setWaveformData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    api
      .analyzeWaveform(file, { max_points: 20000 })
      .then((data) => {
        setWaveformData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load waveform');
        setIsLoading(false);
      });
  }, [file]);

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (x: number): number => {
      if (!waveformData || !containerRef.current) return 0;
      const containerWidth = containerRef.current.clientWidth;
      const visibleDuration = waveformData.duration / zoomLevel;
      const startTime = scrollX * (waveformData.duration - visibleDuration);
      return startTime + (x / containerWidth) * visibleDuration;
    },
    [waveformData, zoomLevel, scrollX]
  );

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time: number): number => {
      if (!waveformData || !containerRef.current) return 0;
      const containerWidth = containerRef.current.clientWidth;
      const visibleDuration = waveformData.duration / zoomLevel;
      const startTime = scrollX * (waveformData.duration - visibleDuration);
      return ((time - startTime) / visibleDuration) * containerWidth;
    },
    [waveformData, zoomLevel, scrollX]
  );

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range
    const visibleDuration = waveformData.duration / zoomLevel;
    const startTime = scrollX * (waveformData.duration - visibleDuration);
    const endTime = startTime + visibleDuration;

    // Draw selection highlight
    if (selectionStart !== null && selectionEnd !== null) {
      const selStartPx = timeToPixel(selectionStart);
      const selEndPx = timeToPixel(selectionEnd);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(selStartPx, 0, selEndPx - selStartPx, height);
    }

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveform
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const centerY = height / 2;
    const amplitude = height / 2 - 4;

    // Find visible data range
    const startIdx = Math.max(
      0,
      Math.floor((startTime / waveformData.duration) * waveformData.amplitudes.length)
    );
    const endIdx = Math.min(
      waveformData.amplitudes.length,
      Math.ceil((endTime / waveformData.duration) * waveformData.amplitudes.length)
    );

    const visibleSamples = endIdx - startIdx;
    const samplesPerPixel = visibleSamples / width;

    let isFirst = true;
    for (let px = 0; px < width; px++) {
      const sampleStart = startIdx + Math.floor(px * samplesPerPixel);
      const sampleEnd = Math.min(startIdx + Math.floor((px + 1) * samplesPerPixel), endIdx);

      if (sampleStart >= waveformData.amplitudes.length) break;

      // Get min and max for this pixel column
      let min = waveformData.amplitudes[sampleStart];
      let max = min;

      for (let i = sampleStart; i < sampleEnd; i++) {
        const val = waveformData.amplitudes[i];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      // Normalize to canvas height
      const maxAbs = Math.max(
        Math.abs(waveformData.min_amplitude),
        Math.abs(waveformData.max_amplitude)
      );
      const yMin = centerY - (max / maxAbs) * amplitude;
      const yMax = centerY - (min / maxAbs) * amplitude;

      if (isFirst) {
        ctx.moveTo(px, yMin);
        isFirst = false;
      }
      ctx.lineTo(px, yMin);
      ctx.lineTo(px, yMax);
    }

    ctx.stroke();

    // Draw playhead
    const playheadX = timeToPixel(currentTime);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }

    // Draw time markers
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';

    const markerInterval = visibleDuration < 1 ? 0.1 : visibleDuration < 5 ? 0.5 : 1;
    const firstMarker = Math.ceil(startTime / markerInterval) * markerInterval;

    for (let t = firstMarker; t < endTime; t += markerInterval) {
      const x = timeToPixel(t);
      if (x >= 0 && x <= width) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, 0, 1, 4);
        ctx.fillStyle = '#666';
        ctx.fillText(t.toFixed(2) + 's', x + 2, 12);
      }
    }
  }, [waveformData, currentTime, zoomLevel, scrollX, selectionStart, selectionEnd, height, timeToPixel]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const time = pixelToTime(x);

    setIsDragging(true);
    setDragStart(time);
    onTimeChange?.(time);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragStart === null) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const time = pixelToTime(x);

    onSelectionChange?.(Math.min(dragStart, time), Math.max(dragStart, time));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    onTimeChange?.(time);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        height,
        backgroundColor: '#0a0a0a',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: 12,
          }}
        >
          Loading waveform...
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
      {!file && !isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: 12,
          }}
        >
          Open an audio file to view waveform
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />
    </div>
  );
}

export default WaveformViewer;
