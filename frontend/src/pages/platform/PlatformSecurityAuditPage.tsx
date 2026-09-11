import React, { useEffect, useState } from 'react';
import { Lock, ShieldAlert, History, RefreshCw, AlertOctagon, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface AuditLog {
  id: string;
  university_id?: string;
  admin_user_id: string;
  action_type: string;
  target_entity: string;
  target_id: string;
  payload: string;
  created_at: string;
}

interface SecurityEvent {
  id: string;
  university_id?: string;
  user_id?: string;
  event_type: string;
  payload: string;
  created_at: string;
}

export const PlatformSecurityAuditPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'audit' | 'security'>('audit');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [auditRes, secRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/platform/audit-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/platform/security-events`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (secRes.ok) setSecurityEvents(await secRes.json());
    } catch (e) {
      console.error('Failed to fetch security audit data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Security & Audit Trail</h1>
          <p className="text-xs text-slate-400">Immutable platform mutation history and live security anomaly feed</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Feeds
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Immutable Audit Logs ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'security'
              ? 'border-red-400 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Security Events Feed ({securityEvents.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-xs text-slate-400 p-8 text-center">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-xs text-slate-400 p-8 text-center italic">No platform audit logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold">Action</th>
                    <th className="py-3.5 px-4 font-semibold">Super Admin ID</th>
                    <th className="py-3.5 px-4 font-semibold">Target</th>
                    <th className="py-3.5 px-4 font-semibold">Payload Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-purple-300">
                        {log.action_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {log.admin_user_id.substring(0, 12)}...
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {log.target_entity}:{log.target_id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">
                        {log.payload}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-xs text-slate-400 p-8 text-center">Loading security events...</div>
          ) : securityEvents.length === 0 ? (
            <div className="text-xs text-slate-400 p-8 text-center space-y-2 py-12">
              <ShieldAlert className="w-8 h-8 mx-auto text-emerald-400" />
              <p className="text-emerald-300 font-semibold">No Security Vulnerabilities or Attacks Detected</p>
              <p className="text-[11px] text-slate-500">System security posture remains clean.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold">Event Type</th>
                    <th className="py-3.5 px-4 font-semibold">University ID</th>
                    <th className="py-3.5 px-4 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {securityEvents.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(sec.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-red-400">
                        {sec.event_type}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {sec.university_id || 'Global'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {sec.payload}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
