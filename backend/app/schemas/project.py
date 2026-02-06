from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, Literal, Any
from uuid import UUID


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    has_prompt: bool = False
    prompt_content: Optional[str] = None
    enable_context_sharing: bool = True
    context_source: Literal["recent", "rag"] = "recent"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    has_prompt: Optional[bool] = None
    prompt_content: Optional[str] = None
    enable_context_sharing: Optional[bool] = None
    context_source: Optional[Literal["recent", "rag"]] = None


class ProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    has_prompt: bool = False
    prompt_content: Optional[str] = None
    enable_context_sharing: bool = True
    context_source: Literal["recent", "rag"] = "recent"
    created_at: datetime
    updated_at: datetime
    agent_count: Optional[int] = 0

    @field_validator('context_source', mode='before')
    @classmethod
    def convert_enum_to_str(cls, v: Any) -> str:
        if hasattr(v, 'value'):
            return v.value
        return v

    class Config:
        from_attributes = True
