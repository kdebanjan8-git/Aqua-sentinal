"""
Unit and integration tests for AquaSentinel ML service, Random Forest Risk Predictor & Health Chat Assistant.
"""
import pytest
import asyncio
from app.models.schemas import (
    TelemetryPayload,
    GeoPoint,
    WaterSourceNode,
    SymptomItem,
    OutbreakCorrelationRequest,
    HealthChatRequest,
    RiskPredictionRequest
)
from app.services.wqi_calculator import calculate_wqi
from app.services.anomaly_detector import detector
from app.services.outbreak_correlator import correlate_outbreak, haversine_distance_km
from app.services.health_chat_service import generate_health_chat_response
from app.services.risk_predictor import risk_predictor

def test_wqi_optimal_water():
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
    assert result.score >= 85.0
    assert result.grade in ("Excellent", "Good")

def test_wqi_contaminated_water():
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
    assert result.score < 50.0
    assert result.grade in ("Bad", "Hazardous")

def test_anomaly_detector_normal():
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
    assert result.is_anomalous is False
    assert result.severity == "normal"

def test_anomaly_detector_microbial_spike():
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
    assert result.is_anomalous is True
    assert result.severity in ("high", "critical")
    assert result.hazard_type in ("turbidity_spike", "ph_out_of_range", "tds_spike")
    assert len(result.anomaly_reasons) > 0

def test_haversine_distance():
    d = haversine_distance_km(26.1850, 91.7500, 26.1720, 91.7080)
    assert 0.0 < d < 10.0

def test_outbreak_correlation():
    water_source = WaterSourceNode(
        id="ws-01",
        name="Kamrup Main Treatment Plant",
        type="treatment_plant",
        location=GeoPoint(latitude=26.1850, longitude=91.7500),
        population_served=48000
    )
    telemetry = TelemetryPayload(
        ph=7.2,
        turbidity=0.8,
        tds=150.0,
        orp=680.0,
        temperature=25.0,
        dissolved_oxygen=7.5,
        free_chlorine=0.5
    )
    symptoms = [
        SymptomItem(
            patient_age_group="child_6_17",
            symptoms=["watery_diarrhea", "vomiting"],
            severity="severe",
            location=GeoPoint(latitude=26.1860, longitude=91.7510)
        ),
        SymptomItem(
            patient_age_group="adult_18_59",
            symptoms=["watery_diarrhea", "abdominal_cramps"],
            severity="moderate",
            location=GeoPoint(latitude=26.1845, longitude=91.7495)
        ),
        SymptomItem(
            patient_age_group="infant_0_5",
            symptoms=["watery_diarrhea", "vomiting", "severe_dehydration"],
            severity="critical",
            location=GeoPoint(latitude=26.1870, longitude=91.7525)
        ),
        SymptomItem(
            patient_age_group="senior_60_plus",
            symptoms=["abdominal_cramps", "vomiting"],
            severity="moderate",
            location=GeoPoint(latitude=26.1855, longitude=91.7480)
        ),
        SymptomItem(
            patient_age_group="adult_18_59",
            symptoms=["watery_diarrhea", "fever"],
            severity="severe",
            location=GeoPoint(latitude=26.1850, longitude=91.7505)
        ),
        SymptomItem(
            patient_age_group="child_6_17",
            symptoms=["watery_diarrhea"],
            severity="moderate",
            location=GeoPoint(latitude=26.1865, longitude=91.7490)
        )
    ]
    request = OutbreakCorrelationRequest(
        water_source=water_source,
        latest_telemetry=telemetry,
        symptom_reports=symptoms,
        radius_km=2.0,
        time_window_hours=72
    )
    correlation = correlate_outbreak(request)
    assert correlation.is_outbreak_suspected is True
    assert correlation.risk_score >= 0.70
    assert correlation.risk_level in ("high", "critical")
    assert correlation.matched_symptom_count == 6
    assert len(correlation.corroborating_evidence) > 0
    assert correlation.geofence_geojson["type"] == "Feature"

def test_random_forest_risk_prediction_nominal():
    # Nominal healthy conditions
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
    assert res.predicted_risk_level in ("Low", "Moderate")
    assert res.water_contamination_flag in (0, 1)
    assert 0.0 <= res.contamination_probability <= 1.0
    assert len(res.risk_level_probabilities) > 0
    assert len(res.top_contributing_factors) > 0
    assert len(res.recommended_interventions) > 0

def test_random_forest_risk_prediction_flood_surge():
    # Flood & severe contamination conditions
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
    assert res.predicted_risk_level in ("Moderate", "High")
    assert res.estimated_risk_score >= 40.0
    assert res.water_contamination_flag in (0, 1)
    assert len(res.recommended_interventions) > 0

def test_health_chat_multilingual():
    # 1. English
    req_en = HealthChatRequest(
        message="I have severe diarrhea and stomach pain after drinking tap water",
        language="en",
        station_name="Kamrup Main Intake",
        telemetry={"wqi_score": 42.0, "turbidity": 6.2, "orp": 470, "is_anomalous": True}
    )
    res_en = asyncio.run(generate_health_chat_response(req_en))
    assert res_en.language == "en"
    assert "ORS" in res_en.response or "rehydration" in res_en.response.lower()
    assert res_en.risk_level in ("high", "critical")

    # 2. Bengali
    req_bn = HealthChatRequest(
        message="আমার আজ সকাল থেকে পেটে খুব ব্যথা আর বমি হচ্ছে",
        language="bn",
        station_name="Pandu Ghat Station",
        telemetry={"wqi_score": 90.0, "turbidity": 0.5, "orp": 700, "is_anomalous": False}
    )
    res_bn = asyncio.run(generate_health_chat_response(req_bn))
    assert res_bn.language == "bn"
    assert "জল" in res_bn.response or "ORS" in res_bn.response

    # 3. Hindi
    req_hi = HealthChatRequest(
        message="बच्चे को बुखार और उल्टी हो रही है, क्या पानी सुरक्षित है?",
        language="hi",
        station_name="Aizawl North Borehole",
        telemetry={"wqi_score": 40.0, "turbidity": 5.8, "orp": 450, "is_anomalous": True}
    )
    res_hi = asyncio.run(generate_health_chat_response(req_hi))
    assert res_hi.language == "hi"
    assert "पानी" in res_hi.response or "ORS" in res_hi.response

    # 4. Assamese
    req_as = HealthChatRequest(
        message="টেপৰ পানী খোৱাৰ পিছত পেটৰ বিষ আৰু হাগনি হৈছে",
        language="as",
        station_name="Dispur Tap Cluster",
        telemetry={"wqi_score": 85.0, "turbidity": 0.8, "orp": 665, "is_anomalous": False}
    )
    res_as = asyncio.run(generate_health_chat_response(req_as))
    assert res_as.language == "as"
    assert "পানী" in res_as.response or "ORS" in res_as.response
