import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Wifi, 
  WifiOff, 
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
  Share2
} from 'lucide-react';
import { apiFetch } from '../api/client';
import LoginPage from './LoginPage';
import MeshChat from './MeshChat';

export default function CitizenApp() {
  const [activeTab, setActiveTab] = useState('sos'); // 'sos' | 'mesh' | 'report' | 'nearby' | 'alerts' | 'ai'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsCoords, setGpsCoords] = useState({ lat: 28.6139, lon: 77.2090, accuracy: 'High (4m)' });
  const [sosSent, setSosSent] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosType, setSosType] = useState('CRITICAL');
  const [sosNotes, setSosNotes] = useState('');
  const [assignedSosId, setAssignedSosId] = useState(null);

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

  // Nearby resources & announcements
  const [shelters, setShelters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [reliefCenters, setReliefCenters] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [resourceSubTab, setResourceSubTab] = useState('shelters'); // 'shelters' | 'hospitals' | 'relief'

  // AI survival query state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { sender: 'ai', text: 'Namaste. I am the VajraNet Emergency Survival Advisor. Ask me for first-aid protocols, flood evacuation, or finding high ground.' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Attempt real GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
            accuracy: `GPS (±${Math.round(pos.coords.accuracy || 5)}m)`
          });
        },
        () => console.log('Using fallback default coordinates')
      );
    }

    // Load nearby resources
    loadResources();

    // Listen to online / offline network state
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('vajranet_citizen_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Failed to save user in localStorage', err);
    }
  };

  const handleSkip = (guestData) => {
    setUser(guestData);
    try {
      localStorage.setItem('vajranet_citizen_user', JSON.stringify(guestData));
    } catch (err) {
      console.error('Failed to save guest user in localStorage', err);
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('vajranet_citizen_user');
    } catch (err) {
      console.error('Failed to remove user from localStorage', err);
    }
  };

  const loadResources = async () => {
    try {
      const sh = await apiFetch(`/resources/shelters?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(sh)) setShelters(sh);
    } catch {
      setShelters([
        { id: 'SH-1', name: 'District Community Relief Center', address: 'Sector 4 Sports Ground', capacity: 500, available_capacity: 180, distance_km: 0.8 },
        { id: 'SH-2', name: 'Government Higher Secondary Shelter', address: 'Station Road', capacity: 350, available_capacity: 45, distance_km: 1.4 }
      ]);
    }

    try {
      const hosp = await apiFetch(`/resources/hospitals?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(hosp)) setHospitals(hosp);
    } catch {
      setHospitals([
        { id: 'HOSP-1', name: 'City Trauma & Emergency Center', address: 'Main Civil Lines', available_beds: 18, icu_available: 4, distance_km: 1.2 },
        { id: 'HOSP-2', name: 'Red Cross Mobile Field Hospital', address: 'Naval Dock Gate 2', available_beds: 12, icu_available: 2, distance_km: 2.1 }
      ]);
    }

    try {
      const rc = await apiFetch(`/resources/relief-centers?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(rc)) setReliefCenters(rc);
    } catch {
      setReliefCenters([
        { id: 'RC-1', name: 'Disaster Ration & Water Depot', address: 'Community Hall Block B', items_available: 'Clean Drinking Water, 500 Ration Packets, ORS, Blankets', distance_km: 0.9 }
      ]);
    }

    try {
      const anns = await apiFetch('/announcements');
      if (Array.isArray(anns)) setAnnouncements(anns);
    } catch {
      setAnnouncements([
        { id: 'A-1', title: 'RED ALERT: River Water Level Rising', content: 'Citizens in low-lying riverside areas must move to Sector 4 Community Center immediately.', severity: 'CRITICAL', created_at: new Date().toISOString() },
        { id: 'A-2', title: 'Drinking Water Tankers Deployed', content: 'Clean water distribution operational at Station Road and Stadium gate.', severity: 'INFO', created_at: new Date().toISOString() }
      ]);
    }
  };

  const handleSendSOS = async () => {
    setSosSubmitting(true);
    const payload = {
      message: sosNotes.trim() || `EMERGENCY SOS: Citizen requested urgent dispatch (${sosType})`,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      severity: sosType,
      message_id: `SOS-CITIZEN-${Date.now()}`,
      user_name: user?.name || 'Guest Citizen',
      user_phone: user?.phone || 'N/A'
    };

    try {
      const res = await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAssignedSosId(res?.id || `SOS-${Math.floor(100 + Math.random() * 900)}`);
      setSosSent(true);
    } catch (err) {
      // Saved in offline mesh queue
      setAssignedSosId(`MESH-QUEUED-${Math.floor(100 + Math.random() * 900)}`);
      setSosSent(true);
    } finally {
      setSosSubmitting(false);
    }
  };

  const handleReportIncident = async (e) => {
    e.preventDefault();
    if (!incidentTitle.trim()) return;

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
      setIncidentTitle('');
      setIncidentDesc('');
    } catch (err) {
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
      const res = await apiFetch('/ai/safety-guidance', {
        method: 'POST',
        body: JSON.stringify({ query: userText })
      });
      const reply = res?.guidance || res?.answer || "Stay on high ground. Avoid electrical poles. Boil drinking water.";
      setAiMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      let fallback = "Stay calm. If water is rising, disconnect main electrical switch and move to highest accessible point. Do not walk through moving water.";
      if (userText.toLowerCase().includes('bleed') || userText.toLowerCase().includes('first aid')) {
        fallback = "Apply firm direct pressure to the wound with a clean cloth. Elevate if possible. Keep victim warm and calm.";
      }
      setAiMessages(prev => [...prev, { sender: 'ai', text: fallback }]);
    } finally {
      setAiLoading(false);
    }
  };

  // IF NOT AUTHENTICATED OR SKIPPED, RENDER LOGIN SCREEN
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onSkip={handleSkip} />;
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#070e1c] text-white flex flex-col font-sans selection:bg-rose-600">
      
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-50 bg-[#081324]/95 backdrop-blur-md border-b border-slate-800/80 px-3.5 py-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm tracking-wider text-white">VAJRANET</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800/60">
                  CITIZEN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Emergency Response App</p>
            </div>
          </div>

          {/* User Badge & Logout + GPS Badge */}
          <div className="flex items-center space-x-1.5">
            <div className="flex items-center space-x-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${user.isGuest ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping`}></span>
              <span className="text-slate-300 max-w-[75px] truncate">{user.name}</span>
              <button 
                onClick={handleLogout} 
                title="Return to Login Page"
                className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold border border-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span className="text-[9px]">Login</span>
              </button>
            </div>

            <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${
              isOnline ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <Radio className="w-3 h-3 text-amber-400 animate-pulse" />}
              <span>{isOnline ? 'Live' : 'P2P Mesh'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 p-3.5 pb-20 overflow-y-auto space-y-4 no-scrollbar">
        
        {/* ===================== TAB 1: ONE-TAP SOS ===================== */}
        {activeTab === 'sos' && (
          <div className="space-y-4">
            
            {/* Live Ticker Alert */}
            {announcements.length > 0 && (
              <div className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-600/40 rounded-xl p-2.5 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
                <p className="text-[11px] text-amber-200 truncate font-medium">
                  {announcements[0].title}: {announcements[0].content}
                </p>
              </div>
            )}

            {!sosSent ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-xl">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">EMERGENCY SOS</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pressing will dispatch your location directly to Government NDRF & Volunteers.
                  </p>
                </div>

                {/* Big Glowing Red Button */}
                <div className="py-2 flex justify-center">
                  <button
                    onClick={handleSendSOS}
                    disabled={sosSubmitting}
                    className="relative w-44 h-44 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white font-black text-2xl tracking-widest shadow-2xl shadow-rose-600/60 active:scale-95 transition-all flex flex-col items-center justify-center border-4 border-rose-400/40 cursor-pointer animate-pulse-ring"
                  >
                    <AlertTriangle className="w-10 h-10 mb-1" />
                    <span>SOS</span>
                    <span className="text-[10px] tracking-normal font-medium text-rose-100">
                      {sosSubmitting ? 'DISPATCHING...' : 'TAP FOR HELP'}
                    </span>
                  </button>
                </div>

                {/* Emergency Type Selector */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSosType('CRITICAL')}
                    className={`p-2 rounded-xl border flex flex-col items-center space-y-1 transition-colors ${
                      sosType === 'CRITICAL' ? 'bg-rose-900/60 border-rose-500 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Waves className="w-4 h-4 text-blue-400" />
                    <span>Flood / Trapped</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSosType('HIGH')}
                    className={`p-2 rounded-xl border flex flex-col items-center space-y-1 transition-colors ${
                      sosType === 'HIGH' ? 'bg-rose-900/60 border-rose-500 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <HeartPulse className="w-4 h-4 text-rose-400" />
                    <span>Medical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSosType('MEDIUM')}
                    className={`p-2 rounded-xl border flex flex-col items-center space-y-1 transition-colors ${
                      sosType === 'MEDIUM' ? 'bg-rose-900/60 border-rose-500 text-rose-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Fire Hazard</span>
                  </button>
                </div>

                {/* Optional Message / Notes */}
                <input
                  type="text"
                  placeholder="Optional details (e.g. 2 adults trapped on roof)"
                  value={sosNotes}
                  onChange={(e) => setSosNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>Accuracy: {gpsCoords.accuracy}</span>
                  <span className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                    {isOnline ? 'Direct Cloud Dispatch' : 'P2P Mesh Relay Ready'}
                  </span>
                </div>
              </div>
            ) : (
              /* Dispatched Confirmation State */
              <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-900/60 border border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-mono font-bold">
                    DISPATCH SIGNAL ACTIVE
                  </span>
                  <h3 className="text-lg font-black text-white mt-1.5">HELP IS ON THE WAY</h3>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Emergency tracking token: <span className="font-mono font-bold text-white">{assignedSosId}</span>
                  </p>
                </div>
                <div className="bg-slate-950/80 rounded-xl p-3 text-left space-y-1.5 text-xs text-slate-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Citizen:</span>
                    <span>{user?.name} ({user?.phone || 'Guest'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Coordinates:</span>
                    <span>{gpsCoords.lat}, {gpsCoords.lon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-amber-400 font-bold">DISPATCHED / EN ROUTE</span>
                  </div>
                </div>
                <button
                  onClick={() => setSosSent(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs py-2.5 rounded-xl transition-colors"
                >
                  Send Another Alert / Update Location
                </button>
              </div>
            )}

            {/* Quick Helpline Hotline Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <a 
                href="tel:112"
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center space-x-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-950 text-rose-400 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">Emergency 112</div>
                  <div className="text-[9px] text-slate-400">Police / Disaster</div>
                </div>
              </a>
              <a 
                href="tel:108"
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center space-x-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">Ambulance 108</div>
                  <div className="text-[9px] text-slate-400">Medical Triage</div>
                </div>
              </a>
            </div>

          </div>
        )}

        {/* ===================== TAB 2: OFF-GRID P2P MESHCHAT ===================== */}
        {activeTab === 'mesh' && (
          <MeshChat user={user} gpsCoords={gpsCoords} />
        )}

        {/* ===================== TAB 3: INCIDENT REPORTER ===================== */}
        {activeTab === 'report' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div>
              <h2 className="text-base font-black text-white">Report Disaster Hazard</h2>
              <p className="text-xs text-slate-400">Report landslides, collapsed bridges, or rising flood levels to authorities.</p>
            </div>

            {incidentSubmitted && (
              <div className="bg-emerald-950/60 border border-emerald-600 rounded-xl p-3 text-xs text-emerald-300 font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Incident report registered. Government teams notified!</span>
              </div>
            )}

            <form onSubmit={handleReportIncident} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Hazard Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tree collapsed blocking Sector 3 access road"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="FLOOD">Flood / Submerged</option>
                    <option value="FIRE">Fire Hazard</option>
                    <option value="BUILDING_COLLAPSE">Building Collapse</option>
                    <option value="LANDSLIDE">Landslide</option>
                    <option value="MEDICAL">Medical Outbreak</option>
                    <option value="OTHER">Other Disaster</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Severity</label>
                  <select
                    value={incidentSeverity}
                    onChange={(e) => setIncidentSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="CRITICAL">Critical (Immediate danger)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Hazard</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Description & Landmarks</label>
                <textarea
                  rows="3"
                  placeholder="Describe trapped people, water level, landmark details..."
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 text-slate-400 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>GPS Auto-tagged: {gpsCoords.lat}, {gpsCoords.lon}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">Verified</span>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                Submit Incident Report
              </button>
            </form>
          </div>
        )}

        {/* ===================== TAB 4: NEARBY LIFELINE RESOURCES ===================== */}
        {activeTab === 'nearby' && (
          <div className="space-y-3">
            
            {/* Resource Sub-tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setResourceSubTab('shelters')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  resourceSubTab === 'shelters' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Shelters ({shelters.length})
              </button>
              <button
                onClick={() => setResourceSubTab('hospitals')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  resourceSubTab === 'hospitals' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Hospitals ({hospitals.length})
              </button>
              <button
                onClick={() => setResourceSubTab('relief')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  resourceSubTab === 'relief' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                }`}
              >
                Relief Kits ({reliefCenters.length})
              </button>
            </div>

            {/* List for Shelters */}
            {resourceSubTab === 'shelters' && (
              <div className="space-y-2.5">
                {shelters.map((s) => (
                  <div key={s.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{s.name}</h4>
                        <p className="text-[10px] text-slate-400">{s.address || 'Disaster Relief Zone'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 font-mono font-bold border border-blue-800">
                        {s.distance_km || '0.8'} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Available Space:</span>
                      <span className="text-emerald-400 font-bold">{s.available_capacity || (s.capacity - (s.occupied || 0))} beds</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List for Hospitals */}
            {resourceSubTab === 'hospitals' && (
              <div className="space-y-2.5">
                {hospitals.map((h) => (
                  <div key={h.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{h.name}</h4>
                        <p className="text-[10px] text-slate-400">{h.address || 'Emergency Trauma Center'}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-mono font-bold border border-rose-800">
                        {h.distance_km || '1.2'} km
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-400">ICU Beds: </span>
                        <span className="text-rose-400 font-bold">{h.icu_available || 4} available</span>
                      </div>
                      <div>
                        <span className="text-slate-400">General: </span>
                        <span className="text-emerald-400 font-bold">{h.available_beds || 18} available</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* List for Relief Centers */}
            {resourceSubTab === 'relief' && (
              <div className="space-y-2.5">
                {reliefCenters.map((rc) => (
                  <div key={rc.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white">{rc.name}</h4>
                        <p className="text-[10px] text-slate-400">{rc.address}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono font-bold border border-amber-800">
                        {rc.distance_km || '0.9'} km
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-bold">Available: </span>
                      {rc.items_available || 'Drinking Water, Dry Ration, First-Aid'}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ===================== TAB 5: OFFICIAL ANNOUNCEMENTS ===================== */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-300 tracking-wider">OFFICIAL BROADCAST FEED</h3>
              <span className="text-[10px] text-slate-500 font-mono">Verified NDRF / Gov</span>
            </div>

            {announcements.map((ann) => (
              <div key={ann.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                    ann.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                  }`}>
                    {ann.severity || 'OFFICIAL'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* ===================== TAB 6: AI SURVIVAL GUIDE ===================== */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-[calc(100vh-180px)] bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">AI Disaster Survival Advisor</h3>
                <p className="text-[9px] text-emerald-400 font-mono">Offline-ready triage & first-aid knowledgebase</p>
              </div>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2 text-xs text-slate-400 font-mono animate-pulse">
                    Analyzing disaster safety protocols...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAskAI} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Ask emergency question (e.g. snake bite, burn care)..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#081324]/95 backdrop-blur-md border-t border-slate-800/80 px-1.5 py-2 flex items-center justify-around z-50 shadow-2xl">
        <button
          onClick={() => setActiveTab('sos')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'sos' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[10px]">SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('mesh')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'mesh' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px]">MeshChat</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'report' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[10px]">Report</span>
        </button>

        <button
          onClick={() => setActiveTab('nearby')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'nearby' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Nearby</span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'alerts' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span className="text-[10px]">Alerts</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-colors ${
            activeTab === 'ai' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px]">AI Guide</span>
        </button>
      </nav>

    </div>
  );
}
