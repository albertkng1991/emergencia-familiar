"""
ElevenLabs TTS V3: single-speaker narration synthesis.

Takes a plain text script and produces an MP3 file using ElevenLabs
Text-to-Speech API v1.
"""

import logging
from pathlib import Path

import requests

from backend.config.settings import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID

logger = logging.getLogger(__name__)

API_BASE = "https://api.elevenlabs.io/v1"


def synthesize_narration(text: str, output_path: Path) -> float:
    """
    Synthesize a plain-text narration into an MP3 file via ElevenLabs.

    Args:
        text: narration script (single speaker, plain text)
        output_path: path for the output MP3 file

    Returns:
        duration in seconds (estimated from file size + bitrate)
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    url = f"{API_BASE}/text-to-speech/{ELEVENLABS_VOICE_ID}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "text": text,
        "model_id": "eleven_v3",
        "voice_settings": {
            "stability": 0.50,
            "similarity_boost": 0.75,
        },
    }

    response = requests.post(url, json=payload, headers=headers, stream=True, timeout=120)
    response.raise_for_status()

    # Write MP3 chunks
    total_bytes = 0
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=4096):
            if chunk:
                f.write(chunk)
                total_bytes += len(chunk)

    # Estimate duration: ElevenLabs default is 128kbps MP3
    bitrate_bps = 128_000
    duration = (total_bytes * 8) / bitrate_bps

    logger.info(f"Audio synthesized: {output_path.name} ({duration:.1f}s, {total_bytes / 1024:.0f} KB)")
    return duration
