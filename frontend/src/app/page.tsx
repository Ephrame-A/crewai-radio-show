"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// --- Types ---
type Step = {
  name: string;
  icon: string;
  status: "pending" | "running" | "complete" | "error";
  detail: string;
};

type PipelineState = {
  status: "idle" | "running" | "complete" | "error";
  current_step: string;
  topic: string;
  steps: Step[];
  script: string;
  audio_path: string;
  error: string;
  started_at: string;
  completed_at: string;
};

// --- API Helper ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DashboardPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<PipelineState | null>(null);
  const [scriptLines, setScriptLines] = useState<{ speaker: string; text: string; raw?: string }[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ icon: string; message: string } | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth keys on mount
  useEffect(() => {
    const geminiKey = localStorage.getItem("gemini_key");
    if (!geminiKey) {
      router.push("/welcome");
    }
    
    // Initial fetch to see if it's already running or completed
    fetchStatus();
    checkAudio();
    checkScript();
    
    // Cleanup on unmount
    return () => stopPolling();
  }, [router]);

  const showToast = (icon: string, message: string) => {
    setToast({ icon, message });
    setTimeout(() => setToast(null), 3000);
  };

  // --- API Calls ---
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        setState(data);
        if (data.status === "complete" || data.status === "error") {
          stopPolling();
          setLoading(false);
          if (data.status === "complete") {
            showToast("🎉", "Show generated successfully!");
            checkScript();
            checkAudio();
          } else {
            showToast("❌", `Error: ${data.error}`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const checkScript = async () => {
    try {
      const res = await fetch(`${API_URL}/api/script`);
      if (res.ok) {
        const data = await res.json();
        if (data.script) {
          parseScript(data.script);
        }
      }
    } catch (err) {
      console.error("Failed to check script:", err);
    }
  };

  const checkAudio = async () => {
    try {
      const res = await fetch(`${API_URL}/api/audio`, { method: "HEAD" });
      if (res.ok) {
        setAudioUrl(`${API_URL}/api/audio?t=${Date.now()}`);
      }
    } catch (err) {
      console.error("Failed to check audio:", err);
    }
  };

  const startPipeline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      showToast("⚠️", "Please enter a show topic!");
      return;
    }

    if (state?.status === "running" || loading) {
      showToast("⏳", "Pipeline is already running!");
      return;
    }

    setLoading(true);
    setScriptLines([]);
    setAudioUrl(null);

    const gemini_key = localStorage.getItem("gemini_key") || "";
    const serper_key = localStorage.getItem("serper_key") || "";

    try {
      const res = await fetch(`${API_URL}/api/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, gemini_key, serper_key }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start pipeline");
      }

      showToast("🚀", `Pipeline started for "${topic}"`);
      startPolling();
    } catch (err: any) {
      showToast("❌", err.message);
      setLoading(false);
    }
  };

  // --- Polling Logic ---
  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(fetchStatus, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // --- Helpers ---
  const parseScript = (scriptText: string) => {
    const lines = scriptText.split("\n");
    const parsed: { speaker: string; text: string; raw?: string }[] = [];
    
    let renderedAny = false;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const alexMatch = trimmed.match(/^Alex\s*:\s*(.+)/i);
      const samMatch = trimmed.match(/^Sam\s*:\s*(.+)/i);

      if (alexMatch) {
        parsed.push({ speaker: "Alex", text: alexMatch[1] });
        renderedAny = true;
      } else if (samMatch) {
        parsed.push({ speaker: "Sam", text: samMatch[1] });
        renderedAny = true;
      }
    });

    if (!renderedAny) {
      parsed.push({ speaker: "Raw", text: "", raw: scriptText });
    }
    setScriptLines(parsed);
  };

  return (
    <main className="min-h-screen p-6 relative pb-20">
      {/* Background */}
      <div className="bg-grid"></div>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      {/* Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 mt-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">The Daily Signal</h1>
            <p className="text-sm text-gray-400 font-mono">Autonomous AI Radio</p>
          </div>
        </div>
        
        <div className="glass px-6 py-2.5 rounded-full border border-white/10 font-mono text-sm flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            {state?.status === "running" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              state?.status === "running" ? "bg-primary" : 
              state?.status === "complete" ? "bg-emerald-500" : 
              state?.status === "error" ? "bg-red-500" : "bg-gray-500"
            }`}></span>
          </span>
          <span className="uppercase tracking-wider text-xs font-semibold">
            {state?.status || "Ready"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Controls & Pipeline */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Input Card */}
          <div className="glass-panel p-6 animate-slide-up" style={{animationDelay: "0.1s"}}>
            <h2 className="text-lg font-semibold mb-4 text-white">Generate Episode</h2>
            <form onSubmit={startPipeline}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter a news topic..."
                className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={loading || state?.status === "running"}
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                  loading || state?.status === "running"
                    ? "bg-white/10 text-white/50 cursor-not-allowed"
                    : "bg-white text-black hover:bg-gray-100 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                }`}
              >
                {loading || state?.status === "running" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : "Launch Pipeline"}
              </button>
            </form>
          </div>

          {/* Pipeline Status */}
          <div className="glass-panel p-6 animate-slide-up" style={{animationDelay: "0.2s"}}>
            <h2 className="text-lg font-semibold mb-4 text-white">Pipeline Status</h2>
            <div className="space-y-4">
              {(state?.steps || [
                { name: "The Scout", icon: "🔍", status: "pending", detail: "Searching for news..." },
                { name: "The Showrunner", icon: "📋", status: "pending", detail: "Structuring flow..." },
                { name: "The Scriptwriter", icon: "✍️", status: "pending", detail: "Writing dialogue..." },
                { name: "Audio Generation", icon: "🎙️", status: "pending", detail: "Synthesizing voice..." },
              ]).map((step, idx) => (
                <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 ${
                  step.status === "running" ? "bg-primary/10 border-primary/30" :
                  step.status === "complete" ? "bg-emerald-500/10 border-emerald-500/20" :
                  step.status === "error" ? "bg-red-500/10 border-red-500/30" :
                  "bg-black/20 border-white/5"
                }`}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{step.icon}</span>
                      <span className={`font-semibold ${step.status === "running" ? "text-primary" : "text-gray-200"}`}>{step.name}</span>
                    </div>
                    {step.status === "running" && <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full uppercase font-bold tracking-wider animate-pulse">Running</span>}
                    {step.status === "complete" && <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full uppercase font-bold tracking-wider">Done</span>}
                  </div>
                  <p className="text-xs text-gray-400 ml-9">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Audio & Script */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Audio Player */}
          <div className="glass-panel p-6 animate-slide-up" style={{animationDelay: "0.3s"}}>
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <span>🎙️</span> Broadcast Audio
            </h2>
            {audioUrl ? (
              <div className="bg-black/40 rounded-2xl p-4 border border-white/10">
                <audio controls className="w-full h-12 mb-4">
                  <source src={audioUrl} />
                  Your browser does not support the audio element.
                </audio>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400 font-mono text-xs">Generated for: {state?.topic || "Unknown Topic"}</span>
                  <a href={audioUrl} download="daily_show.wav" className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors border border-white/5 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="h-32 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500">
                <span className="text-2xl mb-2">🔇</span>
                <p className="text-sm">No audio generated yet</p>
              </div>
            )}
          </div>

          {/* Script View */}
          <div className="glass-panel p-6 flex flex-col h-[500px] animate-slide-up" style={{animationDelay: "0.4s"}}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📄</span> Show Script
              </h2>
              {scriptLines.length > 0 && (
                <button 
                  onClick={() => {
                    const text = scriptLines.map(l => l.raw ? l.raw : `${l.speaker}: ${l.text}`).join('\n');
                    navigator.clipboard.writeText(text);
                    showToast("✅", "Script copied!");
                  }}
                  className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                >
                  Copy Script
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {scriptLines.length > 0 ? (
                scriptLines.map((line, idx) => {
                  if (line.raw) {
                    return <pre key={idx} className="text-sm text-gray-300 font-mono whitespace-pre-wrap bg-black/30 p-4 rounded-xl border border-white/5">{line.raw}</pre>;
                  }
                  
                  const isAlex = line.speaker === "Alex";
                  return (
                    <div key={idx} className={`flex ${isAlex ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 border ${
                        isAlex 
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-50 rounded-tl-sm' 
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-50 rounded-tr-sm'
                      }`}>
                        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isAlex ? 'text-blue-400' : 'text-purple-400'}`}>
                          {line.speaker}
                        </div>
                        <p className="text-sm leading-relaxed">{line.text}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-gray-500">
                  <span className="text-3xl mb-3">🎭</span>
                  <p className="text-sm">Waiting for the scriptwriters...</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 glass px-6 py-4 rounded-xl border border-white/10 flex items-center gap-3 shadow-2xl animate-slide-up z-50">
          <span className="text-xl">{toast.icon}</span>
          <span className="text-sm font-medium text-white">{toast.message}</span>
        </div>
      )}
    </main>
  );
}
