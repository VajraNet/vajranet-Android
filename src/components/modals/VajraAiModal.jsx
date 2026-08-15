import React from 'react';
import { Sparkles, Maximize2, X, Send, Loader2 } from 'lucide-react';

export default function VajraAiModal({
  showVajraAiModal,
  setShowVajraAiModal,
  useVercelIframe,
  setUseVercelIframe,
  aiMessages,
  aiPrompt,
  setAiPrompt,
  aiLoading,
  handleSendAiQuery
}) {
  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setShowVajraAiModal(true)}
        className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black px-4 py-2.5 rounded-full shadow-2xl shadow-purple-600/50 flex items-center gap-2 cursor-pointer border-2 border-purple-300/40 active:scale-95 transition"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
        <span className="text-xs font-mono font-bold tracking-wider">VajraAI</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </button>

      {/* Floating Modal / Drawer */}
      {showVajraAiModal && (
        <div className="fixed inset-0 bg-[#07172C]/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fadeIn p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md h-[88vh] sm:h-[82vh] flex flex-col justify-between overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#0B2545] text-white px-4 py-3 border-b border-[#D4AF37]/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-400 flex items-center justify-center text-purple-300">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white flex items-center gap-2">
                    <span>VajraAI Safety Assistant</span>
                    <span className="text-[9px] bg-purple-900/80 text-purple-200 border border-purple-500/50 px-1.5 py-0.2 rounded font-mono font-bold">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[10px] text-[#D4AF37] font-mono">
                    {useVercelIframe ? 'vajranetai.vercel.app' : 'Offline Protocol Engine'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => window.open('https://vajranetai.vercel.app', '_blank')}
                  title="Open in Fullscreen Tab"
                  className="p-1.5 rounded-lg bg-[#07172C] text-slate-300 hover:text-white cursor-pointer border border-slate-700"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowVajraAiModal(false)}
                  className="p-1.5 rounded-lg bg-[#07172C] text-slate-300 hover:text-rose-400 cursor-pointer border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {useVercelIframe ? (
              <div className="flex-1 w-full bg-slate-900 relative">
                <iframe
                  src="https://vajranetai.vercel.app"
                  title="VajraAI Emergency Assistant"
                  className="w-full h-full border-none"
                  onError={() => setUseVercelIframe(false)}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden bg-slate-50">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {aiMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          m.sender === 'user'
                            ? 'bg-[#0077B6] text-white rounded-br-none shadow-md'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0077B6]" />
                        <span>Consulting NDRF Emergency Protocol Knowledgebase...</span>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendAiQuery} className="pt-3 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask first-aid, evacuation routes, survival steps..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0077B6]"
                  />
                  <button
                    type="submit"
                    disabled={!aiPrompt.trim() || aiLoading}
                    className="px-4 py-2 bg-[#0077B6] hover:bg-[#005f92] text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
