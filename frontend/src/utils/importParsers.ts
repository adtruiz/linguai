/**
 * Import parsers for annotation file formats (TextGrid, ELAN XML)
 */

import type { Annotation, TierConfig } from '../types/api';

export interface ImportResult {
  annotations: Annotation[];
  tierConfigs: TierConfig[];
  duration: number;
}

/**
 * Parse a Praat TextGrid file (both long and short formats)
 */
export function parseTextGrid(content: string): ImportResult {
  const lines = content.split(/\r?\n/);

  // Detect format: short format has no labels like "xmin = "
  const isShortFormat = !content.includes('xmin =');

  if (isShortFormat) {
    return parseTextGridShort(lines);
  }

  return parseTextGridLong(lines);
}

/**
 * Parse long format TextGrid
 */
function parseTextGridLong(lines: string[]): ImportResult {
  const annotations: Annotation[] = [];
  const tierConfigs: TierConfig[] = [];
  let duration = 0;
  let currentTier: { name: string; type: 'interval' | 'point' } | null = null;
  let currentInterval: { xmin?: number; xmax?: number; text?: string } = {};
  let inItem = false;
  let inInterval = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Get duration from xmax at file level
    if (trimmed.startsWith('xmax =') && !inItem) {
      duration = parseFloat(trimmed.split('=')[1].trim());
    }

    // Detect tier start
    if (trimmed.startsWith('item [')) {
      inItem = true;
      currentTier = null;
      continue;
    }

    if (inItem) {
      // Get tier class (IntervalTier or TextTier/PointTier)
      if (trimmed.startsWith('class =')) {
        const classMatch = trimmed.match(/"([^"]+)"/);
        if (classMatch) {
          const tierClass = classMatch[1].toLowerCase();
          const type = tierClass.includes('point') || tierClass === 'texttier' ? 'point' : 'interval';
          currentTier = { name: '', type };
        }
      }

      // Get tier name
      if (trimmed.startsWith('name =')) {
        const nameMatch = trimmed.match(/"([^"]*)"/);
        if (nameMatch && currentTier) {
          currentTier.name = nameMatch[1];
          tierConfigs.push({ name: currentTier.name, type: currentTier.type });
        }
      }

      // Detect interval/point start
      if (trimmed.startsWith('intervals [') || trimmed.startsWith('points [')) {
        inInterval = true;
        currentInterval = {};
        continue;
      }

      if (inInterval && currentTier) {
        // Parse interval/point properties
        if (trimmed.startsWith('xmin =') || trimmed.startsWith('time =') || trimmed.startsWith('number =')) {
          currentInterval.xmin = parseFloat(trimmed.split('=')[1].trim());
        }
        if (trimmed.startsWith('xmax =')) {
          currentInterval.xmax = parseFloat(trimmed.split('=')[1].trim());
        }
        if (trimmed.startsWith('text =') || trimmed.startsWith('mark =')) {
          const textMatch = trimmed.match(/"([^"]*)"/);
          currentInterval.text = textMatch ? textMatch[1] : '';
        }

        // Check if interval is complete
        const isPoint = currentTier.type === 'point';
        const hasRequiredFields = isPoint
          ? currentInterval.xmin !== undefined && currentInterval.text !== undefined
          : currentInterval.xmin !== undefined && currentInterval.xmax !== undefined && currentInterval.text !== undefined;

        if (hasRequiredFields) {
          annotations.push({
            id: crypto.randomUUID(),
            tier: currentTier.name,
            start: currentInterval.xmin!,
            end: isPoint ? currentInterval.xmin! : currentInterval.xmax!,
            text: currentInterval.text!,
            type: currentTier.type,
          });
          inInterval = false;
          currentInterval = {};
        }
      }
    }
  }

  return { annotations, tierConfigs, duration };
}

/**
 * Parse short format TextGrid
 */
