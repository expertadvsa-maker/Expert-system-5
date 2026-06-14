import { useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { GeoEngine } from '../components/GeoSystem/GeoEngine';

export function useLiveTracking() {
  const { user, profile, activeCompanyId } = useAuth();
  const lastLocation = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  useEffect(() => {
    // Only track if logged in and geolocation is supported
    if (!user?.uid || !activeCompanyId || !profile || !navigator.geolocation) {
      return;
    }

    const updateLocation = async (lat: number, lng: number) => {
      try {
        await setDoc(doc(db, 'live_tracking', user.uid), {
          companyId: activeCompanyId,
          userId: user.uid,
          userName: profile.name,
          userRole: profile.role || 'employee',
          photoURL: profile.photoURL || null,
          lat,
          lng,
          timestamp: new Date().toISOString(),
          status: 'active',
          // Note: getBattery is non-standard, wrapping in a try-catch pattern to prevent breaking
        }, { merge: true });
      } catch (error) {
        console.error("Live tracking update failed:", error);
      }
    };

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const now = Date.now();

      if (lastLocation.current) {
        // Calculate distance
        const dist = GeoEngine.calculateDistance(
          lastLocation.current.lat, 
          lastLocation.current.lng, 
          latitude, 
          longitude
        );

        // Only update if moved more than 20 meters OR 5 minutes have passed
        const timeDiff = now - lastLocation.current.timestamp;
        if (dist > 20 || timeDiff > 5 * 60 * 1000) {
          lastLocation.current = { lat: latitude, lng: longitude, timestamp: now };
          updateLocation(latitude, longitude);
        }
      } else {
        // First location update
        lastLocation.current = { lat: latitude, lng: longitude, timestamp: now };
        updateLocation(latitude, longitude);
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.warn("Geolocation watch error:", error);
    };

    const watchId = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
      }
    );

    // Cleanup: Set status to offline when unmounting/closing app (if possible)
    return () => {
      navigator.geolocation.clearWatch(watchId);
      // Attempt to set offline status gracefully
      setDoc(doc(db, 'live_tracking', user.uid), {
        status: 'offline',
        timestamp: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    };

  }, [user?.uid, activeCompanyId, profile]);
}
