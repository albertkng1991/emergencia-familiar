"""
Gemini 2.5 Flash TTS: multi-speaker dialogue synthesis.

Takes a script with "Host A:" / "Host B:" lines and produces an MP3 file
with two distinct voices using Google's Gemini TTS API.
"""

import logging
import subprocess
import wave
from pathlib import Path

from google import genai
from google.genai import types

from backend.config.settings import GOOGLE_AI_API_KEY, TTS_VOICE_A, TTS_VOICE_B

logger = logging.getLogger(__name__)


def synthesize_dialogue(script: str, output_path: Path) -> float:
    """
    Synthesize a Host A / Host B dialogue script into an MP3 file.

    Args:
        script: dialogue text with "Host A:" and "Host B:" prefixes
        output_path: path for the output MP3 file

    Returns:
        duration in seconds
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    client = genai.Client(api_key=GOOGLE_AI_API_KEY)

    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=script,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                    speaker_voice_configs=[
                        types.SpeakerVoiceConfig(
                            speaker="Host A",
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=TTS_VOICE_A,
                                ),
                            ),
                        ),
                        types.SpeakerVoiceConfig(
                            speaker="Host B",
                            voice_config=types.VoiceConfig(
                                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                    voice_name=TTS_VOICE_B,
                                ),
                            ),
                        ),
                    ],
                ),
            ),
        ),
    )

    # Extract audio data from response
    audio_data = response.candidates[0].content.parts[0].inline_data.data
    mime_type = response.candidates[0].content.parts[0].inline_data.mime_type

    # Determine audio parameters from mime type
    # Gemini returns audio/L16;rate=24000 (raw PCM 16-bit signed LE, 24kHz mono)
    sample_rate = 24000
    if "rate=" in (mime_type or ""):
        rate_str = mime_type.split("rate=")[1].split(";")[0]
        sample_rate = int(rate_str)

    # Write WAV file
    wav_path = output_path.with_suffix(".wav")
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data)

    # Convert WAV to MP3 via ffmpeg
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-q:a", "2", str(output_path)],
        capture_output=True,
        check=True,
    )

    # Clean up WAV
    wav_path.unlink(missing_ok=True)

    # Calculate duration
    num_samples = len(audio_data) // 2  # 16-bit = 2 bytes per sample
    duration = num_samples / sample_rate

    logger.info(f"Audio synthesized: {output_path.name} ({duration:.1f}s)")
    return duration
