import React from 'react';
import { ArrowLeft, CheckCircle2, Camera, Upload, X, Loader2 } from 'lucide-react';

export default function ReportHazardModal({
  isDark,
  setActiveTab,
  incidentSubmitted,
  setIncidentSubmitted,
  handleReportIncident,
  incidentTitle,
  setIncidentTitle,
  incidentType,
  setIncidentType,
  incidentDesc,
  setIncidentDesc,
  incidentSeverity,
  setIncidentSeverity,
  incidentImageFile,
  setIncidentImageFile,
  incidentImagePreview,
  setIncidentImagePreview,
  isUploadingImage,
  gpsCoords
}) {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#D4AF37]/30' : 'border-slate-300'}`}>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setActiveTab('home')}
            className={`p-1.5 rounded-xl border ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Report Disaster Hazard
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-bold">
          📍 {gpsCoords.lat}, {gpsCoords.lon}
        </span>
      </div>

      {incidentSubmitted ? (
        <div className="bg-white rounded-3xl p-6 text-center space-y-3 border-2 border-emerald-500 shadow-2xl animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto text-[#059669]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">Hazard Report Dispatched!</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your incident has been transmitted across the local P2P emergency mesh bus and synced with the Disaster Command Center.
          </p>
          <button
            onClick={() => {
              setIncidentSubmitted(false);
              setActiveTab('alerts');
            }}
            className="w-full py-2.5 bg-[#0077B6] text-white font-bold text-xs rounded-xl shadow cursor-pointer mt-2"
          >
            View in Citizen Alerts Feed →
          </button>
        </div>
      ) : (
        <form onSubmit={handleReportIncident} className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Hazard Title *</label>
            <input
              type="text"
              placeholder="e.g. Flash flood on Main Bridge"
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#0077B6]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Disaster Category</label>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0077B6]"
            >
              <option value="FLOOD">🌊 Urban / River Flood</option>
              <option value="FIRE">🔥 Wildfire / Building Fire</option>
              <option value="COLLAPSE">🏚️ Structural Collapse</option>
              <option value="ROADBLOCK">🚧 Landslide / Blocked Access</option>
              <option value="OTHER">⚠️ Other Hazard</option>
            </select>
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
  );
}
