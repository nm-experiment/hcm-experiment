import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Settings, 
  Activity, 
  Database, 
  Brain, 
  Terminal,
  User,
  LogIn,
  Bot, 
  File, 
  X, 
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  Unlock,
  ChevronRight,
  Globe
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  setDoc
} from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1. CONFIGURATION AREA
// -----------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyAa_uOiuWDT2d1N06VK6L-S7B5E-kwp4-s",
  authDomain: "hcm-experiment.firebaseapp.com",
  projectId: "hcm-experiment",
  storageBucket: "hcm-experiment.firebasestorage.app",
  messagingSenderId: "651308574678",
  appId: "1:651308574678:web:25eabe58aac93a0cf82677"
};

const LLM_CONFIG = {
  activeProvider: "alpine",
  providers: {
    alpine: {
      url: "https://api.prod.alpineai.ch/v1/chat/completions",
      apiKey: "e0d4c9da-4186-4b30-9e22-c3d8bcff3373",
      model: "alpineai/Llama-4"
    },
    deepseek: {
      url: "https://api.deepseek.com/v1/chat/completions",
      apiKey: "YOUR_DEEPSEEK_KEY", 
      model: "deepseek-chat"
    }
  }
};

// --- TRANSLATIONS ---
const TRANSLATIONS = {
  en: {
    enterLab: "Enter Lab",
    participantId: "Participant ID",
    formatHint: "Format: Letter + 6 Digits",
    uploadDataset: "Upload Dataset (PDF, CSV, Excel)",
    askQuestion: "Ask a question...",
    readyForAnalysis: "Ready for analysis",
    analyzingData: "Analyzing data...",
    status: "STATUS",
    operational: "OPERATIONAL",
    processing: "PROCESSING...",
    tokenStream: "TOKEN STREAM",
    latency: "LATENCY",
    uptime: "UPTIME",
    configuration: "Configuration",
    temperature: "Temperature",
    topP: "Top P",
    aiDisclaimer: "AI can make mistakes. Verify important information.",
    confidentialDisclaimer: "Please do not enter personal or confidential information.",
    maintenanceTitle: "Be back soon.",
    maintenanceText: "We are performing scheduled updates to the HCM Data Lab. The experiment will resume shortly.",
    researcherMode: "Researcher Mode",
    locked: "Locked",
    unlocked: "Unlocked",
    csvExport: "CSV Export",
    systemMetrics: "System Metrics",
    analysis: "Analysis",
    summary: "Summary",
    rawData: "Raw Data",
    logicFlow: "Logic Flow",
    reasoning: "Reasoning",
    signInTitle: "Sign in with your Participant ID",
    hcmTitle: "HCM Data Lab"
  },
  de: {
    enterLab: "Labor betreten",
    participantId: "Teilnehmer-ID",
    formatHint: "Format: Buchstabe + 6 Ziffern",
    uploadDataset: "Datensatz hochladen (PDF, CSV, Excel)",
    askQuestion: "Stellen Sie eine Frage...",
    readyForAnalysis: "Bereit zur Analyse",
    analyzingData: "Daten werden analysiert...",
    status: "STATUS",
    operational: "BETRIEBSBEREIT",
    processing: "VERARBEITUNG...",
    tokenStream: "TOKEN-STROM",
    latency: "LATENZ",
    uptime: "BETRIEBSZEIT",
    configuration: "Konfiguration",
    temperature: "Temperatur",
    topP: "Top P",
    aiDisclaimer: "KI kann Fehler machen. Überprüfen Sie wichtige Informationen.",
    confidentialDisclaimer: "Bitte geben Sie keine persönlichen oder vertraulichen Informationen ein.",
    maintenanceTitle: "Bald zurück.",
    maintenanceText: "Wir führen geplante Updates am HCM Data Lab durch. Das Experiment wird in Kürze fortgesetzt.",
    researcherMode: "Forschermodus",
    locked: "Gesperrt",
    unlocked: "Entsperrt",
    csvExport: "CSV Export",
    systemMetrics: "Systemmetriken",
    analysis: "Analyse",
    summary: "Zusammenfassung",
    rawData: "Rohdaten",
    logicFlow: "Logikfluss",
    reasoning: "Begründung",
    signInTitle: "Melden Sie sich mit Ihrer Teilnehmer-ID an",
    hcmTitle: "HCM Datenlabor"
  }
};

