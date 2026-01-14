from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class TemporaryChatCreate(BaseModel):
    session_id: str


class TemporaryChatResponse(BaseModel):
    id: UUID
    user_id: UUID
    session_id: str
    created_at: datetime

    class Config:
        from_attributes = True
