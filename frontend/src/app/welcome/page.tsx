"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const [geminiKey, setGeminiKey] = useState("");
  const [serperKey, setSerperKey] = useState("");

  useEffect(() => {
    // If keys already exist, auto-redirect (optional but good UX)
    const existingGemini = localStorage.getItem("gemini_key");
    if (existingGemini) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (geminiKey.trim()) {
      localStorage.setItem("gemini_key", geminiKey.trim());
      localStorage.setItem("serper_key", serperKey.trim());
      router.push("/");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-grid"></div>
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <div className="glass-panel max-w-md w-full p-10 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.5)]">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          The Daily Signal
        </h1>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          Welcome to the autonomous AI radio show pipeline. Please enter your API keys to get started.
        </p>

        <form onSubmit={handleSubmit} className="text-left space-y-6">
          <div>
            <label htmlFor="geminiKey" className="block text-sm font-medium text-gray-200 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              id="geminiKey"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for AI generation and TTS. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white underline decoration-gray-600 transition-colors">Get one here</a>.
            </p>
          </div>

          <div>
            <label htmlFor="serperKey" className="block text-sm font-medium text-gray-200 mb-2">
              Serper API Key
            </label>
            <input
              type="password"
              id="serperKey"
              value={serperKey}
              onChange={(e) => setSerperKey(e.target.value)}
              placeholder="Optional for web search..."
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-transparent transition-all font-mono text-sm"
            />
            <p className="mt-2 text-xs text-gray-500">
              Required for "The Scout" news search. <a href="https://serper.dev/" target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white underline decoration-gray-600 transition-colors">Get one here</a>.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 mt-4 bg-white text-black font-semibold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Launch Dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
