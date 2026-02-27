# Daily Audio Digest

Diario audible de noticias: packs de 5 noticias diarias resumidas en diálogos de ~2 minutos cada una entre dos hosts con voces distintas. Le das play a un pack y escuchas ~10 minutos de podcast explicándote las noticias del día.

---

## Concepto

- Cada mañana el sistema busca las 5 noticias más relevantes de un tema (IA, tech, crypto...).
- Para cada noticia genera un guión de diálogo entre dos hosts (~300 palabras = ~2 min).
- Convierte cada guión a audio multi-voz con un servicio TTS (caja negra).
- El usuario abre la app, ve el pack del día, le da play, y escucha las 5 como un mini-podcast.

---

## TTS multi-voz: opciones caja negra

### Opción A: ElevenLabs Text-to-Dialogue API (recomendada)

Endpoint dedicado para diálogo multi-voz. Le pasas una lista de turnos con voice_id y texto, y devuelve un único .mp3 con la conversación completa. No hay que mergear nada.

```
POST /v1/text-to-dialogue
{
  "dialogue": [
    {"voice_id": "voz-host-A", "text": "[entusiasmado] Hoy tenemos una noticia brutal sobre OpenAI..."},
    {"voice_id": "voz-host-B", "text": "Sí, y lo más interesante es que..."},
    {"voice_id": "voz-host-A", "text": "[laughing] Exacto, nadie se lo esperaba."}
  ]
}
→ Devuelve audio .mp3
```

- Modelo: Eleven v3 (el más expresivo, interpreta emoción del texto)
- Soporta audio tags: `[laughing]`, `[sigh]`, `[cautiously]`, `[whispering]`
- Hasta 10 voces únicas por diálogo, turnos ilimitados
- 70+ idiomas, incluido español
- Coste: ~$5/mes plan Creator (100k chars), ~$22/mes plan Scale (500k chars)
- 5 noticias × 300 palabras × 5 chars/palabra = ~7.500 chars/día → ~225k/mes → plan Scale

### Opción B: Gemini 2.5 Flash/Pro TTS (más barata)

Google Gemini tiene TTS multi-speaker nativo. Le pasas el texto con nombres de speaker y configuras una voz por cada uno.

```
POST /v1/models/gemini-2.5-flash-preview-tts:generateContent
{
  "contents": [{"parts": [{"text": "Host A: Hoy tenemos... Host B: Sí, lo más interesante..."}]}],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "multiSpeakerVoiceConfig": {
        "speakerVoiceConfigs": [
          {"speaker": "Host A", "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}},
          {"speaker": "Host B", "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Puck"}}}
        ]
      }
    }
  }
}
→ Devuelve audio inline (base64)
```

- Modelos: Gemini 2.5 Flash TTS (rápido, barato) o Pro TTS (más calidad)
- Hasta 2 speakers por request
- Coste: ~$0.02-0.04/minuto de audio → ~$0.20/día → ~$6/mes
- Tiene free tier generoso para desarrollo
- Menos expresivo que ElevenLabs pero funcional

### Decisión

**ElevenLabs** si queremos calidad podcast real (expresividad, risas, pausas naturales).
**Gemini** si queremos minimizar costes y ya usamos Google Cloud.

→ Empezar con **Gemini** (gratis para prototipar) y evaluar si la calidad es suficiente. Si no, saltar a ElevenLabs.

---

## Arquitectura

