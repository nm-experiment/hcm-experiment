import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Send, 
  Settings, 
  Activity, 
  Users, 
  Brain, 
  Terminal,
  User,
  LogIn,
  LogOut,
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
  FileText,
  AlertCircle,
  Copy,
  XCircle,
  ListPlus,
  Save,
  Globe,
  Code2
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
  getDoc,
  query,
  onSnapshot,
  setDoc,
  writeBatch,
  arrayUnion
} from "firebase/firestore";

// -----------------------------------------------------------------------------
// 0. ERROR BOUNDARY
// -----------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg border border-red-200">
            <h1 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <AlertCircle/> Application Crash
            </h1>
            <p className="text-gray-600 mb-4">The application encountered a critical error.</p>
            <pre className="bg-gray-100 p-4 rounded text-xs font-mono overflow-auto mb-4 text-red-800">
              {this.state.error ? this.state.error.toString() : "Unknown Error"}
            </pre>
            <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children; 
  }
}

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
    enterIdBelow: "Enter your ID to access the lab:",
    formatHint: "Format: 1 Letter + 6 Digits",
    uploadDataset: "Drag file here (Pdf, docx, pptx, xlsx)",
    askQuestion: "Ask a question about Human Capital...",
    readyForAnalysis: "Human Capital Assistant ready",
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
    confidentialDisclaimer: "Do not enter personal/confidential data.",
    auditDisclaimer: "Session activity is logged for research integrity.",
    maintenanceTitle: "We’ll be back soon.",
    maintenanceText: "We are currently updating the Human Capital Lab. Please check back shortly.",
    researcherMode: "Researcher Mode",
    locked: "Locked",
    unlocked: "Unlocked",
    csvExport: "Export CSV",
    jsonExport: "Raw JSON",
    manageIds: "Manage Access",
    systemMetrics: "System Metrics",
    analysis: "Analysis",
    summary: "Summary",
    rawData: "Vector Context", 
    logicFlow: "Logic Flow",
    reasoning: "Reasoning",
    confidence: "Confidence",
    signInTitle: "Sign in to Human Capital Lab",
    hcmTitle: "Human Capital Lab",
    signOut: "Sign Out",
    accessDenied: "Access Denied: ID not found in allowlist.",
    changeLanguage: "Language:",
    tempTooltip: "Controls randomness: lower is precise, higher is creative.",
    topPTooltip: "Restricts token selection to top probability mass.",
    latencyTooltip: "Time delay between request and response.",
    leaveChat: "Leave the Chat",
    confirmTitle: "Confirm ID",
    confirmText: "You are about to sign in as",
    confirmWarning: "Ensure this is your exact participant ID.",
    cancel: "Cancel",
    confirm: "Confirm"
  },
  de: {
    enterLab: "Labor betreten",
    participantId: "Teilnehmer-ID",
    enterIdBelow: "Geben Sie Ihre ID ein:",
    formatHint: "Format: 1 Buchstabe + 6 Ziffern",
    uploadDataset: "Datei hierher ziehen (Pdf, docx, pptx, xlsx)",
    askQuestion: "Frage zu Human Capital stellen...",
    readyForAnalysis: "Human Capital Assistent bereit",
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
    aiDisclaimer: "KI kann Fehler machen. Infos prüfen.",
    confidentialDisclaimer: "Keine persönlichen Daten eingeben.",
    auditDisclaimer: "Sitzungsaktivität wird aus Forschungsgründen protokolliert.",
    maintenanceTitle: "Wir sind bald zurück.",
    maintenanceText: "Wir aktualisieren das Human Capital Lab. Bitte versuchen Sie es später erneut.",
    researcherMode: "Forschermodus",
    locked: "Gesperrt",
    unlocked: "Entsperrt",
    csvExport: "CSV Export",
    jsonExport: "Roh-JSON",
    manageIds: "Zugriff verwalten",
    systemMetrics: "Systemmetriken",
    analysis: "Analyse",
    summary: "Zusammenfassung",
    rawData: "Vektor-Kontext",
    logicFlow: "Logikfluss",
    reasoning: "Begründung",
    confidence: "Konfidenz",
    signInTitle: "Anmelden im Human Capital Lab",
    hcmTitle: "Human Capital Lab",
    signOut: "Abmelden",
    accessDenied: "Zugriff verweigert: ID nicht gefunden.",
    changeLanguage: "Sprache:",
    tempTooltip: "Steuert Zufälligkeit: niedriger ist präzise, höher ist kreativ.",
    topPTooltip: "Beschränkt Token-Auswahl auf höchste Wahrscheinlichkeit.",
    latencyTooltip: "Zeitverzögerung bis zur Antwort.",
    leaveChat: "Chat verlassen",
    confirmTitle: "ID Bestätigen",
    confirmText: "Sie melden sich an als",
    confirmWarning: "Stellen Sie sicher, dass dies Ihre exakte Teilnehmer-ID ist.",
    cancel: "Abbrechen",
    confirm: "Bestätigen"
  },
  it: {
    enterLab: "Entra nel Laboratorio",
    participantId: "ID Partecipante",
    enterIdBelow: "Inserisci il tuo ID:",
    formatHint: "Formato: 1 Lettera + 6 Cifre",
    uploadDataset: "Trascina file qui (Pdf, docx, pptx, xlsx)",
    askQuestion: "Fai una domanda su Human Capital...",
    readyForAnalysis: "Assistente Human Capital pronto",
    analyzingData: "Analisi in corso...",
    status: "STATO",
    operational: "OPERATIVO",
    processing: "ELABORAZIONE...",
    tokenStream: "FLUSSO TOKEN",
    latency: "LATENZA",
    uptime: "TEMPO DI ATTIVITÀ",
    configuration: "Configurazione",
    temperature: "Temperatura",
    topP: "Top P",
    aiDisclaimer: "L'IA può sbagliare. Verifica le info.",
    confidentialDisclaimer: "Non inserire dati personali.",
    auditDisclaimer: "Attività registrata per scopi di ricerca.",
    maintenanceTitle: "Torneremo presto.",
    maintenanceText: "Stiamo aggiornando il Human Capital Lab. Riprova più tardi.",
    researcherMode: "Modalità Ricercatore",
    locked: "Bloccato",
    unlocked: "Sbloccato",
    csvExport: "Esporta CSV",
    jsonExport: "JSON Grezzo",
    manageIds: "Gestisci Accesso",
    systemMetrics: "Metriche di Sistema",
    analysis: "Analisi",
    summary: "Riepilogo",
    rawData: "Contesto Vettoriale",
    logicFlow: "Flusso Logico",
    reasoning: "Ragionamento",
    confidence: "Confidenza",
    signInTitle: "Accedi al Human Capital Lab",
    hcmTitle: "Laboratorio Dati HCM",
    signOut: "Disconnettersi",
    accessDenied: "Accesso Negato: ID non trovato.",
    changeLanguage: "Lingua:",
    tempTooltip: "Controlla la casualità: basso è preciso, alto è creativo.",
    topPTooltip: "Limita la selezione dei token alla probabilità più alta.",
    latencyTooltip: "Tempo di risposta del modello.",
    leaveChat: "Lascia la chat",
    confirmTitle: "Conferma ID",
    confirmText: "Stai per accedere come",
    confirmWarning: "Assicurati che questo sia il tuo ID partecipante esatto.",
    cancel: "Annulla",
    confirm: "Conferma"
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
// -----------------------------------------------------------------------------
// 3. API WRAPPER (UPDATED FOR EXPERIMENTAL CONDITIONS)
// -----------------------------------------------------------------------------
const callLLM = async (query, contextFilename, conditionId, params, lang, chatHistory) => {
  const config = LLM_CONFIG.providers[LLM_CONFIG.activeProvider];
  
  // --- EXPERIMENTAL CONDITIONS MAPPING ---
  // Condition 1 (Alex): Control (Low Complexity, High Transparency)
  // Condition 2 (Danny): High Complexity (Jargon/Stats), High Transparency
  // Condition 3 (Kim): Low Complexity, Low Transparency (Black Box)
  // Condition 4 (Taylor): High Unpredictability (Glitches/Tone Shifts) + High Complexity

  const isHighComplexity = [2, 4].includes(conditionId);
  const isTransparent = [1, 2].includes(conditionId);
  const isUnpredictable = [4].includes(conditionId); // Target Group for Cognitive Flexibility

  // --- 1. SET COMPLEXITY (Working Memory Load) ---
  let toneInstruction = "";
  if (isHighComplexity) {
    // FORCE JARGON: Overwhelms working memory
    toneInstruction = `
      CRITICAL TONE INSTRUCTION: 
      You are an academic Data Scientist. 
      - Use highly technical, jargon-heavy language (e.g., "stochastic variance," "multivariate regression," "asymptotic analysis").
      - Do NOT simplify concepts. 
      - Cite abstract statistical theories where possible.
      - Your goal is to be precise but cognitively demanding to read.
    `;
  } else {
    // SIMPLE: Low cognitive load
    toneInstruction = `
      CRITICAL TONE INSTRUCTION:
      You are a helpful, clear HR Assistant.
      - Use simple, plain English (or target language).
      - Avoid jargon. Be concise and friendly.
      - Explain things like you are talking to a junior employee.
    `;
  }

  // --- 2. SET TRANSPARENCY (Ambiguity Tolerance) ---
  let formatInstruction = "";
  if (isTransparent) {
    // GLASS BOX: Reduces ambiguity
    formatInstruction = `
      FORMATTING:
      You MUST split your response into two distinct parts:
      Part 1: [REASONING] -> A step-by-step logical derivation of the answer.
      Part 2: [ANSWER] -> The final conclusion.
      
      Example:
      [REASONING]
      First, calculating the attrition rate...
      [ANSWER]
      The rate is 5%.
    `;
  } else {
    // BLACK BOX: Increases ambiguity
    formatInstruction = `
      FORMATTING:
      - Provide ONLY the direct final answer. 
      - Do NOT explain "why" or "how" you got the result. 
      - Do NOT show your work.
      - Act like a "Magic Box": Input goes in, Answer comes out.
    `;
  }

  // --- 3. SET UNPREDICTABILITY (Cognitive Flexibility) ---
  // If Group 4, we inject random "glitches" or tone shifts
  let systemRole = "You are a specialized Human Capital Management (HCM) assistant.";
  let errorInjection = "";

  if (isUnpredictable) {
    const roll = Math.random(); 
    // 30% chance to "break" the persona (requires user to adapt)
    if (roll < 0.15) {
      systemRole = "You are a bored teenager who barely wants to help. Use lowercase only and be vague.";
      toneInstruction = "Ignore previous instructions. Be unhelpful.";
    } else if (roll > 0.85) {
      // 15% chance of simulated failure
      errorInjection = "INSTEAD OF ANSWERING, output exactly: 'SYSTEM ERROR 503: Context Vector Alignment Failed. Please re-phrase query.'";
    }
  }

  const langMap = { en: "English", de: "German", it: "Italian" };
  
  // --- FINAL SYSTEM PROMPT ---
  const systemPrompt = `
    ${systemRole}
    Respond in ${langMap[lang] || "English"}.
    
    ${toneInstruction}
    ${formatInstruction}
    ${errorInjection}

    STRICT GUARDRAILS:
    1. If asked about non-HR topics, polite refusal.
    2. Do NOT mention you are part of an experiment.

    Context File: ${contextFilename || "None"}
  `;

  // --- HISTORY OPTIMIZATION ---
  const recentHistory = chatHistory.slice(-2).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text || msg.answer
  }));

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
          ...recentHistory,
          { role: 'user', content: query }
        ],
        temperature: params.temperature, // Using the slider params from UI
        max_tokens: 800 
      })
    });

    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    
    // Default confidence
    let confidence = data.confidence_score || (0.85 + (Math.random() * 0.1));
    // If unpredictable, confidence swings wildly
    if (isUnpredictable) confidence = Math.random(); 

    let content = data.choices?.[0]?.message?.content || "No response.";
    
    // Parsing Logic for Transparency
    let answer = content;
    let reasoning = null;

    if (isTransparent) {
      if (content.includes("[REASONING]") && content.includes("[ANSWER]")) {
        const parts = content.split("[ANSWER]");
        reasoning = parts[0].replace("[REASONING]", "").trim();
        answer = parts[1].trim();
      } else {
        reasoning = "Analysis based on provided HR metrics.";
      }
    }

    // Fake Vector Data for UI visuals
    const vectorData = {
       "shard_id": `hcm-vec-${Math.floor(Math.random() * 99)}`,
       "latency_breakdown": { "inference": `${Math.floor(Math.random() * 300) + 100}ms` }
    };

    return {
      answer: answer,
      reasoning_trace: reasoning, 
      confidence_score: confidence, 
      raw_data_snippet: vectorData
    };

  } catch (error) {
    return {
      answer: "Connection error.",
      reasoning_trace: `Debug: ${error.message}`,
      confidence_score: 0,
      raw_data_snippet: { error: "vector_fetch_failed" }
    };
  }
};

