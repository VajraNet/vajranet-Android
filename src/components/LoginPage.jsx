import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  User, 
  Radio, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onSkip }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'name'
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState(['8', '2', '9', '1', '0', '4']);
  const [generatedOtp, setGeneratedOtp] = useState('829104');
  const [fullName, setFullName] = useState('Rohan Sharma');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    setTimeout(() => {
      const code = '829104';
      setGeneratedOtp(code);
      setOtp(['8', '2', '9', '1', '0', '4']);
      setStep('otp');
      setIsSubmitting(false);
    }, 400);
  };

  const handleOtpChange = (index, val) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto focus next input
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
    const userData = {
      isGuest: false,
      name: cleanName,
      phone: phone,
      registeredAt: new Date().toISOString()
    };
    onLoginSuccess(userData);
  };

  const handleSkipForNow = () => {
    const guestData = {
      isGuest: true,
      name: 'Guest Citizen',
      phone: '',
      registeredAt: new Date().toISOString()
    };
    onSkip(guestData);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#070e1c] text-white flex flex-col justify-center px-4 py-8 font-sans selection:bg-rose-600 select-none">
      
      {/* Top Brand Header */}
      <div className="text-center space-y-3 mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 shadow-2xl shadow-rose-600/40 border border-rose-400/40 animate-pulse">
          <ShieldAlert className="w-9 h-9 text-white" />
        </div>
        
        <div>
          <div className="inline-flex items-center space-x-2">
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              VAJRANET
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 font-bold font-mono border border-rose-800/80">
              CITIZEN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            National Disaster Mesh & Emergency Triage Portal
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-5">
        
        {/* Disaster Mode Header Badge */}
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-3 flex items-start space-x-3">
          <Radio className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-amber-200 block">Off-Grid Disaster Mesh Ready</span>
            <span className="text-[11px] text-slate-300 leading-tight">
              Log in with phone for rescue dispatch tracking, or <strong className="text-amber-400">Skip</strong> to access offline P2P mesh immediately.
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-700/80 rounded-xl p-3 text-xs text-rose-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Phone Number Input */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-mono">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  maxLength="10"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">First responders use your phone to locate and confirm SOS.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{isSubmitting ? 'Sending OTP...' : 'Send Verification OTP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Enter 6-Digit OTP
                </label>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Edit (+91 {phone})
                </button>
              </div>

              {/* Demo OTP Banner */}
              <div className="bg-blue-950/60 border border-blue-600/50 rounded-xl p-2.5 mb-3 flex items-center justify-between text-xs text-blue-200">
                <span>Auto-filled Demo OTP: <strong className="font-mono text-white tracking-widest text-sm">{generatedOtp}</strong></span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-mono">READY</span>
              </div>

              {/* 6 Digit Inputs */}
              <div className="grid grid-cols-6 gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-full h-11 text-center bg-slate-950 border border-slate-800 rounded-xl text-base font-bold text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Verify OTP</span>
            </button>
          </form>
        )}

        {/* STEP 3: Enter Full Name */}
        {step === 'name' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">What is your Full Name?</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Displayed to rescue teams when you transmit an SOS signal.</p>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Enter Emergency Portal</span>
            </button>
          </form>
        )}

        {/* PROMINENT SKIP BUTTON */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleSkipForNow}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Skip for Now (Continue as Guest Citizen)</span>
          </button>
          <p className="text-center text-[10px] text-slate-500 mt-1.5 font-mono">
            Direct off-grid mesh access. No phone number or login needed.
          </p>
        </div>

      </div>

      {/* Footer Credentials */}
      <div className="mt-8 text-center text-[10px] text-slate-600 font-mono space-y-1">
        <p>NDRF & Disaster Management Authority Integrated</p>
        <p>VajraNet P2P Protocol v2.4 • End-to-End Mesh Encrypted</p>
      </div>

    </div>
  );
}
