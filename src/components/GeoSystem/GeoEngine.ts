import { GeoZone, TrackerPoint, GeoAnomaly } from './types';

export class GeoEngine {
  
  // Haversine formula to calculate distance between two coordinates in meters
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
  }

  // Check if a point is inside a circular zone
  static isInsideZone(point: { lat: number; lng: number }, zone: GeoZone): boolean {
    const distance = this.calculateDistance(point.lat, point.lng, zone.center.lat, zone.center.lng);
    return distance <= zone.radiusMeters;
  }

  // Find which zone a point is currently in
  static findCurrentZone(point: { lat: number; lng: number }, zones: GeoZone[]): GeoZone | undefined {
    return zones.find(zone => this.isInsideZone(point, zone));
  }

  // Analyze a point against its expected behavior to generate anomalies
  static analyzePoint(point: TrackerPoint, zones: GeoZone[], expectedZoneId?: string): GeoAnomaly | null {
    const currentZone = this.findCurrentZone(point, zones);
    
    // 1. Wrong Location Anomaly
    if (expectedZoneId && (!currentZone || currentZone.id !== expectedZoneId)) {
      const expectedZone = zones.find(z => z.id === expectedZoneId);
      return {
        id: `anom_${Date.now()}_${point.userId}`,
        companyId: point.companyId,
        userId: point.userId,
        userName: point.userName,
        type: 'wrong_location',
        message: `الموظف يتواجد حالياً خارج نطاق موقعه المخصص (${expectedZone?.name || 'مجهول'})`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        resolved: false,
        lat: point.lat,
        lng: point.lng
      };
    }

    // 2. Curfew Violation for Accommodation
    if (currentZone && currentZone.type === 'accommodation' && currentZone.rules?.curfewStart && currentZone.rules?.curfewEnd) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const [startH, startM] = currentZone.rules.curfewStart.split(':').map(Number);
      const [endH, endM] = currentZone.rules.curfewEnd.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;
      if (endMinutes < startMinutes) endMinutes += 24 * 60; // Crosses midnight

      let isCurfew = false;
      if (startMinutes <= endMinutes) {
        isCurfew = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // e.g. 22:00 to 06:00
        isCurfew = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }

      // If it's curfew time, and they are NOT in the accommodation (this logic would require checking if they are missing from the zone)
      // Actually, if they ARE in the zone, they are fine. 
      // If we want to check if they LEFT during curfew, we need history.
      // For now, this is a basic check.
    }

    return null;
  }

  // Detect congregation (too many people in one unexpected area)
  static detectCongregations(points: TrackerPoint[], minPeople: number = 5, radiusThreshold: number = 50): GeoAnomaly[] {
    const anomalies: GeoAnomaly[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < points.length; i++) {
      if (processedIds.has(points[i].id)) continue;

      const cluster = [points[i]];
      for (let j = i + 1; j < points.length; j++) {
        if (processedIds.has(points[j].id)) continue;
        const dist = this.calculateDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
        if (dist <= radiusThreshold) {
          cluster.push(points[j]);
        }
      }

      if (cluster.length >= minPeople) {
        // Ensure they aren't just in an official zone
        // If we had zones array here we could check, but let's assume raw detection for now
        cluster.forEach(p => processedIds.add(p.id));
        
        anomalies.push({
          id: `cong_${Date.now()}_${i}`,
          companyId: cluster[0].companyId,
          type: 'congregation',
          message: `تجمع غير معتاد لعدد ${cluster.length} موظفين في منطقة بقطر ${radiusThreshold} متر.`,
          timestamp: new Date().toISOString(),
          severity: 'high',
          resolved: false,
          lat: cluster[0].lat,
          lng: cluster[0].lng
        });
      }
    }

    return anomalies;
  }
}
