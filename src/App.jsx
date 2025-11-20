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
  Download
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
  orderBy
} from "firebase/firestore";

// -----------------------------------------------------------------------------
// 1. CONFIGURATION AREA
// -----------------------------------------------------------------------------

/**
 * FIREBASE CONFIGURATION
 * Instructions: Paste your keys from the Firebase Console here.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAa_uOiuWDT2d1N06VK6L-S7B5E-kwp4-s",
  authDomain: "hcm-experiment.firebaseapp.com",
  projectId: "hcm-experiment",
  storageBucket: "hcm-experiment.firebasestorage.app",
  messagingSenderId: "651308574678",
  appId: "1:651308574678:web:25eabe58aac93a0cf82677"
};

/**
 * LLM API CONFIGURATION
 * To switch providers: Change 'activeProvider' to 'deepseek' and fill in details.
 */
const LLM_CONFIG = {
  activeProvider: "alpine", // Options: "alpine", "deepseek"
  
  providers: {
    alpine: {
      url: "https://api.prod.alpineai.ch/v1/chat/completions",
      apiKey: "e0d4c9da-4186-4b30-9e22-c3d8bcff3373", // Hardcoded for stability
      model: "alpineai/Llama-4"
    },
    deepseek: {
      url: "https://api.deepseek.com/v1/chat/completions", // Example URL
      apiKey: "YOUR_DEEPSEEK_KEY", 
      model: "deepseek-chat"
    }
  }
};

// Condition Mapping logic
const CONDITIONS = {
  1: { name: "Alex", type: "Gold Standard", complexity: "LOW", transparency: "HIGH" },
  2: { name: "Danny", type: "Expert Mode", complexity: "HIGH", transparency: "HIGH" },
  3: { name: "Kim", type: "Magic Box", complexity: "LOW", transparency: "LOW" },
  4: { name: "Taylor", type: "Black Box", complexity: "HIGH", transparency: "LOW" }
};

// Robust ID Parser: Accepts "A" + any numbers (e.g., A123456)
const getConditionFromId = (studentId) => {
  const id = studentId.trim().toLowerCase();
  // Alex (Gold): Starts with 'a'
  if (id.startsWith('a')) return 1; 
  // Danny (Expert): Starts with 'd'
  if (id.startsWith('d')) return 2; 
  // Kim (Magic): Starts with 'k'
  if (id.startsWith('k')) return 3; 
  // Taylor (Black Box): Starts with 't'
  if (id.startsWith('t')) return 4; 
  
  // Test codes or Fallback
  return 1; 
};

