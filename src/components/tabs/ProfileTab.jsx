import React from 'react';
import { User, LogOut, RefreshCw } from 'lucide-react';
import { getOrCreateVajraId } from '../../utils/vajraId';

export default function ProfileTab({
  isDark,
  user,
  setUser,
  isOnline,
  gpsCoords,
  offlineQueue
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className={`text-base font-black flex items-center gap-2 pb-2 border-b ${isDark ? 'border-[#D4AF37]/30 text-white' : 'border-slate-300 text-slate-900'}`}>
        <span>👤 Citizen Emergency Profile</span>
      </h2>

      {/* Profile Summary Card */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B2545] to-[#0077B6] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-lg">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">{user.name}</h3>
            <p className="text-xs text-slate-500 font-mono">
              {user.phone ? `+91 ${user.phone}` : 'Guest Citizen (Unregistered)'}
            </p>
            <span className="inline-block text-[10px] bg-emerald-100 text-[#059669] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-300 mt-1">
              🟢 Active Mesh Node
            </span>
          </div>
        </div>

        {/* Node Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs font-mono bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div>
            <span className="text-slate-500 block text-[10px]">Unique Vajra ID</span>
            <span className="text-[#0077B6] font-black">{user?.vajra_id || getOrCreateVajraId()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Network Mode</span>
            <span className={isOnline ? 'text-[#059669] font-bold' : 'text-amber-700 font-bold'}>
              {isOnline ? 'Direct Cloud Relay' : 'Multi-Hop Mesh'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">GPS Lock</span>
            <span className="text-slate-900 font-bold">{gpsCoords.lat}, {gpsCoords.lon}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">DTN Offline Queue</span>
            <span className="text-[#0077B6] font-bold">{offlineQueue.length} Events</span>
          </div>
        </div>

        {/* Emergency Contacts & Medical Info */}
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Emergency Information</h4>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Blood Group:</span>
              <span className="font-bold text-slate-900">O+ (Default)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Emergency Helpline:</span>
              <span className="font-bold text-rose-700">112 (Disaster National)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NDRF Direct Control:</span>
              <span className="font-bold text-[#0077B6]">1078 / 011-24363260</span>
            </div>
          </div>
        </div>

        {/* Testing Utility: Wipe Cache & Reset ID */}
        <button
          onClick={() => {
            localStorage.removeItem('vajranet_user_permanent_id');
            localStorage.removeItem('vajranet_discovered_peers');
            localStorage.removeItem('vajranet_offline_queue');
            localStorage.removeItem('vajranet_citizen_user');
            localStorage.removeItem('vajranet_mesh_messages');
            window.location.reload();
          }}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Wipe Node Cache & Generate Fresh ID (Testing)</span>
        </button>

        {/* Log out / Switch User */}
        <button
          onClick={() => {
            localStorage.removeItem('vajranet_citizen_user');
            setUser(null);
          }}
          className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of this Device</span>
        </button>
      </div>
    </div>
  );
}