// Condition Mapping logic
const CONDITIONS = {
  1: { name: "Alex", type: "Gold Standard", complexity: "LOW", transparency: "HIGH" },
  2: { name: "Danny", type: "Expert Mode", complexity: "HIGH", transparency: "HIGH" },
  3: { name: "Kim", type: "Magic Box", complexity: "LOW", transparency: "LOW" },
  4: { name: "Taylor", type: "Black Box", complexity: "HIGH", transparency: "LOW" }
};

// VALIDATION LOGIC
const ID_REGEX = /^[adktADKT]\d{6}$/;

const getConditionFromId = (studentId) => {
  const id = studentId.trim().toLowerCase();
  if (id.startsWith('a')) return 1; 
  if (id.startsWith('d')) return 2; 
  if (id.startsWith('k')) return 3; 
  if (id.startsWith('t')) return 4; 
  return 1; 
};

const ALLOWED_EXTENSIONS = ['pdf', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'];

let db;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not connected. Data will not save.");
}

// -----------------------------------------------------------------------------
// 2. API HANDLER
// -----------------------------------------------------------------------------

const callLLM = async (query, contextFilename, conditionId, params, lang) => {
  const config = LLM_CONFIG.providers[LLM_CONFIG.activeProvider];
  
  // Instruct AI to respond in the selected language
  const languageInstruction = lang === 'de' ? "Respond in German (Deutsch)." : "Respond in English.";
  
  const systemPrompt = `You are an expert HCM Analytics assistant. ${languageInstruction}
  ${conditionId === 3 || conditionId === 4 ? "Direct answer only. No reasoning." : "Explain reasoning clearly."}
  Context: ${contextFilename || "General Knowledge"}`;

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: params.temperature,
        max_tokens: 800 
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    
    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "No response generated.";

    return {
      answer: rawText,
      reasoning_trace: conditionId <= 2 ? "Reasoning integrated in response." : null, 
      confidence_score: 0.85 + (Math.random() * 0.1), 
      raw_data_snippet: { note: "Live Data" }
    };

  } catch (error) {
    console.error("LLM Failed:", error);
    return {
      answer: "Connection error. Please try again.",
      reasoning_trace: `Debug: ${error.message}`,
      confidence_score: 0,
      raw_data_snippet: {}
    };
  }
};

