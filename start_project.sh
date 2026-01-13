#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# set -e

echo "==================================================="
echo "   🚀  Initializing Signed Graph Solver Project  🚀"
echo "==================================================="

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# --- 1. SET UP BACKEND ---
echo "Checking Backend Environment..."
cd backend

if [ ! -d "venv" ]; then
    echo " > Creating virtual environment (venv)..."
    python3 -m venv venv
    
    echo " > Activating venv and installing dependencies..."
    source venv/bin/activate
    pip install --upgrade pip
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        echo "WARNING: requirements.txt not found!"
    fi
else
    echo " > Virtual environment found. Activating..."
    source venv/bin/activate
fi

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑  Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Trap Control-C to run cleanup
trap cleanup SIGINT

# Start Backend in Background
echo " > Starting Flask Backend (Port 5000)..."
python3 app.py &
BACKEND_PID=$!

# --- 2. SET UP FRONTEND ---
cd "$DIR"
echo "Checking Frontend Environment..."

if [ ! -d "node_modules" ]; then
    echo " > node_modules not found. Installing dependencies..."
    npm install
fi

echo " > Starting Vite Frontend..."
# Using 'npm run dev' but resolving slightly to ensure output visibility
npm run dev &
FRONTEND_PID=$!

echo "==================================================="
echo "   ✅  Front & Back Ends Running!"
echo "   🌍  Open: http://localhost:5173"
echo "   ⌨️   Press Ctrl+C to stop everything."
echo "==================================================="

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
