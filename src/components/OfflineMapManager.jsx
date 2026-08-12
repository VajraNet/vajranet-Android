import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Trash2, 
  HardDrive, 
  WifiOff, 
  Wifi, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Layers, 
  MapPin, 
  ShieldCheck 
} from 'lucide-react';
import { 
  PRESET_MAP_PACKS, 
  downloadTilePack, 
  getStorageStats, 
  clearOfflineMapData 
} from '../utils/offlineMapStorage';

export default function OfflineMapManager({ 
  isOpen, 
  onClose, 
  currentBounds, 
  isForceOffline, 
  onToggleForceOffline 
}) {
  const [stats, setStats] = useState({ tilesCount: 0, packs: [], estMB: '0.0' });
  const [downloadingPackId, setDownloadingPackId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen]);

  const refreshStats = async () => {
    const data = await getStorageStats();
    setStats(data);
  };

  const handleStartDownload = async (pack) => {
    const controller = new AbortController();
    setAbortController(controller);
    setDownloadingPackId(pack.id);
    setProgress({ total: 1, downloaded: 0, percent: 0, mb: '0.00' });
    setStatusMsg(`Downloading ${pack.name}...`);

    try {
      await downloadTilePack(
        pack.id,
        pack.bounds,
        pack.minZoom,
        pack.maxZoom,
        (prog) => setProgress(prog),
        controller.signal
      );
      setStatusMsg(`Successfully downloaded ${pack.name}!`);
      await refreshStats();
    } catch (err) {
      if (controller.signal.aborted) {
        setStatusMsg('Download cancelled.');
      } else {
        setStatusMsg('Download error. Please check network.');
      }
    } finally {
      setDownloadingPackId(null);
      setAbortController(null);
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const handleDownloadCurrentView = async () => {
    if (!currentBounds) {
      alert('Map bounds not ready. Please open the map first.');
      return;
    }
    const pack = {
      id: `custom-view-${Date.now()}`,
      name: 'Current Viewport Region',
      description: 'Map tiles covering your currently zoomed area (Zoom 11-16)',
      bounds: currentBounds,
      minZoom: 11,
      maxZoom: 16,
    };
    handleStartDownload(pack);
  };

  const handleCancelDownload = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all cached offline map tiles?')) {
      await clearOfflineMapData();
      await refreshStats();
      setStatusMsg('Offline map cache cleared.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl">
              <Download className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Offline Map Manager</h2>
              <p className="text-xs text-emerald-100/90">Download high-res map packs for zero-network disaster zones</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Status Message Notification */}
          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
              <span>{statusMsg}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          )}

          {/* Offline Mode Switch Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isForceOffline ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isForceOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isForceOffline ? 'Force Offline Mesh Mode' : 'Online Auto Mode'}
                </p>
                <p className="text-xs text-slate-500">
                  {isForceOffline ? 'Using ONLY cached offline map tiles & assets' : 'Fetches live online tiles with offline fallback'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleForceOffline}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                isForceOffline 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isForceOffline ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Storage Meter */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-teal-400" />
                IndexedDB Map Cache Storage
              </span>
              <span className="font-mono text-teal-300 font-bold">{stats.estMB} MB Used</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (parseFloat(stats.estMB) / 200) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{stats.tilesCount} Map Tiles Stored</span>
              <button 
                onClick={handleClearAll}
                className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Purge Cache
              </button>
            </div>
          </div>

          {/* Active Download Progress */}
          {downloadingPackId && progress && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  Downloading Tiles ({progress.downloaded} / {progress.total})
                </span>
                <span className="font-mono text-emerald-700">{progress.percent}% ({progress.mb} MB)</span>
              </div>
              <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleCancelDownload}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                >
                  Cancel Download
                </button>
              </div>
            </div>
          )}

          {/* Quick Viewport Download */}
          <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-teal-700 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-teal-900">Download Current Screen View</h4>
                <p className="text-[11px] text-teal-700">Cache all map tiles in your visible area</p>
              </div>
            </div>
            <button
              onClick={handleDownloadCurrentView}
              disabled={!!downloadingPackId}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Save Area
            </button>
          </div>

          {/* Preset Region Packs */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Regional Offline Map Packs
            </h3>
            <div className="space-y-2.5">
              {PRESET_MAP_PACKS.map((pack) => {
                const isDownloaded = stats.packs.some(p => p.id === pack.id);
                return (
                  <div 
                    key={pack.id} 
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 transition flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-800">{pack.name}</h4>
                        {isDownloaded && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Downloaded
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{pack.description}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Est. Size: {pack.estimatedMB}</p>
                    </div>

                    <button
                      onClick={() => handleStartDownload(pack)}
                      disabled={!!downloadingPackId}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                        isDownloaded 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" /> 
                      {isDownloaded ? 'Re-Download' : 'Download'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
