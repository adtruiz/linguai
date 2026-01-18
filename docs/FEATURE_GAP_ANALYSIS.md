# LinguAI Feature Gap Analysis

## Research Summary

Based on comprehensive research of Praat, ELAN, and user feedback from phoneticians, linguists, and SLPs.

**Sources:**
- [Praat Official](https://www.fon.hum.uva.nl/praat/)
- [ELAN - The Language Archive](https://archive.mpi.nl/tla/elan)
- [A Phonetician's Software Toolkit](https://wstyler.ucsd.edu/posts/phoneticians_software.html)
- [AlternativeTo - Praat](https://alternativeto.net/software/praat/)
- [Phonanium Clinical Voice Tools](https://www.phonanium.com/)

---

## Competitor Feature Matrix

### Core Acoustic Analysis

| Feature | Praat | ELAN | LinguAI (Current) | LinguAI (Needed) |
|---------|-------|------|-------------------|------------------|
| Spectrogram visualization | ✅ Full | ✅ Basic | ✅ Basic | ⬆️ Wideband/narrowband toggle |
| Waveform display | ✅ | ✅ | ❌ | 🔴 HIGH PRIORITY |
| Formant tracking (F1-F5) | ✅ | ❌ | ✅ F1-F4 | ⬆️ Add F5, overlay display |
| Pitch tracking (F0) | ✅ | ❌ | ✅ | ⬆️ Overlay on spectrogram |
| Intensity contour | ✅ | ❌ | ❌ | 🔴 HIGH PRIORITY |
| Harmonics display | ✅ | ❌ | ❌ | 🟡 MEDIUM |
| Pulses/glottal periods | ✅ | ❌ | ❌ | 🟡 MEDIUM |

### Voice Quality Measures (Critical for SLPs)

| Feature | Praat | Clinical Tools | LinguAI (Current) | Priority |
|---------|-------|----------------|-------------------|----------|
| Jitter (pitch perturbation) | ✅ | ✅ | ❌ | 🔴 HIGH |
| Shimmer (amplitude perturbation) | ✅ | ✅ | ❌ | 🔴 HIGH |
| HNR (Harmonics-to-Noise Ratio) | ✅ | ✅ | ❌ | 🔴 HIGH |
| CPP (Cepstral Peak Prominence) | Via script | ✅ | ❌ | 🟡 MEDIUM |
| AVQI (Acoustic Voice Quality Index) | Via Phonanium | ✅ | ❌ | 🟡 MEDIUM |
| DSI (Dysphonia Severity Index) | Via Phonanium | ✅ | ❌ | 🟡 MEDIUM |
| Voice breaks detection | ✅ | ✅ | ❌ | 🟡 MEDIUM |

### Annotation Features

| Feature | Praat | ELAN | LinguAI (Current) | Priority |
|---------|-------|------|-------------------|----------|
| Interval tiers | ✅ | ✅ | ✅ | ✅ Done |
| Point tiers | ✅ | ✅ | ❌ | 🔴 HIGH |
| Tier hierarchies | ❌ | ✅ | ❌ | 🟡 MEDIUM |
| Controlled vocabularies | ❌ | ✅ | ❌ | 🟢 LOW |
| IPA keyboard support | ✅ | ✅ | ❌ | 🔴 HIGH |
| Unicode text | ✅ | ✅ | ✅ | ✅ Done |
| Multi-participant tiers | Limited | ✅ | ❌ | 🟡 MEDIUM |

### File Format Support

| Format | Praat | ELAN | LinguAI (Current) | Priority |
|--------|-------|------|-------------------|----------|
| WAV | ✅ | ✅ | ✅ | ✅ Done |
| MP3 | ✅ | ✅ | ❌ | 🔴 HIGH |
| FLAC | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| OGG | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| TextGrid import | ✅ | ✅ | ❌ | 🔴 HIGH |
| TextGrid export | ✅ | ✅ | ✅ | ✅ Done |
| ELAN XML (.eaf) | ❌ | ✅ | ❌ | 🟡 MEDIUM |
| CSV export | ❌ | ✅ | ✅ | ✅ Done |
| JSON export | ❌ | ❌ | ✅ | ✅ Done |

### UI/UX Features

| Feature | Praat | ELAN | LinguAI (Current) | Priority |
|---------|-------|------|-------------------|----------|
| Dark mode | ❌ | ❌ | ✅ Partial | ⬆️ Refine |
| Modern UI | ❌ (1990s) | ❌ (2000s) | ✅ | ⬆️ Polish |
| Keyboard shortcuts | ✅ Extensive | ✅ | ❌ | 🔴 HIGH |
| Zoom/pan | ✅ | ✅ | ✅ | ✅ Done |
| Selection tool | ✅ | ✅ | ✅ | ✅ Done |
| Publication export | ✅ Picture window | ✅ | ❌ | 🔴 HIGH |
| Undo/redo | Limited | ✅ | ❌ | 🔴 HIGH |
| Multiple views | ✅ | ✅ | ❌ | 🟡 MEDIUM |

---

## What Praat Does That We MUST Match

### Critical for MVP (Praat-Parity)

1. **Waveform Display**
   - Show amplitude over time
   - Synced with spectrogram
   - Selection highlights

2. **Spectrogram Options**
   - Wideband (3-5ms window) for formants
   - Narrowband (20-30ms window) for harmonics
   - Configurable frequency range
   - Dynamic range adjustment (crucial for visibility)

3. **Overlay Displays**
   - Formant tracks (red dots) on spectrogram
   - Pitch contour (blue line) on spectrogram
   - Intensity contour option

4. **Point Tiers**
   - For marking specific events (burst, VOT)
   - Different from interval annotations

5. **Keyboard Shortcuts** (Praat defaults)
   - Tab: Play selection
   - Shift+Tab: Play visible
   - Arrow keys: Move cursor
   - F5: Zoom in, F6: Zoom out

6. **TextGrid Import**
   - Users have existing annotations
   - Must preserve all tier data

7. **Publication Export**
   - High-resolution spectrogram images
   - Customizable appearance
   - Vector formats (SVG, EPS)

### Voice Quality (Critical for SLP Market)

```
Jitter = pitch period perturbation
  - local jitter (%)
  - RAP (Relative Average Perturbation)
  - PPQ5 (5-point Period Perturbation Quotient)

Shimmer = amplitude perturbation
  - local shimmer (%)
  - APQ3, APQ5, APQ11

HNR = Harmonics-to-Noise Ratio
  - Measure of voice quality
  - Lower values = more pathological

CPP = Cepstral Peak Prominence
  - Robust measure of dysphonia
  - Works well with connected speech
```

---

## What ELAN Does That We Should Consider

### Tier Hierarchies
- Parent-child relationships
- Time subdivision constraints
- Symbolic associations

### Controlled Vocabularies
- Predefined annotation options
- Consistency across annotators
- Faster annotation entry

### Multi-Video Sync
- Up to 4 video streams
- Gesture analysis use case
- Sign language research

---

## What Users WISH Existed

Based on research from phonetician forums and publications:

### 1. AI-Assisted Annotation (Our Differentiator)
- **Auto phoneme boundaries** - ML-based segmentation
- **Suggested IPA transcription** - Whisper + phoneme mapping
- **Formant correction suggestions** - When tracking fails
- **Speaker diarization** - Who spoke when

### 2. Modern Interface
- **Dark mode** - Essential for long sessions
- **Responsive design** - Works on different screens
- **Touch support** - Tablet annotation
- **Customizable layouts** - User preferences

### 3. Collaboration (Premium Feature)
- **Real-time multi-user** - Like Google Docs
- **Comments/notes** - Discussion threads
- **Version history** - Track changes
- **Share links** - Easy collaboration

### 4. Better Workflow
- **Undo/redo stack** - Full history
- **Batch processing** - Multiple files
- **Templates** - Predefined tier structures
- **Macros/shortcuts** - Custom workflows

### 5. Python/R Integration
- **API access** - Programmatic analysis
- **Script support** - Automation
- **Data export** - Statistical analysis ready

---

## LinguAI Current Implementation Audit

### Backend (FastAPI + Parselmouth)

**Implemented:**
```
✅ POST /analyze/spectrogram
   - time_step parameter
   - max_frequency parameter
   - Returns: times, frequencies, intensities (dB), duration, sample_rate

✅ POST /analyze/formants
   - max_formant parameter
   - time_step parameter
   - Returns: times, f1, f2, f3, f4

✅ POST /analyze/pitch
   - time_step parameter
   - pitch_floor/ceiling parameters
   - Returns: times, frequencies
```

**Missing Endpoints:**
```
❌ GET /analyze/intensity
❌ GET /analyze/voice-quality (jitter, shimmer, HNR)
❌ GET /analyze/spectrum (FFT slice)
❌ POST /import/textgrid
❌ POST /convert/audio (format conversion)
```

### Frontend (React + TypeScript)

**Implemented Components:**
```
✅ SpectrogramViewer - Basic spectrogram display
✅ SpectrogramCanvas - Canvas rendering
✅ AnnotationPanel - Tier management
✅ Tier - Tier display
✅ Segment - Annotation segments
✅ AudioPlayer - Playback controls
✅ Toolbar - File operations
```

**Missing Components:**
```
❌ WaveformViewer - Amplitude display
❌ FormantOverlay - F1-F4 on spectrogram
❌ PitchOverlay - F0 contour display
❌ IntensityOverlay - Intensity contour
❌ PointTier - Point annotations
❌ IPAKeyboard - IPA character input
❌ KeyboardShortcuts - Hotkey system
❌ ExportDialog - Publication export options
❌ SettingsPanel - User preferences
```

---

## Priority Implementation Roadmap

### Phase 1: Praat Parity (Core MVP)

**Backend:**
1. Add intensity endpoint
2. Add voice quality endpoint (jitter, shimmer, HNR)
3. Add TextGrid import
4. Add MP3/FLAC support (via pydub)

**Frontend:**
1. Waveform display component
2. Formant/pitch overlay on spectrogram
3. Point tier support
4. Keyboard shortcuts system
5. Undo/redo functionality
6. TextGrid import UI

### Phase 2: Modern Advantages

**UI Polish:**
1. Refine dark mode theme
2. Publication-quality export (SVG)
3. Responsive layout improvements
4. IPA keyboard component

**Workflow:**
1. Keyboard shortcut customization
2. View presets (phonetics, clinical)
3. Quick measurement tools

### Phase 3: AI Features (Premium)

1. Auto-annotation integration
2. Phoneme boundary detection
3. Speaker diarization
4. Suggested transcriptions

### Phase 4: Collaboration (Premium)

1. Real-time sync
2. Comments system
3. Share links
4. Version history

---

## Visual Design Direction

### Academic/Professional Aesthetic

**Color Palette:**
```css
/* Dark theme (default) */
--bg-primary: #0a0a0a;      /* Near black */
--bg-secondary: #141414;     /* Panels */
--bg-tertiary: #1e1e1e;      /* Elevated surfaces */

--accent-primary: #3b82f6;   /* Blue - selections */
--accent-success: #22c55e;   /* Green - confirmations */
--accent-warning: #f59e0b;   /* Amber - alerts */

--text-primary: #f5f5f5;     /* High contrast */
--text-secondary: #a3a3a3;   /* Labels */
--text-muted: #737373;       /* Hints */

/* Spectrogram colormap */
--spec-low: #000033;         /* Low intensity - dark blue */
--spec-mid: #ff6600;         /* Mid intensity - orange */
--spec-high: #ffff00;        /* High intensity - yellow */
```

**Typography:**
```css
/* Measurements & data */
font-family: 'JetBrains Mono', 'SF Mono', monospace;
font-size: 11px;  /* Compact but readable */

/* Labels & UI */
font-family: 'Inter', -apple-system, sans-serif;
font-weight: 500;

/* IPA transcriptions */
font-family: 'Doulos SIL', 'Charis SIL', serif;
```

**Key Visual Elements:**
- Grid lines on spectrogram (subtle, 1px, #333)
- Time markers every 100ms
- Frequency markers at 1kHz intervals
- High-contrast cursors (white with dark outline)
- Selection highlight (blue, 30% opacity)
- Formant dots (red, 3px radius)
- Pitch line (blue, 2px width)

**Publication Export Specs:**
- 300 DPI minimum
- Vector formats (SVG preferred)
- Customizable color schemes
- Font embedding for IPA
- Scale bars included

---

## Test Coverage Requirements

### Stress Test Batches (Created)

| Batch | Files | Purpose |
|-------|-------|---------|
| 1 | 4 | Extended duration (30s to 10min) |
| 2 | 9 | Format variety (sample rates, channels) |
| 3 | 11 | Phonetic patterns (vowels, consonants, tones) |
| 4 | 14 | Edge cases (noise, clipping, silence) |
| 5 | 10 | Clinical scenarios (dysphonia, child speech) |
| **Total** | **48** | **95 MB test data** |

### Required Test Scenarios

1. **Performance:** 10-minute file analysis < 30s
2. **Accuracy:** Formant tracking matches Praat within 5%
3. **Robustness:** Graceful handling of edge cases
4. **Formats:** All sample rates 8kHz-96kHz work
5. **Clinical:** Voice quality measures match published norms

---

## Success Criteria

### MVP Launch Checklist

- [ ] Waveform + spectrogram display
- [ ] Formant/pitch overlay working
- [ ] All 48 test files process without errors
- [ ] TextGrid import/export round-trip
- [ ] Keyboard shortcuts implemented
- [ ] Undo/redo for annotations
- [ ] Publication export (PNG/SVG)
- [ ] Voice quality measures (jitter, shimmer, HNR)
- [ ] Dark mode polished
- [ ] < 2s load time for 1-minute files

### Praat Feature Parity Score

Current: **45%**
Target for MVP: **80%**
Target for v1.0: **95%**
