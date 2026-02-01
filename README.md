# AI Chatbot Platform

A multi-agent AI chatbot platform with project-level context sharing, streaming conversations, Agent prompts, and cross-agent context awareness using FastAPI, PostgreSQL, and OpenAI integration.

## Overview

This platform allows users to:
- Create and manage projects (folders) containing multiple AI agents
- Create standalone agents or agents within projects
- Configure optional custom prompts at project and agent levels
- Chat with AI agents using OpenAI with SSE streaming
- Use temporary chats for quick conversations that auto-delete
- Share context between agents in the same project

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with Alembic migrations
- **Authentication**: JWT
- **LLM Integration**: OpenAI API (Chat Completions with streaming)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Deployment**: Railway


### Features
- User authentication (JWT)
- Projects as folders with agents
- Standalone and project-based agents
- Temporary chats
- Optional prompts at project and agent level
- Context sharing between agents in projects
- Real-time chat with OpenAI streaming (SSE)
- Chat history persistence
- File upload and management with OpenAI Files API
- Professional light/dark mode UI
- Responsive design
- Next.js frontend with TypeScript

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL=postgresql://chatbot_user:chatbot_password@localhost:5432/chatbot_db
   SECRET_KEY=your-secret-key-here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   OPENAI_API_KEY=your-openai-api-key
   CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the backend server:**
   ```bash
   uvicorn app.main:app --reload
   ```

   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:3000`

## Testing

1. **Register a new account** at `http://localhost:3000/register`
2. **Login** at `http://localhost:3000/login`
3. **Create a project** (folder for agents)
4. **Add agents** to your project or create standalone agents
5. **Start chatting** with your agents
6. **Try temporary chats** for quick conversations

## Deployment

The application is ready for deployment to Railway. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions.

### Quick Deployment Steps

1. **Create Railway account** at [railway.app](https://railway.app)
2. **Add PostgreSQL database** service
3. **Deploy backend** service (set root directory to `backend`)
4. **Deploy frontend** service (set root directory to `frontend`)
5. **Configure environment variables** (see DEPLOYMENT.md)
6. **Run database migrations** using Railway CLI

For complete instructions, troubleshooting, and environment variable reference, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Architecture

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Data Models
- **User**: Authentication and account management
- **Project**: Folders containing agents with optional prompt and context sharing
- **Agent**: AI chat entities (standalone or within projects) with optional prompts
- **TemporaryChat**: Temporary conversations that auto-delete
- **ChatMessage**: Individual messages linked to agents or temporary chats
- **ProjectFile**: File metadata for uploaded files

### Context Management
- Projects can have system prompts that apply to all agents within
- Agents can have their own prompts
- Combined prompts are sent to OpenAI to maintain context
- Projects can optionally have shared conversation context for all agents in the same project