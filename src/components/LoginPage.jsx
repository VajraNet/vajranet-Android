import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  User, 
  Radio, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { getOrCreateVajraId, isValidVajraId } from '../utils/vajraId';

export default function LoginPage({ onLoginSuccess, onGuestLogin }) {
  const [persistentVajraId, setPersistentVajraId] = useState('');
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'vajra_id'
  
  // Phone flow states
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'name'
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState(['8', '2', '9', '1', '0', '4']);
  const [generatedOtp, setGeneratedOtp] = useState('829104');
  const [fullName, setFullName] = useState('Rohan Sharma');
  
  // Vajra ID direct sign in state
  const [inputVajraId, setInputVajraId] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const id = getOrCreateVajraId();
    setPersistentVajraId(id);
    setInputVajraId(id);
  }, []);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      setGeneratedOtp('829104');
      setOtp(['8', '2', '9', '1', '0', '4']);
      setStep('otp');
      setIsSubmitting(false);
    }, 350);
  };

  const handleOtpChange = (index, val) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const entered = otp.join('');
    if (entered.length < 6) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }
    setErrorMsg('');
    setStep('name');
  };

  const handleCompleteRegistration = (e) => {
    e.preventDefault();
    const cleanName = fullName.trim() || `Citizen (+91 ${phone.slice(-4)})`;
    const finalVajraId = persistentVajraId || getOrCreateVajraId();

    const userData = {
      isGuest: false,
      vajra_id: finalVajraId,
      name: cleanName,
      phone: phone,
      role: 'CITIZEN',
      registeredAt: new Date().toISOString()
    };
    localStorage.setItem('vajranet_citizen_user', JSON.stringify(userData));
    onLoginSuccess(userData);
  };

  const handleVajraIdDirectLogin = (e) => {
    e.preventDefault();
    const cleanId = inputVajraId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Please enter your Unique Vajra ID.');
      return;
    }
    setErrorMsg('');

    const userData = {
      isGuest: false,
      vajra_id: cleanId,
      name: `Citizen Node (${cleanId.slice(-9)})`,
      phone: '',
      role: 'CITIZEN',
      registeredAt: new Date().toISOString()
    };
    localStorage.setItem('vajranet_unique_id', cleanId);
    localStorage.setItem('vajranet_citizen_user', JSON.stringify(userData));
    onLoginSuccess(userData);
  };

  const handleContinueAsGuest = () => {
    const finalVajraId = persistentVajraId || getOrCreateVajraId();
    const guestData = {
      isGuest: true,
      vajra_id: finalVajraId,
      name: `Guest (${finalVajraId.slice(-9)})`,
      phone: '',
      role: 'CITIZEN',
      registeredAt: new Date().toISOString()
    };
    localStorage.setItem('vajranet_citizen_user', JSON.stringify(guestData));
    if (onGuestLogin) {
      onGuestLogin(guestData);
    } else {
      onLoginSuccess(guestData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#07172C] via-[#0E294B] to-[#07172C] text-slate-900 flex flex-col font-sans select-none justify-center items-center px-4 py-8 relative overflow-hidden">
      
      {/* Cyber Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#0077B6]/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md mx-auto w-full space-y-5 relative z-10">
        
        {/* Emblem & Portal Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-2 rounded-3xl bg-[#0B2545]/90 border border-cyan-400/50 shadow-2xl backdrop-blur-md">
            <img 
              src="/app-icon-transparent.png" 
              alt="VajraNet Citizen" 
              className="w-16 h-16 object-contain drop-shadow-lg"
            />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              VajraNet Citizen Portal
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-mono font-bold mt-0.5">
              Disaster Communication Platform
            </p>
            <p className="text-xs text-cyan-300 font-semibold font-mono mt-1">
              "When The World Goes Dark, We Stay Connected."
            </p>
          </div>
        </div>

        {/* High-Contrast Crisp White Card */}
        <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4">
          
          {/* Permanent Device Unique ID Pill */}
          <div className="bg-[#07172C] text-cyan-200 rounded-2xl p-3 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div>
                <span className="text-[9px] text-slate-400 font-mono block uppercase">Permanent Device Vajra ID</span>
                <strong className="text-xs font-mono font-black text-white tracking-wider">
                  {persistentVajraId || 'GENERATING...'}
                </strong>
              </div>
            </div>
            <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded font-mono font-bold">
              1-DEVICE-1-ID
            </span>
          </div>

          {/* Toggle Login Tabs (Phone vs Vajra ID) */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold font-mono">
            <button
              type="button"
              onClick={() => { setLoginMethod('phone'); setErrorMsg(''); }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                loginMethod === 'phone'
                  ? 'bg-white text-[#059669] shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Phone Number
            </button>

            <button
              type="button"
              onClick={() => { setLoginMethod('vajra_id'); setErrorMsg(''); }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                loginMethod === 'vajra_id'
                  ? 'bg-white text-[#0077B6] shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unique Vajra ID
            </button>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* METHOD 1: PHONE LOGIN */}
          {loginMethod === 'phone' && (
            <>
              {/* STEP 1: Phone Number */}
              {step === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-500 text-xs font-mono font-bold">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-50 border border-slate-300 focus:border-[#059669] focus:bg-white rounded-xl pl-12 pr-4 py-2.5 text-sm text-slate-900 font-mono tracking-wider focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>{isSubmitting ? 'Sending OTP...' : 'Send Verification OTP →'}</span>
                  </button>
                </form>
              )}

              {/* STEP 2: 6-Digit OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP</label>
                      <button
                        type="button"
                        onClick={() => setStep('phone')}
                        className="text-[11px] text-[#059669] hover:underline font-bold"
                      >
                        Edit (+91 {phone})
                      </button>
                    </div>

                    {/* Auto-filled Demo OTP */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-800">
                      <span>Auto-filled OTP: <strong className="font-mono text-sm tracking-widest text-emerald-900">{generatedOtp}</strong></span>
                      <span className="text-[10px] bg-[#059669] text-white px-2 py-0.5 rounded font-mono font-bold">READY</span>
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          className="w-full h-11 text-center bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-[#059669] focus:bg-white font-mono shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Verify OTP Code →</span>
                  </button>
                </form>
              )}

              {/* STEP 3: Citizen Name */}
              {step === 'name' && (
                <form onSubmit={handleCompleteRegistration} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Citizen Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohan Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 focus:border-[#059669] focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none transition"
                    />
                    <p className="text-[10px] text-slate-500">Your Unique ID <code className="font-bold text-[#0077B6]">{persistentVajraId}</code> will be attached to this phone number.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete & Enter Portal →</span>
                  </button>
                </form>
              )}
            </>
          )}

          {/* METHOD 2: VAJRA ID DIRECT SIGN IN */}
          {loginMethod === 'vajra_id' && (
            <form onSubmit={handleVajraIdDirectLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Your Unique Vajra ID</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="VAJRA-USR-ABC-12345"
                    value={inputVajraId}
                    onChange={(e) => setInputVajraId(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#0077B6] focus:bg-white rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono tracking-wider focus:outline-none transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Auto-filled with this device's permanent Vajra ID for instant 1-click login.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0077B6] hover:bg-[#005f92] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Instant Sign In with Vajra ID →</span>
              </button>
            </form>
          )}

          {/* Skip for Now Link */}
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="text-xs text-slate-600 hover:text-[#0077B6] font-bold transition hover:underline cursor-pointer"
            >
              Continue as Guest Citizen (Retains ID: {persistentVajraId.slice(-9)}) →
            </button>
          </div>

        </div>

        {/* Footer Security Badges */}
        <p className="text-center text-[10px] text-slate-400 font-mono">
          VajraNet P2P Protocol v2.5 • One Device One ID • Off-Grid Mesh
        </p>

      </div>

    </div>
  );
}
