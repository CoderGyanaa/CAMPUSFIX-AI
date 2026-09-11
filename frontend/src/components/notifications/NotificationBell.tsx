import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, ExternalLink, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const { token, user, activeUniversityId } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const apiBase = API_BASE_URL;

  const fetchNotifications = async () => {
    if (!token || !activeUniversityId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/v1/notifications?limit=5`, {
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

  useEffect(() => {
    fetchNotifications();
  }, [token, activeUniversityId]);

  // Supabase Realtime Broadcast Channel Subscription
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `private:notifications:${user.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        if (payload?.new) {
          setNotifications((prev) => [payload.new, ...prev.slice(0, 4)]);
          setUnreadCount((c) => c + 1);
        } else {
          fetchNotifications();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeUniversityId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      console.error('Failed to mark notification read:', e);
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
      console.error('Failed to mark all read:', e);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-teal-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-medium transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <Sparkles className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 space-y-1 transition text-xs ${
                    !n.is_read ? 'bg-slate-800/40 border-l-2 border-teal-500' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-200 line-clamp-1">{n.title}</span>
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-slate-500 hover:text-teal-400 p-0.5 transition shrink-0"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="uppercase text-purple-400">{n.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
