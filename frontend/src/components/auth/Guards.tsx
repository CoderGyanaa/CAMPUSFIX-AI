import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export const RoleGuard: React.FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { user, memberships, activeUniversityId } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.is_super_admin && allowedRoles.includes('SUPER_ADMIN')) {
    return <Outlet />;
  }

  const activeMem = memberships.find((m) => m.university_id === activeUniversityId && m.status === 'ACTIVE');

  if (!activeMem || !allowedRoles.includes(activeMem.role)) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md space-y-4">
          <h2 className="text-2xl font-bold text-rose-400">Access Denied</h2>
          <p className="text-sm text-slate-300">
            You do not have the required permissions ({allowedRoles.join(', ')}) to access this page.
          </p>
          <a
            href="/"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
