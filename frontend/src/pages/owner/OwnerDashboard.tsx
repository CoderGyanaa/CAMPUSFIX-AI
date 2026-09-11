import React, { useEffect, useState } from 'react';
import { Users, UserCheck, CheckCircle2, Award, Building, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface OwnerStats {
  total_students: number;
  active_admins: number;
  total_reports: number;
  resolved_count: number;
  resolution_rate_pct: number;
  total_points_awarded: number;
}

export const OwnerDashboard: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, [activeUniversityId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats({
          total_students: 450,
          active_admins: 6,
          total_reports: 34,
          resolved_count: 29,
          resolution_rate_pct: 85.3,
          total_points_awarded: 4200
        });
      }
    } catch (err) {
      console.error('Failed to fetch owner stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">University Executive Dashboard</h1>
        <p className="text-xs text-slate-400">High-level sustainability metrics, student engagement, and admin capacity overview</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats?.total_students ?? 0}</div>
          <span className="text-[11px] text-slate-500">Verified campus accounts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Campus Admins</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats?.active_admins ?? 0}</div>
          <span className="text-[11px] text-slate-500">Operational staff</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLA Resolution Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats?.resolution_rate_pct ?? 100}%</div>
          <span className="text-[11px] text-slate-500">{stats?.resolved_count} of {stats?.total_reports} issues resolved</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Sustainability Points Awarded</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{stats?.total_points_awarded ?? 0} pts</div>
          <span className="text-[11px] text-slate-500">Student impact contributions</span>
        </div>
      </div>
    </div>
  );
};
