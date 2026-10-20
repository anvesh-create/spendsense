import io
import json
import sqlite3
from contextlib import contextmanager
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from backend import main


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(main, "DATABASE_URL", "")
    main.init_db()
    return TestClient(main.app)


SAMPLE = b"Date,Description,Debit,Credit\n2026-10-01,Coffee Shop,250.50,\n2026-10-02,Monthly Salary,,50000.00\n2026-10-03,Metro Recharge,100,\n"


def upload(client, content=SAMPLE, filename="statement.csv"):
    return client.post("/api/imports", files={"file": (filename, content, "text/csv")})


def use_postgres_connection_adapter(monkeypatch, database_path):
    raw_connection = sqlite3.connect(database_path, check_same_thread=False)
    raw_connection.row_factory = lambda cursor, values: main.HybridRow(
        zip((column[0] for column in cursor.description), values)
    )
    raw_connection.execute("PRAGMA foreign_keys = ON")

    class FakeCursor:
        def __init__(self, connection):
            self.connection = connection

        def executemany(self, statement, parameters):
            return self.connection.raw_connection.cursor().executemany(
                statement.replace("%s", "?"), parameters
            )

    class FakePostgresConnection:
        def __init__(self, connection):
            self.raw_connection = connection

        def execute(self, statement, parameters=()):
            return self.raw_connection.execute(statement.replace("%s", "?"), parameters)

        def cursor(self):
            return FakeCursor(self)

    class FakePool:
        @contextmanager
        def connection(self):
            try:
                yield FakePostgresConnection(raw_connection)
                raw_connection.commit()
            except Exception:
                raw_connection.rollback()
                raise

    monkeypatch.setattr(main, "DATABASE_URL", "postgresql://unit-test.invalid/db?sslmode=require")
    monkeypatch.setattr(main, "_postgres_pool", lambda: FakePool())
    return raw_connection


def test_import_overview_and_transaction_totals(client):
    result = upload(client)
    assert result.status_code == 200, result.text
    imported = result.json()
    assert imported["transaction_count"] == 3
    summary = imported["summary"]
    assert summary["income"] == "50000.00"
    assert summary["expenses"] == "350.50"
    assert summary["net_flow"] == "49649.50"
    assert summary["transaction_count"] == 3
    rows = client.get("/api/transactions", params={"import_id": imported["id"]}).json()
    assert rows["total"] == 3
    assert {row["description"] for row in rows["items"]} == {
        "Coffee Shop", "Monthly Salary", "Metro Recharge",
    }
    assert {row["currency"] for row in rows["items"]} == {"INR"}
    assert rows["items"][0]["description"] == "Metro Recharge"


def test_csv_upload_persists_all_transactions_through_postgres_adapter(client, monkeypatch):
    raw_connection = use_postgres_connection_adapter(monkeypatch, main.DB_PATH)
    try:
        response = client.post(
            "/api/imports",
            data={"currency": "USD"},
            files={"file": ("statement.csv", SAMPLE, "text/csv")},
        )

        assert response.status_code == 200, response.text
        imported = response.json()
        rows = client.get("/api/transactions", params={"import_id": imported["id"]}).json()
        persisted = {row["description"]: (row["amount"], row["currency"]) for row in rows["items"]}

        assert rows["total"] == 3
        assert persisted == {
            "Coffee Shop": ("-250.50", "USD"),
            "Monthly Salary": ("50000.00", "USD"),
            "Metro Recharge": ("-100.00", "USD"),
        }
    finally:
        raw_connection.close()


def test_failed_transaction_insert_rolls_back_import_and_transactions(client, monkeypatch):
    raw_connection = use_postgres_connection_adapter(monkeypatch, main.DB_PATH)
    try:
        raw_connection.execute(
            """CREATE TRIGGER reject_transaction_insert
            BEFORE INSERT ON transactions
            BEGIN
                SELECT RAISE(ABORT, 'injected test failure');
            END"""
        )
        raw_connection.commit()

        response = upload(client)

        assert response.status_code == 500
        assert raw_connection.execute("SELECT COUNT(*) FROM imports").fetchone()[0] == 0
        assert raw_connection.execute("SELECT COUNT(*) FROM transactions").fetchone()[0] == 0
    finally:
        raw_connection.close()


