import { useState, useCallback, useMemo } from 'react';

interface UndoRedoOptions {
  maxHistory?: number;
}

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(
  initialState: T,
  options: UndoRedoOptions = {}
) {
  const { maxHistory = 100 } = options;

  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback(
    (newPresent: T | ((prev: T) => T)) => {
      setState((current) => {
        const resolvedPresent =
          typeof newPresent === 'function'
            ? (newPresent as (prev: T) => T)(current.present)
            : newPresent;

        // Fast path: reference equality check
        if (resolvedPresent === current.present) {
          return current;
        }

        // For arrays, check length first as a fast path before deep comparison
        if (Array.isArray(resolvedPresent) && Array.isArray(current.present)) {
          if (resolvedPresent.length === current.present.length) {
            // Only do deep comparison if lengths match
            if (JSON.stringify(resolvedPresent) === JSON.stringify(current.present)) {
              return current;
            }
          }
        } else if (JSON.stringify(resolvedPresent) === JSON.stringify(current.present)) {
          // Non-array fallback
          return current;
        }

        // Limit history size
        const newPast = [...current.past, current.present].slice(-maxHistory);

        return {
          past: newPast,
          present: resolvedPresent,
          future: [], // Clear future on new action
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  const historyInfo = useMemo(
    () => ({
      undoCount: state.past.length,
      redoCount: state.future.length,
    }),
    [state.past.length, state.future.length]
  );

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyInfo,
  };
}
