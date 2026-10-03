from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

from .models.schemas import (
    TelemetryPayload,
    AnomalyResult,
    WQIResult,
    OutbreakCorrelationRequest,
    OutbreakCorrelationResult,
    HealthChatRequest,
    HealthChatResponse,
    RiskPredictionRequest,
    RiskPredictionResponse
)
from .services.anomaly_detector import detector
from .services.wqi_calculator import calculate_wqi
from .services.outbreak_correlator import correlate_outbreak
from .services.health_chat_service import generate_health_chat_response
from .services.risk_predictor import risk_predictor
from .services.image_analyzer import image_analyzer

app = FastAPI(
    title="AquaSentinel AI Anomaly & Health Intelligence Service",
    description="Machine learning Random Forest risk engine, spatial-temporal correlation, and local Llama health chat assistant.",
    version="1.2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "aqua-sentinel-ml",
        "version": "1.2.0",
        "model_loaded": risk_predictor.bundle is not None
    }

@app.post("/api/v1/predict", response_model=RiskPredictionResponse, tags=["ML Risk Scoring"])
async def predict_outbreak_risk(request: RiskPredictionRequest):
    """
    Live Random Forest risk scoring trained on 20,000 regional environmental, telemetry, and symptom records.
    Predicts multiclass risk_level (Low, Moderate, High) and binary water_contamination_flag (0 or 1).
    """
    try:
        return risk_predictor.predict(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live risk prediction error: {str(e)}"
        )

@app.post("/api/v1/wqi", response_model=WQIResult, tags=["Water Quality"])
async def compute_wqi(telemetry: TelemetryPayload):
    try:
        return calculate_wqi(telemetry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating WQI: {str(e)}"
        )

@app.post("/api/v1/detect-anomaly", response_model=AnomalyResult, tags=["Anomaly Detection"])
async def detect_sensor_anomaly(telemetry: TelemetryPayload):
    try:
        return detector.predict(telemetry)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly detection error: {str(e)}"
        )

@app.post("/api/v1/batch-predict", response_model=List[AnomalyResult], tags=["Anomaly Detection"])
async def batch_detect_anomalies(telemetry_list: List[TelemetryPayload]):
    try:
        return [detector.predict(t) for t in telemetry_list]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch anomaly detection error: {str(e)}"
        )

@app.post("/api/v1/correlate-outbreak", response_model=OutbreakCorrelationResult, tags=["Outbreak Correlation"])
async def correlate_water_and_symptoms(request: OutbreakCorrelationRequest):
    try:
        return correlate_outbreak(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Outbreak correlation error: {str(e)}"
        )

@app.post("/api/v1/health-chat", response_model=HealthChatResponse, tags=["Health Chat Assistant"])
async def health_chat_assistant(request: HealthChatRequest):
    """
    Connects to local Ollama (http://localhost:11434) or fallback clinical engine.
    Assesses symptoms against PostGIS environmental water quality telemetry and visual image cues with
    multi-lingual support (English, Bengali, Hindi, Assamese).
    """
    try:
        return await generate_health_chat_response(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health chat service error: {str(e)}"
        )

@app.post("/api/v1/analyze-visual", tags=["Visual Analysis"])
async def analyze_visual_image(file: UploadFile = File(...)):
    """
    Simulated computer vision pipeline for uploaded water sample or clinical physical photos.
    Evaluates optical turbidity, discoloration (e.g. colloidal silt / algae), dimensions, and returns structured findings.
    """
    try:
        content = await file.read()
        return image_analyzer.analyze_image_bytes(content, filename=file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visual image analysis error: {str(e)}"
        )

@app.post("/api/v1/retrain", tags=["Continuous Learning"])
async def retrain_model_with_field_data(verified_consultations: Optional[List[dict]] = None):
    """
    Retrains the Random Forest risk and contamination classifiers by merging
    newly verified clinical consultation records into the historical dataset.
    """
    try:
        from .services.train_model import export_and_retrain
        result = export_and_retrain(verified_consultations)
        return {
            "success": True,
            "message": "Model successfully retrained on verified field data.",
            "version": result["version"],
            "trained_at": result["trained_at"],
            "total_samples": result["total_samples"],
            "verified_field_samples_merged": result["verified_field_samples_merged"],
            "metrics": result["metrics"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model retraining error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
