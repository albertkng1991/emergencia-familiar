"""
Scriptwriter: generates dialogue scripts for audio news digests using GPT-4o.

Each script is a ~300-word dialogue between Host A and Host B in Spanish.
Format: "Host A: ..." / "Host B: ..." (required by Gemini TTS multi-speaker).
"""

import json
import logging

from openai import OpenAI

from backend.config.settings import OPENAI_API_KEY, SCRIPTWRITER_MODEL

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un guionista experto de podcasts de noticias en español.
Tu trabajo es escribir diálogos naturales y dinámicos entre dos presentadores.

REGLAS:
- Host A presenta los hechos y datos clave de la noticia.
- Host B hace preguntas inteligentes, da contexto y aporta perspectiva.
- El diálogo debe sonar natural, como una conversación real entre dos personas informadas.
- Extensión: exactamente ~300 palabras (entre 250 y 350).
- Idioma: español (España), tono informativo pero cercano.
- Formato OBLIGATORIO: cada línea debe empezar con "Host A:" o "Host B:".
- NO uses acotaciones, emojis ni marcas de formato.
- Empieza directamente con el tema, sin saludos genéricos.
- Termina con una reflexión o dato que invite a pensar, no con despedida."""

USER_PROMPT_TEMPLATE = """Escribe el guión de diálogo para esta noticia:

TITULAR: {headline}

RESUMEN: {summary}

PUNTOS CLAVE:
{key_points}

FUENTES: {sources}

Recuerda: ~300 palabras, formato "Host A:" / "Host B:", español natural."""


def generate_script(topic: dict) -> dict:
    """
    Generate a dialogue script from a topic dict.

    Args:
        topic: dict with keys: topic, why, key_points, source_urls

    Returns:
        dict with: headline, summary, script, word_count
    """
    headline = topic.get("topic", "Noticia sin título")
    why = topic.get("why", "")
    key_points = topic.get("key_points", [])
    source_urls = topic.get("source_urls", [])

    key_points_text = "\n".join(f"- {kp}" for kp in key_points) if key_points else "- Sin puntos clave disponibles"
    sources_text = ", ".join(source_urls[:3]) if source_urls else "Sin fuentes específicas"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        headline=headline,
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
        max_tokens=1500,
    )

    script = response.choices[0].message.content.strip()
    word_count = len(script.split())

    logger.info(f"Script generated: '{headline[:50]}...' ({word_count} words)")

    return {
        "headline": headline,
        "summary": why,
        "script": script,
        "word_count": word_count,
        "source_urls": source_urls,
    }
