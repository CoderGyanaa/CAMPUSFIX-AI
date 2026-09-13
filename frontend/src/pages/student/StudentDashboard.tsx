import React, { useEffect, useState, useRef } from 'react';
import { Award, TrendingUp, CheckCircle2, AlertTriangle, PlusCircle, MapPin, Activity, Layers, Bell, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { ReportWizardModal } from '../../components/report/ReportWizardModal';
import { GoogleCampusMap, MapIssuePin } from '../../components/map/GoogleCampusMap';
import { StudentIssueDetailDrawer } from '../../components/student/StudentIssueDetailDrawer';
import { formatNotificationForStudent } from '../../utils/notificationFormatter';

export const StudentDashboard: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [mapPins, setMapPins] = useState<MapIssuePin[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const issueCardsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchDashboardData = async () => {
    if (!token || !activeUniversityId) return;
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId
      };

      // 1. Fetch Summary
      const summaryRes = await fetch(`${API_BASE_URL}/api/v1/student/dashboard-summary`, { headers });
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      // 2. Fetch Shared Campus Map Issues
      const mapRes = await fetch(`${API_BASE_URL}/api/v1/student/map-issues`, { headers });
      if (mapRes.ok) {
        setMapPins(await mapRes.json());
      }

      // 3. Fetch Recent Activity
      const notifRes = await fetch(`${API_BASE_URL}/api/v1/notifications?limit=3`, { headers });
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setRecentNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, activeUniversityId]);

  // Scroll corresponding issue card into view when selected from Google Map marker
  useEffect(() => {
    if (selectedIssueId && issueCardsRef.current[selectedIssueId]) {
      issueCardsRef.current[selectedIssueId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIssueId]);

  const getPriorityBadgeClass = (prio?: string) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Welcome / Current Campus Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{summary?.greeting || 'Welcome Back!'}</h1>
          <p className="text-xs text-slate-400 mt-1">See It. Report It. Fix It. Make Campus Better.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <PlusCircle className="w-4 h-4" /> Report an Issue
          </button>
        </div>
      </div>

      {/* 2. Student Contribution Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Award className="w-4 h-4 text-emerald-400" /> Contribution Points
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.points ?? 0}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">+Verified events only</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Monthly Rank
          </span>
          <div className="text-2xl font-extrabold text-white">#{summary?.personal_stats?.rank ?? 1}</div>
          <span className="text-[10px] text-slate-400">Campus sustainability tier</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-purple-400" /> Verified Contributions
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.verified_contributions ?? 0}</div>
          <span className="text-[10px] text-purple-400 font-semibold">Admin-verified reports</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Activity className="w-4 h-4 text-amber-400" /> Issues Helped Resolve
          </span>
          <div className="text-2xl font-extrabold text-white">{summary?.personal_stats?.issues_resolved ?? 0}</div>
          <span className="text-[10px] text-slate-400">Campus impact count</span>
        </div>
      </div>

      {/* 3. Campus Issue Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Campus Snapshot
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.critical ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Critical Issues</div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.high ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">High Priority</div>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/20 p-3 rounded-lg text-sky-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.medium ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Medium Priority</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg text-slate-400">
            <div className="font-bold text-lg">{summary?.campus_snapshot?.low ?? 0}</div>
            <div className="text-[10px] font-semibold uppercase">Low Priority</div>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Campus Issues & Interactive Google Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left ~65–70%: Google Map */}
        <div className="lg:col-span-8">
          <GoogleCampusMap
            pins={mapPins}
            selectedIssueId={selectedIssueId}
            onSelectIssue={(issueId) => setSelectedIssueId(issueId)}
            campusCenter={summary?.campus_center}
          />
        </div>

        {/* Right ~30–35%: Independently Scrollable Campus Issues Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between max-h-[500px]">
          <div className="border-b border-slate-800 pb-3 mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" /> Campus Issues
              </h3>
              <p className="text-[11px] text-slate-400">Shared issues reported across campus</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-md border border-slate-800 font-semibold">
              {mapPins.length} Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {mapPins.length === 0 ? (
              <div className="p-6 text-center bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2 my-auto">
                <Layers className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-300 font-medium">No reported issues in your campus yet.</p>
                <p className="text-[11px] text-slate-500">When campus issues are reported by students, they will appear here for community confirmation.</p>
              </div>
            ) : (
              mapPins.map((pin) => {
                const hasCoords = typeof pin.latitude === 'number' && typeof pin.longitude === 'number' && !(pin.latitude === 0 && pin.longitude === 0);
                const isSelected = selectedIssueId === pin.id;

                return (
                  <div
                    key={pin.id}
                    ref={(el) => (issueCardsRef.current[pin.id] = el)}
                    onClick={() => setSelectedIssueId(pin.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-950/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        #{pin.master_issue_number || pin.id.slice(0, 5)}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getPriorityBadgeClass(pin.final_admin_priority || pin.ai_priority || pin.student_priority)}`}>
                        {pin.final_admin_priority || pin.ai_priority || pin.student_priority}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{pin.title}</h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        {hasCoords ? pin.building_name : 'Location unavailable'}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-purple-400">{pin.category}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="uppercase font-mono text-emerald-400 font-semibold">{pin.status}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIssueId(pin.id);
                        }}
                        className="text-slate-300 hover:text-emerald-400 font-medium flex items-center gap-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View & Confirm
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Campus Activity */}
      {recentNotifications.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" /> Recent Activity & Updates
            </h3>
          </div>
          <div className="space-y-3">
            {recentNotifications.map((n) => {
              const formatted = formatNotificationForStudent(n.type, n.title, n.message, n.category);
              return (
                <div
                  key={n.id}
                  className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{formatted.friendlyTitle}</span>
                    <span className="text-[10px] font-mono text-purple-400 uppercase">{formatted.badgeLabel}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{formatted.friendlyMessage}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Issue Detail Drawer */}
      <StudentIssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueConfirmed={fetchDashboardData}
      />

      {/* Report Wizard Modal */}
      <ReportWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
