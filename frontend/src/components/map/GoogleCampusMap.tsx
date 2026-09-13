import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Eye, AlertCircle, Layers, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    google: any;
    initGoogleMapScript?: () => void;
  }
}

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

interface GoogleCampusMapProps {
  pins: MapIssuePin[];
  selectedIssueId: string | null;
  onSelectIssue: (issueId: string) => void;
  apiKey?: string;
}

export const GoogleCampusMap: React.FC<GoogleCampusMapProps> = ({
  pins,
  selectedIssueId,
  onSelectIssue,
  apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});
  const infoWindowRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Filter valid geographic coordinates
  const validPins = pins.filter(
    (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !(p.latitude === 0 && p.longitude === 0)
  );

  // 1. Dynamic Script Loader for Google Maps JS API
  useEffect(() => {
    if (!apiKey) {
      setScriptError('VITE_GOOGLE_MAPS_API_KEY is not configured in frontend environment variables.');
      return;
    }

    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      existingScript.addEventListener('load', () => setMapLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setScriptError('Failed to load Google Maps JavaScript API SDK.');
    document.head.appendChild(script);
  }, [apiKey]);

  // 2. Initialize Google Map Instance
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google || !window.google.maps) return;

    if (!googleMapInstanceRef.current) {
      const defaultCenter = validPins.length > 0
        ? { lat: validPins[0].latitude, lng: validPins[0].longitude }
        : { lat: 37.7749, lng: -122.4194 };

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_LEFT,
          mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        zoomControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#38bdf8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#38bdf8' }] }
        ]
      });

      googleMapInstanceRef.current = map;
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }
  }, [mapLoaded]);

  // 3. Render Markers & InfoWindows
  useEffect(() => {
    if (!mapLoaded || !googleMapInstanceRef.current || !window.google) return;

    const map = googleMapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => m.setMap(null));
    markersRef.current = {};

    if (validPins.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    validPins.forEach((pin) => {
      const pos = { lat: pin.latitude, lng: pin.longitude };
      bounds.extend(pos);

      const prio = (pin.final_admin_priority || pin.ai_priority || pin.student_priority || 'MEDIUM').toUpperCase();
      let pinColor = '#10b981'; // Emerald
      if (prio === 'CRITICAL') pinColor = '#f43f5e';
      else if (prio === 'HIGH') pinColor = '#f59e0b';
      else if (prio === 'MEDIUM') pinColor = '#0284c7';

      // SVG Custom Pin Marker Icon
      const svgMarker = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: pinColor,
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: '#020617',
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 22)
      };

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: pin.title,
        icon: svgMarker
      });

      marker.addListener('click', () => {
        onSelectIssue(pin.id);
        const content = `
          <div style="font-family: system-ui, sans-serif; padding: 6px; max-width: 220px; color: #0f172a;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${pin.title}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              📍 ${pin.building_name}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700; margin-bottom: 8px;">
              <span style="background: #e2e8f0; padding: 2px 6px; rounded: 4px;">#${pin.master_issue_number || pin.id.slice(0, 5)}</span>
              <span style="color: ${pinColor}; text-transform: uppercase;">${prio}</span>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current[pin.id] = marker;
    });

    if (validPins.length > 1) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    } else if (validPins.length === 1) {
      map.setCenter({ lat: validPins[0].latitude, lng: validPins[0].longitude });
      map.setZoom(16);
    }
  }, [mapLoaded, validPins]);

  // 4. Pan & Highlight on selectedIssueId change
  useEffect(() => {
    if (!selectedIssueId || !googleMapInstanceRef.current || !markersRef.current[selectedIssueId]) return;

    const map = googleMapInstanceRef.current;
    const marker = markersRef.current[selectedIssueId];

    if (marker) {
      map.panTo(marker.getPosition());
      map.setZoom(17);
      const pin = pins.find((p) => p.id === selectedIssueId);
      if (pin && infoWindowRef.current) {
        const content = `
          <div style="font-family: system-ui, sans-serif; padding: 6px; max-width: 220px; color: #0f172a;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${pin.title}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              📍 ${pin.building_name}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; font-weight: 700;">
              <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">#${pin.master_issue_number || pin.id.slice(0, 5)}</span>
              <span style="text-transform: uppercase;">${pin.status}</span>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
      }
    }
  }, [selectedIssueId, pins]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl relative">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 backdrop-blur">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Campus Issues Google Map</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Low</span>
        </div>
      </div>

      {/* Map Container & Fallback Message */}
      <div className="h-[360px] md:h-[450px] w-full relative bg-slate-950">
        {scriptError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-300 space-y-3 z-10">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white">Google Maps API Key Required</h4>
              <p className="text-xs text-slate-400 max-w-md">
                {scriptError}
              </p>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-400">
              VITE_GOOGLE_MAPS_API_KEY=&lt;YOUR_GOOGLE_MAPS_API_KEY&gt;
            </div>
          </div>
        ) : !mapLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 bg-slate-950">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading Google Maps JavaScript API...</span>
          </div>
        ) : null}

        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
};
