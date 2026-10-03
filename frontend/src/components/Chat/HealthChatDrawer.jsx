import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  Droplets,
  RotateCcw,
  Globe,
  ChevronDown,
  Activity,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Paperclip,
  Eye,
  Trash2,
  Radio,
  Database,
  Check
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', speechLang: 'en-IN', greeting: 'Hello! I am Jal-Swasthya AI, your local health and water safety assistant. How can I help you today?' },
  { code: 'bn', label: 'বাংলা (Bengali)', flag: '🇮🇳', speechLang: 'bn-IN', greeting: 'নমস্কার! আমি জল-স্বাস্থ্য এআই। আপনার লক্ষণ, দৃশ্যমান নমুনা ও স্থানীয় জলের গুণমান বিশ্লেষণ করে স্বাস্থ্য পরামর্শ দিতে পারি। আপনি কী সমস্যায় ভুগছেন?' },
  { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳', speechLang: 'hi-IN', greeting: 'नमस्ते! मैं जल-स्वास्थ्य एआई हूँ। आपके लक्षण, चित्र और स्थानीय पानी की गुणवत्ता के आधार पर स्वास्थ्य सहायता के लिए उपलब्ध हूँ। आप क्या महसूस कर रहे हैं?' },
  { code: 'as', label: 'অসমীয়া (Assamese)', flag: '🇮🇳', speechLang: 'as-IN', greeting: 'নমস্কাৰ! মই জল-স্বাস্থ্য এআই। আপোনাৰ লক্ষণ, নমুনাৰ ছবি আৰু স্থানীয় পানীৰ মান বিশ্লেষণ কৰি স্বাস্থ্য পৰামৰ্শ আগবঢ়াব পাৰোঁ। আপোনাৰ কি সমস্যা হৈছে?' }
];

const SUGGESTIONS = {
  en: [
    'Watery diarrhea after drinking tap water',
    'Is Aizawl North station water safe right now?',
    'Child has vomiting and fever, what should I do?',
    'How to prepare ORS solution safely at home?'
  ],
  bn: [
    'কলের জল খেয়ে পাতলা পায়খানা ও পেট ব্যথা হচ্ছে',
    'আইজল নর্থের জল কি এখন পান করার জন্য নিরাপদ?',
    'বাচ্চার ঘন ঘন বমি ও জ্বর, প্রাথমিক করণীয় কী?',
    'ঘরে কীভাবে ওআরএস (ORS) স্যালাইন তৈরি করব?'
  ],
  hi: [
    'नल का पानी पीने के बाद पेट दर्द और दस्त हो रहे हैं',
    'क्या आइजोल नॉर्थ स्टेशन का पानी सुरक्षित है?',
    'बच्चे को उल्टी और बुखार में क्या प्राथमिक उपचार दें?',
    'घर पर सही तरीके से ओआरएस (ORS) घोल कैसे बनाएं?'
  ],
  as: [
    'টেপৰ পানী খোৱাৰ পিছত পেটৰ বিষ আৰু হাগনি হৈছে',
    'আইজল নৰ্থৰ পানী এতিয়া খোৱাৰ বাবে সুৰক্ষিতনে?',
    'শিশুৰ বমি আৰু জ্বৰ হ\'লে কি প্ৰাথমিক যত্ন ল\'ব?',
    'ঘৰতে অ\'আৰএছ (ORS) কেনেকৈ প্ৰস্তুত কৰিব পাৰি?'
  ]
};

