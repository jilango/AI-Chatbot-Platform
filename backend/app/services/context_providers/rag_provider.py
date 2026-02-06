"""RAG-based shared context provider using pgvector"""

import logging
from typing import Optional, List
from uuid import UUID
from sqlalchemy import and_

from openai import OpenAI

from app.services.context_providers.base import SharedContextProvider
from app.models import Agent, MessageEmbedding
from app.config import settings

logger = logging.getLogger(__name__)


class RAGProvider(SharedContextProvider):
    """
    RAG-based shared context provider using pgvector.
    
    Uses semantic search to find relevant context from other agents
    in the same project based on the current query.
    """
    
    def __init__(self, db):
        super().__init__(db)
        self._openai_client = None
    
    @property
    def openai_client(self) -> OpenAI:
        """Lazy-load OpenAI client"""
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client
    
    def _get_embedding(self, text: str) -> List[float]:
        """
        Get embedding for text using OpenAI API.
        
        Args:
            text: The text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            response = self.openai_client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise
    
    def get_shared_context(
        self,
        project_id: UUID,
        current_agent_id: UUID,
        query: Optional[str] = None,
        limit: int = 10  # Default to 10 for RAG (semantic chunks)
    ) -> Optional[str]:
        """
        Get shared context using semantic search.
        
        Args:
            project_id: The project ID to search within
            current_agent_id: The current agent ID (to optionally exclude)
            query: The query string to search for (required for RAG)
            limit: Maximum number of results to return
            
        Returns:
            Formatted string containing relevant context, or None if no results
        """
        if not query:
            logger.debug("No query provided for RAG search, returning None")
            return None
        
        try:
            # Get query embedding
            query_embedding = self._get_embedding(query)
            
            # Get other agents in the project (for filtering and labeling)
            other_agents = self.db.query(Agent).filter(
                and_(
                    Agent.project_id == project_id,
                    Agent.id != current_agent_id
                )
            ).all()
            
            if not other_agents:
                return None
            
            other_agent_ids = [agent.id for agent in other_agents]
            
            # Search for similar embeddings using pgvector
            # Using cosine distance (<=>), lower is more similar
            similar_embeddings = (
                self.db.query(MessageEmbedding)
                .filter(
                    and_(
                        MessageEmbedding.project_id == project_id,
                        MessageEmbedding.agent_id.in_(other_agent_ids)
                    )
                )
                .order_by(MessageEmbedding.embedding.cosine_distance(query_embedding))
                .limit(limit)
                .all()
            )
            
            if not similar_embeddings:
                logger.debug(f"No embeddings found for project {project_id}")
                return None
            
            # Format results as context
            context_parts = ["SHARED CONTEXT FROM OTHER AGENTS IN PROJECT (semantic search):"]
            
            for emb in similar_embeddings:
                agent = next((a for a in other_agents if a.id == emb.agent_id), None)
                agent_name = agent.name if agent else "Unknown Agent"
                # Include full content (already stored in the embedding record)
                context_parts.append(f"[{agent_name}]: {emb.content}")
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Error in RAG search: {e}")
            # Fall back to None on error (caller can decide to use recency instead)
            return None


class EmbeddingService:
    """
    Service for managing message embeddings.
    
    Used to index messages into the vector store.
    """
    
    def __init__(self, db):
        self.db = db
        self._openai_client = None
    
    @property
    def openai_client(self) -> OpenAI:
        """Lazy-load OpenAI client"""
        if self._openai_client is None:
            self._openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client
    
    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text using OpenAI API."""
        try:
            response = self.openai_client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error getting embedding: {e}")
            raise
    
    def index_message(
        self,
        message_id: UUID,
        agent_id: UUID,
        project_id: UUID,
        content: str
    ) -> Optional[MessageEmbedding]:
        """
        Index a message by creating its embedding.
        
        Args:
            message_id: The ID of the message to index
            agent_id: The agent ID this message belongs to
            project_id: The project ID
            content: The message content to embed
            
        Returns:
            The created MessageEmbedding, or None on error
        """
        try:
            # Check if already indexed
            existing = (
                self.db.query(MessageEmbedding)
                .filter(MessageEmbedding.message_id == message_id)
                .first()
            )
            if existing:
                logger.debug(f"Message {message_id} already indexed")
                return existing
            
            # Get embedding
            embedding = self._get_embedding(content)
            
            # Create embedding record
            message_embedding = MessageEmbedding(
                project_id=project_id,
                message_id=message_id,
                agent_id=agent_id,
                content=content,
                embedding=embedding
            )
            
            self.db.add(message_embedding)
            self.db.commit()
            self.db.refresh(message_embedding)
            
            logger.debug(f"Indexed message {message_id} for project {project_id}")
            return message_embedding
            
        except Exception as e:
            logger.error(f"Error indexing message {message_id}: {e}")
            self.db.rollback()
            return None
    
    def delete_message_embedding(self, message_id: UUID) -> bool:
        """
        Delete the embedding for a message.
        
        Args:
            message_id: The message ID whose embedding to delete
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            count = (
                self.db.query(MessageEmbedding)
                .filter(MessageEmbedding.message_id == message_id)
                .delete()
            )
            self.db.commit()
            return count > 0
        except Exception as e:
            logger.error(f"Error deleting embedding for message {message_id}: {e}")
            self.db.rollback()
            return False
