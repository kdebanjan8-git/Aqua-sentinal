"""
Community Outbreak & Clinic Symptom Intake Simulator.
Injects clusters of water-borne illness cases centered on Northeast India water sources.
"""
import time
import random
import requests
import sys

BACKEND_URL = "http://localhost:5000/api/symptoms"

TARGET_SOURCES = [
    {"name": "Aizawl North Zone Borehole Station", "lat": 26.1580, "lon": 91.7820},
    {"name": "Kamrup Main Intake & Treatment Plant", "lat": 26.1850, "lon": 91.7500}
]

SYMPTOM_PROFILES = [
    {
        "disease": "cholera",
        "symptoms": ["watery_diarrhea", "vomiting", "severe_dehydration"],
        "severity": "critical",
        "notes": "Patient admitted with acute watery diarrhea and severe dehydration post piped water use."
    },
    {
        "disease": "acute_gastroenteritis",
        "symptoms": ["watery_diarrhea", "vomiting", "abdominal_cramps"],
        "severity": "severe",
        "notes": "Acute gastrointestinal distress reported after municipal tap water consumption."
    },
    {
        "disease": "typhoid",
        "symptoms": ["fever", "abdominal_cramps", "mild_diarrhea"],
        "severity": "moderate",
        "notes": "Sustained high fever and abdominal cramps."
    }
]

def generate_outbreak_cluster(target_source, count: int = 5):
    print(f"🏥 Generating localized symptom cluster of {count} cases around {target_source['name']}...")

    for i in range(count):
        profile = random.choice(SYMPTOM_PROFILES)
        lat_jitter = random.gauss(0, 0.005)
        lon_jitter = random.gauss(0, 0.005)

        payload = {
            "reporter_type": "clinic_staff",
            "patient_identifier": f"KMP-PHC-{random.randint(100, 999)}",
            "patient_age_group": random.choice(["infant_0_5", "child_6_17", "adult_18_59", "senior_60_plus"]),
            "patient_gender": random.choice(["female", "male"]),
            "symptoms": profile["symptoms"],
            "suspected_disease": profile["disease"],
            "severity": profile["severity"],
            "latitude": target_source["lat"] + lat_jitter,
            "longitude": target_source["lon"] + lon_jitter,
            "notes": profile["notes"]
        }

        try:
            res = requests.post(BACKEND_URL, json=payload, timeout=2.0)
            if res.status_code == 201:
                data = res.json().get("data", {})
                corr = data.get("correlationResult")
                is_outbreak = corr.get("is_outbreak_suspected") if corr else False
                risk_score = corr.get("risk_score") if corr else "N/A"
                print(f"  📋 Logged case {payload['patient_identifier']} ({payload['suspected_disease']}) -> Outbreak Risk: {risk_score} (Outbreak={is_outbreak})")
            else:
                print(f"  ❌ Failed ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"  🔌 Connection failed: {e}")

        time.sleep(0.5)

if __name__ == "__main__":
    generate_outbreak_cluster(TARGET_SOURCES[0], count=5)
