import React from 'react';
import { 
  Download, 
  Radio, 
  ShieldAlert, 
  WifiOff, 
  Smartphone, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Home, 
  Activity, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export default function DownloadAppPage({ onProceedToWeb }) {
  const handleDownload = () => {
    // Triggers download of vajranet-citizen.apk
    const link = document.createElement('a');
    link.href = '/vajranet-citizen.apk';
    link.download = 'vajranet-citizen.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#07172C] via-[#0E294B] to-[#07172C] text-slate-100 font-sans flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Background Cyber Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0077B6]/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <img 
            src="/app-icon-transparent.png" 
            alt="VajraNet Logo" 
            className="w-8 h-8 rounded-xl object-contain drop-shadow" 
          />
          <div>
            <span className="font-black text-sm tracking-wider block text-white uppercase">VAJRANET</span>
            <span className="text-[10px] text-cyan-400 font-mono block -mt-0.5">Disaster Mesh Network</span>
          </div>
        </div>

        <span className="text-[10px] bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-full font-mono font-bold">
          v1.0 Release
        </span>
      </header>

      {/* Main Hero Card */}
      <main className="max-w-md mx-auto w-full my-auto py-6 space-y-6 relative z-10">
        
        {/* Centered Brand Emblem */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-3xl bg-[#0B2545]/90 border border-cyan-400/50 shadow-2xl backdrop-blur-md">
            <img 
              src="/app-icon-transparent.png" 
              alt="VajraNet Icon" 
              className="w-20 h-20 object-contain drop-shadow-xl" 
            />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              VajraNet Citizen App
            </h1>
            <p className="text-xs sm:text-sm text-cyan-300 font-semibold font-mono">
              "When The World Goes Dark, We Stay Connected."
            </p>
          </div>

          {/* Testing Environment Notice Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Hardware P2P Bluetooth Radio Enabled</span>
          </div>
        </div>

        {/* Informative Card */}
        <div className="bg-white/95 backdrop-blur-md text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
          
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#0077B6]" />
              <span>Native Android APK Required for Mesh</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Because VajraNet's peer-to-peer mesh relies directly on local <strong>Bluetooth Low Energy & Wi-Fi Direct</strong> hardware radios, offline emergency communications operate on physical Android devices.
            </p>
          </div>

          {/* Key Feature Pillars */}
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#059669] flex items-center justify-center font-bold shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-slate-900 font-bold">100% Offline P2P MeshChat</strong>
                <span className="text-[11px] text-slate-500">Chat with nearby devices with zero SIM/Wi-Fi</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-slate-900 font-bold">One-Touch Emergency SOS</strong>
                <span className="text-[11px] text-slate-500">Hop-by-hop relay to rescue authorities</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#0077B6] flex items-center justify-center font-bold shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-slate-900 font-bold">Safe Shelters & Live Hospitals</strong>
                <span className="text-[11px] text-slate-500">Offline cached maps and bed tracking</span>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Download APK */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-[#0077B6] to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-900/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>Download VajraNet APK (v1.0)</span>
            </button>

            {/* Bypass Button for Web Evaluators */}
            {onProceedToWeb && (
              <button
                onClick={onProceedToWeb}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Launch Web Testing Preview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center py-2 text-[11px] text-slate-400 font-mono relative z-10">
        <span>VajraNet Disaster Resilience Network • </span>
        <span className="text-cyan-400">"When Towers Fall, VajraNet Stands."</span>
      </footer>

    </div>
  );
}
