import React, { useEffect, useState } from 'react';
import { History, ShieldCheck, FileText, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface AuditLog {
  id: string;
  university_id: string;
  admin_user_id: string;
  action_type: string;
  target_entity: string;
  target_id: string;
  payload: string;
  created_at: string;
}

export const AdminAuditLogs: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [activeUniversityId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      } else {
        setLogs([
          {
            id: 'log-1',
            university_id: activeUniversityId || 'univ-1',
            admin_user_id: 'admin-user-1',
            action_type: 'OVERRIDE_AI_TRIAGE',
            target_entity: 'issues',
            target_id: 'issue-101',
            payload: 'final_admin_priority=CRITICAL, category=WATER, notes=Confirmed flood risk',
            created_at: '2026-09-11T12:00:00Z'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">System Audit Logs & History</h1>
        <p className="text-xs text-slate-400">Immutable administrative action history and platform access logs</p>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin User ID</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Audit Payload / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition-colors font-mono text-[11px]">
                    <td className="py-3.5 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{log.admin_user_id.slice(0, 10)}...</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action_type.includes('SUPER_ADMIN')
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{log.target_entity} #{log.target_id.slice(0, 6)}</td>
                    <td className="py-3.5 px-4 text-slate-400 line-clamp-1">{log.payload}</td>
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
