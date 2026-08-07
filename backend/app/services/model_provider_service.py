"""Services for model provider configuration."""

import asyncio
from types import SimpleNamespace
from typing import Any, Awaitable, Callable
from uuid import UUID

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config.settings import settings
from app.models.model_config import ModelConfig, ModelProvider
from app.schemas.model_config import (
    ModelConfigInfo,
    ModelProviderCreate,
    ModelProviderInfo,
    ModelProviderUpdate,
    TestConnectionResult,
)
from app.utils.exceptions import NotFoundException, UnprocessableEntityException
from app.utils.model_config_crypto import decrypt_secret, encrypt_secret


class ModelProviderService:
    """Provider CRUD, secret encryption, and connection testing."""

    def __init__(
        self,
        db: AsyncSession,
        model_builder: Callable[..., Awaitable[Any]] | None = None,
        probe_timeout: float = 30.0,
    ):
        self.db = db
        self.model_builder = model_builder
        self.probe_timeout = probe_timeout

    async def list_providers(
        self,
        offset: int,
        limit: int,
        keyword: str | None = None,
    ) -> tuple[list[ModelProviderInfo], int]:
        stmt = select(ModelProvider).options(selectinload(ModelProvider.models))
        count_stmt = select(func.count()).select_from(ModelProvider)
        if keyword:
            like = f"%{keyword}%"
            stmt = stmt.where(ModelProvider.name.ilike(like))
            count_stmt = count_stmt.where(ModelProvider.name.ilike(like))
        total = await self.db.scalar(count_stmt)
        result = await self.db.execute(
            stmt.order_by(ModelProvider.sort.asc(), ModelProvider.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return [self.to_info(row) for row in result.scalars().all()], total or 0

    async def list_all_with_models(self) -> list[ModelProviderInfo]:
        result = await self.db.execute(
            select(ModelProvider)
            .options(selectinload(ModelProvider.models))
            .order_by(ModelProvider.sort.asc(), ModelProvider.created_at.desc())
        )
        return [self.to_info(row) for row in result.scalars().all()]

    async def get_provider(self, provider_id: UUID) -> ModelProviderInfo:
        return self.to_info(await self._get_or_404(provider_id))

    async def create_provider(self, data: ModelProviderCreate) -> ModelProviderInfo:
        provider = ModelProvider(
            name=data.name,
            provider=data.provider,
            api_endpoint=data.api_endpoint,
            api_key_cipher=self._encrypt_key(data.api_key),
            protocol_type=data.protocol_type,
            api_version=data.api_version,
            remark=data.remark,
            enabled=data.enabled,
            sort=data.sort,
        )
        self.db.add(provider)
        await self.db.flush()
        return self.to_info(await self._get_or_404(provider.id))

    async def update_provider(self, provider_id: UUID, data: ModelProviderUpdate) -> ModelProviderInfo:
        provider = await self._get_or_404(provider_id)
        updates = data.model_dump(exclude_unset=True)
        api_key = updates.pop("api_key", None)
        for field, value in updates.items():
            setattr(provider, field, value)
        if api_key:
            provider.api_key_cipher = self._encrypt_key(api_key)
        await self.db.flush()
        return self.to_info(await self._get_or_404(provider_id))

    async def delete_provider(self, provider_id: UUID) -> None:
        provider = await self._get_or_404(provider_id)
        await self.db.delete(provider)
        await self.db.flush()

    async def test_connection(self, provider_id: UUID, model_id: str | None = None) -> TestConnectionResult:
        if model_id:
            try:
                builder = self.model_builder
                if builder is None:
                    from app.core.llms import get_text_model_from_config

                    builder = get_text_model_from_config
                model = await builder(self.db, provider_id, model_id)
                await asyncio.wait_for(model.ainvoke("ping"), timeout=self.probe_timeout)
                return TestConnectionResult(reachable=True, message="Model inference succeeded")
            except TimeoutError:
                return TestConnectionResult(reachable=False, message="Model inference timed out")
            except (NotFoundException, UnprocessableEntityException):
                raise
            except Exception:
                return TestConnectionResult(reachable=False, message="Model inference failed")

        ctx = await self.resolve_provider(provider_id, model_id)
        headers = {"Authorization": f"Bearer {ctx.api_key}"} if ctx.api_key else {}
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
                response = await client.get(ctx.api_endpoint, headers=headers)
            if response.status_code < 500:
                return TestConnectionResult(
                    reachable=True,
                    status_code=response.status_code,
                    message="连接测试成功",
                )
            return TestConnectionResult(
                reachable=False,
                status_code=response.status_code,
                message=f"服务返回 {response.status_code}",
            )
        except httpx.TimeoutException:
            return TestConnectionResult(reachable=False, message="连接超时")
        except httpx.HTTPError:
            return TestConnectionResult(reachable=False, message="无法连接到服务地址")

    async def resolve_provider(self, provider_id: UUID, model_id: str | None = None) -> SimpleNamespace:
        provider = await self._get_or_404(provider_id)
        if not provider.enabled:
            raise UnprocessableEntityException("服务商已停用")
        if model_id:
            model = await self.db.scalar(
                select(ModelConfig).where(
                    ModelConfig.provider_id == provider_id,
                    ModelConfig.model_id == model_id,
                    ModelConfig.enabled.is_(True),
                )
            )
            if not model:
                raise NotFoundException(resource_type="模型", resource_id=model_id)
        return SimpleNamespace(
            provider=provider.provider,
            api_endpoint=provider.api_endpoint,
            api_key=self._decrypt_key(provider.api_key_cipher),
            protocol_type=provider.protocol_type,
            api_version=provider.api_version,
            model_id=model_id,
        )

    async def _get_or_404(self, provider_id: UUID) -> ModelProvider:
        result = await self.db.execute(
            select(ModelProvider)
            .where(ModelProvider.id == provider_id)
            .options(selectinload(ModelProvider.models))
        )
        provider = result.scalar_one_or_none()
        if not provider:
            raise NotFoundException(resource_type="模型服务商", resource_id=str(provider_id))
        return provider

    def _encrypt_key(self, api_key: str | None) -> str | None:
        if not api_key:
            return None
        return encrypt_secret(api_key, settings.model_config_enc_key)

    def _decrypt_key(self, cipher_text: str | None) -> str | None:
        if not cipher_text:
            return None
        return decrypt_secret(cipher_text, settings.model_config_enc_key)

    @staticmethod
    def to_info(row: ModelProvider) -> ModelProviderInfo:
        models = sorted(getattr(row, "models", []) or [], key=lambda item: (item.sort, item.name))
        return ModelProviderInfo(
            id=row.id,
            name=row.name,
            provider=row.provider,
            api_endpoint=row.api_endpoint,
            protocol_type=row.protocol_type,
            api_version=row.api_version,
            remark=row.remark,
            enabled=row.enabled,
            sort=row.sort,
            has_api_key=bool(row.api_key_cipher),
            created_at=row.created_at,
            updated_at=row.updated_at,
            models=[ModelConfigInfo.model_validate(model, from_attributes=True) for model in models],
        )
