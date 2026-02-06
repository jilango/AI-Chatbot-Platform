"""Base interface for shared context providers"""

from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session


class SharedContextProvider(ABC):
    """
    Abstract base class for shared context providers.
    
    Implementations can retrieve shared context using different strategies:
    - RecencyProvider: Returns the most recent N messages from other agents
    - RAGProvider: Uses semantic search to find relevant context
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    @abstractmethod
    def get_shared_context(
        self,
        project_id: UUID,
        current_agent_id: UUID,
        query: Optional[str] = None,
        limit: int = 20
    ) -> Optional[str]:
        """
        Get shared context from other agents in the same project.
        
        Args:
            project_id: The project ID to get shared context for
            current_agent_id: The current agent ID (to exclude from results)
            query: Optional query string for semantic search (used by RAG provider)
            limit: Maximum number of messages/chunks to include
            
        Returns:
            Formatted string containing shared context, or None if no context available
        """
        pass
