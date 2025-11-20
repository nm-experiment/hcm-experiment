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
  Cpu,
  Zap,
  Eye,
  Copy,
  XCircle
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs,
  query,
  onSnapshot,
  setDoc
} from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1. CONFIGURATION
// -----------------------------------------------------------------------------

const ADMIN_PASSWORD = "Ug5Bgrb9uU%@k7@pNMSFd1TdvUcyA@";

const firebaseConfig = {
  apiKey: "AIzaSyAa_uOiuWDT2d1N06VK6L-S7B5E-kwp4-s",
  authDomain: "hcm-experiment.firebaseapp.com",
  databaseURL: "https://hcm-experiment-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hcm-experiment",
  storageBucket: "hcm-experiment.firebasestorage.app",
  messagingSenderId: "651308574678",
  appId: "1:651308574678:web:25eabe58aac93a0cf82677",
  measurementId: "G-1HG6SCVNV3"
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

const TRANSLATIONS = {
  en: {
    enterLab: "Enter Lab",
    participantId: "Participant ID",
    formatHint: "Format: Letter + 6 Digits",
    uploadDataset: "Drag file here (Pdf, docx, pptx, xlsx)",
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
    auditDisclaimer: "Session activity logged for research integrity.",
    maintenanceTitle: "Be back soon.",
    maintenanceText: "We are performing scheduled updates to the HCM Data Lab. The experiment will resume shortly.",
    researcherMode: "Researcher Mode",
    locked: "Locked",
    unlocked: "Unlocked",
    generateData: "Generate Data View",
    systemMetrics: "System Metrics",
    analysis: "Analysis",
    summary: "Summary",
    rawData: "Raw Data",
    logicFlow: "Logic Flow",
    reasoning: "Reasoning",
    confidence: "Confidence",
    signInTitle: "Sign in with your Participant ID",
    hcmTitle: "HCM Data Lab"
  },
  de: {
    enterLab: "Labor betreten",
    participantId: "Teilnehmer-ID",
    formatHint: "Format: Buchstabe + 6 Ziffern",
    uploadDataset: "Datei hierher ziehen (Pdf, docx, pptx, xlsx)",
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
    auditDisclaimer: "Sitzungsaktivität wird aus Forschungsgründen protokolliert.",
    maintenanceTitle: "Bald zurück.",
    maintenanceText: "Wir führen geplante Updates am HCM Data Lab durch. Das Experiment wird in Kürze fortgesetzt.",
    researcherMode: "Forschermodus",
    locked: "Gesperrt",
    unlocked: "Entsperrt",
    generateData: "Datenansicht generieren",
    systemMetrics: "Systemmetriken",
    analysis: "Analyse",
    summary: "Zusammenfassung",
    rawData: "Rohdaten",
    logicFlow: "Logikfluss",
    reasoning: "Begründung",
    confidence: "Konfidenz",
    signInTitle: "Melden Sie sich mit Ihrer Teilnehmer-ID an",
    hcmTitle: "HCM Datenlabor"
  },
  it: {
    enterLab: "Entra nel Laboratorio",
    participantId: "ID Partecipante",
    formatHint: "Formato: Lettera + 6 Cifre",
    uploadDataset: "Trascina file qui (Pdf, docx, pptx, xlsx)",
    askQuestion: "Fai una domanda...",
    readyForAnalysis: "Pronto per l'analisi",
    analyzingData: "Analisi dei dati in corso...",
    status: "STATO",
    operational: "OPERATIVO",
    processing: "ELABORAZIONE...",
    tokenStream: "FLUSSO TOKEN",
    latency: "LATENZA",
    uptime: "TEMPO DI ATTIVITÀ",
    configuration: "Configurazione",
    temperature: "Temperatura",
    topP: "Top P",
    aiDisclaimer: "L'IA può commettere errori. Verifica le informazioni importanti.",
    confidentialDisclaimer: "Si prega di non inserire informazioni personali o riservate.",
    auditDisclaimer: "Attività della sessione registrata per ricerca.",
    maintenanceTitle: "Torneremo presto.",
    maintenanceText: "Stiamo eseguendo aggiornamenti programmati al HCM Data Lab. L'esperimento riprenderà a breve.",
    researcherMode: "Modalità Ricercatore",
    locked: "Bloccato",
    unlocked: "Sbloccato",
    generateData: "Genera Vista Dati",
    systemMetrics: "Metriche di Sistema",
    analysis: "Analisi",
    summary: "Riepilogo",
    rawData: "Dati Grezzi",
    logicFlow: "Flusso Logico",
    reasoning: "Ragionamento",
    confidence: "Confidenza",
    signInTitle: "Accedi con il tuo ID Partecipante",
    hcmTitle: "Laboratorio Dati HCM"
  }
};

const CONDITIONS = {
  1: { name: "Alex", type: "Gold Standard", complexity: "LOW", transparency: "HIGH" },
  2: { name: "Danny", type: "Expert Mode", complexity: "HIGH", transparency: "HIGH" },
  3: { name: "Kim", type: "Magic Box", complexity: "LOW", transparency: "LOW" },
  4: { name: "Taylor", type: "Black Box", complexity: "HIGH", transparency: "LOW" }
};

const ID_REGEX = /^[adktADKT]\d{6}$/;
const ALLOWED_EXTENSIONS = ['pdf', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'];

// -----------------------------------------------------------------------------
// 2. INITIALIZATION
// -----------------------------------------------------------------------------
let db;
let auth;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Init Failed", e);
}

const getConditionFromId = (studentId) => {
  const id = studentId.trim().toLowerCase();
  if (id.startsWith('a')) return 1; 
  if (id.startsWith('d')) return 2; 
  if (id.startsWith('k')) return 3; 
  if (id.startsWith('t')) return 4; 
  return 1; 
};

// -----------------------------------------------------------------------------
// 3. API WRAPPER
// -----------------------------------------------------------------------------
const callLLM = async (query, contextFilename, conditionId, params, lang) => {
  const config = LLM_CONFIG.providers[LLM_CONFIG.activeProvider];
  const langMap = { en: "English", de: "German (Deutsch)", it: "Italian" };
  const instruction = `Respond in ${langMap[lang] || "English"}.`;
  
  const systemPrompt = `
    You are an HCM Analytics assistant. ${instruction}
    STRICT: Answer only HR/Data questions. Decline others.
    Condition: ${conditionId === 3 || conditionId === 4 ? "Direct answer, no reasoning." : "Explain reasoning."}
    Context: ${contextFilename || "General Knowledge"}
  `;

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
    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    const confidence = data.confidence_score || (0.85 + (Math.random() * 0.1));
    return {
      answer: data.choices?.[0]?.message?.content || "No response.",
      reasoning_trace: conditionId <= 2 ? "Reasoning included." : null, 
      confidence_score: confidence, 
      raw_data_snippet: { note: "Live Data" }
    };
  } catch (error) {
    return {
      answer: "Connection error.",
      reasoning_trace: `Debug: ${error.message}`,
      confidence_score: 0,
      raw_data_snippet: {}
    };
  }
};

