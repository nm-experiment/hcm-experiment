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
  AlertCircle
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  query,
  onSnapshot,
  setDoc
} from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1. CONFIGURATION & CONSTANTS
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
    csvExport: "CSV Export",
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
    csvExport: "CSV Export",
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
    csvExport: "Esporta CSV",
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
// 2. FIREBASE INITIALIZATION
// -----------------------------------------------------------------------------

let db;
let auth;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase Init Failed:", e);
}

// -----------------------------------------------------------------------------
// 3. HELPERS & API
// -----------------------------------------------------------------------------

const getConditionFromId = (studentId) => {
  const id = studentId.trim().toLowerCase();
  if (id.startsWith('a')) return 1; 
  if (id.startsWith('d')) return 2; 
  if (id.startsWith('k')) return 3; 
  if (id.startsWith('t')) return 4; 
  return 1; 
};

const callLLM = async (query, contextFilename, conditionId, params, lang) => {
  const config = LLM_CONFIG.providers[LLM_CONFIG.activeProvider];
  const langMap = { en: "English", de: "German (Deutsch)", it: "Italian" };
  const languageInstruction = `Respond in ${langMap[lang] || "English"}.`;
  
  const systemPrompt = `
    You are a specialized HCM (Human Capital Management) Analytics assistant for a university experiment. ${languageInstruction}
    
    STRICT GUARDRAILS:
    1. You must ONLY answer questions related to Human Resources, Data Analysis, Workforce Planning, Statistics, and the provided dataset.
    2. If the user asks about unrelated topics (e.g., "write a poem", "history of Rome", "coding a game"), politely decline.
    Condition Settings:
    ${conditionId === 3 || conditionId === 4 ? "Direct answer only. No reasoning." : "Explain reasoning clearly."}
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

    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    const data = await response.json();
    
    const confidence = data.confidence_score || (0.85 + (Math.random() * 0.1));

    return {
      answer: data.choices?.[0]?.message?.content || "No response generated.",
      reasoning_trace: conditionId <= 2 ? "Reasoning integrated in response." : null, 
      confidence_score: confidence, 
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
// 4. MAIN APP COMPONENT
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
    if (!db || !auth) {
      setAuthError("Firebase SDK not initialized. Check config.");
      return;
    }
    signInAnonymously(auth)
      .then(() => {
        console.log("Auth Ready");
        setIsAuthReady(true);
        setAuthError(null);
      })
      .catch((e) => {
        console.error("Auth Failed:", e);
        if (e.code === 'auth/configuration-not-found') {
            setAuthError("Authentication not enabled in Firebase Console.");
        }
      });

    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) setIsMaintenanceMode(!!docSnap.data().maintenance_mode);
    }, () => {}); 
    
    return () => unsub();
  }, []);

  // --- SCROLLING ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  // --- STICKY SESSION ---
  useEffect(() => {
    const savedId = localStorage.getItem("hcm_student_id");
    if (savedId) setStudentId(savedId);
  }, []);

  // --- SESSION MANAGEMENT ---
  useEffect(() => {
    if (!isLoggedIn || !db || !isAuthReady) return;
    const startSession = async () => {
      try {
        const sessionRef = await addDoc(collection(db, "sessions"), {
          student_id: studentId,
          condition_id: condition,
          start_time: serverTimestamp(), 
          client_timestamp: Date.now(), // Primary for calc
          last_active: Date.now(),      // Primary for calc
          interaction_count: 0,
          date_str: new Date().toISOString().split('T')[0]
        });
        setSessionId(sessionRef.id);
      } catch(e) { console.error("Session start error:", e); }
    };
    startSession();
  }, [isLoggedIn, isAuthReady]);

  // HEARTBEAT
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionIdRef.current && db) {
        updateDoc(doc(db, "sessions", sessionIdRef.current), { last_active: Date.now() }).catch(()=>{});
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- LOGGING ACTIONS ---
  const logInteraction = async (type, payload) => {
    if (!db || !sessionId) return;
    setInteractionCount(prev => prev + 1);
    try {
      await addDoc(collection(db, `sessions/${sessionId}/logs`), { 
        type, ...payload, timestamp: Date.now() 
      });
      updateDoc(doc(db, "sessions", sessionId), { 
        interaction_count: interactionCount + 1,
        last_active: Date.now()
      });
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

  // --- EXPORT DATA (CRASH PROOF - PRIMITIVE FIRST) ---
  
  const getSafeMillis = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val; // Ideally use client_timestamp
    if (val && typeof val === 'object' && 'seconds' in val) return val.seconds * 1000; // Handle Firestore Timestamp manually
    return 0;
  };

  const exportData = async () => {
    if (!db) return alert("Database not connected");
    console.log("Starting export...");
    
    try {
      const q = query(collection(db, "sessions"));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return alert("No data found.");
      
      const students = {};
      const allDates = new Set();
      
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const sId = data.student_id || "Unknown";
        
        // ROBUST DATE STRING
        // Priority: 1. Saved date_str, 2. client_timestamp, 3. start_time.seconds
        let dateStr = data.date_str;
        if (!dateStr) {
            const ms = data.client_timestamp || (data.start_time?.seconds * 1000);
            if (ms) dateStr = new Date(ms).toISOString().split('T')[0];
            else dateStr = "Unknown-Date";
        }
        
        if (!students[sId]) {
          students[sId] = { condition: data.condition_id, total_duration: 0, total_clicks: 0, total_sessions: 0, dates: {} };
        }
        
        // DURATION CALCULATION (No .toDate() calls)
        const startMs = getSafeMillis(data.client_timestamp) || getSafeMillis(data.start_time);
        const endMs = getSafeMillis(data.last_active);
        
        let duration = 0;
        if (startMs > 0 && endMs > 0 && endMs > startMs) {
           duration = Math.round((endMs - startMs) / 60000);
        }
        
        students[sId].total_duration += duration;
        students[sId].total_clicks += (data.interaction_count || 0);
        students[sId].total_sessions += 1;
        
        allDates.add(dateStr);
        
        if (!students[sId].dates[dateStr]) students[sId].dates[dateStr] = { duration: 0, clicks: 0 };
        students[sId].dates[dateStr].duration += duration;
        students[sId].dates[dateStr].clicks += (data.interaction_count || 0);
      });
      
      const sortedDates = Array.from(allDates).sort();
      let csv = "data:text/csv;charset=utf-8,Student_ID,Condition,Total_Sessions,Total_Active_Mins,Total_Clicks,Avg_Session_Mins";
      sortedDates.forEach(d => { csv += `,${d}_Mins,${d}_Clicks`; });
      csv += "\n";
      
      Object.keys(students).forEach(sId => {
        const s = students[sId];
        const avg = s.total_sessions > 0 ? (s.total_duration / s.total_sessions).toFixed(1) : 0;
        let row = `${sId},${s.condition},${s.total_sessions},${s.total_duration},${s.total_clicks},${avg}`;
        sortedDates.forEach(d => {
          const v = s.dates[d] || { duration: 0, clicks: 0 };
          row += `,${v.duration},${v.clicks}`;
        });
        csv += row + "\n";
      });
      
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", "hcm_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { 
      console.error("Export Crash:", e);
      alert(`Export failed: ${e.message}`); 
    }
  };

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(""); 
    const cleanedId = studentId.trim();
    if (!ID_REGEX.test(cleanedId)) {
      setLoginError(t('formatHint')); 
      return;
    }
    localStorage.setItem("hcm_student_id", cleanedId);
    setCondition(getConditionFromId(cleanedId));
    setIsLoggedIn(true);
  };

  const handleResearcherToggle = (e) => {
    if (e.target.checked) {
      const pwd = prompt("Enter Administrator Password:");
      if (pwd === ADMIN_PASSWORD) setIsResearcherMode(true);
      else alert("Access Denied.");
    } else setIsResearcherMode(false);
  };

  const toggleMaintenanceMode = async () => {
    if (!db || !auth.currentUser) return alert("Not authenticated with DB.");
    try {
      const newState = !isMaintenanceMode;
      await setDoc(doc(db, "settings", "config"), { maintenance_mode: newState }, { merge: true });
    } catch(e) { alert(`Failed: ${e.message}`); }
  };

  const unlockMaintenance = () => {
    const pwd = prompt("Enter Administrator Password to Unlock:");
    if (pwd === ADMIN_PASSWORD) {
      setIsResearcherMode(true); 
      setIsMaintenanceMode(false); 
    } else alert("Access Denied.");
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { type: 'user', text: query };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    logInteraction("PROMPT_SENT", { query, params, has_file: !!currentFile });
    setQuery("");
    
    const start = Date.now();
    const res = await callLLM(userMsg.text, currentFile?.name, condition, params, lang);
    const latency = Date.now() - start;

    setChatHistory(prev => [...prev, { 
      type: 'ai', ...res, 
      system_metrics: { latency_ms: latency, tokens_used: Math.round(res.answer.length/4), model_version: LLM_CONFIG.activeProvider, context_window_usage: "N/A" }
    }]);
    setLastResponseTimestamp(Date.now());
    setLoading(false);
  };

  const validateAndSetFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
       alert("File Type not Supported. Allowed: PDF, DOCX, PPTX, XLSX, CSV"); 
       return;
    }
    if (file.size > 500 * 1024) { 
      alert("File exceeds limit. Only one file with up to two pages is permitted.");
      return;
    }
    setCurrentFile(file);
    logInteraction("FILE_UPLOAD", { name: file.name, size: file.size });
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) validateAndSetFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1) return alert("Only one file is permitted.");
      const f = e.dataTransfer.files[0];
      validateAndSetFile(f);
      e.dataTransfer.clearData();
    }
  };

  const cycleLanguage = () => {
    if (lang === 'en') setLang('de');
    else if (lang === 'de') setLang('it');
    else setLang('en');
  };

  // --- UI COMPONENTS ---
  const LanguageSwitcher = () => {
    let label = "", flag = "";
    if (lang === 'en') { flag = "🇨🇭"; label = "Deutsch"; }
    else if (lang === 'de') { flag = "🇮🇹"; label = "Italiano"; }
    else { flag = "🇬🇧"; label = "English"; }
    return (
      <button onClick={cycleLanguage} className="fixed top-6 right-6 z-50 bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-white hover:scale-105 transition-all duration-300">
        <span className="text-lg">{flag}</span><span>{label}</span>
      </button>
    );
  };

  const MessageRenderer = ({ msg }) => {
    if (msg.type === 'user') return (
      <div className="flex justify-end mb-6 animate-in slide-in-from-bottom-2 duration-500">
        <div className="bg-[#007AFF] text-white px-5 py-3 rounded-[1.3rem] rounded-tr-none max-w-[85%] text-[15px] shadow-md leading-relaxed font-normal">
          {msg.text}
        </div>
      </div>
    );

    const confidence = Math.floor((msg.confidence_score || 0) * 100);
    
    if (isHighComplexity) {
      const [tab, setTab] = useState('summary');
      return (
        <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-gray-50/50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('analysis')}</span>
            {isHighTransparency && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold flex gap-1 items-center"><Activity size={10}/> {t('confidence')}: {confidence}%</span>}
          </div>
          <div className="flex border-b border-gray-100">
            {['Summary','Raw Data'].map(rawT => (
              <button key={rawT} onClick={()=>setTab(rawT.toLowerCase().split(' ')[0])} className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab===rawT.toLowerCase().split(' ')[0]?'text-gray-900 bg-white shadow-sm':'text-gray-400 hover:text-gray-600'}`}>{rawT === 'Summary' ? t('summary') : t('rawData')}</button>
            ))}
          </div>
          <div className="p-6">
            {tab==='summary' && (
              <div className="space-y-4">
                <p className="text-gray-800 text-sm leading-7 font-normal">{msg.answer}</p>
                {isHighTransparency && msg.reasoning_trace && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 mb-3 flex gap-1 uppercase tracking-wider"><Terminal size={10}/> {t('logicFlow')}</h4>
                    <div className="font-mono text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{msg.reasoning_trace}</div>
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
      <div className="mb-8 max-w-3xl mr-auto flex gap-4 items-start animate-in slide-in-from-bottom-2">
        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm"><Brain size={18}/></div>
        <div className="space-y-2 min-w-0 flex-1">
           <div className="bg-[#F2F2F7] text-gray-900 px-5 py-3 rounded-[1.3rem] rounded-tl-none text-[15px] leading-relaxed shadow-sm inline-block">{msg.answer}</div>
           {isHighTransparency && msg.reasoning_trace && (
              <div className="ml-1 mt-2 p-4 bg-white/70 border border-gray-200/50 rounded-2xl text-xs text-gray-500 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 font-semibold mb-2 text-gray-400 text-[10px] uppercase tracking-wider">
                  <Sparkles size={10}/> {t('reasoning')}
                  <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100 text-[9px] ml-auto">{t('confidence')}: {confidence}%</span>
                </div>
                <div className="leading-relaxed opacity-80">{msg.reasoning_trace}</div>
              </div>
           )}
        </div>
      </div>
    );
  };

  // --- SCREENS ---
  if (authError) return (
    <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={48} className="text-red-600 mb-4" />
      <h1 className="text-2xl font-bold text-red-800 mb-2">Config Error</h1>
      <p className="text-red-700 max-w-md mb-6">{authError}</p>
      <div className="bg-white p-6 rounded-xl text-left text-sm"><p className="font-bold">Action:</p>Go to Firebase Console → Build → Authentication → Sign-in method → Enable Anonymous.</div>
      <button onClick={() => window.location.reload()} className="mt-8 text-sm text-red-600 underline">Reload</button>
    </div>
  );

  if (isMaintenanceMode && !isResearcherMode) return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md space-y-8 animate-in fade-in zoom-in">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto text-gray-400"><Sparkles size={32}/></div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('maintenanceTitle')}</h1>
        <p className="text-gray-500">{t('maintenanceText')}</p>
      </div>
      <button onClick={unlockMaintenance} className="absolute bottom-8 right-8 text-gray-300 hover:text-gray-400"><Lock size={16}/></button>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-gray-900 selection:bg-blue-100">
      <LanguageSwitcher />
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl w-full max-w-[24rem] border border-white/50 animate-in fade-in zoom-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white"><Database size={28}/></div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('hcmTitle')}</h1>
          <p className="text-sm text-gray-400 mt-2 font-medium">{t('signInTitle')}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative group">
            <User className="absolute left-4 top-3.5 text-gray-400 transition-colors group-focus-within:text-blue-600" size={18}/>
            <input type="text" value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border ${loginError?'border-red-300 bg-red-50/30':'border-gray-200'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 text-[15px]`} placeholder="e.g. A123456"/>
          </div>
          {loginError ? <div className="flex items-center gap-1.5 text-red-500 text-xs px-2"><AlertTriangle size={12}/>{loginError}</div> : studentId.length>0 && <div className="text-[10px] text-gray-400 px-4 uppercase">{t('formatHint')}</div>}
          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-2xl font-medium text-[15px] flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg"><span className="mt-0.5">{t('enterLab')}</span><ChevronRight size={16}/></button>
          
          <div className="pt-8 border-t border-gray-100 flex flex-col gap-4">
             <label className="flex items-center gap-3 cursor-pointer group justify-center">
                <input type="checkbox" checked={isResearcherMode} onChange={handleResearcherToggle} className="peer sr-only"/>
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-900"></div>
                <span className="text-xs text-gray-400 font-medium group-hover:text-gray-600 transition-colors">{t('researcherMode')}</span>
             </label>
             {isResearcherMode && (
               <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                 <button type="button" onClick={toggleMaintenanceMode} className="text-[10px] py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100">{isMaintenanceMode?<Lock size={10}/>:<Unlock size={10}/>}{isMaintenanceMode?t('locked'):t('unlocked')}</button>
                 <button type="button" onClick={exportData} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:bg-blue-100"><Download size={10}/>{t('csvExport')}</button>
               </div>
             )}
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans text-gray-900 selection:bg-blue-100">
      <LanguageSwitcher />
      {isResearcherMode && (
        <div className="bg-gray-900 text-white/80 py-2 px-6 text-[10px] font-medium flex justify-between items-center backdrop-blur-md sticky top-0 z-50 shadow-lg">
           <span className="flex items-center gap-2"><Terminal size={10}/> {CONDITIONS[condition].name} — {studentId}</span>
           <div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${isMaintenanceMode?"bg-red-500 animate-pulse":"bg-emerald-500"}`}></span>{isMaintenanceMode?"MAINTENANCE":"LIVE"}</div>
        </div>
      )}
      
      <div className={`flex-1 ${isHighComplexity ? 'flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto w-full' : 'flex justify-center p-6'} lg:overflow-hidden`}>
        {isHighComplexity && (
          <div className="order-2 lg:order-1 lg:col-span-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-sm flex flex-col h-auto lg:h-[calc(100vh-80px)] overflow-hidden animate-in slide-in-from-left-4">
             <div className="p-6 border-b border-gray-100/50"><h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Settings size={16} className="text-gray-400"/> {t('configuration')}</h2></div>
             <div className="p-8 space-y-8">
               <div className="space-y-4"><div className="flex justify-between text-xs font-medium text-gray-500"><span>{t('temperature')}</span><span className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded">{params.temperature}</span></div><input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" value={params.temperature} onChange={e=>setParams({...params, temperature: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/></div>
               <div className="space-y-4"><div className="flex justify-between text-xs font-medium text-gray-500"><span>{t('topP')}</span><span className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded">{params.topP}</span></div><input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" value={params.topP} onChange={e=>setParams({...params, topP: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/></div>
             </div>
          </div>
        )}

        <div className={`order-1 lg:order-2 ${isHighComplexity ? 'lg:col-span-6' : 'w-full max-w-4xl'} bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 flex flex-col h-[80vh] lg:h-[calc(100vh-80px)] overflow-hidden border border-gray-100 relative z-10 animate-in zoom-in-95`}>
           <div className="px-6 py-4 border-b border-gray-50 bg-white/80 backdrop-blur-md flex justify-between items-center z-20 sticky top-0">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div><span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">HCM Console</span></div>
             <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100"><div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">{studentId.charAt(0)}</div><span className="text-xs font-medium text-gray-600">{studentId}</span></div>
           </div>
           
           <div className="p-3">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.csv,.xlsx,.docx"/>
             <div onClick={()=>!currentFile?fileInputRef.current.click():alert("Max files reached")} onDragOver={e=>e.preventDefault()} onDrop={handleDrop} className={`mx-4 rounded-2xl border border-dashed transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 h-16 group ${currentFile?'bg-blue-50/50 border-blue-200 text-blue-700':'bg-gray-50/50 border-gray-200 text-gray-400 hover:bg-white hover:border-blue-300 hover:text-blue-500 hover:shadow-md'}`}>
                {currentFile ? <><File size={18} className="text-blue-500"/><span className="text-sm font-medium">{currentFile.name}</span><button onClick={e=>{e.stopPropagation();setCurrentFile(null)}} className="p-1 hover:bg-blue-100 rounded-full"><X size={14}/></button></> : <span className="text-xs font-medium flex items-center gap-2 group-hover:scale-105 transition-transform"><Upload size={16}/> {t('uploadDataset')}</span>}
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 scroll-smooth pb-4">
             {chatHistory.length===0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-0 animate-in fade-in duration-1000 fill-mode-forwards"><div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner"><Bot size={40} strokeWidth={1} className="text-gray-400"/></div><p className="text-sm font-medium text-gray-400">{t('readyForAnalysis')}</p></div>}
             {chatHistory.map((m,i)=><MessageRenderer key={i} msg={m}/>)}
             {loading && <div className="max-w-3xl mr-auto flex gap-4 items-start animate-pulse"><div className="w-8 h-8 rounded-full bg-gray-200"></div><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded-md w-3/4"></div><div className="h-4 bg-gray-200 rounded-md w-1/2"></div></div></div>}
             <div ref={bottomRef} />
           </div>

           <div className="p-6 bg-white border-t border-gray-50 z-20">
             <div className="relative group">
               <input type="text" className="w-full pl-6 pr-16 py-4 bg-gray-100 rounded-full text-[15px] focus:ring-0 focus:bg-white focus:shadow-xl focus:shadow-blue-500/5 transition-all duration-300 placeholder-gray-400 outline-none font-normal" placeholder={t('askQuestion')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
               <button onClick={handleSend} disabled={loading||!query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black transition-all shadow-md hover:shadow-lg transform active:scale-95"><Send size={16} fill="white"/></button>
             </div>
             <div className="text-center mt-4 space-y-2">
               <div className="text-[10px] text-red-400/80 font-medium flex items-center justify-center gap-1.5 bg-red-50 py-1 px-3 rounded-full inline-flex mx-auto"><Lock size={10}/> {t('confidentialDisclaimer')}</div>
               <div className="flex items-center justify-center gap-3 text-[10px] text-gray-300 font-medium tracking-wide"><span className="flex items-center gap-1"><Eye size={10}/> {t('auditDisclaimer')}</span><span>•</span><span>{t('aiDisclaimer')}</span></div>
             </div>
           </div>
        </div>

        {isHighComplexity && (
          <div className="order-3 lg:order-3 lg:col-span-3 bg-[#1c1c1e] text-gray-400 flex flex-col h-auto lg:h-[calc(100vh-80px)] rounded-[2rem] p-8 font-mono text-[10px] shadow-2xl shadow-gray-900/20 overflow-hidden relative animate-in slide-in-from-right-4">
            <div className="font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest opacity-90"><Activity size={14} className="text-blue-500"/> {t('systemMetrics')}</div>
            <div className="space-y-8 relative z-10">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm"><div className="text-gray-500 mb-2 tracking-wider">{t('status')}</div><div className={`text-xs font-bold flex items-center gap-2 ${loading?'text-yellow-400':'text-emerald-400'}`}><span className={`w-2 h-2 rounded-full ${loading?'bg-yellow-400 animate-pulse':'bg-emerald-400'}`}></span>{loading?t('processing'):t('operational')}</div></div>
              <div className="space-y-3"><div className="flex justify-between text-xs"><span className="tracking-wider">{t('tokenStream')}</span><span className="text-blue-400 font-bold">42/s</span></div><div className="w-full bg-black/40 h-24 rounded-xl flex items-end gap-[3px] p-2 overflow-hidden border border-white/5">{Array.from({length: 24}).map((_,i)=><div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-[1px]" style={{height: `${20+Math.random()*80}%`, opacity: 0.4+Math.random()*0.6}}></div>)}</div></div>
              <div className="space-y-3 pt-6 border-t border-white/10"><div className="flex justify-between items-center py-1"><span className="flex items-center gap-2"><Zap size={12} className="text-yellow-500"/> {t('latency')}</span><span className="text-white font-mono">24ms</span></div><div className="flex justify-between items-center py-1"><span className="flex items-center gap-2"><Cpu size={12} className="text-purple-500"/> {t('uptime')}</span><span className="text-white font-mono">99.9%</span></div></div>
            </div>
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
          </div>
        )}
      </div>
    </div>
  );
}
