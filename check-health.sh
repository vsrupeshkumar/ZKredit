#!/bin/bash

echo "========================================"
echo "Zkredit - System Health Check"
echo "========================================"

# 1. Check Ollama
echo -n "Checking Ollama... "
if curl -s localhost:11434 > /dev/null; then
    echo "[OK] Running"
else
    echo "[FAIL] Not running (Is 'ollama serve' running?)"
fi

# 2. Check Python Agent (Backend)
echo -n "Checking Backend API... "
if curl -s http://localhost:8000 > /dev/null; then
    echo "[OK] Running"
else
    echo "[FAIL] Not running (Is 'python server.py' running?)"
fi

# 3. Check Node Modules
echo -n "Checking Frontend Dependencies... "
if [ -d "frontend/Dashboard/node_modules" ]; then
    echo "[OK] Installed"
else
    echo "[FAIL] Missing (Run 'npm install' in frontend/Dashboard)"
fi

echo "========================================"
echo "System Report Complete"
echo "========================================"
