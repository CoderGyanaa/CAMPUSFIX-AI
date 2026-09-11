import React, { useState } from 'react';
import { ShieldCheck, Building2, UserCheck, GraduationCap, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const LandingPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('campusfix_token', data.access_token);
      localStorage.setItem('campusfix_user', JSON.stringify(data.user));
      localStorage.setItem('campusfix_memberships', JSON.stringify(data.memberships));

      setSuccess(`Welcome back, ${data.user.full_name}! Login successful.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">CampusFix AI</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <a href="/register-university" className="text-slate-300 hover:text-emerald-400 transition">
              Register Your University
            </a>
            <a href="#login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition">
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Sustainability Operations
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            See It. Report It. <br />
            <span className="text-emerald-400">Fix It.</span> Make Campus Better.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            CampusFix AI bridges student observations with university facilities management. Driven by AI triage, spatial proximity checks, and verified community impact.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Student Portal
              </div>
              <p className="text-slate-400">Report issues, confirm nearby leaks, earn verified points.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <div className="font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" /> University Admin
              </div>
              <p className="text-slate-400">Operational priority queue, department assignment & RLS security.</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div id="login" className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> Account Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-1">Access your CampusFix AI portal account</p>
          </div>

          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}
          {success && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">{success}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-slate-800 pt-4 flex justify-between text-xs text-slate-400">
            <a href="/register-university" className="hover:text-emerald-400 transition">Register University</a>
            <a href="/platform-admin" className="hover:text-emerald-400 transition">Super Admin</a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        CampusFix AI Platform • Milestone M2 Authentication & Multi-Tenant Security Built
      </footer>
    </div>
  );
};
