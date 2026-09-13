import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertCircle, Eye } from 'lucide-react';

export interface MapIssuePin {
  id: string;
  master_issue_number?: number;
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

interface CampusMapProps {
  pins: MapIssuePin[];
  selectedIssueId?: string | null;
  onSelectIssue: (issueId: string) => void;
}

// Custom map view controller to automatically re-center/fit bounds
const AutoFitBounds: React.FC<{ pins: MapIssuePin[] }> = ({ pins }) => {
  const map = useMap();

  useEffect(() => {
    const validPins = pins.filter((p) => p.latitude && p.longitude && !(p.latitude === 0 && p.longitude === 0));
    if (validPins.length > 0) {
      const bounds = L.latLngBounds(validPins.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [pins, map]);

  return null;
};

// Create custom marker icons matching priority colors
const createPriorityIcon = (priority?: string) => {
  let color = '#10b981'; // emerald
  let label = 'LOW';
  const prio = priority?.toUpperCase();

  if (prio === 'CRITICAL') {
    color = '#f43f5e'; // rose
    label = 'CRIT';
  } else if (prio === 'HIGH') {
    color = '#f59e0b'; // amber
    label = 'HIGH';
  } else if (prio === 'MEDIUM') {
    color = '#0284c7'; // sky
    label = 'MED';
  }

  const html = `
    <div style="
      background-color: ${color};
      color: #020617;
      font-weight: 800;
      font-size: 9px;
      padding: 3px 6px;
      border-radius: 9999px;
      border: 2px solid #0f172a;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 3px;
    ">
      <span>📍</span>
      <span>${label}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-pin',
    html,
    iconSize: [50, 24],
    iconAnchor: [25, 12],
    popupAnchor: [0, -12]
  });
};

export const CampusMap: React.FC<CampusMapProps> = ({ pins, selectedIssueId, onSelectIssue }) => {
  // Filter valid geographic coordinates
  const validPins = pins.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !(p.latitude === 0 && p.longitude === 0)
  );

  // Group pins by coordinates to handle duplicate physical locations gracefully
  const coordinateGroups: { [key: string]: MapIssuePin[] } = {};
  validPins.forEach((pin) => {
    // Round slightly to group near identical coordinates
    const key = `${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`;
    if (!coordinateGroups[key]) {
      coordinateGroups[key] = [];
    }
    coordinateGroups[key].push(pin);
  });

  // Default campus center (fallback to standard coordinates if no pins present)
  const defaultCenter: [number, number] = validPins.length > 0
    ? [validPins[0].latitude, validPins[0].longitude]
    : [37.7749, -122.4194];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative">
      {/* Map Header Overlay */}
      <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 backdrop-blur">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Interactive Campus Issues Map</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low</span>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="h-[350px] md:h-[420px] w-full relative z-0">
        <MapContainer
          center={defaultCenter}
          zoom={15}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoFitBounds pins={validPins} />

          {Object.entries(coordinateGroups).map(([coordKey, groupPins]) => {
            const firstPin = groupPins[0];
            const highestPriority = groupPins.reduce((highest, pin) => {
              const prio = pin.final_admin_priority || pin.ai_priority || pin.student_priority;
              if (prio === 'CRITICAL') return 'CRITICAL';
              if (prio === 'HIGH' && highest !== 'CRITICAL') return 'HIGH';
              if (prio === 'MEDIUM' && highest !== 'CRITICAL' && highest !== 'HIGH') return 'MEDIUM';
              return highest;
            }, firstPin.final_admin_priority || firstPin.ai_priority || firstPin.student_priority);

            return (
              <Marker
                key={coordKey}
                position={[firstPin.latitude, firstPin.longitude]}
                icon={createPriorityIcon(highestPriority)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-2 max-w-xs font-sans text-xs">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        {groupPins.length > 1 ? `${groupPins.length} Issues at Location` : firstPin.building_name}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded">
                        {groupPins.length > 1 ? `${groupPins.length} Reports` : `#${firstPin.master_issue_number || firstPin.id.slice(0, 5)}`}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {groupPins.map((pin) => (
                        <div key={pin.id} className="p-1.5 bg-slate-100 rounded border border-slate-200 space-y-1">
                          <div className="font-semibold text-slate-900 line-clamp-1">{pin.title}</div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600">
                            <span>{pin.category}</span>
                            <span className="font-bold uppercase text-emerald-700">{pin.status}</span>
                          </div>
                          <button
                            onClick={() => onSelectIssue(pin.id)}
                            className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[10px] py-1 rounded transition flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Issue Details
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
