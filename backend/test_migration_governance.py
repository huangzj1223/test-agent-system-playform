import asyncio
from types import SimpleNamespace

import pytest

from app.api.v2 import agent_skills, agent_tools, memories, model_configs
from app.middleware.auth_guard import require_perms
from app.services.model_provider_service import ModelProviderService
from app.utils.exceptions import ForbiddenException


def _route_permissions(router, path: str, method: str) -> set[str]:
    route = next(item for item in router.routes if item.path == path and method in item.methods)
    permissions: set[str] = set()

    def visit(dependency):
        permissions.update(getattr(dependency.call, "required_permissions", ()))
        for child in dependency.dependencies:
            visit(child)

    visit(route.dependant)
    return permissions


@pytest.mark.parametrize(
    ("router", "path", "method", "permission"),
    [
        (model_configs.router, "/model-config/providers", "POST", "ai:model:write"),
        (memories.router, "/memories", "POST", "ai:memory:write"),
        (agent_tools.router, "/agent-tools", "POST", "ai:tool:write"),
        (agent_skills.router, "/agent-skills", "POST", "ai:skill:write"),
    ],
)
def test_administrative_mutations_declare_explicit_permissions(router, path, method, permission):
    assert permission in _route_permissions(router, path, method)


def test_permission_dependency_rejects_user_without_required_permission(monkeypatch):
    class FakeAuthService:
        def __init__(self, db):
            pass

        async def get_perms(self, user_id):
            return []

    monkeypatch.setattr("app.middleware.auth_guard.AuthService", FakeAuthService)
    checker = require_perms("ai:model:write")

    with pytest.raises(ForbiddenException):
        asyncio.run(checker(current_user=SimpleNamespace(id="user-1", username="tester"), db=object()))


def test_model_connection_with_model_id_performs_minimal_inference():
    calls = []

    class FakeModel:
        async def ainvoke(self, messages):
            calls.append(messages)
            return SimpleNamespace(content="ok")

    async def build_model(db, provider_id, model_id):
        assert provider_id == "provider-1"
        assert model_id == "model-1"
        return FakeModel()

    service = ModelProviderService(db=object(), model_builder=build_model, probe_timeout=8.0)
    result = asyncio.run(service.test_connection("provider-1", "model-1"))

    assert result.reachable is True
    assert calls
    assert "ping" in str(calls[0]).lower()


def test_model_connection_probe_allows_normal_external_model_latency(monkeypatch):
    observed = {}

    class FakeModel:
        async def ainvoke(self, messages):
            return SimpleNamespace(content="ok")

    async def build_model(db, provider_id, model_id):
        return FakeModel()

    async def capture_wait_for(awaitable, timeout):
        observed["timeout"] = timeout
        return await awaitable

    monkeypatch.setattr("app.services.model_provider_service.asyncio.wait_for", capture_wait_for)
    service = ModelProviderService(db=object(), model_builder=build_model)

    result = asyncio.run(service.test_connection("provider-1", "model-1"))

    assert result.reachable is True
    assert observed["timeout"] == 30.0
