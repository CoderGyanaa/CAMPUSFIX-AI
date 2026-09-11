import React, { useEffect, useState } from 'react';
import { Building, Save, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

export const UniversityProfileSettings: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [name, setName] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('#059669');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    fetchProfile();
  }, [activeUniversityId]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/university-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setWebsite(data.official_website || '');
        setLogoUrl(data.logo_url || '');
        setPrimaryColor(data.primary_color || '#059669');
        setContactEmail(data.contact_email || '');
      }
    } catch (err) {
      console.error('Failed to fetch university profile:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/university-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({
          name,
          official_website: website,
          logo_url: logoUrl,
          primary_color: primaryColor,
          contact_email: contactEmail
        })
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">University Profile & Branding</h1>
        <p className="text-xs text-slate-400">Configure institution branding, website URL, and official contact settings</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-sm">
        {savedSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> University profile updated successfully!
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">University Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Official Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Logo Image URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Color</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-full h-9 bg-slate-950 border border-slate-700 rounded-lg p-1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Support Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="support@univ.edu"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
