"""
Standardized Deterministic Water Anomaly Detection Engine.
Enforces recognized WHO / BIS water quality safety thresholds:
1. Turbidity Alert: Turbidity > 5.0 NTU (High suspended matter / microbial risk)
2. pH Out-of-Range: pH < 6.5 or pH > 8.5 (Acidic or alkaline chemical contamination)
3. TDS Spike: TDS > 500 ppm (High dissolved solids limit)
"""
from typing import List, Tuple
from ..models.schemas import TelemetryPayload, AnomalyResult
from .wqi_calculator import calculate_wqi

class WaterAnomalyDetector:
    """
    Standardized, transparent threshold-based anomaly evaluation.
    Provides clear, deterministic explanations suitable for academic evaluation.
    """

    # Recognized WHO / BIS Permissible Water Quality Thresholds
    TURBIDITY_THRESHOLD_NTU = 5.0
    PH_MIN_THRESHOLD = 6.5
    PH_MAX_THRESHOLD = 8.5
    TDS_THRESHOLD_PPM = 500.0

    def evaluate_thresholds(self, t: TelemetryPayload) -> Tuple[bool, List[str], str, str, List[str]]:
        reasons = []
        actions = []
        hazard_type = None
        severity = "normal"

        # 1. Turbidity Threshold: > 5.0 NTU (WHO / BIS upper limit)
        if t.turbidity > self.TURBIDITY_THRESHOLD_NTU:
            reasons.append(
                f"Turbidity recorded at {t.turbidity:.2f} NTU (Safety Limit: {self.TURBIDITY_THRESHOLD_NTU:.1f} NTU - High suspended matter/microbial risk)"
            )
            hazard_type = "turbidity_spike"
            severity = "critical" if t.turbidity > 7.0 or (t.orp is not None and t.orp < 550.0) else "high"
            actions.append("Issue Boil Water Advisory: Water cloudiness indicates elevated microbial risk.")
            actions.append("Activate secondary sand filtration and inspect intake filters.")

        # 2. pH Out-of-Range Threshold: < 6.5 or > 8.5 (BIS Standard 10500:2012)
        if t.ph < self.PH_MIN_THRESHOLD:
            reasons.append(
                f"pH recorded at {t.ph:.2f} (Permissible Range: {self.PH_MIN_THRESHOLD:.1f} - {self.PH_MAX_THRESHOLD:.1f} - Acidic chemical contamination / corrosion risk)"
            )
            hazard_type = hazard_type or "ph_out_of_range"
            severity = "critical" if severity == "critical" else "high"
            actions.append("Inject alkaline neutralizer buffer to prevent pipe corrosion and heavy metal leaching.")
        elif t.ph > self.PH_MAX_THRESHOLD:
            reasons.append(
                f"pH recorded at {t.ph:.2f} (Permissible Range: {self.PH_MIN_THRESHOLD:.1f} - {self.PH_MAX_THRESHOLD:.1f} - Alkaline contamination)"
            )
            hazard_type = hazard_type or "ph_out_of_range"
            severity = "critical" if severity == "critical" else "high"
            actions.append("Inspect upstream coagulant dosing and alkali discharge.")

        # 3. TDS Spike Threshold: > 500.0 ppm (BIS Acceptable Limit)
        if t.tds > self.TDS_THRESHOLD_PPM:
            reasons.append(
                f"TDS recorded at {t.tds:.1f} ppm (Permissible Limit: {self.TDS_THRESHOLD_PPM:.1f} ppm - Elevated dissolved solids)"
            )
            hazard_type = hazard_type or "tds_spike"
            if severity == "normal":
                severity = "medium"
            actions.append("Conduct mineral/salinity analysis and test for runoff influx.")

        is_anomalous = len(reasons) > 0

        if not is_anomalous:
            severity = "normal"
            actions = ["Maintain routine continuous monitoring. All parameters within safe limits."]

        return is_anomalous, reasons, hazard_type, severity, actions

    def predict(self, telemetry: TelemetryPayload) -> AnomalyResult:
        wqi = calculate_wqi(telemetry)
        is_anomalous, reasons, hazard_type, severity, actions = self.evaluate_thresholds(telemetry)

        confidence = 0.95 if is_anomalous else 0.99
        anomaly_score = 0.85 if is_anomalous else 0.05

        return AnomalyResult(
            is_anomalous=is_anomalous,
            anomaly_score=anomaly_score,
            confidence=confidence,
            severity=severity,
            anomaly_reasons=reasons,
            hazard_type=hazard_type,
            wqi=wqi,
            recommended_actions=actions
        )

# Global singleton detector instance
detector = WaterAnomalyDetector()
