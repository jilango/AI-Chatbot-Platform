# Phase 1B Testing Instructions

## Prerequisites

You need PostgreSQL 15+ installed and running on your local machine.

### Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Or use Postgres.app:**
Download from https://postgresapp.com/

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

## Setup Database

### 1. Create the database:

```bash
# Connect to PostgreSQL
psql postgres

# In psql, create database and user:
CREATE DATABASE chatbot_db;
CREATE USER chatbot_user WITH PASSWORD 'chatbot_password';
GRANT ALL PRIVILEGES ON DATABASE chatbot_db TO chatbot_user;
\q
```

### 2. Update .env file:

```bash
cd backend
# Edit .env and update DATABASE_URL if needed:
DATABASE_URL=postgresql://chatbot_user:chatbot_password@localhost:5432/chatbot_db
```

### 3. Run database migrations:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

You should see output like:
```
INFO  [alembic.runtime.migration] Context impl PostgreSQLImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial, Initial database schema
```

### 4. Verify tables were created:

```bash
psql chatbot_db

# In psql:
\dt

# You should see:
# - users
# - projects  
# - prompts
# - chat_messages
# - project_files
# - alembic_version

\q
```

## Alternative: Use Docker for PostgreSQL

If you don't want to install PostgreSQL locally:

```bash
docker run --name chatbot-postgres \
  -e POSTGRES_USER=chatbot_user \
  -e POSTGRES_PASSWORD=chatbot_password \
  -e POSTGRES_DB=chatbot_db \
  -p 5432:5432 \
  -d postgres:15

# Then run migrations as above
```

## Success Criteria for Phase 1B

✅ PostgreSQL database created  
✅ All 5 tables created (users, projects, prompts, chat_messages, project_files)  
✅ All indexes created properly  
✅ Foreign key relationships established  
✅ Alembic migrations run successfully  
✅ No errors in migration logs  

Once all these pass, Phase 1B is complete!
