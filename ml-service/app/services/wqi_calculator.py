"""
Water Quality Index (WQI) Calculator
Implements Weighted Arithmetic Index method based on WHO/EPA standards.
"""
from typing import Dict
from ..models.schemas import TelemetryPayload, WQIResult

# Standard drinking water benchmarks (WHO / EPA)
STANDARDS = {
    "ph": {"ideal": 7.0, "standard": 8.5, "min": 6.5, "weight": 0.20},
    "turbidity": {"ideal": 0.0, "standard": 1.0, "weight": 0.25},  # NTU
    "tds": {"ideal": 50.0, "standard": 300.0, "weight": 0.15},     # ppm / mg/L
    "orp": {"ideal": 750.0, "standard": 650.0, "weight": 0.20},   # mV (Disinfection potential)
    "dissolved_oxygen": {"ideal": 9.0, "standard": 5.0, "weight": 0.10}, # mg/L
    "free_chlorine": {"ideal": 0.5, "standard": 0.2, "weight": 0.10}    # mg/L
}

def calculate_wqi(telemetry: TelemetryPayload) -> WQIResult:
    """
    Computes a comprehensive 0-100 Water Quality Index score.
    Score of 100 = Pristine/Safe, Score of 0 = Highly Toxic/Hazardous.
    """
    sub_indices: Dict[str, float] = {}
    weighted_scores = 0.0
    total_weight = 0.0

    # 1. pH Sub-index (Optimal 7.0, acceptable 6.5 - 8.5)
    ph = telemetry.ph
    if 6.5 <= ph <= 8.5:
        # Distance from ideal 7.0
        ph_dev = abs(ph - 7.0) / 1.5
        q_ph = max(0.0, 100.0 - (ph_dev * 40.0))
    else:
        # Penalty for acidic or caustic water
        excess = abs(ph - 7.0)
        q_ph = max(0.0, 60.0 - (excess * 25.0))
    sub_indices["ph"] = round(q_ph, 2)
    weighted_scores += q_ph * STANDARDS["ph"]["weight"]
    total_weight += STANDARDS["ph"]["weight"]

    # 2. Turbidity Sub-index (< 1.0 NTU excellent, > 5.0 NTU dangerous)
    turbidity = max(0.0, telemetry.turbidity)
    if turbidity <= 1.0:
        q_turb = 100.0 - (turbidity * 15.0)
    elif turbidity <= 5.0:
        q_turb = 85.0 - ((turbidity - 1.0) * 12.0)
    else:
        q_turb = max(0.0, 37.0 - ((turbidity - 5.0) * 8.0))
    sub_indices["turbidity"] = round(q_turb, 2)
    weighted_scores += q_turb * STANDARDS["turbidity"]["weight"]
    total_weight += STANDARDS["turbidity"]["weight"]

    # 3. TDS Sub-index (< 300 ppm ideal, > 1000 ppm poor)
    tds = max(0.0, telemetry.tds)
    if tds <= 150.0:
        q_tds = 100.0 - (tds / 150.0 * 10.0)
    elif tds <= 500.0:
        q_tds = 90.0 - ((tds - 150.0) / 350.0 * 30.0)
    else:
        q_tds = max(0.0, 60.0 - ((tds - 500.0) / 500.0 * 40.0))
    sub_indices["tds"] = round(q_tds, 2)
    weighted_scores += q_tds * STANDARDS["tds"]["weight"]
    total_weight += STANDARDS["tds"]["weight"]

    # 4. ORP Sub-index (> 650 mV rapid bacterial kill, < 500 mV high microbial survival)
    orp = telemetry.orp
    if orp >= 700.0:
        q_orp = min(100.0, 90.0 + ((orp - 700.0) / 100.0 * 10.0))
    elif orp >= 650.0:
        q_orp = 75.0 + ((orp - 650.0) / 50.0 * 15.0)
    elif orp >= 500.0:
        q_orp = 45.0 + ((orp - 500.0) / 150.0 * 30.0)
    else:
        q_orp = max(0.0, (orp / 500.0) * 45.0)
    sub_indices["orp"] = round(q_orp, 2)
    weighted_scores += q_orp * STANDARDS["orp"]["weight"]
    total_weight += STANDARDS["orp"]["weight"]

    # 5. Dissolved Oxygen (DO)
    do = telemetry.dissolved_oxygen if telemetry.dissolved_oxygen is not None else 7.5
    if do >= 7.0:
        q_do = min(100.0, 85.0 + (do - 7.0) * 5.0)
    elif do >= 5.0:
        q_do = 65.0 + (do - 5.0) * 10.0
    else:
        q_do = max(0.0, do * 13.0)
    sub_indices["dissolved_oxygen"] = round(q_do, 2)
    weighted_scores += q_do * STANDARDS["dissolved_oxygen"]["weight"]
    total_weight += STANDARDS["dissolved_oxygen"]["weight"]

    # 6. Free Chlorine
    fc = telemetry.free_chlorine if telemetry.free_chlorine is not None else 0.5
    if 0.2 <= fc <= 1.0:
        q_fc = 95.0 - abs(fc - 0.5) * 20.0
    elif fc < 0.2:
        q_fc = max(10.0, fc / 0.2 * 60.0)  # Dangerously low disinfectant
    else:
        q_fc = max(20.0, 90.0 - (fc - 1.0) * 30.0)  # Excessive chemical dosing
    sub_indices["free_chlorine"] = round(q_fc, 2)
    weighted_scores += q_fc * STANDARDS["free_chlorine"]["weight"]
    total_weight += STANDARDS["free_chlorine"]["weight"]

    final_score = round(weighted_scores / total_weight, 2)

    # Determine Grade
    if final_score >= 90.0:
        grade = "Excellent"
        summary = "Water quality is optimal and safe for all community potable uses."
    elif final_score >= 75.0:
        grade = "Good"
        summary = "Water quality meets municipal drinking standards."
    elif final_score >= 55.0:
        grade = "Medium"
        summary = "Water quality is degraded; precautionary filtration/boiling advised."
    elif final_score >= 35.0:
        grade = "Bad"
        summary = "Water is contaminated. Unfit for direct consumption without boiling."
    else:
        grade = "Hazardous"
        summary = "CRITICAL: Severe contamination detected. Immediate boil/isolation advisory required."

    return WQIResult(
        score=final_score,
        grade=grade,
        sub_indices=sub_indices,
        summary=summary
    )
