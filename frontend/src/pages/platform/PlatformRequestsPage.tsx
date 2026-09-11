import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle2, XCircle, RefreshCw, Clock, Globe, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface ReqItem {
  id: string;
  university_name: string;
  official_website: string;
  institution_type: string;
  applicant_name: string;
  applicant_designation: string;
  official_email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

export const PlatformRequestsPage: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ReqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

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
      console.error('Failed to fetch requests:', e);
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
        setMsg(`Success: Approved! Generated owner activation token: ${data.owner_activation_token}`);
        fetchRequests();
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || 'Approval failed'}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const handleReject = async (id: string) => {
    setMsg('');
    const reason = rejectReason[id] || 'Does not meet university verification criteria';
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/requests/${id}/reject?reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg('University registration request rejected.');
        fetchRequests();
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || 'Rejection failed'}`);
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
          <h1 className="text-2xl font-bold text-white tracking-tight">University Registration Requests</h1>
          <p className="text-xs text-slate-400">Review pending institutional registration applications</p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-2 rounded-lg text-slate-300 transition w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
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

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-xs text-slate-400 p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800">
            Loading registration requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="text-xs text-slate-400 p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p>No university registration requests submitted yet.</p>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{r.university_name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-500" /> {r.official_website}</span>
                    <span>•</span>
                    <span>{r.city}, {r.country}</span>
                    <span>•</span>
                    <span className="font-mono text-purple-400">{r.institution_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold font-mono uppercase px-2.5 py-1 rounded-full border ${
                    r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {r.status}
                  </span>
                </div>
              </div>

              {/* Applicant Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300 bg-slate-950/40 p-4 rounded-lg border border-slate-800/50">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Applicant</span>
                  <div className="font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-purple-400" /> {r.applicant_name}</div>
                  <div className="text-slate-400 text-[11px]">{r.applicant_designation}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Contact Email</span>
                  <div className="font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-teal-400" /> {r.official_email}</div>
                  <div className="text-slate-400 text-[11px]">Phone: {r.phone}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Submitted At</span>
                  <div className="font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Rejection Reason if rejected */}
              {r.status === 'REJECTED' && r.rejection_reason && (
                <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-lg">
                  <span className="font-bold">Rejection Reason:</span> {r.rejection_reason}
                </div>
              )}

              {/* Action Buttons */}
              {r.status === 'PENDING' && (
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-800/80">
                  <input
                    type="text"
                    placeholder="Optional rejection reason..."
                    value={rejectReason[r.id] || ''}
                    onChange={(e) => setRejectReason({ ...rejectReason, [r.id]: e.target.value })}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-200 focus:outline-none focus:border-red-500 flex-1 max-w-xs"
                  />
                  <button
                    onClick={() => handleReject(r.id)}
                    className="flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs px-4 py-2 rounded-lg font-medium transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject Request
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-5 py-2 rounded-lg shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Create Tenant
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
