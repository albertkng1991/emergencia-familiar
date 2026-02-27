#!/usr/bin/env python3
"""
Seed the database with realistic mock data for UI design.
Creates packs across multiple topics and dates, with silent audio files.
"""

import json
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from random import randint, uniform

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config.settings import AUDIO_DIR
from backend.storage.database import get_session, init_db
from backend.storage.models import Pack, Story

# --- Mock data ---

TOPICS = {
    "Inteligencia Artificial": [
        [
            "OpenAI lanza GPT-5 con capacidad de razonamiento en tiempo real",
            "Google DeepMind presenta Gemini 2.5 con visión multimodal avanzada",
            "La UE aprueba la primera regulación global de IA generativa",
            "Meta abre el código de Llama 4 y supera a GPT-4 en benchmarks",
            "Nvidia supera los 4 billones de capitalización impulsada por la demanda de chips IA",
        ],
        [
            "Anthropic recauda 5.000M$ en la mayor ronda de financiación de IA",
            "China presenta su modelo de IA soberano que rivaliza con los occidentales",
            "Microsoft integra Copilot directamente en Windows 12",
            "Los deepfakes generados por IA influyen en las elecciones de Brasil",
            "Startups de IA españolas captan 800M€ en el primer trimestre",
        ],
        [
            "Apple lanza Apple Intelligence 2.0 con procesamiento local mejorado",
            "La IA generativa destruye 2 millones de empleos pero crea 3 millones nuevos según la OIT",
            "Samsung presenta Galaxy S26 con chip dedicado a IA on-device",
            "Investigadores logran que una IA prediga terremotos con 72h de antelación",
            "El MIT desarrolla una IA que diseña fármacos en horas en vez de años",
        ],
        [
            "Elon Musk lanza Grok 3 integrado en toda la plataforma X",
            "Amazon revoluciona la logística con robots autónomos guiados por IA",
            "La OMS alerta sobre el uso de IA en diagnósticos médicos sin supervisión",
            "Cohere lanza modelos de IA especializados para el sector financiero",
            "ByteDance presenta un modelo de generación de vídeo que compite con Sora",
        ],
    ],
    "Política España": [
        [
            "El Congreso aprueba la nueva ley de vivienda con el apoyo de los socios del Gobierno",
            "Feijóo propone un pacto de Estado sobre inmigración que Sánchez rechaza",
            "Cataluña celebra un año de la investidura de Illa con récord de inversión",
            "El Tribunal Constitucional avala la amnistía pero limita su alcance",
            "Vox pierde la mitad de sus votantes según el último barómetro del CIS",
        ],
        [
            "Sánchez anuncia elecciones anticipadas para septiembre tras perder la cuestión de confianza",
            "La financiación singular de Cataluña divide al PSOE en dos bloques",
            "Podemos se refunda como movimiento social y abandona la política institucional",
            "El PP ganaría con mayoría absoluta según todas las encuestas",
            "Díaz dimite como líder de Sumar y convoca un congreso extraordinario",
        ],
        [
            "España asume la presidencia del Consejo de la UE con la migración como prioridad",
            "El Gobierno aprueba la subida del SMI a 1.250 euros mensuales",
            "Ayuso anuncia una rebaja fiscal histórica en la Comunidad de Madrid",
            "ERC condiciona los presupuestos a un referéndum de autodeterminación",
            "El Rey Felipe VI media en la crisis institucional entre Gobierno y judicatura",
        ],
    ],
    "Tecnología": [
        [
            "Apple presenta el iPhone 17 con pantalla plegable y cámara bajo la pantalla",
            "SpaceX completa el primer vuelo tripulado a Marte con 4 astronautas",
            "Google lanza Android 17 con integración total de IA en todas las apps",
            "Tesla presenta el robotaxi sin volante que empezará a operar en 10 ciudades",
            "El 6G comienza sus primeras pruebas comerciales en Corea del Sur y Japón",
        ],
        [
            "Meta lanza Quest 4 con resolución retina y seguimiento corporal completo",
            "Amazon anuncia el cierre de Alexa clásica en favor de Alexa AI",
            "Intel presenta chips de 1.4nm fabricados en sus nuevas plantas europeas",
            "Spotify lanza DJ IA personalizado que crea podcasts sobre tus intereses",
            "WhatsApp integra pagos instantáneos en toda Europa",
        ],
        [
            "YouTube lanza la suscripción Premium Ultra con contenido generado por IA",
            "Microsoft Surface Pro 11 con chip Qualcomm destrona al MacBook Air en autonomía",
            "La computación cuántica de IBM resuelve un problema de logística global en segundos",
            "Xiaomi lanza su primer coche eléctrico en Europa por 25.000 euros",
            "TikTok se reinventa como plataforma de búsqueda y compite con Google",
        ],
    ],
    "Economía": [
        [
            "El BCE baja los tipos de interés al 2% por primera vez en tres años",
            "El Ibex 35 marca máximos históricos superando los 13.000 puntos",
            "La inflación en España cae al 1,8% y se sitúa por debajo de la media europea",
            "Bitcoin supera los 150.000 dólares tras la aprobación de los ETF en Asia",
            "Inditex supera a LVMH como la empresa más valiosa de Europa",
        ],
        [
            "El paro en España baja del 10% por primera vez desde 2008",
            "China entra en recesión técnica y arrastra a los mercados asiáticos",
            "Amazon supera los 3 billones de capitalización bursátil",
            "La vivienda sube un 15% en Madrid y Barcelona mientras el resto de España se estanca",
            "El euro alcanza la paridad con el dólar por tercera vez este año",
        ],
    ],
    "Deportes": [
        [
            "El Real Madrid gana su 17ª Champions League en una final épica contra el City",
            "España se clasifica para el Mundial 2026 como primera de grupo",
            "Lamine Yamal gana el Balón de Oro con solo 19 años",
            "Rafa Nadal anuncia un torneo de exhibición de despedida en Madrid",
            "El Barça ficha a Haaland por 180 millones en el traspaso más caro de la historia",
        ],
        [
            "Carlos Alcaraz gana su tercer Roland Garros consecutivo",
            "La selección femenina de fútbol llega a la final del Mundial 2027",
            "Fernando Alonso se retira de la F1 tras una temporada histórica con Aston Martin",
            "El Atlético de Madrid inaugura su nuevo estadio con capacidad para 75.000",
            "Marc Márquez vuelve a ganar el Mundial de MotoGP con Ducati",
        ],
    ],
    "Ciencia": [
        [
            "La NASA confirma señales de vida microbiana en muestras de Marte",
            "Científicos españoles desarrollan una vacuna universal contra la gripe",
            "El CERN descubre una nueva partícula que podría explicar la materia oscura",
            "Un equipo de Barcelona crea órganos artificiales funcionales con bioimpresión 3D",
            "La fusión nuclear genera energía neta por primera vez en un reactor europeo",
        ],
    ],
}

