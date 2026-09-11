import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck, PieChart, Activity, Award, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface PlatformAnalytics {
  total_reports_platform_wide: number;
  total_resolved_platform_wide: number;
  global_resolution_rate_pct: number;
  total_sustainability_points: number;
  category_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
}

export const PlatformAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      }
    } catch (e) {
      console.error('Failed to fetch platform analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Aggregated Analytics</h1>
          <p className="text-xs text-slate-400">Platform-wide sustainability impact & operational metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
        </button>
      </div>

      {/* Strict Non-PII Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold">Strict Non-PII Privacy Enforced:</span> This dashboard aggregates high-level platform performance metrics across all universities. Zero student names, emails, student IDs, personal coordinates, or individual report details are exposed.
        </div>
      </div>

      {/* Top Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Platform Reports</div>
          <div className="text-2xl font-bold text-white">{loading ? '...' : data?.total_reports_platform_wide ?? 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Resolved Issues</div>
          <div className="text-2xl font-bold text-teal-400">{loading ? '...' : data?.total_resolved_platform_wide ?? 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Global Resolution Rate</div>
          <div className="text-2xl font-bold text-emerald-400">{loading ? '...' : `${data?.global_resolution_rate_pct ?? 0}%`}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Sustainability Points Awarded</div>
          <div className="text-2xl font-bold text-purple-400">{loading ? '...' : data?.total_sustainability_points ?? 0}</div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-400" /> Platform Category Breakdown
          </h3>
          {loading ? (
            <div className="text-xs text-slate-400">Loading breakdown...</div>
          ) : Object.keys(data?.category_distribution || {}).length === 0 ? (
            <div className="text-xs text-slate-400 italic">No categorical data available</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data?.category_distribution || {}).map(([cat, count]) => {
                const total = data?.total_reports_platform_wide || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-mono">{cat}</span>
                      <span className="font-bold text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" /> Global Priority Distribution
          </h3>
          {loading ? (
            <div className="text-xs text-slate-400">Loading breakdown...</div>
          ) : Object.keys(data?.priority_distribution || {}).length === 0 ? (
            <div className="text-xs text-slate-400 italic">No priority data available</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(data?.priority_distribution || {}).map(([prio, count]) => {
                const total = data?.total_reports_platform_wide || 1;
                const pct = Math.round((count / total) * 100);
                const colorClass =
                  prio === 'CRITICAL' ? 'bg-red-500' :
                  prio === 'HIGH' ? 'bg-amber-500' :
                  prio === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-500';
                return (
                  <div key={prio} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-mono">{prio}</span>
                      <span className="font-bold text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`${colorClass} h-full rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
