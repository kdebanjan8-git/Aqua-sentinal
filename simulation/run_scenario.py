"""
End-to-End Early Warning Demonstration Scenario for Jal-Satark.
Demonstrates the full detection-to-warning lifecycle in the Brahmaputra / Northeast Grid.
Standardized on deterministic WHO/BIS safety limits (Turbidity > 5.0 NTU, Cluster > 5 cases).
"""
import time
import requests
import sys

BASE_URL = "http://localhost:5000/api"

def print_banner(text):
    print("\n" + "=" * 75)
    print(f"  {text}")
    print("=" * 75)

def run_demo():
    print_banner("JAL-SATARK: REGIONAL WATER & HEALTH INTELLIGENCE PLATFORM")
    
    # Step 1: Health Check
    try:
        res = requests.get("http://localhost:5000/health", timeout=3.0)
        print(f"✅ Backend Health: {res.json()}")
    except Exception as e:
        print(f"❌ Backend not reachable at http://localhost:5000 ({e}).")
        print("Please start the backend: cd backend && npm start")
        return

    # Step 2: Reset to Clean State
    print("\n🔄 Step 1: Resetting database to clean regional baseline (0 alerts, all nominal)...")
    requests.post(f"{BASE_URL}/simulation/reset")
    time.sleep(1)

    # Step 3: Stream Normal Baseline
    print("\n💧 Step 2: Streaming normal potable water telemetry for Kamrup Main Treatment Plant...")
    normal_payload = {
        "sensor_id": "b1000000-0000-0000-0000-000000000001",
        "ph": 7.3,
        "turbidity": 0.45,
        "tds": 140.0,
        "orp": 715.0,
        "temperature": 23.5,
        "free_chlorine": 0.62
    }
    res = requests.post(f"{BASE_URL}/telemetry", json=normal_payload)
    print(f"  -> Ingested: WQI={res.json()['data']['reading']['wqi_score']}, Status={res.json()['data']['mlResult']['severity']}")
    time.sleep(2)

    # Step 4: Inject Bacterial Contamination Spike at Aizawl North Station (Turbidity > 5.0 NTU Limit)
    print_banner("🚨 INJECTING CONTAMINATION SPIKE AT AIZAWL NORTH (TURBIDITY=7.85 NTU > 5.0 NTU LIMIT)")
    spike_payload = {
        "sensor_id": "b1000000-0000-0000-0000-000000000003",
        "ph": 6.35,
        "turbidity": 7.85,
        "tds": 380.0,
        "orp": 410.0,
        "temperature": 27.2,
        "free_chlorine": 0.02
    }
    res = requests.post(f"{BASE_URL}/telemetry", json=spike_payload)
    reading_data = res.json()["data"]
    print(f"  -> Threshold Breach Detected: Turbidity={reading_data['reading']['turbidity']} NTU (Safety Limit: 5.0 NTU)")
    print(f"  -> WQI Score: {reading_data['reading']['wqi_score']} ({reading_data['reading']['wqi_grade']})")
    print(f"  -> AI Severity: {reading_data['mlResult']['severity'].upper()}")
    print(f"  -> Plain-English Reason: {reading_data['mlResult']['anomaly_reasons'][0]}")
    time.sleep(2)

    # Step 5: Community Clinic Symptom Cluster (> 5 cases in 2.0 km)
    print_banner("🏥 CLINIC INTAKE: SURGE OF 6 GASTROENTERITIS CASES (CLUSTER THRESHOLD > 5 CASES)")
    symptoms_list = [
        {"disease": "cholera", "symptoms": ["watery_diarrhea", "vomiting", "severe_dehydration"], "sev": "critical", "age": "infant_0_5"},
        {"disease": "acute_gastroenteritis", "symptoms": ["watery_diarrhea", "vomiting"], "sev": "severe", "age": "child_6_17"},
        {"disease": "acute_gastroenteritis", "symptoms": ["watery_diarrhea", "abdominal_cramps"], "sev": "severe", "age": "adult_18_59"},
        {"disease": "cholera", "symptoms": ["watery_diarrhea", "vomiting"], "sev": "critical", "age": "senior_60_plus"},
        {"disease": "acute_gastroenteritis", "symptoms": ["watery_diarrhea", "fever"], "sev": "moderate", "age": "adult_18_59"},
        {"disease": "acute_gastroenteritis", "symptoms": ["watery_diarrhea"], "sev": "moderate", "age": "child_6_17"}
    ]

    for s in symptoms_list:
        p = {
            "reporter_type": "clinic_staff",
            "patient_identifier": f"KMP-DEMO-{s['age'][:3].upper()}-{int(time.time()*100)%1000}",
            "patient_age_group": s["age"],
            "symptoms": s["symptoms"],
            "suspected_disease": s["disease"],
            "severity": s["sev"],
            "latitude": 26.1580 + ((time.time() * 1000) % 5) * 0.001,
            "longitude": 91.7820 + ((time.time() * 1000) % 5) * 0.001,
            "notes": "Emergency presentation at local clinic"
        }
        res = requests.post(f"{BASE_URL}/symptoms", json=p)
        print(f"  -> Logged case for {p['patient_identifier']} ({p['suspected_disease']})")
        time.sleep(0.5)

    # Step 6: Verify Active Alerts
    print_banner("📢 JAL-SATARK PUBLIC HEALTH ADVISORY & OUTBREAK TRIAGE STATUS")
    alerts_res = requests.get(f"{BASE_URL}/alerts?status=active")
    alerts = alerts_res.json().get("data", [])
    print(f"Active Alerts Generated: {len(alerts)}")
    for a in alerts:
        print(f"  🚨 [{a['alert_code']}] Severity: {a['severity'].upper()} | Station: {a['source_name']}")
        print(f"     Explanation: {a.get('trigger_explanation', a['recommended_action'])}")
        print(f"     Population at Risk: {a['population_at_risk']:,} citizens | Geofence Radius: {a['radius_km']} km")

if __name__ == "__main__":
    run_demo()
