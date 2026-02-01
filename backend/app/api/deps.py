from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.core.security import decode_access_token
from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)


async def get_token(request: Request, token_header: Optional[str] = Depends(oauth2_scheme)) -> str:
    """Get JWT from httpOnly cookie (preferred) or Authorization header."""
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    if token_header:
        return token_header
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    token: str = Depends(get_token),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user (token from cookie or Bearer header)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception

    return user
