# 🌊 Jal-Satark: Regional Water & Health Intelligence Platform
### *Smart Community Health Surveillance, Water Quality Early Warning & Emergency Response System*

> An intelligent, high-visibility public health emergency intelligence platform correlating real-time IoT water quality sensor streams across **62 regional stations in Meghalaya, Assam, Manipur, Mizoram, and Nagaland** with community clinical symptom logs to detect contamination events and mitigate water-borne disease outbreaks before clinical surges occur.

---

## 🏛️ Monorepo Architecture

```
aqua-sentinel/
├── backend/             # Node.js / Express / Socket.io + E2EE & RBAC Gateway + PostGIS Integration
│   ├── src/controllers/ # Admin DB Explorer, ASHA Surveillance, E2EE Dispatch, Sensors, Symptoms, Alerts
│   ├── src/models/      # InMemoryStore (dbStore.js) with dynamic dataset loader
│   ├── src/utils/       # datasetLoader.js (Parses 20,000 CSV into 62 multi-state stations)
│   └── tests/           # 27 automated integration tests across 5 test suites
├── ml-service/          # Python 3.12 FastAPI + scikit-learn & Local Llama-3 Health AI
│   ├── app/models/      # Random Forest model (risk_model.joblib) trained on 20,000 records
│   ├── app/services/    # train_model.py, anomaly_detector.py, image_analyzer.py, llama_chat.py
│   ├── data/            # jal_shield_synthetic_20000.csv (20,000 multi-modal dataset)
│   └── tests/           # 11 unit & multi-lingual tests
├── frontend/            # React 18 (Vite) + Tailwind CSS + Leaflet GIS + ASHA Desk + DB Explorer
│   ├── src/components/  # AdminDataExplorer, AshaFieldDesk, LeafletMap, HealthChatDrawer, SecureDispatch
│   ├── src/context/     # AuthContext (RBAC), AppContext (Live Telemetry & Sockets)
│   └── src/services/    # api.js & client-side Web Crypto API (crypto.js)
├── database/            # PostGIS DDL Migrations & Seed Fixtures
│   ├── migrations/      # 001_init_postgis.sql -> 008_asha_proxy_reports.sql
│   └── seeds/           # sample_data.sql (Multi-state Northeast station seeds)
├── launch.bat           # 1-Click Automated Launcher (Background services + Auto browser open)
├── launch.ps1           # PowerShell Automated Launcher
├── stop.bat             # Clean Process Terminator & Port Release (5173, 5000, 8000)
├── stop.ps1             # PowerShell Clean Terminator
├── share_link.bat       # Instant Public HTTPS Link Generator (via localtunnel)
├── share_link.ps1       # PowerShell Tunnel Link Generator
├── HOW_TO_RUN.md        # Comprehensive step-by-step execution guide
└── HACKATHON_SUMMARY.md # Full technical specification, features & data security documentation
```

---

## 🚀 How to Run on Any Machine

### Step 1: First-Time Setup (Run Once Only)
```bash
# 1. Install Backend Dependencies
cd backend && npm install && cd ..

# 2. Install Frontend Dependencies
cd frontend && npm install && cd ..

# 3. Install Python ML Dependencies & Verify Model
cd ml-service
python -m venv venv
venv\Scripts\activate       # (On Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
python app/services/train_model.py
cd ..
```

### Step 2: 1-Click Launching, Sharing & Stopping (Subsequent Runs)
- **🟢 Launch Application & Auto-Open Browser**: Double click **`launch.bat`** (or run `.\launch.ps1`).
- **🌐 Generate Instant Public HTTPS Link**: Double click **`share_link.bat`** (or run `.\share_link.ps1`).
- **🔴 Clean Shutdown & Free Ports**: Double click **`stop.bat`** (or run `.\stop.ps1`).

---

### Manual Startup Alternative (3 Terminals):
- **Terminal 1 (Backend API)**: `cd backend && npm start` &rarr; `http://localhost:5000`
- **Terminal 2 (ML Engine)**: `cd ml-service && python -m uvicorn app.main:app --port 8000 --reload` &rarr; `http://localhost:8000`
- **Terminal 3 (Frontend UI)**: `cd frontend && npm run dev` &rarr; `http://localhost:5173`

---

## 🔑 Demo Credentials & 1-Click Evaluation Presets

The login modal contains **⚡ 1-Click Demo Buttons** for instant evaluation:

| Role | Email | Password | Privileges & Key Features |
| :--- | :--- | :--- | :--- |
| **District Health Admin** | `admin@jalsatark.gov.in` | `Admin@123` | **Tactical Obsidian Dark Theme**, Master Database Explorer, CSV/JSON Export, E2EE Classified Inbox, Emergency Advisory Broadcast. |
| **ASHA Worker** | `healthworker@jalsatark.gov.in` | `Health@123` | **ASHA Field Surveillance Desk**, Household Proxy Registration, ORS/Chlorine field actions, Emergency Cluster Flagging. |
| **Citizen / Volunteer** | `citizen@jalsatark.gov.in` | `Citizen@123` | **Public Health Desk**, E2EE Cryptographic Whistleblower Dispatch, Vernacular Voice/Vision AI Assistant, Map HUD. |

---

## 🛡️ Data Security & Privacy Protection

1. **Zero-Knowledge End-to-End Encryption (E2EE)**:
   - Hazard reports and whistleblower tips are encrypted client-side using `window.crypto.subtle` (**RSA-OAEP 2048-bit** + **AES-GCM 256-bit**).
   - The backend and database only store ciphertext blobs; only the authenticated District Admin private key in volatile memory can decrypt tips.
2. **Strict Role-Based Access Control (RBAC)**:
   - JWT tokens verified via middleware. Privileged routes (`/api/advisories`, `/api/admin/db/*`, `/api/encrypted-reports`) strictly reject unauthorized roles with `403 Forbidden`.
3. **Audit Log Sanitization**:
   - `password_hash` and `plain_password_fallback` are permanently stripped from all database queries, explorer views, and exported files.
4. **Edge & On-Device AI Privacy**:
   - All ML inference and local Llama-3 triage run on-premises. Zero patient symptom data, location coordinates, or water telemetry are ever transmitted to third-party public AI APIs.
5. **Injection Hardening**:
   - Parameterized SQL queries and RFC-4180 CSV escaping neutralize SQLi, XSS, and CSV formula injection vectors.

---

## 🧪 Automated Test Verification

| Test Suite | Command | Total Tests |
| :--- | :--- | :--- |
| **Backend & RBAC Integration** | `cd backend && npm test` | **27 / 27 Passed** |
| **ML Engine & Vision Pipeline** | `cd ml-service && python tests/run_tests.py` | **11 / 11 Passed** |
| **Frontend Production Build** | `cd frontend && npm run build` | **Built Cleanly in 3.53s** |
