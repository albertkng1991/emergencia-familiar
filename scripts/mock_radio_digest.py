#!/usr/bin/env python3
"""
Mock Radio Digest: 15 noticias narradas por un locutor de radio.

Usa OpenAI para reescribir cada noticia con tono de locutor de radio
y ElevenLabs TTS V3 para sintetizar el audio en español.

Uso:
    python scripts/mock_radio_digest.py
"""

import json
import logging
import sys
import time
from pathlib import Path

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from openai import OpenAI  # noqa: E402

from backend.config.settings import ELEVENLABS_API_KEY, OPENAI_API_KEY  # noqa: E402
from backend.tts.elevenlabs_tts import synthesize_narration  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_DIR = PROJECT_ROOT / "data" / "audio" / "mock_radio"

# ── 15 noticias (28 feb 2026) ──────────────────────────────────────────────

NOTICIAS = [
    {
        "titular": "OpenAI firma acuerdo con el Pentágono tras la prohibición de Anthropic por parte de Trump",
        "resumen": (
            "El presidente Trump ordenó al gobierno dejar de usar los productos de Anthropic "
            "y el Pentágono la designó como riesgo para la seguridad nacional. OpenAI anunció un acuerdo "
            "con el Departamento de Defensa con la condición de que su tecnología no se use para "
            "vigilancia masiva doméstica ni para sistemas de armas autónomas."
        ),
    },
    {
        "titular": "La IA dispara los precios de los smartphones a máximos históricos por escasez de chips de memoria",
        "resumen": (
            "La demanda masiva de chips de memoria por parte de la industria de IA ha provocado un shock "
            "en el mercado de smartphones. El precio medio subirá un 14% este año, alcanzando un máximo "
            "histórico de 523 dólares. La escasez afecta a toda la cadena de suministro global."
        ),
    },
    {
        "titular": "Jack Dorsey despide a 4.000 empleados de Block impulsado por la inteligencia artificial",
        "resumen": (
            "El fundador de Twitter anunció el despido de más de 4.000 empleados en Block, "
            "casi la mitad de la plantilla global. La reestructuración está impulsada por la integración "
            "de IA. Dorsey declaró que la IA transforma, acelera y, en los casos más honestos, reemplaza el trabajo."
        ),
    },
    {
        "titular": "Las acciones de Nvidia caen un 7% en la semana pese a resultados récord",
        "resumen": (
            "Nvidia sufrió su peor semana desde noviembre con una caída del 7%, pese a ingresos récord "
            "de 68.130 millones de dólares. Los inversores temen que el gasto en IA de las grandes "
            "tecnológicas esté cerca de su pico. El Nasdaq registró su mayor caída mensual desde marzo."
        ),
    },
    {
        "titular": "Las recompras de acciones en EE.UU. alcanzan un récord histórico en febrero",
        "resumen": (
            "Las autorizaciones de recompra de acciones se dispararon a 233.300 millones de dólares, "
            "la cifra más alta jamás registrada para febrero. Más de 200 empresas anunciaron programas, "
            "destacando Salesforce con 50.000 millones y Walmart con 30.000 millones."
        ),
    },
    {
        "titular": "El FMI proyecta crecimiento sólido de EE.UU. del 2,4% pese a la inflación persistente",
        "resumen": (
            "El Fondo Monetario Internacional proyecta un crecimiento del 2,4% para 2026, pero los datos "
            "de precios al productor de enero fueron más altos de lo esperado, añadiendo presión "
            "inflacionaria y complicando las expectativas de recortes de tipos."
        ),
    },
    {
        "titular": "Estados Unidos e Israel lanzan ataque militar conjunto contra Irán",
        "resumen": (
            "EE.UU. e Israel lanzaron un ataque masivo contra Irán con nombre en clave Operation Epic Fury. "
            "La Fuerza Aérea israelí atacó 500 objetivos militares con 200 cazas, incluyendo el distrito "
            "de Teherán donde reside Khamenei. Irán respondió con misiles balísticos contra Israel "
            "y bases estadounidenses en el Golfo."
        ),
    },
    {
        "titular": "Pakistán declara la guerra a Afganistán y lanza ataques contra Kabul",
        "resumen": (
            "Pakistán declaró la guerra a Afganistán y lanzó ataques contra Kabul y otras dos provincias. "
            "Esta escalada representa un nuevo frente de conflicto en una región ya inestable, "
            "con implicaciones significativas para la seguridad regional."
        ),
    },
    {
        "titular": "Bill Clinton testifica ante el Congreso por sus vínculos con Jeffrey Epstein",
        "resumen": (
            "El expresidente Bill Clinton compareció ante el Congreso para testificar sobre su relación "
            "con Jeffrey Epstein. Clinton declaró que no hizo nada malo y que no vio señales de los abusos. "
            "La comparecencia duró varias horas y se enmarca en la investigación sobre la red de Epstein."
        ),
    },
    {
        "titular": "Crean un análisis de sangre capaz de predecir el inicio del Alzheimer con años de antelación",
        "resumen": (
            "Científicos desarrollaron un análisis de sangre que puede estimar cuándo comenzarán los "
            "síntomas del Alzheimer midiendo la proteína p-tau217. El modelo predice el inicio con una "
            "precisión de tres a cuatro años, un hito en la detección precoz."
        ),
    },
    {
        "titular": "Detectan microplásticos en casi todos los tumores de cáncer de próstata analizados",
        "resumen": (
            "Un estudio reveló microplásticos en casi todos los tumores de próstata examinados, con "
            "concentraciones 2,5 veces superiores al tejido sano. Investigadores también encontraron "
            "que la acumulación de plásticos en cerebros humanos ha aumentado un 50% en ocho años."
        ),
    },
    {
        "titular": "Ingenieros programan bacterias para invadir y destruir tumores desde dentro",
        "resumen": (
            "Investigadores diseñaron bacterias modificadas genéticamente para invadir tumores y consumirlos "
            "desde su interior. Los núcleos tumorales, al carecer de oxígeno, resultan ser el caldo de "
            "cultivo perfecto para estos microbios terapéuticos."
        ),
    },
    {
        "titular": "Los Juegos Olímpicos de Invierno Milano-Cortina 2026 concluyen con momentos históricos",
        "resumen": (
            "El noruego Klaebo se convirtió en el primer atleta en ganar 6 oros en unos mismos JJOO de "
            "invierno. Estados Unidos ganó el oro en hockey sobre hielo masculino por primera vez desde 1980, "
            "y Mikaela Shiffrin conquistó su segundo oro olímpico en eslalon, 12 años después del primero."
        ),
    },
    {
        "titular": "UFC llega a Ciudad de México con Brandon Moreno como protagonista",
        "resumen": (
            "La UFC celebra un evento estelar en la Arena CDMX con el combate entre el mexicano "
            "Brandon Moreno y Asu Almabayev. El evento coincide con la recta final del Abierto Mexicano "
            "de tenis ATP 500 en Acapulco."
        ),
    },
    {
        "titular": "FC Barcelona se enfrentará al Newcastle United en octavos de la Champions League",
        "resumen": (
            "El sorteo de octavos de final emparejó al FC Barcelona con el Newcastle United en una de "
            "las eliminatorias más atractivas de la ronda. El equipo azulgrana buscará avanzar en un "
            "cruce que promete ser muy competitivo."
        ),
    },
]


