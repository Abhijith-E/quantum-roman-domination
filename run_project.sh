#!/bin/bash

echo "🚀 Starting Quantum Roman Domination Project..."

PROJECT_ROOT="$(pwd)"

# -------------------------------
# STEP 1: Virtual Environment
# -------------------------------
cd "$PROJECT_ROOT" || exit

if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "✅ Activating virtual environment..."
source venv/bin/activate

echo "📥 Installing Python requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# -------------------------------
# STEP 2: Run setup_ibm.py
# -------------------------------
echo "🔧 Running IBM setup..."
cd "$PROJECT_ROOT/backend" || exit
python setup_ibm.py

# -------------------------------
# STEP 3: Start Backend
# -------------------------------
echo "🧠 Starting backend server..."
python app.py &
BACKEND_PID=$!

# -------------------------------
# STEP 4: Frontend
# -------------------------------
cd "$PROJECT_ROOT" || exit

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    echo "Install Node.js from https://nodejs.org"
    exit 1
fi

echo "🌐 Starting frontend..."
npm install
npm run dev &
FRONTEND_PID=$!

# -------------------------------
# STEP 5: Handle Ctrl+C
# -------------------------------
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; deactivate; exit" SIGINT

echo "✅ Project is running!"
echo "Press Ctrl+C to stop everything."

wait
