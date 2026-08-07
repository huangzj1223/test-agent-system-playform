from app.services.agent_skill_service import match_skill_by_intent


def test_match_skill_by_intent_uses_keywords():
    skills = [
        {"name": "api-test", "keywords": ["接口", "api"], "enabled": True},
        {"name": "web-test", "keywords": ["页面"], "enabled": False},
    ]

    assert match_skill_by_intent("帮我生成 API 测试", skills)["name"] == "api-test"
    assert match_skill_by_intent("检查页面", skills) is None
