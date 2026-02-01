import json
import logging
from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import Optional, List

logger = logging.getLogger(__name__)

DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/chatbot_db"

    # JWT
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Auth cookie (httpOnly, not accessible to JS)
    AUTH_COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False  # True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"

    # OpenAI/LLM
    OPENAI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "openai"  # or "openrouter"

    # CORS
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:8080"]'

    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"

    # Environment
    ENVIRONMENT: str = "development"

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ENVIRONMENT != "production":
            return self
        if self.SECRET_KEY == DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a strong random value in production"
            )
        if not self.COOKIE_SECURE:
            raise ValueError("COOKIE_SECURE must be True in production")
        return self

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS from JSON string to list"""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (ValueError, TypeError) as e:
            logger.warning(
                "Invalid CORS_ORIGINS, using default: %s",
                e,
                exc_info=True,
            )
            return ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
