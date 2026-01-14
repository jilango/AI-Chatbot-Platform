"""Restructure for Projects and Agents architecture

Revision ID: 002
Revises: 001_initial
Create Date: 2026-01-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old tables (will lose all data as per user request)
    op.drop_table('chat_messages')
    op.drop_table('prompts')
    op.drop_table('project_files')
    op.drop_table('projects')
    
    # Create new Projects table (now folders/containers)
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('has_prompt', sa.Boolean, default=False, nullable=False),
        sa.Column('prompt_content', sa.Text, nullable=True),
        sa.Column('enable_context_sharing', sa.Boolean, default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_projects_user_id', 'projects', ['user_id'])
    
    # Create Agents table
    op.create_table(
        'agents',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=True),
        sa.Column('agent_type', sa.Enum('standalone', 'project_agent', name='agent_type_enum'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('has_prompt', sa.Boolean, default=False, nullable=False),
        sa.Column('prompt_content', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agents_user_id', 'agents', ['user_id'])
    op.create_index('ix_agents_project_id', 'agents', ['project_id'])
    op.create_index('ix_agents_agent_type', 'agents', ['agent_type'])
    
    # Create Temporary Chats table
    op.create_table(
        'temporary_chats',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_temporary_chats_user_id', 'temporary_chats', ['user_id'])
    op.create_index('ix_temporary_chats_session_id', 'temporary_chats', ['session_id'])
    
    # Create new Chat Messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('agent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=True),
        sa.Column('temp_chat_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('temporary_chats.id', ondelete='CASCADE'), nullable=True),
        sa.Column('role', sa.Enum('user', 'assistant', 'system', name='message_role_enum'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            '(agent_id IS NOT NULL AND temp_chat_id IS NULL) OR (agent_id IS NULL AND temp_chat_id IS NOT NULL)',
            name='chat_messages_exactly_one_parent'
        )
    )
    op.create_index('ix_chat_messages_user_id', 'chat_messages', ['user_id'])
    op.create_index('ix_chat_messages_agent_id', 'chat_messages', ['agent_id'])
    op.create_index('ix_chat_messages_temp_chat_id', 'chat_messages', ['temp_chat_id'])
    op.create_index('ix_chat_messages_created_at', 'chat_messages', ['created_at'])


def downgrade() -> None:
    # Drop new tables
    op.drop_table('chat_messages')
    op.drop_table('temporary_chats')
    op.drop_table('agents')
    op.drop_table('projects')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS agent_type_enum')
    op.execute('DROP TYPE IF EXISTS message_role_enum')
    
    # Recreate old schema (if needed for rollback)
    # Note: This will not restore data, just schema
    op.create_table(
        'projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
