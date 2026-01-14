"""
Phase 7 Tests: Projects & Agents Architecture
Tests the new data models, relationships, and APIs
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Project, Agent, TemporaryChat, ChatMessage, AgentType, MessageRole
from app.core.security import get_password_hash
import uuid

# Test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_user_model(db_session):
    """Test User model creation and relationships"""
    print("\n=== Testing User Model ===")
    
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    # Verify user was created
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.name == "Test User"
    
    # Test relationships exist
    assert hasattr(user, 'projects')
    assert hasattr(user, 'agents')
    assert hasattr(user, 'temporary_chats')
    assert hasattr(user, 'chat_messages')
    
    print(f"✓ User created: {user.email}")
    print(f"✓ User has all required relationships")


def test_project_model(db_session):
    """Test Project model creation and relationships"""
    print("\n=== Testing Project Model ===")
    
    # Create user first
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    # Create project
    project = Project(
        user_id=user.id,
        name="Test Project",
        description="A test project",
        has_prompt=True,
        prompt_content="You are a helpful assistant",
        enable_context_sharing=True
    )
    db_session.add(project)
    db_session.commit()
    
    # Verify project
    assert project.id is not None
    assert project.name == "Test Project"
    assert project.has_prompt is True
    assert project.enable_context_sharing is True
    
    # Test relationships
    assert project.user.email == "test@example.com"
    assert hasattr(project, 'agents')
    
    print(f"✓ Project created: {project.name}")
    print(f"✓ Project linked to user: {project.user.email}")


def test_agent_model_standalone(db_session):
    """Test standalone Agent model"""
    print("\n=== Testing Standalone Agent Model ===")
    
    # Create user
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    # Create standalone agent
    agent = Agent(
        user_id=user.id,
        agent_type=AgentType.STANDALONE,
        name="Test Agent",
        description="A standalone agent",
        has_prompt=True,
        prompt_content="You are a coding assistant"
    )
    db_session.add(agent)
    db_session.commit()
    
    # Verify agent
    assert agent.id is not None
    assert agent.agent_type == AgentType.STANDALONE
    assert agent.project_id is None
    assert agent.has_prompt is True
    
    # Test relationships
    assert agent.user.email == "test@example.com"
    assert agent.project is None
    
    print(f"✓ Standalone agent created: {agent.name}")
    print(f"✓ Agent type: {agent.agent_type}")


def test_agent_model_project_based(db_session):
    """Test project-based Agent model"""
    print("\n=== Testing Project-Based Agent Model ===")
    
    # Create user and project
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    project = Project(
        user_id=user.id,
        name="Test Project",
        has_prompt=True,
        prompt_content="Project context"
    )
    db_session.add(project)
    db_session.commit()
    
    # Create project agent
    agent = Agent(
        user_id=user.id,
        project_id=project.id,
        agent_type=AgentType.PROJECT_AGENT,
        name="Project Agent",
        has_prompt=False
    )
    db_session.add(agent)
    db_session.commit()
    
    # Verify agent
    assert agent.id is not None
    assert agent.agent_type == AgentType.PROJECT_AGENT
    assert agent.project_id == project.id
    
    # Test relationships
    assert agent.project.name == "Test Project"
    assert len(project.agents) == 1
    assert project.agents[0].name == "Project Agent"
    
    print(f"✓ Project agent created: {agent.name}")
    print(f"✓ Agent linked to project: {agent.project.name}")


def test_temporary_chat_model(db_session):
    """Test TemporaryChat model"""
    print("\n=== Testing TemporaryChat Model ===")
    
    # Create user
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    # Create temp chat
    temp_chat = TemporaryChat(
        user_id=user.id,
        session_id="test_session_123"
    )
    db_session.add(temp_chat)
    db_session.commit()
    
    # Verify temp chat
    assert temp_chat.id is not None
    assert temp_chat.session_id == "test_session_123"
    
    # Test relationships
    assert temp_chat.user.email == "test@example.com"
    assert hasattr(temp_chat, 'chat_messages')
    
    print(f"✓ Temporary chat created: {temp_chat.session_id}")


def test_chat_message_with_agent(db_session):
    """Test ChatMessage linked to Agent"""
    print("\n=== Testing ChatMessage with Agent ===")
    
    # Setup: user and agent
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    agent = Agent(
        user_id=user.id,
        agent_type=AgentType.STANDALONE,
        name="Test Agent"
    )
    db_session.add(agent)
    db_session.commit()
    
    # Create message
    message = ChatMessage(
        user_id=user.id,
        agent_id=agent.id,
        role=MessageRole.USER,
        content="Hello, agent!"
    )
    db_session.add(message)
    db_session.commit()
    
    # Verify message
    assert message.id is not None
    assert message.agent_id == agent.id
    assert message.temp_chat_id is None
    assert message.content == "Hello, agent!"
    
    # Test relationships
    assert message.agent.name == "Test Agent"
    assert len(agent.chat_messages) == 1
    
    print(f"✓ Chat message created for agent")
    print(f"✓ Message content: {message.content}")


def test_chat_message_with_temp_chat(db_session):
    """Test ChatMessage linked to TemporaryChat"""
    print("\n=== Testing ChatMessage with TempChat ===")
    
    # Setup: user and temp chat
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    temp_chat = TemporaryChat(
        user_id=user.id,
        session_id="test_session"
    )
    db_session.add(temp_chat)
    db_session.commit()
    
    # Create message
    message = ChatMessage(
        user_id=user.id,
        temp_chat_id=temp_chat.id,
        role=MessageRole.USER,
        content="Temporary message"
    )
    db_session.add(message)
    db_session.commit()
    
    # Verify message
    assert message.id is not None
    assert message.temp_chat_id == temp_chat.id
    assert message.agent_id is None
    
    # Test relationships
    assert message.temporary_chat.session_id == "test_session"
    assert len(temp_chat.chat_messages) == 1
    
    print(f"✓ Chat message created for temp chat")


def test_cascade_delete_project(db_session):
    """Test cascade delete: deleting project deletes agents"""
    print("\n=== Testing Cascade Delete: Project ===")
    
    # Setup
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    project = Project(
        user_id=user.id,
        name="Test Project"
    )
    db_session.add(project)
    db_session.commit()
    
    agent = Agent(
        user_id=user.id,
        project_id=project.id,
        agent_type=AgentType.PROJECT_AGENT,
        name="Project Agent"
    )
    db_session.add(agent)
    db_session.commit()
    
    agent_id = agent.id
    
    # Delete project
    db_session.delete(project)
    db_session.commit()
    
    # Verify agent was deleted
    deleted_agent = db_session.query(Agent).filter(Agent.id == agent_id).first()
    assert deleted_agent is None
    
    print(f"✓ Project deleted")
    print(f"✓ Associated agent cascaded delete")


def test_cascade_delete_user(db_session):
    """Test cascade delete: deleting user deletes everything"""
    print("\n=== Testing Cascade Delete: User ===")
    
    # Setup complex structure
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    project = Project(
        user_id=user.id,
        name="Test Project"
    )
    db_session.add(project)
    db_session.commit()
    
    agent = Agent(
        user_id=user.id,
        project_id=project.id,
        agent_type=AgentType.PROJECT_AGENT,
        name="Test Agent"
    )
    db_session.add(agent)
    db_session.commit()
    
    message = ChatMessage(
        user_id=user.id,
        agent_id=agent.id,
        role=MessageRole.USER,
        content="Test message"
    )
    db_session.add(message)
    db_session.commit()
    
    user_id = user.id
    project_id = project.id
    agent_id = agent.id
    message_id = message.id
    
    # Delete user
    db_session.delete(user)
    db_session.commit()
    
    # Verify everything was deleted
    assert db_session.query(User).filter(User.id == user_id).first() is None
    assert db_session.query(Project).filter(Project.id == project_id).first() is None
    assert db_session.query(Agent).filter(Agent.id == agent_id).first() is None
    assert db_session.query(ChatMessage).filter(ChatMessage.id == message_id).first() is None
    
    print(f"✓ User deleted")
    print(f"✓ All related data cascaded delete")


def test_model_relationships_bidirectional(db_session):
    """Test bidirectional relationships work correctly"""
    print("\n=== Testing Bidirectional Relationships ===")
    
    # Create full structure
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    
    project = Project(
        user_id=user.id,
        name="Test Project"
    )
    db_session.add(project)
    db_session.commit()
    
    agent1 = Agent(
        user_id=user.id,
        project_id=project.id,
        agent_type=AgentType.PROJECT_AGENT,
        name="Agent 1"
    )
    agent2 = Agent(
        user_id=user.id,
        agent_type=AgentType.STANDALONE,
        name="Agent 2"
    )
    db_session.add_all([agent1, agent2])
    db_session.commit()
    
    # Test User -> Projects
    assert len(user.projects) == 1
    assert user.projects[0].name == "Test Project"
    
    # Test User -> Agents
    assert len(user.agents) == 2
    agent_names = {a.name for a in user.agents}
    assert agent_names == {"Agent 1", "Agent 2"}
    
    # Test Project -> User
    assert project.user.email == "test@example.com"
    
    # Test Project -> Agents
    assert len(project.agents) == 1
    assert project.agents[0].name == "Agent 1"
    
    # Test Agent -> User
    assert agent1.user.email == "test@example.com"
    assert agent2.user.email == "test@example.com"
    
    # Test Agent -> Project
    assert agent1.project.name == "Test Project"
    assert agent2.project is None
    
    print(f"✓ User -> Projects: {len(user.projects)}")
    print(f"✓ User -> Agents: {len(user.agents)}")
    print(f"✓ Project -> Agents: {len(project.agents)}")
    print(f"✓ All bidirectional relationships work correctly")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("PHASE 7 MODEL TESTS")
    print("="*60)
    
    # Run tests manually (without pytest runner)
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    tests = [
        ("User Model", test_user_model),
        ("Project Model", test_project_model),
        ("Standalone Agent", test_agent_model_standalone),
        ("Project Agent", test_agent_model_project_based),
        ("Temporary Chat", test_temporary_chat_model),
        ("Chat Message (Agent)", test_chat_message_with_agent),
        ("Chat Message (TempChat)", test_chat_message_with_temp_chat),
        ("Cascade Delete (Project)", test_cascade_delete_project),
        ("Cascade Delete (User)", test_cascade_delete_user),
        ("Bidirectional Relationships", test_model_relationships_bidirectional),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        session = TestingSessionLocal()
        try:
            test_func(session)
            passed += 1
            print(f"\n✅ PASSED: {test_name}")
        except Exception as e:
            failed += 1
            print(f"\n❌ FAILED: {test_name}")
            print(f"   Error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            session.close()
    
    Base.metadata.drop_all(bind=engine)
    
    print("\n" + "="*60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*60 + "\n")
