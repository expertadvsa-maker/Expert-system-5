import { useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { GeoEngine } from '../components/GeoSystem/GeoEngine';
import { GeoZone } from '../components/GeoSystem/types';

export function useLiveTracking() {
  const { user, profile, activeCompanyId } = useAuth();
  const lastLocation = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const lastZoneId = useRef<string | null>(null);
  const currentZones = useRef<GeoZone[]>([]);
  const lastPathResetDate = useRef<string>(new Date().toISOString().split('T')[0]);

  // Load Zones & Projects to detect entering/exiting locally
  useEffect(() => {
    if (!activeCompanyId) return;

    const zonesQ = query(collection(db, 'geo_zones'), where('companyId', '==', activeCompanyId));
    const unsubZones = onSnapshot(zonesQ, (snapshot) => {
      const fetchedZones = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GeoZone));
      currentZones.current = [...currentZones.current.filter(z => z.type === 'project'), ...fetchedZones];
    });

    const projectsQ = query(collection(db, 'projects'), where('companyId', '==', activeCompanyId));
    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      const projs = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const projectZones: GeoZone[] = [];
      
      projs.forEach(proj => {
        let coords = proj.locationCoords;
        if (!coords && proj.locationLink) {
          const directMatch = proj.locationLink.match(/(-?\d+\.\d+)(?:\s*,\s*|\s*\+\s*|\s+|%2C|!4d)(-?\d+\.\d+)/);
          if (directMatch) coords = { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
        }
        if (coords) {
          projectZones.push({
            id: proj.id,
            name: proj.title || proj.name || 'مشروع بدون اسم',
            type: 'project',
            companyId: proj.companyId,
            center: coords,
            radiusMeters: proj.radiusMeters || 100,
            createdAt: proj.createdAt,
          });
        }
      });
      currentZones.current = [...currentZones.current.filter(z => z.type !== 'project'), ...projectZones];
    });

    return () => {
      unsubZones();
      unsubProjects();
    };
  }, [activeCompanyId]);

  useEffect(() => {
    // 🚀 Start tracking logic
    // Wait for profile to load so we don't accidentally ask owners for location
    if (!user?.uid || !navigator.geolocation || !profile) {
      return;
    }

    // Role-Based Firewall: Track everyone EXCEPT clients
    if (['client'].includes(profile.role)) {
      return;
    }

    // RACE CONDITION FIX: If the user is supposed to have a company, but activeCompanyId is not set yet, WAIT!
    if (profile.companyId && !activeCompanyId) {
      return;
    }

    const updateLocation = async (lat: number, lng: number, speedMps: number | null) => {
      if (!activeCompanyId || !profile) {
        // We have location permission, but the app is still loading profile/company. Wait quietly.
        if (!activeCompanyId && profile && ['supervisor', 'employee'].includes(profile.role)) {
          import('sonner').then(({ toast }) => {
            toast.error("تنبيه: حسابك غير مرتبط بأي شركة حالياً، ولن تظهر في الرادار الإداري!", { id: 'no_company_toast' });
          });
        }
        return;
      }

      try {
        const speedKmh = speedMps ? Math.round(speedMps * 3.6) : 0;
        const nowStr = new Date().toISOString();
        const todayStr = nowStr.split('T')[0];

        // 1. Detect Zone Entering / Exiting
        const currentZone = GeoEngine.findCurrentZone({ lat, lng }, currentZones.current);
        const currentZoneId = currentZone ? currentZone.id : null;
        
        if (lastZoneId.current !== currentZoneId) {
          if (lastZoneId.current) {
            // Exited previous zone
            const prevZone = currentZones.current.find(z => z.id === lastZoneId.current);
            if (prevZone) {
               addDoc(collection(db, 'notifications'), {
                 companyId: activeCompanyId,
                 title: 'خروج من النطاق المخصص',
                 message: `الموظف ${profile.name} غادر نطاق ${prevZone.name}`,
                 category: 'system',
                 type: 'alert',
                 read: false,
                 createdAt: serverTimestamp(),
                 link: '/radar'
               }).catch(e => console.error("Event failed", e));
            }
          }
          if (currentZone) {
            // Entered new zone
            addDoc(collection(db, 'notifications'), {
               companyId: activeCompanyId,
               title: 'دخول إلى النطاق المخصص',
               message: `الموظف ${profile.name} دخل نطاق ${currentZone.name}`,
               category: 'system',
               type: 'success',
               read: false,
               createdAt: serverTimestamp(),
               link: '/radar'
            }).catch(e => console.error("Event failed", e));
          }
          lastZoneId.current = currentZoneId;
        }

        // 2. Fetch existing to check if we need to reset the path (new day)
        let pathResetRequired = false;
        if (todayStr !== lastPathResetDate.current) {
          pathResetRequired = true;
          lastPathResetDate.current = todayStr;
        }

        const pointData = { lat, lng, timestamp: Date.now(), speed: speedKmh };
        
        await setDoc(doc(db, 'live_tracking', user.uid), {
          companyId: activeCompanyId,
          userId: user.uid,
          userName: profile.name,
          userRole: profile.role || 'employee',
          photoURL: profile.photoURL || null,
          lat,
          lng,
          speed: speedKmh,
          currentZoneId: currentZoneId,
          timestamp: nowStr,
          status: 'active',
          path: pathResetRequired ? [pointData] : arrayUnion(pointData)
        }, { merge: true });

      } catch (error) {
        console.error("Live tracking update failed:", error);
      }
    };

    let isFirstUpdateInSession = true;

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, speed } = position.coords;
      const now = Date.now();

      if (lastLocation.current && !isFirstUpdateInSession) {
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
          updateLocation(latitude, longitude, speed);
        }
      } else {
        // First location update in this session/mount
        isFirstUpdateInSession = false;
        lastLocation.current = { lat: latitude, lng: longitude, timestamp: now };
        updateLocation(latitude, longitude, speed);
      }
    };

    let currentWatchId: number;
    let hasShownSuccessToast = false;

    const startTracking = (highAccuracy: boolean) => {
      currentWatchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!hasShownSuccessToast) {
            import('sonner').then(({ toast }) => {
               toast.success('📍 تم التقاط الإحداثيات! أنت الآن متصل بالرادار.', { duration: 4000 });
            });
            hasShownSuccessToast = true;
          }
          successCallback(position);
        },
        (error) => {
          console.warn(`Geolocation error (HighAccuracy: ${highAccuracy}):`, error);
          if (error.code === error.PERMISSION_DENIED) {
            import('sonner').then(({ toast }) => {
              toast.error("يرجى السماح بصلاحية الموقع من إعدادات المتصفح");
            });
            window.dispatchEvent(new CustomEvent('geolocation_denied'));
          } else if (error.code === error.TIMEOUT && highAccuracy) {
            console.warn("GPS timeout, falling back to network location...");
            import('sonner').then(({ toast }) => {
              toast.loading("إشارة الـ GPS ضعيفة، جاري البحث عن طريق أبراج الاتصال...", { duration: 3000 });
            });
            navigator.geolocation.clearWatch(currentWatchId);
            startTracking(false);
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          maximumAge: 10000,
          timeout: highAccuracy ? 10000 : 30000
        }
      );
    };

    // Kickstart tracking with High Accuracy first
    startTracking(true);

    // 🚀 Mobile Browser Hack: iOS Safari and some mobile browsers block background 
    // location requests on page load without a user gesture. 
    // We attach a dummy request to the very first tap/click anywhere on the screen 
    // to guarantee the native permission popup appears!
    const handleFirstInteraction = () => {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { maximumAge: 60000 });
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    // Cleanup: Set status to offline when unmounting/closing app (if possible)
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      if (currentWatchId) navigator.geolocation.clearWatch(currentWatchId);
      // Attempt to set offline status gracefully
      setDoc(doc(db, 'live_tracking', user.uid), {
        status: 'offline',
        timestamp: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    };

  }, [user?.uid, activeCompanyId, profile]);
}
