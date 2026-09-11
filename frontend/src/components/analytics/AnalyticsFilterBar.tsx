import React from 'react';
import { Filter, Download, RotateCcw } from 'lucide-react';

interface DepartmentOption {
  id: string;
  name: string;
}

interface AnalyticsFilterBarProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  priority: string;
  setPriority: (val: string) => void;
  departmentId: string;
  setDepartmentId: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  departments: DepartmentOption[];
  onReset: () => void;
  onExport: () => void;
  exporting?: boolean;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  startDate, setStartDate,
  endDate, setEndDate,
  category, setCategory,
  priority, setPriority,
  departmentId, setDepartmentId,
  status, setStatus,
  departments,
  onReset,
  onExport,
  exporting = false
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Filter className="w-3.5 h-3.5 text-teal-400" /> Multi-Filter Controls
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-bold bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 px-3 py-1.5 rounded-lg shadow transition"
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Start Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="">All Categories</option>
            <option value="WATER_LEAK">Water Leak</option>
            <option value="ENERGY">Energy & Lighting</option>
            <option value="WASTE_MANAGEMENT">Waste Management</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="CLEANLINESS">Cleanliness</option>
            <option value="SAFETY">Safety</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Department */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-mono uppercase">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>
    </div>
  );
};
