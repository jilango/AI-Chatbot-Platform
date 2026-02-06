"""Context management service for handling prompts and shared context between agents"""

import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from uuid import UUID

from app.models import Agent, Project, ChatMessage, MessageRole, ContextSource
from app.services.context_providers import RecencyProvider, RAGProvider, SharedContextProvider
from app.services.context_providers.rag_provider import EmbeddingService

logger = logging.getLogger(__name__)


class ContextManager:
    """Manages context and prompt combining for agents"""

    def __init__(self, db: Session):
        self.db = db
        self._providers: Dict[ContextSource, SharedContextProvider] = {}

    def _get_provider(self, context_source: ContextSource) -> SharedContextProvider:
        """
        Get or create the appropriate context provider.
        
        Args:
            context_source: The context source type (RECENT or RAG)
            
        Returns:
            The appropriate SharedContextProvider instance
        """
        if context_source not in self._providers:
            if context_source == ContextSource.RAG:
                self._providers[context_source] = RAGProvider(self.db)
            else:
                # Default to recency provider
                self._providers[context_source] = RecencyProvider(self.db)
        return self._providers[context_source]

    def build_system_prompt(self, agent_id: UUID) -> Optional[str]:
        """
        Build the system prompt by combining project and agent prompts.
        Returns None if neither project nor agent has a prompt.
        """
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            return None

        prompt_parts = []

        # If agent is part of a project and project has a prompt
        if agent.project_id:
            project = self.db.query(Project).filter(Project.id == agent.project_id).first()
            if project and project.has_prompt and project.prompt_content:
                prompt_parts.append(f"PROJECT CONTEXT:\n{project.prompt_content}")

        # If agent has its own prompt
        if agent.has_prompt and agent.prompt_content:
            prompt_parts.append(f"AGENT ROLE:\n{agent.prompt_content}")

        # Return combined prompt or None
        if not prompt_parts:
            return None

        return "\n\n".join(prompt_parts)

    def get_shared_context(
        self, 
        project_id: UUID, 
        current_agent_id: UUID,
        query: Optional[str] = None,
        limit: int = 20
    ) -> Optional[str]:
        """
        Get shared context from other agents in the same project.
        
        Uses the configured context provider (recency or RAG) based on project settings.
        The query parameter is used by the RAG provider for semantic search.
        
        Args:
            project_id: The project ID
            current_agent_id: The current agent ID (to exclude from results)
            query: Optional query string for semantic search (used by RAG)
            limit: Maximum number of messages/chunks to include
            
        Returns:
            Formatted shared context string, or None if unavailable
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        
        # Gate: If context sharing is disabled, return None
        if not project or not project.enable_context_sharing:
            return None

        # Get the appropriate provider based on project settings
        context_source = project.context_source or ContextSource.RECENT
        provider = self._get_provider(context_source)
        
        # Call the provider
        return provider.get_shared_context(
            project_id=project_id,
            current_agent_id=current_agent_id,
            query=query,
            limit=limit
        )

    def _extract_latest_user_message(self, messages: List[Dict]) -> Optional[str]:
        """
        Extract the latest user message from the message list.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            
        Returns:
            The content of the latest user message, or None if not found
        """
        for msg in reversed(messages):
            if msg.get("role") == "user":
                return msg.get("content")
        return None

    def format_context_for_llm(
        self,
        agent_id: UUID,
        current_messages: List[Dict],
        include_shared_context: bool = True
    ) -> List[Dict]:
        """
        Format complete context for LLM API call.
        Returns a list of message dictionaries ready for OpenAI API.
        
        Passes the latest user message as the query for RAG-based shared context.
        """
        formatted_messages = []

        # Add system prompt if exists
        system_prompt = self.build_system_prompt(agent_id)
        if system_prompt:
            formatted_messages.append({
                "role": "system",
                "content": system_prompt
            })

        # Add shared context if agent is in project and context sharing is enabled
        if include_shared_context:
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if agent and agent.project_id:
                # Extract latest user message for RAG query
                query = self._extract_latest_user_message(current_messages)
                
                shared_context = self.get_shared_context(
                    agent.project_id, 
                    agent_id,
                    query=query  # Pass query for RAG
                )
                if shared_context:
                    formatted_messages.append({
                        "role": "system",
                        "content": shared_context
                    })

        # Add current conversation messages
        formatted_messages.extend(current_messages)

        return formatted_messages

    def get_agent_history(
        self,
        agent_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatMessage]:
        """Get chat history for a specific agent"""
        messages = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.agent_id == agent_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return list(reversed(messages))  # Return chronologically

    def get_temp_chat_history(
        self,
        temp_chat_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatMessage]:
        """Get chat history for a temporary chat"""
        messages = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.temp_chat_id == temp_chat_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return list(reversed(messages))  # Return chronologically

    def save_message(
        self,
        user_id: UUID,
        role: MessageRole,
        content: str,
        agent_id: Optional[UUID] = None,
        temp_chat_id: Optional[UUID] = None
    ) -> ChatMessage:
        """
        Save a chat message to database.
        
        If the message belongs to an agent with RAG-enabled context sharing,
        the message will also be indexed for semantic search.
        """
        message = ChatMessage(
            user_id=user_id,
            agent_id=agent_id,
            temp_chat_id=temp_chat_id,
            role=role,
            content=content
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        
        # Trigger RAG indexing if applicable
        if agent_id:
            self._maybe_index_for_rag(message, agent_id)
        
        return message
    
    def _maybe_index_for_rag(self, message: ChatMessage, agent_id: UUID) -> None:
        """
        Index the message for RAG if the project has RAG context enabled.
        
        Args:
            message: The message to potentially index
            agent_id: The agent ID the message belongs to
        """
        try:
            # Get the agent and its project
            agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent or not agent.project_id:
                return
            
            project = self.db.query(Project).filter(Project.id == agent.project_id).first()
            if not project:
                return
            
            # Check if RAG indexing is enabled for this project
            if not project.enable_context_sharing:
                return
            if project.context_source != ContextSource.RAG:
                return
            
            # Index the message
            embedding_service = EmbeddingService(self.db)
            embedding_service.index_message(
                message_id=message.id,
                agent_id=agent_id,
                project_id=project.id,
                content=message.content
            )
            logger.debug(f"Indexed message {message.id} for RAG")
            
        except Exception as e:
            # Don't fail the save operation if indexing fails
            logger.error(f"Error indexing message for RAG: {e}")

    def clear_agent_history(self, agent_id: UUID) -> int:
        """Clear all messages for an agent. Returns number of deleted messages."""
        count = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.agent_id == agent_id)
            .delete()
        )
        self.db.commit()
        return count

    def clear_temp_chat_history(self, temp_chat_id: UUID) -> int:
        """Clear all messages for a temporary chat. Returns number of deleted messages."""
        count = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.temp_chat_id == temp_chat_id)
            .delete()
        )
        self.db.commit()
        return count
