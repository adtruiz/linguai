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

  const isPoint = annotation.type === 'point' || annotation.start === annotation.end;
  const left = annotation.start * pixelsPerSecond - scrollOffset;
  const width = isPoint ? 0 : (annotation.end - annotation.start) * pixelsPerSecond;

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
  if (left + width < 0 && left < 0) return null;

  // Point annotation rendering
  if (isPoint) {
    return (
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          position: 'absolute',
          left: `${left - 6}px`,
          width: '12px',
          height: '100%',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: isSelected ? 10 : 1,
        }}
      >
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: '5px',
            top: 0,
            width: '2px',
            height: '100%',
            backgroundColor: isSelected ? '#ef4444' : '#f97316',
          }}
        />
        {/* Diamond marker */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            backgroundColor: isSelected ? '#ef4444' : '#f97316',
            border: '1px solid rgba(0,0,0,0.3)',
          }}
        />
        {/* Label on hover or when selected */}
        {(isSelected || annotation.text) && (
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: 'var(--color-text, #fff)',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '1px 4px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
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
                  width: '60px',
                  padding: '1px 2px',
                  fontSize: '10px',
                  border: 'none',
                  borderRadius: '2px',
                  backgroundColor: 'white',
                  color: 'black',
                  textAlign: 'center',
                }}
              />
            ) : (
              annotation.text || '•'
            )}
          </div>
        )}
      </div>
    );
  }

  // Interval annotation rendering
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
