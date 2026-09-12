import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to request password reset');
      }

      const data = await res.json();
      if (data.reset_token) {
        setResetToken(data.reset_token);
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <Link to="/student/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Your Password</h1>
          <p className="text-xs text-slate-400">Enter your official email to receive a password reset token</p>
        </div>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-400">Reset Request Generated</h3>
            <p className="text-xs text-slate-300">
              If an account exists with <span className="font-semibold text-white">{email}</span>, your password reset request has been processed.
            </p>
            {resetToken && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-left">
                <span className="text-slate-400 block mb-1">Demo Generated Reset Token:</span>
                <code className="text-emerald-400 font-mono text-[11px] select-all block break-all">{resetToken}</code>
              </div>
            )}
            <div className="pt-2">
              <Link
                to={`/student/reset-password${resetToken ? `?token=${encodeURIComponent(resetToken)}` : ''}`}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition"
              >
                Proceed to Reset Password <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Official Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Requesting Reset...' : 'Send Reset Instructions'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
          Remembered your password?{' '}
          <Link to="/student/login" className="text-emerald-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
