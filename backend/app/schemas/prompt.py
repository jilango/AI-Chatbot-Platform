from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class PromptBase(BaseModel):
    name: Optional[str] = None
    content: str
    is_system_prompt: bool = False

class PromptCreate(PromptBase):
    project_id: UUID

class PromptUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    is_system_prompt: Optional[bool] = None

class PromptResponse(PromptBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
