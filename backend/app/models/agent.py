from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class AgentType(str, enum.Enum):
    """Agent type enum"""
    STANDALONE = "standalone"
    PROJECT_AGENT = "project_agent"
    
    def __str__(self):
        return self.value


class Agent(Base):
    """Agent model - represents an AI chat assistant"""
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    agent_type = Column(Enum(AgentType, name='agent_type_enum', create_constraint=True, native_enum=True, values_callable=lambda x: [str(e.value) for e in x]), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    has_prompt = Column(Boolean, default=False, nullable=False)
    prompt_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="agents")
    project = relationship("Project", back_populates="agents")
    chat_messages = relationship("ChatMessage", back_populates="agent", cascade="all, delete-orphan")
