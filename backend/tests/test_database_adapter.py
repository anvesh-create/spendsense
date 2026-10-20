from contextlib import nullcontext
import asyncio

import psycopg
from backend import main


def test_postgres_adapter_translates_placeholders_and_supports_mapping_and_index_rows():
    class FakeCursor:
        def fetchone(self):
            return main.HybridRow((("count", 7),))

    class FakeConnection:
        def __init__(self):
            self.statement = None
            self.parameters = None

        def execute(self, statement, parameters):
            self.statement = statement
            self.parameters = parameters
            return FakeCursor()

    raw = FakeConnection()
    connection = main.PostgresConnection(raw)
    cursor = connection.execute("SELECT COUNT(*) AS count FROM imports WHERE id=?", ("import-id",))
    row = cursor.fetchone()

    assert raw.statement == "SELECT COUNT(*) AS count FROM imports WHERE id=%s"
    assert raw.parameters == ("import-id",)
    assert row["count"] == 7
    assert row[0] == 7
    assert dict(row) == {"count": 7}


def test_postgres_adapter_bulk_insert_uses_cursor_executemany():
    class FakeCursor:
        def executemany(self, statement, parameters):
            self.statement = statement
            self.parameters = parameters
            return self

    class FakeConnection:
        def __init__(self):
            self.cursor_instance = FakeCursor()

        def cursor(self):
            return self.cursor_instance

    raw = FakeConnection()
    connection = main.PostgresConnection(raw)
    rows = [("first-id", "first"), ("second-id", "second")]

    cursor = connection.executemany("INSERT INTO sample(id, value) VALUES(?,?)", rows)

    assert cursor is raw.cursor_instance
    assert cursor.statement == "INSERT INTO sample(id, value) VALUES(%s,%s)"
    assert cursor.parameters == rows


def test_hybrid_row_factory_handles_statements_without_result_columns():
    class FakeCursor:
        description = None

    row_factory = main._hybrid_row_factory(FakeCursor())

    assert row_factory((1, 2)) == (1, 2)


def test_postgres_database_url_selects_postgres_without_opening_a_real_connection(monkeypatch):
    class FakeRawConnection:
        def execute(self, statement, parameters):
            self.statement = statement
            self.parameters = parameters
            return self

        def fetchone(self):
            return main.HybridRow((("answer", 42),))

    class FakePool:
        def __init__(self):
            self.raw = FakeRawConnection()

        def connection(self):
            return nullcontext(self.raw)

    fake_pool = FakePool()
    monkeypatch.setattr(main, "DATABASE_URL", "postgresql://unit-test.invalid/db?sslmode=require")
    monkeypatch.setattr(main, "_postgres_pool", lambda: fake_pool)

    with main.db() as connection:
        answer = connection.execute("SELECT ? AS answer", (42,)).fetchone()["answer"]

    assert answer == 42
    assert fake_pool.raw.statement == "SELECT %s AS answer"


def test_postgres_pool_uses_configured_url_and_connection_timeouts(monkeypatch):
    captured = {}

    class FakePool:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def open(self, **kwargs):
            captured["open_kwargs"] = kwargs

    monkeypatch.setattr(main, "DATABASE_URL", "postgresql://synthetic-user:synthetic-password@db.example.test:5432/testdb?sslmode=require")
    monkeypatch.setattr(main, "ConnectionPool", FakePool)
    monkeypatch.setattr(main, "_pool", None)
    monkeypatch.setattr(main, "_pool_url", "")

    pool = main._postgres_pool()

    assert isinstance(pool, FakePool)
    assert captured["conninfo"] == main.DATABASE_URL
    assert captured["kwargs"]["connect_timeout"] == 10
    assert captured["open_kwargs"] == {"wait": True, "timeout": 10}


def test_database_error_response_does_not_expose_driver_details():
    response = asyncio.run(main.database_error_handler(None, psycopg.OperationalError("private-password-fragment")))

    assert response.status_code == 503
    assert b"private-password-fragment" not in response.body
    assert b"temporarily unavailable" in response.body
