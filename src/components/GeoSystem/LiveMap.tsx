import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeoZone, TrackerPoint } from './types';

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

  // Add the pulsing rings if active
  const pulseHtml = isActive ? `
    <div class="radar-pulse ring-1" style="border-color: ${color}"></div>
    <div class="radar-pulse ring-2" style="border-color: ${color}"></div>
    <div class="status-dot"></div>
  ` : '';

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="width: ${size}px; height: ${size}px; position: relative; display: flex; align-items: center; justify-content: center; transform-origin: center;">
        ${innerHtml}
        ${pulseHtml}
      </div>
      <style>
        .radar-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid;
          opacity: 0;
          z-index: 1;
        }
        .radar-pulse.ring-1 {
          animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .radar-pulse.ring-2 {
          animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite 1.25s;
        }
        .status-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: ${size/3}px;
          height: ${size/3}px;
          background-color: #10b981;
          border-radius: 50%;
          border: 2px solid white;
          z-index: 3;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
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
  mapType?: 'default' | 'satellite';
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

export default function LiveMap({ zones, points, center = { lat: 24.7136, lng: 46.6753 }, zoom = 12, onMapClick, tempZoneCenter, tempZoneRadius = 50, mapType = 'default' }: LiveMapProps) {
  const [currentZoom, setCurrentZoom] = React.useState(zoom);

  // Google Maps Arabic URLs
  const defaultUrl = "https://mt1.google.com/vt/lyrs=m&hl=ar&x={x}&y={y}&z={z}";
  const satelliteUrl = "https://mt1.google.com/vt/lyrs=y&hl=ar&x={x}&y={y}&z={z}";

  return (
    <div className={`w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-zinc-800 relative z-0 ${mapType === 'default' ? 'map-dark-filter' : ''}`}>
      <style>{`
        .map-dark-filter .leaflet-tile-pane {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
      `}</style>
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%', background: mapType === 'default' ? '#0f172a' : '#000' }}
        zoomControl={false}
      >
        <TileLayer
          url={mapType === 'satellite' ? satelliteUrl : defaultUrl}
          attribution='&copy; Google Maps'
        />
        <MapUpdater center={center} zoom={zoom} />
        <MapEvents onClick={onMapClick} onZoom={setCurrentZoom} />

        {/* Render Temp Zone if drawing */}
        {tempZoneCenter && (
          <Circle
            center={[tempZoneCenter.lat, tempZoneCenter.lng]}
            radius={tempZoneRadius}
            pathOptions={{
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.3,
              weight: 2,
              dashArray: '4 4'
            }}
          />
        )}

        {/* Render Zones */}
        {/* Draw User Paths */}
        {points.map(point => {
          if (point.path && point.path.length > 1) {
            const positions = point.path.map(p => [p.lat, p.lng] as [number, number]);
            
            // Determine path color based on latest speed (or default to cyan)
            let pathColor = '#06b6d4'; // Cyan
            if (point.speed) {
               if (point.speed > 120) pathColor = '#ef4444'; // Red
               else if (point.speed > 80) pathColor = '#f97316'; // Orange
            }

            return (
              <Polyline 
                key={`path-${point.id}`}
                positions={positions} 
                pathOptions={{ color: pathColor, weight: 4, opacity: 0.8, dashArray: '5, 10', lineCap: 'round' }} 
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

        {/* Render Live Tracker Points */}
        {points.filter(p => p.lat !== undefined && p.lng !== undefined).map(point => {
          let color = '#22c55e'; // Green for active
          if (point.status === 'offline') color = '#94a3b8'; // Slate
          else if (point.status === 'idle') color = '#f59e0b'; // Amber
          else if (point.userRole === 'manager' || point.userRole === 'owner') color = '#3b82f6'; // Blue

          const icon = createAvatarIcon(color, point.photoURL, currentZoom, point.status);

          return (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={icon}
            >
              <Popup>
                <div className="text-right font-sans" dir="rtl">
                  {point.speed !== undefined && (
                    <div className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm mb-2">
                      <span className="text-slate-600 font-bold">السرعة:</span>
                      <span className={`font-bold ${point.speed > 120 ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">
                        {point.speed} km/h
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    {point.photoURL ? (
                      <img src={point.photoURL} alt={point.userName} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500">
                        {point.userName?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-black text-sm text-slate-800">{point.userName}</p>
                      <p className="text-xs font-bold text-slate-500">{point.userRole === 'manager' ? 'مدير' : 'موظف'}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs font-bold text-slate-600 border-t border-slate-100 pt-2">
                    <p>الحالة: <span className={point.status === 'active' ? 'text-green-600' : point.status === 'idle' ? 'text-amber-500' : 'text-slate-400'}>{point.status === 'active' ? 'نشط' : point.status === 'idle' ? 'خامل' : 'غير متصل'}</span></p>
                    {point.batteryLevel !== undefined && (
                      <p>البطارية: <span className={point.batteryLevel < 20 ? 'text-red-500' : 'text-slate-600'}>{point.batteryLevel}%</span></p>
                    )}
                    <p className="text-[10px] text-slate-400 font-normal mt-1">آخر تحديث: {new Date(point.timestamp).toLocaleTimeString('ar-SA')}</p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`);
                        // The user will get the text copied to their clipboard
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg text-[10px] font-bold transition-colors border border-slate-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
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
