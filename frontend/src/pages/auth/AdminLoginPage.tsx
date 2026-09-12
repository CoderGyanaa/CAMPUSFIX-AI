import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth, getRoleDashboardPath } from '../../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Invalid email or password');
      }

      const data = await res.json();
      login(data.access_token, data.user, data.memberships);
      const targetPath = getRoleDashboardPath(data.user, data.memberships);
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-sky-400 transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-sky-500/10 text-sky-400 rounded-full border border-sky-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">University Admin Sign In</h1>
          <p className="text-xs text-slate-400">Facilities management, issue queue triage & department portal</p>
        </div>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Administrator Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@university.edu"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <Link to="/student/forgot-password" className="text-xs text-sky-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Signing In...' : 'Sign In to Admin Portal'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800 pt-4 text-center space-y-2 text-xs text-slate-400">
          <div>
            Need to onboard your institution?{' '}
            <Link to="/universities/register" className="text-sky-400 hover:underline font-semibold">
              Register Your University
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
