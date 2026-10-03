"""
Local Llama-Powered Health Assistant & Environmental Risk Assessment Service.
Connects to local Ollama (http://localhost:11434) with multi-lingual prompt engineering
(English, Bengali, Hindi, Assamese), simulated computer vision image analysis, and resilient fallback generation.
"""
import os
import httpx
from typing import Dict, Any, List, Optional
from ..models.schemas import HealthChatRequest, HealthChatResponse, ChatMessage
from .image_analyzer import image_analyzer

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

LANGUAGE_NAMES = {
    "en": "English",
    "bn": "Bengali (বাংলা)",
    "hi": "Hindi (हिंदी)",
    "as": "Assamese (অসমীয়া)"
}

DISCLAIMERS = {
    "en": "⚠️ Disclaimer: This is an AI public health triage assessment based on environmental telemetry, visual analysis, and reported symptoms. It is NOT a substitute for professional medical diagnosis. For severe symptoms, visit your nearest Primary Health Centre or emergency hospital immediately.",
    "bn": "⚠️ সতর্কবার্তা: এটি পরিবেশগত জলের গুণমান, দৃশ্যমান নমুনা ও উপসর্গের ওপর ভিত্তি করে একটি কৃত্রিম বুদ্ধিমত্তা সহায়ক মূল্যায়ন। এটি চিকিৎসকের বিকল্প নয়। গুরুতর উপসর্গের ক্ষেত্রে অবিলম্বে নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।",
    "hi": "⚠️ अस्वीकरण: यह जल गुणवत्ता टेलीमेट्री, दृश्य विश्लेषण और लक्षणों पर आधारित एक एआई जन स्वास्थ्य परामर्श है। यह चिकित्सीय निदान का विकल्प नहीं है। गंभीर स्थिति में तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र या अस्पताल जाएं।",
    "as": "⚠️ সতৰ্কবাণী: এইটো পৰিৱেশীয় পানীৰ গুণাগুণ, আলোকীয় বিশ্লেষণ আৰু লক্ষণসমূহৰ ওপৰত ভিত্তি কৰি কৰা এক এআই স্বাস্থ্য পৰামৰ্শহে। ই কোনো আনুষ্ঠানিক চিকিৎসা নহয়। গুৰুতৰ অৱস্থাত পলম নকৰি ওচৰৰ স্বাস্থ্যকেন্দ্ৰলৈ যাওক।"
}

