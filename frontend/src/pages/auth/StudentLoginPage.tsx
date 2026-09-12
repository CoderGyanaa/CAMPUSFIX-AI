import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth, getRoleDashboardPath } from '../../context/AuthContext';

export const StudentLoginPage: React.FC = () => {
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
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Student Portal Sign In</h1>
          <p className="text-xs text-slate-400">Report campus observations, verify nearby leaks & earn points</p>
        </div>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Official Student Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <Link to="/student/forgot-password" className="text-xs text-emerald-400 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Signing In...' : 'Sign In to Student Portal'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800 pt-4 text-center space-y-2 text-xs text-slate-400">
          <div>
            Don't have a student account?{' '}
            <Link to="/student/signup" className="text-emerald-400 hover:underline font-semibold">
              Create Student Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
