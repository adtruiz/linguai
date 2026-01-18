import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcutsConfig {
  // Playback controls
  onPlayPause?: () => void;
  onSeekForward?: (amount: number) => void;
  onSeekBackward?: (amount: number) => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;

  // Selection controls
  onExtendSelectionLeft?: () => void;
  onExtendSelectionRight?: () => void;
  onClearSelection?: () => void;

  // Zoom controls
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToView?: () => void;
  onZoomToSelection?: () => void;

  // Navigation
  onPreviousBoundary?: () => void;
  onNextBoundary?: () => void;

  // Undo/Redo
  onUndo?: () => void;
  onRedo?: () => void;

  // Playback
  onPlaySelection?: () => void;

  // Annotation
  onCreateAnnotation?: () => void;
  onDeleteAnnotation?: () => void;

  // Enable/disable
  enabled?: boolean;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { enabled = true } = config;

  // Store latest callbacks in refs to avoid stale closures
  const callbacks = useRef(config);
  callbacks.current = config;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const { ctrlKey, metaKey, shiftKey, key } = e;
      const cmdOrCtrl = ctrlKey || metaKey;

      switch (key) {
        // Playback
        case ' ':
          e.preventDefault();
          callbacks.current.onPlayPause?.();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (shiftKey) {
            callbacks.current.onExtendSelectionLeft?.();
          } else {
            callbacks.current.onSeekBackward?.(0.1);
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (shiftKey) {
            callbacks.current.onExtendSelectionRight?.();
          } else {
            callbacks.current.onSeekForward?.(0.1);
          }
          break;

        case 'Home':
          e.preventDefault();
          callbacks.current.onGoToStart?.();
          break;

        case 'End':
          e.preventDefault();
          callbacks.current.onGoToEnd?.();
          break;

        // Zoom
        case '=':
        case '+':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onZoomIn?.();
          }
          break;

        case '-':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onZoomOut?.();
          }
          break;

        case '0':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onFitToView?.();
          }
          break;

        case 'f':
          e.preventDefault();
          callbacks.current.onZoomToSelection?.();
          break;

        case 'p':
          e.preventDefault();
          callbacks.current.onPlaySelection?.();
          break;

        // Navigation between boundaries
        case '[':
          e.preventDefault();
          callbacks.current.onPreviousBoundary?.();
          break;

        case ']':
          e.preventDefault();
          callbacks.current.onNextBoundary?.();
          break;

        // Undo/Redo
        case 'z':
          if (cmdOrCtrl) {
            e.preventDefault();
            if (shiftKey) {
              callbacks.current.onRedo?.();
            } else {
              callbacks.current.onUndo?.();
            }
          }
          break;

        case 'y':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onRedo?.();
          }
          break;

        // Annotation
        case 'Enter':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onCreateAnnotation?.();
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (cmdOrCtrl) {
            e.preventDefault();
            callbacks.current.onDeleteAnnotation?.();
          }
          break;

        // Clear selection
        case 'Escape':
          e.preventDefault();
          callbacks.current.onClearSelection?.();
          break;

        default:
          break;
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Keyboard shortcuts help text for display
export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', description: 'Play / Pause' },
  { key: 'P', description: 'Play selection' },
  { key: '←/→', description: 'Seek backward/forward (0.1s)' },
  { key: 'Shift + ←/→', description: 'Extend selection' },
  { key: 'Home/End', description: 'Go to start/end' },
  { key: '[/]', description: 'Previous/next boundary' },
  { key: 'Ctrl + +/-', description: 'Zoom in/out' },
  { key: 'Ctrl + 0', description: 'Fit to view' },
  { key: 'F', description: 'Zoom to selection' },
  { key: 'Ctrl + Z', description: 'Undo' },
  { key: 'Ctrl + Shift + Z', description: 'Redo' },
  { key: 'Ctrl + Enter', description: 'Create annotation' },
  { key: 'Esc', description: 'Clear selection' },
] as const;
