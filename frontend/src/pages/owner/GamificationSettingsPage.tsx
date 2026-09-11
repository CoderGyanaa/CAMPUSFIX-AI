import React, { useEffect, useState } from 'react';
import { Award, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

export const GamificationSettingsPage: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [reportPoints, setReportPoints] = useState<number>(50);
  const [confirmationPoints, setConfirmationPoints] = useState<number>(10);
  const [resolutionPoints, setResolutionPoints] = useState<number>(100);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [activeUniversityId]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/gamification-config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReportPoints(data.report_points || 50);
        setConfirmationPoints(data.confirmation_points || 10);
        setResolutionPoints(data.resolution_points || 100);
      }
    } catch (err) {
      console.error('Failed to fetch gamification config:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/owner/gamification-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({
          report_points: reportPoints,
          confirmation_points: confirmationPoints,
          resolution_points: resolutionPoints
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Validation error saving gamification config');
      }
    } catch (err) {
      console.error('Failed to update gamification config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Gamification Rules & Point Allocation</h1>
        <p className="text-xs text-slate-400">Configure future point rewards for verified reports, community confirmations, and resolutions</p>
      </div>

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 shadow-sm">
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Gamification rules updated and audited! (Future events only)
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-xs text-slate-400">
          <span className="font-semibold text-slate-300 block mb-1">Rule Policy Note:</span>
          Changes affect future contribution events only. Historical points and badge calculations remain unaffected and preserved.
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Points per Verified Issue Report (1 - 1000)</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={reportPoints}
            onChange={(e) => setReportPoints(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Points per Community "+1" Confirmation (1 - 500)</label>
          <input
            type="number"
            min={1}
            max={500}
            value={confirmationPoints}
            onChange={(e) => setConfirmationPoints(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Points per Resolution Verification (1 - 2000)</label>
          <input
            type="number"
            min={1}
            max={2000}
            value={resolutionPoints}
            onChange={(e) => setResolutionPoints(parseInt(e.target.value) || 1)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
            required
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      </form>
    </div>
  );
};
