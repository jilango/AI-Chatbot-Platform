"""Add RAG support with pgvector

Revision ID: 003
Revises: 6229e5d652f8
Create Date: 2026-01-29 00:00:00.000000

This migration:
1. Enables the pgvector extension
2. Adds context_source enum and column to projects table
3. Creates message_embeddings table with vector column
4. Adds indexes for similarity search
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = '004_add_rag'
down_revision = '003_add_project_files'
branch_labels = None
depends_on = None

# Embedding dimension for text-embedding-3-small
EMBEDDING_DIMENSION = 1536


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # 2. Create context_source enum
    context_source_enum = postgresql.ENUM('recent', 'rag', name='context_source_enum', create_type=False)
    context_source_enum.create(op.get_bind(), checkfirst=True)
    
    # 3. Add context_source column to projects table
    op.add_column(
        'projects',
        sa.Column(
            'context_source',
            sa.Enum('recent', 'rag', name='context_source_enum'),
            nullable=False,
            server_default='recent'
        )
    )
    
    # 4. Create message_embeddings table
    op.create_table(
        'message_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('chat_messages.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('embedding', Vector(EMBEDDING_DIMENSION), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    
    # 5. Create indexes
    op.create_index('ix_message_embeddings_project_id', 'message_embeddings', ['project_id'])
    op.create_index('ix_message_embeddings_agent_id', 'message_embeddings', ['agent_id'])
    
    # 6. Create IVFFlat index for vector similarity search
    # Note: For small datasets, a sequential scan might be faster.
    # For production with many embeddings, increase lists parameter.
    # Using cosine distance (vector_cosine_ops) which is common for text embeddings.
    op.execute('''
        CREATE INDEX ix_message_embeddings_embedding 
        ON message_embeddings 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
    ''')


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_message_embeddings_embedding', table_name='message_embeddings')
    op.drop_index('ix_message_embeddings_agent_id', table_name='message_embeddings')
    op.drop_index('ix_message_embeddings_project_id', table_name='message_embeddings')
    
    # Drop message_embeddings table
    op.drop_table('message_embeddings')
    
    # Remove context_source column from projects
    op.drop_column('projects', 'context_source')
    
    # Drop context_source enum
    op.execute('DROP TYPE IF EXISTS context_source_enum')
    
    # Note: We don't drop the vector extension as it might be used by other things
