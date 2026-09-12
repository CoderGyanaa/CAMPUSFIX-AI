import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Building2, GraduationCap, Lock, ArrowRight, Sparkles, MapPin, Zap, Award, Layers } from 'lucide-react';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, memberships, activeUniversityId, isAuthenticated, isLoading } = useAuth();

  // If already authenticated and session initialized, route to assigned role dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const dest = getRoleDashboardPath(user, memberships, activeUniversityId);
      navigate(dest, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, memberships, activeUniversityId, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Public Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">CampusFix AI</span>
          </Link>

          <nav className="flex items-center gap-6 text-xs font-medium">
            <Link to="/" className="text-white font-semibold hover:text-emerald-400 transition hidden sm:inline-block">
              Home
            </Link>
            <Link to="/student/login" className="text-slate-300 hover:text-emerald-400 transition hidden sm:inline-block">
              Student Portal
            </Link>
            <Link to="/admin/login" className="text-slate-300 hover:text-sky-400 transition hidden md:inline-block">
              University / Admin
            </Link>
            <Link to="/universities/register" className="text-slate-300 hover:text-emerald-400 transition hidden lg:inline-block">
              Register University
            </Link>
            <Link
              to="/login"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition font-semibold"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Public Product Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" /> AI-Powered Campus Sustainability & Facilities Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight max-w-4xl mx-auto">
            See It. Report It. <span className="text-emerald-400">Fix It.</span> <br />
            Make Campus Better Together.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            CampusFix AI bridges student observations with university facilities management. Driven by Gemini AI triage, spatial proximity checks, and verified community impact.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/student/login"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              <GraduationCap className="w-5 h-5" /> Student Portal
            </Link>
            <Link
              to="/admin/login"
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2"
            >
              <Building2 className="w-5 h-5 text-sky-400" /> University Admin
            </Link>
            <Link
              to="/universities/register"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-semibold text-sm transition"
            >
              Register University
            </Link>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800/80">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-bold text-white">Engineered for Campus Impact</h2>
            <p className="text-xs text-slate-400">AI Triage • Spatial Proximity • Row-Level Multi-Tenant Security</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit border border-emerald-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AI-Driven Issue Triage</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini 2.5 Flash automatically categorizes reports, assesses urgency, and estimates priority based on environmental risk.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl w-fit border border-sky-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Spatial Proximity & Verification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                PostGIS spatial queries detect nearby duplicates within 50 meters, enabling instant student confirmations and points.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl w-fit border border-purple-500/20">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Verified Gamification</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Earn sustainability points, unlock achievement badges, and view campus-wide SDG sustainability impact analytics.
              </p>
            </div>
          </div>
        </section>

        {/* Portal Selection Section */}
        <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold text-white">Choose Your Portal Entry</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select your role to access student observations, facilities management, or university onboarding.
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs">
                <Link to="/student/signup" className="text-emerald-400 hover:underline font-semibold">
                  Need a Student Account? Sign Up →
                </Link>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <Link
                to="/student/login"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl space-y-2 transition group"
              >
                <div className="font-semibold text-white flex items-center gap-2 group-hover:text-emerald-400 transition">
                  <GraduationCap className="w-5 h-5 text-emerald-400" /> Student Portal
                </div>
                <p className="text-slate-400 text-[11px]">Submit observations, confirm nearby reports, view leaderboard.</p>
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 pt-1">
                  Student Sign In <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              <Link
                to="/admin/login"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 p-5 rounded-2xl space-y-2 transition group"
              >
                <div className="font-semibold text-white flex items-center gap-2 group-hover:text-sky-400 transition">
                  <Building2 className="w-5 h-5 text-sky-400" /> University Admin
                </div>
                <p className="text-slate-400 text-[11px]">Department issue queue, status updates & operational analytics.</p>
                <span className="text-sky-400 text-[11px] font-semibold flex items-center gap-1 pt-1">
                  Admin Sign In <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500 space-y-2">
        <div>CampusFix AI Platform • Multi-Tenant Sustainability & Facilities Operations</div>
        <div className="flex justify-center gap-4 text-slate-400 pt-1">
          <Link to="/login" className="hover:text-emerald-400 transition">Account Sign In</Link>
          <span>•</span>
          <Link to="/student/signup" className="hover:text-emerald-400 transition">Student Sign Up</Link>
          <span>•</span>
          <Link to="/universities/register" className="hover:text-emerald-400 transition">Register University</Link>
        </div>
      </footer>
    </div>
  );
};
