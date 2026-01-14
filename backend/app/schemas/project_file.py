from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class ProjectFileBase(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    file_type: Optional[str] = None
    file_size: int = Field(..., gt=0)


class ProjectFileCreate(ProjectFileBase):
    openai_file_id: str
    project_id: UUID
    user_id: UUID


class ProjectFileResponse(ProjectFileBase):
    id: UUID
    project_id: UUID
    user_id: UUID
    openai_file_id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ProjectFileUploadResponse(BaseModel):
    message: str
    file: ProjectFileResponse
