import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Settings, Filter, ShieldCheck, Mail, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface NotificationItem {
  id: string;
  university_id: string;
  user_id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  entity_type?: string;
  entity_id?: string;
  delivery_status: string;
  created_at: string;
}

interface NotificationPreferences {
  user_id: string;
  email_reports: boolean;
  email_verifications: boolean;
  email_rewards: boolean;
  email_announcements: boolean;
  inapp_enabled: boolean;
}

export const StudentNotificationsPage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences'>('inbox');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [msg, setMsg] = useState<string>('');

  const apiBase = API_BASE_URL;

  const fetchNotifications = async () => {
    if (!token || !activeUniversityId) return;
    setLoading(true);
    try {
      let url = `${apiBase}/api/v1/notifications?limit=50`;
      if (unreadOnly) url += '&unread_only=true';
      if (categoryFilter !== 'ALL') url += `&category=${categoryFilter}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    if (!token || !activeUniversityId) return;
    try {
      const res = await fetch(`${apiBase}/api/v1/notifications/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId
        }
      });
      if (res.ok) {
        setPreferences(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch preferences:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [token, activeUniversityId, categoryFilter, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/notifications/read-all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePreference = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const updatedValue = !preferences[key];
    const newPrefs = { ...preferences, [key]: updatedValue };
    setPreferences(newPrefs);
    setMsg('');

    try {
      const res = await fetch(`${apiBase}/api/v1/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ [key]: updatedValue })
      });
      if (res.ok) {
        setMsg('Notification settings saved successfully.');
      }
    } catch (e: any) {
      setMsg(`Error saving settings: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications Center</h1>
          <p className="text-xs text-slate-400">Campus updates, verification signals, gamification rewards, and announcements</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'inbox'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" /> Notification Inbox ({unreadCount})
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'preferences'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" /> Preferences
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg">
          {msg}
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {['ALL', 'SYSTEM', 'COMMUNITY', 'REWARD', 'BROADCAST'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`text-[11px] font-mono uppercase px-2.5 py-1 rounded-lg border transition ${
                    categoryFilter === cat
                      ? 'bg-slate-800 text-teal-400 border-teal-500/50 font-bold'
                      : 'text-slate-400 border-slate-800 hover:bg-slate-800/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-slate-800 text-teal-500 focus:ring-0 bg-slate-950"
                />
                Unread Only
              </label>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-medium transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-600" />
                <p>No notifications found matching selected filters.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition space-y-2 ${
                    !n.is_read
                      ? 'bg-slate-900/90 border-teal-500/40 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{n.title}</span>
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-md border ${
                          n.category === 'REWARD' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          n.category === 'COMMUNITY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          n.category === 'BROADCAST' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-teal-500/10 text-teal-400 border-teal-500/20'
                        }`}>
                          {n.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                    </div>

                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-teal-400 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Read
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                    <span>Timestamp: {new Date(n.created_at).toLocaleString()}</span>
                    <span>Status: {n.delivery_status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'preferences' && preferences && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6 max-w-2xl">
          <div className="space-y-1 border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" /> Delivery Preferences & Controls
            </h3>
            <p className="text-xs text-slate-400">
              Configure which notification categories trigger email or in-app alerts.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-300">
            {/* In-App Enabled */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-purple-400" /> In-App Real-time Notifications
                </div>
                <div className="text-slate-400 text-[11px]">Receive real-time popups and top navbar alerts</div>
              </div>
              <button
                onClick={() => handleTogglePreference('inapp_enabled')}
                className={`w-12 h-6 rounded-full transition relative p-1 ${
                  preferences.inapp_enabled ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  preferences.inapp_enabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Email Reports */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-400" /> Issue Status Updates via Email
                </div>
                <div className="text-slate-400 text-[11px]">Email notifications when reported issues change status</div>
              </div>
              <button
                onClick={() => handleTogglePreference('email_reports')}
                className={`w-12 h-6 rounded-full transition relative p-1 ${
                  preferences.email_reports ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  preferences.email_reports ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Email Verifications */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" /> Community Verification Email Alerts
                </div>
                <div className="text-slate-400 text-[11px]">Email alerts when peers confirm your reported issue</div>
              </div>
              <button
                onClick={() => handleTogglePreference('email_verifications')}
                className={`w-12 h-6 rounded-full transition relative p-1 ${
                  preferences.email_verifications ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  preferences.email_verifications ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Email Rewards */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" /> Gamification & Badge Reward Emails
                </div>
                <div className="text-slate-400 text-[11px]">Email notifications when points or badges are awarded</div>
              </div>
              <button
                onClick={() => handleTogglePreference('email_rewards')}
                className={`w-12 h-6 rounded-full transition relative p-1 ${
                  preferences.email_rewards ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  preferences.email_rewards ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Email Announcements */}
            <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="space-y-0.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" /> Campus & Platform Announcements
                </div>
                <div className="text-slate-400 text-[11px]">Important university broadcasts and platform notices</div>
              </div>
              <button
                onClick={() => handleTogglePreference('email_announcements')}
                className={`w-12 h-6 rounded-full transition relative p-1 ${
                  preferences.email_announcements ? 'bg-teal-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition transform ${
                  preferences.email_announcements ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
