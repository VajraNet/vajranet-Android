import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  RefreshCw, 
  LogOut, 
  ArrowLeft 
} from 'lucide-react';
import { apiFetch } from '../api/client';
import { Capacitor, registerPlugin } from '@capacitor/core';
import LoginPage from './LoginPage';
import DownloadAppPage from './DownloadAppPage';
import MapView from './MapView';
import { getOrCreateVajraId } from '../utils/vajraId';

// Modular 5 Tab Sections
import HomeTab from './tabs/HomeTab';
import NearbyTab from './tabs/NearbyTab';
import MeshTab from './tabs/MeshTab';
import AlertsTab from './tabs/AlertsTab';
import ProfileTab from './tabs/ProfileTab';

// Navigation & Modals
import BottomNavBar from './navigation/BottomNavBar';
import ReportHazardModal from './modals/ReportHazardModal';
import VajraAiModal from './modals/VajraAiModal';

const NearbyConnections = registerPlugin('NearbyConnectionsPlugin');

export default function CitizenApp() {
  // Maintenance / Showcase Mode for Web Deployments
  const [bypassDownloadPage, setBypassDownloadPage] = useState(true);
  const isWeb = !Capacitor.isNativePlatform();
  const isDownloadPageActive = Boolean(
    isWeb && 
    !bypassDownloadPage &&
    (import.meta.env.VITE_MAINTENANCE_MODE === 'true' || import.meta.env.VITE_SHOW_DOWNLOAD_PAGE === 'true')
  );

  // User state (Persisted in localStorage, defaults to Guest Citizen)
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vajranet_citizen_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaultUser = { name: 'Citizen Guest', phone: '9876543210', isGuest: true, vajraId: 'VAJRA-778912' };
    try {
      localStorage.setItem('vajranet_citizen_user', JSON.stringify(defaultUser));
    } catch (e) {}
    return defaultUser;
  });

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

  // 5 Main Navigation Tabs: 'home' | 'help' | 'mesh' | 'alerts' | 'profile'
  // Secondary Views: 'map' | 'report'
  const [activeTab, setActiveTab] = useState('home');
  const [focusedMapLocation, setFocusedMapLocation] = useState(null);
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

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'National Disaster Helpline', phone: '112', relationship: 'NDRF / Police' },
    { name: 'Disaster Management Control', phone: '1078', relationship: 'Emergency Operations' },
    { name: 'Ambulance & Trauma', phone: '108', relationship: 'Medical First Response' }
  ]);

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
  const [shelters, setShelters] = useState([
    { id: 'SH-1', name: 'Sector 4 Indoor Stadium Relief Camp', address: 'Sports Complex, Sector 4', capacity: 800, available_capacity: 340, status: 'OPEN', distance_km: 0.8, lat: 12.9750, lng: 77.5900 },
    { id: 'SH-2', name: 'Model High School Shelter', address: 'Station Road, Gate 1', capacity: 400, available_capacity: 20, status: 'OPEN', distance_km: 1.4, lat: 12.9680, lng: 77.6010 }
  ]);
  const [hospitals, setHospitals] = useState([
    { id: 'HOSP-1', name: 'Apex Trauma & Emergency Hospital', address: 'Ring Road, Sector 7', available_beds: 42, icu_available: 8, emergency_available: true, distance_km: 1.2, lat: 12.9780, lng: 77.5980 },
    { id: 'HOSP-2', name: 'Red Cross Field Hospital', address: 'Naval Dock Gate 3', available_beds: 28, icu_available: 4, emergency_available: true, distance_km: 2.1, lat: 12.9650, lng: 77.5890 }
  ]);
  const [reliefCenters, setReliefCenters] = useState([
    { id: 'RC-1', name: 'VajraNet Central Ration & Water Depot', address: 'Community Hall Block B', supplies: { food: 'Available', water: 'Available', medicine: 'Limited', blankets: 'Available' }, distance_km: 0.9, lat: 12.9720, lng: 77.5930 }
  ]);
  const [sosAlerts, setSosAlerts] = useState([
    { id: 'SOS-1', title: 'Distress Signal', details: 'Flood evacuation help requested', lat: 12.9710, lng: 77.5960, severity: 'CRITICAL' }
  ]);
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
      if (res && res.accepted) {
        const acceptedIds = new Set(res.accepted);
        const remaining = currentQ.filter(item => !acceptedIds.has(item.message_id));
        saveQueue(remaining);
      }
    } catch (err) {
      console.warn('Gateway mesh sync delayed:', err);
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
      meshBus.onmessage = (e) => {
        if (e.data && e.data.type === 'NEARBY_PAYLOAD') {
          const payload = e.data.payload;
          if (payload && (payload.type === 'SOS' || payload.type === 'SOS_BEACON')) {
            const distressItem = {
              id: `LIVE-SOS-${Date.now()}`,
              title: `🚨 LIVE DISTRESS: ${payload.sender_name || 'Nearby Citizen'} (${payload.sender_id || 'MESH-NODE'})`,
              content: `Coordinates: ${payload.latitude || '28.6139'}, ${payload.longitude || '77.2090'} | Priority: ${payload.severity || 'CRITICAL'} | Note: ${payload.notes || payload.text || 'Immediate rescue required'}`,
              severity: 'CRITICAL',
              created_at: new Date().toISOString(),
              isLiveSos: true
            };
            setAnnouncements(prev => [distressItem, ...prev]);
          }
        }
      };
    } catch (err) {
      console.log('BroadcastChannel not available on this platform', err);
    }

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
      const hp = await apiFetch(`/resources/hospitals?latitude=${gpsCoords.lat}&longitude=${gpsCoords.lon}`);
      if (Array.isArray(hp)) setHospitals(hp);
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
        { id: 'RC-1', name: 'VajraNet Central Ration & Water Depot', address: 'Community Hall Block B', distance_km: 0.9 }
      ]);
    }

    // Unified 3-way Alert Feed
    try {
      const [annRes, incRes, sosRes] = await Promise.allSettled([
        apiFetch('/announcements'),
        apiFetch('/incidents'),
        apiFetch('/sos')
      ]);

      const mergedAlerts = [];

      if (sosRes.status === 'fulfilled' && Array.isArray(sosRes.value)) {
        sosRes.value.forEach(s => {
          mergedAlerts.push({
            id: `SOS-${s.id}`,
            title: `🚨 CITIZEN DISTRESS: ${s.user_name || s.origin_device_id || 'Anonymous Citizen'}`,
            content: `Location: ${s.latitude || gpsCoords.lat}, ${s.longitude || gpsCoords.lon} | Priority: ${s.severity || 'CRITICAL'} | Message: ${s.message || 'Immediate help required'}`,
            severity: s.severity || 'CRITICAL',
            created_at: s.created_at || new Date().toISOString(),
            isLiveSos: true
          });
        });
      }

      if (annRes.status === 'fulfilled' && Array.isArray(annRes.value)) {
        mergedAlerts.push(...annRes.value);
      }

      if (incRes.status === 'fulfilled' && Array.isArray(incRes.value)) {
        incRes.value.forEach(inc => {
          mergedAlerts.push({
            id: `INC-${inc.id}`,
            title: `⚠️ ${inc.type || 'HAZARD'}: ${inc.title}`,
            content: `${inc.description || 'Ground hazard verified.'} (Status: ${inc.status})`,
            severity: inc.severity || 'HIGH',
            created_at: inc.created_at || new Date().toISOString(),
            media_urls: inc.media_urls || (inc.image_url ? [inc.image_url] : [])
          });
        });
      }

      if (mergedAlerts.length > 0) {
        setAnnouncements(mergedAlerts);
      } else {
        setAnnouncements([
          { id: 'ANN-1', title: 'NDRF High Tide & Heavy Rainfall Alert', content: 'Coastal evacuation protocols active in Zone 3. Move to elevated shelters immediately.', severity: 'CRITICAL' }
        ]);
      }
    } catch {
      setAnnouncements([
        { id: 'ANN-1', title: 'NDRF High Tide & Heavy Rainfall Alert', content: 'Coastal evacuation protocols active in Zone 3. Move to elevated shelters immediately.', severity: 'CRITICAL' }
      ]);
    }
  };

  const handleSendSOS = async () => {
    setSosSubmitting(true);
    const msgId = `SOS-${Date.now()}`;
    const payload = {
      message_id: msgId,
      user_id: user?.vajra_id || localStorage.getItem('vajranet_user_permanent_id') || 'CITIZEN-NODE',
      latitude: gpsCoords.lat,
      longitude: gpsCoords.lon,
      severity: sosType,
      message: sosNotes.trim() || `EMERGENCY SOS: Citizen needs immediate rescue. Priority: ${sosType}`
    };

    // Dual Transmission: REST Cloud API + Native P2P Mesh Broadcast
    try {
      const res = await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setAssignedSosId(res?.id || `SOS-${Math.floor(100 + Math.random() * 900)}`);
      setSosStatus('RECEIVED');
      setSosSent(true);
    } catch (err) {
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

  const handleOpenSmsApp = () => {
    try {
      let trustedPhones = [];
      try {
        const cached = localStorage.getItem('vajranet_trusted_phones');
        if (cached) trustedPhones = JSON.parse(cached);
      } catch (e) {}

      const targetNumber = trustedPhones.length > 0 ? trustedPhones[0].phone : (emergencyContacts[0]?.phone || '112');
      const mapUrl = `https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lon}`;
      const smsContent = `🚨 VAJRANET EMERGENCY SOS\nFrom: ${user?.name || 'Citizen'}\nUrgency: ${sosType}\nGPS: ${gpsCoords.lat}, ${gpsCoords.lon}\nMap: ${mapUrl}\nNotes: ${sosNotes.trim() || 'Immediate disaster dispatch requested.'}`;
      
      window.location.href = `sms:${targetNumber}?body=${encodeURIComponent(smsContent)}`;
    } catch (e) {
      console.warn('Failed to open SMS app:', e);
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
      media_urls: uploadedUrl ? [uploadedUrl] : []
    };

    try {
      await apiFetch('/incidents', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setIncidentSubmitted(true);
      setIncidentTitle('');
      setIncidentDesc('');
      setIncidentImageFile(null);
      setIncidentImagePreview(null);
      loadResources();
    } catch (err) {
      const offlineEvent = {
        message_id: msgId,
        type: 'INCIDENT',
        created_at: new Date().toISOString(),
        origin_device_id: user?.vajra_id || localStorage.getItem('vajranet_user_permanent_id') || 'CITIZEN-NODE',
        payload: payload
      };
      saveQueue([...offlineQueue, offlineEvent]);
      setIncidentSubmitted(true);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSendAiQuery = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userQ = aiPrompt;
    setAiMessages(prev => [...prev, { sender: 'user', text: userQ }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await apiFetch('/ai/query', {
        method: 'POST',
        body: JSON.stringify({
          prompt: userQ,
          latitude: gpsCoords.lat,
          longitude: gpsCoords.lon
        })
      });
      setAiMessages(prev => [
        ...prev, 
        { sender: 'ai', text: res.response || res.answer || 'Follow standard disaster precautions.' }
      ]);
    } catch {
      setAiMessages(prev => [
        ...prev, 
        { sender: 'ai', text: 'Offline Protocol Engine: Seek higher concrete ground immediately. Avoid standing water. Keep your device on battery saver mode and remain connected to the VajraNet mesh.' }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const isDark = theme === 'dark';

  if (!user) {
    return <LoginPage onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  if (isDownloadPageActive) {
    return (
      <DownloadAppPage 
        onBypassWeb={() => setBypassDownloadPage(true)} 
        defaultApkUrl="/vajranet-citizen.apk" 
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between max-w-md mx-auto relative antialiased select-none shadow-2xl transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-b from-[#07172C] via-[#0B2545] to-[#07172C] text-slate-100' 
        : 'bg-slate-100 text-slate-800'
    }`}>
      
      {/* ==================== 1. COMPACT TOP STATUS HEADER ==================== */}
      <header className={`px-4 py-3 sticky top-0 z-40 flex items-center justify-between border-b transition-colors ${
        isDark 
          ? 'bg-[#07172C]/95 backdrop-blur-md border-[#D4AF37]/30 text-white' 
          : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900'
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
      <main className={`flex-1 overflow-y-auto ${activeTab === 'map' ? 'p-1 pb-20' : 'p-4 pb-24 space-y-4'}`}>
        
        {/* TAB 1: HOME SECTION */}
        {activeTab === 'home' && (
          <HomeTab
            isDark={isDark}
            isOnline={isOnline}
            gpsCoords={gpsCoords}
            announcements={announcements}
            sosSent={sosSent}
            sosSubmitting={sosSubmitting}
            sosType={sosType}
            setSosType={setSosType}
            assignedSosId={assignedSosId}
            handleSendSOS={handleSendSOS}
            handleOpenSmsApp={handleOpenSmsApp}
            setActiveTab={setActiveTab}
          />
        )}

        {/* TAB 2: NEARBY HELP SECTION */}
        {activeTab === 'help' && (
          <NearbyTab
            isDark={isDark}
            loadResources={loadResources}
            helpSubTab={helpSubTab}
            setHelpSubTab={setHelpSubTab}
            shelters={shelters}
            hospitals={hospitals}
            reliefCenters={reliefCenters}
            setActiveTab={setActiveTab}
            setFocusedMapLocation={setFocusedMapLocation}
          />
        )}

        {/* TAB 3: OFFLINE MESH (CENTER TAB - UNTOUCHED NATIVE KOTLIN CORE) */}
        {activeTab === 'mesh' && (
          <MeshTab
            user={user}
            gpsCoords={gpsCoords}
            handleSendSOS={handleSendSOS}
          />
        )}

        {/* TAB 4: CITIZEN ALERTS & DISASTER BROADCASTS */}
        {activeTab === 'alerts' && (
          <AlertsTab
            isDark={isDark}
            announcements={announcements}
          />
        )}

        {/* TAB 5: CITIZEN PROFILE TAB */}
        {activeTab === 'profile' && (
          <ProfileTab
            isDark={isDark}
            user={user}
            setUser={setUser}
            isOnline={isOnline}
            gpsCoords={gpsCoords}
            offlineQueue={offlineQueue}
          />
        )}

        {/* SUB-VIEW: REPORT DISASTER INCIDENT MODAL */}
        {activeTab === 'report' && (
          <ReportHazardModal
            isDark={isDark}
            setActiveTab={setActiveTab}
            incidentSubmitted={incidentSubmitted}
            setIncidentSubmitted={setIncidentSubmitted}
            handleReportIncident={handleReportIncident}
            incidentTitle={incidentTitle}
            setIncidentTitle={setIncidentTitle}
            incidentType={incidentType}
            setIncidentType={setIncidentType}
            incidentDesc={incidentDesc}
            setIncidentDesc={setIncidentDesc}
            incidentSeverity={incidentSeverity}
            setIncidentSeverity={setIncidentSeverity}
            incidentImageFile={incidentImageFile}
            setIncidentImageFile={setIncidentImageFile}
            incidentImagePreview={incidentImagePreview}
            setIncidentImagePreview={setIncidentImagePreview}
            isUploadingImage={isUploadingImage}
            gpsCoords={gpsCoords}
          />
        )}

        {/* SUB-VIEW: INTERACTIVE LEAFLET DISASTER MAP */}
        {activeTab === 'map' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pt-1">
              <button 
                onClick={() => setActiveTab('help')}
                className={`text-xs font-bold font-mono flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                  isDark ? 'bg-[#0B2545] border-[#D4AF37]/50 text-[#D4AF37]' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Resources
              </button>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                Live Geographic Grid
              </span>
            </div>
            <div className="h-[75vh] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
              <MapView 
                shelters={shelters} 
                hospitals={hospitals} 
                reliefCenters={reliefCenters} 
                sosAlerts={sosAlerts} 
                userLocation={gpsCoords}
                initialFocusLocation={focusedMapLocation}
              />
            </div>
          </div>
        )}

      </main>

      {/* ==================== 3. FLOATING VAJRAAI ACTION BUTTON & MODAL ==================== */}
      <VajraAiModal
        showVajraAiModal={showVajraAiModal}
        setShowVajraAiModal={setShowVajraAiModal}
        useVercelIframe={useVercelIframe}
        setUseVercelIframe={setUseVercelIframe}
        aiMessages={aiMessages}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        aiLoading={aiLoading}
        handleSendAiQuery={handleSendAiQuery}
      />

      {/* ==================== 4. 5-TAB BOTTOM NAVIGATION BAR ==================== */}
      <BottomNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
      />

    </div>
  );
}