function parseTextGridShort(lines: string[]): ImportResult {
  const annotations: Annotation[] = [];
  const tierConfigs: TierConfig[] = [];
  let duration = 0;
  let lineIndex = 0;

  // Skip header lines until we find "ooTextFile" or similar
  while (lineIndex < lines.length && !lines[lineIndex].includes('TextGrid')) {
    lineIndex++;
  }
  lineIndex++; // Skip the TextGrid line

  // Skip empty lines
  while (lineIndex < lines.length && lines[lineIndex].trim() === '') {
    lineIndex++;
  }

  // Read xmin (usually 0)
  lineIndex++;

  // Read xmax (duration)
  if (lineIndex < lines.length) {
    duration = parseFloat(lines[lineIndex].trim()) || 0;
    lineIndex++;
  }

  // Skip <exists> line
  lineIndex++;

  // Read number of tiers
  const numTiers = parseInt(lines[lineIndex]?.trim() || '0', 10);
  lineIndex++;

  // Parse each tier
  for (let tierIdx = 0; tierIdx < numTiers && lineIndex < lines.length; tierIdx++) {
    // Skip empty lines
    while (lineIndex < lines.length && lines[lineIndex].trim() === '') {
      lineIndex++;
    }

    // Tier class (IntervalTier or TextTier)
    const tierClass = lines[lineIndex]?.trim().replace(/"/g, '').toLowerCase() || '';
    const tierType: 'interval' | 'point' = tierClass.includes('point') || tierClass === 'texttier' ? 'point' : 'interval';
    lineIndex++;

    // Tier name
    const tierName = lines[lineIndex]?.trim().replace(/"/g, '') || `Tier ${tierIdx + 1}`;
    lineIndex++;

    tierConfigs.push({ name: tierName, type: tierType });

    // Tier xmin
    lineIndex++;

    // Tier xmax
    lineIndex++;

    // Number of intervals/points
    const numIntervals = parseInt(lines[lineIndex]?.trim() || '0', 10);
    lineIndex++;

    // Parse intervals/points
    for (let i = 0; i < numIntervals && lineIndex < lines.length; i++) {
      if (tierType === 'interval') {
        const xmin = parseFloat(lines[lineIndex]?.trim() || '0');
        lineIndex++;
        const xmax = parseFloat(lines[lineIndex]?.trim() || '0');
        lineIndex++;
        const text = lines[lineIndex]?.trim().replace(/^"|"$/g, '') || '';
        lineIndex++;

        annotations.push({
          id: crypto.randomUUID(),
          tier: tierName,
          start: xmin,
          end: xmax,
          text,
          type: 'interval',
        });
      } else {
        // Point tier
        const time = parseFloat(lines[lineIndex]?.trim() || '0');
        lineIndex++;
        const text = lines[lineIndex]?.trim().replace(/^"|"$/g, '') || '';
        lineIndex++;

        annotations.push({
          id: crypto.randomUUID(),
          tier: tierName,
          start: time,
          end: time,
          text,
          type: 'point',
        });
      }
    }
  }

  return { annotations, tierConfigs, duration };
}

/**
 * Parse ELAN XML (.eaf) file
 */
export function parseELANXML(content: string): ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  const annotations: Annotation[] = [];
  const tierConfigs: TierConfig[] = [];

  // Parse time slots
  const timeSlots = new Map<string, number>();
  const timeSlotElements = doc.querySelectorAll('TIME_SLOT');
  timeSlotElements.forEach((slot) => {
    const id = slot.getAttribute('TIME_SLOT_ID');
    const value = slot.getAttribute('TIME_VALUE');
    if (id && value) {
      timeSlots.set(id, parseInt(value, 10) / 1000); // Convert ms to seconds
    }
  });

  // Get duration from last time slot
  let duration = 0;
  timeSlots.forEach((value) => {
    if (value > duration) duration = value;
  });

  // Parse tiers
  const tierElements = doc.querySelectorAll('TIER');
  tierElements.forEach((tier) => {
    const tierName = tier.getAttribute('TIER_ID') || 'Unknown';

    // ELAN doesn't have explicit interval/point distinction in tiers
    // We'll treat all as intervals unless they have zero duration
    tierConfigs.push({ name: tierName, type: 'interval' });

    // Parse alignable annotations (intervals)
    const alignableAnnotations = tier.querySelectorAll('ALIGNABLE_ANNOTATION');
    alignableAnnotations.forEach((ann) => {
      const ts1 = ann.getAttribute('TIME_SLOT_REF1');
      const ts2 = ann.getAttribute('TIME_SLOT_REF2');
      const textEl = ann.querySelector('ANNOTATION_VALUE');
      const text = textEl?.textContent || '';

      if (ts1 && ts2) {
        const start = timeSlots.get(ts1) || 0;
        const end = timeSlots.get(ts2) || 0;
        const isPoint = start === end;

        annotations.push({
          id: crypto.randomUUID(),
          tier: tierName,
          start,
          end,
          text,
          type: isPoint ? 'point' : 'interval',
        });

        // Update tier config if we find a point
        if (isPoint) {
          const config = tierConfigs.find((c) => c.name === tierName);
          if (config) config.type = 'point';
        }
      }
    });

    // Parse ref annotations (for hierarchical tiers - we flatten them)
    // Note: This is simplified - ref annotations reference parent annotations
    // In a full implementation we'd traverse the hierarchy for proper timing
    const refAnnotations = tier.querySelectorAll('REF_ANNOTATION');
    refAnnotations.forEach((ann) => {
      const textEl = ann.querySelector('ANNOTATION_VALUE');
      const text = textEl?.textContent || '';

      if (text) {
        annotations.push({
          id: crypto.randomUUID(),
          tier: tierName,
          start: 0,
          end: 0,
          text,
          type: 'interval',
        });
      }
    });
  });

  return { annotations, tierConfigs, duration };
}

/**
 * Detect file format from content and parse accordingly
 */
export function parseAnnotationFile(content: string, filename: string): ImportResult {
  const extension = filename.toLowerCase().split('.').pop();

  if (extension === 'textgrid') {
    return parseTextGrid(content);
  }

  if (extension === 'eaf' || extension === 'xml') {
    // Check if it's ELAN format
    if (content.includes('ANNOTATION_DOCUMENT') || content.includes('<TIER')) {
      return parseELANXML(content);
    }
  }

  // Try to auto-detect
  if (content.includes('Object class = "TextGrid"') || content.includes('ooTextFile')) {
    return parseTextGrid(content);
  }

  if (content.includes('ANNOTATION_DOCUMENT')) {
    return parseELANXML(content);
  }

  throw new Error(`Unsupported file format: ${extension}`);
}
