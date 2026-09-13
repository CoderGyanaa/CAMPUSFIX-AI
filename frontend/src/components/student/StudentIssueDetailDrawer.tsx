import React, { useEffect, useState } from 'react';
import { X, MapPin, CheckCircle2, ShieldCheck, Clock, Award, AlertCircle, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface StudentIssueDetailDrawerProps {
  issueId: string | null;
  onClose: () => void;
  onIssueConfirmed?: () => void;
}

export const StudentIssueDetailDrawer: React.FC<StudentIssueDetailDrawerProps> = ({
  issueId,
  onClose,
  onIssueConfirmed
}) => {
  const { token, activeUniversityId } = useAuth();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [confirming, setConfirming] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!issueId) {
      setDetail(null);
      setMsg(null);
      setErr(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setMsg(null);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/issues/${issueId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-University-ID': activeUniversityId || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        } else {
          const errData = await res.json();
          setErr(errData.detail || 'Failed to load issue details');
        }
      } catch (e: any) {
        setErr(e.message || 'Error fetching issue details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [issueId, token, activeUniversityId]);

  if (!issueId) return null;

  const issue = detail?.issue;

  const handleConfirmIssue = async () => {
    if (!issueId || confirming) return;
    setConfirming(true);
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/issues/${issueId}/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMsg(data.message || 'Community confirmation added! +10 Points awarded.');
        if (onIssueConfirmed) onIssueConfirmed();
        // Refresh detail count
        setDetail((prev: any) => ({
          ...prev,
          community_confirmations_count: (prev?.community_confirmations_count || 0) + 1,
          affected_student_count: (prev?.affected_student_count || 0) + 1
        }));
      } else {
        const errData = await res.json();
        setErr(errData.detail || 'Could not confirm issue');
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to submit confirmation');
    } finally {
      setConfirming(false);
    }
  };

  const getPriorityBadgeClass = (prio?: string) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'RESOLVED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm text-white">Campus Issue Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading issue details...</div>
          ) : err ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{err}</span>
            </div>
          ) : issue ? (
            <>
              {msg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{msg}</span>
                </div>
              )}

              {/* Title & Issue Number */}
              <div className="space-y-2 border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-emerald-400 font-bold text-xs">
                    #{issue.master_issue_number || issue.id.slice(0, 6)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase border text-[10px] ${getPriorityBadgeClass(issue.final_admin_priority || issue.ai_priority || issue.student_priority)}`}>
                      {issue.final_admin_priority || issue.ai_priority || issue.student_priority} PRIORITY
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase border text-[10px] ${getStatusBadgeClass(issue.status)}`}>
                      {issue.status}
                    </span>
                  </div>
                </div>
                <h2 className="text-base font-bold text-white leading-snug">{issue.title}</h2>
                <div className="flex items-center gap-4 text-slate-400 text-[11px] font-mono pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {issue.location?.building_name || 'Campus Grounds'}
                  </span>
                  <span>Category: <strong className="text-slate-200">{issue.category}</strong></span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Description</h4>
                <p className="text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  {issue.description || 'No additional description provided.'}
                </p>
              </div>

              {/* Community Confirmation & Impact */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" /> Community Signals & Verification
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {detail.affected_student_count || 1} {detail.affected_student_count === 1 ? 'student has' : 'students have'} reported or confirmed this issue
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    +{detail.community_confirmations_count || 0} Confirmations
                  </span>
                </div>

                <button
                  onClick={handleConfirmIssue}
                  disabled={confirming || issue.status === 'CLOSED' || issue.status === 'REJECTED'}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {confirming ? 'Submitting Confirmation...' : 'Confirm This Issue (+10 Points)'}
                </button>
              </div>

              {/* Privacy-Safe Attribution */}
              <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>Reporter: <strong className="text-slate-300">Reported by a student</strong></span>
                <span>Created: {new Date(issue.created_at).toLocaleDateString()}</span>
              </div>

              {/* Status History Timeline */}
              {detail.status_history && detail.status_history.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" /> Status Timeline
                  </h4>
                  <div className="space-y-2 border-l border-slate-800 ml-2 pl-3">
                    {detail.status_history.map((hist: any) => (
                      <div key={hist.id} className="space-y-0.5 text-[11px]">
                        <div className="flex items-center justify-between text-slate-300 font-medium">
                          <span>Status changed to <strong className="text-emerald-400">{hist.new_status}</strong></span>
                          <span className="font-mono text-[10px] text-slate-500">{new Date(hist.created_at).toLocaleDateString()}</span>
                        </div>
                        {hist.reason && <p className="text-slate-400 text-[10px]">{hist.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
