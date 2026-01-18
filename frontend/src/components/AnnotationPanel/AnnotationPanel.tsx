import { useState, useCallback, useMemo } from 'react';
import { Tier } from './Tier';
import type { Annotation, TierConfig } from '../../types/api';

interface AnnotationPanelProps {
  annotations: Annotation[];
  tierNames: string[];
  tierConfigs?: TierConfig[];  // Optional tier type configuration
  duration: number;
  zoomLevel: number;
  scrollX: number;
  containerWidth: number;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete?: (id: string) => void;
  onAnnotationCreate?: (tier: string, start: number, end: number, type: 'interval' | 'point') => void;
  onAddTier?: (name: string, type: 'interval' | 'point') => void;
}

export function AnnotationPanel({
  annotations,
  tierNames,
  tierConfigs = [],
  duration,
  zoomLevel,
  scrollX,
  containerWidth,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationCreate,
  onAddTier,
}: AnnotationPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTierName, setNewTierName] = useState('');
  const [newTierType, setNewTierType] = useState<'interval' | 'point'>('interval');
  const [isAddingTier, setIsAddingTier] = useState(false);

  // Get tier type from config or default to interval
  const getTierType = useCallback((tierName: string): 'interval' | 'point' => {
    const config = tierConfigs.find((c) => c.name === tierName);
    return config?.type ?? 'interval';
  }, [tierConfigs]);

  const pixelsPerSecond = useMemo(() => {
    if (duration <= 0) return 100; // Default value to avoid Infinity
    return (containerWidth * zoomLevel) / duration;
  }, [containerWidth, zoomLevel, duration]);

  const tiers = useMemo(() => {
    return tierNames.map((name) => ({
      name,
      annotations: annotations.filter((a) => a.tier === name).sort((a, b) => a.start - b.start),
    }));
  }, [tierNames, annotations]);

  const handleSelectAnnotation = useCallback(
    (id: string) => {
      setSelectedId(id);
      const annotation = annotations.find((a) => a.id === id) ?? null;
      onAnnotationSelect?.(annotation);
    },
    [annotations, onAnnotationSelect]
  );

  const handleUpdateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      onAnnotationUpdate?.(id, updates);
    },
    [onAnnotationUpdate]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (selectedId === id) {
        setSelectedId(null);
        onAnnotationSelect?.(null);
      }
      onAnnotationDelete?.(id);
    },
    [selectedId, onAnnotationSelect, onAnnotationDelete]
  );

  const handleCreateAnnotation = useCallback(
    (tier: string, start: number, end: number, type: 'interval' | 'point') => {
      onAnnotationCreate?.(tier, start, end, type);
    },
    [onAnnotationCreate]
  );

  const handleAddTier = useCallback(() => {
    const name = newTierName.trim();
    if (name && !tierNames.includes(name)) {
      onAddTier?.(name, newTierType);
      setNewTierName('');
      setNewTierType('interval');
      setIsAddingTier(false);
    }
  }, [newTierName, newTierType, tierNames, onAddTier]);

  if (!duration) {
    return null;
  }

  return (
    <div style={{ backgroundColor: 'var(--color-bg, #0a0a0a)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border, #333)' }}>
      {tiers.map((tier) => (
        <Tier
          key={tier.name}
          name={tier.name}
          tierType={getTierType(tier.name)}
          annotations={tier.annotations}
          pixelsPerSecond={pixelsPerSecond}
          scrollOffset={scrollX}
          selectedId={selectedId}
          onSelectAnnotation={handleSelectAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onCreateAnnotation={handleCreateAnnotation}
        />
      ))}

      <div style={{ display: 'flex', padding: '8px 12px', borderTop: tiers.length > 0 ? '1px solid var(--color-border, #333)' : 'none' }}>
        {isAddingTier ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              autoFocus
              value={newTierName}
              onChange={(e) => setNewTierName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTier();
                if (e.key === 'Escape') setIsAddingTier(false);
              }}
              placeholder="Tier name"
              style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid var(--color-border, #333)', borderRadius: '4px', backgroundColor: 'var(--color-bg-secondary, #1a1a1a)', color: 'var(--color-text, #fff)' }}
            />
            <select
              value={newTierType}
              onChange={(e) => setNewTierType(e.target.value as 'interval' | 'point')}
              style={{ padding: '4px 8px', fontSize: '13px', border: '1px solid var(--color-border, #333)', borderRadius: '4px', backgroundColor: 'var(--color-bg-secondary, #1a1a1a)', color: 'var(--color-text, #fff)' }}
            >
              <option value="interval">Interval</option>
              <option value="point">Point</option>
            </select>
            <button type="button" onClick={handleAddTier} style={{ padding: '4px 12px', fontSize: '13px', backgroundColor: 'var(--color-primary, #3b82f6)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Add
            </button>
            <button type="button" onClick={() => setIsAddingTier(false)} style={{ padding: '4px 12px', fontSize: '13px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #888)', border: '1px solid var(--color-border, #333)', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setIsAddingTier(true)} style={{ padding: '4px 12px', fontSize: '13px', backgroundColor: 'transparent', color: 'var(--color-text-muted, #888)', border: '1px dashed var(--color-border, #333)', borderRadius: '4px', cursor: 'pointer' }}>
            + Add tier
          </button>
        )}
      </div>
    </div>
  );
}

export default AnnotationPanel;
