from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from app.models.chat_message import MessageRole


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class ChatMessageResponse(BaseModel):
    id: UUID
    user_id: UUID
    agent_id: Optional[UUID] = None
    temp_chat_id: Optional[UUID] = None
    role: MessageRole
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]
    total: int
    
    
class StreamChunk(BaseModel):
    """Chunk of streaming data"""
    content: str
    done: bool = False
