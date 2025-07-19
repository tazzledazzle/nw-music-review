#!/bin/bash

# Venue Explorer Fullstack Application Stop Script
# This script stops both the FastAPI backend and Next.js frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Stopping Venue Explorer Fullstack Application..."

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$pids" ]; then
        print_status "Stopping $service_name on port $port..."
        echo $pids | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$remaining_pids" ]; then
            print_warning "Force killing $service_name processes..."
            echo $remaining_pids | xargs kill -9 2>/dev/null || true
        fi
        
        print_success "$service_name stopped"
    else
        print_status "No $service_name processes found on port $port"
    fi
}

# Read PIDs from files if they exist
API_PID=""
FRONTEND_PID=""

if [ -f "logs/api.pid" ]; then
    API_PID=$(cat logs/api.pid)
    if kill -0 $API_PID 2>/dev/null; then
        print_status "Stopping FastAPI backend (PID: $API_PID)..."
        kill -TERM $API_PID 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        if kill -0 $API_PID 2>/dev/null; then
            print_warning "Force killing FastAPI backend..."
            kill -9 $API_PID 2>/dev/null || true
        fi
        print_success "FastAPI backend stopped"
    fi
    rm -f logs/api.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping Next.js frontend (PID: $FRONTEND_PID)..."
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            print_warning "Force killing Next.js frontend..."
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        print_success "Next.js frontend stopped"
    fi
    rm -f logs/frontend.pid
fi

# Also kill any processes on the expected ports as a backup
kill_port_processes 8000 "FastAPI Backend"
kill_port_processes 3000 "Next.js Frontend"

# Clean up log files (optional)
if [ "$1" == "--clean-logs" ]; then
    print_status "Cleaning up log files..."
    rm -f logs/*.log
    print_success "Log files cleaned"
fi

print_success "🛑 Venue Explorer Fullstack Application stopped successfully!"

echo ""
echo "To restart the application, run: ./start-fullstack.sh"
