from __future__ import annotations

import io
import json
from dataclasses import replace
from urllib.error import HTTPError, URLError

import pytest

from backend import main

FACTS = {
    "income": "1000.00",
    "expenses": "100.00",
    "net_flow": "900.00",
    "transaction_count": 2,
    "category_totals": [{"name": "Food", "amount": "100.00", "percentage": 100}],
    "merchant_totals": [{"name": "Cafe", "amount": "100.00", "count": 1}],
}


class MockResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


def set_groq_config(monkeypatch, **overrides):
    values = {
        "groq_api_key": "unit-test-groq-key",
        "groq_base_url": "https://api.groq.com/openai/v1",
        "groq_model": "llama-test-model",
        "ai_api_key": "legacy-test-key",
        "ai_base_url": "https://legacy.example.test/v1",
        "ai_model": "legacy-model",
    }
    values.update(overrides)
    monkeypatch.setattr(main, "CONFIG", replace(main.CONFIG, **values))


def test_groq_uses_mocked_openai_compatible_request_and_minimized_context(monkeypatch):
    set_groq_config(monkeypatch)
    captured = {}

    def mocked_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return MockResponse(json.dumps({
            "choices": [{"message": {"content": "Your recorded expenses total 100.00."}}],
        }).encode())

    monkeypatch.setattr(main, "urlopen", mocked_urlopen)
    answer, notice = main.hosted_agent_answer("How much did I spend?", FACTS, "INR")

    request = captured["request"]
    body = json.loads(request.data)
    assert answer == "Your recorded expenses total 100.00."
    assert notice is None
    assert captured["timeout"] == 12
    assert request.full_url == "https://api.groq.com/openai/v1/chat/completions"
    assert request.get_header("Authorization") == "Bearer unit-test-groq-key"
    assert body["model"] == "llama-test-model"
    assert "Cafe" not in json.dumps(body["messages"][1]["content"])


def test_merchant_context_is_only_included_for_merchant_questions(monkeypatch):
    set_groq_config(monkeypatch)
    captured = {}

    def mocked_urlopen(request, timeout):
        captured.update(json.loads(request.data))
        return MockResponse(json.dumps({"choices": [{"message": {"content": "Cafe."}}]}).encode())

    monkeypatch.setattr(main, "urlopen", mocked_urlopen)
    main.hosted_agent_answer("Which merchant had the most spending?", FACTS, "INR")

    message = captured["messages"][1]["content"]
    assert "Cafe" in message


def test_missing_provider_credentials_keep_deterministic_fallback(monkeypatch):
    set_groq_config(monkeypatch, groq_api_key="", ai_api_key="")
    assert main.hosted_agent_answer("question", FACTS, "INR") == (None, None)


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        (401, "Hosted AI authentication failed; a deterministic answer is shown."),
        (402, "Hosted AI quota is exhausted; a deterministic answer is shown."),
        (429, "Hosted AI is rate limited; a deterministic answer is shown."),
        (404, "The configured hosted AI model is unavailable; a deterministic answer is shown."),
        (504, "Hosted AI provider timed out; a deterministic answer is shown."),
        (503, "Hosted AI provider is temporarily unavailable; a deterministic answer is shown."),
    ],
)
def test_provider_http_failures_are_classified_without_exposing_details(monkeypatch, status, expected):
    set_groq_config(monkeypatch)

    def fail_http(*_args, **_kwargs):
        raise HTTPError("https://api.groq.com", status, "sensitive-provider-body", {}, None)

    monkeypatch.setattr(main, "urlopen", fail_http)
    answer, notice = main.hosted_agent_answer("question", FACTS, "INR")

    assert answer is None
    assert notice == expected
    assert "sensitive-provider-body" not in notice
    assert "unit-test-groq-key" not in notice


@pytest.mark.parametrize(
    ("failure", "expected"),
    [
        (TimeoutError(), "Hosted AI could not be reached; a deterministic answer is shown."),
        (URLError("sensitive network detail"), "Hosted AI could not be reached; a deterministic answer is shown."),
    ],
)
def test_network_failures_use_safe_fallback_notice(monkeypatch, failure, expected):
    set_groq_config(monkeypatch)
    monkeypatch.setattr(main, "urlopen", lambda *_args, **_kwargs: (_ for _ in ()).throw(failure))

    answer, notice = main.hosted_agent_answer("question", FACTS, "INR")

    assert answer is None
    assert notice == expected
    assert "sensitive network detail" not in notice


@pytest.mark.parametrize(
    "body",
    [b"not-json", b"{}", b'{"choices":[{"message":{"content":null}}]}'],
)
def test_invalid_provider_responses_fall_back_safely(monkeypatch, body):
    set_groq_config(monkeypatch)
    monkeypatch.setattr(main, "urlopen", lambda *_args, **_kwargs: MockResponse(body))

    answer, notice = main.hosted_agent_answer("question", FACTS, "INR")

    assert answer is None
    assert notice == "The hosted AI returned an invalid response; a deterministic answer is shown."


def test_provider_output_is_bounded(monkeypatch):
    set_groq_config(monkeypatch)
    monkeypatch.setattr(
        main,
        "urlopen",
        lambda *_args, **_kwargs: MockResponse(json.dumps({
            "choices": [{"message": {"content": "x" * 4000}}],
        }).encode()),
    )

    answer, notice = main.hosted_agent_answer("question", FACTS, "INR")

    assert answer == "x" * 3000
    assert notice is None
