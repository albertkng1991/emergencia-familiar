"""
Pack generator: orchestrates the full pipeline.

research → scriptwriter → TTS → save to DB
"""

import json
import logging
from datetime import datetime, timezone

from backend.config.settings import AUDIO_DIR
from backend.research.researcher import find_trending_topics
from backend.scriptwriter.writer import generate_script
from backend.storage.database import get_session, init_db
from backend.storage.models import Pack, Story
from backend.tts.gemini_tts import synthesize_dialogue

logger = logging.getLogger(__name__)


def generate_pack(topic: str = "IA", story_count: int = 5) -> dict:
    """
    Generate a complete audio pack.

    1. Create Pack in DB (status=generating)
    2. Research top N trending topics
    3. For each topic: generate script → synthesize audio → save Story
    4. Update Pack status to ready

    Returns:
        Pack dict with stories
    """
    init_db()
    session = get_session()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    pack = Pack(topic=topic, date=today, status="generating")
    session.add(pack)
    session.commit()

    logger.info(f"Pack #{pack.id} created for topic='{topic}', finding {story_count} stories...")

    try:
        # 1. Research
        topics = find_trending_topics(focus_topic=topic, count=story_count)
        logger.info(f"Found {len(topics)} topics")

        total_duration = 0.0

        # 2. Process each topic
        for i, t in enumerate(topics, start=1):
            logger.info(f"[{i}/{len(topics)}] Processing: {t.get('topic', '?')[:60]}")

            # Generate script
            script_data = generate_script(t)

            # Synthesize audio
            audio_filename = f"pack{pack.id}_story{i}.mp3"
            audio_path = AUDIO_DIR / audio_filename
            duration = synthesize_dialogue(script_data["script"], audio_path)
            total_duration += duration

            # Save story
            story = Story(
                pack_id=pack.id,
                position=i,
                headline=script_data["headline"],
                summary=script_data["summary"],
                source_urls=json.dumps(script_data.get("source_urls", []), ensure_ascii=False),
                script=script_data["script"],
                audio_filename=audio_filename,
                duration=duration,
            )
            session.add(story)
            session.commit()
            logger.info(f"  Story #{story.id} saved ({duration:.1f}s)")

        # 3. Mark pack as ready
        pack.status = "ready"
        pack.total_duration = total_duration
        session.commit()

        logger.info(f"Pack #{pack.id} ready! {len(topics)} stories, {total_duration:.1f}s total")
        session.refresh(pack)
        return pack.to_dict(include_stories=True)

    except Exception as e:
        pack.status = "error"
        session.commit()
        logger.error(f"Pack #{pack.id} failed: {e}")
        raise
    finally:
        session.close()
