#!/bin/bash
echo "======================================================================"
echo "   Starting Jal-Satark Platform (Backend, ML Service, Frontend)"
echo "======================================================================"
echo ""

# 1. Start Backend
echo "[1/3] Starting Express Backend (Port 5000)..."
(cd backend && npm run dev) &
BACKEND_PID=$!

# 2. Start ML Service
echo "[2/3] Starting FastAPI ML Engine (Port 8000)..."
if [ -f "ml-service/venv/bin/python" ]; then
  PYTHON_CMD="venv/bin/python"
elif command -v python3 &>/dev/null; then
  PYTHON_CMD="python3"
else
  PYTHON_CMD="python"
fi
(cd ml-service && $PYTHON_CMD -m uvicorn app.main:app --port 8000 --reload) &
ML_PID=$!

# 3. Start Frontend
echo "[3/3] Starting Vite React Frontend (Port 5173)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo " All services running in background!"
echo " - Frontend: http://localhost:5173"
echo " - Backend API: http://localhost:5000"
echo " - ML Service: http://localhost:8000"
echo " Press Ctrl+C to terminate all services."
echo "======================================================================"

trap "kill $BACKEND_PID $ML_PID $FRONTEND_PID" SIGINT SIGTERM
wait
