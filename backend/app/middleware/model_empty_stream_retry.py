"""模型空流式响应重试：修复 DeepSeek v4 等返回空 stream 时的 ValueError。"""

from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse

logger = logging.getLogger(__name__)

_EMPTY_STREAM_MSG = "No generations found in stream."


class ModelEmptyStreamRetryMiddleware(AgentMiddleware):
    """当 LLM 流式响应为空时自动重试（常见于 API 瞬时故障或 v4 思考模式边界）。"""

    def __init__(self, max_retries: int = 3, retry_delay_seconds: float = 1.0) -> None:
        super().__init__()
        self.max_retries = max(1, max_retries)
        self.retry_delay_seconds = retry_delay_seconds

    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], Awaitable[ModelResponse]],
    ) -> ModelResponse:
        last_exc: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return await handler(request)
            except ValueError as exc:
                if _EMPTY_STREAM_MSG not in str(exc):
                    raise
                last_exc = exc
                logger.warning(
                    "模型返回空 stream（第 %d/%d 次），%ss 后重试",
                    attempt,
                    self.max_retries,
                    self.retry_delay_seconds,
                )
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay_seconds)
        assert last_exc is not None
        raise last_exc

    def wrap_model_call(self, request: ModelRequest, handler):
        last_exc: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return handler(request)
            except ValueError as exc:
                if _EMPTY_STREAM_MSG not in str(exc):
                    raise
                last_exc = exc
                logger.warning(
                    "模型返回空 stream（第 %d/%d 次），%ss 后重试",
                    attempt,
                    self.max_retries,
                    self.retry_delay_seconds,
                )
                if attempt < self.max_retries:
                    import time

                    time.sleep(self.retry_delay_seconds)
        assert last_exc is not None
        raise last_exc