const ALLOWED_EXTENSIONS = ['pdf', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'];

// Initialize Firebase
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

const callLLM = async (query, contextFilename, conditionId, params) => {
  const config = LLM_CONFIG.providers[LLM_CONFIG.activeProvider];
  
  const systemPrompt = `You are an expert HCM Analytics assistant. 
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
    // Handle different API response structures if needed
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
  const [condition, setCondition] = useState(1);
  const [isResearcherMode, setIsResearcherMode] = useState(false);
  
  // App State
  const [params, setParams] = useState({ temperature: 0.7, topP: 0.9, contextWindow: 4096 });
  const [currentFile, setCurrentFile] = useState(null);
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Logging State
  const [sessionId, setSessionId] = useState(null);
  const [lastResponseTimestamp, setLastResponseTimestamp] = useState(null);
  const [interactionCount, setInteractionCount] = useState(0);

  // Layout Logic
  const isHighComplexity = [2, 4].includes(condition);
  const isHighTransparency = [1, 2].includes(condition);

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
          date_str: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          timestamp: Date.now() // Redundant but easy for CSV export sorting
        });
        setSessionId(sessionRef.id);
        localSessionId = sessionRef.id;
      } catch(e) { console.error("Session start failed", e); }
    };
    startSession();

    // Heartbeat (Every 1 min)
    const heartbeat = setInterval(async () => {
      if (localSessionId) {
        const ref = doc(db, "sessions", localSessionId);
        try {
          // We update duration roughly by incrementing or diffing server time
          // Simple approach: Update last_active. Calculate duration in export.
          await updateDoc(ref, { last_active: serverTimestamp() });
        } catch(e) {}
      }
    }, 60000);

    return () => clearInterval(heartbeat);
  }, [isLoggedIn]);

  // --- LOGGING ---

  const logInteraction = async (type, payload) => {
    if (!db || !sessionId) return;
    setInteractionCount(prev => prev + 1);
    
    try {
      // 1. Save granular log
      await addDoc(collection(db, `sessions/${sessionId}/logs`), {
        type, ...payload, timestamp: serverTimestamp()
      });
      // 2. Update aggregate counter on session doc (for easy SPSS export)
      updateDoc(doc(db, "sessions", sessionId), {
        interaction_count: interactionCount + 1
      });
    } catch(e) {}
  };

  // Silent Reaction Timer
  useEffect(() => {
    if (!lastResponseTimestamp) return;
    const handleInteraction = (e) => {
      const ms = Date.now() - lastResponseTimestamp;
      logInteraction("REACTION_TIME", { ms, trigger: e.type });
      setLastResponseTimestamp(null);
    };
    const opts = { capture: true, once: true };
    ['mousedown','keydown','scroll','touchstart'].forEach(evt => 
      window.addEventListener(evt, handleInteraction, opts)
    );
    return () => ['mousedown','keydown','scroll','touchstart'].forEach(evt => 
      window.removeEventListener(evt, handleInteraction, opts)
    );
  }, [lastResponseTimestamp]);

  // --- DATA EXPORT (SPSS PIVOT FORMAT) ---
  
  const exportData = async () => {
    if (!db) return alert("Database not connected");
    
    // Double security check (though toggle is now locked too)
    // const password = prompt("Confirm Researcher Password:");
    // if (password !== "admin123") return alert("Incorrect Password"); 

    try {
      // 1. Fetch ALL sessions sorted by student for aggregation
      const q = query(collection(db, "sessions"), orderBy("student_id"));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return alert("No data found to export.");

      // 2. Aggregate Data by Student
      const students = {};
      const allDates = new Set();

      snapshot.forEach(doc => {
        const data = doc.data();
        const sId = data.student_id || "Unknown";
        // Use the date string stored in session, or fallback to today
        const date = data.date_str || new Date().toISOString().split('T')[0];
        
        if (!students[sId]) {
          students[sId] = {
            condition: data.condition_id,
            total_duration: 0,
            total_clicks: 0,
            total_sessions: 0,
            dates: {}
          };
        }
        
        // Calculate Duration for this specific session
        let sessionDuration = 0;
        if (data.start_time && data.last_active) {
           const start = data.start_time.toDate ? data.start_time.toDate() : new Date(data.start_time);
           const end = data.last_active.toDate ? data.last_active.toDate() : new Date(data.last_active);
           sessionDuration = Math.round((end - start) / 60000); // minutes
           if (sessionDuration < 0) sessionDuration = 0;
        }

        // Update Student Totals
        students[sId].total_duration += sessionDuration;
        students[sId].total_clicks += (data.interaction_count || 0);
        students[sId].total_sessions += 1;

        // Update Daily Totals (Pivot Data)
        allDates.add(date);
        if (!students[sId].dates[date]) {
          students[sId].dates[date] = { duration: 0, clicks: 0 };
        }
        students[sId].dates[date].duration += sessionDuration;
        students[sId].dates[date].clicks += (data.interaction_count || 0);
      });

      // 3. Sort Dates to create stable columns
      const sortedDates = Array.from(allDates).sort();

      // 4. Build CSV Header
      let csvContent = "data:text/csv;charset=utf-8,";
      // Standard Fixed Columns
      csvContent += "Student_ID,Condition,Total_Sessions,Total_Active_Mins,Total_Clicks,Avg_Session_Length_Mins";
      
      // Dynamic Date Columns (2 per date)
      sortedDates.forEach(date => {
        csvContent += `,${date}_Mins,${date}_Clicks`;
      });
      csvContent += "\n";

      // 5. Build CSV Rows
      Object.keys(students).forEach(sId => {
        const s = students[sId];
        const avgSession = s.total_sessions > 0 ? (s.total_duration / s.total_sessions).toFixed(2) : 0;
        
        let row = `${sId},${s.condition},${s.total_sessions},${s.total_duration},${s.total_clicks},${avgSession}`;
        
        // Add date-specific data (or 0 if no activity that day)
        sortedDates.forEach(date => {
          const dData = s.dates[date] || { duration: 0, clicks: 0 };
          row += `,${dData.duration},${dData.clicks}`;
        });
        
        csvContent += row + "\n";
      });

      // 6. Trigger Download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `hcm_experiment_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (e) {
      console.error(e);
      alert("Export failed: " + e.message);
    }
  };

  // --- HANDLERS ---

  const handleLogin = (e) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    setCondition(getConditionFromId(studentId));
    setIsLoggedIn(true);
  };

  // SECURE TOGGLE HANDLER
  const handleResearcherToggle = (e) => {
    if (e.target.checked) {
      const pwd = prompt("Enter Administrator Password:");
      if (pwd === "admin123") { // CHANGE THIS PASSWORD
        setIsResearcherMode(true);
      } else {
        alert("Access Denied.");
      }
    } else {
      setIsResearcherMode(false);
    }
  };

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { type: 'user', text: query };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    logInteraction("PROMPT", { text: query, has_file: !!currentFile });
    setQuery("");
    
    const start = Date.now();
    const res = await callLLM(userMsg.text, currentFile?.name, condition, params);
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

  // --- RENDERERS ---

  const MessageRenderer = ({ msg }) => {
    if (msg.type === 'user') return (
      <div className="flex justify-end mb-6"><div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[90%] text-sm shadow-sm">{msg.text}</div></div>
    );

    if (isHighComplexity) {
      const [tab, setTab] = useState('summary');
      return (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase">AI Response</span>
            {isHighTransparency && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium flex gap-1"><Activity size={12}/> {Math.floor(msg.confidence_score*100)}% Conf</span>}
          </div>
          <div className="flex border-b border-gray-200">
            {['Summary','Raw Data'].map(t => (
              <button key={t} onClick={()=>setTab(t.toLowerCase().split(' ')[0])} className={`px-4 py-2 text-xs font-medium ${tab===t.toLowerCase().split(' ')[0]?'text-blue-600 border-b-2 border-blue-600':'text-gray-500'}`}>{t}</button>
            ))}
          </div>
          <div className="p-4">
            {tab==='summary' && (
              <div className="space-y-4">
                <p className="text-gray-800 text-sm leading-relaxed">{msg.answer}</p>
                {isHighTransparency && msg.reasoning_trace && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 mb-2 flex gap-1"><Terminal size={12}/> Reasoning Node Map</h4>
                    <div className="font-mono text-xs text-gray-600 bg-gray-50 p-3 rounded border">{msg.reasoning_trace}</div>
                  </div>
                )}
              </div>
            )}
            {tab==='raw' && <pre className="text-xs bg-slate-50 p-3 rounded border overflow-auto">{JSON.stringify(msg.raw_data_snippet,null,2)}</pre>}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-8 max-w-3xl mr-auto flex gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0"><Brain size={16}/></div>
        <div className="space-y-3 min-w-0">
           <div className="prose prose-sm text-gray-800 text-sm">{msg.answer}</div>
           {isHighTransparency && msg.reasoning_trace && (
              <div className="mt-4 p-4 bg-slate-100 border-l-4 border-slate-400 rounded-r-md text-sm">
                <div className="flex items-center gap-2 font-semibold mb-2 text-slate-900"><Brain size={16}/> Logic & Sources</div>
                <div className="whitespace-pre-line font-mono text-xs">{msg.reasoning_trace}</div>
              </div>
           )}
        </div>
      </div>
    );
  };

  // --- LOGIN UI ---

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white"><Database size={32}/></div>
          <h1 className="text-2xl font-bold text-gray-800">HCM Data Lab</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Participant ID</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input type="text" value={studentId} onChange={e=>setStudentId(e.target.value)} className="w-full pl-10 p-3 border rounded-lg" placeholder="e.g. A123456"/>
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold flex items-center justify-center gap-2"><LogIn size={18}/> Enter Lab</button>
          <div className="pt-6 border-t flex items-center gap-2">
             <input type="checkbox" checked={isResearcherMode} onChange={handleResearcherToggle} className="rounded text-indigo-600"/>
             <span className="text-xs text-gray-500">Researcher Mode</span>
             {isResearcherMode && (
               <button type="button" onClick={exportData} className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-300">
                 <Download size={12}/> Download Data
               </button>
             )}
          </div>
        </form>
      </div>
    </div>
  );

  // --- MAIN UI ---

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {isResearcherMode && <div className="bg-indigo-900 text-white p-2 text-center text-xs font-mono">DEBUG: Condition {condition} ({CONDITIONS[condition].name})</div>}
      <div className={`flex-1 ${isHighComplexity ? 'flex flex-col lg:grid lg:grid-cols-12' : 'flex justify-center'} lg:overflow-hidden`}>
        {isHighComplexity && (
          <div className="order-2 lg:order-1 lg:col-span-3 bg-gray-50 border-r flex flex-col h-auto lg:h-[calc(100vh-40px)]">
             <div className="p-4 border-b"><h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm"><Settings size={18}/> Config</h2></div>
             <div className="p-4 space-y-4">
               <div className="text-xs font-bold text-gray-500">Parameters</div>
               <input type="range" className="w-full" value={params.temperature} onChange={e=>setParams({...params, temperature: parseFloat(e.target.value)})} min="0" max="1" step="0.1"/>
               <div className="text-xs text-gray-400">Temp: {params.temperature}</div>
             </div>
          </div>
        )}
        <div className={`order-1 lg:order-2 ${isHighComplexity ? 'lg:col-span-6' : 'w-full max-w-4xl'} bg-white flex flex-col h-[70vh] lg:h-[calc(100vh-40px)] shadow-xl z-10`}>
           <div className="p-3 border-b flex justify-between text-xs text-gray-500"><span className="font-bold">HCM Console</span><span>ID: {studentId}</span></div>
           <div className="p-4 border-b bg-gray-50">
             <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2"><Database size={16}/> File</div>
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFile} accept=".pdf,.csv,.xlsx,.docx"/>
             <div onClick={()=>!currentFile?fileInputRef.current.click():alert("Max files reached")} className={`w-full h-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer ${currentFile?'bg-blue-50 border-blue-300':'hover:bg-gray-100'}`}>
                {currentFile ? <span className="text-blue-800 text-sm flex gap-2"><File size={16}/> {currentFile.name} <X size={16} onClick={e=>{e.stopPropagation();setCurrentFile(null)}} className="hover:bg-blue-200 rounded-full"/></span> : <span className="text-gray-400 text-xs flex gap-2"><Upload size={16}/> Upload File</span>}
             </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4">
             {chatHistory.length===0 && <div className="h-full flex flex-col items-center justify-center text-gray-400"><Bot size={48} className="text-indigo-200 mb-2"/><p className="text-sm">Ask a question</p></div>}
             {chatHistory.map((m,i)=><MessageRenderer key={i} msg={m}/>)}
             {loading && <div className="text-xs text-gray-400 animate-pulse p-4">Processing...</div>}
           </div>
           <div className="p-4 border-t relative">
             <input type="text" className="w-full p-3 pr-12 border rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type query..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSend()}/>
             <button onClick={handleSend} disabled={loading||!query.trim()} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full"><Send size={16}/></button>
           </div>
        </div>
        {isHighComplexity && (
          <div className="order-3 lg:order-3 lg:col-span-3 bg-black text-gray-300 flex flex-col h-auto lg:h-[calc(100vh-40px)] font-mono text-xs p-4">
            <div className="font-bold text-green-500 mb-4 flex items-center gap-2"><Activity size={16}/> Metrics</div>
            <div>Status: {loading ? "Processing" : "Idle"}</div>
            <div className="mt-8 text-gray-500">Token Stream...</div>
            <div className="flex gap-1 h-10 mt-2 items-end opacity-50">{[30,50,20,60,40,80].map((h,i)=><div key={i} className="flex-1 bg-gray-700" style={{height:`${h}%`}}></div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
