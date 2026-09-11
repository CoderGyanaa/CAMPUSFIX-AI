import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, ShieldCheck, CheckCircle2, AlertTriangle, Users, Award, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { AnalyticsKpiCard } from '../../components/analytics/AnalyticsKpiCard';
import { AnalyticsDistributionChart } from '../../components/analytics/AnalyticsDistributionChart';
import { AnalyticsFilterBar } from '../../components/analytics/AnalyticsFilterBar';

interface DepartmentOption {
  id: string;
  name: string;
}

interface SlaPerformance {
  total_closed: number;
  resolved_within_sla_count: number;
  sla_compliance_pct: number;
  avg_resolution_time_hours: number;
}

interface DepartmentWorkload {
  department_id?: string;
  department_name: string;
  total_assigned: number;
  in_progress: number;
  resolved: number;
}

interface UniversityAnalyticsData {
  university_id: string;
  university_name: string;
  total_reports: number;
  verified_issues: number;
  resolved_issues: number;
  open_in_progress_issues: number;
  resolution_rate_pct: number;
  avg_resolution_time_hours: number;
  sla_performance: SlaPerformance;
  category_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  department_workload: DepartmentWorkload[];
  monthly_trends: Record<string, number>;
  sdg_mapping: Record<string, number>;
  student_engagement: Record<string, number>;
}

export const UniversityAnalyticsDashboard: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [data, setData] = useState<UniversityAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const apiBase = API_BASE_URL;

  const fetchAnalytics = async () => {
    if (!token || !activeUniversityId) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (category) queryParams.append('category', category);
      if (priority) queryParams.append('priority', priority);
      if (departmentId) queryParams.append('department_id', departmentId);
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await fetch(`${apiBase}/api/v1/analytics/university?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch university analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token || !activeUniversityId) return;
    setExporting(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      if (category) queryParams.append('category', category);
      if (priority) queryParams.append('priority', priority);
      if (departmentId) queryParams.append('department_id', departmentId);
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await fetch(`${apiBase}/api/v1/analytics/university/export?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campusfix_analytics_${activeUniversityId.slice(0, 8)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('CSV Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCategory('');
    setPriority('');
    setDepartmentId('');
    setStatusFilter('');
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token, activeUniversityId, startDate, endDate, category, priority, departmentId, statusFilter]);

  const categoryItems = Object.entries(data?.category_distribution || {}).map(([cat, count]) => ({
    label: cat,
    count,
    color: 'bg-purple-500'
  }));

  const priorityItems = Object.entries(data?.priority_distribution || {}).map(([prio, count]) => ({
    label: prio,
    count,
    color: prio === 'CRITICAL' ? 'bg-red-500' : prio === 'HIGH' ? 'bg-amber-500' : prio === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-500'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-teal-400" /> Executive University Analytics & Impact
          </h1>
          <p className="text-xs text-slate-400 mt-1">Operational resolution metrics, SLA compliance & sustainability performance</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {/* Strict Tenant Isolation & Data Integrity Banner */}
      <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-teal-300">
        <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
        <div>
          <span className="font-bold">Strict Tenant Data Isolation:</span> Displaying metrics exclusively for{' '}
          <span className="font-semibold text-white">{data?.university_name || 'Active Institution'}</span>. RLS security rules prevent cross-tenant exposure. All figures are backed by empirical database audit trails.
        </div>
      </div>

      {/* Filter Bar */}
      <AnalyticsFilterBar
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        category={category}
        setCategory={setCategory}
        priority={priority}
        setPriority={setPriority}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        status={statusFilter}
        setStatus={setStatusFilter}
        departments={departments}
        onReset={handleResetFilters}
        onExport={handleExportCsv}
        exporting={exporting}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-slate-900/60 border border-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnalyticsKpiCard
              title="Total Observations Logged"
              value={data?.total_reports ?? 0}
              subtext={`${data?.verified_issues ?? 0} Verified by Community`}
              icon={FileText}
              colorTheme="blue"
            />

            <AnalyticsKpiCard
              title="Resolved Issues Count"
              value={data?.resolved_issues ?? 0}
              subtext={`${data?.open_in_progress_issues ?? 0} Open / In Progress`}
              icon={CheckCircle2}
              colorTheme="emerald"
            />

            <AnalyticsKpiCard
              title="Global Resolution Rate"
              value={`${data?.resolution_rate_pct ?? 0}%`}
              subtext="Total Closed vs Total Submissions"
              icon={BarChart3}
              colorTheme="teal"
            />

            <AnalyticsKpiCard
              title="Average Resolution Time"
              value={`${data?.avg_resolution_time_hours ?? 0}h`}
              subtext="Empirical time from report to closure"
              icon={Clock}
              colorTheme="purple"
            />

            <AnalyticsKpiCard
              title="SLA Compliance Rate"
              value={`${data?.sla_performance?.sla_compliance_pct ?? 0}%`}
              subtext={`Target: <= 48 Hours (${data?.sla_performance?.resolved_within_sla_count ?? 0}/${data?.sla_performance?.total_closed ?? 0} met)`}
              icon={ShieldCheck}
              colorTheme="amber"
            />

            <AnalyticsKpiCard
              title="Student Engagement"
              value={data?.student_engagement?.active_reporting_students ?? 0}
              subtext={`${data?.student_engagement?.total_confirmations_contributed ?? 0} Confirmations | ${data?.student_engagement?.badges_awarded ?? 0} Badges`}
              icon={Users}
              colorTheme="rose"
            />
          </div>

          {/* Distribution Breakdown Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnalyticsDistributionChart
              title="Priority Distribution"
              icon={AlertTriangle}
              items={priorityItems}
              totalCount={data?.total_reports ?? 0}
              colorTheme="bg-amber-500"
            />

            <AnalyticsDistributionChart
              title="Category Breakdown"
              icon={BarChart3}
              items={categoryItems}
              totalCount={data?.total_reports ?? 0}
              colorTheme="bg-purple-500"
            />
          </div>

          {/* Department Workload & SDG Mapping */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Workload Table */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" /> Department Workload & Performance
              </h3>
              {data?.department_workload?.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4 text-center">No department workload records available</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="pb-2">Department</th>
                        <th className="pb-2 text-center">Assigned</th>
                        <th className="pb-2 text-center">In Progress</th>
                        <th className="pb-2 text-center">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {data?.department_workload?.map((dw, idx) => (
                        <tr key={dw.department_id || idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-medium text-slate-200">{dw.department_name}</td>
                          <td className="py-2.5 text-center font-mono text-slate-400">{dw.total_assigned}</td>
                          <td className="py-2.5 text-center font-mono text-amber-400 font-semibold">{dw.in_progress}</td>
                          <td className="py-2.5 text-center font-mono text-emerald-400 font-semibold">{dw.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* UN Sustainable Development Goals (SDG) Alignment */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Sustainability Impact Alignment (UN SDGs)
              </h3>
              {Object.keys(data?.sdg_mapping || {}).length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4 text-center">No SDG alignment data available</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {Object.entries(data?.sdg_mapping || {}).map(([sdg, count]) => {
                    const total = data?.total_reports || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={sdg} className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="font-mono">{sdg}</span>
                          <span className="font-bold text-emerald-400">{count} issues ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
