from app.services.memory_seed import BUILTIN_MEMORIES
from app.services.memory_service import build_memory_context, bump_version


def test_builtin_memory_seed_contains_required_files():
    keys = {item["memory_key"] for item in BUILTIN_MEMORIES}

    assert keys == {
        "soul.md",
        "user.md",
        "memory.md",
        "skill-memory.md",
        "tool-memory.md",
    }


def test_bump_version_increments_patch_number():
    assert bump_version("v1.2.3") == "v1.2.4"
    assert bump_version("bad") == "v1.0.1"


def test_build_memory_context_limits_content():
    items = [
        {"memory_key": "one.md", "content": "a" * 12},
        {"memory_key": "two.md", "content": "b" * 12},
    ]

    context = build_memory_context(items, max_chars=32)

    assert "one.md" in context
    assert len(context) <= 32
