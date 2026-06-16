import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeoZone, TrackerPoint } from './types';
import RoutedPath from './RoutedPath';

export const getUserColor = (userId: string) => {
  const colors = [
    '#f43f5e', // rose
    '#8b5cf6', // violet
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#6366f1', // indigo
    '#ec4899', // pink
    '#14b8a6', // teal
    '#eab308', // yellow
    '#a855f7', // purple
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Fix for default marker icons in Leaflet with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createAvatarIcon = (color: string, photoURL?: string, zoom: number = 12, status: string = 'offline') => {
  // Dynamic size based on zoom level
  const size = Math.max(16, Math.min(80, Math.pow(zoom, 1.4)));
  const anchor = size / 2;
  const borderWidth = Math.max(2, size / 20);
  const isActive = status === 'active';
  
  let innerHtml = '';
  if (photoURL) {
    innerHtml = `<img src="${photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: ${borderWidth}px solid ${color}; position: relative; z-index: 2;" />`;
  } else {
    innerHtml = `<div style="background-color: ${color}; width: 100%; height: 100%; border-radius: 50%; border: ${borderWidth}px solid white; position: relative; z-index: 2;"></div>`;
  }

  // Add the pulsing rings if active or idle
  const isPulsing = status === 'active' || status === 'idle';
  const pulseHtml = isPulsing ? `
    <div class="radar-pulse ring-1" style="border-color: ${color}"></div>
    <div class="radar-pulse ring-2" style="border-color: ${color}"></div>
    <div class="status-dot" style="background-color: ${color}"></div>
  ` : `<div class="status-dot" style="background-color: ${color}"></div>`;

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="width: ${size}px; height: ${size}px; position: relative; display: flex; align-items: center; justify-content: center; transform-origin: center;">
        ${innerHtml}
        ${pulseHtml}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor]
  });
};

interface LiveMapProps {
  zones: GeoZone[];
  points: TrackerPoint[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapClick?: (lat: number, lng: number) => void;
  tempZoneRadius?: number;
  mapTheme?: 'light' | 'dark' | 'satellite';
  historyTrack?: TrackerPoint[];
  selectedUserId?: string | null;
}

// Component to recenter map dynamically
function MapUpdater({ center, zoom }: { center?: { lat: number; lng: number }, zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom || map.getZoom(), { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks
function MapEvents({ onClick, onZoom }: { onClick?: (lat: number, lng: number) => void, onZoom?: (zoom: number) => void }) {
  const map = useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend() {
      if (onZoom) onZoom(map.getZoom());
    }
  });
  return null;
}

export default function LiveMap({ 
  zones, 
  points, 
  center = { lat: 24.7136, lng: 46.6753 }, 
  zoom = 12, 
  onMapClick, 
  tempZoneRadius = 50, 
  mapTheme = 'dark',
  historyTrack = [],
  selectedUserId
}: LiveMapProps) {
  const [currentZoom, setCurrentZoom] = React.useState(zoom);

  // Parse points to valid coordinates
  const validPoints = points.filter(p => p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng));
  
  // Parse history track for polyline
  const polylinePositions = historyTrack
    .filter(p => p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng))
    .map(p => [p.lat, p.lng] as [number, number]);

