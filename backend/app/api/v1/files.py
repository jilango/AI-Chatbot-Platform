import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User, Project, ProjectFile
from app.schemas.project_file import ProjectFileResponse, ProjectFileUploadResponse
from app.api.deps import get_current_user
from app.services.file_service import (
    file_service,
    sanitize_filename,
    ALLOWED_EXTENSIONS,
)
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/project/{project_id}/upload", response_model=ProjectFileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a file to a project using OpenAI Files API"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Validate file size
    if not file_service.validate_file_size(file_size):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )

    # Sanitize filename and validate extension
    raw_filename = file.filename or "untitled"
    safe_filename = sanitize_filename(raw_filename)
    if not safe_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename",
        )
    if not file_service.is_allowed_extension(safe_filename):
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {allowed}",
        )

    # Upload to OpenAI
    try:
        openai_file_id = await file_service.upload_file(
            file_content=file_content,
            filename=safe_filename,
            purpose="assistants"
        )
    except Exception:
        logger.exception("OpenAI file upload failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File upload failed. Please try again.",
        )

    # Get file type and save metadata to database
    file_type = file_service.get_file_type(safe_filename)
    project_file = ProjectFile(
        project_id=project_id,
        user_id=current_user.id,
        openai_file_id=openai_file_id,
        filename=safe_filename,
        file_type=file_type,
        file_size=file_size
    )
    
    db.add(project_file)
    db.commit()
    db.refresh(project_file)
    
    return ProjectFileUploadResponse(
        message="File uploaded successfully",
        file=ProjectFileResponse.model_validate(project_file)
    )


@router.get("/project/{project_id}", response_model=List[ProjectFileResponse])
async def list_project_files(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all files for a project"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get all files for the project
    files = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id
    ).order_by(ProjectFile.uploaded_at.desc()).all()
    
    return [ProjectFileResponse.model_validate(f) for f in files]


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a file from both OpenAI and database"""
    # Get file and verify ownership
    project_file = db.query(ProjectFile).filter(
        ProjectFile.id == file_id,
        ProjectFile.user_id == current_user.id
    ).first()
    
    if not project_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Delete from OpenAI
    try:
        await file_service.delete_file(project_file.openai_file_id)
    except Exception as e:
        # Log error but continue with database deletion
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to delete file from OpenAI: {str(e)}")
        # Still delete from database to maintain consistency
    
    # Delete from database
    db.delete(project_file)
    db.commit()
    
    return None
