import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  X,
  Lock,
  Mail,
  User,
  Shield,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  HeartPulse
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    roleName: 'District Health Admin',
    name: 'Dr. Ananya Sharma',
    email: 'admin@jalsatark.gov.in',
    password: 'Admin@123',
    role: 'district_admin',
    color: 'bg-red-50 text-red-700 border-red-200 hover:border-red-400'
  },
  {
    roleName: 'ASHA Worker',
    name: 'Bikash Roy (Supervisor)',
    email: 'healthworker@jalsatark.gov.in',
    password: 'Health@123',
    role: 'health_worker',
    color: 'bg-sky-50 text-sky-700 border-sky-200 hover:border-sky-400'
  },
  {
    roleName: 'Citizen / Volunteer',
    name: 'Priyanka Gogoi',
    email: 'citizen@jalsatark.gov.in',
    password: 'Citizen@123',
    role: 'citizen',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
  }
];

const NORTHEAST_DISTRICTS = [
  'Kamrup Metro',
  'Kamrup Rural',
  'Dibrugarh',
  'Tinsukia',
  'Dima Hasao',
  'Aizawl',
  'Imphal West',
  'Imphal East',
  'East Khasi Hills',
  'West Khasi Hills',
  'Ri-Bhoi',
  'Dimapur',
  'Kohima'
];

export default function AuthModal() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    register
  } = useAuth();
  const { showToast } = useApp();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('citizen');
  const [state, setState] = useState('Assam');
  const [district, setDistrict] = useState('Kamrup Metro');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Welcome back, ${res.user.full_name}!`, 'info');
      setIsAuthModalOpen(false);
      resetForm();
    } else {
      setError(res.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await register({
      full_name: fullName,
      email,
      password,
      role,
      state,
      district
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Account created! Signed in as ${res.user.full_name}.`, 'info');
      setIsAuthModalOpen(false);
      resetForm();
    } else {
      setError(res.error);
    }
  };

  const handleQuickDemoLogin = async (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
    setIsSubmitting(true);

    const res = await login(demo.email, demo.password);
    setIsSubmitting(false);

    if (res.success) {
      showToast(`Signed in as ${demo.name} (${demo.roleName})`, 'info');
      setIsAuthModalOpen(false);
      resetForm();
    } else {
      setError(res.error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 font-bold shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {authModalMode === 'login' ? 'Sign In to Jal-Satark' : 'Create Surveillance Account'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Regional Water & Public Health Intelligence Network
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="h-8 w-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                authModalMode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalMode('register');
                setError(null);
              }}
              className={`py-2 rounded-xl transition-all ${
                authModalMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Body Form */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authModalMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Featured 1-Click District Health Admin Demo Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin(DEMO_ACCOUNTS[0])}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-red-600/20 flex items-center justify-between group mb-3 border border-red-500 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="block font-extrabold text-xs">⚡ 1-Click Demo: District Health Admin</span>
                    <span className="text-[10px] text-red-100 font-medium">Full Emergency Advisory Broadcast & Triage Control</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" />
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@jalsatark.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs transition-all shadow-md shadow-sky-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Demo Login Buttons */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    All Role Demo Accounts:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((demo) => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => handleQuickDemoLogin(demo)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${demo.color}`}
                    >
                      <span className="font-extrabold text-[11px] block">{demo.roleName}</span>
                      <span className="text-[10px] opacity-80 truncate block">{demo.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@jalsatark.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    User Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="district_admin">District Health Admin (Emergency Broadcast & Triage)</option>
                    <option value="health_worker">ASHA Worker (Symptom Intake & Verification)</option>
                    <option value="citizen">Citizen / Volunteer (Public Access & Secure Dispatch)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Regional District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    {NORTHEAST_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 mt-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
