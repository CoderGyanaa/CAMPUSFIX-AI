import React, { useEffect, useState } from 'react';
import { Search, Filter, AlertCircle, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminIssueDetailDrawer } from '../../components/admin/AdminIssueDetailDrawer';
import { API_BASE_URL } from '../../config';

interface MasterIssue {
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
  created_at: string;
}

export const AdminIssueQueue: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [issues, setIssues] = useState<MasterIssue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    fetchIssues();
  }, [activeUniversityId, categoryFilter, priorityFilter, statusFilter, search]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`${API_BASE_URL}/api/v1/admin/issues?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });

      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      } else {
        // Fallback mock issues
        setIssues([
          {
            id: 'issue-101',
            master_issue_number: 101,
            title: 'Water Leakage in Library 2nd Floor',
            description: 'Pipe leak in bathroom ceiling causing flooding.',
            category: 'WATER',
            status: 'AI_ANALYZED',
            student_priority: 'HIGH',
            ai_priority: 'HIGH',
            final_admin_priority: undefined,
            created_at: '2026-09-11T10:00:00Z'
          },
          {
            id: 'issue-102',
            master_issue_number: 102,
            title: 'Overflowing Bin at Science Complex',
            description: 'Trash spilling outside overflowing bin.',
            category: 'WASTE',
            status: 'SUBMITTED',
            student_priority: 'MEDIUM',
            ai_priority: 'LOW',
            final_admin_priority: undefined,
            created_at: '2026-09-11T11:30:00Z'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch admin issues queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeClass = (prio?: string) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Issue Command Queue</h1>
        <p className="text-xs text-slate-400">Review student observations, inspect AI recommendations, and execute admin actions</p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative col-span-1 md:col-span-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, ID..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-200"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
          >
            <option value="">All Categories</option>
            <option value="WASTE">WASTE</option>
            <option value="WATER">WATER</option>
            <option value="ENERGY">ENERGY</option>
            <option value="CLEANLINESS">CLEANLINESS</option>
            <option value="FOOD">FOOD</option>
            <option value="TRANSPORT">TRANSPORT</option>
            <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
            <option value="OTHER">OTHER</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="AI_ANALYZED">AI_ANALYZED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Issues Queue Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading queue...</div>
        ) : issues.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No issues found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Issue #</th>
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Student Prio</th>
                  <th className="py-3 px-4">AI Rec Prio</th>
                  <th className="py-3 px-4">Final Admin Prio</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {issues.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      #{item.master_issue_number || item.id.slice(0, 5)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold block text-slate-200">{item.title}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{item.description}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{item.category}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${getPriorityBadgeClass(item.student_priority)}`}>
                        {item.student_priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${getPriorityBadgeClass(item.ai_priority || 'MEDIUM')}`}>
                        {item.ai_priority || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] border font-semibold ${getPriorityBadgeClass(item.final_admin_priority || item.ai_priority || 'MEDIUM')}`}>
                        {item.final_admin_priority || 'UNSET'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedIssueId(item.id)}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Issue Detail Drawer */}
      <AdminIssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueUpdated={fetchIssues}
      />
    </div>
  );
};