```
daily-audio-digest/
├── backend/
│   ├── config/             # Settings, API keys
│   ├── research/           # Buscar noticias (fork de ig-pipeline)
│   │   ├── sources.py      # RSS, NewsAPI, Reddit, Google Trends
│   │   ├── ranker.py       # Seleccionar top 5 del día
│   │   └── dedup.py        # No repetir noticias
│   ├── scriptwriter/       # Generar guiones de diálogo
│   │   └── writer.py       # Prompt → GPT-4o → guión Host A / Host B
│   ├── tts/                # Text-to-Speech (caja negra)
│   │   ├── base.py         # Interfaz abstracta
│   │   ├── elevenlabs.py   # Implementación ElevenLabs
│   │   └── gemini.py       # Implementación Gemini TTS
│   ├── packs/              # Orquestador del pipeline
│   │   └── generator.py    # research → script → audio → pack
│   ├── storage/            # DB + audio file storage
│   │   ├── models.py       # SQLAlchemy: packs, stories
│   │   └── audio.py        # Guardar/servir mp3 (local o GCS)
│   └── api/                # REST API
│       └── app.py          # GET /api/packs, GET /api/packs/:id
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PackList.tsx       # Lista de packs por fecha
│   │   │   ├── PackPlayer.tsx     # Reproductor del pack completo
│   │   │   ├── StoryCard.tsx      # Card de cada noticia (activa/inactiva)
│   │   │   └── WaveformBar.tsx    # Barra de progreso tipo podcast
│   │   ├── hooks/
│   │   │   └── usePackPlayer.ts   # Estado de reproducción del pack
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── App.tsx
│   └── package.json
├── scripts/
│   └── generate_pack.py    # CLI: python generate_pack.py --topic "IA"
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## Pipeline de generación

```
1. Research        → Top 5 noticias del día sobre el tema
2. Scriptwriter    → Para cada noticia: guión de diálogo 2 hosts (~300 palabras)
3. TTS             → Guión → audio multi-voz (caja negra)
4. Pack            → Metadata JSON + 5 archivos .mp3
5. API             → Servir al frontend
```

---

## Modelo de datos

```sql
-- Un pack = briefing del día
packs:
  id
  topic           -- "IA", "tech", "crypto"
  date            -- 2026-02-27
  status          -- generating | ready | error
  total_duration  -- segundos totales del pack
  created_at

-- Cada noticia dentro del pack
stories:
  id
  pack_id         -- FK → packs
  position        -- 1-5 (orden en el pack)
  headline        -- Título de la noticia
  summary         -- Resumen corto para mostrar en UI
  source_urls     -- JSON array de fuentes
  script          -- Guión completo del diálogo
  audio_url       -- URL del .mp3 generado
  duration        -- segundos
  created_at
```

---

## UI del reproductor

```
┌─────────────────────────────────────────────────┐
│  📅 27 Feb 2026 · IA                            │
│  Pack del día · 5 noticias · 10:32 min          │
│                                                 │
│  ▶ advancement in robotics                     │  ← activa (highlight)
│    ━━━━━━━━━━━━━━━━━━░░░░░░░  1:24 / 2:05       │
│                                                 │
│  ○ nuevo modelo de openai                       │  ← siguiente
│  ○ apple y la ia generativa                     │
│  ○ regulación europea de ia                     │
│  ○ startups de ia en latam                      │
│                                                 │
│  Pack: ━━━━━━░░░░░░░░░░░░░░░  3:12 / 10:32     │
│                                                 │
│  [⏮] [⏪ 15s] [  ▶  ] [15s ⏩] [⏭]             │
└─────────────────────────────────────────────────┘
```

---

## APIs necesarias

| Servicio | Para qué | Coste aprox/mes |
|----------|----------|-----------------|
| OpenAI GPT-4o | Guiones de diálogo | ~$1 |
| Gemini 2.5 Flash TTS | Multi-voz (opción barata) | ~$6 |
| ElevenLabs v3 | Multi-voz (opción premium) | $5-22 |
| NewsAPI | Fuente de noticias | Gratis |
| Cloud Run | Hosting | ~$5 |

---

## Research reutilizable de ig-pipeline

El bot de Instagram (`instagram-ai-bot`) ya tiene módulos de research que se pueden reutilizar:

- `modules/research.py` → RSS feeds, Google News, NewsAPI, Reddit (PRAW), Google Trends
- `modules/post_store.py` → Deduplicación por hash de fuentes
- `config/settings.py` → API keys compartidas

Se copian los módulos relevantes al nuevo proyecto adaptándolos al formato de "noticias para audio" en vez de "noticias para carrusel de Instagram".
