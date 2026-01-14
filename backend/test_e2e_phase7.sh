#!/bin/bash

# Phase 7 End-to-End Test Script
# Tests the complete Phase 7 Projects & Agents Architecture

set -e  # Exit on error

echo "===================================="
echo "Phase 7 E2E Tests"
echo "===================================="
echo ""

# Check if backend is running
echo "1. Checking if backend is running..."
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo "✓ Backend is running"
else
    echo "✗ Backend is not running. Please start it with:"
    echo "  cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
    exit 1
fi

echo ""
echo "2. Running comprehensive API tests..."
cd "$(dirname "$0")"
source venv/bin/activate
python tests/test_phase7_api.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "===================================="
    echo "✅ ALL PHASE 7 TESTS PASSED"
    echo "===================================="
    echo ""
    echo "Phase 7 Features Tested:"
    echo "  ✓ User Registration & Authentication"
    echo "  ✓ Projects (Folders) - Create, Read, Update, Delete"
    echo "  ✓ Agents (AI Chats) - Standalone & Project-based"
    echo "  ✓ Agent Types - Standalone vs Project Agent"
    echo "  ✓ Optional Prompts - For both projects and agents"
    echo "  ✓ Temporary Chats - Create & Delete"
    echo "  ✓ Context Sharing - Enable/disable in projects"
    echo "  ✓ Cascade Deletes - Projects delete associated agents"
    echo "  ✓ Chat History - Retrieve messages for agents"
    echo ""
    echo "Next Steps:"
    echo "  1. Test the frontend at http://localhost:3000"
    echo "  2. Commit changes: git commit -am 'feat: complete phase 7 with full test coverage'"
    echo "  3. Push to GitHub: git push"
    echo ""
else
    echo ""
    echo "===================================="
    echo "❌ SOME TESTS FAILED"
    echo "===================================="
    echo ""
    echo "Please review the error messages above and fix any issues."
    exit 1
fi
