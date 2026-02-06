"""Message embedding model for RAG with pgvector"""

from sqlalchemy import Column, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid

from app.database import Base
from app.config import settings


class MessageEmbedding(Base):
    """
    Message embedding model for RAG-based context retrieval.
    Stores embeddings of chat messages for semantic search using pgvector.
    """
    __tablename__ = "message_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False, unique=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)  # Original message content for reference
    embedding = Column(Vector(settings.EMBEDDING_DIMENSION), nullable=False)  # 1536 for text-embedding-3-small
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    project = relationship("Project")
    message = relationship("ChatMessage")
    agent = relationship("Agent")

    # Index for similarity search will be added in migration
    # (ivfflat or hnsw index on embedding column)
