"""
Resumen generator: orchestrates the weekly summary pipeline.

Pipeline:
  1. Discover 8-10 diverse topics of the week (generalista, not tech-only)
  2. For each topic: research → narration script → ElevenLabs TTS → save to DB

Each resumen is one Pack (pack_type="weekly") with one Story.
Audio is single-speaker via ElevenLabs (not Gemini multi-speaker dialogue).
"""

import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime

from openai import OpenAI

from backend.config.settings import AUDIO_DIR, OPENAI_API_KEY, OPENAI_MODEL
from backend.research.researcher import (
    _dedupe_articles,
    _filter_recent_articles,
    _prioritize_articles,
    fetch_google_news_sections,
    fetch_google_trends,
    fetch_rss,
)
from backend.scriptwriter.resumen_writer import generate_resumen_script
from backend.storage.database import get_session, init_db
from backend.storage.models import Pack, Story
from backend.tts.elevenlabs_tts import synthesize_narration

logger = logging.getLogger(__name__)

# ── Topic discovery ─────────────────────────────────────────────────────────

_WEEKLY_DISCOVERY_PROMPT = """\
Eres editor jefe de un programa de radio informativo generalista en español de España.
Tu trabajo es seleccionar los {count} temas más importantes de la semana para hacer \
resúmenes de ~3 minutos cada uno.

CRITERIOS DE SELECCIÓN:
1. DIVERSIDAD: los temas deben cubrir ámbitos diferentes (política, economía, \
tecnología, internacional, sociedad, cultura, ciencia, deportes...). No repitas ámbito.
2. RELEVANCIA: prioriza lo que más ha importado esta semana, no lo anecdótico.
3. IMPACTO: temas que afectan a mucha gente o que van a tener consecuencias.
4. DATOS: elige temas donde haya hechos concretos, cifras y nombres. No abstracciones.
5. CONSENSUS: artículos cubiertos por múltiples fuentes (consensus > 0) son más fiables.

ARTÍCULOS DISPONIBLES (consensus = nº de fuentes distintas que lo cubren):
{articles_text}

GOOGLE TRENDS:
{trends_text}

TEMAS YA CUBIERTOS (evitar repetir):
{past_text}

Responde en JSON exacto:
{{
    "topics": [
        {{
            "topic": "Título corto en español (5-10 palabras)",
            "topic_en": "Same in English",
            "category": "Categoría (ej: Política, Economía, IA, Internacional, Deportes...)",
            "why": "Una frase: por qué este tema es el más relevante de su ámbito esta semana",
            "key_points": [
                "Dato concreto 1",
                "Dato concreto 2",
                "Dato concreto 3",
                "Dato concreto 4",
                "Dato concreto 5"
            ],
            "source_urls": ["url1", "url2"],
            "virality_score": 8
        }}
    ]
}}

REGLA CRÍTICA DE DIVERSIDAD: Cada tema DEBE ser de una categoría DIFERENTE. \
Si hay 5 temas, deben cubrir 5 ámbitos distintos (ej: Internacional, Economía, Tecnología, \
Sociedad, Cultura). NUNCA repitas categoría. Si un gran evento domina las noticias, \
elige UN solo ángulo y dedica los demás slots a otros ámbitos.

IMPORTANTE: Devuelve EXACTAMENTE {count} temas, cada uno de un ÁMBITO DIFERENTE."""


def discover_weekly_topics(count: int = 10) -> list[dict]:
    """
    Discover the most relevant topics of the week across all categories.

    Fetches from all news sources WITHOUT the tech-only filter,
    then uses an LLM to identify diverse, high-impact topics.

    Returns:
        list of topic dicts with: topic, topic_en, category, why, key_points, source_urls
    """
    count = max(1, min(count, 12))
    logger.info(f"Discovering {count} weekly topics (generalista mode)...")

    # Fetch from reliable sources in parallel — NO focus_topic, NO tech filter
    all_articles = []
    trends = []

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(fetch_rss, None): "rss",
            executor.submit(fetch_google_news_sections, None): "google_news_sections",
            executor.submit(fetch_google_trends, None): "trends",
        }
        for future in as_completed(futures):
            source = futures[future]
            try:
                result = future.result(timeout=30)
                if source == "trends":
                    trends = result
                else:
                    all_articles.extend(result)
            except Exception as e:
                logger.error(f"Error fetching {source}: {e}")

    if not all_articles:
        raise RuntimeError("No articles fetched from any source. Check API keys and network.")

    # Process: dedupe + recency filter + prioritize — but NO tech filter
    all_articles = _dedupe_articles(all_articles)
    filtered = _filter_recent_articles(all_articles, max_age_days=10)
    if filtered:
        all_articles = filtered
    all_articles = _prioritize_articles(
        all_articles,
        trends=trends,
        focus_topic=None,
        limit=80,
        max_per_domain=5,
    )

    logger.info(f"Articles for weekly discovery: {len(all_articles)}")

    # LLM ranking
    from backend.research.researcher import _pick_source_urls, _prepare_article_summaries, _sanitize_research_text

    articles_text = _prepare_article_summaries(all_articles, limit=40)
    trends_text = ", ".join(trends) if trends else "No Google Trends data"
    past_text = _get_recent_resumen_topics()
    logger.info(f"Summaries prepared: {len(articles_text)} chars, calling LLM...")

    prompt = _WEEKLY_DISCOVERY_PROMPT.format(
        count=count,
        articles_text=articles_text,
        trends_text=trends_text,
        past_text=past_text,
    )

    client = OpenAI(api_key=OPENAI_API_KEY, timeout=90)
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"},
    )
    raw = json.loads(resp.choices[0].message.content)
    raw_topics = raw.get("topics", [])

    results = []
    for t in raw_topics[:count]:
        if not isinstance(t, dict) or "topic" not in t:
            continue
        t["topic"] = _sanitize_research_text(t.get("topic", ""))
        t["category"] = t.get("category", "General")
        if "why" in t:
            t["why"] = _sanitize_research_text(t.get("why", ""))
        raw_points = t.get("key_points", [])
        if not isinstance(raw_points, list):
            raw_points = []
        t["key_points"] = raw_points[:6]

        # Replace source URLs with verified ones from the article pool
        trusted_urls = _pick_source_urls(all_articles, selected_topic=t.get("topic", ""))
        if trusted_urls:
            t["source_urls"] = trusted_urls

        results.append(t)

    logger.info(f"Discovered {len(results)} weekly topics:")
    for i, t in enumerate(results, 1):
        logger.info(f"  {i}. [{t.get('category', '?')}] {t['topic']}")

    return results


