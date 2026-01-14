from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.models import User, TemporaryChat
from app.schemas.temporary_chat import TemporaryChatCreate, TemporaryChatResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.post("", response_model=TemporaryChatResponse, status_code=status.HTTP_201_CREATED)
async def create_temporary_chat(
    temp_chat_data: TemporaryChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new temporary chat"""
    temp_chat = TemporaryChat(
        user_id=current_user.id,
        session_id=temp_chat_data.session_id
    )
    db.add(temp_chat)
    db.commit()
    db.refresh(temp_chat)
    
    return TemporaryChatResponse.from_orm(temp_chat)


@router.get("/{temp_chat_id}", response_model=TemporaryChatResponse)
async def get_temporary_chat(
    temp_chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a temporary chat"""
    temp_chat = db.query(TemporaryChat).filter(
        TemporaryChat.id == temp_chat_id,
        TemporaryChat.user_id == current_user.id
    ).first()
    
    if not temp_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary chat not found"
        )
    
    return TemporaryChatResponse.from_orm(temp_chat)


@router.delete("/{temp_chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_temporary_chat(
    temp_chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a temporary chat"""
    temp_chat = db.query(TemporaryChat).filter(
        TemporaryChat.id == temp_chat_id,
        TemporaryChat.user_id == current_user.id
    ).first()
    
    if not temp_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary chat not found"
        )
    
    db.delete(temp_chat)
    db.commit()
    return None


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cleanup_session_chats(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all temporary chats for a session"""
    temp_chats = db.query(TemporaryChat).filter(
        TemporaryChat.session_id == session_id,
        TemporaryChat.user_id == current_user.id
    ).all()
    
    for temp_chat in temp_chats:
        db.delete(temp_chat)
    
    db.commit()
    return None
