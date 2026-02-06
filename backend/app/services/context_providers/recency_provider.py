"""Recency-based shared context provider"""

from typing import Optional
from uuid import UUID
from sqlalchemy import and_

from app.services.context_providers.base import SharedContextProvider
from app.models import Agent, ChatMessage, MessageRole


class RecencyProvider(SharedContextProvider):
    """
    Recency-based shared context provider.
    
    Returns the most recent N messages from other agents in the same project.
    This is the original/default implementation for shared context.
    """
    
    def get_shared_context(
        self,
        project_id: UUID,
        current_agent_id: UUID,
        query: Optional[str] = None,  # Ignored by recency provider
        limit: int = 20
    ) -> Optional[str]:
        """
        Get shared context from other agents based on recency.
        
        Returns the most recent messages from other agents in the project,
        regardless of the query content.
        """
        # Get other agents in the project
        other_agents = self.db.query(Agent).filter(
            and_(
                Agent.project_id == project_id,
                Agent.id != current_agent_id
            )
        ).all()

        if not other_agents:
            return None

        # Get recent messages from other agents
        other_agent_ids = [agent.id for agent in other_agents]
        
        recent_messages = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.agent_id.in_(other_agent_ids))
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )

        if not recent_messages:
            return None

        # Format as context summary
        context_parts = ["SHARED CONTEXT FROM OTHER AGENTS IN PROJECT:"]
        for msg in reversed(recent_messages):  # Show chronologically
            agent = next((a for a in other_agents if a.id == msg.agent_id), None)
            agent_name = agent.name if agent else "Unknown Agent"
            role_label = "User" if msg.role == MessageRole.USER else "Assistant"
            context_parts.append(f"[{agent_name} - {role_label}]: {msg.content[:200]}")

        return "\n".join(context_parts)
