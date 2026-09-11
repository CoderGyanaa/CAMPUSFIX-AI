import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldAlert, UserCheck, Wrench, GitMerge, FileText, AlertCircle } from 'lucide-react';
import { AITriageCard, AITriageRecordProps } from '../AITriageCard';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface IssueDetail {
  id: string;
  master_issue_number: number;
  title: string;
  description: string;
  category: string;
  status: string;
  student_priority: string;
  ai_priority?: string;
  final_admin_priority?: string;
  department_id?: string;
  assignee_id?: string;
  reporter_id: string;
  created_at: string;
  reports_count?: number;
  confirmations_count?: number;
}

interface AdminIssueDetailDrawerProps {
  issueId: string | null;
  onClose: () => void;
  onIssueUpdated: () => void;
}

export const AdminIssueDetailDrawer: React.FC<AdminIssueDetailDrawerProps> = ({
  issueId,
  onClose,
  onIssueUpdated
}) => {
  const { activeUniversityId } = useAuth();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AITriageRecordProps | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  // Status & Assignment State
  const [selectedStatus, setSelectedStatus] = useState<string>('VERIFIED');
  const [statusReason, setStatusReason] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [assigneeNotes, setAssigneeNotes] = useState<string>('');

  useEffect(() => {
    if (!issueId) return;
    fetchIssueDetail();
  }, [issueId, activeUniversityId]);

  const fetchIssueDetail = async () => {
    if (!issueId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      };

      // Fetch Master Issue Details
      const issueRes = await fetch(`${API_BASE_URL}/api/v1/issues/${issueId}`, { headers });
      if (issueRes.ok) {
        const data = await issueRes.json();
        setIssue(data.issue || data);
        setSelectedStatus(data.status || 'VERIFIED');
      }

      // Fetch AI Triage Analysis
      const aiRes = await fetch(`${API_BASE_URL}/api/v1/issues/${issueId}/ai-analysis`, { headers });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiAnalysis(aiData);
      } else {
        setAiAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to fetch issue details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!issueId) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/issues/${issueId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ status: newStatus, reason: statusReason })
      });

      if (res.ok) {
        setStatusReason('');
        await fetchIssueDetail();
        onIssueUpdated();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async () => {
    if (!issueId) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/issues/${issueId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ department_id: department, notes: assigneeNotes })
      });

      if (res.ok) {
        setAssigneeNotes('');
        await fetchIssueDetail();
        onIssueUpdated();
      }
    } catch (err) {
      console.error('Failed to assign issue:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleOverridePriority = async (newPriority: string, newCategory: string, notes: string) => {
    if (!issueId) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/issues/${issueId}/override-triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ final_admin_priority: newPriority, category: newCategory, notes })
      });

      if (res.ok) {
        await fetchIssueDetail();
        onIssueUpdated();
      }
    } catch (err) {
      console.error('Failed to override triage:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (!issueId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
        
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Master Issue #{issue?.master_issue_number || issueId.slice(0, 6)}
              </span>
              <h2 className="text-lg font-bold text-slate-100">{issue?.title || 'Issue Management'}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading issue details...</div>
          ) : (
            <div className="space-y-6">
              {/* Description & Metadata */}
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Report Description</span>
                <p className="text-xs text-slate-300 leading-relaxed">{issue?.description}</p>
                <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                  <span>Category: {issue?.category}</span>
                  <span>•</span>
                  <span>Status: {issue?.status}</span>
                </div>
              </div>

              {/* AI Triage Card Integration */}
              <AITriageCard
                analysis={aiAnalysis}
                studentPriority={issue?.student_priority || 'MEDIUM'}
                aiPriority={issue?.ai_priority}
                finalAdminPriority={issue?.final_admin_priority}
                currentCategory={issue?.category || 'OTHER'}
                onOverridePriority={handleOverridePriority}
              />

              {/* Operational Action Form */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Admin Operational Actions
                </h3>

                {/* Status Transition Bar */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400">Execute Status Transition</label>
                  <div className="flex flex-wrap gap-2">
                    {['VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusUpdate(st)}
                        disabled={updating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          issue?.status === st
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assign to Department */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-xs font-medium text-slate-400">Assign Department</label>
                  <div className="flex gap-2">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 flex-1"
                    >
                      <option value="">Select Department...</option>
                      <option value="Facilities & Plumbing">Facilities & Plumbing</option>
                      <option value="Electrical & Energy">Electrical & Energy</option>
                      <option value="Sanitation & Waste">Sanitation & Waste</option>
                      <option value="Campus Grounds">Campus Grounds</option>
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={updating || !department}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
