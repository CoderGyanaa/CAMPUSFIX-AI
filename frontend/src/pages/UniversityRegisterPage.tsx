import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const UniversityRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    university_name: '',
    official_website: '',
    institution_type: 'Public University',
    country: '',
    state: '',
    city: '',
    applicant_name: '',
    applicant_designation: '',
    official_email: '',
    phone: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/universities/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to submit registration request');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white">Register Your University</h1>
          </div>
          <p className="text-xs text-slate-400">
            Submit your institution verification details for Super Admin review and platform onboarding.
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-emerald-400">Registration Submitted Successfully!</h3>
            <p className="text-xs text-slate-300">
              Your registration request is in status <span className="font-semibold text-emerald-300">PENDING</span>. Once reviewed and approved by the Super Admin, an activation invitation will be dispatched to your official email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">University Name</label>
                <input
                  type="text"
                  required
                  value={formData.university_name}
                  onChange={(e) => setFormData({ ...formData, university_name: e.target.value })}
                  placeholder="e.g. Stanford University"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Official Website</label>
                <input
                  type="url"
                  required
                  value={formData.official_website}
                  onChange={(e) => setFormData({ ...formData, official_website: e.target.value })}
                  placeholder="https://stanford.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Country</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="USA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="California"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Stanford"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Applicant Name</label>
                <input
                  type="text"
                  required
                  value={formData.applicant_name}
                  onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                  placeholder="Dr. Jane Doe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Official University Email</label>
                <input
                  type="email"
                  required
                  value={formData.official_email}
                  onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                  placeholder="jane.doe@stanford.edu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Applicant Designation</label>
                <input
                  type="text"
                  required
                  value={formData.applicant_designation}
                  onChange={(e) => setFormData({ ...formData, applicant_designation: e.target.value })}
                  placeholder="Dean of Sustainability"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-555-0100"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg transition mt-4"
            >
              Submit University Registration Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
