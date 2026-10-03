import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { X, Megaphone, Send, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';

export default function AdvisoryModal() {
  const { isAdvisoryModalOpen, setIsAdvisoryModalOpen, alerts, showToast, loadInitialData } = useApp();
  const { currentUser, isDistrictAdmin, isHealthWorker, isCitizen } = useAuth();

  const [title, setTitle] = useState('URGENT: Public Health Boil Water Advisory - Regional Grid');
  const [advisoryType, setAdvisoryType] = useState('boil_water_notice');
  const [severity, setSeverity] = useState('critical');
  const [targetArea, setTargetArea] = useState('Aizawl North Zone, Kamrup District & adjoining 2.0 km downstream grid');
  const [message, setMessage] = useState(
    'Sensors have detected elevated microbial risk and turbidity spikes in the municipal supply grid alongside clinical gastroenteritis reports. Boil all drinking, cooking, and infant formula water vigorously for at least 1 minute before use.'
  );
  const [channels, setChannels] = useState(['sms', 'dashboard', 'mobile_push', 'clinic_radio']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAdvisoryModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDistrictAdmin) {
      showToast('Authorized for District Health Admins Only. Please log in with a District Health Admin account.', 'error');
      return;
    }
    setIsSubmitting(true);

    try {
      const activeAlert = alerts.find((a) => a.status === 'active');
      const res = await api.createAdvisory({
        alert_id: activeAlert?.id || null,
        title,
        advisory_type: advisoryType,
        severity,
        message_content: message,
        target_area_description: targetArea,
        broadcast_channels: channels
      });

      if (res.success) {
        showToast('Public Emergency Advisory Broadcast Successfully via Socket.IO Grid!', 'warning');
        setIsAdvisoryModalOpen(false);
        loadInitialData();
      }
    } catch (err) {
      showToast('Failed to broadcast advisory', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChannel = (ch) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 text-white">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Broadcast Public Health Advisory</h3>
              <p className="text-xs text-red-100">Dispatch instant emergency alerts across regional response channels</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdvisoryModalOpen(false)}
            className="text-red-100 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Advisory Headline</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Advisory Type</label>
              <select
                value={advisoryType}
                onChange={(e) => setAdvisoryType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs font-semibold"
              >
                <option value="boil_water_notice">Boil Water Notice</option>
                <option value="do_not_drink">Do Not Drink Notice</option>
                <option value="chlorination_flush_alert">Chlorination Flush Alert</option>
                <option value="clinic_surge_warning">Clinic Surge Warning</option>
                <option value="all_clear">All Clear / Rescission</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-800 font-bold mb-1.5">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs font-semibold"
              >
                <option value="critical">Critical (Immediate Outbreak Hazard)</option>
                <option value="high">High (Precautionary)</option>
                <option value="medium">Medium (Informational)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Target Geographic Sector</label>
            <input
              type="text"
              value={targetArea}
              onChange={(e) => setTargetArea(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-1.5">Advisory Message Content</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-xs leading-relaxed font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-slate-800 font-bold mb-2">Broadcast Channels</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'sms', label: 'SMS Cell Broadcast' },
                { id: 'dashboard', label: 'Admin Dashboard HUD' },
                { id: 'mobile_push', label: 'Citizen App Push' },
                { id: 'clinic_radio', label: 'Clinic VHF / Radio Network' }
              ].map((ch) => (
                <button
                  type="button"
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                    channels.includes(ch.id)
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Official Authorization Warning Banner */}
          {!isDistrictAdmin && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-xs block">Authorized for District Health Admins Only</span>
                <span className="text-[11px] text-amber-800">
                  You are currently signed in with a <strong className="capitalize">{currentUser?.role === 'health_worker' ? 'ASHA Worker' : currentUser?.role || 'Citizen'}</strong> account. Composing and dispatching regional emergency health advisories is strictly restricted to verified <strong>District Health Admins</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAdvisoryModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDistrictAdmin}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-extrabold transition-all flex items-center gap-2 shadow-md ${
                isDistrictAdmin
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              } disabled:opacity-60`}
            >
              {isDistrictAdmin ? <Send className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isSubmitting
                ? 'Broadcasting...'
                : isDistrictAdmin
                ? 'Broadcast Emergency Advisory'
                : 'Authorized for District Health Admins Only'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
