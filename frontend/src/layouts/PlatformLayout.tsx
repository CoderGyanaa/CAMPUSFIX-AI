import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, FileText, Building2, BarChart3, Lock, Megaphone, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/notifications/NotificationBell';

export const PlatformLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Platform Dashboard', path: '/platform/dashboard', icon: LayoutDashboard },
    { label: 'Registration Requests', path: '/platform/requests', icon: FileText },
    { label: 'University Directory', path: '/platform/directory', icon: Building2 },
    { label: 'Announcements', path: '/platform/announcements', icon: Megaphone },
    { label: 'Platform Analytics', path: '/platform/analytics', icon: BarChart3 },
    { label: 'Security & Audit Logs', path: '/platform/audit-logs', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base">CampusFix AI</span>
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-semibold">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">Platform Governance Portal</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800 text-purple-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Side Account Info & Logout */}
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-200">{user?.full_name || 'Super Admin'}</div>
              <div className="text-[10px] text-purple-400 font-mono">Platform Administrator</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/platform-admin');
              }}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 px-2 py-2 bg-slate-900/50 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'text-purple-400 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
