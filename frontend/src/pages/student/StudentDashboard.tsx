import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, CheckCircle2, AlertTriangle, PlusCircle, MapPin, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { ReportWizardModal } from '../../components/report/ReportWizardModal';

export const StudentDashboard: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchSummary = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/v1/student/dashboard-summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      }
    })
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [token, activeUniversityId]);

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{summary?.greeting || 'Welcome Back!'}</h1>
          <p className="text-xs text-slate-400 mt-1">See It. Report It. Fix It. Make Campus Better.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <PlusCircle className="w-4 h-4" /> Report an Issue
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Award className="w-4 h-4 text-emerald-400" /> Contribution Points
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.points ?? 0}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">+Verified events only</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Monthly Rank
          </span>
          <div className="text-2xl font-extrabold text-white">#{summary?.personal_stats?.rank ?? 1}</div>
          <span className="text-[10px] text-slate-400">Campus sustainability tier</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-purple-400" /> Verified Contributions
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.verified_contributions ?? 0}</div>
          <span className="text-[10px] text-purple-400 font-semibold">Admin-verified reports</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Activity className="w-4 h-4 text-amber-400" /> Issues Helped Resolve
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.issues_resolved ?? 0}</div>
          <span className="text-[10px] text-slate-400">Campus impact count</span>
        </div>
      </div>

      {/* Active Campus Snapshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Campus Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.critical ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Critical Issues</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.high ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">High Priority</div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-lg text-sky-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.medium ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Medium Priority</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg text-slate-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.low ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Low Priority</div>
          </div>
        </div>
      </div>

      {/* Report Wizard Modal */}
      <ReportWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={fetchSummary}
      />
    </div>
  );
};
