# Daily Audio Digest

Daily audio news briefing app. Generates packs of 5 news stories as ~2-min dialogue podcasts between two hosts.

## Architecture

```
backend/           Python 3.12 — Flask API + pipeline
  config/          Settings, API keys (.env)
  research/        News discovery (RSS, NewsAPI, Reddit, Tavily)
  scriptwriter/    LLM-generated dialogue scripts (GPT-4o)
  tts/             Text-to-speech (Gemini multi-speaker)
  packs/           Pipeline orchestrator: research → script → audio → pack
  storage/         SQLAlchemy models + DB session
  api/             Flask REST API (serves packs + audio)

frontend/          TypeScript + React 19 + Vite + Tailwind
  src/components/  PackList, PackPlayer, StoryCard
  src/hooks/       usePackPlayer (audio playback state)
  src/api/         API client
  src/types/       Shared TypeScript types
```

## Commands

```bash
# Backend
ruff check backend/                  # Lint Python
ruff format backend/                 # Format Python
ruff check --fix backend/            # Auto-fix lint issues
python -m backend                    # Run backend (Flask dev server)

# Frontend
cd frontend
npm run lint                         # ESLint check
npm run lint:fix                     # ESLint auto-fix
npm run format                       # Prettier format
npm run format:check                 # Prettier check (CI)
npm run dev                          # Vite dev server
npm run build                        # TypeScript check + Vite build
```

## Code Conventions

### Python (backend/)
- Formatter/linter: **Ruff** (config in `pyproject.toml`)
- Line length: 120
- Imports: sorted by isort rules (stdlib → third-party → local)
- Target: Python 3.12+
- Use type hints for function signatures
- Docstrings: only for public API and non-obvious logic
- `researcher.py` is an external fork — excluded from formatting, avoid modifying

### TypeScript/React (frontend/)
- Linter: **ESLint** with typescript-eslint + react-hooks
- Formatter: **Prettier** (config in `.prettierrc`)
- Semicolons: yes
- Quotes: double
- Indent: 2 spaces
- Use functional components with hooks
- Types in `src/types/index.ts`

### General
- Always run linters before committing (pre-commit hooks handle this automatically)
- Keep functions focused and small
- Prefer explicit over clever
- No secrets in code — use `.env` (see `.env.example`)
