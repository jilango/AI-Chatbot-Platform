from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1 import auth, users, projects, agents, temporary_chats, chat, files

app = FastAPI(
    title="Chatbot Platform API",
    description="A minimal Chatbot Platform with authentication and LLM integration - Phase 8",
    version="2.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(agents.router, prefix="/api/v1/agents", tags=["Agents"])
app.include_router(temporary_chats.router, prefix="/api/v1/temporary-chats", tags=["Temporary Chats"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(files.router, prefix="/api/v1/files", tags=["Files"])

@app.get("/")
async def root():
    return {
        "message": "Chatbot Platform API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