def test_frontend_root_serves_built_index(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert '<div id="root"></div>' in response.text


def test_frontend_asset_is_served(client):
    response = client.get("/assets/compass-logo.png")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/png")
    assert response.content.startswith(b"\x89PNG\r\n\x1a\n")


def test_frontend_route_falls_back_to_index_but_unknown_api_stays_404(client):
    page = client.get("/overview")
    missing_api = client.get("/api/not-a-route")

    assert page.status_code == 200
    assert page.headers["content-type"].startswith("text/html")
    assert '<div id="root"></div>' in page.text
    assert missing_api.status_code == 404


def test_health_endpoint_remains_json(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "mode": "local-single-user"}


def test_analytics_categories_and_monthly_totals_exclude_transfers(client):
    content = (
        b"Date,Description,Debit,Credit\n"
        b"2026-10-01,Food Restaurant,25.00,\n"
        b"2026-10-02,Monthly Salary,,1000.00\n"
        b"2026-10-03,Transfer to own account,100.00,\n"
    )
    imported = upload(client, content).json()
    summary = imported["summary"]
    assert summary["expenses"] == "25.00"
    assert summary["income"] == "1000.00"
    assert summary["category_totals"] == [{"name": "Food & Dining", "amount": "25.00", "percentage": 100.0}]
    assert summary["monthly"] == [{"month": "2026-10", "income": "1000.00", "expenses": "25.00"}]


def test_rejects_arbitrary_or_unsupported_upload(client):
    assert upload(client, b"hello", "statement.csv").status_code == 422
    assert upload(client, b"hello", "statement.exe").status_code == 422


def test_exact_file_duplicate_is_rejected(client):
    assert upload(client).status_code == 200
    assert upload(client).status_code == 409
    assert len(client.get("/api/imports").json()) == 1


def test_history_delete_cascades_transactions(client):
    imported = upload(client).json()
    response = client.delete(f"/api/imports/{imported['id']}")
    assert response.status_code == 200
    assert client.get("/api/imports").json() == []
    assert client.get("/api/overview/" + imported["id"]).status_code == 404


def test_merchant_detail_returns_matching_transactions(client):
    imported = upload(client).json()
    response = client.get("/api/merchant-detail", params={"import_id": imported["id"], "merchant": "Coffee Shop"})
    assert response.status_code == 200
    assert response.json()["total_spending"] == "250.50"
    assert len(response.json()["transactions"]) == 1


def test_compare_zero_baseline_and_agent_grounding(client):
    imported = upload(client).json()
    comparison = client.get("/api/compare", params={"left": imported["id"], "right": imported["id"]})
    assert comparison.status_code == 200
    assert comparison.json()["changes"]["income"]["percentage"] == 0
    answer = client.post("/api/agent", json={"question": "what is my income?", "import_id": imported["id"]})
    assert answer.status_code == 200
    assert "50000.00" in answer.json()["answer"]


def test_settings_round_trip(client):
    response = client.put("/api/settings", json={"theme": "dark", "currency": "USD", "agent_enabled": False})
    assert response.status_code == 200
    assert response.json()["theme"] == "dark"
    assert response.json()["currency"] == "USD"
    assert response.json()["agent_enabled"] is False
    assert response.json()["hosted_ai_enabled"] is False
    assert client.post("/api/agent", json={"question": "income?", "import_id": "anything"}).status_code == 403


def test_settings_default_to_system_theme(client):
    assert client.get("/api/settings").json()["theme"] == "system"


def test_settings_preferences_persist_without_touching_imports(client):
    imported = upload(client).json()
    response = client.put("/api/settings", json={
        "theme": "system", "currency": "INR", "agent_enabled": True, "hosted_ai_enabled": False,
        "language": "te", "monthly_budget": "25000.00",
        "category_budgets": {"Food & Dining": "5000.00"},
        "alerts_enabled": True, "alert_threshold": 85, "alert_on_reached": True,
        "alert_on_exceeded": False, "reduced_motion": True, "date_format": "dmy",
    })
    assert response.status_code == 200, response.text
    assert response.json()["theme"] == "system"
    assert response.json()["language"] == "te"
    assert response.json()["monthly_budget"] == "25000.00"
    assert response.json()["category_budgets"] == {"Food & Dining": "5000.00"}
    assert response.json()["alerts_enabled"] is True
    assert response.json()["alert_threshold"] == 85
    assert response.json()["alert_on_exceeded"] is False
    assert response.json()["reduced_motion"] is True
    assert response.json()["date_format"] == "dmy"
    assert client.get("/api/imports").json()[0]["id"] == imported["id"]


def test_settings_reject_invalid_budgets_and_thresholds(client):
    base = {"theme":"light", "currency":"INR", "agent_enabled":True}
    assert client.put("/api/settings", json={**base, "monthly_budget":"-10"}).status_code == 422
    assert client.put("/api/settings", json={**base, "alerts_enabled":True}).status_code == 422
    assert client.put("/api/settings", json={**base, "monthly_budget":"100", "alerts_enabled":True, "alert_threshold":101}).status_code == 422


def test_preferences_reset_does_not_delete_saved_financial_data(client):
    imported = upload(client).json()
    response = client.put("/api/settings", json={
        "theme":"system", "currency":"INR", "agent_enabled":True, "hosted_ai_enabled":False,
        "language":"en", "monthly_budget":None, "category_budgets":{}, "alerts_enabled":False,
        "alert_threshold":80, "alert_on_reached":True, "alert_on_exceeded":True,
        "reduced_motion":False, "date_format":"locale",
    })
    assert response.status_code == 200
    assert client.get("/api/imports").json()[0]["id"] == imported["id"]
    assert client.get(f"/api/overview/{imported['id']}").status_code == 200


def test_currency_is_explicit_and_cross_currency_comparison_is_rejected(client):
    usd = client.post("/api/imports", data={"currency": "USD"}, files={"file": ("usd.csv", SAMPLE, "text/csv")})
    inr = upload(client, SAMPLE + b"\n")
    assert usd.status_code == 200
    assert usd.json()["currency"] == "USD"
    assert inr.json()["currency"] == "INR"
    assert client.get("/api/compare", params={"left": usd.json()["id"], "right": inr.json()["id"]}).status_code == 422


def test_ambiguous_slash_date_is_not_silently_guessed(client):
    content = b"Date,Description,Amount\n01/02/2026,Cafe,-10.00\n"
    response = upload(client, content)
    assert response.status_code == 422
    assert "Ambiguous date" in response.json()["detail"]


def test_duplicate_transaction_row_is_skipped_with_warning(client):
    content = b"Date,Description,Debit,Credit\n2026-10-01,Coffee Shop,10,\n2026-10-01,Coffee Shop,10,\n"
    response = upload(client, content)
    assert response.status_code == 200
    assert response.json()["transaction_count"] == 1
    assert any("Duplicate transaction" in warning for warning in response.json()["warnings"])


def test_csv_export_neutralizes_spreadsheet_formulas(client):
    content = b'Date,Description,Debit,Credit\n2026-10-01,"=HYPERLINK(""https://invalid"")",10,\n'
    imported = upload(client, content).json()
    response = client.post(f"/api/reports/{imported['id']}/csv")
    assert response.status_code == 200
    assert "'=HYPERLINK" in response.text


def test_hosted_agent_requires_user_opt_in(client, monkeypatch):
    monkeypatch.setattr(main, "CONFIG", replace(main.CONFIG, ai_api_key="test-only-placeholder", groq_api_key=""))
    imported = upload(client, SAMPLE + b"\n").json()
    assert client.get("/api/settings").json()["ai_configured"] is True
    response = client.post("/api/agent", json={"question": "what is my income?", "import_id": imported["id"]})
    assert response.status_code == 200
    assert response.json()["provider"] == "deterministic"
    assert response.json()["notice"] is None


def test_hosted_agent_uses_mock_provider_after_opt_in_without_exposing_credentials(client, monkeypatch):
    credential = "unit-test-secret-never-returned"
    monkeypatch.setattr(main, "CONFIG", replace(
        main.CONFIG,
        groq_api_key=credential,
        groq_base_url="https://api.groq.com/openai/v1",
        groq_model="llama-test-model",
    ))
    imported = upload(client).json()
    saved_settings = client.get("/api/settings").json()
    saved_settings.update(hosted_ai_enabled=True)
    assert client.put("/api/settings", json=saved_settings).status_code == 200

    captured = {}

    def mocked_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return io.BytesIO(json.dumps({
            "choices": [{"message": {"content": "Your recorded income is 50000.00."}}],
        }).encode())

    monkeypatch.setattr(main, "urlopen", mocked_urlopen)
    response = client.post("/api/agent", json={
        "question": "What was my income?",
        "import_id": imported["id"],
    })

    assert response.status_code == 200
    assert response.json()["provider"] == "groq"
    assert "50000.00" in response.json()["answer"]
    assert credential not in response.text
    assert credential not in client.get("/api/settings").text
    assert "Coffee Shop" not in captured["request"].data.decode()
    assert captured["timeout"] == 12


def test_hosted_agent_refuses_non_https_endpoint(monkeypatch):
    monkeypatch.setattr(main, "CONFIG", replace(
        main.CONFIG, ai_api_key="test-only-placeholder", ai_base_url="http://example.invalid/v1", groq_api_key="",
    ))
    answer, notice = main.hosted_agent_answer("question", {}, "INR")
    assert answer is None
    assert notice == "The configured hosted AI endpoint is invalid; a deterministic answer is shown."


def test_xlsx_import_accepts_native_excel_dates(client):
    from datetime import date
    from openpyxl import Workbook

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Date", "Description", "Debit", "Credit"])
    sheet.append([date(2026, 10, 1), "Coffee Shop", 10, None])
    sheet.append([date(2026, 10, 2), "Monthly Salary", None, 1000])
    output = io.BytesIO()
    workbook.save(output)
    response = upload(client, output.getvalue(), "statement.xlsx")
    assert response.status_code == 200, response.text
    assert response.json()["summary"]["net_flow"] == "990.00"


def test_text_pdf_import_and_pdf_report(client):
    from reportlab.pdfgen import canvas

    content = io.BytesIO()
    pdf = canvas.Canvas(content)
    pdf.drawString(50, 780, "2026-10-01 Coffee Shop -250.00")
    pdf.drawString(50, 760, "2026-10-02 Monthly Salary 50000.00")
    pdf.save()
    imported = upload(client, content.getvalue(), "statement.pdf")
    assert imported.status_code == 200, imported.text
    report = client.post(f"/api/reports/{imported.json()['id']}/pdf")
    assert report.status_code == 200
    assert report.headers["content-type"] == "application/pdf"