SCRIPTS_TEMPLATE = [
    (
        "Host A: Hoy tenemos una noticia muy importante. {headline}.\n"
        "Host B: Sí, es algo que va a cambiar muchas cosas. Según las fuentes, {summary_short}\n"
        "Host A: Exactamente. Y lo más interesante es que esto podría tener un impacto directo "
        "en nuestro día a día.\n"
        "Host B: Sin duda. Vamos a seguir este tema muy de cerca."
    ),
    (
        "Host A: Arrancamos con algo que ha sorprendido a todo el mundo. {headline}.\n"
        "Host B: La verdad es que no me lo esperaba. {summary_short}\n"
        "Host A: Los expertos dicen que esto es solo el principio.\n"
        "Host B: Totalmente de acuerdo. Habrá que estar atentos a las próximas semanas."
    ),
    (
        "Host A: Siguiente noticia. {headline}.\n"
        "Host B: Esto es muy relevante porque {summary_short}\n"
        "Host A: Claro, y hay que tener en cuenta el contexto actual.\n"
        "Host B: Absolutamente. Es una de esas noticias que marcan un antes y un después."
    ),
]

SOURCES = [
    "https://elpais.com/tecnologia/",
    "https://www.bbc.com/mundo",
    "https://www.elmundo.es/",
    "https://techcrunch.com/",
    "https://www.reuters.com/",
    "https://www.theverge.com/",
    "https://arstechnica.com/",
    "https://www.wired.com/",
]


def create_silent_audio(filepath, duration_secs):
    """Create a silent MP3 file of given duration using ffmpeg."""
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=mono",
            "-t",
            str(duration_secs),
            "-b:a",
            "32k",
            "-q:a",
            "9",
            str(filepath),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def seed():
    init_db()
    session = get_session()

    # Clear existing data
    session.query(Story).delete()
    session.query(Pack).delete()
    session.commit()

    # Clean audio dir
    for f in AUDIO_DIR.iterdir():
        if f.suffix == ".mp3":
            f.unlink()

    today = datetime.now(UTC).date()
    pack_count = 0

    for topic, story_sets in TOPICS.items():
        for day_offset, stories_data in enumerate(story_sets):
            pack_date = today - timedelta(days=day_offset)
            total_duration = 0.0

            pack = Pack(
                topic=topic,
                date=pack_date.isoformat(),
                status="ready",
                created_at=datetime.now(UTC) - timedelta(days=day_offset, hours=randint(1, 12)),
            )
            session.add(pack)
            session.flush()  # get pack.id

            for pos, headline in enumerate(stories_data, 1):
                duration = round(uniform(75, 160), 1)
                total_duration += duration
                audio_filename = f"pack{pack.id}_story{pos}.mp3"

                summary = (
                    f"La noticia sobre '{headline.split(' ', 5)[-1]}' ha generado un gran "
                    f"debate en los medios de comunicación y redes sociales. Expertos del sector "
                    f"señalan que esto podría tener implicaciones significativas en los próximos meses. "
                    f"Diversas fuentes coinciden en que se trata de un punto de inflexión importante."
                )

                script = SCRIPTS_TEMPLATE[pos % len(SCRIPTS_TEMPLATE)].format(
                    headline=headline,
                    summary_short=summary[:120],
                )

                source_urls = json.dumps([SOURCES[i % len(SOURCES)] for i in range(randint(1, 3))])

                story = Story(
                    pack_id=pack.id,
                    position=pos,
                    headline=headline,
                    summary=summary,
                    source_urls=source_urls,
                    script=script,
                    audio_filename=audio_filename,
                    duration=duration,
                    created_at=pack.created_at,
                )
                session.add(story)

                # Create audio file
                audio_path = AUDIO_DIR / audio_filename
                create_silent_audio(audio_path, int(duration))

            pack.total_duration = round(total_duration, 1)
            pack_count += 1

    session.commit()
    session.close()

    # Count audio files
    audio_count = len(list(AUDIO_DIR.glob("*.mp3")))
    print(f"Seed complete: {pack_count} packs, {pack_count * 5} stories, {audio_count} audio files")
    print(f"Topics: {', '.join(TOPICS.keys())}")


if __name__ == "__main__":
    seed()
