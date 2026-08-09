import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  RefreshCw, 
  AlertTriangle, 
  Send, 
  MessageSquare, 
  X, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

// WebSocket URL — connects to the VajraNet backend mesh relay
const WS_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://vajranet-backend.onrender.com/api/v1')
  .replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'))
  .replace('/api/v1', '');

// Fallback to localhost in dev
const getWsUrl = (deviceId) => {
  try {
    const base = import.meta.env.VITE_WS_URL || WS_BASE || 'ws://127.0.0.1:8000';
    return `${base}/api/v1/mesh/ws/${deviceId}`;
  } catch {
    return `ws://127.0.0.1:8000/api/v1/mesh/ws/${deviceId}`;
  }
};

export default function MeshChat({ user, gpsCoords, onTriggerSOS }) {
  const [myDeviceId] = useState(() => {
    try {
      let savedId = localStorage.getItem('vajranet_device_id');
      if (!savedId) {
        savedId = `VAJRA-${Math.floor(10000 + Math.random() * 900000)}`;
        localStorage.setItem('vajranet_device_id', savedId);
      }
      return savedId;
    } catch {
      return `VAJRA-${Math.floor(10000 + Math.random() * 900000)}`;
    }
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsState, setWsState] = useState('DISCONNECTED'); // DISCONNECTED | CONNECTING | CONNECTED | ERROR
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [peerMessageText, setPeerMessageText] = useState('');
  const [peerChatLogs, setPeerChatLogs] = useState({});
  const [sosSentBanner, setSosSentBanner] = useState(false);
  const [peers, setPeers] = useState([]);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // ── WebSocket connect/reconnect logic ──────────────────────────────────────
  const connect = () => {
    if (wsRef.current && wsRef.current.readyState < 2) return; // already open/connecting

    const url = getWsUrl(myDeviceId);
    setWsState('CONNECTING');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('CONNECTED');
      setReconnectCount(0);

      // Announce presence
      ws.send(JSON.stringify({
        type: 'JOIN',
        name: user?.name || 'Citizen',
        role: user?.isGuest ? 'Citizen Guest' : 'Citizen',
        lat: gpsCoords?.lat,
        lon: gpsCoords?.lon,
      }));

      // Keepalive ping every 25s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.warn('[MeshRelay] Invalid message', e);
      }
    };

    ws.onclose = (ev) => {
      setWsState('DISCONNECTED');
      clearInterval(pingIntervalRef.current);

      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
      reconnectTimerRef.current = setTimeout(() => {
        setReconnectCount((c) => c + 1);
        connect();
      }, delay);
    };

    ws.onerror = () => {
      setWsState('ERROR');
    };
  };

  const handleServerMessage = (msg) => {
    switch (msg.type) {
      case 'PEER_LIST':
        setPeers(msg.peers || []);
        break;

      case 'PEER_JOINED':
        if (msg.peer && msg.peer.id !== myDeviceId) {
          setPeers((prev) => {
            const exists = prev.some((p) => p.id === msg.peer.id);
            if (exists) return prev.map((p) => p.id === msg.peer.id ? { ...p, ...msg.peer } : p);
            return [...prev, msg.peer];
          });
        }
        break;

      case 'PEER_LEFT':
        setPeers((prev) => prev.filter((p) => p.id !== msg.device_id));
        // Close chat if the selected peer left
        setSelectedPeer((cur) => (cur && cur.id === msg.device_id ? null : cur));
        break;

      case 'MESSAGE':
        setPeerChatLogs((prev) => ({
          ...prev,
          [msg.from_id]: [
            ...(prev[msg.from_id] || []),
            {
              id: `msg-${Date.now()}`,
              sender: msg.from_name || msg.from_id,
              text: msg.text,
              time: new Date(msg.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: false,
            },
          ],
        }));
        break;

      case 'BROADCAST':
        // Show broadcast in all chat windows
        setPeerChatLogs((prev) => {
          const updated = { ...prev };
          if (!updated[msg.from_id]) updated[msg.from_id] = [];
          updated[msg.from_id] = [...updated[msg.from_id], {
            id: `bcast-${Date.now()}`,
            sender: msg.from_name || msg.from_id,
            text: `📢 ${msg.text}`,
            time: new Date(msg.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: false,
          }];
          return updated;
        });
        break;

      case 'SOS':
        // Flash SOS banner from peer
        setSosSentBanner(true);
        setTimeout(() => setSosSentBanner(false), 6000);
        break;

      case 'PONG':
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); connect(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connect
    connect();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sendWs = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  };

  const isDenseArea = peers.length > 5;

  const handleScanRadar = () => {
    setIsScanning(true);
    if (wsState !== 'CONNECTED') {
      connect();
    } else {
      sendWs({ type: 'JOIN', name: user?.name || 'Citizen', role: 'Citizen', lat: gpsCoords?.lat, lon: gpsCoords?.lon });
    }
    setTimeout(() => setIsScanning(false), 1500);
  };

  const handleTriggerMeshSOS = () => {
    if (onTriggerSOS) onTriggerSOS();
    setSosSentBanner(true);
    setTimeout(() => setSosSentBanner(false), 5000);

    sendWs({
      type: 'SOS',
      lat: gpsCoords?.lat,
      lon: gpsCoords?.lon,
      severity: 'CRITICAL',
    });
  };

  const handleSendPeerMessage = (e) => {
    e.preventDefault();
    if (!peerMessageText.trim() || !selectedPeer) return;

    const text = peerMessageText.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistically add to my chat log
    setPeerChatLogs((prev) => ({
      ...prev,
      [selectedPeer.id]: [
        ...(prev[selectedPeer.id] || []),
        { id: `msg-${Date.now()}`, sender: user?.name || 'You', text, time: now, isMe: true },
      ],
    }));

    sendWs({ type: 'MESSAGE', target_id: selectedPeer.id, text });
    setPeerMessageText('');
  };

  // ── WS Status label / color ────────────────────────────────────────────────
  const wsStatusConfig = {
    CONNECTED:    { label: '🟢 Mesh Connected',   cls: 'bg-emerald-50 text-[#059669] border-emerald-300' },
    CONNECTING:   { label: '🟡 Connecting...',     cls: 'bg-amber-50 text-amber-700 border-amber-300' },
    DISCONNECTED: { label: '🟠 Reconnecting...',   cls: 'bg-amber-50 text-amber-700 border-amber-300' },
    ERROR:        { label: '🔴 Relay Unavailable', cls: 'bg-red-50 text-red-700 border-red-300' },
  }[wsState] || { label: '⚪ Unknown', cls: 'bg-slate-50 text-slate-600 border-slate-300' };

  return (
    <div className="space-y-4 font-sans select-none pb-4">
      
      {/* ===================== CONTROL PANEL ===================== */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
        
        {/* Device ID + WS Status Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-md">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono font-bold block">MY VAJRANET NODE</span>
              <h3 className="text-sm font-black text-slate-900 font-mono tracking-wider">{myDeviceId}</h3>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border shadow-sm ${wsStatusConfig.cls}`}>
            {wsState === 'CONNECTED'
              ? <Wifi className="w-3 h-3" />
              : <WifiOff className="w-3 h-3 animate-pulse" />}
            <span>{wsStatusConfig.label}</span>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
          <span>
            {wsState === 'CONNECTED'
              ? `Real-time P2P relay via VajraNet backend. ${peers.length} peer${peers.length !== 1 ? 's' : ''} online.`
              : 'Connecting to VajraNet mesh relay server...'}
          </span>
        </div>

        {sosSentBanner && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>🚨 SOS Beacon transmitted to all connected mesh peers!</span>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleScanRadar}
            disabled={isScanning}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0077B6] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : wsState !== 'CONNECTED' ? 'Reconnect' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleTriggerMeshSOS}
            className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Mesh SOS</span>
          </button>
        </div>
      </div>

      {/* ===================== PEER LIST ===================== */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
        
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">📡 Live Mesh Peers</h2>
              <span className="text-[10px] bg-blue-100 text-[#0077B6] border border-blue-300 px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap">
                {peers.length} Online
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              All devices connected to the VajraNet relay. Tap to open a direct channel.
            </p>
          </div>

          <span className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border whitespace-nowrap inline-flex items-center shadow-sm ${
            isDenseArea ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {isDenseArea ? '⚡ Max 3 Hops' : '⚡ Direct (1 Hop)'}
          </span>
        </div>

        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {wsState === 'CONNECTING' || wsState === 'DISCONNECTED' ? (
            <div className="py-10 text-center text-xs font-mono space-y-3">
              <Radio className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
              <p className="text-slate-600 font-semibold">Connecting to VajraNet Mesh Relay...</p>
              <p className="text-[10px] text-slate-400">
                Establishing WebSocket link to backend. This may take a few seconds.
              </p>
            </div>
          ) : peers.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono space-y-3">
              <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
              <p className="text-slate-500 font-semibold">No other devices connected yet</p>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                You are connected to the relay. Other devices with the app open will appear here automatically when they come online.
              </p>
              <button
                onClick={handleScanRadar}
                className="mt-1 px-4 py-2 bg-[#0B2545] text-[#D4AF37] border border-[#D4AF37]/60 rounded-xl text-xs font-bold font-mono cursor-pointer"
              >
                Refresh Peer List
              </button>
            </div>
          ) : (
            peers.map((dev) => {
              const hasLogs = (peerChatLogs[dev.id] || []).length > 0;
              return (
                <div
                  key={dev.id}
                  className="bg-slate-50 border border-slate-200 hover:border-[#0077B6] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition shadow-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900">{dev.id}</span>
                      <span className="text-[9px] bg-emerald-100 text-[#059669] border border-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                        🟢 Online
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium truncate">
                      {dev.name} • <span className="text-slate-500 text-[10px]">{dev.role}</span>
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 flex-wrap">
                      <span className="text-[#059669] font-bold">🟢 Direct (1 hop)</span>
                      {dev.lat && dev.lon && (
                        <>
                          <span>•</span>
                          <span>📍 {Number(dev.lat).toFixed(3)}, {Number(dev.lon).toFixed(3)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPeer(dev)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 ${
                      hasLogs
                        ? 'bg-[#059669] hover:bg-[#047857] text-white'
                        : 'bg-[#0077B6] hover:bg-[#005f92] text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{hasLogs ? 'Chat' : 'Connect'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===================== PEER CHAT MODAL ===================== */}
      {selectedPeer && (
        <div className="fixed inset-0 bg-[#07172C]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-md w-full h-[70vh] flex flex-col justify-between shadow-2xl space-y-3">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-300 flex items-center justify-center text-[#0077B6]">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 font-mono">{selectedPeer.id}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">{selectedPeer.name} • Direct P2P Link</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPeer(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-slate-50 rounded-2xl p-3.5 overflow-y-auto space-y-2.5 border border-slate-200">
              {(!peerChatLogs[selectedPeer.id] || peerChatLogs[selectedPeer.id].length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs font-mono space-y-2">
                  <MessageSquare className="w-6 h-6 text-slate-400" />
                  <p>P2P Channel Established with {selectedPeer.id}.</p>
                  <p className="text-[10px]">Send a message, request assistance, or share your GPS location.</p>
                </div>
              ) : (
                peerChatLogs[selectedPeer.id].map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      msg.isMe
                        ? 'bg-[#0077B6] text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                      <span className="text-[9px] opacity-75 block text-right mt-1 font-mono">{msg.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendPeerMessage} className="flex gap-2 pt-1">
              <input
                type="text"
                value={peerMessageText}
                onChange={(e) => setPeerMessageText(e.target.value)}
                placeholder={`Message ${selectedPeer.name}...`}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#0077B6] focus:bg-white"
              />
              <button
                type="submit"
                disabled={wsState !== 'CONNECTED'}
                className="bg-[#0077B6] hover:bg-[#005f92] disabled:opacity-50 text-white p-2.5 rounded-xl transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
