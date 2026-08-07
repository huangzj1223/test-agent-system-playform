"""Model-backed chat streaming for the AG-UI conversation entrypoint."""

from collections.abc import AsyncIterator
from uuid import UUID

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llms import get_default_text_model_from_config, get_text_model_from_config
from app.utils.exceptions import BadRequestException


def chunk_text(content) -> str:
    """Normalize LangChain text and content-block chunks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and isinstance(block.get("text"), str):
                parts.append(block["text"])
        return "".join(parts)
    return ""


class ModelChatService:
    """Resolve configured models and expose a provider-neutral text stream."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def stream_reply(
        self,
        *,
        messages: list[dict],
        memory_context: str,
        provider_id: UUID | None,
        model_id: str | None,
    ) -> AsyncIterator[str]:
        if provider_id and not model_id:
            raise BadRequestException("选择模型服务商后必须同时选择模型")
        model = (
            await get_text_model_from_config(self.db, provider_id, model_id)
            if provider_id and model_id
            else await get_default_text_model_from_config(self.db)
        )

        runtime_messages = []
        if memory_context:
            runtime_messages.append(SystemMessage(content=f"以下是已授权的记忆上下文：\n{memory_context}"))
        for item in messages:
            role = item.get("role")
            content = str(item.get("content") or "")
            if role == "assistant":
                runtime_messages.append(AIMessage(content=content))
            elif role == "system":
                runtime_messages.append(SystemMessage(content=content))
            elif role == "user":
                runtime_messages.append(HumanMessage(content=content))

        async for chunk in model.astream(runtime_messages):
            text = chunk_text(getattr(chunk, "content", chunk))
            if text:
                yield text
