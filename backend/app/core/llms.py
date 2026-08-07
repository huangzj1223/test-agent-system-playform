"""
大语言模型统一配置中心。

采用具体 SDK 类创建模型，确保可控性和兼容性：
- 首选文本模型：ChatOpenAI（OpenAI 兼容接口，如 agnes-2.0-flash）
- DeepSeek 文本模型（作为后备）：ChatDeepSeek — 支持思考模式 / 非思考模式
- 图片/多模态模型：ChatOpenAI（OpenAI 兼容接口，如豆包、阿里云等）
"""

import logging
from functools import lru_cache
from typing import Any
from uuid import UUID

from langchain_core.language_models import LanguageModelInput, ModelProfile
from langchain_core.messages import AIMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.settings import settings

logger = logging.getLogger(__name__)

DEFAULT_TEXT_POOL = "system-default-text"
DEFAULT_IMAGE_POOL = "system-default-image"
SYSTEM_DEFAULT_POOLS = {DEFAULT_TEXT_POOL, DEFAULT_IMAGE_POOL}


# ============================================================================
# DeepSeek 模型构建器（思考模式 / Agent 模式）
# ============================================================================

def _build_deepseek_reasoning_chat(**kwargs: Any):
    """思考模式专用：把 reasoning_content 回传给 DeepSeek API（v4 工具调用多轮必需）。"""
    from langchain_deepseek import ChatDeepSeek

    class _DeepSeekReasoningChat(ChatDeepSeek):
        def _get_request_payload(
            self,
            input_: LanguageModelInput,
            *,
            stop: list[str] | None = None,
            **kwargs: Any,
        ) -> dict:
            messages = self._convert_input(input_).to_messages()
            payload = super()._get_request_payload(input_, stop=stop, **kwargs)
            msg_dicts = payload.get("messages")
            if not msg_dicts or len(msg_dicts) != len(messages):
                return payload

            for orig, msg_dict in zip(messages, msg_dicts):
                if not isinstance(orig, AIMessage):
                    continue
                reasoning = orig.additional_kwargs.get("reasoning_content")
                if reasoning is not None:
                    msg_dict["reasoning_content"] = reasoning
            return payload

    return _DeepSeekReasoningChat(**kwargs)


def _build_deepseek_agent_chat(**kwargs: Any):
    """Agent 专用：始终显式关闭 v4 思考模式，避免空 stream / 工具轮次 400。

    必须返回 BaseChatModel 子类实例，供 deepagents.resolve_model 识别；
    组合包装 + __getattr__ 会导致 resolve_model 误判为字符串并调用 startswith。
    """
    from langchain_deepseek import ChatDeepSeek

    extra_body = dict(kwargs.pop("extra_body", {}) or {})
    extra_body.setdefault("thinking", {"type": "disabled"})
    return ChatDeepSeek(**kwargs, extra_body=extra_body)


# ============================================================================
# 模型创建工厂
# ============================================================================

@lru_cache(maxsize=1)
def get_text_model():
    """创建文本处理模型。

    优先使用首选文本模型（OpenAI 兼容接口，如 agnes-2.0-flash）；
    如果未配置或创建失败，则回退到 DeepSeek 模型。

    适用于纯文本对话、代码生成、测试用例设计、策略分析等场景。

    Returns:
        配置好 ModelProfile 的 ChatOpenAI 或 ChatDeepSeek 实例
    """
    # --- 尝试首选模型（OpenAI 兼容接口） ---
    if settings.text_model_api_key:
        try:
            from langchain_openai import ChatOpenAI
            model = ChatOpenAI(
                base_url=settings.text_model_api_base,
                api_key=settings.text_model_api_key,
                model=settings.text_model_name,
                max_tokens=settings.text_model_max_tokens,
                timeout=120,
                max_retries=5,
                temperature=0.3,
            )
            model.profile = ModelProfile(max_input_tokens=128000)
            logger.info("Text model ready: %s", settings.text_model_name)
            return model
        except Exception as e:
            logger.warning(
                f"Failed to create preferred text model "
                f"({settings.text_model_name}): {e} — falling back to DeepSeek"
            )

    # --- 回退到 DeepSeek ---
    try:
        thinking_type = "enabled" if settings.llm_thinking_enabled else "disabled"
        extra_body = {"thinking": {"type": thinking_type}}
        common_kwargs: dict[str, Any] = {
            "api_key": settings.deepseek_api_key,
            "base_url": settings.llm_api_base,
            "model": settings.llm_model,
            "max_tokens": settings.llm_max_tokens,
            "timeout": 120,
            "max_retries": 5,
            "extra_body": extra_body,
        }
        if not settings.llm_thinking_enabled:
            common_kwargs["temperature"] = 0.3

        builder = (
            _build_deepseek_reasoning_chat
            if settings.llm_thinking_enabled
            else _build_deepseek_agent_chat
        )
        model = builder(**common_kwargs)
        model.profile = ModelProfile(max_input_tokens=128000)
        mode_label = "thinking" if settings.llm_thinking_enabled else "agent"
        logger.info(f"Text model ready (fallback): deepseek/{settings.llm_model} (mode={mode_label})")
        return model
    except ImportError:
        logger.error("langchain_deepseek not installed. Run: pip install langchain-deepseek")
        raise
    except Exception as e:
        logger.error(f"Failed to create fallback text model: {e}")
        raise


