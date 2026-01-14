from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import json
import asyncio

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatHistoryResponse,
    ClearChatResponse
)
from app.services.chat_service import chat_service

router = APIRouter()

@router.post("/{project_id}/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    project_id: UUID,
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a user message and get AI response (non-streaming)
    Note: For better UX, use the /stream endpoint instead
    """
    try:
        # Get project context
        context = await chat_service.get_project_context(
            db=db,
            project_id=project_id,
            user_id=current_user.id
        )
        
        # Save user message
        user_message = chat_service.save_message(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            role="user",
            content=message_data.content
        )
        
        # Add user message to context
        context["messages"].append({
            "role": "user",
            "content": message_data.content
        })
        
        # Get AI response (collect all chunks)
        assistant_response = ""
        async for chunk in chat_service.stream_chat_response(context["messages"]):
            assistant_response += chunk
        
        # Save assistant message
        assistant_message = chat_service.save_message(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            role="assistant",
            content=assistant_response
        )
        
        return assistant_message
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{project_id}/stream")
async def stream_chat(
    project_id: UUID,
    message: str = Query(..., min_length=1, max_length=10000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stream AI response using Server-Sent Events (SSE)
    """
    try:
        # Get project context
        context = await chat_service.get_project_context(
            db=db,
            project_id=project_id,
            user_id=current_user.id
        )
        
        # Save user message
        user_message = chat_service.save_message(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            role="user",
            content=message
        )
        
        # Add user message to context
        context["messages"].append({
            "role": "user",
            "content": message
        })
        
        # Create async generator for SSE
        async def event_generator():
            assistant_response = ""
            
            try:
                # Stream chunks from OpenAI
                async for chunk in chat_service.stream_chat_response(context["messages"]):
                    assistant_response += chunk
                    # Send chunk as SSE event
                    yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                    await asyncio.sleep(0)  # Allow other tasks to run
                
                # Save complete assistant message
                chat_service.save_message(
                    db=db,
                    project_id=project_id,
                    user_id=current_user.id,
                    role="assistant",
                    content=assistant_response
                )
                
                # Send completion event
                yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
                
            except Exception as e:
                # Send error event
                yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable buffering in nginx
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{project_id}/history", response_model=ChatHistoryResponse)
def get_chat_history(
    project_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get paginated chat history for a project
    """
    try:
        history = chat_service.get_chat_history(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            page=page,
            page_size=page_size
        )
        
        return ChatHistoryResponse(**history)
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{project_id}/clear", response_model=ClearChatResponse)
def clear_chat(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear all chat messages for a project
    """
    try:
        deleted_count = chat_service.clear_chat_history(
            db=db,
            project_id=project_id,
            user_id=current_user.id
        )
        
        return ClearChatResponse(
            message="Chat history cleared successfully",
            deleted_count=deleted_count
        )
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
