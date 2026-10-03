# 🚀 Jal-Satark: How to Run on Any Machine

This guide provides step-by-step instructions for running the **Jal-Satark Regional Water & Health Intelligence Platform** on a fresh computer after extracting the project ZIP file.

---

## 📋 System Prerequisites

Before running, ensure the target machine has the following software installed:

1. **Node.js**: Version `v18.0+` or `v20.0+` ([Download Node.js](https://nodejs.org/))
2. **Python**: Version `3.10+` or `3.11+` ([Download Python](https://www.python.org/)) *(Make sure to check "Add Python to PATH" during installation)*
3. **Optional (For Local Llama-3 AI)**: [Ollama](https://ollama.ai/) *(The platform includes an automatic high-performance intelligent clinical fallback if Ollama is not running)*.

---

## 🛠️ Step 1: First-Time Setup (Run Once Only)

Open your terminal (PowerShell, Command Prompt, or Bash) in the unzipped project root folder:

### 1. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Install ML Service Dependencies & Verify Trained Model
```bash
cd ml-service

# Create and activate a Python virtual environment (Recommended)
# On Windows:
python -m venv venv
venv\Scripts\activate

# On macOS/Linux:
# python3 -m venv venv
# source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# (Optional) Verify model training on 20,000 dataset:
python app/services/train_model.py

cd ..
```

### 4. (Optional) Run Local Llama-3 for Vernacular Health Assistant
If you have Ollama installed and want on-device Llama-3 inference:
```bash
ollama run llama3
```

---

## ⚡ Step 2: 1-Click Launching, Sharing & Stopping (Subsequent Runs)

Once setup is complete, you can manage the entire application with 1-click script utilities located directly in the project root:

### 🟢 1. Launch Everything (Auto-Opens Browser)
- **Windows**: Double-click **`launch.bat`** (or run `.\launch.ps1` in PowerShell).
- This automatically:
  1. Starts the FastAPI ML Service (`uvicorn app.main:app --port 8000`) in the background.
  2. Starts the Node.js Express backend on port `5000` in the background.
  3. Starts the React / Vite frontend on port `5173` in the background.
  4. Waits until the frontend is responsive and **automatically opens your default browser directly to `http://localhost:5173`**.

---

### 🌐 2. Generate an Instant Public HTTPS Share Link (For Remote Devices)
- **Windows**: Double-click **`share_link.bat`** (or run `.\share_link.ps1` in PowerShell).
- Uses `localtunnel` to create a secure, instant HTTPS URL (e.g., `https://xxxx.loca.lt`) so judges, mentors, or colleagues on **phones, tablets, or other computers** can access the live application across different networks without local setup.

---

### 🔴 3. Clean Shutdown & Release All Ports
- **Windows**: Double-click **`stop.bat`** (or run `.\stop.ps1` in PowerShell).
- Safely terminates all background processes running on ports `5173` (Frontend), `5000` (Backend API), and `8000` (ML Service), preventing orphaned Node or Python processes.

---

### 🖥️ 4. Create Desktop Shortcut (1-Click Convenience)
- **Windows**: Double-click **`create_desktop_shortcut.bat`** (or run `.\create_desktop_shortcut.ps1` in PowerShell).
- Creates a **"Jal-Satark"** shortcut on your Desktop so you can launch the platform directly from your Desktop icon without navigating into folders!

---

## 🏃 Manual Step-by-Step Startup (Alternative)

If you prefer managing terminal windows manually:

### Terminal 1: Backend Express Server
```bash
cd backend
npm start
```
- **Backend API URL**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/sensors`

### Terminal 2: ML Engine & Outbreak Risk Service
```bash
cd ml-service
# Activate virtual environment if created:
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

python -m uvicorn app.main:app --port 8000 --reload
```
- **ML Service URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

### Terminal 3: Frontend React UI
```bash
cd frontend
npm run dev
```
- **Web Interface URL**: `http://localhost:5173`

---

## 🔑 Demo Login Credentials & 1-Click Evaluation Presets

The login modal contains **⚡ 1-Click Demo Buttons** for instant evaluation without typing:

| Role | Email | Password | Privileges & Key Features |
| :--- | :--- | :--- | :--- |
| **District Health Admin** | `admin@jalsatark.gov.in` | `Admin@123` | **Tactical Obsidian Dark Theme**, Master Database Explorer, CSV/JSON Export, E2EE Classified Inbox, Emergency Advisory Broadcast. |
| **ASHA Worker** | `healthworker@jalsatark.gov.in` | `Health@123` | **ASHA Field Surveillance Desk**, Household Proxy Registration, ORS/Chlorine field actions, Emergency Cluster Flagging. |
| **Citizen / Volunteer** | `citizen@jalsatark.gov.in` | `Citizen@123` | **Public Health Desk**, E2EE Cryptographic Whistleblower Dispatch, Vernacular Voice/Vision AI Assistant, Map HUD. |

---

## 🧪 Testing & Verification

To verify that all services and test suites are 100% operational:

### Run Backend & RBAC Test Suite (27 tests):
```bash
cd backend
npm test
```

### Run ML Service Unit Tests (11 tests):
```bash
cd ml-service
python tests/run_tests.py
```

### Verify Frontend Production Build:
```bash
cd frontend
npm run build
```

---

## 🛡️ Port Summary

| Port | Service | Description |
| :--- | :--- | :--- |
| **`5173`** | **Frontend Client** | Vite React 18 Application |
| **`5000`** | **Backend Server** | Node.js Express REST API & Socket.IO |
| **`8000`** | **ML Engine** | FastAPI Outbreak Predictor & Vision Service |
| **`11434`** | **Ollama LLM** | (Optional) Local Llama-3 Edge Assistant |
| **`5432`** | **PostgreSQL** | (Optional - In-memory store `dbStore.js` runs automatically if no database is connected) |
