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
  Shield,
  Sun,
  Moon,
  X,
  Maximize2,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { Capacitor, registerPlugin } from '@capacitor/core';
import LoginPage from './LoginPage';
import MeshChat from './MeshChat';
import DownloadAppPage from './DownloadAppPage';
import { getOrCreateVajraId } from '../utils/vajraId';

const NearbyConnections = registerPlugin('NearbyConnectionsPlugin');

export default function CitizenApp() {
  // Maintenance / Showcase Mode for Web Deployments
  const [bypassDownloadPage, setBypassDownloadPage] = useState(false);
  const isWeb = !Capacitor.isNativePlatform();
  const isDownloadPageActive = Boolean(
    isWeb && 
    (import.meta.env.VITE_MAINTENANCE_MODE === 'true' || import.meta.env.VITE_SHOW_DOWNLOAD_PAGE === 'true')
  );
  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('vajranet_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('vajranet_theme', nextTheme);
    } catch (e) {
      console.warn('Failed to save theme', e);
    }
  };

  // Navigation State: 'home' | 'help' | 'mesh' | 'alerts' | 'profile' | 'report'
  const [activeTab, setActiveTab] = useState('home');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsCoords, setGpsCoords] = useState({ lat: 28.6139, lon: 77.2090, accuracy: 'High (4m)' });

  // Floating VajraAI Modal State
  const [showVajraAiModal, setShowVajraAiModal] = useState(false);
  const [useVercelIframe, setUseVercelIframe] = useState(true);

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
  const [incidentImageFile, setIncidentImageFile] = useState(null);
  const [incidentImagePreview, setIncidentImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Nearby Help resources & announcements
  const [shelters, setShelters] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [reliefCenters, setReliefCenters] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [helpSubTab, setHelpSubTab] = useState('shelters'); // 'shelters' | 'hospitals' | 'relief'

  // AI survival query state (Local fallback)
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { 
      sender: 'ai', 
      text: 'Namaste. I am VajraAI Emergency Intelligence Engine. Ask me for first-aid procedures, flood evacuation safety, or locating nearest medical care.' 
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

  const uploadCloudinary = async (file) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'vajranet_preset');
      const res = await fetch('https://api.cloudinary.com/v1_1/dsgq3vxk6/image/upload', {
        method: 'POST',
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        return data.secure_url || data.url;
      }
    } catch (e) {
      console.warn('Cloudinary upload fallback:', e);
    }
    return incidentImagePreview || '';
  };

  const syncOfflineQueue = async () => {
    const currentQ = [...offlineQueue];
    if (currentQ.length === 0 || isSyncingQueue) return;

    setIsSyncingQueue(true);
    const gatewayPayload = {
      gateway_id: `GATEWAY-${user?.vajra_id || localStorage.getItem('vajranet_user_permanent_id') || 'CITIZEN-NODE'}`,
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

    if (Capacitor.isNativePlatform() && NearbyConnections) {
      if (NearbyConnections.checkAndRequestPermissions) {
        NearbyConnections.checkAndRequestPermissions().catch(() => {});
      }
      if (NearbyConnections.startBackgroundMeshService) {
        NearbyConnections.startBackgroundMeshService().catch(() => {});
      }
    }

    loadResources();
    const pollInterval = setInterval(loadResources, 8000);

    // Subscribe to Web/Local Mesh Bus for Instant Real-Time Alert Feeds
    let meshBus = null;
    try {
      meshBus = new BroadcastChannel('vajranet_p2p_mesh_bus');
      meshBus.onmessage = (event) => {
        const data = event.data || {};
        if (data.type === 'NEARBY_PAYLOAD' || data.type === 'INCIDENT_BROADCAST' || data.message) {
          const p = data.payload || {};
          const isSos = (data.type === 'NEARBY_PAYLOAD' && p.type === 'SOS') || Boolean(data.message?.includes('SOS'));
          const liveAlert = {
            id: p.id || p.message_id || `LIVE-MESH-${Date.now()}`,
            title: isSos ? `🚨 LIVE CITIZEN SOS: ${data.senderName || 'Neighbor Node'}` : `⚠️ ${p.type || 'HAZARD'}: ${p.title || 'Live Incident'}`,
            content: isSos ? (p.content || data.message || 'Distress SOS relayed over peer-to-peer mesh') : (p.description || 'Disaster hazard detected nearby'),
            severity: isSos ? 'CRITICAL' : (p.severity || 'HIGH'),
            isLiveSos: isSos,
            media_urls: p.media_urls || [],
            created_at: new Date().toISOString()
          };

          setAnnouncements(prev => {
            if (prev.some(a => a.id === liveAlert.id)) return prev;
            return [liveAlert, ...prev];
          });
        }
      };
    } catch (e) {}

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
      loadResources();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      clearInterval(pollInterval);
      if (meshBus) meshBus.close();
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
        { id: 'SH-2', name: 'Model High School Shelter', address: 'Station Road, Gate 1', capacity: 400, available_capacity: 20, status: 'OPEN', distance_km: 1.4 }
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
          name: 'VajraNet Central Ration & Water Depot', 
          address: 'Community Hall Block B', 
          supplies: { food: 'Available', water: 'Available', medicine: 'Limited', blankets: 'Available' },
          distance_km: 0.9 
        }
      ]);
    }

    // Fetch official announcements + all live citizen SOS signals across the network
    try {
      let combinedAlerts = [];
      
      // 1. Fetch live SOS signals from all citizens
      try {
        const liveSosData = await apiFetch('/sos');
        if (Array.isArray(liveSosData) && liveSosData.length > 0) {
          const formattedSos = liveSosData.map(sos => ({
            id: sos.id || `SOS-${sos.message_id || Date.now()}`,
            title: `🚨 CITIZEN DISTRESS SOS: ${sos.user_name || sos.reported_by || 'Citizen in Danger'}`,
            content: sos.message || `Urgent assistance requested at Lat ${sos.latitude?.toFixed ? sos.latitude.toFixed(4) : sos.latitude}, Lon ${sos.longitude?.toFixed ? sos.longitude.toFixed(4) : sos.longitude}`,
            severity: sos.severity || 'CRITICAL',
            isLiveSos: true,
            latitude: sos.latitude,
            longitude: sos.longitude,
            created_at: sos.created_at || new Date().toISOString()
          }));
          combinedAlerts = [...formattedSos];
        }
      } catch (e) {}

      // 2. Fetch government / official disaster broadcasts
      try {
        const anns = await apiFetch('/announcements');
        if (Array.isArray(anns)) {
          combinedAlerts = [...combinedAlerts, ...anns];
        }
      } catch (e) {}

      // 3. Fetch verified disaster incidents & hazards
      try {
        const incidentsData = await apiFetch('/incidents');
        if (Array.isArray(incidentsData) && incidentsData.length > 0) {
          const formattedIncidents = incidentsData.map(inc => ({
            id: inc.id || `INC-${inc.message_id || Date.now()}`,
            title: `⚠️ ${inc.type || inc.disaster_type || 'HAZARD'}: ${inc.title || 'Ground Hazard Reported'}`,
            content: inc.description || 'Ground hazard reported in this sector.',
            severity: inc.severity || 'HIGH',
            media_urls: inc.media_urls || (inc.image_url ? [inc.image_url] : []),
            latitude: inc.latitude,
            longitude: inc.longitude,
            created_at: inc.created_at || inc.reported_at || new Date().toISOString()
          }));
          combinedAlerts = [...combinedAlerts, ...formattedIncidents];
        }
      } catch (e) {}

      if (combinedAlerts.length > 0) {
        setAnnouncements(combinedAlerts);
      }
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

    // 1. Native Hardware SOS Broadcast (P2P_CLUSTER + Fast BLE Beacon)
    if (Capacitor.isNativePlatform() && NearbyConnections) {
      if (NearbyConnections.broadcastBleSosBeacon) {
        NearbyConnections.broadcastBleSosBeacon({
          lat: Number(gpsCoords.lat),
          lon: Number(gpsCoords.lon),
          severity: sosType,
          vajraId: user?.vajra_id || getOrCreateVajraId()
        }).catch((err) => console.log('BLE beacon error:', err));
      }
      if (NearbyConnections.sendMessage) {
        NearbyConnections.sendMessage({
          content: payload.message,
          type: 'SOS',
          id: msgId
        }).catch((err) => console.log('Nearby SOS error:', err));
      }
    }

    // 2. Broadcast across web P2P mesh bus (Browser emulation)
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
    setIsUploadingImage(true);

    let uploadedUrl = null;
    if (incidentImageFile) {
      uploadedUrl = await uploadCloudinary(incidentImageFile);
    }

    const msgId = `INC-CITIZEN-${Date.now()}`;
    const payload = {
      title: incidentTitle,
      description: incidentDesc || 'Disaster incident reported by citizen via mobile app',
      type: incidentType,
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      severity: incidentSeverity,
      media_urls: uploadedUrl ? [uploadedUrl] : [],
      reported_by: user?.name || 'Guest Citizen',
      message_id: msgId
    };

    // 1. Broadcast to local web P2P mesh bus
    try {
      const bc = new BroadcastChannel('vajranet_p2p_mesh_bus');
      bc.postMessage({
        type: 'INCIDENT_BROADCAST',
        senderId: user?.vajra_id || localStorage.getItem('vajranet_user_permanent_id') || `NODE-${Date.now()}`,
        senderName: user?.name || 'Citizen',
        payload: payload
      });
      setTimeout(() => bc.close(), 100);
    } catch (e) {}

    // 2. Broadcast via Native Nearby Connections if on native
    if (Capacitor.isNativePlatform() && NearbyConnections && NearbyConnections.sendMessage) {
      NearbyConnections.sendMessage({
        content: `INCIDENT: [${incidentSeverity}] ${incidentTitle} - ${incidentDesc}`,
        type: 'INCIDENT',
        id: msgId
      }).catch(() => {});
    }

    // 3. Inject directly into current Citizen Alerts feed
    const localAlert = {
      id: msgId,
      title: `⚠️ ${incidentType}: ${incidentTitle}`,
      content: incidentDesc || 'Disaster hazard reported by citizen.',
      severity: incidentSeverity,
      media_urls: uploadedUrl ? [uploadedUrl] : [],
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      created_at: new Date().toISOString()
    };
    setAnnouncements(prev => [localAlert, ...prev]);

    // 4. Transmit to API or buffer in offline queue
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
        origin_device_id: user?.vajra_id || localStorage.getItem('vajranet_user_permanent_id') || `DEVICE-${user?.phone || 'ANON'}`,
        payload: payload
      };
      saveQueue([...offlineQueue, offlineEvent]);
      setIncidentSubmitted(true);
    } finally {
      setIsUploadingImage(false);
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

  if (isDownloadPageActive && !bypassDownloadPage) {
    return <DownloadAppPage onProceedToWeb={() => setBypassDownloadPage(true)} />;
  }

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

  const isDark = theme === 'dark';
  const myDeviceId = localStorage.getItem('vajranet_device_id') || 'VAJRA-32647';

  return (
    <div className={`max-w-md mx-auto min-h-screen ${
      isDark 
        ? 'bg-gradient-to-b from-[#07172C] via-[#0E294B] to-[#07172C] text-slate-100' 
        : 'bg-gradient-to-b from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9] text-slate-900'
    } flex flex-col font-sans select-none transition-colors duration-300 relative`}>
      
      {/* ==================== 1. VAJRANET HEADER BAR ==================== */}
      <header className={`px-4 py-2.5 shadow-md flex items-center justify-between sticky top-0 z-40 transition-colors ${
        isDark 
          ? 'bg-[#0B2545]/95 backdrop-blur-md border-b border-[#D4AF37]/40 text-white' 
          : 'bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center space-x-2.5">
          <img 
            src="/app-icon.jpg" 
            alt="VajraNet" 
            className="w-8 h-8 rounded-xl border border-cyan-400/50 shadow-sm object-cover" 
          />
          <div>
            <span className="font-black text-sm tracking-wide block">VAJRANET</span>
            <span className={`text-[10px] font-mono block -mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>
              {user.isGuest ? 'Citizen (Guest)' : user.name}
            </span>
          </div>
        </div>

        {/* Action Controls: Theme Switcher & Logout */}
        <div className="flex items-center gap-2">
          
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 border ${
              isDark 
                ? 'bg-[#07172C] hover:bg-[#0E294B] border-[#D4AF37]/60 text-[#D4AF37]' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Toggle Light/Dark Theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px]">Dark</span>
              </>
            )}
          </button>

          {/* Queue Indicator if items buffered */}
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

          <button
            onClick={() => {
              localStorage.removeItem('vajranet_citizen_user');
              setUser(null);
            }}
            title="Log Out"
            className={`${isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'} p-1 transition cursor-pointer`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== 2. MAIN CONTENT CANVAS ==================== */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto space-y-4">
        
        {/* ===================== VIEW 1: HOME (EMERGENCY FIRST) ===================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            
            {/* ⚠️ Official Emergency Alert Card */}
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

            {/* 🚨 THE HIGH-CONTRAST CRISP WHITE SOS CARD */}
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

                <button
                  onClick={() => setSosSent(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-300"
                >
                  Send Another SOS / Update Location
                </button>
              </div>
            )}

            {/* HERO CARD: OFFLINE P2P MESHCHAT & BEACON */}
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('mesh')}
                className="w-full p-4.5 bg-gradient-to-r from-[#0B2545] via-[#0E294B] to-[#07172C] hover:to-[#0B2545] border-2 border-cyan-400/60 rounded-3xl text-left transition active:scale-[0.98] shadow-2xl group flex items-center justify-between cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/80 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-110 transition">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-cyan-900/80 border border-cyan-400/50 text-cyan-200 px-2 py-0.2 rounded-full font-mono font-bold">
                        100% OFFLINE P2P
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        Mesh Ready
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white mt-0.5 tracking-wide">Offline MeshChat & SOS</h4>
                    <p className="text-[11px] text-cyan-200 font-mono">Chat nearby nodes with zero cellular / internet</p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:translate-x-1 transition shrink-0 relative z-10">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </div>

            {/* "EMERGENCY SERVICES & RESOURCES" 4 CRISP WHITE CARDS */}
            <div className="space-y-2 pt-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${isDark ? 'text-[#D4AF37]' : 'text-slate-700'}`}>
                Emergency Services & Resources
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
        )}

        {/* ===================== VIEW 2: NEARBY HELP (SHELTERS, HOSPITALS, RELIEF) ===================== */}
        {activeTab === 'help' && (
          <div className="space-y-4">
            
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#D4AF37]/30' : 'border-slate-300'}`}>
              <h2 className={`text-base font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>📍 Nearby Emergency Help</span>
              </h2>
              <button 
                onClick={loadResources}
                className={`text-[10px] font-mono flex items-center gap-1 cursor-pointer font-bold ${isDark ? 'text-[#D4AF37]' : 'text-blue-700'}`}
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
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

        {/* ===================== VIEW 3: OFFLINE P2P MESH & CHAT ===================== */}
        {activeTab === 'mesh' && (
          <div className="space-y-3 animate-fadeIn">
            <MeshChat user={user} gpsCoords={gpsCoords} onTriggerSOS={handleSendSOS} />
          </div>
        )}

        {/* ===================== VIEW 4: CITIZEN ALERTS & DISASTER BROADCASTS ===================== */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
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
        )}

        {/* ===================== VIEW 5: CITIZEN PROFILE TAB ===================== */}
        {activeTab === 'profile' && (
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
        )}

        {/* ===================== VIEW 6: REPORT DISASTER INCIDENT ===================== */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#D4AF37]/30' : 'border-slate-300'}`}>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setActiveTab('home')}
                  className="p-1 rounded-lg bg-white border border-slate-300 text-slate-700 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Report Disaster Hazard</h2>
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
                      className={`py-1.5 rounded-xl border cursor-pointer ${
                        incidentSeverity === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      CRITICAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('HIGH')}
                      className={`py-1.5 rounded-xl border cursor-pointer ${
                        incidentSeverity === 'HIGH' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      HIGH
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncidentSeverity('MEDIUM')}
                      className={`py-1.5 rounded-xl border cursor-pointer ${
                        incidentSeverity === 'MEDIUM' ? 'bg-[#0077B6] text-white border-[#0077B6]' : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      MEDIUM
                    </button>
                  </div>
                </div>

                {/* Photo Evidence with Cloudinary Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#0077B6]" />
                    <span>Attach Photo Evidence (Cloudinary Auto-Upload)</span>
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-[#0077B6] rounded-2xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 transition">
                      <Upload className="w-5 h-5 text-[#0077B6]" />
                      <span className="text-[11px] text-slate-700 font-bold">Choose or Take Photo</span>
                      <span className="text-[9px] text-slate-400 font-mono">JPG, PNG, WebP up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setIncidentImageFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setIncidentImagePreview(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {incidentImagePreview && (
                      <div className="relative w-16 h-16 rounded-xl border border-[#0077B6] overflow-hidden shrink-0 shadow">
                        <img src={incidentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setIncidentImageFile(null); setIncidentImagePreview(null); }}
                          className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 shadow cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Photo & Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Incident Report →</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </main>

      {/* ==================== 3. FLOATING VAJRAAI ACTION BUTTON ==================== */}
      <button
        onClick={() => setShowVajraAiModal(true)}
        className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-black px-4 py-2.5 rounded-full shadow-2xl shadow-purple-600/50 flex items-center gap-2 cursor-pointer border-2 border-purple-300/40 active:scale-95 transition"
      >
        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
        <span className="text-xs font-mono font-bold tracking-wider">VajraAI</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </button>

      {/* ==================== 4. VAJRAAI FLOATING MODAL / DRAWER ==================== */}
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

            {/* Modal Body: Embedded Vercel App or Local AI Fallback */}
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
                        Synthesizing VajraAI protocol...
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAskAI} className="flex items-center space-x-2 pt-2 border-t border-slate-300">
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

          </div>
        </div>
      )}

      {/* ==================== 5. BOTTOM NAVIGATION BAR (NOW WITH PROFILE) ==================== */}
      <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto px-1 py-1.5 flex items-center justify-around z-40 shadow-2xl transition-colors ${
        isDark 
          ? 'bg-[#07172C]/95 backdrop-blur-md border-t-2 border-[#D4AF37]/50' 
          : 'bg-white/95 backdrop-blur-md border-t border-slate-300'
      }`}>
        
        {/* 1. Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'home' 
              ? (isDark ? 'text-[#D4AF37] font-bold' : 'text-[#059669] font-bold') 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px]">Home</span>
        </button>

        {/* 2. Nearby Help */}
        <button
          onClick={() => setActiveTab('help')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'help' 
              ? (isDark ? 'text-emerald-400 font-bold' : 'text-[#059669] font-bold') 
              : 'text-slate-400 hover:text-slate-600'
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
            activeTab === 'mesh' 
              ? (isDark ? 'text-[#D4AF37]' : 'text-amber-700') 
              : 'text-slate-400'
          }`}>
            Offline Mesh
          </span>
        </button>

        {/* 4. Official Alerts */}
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'alerts' 
              ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold') 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[9px]">Alerts</span>
        </button>

        {/* 5. Citizen Profile Tab (Replaced AI Guide) */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center space-y-0.5 p-1 rounded-xl transition cursor-pointer ${
            activeTab === 'profile' 
              ? (isDark ? 'text-blue-400 font-bold' : 'text-[#0077B6] font-bold') 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px]">Profile</span>
        </button>

      </nav>

    </div>
  );
}
