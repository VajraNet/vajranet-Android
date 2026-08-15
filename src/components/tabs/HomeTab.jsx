import React from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  Building2, 
  HeartPulse, 
  Package, 
  FileText,
  PhoneCall,
  ShieldAlert
} from 'lucide-react';

export default function HomeTab({
  isDark,
  isOnline,
  gpsCoords,
  announcements,
  sosSent,
  sosSubmitting,
  sosType,
  setSosType,
  assignedSosId,
  handleSendSOS,
  handleOpenSmsApp,
  setActiveTab
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* ⚠️ Official Emergency Alert Banner */}
      {announcements.length > 0 && (
        <div 
          onClick={() => setActiveTab('alerts')}
          className="bg-white border-l-4 border-l-amber-500 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-xl active:scale-[0.99] transition border border-slate-200"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold uppercase">
                DISASTER BROADCAST
              </span>
              <h3 className="text-xs font-bold text-slate-900 mt-0.5">{announcements[0].title}</h3>
              <p className="text-[11px] text-slate-600 line-clamp-1">{announcements[0].content}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      )}

      {/* 🚨 THE HIGH-CONTRAST CRISP SOS CARD */}
      {!sosSent ? (
        <div className="bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-200 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-mono bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Emergency Dispatch
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">TRANSMIT SOS BEACON</h2>
            <p className="text-xs text-slate-500">
              Broadcasts your GPS coordinates to Responders and nearby Citizens.
            </p>
          </div>

          {/* Pulsing Red SOS Button */}
          <div className="py-2 flex justify-center">
            <button
              onClick={handleSendSOS}
              disabled={sosSubmitting}
              className="relative w-40 h-40 rounded-full bg-gradient-to-tr from-rose-700 to-red-500 text-white font-black text-2xl tracking-widest shadow-2xl shadow-rose-600/40 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-rose-300/40 cursor-pointer animate-pulse-ring"
            >
              <AlertTriangle className="w-10 h-10 mb-1 animate-pulse text-white" />
              <span>SOS</span>
              <span className="text-[10px] tracking-normal font-bold text-rose-100 mt-0.5">
                {sosSubmitting ? 'DISPATCHING...' : 'TAP FOR HELP'}
              </span>
            </button>
          </div>

          {/* Severity Level Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block font-bold">Select Urgency Level</label>
            <div className="grid grid-cols-3 gap-2 text-xs font-bold font-mono">
              <button
                type="button"
                onClick={() => setSosType('CRITICAL')}
                className={`py-2 rounded-xl border transition cursor-pointer ${
                  sosType === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🚨 Critical
              </button>
              <button
                type="button"
                onClick={() => setSosType('HIGH')}
                className={`py-2 rounded-xl border transition cursor-pointer ${
                  sosType === 'HIGH' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🟠 High
              </button>
              <button
                type="button"
                onClick={() => setSosType('MEDIUM')}
                className={`py-2 rounded-xl border transition cursor-pointer ${
                  sosType === 'MEDIUM' ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🔵 Medium
              </button>
            </div>
          </div>

          {/* Direct 2-Click Native SMS Fallback Option */}
          <button
            type="button"
            onClick={handleOpenSmsApp}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span>📱</span>
            <span>Direct Emergency SMS (Opens Messaging App)</span>
          </button>

          {/* Telemetry Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>📍 GPS: {gpsCoords.lat}, {gpsCoords.lon}</span>
            <span>⏱️ Verified Lock</span>
          </div>
        </div>
      ) : (
        /* SOS SENT STATUS BANNER */
        <div className="bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border-2 border-rose-500 animate-fadeIn">
          <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-600 shadow-md">
            <CheckCircle2 className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-rose-700 font-bold uppercase tracking-wider block">
              {isOnline ? 'ONLINE DISPATCH CONFIRMED' : '📶 OFFLINE MESH BEACON BROADCASTING'}
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-0.5">SOS #{assignedSosId}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isOnline 
                ? 'Transmitted directly to Command & Volunteer boards.' 
                : 'Relaying peer-to-peer over Bluetooth & Wi-Fi Direct mesh.'}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs font-mono grid grid-cols-2 gap-2 text-left">
            <div>
              <span className="text-slate-500 block text-[10px]">Status:</span>
              <span className="text-emerald-700 font-bold">🟢 Active Dispatch</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Priority:</span>
              <span className="text-rose-700 font-bold">{sosType}</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EMERGENCY HELP TILES */}
      <div className="space-y-2">
        <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? 'text-[#D4AF37]' : 'text-slate-700'}`}>
          Nearby Relief & Reporting
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Tile 1: Shelters */}
          <button
            onClick={() => setActiveTab('help')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#059669] group-hover:scale-110 transition">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Find Shelters</h4>
              <p className="text-[10px] text-slate-500 font-mono">Safe refuge & camps</p>
            </div>
          </button>

          {/* Tile 2: Hospitals */}
          <button
            onClick={() => setActiveTab('help')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-[#0077B6] group-hover:scale-110 transition">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Hospitals & ICU</h4>
              <p className="text-[10px] text-slate-500 font-mono">Bed & trauma triage</p>
            </div>
          </button>

          {/* Tile 3: Relief Centers */}
          <button
            onClick={() => setActiveTab('help')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-110 transition">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Relief Depots</h4>
              <p className="text-[10px] text-slate-500 font-mono">Rations & medicine</p>
            </div>
          </button>

          {/* Tile 4: Report Incident */}
          <button
            onClick={() => setActiveTab('report')}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 group-hover:scale-110 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Report Hazard</h4>
              <p className="text-[10px] text-slate-500 font-mono">Roadblock, fire, flood</p>
            </div>
          </button>
        </div>
      </div>

      {/* DIRECT 1-TAP EMERGENCY HELPLINE CALL GRID */}
      <div className="space-y-2 pt-2">
        <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? 'text-[#D4AF37]' : 'text-slate-700'}`}>
          📞 Direct Emergency Helplines (1-Tap Dial)
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="tel:112"
            className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl flex items-center gap-2.5 shadow-sm transition active:scale-95 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow shrink-0">
              112
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-900 leading-tight">National SOS</h4>
              <p className="text-[10px] text-rose-600 font-mono">Disaster & Police</p>
            </div>
          </a>

          <a
            href="tel:1078"
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex items-center gap-2.5 shadow-sm transition active:scale-95 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0077B6] text-white flex items-center justify-center font-black text-xs shadow shrink-0">
              1078
            </div>
            <div>
              <h4 className="text-xs font-black text-blue-900 leading-tight">NDRF Control</h4>
              <p className="text-[10px] text-blue-600 font-mono">Disaster Force</p>
            </div>
          </a>

          <a
            href="tel:108"
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center gap-2.5 shadow-sm transition active:scale-95 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[#059669] text-white flex items-center justify-center font-black text-xs shadow shrink-0">
              108
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-900 leading-tight">Ambulance</h4>
              <p className="text-[10px] text-emerald-600 font-mono">Medical Trauma</p>
            </div>
          </a>

          <a
            href="tel:101"
            className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex items-center gap-2.5 shadow-sm transition active:scale-95 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shadow shrink-0">
              101
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 leading-tight">Fire Brigade</h4>
              <p className="text-[10px] text-amber-600 font-mono">Fire & Rescue</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
