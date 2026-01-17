# LinguAI Project Instructions

## Repository
- GitHub: https://github.com/adtruiz/linguai
- Primary branch: main
- Feature branches: feature/backend, feature/frontend, feature/website

## Build Commands

### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (React + Electron)
```bash
cd frontend
npm install
npm run dev           # Web dev server
npm run electron:dev  # Electron dev mode
npm run electron:build # Package desktop app
```

### Website (Astro)
```bash
cd website
npm install
npm run dev    # Dev server
npm run build  # Production build
```

## Test Commands
- Backend: `cd backend && pytest`
- Frontend: `cd frontend && npm test`
- Website: `cd website && npm run build` (static site, build = test)

## Code Style

### Python
- Follow PEP 8
- Use type hints
- Docstrings for public functions
- Run: `ruff check` and `ruff format`

### TypeScript/React
- Use functional components with hooks
- Prefer named exports
- Run: `npm run lint`

## Architecture Notes

### Local-First
- SQLite is primary data store (via sql.js in browser)
- Cloud sync is optional premium feature
- Electron provides file system access

### Open-Core Model
- `/core` directory is GPL-3.0 (open source)
- Cloud/AI features are proprietary
- Keep clear separation

### API Contracts
- OpenAPI spec in `/api-contracts/openapi.yaml`
- Update spec BEFORE implementing changes
- Frontend and backend must match the contract

## Worktree Workflow
- Each feature branch has its own worktree
- Merge to main frequently (daily)
- This CLI (main) handles coordination and integration
