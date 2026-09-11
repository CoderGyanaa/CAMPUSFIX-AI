import React, { useState } from 'react';
import { UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const AdminInviteAcceptPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Activation failed');
      }

      setActivated(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
            <UserCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Activate Admin Account</h1>
          <p className="text-xs text-slate-400">Complete your single-use invitation & set your private password</p>
        </div>

        {activated ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-400">Account Activated!</h3>
            <p className="text-xs text-slate-300">
              Your administrator account is now active. You can sign in using your official email and private password.
            </p>
            <a href="/#login" className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition mt-2">
              Go to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4 text-xs">
            {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">{error}</div>}

            <div>
              <label className="block font-medium text-slate-300 mb-1">Invitation Token</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste invitation token received in email"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mark Davis"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Create Private Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2.5 rounded-lg transition mt-4"
            >
              Activate Admin Account & Set Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
