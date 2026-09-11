import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building, Users, UserCheck, Settings, Award, Bell, LogOut, Shield, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OwnerLayout: React.FC = () => {
  const { user, memberships, activeUniversityId, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeMembership = memberships.find(m => m.university_id === activeUniversityId);

  const navItems = [
    { label: 'Executive Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Analytics & Impact', path: '/owner/analytics', icon: BarChart3 },
    { label: 'University Profile', path: '/owner/profile', icon: Building },
    { label: 'Campus Admins', path: '/owner/admins', icon: Users },
    { label: 'Student Directory', path: '/owner/students', icon: UserCheck },
    { label: 'Gamification Config', path: '/owner/gamification', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & University Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md font-bold text-lg">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-tight text-base">CampusFix AI</span>
                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-semibold">
                  University Owner
                </span>
              </div>
              <p className="text-xs text-slate-400">Executive Portal Command</p>
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
                      ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Profile & Logout */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-slate-200">{user?.full_name}</span>
              <span className="text-[10px] text-teal-400 font-mono uppercase font-semibold flex items-center gap-1 justify-end">
                <Shield className="w-3 h-3 text-teal-400" />
                UNIVERSITY_OWNER
              </span>
            </div>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex overflow-x-auto border-t border-slate-800 px-2 py-1 space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-slate-800 text-teal-400' : 'text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Outlet />
      </main>
    </div>
  );
};
