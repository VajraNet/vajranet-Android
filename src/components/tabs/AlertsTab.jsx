import React from 'react';

export default function AlertsTab({ isDark, announcements }) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className={`text-base font-black flex items-center gap-2 pb-2 border-b ${isDark ? 'border-[#D4AF37]/30 text-white' : 'border-slate-300 text-slate-900'}`}>
        <span>📢 Citizen Alerts & Distress Broadcasts</span>
      </h2>

      <div className="space-y-3">
        {announcements.map((ann) => {
          const isLiveDistress = ann.isLiveSos || ann.title?.includes('DISTRESS') || ann.severity === 'CRITICAL';

          return (
            <div
              key={ann.id}
              className={`bg-white rounded-2xl p-4 space-y-2.5 transition shadow-xl border-l-4 ${
                isLiveDistress
                  ? 'border-l-rose-600 border border-slate-200'
                  : 'border-l-blue-600 border border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  isLiveDistress
                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {isLiveDistress ? '🚨 LIVE CITIZEN SOS' : (ann.severity || 'DISASTER BROADCAST')}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {isLiveDistress ? '📡 P2P Mesh Relayed' : 'Verified Alert'}
                </span>
              </div>

              <h3 className={`text-xs font-bold ${isLiveDistress ? 'text-rose-700' : 'text-slate-900'}`}>
                {ann.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                {ann.content}
              </p>

              {ann.media_urls && ann.media_urls.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  {ann.media_urls.map((imgUrl, i) => (
                    <a key={i} href={imgUrl} target="_blank" rel="noreferrer" className="block relative group">
                      <img src={imgUrl} alt="Hazard Photo" className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-sm" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
