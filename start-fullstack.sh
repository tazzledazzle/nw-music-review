#!/bin/bash

# Startup script to run both FastAPI backend and Next.js frontend

echo "🚀 Starting Venue Explorer Full Stack Application"
echo "================================================="

# Function to cleanup background processes on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    kill $FASTAPI_PID $NEXTJS_PID 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM to cleanup
trap cleanup SIGINT SIGTERM

# Navigate to project root
cd "$(dirname "$0")"

# Check if required files exist
if [ ! -f "venue-explorer-api/requirements.txt" ]; then
    echo "❌ FastAPI requirements.txt not found. Please ensure venue-explorer-api directory exists."
    exit 1
fi

if [ ! -f "venue-explorer/package.json" ]; then
    echo "❌ Next.js package.json not found. Please ensure venue-explorer directory exists."
    exit 1
fi

echo "📦 Installing Python dependencies..."
cd venue-explorer-api
# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

echo "🐍 Starting FastAPI server..."
python main.py &
FASTAPI_PID=$!
cd ..

echo "📦 Installing Node.js dependencies..."
cd venue-explorer
npm install

echo "⚡ Starting Next.js development server..."
npm run dev &
NEXTJS_PID=$!
cd ..

echo "✅ Both servers are starting..."
echo "🌐 FastAPI API: http://localhost:8000"
echo "🌐 FastAPI Docs: http://localhost:8000/docs"
echo "🌐 Next.js Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $FASTAPI_PID $NEXTJS_PID
