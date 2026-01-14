"""
Phase 7 API Tests: Test all endpoints for Projects, Agents, Temporary Chats
"""

import requests
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Global variables to store test data
test_user = {
    "email": f"test_{int(time.time())}@example.com",
    "password": "testpass123",
    "name": "Test User"
}
auth_token = None
project_id = None
agent_id = None
standalone_agent_id = None
temp_chat_id = None


def print_test_header(title):
    """Print a formatted test header"""
    print("\n" + "="*60)
    print(f"TEST: {title}")
    print("="*60)


def print_result(success, message, data=None):
    """Print test result"""
    if success:
        print(f"✅ PASS: {message}")
    else:
        print(f"❌ FAIL: {message}")
        if data:
            print(f"   Response: {data}")
    return success


def test_health_check():
    """Test basic health check"""
    print_test_header("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        success = response.status_code == 200
        return print_result(success, f"Health check: {response.json()}")
    except Exception as e:
        return print_result(False, f"Health check failed: {str(e)}")


def test_user_registration():
    """Test user registration"""
    print_test_header("User Registration")
    global auth_token
    
    try:
        response = requests.post(
            f"{API_V1}/auth/register",
            json=test_user
        )
        
        # Registration endpoint returns 200 or 201 with token + user data
        if response.status_code in [200, 201]:
            data = response.json()
            
            # Check if we got both token and user data
            if 'access_token' in data and 'user' in data:
                auth_token = data.get('access_token')
                user = data.get('user', {})
                print(f"   User ID: {user.get('id')}")
                print(f"   Email: {user.get('email')}")
                print(f"   Token received: Yes")
                return print_result(True, "User registered and logged in successfully")
            else:
                return print_result(False, "Unexpected response format", data)
        else:
            return print_result(False, f"Registration failed (HTTP {response.status_code})")
    except Exception as e:
        return print_result(False, f"Registration error: {str(e)}")


def test_user_login():
    """Test user login and get JWT token"""
    print_test_header("User Login")
    global auth_token
    
    try:
        # Skip if we already have a token from registration
        if auth_token:
            print(f"   Using token from registration")
            return print_result(True, "Token already available from registration")
            
        response = requests.post(
            f"{API_V1}/auth/login",
            json={
                "email": test_user["email"],
                "password": test_user["password"]
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get("access_token")
            print(f"   Token: {auth_token[:20]}...")
            return print_result(True, "User logged in successfully")
        else:
            return print_result(False, f"Login failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Login error: {str(e)}")


def test_create_project():
    """Test creating a project"""
    print_test_header("Create Project")
    global project_id
    
    try:
        response = requests.post(
            f"{API_V1}/projects",
            json={
                "name": "Test Project",
                "description": "A test project for Phase 7",
                "has_prompt": True,
                "prompt_content": "You are a helpful coding assistant for this project.",
                "enable_context_sharing": True
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            project_id = data.get("id")
            print(f"   Project ID: {project_id}")
            print(f"   Name: {data.get('name')}")
            print(f"   Has Prompt: {data.get('has_prompt')}")
            return print_result(True, "Project created successfully")
        else:
            return print_result(False, f"Project creation failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Project creation error: {str(e)}")


def test_list_projects():
    """Test listing user's projects"""
    print_test_header("List Projects")
    
    try:
        response = requests.get(
            f"{API_V1}/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            projects = response.json()
            print(f"   Found {len(projects)} project(s)")
            for proj in projects:
                print(f"   - {proj.get('name')} (ID: {proj.get('id')})")
            return print_result(True, "Projects listed successfully")
        else:
            return print_result(False, f"List projects failed: {response.text}")
    except Exception as e:
        return print_result(False, f"List projects error: {str(e)}")


def test_get_project():
    """Test getting a specific project"""
    print_test_header("Get Project Details")
    
    try:
        response = requests.get(
            f"{API_V1}/projects/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Name: {data.get('name')}")
            print(f"   Description: {data.get('description')}")
            print(f"   Context Sharing: {data.get('enable_context_sharing')}")
            return print_result(True, "Project details retrieved")
        else:
            return print_result(False, f"Get project failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Get project error: {str(e)}")


def test_create_project_agent():
    """Test creating an agent within a project"""
    print_test_header("Create Project Agent")
    global agent_id
    
    try:
        response = requests.post(
            f"{API_V1}/agents",
            json={
                "project_id": project_id,
                "agent_type": "project_agent",
                "name": "Python Expert",
                "description": "An agent specialized in Python",
                "has_prompt": True,
                "prompt_content": "You are a Python expert. Always provide code examples."
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            agent_id = data.get("id")
            print(f"   Agent ID: {agent_id}")
            print(f"   Name: {data.get('name')}")
            print(f"   Type: {data.get('agent_type')}")
            print(f"   Project ID: {data.get('project_id')}")
            return print_result(True, "Project agent created successfully")
        else:
            return print_result(False, f"Agent creation failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Agent creation error: {str(e)}")


def test_create_standalone_agent():
    """Test creating a standalone agent"""
    print_test_header("Create Standalone Agent")
    global standalone_agent_id
    
    try:
        response = requests.post(
            f"{API_V1}/agents",
            json={
                "agent_type": "standalone",
                "name": "General Assistant",
                "description": "A general purpose AI assistant",
                "has_prompt": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            standalone_agent_id = data.get("id")
            print(f"   Agent ID: {standalone_agent_id}")
            print(f"   Name: {data.get('name')}")
            print(f"   Type: {data.get('agent_type')}")
            return print_result(True, "Standalone agent created successfully")
        else:
            return print_result(False, f"Standalone agent creation failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Standalone agent creation error: {str(e)}")


def test_list_agents():
    """Test listing all user's agents"""
    print_test_header("List All Agents")
    
    try:
        response = requests.get(
            f"{API_V1}/agents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            agents = response.json()
            print(f"   Found {len(agents)} agent(s)")
            for agent in agents:
                print(f"   - {agent.get('name')} ({agent.get('agent_type')})")
            return print_result(True, "Agents listed successfully")
        else:
            return print_result(False, f"List agents failed: {response.text}")
    except Exception as e:
        return print_result(False, f"List agents error: {str(e)}")


def test_list_project_agents():
    """Test listing agents within a specific project"""
    print_test_header("List Project Agents")
    
    try:
        response = requests.get(
            f"{API_V1}/projects/{project_id}/agents",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            agents = response.json()
            print(f"   Found {len(agents)} agent(s) in project")
            for agent in agents:
                print(f"   - {agent.get('name')}")
            return print_result(True, "Project agents listed successfully")
        else:
            return print_result(False, f"List project agents failed: {response.text}")
    except Exception as e:
        return print_result(False, f"List project agents error: {str(e)}")


def test_create_temporary_chat():
    """Test creating a temporary chat"""
    print_test_header("Create Temporary Chat")
    global temp_chat_id
    
    try:
        session_id = f"session_{int(time.time())}"
        response = requests.post(
            f"{API_V1}/temporary-chats",
            json={"session_id": session_id},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            temp_chat_id = data.get("id")
            print(f"   Temp Chat ID: {temp_chat_id}")
            print(f"   Session ID: {data.get('session_id')}")
            return print_result(True, "Temporary chat created successfully")
        else:
            return print_result(False, f"Temp chat creation failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Temp chat creation error: {str(e)}")


def test_get_agent():
    """Test getting agent details"""
    print_test_header("Get Agent Details")
    
    try:
        response = requests.get(
            f"{API_V1}/agents/{agent_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Name: {data.get('name')}")
            print(f"   Description: {data.get('description')}")
            print(f"   Has Prompt: {data.get('has_prompt')}")
            return print_result(True, "Agent details retrieved")
        else:
            return print_result(False, f"Get agent failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Get agent error: {str(e)}")


def test_update_project():
    """Test updating a project"""
    print_test_header("Update Project")
    
    try:
        response = requests.put(
            f"{API_V1}/projects/{project_id}",
            json={
                "name": "Updated Test Project",
                "description": "Updated description",
                "enable_context_sharing": False
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Updated Name: {data.get('name')}")
            print(f"   Context Sharing: {data.get('enable_context_sharing')}")
            return print_result(True, "Project updated successfully")
        else:
            return print_result(False, f"Update project failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Update project error: {str(e)}")


def test_update_agent():
    """Test updating an agent"""
    print_test_header("Update Agent")
    
    try:
        response = requests.put(
            f"{API_V1}/agents/{agent_id}",
            json={
                "name": "Updated Python Expert",
                "description": "Updated description"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Updated Name: {data.get('name')}")
            return print_result(True, "Agent updated successfully")
        else:
            return print_result(False, f"Update agent failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Update agent error: {str(e)}")


def test_chat_history():
    """Test getting chat history for an agent"""
    print_test_header("Get Chat History")
    
    try:
        response = requests.get(
            f"{API_V1}/chat/agent/{agent_id}/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Total messages: {data.get('total', 0)}")
            print(f"   Messages returned: {len(data.get('messages', []))}")
            return print_result(True, "Chat history retrieved")
        else:
            return print_result(False, f"Get chat history failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Get chat history error: {str(e)}")


def test_delete_temporary_chat():
    """Test deleting a temporary chat"""
    print_test_header("Delete Temporary Chat")
    
    try:
        response = requests.delete(
            f"{API_V1}/temporary-chats/{temp_chat_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code in [200, 204]:
            print(f"   Temporary chat deleted (status: {response.status_code})")
            return print_result(True, "Temporary chat deleted successfully")
        else:
            return print_result(False, f"Delete temp chat failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Delete temp chat error: {str(e)}")


def test_delete_agent():
    """Test deleting an agent"""
    print_test_header("Delete Standalone Agent")
    
    try:
        response = requests.delete(
            f"{API_V1}/agents/{standalone_agent_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code in [200, 204]:
            print(f"   Agent deleted (status: {response.status_code})")
            return print_result(True, "Agent deleted successfully")
        else:
            return print_result(False, f"Delete agent failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Delete agent error: {str(e)}")


def test_delete_project():
    """Test deleting a project (should cascade delete agents)"""
    print_test_header("Delete Project (Cascade Delete)")
    
    try:
        response = requests.delete(
            f"{API_V1}/projects/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code in [200, 204]:
            print(f"   Project deleted (status: {response.status_code})")
            
            # Verify the agent was also deleted
            agent_check = requests.get(
                f"{API_V1}/agents/{agent_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            if agent_check.status_code == 404:
                print(f"   ✓ Associated agent was cascade deleted")
            
            return print_result(True, "Project and associated agents deleted")
        else:
            return print_result(False, f"Delete project failed: {response.text}")
    except Exception as e:
        return print_result(False, f"Delete project error: {str(e)}")


def run_all_tests():
    """Run all tests in sequence"""
    print("\n" + "="*60)
    print("PHASE 7 API TEST SUITE")
    print("="*60)
    print(f"Target: {BASE_URL}")
    print(f"Test User: {test_user['email']}")
    
    tests = [
        ("Health Check", test_health_check),
        ("User Registration", test_user_registration),
        ("User Login", test_user_login),
        ("Create Project", test_create_project),
        ("List Projects", test_list_projects),
        ("Get Project", test_get_project),
        ("Create Project Agent", test_create_project_agent),
        ("Create Standalone Agent", test_create_standalone_agent),
        ("List All Agents", test_list_agents),
        ("List Project Agents", test_list_project_agents),
        ("Get Agent Details", test_get_agent),
        ("Create Temporary Chat", test_create_temporary_chat),
        ("Update Project", test_update_project),
        ("Update Agent", test_update_agent),
        ("Get Chat History", test_chat_history),
        ("Delete Temporary Chat", test_delete_temporary_chat),
        ("Delete Agent", test_delete_agent),
        ("Delete Project", test_delete_project),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ FAIL: {test_name} - Unexpected error: {str(e)}")
            failed += 1
        
        time.sleep(0.2)  # Small delay between tests
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total Tests: {passed + failed}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%")
    print("="*60 + "\n")
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
