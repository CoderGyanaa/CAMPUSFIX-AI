import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Building2, GraduationCap, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';

interface LandingPageProps {
  scrollToLogin?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ scrollToLogin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, memberships, activeUniversityId, login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If user is already authenticated, automatically route them to their role dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = getRoleDashboardPath(user, memberships, activeUniversityId);
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, memberships, activeUniversityId, navigate]);

  // Handle scrolling to #login if explicitly requested via prop or hash or /login path
  useEffect(() => {
    if (scrollToLogin || location.hash === '#login' || location.pathname === '/login') {
      const loginEl = document.getElementById('login');
      if (loginEl) {
        loginEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [scrollToLogin, location]);

  const handleLogin = async (e: React.FormEvent) => {
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
        throw new Error(data.detail || 'Login failed');
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

  const handlePortalClick = (portalRole: 'STUDENT' | 'ADMIN' | 'REGISTER') => {
    if (portalRole === 'REGISTER') {
      navigate('/register-university');
      return;
    }

    if (isAuthenticated && user) {
      const dest = getRoleDashboardPath(user, memberships, activeUniversityId);
      navigate(dest);
      return;
    }

    // Scroll smoothly to sign in box if unauthenticated
    const loginEl = document.getElementById('login');
    if (loginEl) {
      loginEl.scrollIntoView({ behavior: 'smooth' });
      const emailInput = document.getElementById('email-input');
      if (emailInput) {
        emailInput.focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">CampusFix AI</span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/register-university" className="text-slate-300 hover:text-emerald-400 transition">
              Register Your University
            </Link>
            <button
              onClick={() => handlePortalClick('STUDENT')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition font-semibold"
            >
              Sign In
            </button>
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
            <button
              onClick={() => handlePortalClick('STUDENT')}
              className="text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl space-y-1 transition group cursor-pointer"
            >
              <div className="font-semibold text-white flex items-center gap-2 group-hover:text-emerald-400 transition">
                <GraduationCap className="w-4 h-4 text-emerald-400" /> Student Portal
              </div>
              <p className="text-slate-400 text-[11px]">Report issues, confirm nearby leaks, earn verified points.</p>
            </button>
            <button
              onClick={() => handlePortalClick('ADMIN')}
              className="text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 p-4 rounded-xl space-y-1 transition group cursor-pointer"
            >
              <div className="font-semibold text-white flex items-center gap-2 group-hover:text-sky-400 transition">
                <Building2 className="w-4 h-4 text-sky-400" /> University Admin
              </div>
              <p className="text-slate-400 text-[11px]">Operational priority queue, department assignment & RLS security.</p>
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div id="login" className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 scroll-mt-24">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" /> Account Sign In
            </h2>
            <p className="text-xs text-slate-400 mt-1">Access your CampusFix AI portal account</p>
          </div>

          {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Official Email</label>
              <input
                id="email-input"
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
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Signing In...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="border-t border-slate-800 pt-4 flex justify-between text-xs text-slate-400">
            <Link to="/register-university" className="hover:text-emerald-400 transition">Register University</Link>
            <Link to="/login" className="hover:text-emerald-400 transition">Sign In Options</Link>
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
