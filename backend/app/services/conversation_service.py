"""Conversation persistence service."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import ChatMessage, Conversation
from app.schemas.agui import ChatMessageInfo, ConversationDetail, ConversationInfo
from app.utils.exceptions import NotFoundException


class ConversationService:
    """CRUD helpers for conversations and messages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_conversations(self, user_id: UUID) -> list[ConversationInfo]:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc().nullslast(), Conversation.created_at.desc())
        )
        return [ConversationInfo.model_validate(row, from_attributes=True) for row in result.scalars().all()]

    async def create_conversation(self, user_id: UUID, title: str) -> ConversationInfo:
        conversation = Conversation(user_id=user_id, title=title)
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return ConversationInfo.model_validate(conversation, from_attributes=True)

    async def ensure_conversation(self, user_id: UUID, conversation_id: UUID | None, title: str) -> UUID:
        if conversation_id:
            await self.get_conversation(user_id, conversation_id)
            return conversation_id
        created = await self.create_conversation(user_id, title)
        return created.id

    async def get_conversation(self, user_id: UUID, conversation_id: UUID) -> ConversationDetail:
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .options(selectinload(Conversation.messages))
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise NotFoundException(resource_type="会话", resource_id=str(conversation_id))
        return ConversationDetail(
            id=conversation.id,
            user_id=conversation.user_id,
            title=conversation.title,
            status=conversation.status,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            messages=[
                ChatMessageInfo.model_validate(message, from_attributes=True)
                for message in conversation.messages
            ],
        )

    async def save_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        blocks: list | None = None,
        tool_calls: list | None = None,
    ) -> ChatMessageInfo:
        message = ChatMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            blocks=blocks or [],
            tool_calls=tool_calls or [],
        )
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return ChatMessageInfo.model_validate(message, from_attributes=True)
