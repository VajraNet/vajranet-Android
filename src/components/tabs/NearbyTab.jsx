import React from 'react';
import { RefreshCw, MapPin } from 'lucide-react';

export default function NearbyTab({
  isDark,
  loadResources,
  helpSubTab,
  setHelpSubTab,
  shelters,
  hospitals,
  reliefCenters,
  setActiveTab,
  setFocusedMapLocation
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#D4AF37]/30' : 'border-slate-300'}`}>
        <h2 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span>📍 Nearby Emergency Help</span>
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('map')}
            className={`text-[10px] font-mono flex items-center gap-1 cursor-pointer font-bold px-2 py-1 rounded-lg border ${
              isDark ? 'bg-[#0B2545] border-[#D4AF37]/40 text-[#D4AF37]' : 'bg-blue-50 border-blue-200 text-[#0077B6]'
            }`}
          >
            <MapPin className="w-3 h-3" /> Map View
          </button>
          <button 
            onClick={loadResources}
            className={`text-[10px] font-mono flex items-center gap-1 cursor-pointer font-bold ${isDark ? 'text-[#D4AF37]' : 'text-blue-700'}`}
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* 3 Segmented Sub-Tabs */}
      <div className="grid grid-cols-3 bg-white p-1 rounded-2xl border border-slate-200 text-xs font-bold shadow-md">
        <button
          onClick={() => setHelpSubTab('shelters')}
          className={`py-2 rounded-xl transition cursor-pointer ${
            helpSubTab === 'shelters' ? 'bg-[#059669] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🏠 Shelters
        </button>
        <button
          onClick={() => setHelpSubTab('hospitals')}
          className={`py-2 rounded-xl transition cursor-pointer ${
            helpSubTab === 'hospitals' ? 'bg-[#0077B6] text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🏥 Hospitals
        </button>
        <button
          onClick={() => setHelpSubTab('relief')}
          className={`py-2 rounded-xl transition cursor-pointer ${
            helpSubTab === 'relief' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🍚 Relief
        </button>
      </div>

      {/* A. Shelters List */}
      {helpSubTab === 'shelters' && (
        <div className="space-y-3">
          {shelters.map((sh) => (
            <div key={sh.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{sh.name}</h4>
                  <p className="text-[10px] text-slate-500">{sh.address}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-[#059669] border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  {sh.status || 'OPEN'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[9px]">Capacity</span>
                  <span className="text-slate-800 font-bold">{sh.capacity} Persons</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Available</span>
                  <span className="text-[#059669] font-bold">{sh.available_capacity} Vacancies</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Distance</span>
                  <span className="text-slate-800 font-bold">{sh.distance_km || 0.8} km</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* B. Hospitals List */}
      {helpSubTab === 'hospitals' && (
        <div className="space-y-3">
          {hospitals.map((hosp) => (
            <div key={hosp.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{hosp.name}</h4>
                  <p className="text-[10px] text-slate-500">{hosp.address}</p>
                </div>
                <span className="text-[10px] bg-blue-100 text-[#0077B6] border border-blue-300 px-2 py-0.5 rounded font-mono font-bold">
                  {hosp.emergency_available ? '🟢 Emergency Ready' : '🟡 Limited'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[9px]">General Beds</span>
                  <span className="text-slate-800 font-bold">{hosp.available_beds || 18}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Live ICU</span>
                  <span className="text-[#0077B6] font-bold">{hosp.icu_available || 4} Beds</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Distance</span>
                  <span className="text-slate-800 font-bold">{hosp.distance_km || 1.2} km</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* C. Relief Centers List */}
      {helpSubTab === 'relief' && (
        <div className="space-y-3">
          {reliefCenters.map((rc) => (
            <div key={rc.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{rc.name}</h4>
                  <p className="text-[10px] text-slate-500">{rc.address}</p>
                </div>
                <span className="text-[10px] text-amber-700 font-mono font-bold">
                  {rc.distance_km || 0.9} km away
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span>🍚 Food:</span>
                  <span className="text-[#059669] font-bold">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>💧 Water:</span>
                  <span className="text-[#059669] font-bold">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>💊 Medicine:</span>
                  <span className="text-amber-700 font-bold">Limited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>🛏 Blankets:</span>
                  <span className="text-[#059669] font-bold">Available</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
