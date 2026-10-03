from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class GeoPoint(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")

class TelemetryPayload(BaseModel):
    sensor_id: Optional[str] = "sensor-default"
    ph: float = Field(..., ge=0.0, le=14.0, description="pH level (0-14)")
    turbidity: float = Field(..., ge=0.0, description="Turbidity in NTU")
    tds: float = Field(..., ge=0.0, description="Total Dissolved Solids in ppm or mg/L")
    orp: float = Field(..., description="Oxidation Reduction Potential in mV")
    temperature: float = Field(default=25.0, description="Water temperature in Celsius")
    dissolved_oxygen: Optional[float] = Field(default=7.5, description="DO in mg/L")
    free_chlorine: Optional[float] = Field(default=0.5, description="Residual Free Chlorine in mg/L")
    conductivity: Optional[float] = Field(default=400.0, description="Electrical Conductivity in µS/cm")
    recorded_at: Optional[datetime] = None

class WQIResult(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Calculated WQI Score (0-100)")
    grade: str = Field(..., description="Excellent, Good, Medium, Bad, Hazardous")
    sub_indices: Dict[str, float] = Field(default_factory=dict)
    summary: str

class AnomalyResult(BaseModel):
    is_anomalous: bool
    anomaly_score: float = Field(..., description="Anomaly score (-1.0 to 1.0 or normalized 0-1)")
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity: str = Field(..., description="normal, low, medium, high, critical")
    anomaly_reasons: List[str]
    hazard_type: Optional[str] = None
    wqi: WQIResult
    recommended_actions: List[str]

class SymptomItem(BaseModel):
    id: Optional[str] = None
    patient_age_group: Optional[str] = "adult_18_59"
    symptoms: List[str]
    suspected_disease: Optional[str] = "acute_gastroenteritis"
    severity: str = "moderate"
    location: GeoPoint
    reported_at: Optional[datetime] = None

class WaterSourceNode(BaseModel):
    id: str
    name: str
    type: str
    location: GeoPoint
    population_served: Optional[int] = 5000

class OutbreakCorrelationRequest(BaseModel):
    water_source: WaterSourceNode
    latest_telemetry: TelemetryPayload
    symptom_reports: List[SymptomItem]
    radius_km: float = 3.0
    time_window_hours: int = 72

class OutbreakCorrelationResult(BaseModel):
    is_outbreak_suspected: bool
    risk_score: float = Field(..., ge=0.0, le=1.0)
    risk_level: str = Field(..., description="low, moderate, high, critical")
    matched_symptom_count: int
    cluster_radius_km: float
    primary_suspected_pathogen: str
    corroborating_evidence: List[str]
    recommended_interventions: List[str]
    geofence_geojson: Dict[str, Any]

class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant or system")
    content: str

class HealthChatRequest(BaseModel):
    message: str = Field(..., description="User symptom description or water safety query")
    language: str = Field(default="en", description="Language code: en (English), bn (Bengali), hi (Hindi), as (Assamese)")
    location: Optional[GeoPoint] = None
    station_id: Optional[str] = None
    station_name: Optional[str] = None
    telemetry: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Nearby water sensor readings: ph, turbidity, tds, orp, wqi_score, etc.")
    active_alerts: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Active contamination alerts in area")
    conversation_history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Previous messages in chat session")
    image_base64: Optional[str] = Field(default=None, description="Optional Base64 encoded image string (water sample, tap, or clinical cue)")

class HealthChatResponse(BaseModel):
    response: str
    language: str
    risk_level: str = Field(default="low", description="low, moderate, high, critical")
    suspected_condition: Optional[str] = None
    recommended_actions: List[str] = Field(default_factory=list)
    environmental_context_used: Dict[str, Any] = Field(default_factory=dict)
    visual_analysis: Optional[Dict[str, Any]] = Field(default=None, description="Simulated computer vision optical findings if an image was provided")
    model_used: str = Field(default="local-ollama-llama3")
    disclaimer: str = Field(default="This is an AI public health triage assessment, not a formal medical diagnosis. For severe symptoms, consult a qualified physician immediately.")

# ---------------------------------------------------------
# New Random Forest Live Scoring Schemas
# ---------------------------------------------------------

class RiskPredictionRequest(BaseModel):
    # Telemetry parameters
    ph: float = Field(default=7.2, ge=0.0, le=14.0, description="Water pH (0-14)")
    turbidity_ntu: Optional[float] = Field(default=None, description="Turbidity in NTU")
    turbidity: Optional[float] = Field(default=None, description="Alias for turbidity_ntu")
    tds_mg_l: Optional[float] = Field(default=None, description="TDS in mg/L or ppm")
    tds: Optional[float] = Field(default=None, description="Alias for tds_mg_l")
    residual_chlorine_mg_l: Optional[float] = Field(default=None, description="Residual Free Chlorine in mg/L")
    free_chlorine: Optional[float] = Field(default=None, description="Alias for residual_chlorine_mg_l")

    # Climate & Environmental
    rainfall_mm: float = Field(default=25.0, description="24h rainfall in mm")
    temperature_c: float = Field(default=25.0, description="Ambient temperature in Celsius")
    humidity_percent: float = Field(default=75.0, description="Relative humidity %")
    flood_risk_score: float = Field(default=20.0, description="Hydrological flood risk score (0-100)")
    flood_flag: int = Field(default=0, description="Binary flood inundation flag (0 or 1)")

    # Clinical & Community Symptom
    diarrhea_cases: int = Field(default=0, description="Reported diarrhea cases in zone")
    vomiting_cases: int = Field(default=0, description="Reported vomiting cases in zone")
    fever_cases: int = Field(default=0, description="Reported fever cases in zone")
    total_cases: Optional[int] = Field(default=None, description="Total active gastrointestinal cases")
    previous_cases: int = Field(default=0, description="Cases in previous reporting period")
    nearby_cases: int = Field(default=0, description="Cases in adjoining 5km sectors")
    health_reports_7d: int = Field(default=1, description="Total health reports past 7 days")
    water_reports_7d: int = Field(default=0, description="Citizen water contamination reports past 7 days")

    # Demographic & Vulnerability
    population: int = Field(default=5000, description="Zone population")
    latitude: float = Field(default=26.1850, description="Station/Zone latitude")
    longitude: float = Field(default=91.7500, description="Station/Zone longitude")
    sanitation_coverage_percent: float = Field(default=70.0, description="Sanitation coverage %")
    safe_water_access_percent: float = Field(default=75.0, description="Piped safe water access %")
    healthcare_access_percent: float = Field(default=60.0, description="Healthcare access index %")
    population_vulnerability_score: float = Field(default=30.0, description="Composite vulnerability score (0-100)")

class RiskPredictionResponse(BaseModel):
    predicted_risk_level: str = Field(..., description="Low, Moderate, High")
    risk_level_probabilities: Dict[str, float] = Field(..., description="Probability distribution over classes")
    water_contamination_flag: int = Field(..., description="0 = Potable/Normal, 1 = Contaminated")
    contamination_probability: float = Field(..., description="Probability of water contamination (0.0 - 1.0)")
    estimated_risk_score: float = Field(..., description="Continuous outbreak risk score (0-100)")
    top_contributing_factors: List[Dict[str, Any]] = Field(default_factory=list, description="Top feature drivers")
    recommended_interventions: List[str] = Field(default_factory=list)
    model_metadata: Dict[str, Any] = Field(default_factory=dict)