# ── Prompt para reescritura de radio ──────────────────────────────────────

RADIO_SYSTEM_PROMPT = """\
Eres un locutor de radio español profesional que presenta un informativo de noticias.
Tu tono es informativo, cercano y natural — como un boletín de radio de la Cadena SER o RNE.

Reglas:
- Escribe en español de España (castellano).
- Máximo 150 palabras por noticia.
- No uses emojis ni formatos markdown.
- Empieza directamente con la noticia, sin saludos ni despedidas.
- Usa transiciones naturales de locutor de radio.
- Mantén un tono objetivo pero enganchante.
- No inventes datos; usa solo la información proporcionada.
"""


def rewrite_as_radio(titular: str, resumen: str, position: int) -> str:
    """Rewrite a news item as a radio broadcaster would read it."""
    client = OpenAI(api_key=OPENAI_API_KEY)

    user_msg = f"Noticia {position} de 15.\n\nTitular: {titular}\n\nResumen: {resumen}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": RADIO_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.7,
        max_tokens=400,
    )

    return response.choices[0].message.content.strip()


def main():
    """Orchestrate the full mock radio digest pipeline."""
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY no configurada en .env")
        sys.exit(1)
    if not ELEVENLABS_API_KEY:
        logger.error("ELEVENLABS_API_KEY no configurada en .env")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info(f"Generando mock radio digest con {len(NOTICIAS)} noticias...")
    logger.info(f"Directorio de salida: {OUTPUT_DIR}")

    results = []

    for i, noticia in enumerate(NOTICIAS, 1):
        logger.info(f"\n{'=' * 60}")
        logger.info(f"Noticia {i}/{len(NOTICIAS)}: {noticia['titular'][:60]}...")

        # Step 1: Rewrite as radio narration
        logger.info("  → Reescribiendo con GPT-4o...")
        radio_text = rewrite_as_radio(noticia["titular"], noticia["resumen"], i)
        logger.info(f"  → Texto generado ({len(radio_text.split())} palabras)")

        # Step 2: Synthesize with ElevenLabs
        output_path = OUTPUT_DIR / f"noticia_{i:02d}.mp3"
        logger.info("  → Sintetizando con ElevenLabs...")
        duration = synthesize_narration(radio_text, output_path)
        logger.info(f"  → Audio: {output_path.name} ({duration:.1f}s)")

        results.append(
            {
                "numero": i,
                "titular": noticia["titular"],
                "texto_radio": radio_text,
                "archivo": str(output_path.name),
                "duracion_s": round(duration, 1),
            }
        )

        # Small delay to respect rate limits
        if i < len(NOTICIAS):
            time.sleep(1)

    # Save metadata
    metadata_path = OUTPUT_DIR / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    total_duration = sum(r["duracion_s"] for r in results)
    logger.info(f"\n{'=' * 60}")
    logger.info("¡Mock completado!")
    logger.info(f"  {len(results)} audios generados en {OUTPUT_DIR}")
    logger.info(f"  Duración total estimada: {total_duration:.0f}s ({total_duration / 60:.1f} min)")
    logger.info(f"  Metadata: {metadata_path}")


if __name__ == "__main__":
    main()
