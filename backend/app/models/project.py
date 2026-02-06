from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.database import Base


class ContextSource(str, enum.Enum):
    """Context source enum - determines how shared context is retrieved"""
    RECENT = "recent"  # Use recency-based context (last N messages)
    RAG = "rag"  # Use RAG-based context (semantic search)
    
    def __str__(self):
        return self.value


class Project(Base):
    """Project model - represents a folder/container for multiple agents"""
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    has_prompt = Column(Boolean, default=False, nullable=False)
    prompt_content = Column(Text, nullable=True)
    enable_context_sharing = Column(Boolean, default=True, nullable=False)
    context_source = Column(
        Enum(ContextSource, name='context_source_enum', create_constraint=True, native_enum=True, 
             values_callable=lambda x: [str(e.value) for e in x]),
        default=ContextSource.RECENT,
        nullable=False,
        server_default="recent"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="projects")
    agents = relationship("Agent", back_populates="project", cascade="all, delete-orphan")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
