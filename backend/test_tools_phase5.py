from app.services.agent_tool_service import normalize_tool_name, tool_available


def test_normalize_tool_name_trims_and_lowercases():
    assert normalize_tool_name(" Echo ") == "echo"


def test_tool_available_uses_enabled_tool_registry():
    tools = [{"name": "echo", "enabled": True}, {"name": "disabled", "enabled": False}]

    assert tool_available("echo", tools) is True
    assert tool_available("disabled", tools) is False
    assert tool_available("missing", tools) is False
