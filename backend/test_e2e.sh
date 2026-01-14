#!/bin/bash
# End-to-End Testing Script for Chatbot Platform
# Tests Phases 2, 3, and 4 with real database
# 
# NOTE: This script needs to be updated for Phase 7 architecture:
# - Projects are now folders containing agents
# - Agents are the new chat entities (standalone or project-based)
# - Temporary chats are now supported
# - Context management with project and agent prompts
#
# TODO: Update this script to test the new Phase 7 endpoints

set -e  # Exit on error

BASE_URL="http://localhost:8000"
echo "=================================="
echo "End-to-End Testing - Chatbot Platform"
echo "=================================="
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo "ERROR: Server is not running at $BASE_URL"
    echo "Please start the server with: uvicorn app.main:app --reload"
    exit 1
fi
echo "[OK] Server is running"
echo ""

# Phase 2: Authentication Tests
echo "=================================="
echo "Phase 2: Authentication Tests"
echo "=================================="

# Generate random email to avoid conflicts
RANDOM_EMAIL="test_$(date +%s)@example.com"

echo "Registering new user: $RANDOM_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$RANDOM_EMAIL\", \"password\": \"testpass123\", \"name\": \"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "email"; then
    echo "[OK] User registered successfully"
else
    echo "[FAIL] Registration failed: $REGISTER_RESPONSE"
    exit 1
fi
echo ""

echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$RANDOM_EMAIL\", \"password\": \"testpass123\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "[FAIL] Login failed: $LOGIN_RESPONSE"
    exit 1
fi
echo "[OK] Login successful. Token: ${TOKEN:0:20}..."
echo ""

echo "Getting current user info..."
USER_INFO=$(curl -s -X GET "$BASE_URL/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$USER_INFO" | grep -q "$RANDOM_EMAIL"; then
    echo "[OK] User info retrieved successfully"
else
    echo "[FAIL] Failed to get user info: $USER_INFO"
    exit 1
fi
echo ""

# Phase 3: Projects Tests
echo "=================================="
echo "Phase 3: Projects Tests"
echo "=================================="

echo "Creating a new project..."
CREATE_PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "E2E Test Bot", "description": "Testing chatbot project"}')

