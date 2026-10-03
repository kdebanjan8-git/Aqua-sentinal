"""
IoT Water Quality Telemetry Generator & Continuous Streaming Simulator.
Sends real-time telemetry packets to the Node.js / Express backend with realistic diurnal variations for Northeast India water grid.
"""
import time
import random
import requests
import sys

BACKEND_URL = "http://localhost:5000/api/telemetry"

SENSOR_NODES = [
    {"id": "b1000000-0000-0000-0000-000000000001", "uid": "NODE-KAMRUP-01", "name": "Kamrup Main Intake & Treatment Plant"},
    {"id": "b1000000-0000-0000-0000-000000000002", "uid": "NODE-PANDU-02", "name": "Pandu Ghat Brahmaputra Pumping Station"},
    {"id": "b1000000-0000-0000-0000-000000000003", "uid": "NODE-AIZAWL-03", "name": "Aizawl North Zone Borehole Station"},
    {"id": "b1000000-0000-0000-0000-000000000004", "uid": "NODE-DISPUR-04", "name": "Dispur Capital Tap Cluster #7"},
    {"id": "b1000000-0000-0000-0000-000000000005", "uid": "NODE-IMPHAL-05", "name": "Imphal River Downstream Terminal"}
]

def generate_normal_reading(sensor_id: str):
    return {
        "sensor_id": sensor_id,
        "ph": round(random.gauss(7.3, 0.2), 2),
        "turbidity": round(max(0.1, random.expovariate(2.0)), 2), # ~0.2 - 0.9 NTU
        "tds": round(random.gauss(155.0, 18.0), 1),              # ~135 - 190 ppm
        "orp": round(random.gauss(705.0, 25.0), 1),              # ~665 - 745 mV
        "temperature": round(random.gauss(24.2, 1.2), 1),
        "dissolved_oxygen": round(random.gauss(7.7, 0.4), 2),
        "free_chlorine": round(random.gauss(0.58, 0.08), 2),
        "conductivity": round(random.gauss(330.0, 25.0), 1)
    }

def generate_spike_reading(sensor_id: str):
    return {
        "sensor_id": sensor_id,
        "ph": round(random.uniform(6.1, 6.4), 2),
        "turbidity": round(random.uniform(6.5, 9.2), 2), # Severe turbidity surge
        "tds": round(random.uniform(520.0, 680.0), 1),
        "orp": round(random.uniform(380.0, 490.0), 1),    # Dangerous microbial survival
        "temperature": round(random.uniform(26.0, 28.5), 1),
        "dissolved_oxygen": round(random.uniform(3.2, 4.5), 2),
        "free_chlorine": round(random.uniform(0.01, 0.05), 2), # Depleted disinfectant
        "conductivity": round(random.uniform(850.0, 1100.0), 1)
    }

def run_simulation(interval_sec: float = 3.0, iterations: int = 100):
    print("🌊 Starting Jal-Satark IoT Water Quality Streaming Simulator (Northeast Grid)...")
    print(f"📡 Ingestion endpoint: {BACKEND_URL}")
    print(f"⏱️ Interval: {interval_sec}s per cycle")
    print("-" * 65)

    for step in range(iterations):
        for sensor in SENSOR_NODES:
            if sensor["uid"] == "NODE-AIZAWL-03" and random.random() < 0.3:
                payload = generate_spike_reading(sensor["id"])
                tag = "⚠️ [ANOMALY SPIKE]"
            else:
                payload = generate_normal_reading(sensor["id"])
                tag = "✅ [NORMAL]"

            try:
                res = requests.post(BACKEND_URL, json=payload, timeout=2.0)
                if res.status_code == 201:
                    data = res.json().get("data", {})
                    wqi = data.get("reading", {}).get("wqi_score", "N/A")
                    print(f"{tag} {sensor['uid']}: pH={payload['ph']}, Turb={payload['turbidity']} NTU, ORP={payload['orp']} mV -> WQI: {wqi}")
                else:
                    print(f"❌ Error ({res.status_code}): {res.text}")
            except Exception as e:
                print(f"🔌 Connection failed: {e}. Ensure backend is running on {BACKEND_URL}")

        time.sleep(interval_sec)

if __name__ == "__main__":
    run_simulation()
