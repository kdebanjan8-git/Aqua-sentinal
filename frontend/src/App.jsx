import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import LeafletMap from './components/Map/LeafletMap';
import TelemetryChart from './components/Charts/TelemetryChart';
import WQIOverview from './components/Charts/WQIOverview';
import AlertPanel from './components/Alerts/AlertPanel';
import AdvisoryModal from './components/Alerts/AdvisoryModal';
import SymptomIntakeModal from './components/Symptoms/SymptomIntakeModal';
import SymptomLogTable from './components/Symptoms/SymptomLogTable';
import SensorListPanel from './components/Sensors/SensorListPanel';
import SimulatorPanel from './components/Simulator/SimulatorPanel';
import SecureInbox from './components/Admin/SecureInbox';
import SecureDispatchModal from './components/Citizen/SecureDispatchModal';
import AshaFieldDesk from './components/Asha/AshaFieldDesk';
import AdminDataExplorer from './components/Admin/AdminDataExplorer';
import HealthChatDrawer from './components/Chat/HealthChatDrawer';
import AuthModal from './components/Auth/AuthModal';
import { Droplets, Compass, Database } from 'lucide-react';

function DashboardContent() {
  const { activeTab, isLoading, isSecureDispatchOpen, setIsSecureDispatchOpen } = useApp();
  const { isDistrictAdmin, openLoginModal } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-sky-600" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-extrabold text-slate-900">Initializing Jal-Satark Surveillance Grid</p>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Connecting to Brahmaputra Basin telemetry stream & AI engines...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* 1. Overview Metric Deck */}
      <WQIOverview />

      {/* 2. Dynamic Main View by Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Edge-to-Edge Leaflet GIS Canvas with Floating HUD */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow-green animate-pulse"></span>
                Spatial-Temporal Water Quality & Epidemic Surveillance Map
              </h2>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                Projection: EPSG:4326 (WGS 84) • PostGIS Active
              </span>
            </div>
            <LeafletMap />
          </div>

          {/* Bottom Grid: Live Telemetry Trend & Active Alert Triage */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TelemetryChart />
            <AlertPanel />
          </div>
        </div>
      )}

      {activeTab === 'sensors' && (
        <div className="space-y-6">
          <SensorListPanel />
          <TelemetryChart />
        </div>
      )}

      {activeTab === 'surveillance' && (
        <div className="space-y-6">
          <SymptomLogTable />
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <AlertPanel />
        </div>
      )}

      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <SimulatorPanel />
        </div>
      )}

      {activeTab === 'classified_inbox' && (
        <div className="space-y-6">
          <SecureInbox />
        </div>
      )}

      {activeTab === 'asha_desk' && (
        <div className="space-y-6">
          <AshaFieldDesk />
        </div>
      )}

      {activeTab === 'db_explorer' && (
        <div className="space-y-6">
          {isDistrictAdmin ? (
            <AdminDataExplorer />
          ) : (
            <div className="clean-card rounded-3xl p-12 text-center max-w-lg mx-auto bg-slate-900 border border-slate-800 text-slate-200 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100 font-mono">
                OFFICIAL AUTHORIZATION REQUIRED
              </h3>
              <p className="text-xs text-slate-400">
                The Master Database Explorer & Unified Audit Console is restricted to authenticated District Health Administrators.
              </p>
              <button
                onClick={() => openLoginModal()}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20"
              >
                Authenticate as District Admin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals & Floating Health Assistant Drawer */}
      <AdvisoryModal />
      <SymptomIntakeModal />
      <SecureDispatchModal
        isOpen={isSecureDispatchOpen}
        onClose={() => setIsSecureDispatchOpen(false)}
      />
      <HealthChatDrawer />
      <AuthModal />
    </main>
  );
}

function AppShell() {
  const { isDistrictAdmin, user } = useAuth();
  const roleName = isDistrictAdmin ? 'district_admin' : (user?.role || 'citizen');

  return (
    <div
      data-role={roleName}
      data-theme={isDistrictAdmin ? 'command-dark' : 'light'}
      className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 selection:bg-sky-500 selection:text-white ${
        isDistrictAdmin
          ? 'bg-[#070B14] text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      <Navbar className="flex-shrink-0 z-[1000] relative" />
      <main className="flex-1 relative overflow-y-auto">
        <DashboardContent />

        {/* Dynamic Themed Footer */}
        <footer
          className={`mt-12 py-6 border-t text-center text-xs transition-colors ${
            isDistrictAdmin
              ? 'bg-[#0A0F1D] border-slate-800/80 text-slate-400'
              : 'bg-white border-slate-200 text-slate-500 shadow-sm'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className={`flex items-center gap-2 font-bold ${isDistrictAdmin ? 'text-teal-400' : 'text-slate-700'}`}>
              <Droplets className="w-4 h-4 text-sky-500" />
              <span>Jal-Satark • Regional Water & Health Intelligence Platform</span>
            </div>
            <p className="text-[11px] font-semibold opacity-80">
              Equipped with PostGIS Geospatial Engine, Random Forest Risk Engine, Local Llama-3 Health AI & Command HUD
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </AuthProvider>
  );
}
