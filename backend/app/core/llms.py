"""
大语言模型统一配置中心。

采用具体 SDK 类创建模型，确保可控性和兼容性：
- 文本模型：ChatDeepSeek（深度求索）— 支持思考模式 / 非思考模式
- 图片/多模态模型：ChatOpenAI（OpenAI 兼容接口，如豆包、阿里云等）
"""

import logging
from functools import lru_cache
from typing import Any

from langchain_core.language_models import LanguageModelInput, ModelProfile
from langchain_core.messages import AIMessage

from app.config.settings import settings

logger = logging.getLogger(__name__)


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
    """创建文本处理模型（DeepSeek）。

    适用于纯文本对话、代码生成、测试用例设计、策略分析等场景。
    支持思考模式（LLM_THINKING_ENABLED=true）和非思考模式。

    Returns:
        配置好 ModelProfile 的 ChatDeepSeek 实例
    """
    from langchain_deepseek import ChatDeepSeek
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
        # 非思考模式下 temperature 等采样参数生效；思考模式下 API 会忽略
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
        logger.info(f"Text model ready: deepseek/{settings.llm_model} (mode={mode_label})")
        return model
    except ImportError:
        logger.error("langchain_deepseek not installed. Run: pip install langchain-deepseek")
        raise
    except Exception as e:
        logger.error(f"Failed to create text model: {e}")
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


# ============================================================================
# 全局模型实例（供各 Agent 直接导入使用）
# ============================================================================
text_model = get_text_model()
image_model = get_image_model()
