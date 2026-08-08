import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Send, 
  Users, 
  AlertTriangle, 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  HeartPulse, 
  Waves, 
  X, 
  Paperclip, 
  Camera, 
  Mic, 
  CheckCheck, 
  Shield, 
  HelpCircle, 
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export default function MeshChat({ user, gpsCoords }) {
  const [activeChannel, setActiveChannel] = useState('general'); // 'sos' | 'general' | 'relief' | 'responders'
  const [inputText, setInputText] = useState('');
  const [showPeerModal, setShowPeerModal] = useState(false);
  const [attachGps, setAttachGps] = useState(true);
  const [msgPriority, setMsgPriority] = useState('NORMAL'); // 'NORMAL' | 'URGENT' | 'CRITICAL'
  const [attachedImage, setAttachedImage] = useState(null);
  const [isRelaying, setIsRelaying] = useState(false);

  const messagesEndRef = useRef(null);

  // Simulated peer nodes in local 500m radius
  const peerNodes = [
    { id: 'NODE-7X9A', name: 'NDRF Rescue Unit 4', role: 'NDRF Volunteer', distance: '120m', hops: 1, signal: '98%', battery: '92%', status: 'Active' },
    { id: 'NODE-3B12', name: 'Rohan Sharma', role: 'Citizen Peer', distance: '210m', hops: 1, signal: '85%', battery: '76%', status: 'Active' },
    { id: 'NODE-9K44', name: 'Sector 4 Relief Depot', role: 'Relief Coordinator', distance: '340m', hops: 2, signal: '72%', battery: '100%', status: 'Active' },
    { id: 'NODE-1M08', name: 'Dr. Priya V.', role: 'Medical Doctor', distance: '410m', hops: 2, signal: '64%', battery: '55%', status: 'Active' },
    { id: 'NODE-5F77', name: 'Amit Verma', role: 'Citizen Peer', distance: '480m', hops: 3, signal: '50%', battery: '68%', status: 'Active' }
  ];

  // Seed message streams per channel
  const [messages, setMessages] = useState({
    general: [
      {
        id: 'msg-g1',
        sender: 'Sector 4 Relief Depot',
        nodeId: 'NODE-9K44',
        role: 'Relief Coordinator',
        text: 'P2P Mesh Network online across Sector 3 & 4. Cellular towers disabled due to flood. Keep Wi-Fi & Bluetooth ON to bridge packets.',
        time: '10:42 AM',
        hops: 2,
        isNotice: true,
        isVerified: true,
        isMe: false
      },
      {
        id: 'msg-g2',
        sender: 'Dr. Priya V.',
        nodeId: 'NODE-1M08',
        role: 'Medical Doctor',
        text: 'Temporary medical triage tent established near Stadium Gate 2. Clean bandages, tetanus, and ORS packets available.',
        time: '10:45 AM',
        hops: 2,
        isVerified: true,
        isMe: false
      },
      {
        id: 'msg-g3',
        sender: 'Rohan Sharma',
        nodeId: 'NODE-3B12',
        role: 'Citizen Peer',
        text: 'Road near Sector 3 Metro pillar 42 is submerged in 3ft water. Small vehicles should avoid!',
        time: '10:48 AM',
        hops: 1,
        lat: 28.6142,
        lon: 77.2095,
        isMe: false
      }
    ],
    sos: [
      {
        id: 'msg-s1',
        sender: 'Rohan Sharma',
        nodeId: 'NODE-3B12',
        role: 'Citizen Peer',
        text: 'CRITICAL SOS: 3 adults & 1 child stranded on roof near Sector 4 Water Tank. Rising flood water!',
        time: '10:40 AM',
        hops: 1,
        lat: 28.6148,
        lon: 77.2088,
        priority: 'CRITICAL',
        isMe: false
      },
      {
        id: 'msg-s2',
        sender: 'NDRF Rescue Unit 4',
        nodeId: 'NODE-7X9A',
        role: 'NDRF Volunteer',
        text: 'Copied location tag. Rescue boat Alpha dispatched from Station Road, ETA 6 minutes.',
        time: '10:41 AM',
        hops: 1,
        isVerified: true,
        isMe: false
      }
    ],
    relief: [
      {
        id: 'msg-r1',
        sender: 'Sector 4 Relief Depot',
        nodeId: 'NODE-9K44',
        role: 'Relief Coordinator',
        text: 'Clean drinking water tanker arrived at Block B Community Hall. Bring clean storage containers.',
        time: '10:30 AM',
        hops: 1,
        isVerified: true,
        isMe: false
      }
    ],
    responders: [
      {
        id: 'msg-rp1',
        sender: 'NDRF Rescue Unit 4',
        nodeId: 'NODE-7X9A',
        role: 'NDRF Volunteer',
        text: 'Patrol Team 2 request: Reports of fallen electrical cables near Sector 4 East Gate?',
        time: '10:25 AM',
        hops: 1,
        isVerified: true,
        isMe: false
      }
    ]
  });

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannel]);

  const getCurrentTimeString = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    const newMsgText = inputText.trim();
    const newMsg = {
      id: `msg-user-${Date.now()}`,
      sender: user?.name || 'Guest Citizen',
      nodeId: `NODE-LOCAL`,
      role: user?.isGuest ? 'Guest Peer' : 'Registered Citizen',
      text: newMsgText,
      time: getCurrentTimeString(),
      hops: 0,
      lat: attachGps ? gpsCoords.lat : null,
      lon: attachGps ? gpsCoords.lon : null,
      priority: msgPriority,
      image: attachedImage,
      isMe: true,
      status: 'Relayed'
    };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg]
    }));

    setInputText('');
    setAttachedImage(null);
    setMsgPriority('NORMAL');

    // Simulate incoming P2P mesh relay reply after 2 seconds
    setIsRelaying(true);
    setTimeout(() => {
      setIsRelaying(false);
      if (activeChannel === 'sos' || msgPriority === 'CRITICAL') {
        const replyMsg = {
          id: `msg-reply-${Date.now()}`,
          sender: 'NDRF Rescue Unit 4',
          nodeId: 'NODE-7X9A',
          role: 'NDRF Volunteer',
          text: `Acknowledged SOS packet from ${user?.name || 'Citizen'} (${gpsCoords.lat}, ${gpsCoords.lon}). Logged into disaster triage queue.`,
          time: getCurrentTimeString(),
          hops: 1,
          isVerified: true,
          isMe: false
        };
        setMessages(prev => ({
          ...prev,
          [activeChannel]: [...(prev[activeChannel] || []), replyMsg]
        }));
      }
    }, 2200);
  };

  const handleQuickStatusBroadcast = (statusText, priorityLevel = 'NORMAL') => {
    const newMsg = {
      id: `msg-quick-${Date.now()}`,
      sender: user?.name || 'Guest Citizen',
      nodeId: `NODE-LOCAL`,
      role: 'Quick Status Broadcast',
      text: statusText,
      time: getCurrentTimeString(),
      hops: 0,
      lat: gpsCoords.lat,
      lon: gpsCoords.lon,
      priority: priorityLevel,
      isMe: true,
      status: 'Relayed'
    };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg]
    }));
  };

  const handleSimulatePhotoAttachment = () => {
    setAttachedImage('Hazard Photo (Submerged Street)');
  };

  const getRoleBadgeColor = (role) => {
    if (role?.includes('NDRF')) return 'bg-rose-950 text-rose-300 border-rose-800';
    if (role?.includes('Doctor') || role?.includes('Medical')) return 'bg-blue-950 text-blue-300 border-blue-800';
    if (role?.includes('Relief')) return 'bg-amber-950 text-amber-300 border-amber-800';
    return 'bg-emerald-950 text-emerald-300 border-emerald-800';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      
      {/* ==================== 1. CHAT HEADER & TELEMETRY ==================== */}
      <div className="bg-[#081324] border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#081324] animate-ping"></span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black tracking-wider text-white">
                #{activeChannel === 'general' ? 'general-mesh' : activeChannel === 'sos' ? 'sos-broadcast' : activeChannel === 'relief' ? 'relief-coord' : 'first-responders'}
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800/80">
                P2P ENCRYPTED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
              <span>500m Local Mesh</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">5 Active Relay Nodes</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPeerModal(true)}
          className="flex items-center space-x-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800/90 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 transition-all shadow cursor-pointer active:scale-95"
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>{peerNodes.length} Peers</span>
        </button>
      </div>

      {/* ==================== 2. CHANNEL SELECTOR TABS ==================== */}
      <div className="flex bg-slate-950 border-b border-slate-800 px-2 py-2 overflow-x-auto no-scrollbar gap-1.5 text-xs font-bold">
        <button
          onClick={() => setActiveChannel('general')}
          className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeChannel === 'general' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>#general-mesh</span>
        </button>

        <button
          onClick={() => setActiveChannel('sos')}
          className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeChannel === 'sos' ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-200" />
          <span>#sos-broadcast</span>
        </button>

        <button
          onClick={() => setActiveChannel('relief')}
          className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeChannel === 'relief' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>#relief-coord</span>
        </button>

        <button
          onClick={() => setActiveChannel('responders')}
          className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeChannel === 'responders' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>#first-responders</span>
        </button>
      </div>

      {/* ==================== 3. QUICK 1-TAP STATUS BROADCAST CHIPS ==================== */}
      <div className="bg-[#091427]/80 px-3 py-2 border-b border-slate-800/60 overflow-x-auto flex items-center space-x-2 no-scrollbar">
        <span className="text-[9px] text-slate-400 font-mono uppercase font-bold flex-shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>1-Tap Status:</span>
        </span>

        <button
          type="button"
          onClick={() => handleQuickStatusBroadcast('STATUS UPDATE: I am Safe & located on high ground.')}
          className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 text-[10px] px-2.5 py-1 rounded-xl font-bold whitespace-nowrap flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>🟢 I am Safe</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickStatusBroadcast('NEED SUPPLIES: Urgent clean drinking water required at this location.')}
          className="bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 text-blue-200 text-[10px] px-2.5 py-1 rounded-xl font-bold whitespace-nowrap flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
        >
          <Waves className="w-3 h-3 text-blue-400" />
          <span>💧 Need Water</span>
        </button>

        <button
          type="button"
          onClick={() => handleQuickStatusBroadcast('EMERGENCY SOS: Medical triage & first aid urgently needed!', 'CRITICAL')}
          className="bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-200 text-[10px] px-2.5 py-1 rounded-xl font-bold whitespace-nowrap flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
        >
          <HeartPulse className="w-3 h-3 text-rose-400" />
          <span>🏥 Medical SOS</span>
        </button>
      </div>

      {/* ==================== 4. PROPER MESSAGES STREAM FEED ==================== */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-4 font-sans no-scrollbar">
        
        {/* Off-Grid Relay Notice Banner */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 text-center space-y-1 shadow">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Off-Grid P2P Mesh Channel Active</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Messages are signed & relayed hop-by-hop across local mobile Bluetooth & Wi-Fi Direct.
          </p>
        </div>

        {(messages[activeChannel] || []).map((msg) => {
          const isUser = msg.isMe;

          return (
            <div 
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              {/* Sender Name & Role Label (for received messages) */}
              {!isUser && (
                <div className="flex items-center space-x-2 px-1 text-[10px] text-slate-400 font-mono">
                  <span className="font-bold text-slate-200">{msg.sender}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold border ${getRoleBadgeColor(msg.role)}`}>
                    {msg.role}
                  </span>
                  {msg.isVerified && (
                    <span className="text-[9px] px-1 rounded bg-blue-900 text-blue-300 font-bold flex items-center space-x-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Gov</span>
                    </span>
                  )}
                </div>
              )}

              {/* Chat Message Bubble */}
              <div 
                className={`max-w-[85%] rounded-3xl p-3.5 text-xs space-y-2 shadow-lg transition-all ${
                  isUser 
                    ? msg.priority === 'CRITICAL'
                      ? 'bg-gradient-to-r from-rose-700 to-red-600 text-white rounded-br-none border border-rose-400/40'
                      : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-br-none shadow-emerald-900/30'
                    : msg.priority === 'CRITICAL' || msg.isAlert
                    ? 'bg-rose-950/80 border border-rose-600/80 text-rose-100 rounded-bl-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {/* Priority / Distress Header Tag if any */}
                {msg.priority && msg.priority !== 'NORMAL' && (
                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-200 font-bold text-[9px] font-mono border border-rose-700">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>PRIORITY: {msg.priority}</span>
                  </div>
                )}

                {/* Message Body Text */}
                <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>

                {/* Attached Image Mock */}
                {msg.image && (
                  <div className="bg-slate-900/90 rounded-xl p-2 border border-slate-700 flex items-center space-x-2 text-[11px] text-amber-300 font-mono">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Attached Hazard Image</span>
                  </div>
                )}

                {/* GPS Tag & Footer Details */}
                <div className={`flex items-center justify-between pt-1 border-t text-[9.5px] font-mono ${
                  isUser ? 'border-teal-500/40 text-teal-100' : 'border-slate-800/80 text-slate-400'
                }`}>
                  {msg.lat && msg.lon ? (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>{msg.lat}, {msg.lon}</span>
                    </div>
                  ) : (
                    <span>Mesh Node: {msg.nodeId || 'NODE-P2P'}</span>
                  )}

                  <div className="flex items-center space-x-1.5 ml-2">
                    <span>{msg.hops ? `${msg.hops} hop` : 'Direct'}</span>
                    <span>•</span>
                    <span>{msg.time}</span>
                    {isUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-teal-200 inline ml-0.5" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Relaying Spinner Indicator */}
        {isRelaying && (
          <div className="flex items-center space-x-2 text-[10px] text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 p-2 rounded-xl w-max animate-pulse">
            <Radio className="w-3 h-3 text-emerald-400 animate-spin" />
            <span>Bridging message packet across nearby peer nodes...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ==================== 5. INPUT & ATTACHMENT CONTROLS ==================== */}
      <form onSubmit={handleSendMessage} className="p-3 bg-[#081324] border-t border-slate-800/90 space-y-2">
        
        {/* Attached image indicator if any */}
        {attachedImage && (
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs text-amber-300 font-mono">
            <span className="flex items-center space-x-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>{attachedImage}</span>
            </span>
            <button type="button" onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar Options: Priority & GPS Toggle */}
        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-mono">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={attachGps} 
                onChange={(e) => setAttachGps(e.target.checked)}
                className="rounded accent-rose-600 bg-slate-900 border-slate-700" 
              />
              <span>Attach GPS ({gpsCoords.lat}, {gpsCoords.lon})</span>
            </label>
          </div>

          {/* Priority selector */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Priority:</span>
            <button
              type="button"
              onClick={() => setMsgPriority(prev => prev === 'NORMAL' ? 'URGENT' : prev === 'URGENT' ? 'CRITICAL' : 'NORMAL')}
              className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                msgPriority === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-700' : msgPriority === 'URGENT' ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {msgPriority}
            </button>
          </div>
        </div>

        {/* Text Input Row */}
        <div className="flex items-center space-x-2">
          {/* Photo attachment mock button */}
          <button
            type="button"
            onClick={handleSimulatePhotoAttachment}
            title="Attach Hazard Photo"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Main Input Text Box */}
          <input
            type="text"
            placeholder={`Send message to #${activeChannel}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
          />

          {/* Send Button */}
          <button
            type="submit"
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-2.5 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* ==================== MODAL: ACTIVE MESH PEERS ==================== */}
      {showPeerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Active Mesh Peers (500m)</h3>
              </div>
              <button 
                onClick={() => setShowPeerModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {peerNodes.map((peer) => (
                <div key={peer.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs space-y-1 shadow">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-white">{peer.name}</span>
                    <span className="text-[10px] font-mono text-emerald-400">{peer.distance} away</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>ID: {peer.id} • {peer.role}</span>
                    <span>Signal: {peer.signal}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPeerModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Close Mesh Peers
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
