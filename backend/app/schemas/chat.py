from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    content: str = Field(..., min_length=1, max_length=10000)

class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: UUID
    project_id: UUID
    user_id: UUID
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatHistoryResponse(BaseModel):
    """Schema for paginated chat history"""
    messages: List[ChatMessageResponse]
    total: int
    page: int
    page_size: int
    has_more: bool

class StreamChunk(BaseModel):
    """Schema for SSE streaming chunks"""
    content: str
    done: bool = False

class ClearChatResponse(BaseModel):
    """Schema for clear chat response"""
    message: str
    deleted_count: int
