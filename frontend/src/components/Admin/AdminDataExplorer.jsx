import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import {
  Database,
  Search,
  Filter,
  Download,
  FileText,
  RefreshCw,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  HeartPulse,
  Bot,
  Lock,
  Megaphone,
  AlertTriangle,
  Users,
  ShieldCheck,
  Clock,
  Layers,
  MapPin,
  ExternalLink,
  Code
} from 'lucide-react';

const TABLES = [
  { id: 'telemetry', label: 'Water Telemetry', icon: Droplets, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { id: 'symptoms', label: 'ASHA & Symptom Logs', icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { id: 'consultations', label: 'AI Chat Consultations', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'encrypted_reports', label: 'Encrypted Dispatches', icon: Lock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'advisories', label: 'Broadcast Advisories', icon: Megaphone, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'alerts', label: 'Outbreak Alerts', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'users', label: 'User Registry', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
];

const DISTRICTS = [
  'All Districts',
  'Kamrup Metro',
  'Dispur',
  'Aizawl North',
  'Silchar',
  'Dibrugarh'
];

export default function AdminDataExplorer() {
  const { isDistrictAdmin } = useAuth();
  const { showToast } = useApp();

  const [activeTable, setActiveTable] = useState('telemetry');
  const [overview, setOverview] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(15);

  // Inspector Modal
  const [inspectedRecord, setInspectedRecord] = useState(null);
  const [inspectorTab, setInspectorTab] = useState('formatted'); // 'formatted' | 'json'
  const [isCopied, setIsCopied] = useState(false);

  // Load Overview Metrics
  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const res = await api.getDbOverview();
      if (res.success) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to load DB overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // Load Table Data
  const loadTableData = async () => {
    setIsLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
        search: searchQuery.trim(),
        district: selectedDistrict === 'All Districts' ? '' : selectedDistrict
      };

      const res = await api.getDbTableRecords(activeTable, params);
      if (res.success) {
        setRecords(res.data);
        setTotalPages(res.total_pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err) {
      console.error(`Failed to load ${activeTable} data:`, err);
      showToast(`Failed to load table ${activeTable}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTable, searchQuery, selectedDistrict]);

  useEffect(() => {
    loadTableData();
  }, [activeTable, currentPage, searchQuery, selectedDistrict]);

  // Export Table Data Trigger
  const handleExport = async (format) => {
    try {
      showToast(`Generating ${format.toUpperCase()} export for ${activeTable}...`, 'info');
      const params = {
        search: searchQuery.trim(),
        district: selectedDistrict === 'All Districts' ? '' : selectedDistrict
      };

      const blob = await api.exportDbTable(activeTable, format, params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jal_satark_${activeTable}_export_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast(`✅ ${format.toUpperCase()} export downloaded successfully.`, 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed. Please check network.', 'error');
    }
  };

  const handleCopyJSON = () => {
    if (inspectedRecord) {
      navigator.clipboard.writeText(JSON.stringify(inspectedRecord, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showToast('JSON copied to clipboard', 'info');
    }
  };

  const currentOverviewItem = overview.find((o) => o.table_key === activeTable);

  return (
    <div className="space-y-6">
      {/* 1. Command Center Database Header */}
      <div className="clean-card rounded-3xl p-6 shadow-xl border border-teal-500/30 bg-[#0A0F1D]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-400/40 flex items-center justify-center shadow-lg shadow-teal-500/10 flex-shrink-0 animate-pulse">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-slate-100 tracking-wide font-mono">
                  MASTER DATABASE EXPLORER & UNIFIED AUDIT CONSOLE
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold uppercase font-mono">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Real-time querying, sanitization audit & raw PostGIS telemetry streaming across Northeast water surveillance partitions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                loadOverview();
                loadTableData();
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-2 transition-all"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Grid</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/20"
              title="Export current table view to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 flex items-center gap-1.5 transition-all"
              title="Export current table view to JSON"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* 2. Table Tabs Carousel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-4">
          {TABLES.map((tab) => {
            const Icon = tab.icon;
            const item = overview.find((o) => o.table_key === tab.id);
            const isSelected = activeTable === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTable(tab.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-teal-400 text-slate-100 shadow-lg shadow-teal-500/10 scale-[1.02]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-7 w-7 rounded-xl ${tab.bg} ${tab.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {item && (
                    <span className="text-xs font-mono font-extrabold text-slate-200">
                      {item.row_count}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-bold block truncate">{tab.label}</span>
                  <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                    {item?.status_summary?.split('(')[0] || 'Ready'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Data Explorer Card */}
      <div className="clean-card rounded-3xl p-6 shadow-xl border border-slate-800 bg-[#0A0F1D]">
        {/* Toolbar: Search, Filters & Stats */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentOverviewItem?.display_name || 'table'} records...`}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-400"
            >
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-400 font-mono">
            <span>
              Showing <strong className="text-teal-300">{records.length}</strong> of <strong className="text-slate-200">{totalCount}</strong> rows
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400">
              Page {currentPage} / {totalPages}
            </span>
          </div>
        </div>

        {/* Dynamic Table Render */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-400 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-mono text-slate-400">Executing dynamic database query...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
            <Database className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">No Matching Database Records Found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No entries matched your current search parameters in table <code className="text-teal-400">{activeTable}</code>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase text-[10px] bg-slate-900/80">
                  <th className="py-3 px-3">Primary Identifier</th>
                  {activeTable === 'telemetry' && (
                    <>
                      <th className="py-3 px-2">WQI Score</th>
                      <th className="py-3 px-2">pH / Turbidity</th>
                      <th className="py-3 px-2">TDS / ORP</th>
                      <th className="py-3 px-2">Status</th>
                    </>
                  )}
                  {activeTable === 'symptoms' && (
                    <>
                      <th className="py-3 px-2">Household / Ward</th>
                      <th className="py-3 px-2">Reported Symptoms</th>
                      <th className="py-3 px-2">Intervention</th>
                      <th className="py-3 px-2">Severity</th>
                    </>
                  )}
                  {activeTable === 'consultations' && (
                    <>
                      <th className="py-3 px-2">Location</th>
                      <th className="py-3 px-2">Suspected Condition</th>
                      <th className="py-3 px-2">Severity</th>
                      <th className="py-3 px-2">Verified Retrain</th>
                    </>
                  )}
                  {activeTable === 'encrypted_reports' && (
                    <>
                      <th className="py-3 px-2">Target District</th>
                      <th className="py-3 px-2">Symmetric Key Encrypted</th>
                      <th className="py-3 px-2">Status</th>
                    </>
                  )}
                  {activeTable === 'advisories' && (
                    <>
                      <th className="py-3 px-2">Title</th>
                      <th className="py-3 px-2">Target District</th>
                      <th className="py-3 px-2">Severity</th>
                      <th className="py-3 px-2">Status</th>
                    </>
                  )}
                  {activeTable === 'alerts' && (
                    <>
                      <th className="py-3 px-2">Alert Title</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Severity</th>
                      <th className="py-3 px-2">Status</th>
                    </>
                  )}
                  {activeTable === 'users' && (
                    <>
                      <th className="py-3 px-2">Full Name</th>
                      <th className="py-3 px-2">Email</th>
                      <th className="py-3 px-2">Role</th>
                      <th className="py-3 px-2">Assigned District</th>
                    </>
                  )}
                  <th className="py-3 px-2">Timestamp</th>
                  <th className="py-3 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {records.map((record, index) => (
                  <tr
                    key={record.id || index}
                    onClick={() => setInspectedRecord(record)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Primary Identifier */}
                    <td className="py-3 px-3 text-slate-300 font-bold max-w-[160px] truncate">
                      <span className="text-teal-400 hover:underline">
                        {record.id?.slice(0, 13) || record.patient_identifier || record.node_uid || `REC-${index + 1}`}...
                      </span>
                    </td>

                    {/* Table-specific cells */}
                    {activeTable === 'telemetry' && (
                      <>
                        <td className="py-3 px-2 font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              record.wqi_score >= 80
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : record.wqi_score >= 50
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-300 border border-red-500/30'
                            }`}
                          >
                            {record.wqi_score} ({record.wqi_grade})
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-300">
                          {record.ph} pH &bull; {record.turbidity} NTU
                        </td>
                        <td className="py-3 px-2 text-slate-400">
                          {record.tds} ppm &bull; {record.orp} mV
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              record.is_anomalous
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {record.is_anomalous ? 'ANOMALOUS' : 'NORMAL'}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTable === 'symptoms' && (
                      <>
                        <td className="py-3 px-2 text-slate-300 max-w-[140px] truncate">
                          {record.household_head_name || record.patient_identifier}
                          <span className="text-[10px] text-slate-500 block">{record.village_ward}</span>
                        </td>
                        <td className="py-3 px-2 text-rose-300 max-w-[150px] truncate">
                          {Array.isArray(record.symptoms) ? record.symptoms.join(', ') : record.symptoms}
                        </td>
                        <td className="py-3 px-2 text-slate-400 max-w-[120px] truncate">
                          {record.field_intervention || 'None'}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                              record.severity === 'critical' || record.emergency_cluster_flag
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {record.severity || 'moderate'}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTable === 'consultations' && (
                      <>
                        <td className="py-3 px-2 text-slate-300">
                          {record.district}, {record.state}
                        </td>
                        <td className="py-3 px-2 text-purple-300 max-w-[140px] truncate">
                          {record.suspected_condition}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] uppercase font-bold">
                            {record.severity}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              record.verified_for_retraining
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {record.verified_for_retraining ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTable === 'encrypted_reports' && (
                      <>
                        <td className="py-3 px-2 text-emerald-300 font-bold">
                          {record.recipient_district}
                        </td>
                        <td className="py-3 px-2 text-slate-500 text-[10px] max-w-[140px] truncate font-mono">
                          {record.encrypted_symmetric_key?.slice(0, 24)}...
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] uppercase font-bold">
                            {record.status}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTable === 'advisories' && (
                      <>
                        <td className="py-3 px-2 text-slate-200 font-bold max-w-[160px] truncate">
                          {record.title}
                        </td>
                        <td className="py-3 px-2 text-slate-400">
                          {record.target_area_description || 'Kamrup Metro'}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] uppercase font-bold">
                            {record.severity}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-400 uppercase text-[9px]">
                          {record.status}
                        </td>
                      </>
                    )}

                    {activeTable === 'alerts' && (
                      <>
                        <td className="py-3 px-2 text-slate-200 font-bold max-w-[160px] truncate">
                          {record.title}
                        </td>
                        <td className="py-3 px-2 text-slate-400 uppercase text-[9px]">
                          {record.alert_type}
                        </td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] uppercase font-extrabold">
                            {record.severity}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-400 uppercase text-[9px]">
                          {record.status}
                        </td>
                      </>
                    )}

                    {activeTable === 'users' && (
                      <>
                        <td className="py-3 px-2 text-slate-200 font-bold">{record.full_name}</td>
                        <td className="py-3 px-2 text-teal-300 font-mono text-[11px]">{record.email}</td>
                        <td className="py-3 px-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] uppercase font-bold">
                            {record.role}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-400">{record.district || 'Assam Regional'}</td>
                      </>
                    )}

                    {/* Timestamp */}
                    <td className="py-3 px-2 text-slate-500 text-[10px] whitespace-nowrap">
                      {new Date(
                        record.recorded_at || record.reported_at || record.created_at || record.triggered_at || record.last_ping || Date.now()
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Inspector Trigger */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedRecord(record);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 hover:border-teal-400 text-[10px] font-bold transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 font-mono">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <span className="text-[11px]">
            Page <strong className="text-teal-300">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong>
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 flex items-center gap-1.5 transition-all"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Interactive Record Inspector Modal */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0F1D] border border-teal-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-400/30 flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100 font-mono">
                    RECORD INSPECTOR &bull; {activeTable.toUpperCase()}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {inspectedRecord.id || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setInspectorTab('formatted')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      inspectorTab === 'formatted'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Structured View
                  </button>
                  <button
                    onClick={() => setInspectorTab('json')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      inspectorTab === 'json'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <button
                  onClick={handleCopyJSON}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Copy JSON to clipboard"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setInspectedRecord(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)] space-y-4">
              {inspectorTab === 'formatted' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {Object.entries(inspectedRecord).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                    >
                      <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-wide">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-200 text-[11px] font-semibold mt-1 break-words">
                        {val === null || val === undefined
                          ? 'NULL'
                          : typeof val === 'object'
                          ? JSON.stringify(val, null, 2)
                          : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-teal-300 font-mono text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(inspectedRecord, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