// -----------------------------------------------------------------------------
// 4. APP COMPONENT
// -----------------------------------------------------------------------------

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [loginError, setLoginError] = useState(""); 
  const [condition, setCondition] = useState(1);
  const [isResearcherMode, setIsResearcherMode] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [lang, setLang] = useState('en'); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [exportDataText, setExportDataText] = useState(null); // RAW DATA DISPLAY
  
  const [params, setParams] = useState({ temperature: 0.7, topP: 0.9, contextWindow: 4096 });
  const [currentFile, setCurrentFile] = useState(null);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [lastResponseTimestamp, setLastResponseTimestamp] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);

  const isHighComplexity = [2, 4].includes(condition);
  const isHighTransparency = [1, 2].includes(condition);

  const t = (key) => TRANSLATIONS[lang][key] || key;

  // --- AUTH & INIT ---
  useEffect(() => {
    if (!db || !auth) { setAuthError("Firebase Config Error"); return; }
    signInAnonymously(auth)
      .then(() => { setIsAuthReady(true); setAuthError(null); })
      .catch((e) => {
        if (e.code === 'auth/configuration-not-found') setAuthError("Enable Anonymous Auth in Firebase Console.");
        else setAuthError(e.message);
      });

    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) setIsMaintenanceMode(!!docSnap.data().maintenance_mode);
    }, () => {}); 
    return () => unsub();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, loading]);

  useEffect(() => {
    const savedId = localStorage.getItem("hcm_student_id");
    if (savedId) setStudentId(savedId);
  }, []);

  // --- SESSION MANAGEMENT (SAFE TIMESTAMP) ---
  useEffect(() => {
    if (!isLoggedIn || !db || !isAuthReady) return;
    const now = Date.now(); // Always use numbers!
    const startSession = async () => {
      try {
        const ref = await addDoc(collection(db, "sessions"), {
          student_id: studentId,
          condition_id: condition,
          start_unix: now, 
          last_active_unix: now,
          interaction_count: 0,
          date_str: new Date().toISOString().split('T')[0]
        });
        setSessionId(ref.id);
      } catch(e) { console.error(e); }
    };
    startSession();
  }, [isLoggedIn, isAuthReady]);

  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionIdRef.current && db) {
        updateDoc(doc(db, "sessions", sessionIdRef.current), { last_active_unix: Date.now() }).catch(()=>{});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const logInteraction = async (type, payload) => {
    if (!db || !sessionId) return;
    setInteractionCount(prev => prev + 1);
    try {
      const now = Date.now();
      await addDoc(collection(db, `sessions/${sessionId}/logs`), { type, ...payload, timestamp_unix: now });
      updateDoc(doc(db, "sessions", sessionId), { interaction_count: interactionCount + 1, last_active_unix: now });
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

  // --- THE CAVE-MAN DATA VIEW (SAFE EXPORT) ---
  const generateDataView = async () => {
    if (!db) return;
    try {
      const colRef = collection(db, "sessions");
      const snapshot = await getDocs(colRef);
      
      // CSV HEADER
      let csv = "Session_ID,Student_ID,Condition,Date,Start_Unix,Last_Active_Unix,Duration_Mins,Clicks\n";
      
      // MAP ARRAY DIRECTLY
      const rows = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const sessId = docSnap.id;
        
        const sId = d.student_id || "Unknown";
        const cond = d.condition_id || 0;
        const date = d.date_str || "Unknown";
        const clicks = d.interaction_count || 0;
        
        // Safe primitive math
        const start = typeof d.start_unix === 'number' ? d.start_unix : 0;
        const end = typeof d.last_active_unix === 'number' ? d.last_active_unix : 0;
        
        let duration = 0;
        if (start > 0 && end > start) {
           duration = Math.floor((end - start) / 60000);
        }
        
        return `${sessId},${sId},${cond},${date},${start},${end},${duration},${clicks}`;
      });
      
      csv += rows.join("\n");
      setExportDataText(csv);
    } catch(e) {
      setExportDataText("Error: " + e.toString());
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!ID_REGEX.test(studentId.trim())) {
      setLoginError(t('formatHint'));
      return;
    }
    localStorage.setItem("hcm_student_id", studentId.trim());
    setCondition(getConditionFromId(studentId.trim()));
    setIsLoggedIn(true);
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { type: 'user', text: query };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    logInteraction("PROMPT_SENT", { query });
    setQuery("");
    
    const start = Date.now();
    const res = await callLLM(userMsg.text, currentFile?.name, condition, params, lang);
    const latency = Date.now() - start;

    setChatHistory(prev => [...prev, { 
      type: 'ai', ...res, 
      system_metrics: { latency_ms: latency, tokens_used: 150, model_version: "Llama-4", context_window_usage: "N/A" }
    }]);
    setLastResponseTimestamp(Date.now());
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 500 * 1024) return alert("Max 500KB");
    setCurrentFile(f);
    logInteraction("FILE_UPLOAD", { name: f.name });
  };

  const handleResearcherToggle = (e) => {
    if (e.target.checked) {
      if (prompt("Password:") === ADMIN_PASSWORD) setIsResearcherMode(true);
    } else setIsResearcherMode(false);
  };

  const toggleMaintenance = async () => {
     if(db) await setDoc(doc(db, "settings", "config"), { maintenance_mode: !isMaintenanceMode }, { merge: true });
  };

  // --- RENDERERS ---
  const LanguageSwitcher = () => {
    const labels = { en: "English", de: "Deutsch", it: "Italiano" };
    const flags = { en: "🇬🇧", de: "🇨🇭", it: "🇮🇹" };
    const next = lang === 'en' ? 'de' : lang === 'de' ? 'it' : 'en';
    return (
      <button onClick={() => setLang(next)} className="fixed top-6 right-6 z-50 bg-white/80 px-4 py-2 rounded-full shadow-lg text-sm font-medium hover:scale-105 transition-all">
        <span className="mr-2 text-lg">{flags[next]}</span>{labels[next]}
      </button>
    );
  };

  const MessageRenderer = ({ msg }) => {
    if (msg.type === 'user') return <div className="flex justify-end mb-6"><div className="bg-[#007AFF] text-white px-5 py-3 rounded-[1.3rem] rounded-tr-none max-w-[85%] shadow-md">{msg.text}</div></div>;
    
    const confidence = Math.floor((msg.confidence_score || 0.85) * 100);
    
    if (isHighComplexity) {
      return (
        <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('analysis')}</span>
            {isHighTransparency && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold flex gap-1 items-center"><Activity size={10}/> {t('confidence')}: {confidence}%</span>}
          </div>
          <div className="p-6 space-y-4">
            <p className="text-gray-800 text-sm leading-7">{msg.answer}</p>
            {isHighTransparency && <div className="mt-6 pt-4 border-t border-gray-100"><h4 className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider">{t('logicFlow')}</h4><div className="font-mono text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{msg.reasoning_trace}</div></div>}
          </div>
        </div>
      );
    }
    return (
      <div className="mb-8 max-w-3xl mr-auto flex gap-4 items-start">
        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm"><Brain size={18}/></div>
        <div className="space-y-2 min-w-0 flex-1">
           <div className="bg-[#F2F2F7] text-gray-900 px-5 py-3 rounded-[1.3rem] rounded-tl-none text-[15px] leading-relaxed shadow-sm inline-block">{msg.answer}</div>
           {isHighTransparency && <div className="ml-1 mt-2 p-4 bg-white/70 border border-gray-200/50 rounded-2xl text-xs text-gray-500 shadow-sm"><div className="flex items-center gap-2 font-semibold mb-2 text-gray-400 text-[10px] uppercase tracking-wider"><Sparkles size={10}/> {t('reasoning')}<span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100 text-[9px] ml-auto">{t('confidence')}: {confidence}%</span></div><div>{msg.reasoning_trace}</div></div>}
        </div>
      </div>
    );
  };

  if (authError) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold bg-red-50">{authError}</div>;

  if (isMaintenanceMode && !isResearcherMode) return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center">
       <Sparkles size={48} className="text-gray-400 mb-4"/>
       <h1 className="text-2xl font-bold text-gray-800">{t('maintenanceTitle')}</h1>
       <p className="text-gray-500 max-w-md mt-2">{t('maintenanceText')}</p>
       <button onClick={() => prompt("Pass:") === ADMIN_PASSWORD && setIsResearcherMode(true)} className="absolute bottom-8 right-8 text-gray-300"><Lock size={16}/></button>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-gray-900">
      <LanguageSwitcher />
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl w-full max-w-[24rem] border border-white/50">
        <div className="text-center mb-8"><div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white"><Database size={28}/></div><h1 className="text-2xl font-semibold">{t('hcmTitle')}</h1></div>
        <form onSubmit={handleLogin} className="space-y-6">
           <div className="relative group"><User className="absolute left-4 top-3.5 text-gray-400" size={18}/><input type="text" value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border rounded-2xl outline-none focus:border-blue-500" placeholder="A123456"/></div>
           {loginError && <div className="text-red-500 text-xs px-2">{loginError}</div>}
           <button type="submit" className="w-full bg-black text-white py-3.5 rounded-2xl font-medium flex items-center justify-center gap-2 hover:scale-[0.98] transition-transform">{t('enterLab')}<ChevronRight size={16}/></button>
           <div className="pt-6 border-t border-gray-100">
              <label className="flex items-center justify-center gap-2 text-xs text-gray-400 cursor-pointer"><input type="checkbox" checked={isResearcherMode} onChange={handleResearcherToggle} className="accent-black"/>{t('researcherMode')}</label>
              {isResearcherMode && (
                 <div className="mt-4 space-y-2">
                   <button type="button" onClick={toggleMaintenance} className="w-full py-2 text-[10px] bg-gray-100 rounded-xl text-gray-600">{isMaintenanceMode ? t('locked') : t('unlocked')}</button>
                   <button type="button" onClick={generateDataView} className="w-full py-2 text-[10px] bg-blue-50 text-blue-600 rounded-xl">{t('generateData')}</button>
                 </div>
              )}
           </div>
        </form>
        {exportDataText && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl p-6 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Experiment Data (Copy & Paste to CSV)</h3>
                <button onClick={() => setExportDataText(null)}><XCircle size={24} className="text-gray-400 hover:text-red-500"/></button>
              </div>
              <textarea readOnly value={exportDataText} className="flex-1 w-full font-mono text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 focus:outline-none resize-none"/>
              <div className="mt-4 flex justify-end">
                <button onClick={() => navigator.clipboard.writeText(exportDataText).then(() => alert("Copied!"))} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700"><Copy size={16}/> Copy to Clipboard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans text-gray-900">
      <LanguageSwitcher />
      {isResearcherMode && <div className="bg-gray-900 text-white py-2 px-6 text-[10px] flex justify-between sticky top-0 z-50"><span>{CONDITIONS[condition].name} — {studentId}</span><span>{isMaintenanceMode ? "MAINTENANCE" : "LIVE"}</span></div>}
      <div className={`flex-1 ${isHighComplexity ? 'flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto' : 'flex justify-center p-6'} lg:overflow-hidden`}>
         {isHighComplexity && (
           <div className="order-2 lg:order-1 lg:col-span-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-sm p-8 space-y-8 h-auto lg:h-[calc(100vh-80px)]">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Settings size={16}/> {t('configuration')}</h2>
              <div className="space-y-4"><div className="flex justify-between text-xs text-gray-500"><span>{t('temperature')}</span><span>{params.temperature}</span></div><input type="range" className="w-full accent-black" min="0" max="1" step="0.1" value={params.temperature} onChange={e=>setParams({...params, temperature: parseFloat(e.target.value)})}/></div>
              <div className="space-y-4"><div className="flex justify-between text-xs text-gray-500"><span>{t('topP')}</span><span>{params.topP}</span></div><input type="range" className="w-full accent-black" min="0" max="1" step="0.1" value={params.topP} onChange={e=>setParams({...params, topP: parseFloat(e.target.value)})}/></div>
           </div>
         )}
         
         <div className={`order-1 lg:order-2 ${isHighComplexity ? 'lg:col-span-6' : 'w-full max-w-4xl'} bg-white rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col h-[80vh] lg:h-[calc(100vh-80px)] overflow-hidden relative z-10`}>
            <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-md z-20 sticky top-0">
               <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs font-semibold tracking-wide uppercase text-gray-600">HCM Console</span></div>
               <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100"><span className="text-xs font-medium text-gray-600">{studentId}</span></div>
            </div>
            
            <div className="p-3">
              <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files[0]) { setCurrentFile(e.target.files[0]); logInteraction("FILE", {name: e.target.files[0].name}); } }}/>
              <div onClick={()=>!currentFile && fileInputRef.current.click()} className="mx-4 rounded-2xl border border-dashed h-16 flex items-center justify-center gap-3 cursor-pointer hover:bg-gray-50 border-gray-200 text-gray-400 transition-colors">
                 {currentFile ? <span className="text-sm text-blue-600 font-medium flex items-center gap-2"><File size={16}/> {currentFile.name} <button onClick={e=>{e.stopPropagation();setCurrentFile(null)}}><X size={14} className="text-gray-400 hover:text-red-500"/></button></span> : <span className="text-xs font-medium flex items-center gap-2"><Upload size={16}/> {t('uploadDataset')}</span>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-20">
               {chatHistory.length===0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4"><div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center"><Bot size={40} strokeWidth={1}/></div><p>{t('readyForAnalysis')}</p></div>}
               {chatHistory.map((m,i) => <MessageRenderer key={i} msg={m}/>)}
               {loading && <div className="flex gap-2 p-4 items-center text-xs text-gray-400 animate-pulse">Analyzing...</div>}
               <div ref={bottomRef}/>
            </div>

            <div className="p-6 bg-white border-t border-gray-50 z-20">
               <div className="relative">
                 <input type="text" className="w-full pl-6 pr-14 py-4 bg-gray-100 rounded-full text-[15px] focus:bg-white focus:shadow-xl outline-none transition-all placeholder-gray-400" placeholder={t('askQuestion')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
                 <button onClick={handleSend} disabled={loading||!query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black text-white rounded-full hover:scale-95 transition-transform disabled:opacity-50"><Send size={16} fill="white"/></button>
               </div>
               <div className="text-center mt-4 text-[10px] text-gray-300 flex items-center justify-center gap-2">
                  <span className="flex items-center gap-1 text-red-300"><Lock size={10}/> {t('confidentialDisclaimer')}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye size={10}/> {t('auditDisclaimer')}</span>
               </div>
            </div>
         </div>

         {isHighComplexity && (
           <div className="order-3 lg:order-3 lg:col-span-3 bg-[#1c1c1e] text-gray-400 flex flex-col h-auto lg:h-[calc(100vh-80px)] rounded-[2rem] p-8 font-mono text-[10px] shadow-2xl">
              <div className="font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest opacity-90"><Activity size={14} className="text-blue-500"/> {t('systemMetrics')}</div>
              <div className="space-y-6">
                 <div className="bg-white/5 p-5 rounded-2xl border border-white/10"><div className="text-gray-500 mb-2 tracking-wider">{t('status')}</div><div className={`text-xs font-bold ${loading?'text-yellow-400':'text-emerald-400'}`}>{loading?t('processing'):t('operational')}</div></div>
                 <div className="space-y-3"><div className="flex justify-between"><span>{t('latency')}</span><span className="text-white">24ms</span></div><div className="w-full bg-black/40 h-24 rounded-xl border border-white/5 flex items-end p-2 gap-[2px]">{Array.from({length:24}).map((_,i)=><div key={i} className="flex-1 bg-blue-500/50 rounded-t-[1px]" style={{height:`${Math.random()*100}%`}}></div>)}</div></div>
              </div>
           </div>
         )}
      </div>
    </div>
  );
}
