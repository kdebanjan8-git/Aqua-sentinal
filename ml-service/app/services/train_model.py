"""
Model Training & Continuous Learning Retraining Script for Jal-Satark / AquaSentinel.
Trains Random Forest classifiers for:
1. Risk Level (Low, Moderate, High)
2. Water Contamination Flag (0 or 1)

Supports merging newly verified consultation field data with the base dataset (jal_shield_synthetic_20000.csv)
for continuous model refinement.
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score

FEATURE_COLUMNS = [
    # Telemetry features
    'ph',
    'turbidity_ntu',
    'tds_mg_l',
    'residual_chlorine_mg_l',
    # Climate & Environmental features
    'rainfall_mm',
    'temperature_c',
    'humidity_percent',
    'flood_risk_score',
    'flood_flag',
    # Clinical & Community Symptom features
    'diarrhea_cases',
    'vomiting_cases',
    'fever_cases',
    'total_cases',
    'previous_cases',
    'nearby_cases',
    'health_reports_7d',
    'water_reports_7d',
    # Demographic & Vulnerability features
    'population',
    'latitude',
    'longitude',
    'sanitation_coverage_percent',
    'safe_water_access_percent',
    'healthcare_access_percent',
    'population_vulnerability_score'
]

def find_dataset_path() -> Path:
    """Finds the dataset file across potential relative path locations."""
    possible_paths = [
        Path("data/jal_shield_synthetic_20000.csv"),
        Path("ml-service/data/jal_shield_synthetic_20000.csv"),
        Path("../data/jal_shield_synthetic_20000.csv"),
        Path(__file__).resolve().parent.parent.parent / "data" / "jal_shield_synthetic_20000.csv",
        Path("jal_shield_synthetic_20000.csv")
    ]
    for p in possible_paths:
        if p.exists():
            return p
    raise FileNotFoundError("Could not locate jal_shield_synthetic_20000.csv in data/ or root directory.")

def get_output_model_path() -> Path:
    """Determines the output destination for risk_model.joblib."""
    dest = Path(__file__).resolve().parent.parent / "models" / "risk_model.joblib"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest

def format_consultations_to_dataframe(consultations: List[Dict[str, Any]]) -> pd.DataFrame:
    """Converts verified field consultation JSON objects into a DataFrame matching model feature schema."""
    rows = []
    for c in consultations:
        telemetry = c.get("ambient_telemetry_snapshot") or {}
        symptoms = [s.lower() for s in (c.get("reported_symptoms") or [])]
        severity = (c.get("severity") or "moderate").lower()

        ph = float(telemetry.get("ph", 7.2))
        turbidity = float(telemetry.get("turbidity", 0.8))
        tds = float(telemetry.get("tds", 150.0))
        free_chlorine = float(telemetry.get("free_chlorine", 0.5))
        rainfall = float(telemetry.get("rainfall", 20.0))
        temp = float(telemetry.get("temperature", 25.0))
        humidity = float(telemetry.get("humidity", 70.0))
        flood_score = float(telemetry.get("flood_risk_score", 15.0))

        has_diarrhea = 1 if any("diarrhea" in s or "loose" in s or "watery" in s for s in symptoms) else 0
        has_vomit = 1 if any("vomit" in s for s in symptoms) else 0
        has_fever = 1 if any("fever" in s or "chill" in s for s in symptoms) else 0
        total_cases = max(1, len(symptoms))

        # Risk mapping
        if severity in ["high", "critical"] or turbidity > 5.0 or (has_diarrhea and has_vomit):
            risk_level = "High"
            contam_flag = 1
        elif severity == "moderate" or has_diarrhea or has_fever or turbidity > 3.0:
            risk_level = "Moderate"
            contam_flag = 1 if (turbidity > 4.0 or ph < 6.5 or ph > 8.5) else 0
        else:
            risk_level = "Low"
            contam_flag = 0

        rows.append({
            'ph': ph,
            'turbidity_ntu': turbidity,
            'tds_mg_l': tds,
            'residual_chlorine_mg_l': free_chlorine,
            'rainfall_mm': rainfall,
            'temperature_c': temp,
            'humidity_percent': humidity,
            'flood_risk_score': flood_score,
            'flood_flag': 1 if flood_score > 60 else 0,
            'diarrhea_cases': has_diarrhea,
            'vomiting_cases': has_vomit,
            'fever_cases': has_fever,
            'total_cases': total_cases,
            'previous_cases': 0,
            'nearby_cases': 1,
            'health_reports_7d': 1,
            'water_reports_7d': 1,
            'population': 50000,
            'latitude': float(c.get("latitude", 26.1850)),
            'longitude': float(c.get("longitude", 91.7500)),
            'sanitation_coverage_percent': 68.0,
            'safe_water_access_percent': 72.0,
            'healthcare_access_percent': 75.0,
            'population_vulnerability_score': 32.0,
            'risk_level': risk_level,
            'water_contamination_flag': contam_flag
        })

    return pd.DataFrame(rows)

def train_and_save_models(additional_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    dataset_path = find_dataset_path()
    output_path = get_output_model_path()

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Loading base dataset from: {dataset_path} ...")
    df = pd.read_csv(dataset_path)

    if additional_df is not None and not additional_df.empty:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Merging {len(additional_df)} verified field consultation samples into training set...")
        df = pd.concat([df, additional_df], ignore_index=True)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Total dataset shape: {df.shape}")

    X = df[FEATURE_COLUMNS]
    y_risk = df['risk_level']
    y_contam = df['water_contamination_flag']

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Splitting 80% train / 20% test...")
    X_train, X_test, y_r_train, y_r_test, y_c_train, y_c_test = train_test_split(
        X, y_risk, y_contam, test_size=0.20, random_state=42, stratify=y_risk
    )

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Training Random Forest Classifier for Risk Level...")
    rf_risk = RandomForestClassifier(
        n_estimators=150,
        max_depth=16,
        min_samples_split=4,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_risk.fit(X_train, y_r_train)

    y_r_pred = rf_risk.predict(X_test)
    risk_acc = accuracy_score(y_r_test, y_r_pred)
    risk_f1 = f1_score(y_r_test, y_r_pred, average='weighted')

    print(f"[{datetime.now().strftime('%H:%M:%S')}] Training Random Forest Classifier for Water Contamination Flag...")
    rf_contam = RandomForestClassifier(
        n_estimators=150,
        max_depth=16,
        min_samples_split=4,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    rf_contam.fit(X_train, y_c_train)

    y_c_pred = rf_contam.predict(X_test)
    contam_acc = accuracy_score(y_c_test, y_c_pred)
    contam_f1 = f1_score(y_c_test, y_c_pred, average='weighted')

    # Feature Importances
    risk_importances = dict(zip(FEATURE_COLUMNS, [round(float(v), 5) for v in rf_risk.feature_importances_]))
    contam_importances = dict(zip(FEATURE_COLUMNS, [round(float(v), 5) for v in rf_contam.feature_importances_]))

    model_bundle = {
        "version": "1.1.0",
        "trained_at": datetime.now().isoformat(),
        "total_samples": len(df),
        "verified_field_samples_merged": len(additional_df) if additional_df is not None else 0,
        "feature_names": FEATURE_COLUMNS,
        "risk_model": rf_risk,
        "contamination_model": rf_contam,
        "risk_classes": list(rf_risk.classes_),
        "metrics": {
            "risk_accuracy": round(float(risk_acc), 4),
            "risk_weighted_f1": round(float(risk_f1), 4),
            "contamination_accuracy": round(float(contam_acc), 4),
            "contamination_weighted_f1": round(float(contam_f1), 4)
        },
        "feature_importances": {
            "risk_level": risk_importances,
            "water_contamination_flag": contam_importances
        }
    }

    joblib.dump(model_bundle, output_path, compress=3)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Retrained model saved successfully to {output_path}!")

    # Refresh live risk predictor if loaded in memory
    try:
        from .risk_predictor import risk_predictor
        risk_predictor.load_model()
    except Exception:
        pass

    return model_bundle

def export_and_retrain(verified_consultations: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Continuous learning entrypoint: formats verified field consultations,
    merges them with the historical dataset, and retrains the model bundle.
    """
    additional_df = None
    if verified_consultations:
        additional_df = format_consultations_to_dataframe(verified_consultations)

    return train_and_save_models(additional_df=additional_df)

if __name__ == "__main__":
    train_and_save_models()
