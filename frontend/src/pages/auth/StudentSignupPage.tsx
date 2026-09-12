import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth, getRoleDashboardPath } from '../../context/AuthContext';

export const StudentSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    universityId: 'univ-1', // Default active university tenant ID
    department: 'Environmental Science',
    studentId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/student/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
          university_id: formData.universityId,
          department: formData.department,
          student_id: formData.studentId || undefined
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Registration failed');
      }

      // Registration successful -> auto login via POST /api/v1/auth/login
      const loginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        login(loginData.access_token, loginData.user, loginData.memberships);
        const targetPath = getRoleDashboardPath(loginData.user, loginData.memberships);
        navigate(targetPath, { replace: true });
      } else {
        navigate('/student/login');
      }
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
          <h1 className="text-2xl font-bold text-white">Create Student Account</h1>
          <p className="text-xs text-slate-400">Join your campus sustainability community</p>
        </div>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Jane Doe"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Official Student Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jane@stateuniv.edu"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">University Campus ID</label>
            <input
              type="text"
              required
              value={formData.universityId}
              onChange={(e) => setFormData({ ...formData, universityId: e.target.value })}
              placeholder="univ-1"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Facilities"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Student Roll ID (Optional)</label>
              <input
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                placeholder="STU-1002"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {submitting ? 'Creating Account...' : 'Register Student Account'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/student/login" className="text-emerald-400 hover:underline font-semibold">
            Sign In to Student Portal
          </Link>
        </div>
      </div>
    </div>
  );
};
