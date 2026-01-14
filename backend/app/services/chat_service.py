from typing import List, Dict, AsyncGenerator, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc
from openai import AsyncOpenAI
from app.config import settings
from app.models.chat_message import ChatMessage
from app.models.prompt import Prompt
from app.models.project import Project
import logging

logger = logging.getLogger(__name__)

class ChatService:
    """Service for handling chat operations with OpenAI integration"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
    
    async def get_project_context(
        self,
        db: Session,
        project_id: UUID,
        user_id: UUID,
        message_limit: int = 10
    ) -> Dict:
        """
        Get project context including system prompts and recent chat history
        
        Args:
            db: Database session
            project_id: Project UUID
            user_id: User UUID
            message_limit: Number of recent messages to include
            
        Returns:
            Dict with system_prompt and messages list
        """
        # Verify project belongs to user
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == user_id
        ).first()
        
        if not project:
            raise ValueError("Project not found or access denied")
        
        # Get system prompts
        system_prompts = db.query(Prompt).filter(
            Prompt.project_id == project_id,
            Prompt.is_system_prompt == True
        ).all()
        
        # Combine system prompts
        system_prompt_content = "\n\n".join([p.content for p in system_prompts]) if system_prompts else "You are a helpful AI assistant."
        
        # Get recent chat history
        recent_messages = db.query(ChatMessage).filter(
            ChatMessage.project_id == project_id
        ).order_by(desc(ChatMessage.created_at)).limit(message_limit).all()
        
        # Reverse to get chronological order
        recent_messages.reverse()
        
        # Build messages list for OpenAI
        messages = [{"role": "system", "content": system_prompt_content}]
        
        for msg in recent_messages:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        return {
            "system_prompt": system_prompt_content,
            "messages": messages,
            "project": project
        }
    
    async def stream_chat_response(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini"
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response from OpenAI
        
        Args:
            messages: List of message dicts with role and content
            model: OpenAI model to use
            
        Yields:
            Content chunks as they arrive from OpenAI
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2000
            )
            
            async for chunk in stream:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        yield delta.content
                        
        except Exception as e:
            logger.error(f"Error streaming from OpenAI: {str(e)}")
            raise
    
    def save_message(
        self,
        db: Session,
        project_id: UUID,
        user_id: UUID,
        role: str,
        content: str
    ) -> ChatMessage:
        """
        Save a chat message to the database
        
        Args:
            db: Database session
            project_id: Project UUID
            user_id: User UUID
            role: Message role ('user' or 'assistant')
            content: Message content
            
        Returns:
            Created ChatMessage instance
        """
        message = ChatMessage(
            project_id=project_id,
            user_id=user_id,
            role=role,
            content=content
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return message
    
    def get_chat_history(
        self,
        db: Session,
        project_id: UUID,
        user_id: UUID,
        page: int = 1,
        page_size: int = 50
    ) -> Dict:
        """
        Get paginated chat history for a project
        
        Args:
            db: Database session
            project_id: Project UUID
            user_id: User UUID
            page: Page number (1-indexed)
            page_size: Number of messages per page
            
        Returns:
            Dict with messages, total count, and pagination info
        """
        # Verify project access
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == user_id
        ).first()
        
        if not project:
            raise ValueError("Project not found or access denied")
        
        # Get total count
        total = db.query(ChatMessage).filter(
            ChatMessage.project_id == project_id
        ).count()
        
        # Get paginated messages
        offset = (page - 1) * page_size
        messages = db.query(ChatMessage).filter(
            ChatMessage.project_id == project_id
        ).order_by(ChatMessage.created_at).offset(offset).limit(page_size).all()
        
        has_more = (offset + len(messages)) < total
        
        return {
            "messages": messages,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_more": has_more
        }
    
    def clear_chat_history(
        self,
        db: Session,
        project_id: UUID,
        user_id: UUID
    ) -> int:
        """
        Clear all chat messages for a project
        
        Args:
            db: Database session
            project_id: Project UUID
            user_id: User UUID
            
        Returns:
            Number of messages deleted
        """
        # Verify project access
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.user_id == user_id
        ).first()
        
        if not project:
            raise ValueError("Project not found or access denied")
        
        # Delete all messages
        deleted_count = db.query(ChatMessage).filter(
            ChatMessage.project_id == project_id
        ).delete()
        
        db.commit()
        
        return deleted_count

# Create a singleton instance
chat_service = ChatService()
