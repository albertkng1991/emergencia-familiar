# Daily Audio Digest

Diario audible de noticias: packs de 5 noticias diarias resumidas en píldoras de ~2 minutos cada una. Le das play a un pack y escuchas ~10 minutos de podcast explicándote las noticias del día.

---

## Concepto

- Cada mañana (o bajo demanda) el sistema busca las noticias más relevantes de un tema (ej: IA, tech, crypto).
- Selecciona las 5 mejores, genera un guión hablado de ~2 min por noticia, y lo convierte a audio con voz natural.
- El usuario abre la app, ve el pack del día, le da play, y escucha las 5 noticias seguidas como un mini-podcast.
- UI tipo reproductor: muestra qué noticia suena, progreso dentro de ella, y progreso del pack completo.

---

## 4 Ideas de implementación

### Idea 1: Monolito Python + Web App React (MVP rápido)

**Stack:** Python backend (Flask/FastAPI) + React frontend + ElevenLabs TTS

```
Cron diario (o manual)
  └─> Research (reutilizar módulo de ig-pipeline: RSS, Reddit, NewsAPI, Google Trends)
  └─> Para cada noticia:
        └─> GPT-4o genera guión hablado (~300 palabras = ~2 min)
        └─> ElevenLabs TTS genera .mp3
  └─> Empaqueta en un "pack" (JSON metadata + 5 mp3s)
  └─> Sirve via API

React SPA
  └─> GET /api/packs (lista de packs por fecha)
  └─> GET /api/packs/:id (metadata + URLs de audio)
  └─> Reproductor HTML5 Audio con controles de pack
```

**Pros:** Rápido de construir, reutiliza research de ig-pipeline, hosting simple (Cloud Run).
**Contras:** ElevenLabs tiene coste por carácter (~$5/mes para 5 noticias/día con plan Creator).

**Coste estimado:** ~$5-11/mes (ElevenLabs Creator $5 + GPT-4o ~$1 + Cloud Run ~$5)

---

### Idea 2: Pipeline serverless con Cloud Functions + Storage

**Stack:** Cloud Functions (Python) + Cloud Storage (audio) + Cloud Scheduler + frontend estático

```
Cloud Scheduler (8:00 AM)
  └─> Trigger Cloud Function "generate-pack"
        └─> Research noticias
        └─> Genera guiones con GPT-4o
        └─> TTS con Google Cloud Text-to-Speech (más barato que ElevenLabs)
        └─> Sube .mp3 a Cloud Storage (bucket público)
        └─> Guarda metadata en Firestore/PostgreSQL

Frontend (hosting estático en Cloud Storage o Vercel)
  └─> Fetch metadata, reproduce audio directo desde Storage URLs
```

**Pros:** Muy barato (Google TTS = $4/1M caracteres, ~$0.10/día), serverless = sin servidor 24/7.
**Contras:** Google TTS suena menos natural que ElevenLabs. Más piezas que orquestar.

**Coste estimado:** ~$2-5/mes total

---

### Idea 3: App nativa móvil (React Native / Expo)

**Stack:** Backend igual que Idea 1, pero frontend como app móvil

```
Backend API (Cloud Run)
  └─> Mismo pipeline de research + guión + TTS
  └─> API REST serviendo packs y audio

App móvil (React Native + Expo)
  └─> Notificación push matutina: "Tu briefing de hoy está listo"
  └─> Reproductor tipo Spotify/podcast
  └─> Reproducción en background, control desde lock screen
  └─> Descarga offline de packs
```

**Pros:** Experiencia premium, notificaciones, reproducción en background, potencial para monetizar.
**Contras:** Más desarrollo, App Store/Play Store, mantenimiento de dos plataformas.

---

### Idea 4: Sistema multi-voz tipo "mesa redonda"

**Stack:** Backend Python + múltiples voces ElevenLabs + React frontend

```
Pipeline:
  └─> Research noticias
  └─> GPT-4o genera guión con 2 "hosts" (diálogo, no monólogo)
        Host A: presenta la noticia, datos clave
        Host B: da contexto, opinión, pregunta retórica
  └─> ElevenLabs con 2 voces diferentes
  └─> Merge de audios en un solo mp3 por noticia (con pydub/ffmpeg)
  └─> Crossfade + jingle entre noticias

Frontend:
  └─> Avatares animados de cada host
  └─> Transcripción en tiempo real sincronizada con audio
  └─> "Clica para leer más" → enlace a la fuente original
```

**Pros:** Mucho más engaging que un monólogo, diferenciador vs competencia (NotebookLM vibes pero curado).
**Contras:** Doble coste de TTS, guiones más complejos, post-producción de audio.

---

## Recomendación

**Empezar con Idea 1** (monolito MVP) pero con la arquitectura pensada para evolucionar a Idea 4 (multi-voz):

1. **Fase 1 (MVP):** Una voz, 5 noticias, web app. Validar que el contenido mola.
2. **Fase 2:** Añadir segunda voz (diálogo), jingles, transiciones.
3. **Fase 3:** App móvil si el formato funciona.

### Módulos reutilizables de ig-pipeline

El sistema de research de `instagram-ai-bot` ya tiene:
- **RSS feeds** (Google News, fuentes tech)
- **Reddit scraper** (PRAW)
- **NewsAPI** integración
- **Google Trends** detección
- **Deduplicación** por hash de fuentes

Se puede extraer como librería compartida o copiar los módulos relevantes.

---

## Arquitectura propuesta (MVP)

```
daily-audio-digest/
├── backend/
│   ├── research/          # Buscar noticias (fork de ig-pipeline)
│   ├── scriptwriter/      # Generar guiones hablados (GPT-4o)
│   ├── tts/               # Text-to-Speech (ElevenLabs/Google)
│   ├── packs/             # Orquestar: research → script → audio → pack
│   ├── api/               # Flask/FastAPI endpoints
│   └── storage/           # DB + file storage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PackList.tsx       # Lista de packs por fecha
│   │   │   ├── PackPlayer.tsx     # Reproductor del pack
│   │   │   ├── StoryCard.tsx      # Card de cada noticia
│   │   │   └── ProgressBar.tsx    # Progreso pack completo
│   │   ├── hooks/
│   │   │   └── useAudioPlayer.ts  # Lógica de reproducción
│   │   └── App.tsx
│   └── package.json
├── scripts/
│   └── generate_pack.py   # CLI para generar pack manualmente
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## APIs necesarias

| Servicio | Para qué | Coste aprox |
|----------|----------|-------------|
| OpenAI GPT-4o | Generar guiones hablados | ~$1/mes |
| ElevenLabs | Text-to-Speech (voz natural) | $5-22/mes |
| NewsAPI | Fuente de noticias | Gratis (100 req/día) |
| Google Cloud TTS | Alternativa TTS más barata | ~$0.10/día |
