import React, { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, Clock, ShieldAlert, Wrench, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface DashboardStats {
  total_submitted: number;
  pending_triage: number;
  critical_high_count: number;
  assigned_in_progress: number;
  resolved_count: number;
  department_workload: Record<string, number>;
}

export const AdminDashboard: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulated or live fetch from /api/v1/admin/dashboard-stats
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-University-ID': activeUniversityId || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          // Fallback mock stats for offline preview
          setStats({
            total_submitted: 12,
            pending_triage: 3,
            critical_high_count: 4,
            assigned_in_progress: 5,
            resolved_count: 8,
            department_workload: {
              'Facilities & Electrical': 4,
              'Plumbing & Water': 3,
              'Sanitation': 2,
              'General Operations': 3
            }
          });
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [activeUniversityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Campus Operations Dashboard</h1>
          <p className="text-xs text-slate-400">Real-time issue status, SLA alerts, and department workload monitoring</p>
        </div>

        <Link
          to="/admin/issues"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors w-fit"
        >
          <span>Open Command Queue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submitted */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Open Reports</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats?.total_submitted ?? 0}</div>
          <span className="text-[11px] text-slate-500">Active campus observations</span>
        </div>

        {/* Critical / High Priority Alert */}
        <div className="bg-slate-900 border border-red-500/30 p-4 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400">Critical / High Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats?.critical_high_count ?? 0}</div>
          <span className="text-[11px] text-red-400/80 font-medium">Requires immediate operational dispatch</span>
        </div>

        {/* Assigned & In Progress */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">In Active Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats?.assigned_in_progress ?? 0}</div>
          <span className="text-[11px] text-slate-500">Assigned to staff & maintenance crews</span>
        </div>

        {/* Resolved */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Resolved & Closed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats?.resolved_count ?? 0}</div>
          <span className="text-[11px] text-slate-500">Verified resolution this term</span>
        </div>
      </div>

      {/* Department Workload Distribution */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-emerald-400" />
          Department Workload Distribution
        </h3>

        <div className="space-y-3">
          {Object.entries(stats?.department_workload || {}).map(([dept, count]) => {
            const maxVal = Math.max(...Object.values(stats?.department_workload || { a: 1 }));
            const pct = Math.round((count / (maxVal || 1)) * 100);
            return (
              <div key={dept} className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="font-medium">{dept}</span>
                  <span className="font-mono text-slate-400">{count} Active Issues</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
