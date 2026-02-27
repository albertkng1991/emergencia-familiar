"""Read and write .env file, mask secret values."""

import json
import os
from pathlib import Path

from backend.config.settings import PROJECT_ROOT

ENV_PATH = PROJECT_ROOT / ".env"
CONFIG_PATH = Path(__file__).parent.parent / "data" / "api_keys_config.json"


def _load_config() -> dict:
    with open(CONFIG_PATH) as f:
        return json.load(f)


def _parse_env() -> dict[str, str]:
    """Parse .env into a dict (preserves comments as-is on write)."""
    values: dict[str, str] = {}
    if not ENV_PATH.exists():
        return values
    for line in ENV_PATH.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, _, val = stripped.partition("=")
        values[key.strip()] = val.strip()
    return values


def mask_value(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 4:
        return "***"
    return "***" + value[-4:]


def get_all_keys() -> dict:
    """Return groups with current (masked) values and status."""
    config = _load_config()
    env = _parse_env()

    for group in config["groups"]:
        for key_cfg in group["keys"]:
            var = key_cfg["env_var"]
            raw = env.get(var, "") or os.getenv(var, "")
            key_cfg["has_value"] = bool(raw)
            key_cfg["value"] = mask_value(raw) if key_cfg.get("secret") else raw

    return config


def save_keys(updates: dict[str, str]) -> None:
    """Write updated keys to .env, preserving existing lines and comments."""
    lines: list[str] = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text().splitlines()

    written: set[str] = set()
    new_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.partition("=")[0].strip()
            if key in updates:
                val = updates[key]
                # Skip masked values (user didn't change them)
                if val.startswith("***"):
                    new_lines.append(line)
                else:
                    new_lines.append(f"{key}={val}")
                written.add(key)
                continue
        new_lines.append(line)

    # Append new keys not yet in file
    for key, val in updates.items():
        if key not in written and not val.startswith("***"):
            new_lines.append(f"{key}={val}")

    ENV_PATH.write_text("\n".join(new_lines) + "\n")
