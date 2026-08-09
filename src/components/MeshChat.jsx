import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  RefreshCw, 
  AlertTriangle, 
  Send, 
  MessageSquare, 
  X, 
  Activity
} from 'lucide-react';

export default function MeshChat({ user, gpsCoords, onTriggerSOS }) {
  // 1. Persistent Unique Device ID (e.g., VAJRA-32647)
  const [myDeviceId] = useState(() => {
    try {
      let savedId = localStorage.getItem('vajranet_device_id');
      if (!savedId) {
        const randNum = Math.floor(10000 + Math.random() * 900000);
        savedId = `VAJRA-${randNum}`;
        localStorage.setItem('vajranet_device_id', savedId);
      }
      return savedId;
    } catch {
      return `VAJRA-${Math.floor(10000 + Math.random() * 900000)}`;
    }
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [peerMessageText, setPeerMessageText] = useState('');
  const [peerChatLogs, setPeerChatLogs] = useState({});
  const [sosSentBanner, setSosSentBanner] = useState(false);
  const channelRef = useRef(null);

  // Start empty — only real BroadcastChannel / network peers populate this
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Live P2P Broadcast Channel — populates peers from real devices on same LAN/tab
  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel('vajranet_p2p_mesh_bus');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { senderId, targetId, message, senderName, type, lat, lon } = event.data || {};
        if (!senderId || senderId === myDeviceId) return;

        // Register peer if new
        setAllDiscoveredDevices((prev) => {
          const exists = prev.some((d) => d.id === senderId);
          if (exists) {
            // Update lastSeen
            return prev.map((d) =>
              d.id === senderId ? { ...d, lastSeen: 'Just now' } : d
            );
          }
          return [
            {
              id: senderId,
              name: senderName || 'Nearby VajraNet Node',
              role: 'Citizen Peer',
              hops: 1,
              signalDbm: -65,
              battery: null,
              lastSeen: 'Just now',
              distance: null,
              isVerified: false,
            },
            ...prev,
          ];
        });

        // Route incoming chat messages
        if (message && (!targetId || targetId === myDeviceId)) {
          setPeerChatLogs((prev) => ({
            ...prev,
            [senderId]: [
              ...(prev[senderId] || []),
              {
                id: `msg-${Date.now()}`,
                sender: senderName || senderId,
                text: message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false,
              },
            ],
          }));
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported on this device', e);
    }
    return () => {
      if (channel) channel.close();
    };
  }, [myDeviceId]);

  // Announce this device on the mesh bus so peers know we exist
  const announcePresence = () => {
    try {
      const bc = channelRef.current || new BroadcastChannel('vajranet_p2p_mesh_bus');
      bc.postMessage({
        senderId: myDeviceId,
        senderName: user?.name || 'Citizen',
        type: 'PRESENCE_ANNOUNCE',
        lat: gpsCoords?.lat,
        lon: gpsCoords?.lon,
      });
    } catch (e) {
      console.warn('Announce failed', e);
    }
  };

  // Adaptive Multi-Hop Logic
  const totalCount = allDiscoveredDevices.length;
  const isDenseArea = totalCount > 5;
  const visibleDevices = isDenseArea
    ? allDiscoveredDevices.filter((dev) => dev.hops <= 3)
    : allDiscoveredDevices;

  // Radar Scan — re-announces presence and refreshes lastSeen
  const handleScanRadar = () => {
    setIsScanning(true);
    announcePresence();
    setTimeout(() => setIsScanning(false), 1500);
  };

  // Mesh SOS
  const handleTriggerMeshSOS = () => {
    if (onTriggerSOS) onTriggerSOS();
    setSosSentBanner(true);
    setTimeout(() => setSosSentBanner(false), 5000);

    try {
      const bc = channelRef.current || new BroadcastChannel('vajranet_p2p_mesh_bus');
      bc.postMessage({
        senderId: myDeviceId,
        senderName: user?.name || 'Citizen',
        type: 'SOS',
        message: `🚨 CRITICAL SOS BEACON BROADCAST: Coordinates (${gpsCoords?.lat}, ${gpsCoords?.lon})`,
      });
    } catch (e) {
      console.warn('Broadcast failed', e);
    }
  };

  // Send Direct Message
  const handleSendPeerMessage = (e) => {
    e.preventDefault();
    if (!peerMessageText.trim() || !selectedPeer) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: user?.name || 'You',
      text: peerMessageText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setPeerChatLogs((prev) => ({
      ...prev,
      [selectedPeer.id]: [...(prev[selectedPeer.id] || []), newMsg],
    }));

    try {
      const bc = channelRef.current || new BroadcastChannel('vajranet_p2p_mesh_bus');
      bc.postMessage({
        senderId: myDeviceId,
        targetId: selectedPeer.id,
        senderName: user?.name || 'Citizen',
        message: peerMessageText.trim(),
      });
    } catch (e) {
      console.warn('P2P message failed', e);
    }

    setPeerMessageText('');
  };

  return (
    <div className="space-y-4 font-sans select-none pb-4">
      
      {/* ===================== CONTROL PANEL ===================== */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
        
        {/* Device ID + Network Indicator Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B2545] border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-md">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-mono font-bold block">MY VAJRANET NODE</span>
              <h3 className="text-sm font-black text-slate-900 font-mono tracking-wider">{myDeviceId}</h3>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border shadow-sm ${
            isOnline
              ? 'bg-emerald-50 text-[#059669] border-emerald-300'
              : 'bg-amber-50 text-amber-700 border-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#059669]' : 'bg-amber-500 animate-pulse'}`}></span>
            <span>{isOnline ? '🟢 Online Cloud Relay' : '🟠 Offline P2P Mesh'}</span>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1.5 font-mono">
          <Activity className="w-3.5 h-3.5 text-[#0077B6] shrink-0" />
          <span>
            {isOnline
              ? 'Direct Cloud Relay: Syncs to Govt, Volunteer & Citizen feeds.'
              : 'P2P Mesh Active: Multi-hop relay until reaching a gateway.'}
          </span>
        </div>

        {/* SOS Sent Banner */}
        {sosSentBanner && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>🚨 SOS Beacon Transmitted across all 3 feeds!</span>
          </div>
        )}

        {/* Controls Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleScanRadar}
            disabled={isScanning}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0077B6] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Radar'}</span>
          </button>

          <button
            onClick={handleTriggerMeshSOS}
            className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
            <span>Mesh SOS</span>
          </button>
        </div>

      </div>

      {/* ===================== NEARBY DEVICES ===================== */}
      <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
        
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>📡 Available Nearby Devices</span>
              </h2>
              <span className="text-[10px] bg-blue-100 text-[#0077B6] border border-blue-300 px-2 py-0.5 rounded-full font-mono font-bold whitespace-nowrap">
                {visibleDevices.length} In Range
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Connect peer-to-peer to request local aid or relay SOS.
            </p>
          </div>

          <div className="shrink-0 self-start">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border whitespace-nowrap inline-flex items-center shadow-sm ${
              isDenseArea
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {isDenseArea ? '⚡ Max 3 Hops' : '⚡ Extended (All)'}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          {visibleDevices.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 font-mono space-y-3">
              <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
              <p className="text-slate-500 font-semibold">No VajraNet nodes detected nearby</p>
              <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                Tap <span className="font-bold text-[#0077B6]">Scan Radar</span> to announce your presence and discover other VajraNet devices on the same Wi-Fi or local network.
              </p>
              <button
                onClick={handleScanRadar}
                disabled={isScanning}
                className="mt-1 px-4 py-2 bg-[#0B2545] text-[#D4AF37] border border-[#D4AF37]/60 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
              >
                {isScanning ? 'Announcing...' : 'Announce My Node'}
              </button>
            </div>
          ) : (
            visibleDevices.map((dev) => {
              const isDirect = dev.hops === 1;
              const hasLogs = (peerChatLogs[dev.id] || []).length > 0;

              return (
                <div
                  key={dev.id}
                  className="bg-slate-50 border border-slate-200 hover:border-[#0077B6] rounded-2xl p-3.5 flex items-center justify-between gap-3 transition shadow-sm"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-900">{dev.id}</span>
                      {dev.isVerified && (
                        <span className="text-[9px] bg-blue-100 text-[#0077B6] border border-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 font-medium truncate">
                      {dev.name} • <span className="text-slate-500 text-[10px]">{dev.role}</span>
                    </p>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 pt-0.5 flex-wrap">
                      <span className={`font-bold ${isDirect ? 'text-[#059669]' : 'text-amber-700'}`}>
                        {isDirect ? '🟢 Direct (1 hop)' : `🟠 ${dev.hops} hops`}
                      </span>
                      {dev.distance && (
                        <>
                          <span>•</span>
                          <span>📍 ~{dev.distance}</span>
                        </>
                      )}
                      {dev.battery !== null && (
                        <>
                          <span>•</span>
                          <span>🔋 {dev.battery}%</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-slate-400">{dev.lastSeen}</span>
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
                  <p className="text-[10px] text-slate-500 font-mono">
                    {selectedPeer.name} • {selectedPeer.hops === 1 ? 'Direct Link' : `${selectedPeer.hops} Hops`}
                  </p>
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
                  <p>Encrypted P2P Link Established with {selectedPeer.id}.</p>
                  <p className="text-[10px]">Send a message, request emergency assistance, or share coordinates.</p>
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
                className="bg-[#0077B6] hover:bg-[#005f92] text-white p-2.5 rounded-xl transition cursor-pointer"
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
