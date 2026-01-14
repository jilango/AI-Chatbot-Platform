from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID
from app.models.agent import AgentType


class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    agent_type: AgentType
    project_id: Optional[UUID] = None
    has_prompt: bool = False
    prompt_content: Optional[str] = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    has_prompt: Optional[bool] = None
    prompt_content: Optional[str] = None


class AgentResponse(AgentBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None

    class Config:
        from_attributes = True
