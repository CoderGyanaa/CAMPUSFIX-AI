import React, { useEffect, useState } from 'react';
import { Award, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface Badge {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  points_threshold: number;
  unlocked: boolean;
}

export const StudentAchievementsPage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [achievements, setAchievements] = useState<Badge[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/student/achievements`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setAchievements(data.achievements || []);
        setUserPoints(data.user_points || 0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, activeUniversityId]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-400" /> Badges & Achievements
          </h1>
          <p className="text-xs text-slate-400 mt-1">Unlock badges by contributing to verified sustainability events</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400">
          {userPoints} Verified Points
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {achievements.map((b) => (
            <div
              key={b.id || b.code}
              className={`p-5 rounded-2xl border transition space-y-3 ${
                b.unlocked
                  ? 'bg-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                  : 'bg-slate-900/50 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl border ${b.unlocked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                  {b.unlocked ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.unlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {b.points_threshold} pts req
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm">{b.name}</h3>
                <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">{b.description}</p>
              </div>

              <div className="pt-1 text-[10px] font-semibold text-slate-500">
                {b.unlocked ? (
                  <span className="text-emerald-400 flex items-center gap-1">Unlocked</span>
                ) : (
                  <span>Locked • Need {Math.max(0, b.points_threshold - userPoints)} more pts</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
