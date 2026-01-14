from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User, Agent, Project, AgentType
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=List[AgentResponse])
async def list_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all agents (standalone + project agents) for the current user"""
    agents = db.query(Agent).filter(Agent.user_id == current_user.id).all()
    
    result = []
    for agent in agents:
        agent_dict = AgentResponse.from_orm(agent).dict()
        if agent.project_id:
            project = db.query(Project).filter(Project.id == agent.project_id).first()
            agent_dict['project_name'] = project.name if project else None
        result.append(AgentResponse(**agent_dict))
    
    return result


@router.get("/standalone", response_model=List[AgentResponse])
async def list_standalone_agents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List only standalone agents for the current user"""
    agents = db.query(Agent).filter(
        Agent.user_id == current_user.id,
        Agent.agent_type == AgentType.STANDALONE
    ).all()
    
    return [AgentResponse.from_orm(agent) for agent in agents]


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent_data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new agent (standalone or in a project)"""
    # Validate project ownership if agent is being added to a project
    if agent_data.project_id:
        project = db.query(Project).filter(
            Project.id == agent_data.project_id,
            Project.user_id == current_user.id
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Ensure agent_type is project_agent if project_id is provided
        if agent_data.agent_type != AgentType.PROJECT_AGENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent type must be 'project_agent' when project_id is provided"
            )
    else:
        # Ensure agent_type is standalone if no project_id
        if agent_data.agent_type != AgentType.STANDALONE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent type must be 'standalone' when no project_id is provided"
            )
    
    agent = Agent(
        user_id=current_user.id,
        **agent_data.dict()
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    agent_dict = AgentResponse.from_orm(agent).dict()
    if agent.project_id:
        project = db.query(Project).filter(Project.id == agent.project_id).first()
        agent_dict['project_name'] = project.name if project else None
    
    return AgentResponse(**agent_dict)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    agent_dict = AgentResponse.from_orm(agent).dict()
    if agent.project_id:
        project = db.query(Project).filter(Project.id == agent.project_id).first()
        agent_dict['project_name'] = project.name if project else None
    
    return AgentResponse(**agent_dict)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Update only provided fields
    update_data = agent_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)
    
    db.commit()
    db.refresh(agent)
    
    agent_dict = AgentResponse.from_orm(agent).dict()
    if agent.project_id:
        project = db.query(Project).filter(Project.id == agent.project_id).first()
        agent_dict['project_name'] = project.name if project else None
    
    return AgentResponse(**agent_dict)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    db.delete(agent)
    db.commit()
    return None