def _get_recent_resumen_topics() -> str:
    """Get topics from recent weekly packs to avoid repetition."""
    try:
        session = get_session()
        recent_packs = (
            session.query(Pack)
            .filter(Pack.pack_type == "weekly", Pack.status == "ready")
            .order_by(Pack.created_at.desc())
            .limit(20)
            .all()
        )
        topics = [p.topic for p in recent_packs]
        session.close()
        return ", ".join(topics) if topics else "Ninguno"
    except Exception:
        return "Ninguno"


# ── Single resumen generation ───────────────────────────────────────────────


def generate_single_resumen(topic_data: dict) -> dict:
    """
    Generate a single weekly resumen from a pre-discovered topic.

    Args:
        topic_data: dict from discover_weekly_topics() with topic, category, why, key_points, source_urls

    Returns:
        Pack dict with story
    """
    init_db()
    session = get_session()
    today = datetime.now(UTC).strftime("%Y-%m-%d")

    topic_label = topic_data.get("category", topic_data.get("topic", "General"))
    pack = Pack(topic=topic_label, date=today, status="generating", pack_type="weekly")
    session.add(pack)
    session.commit()

    logger.info(f"Resumen pack #{pack.id} for [{topic_label}]: {topic_data.get('topic', '?')}")

    try:
        # 1. Generate narration script
        script_data = generate_resumen_script(topic_data)

        # 2. Synthesize audio with ElevenLabs
        audio_filename = f"resumen_pack{pack.id}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        duration = synthesize_narration(script_data["script"], audio_path)

        # 3. Save story
        story = Story(
            pack_id=pack.id,
            position=1,
            headline=script_data["headline"],
            summary=script_data["summary"],
            source_urls=json.dumps(script_data.get("source_urls", []), ensure_ascii=False),
            script=script_data["script"],
            audio_filename=audio_filename,
            duration=duration,
        )
        session.add(story)
        session.commit()

        # 4. Mark pack as ready
        pack.status = "ready"
        pack.total_duration = duration
        session.commit()

        logger.info(f"Resumen pack #{pack.id} ready! [{topic_label}] {duration:.1f}s")
        session.refresh(pack)
        return pack.to_dict(include_stories=True)

    except Exception as e:
        pack.status = "error"
        session.commit()
        logger.error(f"Resumen pack #{pack.id} failed: {e}")
        raise
    finally:
        session.close()


# ── Batch generation (full weekly run) ──────────────────────────────────────


def generate_weekly_resumenes(count: int = 10) -> list[dict]:
    """
    Generate a full batch of weekly resúmenes.

    1. Discover 8-10 diverse topics of the week
    2. For each topic: script → ElevenLabs → save

    Returns:
        list of Pack dicts
    """
    logger.info(f"=== Starting weekly resúmenes batch ({count} topics) ===")

    # Phase 1: Discover topics
    topics = discover_weekly_topics(count=count)
    logger.info(f"Discovered {len(topics)} topics, generating resúmenes...")

    # Phase 2: Generate each resumen sequentially
    results = []
    for i, topic_data in enumerate(topics, 1):
        logger.info(f"[{i}/{len(topics)}] Generating: {topic_data.get('topic', '?')}")
        try:
            pack = generate_single_resumen(topic_data)
            results.append(pack)
        except Exception as e:
            logger.error(f"[{i}/{len(topics)}] Failed: {e}")
            continue

    logger.info(f"=== Weekly batch complete: {len(results)}/{len(topics)} resúmenes generated ===")
    return results
