"""Environment-driven configuration (see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _num(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _list(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_env: str
    database_url: str
    upload_dir: Path
    max_upload_bytes: int
    cors_origins: list[str]
    cors_allow_localhost: bool
    enable_seed_endpoint: bool
    seed_on_startup: bool
    demo_analysis: bool
    strict_exercise_ids: bool
    ai_enabled: bool
    ai_provider: str
    ai_api_key: str
    ai_model: str
    ai_base_url: str
    ai_timeout: float

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_enabled and self.ai_api_key and self.ai_model)


@lru_cache
def get_settings() -> Settings:
    upload_dir = Path(os.getenv("UPLOAD_DIR") or BASE_DIR / "uploads")
    if not upload_dir.is_absolute():
        upload_dir = (BASE_DIR / upload_dir).resolve()
    provider = os.getenv("AI_PROVIDER", "anthropic").strip().lower()
    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        database_url=os.getenv("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'neurotrace.db'}",
        upload_dir=upload_dir,
        max_upload_bytes=int(_num("MAX_UPLOAD_MB", 10.0) * 1024 * 1024),
        cors_origins=_list("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"),
        cors_allow_localhost=_bool("CORS_ALLOW_LOCALHOST_ANY_PORT", True),
        enable_seed_endpoint=_bool("ENABLE_SEED_ENDPOINT", True),
        seed_on_startup=_bool("SEED_ON_STARTUP", False),
        demo_analysis=_bool("DEMO_ANALYSIS", False),
        strict_exercise_ids=_bool("STRICT_EXERCISE_IDS", True),
        ai_enabled=_bool("AI_ENABLED", False),
        ai_provider=provider,
        ai_api_key=os.getenv("AI_API_KEY", "").strip(),
        ai_model=os.getenv("AI_MODEL", "claude-sonnet-5-5" if provider == "anthropic" else "").strip(),
        ai_base_url=os.getenv("AI_BASE_URL", "").strip(),
        ai_timeout=_num("AI_TIMEOUT_SECONDS", 20.0),
    )
