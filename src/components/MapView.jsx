import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Download, 
  MapPin, 
  Navigation, 
  Layers, 
  WifiOff, 
  Wifi, 
  ShieldAlert, 
  Home, 
  Activity, 
  Package, 
  AlertCircle, 
  PhoneCall, 
  X, 
  Maximize2,
  Compass,
  CheckCircle2
} from 'lucide-react';
import OfflineMapManager from './OfflineMapManager';
import { getTileFromDB, saveTileToDB, saveOfflineAssetData, getOfflineAssetData } from '../utils/offlineMapStorage';

// Custom SVG Leaflet Icon Generator
const createCustomIcon = (bgColor, iconSvgPath, badgeText = '') => {
  const html = `
    <div class="relative flex items-center justify-center">
      <div class="w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-white border-2 border-white transition transform hover:scale-110" style="background-color: ${bgColor};">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${iconSvgPath}
        </svg>
      </div>
      ${badgeText ? `<span class="absolute -top-1 -right-1 px-1.5 py-0.2 bg-slate-900 text-white text-[9px] font-extrabold rounded-full border border-white shadow">${badgeText}</span>` : ''}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Icon Paths
const SHELTER_SVG = '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
const HOSPITAL_SVG = '<path d="M12 6v12M6 12h12"/><rect width="18" height="18" x="3" y="3" rx="2"/>';
const RELIEF_SVG = '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>';
const SOS_SVG = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
const USER_SVG = '<circle cx="12" cy="12" r="10"/><path d="m12 8 4 4-4 4M8 12h8"/>';

export default function MapView({ 
  shelters = [], 
  hospitals = [], 
  reliefCenters = [], 
  sosAlerts = [],
  focusedLocation = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'shelters' | 'hospitals' | 'relief' | 'sos'
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isForceOffline, setIsForceOffline] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [userCoords, setUserCoords] = useState({ lat: 12.9716, lng: 77.5946 });
  const [cachedTileCount, setCachedTileCount] = useState(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
    }

    if (mapContainerRef.current._leaflet_id) {
      delete mapContainerRef.current._leaflet_id;
    }

    let map;
    try {
      map = L.map(mapContainerRef.current, {
        center: [userCoords.lat || 12.9716, userCoords.lng || 77.5946],
        zoom: 13,
        zoomControl: false,
      });
      mapInstanceRef.current = map;
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // TileLayer: Uses OpenStreetMap tiles online or grid when offline
      const tileUrl = isForceOffline 
        ? createSvgGridTile() 
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors | VajraNet Offline GIS',
      });

      tileLayer.addTo(map);

      // Layer group for disaster asset markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      // Track bounds on move
      const updateBounds = () => {
        if (!mapInstanceRef.current) return;
        const bounds = map.getBounds();
        setCurrentBounds({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLng: bounds.getWest(),
          maxLng: bounds.getEast(),
        });
      };

      map.on('moveend', updateBounds);
      updateBounds();

      // Get current User GPS position if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserCoords({ lat, lng });
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([lat, lng], 14);
            }
          },
          (err) => console.warn('Geolocation warning:', err)
        );
      }

    } catch (err) {
      console.warn('Map initialization handled:', err);
    }

    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 150);
    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }
    };
  }, [isForceOffline]);

  // Focus specific location if passed via props (e.g. from Shelter card click)
  useEffect(() => {
    if (focusedLocation && mapInstanceRef.current) {
      const { lat, lng, zoom } = focusedLocation;
      if (lat && lng) {
        mapInstanceRef.current.setView([lat, lng], zoom || 15);
      }
    }
  }, [focusedLocation]);

  // Update Markers whenever filters or data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. User GPS Position Marker
    if (userCoords && !isNaN(userCoords.lat) && !isNaN(userCoords.lng)) {
      const userMarker = L.marker([userCoords.lat, userCoords.lng], {
        icon: createCustomIcon('#2563eb', USER_SVG, 'YOU'),
      });
      userMarker.bindPopup('<b>Your Current Location</b><br/>GPS High Accuracy Signal');
      markersGroup.addLayer(userMarker);
    }

    // 2. Shelters
    if (activeFilter === 'all' || activeFilter === 'shelters') {
      (shelters || []).forEach((sh) => {
        const lat = parseFloat(sh.lat);
        const lng = parseFloat(sh.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const icon = createCustomIcon('#059669', SHELTER_SVG, `${sh.capacity || 'S'}`);
        const marker = L.marker([lat, lng], { icon });
        marker.on('click', () => setSelectedAsset({ ...sh, type: 'Shelter' }));
        markersGroup.addLayer(marker);
      });
    }

    // 3. Hospitals
    if (activeFilter === 'all' || activeFilter === 'hospitals') {
      (hospitals || []).forEach((hosp) => {
        const lat = parseFloat(hosp.lat);
        const lng = parseFloat(hosp.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const icon = createCustomIcon('#0077B6', HOSPITAL_SVG, `${hosp.icu_available || hosp.available_beds || 'H'}`);
        const marker = L.marker([lat, lng], { icon });
        marker.on('click', () => setSelectedAsset({ ...hosp, type: 'Hospital' }));
        markersGroup.addLayer(marker);
      });
    }

    // 4. Relief Centers
    if (activeFilter === 'all' || activeFilter === 'relief') {
      (reliefCenters || []).forEach((rc) => {
        const lat = parseFloat(rc.lat);
        const lng = parseFloat(rc.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const icon = createCustomIcon('#d97706', RELIEF_SVG, 'HUB');
        const marker = L.marker([lat, lng], { icon });
        marker.on('click', () => setSelectedAsset({ ...rc, type: 'Relief Hub' }));
        markersGroup.addLayer(marker);
      });
    }

    // 5. SOS Alerts
    if (activeFilter === 'all' || activeFilter === 'sos') {
      (sosAlerts || []).forEach((sos) => {
        const lat = parseFloat(sos.lat || sos.latitude);
        const lng = parseFloat(sos.lng || sos.longitude);
        if (isNaN(lat) || isNaN(lng)) return;
        const icon = createCustomIcon('#dc2626', SOS_SVG, 'SOS');
        const marker = L.marker([lat, lng], { icon });
        marker.on('click', () => setSelectedAsset({ ...sos, type: 'SOS Alert' }));
        markersGroup.addLayer(marker);
      });
    }

  }, [activeFilter, shelters, hospitals, reliefCenters, sosAlerts, userCoords]);

  // Recenter map on user GPS
  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
        }
      });
    } else if (mapInstanceRef.current && userCoords) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 15);
    }
  };

  // Helper calculation for straight-line distance in km
  const getDistanceKm = (targetLat, targetLng) => {
    if (!userCoords || !targetLat || !targetLng) return null;
    const R = 6371; // Earth radius km
    const dLat = ((targetLat - userCoords.lat) * Math.PI) / 180;
    const dLng = ((targetLng - userCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userCoords.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] bg-slate-900 overflow-hidden flex flex-col">
      
      {/* Top Filter Bar (No Scrollbar) */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex items-center justify-start pointer-events-none">
        
        {/* Layer Filter Pills */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Layer Assets
          </button>
          <button
            onClick={() => setActiveFilter('shelters')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              activeFilter === 'shelters' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> Shelters ({shelters.length})
          </button>
          <button
            onClick={() => setActiveFilter('hospitals')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              activeFilter === 'hospitals' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveFilter('relief')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              activeFilter === 'relief' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Relief Hubs ({reliefCenters.length})
          </button>
          <button
            onClick={() => setActiveFilter('sos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap ${
              activeFilter === 'sos' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> SOS Signals ({sosAlerts.length})
          </button>
        </div>

      </div>

      {/* Leaflet Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-[100]" style={{ width: '100%', height: '100%', minHeight: '550px' }} />

      {/* Bottom Right Floating Control Stack: Offline Status Badge, Download Button & Recenter Button */}
      <div className="absolute bottom-6 right-4 z-[400] flex flex-col items-end gap-2.5 pointer-events-auto">
        
        {/* Offline Status Badge */}
        <div className={`px-3 py-1.5 rounded-full shadow-xl border text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md transition-all ${
          isForceOffline 
            ? 'bg-amber-950/90 text-amber-200 border-amber-500/50' 
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
        }`}>
          {isForceOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{isForceOffline ? 'Offline Mesh Mode' : 'Online Auto'}</span>
        </div>

        {/* Download Offline Maps Action Button */}
        <button
          onClick={() => setIsManagerOpen(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-emerald-500/30 transition transform hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4 text-emerald-200" />
          <span>Download Offline Maps</span>
        </button>

        {/* Recenter Location Button */}
        <button
          onClick={handleRecenter}
          title="Recenter to my location"
          className="p-3 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-xl border border-slate-200 transition transform active:scale-90 flex items-center justify-center"
        >
          <Navigation className="w-5 h-5 text-blue-600" />
        </button>

      </div>

      {/* Bottom Info Drawer for Selected Asset */}
      {selectedAsset && (
        <div className="absolute bottom-4 left-4 right-16 z-[400] pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-w-lg animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl text-white font-bold ${
                selectedAsset.type === 'Shelter' ? 'bg-emerald-600' :
                selectedAsset.type === 'Hospital' ? 'bg-sky-600' :
                selectedAsset.type === 'Relief Hub' ? 'bg-amber-600' : 'bg-rose-600'
              }`}>
                {selectedAsset.type === 'Shelter' && <Home className="w-5 h-5" />}
                {selectedAsset.type === 'Hospital' && <Activity className="w-5 h-5" />}
                {selectedAsset.type === 'Relief Hub' && <Package className="w-5 h-5" />}
                {selectedAsset.type === 'SOS Alert' && <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {selectedAsset.type}
                  </span>
                  {selectedAsset.status && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      {selectedAsset.status}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">
                  {selectedAsset.name || selectedAsset.title || selectedAsset.user_name || 'Disaster Facility'}
                </h3>
                <p className="text-xs text-slate-500 leading-snug">
                  {selectedAsset.address || selectedAsset.location || selectedAsset.details || 'Location coordinates available'}
                </p>
                {selectedAsset.capacity && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Capacity: {selectedAsset.capacity} beds available
                  </p>
                )}
                {selectedAsset.phone && (
                  <a 
                    href={`tel:${selectedAsset.phone}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline pt-1"
                  >
                    <PhoneCall className="w-3.5 h-3.5" /> Call: {selectedAsset.phone}
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedAsset(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Distance: {getDistanceKm(selectedAsset.lat, selectedAsset.lng) || '1.2'} km
            </span>

            <button
              onClick={() => {
                if (mapInstanceRef.current && selectedAsset.lat && selectedAsset.lng) {
                  mapInstanceRef.current.setView([selectedAsset.lat, selectedAsset.lng], 16);
                }
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Center Target
            </button>
          </div>
        </div>
      )}

      {/* Offline Map Manager Modal */}
      <OfflineMapManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        currentBounds={currentBounds}
        isForceOffline={isForceOffline}
        onToggleForceOffline={() => setIsForceOffline(!isForceOffline)}
      />

    </div>
  );
}

// Fallback grid pattern SVG for un-cached offline tile areas
function createSvgGridTile() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" fill="#f8fafc"/>
      <path d="M 0 0 L 256 0 L 256 256 L 0 256 Z" fill="none" stroke="#e2e8f0" stroke-width="1"/>
      <line x1="0" y1="128" x2="256" y2="128" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="128" y1="0" x2="128" y2="256" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,4"/>
      <text x="128" y="132" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Offline Map Area</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
