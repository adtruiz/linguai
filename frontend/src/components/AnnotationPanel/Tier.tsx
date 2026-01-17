import { useCallback } from 'react';
import { Segment } from './Segment';
import type { Annotation } from '../../types/api';

interface TierProps {
  name: string;
  annotations: Annotation[];
  pixelsPerSecond: number;
  scrollOffset: number;
  selectedId: string | null;
  onSelectAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onCreateAnnotation: (tier: string, start: number, end: number) => void;
}

export function Tier({
  name,
  annotations,
  pixelsPerSecond,
  scrollOffset,
  selectedId,
  onSelectAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onCreateAnnotation,
}: TierProps) {
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollOffset;
      const time = x / pixelsPerSecond;

      // Create a 0.1s segment centered on click
      const start = Math.max(0, time - 0.05);
      const end = time + 0.05;
      onCreateAnnotation(name, start, end);
    },
    [name, pixelsPerSecond, scrollOffset, onCreateAnnotation]
  );

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border, #333)',
      }}
    >
      {/* Tier label */}
      <div
        style={{
          width: '100px',
          flexShrink: 0,
          padding: '8px 12px',
          backgroundColor: 'var(--color-bg-tertiary, #2a2a2a)',
          borderRight: '1px solid var(--color-border, #333)',
          display: 'flex',
          alignItems: 'center',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text, #fff)',
        }}
      >
        {name}
      </div>

      {/* Segments container */}
      <div
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          height: '40px',
          position: 'relative',
          backgroundColor: 'var(--color-bg-secondary, #1a1a1a)',
          overflow: 'hidden',
        }}
      >
        {annotations.map((annotation) => (
          <Segment
            key={annotation.id}
            annotation={annotation}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffset={scrollOffset}
            isSelected={selectedId === annotation.id}
            onSelect={onSelectAnnotation}
            onUpdate={onUpdateAnnotation}
            onDelete={onDeleteAnnotation}
          />
        ))}
      </div>
    </div>
  );
}
