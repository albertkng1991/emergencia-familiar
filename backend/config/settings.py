import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# --- Paths ---
DATA_DIR = PROJECT_ROOT / "data"
AUDIO_DIR = Path(os.getenv("AUDIO_DIR", str(DATA_DIR / "audio")))
DB_PATH = Path(os.getenv("DB_PATH", str(DATA_DIR / "digest.db")))
HISTORY_FILE = DATA_DIR / "history.json"
PROMPTS_DIR = DATA_DIR / "prompts"
RESEARCH_CONFIG_FILE = DATA_DIR / "research_config.json"

# Ensure directories exist
for d in [DATA_DIR, AUDIO_DIR, PROMPTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# --- API Keys ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY", "")

# Reddit
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT", "daily-audio-digest/1.0")

# --- Research (symbols required by researcher.py) ---
OPENAI_MODEL = "gpt-4o-mini"
RESEARCH_BACKEND = os.getenv("RESEARCH_BACKEND", "auto").strip().lower()
NEWSAPI_DOMAINS = ""
NEWSAPI_LANGUAGE = "en"
REDDIT_SUBREDDITS = ["artificial", "technology", "MachineLearning", "ChatGPT"]
RSS_FEEDS = [
    "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    "https://www.eldiario.es/rss/",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://techcrunch.com/feed/",
    "https://www.theverge.com/rss/index.xml",
    "https://feeds.arstechnica.com/arstechnica/index",
    "https://www.technologyreview.com/feed/",
]
TRENDS_KEYWORDS = [
    "AI",
    "GPT",
    "robot",
    "tech",
    "app",
    "Google",
    "Apple",
    "Meta",
    "Microsoft",
    "Samsung",
    "Tesla",
    "chip",
    "quantum",
    "cyber",
    "cloud",
    "data",
    "neural",
    "OpenAI",
    "startup",
    "software",
]

# --- TTS ---
TTS_VOICE_A = os.getenv("TTS_VOICE_A", "Charon")
TTS_VOICE_B = os.getenv("TTS_VOICE_B", "Kore")

# ElevenLabs (single-speaker narration)
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")  # Daniel - Steady Broadcaster

# --- Scriptwriter ---
SCRIPTWRITER_MODEL = os.getenv("SCRIPTWRITER_MODEL", "gpt-4o")

# --- Database ---
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
