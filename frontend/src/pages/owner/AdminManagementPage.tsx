import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, UserX, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface AdminUser {
  membership_id: string;
  user_id: string;
  email: string;
  full_name: string;
  department?: string;
  status: string;
  created_at: string;
}

export const AdminManagementPage: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Invite Admin State
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteName, setInviteName] = useState<string>('');
  const [inviteDept, setInviteDept] = useState<string>('');
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteTokenResult, setInviteTokenResult] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, [activeUniversityId]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviting(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/invite-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({
          official_email: inviteEmail,
          full_name: inviteName,
          department: inviteDept
        })
      });

      if (res.ok) {
        const data = await res.json();
        setInviteTokenResult(data.invite_token);
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to invite admin:', err);
    } finally {
      setInviting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/admins/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      console.error('Failed to toggle admin status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Invite Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Campus Admin Roster</h1>
          <p className="text-xs text-slate-400">Invite, configure department assignments, and manage campus admin access</p>
        </div>

        <button
          onClick={() => {
            setInviteTokenResult(null);
            setShowInviteModal(true);
          }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Invite Campus Admin
        </button>
      </div>

      {/* Admins Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading admin roster...</div>
        ) : admins.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No campus admins found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Admin Name</th>
                  <th className="py-3 px-4">Official Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {admins.map((adm) => (
                  <tr key={adm.user_id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{adm.full_name}</td>
                    <td className="py-3.5 px-4 font-mono">{adm.email}</td>
                    <td className="py-3.5 px-4">{adm.department || 'General Operations'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                        adm.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {adm.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(adm.user_id, adm.status)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          adm.status === 'ACTIVE'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {adm.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100">Invite Campus Admin</h3>

            {inviteTokenResult ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs space-y-1">
                  <span className="font-semibold block">Invitation Created!</span>
                  <p>Share this invitation token with the admin:</p>
                  <code className="block bg-slate-950 p-2 rounded text-[11px] font-mono text-slate-200 select-all border border-slate-800">
                    {inviteTokenResult}
                  </code>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="admin@univ.edu"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Officer Name"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    placeholder="Facilities & Maintenance"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-semibold"
                  >
                    {inviting ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
