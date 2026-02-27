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
  storage/         SQLAlchemy models + DB session (thread-safe, SQLite/PostgreSQL)
  api/             Flask REST API (serves packs + audio)
  dashboard/       API key management + health endpoint
    data/          api_keys_config.json (key metadata)
    routes/        Flask blueprints (keys, health)
    services/      env_manager, key_tester

frontend/          TypeScript + React 19 + Vite + Tailwind
  src/components/  PackList, PackPlayer, StoryCard, SettingsPage, StatusDot
  src/hooks/       usePackPlayer (audio playback state)
  src/api/         API client
  src/types/       Shared TypeScript types
```

## Commands

```bash
# Dev (recommended)
make dev                             # Flask (5000) + Vite (5173) in parallel
make install                         # pip install + npm install
make lint                            # Lint both stacks
make format                          # Format both stacks
make build                           # Build frontend

# Backend
ruff check backend/                  # Lint Python
ruff format backend/                 # Format Python
ruff check --fix backend/            # Auto-fix lint issues
python -m backend                    # Run backend (Flask dev server, --debug default)
python -m backend serve              # Explicit serve
python -m backend generate           # Generate a pack

# Frontend
cd frontend
npm run lint                         # ESLint check
npm run lint:fix                     # ESLint auto-fix
npm run format                       # Prettier format
npm run format:check                 # Prettier check (CI)
npm run dev                          # Vite dev server
npm run build                        # TypeScript check + Vite build
```

## API Endpoints

```
GET  /api/packs              List all packs
GET  /api/packs/<id>         Get pack with stories
POST /api/packs/generate     Generate new pack
GET  /audio/<filename>       Serve audio file
GET  /api/keys               API keys (masked values)
POST /api/keys               Save API keys to .env
POST /api/keys/test          Test one or all API keys
GET  /api/health             System health status
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
