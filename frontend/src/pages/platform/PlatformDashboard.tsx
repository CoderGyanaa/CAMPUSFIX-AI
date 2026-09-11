import React, { useEffect, useState } from 'react';
import { Building2, FileText, Activity, ShieldAlert, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface PlatformStats {
  total_universities: number;
  active_universities: number;
  pending_requests: number;
  total_reports: number;
  security_alerts_count: number;
  system_status: string;
}

export const PlatformDashboard: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch platform stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Command Center</h1>
          <p className="text-xs text-slate-400">Global multi-tenant governance, university onboarding, and security audit</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Platform Status
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Registered Universities</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats?.total_universities ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.active_universities ?? 0} Active Tenants
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Pending Onboarding Requests</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats?.pending_requests ?? 0}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">
            Requires Super Admin Review
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Global Reports Processed</span>
            <Activity className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats?.total_reports ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Across all active campuses
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-medium">Security Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats?.security_alerts_count ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3 h-3" /> System Status: OPERATIONAL
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/platform/requests"
          className="bg-slate-900/40 border border-slate-800 hover:border-purple-500/50 p-6 rounded-xl space-y-3 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 flex items-center justify-between">
            University Registration Requests
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Review applicant institutions, verify credentials, and approve tenants with automated owner token generation.
          </p>
        </Link>

        <Link
          to="/platform/directory"
          className="bg-slate-900/40 border border-slate-800 hover:border-teal-500/50 p-6 rounded-xl space-y-3 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-teal-300 flex items-center justify-between">
            University Directory & Suspension
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition" />
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Manage registered universities, suspend non-compliant tenants (immediately revoking API access), or reissue owner tokens.
          </p>
        </Link>

        <Link
          to="/platform/analytics"
          className="bg-slate-900/40 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-xl space-y-3 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 flex items-center justify-between">
            Aggregated Non-PII Analytics
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            View platform-wide sustainability impact, category distributions, and resolution performance with zero student PII leakage.
          </p>
        </Link>
      </div>
    </div>
  );
};
