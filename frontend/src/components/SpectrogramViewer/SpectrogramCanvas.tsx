import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { SpectrogramResponse } from '../../types/api';

interface SpectrogramCanvasProps {
  data: SpectrogramResponse;
  width: number;
  height: number;
  zoomLevel: number;
  scrollX: number;
  playheadPosition: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onTimeClick?: (time: number) => void;
  onSelectionChange?: (start: number, end: number) => void;
}

export function SpectrogramCanvas({
  data,
  width,
  height,
  zoomLevel,
  scrollX,
  playheadPosition,
  selectionStart,
  selectionEnd,
  onTimeClick,
  onSelectionChange,
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef<number | null>(null);

  const pixelsPerSecond = (width * zoomLevel) / data.duration;

  const timeToX = useCallback(
    (time: number) => time * pixelsPerSecond - scrollX,
    [pixelsPerSecond, scrollX]
  );

  const xToTime = useCallback(
    (x: number) => (x + scrollX) / pixelsPerSecond,
    [pixelsPerSecond, scrollX]
  );

  // Memoize the expensive spectrogram image generation
  const spectrogramImage = useMemo(() => {
    const { times, frequencies, intensities } = data;
    const numTimes = times.length;
    const numFreqs = frequencies.length;

    if (numTimes === 0 || numFreqs === 0) return null;

    // Find intensity range
    let minIntensity = Infinity;
    let maxIntensity = -Infinity;
    for (const row of intensities) {
      for (const val of row) {
        if (val < minIntensity) minIntensity = val;
        if (val > maxIntensity) maxIntensity = val;
      }
    }

    // Handle edge case where all values are the same
    const range = maxIntensity - minIntensity;
    const normalizer = range > 0 ? range : 1;

    // Create offscreen canvas with spectrogram data
    const offscreen = new OffscreenCanvas(numTimes, numFreqs);
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return null;

    const imageData = offCtx.createImageData(numTimes, numFreqs);
    const pixels = imageData.data;

    for (let freqIdx = 0; freqIdx < numFreqs; freqIdx++) {
      for (let timeIdx = 0; timeIdx < numTimes; timeIdx++) {
        const intensity = intensities[freqIdx]?.[timeIdx] ?? minIntensity;
        const normalized = (intensity - minIntensity) / normalizer;
        const gray = Math.round(255 * (1 - Math.max(0, Math.min(1, normalized))));

        // Flip vertically (low frequencies at bottom)
        const y = numFreqs - 1 - freqIdx;
        const idx = (y * numTimes + timeIdx) * 4;
        pixels[idx] = gray;
        pixels[idx + 1] = gray;
        pixels[idx + 2] = gray;
        pixels[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imageData, 0, 0);
    return offscreen;
  }, [data]);

  // Render canvas (only redraws when view changes, not when data changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spectrogramImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw spectrogram
    const totalWidth = width * zoomLevel;
    ctx.drawImage(spectrogramImage, -scrollX, 0, totalWidth, height);

    // Draw selection
    if (selectionStart !== null && selectionEnd !== null) {
      const x1 = timeToX(Math.min(selectionStart, selectionEnd));
      const x2 = timeToX(Math.max(selectionStart, selectionEnd));
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fillRect(x1, 0, x2 - x1, height);
    }

    // Draw playhead
    const playheadX = timeToX(playheadPosition);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [spectrogramImage, width, height, zoomLevel, scrollX, playheadPosition, selectionStart, selectionEnd, timeToX]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = xToTime(x);

      isDragging.current = true;
      dragStart.current = time;
      onTimeClick?.(time);
    },
    [xToTime, onTimeClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || dragStart.current === null) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = xToTime(x);

      onSelectionChange?.(dragStart.current, time);
    },
    [xToTime, onSelectionChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragStart.current = null;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: 'crosshair' }}
    />
  );
}
