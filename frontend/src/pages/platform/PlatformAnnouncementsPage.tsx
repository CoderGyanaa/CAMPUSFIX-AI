import React, { useState } from 'react';
import { Megaphone, Send, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

export const PlatformAnnouncementsPage: React.FC = () => {
  const { token } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [msg, setMsg] = useState<string>('');

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSending(true);
    setMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          message
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMsg(`Success: Broadcasted announcement to ${data.recipients_notified} active users across ${data.universities_targeted} universities.`);
        setTitle('');
        setMessage('');
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || 'Failed to dispatch announcement'}`);
      }
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-purple-400" /> Platform System Announcements
        </h1>
        <p className="text-xs text-slate-400">Broadcast platform-wide system notices across all registered universities</p>
      </div>

      {msg && (
        <div className={`p-4 text-xs rounded-xl border ${
          msg.startsWith('Success')
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-mono'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {msg}
        </div>
      )}

      {/* Broadcast Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <span className="font-bold">Super Admin Governance Action:</span> Announcements are dispatched to all active tenant members across universities. Every broadcast generates an immutable entry in <code className="font-mono bg-purple-950 px-1 py-0.5 rounded text-purple-200">admin_actions</code>.
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">Announcement Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Scheduled System Maintenance / Platform Upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-200">Announcement Message</label>
            <textarea
              required
              rows={4}
              placeholder="Provide clear details regarding the system announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md transition"
            >
              <Send className="w-4 h-4" /> {sending ? 'Dispatching...' : 'Dispatch Platform Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