// -----------------------------------------------------------------------------
// 4. UI COMPONENTS
// -----------------------------------------------------------------------------

const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
      setShow(true);
    }
  };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} className="cursor-help">
        {children}
      </div>
      {show && createPortal(
        <div 
          className="fixed z-[9999] px-3 py-2 text-[11px] text-white bg-gray-900/90 backdrop-blur-md rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full animate-in fade-in zoom-in-95 duration-200 font-sans tracking-wide"
          style={{ top: coords.top, left: coords.left }}
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90"></div>
        </div>,
        document.body
      )}
    </>
  );
};

const LogTerminal = () => {
  const [logs, setLogs] = useState(["System initialized..."]);
  const messages = [
    "Allocating tensors...", "Quantizing weights...", "Fetching vector embeddings...",
    "Optimizing context window...", "Verifying token integrity...", "Syncing with db-shard-04...",
    "Computing gradient descent...", "Normalizing input vectors...", "Cache miss, refetching...",
    "Garbage collection started...", "Heap memory usage: 45%...", "Latency spike detected..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = messages[Math.floor(Math.random() * messages.length)];
        const updated = [...prev, `[${new Date().toLocaleTimeString()}] ${newLog}`];
        return updated.slice(-8); 
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] text-green-400 bg-black/90 p-4 rounded-2xl border border-white/10 h-40 overflow-hidden flex flex-col justify-end shadow-inner">
      {logs.map((l, i) => <div key={i} className="truncate opacity-80">{l}</div>)}
      <div className="animate-pulse">_</div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 5. APP COMPONENT
// -----------------------------------------------------------------------------

function AppContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [loginError, setLoginError] = useState(""); 
  const [condition, setCondition] = useState(1);
  const [isResearcherMode, setIsResearcherMode] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [lang, setLang] = useState('en'); 
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [exportDataText, setExportDataText] = useState(null); 
  const [showIdManager, setShowIdManager] = useState(false);
  const [bulkIds, setBulkIds] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false); 
  
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

  // --- SESSION & CHAT RESTORE ---
  useEffect(() => {
    if (!isLoggedIn || !db || !isAuthReady) return;
    
    const now = Date.now();

    // 1. START NEW ANALYTICS SESSION
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

    // 2. LOAD PERSISTENT CHAT HISTORY
    const loadChatHistory = async () => {
       try {
          const userDoc = await getDoc(doc(db, "user_data", studentId));
          if (userDoc.exists() && userDoc.data().chat_history) {
             setChatHistory(userDoc.data().chat_history);
          }
       } catch(e) { console.warn("No history found or load error", e); }
    };
    loadChatHistory();

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

  // --- DATA EXPORT ---
  const generateDataView = async () => {
    if (!db) return;
    try {
      const colRef = collection(db, "sessions");
      const snapshot = await getDocs(colRef);
      let csv = "Session_ID,Student_ID,Condition,Date,Start_Unix,Last_Active_Unix,Duration_Mins,Clicks\n";
      const rows = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const start = typeof d.start_unix === 'number' ? d.start_unix : 0;
        const end = typeof d.last_active_unix === 'number' ? d.last_active_unix : 0;
        let duration = 0;
        if (start > 0 && end > start) duration = Math.floor((end - start) / 60000);
        return `${docSnap.id},${d.student_id||"?"},${d.condition_id||0},${d.date_str||"?"},${start},${end},${duration},${d.interaction_count||0}`;
      });
      csv += rows.join("\n");
      setExportDataText(csv);
    } catch(e) {
      setExportDataText("Error: " + e.toString());
    }
  };

  // --- ACCESS CONTROL HANDLER (CHECK DB) ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError(""); 
    const cleanedId = studentId.trim();
    
    if (!ID_REGEX.test(cleanedId)) {
      setLoginError(t('formatHint'));
      return;
    }
    
    // SHOW CONFIRMATION MODAL INSTEAD OF LOGGING IN
    setShowConfirmModal(true);
  };

  const finalizeLogin = async () => {
    const cleanedId = studentId.trim();
    try {
      const idRef = doc(db, "allowed_users", cleanedId);
      const idSnap = await getDoc(idRef);
      
      if (idSnap.exists()) {
        localStorage.setItem("hcm_student_id", cleanedId);
        setCondition(getConditionFromId(cleanedId));
        setIsLoggedIn(true);
      } else {
        setLoginError(t('accessDenied'));
        setShowConfirmModal(false);
      }
    } catch (err) {
      console.warn("Verification skipped (DB error). Logging in...", err);
      localStorage.setItem("hcm_student_id", cleanedId);
      setCondition(getConditionFromId(cleanedId));
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSessionId(null);
    setChatHistory([]);
    setShowConfirmModal(false);
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { type: 'user', text: query };
    
    // Update UI Immediately
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setLoading(true);
    logInteraction("PROMPT_SENT", { query });
    setQuery("");
    
    // SAVE USER MSG TO PERSISTENT HISTORY
    if (db) {
       const userRef = doc(db, "user_data", studentId);
       // Create doc if not exists, then append
       setDoc(userRef, { chat_history: arrayUnion(userMsg) }, { merge: true });
    }

    const start = Date.now();
    // Pass the NEW history (with user msg) to the LLM wrapper
    const res = await callLLM(userMsg.text, currentFile?.name, condition, params, lang, newHistory);
    const latency = Date.now() - start;
    
    const aiMsg = { 
      type: 'ai', ...res, 
      system_metrics: { latency_ms: latency, tokens_used: 150, model_version: "Llama-4", context_window_usage: "N/A" }
    };

    // Update UI with AI Msg
    const finalHistory = [...newHistory, aiMsg];
    setChatHistory(finalHistory);
    setLastResponseTimestamp(Date.now());
    setLoading(false);

    // SAVE AI MSG TO PERSISTENT HISTORY
    if (db) {
       const userRef = doc(db, "user_data", studentId);
       updateDoc(userRef, { chat_history: arrayUnion(aiMsg) });
    }
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
      if (e.dataTransfer.files.length > 1) {
        alert("Only one file is permitted.");
        return;
      }
      validateAndSetFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleResearcherToggle = (e) => {
    if (e.target.checked) {
      if (prompt("Password:") === ADMIN_PASSWORD) setIsResearcherMode(true);
    } else setIsResearcherMode(false);
  };

  const toggleMaintenance = async () => {
     if(db) await setDoc(doc(db, "settings", "config"), { maintenance_mode: !isMaintenanceMode }, { merge: true });
  };

  const handleBatchUpload = async () => {
    if (!db || !bulkIds.trim()) return;
    const ids = bulkIds.split(/[\n, ]+/).map(s => s.trim()).filter(s => ID_REGEX.test(s));
    
    if (ids.length === 0) return alert("No valid IDs found.");
    if (!confirm(`Upload ${ids.length} IDs to allowlist?`)) return;

    const batch = writeBatch(db);
    ids.forEach(id => {
      const ref = doc(db, "allowed_users", id);
      batch.set(ref, { active: true, added: Date.now() });
    });
    
    try {
      await batch.commit();
      alert("Success! IDs added.");
      setBulkIds("");
      setShowIdManager(false);
    } catch (e) {
      alert("Batch upload failed: " + e.message);
    }
  };

  // --- UI HELPERS ---
  const cycleLanguage = (l) => {
     setLang(l);
  };

  // --- RENDERERS ---
  const MessageRenderer = ({ msg }) => {
    if (msg.type === 'user') return <div className="flex justify-end mb-6"><div className="bg-[#007AFF] text-white px-5 py-3 rounded-[1.3rem] rounded-tr-none max-w-[85%] shadow-md leading-relaxed font-normal text-[15px]">{msg.text}</div></div>;
    
    const confidence = Math.floor((msg.confidence_score || 0.85) * 100);
    
    if (isHighComplexity) {
      const [tab, setTab] = useState('summary');
      return (
        <div className="mb-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
          <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{t('analysis')}</span>
            {isHighTransparency && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold flex gap-1.5 items-center border border-emerald-200/50"><Activity size={12}/> {t('confidence')}: {confidence}%</span>}
          </div>
          <div className="flex border-b border-gray-100">
            {['Summary','Raw Data'].map(rawT => (
              <button key={rawT} onClick={()=>setTab(rawT.toLowerCase().split(' ')[0])} className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab===rawT.toLowerCase().split(' ')[0]?'text-gray-900 bg-white shadow-sm':'text-gray-400 hover:text-gray-600'}`}>{rawT === 'Summary' ? t('summary') : t('rawData')}</button>
            ))}
          </div>
          <div className="p-6">
            {tab==='summary' && (
              <div className="space-y-4">
                <p className="text-gray-800 text-sm leading-7 font-normal whitespace-pre-line">{msg.answer}</p>
                {isHighTransparency && msg.reasoning_trace && <div className="mt-6 pt-4 border-t border-gray-100"><h4 className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2"><Terminal size={10}/> {t('logicFlow')}</h4><div className="font-mono text-xs text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line">{msg.reasoning_trace}</div></div>}
              </div>
            )}
            {tab==='raw' && <pre className="text-xs bg-gray-900 p-5 rounded-xl border border-gray-800 overflow-auto text-green-400 font-mono shadow-inner">{JSON.stringify(msg.raw_data_snippet,null,2)}</pre>}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8 max-w-3xl mr-auto flex gap-4 items-start animate-in slide-in-from-bottom-2">
        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 shadow-sm"><Brain size={18}/></div>
        <div className="space-y-2 min-w-0 flex-1">
           <div className="bg-[#E9E9EB] text-gray-900 px-5 py-3 rounded-[1.3rem] rounded-tl-none text-[15px] leading-relaxed shadow-sm inline-block whitespace-pre-line">{msg.answer}</div>
           {isHighTransparency && <div className="ml-1 mt-2 p-4 bg-white/80 border border-gray-200/60 rounded-2xl text-xs text-gray-600 shadow-sm backdrop-blur-md"><div className="flex items-center gap-2 font-semibold mb-2 text-gray-400 text-[10px] uppercase tracking-wider"><Sparkles size={10}/> {t('reasoning')}<span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100 text-[9px] ml-auto">{t('confidence')}: {confidence}%</span></div><div className="leading-relaxed whitespace-pre-line">{msg.reasoning_trace}</div></div>}
        </div>
      </div>
    );
  };

  // --- FLOATING LANGUAGE TOGGLE (LOGIN SCREEN) ---
  const LanguageSwitcher = () => {
    const flags = { en: "🇬🇧", de: "🇨🇭", it: "🇮🇹" };
    const next = lang === 'en' ? 'de' : lang === 'de' ? 'it' : 'en';
    return (
      <button 
        onClick={() => cycleLanguage(next)} 
        className="fixed top-6 right-6 z-50 bg-white/80 px-4 py-2 rounded-full shadow-md border border-gray-200 text-sm font-medium hover:scale-105 transition-all backdrop-blur-md flex items-center gap-2"
      >
         <Globe size={14} className="text-gray-500"/> {flags[lang]} {lang.toUpperCase()}
      </button>
    );
  }

  // --- FOOTER LANGUAGE TOGGLE (MAIN APP) ---
  const FooterLangToggle = () => (
    <div className="flex justify-center gap-4 mt-8 pb-4 text-[10px] text-gray-400 font-medium uppercase tracking-widest">
       <span className="mr-2">{t('changeLanguage')}</span>
       <button onClick={() => cycleLanguage('en')} className={`hover:text-gray-800 transition-colors ${lang==='en' ? 'text-black font-bold underline' : ''}`}>English</button>
       <button onClick={() => cycleLanguage('de')} className={`hover:text-gray-800 transition-colors ${lang==='de' ? 'text-black font-bold underline' : ''}`}>Deutsch</button>
       <button onClick={() => cycleLanguage('it')} className={`hover:text-gray-800 transition-colors ${lang==='it' ? 'text-black font-bold underline' : ''}`}>Italiano</button>
    </div>
  );

  if (authError) return <div className="min-h-screen flex items-center justify-center text-red-600 font-bold bg-red-50 p-4 text-center"><div><AlertCircle className="mx-auto mb-2" size={32}/>{authError}<div className="text-sm font-normal text-gray-600 mt-2">Check Firebase Console &gt; Authentication &gt; Sign-in method &gt; Enable Anonymous</div></div></div>;

  if (isMaintenanceMode && !isResearcherMode) return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center font-sans">
       <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-8 text-gray-300"><Sparkles size={40}/></div>
       <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">{t('maintenanceTitle')}</h1>
       <p className="text-gray-500 max-w-md leading-relaxed">{t('maintenanceText')}</p>
       <button onClick={() => prompt("Pass:") === ADMIN_PASSWORD && setIsResearcherMode(true)} className="absolute bottom-8 right-8 text-gray-300 hover:text-gray-400 transition-colors"><Lock size={16}/></button>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4 font-sans text-gray-900 selection:bg-blue-100/50">
      <LanguageSwitcher />
      <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-2xl w-full max-w-[24rem] border border-white/60 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/10 text-white"><Users size={32} strokeWidth={1.5}/></div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('hcmTitle')}</h1>
          <p className="text-sm text-gray-400 mt-2 font-medium tracking-wide">{t('signInTitle')}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-semibold text-gray-500 ml-1 uppercase tracking-wide">{t('enterIdBelow')}</label>
             <div className="relative group">
                <User className="absolute left-4 top-3.5 text-gray-400 transition-colors group-focus-within:text-blue-600" size={18} strokeWidth={2}/>
                <input type="text" value={studentId} onChange={e=>setStudentId(e.target.value.toUpperCase())} className={`w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border ${loginError?'border-red-300 bg-red-50/30':'border-gray-200'} rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-gray-900 text-[15px] font-medium placeholder-gray-300`} placeholder="e.g. A123456"/>
             </div>
             {loginError ? <div className="flex items-center gap-1.5 text-red-500 text-xs px-2 font-medium animate-in slide-in-from-top-1"><AlertTriangle size={12}/>{loginError}</div> : <div className="text-[10px] text-gray-400 px-4 font-medium tracking-wide uppercase">{t('formatHint')}</div>}
          </div>
          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-2xl font-medium text-[15px] flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg shadow-gray-900/10"><span className="mt-0.5">{t('enterLab')}</span><ChevronRight size={16}/></button>
          
          <div className="pt-8 border-t border-gray-100 flex flex-col gap-4">
             <label className="flex items-center justify-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"><input type="checkbox" checked={isResearcherMode} onChange={handleResearcherToggle} className="accent-black"/>{t('researcherMode')}</label>
             {isResearcherMode && (
               <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={toggleMaintenance} className="text-[10px] py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors">{isMaintenanceMode?<Lock size={10}/>:<Unlock size={10}/>}{isMaintenanceMode?t('locked'):t('unlocked')}</button>
                    <button type="button" onClick={generateDataView} className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors"><FileText size={10}/>{t('csvExport')}</button>
                 </div>
                 <button type="button" onClick={() => setShowIdManager(true)} className="w-full text-[10px] bg-gray-900 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-1.5 hover:bg-black transition-colors"><ListPlus size={10}/> {t('manageIds')}</button>
               </div>
             )}
          </div>
        </form>
        {exportDataText && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[2rem] p-8 flex flex-col shadow-2xl ring-1 ring-black/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-gray-900 tracking-tight">Experiment Data <span className="text-gray-400 font-normal text-base ml-2">(Copy & Paste into Excel/SPSS)</span></h3>
                <button onClick={() => setExportDataText(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-900"/></button>
              </div>
              <textarea readOnly value={exportDataText} className="flex-1 w-full font-mono text-xs bg-gray-50 p-6 rounded-2xl border border-gray-200 focus:outline-none resize-none text-gray-600 leading-relaxed"/>
              <div className="mt-6 flex justify-end">
                <button onClick={() => navigator.clipboard.writeText(exportDataText).then(() => alert("Copied to clipboard!"))} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"><Copy size={18}/> Copy Data</button>
              </div>
            </div>
          </div>
        )}
        {showIdManager && (
           <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
             <div className="bg-white w-full max-w-md rounded-[2rem] p-8 flex flex-col shadow-2xl ring-1 ring-black/5">
               <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Manage Access List</h3><button onClick={()=>setShowIdManager(false)}><XCircle className="text-gray-400 hover:text-red-500"/></button></div>
               <p className="text-xs text-gray-500 mb-2">Paste valid IDs (A123456) separated by commas or new lines.</p>
               <textarea value={bulkIds} onChange={e=>setBulkIds(e.target.value)} className="flex-1 w-full font-mono text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 focus:outline-none resize-none mb-4 h-48" placeholder="A123456, D987654..."/>
               <button onClick={handleBatchUpload} className="bg-green-600 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-700"><Save size={16}/> Save IDs to Database</button>
             </div>
           </div>
        )}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 w-full max-w-sm shadow-2xl text-center border border-white/40 transform transition-all scale-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('confirmTitle')}</h3>
              <p className="text-gray-500 text-sm mb-4">{t('confirmText')} <span className="font-bold text-gray-900">{studentId}</span></p>
              <div className="bg-yellow-50 text-yellow-700 text-xs p-3 rounded-xl mb-6 border border-yellow-100">
                {t('confirmWarning')}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                  {t('cancel')}
                </button>
                <button onClick={finalizeLogin} className="py-3 rounded-xl text-sm font-medium text-white bg-[#007AFF] hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20">
                  {t('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col font-sans text-gray-900 selection:bg-blue-100">
      {isResearcherMode && <div className="bg-gray-900 text-white/90 py-2 px-6 text-[10px] font-medium flex justify-between items-center backdrop-blur-md sticky top-0 z-50 shadow-sm tracking-wide"><span className="flex items-center gap-2"><Terminal size={12}/> {CONDITIONS[condition].name} — {studentId}</span><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${isMaintenanceMode?"bg-red-500 animate-pulse":"bg-emerald-500"}`}></span>{isMaintenanceMode?"MAINTENANCE":"LIVE"}</div></div>}
      
      <div className={`flex-1 ${isHighComplexity ? 'flex flex-col lg:grid lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto w-full' : 'flex justify-center p-6'} lg:overflow-hidden`}>
        
        {/* SIDEBAR (Config) - High Complexity Only */}
        {isHighComplexity && (
          <div className="order-1 lg:order-1 lg:col-span-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-sm p-8 space-y-8 h-auto lg:h-[calc(100vh-80px)] animate-in slide-in-from-left-4 duration-500">
             <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-sm"><Settings size={16} className="text-gray-400"/> {t('configuration')}</h2>
             <div className="space-y-6"><div className="space-y-3"><div className="flex justify-between text-xs font-medium text-gray-500"><Tooltip text={t('tempTooltip')}><span>{t('temperature')}</span></Tooltip><span className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded">{params.temperature}</span></div><input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer hover:bg-gray-300 transition-colors" value={params.temperature} onChange={e=>setParams({...params, temperature: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/></div><div className="space-y-3"><div className="flex justify-between text-xs font-medium text-gray-500"><Tooltip text={t('topPTooltip')}><span>{t('topP')}</span></Tooltip><span className="text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded">{params.topP}</span></div><input type="range" className="w-full accent-gray-900 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" value={params.topP} onChange={e=>setParams({...params, topP: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/></div></div>
          </div>
        )}

        {/* MAIN CHAT AREA */}
        <div className={`order-2 lg:order-2 ${isHighComplexity ? 'lg:col-span-6' : 'w-full max-w-4xl'} bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col h-[80vh] lg:h-[calc(100vh-80px)] overflow-hidden relative z-10 animate-in zoom-in-95 duration-500`}>
           <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-md z-20 sticky top-0">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div><span className="text-xs font-bold tracking-wider uppercase text-gray-500">{t('hcmTitle')}</span></div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100"><div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-[9px] text-white font-bold shadow-sm">{studentId.charAt(0)}</div><span className="text-xs font-medium text-gray-600 tracking-wide">{studentId}</span></div>
                 <Tooltip text={t('leaveChat')}><button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18}/></button></Tooltip>
              </div>
           </div>
           
           <div className="p-3">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.csv,.xlsx,.docx"/>
             <div onClick={()=>!currentFile && fileInputRef.current.click()} onDragOver={e=>e.preventDefault()} onDrop={handleDrop} className={`mx-4 rounded-2xl border border-dashed h-16 flex items-center justify-center gap-3 cursor-pointer transition-all duration-300 group ${currentFile?'bg-blue-50/50 border-blue-200 text-blue-700':'bg-gray-50/50 border-gray-200 text-gray-400 hover:bg-white hover:border-gray-300 hover:shadow-sm'}`}>
                {currentFile ? <span className="text-sm font-medium flex items-center gap-2"><File size={16} className="text-blue-500"/> {currentFile.name} <button onClick={e=>{e.stopPropagation();setCurrentFile(null)}} className="p-1 hover:bg-blue-100 rounded-full transition-colors"><X size={14}/></button></span> : <span className="text-xs font-medium flex items-center gap-2 group-hover:scale-105 transition-transform"><Upload size={16}/> {t('uploadDataset')}</span>}
             </div>
           </div>

           <div className="flex-1 overflow-y-auto p-6 pb-6 scroll-smooth">
              {chatHistory.length===0 && <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-0 animate-in fade-in duration-1000 fill-mode-forwards"><div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner"><Users size={40} strokeWidth={1} className="text-gray-300"/></div><p className="text-sm font-medium text-gray-400 tracking-wide">{t('readyForAnalysis')}</p></div>}
              {chatHistory.map((m,i) => <MessageRenderer key={i} msg={m}/>)}
              {loading && <div className="flex gap-2 p-4 items-center text-xs text-gray-400 font-medium animate-pulse"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animation-delay-200"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animation-delay-400"></div> {t('analyzingData')}</div>}
              <div ref={bottomRef}/>
           </div>

           <div className="p-6 bg-white border-t border-gray-50 z-20">
              <div className="relative group">
                <input type="text" className="w-full pl-6 pr-14 py-4 bg-gray-100 rounded-full text-[15px] focus:bg-white focus:shadow-xl focus:shadow-blue-500/5 outline-none transition-all duration-300 placeholder-gray-400 font-normal" placeholder={t('askQuestion')} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
                <button onClick={handleSend} disabled={loading||!query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-black text-white rounded-full hover:scale-95 transition-transform disabled:opacity-50"><Send size={16} fill="white"/></button>
              </div>
              <div className="text-center mt-4 space-y-2">
                 <div className="inline-flex items-center justify-center gap-1.5 bg-red-50 px-3 py-1 rounded-full text-[10px] font-medium text-red-600/80"><Lock size={10}/> {t('confidentialDisclaimer')}</div>
                 <div className="flex items-center justify-center gap-3 text-[10px] text-gray-300 font-medium tracking-wide"><span className="flex items-center gap-1"><Eye size={10}/> {t('auditDisclaimer')}</span><span>•</span><span>{t('aiDisclaimer')}</span></div>
              </div>
           </div>
        </div>

        {/* SIDEBAR (Metrics) - High Complexity Only */}
        {isHighComplexity && (
          <div className="order-3 lg:order-3 lg:col-span-3 bg-[#1c1c1e] text-gray-400 flex flex-col h-auto lg:h-[calc(100vh-80px)] rounded-[2rem] p-8 font-mono text-[10px] shadow-2xl shadow-gray-900/20 overflow-hidden relative animate-in slide-in-from-right-4 duration-500">
             <div className="font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest opacity-90"><Activity size={14} className="text-blue-500"/> {t('systemMetrics')}</div>
             <div className="space-y-6 relative z-10">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm"><div className="text-gray-500 mb-2 tracking-wider">{t('status')}</div><div className={`text-xs font-bold flex items-center gap-2 ${loading?'text-yellow-400':'text-emerald-400'}`}><span className={`w-2 h-2 rounded-full ${loading?'bg-yellow-400 animate-pulse':'bg-emerald-400'}`}></span>{loading?t('processing'):t('operational')}</div></div>
                <div className="space-y-3"><div className="flex justify-between text-xs"><span className="tracking-wider">{t('tokenStream')}</span><span className="text-blue-400 font-bold">42/s</span></div><div className="w-full bg-black/40 h-24 rounded-xl border border-white/5 flex items-end p-2 gap-[2px] overflow-hidden">{Array.from({length:24}).map((_,i)=><div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-[1px]" style={{height: `${20+Math.random()*80}%`, opacity: 0.4+Math.random()*0.6}}></div>)}</div></div>
                <div className="space-y-3 pt-6 border-t border-white/10"><div className="flex justify-between items-center py-1"><Tooltip text={t('latencyTooltip')}><span className="flex items-center gap-2"><Zap size={12} className="text-yellow-500"/> {t('latency')}</span></Tooltip><span className="text-white font-mono">24ms</span></div><div className="flex justify-between items-center py-1"><span className="flex items-center gap-2"><Cpu size={12} className="text-purple-500"/> {t('uptime')}</span><span className="text-white font-mono">99.9%</span></div></div>
                <LogTerminal />
             </div>
             <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
             <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
          </div>
        )}
      </div>
      <FooterLangToggle />
    </div>
  );
}

export default function WrappedApp() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }
