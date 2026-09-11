import React, { useEffect, useState } from 'react';
import { UserCheck, Search, ShieldAlert, Award } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface StudentItem {
  user_id: string;
  email: string;
  full_name: string;
  student_id: string;
  department: string;
  points: number;
  status: string;
  created_at: string;
}

export const StudentRosterPage: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetchStudents();
  }, [activeUniversityId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to fetch students roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/students/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchStudents();
      }
    } catch (err) {
      console.error('Failed to toggle student status:', err);
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Student Directory & Governance</h1>
        <p className="text-xs text-slate-400">View enrolled students, point balances, and manage active/suspended account status</p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="relative max-w-xs text-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, email, ID..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-200"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Points</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Governance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredStudents.map((st) => (
                  <tr key={st.user_id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{st.full_name}</td>
                    <td className="py-3.5 px-4 font-mono">{st.email}</td>
                    <td className="py-3.5 px-4">{st.department}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-400">{st.points} pts</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        st.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(st.user_id, st.status)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          st.status === 'ACTIVE'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {st.status === 'ACTIVE' ? 'Suspend Student' : 'Activate Account'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