def build_system_prompt(request: HealthChatRequest, visual_analysis: Optional[Dict[str, Any]] = None) -> str:
    """Builds a contextualized prompt combining clinical knowledge, telemetry, visual cues, and language rules."""
    lang_code = request.language if request.language in LANGUAGE_NAMES else "en"
    lang_name = LANGUAGE_NAMES[lang_code]

    telemetry = request.telemetry or {}
    wqi = telemetry.get("wqi_score", 85)
    wqi_grade = telemetry.get("wqi_grade", "Good")
    turbidity = telemetry.get("turbidity", 0.8)
    orp = telemetry.get("orp", 680)
    ph = telemetry.get("ph", 7.2)
    is_anomalous = telemetry.get("is_anomalous", False)
    station_name = request.station_name or "Regional Municipal Supply Grid"
    alerts = request.active_alerts or []

    env_summary = f"""
[ENVIRONMENTAL & POSTGIS WATER QUALITY CONTEXT]
- Monitoring Station: {station_name}
- Water Quality Index (WQI): {wqi}/100 ({wqi_grade})
- Turbidity: {turbidity} NTU {"(⚠️ High Microbial Risk)" if turbidity > 4.0 else "(Normal)"}
- Oxidation-Reduction Potential (ORP): {orp} mV {"(⚠️ Inadequate Disinfection)" if orp < 600 else "(Potable Disinfection)"}
- pH: {ph}
- Contamination Alert Status: {"🚨 ACTIVE CONTAMINATION HAZARD DETECTED" if is_anomalous or len(alerts) > 0 else "✅ Normal Safe Water Grid"}
- Active Public Advisories: {len(alerts)} active alerts in this zone.
"""

    visual_summary = ""
    if visual_analysis and visual_analysis.get("has_image"):
        visual_summary = f"""
[COMPUTER VISION & OPTICAL IMAGE FINDINGS]
- Visual Cue: {visual_analysis.get('visual_cue')}
- Optical Turbidity Estimate: {visual_analysis.get('estimated_turbidity_ntu')} NTU
- Abnormal Detection: {"⚠️ YES - Water Discoloration / Physical Distress Observed" if visual_analysis.get('is_abnormal') else "✅ Normal Physical Appearance"}
- Key Optical Findings: {'; '.join(visual_analysis.get('findings', []))}
- Optical Safety Recommendation: {visual_analysis.get('recommendation')}
"""

    language_instructions = {
        "en": "You MUST respond entirely in clear, compassionate, grammatically correct ENGLISH.",
        "bn": "You MUST respond entirely in fluent, natural, empathetic BENGALI (বাংলা ভাষা). Use Bengali script exclusively for your explanation, reassurance, and triage points.",
        "hi": "You MUST respond entirely in fluent, natural, polite HINDI (हिंदी भाषा). Use Devanagari script exclusively for your advice, water safety steps, and triage points.",
        "as": "You MUST respond entirely in fluent, natural, polite ASSAMESE (অসমীয়া ভাষা). Use Assamese script exclusively for your response."
    }

    prompt = f"""You are 'Jal-Swasthya AI', a specialized public health assistant and medical triage advisor for the Jal-Satark Regional Water & Health Intelligence Platform (Northeast India & Brahmaputra Basin).

Your objective is to assess the user's water-borne illness symptoms, cross-reference them with the local water quality telemetry and any uploaded image findings, estimate the epidemiological risk level, and provide safe, actionable first-response guidance.

{env_summary}
{visual_summary}

[CRITICAL CLINICAL & WATER HYGIENE RULES]
1. Assess likely water-borne pathogens based on symptoms & visual cues:
   - Watery diarrhea ("rice-water"), vomiting, dehydration -> Suspected Acute Gastroenteritis / Vibrio cholerae.
   - Sustained fever, abdominal pain, headache -> Suspected Typhoid / Salmonella.
   - Water cloudiness, cramps, prolonged diarrhea -> Suspected Giardiasis / Cryptosporidium.
   - Jaundice, fatigue, dark urine -> Suspected Hepatitis A / E.
   - If an uploaded photo displays yellow-brown turbidity or algae, factor this directly into your diagnostic warnings.
2. If the local water quality shows high turbidity (> 4.0 NTU), low ORP (< 600 mV), active alerts, or abnormal image findings, warn the user about potential water contamination in their sector.
3. Always provide clear, life-saving home triage guidance:
   - **Hydration**: Oral Rehydration Salts (ORS) or homemade solution (1 Litre boiled & cooled water + 6 level teaspoons sugar + 1/2 level teaspoon salt).
   - **Water Safety**: Boil all drinking water vigorously for at least 1-2 minutes before consumption. Avoid raw municipal tap water or unboiled ice.
   - **Red-Flag Warning Signs**: Severe lethargy, inability to keep fluids down, blood in stool, sunken eyes, dry mouth/absence of urination.
   - **Facility Referral**: Strongly encourage visiting the nearest Primary Health Centre (PHC), Community Health Centre (CHC), or district civil hospital.
4. Structure your response cleanly with brief paragraphs and bullet points.
5. {language_instructions.get(lang_code, language_instructions['en'])}
"""
    return prompt

