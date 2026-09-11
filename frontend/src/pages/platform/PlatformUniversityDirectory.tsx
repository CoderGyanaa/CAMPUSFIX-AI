import React, { useEffect, useState } from 'react';
import { Building2, Key, ShieldAlert, CheckCircle, Ban, RefreshCw, Mail, Globe, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface PlatformUniv {
  id: string;
  name: string;
  official_website: string;
  email_domain: string;
  country: string;
  is_active: boolean;
  total_reports: number;
  owner_email: string;
  created_at: string;
}

export const PlatformUniversityDirectory: React.FC = () => {
  const { token } = useAuth();
  const [universities, setUniversities] = useState<PlatformUniv[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/universities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUniversities(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, [token]);

  const handleToggleStatus = async (univId: string, currentStatus: boolean) => {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/universities/${univId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        setMsg(`University status updated to ${!currentStatus ? 'ACTIVE' : 'SUSPENDED'}`);
        fetchUniversities();
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const handleReissueToken = async (univId: string) => {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/universities/${univId}/reissue-owner-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMsg(`Success: Reissued Owner Activation Token: ${data.owner_activation_token}`);
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || 'Token reissue failed'}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Registered University Directory</h1>
          <p className="text-xs text-slate-400">Global tenant status governance, access revocation, and activation token management</p>
        </div>
        <button
          onClick={fetchUniversities}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
        </button>
      </div>

      {msg && (
        <div className={`p-4 text-xs rounded-xl border ${
          msg.startsWith('Success')
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-mono break-all'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {msg}
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-xs text-slate-400 p-8 text-center">Loading university directory...</div>
        ) : universities.length === 0 ? (
          <div className="text-xs text-slate-400 p-8 text-center space-y-2">
            <Building2 className="w-8 h-8 mx-auto text-slate-600" />
            <p>No universities registered on the platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">University</th>
                  <th className="py-3.5 px-4 font-semibold">Domain & Web</th>
                  <th className="py-3.5 px-4 font-semibold">Owner Email</th>
                  <th className="py-3.5 px-4 font-semibold">Tenant Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {universities.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {u.id.substring(0, 13)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-purple-300 font-mono text-[11px]">
                          @{u.email_domain}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Globe className="w-3 h-3 text-slate-500" /> {u.official_website}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-500" /> {u.owner_email}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold font-mono uppercase px-2.5 py-1 rounded-full border ${
                        u.is_active
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {u.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> ACTIVE
                          </>
                        ) : (
                          <>
                            <Ban className="w-3 h-3 text-red-400" /> SUSPENDED
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReissueToken(u.id)}
                          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] px-3 py-1.5 rounded-lg border border-slate-700 transition"
                          title="Reissue Owner Activation Token"
                        >
                          <Key className="w-3.5 h-3.5" /> Reissue Token
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg border font-medium transition ${
                            u.is_active
                              ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <Ban className="w-3.5 h-3.5" /> Suspend Tenant
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" /> Reactivate Tenant
                            </>
                          )}
                        </button>
                      </div>
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
