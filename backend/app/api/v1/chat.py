from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import AsyncGenerator, List, Optional
from uuid import UUID
import json
import asyncio

from app.database import get_db
from app.models import User, Agent, TemporaryChat, MessageRole
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatHistoryResponse
from app.api.deps import get_current_user
from app.config import settings
from app.services.context_manager import ContextManager
from app.services.chat_service import stream_openai_response

router = APIRouter()


async def create_sse_generator(
    context_manager: ContextManager,
    agent_id: UUID = None,
    temp_chat_id: UUID = None,
    user_id: UUID = None,
    message: str = ""
) -> AsyncGenerator[str, None]:
    """Generate SSE stream for chat responses"""
    try:
        # Get chat history
        if agent_id:
            history = context_manager.get_agent_history(agent_id, limit=20)
        else:
            history = context_manager.get_temp_chat_history(temp_chat_id, limit=20)
        
        # Convert history to message format
        messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in history
        ]
        
        # Add current user message
        messages.append({"role": "user", "content": message})
        
        # Format with context if agent
        if agent_id:
            messages = context_manager.format_context_for_llm(agent_id, messages)
        
        # Save user message
        context_manager.save_message(
            user_id=user_id,
            role=MessageRole.USER,
            content=message,
            agent_id=agent_id,
            temp_chat_id=temp_chat_id
        )
        
        # Stream AI response
        full_response = ""
        async for chunk in stream_openai_response(messages):
            full_response += chunk
            data = json.dumps({"type": "token", "content": chunk})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.01)  # Small delay for smooth streaming
        
        # Save assistant message
        context_manager.save_message(
            user_id=user_id,
            role=MessageRole.ASSISTANT,
            content=full_response,
            agent_id=agent_id,
            temp_chat_id=temp_chat_id
        )
        
        # Send done signal
        data = json.dumps({"type": "done"})
        yield f"data: {data}\n\n"
        
    except Exception as e:
        error_data = json.dumps({"type": "error", "content": str(e)})
        yield f"data: {error_data}\n\n"


@router.get("/agent/{agent_id}/stream")
async def stream_agent_chat(
    request: Request,
    agent_id: UUID,
    message: str = Query(..., min_length=1),
    token: Optional[str] = Query(None),  # Optional: cookie is preferred
    db: Session = Depends(get_db)
):
    """Stream chat response for an agent (auth via cookie or query token)."""
    from app.core.security import decode_access_token
    from app.models.user import User as UserModel

    auth_token = token or request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = decode_access_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        current_user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify agent ownership
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    context_manager = ContextManager(db)
    
    return StreamingResponse(
        create_sse_generator(
            context_manager=context_manager,
            agent_id=agent_id,
            user_id=current_user.id,
            message=message
        ),
        media_type="text/event-stream"
    )


@router.get("/temp/{temp_chat_id}/stream")
async def stream_temp_chat(
    request: Request,
    temp_chat_id: UUID,
    message: str = Query(..., min_length=1),
    token: Optional[str] = Query(None),  # Optional: cookie is preferred
    db: Session = Depends(get_db)
):
    """Stream chat response for a temporary chat (auth via cookie or query token)."""
    from app.core.security import decode_access_token
    from app.models.user import User as UserModel

    auth_token = token or request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not auth_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        payload = decode_access_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        current_user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not current_user:
            raise HTTPException(status_code=401, detail="User not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Verify temp chat ownership
    temp_chat = db.query(TemporaryChat).filter(
        TemporaryChat.id == temp_chat_id,
        TemporaryChat.user_id == current_user.id
    ).first()
    
    if not temp_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary chat not found"
        )
    
    context_manager = ContextManager(db)
    
    return StreamingResponse(
        create_sse_generator(
            context_manager=context_manager,
            temp_chat_id=temp_chat_id,
            user_id=current_user.id,
            message=message
        ),
        media_type="text/event-stream"
    )


@router.get("/agent/{agent_id}/history", response_model=ChatHistoryResponse)
async def get_agent_history(
    agent_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for an agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    context_manager = ContextManager(db)
    messages = context_manager.get_agent_history(agent_id, limit, offset)
    
    return ChatHistoryResponse(
        messages=[ChatMessageResponse.from_orm(msg) for msg in messages],
        total=len(messages)
    )


@router.get("/temp/{temp_chat_id}/history", response_model=ChatHistoryResponse)
async def get_temp_chat_history(
    temp_chat_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat history for a temporary chat"""
    temp_chat = db.query(TemporaryChat).filter(
        TemporaryChat.id == temp_chat_id,
        TemporaryChat.user_id == current_user.id
    ).first()
    
    if not temp_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary chat not found"
        )
    
    context_manager = ContextManager(db)
    messages = context_manager.get_temp_chat_history(temp_chat_id, limit, offset)
    
    return ChatHistoryResponse(
        messages=[ChatMessageResponse.from_orm(msg) for msg in messages],
        total=len(messages)
    )


@router.delete("/agent/{agent_id}/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_agent_chat(
    agent_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all messages for an agent"""
    agent = db.query(Agent).filter(
        Agent.id == agent_id,
        Agent.user_id == current_user.id
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    context_manager = ContextManager(db)
    context_manager.clear_agent_history(agent_id)
    
    return None


@router.delete("/temp/{temp_chat_id}/clear", status_code=status.HTTP_204_NO_CONTENT)
async def clear_temp_chat(
    temp_chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all messages for a temporary chat"""
    temp_chat = db.query(TemporaryChat).filter(
        TemporaryChat.id == temp_chat_id,
        TemporaryChat.user_id == current_user.id
    ).first()
    
    if not temp_chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Temporary chat not found"
        )
    
    context_manager = ContextManager(db)
    context_manager.clear_temp_chat_history(temp_chat_id)
    
    return None