def evaluate_risk_and_condition(
    user_message: str,
    telemetry: Dict[str, Any],
    alerts: List[Any],
    visual_analysis: Optional[Dict[str, Any]] = None
) -> tuple[str, str, List[str]]:
    """Evaluates risk score, suspected pathogen, and recommended actions using clinical heuristics & visual cues."""
    msg = user_message.lower()
    turbidity = telemetry.get("turbidity", 0.8)
    orp = telemetry.get("orp", 680)
    wqi = telemetry.get("wqi_score", 85)
    is_anom = telemetry.get("is_anomalous", False) or len(alerts) > 0 or turbidity > 4.0 or orp < 550 or wqi < 55

    suspected = "acute_gastroenteritis"
    actions = [
        "Drink clean, boiled water or Oral Rehydration Solution (ORS) immediately.",
        "Boil all household drinking water for at least 1 minute.",
        "Avoid raw salads, street beverages, and municipal tap water."
    ]

    # Check for visual abnormality
    if visual_analysis and visual_analysis.get("is_abnormal"):
        if visual_analysis.get("recommendation"):
            actions.insert(0, visual_analysis["recommendation"])

    # Keyword matching
    has_diarrhea = any(k in msg for k in ["diarrhea", "diarrhoea", "loose", "watery", "stomach", "পেট", "ডায়রিয়া", "दस्त", "পেটৰ বিষ", "হাগনি"])
    has_vomiting = any(k in msg for k in ["vomit", "nausea", "throwing", "বমি", "उल्टी", "ওকালি"])
    has_fever = any(k in msg for k in ["fever", "temperature", "chill", "জ্বর", "बुखार", "জ্বৰ"])
    has_jaundice = any(k in msg for k in ["jaundice", "yellow", "urine", "চোখ হলুদ", "पीलिया", "হালধীয়া"])
    has_severe = any(k in msg for k in ["severe", "unconscious", "blood", "lethargic", "critical", "রক্ত", "गंभीर", "বেহোচ"])

    if has_jaundice:
        suspected = "hepatitis_a"
        actions.append("Avoid fatty foods; seek immediate liver function test (LFT) at local clinic.")
    elif has_fever and (has_diarrhea or "headache" in msg):
        suspected = "typhoid"
        actions.append("Undergo a blood culture or Widal test at the nearest health center.")
    elif has_diarrhea and has_vomiting:
        suspected = "cholera" if (is_anom or has_severe) else "acute_gastroenteritis"
        actions.insert(0, "URGENT: Initiate continuous ORS intake (1 glass after every loose stool).")

    # Risk level determination
    if has_severe or (has_diarrhea and has_vomiting and is_anom):
        risk_level = "critical"
    elif is_anom or (has_diarrhea and has_vomiting) or (visual_analysis and visual_analysis.get("is_abnormal")):
        risk_level = "high"
    elif has_diarrhea or has_fever or has_vomiting or is_anom:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return risk_level, suspected, actions

