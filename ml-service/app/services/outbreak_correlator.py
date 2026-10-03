"""
Standardized Deterministic Outbreak Correlation Engine.
Standardizes cluster triggers strictly around recognized epidemiological thresholds:
- Community Symptom Cluster: > 5 localized gastrointestinal symptom reports within a 2.0 km radius of a water point.
"""
import math
from typing import List, Dict, Any
from ..models.schemas import (
    OutbreakCorrelationRequest,
    OutbreakCorrelationResult,
    SymptomItem
)
from .wqi_calculator import calculate_wqi

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def create_circular_geofence_geojson(center_lat: float, center_lon: float, radius_km: float, num_points: int = 32) -> Dict[str, Any]:
    """Generates a GeoJSON Polygon circle around a center point."""
    coordinates = []
    lat_radius = radius_km / 111.32
    lon_radius = radius_km / (111.32 * math.cos(math.radians(center_lat)))

    for i in range(num_points):
        angle = (2 * math.pi * i) / num_points
        d_lat = lat_radius * math.sin(angle)
        d_lon = lon_radius * math.cos(angle)
        coordinates.append([center_lon + d_lon, center_lat + d_lat])

    # Close the polygon
    coordinates.append(coordinates[0])

    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [coordinates]
        },
        "properties": {
            "radius_km": radius_km,
            "center": [center_lat, center_lon]
        }
    }

def correlate_outbreak(request: OutbreakCorrelationRequest) -> OutbreakCorrelationResult:
    source_lat = request.water_source.location.latitude
    source_lon = request.water_source.location.longitude
    wqi = calculate_wqi(request.latest_telemetry)

    # 1. Filter gastrointestinal symptoms within 2.0 km radius
    cluster_radius_km = min(2.0, request.radius_km)
    matched_symptoms: List[SymptomItem] = []

    for report in request.symptom_reports:
        dist = haversine_distance_km(source_lat, source_lon, report.location.latitude, report.location.longitude)
        if dist <= cluster_radius_km:
            matched_symptoms.append(report)

    case_count = len(matched_symptoms)
    evidence: List[str] = []
    interventions: List[str] = []

    # Deterministic Cluster Threshold: > 5 cases within 2.0 km
    CLUSTER_THRESHOLD = 5
    is_outbreak_cluster = case_count > CLUSTER_THRESHOLD
    is_water_compromised = (
        request.latest_telemetry.turbidity > 5.0 or
        request.latest_telemetry.ph < 6.5 or
        request.latest_telemetry.ph > 8.5 or
        request.latest_telemetry.tds > 500.0
    )

    if is_outbreak_cluster:
        evidence.append(
            f"Cluster Detected: {case_count} Diarrhea/gastroenteritis cases reported near {request.water_source.name} within {cluster_radius_km:.1f} km (Cluster Threshold: > {CLUSTER_THRESHOLD} cases)."
        )
    elif case_count > 0:
        evidence.append(
            f"{case_count} localized case(s) logged near {request.water_source.name} (Under alert threshold of {CLUSTER_THRESHOLD} cases)."
        )
    else:
        evidence.append("No localized gastrointestinal cases logged in this supply zone.")

    if is_water_compromised:
        evidence.append(
            f"Water quality parameters breach safety limits at {request.water_source.name} (Turbidity: {request.latest_telemetry.turbidity:.2f} NTU, pH: {request.latest_telemetry.ph:.2f}, TDS: {request.latest_telemetry.tds:.1f} ppm)."
        )

    # Primary pathogen classification
    has_watery_diarrhea = sum(1 for r in matched_symptoms if any("diarrhea" in s.lower() for s in r.symptoms))
    has_vomiting = sum(1 for r in matched_symptoms if any("vomit" in s.lower() for s in r.symptoms))
    has_fever = sum(1 for r in matched_symptoms if any("fever" in s.lower() for s in r.symptoms))

    if has_watery_diarrhea >= 3 and has_vomiting >= 2:
        primary_pathogen = "Vibrio cholerae / Acute Gastroenteritis"
    elif has_fever >= 3:
        primary_pathogen = "Salmonella enterica (Typhoid Fever)"
    else:
        primary_pathogen = "Acute Water-Borne Gastroenteritis"

    if is_outbreak_cluster and is_water_compromised:
        risk_score = 0.95
        risk_level = "critical"
        interventions.extend([
            "Broadcast emergency Boil Water Notice to all households in sector.",
            "Dispatch mobile superchlorination dosing unit to intake plant.",
            "Establish Oral Rehydration Therapy (ORT) triage point at nearest Primary Health Centre.",
            "Deploy emergency potable water distribution tankers."
        ])
    elif is_outbreak_cluster:
        risk_score = 0.80
        risk_level = "high"
        interventions.extend([
            "Issue precautionary boil-water notice in 2 km geofence.",
            "Collect emergency biological and microbial water culture samples.",
            "Alert district public health surveillance team for case contact tracing."
        ])
    elif is_water_compromised:
        risk_score = 0.65
        risk_level = "high"
        interventions.extend([
            "Issue Boil Water Advisory due to sensor parameter breach.",
            "Inspect filtration beds and adjust chemical dosing."
        ])
    else:
        risk_score = 0.05
        risk_level = "low"
        interventions.append("Maintain routine continuous monitoring.")

    is_outbreak_suspected = is_outbreak_cluster or is_water_compromised

    return OutbreakCorrelationResult(
        is_outbreak_suspected=is_outbreak_suspected,
        risk_score=risk_score,
        risk_level=risk_level,
        matched_symptom_count=case_count,
        cluster_radius_km=cluster_radius_km,
        primary_suspected_pathogen=primary_pathogen,
        corroborating_evidence=evidence,
        recommended_interventions=interventions,
        geofence_geojson=create_circular_geofence_geojson(source_lat, source_lon, cluster_radius_km)
    )
