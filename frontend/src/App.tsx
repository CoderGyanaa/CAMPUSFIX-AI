import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleGuard } from './components/auth/Guards';
import { LandingPage } from './pages/LandingPage';
import { UniversityRegisterPage } from './pages/UniversityRegisterPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { AdminInviteAcceptPage } from './pages/AdminInviteAcceptPage';

// Super Admin Platform Administration Layout & Pages
import { PlatformLayout } from './layouts/PlatformLayout';
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { PlatformRequestsPage } from './pages/platform/PlatformRequestsPage';
import { PlatformUniversityDirectory } from './pages/platform/PlatformUniversityDirectory';
import { PlatformAnalyticsPage } from './pages/platform/PlatformAnalyticsPage';
import { PlatformSecurityAuditPage } from './pages/platform/PlatformSecurityAuditPage';
import { PlatformAnnouncementsPage } from './pages/platform/PlatformAnnouncementsPage';

// Student Portal Layout & Pages
import { StudentLayout } from './layouts/StudentLayout';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentReportsPage } from './pages/student/StudentReportsPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';
import { StudentLeaderboardPage } from './pages/student/StudentLeaderboardPage';
import { StudentAchievementsPage } from './pages/student/StudentAchievementsPage';
import { StudentImpactPage } from './pages/student/StudentImpactPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Admin Operations Portal Layout & Pages
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminIssueQueue } from './pages/admin/AdminIssueQueue';
import { AdminCampusMap } from './pages/admin/AdminCampusMap';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';

// University Owner Portal Layout & Pages
import { OwnerLayout } from './layouts/OwnerLayout';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { UniversityProfileSettings } from './pages/owner/UniversityProfileSettings';
import { AdminManagementPage } from './pages/owner/AdminManagementPage';
import { StudentRosterPage } from './pages/owner/StudentRosterPage';
import { GamificationSettingsPage } from './pages/owner/GamificationSettingsPage';
import { UniversityAnalyticsDashboard } from './pages/owner/UniversityAnalyticsDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage scrollToLogin={true} />} />
          <Route path="/register-university" element={<UniversityRegisterPage />} />
          <Route path="/accept-invite" element={<AdminInviteAcceptPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Super Admin Protected Routes */}
            <Route element={<RoleGuard allowedRoles={['SUPER_ADMIN']} />}>
              <Route path="/platform-admin" element={<Navigate to="/platform/dashboard" replace />} />
              <Route element={<PlatformLayout />}>
                <Route path="/platform/dashboard" element={<PlatformDashboard />} />
                <Route path="/platform/requests" element={<PlatformRequestsPage />} />
                <Route path="/platform/directory" element={<PlatformUniversityDirectory />} />
                <Route path="/platform/announcements" element={<PlatformAnnouncementsPage />} />
                <Route path="/platform/analytics" element={<PlatformAnalyticsPage />} />
                <Route path="/platform/audit-logs" element={<PlatformSecurityAuditPage />} />
              </Route>
            </Route>

            {/* University Owner Portal Protected Routes */}
            <Route element={<RoleGuard allowedRoles={['UNIVERSITY_OWNER']} />}>
              <Route element={<OwnerLayout />}>
                <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                <Route path="/owner/analytics" element={<UniversityAnalyticsDashboard />} />
                <Route path="/owner/profile" element={<UniversityProfileSettings />} />
                <Route path="/owner/admins" element={<AdminManagementPage />} />
                <Route path="/owner/students" element={<StudentRosterPage />} />
                <Route path="/owner/gamification" element={<GamificationSettingsPage />} />
              </Route>
            </Route>

            {/* Admin Operations Portal Routes */}
            <Route element={<RoleGuard allowedRoles={['ADMIN', 'UNIVERSITY_OWNER', 'SUPER_ADMIN']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/issues" element={<AdminIssueQueue />} />
                <Route path="/admin/map" element={<AdminCampusMap />} />
                <Route path="/admin/analytics" element={<UniversityAnalyticsDashboard />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              </Route>
            </Route>

            {/* Student Portal Protected Routes */}
            <Route element={<RoleGuard allowedRoles={['STUDENT']} />}>
              <Route element={<StudentLayout />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/reports" element={<StudentReportsPage />} />
                <Route path="/student/notifications" element={<StudentNotificationsPage />} />
                <Route path="/student/leaderboard" element={<StudentLeaderboardPage />} />
                <Route path="/student/achievements" element={<StudentAchievementsPage />} />
                <Route path="/student/impact" element={<StudentImpactPage />} />
                <Route path="/student/profile" element={<StudentProfilePage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