def generate_vernacular_fallback(
    request: HealthChatRequest,
    risk_level: str,
    suspected_condition: str,
    actions: List[str],
    visual_analysis: Optional[Dict[str, Any]] = None
) -> str:
    """Provides medically sound, empathetic fallback responses in English, Bengali, Hindi, and Assamese."""
    lang_code = request.language if request.language in LANGUAGE_NAMES else "en"
    station_name = request.station_name or "Regional Supply Grid"
    wqi = (request.telemetry or {}).get("wqi_score", 88)
    turbidity = (request.telemetry or {}).get("turbidity", 0.8)

    visual_note_en = ""
    visual_note_bn = ""
    visual_note_hi = ""
    visual_note_as = ""

    if visual_analysis and visual_analysis.get("has_image"):
        cue = visual_analysis.get("visual_cue", "")
        visual_note_en = f"\n\n📸 **Visual Analysis Summary**: {cue}"
        visual_note_bn = f"\n\n📸 **নমুনা চিত্র বিশ্লেষণ**: {cue}"
        visual_note_hi = f"\n\n📸 **चित्र विश्लेषण निष्कर्ष**: {cue}"
        visual_note_as = f"\n\n📸 **ছবি বিশ্লেষণৰ তথ্য**: {cue}"

    if lang_code == "bn":
        return f"""### 🩺 জল-স্বাস্থ্য এআই পরামর্শ ({station_name})

আপনার বর্ণিত উপসর্গের প্রেক্ষিতে প্রাথমিক স্বাস্থ্য পর্যবেক্ষণ:

* **সম্ভাব্য ঝুঁকি মাত্রা**: **{risk_level.upper()}** (অনুমিত রোগ: *{suspected_condition.replace('_', ' ').title()}*)
* **জলের গুণমান সূচক (WQI)**: {wqi}/100 (টার্বিডিটি: {turbidity} NTU)
{visual_note_bn}

#### 💧 জীবনরক্ষাকারী জরুরি নির্দেশিকা:
1. **ওআরএস (ORS) গ্রহণ**: প্রতিবার পাতলা পায়খানা বা বমির পর ১ গ্লাস তৈরি খাবার স্যালাইন ধীরে ধীরে পান করুন।
2. **জল বিশোধন**: সমস্ত পানীয় জল কমপক্ষে **১-২ মিনিট** ভালো করে ফুটিয়ে ঠাণ্ডা করে পান করুন।
3. **বিপদ চিহ্ন**: যদি তীব্র দুর্বলতা, প্রস্রাব বন্ধ হওয়া বা মলের সাথে রক্ত দেখা যায়, তবে বিলম্ব না করে নিকটস্থ স্বাস্থ্যকেন্দ্রে যান।
"""
    elif lang_code == "hi":
        return f"""### 🩺 जल-स्वास्थ्य एआई परामर्श ({station_name})

आपके द्वारा बताए गए लक्षणों के आधार पर प्राथमिक स्वास्थ्य विश्लेषण:

* **अनुमानित जोखिम स्तर**: **{risk_level.upper()}** (संभावित समस्या: *{suspected_condition.replace('_', ' ').title()}*)
* **क्षेत्रीय जल सूचकांक (WQI)**: {wqi}/100 (टर्बिडिटी: {turbidity} NTU)
{visual_note_hi}

#### 💧 प्राथमिक उपचार एवं सुरक्षा कदम:
1. **ओआरएस (ORS) घोल**: दस्त या उल्टी के बाद तत्काल ओआरएस घोल या नमक-चीनी का पानी पिएं।
2. **पानी उबालें**: पीने के सभी पानी को कम से कम **१-२ मिनट** खौलाएं और छानकर ही उपयोग करें।
3. **आपातकालीन संकेत**: अत्यधिक कमजोरी, आंखों का धंसना या बेहोशी होने पर तुरंत नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) पहुंचें।
"""
    elif lang_code == "as":
        return f"""### 🩺 জল-স্বাস্থ্য এআই পৰামৰ্শ ({station_name})

আপুনি উল্লেখ কৰা লক্ষণসমূহৰ ওপৰত ভিত্তি কৰি প্ৰাথমিক স্বাস্থ্য মূল্যায়ন:

* **আনুমানিক বিপদৰ মাত্ৰা**: **{risk_level.upper()}** (সম্ভাব্য কাৰণ: *{suspected_condition.replace('_', ' ').title()}*)
* **পানীৰ গুণাগুণ সূচক (WQI)**: {wqi}/100 (ঘোলা মাত্ৰা: {turbidity} NTU)
{visual_note_as}

#### 💧 জৰুৰী প্ৰাথমিক পৰামৰ্শ:
1. **অ'আৰএছ (ORS) সেৱন**: শৌচ বা বমি হোৱাৰ লগে লগে ১ গিলাচ অ'আৰএছ পানী নিয়মীয়াকৈ খাওক।
2. **পানী উতলাই খাওক**: খোৱাপানী কমেও **১-২ মিনিট** ভালদৰে উতলাই ঠাণ্ডা কৰি লওক।
3. **সতৰ্কতা সংকেত**: প্ৰস্ৰাৱ কমি যোৱা, চকু কোটৰত সোমোৱা বা অত্যন্ত দুৰ্বল অনুভৱ হ'লে পলম নকৰি ওচৰৰ স্বাস্থ্যকেন্দ্ৰলৈ যাওক।
"""
    else:
        return f"""### 🩺 Jal-Swasthya AI Clinical Triage ({station_name})

Based on your symptoms and localized PostGIS telemetry:

* **Epidemiological Risk Level**: **{risk_level.upper()}** (Suspected: *{suspected_condition.replace('_', ' ').title()}*)
* **Local Water Quality (WQI)**: {wqi}/100 (Turbidity: {turbidity} NTU)
{visual_note_en}

#### 💧 Life-Saving First-Response Steps:
1. **Immediate Hydration (ORS)**: Sip Oral Rehydration Salts (ORS) solution regularly after each fluid loss.
2. **Safe Water Barrier**: Boil all domestic drinking water vigorously for **1-2 minutes** before consumption.
3. **Red-Flag Warning**: If experiencing severe dehydration, lethargy, or persistent vomiting, visit your nearest Primary Health Centre (PHC) immediately.
"""

