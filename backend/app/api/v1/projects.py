from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User, Project, Agent
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects for the current user"""
    projects = db.query(Project).filter(Project.user_id == current_user.id).all()
    
    # Add agent count to each project
    result = []
    for project in projects:
        agent_count = db.query(Agent).filter(Agent.project_id == project.id).count()
        project_dict = ProjectResponse.from_orm(project).dict()
        project_dict['agent_count'] = agent_count
        result.append(ProjectResponse(**project_dict))
    
    return result


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    project = Project(
        user_id=current_user.id,
        **project_data.dict()
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['agent_count'] = 0
    return ProjectResponse(**project_dict)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    agent_count = db.query(Agent).filter(Agent.project_id == project.id).count()
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['agent_count'] = agent_count
    return ProjectResponse(**project_dict)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update only provided fields
    update_data = project_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    agent_count = db.query(Agent).filter(Agent.project_id == project.id).count()
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['agent_count'] = agent_count
    return ProjectResponse(**project_dict)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project and all its agents"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/agents", response_model=List)
async def list_project_agents(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agents in a project"""
    from app.schemas.agent import AgentResponse
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    agents = db.query(Agent).filter(Agent.project_id == project_id).all()
    
    result = []
    for agent in agents:
        agent_dict = AgentResponse.from_orm(agent).dict()
        agent_dict['project_name'] = project.name
        result.append(AgentResponse(**agent_dict))
    
    return result


@router.put("/{project_id}/context-sharing", response_model=ProjectResponse)
async def toggle_context_sharing(
    project_id: UUID,
    enable: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle context sharing for a project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    project.enable_context_sharing = enable
    db.commit()
    db.refresh(project)
    
    agent_count = db.query(Agent).filter(Agent.project_id == project.id).count()
    project_dict = ProjectResponse.from_orm(project).dict()
    project_dict['agent_count'] = agent_count
    return ProjectResponse(**project_dict)
