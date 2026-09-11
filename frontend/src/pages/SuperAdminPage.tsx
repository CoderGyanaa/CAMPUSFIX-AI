import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

interface ReqItem {
  id: string;
  university_name: string;
  official_website: string;
  applicant_name: string;
  applicant_designation: string;
  official_email: string;
  country: string;
  status: string;
  created_at: string;
}

export const SuperAdminPage: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const handleApprove = async (id: string) => {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMsg(`Approved! Activation token generated: ${data.owner_activation_token}`);
        fetchRequests();
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const handleReject = async (id: string) => {
    setMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg('University request rejected.');
        fetchRequests();
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Platform-level university registration request oversight</p>
          </div>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Requests
        </button>
      </header>

      {msg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">{msg}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">University Registration Requests</h3>

        {loading ? (
          <div className="text-xs text-slate-400">Loading pending requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-xs text-slate-500 py-8 text-center">No registration requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-medium uppercase">
                <tr>
                  <th className="pb-3">University</th>
                  <th className="pb-3">Website</th>
                  <th className="pb-3">Applicant</th>
                  <th className="pb-3">Official Email</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-white">{r.university_name}</td>
                    <td className="py-3 text-slate-400">{r.official_website}</td>
                    <td className="py-3 text-slate-300">{r.applicant_name} ({r.applicant_designation})</td>
                    <td className="py-3 text-slate-400">{r.official_email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : r.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            className="bg-rose-600/80 hover:bg-rose-500 text-white font-medium px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1 transition"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </>
                      )}
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