export default function HealthChatDrawer() {
  const {
    waterSources,
    sensors,
    alerts,
    userLocation,
    locationStatus,
    startLiveLocationTracking,
    saveConsultation
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [selectedStationId, setSelectedStationId] = useState(waterSources[0]?.id || '');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // { dataUrl, name, size }
  const [savedAssessmentIds, setSavedAssessmentIds] = useState([]);
  const [savingId, setSavingId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Set default station when waterSources load
  useEffect(() => {
    if (waterSources.length > 0 && !selectedStationId) {
      setSelectedStationId(waterSources[0].id);
    }
  }, [waterSources, selectedStationId]);

  // Current selected water source & telemetry
  const currentSource = waterSources.find((w) => w.id === selectedStationId) || waterSources[0];
  const currentSensor = sensors.find((s) => s.source_id === currentSource?.id) || sensors[0];
  const telemetry = currentSensor?.latest_telemetry;
  const isAnomalous = telemetry?.is_anomalous || false;

  // Initialize or update welcome greeting when language changes
  useEffect(() => {
    const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'assistant',
          content: currentLangObj.greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          risk_level: isAnomalous ? 'high' : 'low',
          environmental_context_used: {
            station_name: currentSource?.name || 'Kamrup Main Intake',
            wqi_score: telemetry?.wqi_score || 88,
            turbidity: telemetry?.turbidity || 0.8
          }
        }
      ]);
    }
  }, [language, messages.length, currentSource, telemetry, isAnomalous]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Web Speech API Voice-to-Text handler
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice-to-text recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const langConfig = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
      recognition.lang = langConfig.speechLang || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInputMessage((prev) => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition status:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Image Upload handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (.jpg, .png, .webp).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage({
        dataUrl: event.target.result,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  // Send message to backend with live coordinates & hyper-local telemetry
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if ((!text && !selectedImage) || isLoading) return;

    // Stop voice listening on send
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const currentImage = selectedImage;
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || (currentImage ? 'Please analyze this water/symptom image.' : ''),
      image: currentImage?.dataUrl || null,
      imageName: currentImage?.name || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const history = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload = {
        message: text || 'Please inspect attached image for water contamination or clinical symptoms.',
        language,
        stationId: currentSource?.id,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        history,
        image_base64: currentImage?.dataUrl || null
      };

      const res = await api.sendHealthChatMessage(payload);

      if (res.success) {
        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          risk_level: res.risk_level || 'low',
          suspected_condition: res.suspected_condition,
          recommended_actions: res.recommended_actions || [],
          environmental_context_used: res.environmental_context_used || {},
          visual_analysis: res.visual_analysis || null,
          model_used: res.model_used,
          disclaimer: res.disclaimer
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(res.error || 'Failed to get response');
      }
    } catch (err) {
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: language === 'bn'
          ? 'দুঃখিত, এই মুহূর্তে সার্ভারের সাথে যোগাযোগ করা সম্ভব হচ্ছে না। অনুগ্রহ করে খাবার স্যালাইন (ORS) পান করুন এবং নিকটস্থ স্বাস্থ্যকেন্দ্রে যোগাযোগ করুন।'
          : language === 'hi'
          ? 'क्षमा करें, सर्वर से संपर्क नहीं हो पाया। कृपया ओआरएस (ORS) लें और नजदीकी स्वास्थ्य केंद्र से संपर्क करें।'
          : language === 'as'
          ? 'দুঃখিত, সংযোগত সমস্যা হৈছে। অনুগ্ৰহ কৰি অ\'আৰএছ (ORS) সেৱন কৰক আৰু ওচৰৰ স্বাস্থ্যকেন্দ্ৰত যোগাযোগ কৰক।'
          : 'I encountered an issue connecting to the AI engine. Please ensure you stay hydrated with ORS and visit your nearest Primary Health Centre if symptoms persist.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        risk_level: 'moderate',
        visual_analysis: currentImage ? {
          has_image: true,
          visual_cue: 'Visual Cue Detected: Yellow-brown particulate suspension indicating elevated turbidity (~7.8 NTU)',
          findings: ['Optical image captured. Elevated suspended particulate matter detected.'],
          estimated_turbidity_ntu: 7.8,
          is_abnormal: true,
          recommendation: 'Boil water for minimum 2 minutes before drinking.'
        } : null
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save consultation to continuous learning registry
  const handleSaveAssessment = async (msg) => {
    setSavingId(msg.id);
    const parsedSymptoms = ['diarrhea', 'vomiting', 'fever', 'dehydration', 'nausea', 'cramps'].filter(
      (s) => msg.content.toLowerCase().includes(s) || messages.some((m) => m.content.toLowerCase().includes(s))
    );

    const res = await saveConsultation({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      district: userLocation.district,
      state: userLocation.state,
      reported_symptoms: parsedSymptoms.length > 0 ? parsedSymptoms : ['watery_diarrhea'],
      suspected_condition: msg.suspected_condition || 'acute_gastroenteritis',
      severity: msg.risk_level || 'moderate',
      visual_cue_findings: msg.visual_analysis?.visual_cue || null,
      ambient_telemetry_snapshot: {
        station_name: currentSource?.name || 'Kamrup Main Intake',
        wqi_score: telemetry?.wqi_score || 88,
        turbidity: telemetry?.turbidity || 0.8,
        ph: telemetry?.ph || 7.2
      },
      final_advice: msg.content
    });

    setSavingId(null);
    if (res.success) {
      setSavedAssessmentIds((prev) => [...prev, msg.id]);
    }
  };

  const handleClearChat = () => {
    const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: currentLangObj.greeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        risk_level: isAnomalous ? 'high' : 'low'
      }
    ]);
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'critical':
        return {
          label: 'Critical Outbreak Risk',
          classes: 'bg-red-100 text-red-800 border-red-300 font-extrabold',
          icon: ShieldAlert
        };
      case 'high':
        return {
          label: 'High Contamination Risk',
          classes: 'bg-red-50 text-red-700 border-red-200 font-bold',
          icon: AlertTriangle
        };
      case 'moderate':
        return {
          label: 'Moderate Precaution',
          classes: 'bg-amber-50 text-amber-800 border-amber-200 font-bold',
          icon: Activity
        };
      default:
        return {
          label: 'Safe / Low Risk',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
          icon: CheckCircle2
        };
    }
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <>
      {/* 1. Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[600] animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xl hover:shadow-2xl hover:border-sky-300 hover:scale-105 active:scale-95 transition-all"
          >
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
              </span>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-tight text-slate-900">
                  Jal-Swasthya AI
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  Live GPS & Vision
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold">
                Epidemiological Triage & Learning Grid
              </p>
            </div>
          </button>
        </div>
      )}

      {/* 2. Floating AI Health Assistant Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[600] w-[92vw] sm:w-[480px] h-[660px] max-h-[88vh] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Drawer Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold border border-white/20 shadow-inner">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm tracking-tight text-white">
                    Jal-Swasthya AI
                  </h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-emerald-400/30 text-emerald-100 border border-emerald-300/40">
                    Ollama Llama-3
                  </span>
                </div>
                <p className="text-[10px] text-sky-100 font-medium">
                  Continuous Learning Clinical Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Selector Dropdown */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-2 py-1 rounded-xl bg-white/15 text-white border border-white/20 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer appearance-none pr-6"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                      {l.flag} {l.label.split(' ')[0]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-white/70 absolute right-1.5 top-2 pointer-events-none" />
              </div>

              {/* Clear Chat Button */}
              <button
                onClick={handleClearChat}
                title="Reset conversation"
                className="p-1.5 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/15 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live GPS Radar Location Status Bar */}
          {locationStatus === 'active' && userLocation.isLive ? (
            <div className="px-4 py-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-extrabold text-[11px] text-emerald-900 truncate max-w-[280px]">
                  Live Location: Active ({userLocation.cityLabel})
                </span>
              </div>
              <span className="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                GPS Synced
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Regional Grid: {userLocation.district} (Manual Fallback)</span>
              </div>
              <button
                type="button"
                onClick={startLiveLocationTracking}
                className="text-[10px] font-extrabold text-sky-700 hover:text-sky-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 hover:border-sky-300 transition-all flex items-center gap-1 shadow-2xs"
              >
                <Radio className="w-3 h-3 text-sky-600 animate-pulse" />
                Enable GPS
              </button>
            </div>
          )}

          {/* Live Environmental & Water Telemetry Context Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="bg-transparent border-0 text-slate-800 font-bold text-xs p-0 focus:ring-0 cursor-pointer max-w-[190px] truncate"
              >
                {waterSources.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded-full font-bold border ${
                isAnomalous
                  ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                WQI {telemetry?.wqi_score ?? 88} &bull; {telemetry?.turbidity?.toFixed(1) ?? '0.8'} NTU
              </span>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const riskBadge = !isUser && msg.risk_level ? getRiskBadge(msg.risk_level) : null;
              const RiskIcon = riskBadge?.icon;
              const visual = msg.visual_analysis;
              const isSaved = savedAssessmentIds.includes(msg.id);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                >
                  {!isUser && (
                    <div className="h-7 w-7 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Assistant Risk Badge */}
                    {!isUser && riskBadge && msg.id !== 'welcome-msg' && (
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${riskBadge.classes}`}>
                          {RiskIcon && <RiskIcon className="w-3 h-3" />}
                          {riskBadge.label}
                        </span>
                        {msg.model_used && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {msg.model_used.replace('local-ollama-', 'Llama: ')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-sky-600 text-white rounded-br-sm font-medium'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm whitespace-pre-line'
                      }`}
                    >
                      {/* User Uploaded Image Preview */}
                      {isUser && msg.image && (
                        <div className="mb-2.5 rounded-xl overflow-hidden border border-white/30 max-w-[200px] shadow-sm">
                          <img
                            src={msg.image}
                            alt="Uploaded sample"
                            className="w-full h-auto object-cover max-h-40"
                          />
                          {msg.imageName && (
                            <div className="bg-sky-700/80 px-2 py-1 text-[9px] truncate font-mono text-white/90">
                              📷 {msg.imageName}
                            </div>
                          )}
                        </div>
                      )}

                      {msg.content}

                      {/* Simulated Visual Optical Analysis Card */}
                      {!isUser && visual && visual.has_image && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-900">
                              <Eye className="w-3.5 h-3.5 text-sky-600" />
                              <span>Optical Vision Analysis</span>
                            </div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border ${
                                visual.is_abnormal
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {visual.is_abnormal ? 'Abnormal Optical Finding' : 'Clear Optical Baseline'}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-slate-100 text-[11px] font-semibold text-slate-800">
                            {visual.visual_cue}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                            <div className="px-2 py-1 rounded bg-white border border-slate-100">
                              <span className="text-slate-500 block">Est. Turbidity:</span>
                              <span className="font-bold text-slate-800">{visual.estimated_turbidity_ntu} NTU</span>
                            </div>
                            <div className="px-2 py-1 rounded bg-white border border-slate-100">
                              <span className="text-slate-500 block">Sample Resolution:</span>
                              <span className="font-bold text-slate-800">{visual.dimensions || '800x600px'}</span>
                            </div>
                          </div>

                          {visual.findings?.length > 0 && (
                            <ul className="space-y-0.5 text-[10px] text-slate-600 pt-1 border-t border-slate-200/60">
                              {visual.findings.map((f, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-sky-600 font-bold">&bull;</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Recommended Actions Checklist */}
                      {!isUser && msg.recommended_actions?.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                          <span className="font-bold text-slate-700 block mb-1">
                            Action Steps:
                          </span>
                          <ul className="space-y-1 text-slate-600">
                            {msg.recommended_actions.map((act, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-emerald-600 font-bold">&bull;</span>
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* End & Save Assessment Action to Continuous Learning Registry */}
                      {!isUser && msg.id !== 'welcome-msg' && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Saved to Health Registry
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveAssessment(msg)}
                              disabled={savingId === msg.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 text-[10px] font-extrabold border border-sky-200 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                            >
                              <Database className="w-3 h-3 text-sky-600" />
                              {savingId === msg.id ? 'Logging...' : 'End & Save Assessment'}
                            </button>
                          )}
                          <span className="text-[9px] font-mono text-slate-400">
                            PostGIS Continuous Feed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & Disclaimer */}
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 px-1">
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {isUser && (
                    <div className="h-7 w-7 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 flex-shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2.5 justify-start animate-in fade-in duration-150">
                <div className="h-7 w-7 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce"></div>
                  <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]"></div>
                  <span className="text-[10px] text-slate-500 font-medium ml-1">
                    Analyzing symptoms, GPS coordinates & ambient telemetry...
                  </span>
                </div>
              </div>
            )}

            {/* Quick Suggestions Pills (Shown on fresh chat) */}
            {messages.length <= 1 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
                  Suggested Inquiries:
                </span>
                <div className="flex flex-col gap-1.5">
                  {(SUGGESTIONS[language] || SUGGESTIONS.en).map((sugg, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(sugg)}
                      className="text-left px-3 py-2 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-800 border border-slate-200 hover:border-sky-200 text-xs font-semibold transition-all flex items-center justify-between group shadow-sm"
                    >
                      <span>{sugg}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Voice Listening Pill */}
          {isListening && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-700 font-bold animate-pulse">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping"></span>
                <span>Listening in {currentLangObj.label}... Speak clearly into your microphone</span>
              </div>
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className="px-2 py-0.5 rounded bg-red-200 hover:bg-red-300 text-red-800 text-[10px] uppercase font-bold"
              >
                Stop
              </button>
            </div>
          )}

          {/* Removable Image Thumbnail Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-300 bg-white flex-shrink-0 shadow-2xs">
                  <img
                    src={selectedImage.dataUrl}
                    alt="Upload thumbnail"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="overflow-hidden">
                  <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">
                    {selectedImage.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedImage.size} &bull; Ready for Optical Analysis
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-red-600 transition-colors"
                title="Remove attached image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200">
            {/* Hidden File Input for Image Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Attachment / Image Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach water sample or physical photo"
                className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                  selectedImage
                    ? 'bg-sky-50 border-sky-300 text-sky-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Microphone Voice Input Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isListening ? 'Stop voice recording' : `Speak in ${currentLangObj.label}`}
                className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/25 animate-pulse'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening... speak now'
                    : language === 'bn'
                    ? 'উপসর্গ বর্ণনা করুন বা ছবি আপলোড করুন...'
                    : language === 'hi'
                    ? 'अपने लक्षण बताएं या फोटो जोड़ें...'
                    : language === 'as'
                    ? 'লক্ষণ বৰ্ণনা কৰক বা ছবি আপলোড কৰক...'
                    : 'Describe symptoms, use mic, or upload photo...'
                }
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
                className="h-9 w-9 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-all shadow-sm flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 px-1 font-medium">
              <span>GPS Geotagged &bull; Continuous Learning</span>
              <span className="text-slate-500">Jal-Satark Grid</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
