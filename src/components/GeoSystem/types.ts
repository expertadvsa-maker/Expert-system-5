export type ZoneType = 'office' | 'accommodation' | 'project';

export interface GeoZone {
  id: string;
  name: string;
  type: ZoneType;
  companyId: string;
  center: { lat: number; lng: number };
  radiusMeters: number; // Radius for geofencing
  createdAt: string;
  // Specific rules based on type
  rules?: {
    requiresClockIn?: boolean;
    curfewStart?: string; // HH:mm
    curfewEnd?: string;   // HH:mm
  };
}

export interface TrackerPoint {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  companyId: string;
  photoURL?: string;
  lat: number;
  lng: number;
  speed?: number;
  path?: { lat: number; lng: number; timestamp: number; speed?: number }[];
  timestamp: string;
  batteryLevel?: number;
  status: 'active' | 'idle' | 'offline';
  currentZoneId?: string; // if they are inside a known zone
}

export interface GeoAnomaly {
  id: string;
  companyId: string;
  userId?: string;
  userName?: string;
  type: 'wrong_location' | 'curfew_violation' | 'unauthorized_exit' | 'congregation' | 'out_of_bounds' | 'inactivity' | 'speeding';
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  lat?: number;
  lng?: number;
  pointIds?: string[];
}
