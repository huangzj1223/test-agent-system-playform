"""Services for model metadata configuration."""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.model_config import ModelConfig, ModelProvider
from app.core.llms import SYSTEM_DEFAULT_POOLS
from app.schemas.model_config import ModelConfigCreate, ModelConfigInfo, ModelConfigUpdate
from app.utils.exceptions import ConflictException, NotFoundException


class ModelConfigService:
    """CRUD for models under a provider."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_model(self, data: ModelConfigCreate) -> ModelConfigInfo:
        await self._ensure_provider(data.provider_id)
        await self._ensure_unique(data.provider_id, data.model_id)
        if data.pool_group in SYSTEM_DEFAULT_POOLS:
            await self._clear_existing_default(data.pool_group)
        model = ModelConfig(**data.model_dump())
        self.db.add(model)
        await self.db.flush()
        await self.db.refresh(model)
        return ModelConfigInfo.model_validate(model, from_attributes=True)

    async def update_model(self, model_id: UUID, data: ModelConfigUpdate) -> ModelConfigInfo:
        model = await self._get_or_404(model_id)
        updates = data.model_dump(exclude_unset=True)
        next_model_id = updates.get("model_id")
        if next_model_id and next_model_id != model.model_id:
            await self._ensure_unique(model.provider_id, next_model_id, exclude_id=model_id)
        next_pool_group = updates.get("pool_group")
        if next_pool_group in SYSTEM_DEFAULT_POOLS:
            await self._clear_existing_default(next_pool_group, exclude_id=model_id)
        for field, value in updates.items():
            setattr(model, field, value)
        await self.db.flush()
        await self.db.refresh(model)
        return ModelConfigInfo.model_validate(model, from_attributes=True)

    async def delete_model(self, model_id: UUID) -> None:
        model = await self._get_or_404(model_id)
        await self.db.delete(model)
        await self.db.flush()

    async def _get_or_404(self, model_id: UUID) -> ModelConfig:
        model = await self.db.scalar(select(ModelConfig).where(ModelConfig.id == model_id))
        if not model:
            raise NotFoundException(resource_type="模型", resource_id=str(model_id))
        return model

    async def _ensure_provider(self, provider_id: UUID) -> None:
        provider = await self.db.scalar(select(ModelProvider.id).where(ModelProvider.id == provider_id))
        if not provider:
            raise NotFoundException(resource_type="模型服务商", resource_id=str(provider_id))

    async def _ensure_unique(
        self,
        provider_id: UUID,
        provider_model_id: str,
        exclude_id: UUID | None = None,
    ) -> None:
        stmt = select(ModelConfig.id).where(
            ModelConfig.provider_id == provider_id,
            ModelConfig.model_id == provider_model_id,
        )
        if exclude_id:
            stmt = stmt.where(ModelConfig.id != exclude_id)
        exists = await self.db.scalar(stmt)
        if exists:
            raise ConflictException("该服务商下已存在相同模型 ID")

    async def _clear_existing_default(
        self,
        pool_group: str,
        exclude_id: UUID | None = None,
    ) -> None:
        """Keep each system model role assigned to at most one model."""
        stmt = update(ModelConfig).where(ModelConfig.pool_group == pool_group)
        if exclude_id:
            stmt = stmt.where(ModelConfig.id != exclude_id)
        await self.db.execute(stmt.values(pool_group=None))
