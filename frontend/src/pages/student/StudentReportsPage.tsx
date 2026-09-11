import React, { useEffect, useState } from 'react';
import { FileText, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

export const StudentReportsPage: React.FC = () => {
  const { token, activeUniversityId } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/student/reports`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-University-ID': activeUniversityId || ''
      }
    })
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token, activeUniversityId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" /> My Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">Track status and verification progress of your submitted observations</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl"></div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No Reports Submitted Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't reported any campus sustainability issues yet. Use the "Report an Issue" button to submit your first observation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r, idx) => (
            <div key={r.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <div className="font-bold text-white text-sm">{r.category || 'Observation'}</div>
                <div className="text-slate-400">{r.description}</div>
                <div className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {r.student_priority || 'SUBMITTED'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
