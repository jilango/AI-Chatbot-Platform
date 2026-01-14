from sqlalchemy import Column, Text, DateTime, ForeignKey, Enum, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class MessageRole(str, enum.Enum):
    """Message role enum"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    
    def __str__(self):
        return self.value


class ChatMessage(Base):
    """Chat message model - messages belong to either an agent or temporary chat"""
    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint(
            '(agent_id IS NOT NULL AND temp_chat_id IS NULL) OR (agent_id IS NULL AND temp_chat_id IS NOT NULL)',
            name='chat_messages_exactly_one_parent'
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=True)
    temp_chat_id = Column(UUID(as_uuid=True), ForeignKey("temporary_chats.id", ondelete="CASCADE"), nullable=True)
    role = Column(Enum(MessageRole, name='message_role_enum', create_constraint=True, native_enum=True, values_callable=lambda x: [str(e.value) for e in x]), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    agent = relationship("Agent", back_populates="chat_messages")
    temporary_chat = relationship("TemporaryChat", back_populates="chat_messages")
