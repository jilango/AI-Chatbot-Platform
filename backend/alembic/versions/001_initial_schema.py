"""Initial database schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Create projects table
    op.create_table('projects',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_user_id'), 'projects', ['user_id'], unique=False)
    
    # Create prompts table
    op.create_table('prompts',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('is_system_prompt', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_prompts_project_id'), 'prompts', ['project_id'], unique=False)
    
    # Create chat_messages table
    op.create_table('chat_messages',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_created_at'), 'chat_messages', ['created_at'], unique=False)
    op.create_index(op.f('ix_chat_messages_project_id'), 'chat_messages', ['project_id'], unique=False)
    
    # Create project_files table
    op.create_table('project_files',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('openai_file_id', sa.String(length=255), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('file_type', sa.String(length=50), nullable=True),
    sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_files_project_id'), 'project_files', ['project_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_project_files_project_id'), table_name='project_files')
    op.drop_table('project_files')
    op.drop_index(op.f('ix_chat_messages_project_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_created_at'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_prompts_project_id'), table_name='prompts')
    op.drop_table('prompts')
    op.drop_index(op.f('ix_projects_user_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
