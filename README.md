# LinguAI

> AI-native acoustic analysis platform — the modern successor to Praat

LinguAI is an open-core platform for phonetic analysis, combining the power of traditional acoustic analysis tools (Praat, ELAN) with modern AI capabilities.

## Features

### Core (Open Source)
- **Spectrogram Viewer** — Praat-quality visualization with modern UI
- **Formant/Pitch Tracking** — Powered by Parselmouth
- **Manual Annotation** — Time-aligned tiers (ELAN-style)
- **Audio Playback** — Synced with visual analysis
- **Export Formats** — TextGrid, ELAN XML, CSV, JSON

### Premium (Cloud)
- **Auto-Annotation** — ML-powered phoneme/word boundary detection
- **Emotion/Tone Detection** — Prosody analysis
- **Speaker Diarization** — Who spoke when
- **Cloud Collaboration** — Real-time multi-user annotation

## Architecture

```
linguai/
├── backend/      # FastAPI + Parselmouth
├── frontend/     # React + Electron (web & desktop)
├── website/      # Marketing site + docs
├── core/         # Open-source Python library
└── api-contracts/# Shared schemas
```

## Development

### Prerequisites
- Node.js 20+
- Python 3.11+
- npm 10+

### Setup

```bash
# Clone repository
git clone https://github.com/adtruiz/linguai.git
cd linguai

# Install dependencies
npm install

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run development servers
npm run dev:frontend  # React app
npm run dev:website   # Marketing site
cd backend && uvicorn app.main:app --reload  # API
```

### Worktrees (Parallel Development)

```bash
# Create worktrees for parallel CLI sessions
git worktree add ../linguai-backend feature/backend
git worktree add ../linguai-frontend feature/frontend
git worktree add ../linguai-website feature/website
```

## License

- **Core library** (`/core`): GPL-3.0
- **Cloud features** (`/backend` cloud routes): Proprietary
- **Frontend/Website**: MIT

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
