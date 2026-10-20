from __future__ import annotations

import os
import subprocess
import sys

import pytest

from backend import config


def clear_config_env(monkeypatch):
    for name in (
        "DATABASE_PATH", "DATABASE_URL", "MAX_UPLOAD_BYTES", "FRONTEND_ORIGIN",
        "GROQ_API_KEY", "GROQ_BASE_URL", "GROQ_MODEL",
        "AI_API_KEY", "AI_BASE_URL", "AI_MODEL",
    ):
        monkeypatch.delenv(name, raising=False)


def test_environment_loading_uses_project_root_not_current_working_directory(tmp_path, monkeypatch):
    project = tmp_path / "project"
    elsewhere = tmp_path / "elsewhere"
    project.mkdir()
    elsewhere.mkdir()
    (project / ".env").write_text("GROQ_MODEL=project-model\n", encoding="utf-8")
    monkeypatch.chdir(elsewhere)
    monkeypatch.delenv("GROQ_MODEL", raising=False)

    config.load_project_environment(project)

    assert config.load_config().groq_model == "project-model"


def test_application_import_uses_project_config_from_a_different_working_directory(tmp_path):
    project_root = config.PROJECT_ROOT
    environment = os.environ.copy()
    environment["DATABASE_URL"] = (
        "postgresql://synthetic-user:synthetic-password@aws-0-region.pooler.example.test:5432/"
        "synthetic_db?sslmode=require"
    )
    environment["PYTHONPATH"] = str(project_root)
    source = (
        "from backend.main import DATABASE_URL; "
        "from urllib.parse import urlsplit; "
        "parsed = urlsplit(DATABASE_URL); "
        "assert parsed.scheme == 'postgresql'; "
        "assert parsed.hostname == 'aws-0-region.pooler.example.test'; "
        "assert parsed.port == 5432; "
        "assert parsed.path == '/synthetic_db'; "
        "print('application configuration loaded')"
    )

    completed = subprocess.run(
        [sys.executable, "-c", source],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, "Application configuration subprocess failed."
    assert completed.stdout.strip() == "application configuration loaded"


def test_optional_credentials_and_defaults_allow_local_mode(monkeypatch):
    clear_config_env(monkeypatch)

    loaded = config.load_config()

    assert loaded.database_url == ""
    assert loaded.max_upload_bytes == 10 * 1024 * 1024
    assert loaded.groq_api_key == ""
    assert loaded.groq_base_url == "https://api.groq.com/openai/v1"
    assert loaded.groq_model == "llama-3.3-70b-versatile"
    assert loaded.ai_api_key == ""
    assert loaded.database_path == config.PROJECT_ROOT / "backend" / "spendsense.db"


@pytest.mark.parametrize("database_url", ["", "   \t\r\n"])
def test_empty_or_whitespace_database_url_selects_sqlite(monkeypatch, database_url):
    clear_config_env(monkeypatch)
    monkeypatch.setenv("DATABASE_PATH", "./backend/local-test.db")
    monkeypatch.setenv("DATABASE_URL", database_url)

    loaded = config.load_config()

    assert loaded.database_url == ""
    assert loaded.database_path == config.PROJECT_ROOT / "backend" / "local-test.db"


def test_database_url_selects_postgres_and_requires_tls(monkeypatch):
    clear_config_env(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", "postgresql://db.example.test:5432/spendsense")

    loaded = config.load_config()

    assert loaded.database_url.startswith("postgresql://db.example.test:5432/spendsense?")
    assert "sslmode=require" in loaded.database_url

    monkeypatch.setenv("DATABASE_URL", "postgresql://db.example.test/spendsense?sslmode=disable")
    with pytest.raises(ValueError, match="require TLS"):
        config.load_config()

    monkeypatch.setenv("DATABASE_URL", "postgresql://db.example.test:invalid/spendsense")
    with pytest.raises(ValueError, match="valid PostgreSQL connection URL"):
        config.load_config()


@pytest.mark.parametrize("scheme", ["postgresql", "postgres"])
def test_supabase_pooler_style_url_is_preserved_for_psycopg(monkeypatch, scheme):
    clear_config_env(monkeypatch)
    monkeypatch.setenv(
        "DATABASE_URL",
        f"{scheme}://synthetic-user:synthetic-password@aws-0-region.pooler.example.test:5432/postgres",
    )

    loaded = config.load_config()
    parsed = config.urlsplit(loaded.database_url)

    assert parsed.scheme == scheme
    assert parsed.hostname == "aws-0-region.pooler.example.test"
    assert parsed.port == 5432
    assert parsed.path == "/postgres"
    assert "sslmode=require" in parsed.query


@pytest.mark.parametrize(
    "database_url",
    [
        "not-a-url",
        "https://db.example.test/spendsense",
        "postgresql://db.example.test",
        "postgresql://db.example.test:invalid/spendsense",
    ],
)
def test_invalid_database_url_is_rejected_safely(monkeypatch, database_url):
    clear_config_env(monkeypatch)
    monkeypatch.setenv("DATABASE_URL", database_url)

    with pytest.raises(ValueError, match="DATABASE_URL must be a valid PostgreSQL connection URL") as error:
        config.load_config()

    assert database_url not in str(error.value)


def test_invalid_configuration_is_rejected_without_echoing_values(monkeypatch):
    clear_config_env(monkeypatch)
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "private-invalid-value")
    with pytest.raises(ValueError, match="MAX_UPLOAD_BYTES must be a positive integer") as error:
        config.load_config()
    assert "private-invalid-value" not in str(error.value)

    monkeypatch.setenv("MAX_UPLOAD_BYTES", "10485760")
    monkeypatch.setenv("GROQ_BASE_URL", "http://unsafe.example.test/v1")
    with pytest.raises(ValueError, match="GROQ_BASE_URL must be an HTTPS URL"):
        config.load_config()
