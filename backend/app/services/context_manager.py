"""Context management service for handling prompts and shared context between agents"""

from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from uuid import UUID

from app.models import Agent, Project, ChatMessage, MessageRole


class ContextManager:
    """Manages context and prompt combining for agents"""

    def __init__(self, db: Session):
        self.db = db

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
        limit: int = 20
    ) -> Optional[str]:
        """
        Get shared context from other agents in the same project.
        Returns a summary of recent conversations from other agents.
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        
        # If context sharing is disabled, return None
        if not project or not project.enable_context_sharing:
            return None

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

    def format_context_for_llm(
        self,
        agent_id: UUID,
        current_messages: List[Dict],
        include_shared_context: bool = True
    ) -> List[Dict]:
        """
        Format complete context for LLM API call.
        Returns a list of message dictionaries ready for OpenAI API.
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
                shared_context = self.get_shared_context(agent.project_id, agent_id)
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
        """Save a chat message to database"""
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
        return message

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