  // Mock Task-Path for selected user
  const selectedUserPt = selectedUserId ? validPoints.find(p => p.userId === selectedUserId) : null;
  const [mockTasks, setMockTasks] = React.useState<{id:string, lat:number, lng:number, title:string}[]>([]);
  const lastSelectedUserId = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    if (selectedUserId && selectedUserId !== lastSelectedUserId.current) {
      const userPt = validPoints.find(p => p.userId === selectedUserId);
      if (userPt) {
        setMockTasks([
          { id: 't1', lat: userPt.lat + 0.002, lng: userPt.lng + 0.002, title: 'زيارة موقع أ' },
          { id: 't2', lat: userPt.lat - 0.003, lng: userPt.lng + 0.001, title: 'صيانة وقائية ب' }
        ]);
        lastSelectedUserId.current = selectedUserId;
      }
    } else if (!selectedUserId) {
      setMockTasks([]);
      lastSelectedUserId.current = null;
    }
  }, [selectedUserId, validPoints]);

  // Google Maps Arabic URLs
  const defaultUrl = "https://mt1.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}";
  const satelliteUrl = "https://mt1.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}";

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-zinc-800 relative z-0 ${mapTheme === 'dark' ? 'map-dark-filter' : ''}`}>
      <style>{`
        .map-dark-filter .leaflet-tile-pane {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%', background: mapTheme === 'dark' ? '#0f172a' : '#e5e7eb' }}
        zoomControl={false}
      >
        <TileLayer
          url={mapTheme === 'satellite' ? satelliteUrl : defaultUrl}
          attribution='&copy; Google Maps'
        />
        <MapUpdater center={center} zoom={zoom} />
        <MapEvents onClick={onMapClick} onZoom={setCurrentZoom} />


        {/* Render Zones */}
        {/* Draw User Paths */}
        {points.map(point => {
          if (point.path && point.path.length > 1) {
            const positions = point.path.map(p => [p.lat, p.lng] as [number, number]);
            
            // Determine path color based on userId to give each user a distinct color
            const pathColor = getUserColor(point.userId);

            return (
              <RoutedPath 
                key={`path-${point.id}`}
                positions={positions} 
                color={pathColor}
                weight={4}
                opacity={0.8}
                dashArray="5, 10"
                lineCap="round"
              />
            );
          }
          return null;
        })}

        {zones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radiusMeters}
            pathOptions={{
              color: zone.type === 'office' ? '#3b82f6' : zone.type === 'project' ? '#f59e0b' : '#a855f7',
              fillColor: zone.type === 'office' ? '#3b82f6' : zone.type === 'project' ? '#f59e0b' : '#a855f7',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4 4'
            }}
          >
            <Popup>
              <div className="text-right font-sans" dir="rtl">
                <p className="font-bold text-sm text-slate-800">{zone.name}</p>
                <p className="text-xs text-slate-500 mt-1">النوع: {zone.type === 'office' ? 'إدارة' : zone.type === 'project' ? 'مشروع' : 'سكن'}</p>
                <p className="text-xs text-slate-500">نطاق الحماية: {zone.radiusMeters} متر</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Render History Track */}
        {polylinePositions.length > 1 && (
          <RoutedPath 
            positions={polylinePositions} 
            color={historyTrack[0] ? getUserColor(historyTrack[0].userId) : '#8b5cf6'}
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Render Task Paths for Selected User */}
        {selectedUserPt && mockTasks.length > 0 && (
          <>
            <RoutedPath 
              positions={[[selectedUserPt.lat, selectedUserPt.lng], [mockTasks[0].lat, mockTasks[0].lng]]} 
              color="#10b981"
              weight={3}
              dashArray="5 5"
              opacity={0.6}
            />
            {mockTasks.map(task => (
              <Marker 
                key={task.id} 
                position={[task.lat, task.lng]}
                icon={L.divIcon({
                  className: 'custom-task-marker',
                  html: `<div style="background-color:#10b981; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 10px rgba(16,185,129,0.5);"></div>`,
                  iconSize: [16,16],
                  iconAnchor: [8,8]
                })}
              >
                <Popup>
                  <div className="text-right font-sans" dir="rtl">
                    <p className="font-bold text-sm text-slate-800">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">مهمة قادمة</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {/* Render Live Tracker Points */}
        {points.filter(p => p.lat !== undefined && p.lng !== undefined).map(point => {
          // Use the exact same color as their path timeline
          const color = getUserColor(point.userId);

          const icon = createAvatarIcon(color, point.photoURL, currentZoom, point.status);

          return (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={icon}
            >
              <Popup className="glass-popup">
                <div className="text-right font-sans min-w-[200px]" dir="rtl">
                  {point.speed !== undefined && (
                    <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg text-sm mb-3 border border-slate-700/50">
                      <span className="text-slate-300 font-bold">السرعة:</span>
                      <span className={`font-bold ${point.speed > 120 ? 'text-rose-400' : 'text-emerald-400'}`} dir="ltr">
                        {point.speed} km/h
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    {point.photoURL ? (
                      <img src={point.photoURL} alt={point.userName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600 shadow-lg" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-black text-slate-400 border-2 border-slate-700 shadow-lg">
                        {point.userName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-black text-base text-slate-100">{point.userName}</p>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">{point.userRole === 'manager' ? 'مدير' : 'موظف'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs font-bold text-slate-300 border-t border-slate-700/50 pt-3">
                    <p>الحالة: <span className={point.status === 'active' ? 'text-emerald-400' : point.status === 'idle' ? 'text-amber-400' : 'text-slate-500'}>{point.status === 'active' ? 'نشط' : point.status === 'idle' ? 'خامل' : 'غير متصل'}</span></p>
                    {point.batteryLevel !== undefined && (
                      <p>البطارية: <span className={point.batteryLevel < 20 ? 'text-rose-400' : 'text-slate-400'}>{point.batteryLevel}%</span></p>
                    )}
                    <p className="text-[10px] text-slate-500 font-normal mt-2">آخر تحديث: {new Date(point.timestamp).toLocaleTimeString('ar-SA')}</p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`);
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-300 py-2 rounded-xl text-xs font-bold transition-colors border border-slate-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      نسخ موقع الموظف
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
