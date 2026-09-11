import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Award, CheckCircle2, HeartHandshake, History, Globe, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface ImpactData {
  user_id: string;
  university_id: string;
  verified_reports_count: number;
  resolved_issues_count: number;
  community_confirmations_count: number;
  points_earned: number;
  badges_earned_count: number;
  sdg_contributions: Record<string, number>;
  monthly_trends: Record<string, number>;
  timeline: Array<{
    id: string;
    event_type: string;
    title: string;
    points: number;
    timestamp: string;
  }>;
}

export const StudentImpactPage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiBase = API_BASE_URL;

  useEffect(() => {
    if (!token || !activeUniversityId) return;
    setLoading(true);
    fetch(`${apiBase}/api/v1/analytics/student-impact`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setImpact(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, activeUniversityId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-400" /> Student Sustainability Impact Dashboard
        </h1>
        <p className="text-xs text-slate-400 mt-1">Empirical sustainability contributions verified by database records</p>
      </div>

      {/* Mandatory No Fabricated Numbers Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-xs text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold">Verified Data Standard:</span> All impact metrics are calculated strictly from database-verified submissions, community confirmations, and operational issue resolution events. We do not invent unverified environmental estimates.
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse"></div>
      ) : (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
              <span className="text-slate-400 font-medium">Verified Submissions</span>
              <div className="text-2xl font-bold text-white">{impact?.verified_reports_count ?? 0}</div>
              <p className="text-[10px] text-slate-500">Database-verified observation reports</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
              <span className="text-slate-400 font-medium">Issues Successfully Resolved</span>
              <div className="text-2xl font-bold text-teal-400">{impact?.resolved_issues_count ?? 0}</div>
              <p className="text-[10px] text-slate-500">Verified campus repairs completed</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
              <span className="text-slate-400 font-medium">Community Confirmations</span>
              <div className="text-2xl font-bold text-sky-400">{impact?.community_confirmations_count ?? 0}</div>
              <p className="text-[10px] text-slate-500">Peer validation signals contributed</p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
              <span className="text-slate-400 font-medium">Sustainability Points</span>
              <div className="text-2xl font-bold text-purple-400">{impact?.points_earned ?? 0}</div>
              <p className="text-[10px] text-purple-400 font-medium">{impact?.badges_earned_count ?? 0} Badges Earned</p>
            </div>
          </div>

          {/* SDG Breakdown & Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SDG Mapping */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> UN Sustainable Development Goals (SDGs)
              </h3>
              {Object.keys(impact?.sdg_contributions || {}).length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4">No categorical contributions logged yet</div>
              ) : (
                <div className="space-y-3 text-xs">
                  {Object.entries(impact?.sdg_contributions || {}).map(([sdg, count]) => (
                    <div key={sdg} className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-mono">{sdg}</span>
                        <span className="font-bold text-emerald-400">{count} reports</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" /> Personal Impact Activity Timeline
              </h3>
              {impact?.timeline?.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4">No recent contribution activity</div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {impact?.timeline?.map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{item.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span className="text-teal-400 font-mono font-bold">+{item.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
