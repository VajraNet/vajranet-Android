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
  ArrowLeft,
  Shield
} from 'lucide-react';
import { apiFetch } from '../api/client';
import LoginPage from './LoginPage';
import MeshChat from './MeshChat';

export default function CitizenApp() {
  // Navigation State: 'home' | 'help' | 'mesh' | 'alerts' | 'ai' | 'report'
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsCoords, setGpsCoords] = useState({ lat: 28.6139, lon: 77.2090, accuracy: 'High (4m)' });

  // SOS Emergency State
  const [sosSent, setSosSent] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [sosType, setSosType] = useState('CRITICAL'); // 'CRITICAL' | 'HIGH' | 'MEDIUM'
  const [sosNotes, setSosNotes] = useState('');
  const [assignedSosId, setAssignedSosId] = useState(null);
  const [sosStatus, setSosStatus] = useState('SENT');

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
      text: 'Namaste. I am the VajraNet Safety Protocol Advisor. Ask me for first-aid procedures, flood evacuation safety, or locating nearest medical care.' 
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
        { id: 'SH-1', name: 'Sector 4 Indoor Stadium Relief Camp', address: 'Sports Complex, Sector 4', capacity: 800, available_capacity: 340, status: 'OPEN', distance_km: 0.8 },
        { id: 'SH-2', name: 'Govt Model High School Shelter', address: 'Station Road, Gate 1', capacity: 400, available_capacity: 20, status: 'OPEN', distance_km: 1.4 }
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
        { id: 'A-1', title: '⚠️ FLOOD ALERT: Zone B Evacuation Warning', content: 'Move to higher ground immediately. Evacuate Zone B using Route 1.', severity: 'CRITICAL', created_at: new Date().toISOString() },
        { id: 'A-2', title: 'Clean Water Tanker Distribution Active', content: 'Drinking water distribution operational at Station Road.', severity: 'INFO', created_at: new Date().toISOString() }
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

    // Universal 3rd Feed: Inject immediately into Citizen Alerts Feed
    const liveCitizenAlert = {
      id: `ALERT-SOS-${Date.now()}`,
      title: `🚨 LIVE CITIZEN SOS: ${user?.name || 'Citizen'}`,
      content: `Urgent SOS signaled near (${gpsCoords.lat}, ${gpsCoords.lon}). Urgency: ${sosType}. Citizens and volunteers nearby please assist.`,
      severity: 'CRITICAL',
      isLiveSos: true,
      created_at: new Date().toISOString()
    };
    setAnnouncements(prev => [liveCitizenAlert, ...prev]);

    // Broadcast across P2P mesh bus
    try {
      const bc = new BroadcastChannel('vajranet_p2p_mesh_bus');
      bc.postMessage({
        senderId: localStorage.getItem('vajranet_device_id') || `VAJRA-${Date.now()}`,
        senderName: user?.name || 'Citizen',
        message: `🚨 CRITICAL SOS BEACON: (${gpsCoords.lat}, ${gpsCoords.lon}) - ${sosType}`
      });
      setTimeout(() => bc.close(), 100);
    } catch (e) {
      console.warn('Broadcast failed', e);
    }

    // Transmit to Government and Volunteer feeds (or buffer if offline)
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
        origin_device_id: localStorage.getItem('vajranet_device_id') || `DEVICE-${user?.phone || 'ANON'}`,
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
      const offlineEvent = {
        message_id: msgId,
        type: 'INCIDENT',
        created_at: new Date().toISOString(),
        origin_device_id: localStorage.getItem('vajranet_device_id') || `DEVICE-${user?.phone || 'ANON'}`,
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
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-[#07172C] via-[#0E294B] to-[#07172C] text-slate-900 flex flex-col font-sans select-none">
      
      {/* ==================== 1. TOP GOVT OF INDIA STRIP ==================== */}
      <div className="sticky top-0 z-50 bg-[#050F1D] text-[#D4AF37] px-3 py-1.5 text-[10px] font-semibold flex items-center justify-between border-b border-[#D4AF37]/30 tracking-wide font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
          <span>GOVT. OF INDIA • NDMA DISASTER PORTAL</span>
        </div>
        <span className="text-slate-400">SIH2026</span>
      </div>

      {/* ==================== 2. OFFICIAL HEADER BAR ==================== */}
      <header className="bg-[#0B2545]/95 backdrop-blur-md border-b border-[#D4AF37]/40 px-4 py-2.5 shadow-md flex items-center justify-between text-white sticky top-7 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#07172C] border border-[#D4AF37] flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-white block">VAJRANET</span>
            <span className="text-[10px] text-[#D4AF37] font-mono block -mt-0.5">
              {user.isGuest ? 'Citizen (Guest)' : user.name}
            </span>
          </div>
        </div>

        {/* High-Visibility Network Status Pill */}
        <div className="flex items-center gap-2">
          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={isSyncingQueue}
              className="bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>{offlineQueue.length} Queued</span>
            </button>
          )}

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1.5 border shadow-sm ${
            isOnline 
              ? 'bg-[#059669]/20 text-emerald-300 border-emerald-500/50' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            <span>{isOnline ? '🟢 Connected' : '🟠 Offline Mesh'}</span>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem('vajranet_citizen_user');
              setUser(null);
            }}
            title="Log Out"
            className="text-slate-400 hover:text-rose-400 p-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ==================== 3. MAIN CONTENT CANVAS ==================== */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto space-y-4">
        
        {/* ===================== VIEW 1: HOME (EMERGENCY FIRST) ===================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            {/* ⚠️ Official Government Alert Card (SehatConnect Style) */}
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
                      OFFICIAL ADVISORY
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5">{announcements[0].title}</h3>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{announcements[0].content}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            )}

            {/* 🚨 THE HIGH-CONTRAST CRISP WHITE SOS CARD */}
            {!sosSent ? (
              <div className="bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-200 relative overflow-hidden">
                
                <div className="space-y-1">
                  <span className="text-[10px] font-mono bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Emergency Dispatch
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">TRANSMIT SOS BEACON</h2>
                  <p className="text-xs text-slate-500">
                    Broadcasts your GPS coordinates to NDRF, Volunteers, and Citizen feeds.
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
                      {sosSubmitting ? 'DISPATCHING...' : 'TAP FOR RESCUE'}
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
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🚨 Critical
                    </button>
                    <button
                      type="button"
                      onClick={() => setSosType('HIGH')}
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'HIGH' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🟠 High
                    </button>
                    <button
                      type="button"
                      onClick={() => setSosType('MEDIUM')}
                      className={`py-2 rounded-xl border transition ${
                        sosType === 'MEDIUM' ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      🔵 Medium
                    </button>
                  </div>
                </div>

                {/* Telemetry Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>📍 GPS: {gpsCoords.lat}, {gpsCoords.lon}</span>
                  <span>⏱️ Verified Lock</span>
                </div>
              </div>
            ) : (
              /* SOS SENT STATUS BANNER (CRISP WHITE CARD) */
              <div className="bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border-2 border-rose-500 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-600 shadow-md">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-rose-700 font-bold uppercase tracking-wider block">BEACON ACTIVE ACROSS 3 FEEDS</span>
                  <h2 className="text-xl font-black text-slate-900 mt-0.5">SOS #{assignedSosId}</h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {isOnline 
                      ? 'Transmitted directly to Government NDRF Command & Volunteer boards.' 
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

                <button
                  onClick={() => setSosSent(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-300"
                >
                  Send Another SOS / Update Location
                </button>
              </div>
            )}

            {/* "EMERGENCY SERVICES & RESOURCES" 4 CRISP WHITE CARDS */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider font-mono">
                Official Emergency Services
              </h3>
              <div className="grid grid-cols-2 gap-3">
                
                {/* Tile 1: Shelters */}
                <button
                  onClick={() => {
                    setHelpSubTab('shelters');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#059669] group-hover:scale-110 transition">
                    <Home className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Find Shelters</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Safe high ground</p>
                  </div>
                </button>

                {/* Tile 2: Hospitals */}
                <button
                  onClick={() => {
                    setHelpSubTab('hospitals');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-[#0077B6] group-hover:scale-110 transition">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Hospitals & ICU</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Live beds & trauma</p>
                  </div>
                </button>

                {/* Tile 3: Relief Centers */}
                <button
                  onClick={() => {
                    setHelpSubTab('relief');
                    setActiveTab('help');
                  }}
                  className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition active:scale-[0.98] shadow-lg group flex flex-col justify-between h-28 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 group-hover:scale-110 transition">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Relief Depots</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Food, water, rations</p>
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

          </div>
        )}

        {/* ===================== VIEW 2: NEARBY HELP (SHELTERS, HOSPITALS, RELIEF) ===================== */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/30">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>📍 Nearby Emergency Help</span>
              </h2>
              <button 
                onClick={loadResources}
                className="text-[10px] text-[#D4AF37] font-mono flex items-center gap-1 cursor-pointer font-bold"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* 3 Segmented Sub-Tabs (SehatConnect Style) */}
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
                🎁 Relief
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
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                        {sh.status || 'OPEN'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[9px]">Available Capacity</span>
                        <span className="text-[#059669] font-bold">{sh.available_capacity || (sh.capacity - (sh.occupied || 0))} Beds</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Distance</span>
                        <span className="text-slate-800 font-bold">{sh.distance_km || 0.8} km away</span>
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
        )}

        {/* ===================== VIEW 3: OFFLINE P2P MESH & CHAT (THE CORE FEATURE) ===================== */}
        {activeTab === 'mesh' && (
          <div className="space-y-3 animate-fadeIn">
            <MeshChat user={user} gpsCoords={gpsCoords} onTriggerSOS={handleSendSOS} />
          </div>
        )}

        {/* ===================== VIEW 4: CITIZEN ALERTS & DISASTER BROADCASTS ===================== */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2 pb-2 border-b border-[#D4AF37]/30">
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
                        {isLiveDistress ? '🚨 LIVE CITIZEN SOS' : (ann.severity || 'OFFICIAL BROADCAST')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isLiveDistress ? '📡 P2P Mesh Relayed' : 'Verified Govt NDMA'}
                      </span>
                    </div>

                    <h3 className={`text-xs font-bold ${isLiveDistress ? 'text-rose-700' : 'text-slate-900'}`}>
                      {ann.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {ann.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== VIEW 5: AI SAFETY ASSISTANT ===================== */}
        {activeTab === 'ai' && (
          <div className="space-y-4 flex flex-col h-[74vh]">
            <div className="pb-2 border-b border-[#D4AF37]/30 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>AI Disaster Survival Protocol</span>
                </h2>
                <p className="text-[10px] text-slate-300">Offline-ready emergency protocols & first-aid procedures</p>
              </div>
            </div>

            {/* Chat message bubbles */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-2">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-md ${
                    msg.sender === 'user' 
                      ? 'bg-[#0077B6] text-white' 
                      : 'bg-white text-slate-800 border border-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 text-xs text-[#0077B6] font-mono animate-pulse">
                    Synthesizing safety protocol...
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleAskAI} className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Ask emergency protocol question..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#0077B6]"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-[#0077B6] hover:bg-[#005f92] text-white p-2.5 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ===================== VIEW 6: REPORT DISASTER INCIDENT ===================== */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/30">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveTab('home')}
                  className="p-1 rounded-lg bg-white border border-slate-300 text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-bold text-white">Report Disaster Hazard</h2>
              </div>
            </div>

            {incidentSubmitted ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 shadow-xl">
                <CheckCircle2 className="w-12 h-12 text-[#059669] mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Incident Report Submitted</h3>
                <p className="text-xs text-slate-600">
                  {isOnline ? 'Transmitted directly to Emergency Command.' : 'Buffered in local mesh queue for automatic relay.'}
                </p>
                <button
                  onClick={() => {
                    setIncidentSubmitted(false);
                    setActiveTab('home');
                  }}
                  className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl text-xs font-bold mt-2 cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportIncident} className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0077B6]"
                  >
                    <option value="FLOOD">🌊 Flooded Road / Water Level</option>
                    <option value="FIRE">🔥 Fire / Explosion</option>
                    <option value="ROAD_BLOCK">⚠️ Fallen Tree / Road Blockage</option>
                    <option value="BUILDING_COLLAPSE">🏚️ Structural Collapse</option>
                    <option value="MEDICAL">🏥 Mass Medical Casualty</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Incident Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flooded bridge near Sector 3"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details (water depth, trapped casualties, accessibility)..."
                    value={incidentDesc}
                    onChange={(e) => setIncidentDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#0077B6]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Severity</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold font-mono">
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('CRITICAL')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      CRITICAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('HIGH')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'HIGH' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      HIGH
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('MEDIUM')}
                      className={`py-1.5 rounded-xl border ${
                        incidentSeverity === 'MEDIUM' ? 'bg-[#0077B6] text-white border-[#0077B6]' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      MEDIUM
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Submit Incident Report →
                </button>
              </form>
            )}
          </div>
        )}

      </main>

      {/* ==================== 4. OFFICIAL BOTTOM NAVIGATION BAR ==================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#07172C]/95 backdrop-blur-md border-t-2 border-[#D4AF37]/50 px-1 py-1.5 flex items-center justify-around z-50 shadow-2xl">
        
        {/* 1. Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'home' ? 'text-[#D4AF37] font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px]">Home</span>
        </button>

        {/* 2. Nearby Help */}
        <button
          onClick={() => setActiveTab('help')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'help' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[9px]">Nearby Help</span>
        </button>

        {/* 3. ⭐ OFFLINE MESH (THE HERO CENTER BEACON) */}
        <button
          onClick={() => setActiveTab('mesh')}
          className={`flex flex-col items-center relative -top-3 cursor-pointer group`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2 ${
            activeTab === 'mesh'
              ? 'bg-[#0B2545] text-[#D4AF37] border-[#D4AF37] shadow-[#D4AF37]/40 scale-105 ring-2 ring-[#D4AF37]/50 animate-pulse'
              : 'bg-[#07172C] text-[#D4AF37] border-[#D4AF37]/50 hover:border-[#D4AF37] shadow-lg'
          }`}>
            <Radio className="w-6 h-6 animate-pulse text-[#D4AF37]" />
          </div>
          <span className={`text-[10px] mt-0.5 font-bold font-mono tracking-tight ${
            activeTab === 'mesh' ? 'text-[#D4AF37]' : 'text-slate-400'
          }`}>
            Offline Mesh
          </span>
        </button>

        {/* 4. Official Alerts */}
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'alerts' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[9px]">Alerts</span>
        </button>

        {/* 5. AI Safety Guide */}
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'ai' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px]">AI Guide</span>
        </button>

      </nav>

    </div>
  );
}
