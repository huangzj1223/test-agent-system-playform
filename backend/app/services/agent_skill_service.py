"""Agent skill registry and routing service."""

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_skill import AgentSkill
from app.utils.exceptions import NotFoundException

BUILTIN_SKILLS = [
    {
        "name": "api-test",
        "label": "接口测试技能",
        "description": "面向 API 文档、接口依赖和断言生成测试方案。",
        "entrypoint": "agents.api",
        "keywords": ["api", "接口", "http", "断言"],
        "config": {"bridge_agent": "api"},
        "sort": 0,
    },
    {
        "name": "web-test",
        "label": "Web 测试技能",
        "description": "面向页面、交互、浏览器自动化和截图验证。",
        "entrypoint": "agents.web",
        "keywords": ["web", "页面", "浏览器", "playwright"],
        "config": {"bridge_agent": "web_cli"},
        "sort": 1,
    },
    {
        "name": "failure-analysis",
        "label": "失败分析技能",
        "description": "分析执行失败，区分产品、脚本、数据和环境问题。",
        "entrypoint": "agents.failure_analysis",
        "keywords": ["失败", "报错", "修复", "分析"],
        "config": {"bridge_agent": "api"},
        "sort": 2,
    },
]


def match_skill_by_intent(prompt: str, skills: list[dict]) -> dict | None:
    lowered = prompt.lower()
    for skill in skills:
        if not skill.get("enabled", True):
            continue
        for keyword in skill.get("keywords", []):
            if str(keyword).lower() in lowered:
                return skill
    return None


class AgentSkillService:
    """CRUD and keyword-based intent routing."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_builtin(self, user_id: UUID) -> None:
        for seed in BUILTIN_SKILLS:
            result = await self.db.execute(
                select(AgentSkill).where(and_(AgentSkill.user_id == user_id, AgentSkill.name == seed["name"]))
            )
            existing = result.scalar_one_or_none()
            if existing:
                if not (existing.config or {}).get("bridge_agent"):
                    existing.config = seed["config"]
                continue
            self.db.add(AgentSkill(user_id=user_id, enabled=True, **seed))
        await self.db.commit()

    async def list_skills(self, user_id: UUID, enabled_only: bool = False) -> list[AgentSkill]:
        await self.ensure_builtin(user_id)
        stmt = select(AgentSkill).where(AgentSkill.user_id == user_id)
        if enabled_only:
            stmt = stmt.where(AgentSkill.enabled.is_(True))
        stmt = stmt.order_by(AgentSkill.sort.asc(), AgentSkill.created_at.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_skill(self, user_id: UUID, data) -> AgentSkill:
        skill = AgentSkill(
            user_id=user_id,
            name=data.name.strip().lower(),
            label=data.label,
            description=data.description,
            entrypoint=data.entrypoint,
            keywords=data.keywords or [],
            config=data.config or {},
            enabled=data.enabled if data.enabled is not None else True,
            sort=data.sort or 100,
        )
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def update_skill(self, user_id: UUID, skill_id: UUID, data) -> AgentSkill:
        skill = await self._get_skill(user_id, skill_id)
        patch = data.model_dump(exclude_unset=True)
        if "name" in patch and patch["name"]:
            patch["name"] = patch["name"].strip().lower()
        for key, value in patch.items():
            setattr(skill, key, value)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def route_intent(self, user_id: UUID, prompt: str) -> AgentSkill | None:
        skills = await self.list_skills(user_id, enabled_only=True)
        matched = match_skill_by_intent(
            prompt,
            [
                {
                    "id": item.id,
                    "name": item.name,
                    "label": item.label,
                    "keywords": item.keywords,
                    "enabled": item.enabled,
                    "entrypoint": item.entrypoint,
                }
                for item in skills
            ],
        )
        if not matched:
            return None
        return next((item for item in skills if item.id == matched["id"]), None)

    async def _get_skill(self, user_id: UUID, skill_id: UUID) -> AgentSkill:
        result = await self.db.execute(
            select(AgentSkill).where(and_(AgentSkill.user_id == user_id, AgentSkill.id == skill_id))
        )
        skill = result.scalar_one_or_none()
        if not skill:
            raise NotFoundException(resource_type="技能", resource_id=str(skill_id))
        return skill
