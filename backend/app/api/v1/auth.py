from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserLogin, AuthResponse
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token
)
from app.config import settings
from app.limiter import limiter

router = APIRouter()

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds


def _auth_response_with_cookie(user: User, access_token: str) -> JSONResponse:
    """Build AuthResponse JSON and set httpOnly cookie (no token in body)."""
    content = {
        "token_type": "bearer",
        "user": UserResponse.model_validate(user).model_dump(mode="json"),
    }
    response = JSONResponse(content=content, status_code=200)
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return response


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Register a new user"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        name=user_data.name
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    response = JSONResponse(
        content={
            "token_type": "bearer",
            "user": UserResponse.model_validate(user).model_dump(mode="json"),
        },
        status_code=status.HTTP_201_CREATED,
    )
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    return response


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """Login: set httpOnly cookie with JWT and return user (no token in body)."""
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    return _auth_response_with_cookie(user, access_token)


@router.post("/logout")
async def logout():
    """Clear auth cookie (server-side logout)."""
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    return response
