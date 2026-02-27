"""Lightweight API key validation — minimal HTTP calls per service."""

import logging
import os

import requests

logger = logging.getLogger(__name__)

TIMEOUT = 8


def _test_openai(key: str) -> dict:
    try:
        r = requests.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {key}"},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            return {"ok": True}
        return {"ok": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _test_google_ai(key: str) -> dict:
    try:
        r = requests.get(
            f"https://generativelanguage.googleapis.com/v1beta/models?key={key}",
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            return {"ok": True}
        return {"ok": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _test_newsapi(key: str) -> dict:
    try:
        r = requests.get(
            "https://newsapi.org/v2/top-headlines",
            params={"apiKey": key, "country": "us", "pageSize": 1},
            timeout=TIMEOUT,
        )
        data = r.json()
        if data.get("status") == "ok":
            return {"ok": True}
        return {"ok": False, "error": data.get("message", f"HTTP {r.status_code}")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _test_tavily(key: str) -> dict:
    try:
        r = requests.post(
            "https://api.tavily.com/search",
            json={"api_key": key, "query": "test", "max_results": 1},
            timeout=TIMEOUT,
        )
        if r.status_code == 200:
            return {"ok": True}
        return {"ok": False, "error": f"HTTP {r.status_code}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def _test_reddit(client_id: str, client_secret: str) -> dict:
    try:
        r = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            headers={"User-Agent": "daily-audio-digest/1.0"},
            timeout=TIMEOUT,
        )
        data = r.json()
        if "access_token" in data:
            return {"ok": True}
        return {"ok": False, "error": data.get("error", f"HTTP {r.status_code}")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


TESTERS = {
    "OPENAI_API_KEY": lambda: _test_openai(os.getenv("OPENAI_API_KEY", "")),
    "GOOGLE_AI_API_KEY": lambda: _test_google_ai(os.getenv("GOOGLE_AI_API_KEY", "")),
    "NEWSAPI_KEY": lambda: _test_newsapi(os.getenv("NEWSAPI_KEY", "")),
    "TAVILY_API_KEY": lambda: _test_tavily(os.getenv("TAVILY_API_KEY", "")),
    "REDDIT_CLIENT_ID": lambda: _test_reddit(
        os.getenv("REDDIT_CLIENT_ID", ""),
        os.getenv("REDDIT_CLIENT_SECRET", ""),
    ),
    "REDDIT_CLIENT_SECRET": lambda: _test_reddit(
        os.getenv("REDDIT_CLIENT_ID", ""),
        os.getenv("REDDIT_CLIENT_SECRET", ""),
    ),
}


def test_key(env_var: str) -> dict:
    """Test a single key. Returns {"ok": bool, "error"?: str}."""
    tester = TESTERS.get(env_var)
    if tester is None:
        # Non-testable keys (config values, DATABASE_URL)
        val = os.getenv(env_var, "")
        return {"ok": bool(val), "skipped": True}
    val = os.getenv(env_var, "")
    if not val:
        return {"ok": False, "error": "Not configured"}
    return tester()


def test_all() -> dict[str, dict]:
    """Test all configured keys. Returns {env_var: result}."""
    from backend.dashboard.services.env_manager import _load_config

    config = _load_config()
    results = {}
    for group in config["groups"]:
        for key_cfg in group["keys"]:
            var = key_cfg["env_var"]
            if var not in results:
                results[var] = test_key(var)
    return results
