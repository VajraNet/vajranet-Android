import React from 'react';
import { Home, MapPin, Radio, ShieldAlert, User } from 'lucide-react';

export default function BottomNavBar({ activeTab, setActiveTab, isDark }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'help', label: 'Nearby', icon: MapPin },
    { id: 'mesh', label: 'Offline Mesh', icon: Radio, isSpecial: true },
    { id: 'alerts', label: 'Alerts', icon: ShieldAlert },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 border-t backdrop-blur-lg px-2 py-1.5 transition-colors ${
      isDark
        ? 'bg-[#07172C]/95 border-[#D4AF37]/30 text-slate-300'
        : 'bg-white/95 border-slate-200 text-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
    }`}>
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative -top-3 flex flex-col items-center group cursor-pointer"
              >
                <div className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-600/50 ring-4 ring-rose-500/20 scale-105'
                    : 'bg-gradient-to-tr from-[#0B2545] to-[#0077B6] text-white shadow-[#0077B6]/40 hover:scale-105'
                }`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
                </div>
                <span className={`text-[10px] font-black mt-1 tracking-tight font-mono ${
                  isActive 
                    ? 'text-rose-500 font-bold' 
                    : isDark ? 'text-[#D4AF37]' : 'text-[#0077B6]'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? isDark 
                    ? 'text-[#D4AF37] font-black scale-105' 
                    : 'text-[#0077B6] font-black scale-105'
                  : isDark 
                    ? 'text-slate-400 hover:text-slate-200' 
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] font-medium mt-1">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
