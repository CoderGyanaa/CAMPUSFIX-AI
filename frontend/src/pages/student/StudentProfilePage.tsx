import React, { useEffect, useState } from 'react';
import { User, Save, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

export const StudentProfilePage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/student/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setDepartment(data.department || '');
        setYear(data.year || '');
        setSection(data.section || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, activeUniversityId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ department, year, section, phone, bio })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update profile');
      }

      setMsg('Profile updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-slate-800 rounded-2xl animate-pulse"></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-emerald-400" /> Student Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage your student details and bio preferences</p>
      </div>

      {msg && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {msg}</div>}
      {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">{error}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Read-only Security Header */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Full Name</span>
            <span className="font-bold text-white">{profile?.full_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">University Email</span>
            <span className="font-bold text-white">{profile?.email}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">University</span>
            <span className="font-bold text-emerald-400">{profile?.university_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Private Student ID</span>
            {/* Student ID is visible ONLY to the student themselves in their own profile */}
            <span className="font-mono text-slate-300 font-semibold">{profile?.student_id}</span>
          </div>
        </div>

        {/* Editable Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1-555-0199"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Bio / Sustainability Interests</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell campus about your sustainability observations & interests..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};
