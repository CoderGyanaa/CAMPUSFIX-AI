import React, { useEffect, useState } from 'react';
import { TrendingUp, Trophy, Award, Medal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface LeaderEntry {
  rank: number;
  full_name: string;
  avatar_url: string;
  department: string;
  points: number;
  // Student ID is completely excluded from public leaderboard data!
}

export const StudentLeaderboardPage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/student/leaderboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      }
    })
      .then((res) => res.json())
      .then((data) => setBoard(data.leaderboard || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, activeUniversityId]);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-400" /> Campus Leaderboard
        </h1>
        <p className="text-xs text-slate-400 mt-1">Rankings based on verified sustainability contributions & actions</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : board.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
          No rankings recorded yet for this campus. Be the first to report an issue!
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Contributor</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-right">Verified Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {board.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400"><Trophy className="w-4 h-4" /> #1</span>
                      ) : item.rank === 2 ? (
                        <span className="inline-flex items-center gap-1 text-slate-300"><Medal className="w-4 h-4 text-slate-300" /> #2</span>
                      ) : item.rank === 3 ? (
                        <span className="inline-flex items-center gap-1 text-amber-600"><Medal className="w-4 h-4 text-amber-600" /> #3</span>
                      ) : (
                        `#${item.rank}`
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.full_name}
                      {/* Notice: Student ID is NEVER rendered here */}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{item.department || 'General'}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400">{item.points} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
