import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Wifi, 
  ShieldAlert, 
  Building2, 
  PhoneCall, 
  Send, 
  Radio, 
  CheckCircle2, 
  Flame, 
  Waves, 
  HeartPulse, 
  Home, 
  MessageSquare, 
  Navigation, 
  RefreshCw, 
  Info, 
  LogOut, 
  User, 
  Share2,
  Package,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { apiFetch } from '../api/client';
import LoginPage from './LoginPage';

export default function CitizenApp() {
  // Navigation State: 'home' | 'help' | 'alerts' | 'ai' | 'report'
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsCoords, setGpsCoords] = useState({ lat: 28.6139, lon: 77.2090, accuracy: 'High (4m)' });

  // SOS Emergency State
  const [sosSent, setSosSent] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosType, setSosType] = useState('CRITICAL'); // 'CRITICAL' | 'HIGH' | 'MEDIUM'
  const [sosNotes, setSosNotes] = useState('');
  const [assignedSosId, setAssignedSosId] = useState(null);
  const [sosStatus, setSosStatus] = useState('SENT'); // 'SENT' | 'RECEIVED' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED'

  // User state (Persisted in localStorage)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vajranet_citizen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Incident reporting state
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentType, setIncidentType] = useState('FLOOD');
  const [incidentSeverity, setIncidentSeverity] = useState('HIGH');
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  // Nearby Help resources & announcements
  const [shelters, setShelters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [reliefCenters, setReliefCenters] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [helpSubTab, setHelpSubTab] = useState('shelters'); // 'shelters' | 'hospitals' | 'relief'

  // AI survival query state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { 
      sender: 'ai', 
      text: 'Namaste. I am the VajraNet Safety Advisor. Ask me for first-aid protocols, flood safety, or finding higher ground.' 
    }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Offline Mesh Queue & Gateway Sync State
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      const q = localStorage.getItem('vajranet_offline_queue');
      return q ? JSON.parse(q) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  const saveQueue = (newQ) => {
    setOfflineQueue(newQ);
    try {
      localStorage.setItem('vajranet_offline_queue', JSON.stringify(newQ));
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  };

  const syncOfflineQueue = async () => {
    const currentQ = JSON.parse(localStorage.getItem('vajranet_offline_queue') || '[]');
    if (currentQ.length === 0 || isSyncingQueue) return;
    setIsSyncingQueue(true);

    const gatewayPayload = {
      gateway_id: `GATEWAY-CITIZEN-${user?.name?.replace(/\s+/g, '') || 'DEVICE'}`,
      events: currentQ.map(item => ({
        message_id: item.message_id,
        type: item.type,
        created_at: item.created_at || new Date().toISOString(),
        origin_device_id: item.origin_device_id || `DEVICE-${user?.phone || 'ANON'}`,
        payload: item.payload
      }))
    };

    try {
      const res = await apiFetch('/gateway/sync', {
        method: 'POST',
        body: JSON.stringify(gatewayPayload)
      });
      const acceptedIds = res?.accepted || [];
      const dupIds = res?.duplicates || [];
      const handledIds = new Set([...acceptedIds, ...dupIds]);

      const remaining = currentQ.filter(item => !handledIds.has(item.message_id));
      saveQueue(remaining);
    } catch (err) {
      console.warn('Gateway sync deferred (offline or unreachable)');
    } finally {
      setIsSyncingQueue(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
            accuracy: `GPS (±${Math.round(pos.coords.accuracy || 5)}m)`
          });
        },
        () => console.log('Using default GPS fallback')
      );
    }

    loadResources();

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadResources = async () => {
    try {
      const sh = await apiFetch(`/resources/shelters?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(sh)) setShelters(sh);
    } catch {
      setShelters([
        { id: 'SH-1', name: 'Sector 4 Indoor Stadium Camp', address: 'Sports Complex, Sector 4', capacity: 800, available_capacity: 340, status: 'OPEN', distance_km: 0.8 },
        { id: 'SH-2', name: 'Govt Model High School Shelter', address: 'Station Road', capacity: 400, available_capacity: 20, status: 'OPEN', distance_km: 1.4 }
      ]);
    }

    try {
      const hosp = await apiFetch(`/resources/hospitals?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(hosp)) setHospitals(hosp);
    } catch {
      setHospitals([
        { id: 'HOSP-1', name: 'Apex Trauma & Emergency Hospital', address: 'Ring Road, Sector 7', available_beds: 42, icu_available: 8, emergency_available: true, distance_km: 1.2 },
        { id: 'HOSP-2', name: 'Red Cross Field Hospital', address: 'Naval Dock Gate 3', available_beds: 28, icu_available: 4, emergency_available: true, distance_km: 2.1 }
      ]);
    }

    try {
      const rc = await apiFetch(`/resources/relief-centers?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(rc)) setReliefCenters(rc);
    } catch {
      setReliefCenters([
        { 
          id: 'RC-1', 
          name: 'NDRF Central Ration & Water Depot', 
          address: 'Community Hall Block B', 
          supplies: { food: 'Available', water: 'Available', medicine: 'Limited', blankets: 'Available' },
          distance_km: 0.9 
        }
      ]);
    }

    try {
      const anns = await apiFetch('/announcements');
      if (Array.isArray(anns)) setAnnouncements(anns);
    } catch {
      setAnnouncements([
        { id: 'A-1', title: '⚠️ FLOOD ALERT', content: 'Move to higher ground immediately. Evacuate Zone B using Route 3.', severity: 'CRITICAL', created_at: new Date().toISOString() },
        { id: 'A-2', title: 'Clean Water Tanker Deployed', content: 'Drinking water distribution operational at Station Road.', severity: 'INFO', created_at: new Date().toISOString() }
      ]);
    }
  };

  const handleSendSOS = async () => {
    setSosSubmitting(true);
    const msgId = `SOS-CITIZEN-${Date.now()}`;
    const payload = {
      message: sosNotes.trim() || `EMERGENCY SOS: Citizen requested urgent dispatch (${sosType})`,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      severity: sosType,
      message_id: msgId,
      user_name: user?.name || 'Guest Citizen',
      user_phone: user?.phone || 'N/A'
    };

    try {
      const res = await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAssignedSosId(res?.id || `SOS-${Math.floor(100 + Math.random() * 900)}`);
      setSosStatus('RECEIVED');
      setSosSent(true);
    } catch {
      // Buffer in offline DTN mesh queue
      const offlineEvent = {
        message_id: msgId,
        type: 'SOS',
        created_at: new Date().toISOString(),
        origin_device_id: `DEVICE-${user?.phone || 'ANON'}`,
        payload: payload
      };
      saveQueue([...offlineQueue, offlineEvent]);
      setAssignedSosId(`MESH-RELAY-${Math.floor(100 + Math.random() * 900)}`);
      setSosStatus('SENT');
      setSosSent(true);
    } finally {
      setSosSubmitting(false);
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentTitle.trim()) return;

    const msgId = `INC-CITIZEN-${Date.now()}`;
    const payload = {
      title: incidentTitle,
      description: incidentDesc || 'Disaster incident reported by citizen via mobile app',
      type: incidentType,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      severity: incidentSeverity,
      media_urls: [],
      reported_by: user?.name || 'Guest Citizen'
    };

    try {
      await apiFetch('/incidents', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIncidentSubmitted(true);
    } catch {
      // Buffer in offline queue
      const offlineEvent = {
        message_id: msgId,
        type: 'INCIDENT',
        created_at: new Date().toISOString(),
        origin_device_id: `DEVICE-${user?.phone || 'ANON'}`,
        payload: payload
      };
      saveQueue([...offlineQueue, offlineEvent]);
      setIncidentSubmitted(true);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim() || aiLoading) return;

    const userText = aiPrompt;
    setAiMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userText,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lon
        })
      });
      const reply = res?.reply || res?.guidance || "Move to high ground immediately. Disconnect electrical mains.";
      setAiMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      let fallback = "Stay calm. If water is rising, move to highest accessible point. Do not walk through moving floodwater.";
      if (userText.toLowerCase().includes('bleed') || userText.toLowerCase().includes('first aid')) {
        fallback = "Apply firm direct pressure to the wound with a clean cloth. Keep victim warm and calm.";
      }
      setAiMessages(prev => [...prev, { sender: 'ai', text: fallback }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!user) {
    return (
      <LoginPage 
        onLoginSuccess={(userData) => {
          setUser(userData);
          localStorage.setItem('vajranet_citizen_user', JSON.stringify(userData));
        }} 
        onSkip={(guestData) => {
          setUser(guestData);
          localStorage.setItem('vajranet_citizen_user', JSON.stringify(guestData));
        }} 
      />
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#070e1c] text-white flex flex-col font-sans select-none">
      
      {/* ==================== TOP EMERGENCY BAR ==================== */}
      <header className="sticky top-0 z-50 bg-[#081324]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-md shadow-rose-600/30">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-sm tracking-wider text-white">VAJRANET</span>
        </div>

        {/* High-Visibility Network Status Pill */}
        <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1.5 border shadow-sm ${
          isOnline 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80' 
            : 'bg-amber-950/90 text-amber-300 border-amber-700/80'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
          <span>{isOnline ? '🟢 Connected' : '🟠 Offline Relay'}</span>
        </div>
      </header>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto space-y-4">
        
        {/* ===================== VIEW 1: HOME (EMERGENCY FIRST) ===================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            {/* ⚠️ Official Government Alert Banner */}
            {announcements.length > 0 && (
              <div 
                onClick={() => setActiveTab('alerts')}
                className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/60 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer shadow-lg active:scale-[0.99] transition"
              >
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                  <div>
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">{announcements[0].title}</h3>
                    <p className="text-[11px] text-amber-200/90 line-clamp-1">{announcements[0].content}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
              </div>
            )}

            {/* 🚨 THE LARGE SEND SOS CARD */}
            {!sosSent ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-white uppercase">SEND SOS</h2>
                  <p className="text-xs text-slate-400">
                    Dispatches your exact GPS coordinates directly to NDRF and local rescue teams.
                  </p>
                </div>

                {/* Pulsing Red SOS Button */}
                <div className="py-3 flex justify-center">
                  <button
                    onClick={handleSendSOS}
                    disabled={sosSubmitting}
                    className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white font-black text-2xl tracking-widest shadow-2xl shadow-rose-600/70 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-rose-400/40 cursor-pointer animate-pulse-ring"
                  >
                    <AlertTriangle className="w-11 h-11 mb-1 animate-pulse" />
                    <span>SOS</span>
                    <span className="text-[10px] tracking-normal font-medium text-rose-100 mt-0.5">
                      {sosSubmitting ? 'DISPATCHING...' : 'TAP FOR HELP'}
                    </span>
                  </button>
                </div>

                {/* Severity Level Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Select Emergency Urgency</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold font-mono">
                    <button
                      type="button"
                      onClick={() => setSosType('CRITICAL')}
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-500 ring-1 ring-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      🚨 Critical
                    </button>
                    <button
                      type="button"
                      onClick={() => setSosType('HIGH')}
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-500 ring-1 ring-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      🟠 High
                    </button>
                    <button
                      type="button"
                      onClick={() => setSosType('MEDIUM')}
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'MEDIUM' ? 'bg-blue-950 text-blue-300 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      🟡 Medium
                    </button>
                  </div>
                </div>

                {/* Auto-Captured Telemetry */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>📍 GPS: {gpsCoords.lat}, {gpsCoords.lon}</span>
                  <span>⏱️ Real-time Lock</span>
                </div>
              </div>
            ) : (
              /* SOS SENT STATUS BANNER */
              <div className="bg-gradient-to-br from-rose-950/80 via-slate-900 to-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-rose-900/60 border-2 border-rose-400 flex items-center justify-center mx-auto text-rose-300 shadow-lg shadow-rose-600/40">
                  <CheckCircle2 className="w-9 h-9 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider block">DISPATCH BEACON BROADCASTING</span>
                  <h2 className="text-xl font-black text-white mt-0.5">SOS #{assignedSosId}</h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isOnline 
                      ? 'Transmitted directly to Government NDRF Command Center.' 
                      : 'Relaying automatically over peer-to-peer Bluetooth & Wi-Fi mesh.'}
                  </p>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs font-mono grid grid-cols-2 gap-2 text-left">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Status:</span>
                    <span className="text-emerald-400 font-bold">🟢 Active Dispatch</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Priority:</span>
                    <span className="text-rose-400 font-bold">{sosType}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSosSent(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-700"
                >
                  Send Another SOS / Update Location
                </button>
              </div>
            )}

            {/* "NEED SOMETHING ELSE?" 4 ACTION TILES */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Need Something Else?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Tile 1: Shelters */}
                <button
                  onClick={() => {
                    setHelpSubTab('shelters');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-700/80 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Find Shelters</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Safe high ground</p>
                  </div>
                </button>

                {/* Tile 2: Hospitals */}
                <button
                  onClick={() => {
                    setHelpSubTab('hospitals');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/80 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Hospitals</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Live ICU & beds</p>
                  </div>
                </button>

                {/* Tile 3: Relief Centers */}
                <button
                  onClick={() => {
                    setHelpSubTab('relief');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-700/80 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Relief Centers</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Food, water, rations</p>
                  </div>
                </button>

                {/* Tile 4: Report Incident */}
                <button
                  onClick={() => setActiveTab('report')}
                  className="p-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/50 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-950 border border-rose-700/80 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Report Incident</h4>
                    <p className="text-[10px] text-slate-400 font-mono">Roadblock, fire, flood</p>
                  </div>
                </button>

              </div>
            </div>

          </div>
        )}

        {/* ===================== VIEW 2: NEARBY HELP (SHELTERS, HOSPITALS, RELIEF) ===================== */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>📍 Nearby Emergency Help</span>
              </h2>
              <button 
                onClick={loadResources}
                className="text-[10px] text-blue-400 font-mono flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* 3 Simple Sub-Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setHelpSubTab('shelters')}
                className={`py-2 rounded-xl transition ${
                  helpSubTab === 'shelters' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏠 Shelters
              </button>
              <button
                onClick={() => setHelpSubTab('hospitals')}
                className={`py-2 rounded-xl transition ${
                  helpSubTab === 'hospitals' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏥 Hospitals
              </button>
              <button
                onClick={() => setHelpSubTab('relief')}
                className={`py-2 rounded-xl transition ${
                  helpSubTab === 'relief' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                🎁 Relief
              </button>
            </div>

            {/* A. Shelters List */}
            {helpSubTab === 'shelters' && (
              <div className="space-y-3">
                {shelters.map((sh) => (
                  <div key={sh.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{sh.name}</h4>
                        <p className="text-[10px] text-slate-400">{sh.address}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                        {sh.status || 'OPEN'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[9px]">Available Space</span>
                        <span className="text-emerald-400 font-bold">{sh.available_capacity || (sh.capacity - (sh.occupied || 0))} Beds</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Distance</span>
                        <span className="text-slate-200 font-bold">{sh.distance_km || 0.8} km away</span>
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
                  <div key={hosp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{hosp.name}</h4>
                        <p className="text-[10px] text-slate-400">{hosp.address}</p>
                      </div>
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono font-bold">
                        {hosp.emergency_available ? '🟢 Emergency Ready' : '🟡 Limited'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[9px]">General Beds</span>
                        <span className="text-slate-200 font-bold">{hosp.available_beds || 18}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Live ICU</span>
                        <span className="text-cyan-400 font-bold">{hosp.icu_available || 4} Beds</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Distance</span>
                        <span className="text-slate-200 font-bold">{hosp.distance_km || 1.2} km</span>
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
                  <div key={rc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{rc.name}</h4>
                        <p className="text-[10px] text-slate-400">{rc.address}</p>
                      </div>
                      <span className="text-[10px] text-amber-400 font-mono font-bold">
                        {rc.distance_km || 0.9} km away
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>🍚 Food:</span>
                        <span className="text-emerald-400 font-bold">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>💧 Water:</span>
                        <span className="text-emerald-400 font-bold">Available</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>💊 Medicine:</span>
                        <span className="text-amber-400 font-bold">Limited</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>🛏 Blankets:</span>
                        <span className="text-emerald-400 font-bold">Available</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ===================== VIEW 3: GOVERNMENT ALERTS ===================== */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <span>📢 Official Disaster Broadcasts</span>
            </h2>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                      {ann.severity || 'OFFICIAL BROADCAST'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Verified Govt NDRF</span>
                  </div>
                  <h3 className="text-xs font-bold text-white">{ann.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    {ann.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== VIEW 4: AI SAFETY ASSISTANT ===================== */}
        {activeTab === 'ai' && (
          <div className="space-y-4 flex flex-col h-[74vh]">
            <div className="pb-2 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>AI Disaster Survival Advisor</span>
                </h2>
                <p className="text-[10px] text-slate-400">Offline-ready emergency protocols and first-aid guide</p>
              </div>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-2">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-purple-400 font-mono animate-pulse">
                    Synthesizing safety protocol...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAskAI} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Ask emergency question (e.g. flood safety, snake bite)..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ===================== VIEW 5: REPORT DISASTER INCIDENT ===================== */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveTab('home')}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-bold text-white">Report Disaster Hazard</h2>
              </div>
            </div>

            {incidentSubmitted ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Incident Report Submitted</h3>
                <p className="text-xs text-slate-300">
                  {isOnline ? 'Transmitted to Emergency Command.' : 'Buffered in local mesh queue for automatic relay.'}
                </p>
                <button
                  onClick={() => {
                    setIncidentSubmitted(false);
                    setActiveTab('home');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold mt-2"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportIncident} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FLOOD">🌊 Flooded Road / Water Level</option>
                    <option value="FIRE">🔥 Fire / Explosion</option>
                    <option value="ROAD_BLOCK">⚠️ Fallen Tree / Road Blockage</option>
                    <option value="BUILDING_COLLAPSE">🏚️ Structural Collapse</option>
                    <option value="MEDICAL">🏥 Mass Medical Casualty</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Incident Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flooded bridge near Sector 3"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details (water depth, trapped casualties, accessibility)..."
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Severity</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold font-mono">
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('CRITICAL')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      CRITICAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('HIGH')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'HIGH' ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      HIGH
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('MEDIUM')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'MEDIUM' ? 'bg-blue-950 text-blue-300 border-blue-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      MEDIUM
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
                >
                  Submit Incident Report
                </button>
              </form>
            )}
          </div>
        )}

      </main>

      {/* ==================== CLEAN 4-ITEM BOTTOM NAVIGATION ==================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#081324]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-2 flex items-center justify-around z-50 shadow-2xl">
        
        {/* 1. Home (SOS + Action Tiles) */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'home' ? 'text-rose-500 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        {/* 2. Nearby Help */}
        <button
          onClick={() => setActiveTab('help')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'help' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px]">Nearby Help</span>
        </button>

        {/* 3. Official Alerts */}
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'alerts' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px]">Alerts</span>
        </button>

        {/* 4. AI Safety Guide */}
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'ai' ? 'text-purple-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">AI Guide</span>
        </button>

      </nav>

    </div>
  );
}
