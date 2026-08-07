from datetime import datetime, timezone
import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.model_provider_service import ModelProviderService
from app.utils.model_config_crypto import decrypt_secret, encrypt_secret


def test_model_config_secret_is_encrypted_and_round_trips():
    cipher_text = encrypt_secret("sk-unit-secret", "unit-test-key")

    assert cipher_text.startswith("v2.")
    assert "sk-unit-secret" not in cipher_text
    assert decrypt_secret(cipher_text, "unit-test-key") == "sk-unit-secret"


def test_provider_projection_never_exposes_cipher_text():
    row = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        name="unit provider",
        provider="openai-compatible",
        api_endpoint="https://example.test/v1",
        api_key_cipher="cipher-value",
        protocol_type="openai-compatible",
        api_version=None,
        remark=None,
        enabled=True,
        sort=0,
        created_at=datetime.now(timezone.utc),
        updated_at=None,
        models=[],
    )

    info = ModelProviderService.to_info(row)

    assert info.has_api_key is True
    assert not hasattr(info, "api_key_cipher")


class _Result:
    def __init__(self, row):
        self._row = row

    def one_or_none(self):
        return self._row


class _DefaultModelSession:
    def __init__(self, row):
        self.row = row

    async def execute(self, _statement):
        return _Result(self.row)


def test_default_text_model_resolves_database_selection(monkeypatch):
    from app.core import llms

    provider_id = uuid4()
    calls = []

    async def fake_builder(db, selected_provider_id, selected_model_id):
        calls.append((db, selected_provider_id, selected_model_id))
        return "database-model"

    monkeypatch.setattr(llms, "get_text_model_from_config", fake_builder)
    session = _DefaultModelSession((provider_id, "deepseek-chat"))

    model = asyncio.run(llms.get_default_text_model_from_config(session))

    assert model == "database-model"
    assert calls == [(session, provider_id, "deepseek-chat")]


def test_default_text_model_requires_database_selection():
    from app.core.llms import get_default_text_model_from_config

    with pytest.raises(Exception, match="默认文本模型"):
        asyncio.run(get_default_text_model_from_config(_DefaultModelSession(None)))


def test_assigning_system_default_clears_previous_default():
    from app.core.llms import DEFAULT_TEXT_POOL
    from app.services.model_config_service import ModelConfigService

    calls = []

    class FakeDb:
        async def execute(self, statement):
            calls.append(statement)

    service = ModelConfigService(FakeDb())
    model_id = uuid4()

    asyncio.run(service._clear_existing_default(DEFAULT_TEXT_POOL, exclude_id=model_id))

    assert len(calls) == 1
    compiled = str(calls[0])
    assert "UPDATE model_configs" in compiled
    assert "pool_group" in compiled
