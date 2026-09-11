import React, { useEffect, useState } from 'react';
import { MapPin, Layers, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminIssueDetailDrawer } from '../../components/admin/AdminIssueDetailDrawer';
import { API_BASE_URL } from '../../config';

interface MapPinItem {
  id: string;
  master_issue_number: number;
  title: string;
  category: string;
  status: string;
  student_priority: string;
  ai_priority?: string;
  final_admin_priority?: string;
  latitude: number;
  longitude: number;
  building_name: string;
}

export const AdminCampusMap: React.FC = () => {
  const { activeUniversityId } = useAuth();
  const [pins, setPins] = useState<MapPinItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    fetchMapPins();
  }, [activeUniversityId]);

  const fetchMapPins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/map-issues`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        }
      });

      if (res.ok) {
        const data = await res.json();
        setPins(data);
      } else {
        setPins([
          {
            id: 'issue-101',
            master_issue_number: 101,
            title: 'Water Leakage in Library',
            category: 'WATER',
            status: 'AI_ANALYZED',
            student_priority: 'HIGH',
            ai_priority: 'HIGH',
            latitude: 37.7749,
            longitude: -122.4194,
            building_name: 'Main Library 2nd Floor'
          },
          {
            id: 'issue-102',
            master_issue_number: 102,
            title: 'Trash Overflow',
            category: 'WASTE',
            status: 'SUBMITTED',
            student_priority: 'MEDIUM',
            ai_priority: 'LOW',
            latitude: 37.7752,
            longitude: -122.4180,
            building_name: 'Science Complex Quad'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch map pins:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (prio?: string) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'MEDIUM':
        return 'bg-yellow-500 text-slate-950';
      case 'LOW':
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Interactive Campus Map View</h1>
        <p className="text-xs text-slate-400">Visual geospatial overview of campus issue clusters and priority hotspots</p>
      </div>

      {/* Map Container Mock View */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[450px] relative flex flex-col justify-between overflow-hidden shadow-lg">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Map Header Overlay */}
        <div className="relative z-10 flex justify-between items-center bg-slate-950/80 border border-slate-800 p-3 rounded-lg backdrop-blur">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Campus GIS Hotspots</span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> High</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low</span>
          </div>
        </div>

        {/* Interactive Pin List Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {pins.map((pin) => (
            <div
              key={pin.id}
              onClick={() => setSelectedIssueId(pin.id)}
              className="bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all shadow-md group space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  #{pin.master_issue_number || pin.id.slice(0, 5)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getPriorityColor(pin.final_admin_priority || pin.ai_priority || pin.student_priority)}`}>
                  {pin.final_admin_priority || pin.ai_priority || pin.student_priority}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{pin.title}</h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {pin.building_name}
              </p>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center text-xs text-slate-500 font-mono">
          Click any GIS hotspot pin above to open the full Issue Inspection Drawer.
        </div>
      </div>

      {/* Admin Issue Detail Drawer */}
      <AdminIssueDetailDrawer
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onIssueUpdated={fetchMapPins}
      />
    </div>
  );
};
