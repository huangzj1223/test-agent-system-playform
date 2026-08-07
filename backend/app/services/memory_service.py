"""Memory center business logic."""

from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent_memory import AgentMemory, MemoryReadLog, MemorySuggestion, MemoryVersion
from app.services.memory_seed import BUILTIN_MEMORIES, BUILTIN_PENDING
from app.utils.exceptions import BadRequestException, NotFoundException


def bump_version(current: str) -> str:
    parts = (current or "").removeprefix("v").split(".")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        return "v1.0.1"
    return f"v{parts[0]}.{parts[1]}.{int(parts[2]) + 1}"


def build_memory_context(items: list[dict], max_chars: int = 20000) -> str:
    chunks = []
    total = 0
    for item in items:
        block = f"[{item['memory_key']}]\n{item['content']}\n"
        remaining = max_chars - total
        if remaining <= 0:
            break
        if len(block) > remaining:
            block = block[:remaining]
        chunks.append(block)
        total += len(block)
    return "\n".join(chunks)[:max_chars]


class MemoryService:
    """CRUD, seed, versions, suggestions and context injection helpers."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_builtin(self, user_id: UUID) -> None:
        for seed in BUILTIN_MEMORIES:
            existing = await self._get_by_key(user_id, seed["memory_key"], raise_missing=False)
            if existing:
                continue
            permission = seed.get("permission", {})
            memory = AgentMemory(
                user_id=user_id,
                memory_key=seed["memory_key"],
                name=seed["name"],
                description=seed.get("description"),
                category=seed.get("category", "internal"),
                risk_level=seed.get("risk_level", "L1"),
                content=seed.get("content", ""),
                version=seed.get("version", "v1.0.0"),
                built_in=True,
                enabled=True,
                can_read=True,
                can_suggest=True,
                can_auto_write=bool(permission.get("can_auto_write", False)),
                need_confirm=bool(permission.get("need_confirm", True)),
                audit_log=True,
                related_keys=seed.get("related_keys", []),
                sort=int(seed.get("sort", 0)),
            )
            self.db.add(memory)
            await self.db.flush()
            await self._write_version(memory, "create", "内置初始化", "system")
            for text in seed.get("suggestions", []):
                self.db.add(
                    MemorySuggestion(
                        memory_id=memory.id,
                        user_id=user_id,
                        target_key=memory.memory_key,
                        text=text,
                        source="builtin",
                        status="pending",
                    )
                )
        await self.db.flush()
        for seed in BUILTIN_PENDING:
            result = await self.db.execute(
                select(MemorySuggestion).where(
                    and_(
                        MemorySuggestion.user_id == user_id,
                        MemorySuggestion.target_key == seed["target_key"],
                        MemorySuggestion.text == seed["text"],
                    )
                )
            )
            if not result.scalar_one_or_none():
                target = await self._get_by_key(user_id, seed["target_key"], raise_missing=False)
                self.db.add(
                    MemorySuggestion(
                        memory_id=target.id if target else None,
                        user_id=user_id,
                        target_key=seed["target_key"],
                        text=seed["text"],
                        source=seed.get("source"),
                        status="pending",
                    )
                )
        await self.db.commit()

    async def list_memories(self, user_id: UUID) -> list[AgentMemory]:
        await self.ensure_builtin(user_id)
        result = await self.db.execute(
            select(AgentMemory)
            .where(AgentMemory.user_id == user_id)
            .order_by(AgentMemory.sort.asc(), AgentMemory.created_at.asc())
        )
        return list(result.scalars().all())

    async def detail(self, user_id: UUID, memory_key: str) -> AgentMemory:
        await self.ensure_builtin(user_id)
        result = await self.db.execute(
            select(AgentMemory)
            .options(selectinload(AgentMemory.versions), selectinload(AgentMemory.suggestions))
            .where(and_(AgentMemory.user_id == user_id, AgentMemory.memory_key == memory_key))
        )
        memory = result.scalar_one_or_none()
        if not memory:
            raise NotFoundException(resource_type="记忆", resource_id=memory_key)
        memory.versions.sort(key=lambda item: item.created_at, reverse=True)
        memory.suggestions.sort(key=lambda item: item.created_at, reverse=True)
        return memory

    async def stats(self, user_id: UUID) -> dict:
        await self.ensure_builtin(user_id)
        memories = await self.list_memories(user_id)
        pending = await self.db.scalar(
            select(func.count()).select_from(MemorySuggestion).where(
                and_(MemorySuggestion.user_id == user_id, MemorySuggestion.status == "pending")
            )
        )
        reads = await self.db.scalar(
            select(func.count()).select_from(MemoryReadLog).where(MemoryReadLog.user_id == user_id)
        )
        return {
            "total": len(memories),
            "enabled": sum(1 for item in memories if item.enabled),
            "high_risk": sum(1 for item in memories if item.risk_level in {"L3", "L4"}),
            "pending": int(pending or 0),
            "reads": int(reads or 0),
        }

    async def create_memory(self, user_id: UUID, data, updater: str = "user") -> AgentMemory:
        existing = await self._get_by_key(user_id, data.memory_key, raise_missing=False)
        if existing:
            raise BadRequestException("记忆 key 已存在")
        memory = AgentMemory(
            user_id=user_id,
            memory_key=data.memory_key,
            name=data.name or data.memory_key,
            description=data.description,
            category=data.category or "custom",
            risk_level=data.risk_level or "L1",
            content=data.content or "",
            version="v1.0.0",
            built_in=False,
            enabled=True,
            can_read=True,
            can_suggest=True,
            can_auto_write=True,
            need_confirm=False,
            audit_log=True,
            related_keys=[],
            sort=100,
        )
        self.db.add(memory)
        await self.db.flush()
        await self._write_version(memory, "create", "创建记忆", updater)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def save_content(self, user_id: UUID, memory_key: str, content: str, updater: str = "user") -> AgentMemory:
        memory = await self._get_by_key(user_id, memory_key)
        memory.content = content
        memory.version = bump_version(memory.version)
        await self._write_version(memory, "update", "编辑内容", updater)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def rollback(self, user_id: UUID, memory_key: str, version: str, updater: str = "user") -> AgentMemory:
        memory = await self._get_by_key(user_id, memory_key)
        result = await self.db.execute(
            select(MemoryVersion)
            .where(and_(MemoryVersion.memory_id == memory.id, MemoryVersion.version == version))
            .order_by(MemoryVersion.created_at.desc())
        )
        snapshot = result.scalars().first()
        if not snapshot:
            raise NotFoundException(resource_type="记忆版本", resource_id=f"{memory_key}/{version}")
        memory.content = snapshot.content
        memory.version = bump_version(memory.version)
        await self._write_version(memory, "rollback", f"回滚自 {version}", updater)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def create_pending(self, user_id: UUID, target_key: str, text: str, source: str | None = None) -> MemorySuggestion:
        target = await self._get_by_key(user_id, target_key)
        suggestion = MemorySuggestion(
            memory_id=target.id,
            user_id=user_id,
            target_key=target_key,
            text=text,
            source=source,
            status="pending",
        )
        self.db.add(suggestion)
        await self.db.commit()
        await self.db.refresh(suggestion)
        return suggestion

    async def confirm_pending(self, user_id: UUID, suggestion_id: UUID, text: str | None = None) -> AgentMemory:
        suggestion = await self._get_suggestion(user_id, suggestion_id)
        if suggestion.status != "pending":
            raise BadRequestException("建议已处理")
        memory = await self._get_by_key(user_id, suggestion.target_key)
        append_text = text or suggestion.text
        memory.content = f"{memory.content.rstrip()}\n\n- {append_text}"
        memory.version = bump_version(memory.version)
        suggestion.status = "confirmed"
        await self._write_version(memory, "confirm", "确认待确认记忆", "user")
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def ignore_pending(self, user_id: UUID, suggestion_id: UUID) -> MemorySuggestion:
        suggestion = await self._get_suggestion(user_id, suggestion_id)
        suggestion.status = "ignored"
        await self.db.commit()
        await self.db.refresh(suggestion)
        return suggestion

    async def build_context(self, user_id: UUID, session_id: str | None = None, max_chars: int = 20000) -> str:
        await self.ensure_builtin(user_id)
        result = await self.db.execute(
            select(AgentMemory)
            .where(and_(AgentMemory.user_id == user_id, AgentMemory.enabled.is_(True), AgentMemory.can_read.is_(True)))
            .order_by(AgentMemory.sort.asc(), AgentMemory.created_at.asc())
        )
        memories = list(result.scalars().all())
        for memory in memories:
            self.db.add(
                MemoryReadLog(
                    user_id=user_id,
                    memory_id=memory.id,
                    memory_key=memory.memory_key,
                    session_id=session_id,
                    hit=True,
                )
            )
        await self.db.commit()
        return build_memory_context(
            [{"memory_key": item.memory_key, "content": item.content} for item in memories],
            max_chars=max_chars,
        )

    async def _get_by_key(self, user_id: UUID, memory_key: str, raise_missing: bool = True) -> AgentMemory | None:
        result = await self.db.execute(
            select(AgentMemory).where(and_(AgentMemory.user_id == user_id, AgentMemory.memory_key == memory_key))
        )
        memory = result.scalar_one_or_none()
        if raise_missing and not memory:
            raise NotFoundException(resource_type="记忆", resource_id=memory_key)
        return memory

    async def _get_suggestion(self, user_id: UUID, suggestion_id: UUID) -> MemorySuggestion:
        result = await self.db.execute(
            select(MemorySuggestion).where(
                and_(MemorySuggestion.user_id == user_id, MemorySuggestion.id == suggestion_id)
            )
        )
        suggestion = result.scalar_one_or_none()
        if not suggestion:
            raise NotFoundException(resource_type="记忆建议", resource_id=str(suggestion_id))
        return suggestion

    async def _write_version(self, memory: AgentMemory, change_type: str, note: str, updater: str) -> None:
        self.db.add(
            MemoryVersion(
                memory_id=memory.id,
                version=memory.version,
                content=memory.content,
                change_type=change_type,
                note=note,
                updater=updater,
            )
        )
