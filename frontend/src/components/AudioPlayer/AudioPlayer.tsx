import { useRef, useState, useCallback, useEffect } from 'react';

const SKIP_SECONDS = 5;

interface AudioPlayerProps {
  file: File | null;
  currentTime?: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

export function AudioPlayer({
  file,
  currentTime = 0,
  selectionStart,
  selectionEnd,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [internalTime, setInternalTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Create object URL for audio file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [file]);

  // Sync external time to audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && Math.abs(audio.currentTime - currentTime) > 0.1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = audio.currentTime;
    setInternalTime(time);
    onTimeUpdate?.(time);

    // Loop selection if playing within selection
    if (
      isPlaying &&
      selectionStart !== null &&
      selectionEnd !== null &&
      time >= selectionEnd
    ) {
      audio.currentTime = selectionStart;
    }
  }, [isPlaying, selectionStart, selectionEnd, onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      onDurationChange?.(audio.duration);
    }
  }, [onDurationChange]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlayStateChange?.(true);
  }, [onPlayStateChange]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If there's a selection and we're before it, start from selection
      if (
        selectionStart !== null &&
        selectionEnd !== null &&
        audio.currentTime < selectionStart
      ) {
        audio.currentTime = selectionStart;
      }
      audio.play();
    }
  }, [isPlaying, selectionStart, selectionEnd]);

  const skipBackward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - SKIP_SECONDS);
    }
  }, []);

  const skipForward = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + SKIP_SECONDS);
    }
  }, [duration]);

  const playSelection = useCallback(() => {
    const audio = audioRef.current;
    if (audio && selectionStart !== null) {
      audio.currentTime = selectionStart;
      audio.play();
    }
  }, [selectionStart]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBackward, skipForward]);

  if (!file) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        backgroundColor: 'var(--color-bg-secondary, #1a1a1a)',
        borderRadius: '8px',
      }}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
      />

      {/* Transport controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={skipBackward}
          title={`Skip backward ${SKIP_SECONDS}s`}
          aria-label={`Skip backward ${SKIP_SECONDS} seconds`}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--color-text, #fff)',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          &#x23EA;
        </button>

        <button
          type="button"
          onClick={togglePlay}
          title="Play/Pause (Space)"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-primary, #3b82f6)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          {isPlaying ? '\u23F8' : '\u25B6'}
        </button>

        <button
          type="button"
          onClick={skipForward}
          title={`Skip forward ${SKIP_SECONDS}s`}
          aria-label={`Skip forward ${SKIP_SECONDS} seconds`}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--color-text, #fff)',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          &#x23E9;
        </button>
      </div>

      {/* Time display */}
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '14px',
          color: 'var(--color-text, #fff)',
          minWidth: '120px',
        }}
      >
        {formatTime(internalTime)} / {formatTime(duration)}
      </div>

      {/* Selection playback */}
      {selectionStart !== null && selectionEnd !== null && (
        <button
          type="button"
          onClick={playSelection}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: 'var(--color-bg-tertiary, #333)',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--color-text, #fff)',
            cursor: 'pointer',
          }}
        >
          Play Selection ({formatTime(selectionStart)} - {formatTime(selectionEnd)})
        </button>
      )}

      {/* File name */}
      <div
        style={{
          marginLeft: 'auto',
          fontSize: '13px',
          color: 'var(--color-text-muted, #888)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
        }}
      >
        {file.name}
      </div>
    </div>
  );
}

export default AudioPlayer;