// -----------------------------------------------------------------------------
// 3. MAIN APP
// -----------------------------------------------------------------------------

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [loginError, setLoginError] = useState(""); 
  const [condition, setCondition] = useState(1);
  const [isResearcherMode, setIsResearcherMode] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' or 'de'
  
  const [params, setParams] = useState({ temperature: 0.7, topP: 0.9, contextWindow: 4096 });
  const [currentFile, setCurrentFile] = useState(null);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [lastResponseTimestamp, setLastResponseTimestamp] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);

  const isHighComplexity = [2, 4].includes(condition);
  const isHighTransparency = [1, 2].includes(condition);

  // Translation Helper
  const t = (key) => TRANSLATIONS[lang][key] || key;

  // --- GLOBAL SETTINGS LISTENER (MAINTENANCE MODE) ---
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsMaintenanceMode(!!data.maintenance_mode);
      }
    });
    return () => unsub();
  }, []);

  // --- AUTO-LOGIN (STICKY SESSION) ---
  useEffect(() => {
    const savedId = localStorage.getItem("hcm_student_id");
    if (savedId) {
      setStudentId(savedId);
    }
  }, []);

  // --- SESSION MANAGEMENT ---
  useEffect(() => {
    if (!isLoggedIn || !db) return;
    let localSessionId = null;
    const startSession = async () => {
      try {
        const sessionRef = await addDoc(collection(db, "sessions"), {
          student_id: studentId,
          condition_id: condition,
          start_time: serverTimestamp(),
          last_active: serverTimestamp(),
          duration_minutes: 0,
          interaction_count: 0,
          date_str: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        });
        setSessionId(sessionRef.id);
        localSessionId = sessionRef.id;
      } catch(e) { console.error("Session start failed", e); }
    };
    startSession();
    const heartbeat = setInterval(async () => {
      if (localSessionId) {
        const ref = doc(db, "sessions", localSessionId);
        try { await updateDoc(ref, { last_active: serverTimestamp() }); } catch(e) {}
      }
    }, 60000);
    return () => clearInterval(heartbeat);
  }, [isLoggedIn]);

  // --- LOGGING ---
  const logInteraction = async (type, payload) => {
    if (!db || !sessionId) return;
    setInteractionCount(prev => prev + 1);
    try {
      await addDoc(collection(db, `sessions/${sessionId}/logs`), { type, ...payload, timestamp: serverTimestamp() });
      updateDoc(doc(db, "sessions", sessionId), { interaction_count: interactionCount + 1 });
    } catch(e) {}
  };

  useEffect(() => {
    if (!lastResponseTimestamp) return;
    const handleInteraction = (e) => {
      const ms = Date.now() - lastResponseTimestamp;
      logInteraction("REACTION_TIME", { ms, trigger: e.type });
      setLastResponseTimestamp(null);
    };
    const opts = { capture: true, once: true };
    ['mousedown','keydown','scroll','touchstart'].forEach(evt => window.addEventListener(evt, handleInteraction, opts));
    return () => ['mousedown','keydown','scroll','touchstart'].forEach(evt => window.removeEventListener(evt, handleInteraction, opts));
  }, [lastResponseTimestamp]);

  // --- DATA EXPORT ---
  const exportData = async () => {
    if (!db) return alert("Database not connected");
    try {
      const q = query(collection(db, "sessions"), orderBy("student_id"));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return alert("No data found.");
      const students = {};
      const allDates = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        const sId = data.student_id || "Unknown";
        const date = data.date_str || new Date().toISOString().split('T')[0];
        if (!students[sId]) students[sId] = { condition: data.condition_id, total_duration: 0, total_clicks: 0, total_sessions: 0, dates: {} };
        let sessionDuration = 0;
        if (data.start_time && data.last_active) {
           const start = data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
           const end = data.last_active.toDate ? data.last_active.toDate() : new Date(data.last_active);
           sessionDuration = Math.round((end - start) / 60000);
           if (sessionDuration < 0) sessionDuration = 0;
        }
        students[sId].total_duration += sessionDuration;
        students[sId].total_clicks += (data.interaction_count || 0);
        students[sId].total_sessions += 1;
        allDates.add(date);
        if (!students[sId].dates[date]) students[sId].dates[date] = { duration: 0, clicks: 0 };
        students[sId].dates[date].duration += sessionDuration;
        students[sId].dates[date].clicks += (data.interaction_count || 0);
      });
      const sortedDates = Array.from(allDates).sort();
      let csvContent = "data:text/csv;charset=utf-8,Student_ID,Condition,Total_Sessions,Total_Active_Mins,Total_Clicks,Avg_Session_Length_Mins";
      sortedDates.forEach(date => { csvContent += `,${date}_Mins,${date}_Clicks`; });
      csvContent += "\n";
      Object.keys(students).forEach(sId => {
        const s = students[sId];
        const avgSession = s.total_sessions > 0 ? (s.total_duration / s.total_sessions).toFixed(2) : 0;
        let row = `${sId},${s.condition},${s.total_sessions},${s.total_duration},${s.total_clicks},${avgSession}`;
        sortedDates.forEach(date => {
          const dData = s.dates[date] || { duration: 0, clicks: 0 };
          row += `,${dData.duration},${dData.clicks}`;
        });
        csvContent += row + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `hcm_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert("Export failed: " + e.message); }
  };

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(""); 
    const cleanedId = studentId.trim();
    if (!ID_REGEX.test(cleanedId)) {
      setLoginError(t('formatHint')); // Localize error
      return;
    }
    localStorage.setItem("hcm_student_id", cleanedId);
    setCondition(getConditionFromId(cleanedId));
    setIsLoggedIn(true);
  };

  const handleResearcherToggle = (e) => {
    if (e.target.checked) {
      const pwd = prompt("Enter Administrator Password:");
      if (pwd === "Ug5Bgrb9uU%@k7@pNMSFd1TdvUcyA@") setIsResearcherMode(true);
      else alert("Access Denied.");
    } else setIsResearcherMode(false);
  };

  const toggleMaintenanceMode = async () => {
    if (!db) return;
    try {
      const newState = !isMaintenanceMode;
      await setDoc(doc(db, "settings", "config"), { maintenance_mode: newState }, { merge: true });
    } catch(e) {
      console.error("Error toggling maintenance:", e);
      alert("Failed to update maintenance mode.");
    }
  };

  const unlockMaintenance = () => {
    const pwd = prompt("Enter Administrator Password to Unlock:");
    if (pwd === "Ug5Bgrb9uU%@k7@pNMSFd1TdvUcyA@") {
      setIsResearcherMode(true); 
      setIsMaintenanceMode(false); 
    } else {
      alert("Access Denied.");
    }
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { type: 'user', text: query };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    logInteraction("PROMPT_SENT", { query, params, has_file: !!currentFile });
    setQuery("");
    
    const start = Date.now();
    // Pass language to LLM call
    const res = await callLLM(userMsg.text, currentFile?.name, condition, params, lang);
    const latency = Date.now() - start;

    setChatHistory(prev => [...prev, { 
      type: 'ai', ...res, 
      system_metrics: { latency_ms: latency, tokens_used: Math.round(res.answer.length/4), model_version: LLM_CONFIG.activeProvider, context_window_usage: "N/A" }
    }]);
    setLastResponseTimestamp(Date.now());
    setLoading(false);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
       alert("File Type not Supported"); 
       e.target.value = "";
       return;
    }
    setCurrentFile(f);
    logInteraction("FILE_UPLOAD", { name: f.name });
  };

  // --- LANGUAGE SWITCHER COMPONENT ---
  const LanguageSwitcher = () => (
    <button 
      onClick={() => setLang(lang === 'en' ? 'de' : 'en')}
      className="fixed top-6 right-6 z-50 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-white hover:scale-105 transition-all duration-300"
    >
      {lang === 'en' ? (
        <>
          <span className="text-lg">🇨🇭</span>
          <span>Deutsch</span>
        </>
      ) : (
        <>
          <span className="text-lg">🇬🇧</span>
          <span>English</span>
        </>
      )}
    </button>
  );

  const MessageRenderer = ({ msg }) => {
    if (msg.type === 'user') return (
      <div className="flex justify-end mb-4">
        <div className="bg-[#007AFF] text-white px-4 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] text-[15px] shadow-sm leading-relaxed font-normal tracking-wide">
          {msg.text}
        </div>
      </div>
    );

    if (isHighComplexity) {
      const [tab, setTab] = useState('summary');
      return (
        <div className="mb-6 bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('analysis')}</span>
            {isHighTransparency && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold flex gap-1 items-center"><Activity size={10}/> {Math.floor(msg.confidence_score*100)}%</span>}
          </div>
          <div className="flex border-b border-gray-100">
            {['Summary','Raw Data'].map(rawT => {
              const localizedT = rawT === 'Summary' ? t('summary') : t('rawData');
              return (
                <button key={rawT} onClick={()=>setTab(rawT.toLowerCase().split(' ')[0])} className={`flex-1 py-2 text-xs font-medium transition-colors ${tab===rawT.toLowerCase().split(' ')[0]?'text-gray-900 bg-white shadow-sm':'text-gray-400 hover:text-gray-600'}`}>{localizedT}</button>
              );
            })}
          </div>
          <div className="p-5">
            {tab==='summary' && (
              <div className="space-y-4">
                <p className="text-gray-800 text-sm leading-7 font-normal">{msg.answer}</p>
                {isHighTransparency && msg.reasoning_trace && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 mb-3 flex gap-1 uppercase tracking-wider"><Terminal size={10}/> {t('logicFlow')}</h4>
                    <div className="font-mono text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">{msg.reasoning_trace}</div>
                  </div>
                )}
              </div>
            )}
            {tab==='raw' && <pre className="text-xs bg-gray-50 p-4 rounded-xl border border-gray-100 overflow-auto text-gray-600 font-mono">{JSON.stringify(msg.raw_data_snippet,null,2)}</pre>}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 max-w-3xl mr-auto flex gap-4 items-start">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 shadow-inner">
          <Brain size={16}/>
        </div>
        <div className="space-y-2 min-w-0 flex-1">
           <div className="bg-[#E9E9EB] text-gray-900 px-4 py-2.5 rounded-2xl rounded-tl-none text-[15px] leading-relaxed shadow-sm inline-block">
             {msg.answer}
           </div>
           {isHighTransparency && msg.reasoning_trace && (
              <div className="ml-1 mt-2 p-3 bg-white/60 border border-gray-200/60 rounded-xl text-xs text-gray-500 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-1.5 font-semibold mb-1 text-gray-400 text-[10px] uppercase tracking-wider">
                  <Sparkles size={10}/> {t('reasoning')}
                </div>
                <div className="leading-relaxed opacity-80">{msg.reasoning_trace}</div>
              </div>
           )}
        </div>
      </div>
    );
  };

  // --- MAINTENANCE SCREEN ---
  if (isMaintenanceMode && !isResearcherMode) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 relative font-sans">
        <div className="text-center max-w-md space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto text-gray-900 mb-8 border border-gray-100">
             <Sparkles size={32} className="text-gray-400" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{t('maintenanceTitle')}</h1>
          <p className="text-base text-gray-500 leading-relaxed font-light">
            {t('maintenanceText')}
          </p>
        </div>
        <div className="absolute bottom-8 right-8">
           <button onClick={unlockMaintenance} className="text-gray-300 hover:text-gray-400 transition-colors p-2">
             <Lock size={16} />
           </button>
        </div>
      </div>
    );
  }

  // --- LOGIN UI ---
  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans">
      <LanguageSwitcher />
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl w-full max-w-[24rem] border border-white/50">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg text-white">
            <Database size={28} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{t('hcmTitle')}</h1>
          <p className="text-sm text-gray-400 mt-2 font-medium">{t('signInTitle')}</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <div className="relative group">
              <User className="absolute left-4 top-3.5 text-gray-400 transition-colors group-focus-within:text-blue-500" size={18} strokeWidth={2}/>
              <input 
                type="text" 
                value={studentId} 
                onChange={e=>setStudentId(e.target.value.toUpperCase())} 
                className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border ${loginError ? 'border-red-300 bg-red-50/30' : 'border-gray-200'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all text-gray-900 placeholder-gray-400 text-[15px] font-medium`} 
                placeholder="e.g. A123456"
              />
            </div>
            {loginError ? (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium px-2 animate-in slide-in-from-top-1">
                <AlertTriangle size={12} /> {loginError}
              </div>
            ) : (
              studentId.length > 0 && <div className="text-[10px] text-gray-400 px-4 font-medium tracking-wide uppercase">{t('formatHint')}</div>
            )}
          </div>

          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-2xl font-medium text-[15px] flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg shadow-gray-900/20">
            <span>{t('enterLab')}</span>
            <ChevronRight size={16} />
          </button>
          
          <div className="pt-8 border-t border-gray-100 flex flex-col gap-4">
             <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={isResearcherMode} onChange={handleResearcherToggle} className="peer sr-only"/>
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
                <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600 transition-colors">{t('researcherMode')}</span>
             </label>
             
             {isResearcherMode && (
               <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2">
                 <button type="button" onClick={toggleMaintenanceMode} className={`text-[10px] py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors ${isMaintenanceMode ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'}`}>
                   {isMaintenanceMode ? <Lock size={10}/> : <Unlock size={10}/>} 
                   {isMaintenanceMode ? t('locked') : t('unlocked')}
                 </button>
                 <button type="button" onClick={exportData} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors">
                   <Download size={10}/> {t('csvExport')}
                 </button>
               </div>
             )}
          </div>
        </form>
      </div>
    </div>
  );

  // --- MAIN UI ---
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans text-gray-900">
      <LanguageSwitcher />
      {isResearcherMode && (
        <div className="bg-gray-900 text-white/80 py-2 px-6 text-[10px] font-medium flex justify-between items-center tracking-wide backdrop-blur-md sticky top-0 z-50">
           <span className="flex items-center gap-2"><Terminal size={10}/> {CONDITIONS[condition].name} — {studentId}</span>
           <div className="flex items-center gap-3">
             <span className={isMaintenanceMode ? "text-red-400" : "text-emerald-400"}>●</span>
             {isMaintenanceMode ? "MAINTENANCE ACTIVE" : "SYSTEM LIVE"}
           </div>
        </div>
      )}
      
      <div className={`flex-1 ${isHighComplexity ? 'flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto w-full' : 'flex justify-center p-6'} lg:overflow-hidden`}>
        
        {/* SIDEBAR (Config) - High Complexity Only */}
        {isHighComplexity && (
          <div className="order-2 lg:order-1 lg:col-span-3 bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl shadow-sm flex flex-col h-auto lg:h-[calc(100vh-80px)] overflow-hidden">
             <div className="p-5 border-b border-gray-100/50"><h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Settings size={16} className="text-gray-400"/> {t('configuration')}</h2></div>
             <div className="p-6 space-y-8">
               <div className="space-y-4">
                 <div className="flex justify-between text-xs font-medium text-gray-500">
                   <span>{t('temperature')}</span>
                   <span className="text-gray-900">{params.temperature}</span>
                 </div>
                 <input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" value={params.temperature} onChange={e=>setParams({...params, temperature: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between text-xs font-medium text-gray-500">
                   <span>{t('topP')}</span>
                   <span className="text-gray-900">{params.topP}</span>
                 </div>
                 <input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" value={params.topP} onChange={e=>setParams({...params, topP: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/>
               </div>
             </div>
          </div>
        )}

        {/* MAIN CHAT AREA */}
        <div className={`order-1 lg:order-2 ${isHighComplexity ? 'lg:col-span-6' : 'w-full max-w-4xl'} bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 flex flex-col h-[80vh] lg:h-[calc(100vh-80px)] overflow-hidden border border-gray-100 relative z-10`}>
           {/* Header */}
           <div className="px-6 py-4 border-b border-gray-50 bg-white/50 backdrop-blur-sm flex justify-between items-center z-20">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">HCM Console</span>
             </div>
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
               <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                 {studentId.charAt(0)}
               </div>
               <span className="text-xs font-medium text-gray-600">{studentId}</span>
             </div>
           </div>
           
           {/* File Upload Zone */}
           <div className="p-2">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} accept=".pdf,.csv,.xlsx,.docx"/>
             <div onClick={()=>!currentFile?fileInputRef.current.click():alert("Max files reached")} 
                  className={`mx-4 mt-2 rounded-2xl border border-dashed transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 h-14
                  ${currentFile 
                    ? 'bg-blue-50/50 border-blue-200 text-blue-700' 
                    : 'bg-gray-50/50 border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300'}`}>
                {currentFile ? (
                  <>
                    <File size={16} className="text-blue-500"/> 
                    <span className="text-sm font-medium">{currentFile.name}</span>
                    <button onClick={e=>{e.stopPropagation();setCurrentFile(null)}} className="p-1 hover:bg-blue-100 rounded-full"><X size={14}/></button>
                  </>
                ) : (
                  <span className="text-xs font-medium flex items-center gap-2"><Upload size={14}/> {t('uploadDataset')}</span>
                )}
             </div>
           </div>

           {/* Chat History */}
           <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
             {chatHistory.length===0 && (
               <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-0 animate-in fade-in duration-1000 fill-mode-forwards">
                 <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-2">
                   <Bot size={40} strokeWidth={1} className="text-gray-400"/>
                 </div>
                 <p className="text-sm font-medium text-gray-400">{t('readyForAnalysis')}</p>
               </div>
             )}
             {chatHistory.map((m,i)=><MessageRenderer key={i} msg={m}/>)}
             {loading && (
               <div className="flex gap-2 p-4 items-center text-xs text-gray-400 animate-pulse">
                 <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animation-delay-200"></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animation-delay-400"></div>
                 {t('analyzingData')}
               </div>
             )}
           </div>

           {/* Input Area */}
           <div className="p-4 bg-white border-t border-gray-50">
             <div className="relative group">
               <input 
                 type="text" 
                 className="w-full pl-6 pr-14 py-4 bg-gray-100 rounded-full text-[15px] focus:ring-0 focus:bg-white focus:shadow-lg focus:shadow-blue-500/5 transition-all duration-300 placeholder-gray-400 outline-none font-normal" 
                 placeholder={t('askQuestion')}
                 value={query} 
                 onChange={e=>setQuery(e.target.value)} 
                 onKeyDown={e=>e.key==='Enter'&&handleSend()}
               />
               <button 
                 onClick={handleSend} 
                 disabled={loading||!query.trim()} 
                 className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black transition-all shadow-md hover:shadow-lg transform active:scale-90"
               >
                 <Send size={16} fill="white" />
               </button>
             </div>
             
             {/* FOOTER DISCLAIMERS */}
             <div className="text-center mt-3 space-y-1">
               <div className="text-[10px] text-red-400 font-medium opacity-80 flex items-center justify-center gap-1">
                  <Lock size={10} /> {t('confidentialDisclaimer')}
               </div>
               <div className="text-[10px] text-gray-300 font-medium">
                 {t('aiDisclaimer')}
               </div>
             </div>

           </div>
        </div>

        {/* SIDEBAR (Metrics) - High Complexity Only */}
        {isHighComplexity && (
          <div className="order-3 lg:order-3 lg:col-span-3 bg-black text-gray-400 flex flex-col h-auto lg:h-[calc(100vh-80px)] rounded-3xl p-6 font-mono text-[10px] shadow-2xl shadow-gray-900/20 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50"></div>
            <div className="font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest"><Activity size={14} className="text-blue-500"/> {t('systemMetrics')}</div>
            
            <div className="space-y-6">
              <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                <div className="text-gray-500 mb-1">{t('status')}</div>
                <div className={`text-sm font-bold ${loading ? 'text-yellow-400 animate-pulse' : 'text-emerald-400'}`}>{loading ? t('processing') : t('operational')}</div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between"><span>{t('tokenStream')}</span><span className="text-blue-400">42/s</span></div>
                 <div className="w-full bg-gray-900 h-16 rounded-lg flex items-end gap-[2px] p-1 overflow-hidden opacity-60">
                    {Array.from({length: 20}).map((_,i) => (
                      <div key={i} className="flex-1 bg-blue-500 rounded-t-[1px]" style={{height: `${Math.random()*100}%`, opacity: Math.random()}}></div>
                    ))}
                 </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-800">
                 <div className="flex justify-between"><span>{t('latency')}</span><span>24ms</span></div>
                 <div className="flex justify-between"><span>{t('uptime')}</span><span>99.9%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
