import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../config';
import { useAuth, getRoleDashboardPath } from '../../context/AuthContext';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session || !session.user || !session.user.email) {
          // If session is not immediately available, listen for state change once
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession && newSession.user && newSession.user.email) {
              authListener.subscription.unsubscribe();
              await processGoogleUser(newSession.user.email, newSession.user.user_metadata?.full_name);
            }
          });

          // Timeout fallback if no session is returned
          setTimeout(() => {
            setError('Google authentication timed out or was cancelled. Please try signing in again.');
          }, 6000);
          return;
        }

        await processGoogleUser(session.user.email, session.user.user_metadata?.full_name);
      } catch (err: any) {
        console.error('OAuth Callback Error:', err);
        setError(err.message || 'Failed to complete Google Sign-In');
      }
    };

    const processGoogleUser = async (email: string, fullName?: string) => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/oauth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          provider: 'google'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Google account verification failed on backend');
      }

      const loginData = await res.json();
      login(loginData.access_token, loginData.user, loginData.memberships);

      const targetPath = getRoleDashboardPath(loginData.user, loginData.memberships);
      navigate(targetPath, { replace: true });
    };

    handleAuthCallback();
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex p-3 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-rose-400">Authentication Error</h2>
            <p className="text-xs text-slate-300">{error}</p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/student/login')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition"
              >
                Return to Student Sign In
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-spin">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Completing Google Sign-In...</h2>
            <p className="text-xs text-slate-400">Verifying session credentials and university membership</p>
          </>
        )}
      </div>
    </div>
  );
};
