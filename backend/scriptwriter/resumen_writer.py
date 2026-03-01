"""
Resumen scriptwriter: generates single-speaker narration scripts for weekly summaries.

Style: inspired by Jordi Basté's "davantal" monologues on RAC1.
Direct, personal, informative with personality. First person, speaks to the listener.
Plain text for ElevenLabs single-voice synthesis.
"""

import logging

from openai import OpenAI

from backend.config.settings import OPENAI_API_KEY, SCRIPTWRITER_MODEL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
Eres el guionista de un programa de radio informativo en español de España.
Escribes monólogos al estilo del "davantal" de Jordi Basté en RAC1: directos, \
con personalidad, informativos pero cercanos.

LÍNEA EDITORIAL:
- Voz propia: hablas en primera persona, te diriges al oyente.
- Periodismo de hechos: datos, cifras, nombres. No inventas, no especulas.
- Conectas los puntos: no solo cuentas qué ha pasado, explicas por qué importa.
- Señalas contradicciones e ironías cuando las hay, sin ser editorial ni panfletario.
- Contextualizas: "esto viene de...", "conviene recordar que...".
- Cierre con perspectiva: qué queda pendiente, qué vigilar la semana que viene.

FORMATO:
- Extensión: ~500 palabras (entre 450 y 550). Equivale a ~3 minutos de audio.
- Estructura por importancia: lo más relevante primero, luego contexto y detalles.
- Texto plano, un solo narrador. Sin prefijos, sin acotaciones, sin emojis, sin markdown.
- Español de España. Tono informativo de radio, frases que suenen bien leídas en voz alta.
- Empieza directamente con el tema, sin saludos. Termina con perspectiva, sin despedida.
- Transiciones naturales entre ideas. Frases cortas y rítmicas, fáciles de seguir de oído."""

USER_PROMPT_TEMPLATE = """\
Escribe el monólogo informativo sobre este tema de la semana:

TEMA: {topic}

CONTEXTO: {summary}

PUNTOS CLAVE:
{key_points}

FUENTES VERIFICADAS: {sources}

Recuerda: ~500 palabras, texto plano, estilo radio informativa española, pirámide invertida."""


def generate_resumen_script(topic: dict) -> dict:
    """
    Generate a single-speaker narration script from a topic dict.

    Args:
        topic: dict with keys: topic, why, key_points, source_urls

    Returns:
        dict with: headline, summary, script, word_count, source_urls
    """
    headline = topic.get("topic", "Resumen sin título")
    why = topic.get("why", "")
    key_points = topic.get("key_points", [])
    source_urls = topic.get("source_urls", [])

    key_points_text = "\n".join(f"- {kp}" for kp in key_points) if key_points else "- Sin puntos clave disponibles"
    sources_text = ", ".join(source_urls[:5]) if source_urls else "Sin fuentes específicas"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        topic=headline,
        summary=why,
        key_points=key_points_text,
        sources=sources_text,
    )

    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=SCRIPTWRITER_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=2000,
    )

    script = response.choices[0].message.content.strip()
    word_count = len(script.split())

    logger.info(f"Resumen script generated: '{headline[:50]}...' ({word_count} words)")

    return {
        "headline": headline,
        "summary": why,
        "script": script,
        "word_count": word_count,
        "source_urls": source_urls,
    }
