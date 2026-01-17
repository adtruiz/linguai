import { useCallback, useState, useRef, useEffect } from 'react';
import type { Annotation } from '../../types/api';

interface SegmentProps {
  annotation: Annotation;
  pixelsPerSecond: number;
  scrollOffset: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
}

export function Segment({
  annotation,
  pixelsPerSecond,
  scrollOffset,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: SegmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(annotation.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const left = annotation.start * pixelsPerSecond - scrollOffset;
  const width = (annotation.end - annotation.start) * pixelsPerSecond;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    onSelect(annotation.id);
  }, [annotation.id, onSelect]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditText(annotation.text);
  }, [annotation.text]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== annotation.text) {
      onUpdate(annotation.id, { text: editText });
    }
  }, [annotation.id, annotation.text, editText, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditText(annotation.text);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isEditing) {
          e.preventDefault();
          onDelete(annotation.id);
        }
      }
    },
    [annotation.id, annotation.text, handleBlur, isEditing, onDelete]
  );

  // Don't render if fully off-screen
  if (left + width < 0) return null;

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: `${Math.max(0, left)}px`,
        width: `${left < 0 ? width + left : width}px`,
        height: '100%',
        backgroundColor: isSelected
          ? 'rgba(59, 130, 246, 0.4)'
          : 'rgba(59, 130, 246, 0.2)',
        borderLeft: '1px solid rgba(59, 130, 246, 0.6)',
        borderRight: '1px solid rgba(59, 130, 246, 0.6)',
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.1s',
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '90%',
            padding: '2px 4px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '2px',
            backgroundColor: 'white',
            color: 'black',
            textAlign: 'center',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text, #fff)',
            padding: '0 4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {annotation.text || '...'}
        </span>
      )}
    </div>
  );
}