async def generate_health_chat_response(request: HealthChatRequest) -> HealthChatResponse:
    """Generates chat response via local Ollama Llama instance with intelligent fallback and visual analysis."""
    lang_code = request.language if request.language in LANGUAGE_NAMES else "en"

    # 1. Perform simulated computer vision analysis if image was uploaded
    visual_analysis = None
    if request.image_base64:
        visual_analysis = image_analyzer.analyze_base64(request.image_base64)

    # 2. Evaluate clinical risk & actions
    risk_level, suspected_condition, actions = evaluate_risk_and_condition(
        request.message,
        request.telemetry or {},
        request.active_alerts or [],
        visual_analysis
    )

    system_prompt = build_system_prompt(request, visual_analysis)
    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

    # Append conversation history
    if request.conversation_history:
        for msg in request.conversation_history[-6:]:
            messages.append({"role": msg.role, "content": msg.content})

    # Append current user message
    user_content = request.message
    if visual_analysis and visual_analysis.get("has_image"):
        user_content += f"\n[Attached image: {visual_analysis.get('visual_cue')}]"
    messages.append({"role": "user", "content": user_content})

    response_text = ""
    model_used = f"local-ollama-{OLLAMA_MODEL}"

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            ollama_res = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "top_p": 0.9,
                        "num_predict": 512
                    }
                }
            )

            if ollama_res.status_code == 200:
                data = ollama_res.json()
                response_text = data.get("message", {}).get("content", "").strip()
            else:
                gen_res = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "system": system_prompt,
                        "prompt": user_content,
                        "stream": False,
                        "options": {"temperature": 0.3}
                    }
                )
                if gen_res.status_code == 200:
                    response_text = gen_res.json().get("response", "").strip()
    except Exception as e:
        response_text = ""

    if not response_text:
        response_text = generate_vernacular_fallback(
            request,
            risk_level,
            suspected_condition,
            actions,
            visual_analysis
        )
        model_used = "jal-swasthya-clinical-engine"

    env_context = {
        "station_name": request.station_name or "Brahmaputra Regional Grid",
        "wqi_score": (request.telemetry or {}).get("wqi_score", 85),
        "wqi_grade": (request.telemetry or {}).get("wqi_grade", "Good"),
        "turbidity": (request.telemetry or {}).get("turbidity", 0.8),
        "active_alerts_count": len(request.active_alerts or [])
    }

    return HealthChatResponse(
        response=response_text,
        language=lang_code,
        risk_level=risk_level,
        suspected_condition=suspected_condition,
        recommended_actions=actions,
        environmental_context_used=env_context,
        visual_analysis=visual_analysis,
        model_used=model_used,
        disclaimer=DISCLAIMERS.get(lang_code, DISCLAIMERS["en"])
    )