PROJECT_ID=$(echo "$CREATE_PROJECT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "[FAIL] Project creation failed: $CREATE_PROJECT_RESPONSE"
    exit 1
fi
echo "[OK] Project created successfully. ID: $PROJECT_ID"
echo ""

echo "Listing all projects..."
PROJECTS_LIST=$(curl -s -X GET "$BASE_URL/api/v1/projects" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROJECTS_LIST" | grep -q "$PROJECT_ID"; then
    echo "[OK] Projects listed successfully"
else
    echo "[FAIL] Failed to list projects: $PROJECTS_LIST"
    exit 1
fi
echo ""

echo "Getting single project..."
SINGLE_PROJECT=$(curl -s -X GET "$BASE_URL/api/v1/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SINGLE_PROJECT" | grep -q "E2E Test Bot"; then
    echo "[OK] Single project retrieved successfully"
else
    echo "[FAIL] Failed to get project: $SINGLE_PROJECT"
    exit 1
fi
echo ""

echo "Updating project..."
UPDATE_PROJECT=$(curl -s -X PUT "$BASE_URL/api/v1/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated E2E Test Bot", "description": "Updated description"}')

if echo "$UPDATE_PROJECT" | grep -q "Updated E2E Test Bot"; then
    echo "[OK] Project updated successfully"
else
    echo "[FAIL] Failed to update project: $UPDATE_PROJECT"
    exit 1
fi
echo ""

# Phase 4: Prompts Tests
echo "=================================="
echo "Phase 4: Prompts Tests"
echo "=================================="

echo "Creating a system prompt..."
CREATE_SYSTEM_PROMPT=$(curl -s -X POST "$BASE_URL/api/v1/prompts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"project_id\": \"$PROJECT_ID\", \"name\": \"System Prompt\", \"content\": \"You are a helpful AI assistant.\", \"is_system_prompt\": true}")

SYSTEM_PROMPT_ID=$(echo "$CREATE_SYSTEM_PROMPT" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$SYSTEM_PROMPT_ID" ]; then
    echo "[FAIL] System prompt creation failed: $CREATE_SYSTEM_PROMPT"
    exit 1
fi
echo "[OK] System prompt created successfully. ID: $SYSTEM_PROMPT_ID"
echo ""

echo "Creating a user prompt..."
CREATE_USER_PROMPT=$(curl -s -X POST "$BASE_URL/api/v1/prompts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"project_id\": \"$PROJECT_ID\", \"name\": \"Greeting\", \"content\": \"Say hello to the user.\", \"is_system_prompt\": false}")

USER_PROMPT_ID=$(echo "$CREATE_USER_PROMPT" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$USER_PROMPT_ID" ]; then
    echo "[FAIL] User prompt creation failed: $CREATE_USER_PROMPT"
    exit 1
fi
echo "[OK] User prompt created successfully. ID: $USER_PROMPT_ID"
echo ""

echo "Listing all prompts for project..."
PROMPTS_LIST=$(curl -s -X GET "$BASE_URL/api/v1/prompts/project/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$PROMPTS_LIST" | grep -q "$SYSTEM_PROMPT_ID" && echo "$PROMPTS_LIST" | grep -q "$USER_PROMPT_ID"; then
    echo "[OK] Prompts listed successfully (found both system and user prompts)"
else
    echo "[FAIL] Failed to list prompts: $PROMPTS_LIST"
    exit 1
fi
echo ""

echo "Getting single prompt..."
SINGLE_PROMPT=$(curl -s -X GET "$BASE_URL/api/v1/prompts/$SYSTEM_PROMPT_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SINGLE_PROMPT" | grep -q "helpful AI assistant"; then
    echo "[OK] Single prompt retrieved successfully"
else
    echo "[FAIL] Failed to get prompt: $SINGLE_PROMPT"
    exit 1
fi
echo ""

echo "Updating prompt..."
UPDATE_PROMPT=$(curl -s -X PUT "$BASE_URL/api/v1/prompts/$SYSTEM_PROMPT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "You are a very helpful and friendly AI assistant."}')

if echo "$UPDATE_PROMPT" | grep -q "very helpful and friendly"; then
    echo "[OK] Prompt updated successfully"
else
    echo "[FAIL] Failed to update prompt: $UPDATE_PROMPT"
    exit 1
fi
echo ""

# Cleanup
echo "=================================="
echo "Cleanup"
echo "=================================="

echo "Deleting user prompt..."
DELETE_USER_PROMPT=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/api/v1/prompts/$USER_PROMPT_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_USER_PROMPT" = "204" ]; then
    echo "[OK] User prompt deleted successfully"
else
    echo "[WARN] Failed to delete user prompt (HTTP $DELETE_USER_PROMPT)"
fi

echo "Deleting system prompt..."
DELETE_SYSTEM_PROMPT=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/api/v1/prompts/$SYSTEM_PROMPT_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_SYSTEM_PROMPT" = "204" ]; then
    echo "[OK] System prompt deleted successfully"
else
    echo "[WARN] Failed to delete system prompt (HTTP $DELETE_SYSTEM_PROMPT)"
fi

echo "Deleting project..."
DELETE_PROJECT=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/api/v1/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_PROJECT" = "204" ]; then
    echo "[OK] Project deleted successfully"
else
    echo "[WARN] Failed to delete project (HTTP $DELETE_PROJECT)"
fi
echo ""

# Final Summary
echo "=================================="
echo "All Tests Passed!"
echo "=================================="
echo ""
echo "Summary:"
echo "  [OK] Phase 2 (Auth): Register, Login, Get User"
echo "  [OK] Phase 3 (Projects): Create, List, Get, Update, Delete"
echo "  [OK] Phase 4 (Prompts): Create, List, Get, Update, Delete"
echo ""
echo "Test completed successfully!"
