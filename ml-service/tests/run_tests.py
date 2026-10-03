"""
Unittest test suite for AquaSentinel ML service.
Runs with standard python without external test runners.
"""
import unittest
import sys
import os

# Add ml-service root to pythonpath
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.schemas import (
    TelemetryPayload,
    GeoPoint,
    WaterSourceNode,
    SymptomItem,
    OutbreakCorrelationRequest,
    RiskPredictionRequest
)
from app.services.wqi_calculator import calculate_wqi
from app.services.anomaly_detector import detector
from app.services.outbreak_correlator import correlate_outbreak, haversine_distance_km
from app.services.risk_predictor import risk_predictor

class TestAquaSentinelML(unittest.TestCase):

    def test_wqi_optimal_water(self):
        telemetry = TelemetryPayload(
            ph=7.2,
            turbidity=0.4,
            tds=120.0,
            orp=720.0,
            temperature=22.0,
            dissolved_oxygen=8.0,
            free_chlorine=0.55
        )
        result = calculate_wqi(telemetry)
        self.assertGreaterEqual(result.score, 85.0)
        self.assertIn(result.grade, ["Excellent", "Good"])

    def test_wqi_contaminated_water(self):
        telemetry = TelemetryPayload(
            ph=5.8,
            turbidity=8.5,
            tds=680.0,
            orp=420.0,
            temperature=28.0,
            dissolved_oxygen=3.5,
            free_chlorine=0.02
        )
        result = calculate_wqi(telemetry)
        self.assertLess(result.score, 50.0)
        self.assertIn(result.grade, ["Bad", "Hazardous"])

    def test_anomaly_detector_normal(self):
        telemetry = TelemetryPayload(
            ph=7.3,
            turbidity=0.5,
            tds=150.0,
            orp=700.0,
            temperature=24.0,
            dissolved_oxygen=7.8,
            free_chlorine=0.5
        )
        result = detector.predict(telemetry)
        self.assertFalse(result.is_anomalous)
        self.assertEqual(result.severity, "normal")

    def test_anomaly_detector_microbial_spike(self):
        telemetry = TelemetryPayload(
            ph=6.4,
            turbidity=6.2,
            tds=510.0,
            orp=450.0,
            temperature=26.0,
            dissolved_oxygen=4.2,
            free_chlorine=0.05
        )
        result = detector.predict(telemetry)
        self.assertTrue(result.is_anomalous)
        self.assertIn(result.severity, ["high", "critical"])
        self.assertGreater(len(result.anomaly_reasons), 0)

    def test_haversine_distance(self):
        d = haversine_distance_km(12.9716, 77.5946, 12.9750, 77.5980)
        self.assertTrue(0.0 < d < 1.0)

    def test_outbreak_correlation(self):
        water_source = WaterSourceNode(
            id="ws-01",
            name="East Sector Borehole",
            type="borehole",
            location=GeoPoint(latitude=12.9650, longitude=77.6200),
            population_served=12000
        )
        telemetry = TelemetryPayload(
            ph=6.4,
            turbidity=5.8,
            tds=520.0,
            orp=480.0,
            temperature=26.5,
            dissolved_oxygen=4.8,
            free_chlorine=0.05
        )
        symptoms = [
            SymptomItem(
                patient_age_group="child_6_17",
                symptoms=["watery_diarrhea", "vomiting"],
                severity="severe",
                location=GeoPoint(latitude=12.9660, longitude=77.6210)
            ),
            SymptomItem(
                patient_age_group="adult_18_59",
                symptoms=["watery_diarrhea", "abdominal_cramps"],
                severity="moderate",
                location=GeoPoint(latitude=12.9645, longitude=77.6195)
            ),
            SymptomItem(
                patient_age_group="infant_0_5",
                symptoms=["watery_diarrhea", "vomiting", "severe_dehydration"],
                severity="critical",
                location=GeoPoint(latitude=12.9670, longitude=77.6225)
            ),
            SymptomItem(
                patient_age_group="senior_60_plus",
                symptoms=["abdominal_cramps", "vomiting"],
                severity="moderate",
                location=GeoPoint(latitude=12.9655, longitude=77.6180)
            ),
            SymptomItem(
                patient_age_group="adult_18_59",
                symptoms=["watery_diarrhea", "fever"],
                severity="severe",
                location=GeoPoint(latitude=12.9650, longitude=77.6205)
            ),
            SymptomItem(
                patient_age_group="child_6_17",
                symptoms=["watery_diarrhea"],
                severity="moderate",
                location=GeoPoint(latitude=12.9665, longitude=77.6190)
            )
        ]
        request = OutbreakCorrelationRequest(
            water_source=water_source,
            latest_telemetry=telemetry,
            symptom_reports=symptoms,
            radius_km=3.0,
            time_window_hours=72
        )
        correlation = correlate_outbreak(request)
        self.assertTrue(correlation.is_outbreak_suspected)
        self.assertGreaterEqual(correlation.risk_score, 0.70)
        self.assertIn(correlation.risk_level, ["high", "critical"])
        self.assertEqual(correlation.matched_symptom_count, 6)

    def test_random_forest_risk_prediction_nominal(self):
        req = RiskPredictionRequest(
            ph=7.2,
            turbidity_ntu=0.5,
            tds_mg_l=150.0,
            residual_chlorine_mg_l=0.6,
            rainfall_mm=10.0,
            temperature_c=24.0,
            humidity_percent=65.0,
            flood_risk_score=10.0,
            diarrhea_cases=0,
            vomiting_cases=0,
            fever_cases=0,
            total_cases=0
        )
        res = risk_predictor.predict(req)
        self.assertIn(res.predicted_risk_level, ["Low", "Moderate"])
        self.assertIn(res.water_contamination_flag, [0, 1])
        self.assertTrue(0.0 <= res.contamination_probability <= 1.0)
        self.assertGreater(len(res.top_contributing_factors), 0)
        self.assertGreater(len(res.recommended_interventions), 0)

    def test_random_forest_risk_prediction_flood_surge(self):
        req = RiskPredictionRequest(
            ph=6.1,
            turbidity_ntu=12.5,
            tds_mg_l=580.0,
            residual_chlorine_mg_l=0.02,
            rainfall_mm=140.0,
            temperature_c=29.0,
            humidity_percent=98.0,
            flood_risk_score=85.0,
            flood_flag=1,
            diarrhea_cases=18,
            vomiting_cases=8,
            fever_cases=7,
            total_cases=33,
            previous_cases=22,
            nearby_cases=15,
            health_reports_7d=25
        )
        res = risk_predictor.predict(req)
        self.assertIn(res.predicted_risk_level, ["Moderate", "High"])
        self.assertGreaterEqual(res.estimated_risk_score, 40.0)
        self.assertIn(res.water_contamination_flag, [0, 1])
        self.assertGreater(len(res.recommended_interventions), 0)

    def test_image_analyzer_turbidity(self):
        from app.services.image_analyzer import image_analyzer
        import io
        from PIL import Image
        img = Image.new('RGB', (60, 60), color=(175, 120, 65))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        res = image_analyzer.analyze_image_bytes(buf.getvalue(), filename='sample.jpg')
        self.assertTrue(res['has_image'])
        self.assertTrue(res['is_abnormal'])
        self.assertGreater(res['estimated_turbidity_ntu'], 5.0)

    def test_image_analyzer_clear_sample(self):
        from app.services.image_analyzer import image_analyzer
        import io
        from PIL import Image
        img = Image.new('RGB', (60, 60), color=(240, 245, 255))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        res = image_analyzer.analyze_image_bytes(buf.getvalue(), filename='clear.jpg')
        self.assertTrue(res['has_image'])
        self.assertFalse(res['is_abnormal'])
        self.assertLessEqual(res['estimated_turbidity_ntu'], 2.0)

    def test_continuous_learning_consultations_dataframe(self):
        from app.services.train_model import format_consultations_to_dataframe
        consultations = [
            {
                "latitude": 26.1850,
                "longitude": 91.7500,
                "reported_symptoms": ["watery_diarrhea", "vomiting"],
                "severity": "high",
                "ambient_telemetry_snapshot": {
                    "ph": 6.2,
                    "turbidity": 8.5,
                    "tds": 450.0
                }
            }
        ]
        df = format_consultations_to_dataframe(consultations)
        self.assertEqual(len(df), 1)
        self.assertEqual(df.iloc[0]['risk_level'], 'High')
        self.assertEqual(df.iloc[0]['water_contamination_flag'], 1)

if __name__ == '__main__':
    unittest.main()
