import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, MapPin, FileText, User, Bell, Award, TrendingUp, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/notifications/NotificationBell';

export const StudentLayout: React.FC = () => {
  const { user, logout, activeUniversityId } = useAuth();

  const navItems = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/reports', label: 'My Reports', icon: FileText },
    { to: '/student/leaderboard', label: 'Leaderboard', icon: TrendingUp },
    { to: '/student/achievements', label: 'Badges', icon: Award },
    { to: '/student/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-0">
      {/* Desktop & Tablet Top Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">CampusFix AI</span>
              {/* Display current university context ONLY - NO context switcher */}
              <span className="text-[10px] text-slate-400 font-medium">
                Student Portal • Active Campus ID: {activeUniversityId ? `${activeUniversityId.substring(0, 8)}...` : 'Enrolled'}
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-1 text-xs">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}

            <NotificationBell />

            <NavLink
              to="/student/notifications"
              className={({ isActive }) =>
                `p-2 rounded-lg transition ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
              title="Full Notifications Inbox"
            >
              <Bell className="w-4 h-4" />
            </NavLink>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ml-2"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
        <Outlet />
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
