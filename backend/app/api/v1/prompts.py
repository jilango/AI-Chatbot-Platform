from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptResponse

router = APIRouter()

@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_data: PromptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a prompt for a project"""
    # Verify project ownership
    project = db.query(Project).filter(
        Project.id == prompt_data.project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    prompt = Prompt(
        project_id=prompt_data.project_id,
        name=prompt_data.name,
        content=prompt_data.content,
        is_system_prompt=prompt_data.is_system_prompt
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt

@router.get("/project/{project_id}", response_model=List[PromptResponse])
async def list_prompts(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all prompts for a project"""
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
    
    prompts = db.query(Prompt).filter(Prompt.project_id == project_id).all()
    return prompts

@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific prompt"""
    prompt = db.query(Prompt).join(Project).filter(
        Prompt.id == prompt_id,
        Project.user_id == current_user.id
    ).first()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )
    
    return prompt

@router.put("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: UUID,
    prompt_data: PromptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a prompt"""
    prompt = db.query(Prompt).join(Project).filter(
        Prompt.id == prompt_id,
        Project.user_id == current_user.id
    ).first()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )
    
    if prompt_data.name is not None:
        prompt.name = prompt_data.name
    if prompt_data.content is not None:
        prompt.content = prompt_data.content
    if prompt_data.is_system_prompt is not None:
        prompt.is_system_prompt = prompt_data.is_system_prompt
    
    db.commit()
    db.refresh(prompt)
    return prompt

@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a prompt"""
    prompt = db.query(Prompt).join(Project).filter(
        Prompt.id == prompt_id,
        Project.user_id == current_user.id
    ).first()
    
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )
    
    db.delete(prompt)
    db.commit()
    return None
