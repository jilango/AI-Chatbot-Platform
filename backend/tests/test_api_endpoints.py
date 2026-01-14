"""
Phase 7 API Endpoint Tests
Tests all API endpoints for Phase 7 architecture
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

# Test data
test_user = {
    "email": f"test_{int(time.time())}@example.com",
    "password": "testpass123",
    "name": "Test User"
}

auth_token = None
user_id = None
project_id = None
standalone_agent_id = None
project_agent_id = None
temp_chat_id = None

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_test(name, passed=True):
    status = "✓" if passed else "✗"
    print(f"{status} {name}")

def test_health():
    """Test health check endpoint"""
    print_section("1. Health Check")
    
    response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    print_test("Health endpoint accessible")

def test_register():
    """Test user registration"""
    print_section("2. User Registration")
    
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json=test_user
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user["email"]
    
    global auth_token, user_id
    auth_token = data["access_token"]
    user_id = data["user"]["id"]
    
    print_test(f"User registered: {test_user['email']}")
    print_test(f"Token received: {auth_token[:20]}...")

def test_login():
    """Test user login"""
    print_section("3. User Login")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": test_user["email"],
            "password": test_user["password"]
        }
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    
    print_test("User login successful")

def test_get_current_user():
    """Test get current user info"""
    print_section("4. Get Current User")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    
    print_test("User info retrieved")

def test_create_project():
    """Test creating a project"""
    print_section("5. Create Project")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    project_data = {
        "name": "Test Project",
        "description": "A test project for Phase 7",
        "has_prompt": True,
        "prompt_content": "You are working on a coding project. Always be helpful and detailed.",
        "enable_context_sharing": True
    }
    
    response = requests.post(
        f"{BASE_URL}/projects",
        json=project_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == project_data["name"]
    assert data["has_prompt"] is True
    
    global project_id
    project_id = data["id"]
    
    print_test(f"Project created: {project_data['name']}")

def test_list_projects():
    """Test listing projects"""
    print_section("6. List Projects")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/projects", headers=headers)
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(p["id"] == project_id for p in data)
    
    print_test(f"Found {len(data)} project(s)")

def test_create_standalone_agent():
    """Test creating a standalone agent"""
    print_section("7. Create Standalone Agent")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    agent_data = {
        "name": "Test Standalone Agent",
        "description": "A standalone AI assistant",
        "agent_type": "standalone",
        "has_prompt": True,
        "prompt_content": "You are a helpful coding assistant. Be concise and clear."
    }
    
    response = requests.post(
        f"{BASE_URL}/agents",
        json=agent_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == agent_data["name"]
    assert data["agent_type"] == "standalone"
    assert data["project_id"] is None
    
    global standalone_agent_id
    standalone_agent_id = data["id"]
    
    print_test(f"Standalone agent created: {agent_data['name']}")

def test_create_project_agent():
    """Test creating an agent within a project"""
    print_section("8. Create Project Agent")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    agent_data = {
        "name": "Test Project Agent",
        "description": "An agent within a project",
        "project_id": project_id,
        "agent_type": "project_agent",
        "has_prompt": False
    }
    
    response = requests.post(
        f"{BASE_URL}/agents",
        json=agent_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == agent_data["name"]
    assert data["agent_type"] == "project_agent"
    assert data["project_id"] == project_id
    
    global project_agent_id
    project_agent_id = data["id"]
    
    print_test(f"Project agent created: {agent_data['name']}")

def test_list_agents():
    """Test listing all agents"""
    print_section("9. List All Agents")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/agents", headers=headers)
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    
    print_test(f"Found {len(data)} agent(s)")

def test_list_project_agents():
    """Test listing agents within a project"""
    print_section("10. List Project Agents")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(
        f"{BASE_URL}/projects/{project_id}/agents",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert all(a["project_id"] == project_id for a in data)
    
    print_test(f"Found {len(data)} agent(s) in project")

def test_create_temporary_chat():
    """Test creating a temporary chat"""
    print_section("11. Create Temporary Chat")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.post(
        f"{BASE_URL}/temporary-chats",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "session_id" in data
    
    global temp_chat_id
    temp_chat_id = data["id"]
    
    print_test(f"Temporary chat created: {data['session_id']}")

def test_get_temporary_chat():
    """Test getting a temporary chat"""
    print_section("12. Get Temporary Chat")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(
        f"{BASE_URL}/temporary-chats/{temp_chat_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == temp_chat_id
    
    print_test("Temporary chat retrieved")

def test_update_project():
    """Test updating a project"""
    print_section("13. Update Project")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "name": "Updated Test Project",
        "enable_context_sharing": False
    }
    
    response = requests.put(
        f"{BASE_URL}/projects/{project_id}",
        json=update_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    assert data["enable_context_sharing"] is False
    
    print_test("Project updated successfully")

def test_update_agent():
    """Test updating an agent"""
    print_section("14. Update Agent")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    update_data = {
        "name": "Updated Standalone Agent",
        "description": "Updated description"
    }
    
    response = requests.put(
        f"{BASE_URL}/agents/{standalone_agent_id}",
        json=update_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == update_data["name"]
    
    print_test("Agent updated successfully")

def test_delete_temporary_chat():
    """Test deleting a temporary chat"""
    print_section("15. Delete Temporary Chat")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(
        f"{BASE_URL}/temporary-chats/{temp_chat_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    
    # Verify it's deleted
    get_response = requests.get(
        f"{BASE_URL}/temporary-chats/{temp_chat_id}",
        headers=headers
    )
    assert get_response.status_code == 404
    
    print_test("Temporary chat deleted")

def test_delete_agent():
    """Test deleting an agent"""
    print_section("16. Delete Agent")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(
        f"{BASE_URL}/agents/{project_agent_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    
    print_test("Agent deleted")

def test_delete_project():
    """Test deleting a project"""
    print_section("17. Delete Project")
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.delete(
        f"{BASE_URL}/projects/{project_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    assert response.status_code == 200
    
    print_test("Project deleted")

def run_all_tests():
    """Run all API tests"""
    print("\n" + "="*60)
    print("  PHASE 7 API ENDPOINT TESTS")
    print("="*60)
    
    tests = [
        ("Health Check", test_health),
        ("User Registration", test_register),
        ("User Login", test_login),
        ("Get Current User", test_get_current_user),
        ("Create Project", test_create_project),
        ("List Projects", test_list_projects),
        ("Create Standalone Agent", test_create_standalone_agent),
        ("Create Project Agent", test_create_project_agent),
        ("List All Agents", test_list_agents),
        ("List Project Agents", test_list_project_agents),
        ("Create Temporary Chat", test_create_temporary_chat),
        ("Get Temporary Chat", test_get_temporary_chat),
        ("Update Project", test_update_project),
        ("Update Agent", test_update_agent),
        ("Delete Temporary Chat", test_delete_temporary_chat),
        ("Delete Agent", test_delete_agent),
        ("Delete Project", test_delete_project),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"\n❌ FAILED: {test_name}")
            print(f"   Error: {str(e)}")
        except Exception as e:
            failed += 1
            print(f"\n❌ ERROR: {test_name}")
            print(f"   Error: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print("="*60 + "\n")
    
    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