@lru_cache(maxsize=1)
def get_image_model():
    """创建图片处理模型（OpenAI 兼容接口）。

    适用于图片理解、图文混合需求分析、PDF 多模态解析等场景。
    通过 ChatOpenAI 对接任意兼容 OpenAI 接口的视觉模型（如豆包 Vision、通义千问 VL 等）。

    Returns:
        ChatOpenAI 实例
    """
    from langchain_openai import ChatOpenAI
    try:
        model = ChatOpenAI(
            base_url=settings.image_parser_api_base,
            api_key=settings.image_parser_api_key,
            model=settings.image_parser_model,
        )
        logger.info(f"Image model ready: {settings.image_parser_model}")
        return model
    except Exception as e:
        logger.error(f"Failed to create image model: {e}")
        raise


async def get_text_model_from_config(
    db: AsyncSession,
    provider_id: UUID,
    provider_model_id: str,
):
    """Build a chat model from the model configuration tables.

    This is intentionally not cached: admins can edit provider keys and model
    runtime knobs from the UI, so callers should receive current database state.
    """
    from langchain_openai import ChatOpenAI

    from app.models.model_config import ModelConfig, ModelProvider
    from app.utils.exceptions import NotFoundException, UnprocessableEntityException
    from app.utils.model_config_crypto import decrypt_secret

    result = await db.execute(
        select(ModelProvider, ModelConfig)
        .join(ModelConfig, ModelConfig.provider_id == ModelProvider.id)
        .where(
            ModelProvider.id == provider_id,
            ModelProvider.enabled.is_(True),
            ModelConfig.model_id == provider_model_id,
            ModelConfig.enabled.is_(True),
        )
    )
    row = result.one_or_none()
    if not row:
        raise NotFoundException(resource_type="模型配置", resource_id=f"{provider_id}/{provider_model_id}")

    provider, model_config = row
    if not provider.api_key_cipher:
        raise UnprocessableEntityException("模型服务商尚未配置 API Key")

    if provider.protocol_type not in {"openai", "openai-compatible", "azure-openai"}:
        raise UnprocessableEntityException(f"暂不支持的模型协议: {provider.protocol_type}")

    kwargs: dict[str, Any] = {
        "base_url": provider.api_endpoint,
        "api_key": decrypt_secret(provider.api_key_cipher, settings.model_config_enc_key),
        "model": model_config.model_id,
        "timeout": model_config.timeout_sec or 120,
        "max_retries": model_config.retry_count if model_config.retry_count is not None else 5,
    }
    if model_config.max_output_tokens is not None:
        kwargs["max_tokens"] = model_config.max_output_tokens
    if model_config.default_temperature is not None:
        kwargs["temperature"] = model_config.default_temperature
    if model_config.default_top_p is not None:
        kwargs["top_p"] = model_config.default_top_p

    model = (
        _build_deepseek_agent_chat(**kwargs)
        if provider.provider == "deepseek"
        else ChatOpenAI(**kwargs)
    )
    if model_config.context_window:
        model.profile = ModelProfile(max_input_tokens=model_config.context_window)
    return model


async def _get_default_model_selection(
    db: AsyncSession,
    pool_group: str,
) -> tuple[UUID, str]:
    """Return the enabled provider/model selected for one system role."""
    from app.models.model_config import ModelConfig, ModelProvider
    from app.utils.exceptions import UnprocessableEntityException

    result = await db.execute(
        select(ModelProvider.id, ModelConfig.model_id)
        .join(ModelConfig, ModelConfig.provider_id == ModelProvider.id)
        .where(
            ModelProvider.enabled.is_(True),
            ModelConfig.enabled.is_(True),
            ModelConfig.pool_group == pool_group,
        )
        .order_by(ModelConfig.sort.asc(), ModelProvider.sort.asc(), ModelConfig.created_at.desc())
        .limit(1)
    )
    row = result.one_or_none()
    if not row:
        role = "默认文本模型" if pool_group == DEFAULT_TEXT_POOL else "默认多模态模型"
        raise UnprocessableEntityException(f"尚未在模型配置中设置{role}")
    return row[0], row[1]


async def get_default_text_model_from_config(db: AsyncSession):
    """Build the current system-default text model exclusively from the database."""
    provider_id, model_id = await _get_default_model_selection(db, DEFAULT_TEXT_POOL)
    return await get_text_model_from_config(db, provider_id, model_id)


async def get_default_image_model_from_config(db: AsyncSession):
    """Build the current system-default multimodal model from the database."""
    provider_id, model_id = await _get_default_model_selection(db, DEFAULT_IMAGE_POOL)
    return await get_text_model_from_config(db, provider_id, model_id)


async def get_default_text_model():
    """Resolve the latest database-selected text model for an agent run."""
    from app.config.database import async_session_factory

    async with async_session_factory() as db:
        return await get_default_text_model_from_config(db)


async def get_default_image_model():
    """Resolve the latest database-selected multimodal model for an agent run."""
    from app.config.database import async_session_factory

    async with async_session_factory() as db:
        return await get_default_image_model_from_config(db)
