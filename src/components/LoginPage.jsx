import React, { useState } from 'react';
import { 
  Shield, 
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
      setGeneratedOtp('829104');
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
      role: 'CITIZEN',
      registeredAt: new Date().toISOString()
    };
    onLoginSuccess(userData);
  };

  const handleSkipForNow = () => {
    const guestData = {
      isGuest: true,
      name: 'Guest Citizen',
      phone: '',
      role: 'CITIZEN',
      registeredAt: new Date().toISOString()
    };
    onSkip(guestData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#07172C] via-[#0E294B] to-[#07172C] text-slate-900 flex flex-col font-sans select-none justify-center items-center px-4 py-8">
      
      <div className="max-w-md mx-auto w-full space-y-6">
        
        {/* Emblem & Portal Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0B2545] border-2 border-[#D4AF37] shadow-xl p-1">
            <div className="w-full h-full rounded-full bg-[#07172C] flex items-center justify-center text-[#D4AF37]">
              <Shield className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              VajraNet Citizen Portal
            </h1>
            <p className="text-xs text-[#D4AF37] font-medium mt-0.5 font-mono">
              Offline-First Emergency Communication & Mesh Network
            </p>
          </div>
        </div>

        {/* High-Contrast Crisp White Card */}
        <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4">
          
          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-slate-900">Citizen Mobile Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your mobile number for emergency rescue dispatch identification
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
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

                {/* Demo OTP Box */}
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
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Verify OTP Code →</span>
              </button>
            </form>
          )}

          {/* STEP 3: Full Name */}
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
                <p className="text-[10px] text-slate-500">Used by rescue teams when you send an emergency beacon.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete & Enter Portal →</span>
              </button>
            </form>
          )}

          {/* Skip for Now Link */}
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={handleSkipForNow}
              className="text-xs text-slate-500 hover:text-[#0077B6] font-bold transition hover:underline cursor-pointer"
            >
              Skip for Now (Continue as Guest Citizen) →
            </button>
          </div>

        </div>

        {/* Footer Security Badges */}
        <p className="text-center text-[10px] text-slate-400 font-mono">
          VajraNet P2P Protocol v2.4 • End-to-End Encrypted Off-Grid Mesh
        </p>

      </div>

    </div>
  );
}
