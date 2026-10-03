import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  AlertTriangle,
  Radio,
  MapPin,
  Flame,
  ShieldCheck,
  PlusCircle,
  Megaphone,
  Droplets,
  Bell,
  LogIn,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Lock,
  ClipboardList,
  Database
} from 'lucide-react';

export default function Navbar() {
  const {
    activeTab,
    setActiveTab,
    activeAlertsCount,
    criticalAlertsCount,
    setIsAdvisoryModalOpen,
    setIsIntakeModalOpen,
    setIsSecureDispatchOpen,
    toast
  } = useApp();

  const {
    user,
    isAuthenticated,
    isDistrictAdmin,
    isHealthWorker,
    isCitizen,
    openLoginModal,
    logout
  } = useAuth();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role) => {
    const r = (role || '').toLowerCase();
    if (['district_admin', 'district_health_admin', 'admin', 'government'].includes(r)) {
      return {
        label: 'District Health Admin',
        color: 'bg-rose-950/80 text-rose-300 border border-rose-500/40 font-semibold px-2 py-0.5 rounded text-[10px] tracking-wider'
      };
    }
    if (['health_worker', 'asha_worker', 'asha'].includes(r)) {
      return {
        label: 'ASHA Worker',
        color: 'bg-sky-950/80 text-sky-300 border border-sky-500/40 font-semibold px-2 py-0.5 rounded text-[10px] tracking-wider'
      };
    }
    return {
      label: 'Citizen / Volunteer',
      color: 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold px-2 py-0.5 rounded text-[10px] tracking-wider'
    };
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-[1000] relative shadow-sm transition-all">
      {/* Dynamic Role Indicator & Status Bar */}
      <div
        className={`w-full border-b transition-colors px-4 lg:px-8 py-1.5 text-xs ${
          isDistrictAdmin
            ? 'bg-[#040810] border-teal-500/30 text-slate-200'
            : isHealthWorker
            ? 'bg-slate-900 border-sky-500/30 text-slate-200'
            : 'bg-slate-900 border-emerald-500/20 text-slate-200'
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isDistrictAdmin ? (
              <div className="h-5 w-5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-400/40 flex items-center justify-center animate-pulse">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
              </div>
            ) : isHealthWorker ? (
              <div className="h-5 w-5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
            <span className="font-extrabold tracking-wide">
              {isDistrictAdmin
                ? 'Tactical High-Command Console • District Admin Mode'
                : isHealthWorker
                ? 'Field Health Worker Portal • Verification & Surveillance'
                : 'Community Health Portal • Public Surveillance & Citizen Triage'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span
              className={`h-2 w-2 rounded-full ${
                isDistrictAdmin
                  ? 'bg-teal-400 animate-ping'
                  : isHealthWorker
                  ? 'bg-sky-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`font-bold ${
                isDistrictAdmin ? 'text-teal-300' : isHealthWorker ? 'text-sky-300' : 'text-emerald-300'
              }`}
            >
              {isDistrictAdmin
                ? 'Broadcasting & Triage Privileges Active'
                : isHealthWorker
                ? 'Field Intake & Case Verification Active'
                : 'Live Grid Monitoring & Encrypted Dispatch'}
            </span>
            {isDistrictAdmin && (
              <span className="hidden sm:inline text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-teal-500/30">
                🔒 RSA-2048 • AES-256 E2EE Enabled
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 px-4 lg:px-8 py-3">
        {/* Brand & Emergency Identification */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-bold">
              <Droplets className="h-6 w-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-extrabold text-xl tracking-tight text-slate-900">
                Jal-Satark
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Response Grid
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold tracking-wide">
              Regional Water & Health Intelligence Platform • Northeast Surveillance Grid
            </p>
          </div>
        </div>

        {/* Clean Emergency Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-white text-sky-700 border border-slate-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 text-sky-600" />
            Command Map HUD
          </button>
          <button
            onClick={() => setActiveTab('sensors')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'sensors'
                ? 'bg-white text-sky-700 border border-slate-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-sky-600" />
            Grid Telemetry
          </button>
          <button
            onClick={() => setActiveTab('surveillance')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'surveillance'
                ? 'bg-white text-sky-700 border border-slate-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            Clinical Intake
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${
              activeTab === 'alerts'
                ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            Outbreak Triage
            {activeAlertsCount > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] font-extrabold rounded-full text-white ${
                  criticalAlertsCount > 0 ? 'bg-red-600 animate-bounce' : 'bg-amber-500'
                }`}
              >
                {activeAlertsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'simulation'
                ? 'bg-white text-amber-800 border border-slate-200 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Simulation Lab
          </button>
          {isHealthWorker && (
            <button
              onClick={() => setActiveTab('asha_desk')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'asha_desk'
                  ? 'bg-white text-indigo-700 border border-slate-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
              ASHA Field Desk
            </button>
          )}
          {(user?.role === 'district_admin' || user?.role === 'government') && (
            <>
              <button
                onClick={() => setActiveTab('classified_inbox')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'classified_inbox'
                    ? 'bg-slate-900 text-sky-400 border border-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-sky-400" />
                Classified Inbox
              </button>
              <button
                onClick={() => setActiveTab('db_explorer')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'db_explorer'
                    ? 'bg-slate-900 text-teal-400 border border-teal-500/40 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Database className="h-3.5 w-3.5 text-teal-400" />
                DB Explorer
              </button>
            </>
          )}
        </nav>

        {/* Action & User Profile Section */}
        <div className="flex items-center gap-2">
          {/* E2EE Citizen Secure Dispatch Button */}
          <button
            onClick={() => setIsSecureDispatchOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-sky-950 text-white transition-all flex items-center gap-1.5 shadow-sm border border-slate-800 hover:scale-[1.02] active:scale-[0.98]"
            title="Send End-to-End Encrypted Whistleblower or Hazard Report"
          >
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Secure Dispatch</span>
            <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase font-mono">
              E2EE
            </span>
          </button>

          {/* ASHA Fast Proxy Intake Button */}
          {isHealthWorker && (
            <button
              onClick={() => setActiveTab('asha_desk')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 border border-emerald-500 hover:scale-[1.02] active:scale-[0.98]"
              title="Log Household Field Intake"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">📝 New Field Report</span>
            </button>
          )}

          <button
            onClick={() => setIsIntakeModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-all flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4 text-sky-600" />
            <span className="hidden lg:inline">Log Clinic Intake</span>
          </button>
          {isDistrictAdmin ? (
            <button
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all flex items-center gap-2 shadow-md shadow-red-600/20 border border-red-500 hover:scale-[1.02] active:scale-[0.98]"
              title="Issue Emergency Public Health Advisory"
            >
              <Megaphone className="h-4 w-4" />
              <span className="hidden lg:inline">Broadcast Advisory</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAdvisoryModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all flex items-center gap-2"
              title="Authorized for District Health Admins Only"
            >
              <Megaphone className="h-4 w-4 text-slate-400" />
              <span className="hidden lg:inline">Broadcast Advisory</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                Admin
              </span>
            </button>
          )}

          {/* Authentication Badge & Dropdown */}
          {isAuthenticated && user ? (
            <div className="relative ml-1.5" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 min-w-fit px-3 py-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-all text-left shadow-sm"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-100 whitespace-nowrap">
                      {user.full_name}
                    </span>
                    <span
                      className={`uppercase whitespace-nowrap ${getRoleBadge(user.role).color}`}
                    >
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>
                  <span className="text-slate-300 font-medium text-[11px] block whitespace-nowrap">
                    {user.district || 'Kamrup Metro'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 text-slate-200">
                  <div className="p-2.5 border-b border-slate-800 mb-2">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0">
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-extrabold text-xs text-slate-100 block truncate">
                          {user.full_name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pt-1">
                      <span>Jurisdiction:</span>
                      <span className="font-bold text-slate-100">{user.district}, {user.state}</span>
                    </div>
                  </div>

                  <div className="mb-2 px-2.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">Access Privilege:</span>
                    <span className={`uppercase ${getRoleBadge(user.role).color}`}>
                      {getRoleBadge(user.role).label}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-transparent hover:border-rose-800/50 text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out of Grid
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openLoginModal}
              className="ml-1 px-3.5 py-2 text-xs font-extrabold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-2 shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5 text-sky-400" />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Emergency Live Notification Banner */}
      {toast && (
        <div className="max-w-[1600px] mx-auto mt-2.5 animate-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between border shadow-sm ${
              toast.type === 'critical'
                ? 'bg-red-50 text-red-800 border-red-300 animate-pulse'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-sky-50 text-sky-800 border-sky-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">
                {toast.type === 'critical' ? '🚨' : toast.type === 'warning' ? '⚠️' : '⚡'}
              </span>
              <span className="font-bold">{toast.message}</span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200">
              Live Ingestion Feed
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
