from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_project_environment(project_root: Path = PROJECT_ROOT) -> None:
    load_dotenv(Path(project_root) / ".env", override=False)


load_project_environment()


@dataclass(frozen=True)
class AppConfig:
    database_path: Path
    database_url: str
    max_upload_bytes: int
    frontend_origin: str
    groq_api_key: str
    groq_base_url: str
    groq_model: str
    ai_api_key: str
    ai_base_url: str
    ai_model: str


def _database_url(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError as exc:
        raise ValueError("DATABASE_URL must be a valid PostgreSQL connection URL.") from None
    if (
        parsed.scheme not in {"postgres", "postgresql"}
        or not hostname
        or parsed.path in {"", "/"}
        or parsed.fragment
        or port == 0
        or any(character.isspace() for character in value)
    ):
        raise ValueError("DATABASE_URL must be a valid PostgreSQL connection URL.")
    query = parse_qs(parsed.query, keep_blank_values=True)
    sslmodes = [mode.lower() for mode in query.get("sslmode", [])]
    if len(sslmodes) > 1 or any(mode not in {"", "require", "verify-ca", "verify-full"} for mode in sslmodes):
        raise ValueError("DATABASE_URL must require TLS for PostgreSQL connections.")
    if not sslmodes or not sslmodes[0]:
        query["sslmode"] = ["require"]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query, doseq=True), parsed.fragment))


def _https_base_url(value: str, setting: str) -> str:
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
    except ValueError:
        raise ValueError(f"{setting} must be an HTTPS URL without embedded credentials.") from None
    if parsed.scheme != "https" or not hostname or parsed.username or parsed.password:
        raise ValueError(f"{setting} must be an HTTPS URL without embedded credentials.")
    return value.rstrip("/")


def load_config() -> AppConfig:
    raw_max_upload = os.getenv("MAX_UPLOAD_BYTES", "10485760")
    try:
        max_upload_bytes = int(raw_max_upload)
    except ValueError as exc:
        raise ValueError("MAX_UPLOAD_BYTES must be a positive integer.") from exc
    if max_upload_bytes <= 0:
        raise ValueError("MAX_UPLOAD_BYTES must be a positive integer.")

    origin = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5173").rstrip("/")
    parsed_origin = urlsplit(origin)
    if (parsed_origin.scheme not in {"http", "https"} or not parsed_origin.netloc or parsed_origin.path
            or parsed_origin.query or parsed_origin.fragment or parsed_origin.username or parsed_origin.password):
        raise ValueError("FRONTEND_ORIGIN must be an HTTP(S) origin without a path.")

    raw_database_path = Path(os.getenv("DATABASE_PATH", "./backend/spendsense.db")).expanduser()
    database_path = raw_database_path if raw_database_path.is_absolute() else PROJECT_ROOT / raw_database_path
    database_url = _database_url(os.getenv("DATABASE_URL", ""))
    groq_base_url = _https_base_url(
        os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip(),
        "GROQ_BASE_URL",
    )
    ai_base_url = _https_base_url(
        os.getenv("AI_BASE_URL", "https://api.openai.com/v1").strip(),
        "AI_BASE_URL",
    )

    return AppConfig(
        database_path=database_path,
        database_url=database_url,
        max_upload_bytes=max_upload_bytes,
        frontend_origin=origin,
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        groq_base_url=groq_base_url,
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile",
        ai_api_key=os.getenv("AI_API_KEY", "").strip(),
        ai_base_url=ai_base_url,
        ai_model=os.getenv("AI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini",
    )
