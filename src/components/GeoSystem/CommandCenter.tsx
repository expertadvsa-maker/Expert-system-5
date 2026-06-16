import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { GeoZone, TrackerPoint, GeoAnomaly } from './types';
import { GeoEngine } from './GeoEngine';
import LiveMap from './LiveMap';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, writeBatch, doc, deleteDoc, getDocs, getDoc, serverTimestamp, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  Radar, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Activity, 
  Crosshair,
  Building2,
  Home,
  Plus,
  Save,
  X,
  Globe,
  Navigation,
  Compass,
  Trash2,
  Edit2,
  Battery,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';



export default function CommandCenter() {
  const { activeCompanyId, user: currentUser } = useAuth();
  const [dbZones, setDbZones] = useState<GeoZone[]>([]);
  const [dbPoints, setDbPoints] = useState<TrackerPoint[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  
  // History Playback State
  const [historyMode, setHistoryMode] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<TrackerPoint[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const parsedProjects = useMemo(() => {
    return dbProjects.map(proj => {
      let coords = proj.locationCoords;
      if (!coords && proj.locationLink) {
        const atMatch = proj.locationLink.match(/(?:@|%40)(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
        const qMatch = proj.locationLink.match(/q=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
        const directMatch = proj.locationLink.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        
        if (atMatch) coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        else if (qMatch) coords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        else if (directMatch) coords = { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
      }
      return { ...proj, dynamicCoords: coords };
    });
  }, [dbProjects]);

  const zones = useMemo(() => {
    const combined = [...dbZones];
    parsedProjects.forEach(proj => {
      if (proj.dynamicCoords) {
        combined.push({
          id: proj.id,
          name: proj.title || proj.name || 'مشروع بدون اسم',
          type: 'project',
          companyId: proj.companyId,
          center: proj.dynamicCoords,
          radiusMeters: proj.radiusMeters || 100,
          createdAt: proj.createdAt,
        });
      }
    });
    return combined;
  }, [dbZones, parsedProjects]);

  const missingLocationProjects = useMemo(() => {
    return parsedProjects.filter(proj => 
      !proj.dynamicCoords && proj.status === 'active'
    );
  }, [parsedProjects]);

  const [liveFilter, setLiveFilter] = useState<'all' | 'low_battery' | 'speeding' | 'idle'>('all');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Update current time every minute to force recalculation of true live status
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const points = useMemo(() => {
    const combinedMap = new Map<string, TrackerPoint>();
    const now = Date.now();
    
    // First, add all active tracking points for this company.
    // If a point is here, it means the user tracked themselves.
    dbPoints.forEach(p => {
       if (p.userRole !== 'client') {
          let actualStatus = p.status;
          
          if (p.timestamp) {
            const pointTime = new Date(p.timestamp).getTime();
            const diffMins = (now - pointTime) / 1000 / 60;
            
            // If no ping for > 15 mins, they are offline
            if (diffMins > 15) {
              actualStatus = 'offline';
            } 
            // If no ping for > 3 mins or they are actively tracking but speed is 0 for a while, mark as idle
            else if (diffMins > 3 && actualStatus === 'active') {
              actualStatus = 'idle';
            }
          }
          
          // Use userId or id as the key
          combinedMap.set(p.userId || p.id, { ...p, status: actualStatus });
       }
    });

    // Second, loop through users in the company. 
    // If they aren't tracking, add them as offline. If they are tracking, update their name/photo.
    dbUsers.forEach(u => {
      if (u.role === 'client') return; // Skip clients

      if (!combinedMap.has(u.id)) {
        combinedMap.set(u.id, {
          id: `offline_${u.id}`,
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          companyId: u.companyId,
          photoURL: u.photoURL,
          lat: undefined as unknown as number,
          lng: undefined as unknown as number,
          timestamp: new Date().toISOString(),
          status: 'offline',
        });
      } else {
        // Ensure their name and photo are up-to-date from dbUsers
        const existing = combinedMap.get(u.id)!;
        existing.userName = u.name || existing.userName;
        existing.photoURL = u.photoURL || existing.photoURL;
      }
    });

    const allUsers = Array.from(combinedMap.values());
    if (liveFilter === 'all') return allUsers;
    if (liveFilter === 'low_battery') return allUsers.filter(u => u.batteryLevel !== undefined && u.batteryLevel < 20);
    if (liveFilter === 'speeding') return allUsers.filter(u => u.speed !== undefined && u.speed > 120);
    if (liveFilter === 'idle') return allUsers.filter(u => u.status === 'idle');
    return allUsers;
  }, [dbPoints, dbUsers, liveFilter, currentTime]);
  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lng: number} | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const notifiedAnomalies = useRef<Set<string>>(new Set());
  const [liveAlerts, setLiveAlerts] = useState<GeoAnomaly[]>([]);
  const [nearestAddress, setNearestAddress] = useState<string>('جاري تحديد الموقع...');

  // Reverse Geocoding for Focus Panel
  useEffect(() => {
    if (selectedUserId) {
      const userPt = points.find(p => p.userId === selectedUserId);
      if (userPt && userPt.lat && userPt.lng) {
        setNearestAddress('جاري تحديد الموقع...');
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userPt.lat}&lon=${userPt.lng}&accept-language=ar`)
          .then(res => res.json())
          .then(data => {
            if (data && data.display_name) {
              const parts = data.display_name.split(',');
              const shortAddress = parts.slice(0, 3).join('، ');
              setNearestAddress(shortAddress);
            } else {
              setNearestAddress('موقع غير معروف');
            }
          })
          .catch(() => setNearestAddress('تعذر جلب العنوان'));
      }
    }
  }, [selectedUserId, points]);
  const [isLiveSimulating, setIsLiveSimulating] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const dbPointsRef = useRef<TrackerPoint[]>([]);
  useEffect(() => { dbPointsRef.current = dbPoints; }, [dbPoints]);
  
  const [zoneModal, setZoneModal] = useState<{
    isOpen: boolean;
    mode: 'new' | 'edit' | 'missing';
    zoneId: string;
    title: string;
    type: string;
    radius: number;
    inputLink: string;
  }>({ isOpen: false, mode: 'new', zoneId: '', title: '', type: 'office', radius: 100, inputLink: '' });

  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    lat: number;
    lng: number;
    nearestUser: TrackerPoint | null;
  } | null>(null);

  // New features state
  const [mapTheme, setMapTheme] = useState<'light' | 'dark' | 'satellite'>('dark');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, zoneId: string} | null>(null);
  const [showUsersModal, setShowUsersModal] = useState<'active' | 'offline' | null>(null);

  // Live Alerts Panel State
  const [liveAlerts, setLiveAlerts] = useState<Array<{
    id: string;
    message: string;
    type: 'warning' | 'error';
    time: string;
  }>>([]);

  const removeAlert = (id: string) => {
    setLiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Close context menu on document click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Live Simulation Loop
  useEffect(() => {
    if (!isLiveSimulating || !activeCompanyId) return;
    
    const interval = setInterval(() => {
      const currentPoints = dbPointsRef.current;
      currentPoints.forEach(p => {
        if (p.status === 'active') {
          const newLat = p.lat + (Math.random() - 0.5) * 0.0004; // small offset
          const newLng = p.lng + (Math.random() - 0.5) * 0.0004;
          updateDoc(doc(db, 'live_tracking', p.id), {
            lat: newLat,
            lng: newLng,
            speed: Math.floor(Math.random() * 60) + 10, // random speed
            timestamp: new Date().toISOString()
          }).catch(e => console.error("Sim error:", e));
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLiveSimulating, activeCompanyId]);

  // Fetch History Points
  useEffect(() => {
    if (!historyMode || !historyUserId || !activeCompanyId) {
      setHistoryPoints([]);
      setHistoryIndex(0);
      return;
    }

    const fetchHistory = async () => {
      try {
        const historyDocRef = doc(db, 'tracking_history', `${historyUserId}_${historyDate}`);
        const historyDoc = await getDoc(historyDocRef);
        if (historyDoc.exists() && historyDoc.data().companyId === activeCompanyId) {
          const data = historyDoc.data();
          setHistoryPoints(data.points || []);
          setHistoryIndex(0); // reset to beginning of day
        } else {
          setHistoryPoints([]);
          toast.info('لا توجد بيانات مسجلة لهذا الموظف في هذا اليوم');
        }
      } catch (e) {
        console.error("Error fetching history:", e);
        toast.error('حدث خطأ أثناء جلب سجل المسار');
      }
    };
    
    fetchHistory();
  }, [historyMode, historyUserId, historyDate, activeCompanyId]);

  // Time Machine Auto Play Loop
  useEffect(() => {
    if (!isAutoPlaying || !historyMode || historyPoints.length === 0) return;
    
    const interval = setInterval(() => {
      setHistoryIndex(prev => {
        if (prev >= historyPoints.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000); // 1 point per second

    return () => clearInterval(interval);
  }, [isAutoPlaying, historyMode, historyPoints.length]);

  // Congregation Alerts (Cross-Tracking)
  useEffect(() => {
    if (!points || points.length === 0) return;
    
    const activePoints = points.filter(p => p.status === 'active' && p.lat && p.lng);
    const newAlerts: Array<{ id: string; message: string; type: 'warning' | 'error'; time: string; }> = [];
    
    for (let i = 0; i < activePoints.length; i++) {
      for (let j = i + 1; j < activePoints.length; j++) {
        const p1 = activePoints[i];
        const p2 = activePoints[j];
        
        // Simple distance calculation (rough estimate for 50m)
        // 1 degree lat is ~111km. 50m is ~0.00045 degrees
        const dLat = p1.lat - p2.lat;
        const dLng = p1.lng - p2.lng;
        const distSq = dLat*dLat + dLng*dLng;
        
        if (distSq < 0.0000002) { // approx 50m squared
          // Use alphabetically sorted IDs to ensure consistent alert ID regardless of order
          const sortedIds = [p1.userId, p2.userId].sort();
          const alertId = `congregation_${sortedIds[0]}_${sortedIds[1]}`;
          
          if (!notifiedAnomalies.current.has(alertId)) {
            newAlerts.push({
              id: alertId,
              message: `تجمع غير مجدول: ${p1.userName} و ${p2.userName} في نفس الموقع`,
              type: 'warning',
              time: new Date().toLocaleTimeString('ar-SA')
            });
            notifiedAnomalies.current.add(alertId);
          }
        }
      }
    }
    
    if (newAlerts.length > 0) {
      setLiveAlerts(prev => [...prev, ...newAlerts]);
      newAlerts.forEach(a => toast.error(a.message, { icon: '⚠️' }));
    }
  }, [points]);

  // Listen to Firebase 'geo_zones' and 'live_tracking'
  useEffect(() => {
    if (!activeCompanyId) return;

    const zonesQ = query(collection(db, 'geo_zones'), where('companyId', '==', activeCompanyId));
    const unsubZones = onSnapshot(zonesQ, (snapshot) => {
      const fetchedZones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeoZone));
      setDbZones(fetchedZones);
    });

    const pointsQ = query(collection(db, 'live_tracking'), where('companyId', '==', activeCompanyId));
    const unsubPoints = onSnapshot(pointsQ, (snapshot) => {
      const fetchedPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrackerPoint));
      setDbPoints(fetchedPoints);
    });

    const usersQ = query(collection(db, 'users'), where('companyId', '==', activeCompanyId));
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbUsers(fetchedUsers);
    });

    const projectsQ = query(collection(db, 'projects'), where('companyId', '==', activeCompanyId));
    const unsubProjects = onSnapshot(projectsQ, (snapshot) => {
      const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDbProjects(fetchedProjects);
    });

    return () => {
      unsubZones();
      unsubPoints();
      unsubUsers();
      unsubProjects();
    };
  }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId || points.length === 0 || zones.length === 0) return;

    points.filter(p => p.lat && p.lng).forEach(point => {
      const anomaly = GeoEngine.analyzePoint(point, zones);
      if (anomaly) {
        // Generate a unique ID for this anomaly so we only notify once per day per user per anomaly
        const todayStr = new Date().toISOString().split('T')[0];
        const anomalyKey = `${point.id}-${anomaly.type}-${todayStr}`;
        
        if (!notifiedAnomalies.current.has(anomalyKey)) {
          notifiedAnomalies.current.add(anomalyKey);

          // 🚨 Geo-Fencing Alarm Sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch (e) {}
          
          // Add to Custom Live Alerts Panel
          setLiveAlerts(prev => [{
            id: anomalyKey,
            message: `الموظف ${point.userName}: ${anomaly.message}`,
            type: anomaly.severity === 'high' ? 'error' : 'warning',
            time: new Date().toLocaleTimeString('ar-SA')
          }, ...prev]);
          
          // Send to Global Notifications
          addDoc(collection(db, 'notifications'), {
            companyId: activeCompanyId,
            title: anomaly.type === 'out_of_bounds' ? 'خروج عن النطاق المسموح' : 'إنذار ميداني',
            message: `الموظف ${point.userName}: ${anomaly.message}`,
            category: 'system',
            type: 'alert',
            read: false,
            createdAt: serverTimestamp(),
            link: '/radar'
          }).catch(err => console.error("Failed to add notification", err));
        }
      }
    });

    const validPoints = points.filter(p => p.lat && p.lng);
    const congregations = GeoEngine.detectCongregations(validPoints, zones, 3, 50);
    congregations.forEach(cong => {
      const todayStr = new Date().toISOString().split('T')[0];
      const congKey = `congregation-${cong.pointIds?.join('-')}-${todayStr}`;
      
      if (!notifiedAnomalies.current.has(congKey)) {
        notifiedAnomalies.current.add(congKey);

        // 🚨 Congregation Alarm Sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch (e) {}
        
        // Add to Custom Live Alerts Panel
        setLiveAlerts(prev => [{
          id: congKey,
          message: cong.message,
          type: 'warning',
          time: new Date().toLocaleTimeString('ar-SA')
        }, ...prev]);
        
        addDoc(collection(db, 'notifications'), {
          companyId: activeCompanyId,
          title: 'تجمع غير معتاد للموظفين',
          message: cong.message,
          category: 'system',
          type: 'alert',
          read: false,
          createdAt: serverTimestamp(),
          link: '/radar'
        }).catch(err => console.error("Failed to add notification", err));
      }
    });

  }, [points, zones, activeCompanyId]);

  const activeCount = points.filter(p => p.status === 'active').length;
  const offlineCount = points.filter(p => p.status === 'offline').length;

  const handleCleanMockData = async () => {
    if (!activeCompanyId) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      
      const mockNames = ['أحمد سعد', 'محمود علي', 'فارس المشرف', 'سعيد يوسف'];
      const pointsSnapshot = await getDocs(query(collection(db, 'live_tracking'), where('companyId', '==', activeCompanyId)));
      pointsSnapshot.forEach(docSnap => {
        if (mockNames.includes(docSnap.data().userName)) {
          batch.delete(doc(db, 'live_tracking', docSnap.id));
        }
      });

      const mockZones = ['المقر الرئيسي للشركة', 'مشروع برج العليان', 'سكن العمال (السلي)'];
      const zonesSnapshot = await getDocs(query(collection(db, 'geo_zones'), where('companyId', '==', activeCompanyId)));
      zonesSnapshot.forEach(docSnap => {
        if (mockZones.includes(docSnap.data().name)) {
          batch.delete(doc(db, 'geo_zones', docSnap.id));
        }
      });

      await batch.commit();
      toast.success('تم حذف البيانات الوهمية بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تنظيف البيانات');
    } finally {
      setIsSeeding(false);
    }
  };


  const handleSaveZoneModal = async () => {
    let coords = null;
    const link = zoneModal.inputLink;
    if (link) {
      const atMatch = link.match(/(?:@|%40)(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
      const qMatch = link.match(/q=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
      const directMatch = link.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      
      if (atMatch) coords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
      else if (qMatch) coords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      else if (directMatch) coords = { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
    }

    if (!coords && zoneModal.mode !== 'edit') {
      toast.error('الرابط غير صالح أو الإحداثيات مفقودة.');
      return;
    }

    try {
      if (zoneModal.mode === 'missing') {
        await updateDoc(doc(db, 'projects', zoneModal.zoneId), {
          locationLink: link,
          locationCoords: coords
        });
        toast.success('تم ربط النطاق بالمشروع بنجاح');
      } else if (zoneModal.mode === 'new') {
        if (!zoneModal.title) {
          toast.error('يرجى إدخال اسم النطاق');
          return;
        }
        await addDoc(collection(db, 'geo_zones'), {
          companyId: activeCompanyId,
          name: zoneModal.title,
          type: zoneModal.type,
          center: coords,
          radiusMeters: zoneModal.radius,
          createdAt: new Date().toISOString()
        });
        toast.success('تم إنشاء النطاق بنجاح');
      } else if (zoneModal.mode === 'edit') {
        const isDbProject = dbProjects.some(p => p.id === zoneModal.zoneId);
        if (isDbProject) {
          const updateData: any = { radiusMeters: zoneModal.radius };
          if (link) updateData.locationLink = link;
          if (coords) updateData.locationCoords = coords;
          await updateDoc(doc(db, 'projects', zoneModal.zoneId), updateData);
        } else {
          const updateData: any = { name: zoneModal.title, type: zoneModal.type, radiusMeters: zoneModal.radius };
          if (coords) updateData.center = coords;
          await updateDoc(doc(db, 'geo_zones', zoneModal.zoneId), updateData);
        }
        toast.success('تم تحديث النطاق بنجاح');
      }
      setZoneModal(prev => ({...prev, isOpen: false}));
    } catch (error) {
      toast.error('فشل حفظ النطاق الجغرافي');
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      if (!zoneId.startsWith('p_')) {
        await deleteDoc(doc(db, 'geo_zones', zoneId));
      }
      toast.success('تم حذف النطاق بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const displayPoints = useMemo(() => {
    if (historyMode && historyPoints.length > 0) {
      const user = dbUsers.find(u => u.id === historyUserId);
      const point = historyPoints[historyIndex];
      if (!point || !user) return [];
      
      return [{
        id: `history_${user.id}_${point.timestamp}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        companyId: user.companyId,
        photoURL: user.photoURL,
        lat: point.lat,
        lng: point.lng,
        timestamp: new Date(point.timestamp).toISOString(),
        speed: point.speed,
        status: 'active',
        path: historyPoints.slice(0, historyIndex + 1)
      } as TrackerPoint];
    }
    return points;
  }, [historyMode, historyPoints, historyIndex, historyUserId, dbUsers, points]);

  return (
    <div className="w-full h-[calc(100vh-80px)] overflow-hidden relative font-sans bg-slate-950 text-slate-50 flex" dir="rtl">
      
      {/* BACKGROUND MAP */}
      <div className="absolute inset-0 z-0">
        <LiveMap 
          zones={zones} 
          points={displayPoints} 
          center={selectedUserId ? (points.find(p => p.userId === selectedUserId) || selectedPoint || { lat: 24.7136, lng: 46.6753 }) : (selectedPoint || { lat: 24.7136, lng: 46.6753 })} 
          zoom={selectedUserId || selectedPoint ? 17 : 13} 
          onMapClick={(lat, lng) => {
            let nearest: TrackerPoint | null = null;
            let minDistance = Infinity;
            const activeUsers = points.filter(p => p.status === 'active' && p.lat && p.lng);
            for (const u of activeUsers) {
              const dist = Math.pow(u.lat - lat, 2) + Math.pow(u.lng - lng, 2);
              if (dist < minDistance) {
                minDistance = dist;
                nearest = u;
              }
            }
            setDispatchModal({ isOpen: true, lat, lng, nearestUser: nearest });
          }}
          mapTheme={mapTheme}
          historyTrack={historyMode ? historyPoints.slice(0, historyIndex + 1) : undefined}
          selectedUserId={selectedUserId}
        />

        {/* Live Filters */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex gap-2 bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full border border-slate-700/50 shadow-2xl">
          <button
            onClick={() => setLiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${liveFilter === 'all' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            الكل
          </button>
          <button
            onClick={() => setLiveFilter('low_battery')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${liveFilter === 'low_battery' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'}`}
            title="بطارية أقل من 20%"
          >
            🔋 منخفض
          </button>
          <button
            onClick={() => setLiveFilter('speeding')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${liveFilter === 'speeding' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'}`}
            title="سرعة تزيد عن 120 كم/س"
          >
            ⚡ مسرع
          </button>
          <button
            onClick={() => setLiveFilter('idle')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-1 ${liveFilter === 'idle' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            🛑 خمول
          </button>
        </div>
        
        {/* Floating Map Controls */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-[400] flex flex-row gap-4 items-center bg-slate-900/80 backdrop-blur-xl p-2 rounded-3xl border border-slate-700/50 shadow-2xl">
          <button 
            onClick={() => setMapTheme('dark')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'dark' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            title="خريطة ليلية"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
          </button>
          
          <button 
            onClick={() => setMapTheme('light')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'light' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            title="خريطة نهارية"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
          </button>
          
          <div className="w-px h-6 bg-slate-700/50 mx-1"></div>

          <button 
            onClick={() => setMapTheme('satellite')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${mapTheme === 'satellite' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            title="قمر صناعي"
          >
            <Globe className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                toast.loading('جاري تحديد الموقع...', { id: 'locating' });
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setSelectedPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setSelectedUserId(currentUser?.uid || null);
                    toast.success('تم تحديد موقعك بنجاح', { id: 'locating' });
                  },
                  (err) => {
                    console.error(err);
                    const myLocation = dbPointsRef.current.find(p => p.userId === currentUser?.uid);
                    if (myLocation) {
                      setSelectedPoint({ lat: myLocation.lat, lng: myLocation.lng });
                      setSelectedUserId(myLocation.userId);
                      toast.success('تم تحديد موقع مسارك كبديل', { id: 'locating' });
                    } else {
                      setSelectedPoint({ lat: 24.7136, lng: 46.6753 });
                      setSelectedUserId(null);
                      toast.error('تعذر جلب الموقع. تم تحديد الرياض افتراضياً', { id: 'locating' });
                    }
                  },
                  { enableHighAccuracy: true, timeout: 5000 }
                );
              } else {
                toast.error('متصفحك لا يدعم تحديد الموقع', { id: 'locating' });
              }
            }}
            className="w-12 h-12 bg-emerald-600/90 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl flex items-center justify-center text-emerald-50 hover:text-white hover:bg-emerald-500 transition-all group relative hover:scale-105"
            title="تحديد موقعي"
          >
            <Navigation className="w-6 h-6" />
            <span className="absolute bottom-full mb-3 bg-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-emerald-700">
              تحديد موقعي
            </span>
          </button>

          <button 
            onClick={() => { setSelectedPoint({ lat: 24.7136, lng: 46.6753 }); setSelectedUserId(null); }}
            className="w-12 h-12 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all group relative hover:scale-105"
            title="بوصلة / ضبط الرؤية"
          >
            <Compass className="w-6 h-6" />
            <span className="absolute bottom-full mb-3 bg-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-slate-700">
              إعادة الرؤية للمنتصف
            </span>
          </button>
        </div>
      </div>

      {/* OVERLAYS - GLASSMORPHISM PANELS */}
      <div className="relative z-10 w-full h-full pointer-events-none flex p-4 gap-4 justify-between">
        
        {/* Left Panel - Deep Focus (Appears when a user is selected) */}
        <div className="flex flex-col h-full pointer-events-none">
          <AnimatePresence>
            {selectedUserId && (
              <motion.div 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="w-[380px] mt-20 bg-slate-900/80 backdrop-blur-3xl border border-emerald-500/30 rounded-3xl p-6 shadow-[0_8px_32px_rgba(16,185,129,0.2)] flex flex-col gap-5 pointer-events-auto relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                {(() => {
                  const userPt = points.find(p => p.userId === selectedUserId);
                  if (!userPt) return null;
                  
                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden shrink-0">
                          {userPt.photoURL ? (
                            <img src={userPt.photoURL} alt={userPt.userName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold text-emerald-400">{userPt.userName?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-black text-white">{userPt.userName}</h2>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`w-2 h-2 rounded-full ${userPt.status === 'active' ? 'bg-emerald-500 animate-pulse' : userPt.status === 'idle' ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`}></span>
                            <span className="text-sm font-bold text-slate-300">
                              {userPt.status === 'active' ? 'متحرك نشط' : userPt.status === 'idle' ? 'في حالة ركود' : 'غير متصل'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-1.5">
                          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> السرعة الحالية</span>
                          <span className="text-2xl font-black text-white">{userPt.speed || 0} <span className="text-xs text-slate-500 font-bold">كم/س</span></span>
                        </div>
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-1.5">
                          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><Battery className="w-3.5 h-3.5"/> بطارية الجهاز</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${userPt.batteryLevel && userPt.batteryLevel < 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {userPt.batteryLevel !== undefined && userPt.batteryLevel !== null ? `${userPt.batteryLevel}%` : 'N/A'}
                            </span>
                            {userPt.isCharging && <Zap className="w-5 h-5 text-amber-400" />}
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-2 mt-1">
                         <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> العنوان الأقرب (مباشر)</span>
                         <span className="text-sm font-bold text-white leading-relaxed">
                           {nearestAddress}
                         </span>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-2">
                         <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> آخر تحديث للإشارة</span>
                         <span className="text-sm font-bold text-slate-300">
                           {new Date(userPt.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </span>
                      </div>

                      <button 
                        onClick={() => setSelectedUserId(null)}
                        className="mt-2 w-full py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-sm transition-colors"
                      >
                        إغلاق التركيز
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel - Stats & Controls */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[340px] h-full flex flex-col gap-4 pointer-events-auto"
        >
          {/* Header Card */}
          <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-5 relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center relative z-10">
              <h1 className="text-xl font-black flex items-center gap-2 text-white bg-clip-text text-transparent bg-gradient-to-l from-white to-slate-400">
                <Radar className="w-6 h-6 text-emerald-400" />
                الرادار الميداني
              </h1>
              
              <button 
                onClick={() => setHistoryMode(!historyMode)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-bold transition-all border ${historyMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-700/80'}`}
              >
                {historyMode ? 'إيقاف الأرشيف' : 'تشغيل الأرشيف'}
              </button>
            </div>
            
            {!historyMode ? (
              <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
                <div 
                  onClick={() => setShowUsersModal('active')}
                  className="group bg-gradient-to-br from-slate-800/60 to-slate-900/80 p-4 rounded-2xl border border-slate-700/50 cursor-pointer hover:border-emerald-500/50 transition-all active:scale-95 shadow-inner"
                >
                  <div className="text-emerald-400 flex items-center gap-2 mb-2 text-xs font-bold group-hover:scale-105 transition-transform origin-right">
                    <Activity className="w-4 h-4" />
                    نشط حالياً
                  </div>
                  <div className="text-3xl font-black text-white tracking-tight">{activeCount}</div>
                </div>
                <div 
                  onClick={() => setShowUsersModal('offline')}
                  className="group bg-gradient-to-br from-slate-800/60 to-slate-900/80 p-4 rounded-2xl border border-slate-700/50 cursor-pointer hover:border-slate-400/50 transition-all active:scale-95 shadow-inner"
                >
                  <div className="text-slate-400 flex items-center gap-2 mb-2 text-xs font-bold group-hover:scale-105 transition-transform origin-right">
                    <Users className="w-4 h-4" />
                    غير نشط
                  </div>
                  <div className="text-3xl font-black text-white tracking-tight">{offlineCount}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1 border-t border-slate-800/50 pt-4 relative z-10">
                <label className="text-xs text-slate-400 font-bold">تاريخ المسار</label>
                <input 
                  type="date" 
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                
                <label className="text-xs text-slate-400 font-bold mt-1">الموظف</label>
                <select 
                  value={historyUserId || ''}
                  onChange={(e) => setHistoryUserId(e.target.value)}
                  className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="">اختر الموظف...</option>
                  {dbUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                {historyPoints.length > 0 && (
                  <div className="mt-3 bg-slate-950/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="flex justify-between text-[10px] text-indigo-300 font-bold mb-2">
                      <span>بداية اليوم</span>
                      <span>نهاية اليوم</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={historyPoints.length - 1} 
                      value={historyIndex}
                      onChange={(e) => setHistoryIndex(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex items-center gap-2 mt-3">
                      <button 
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isAutoPlaying ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}
                      >
                        {isAutoPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        )}
                      </button>
                      <div className="flex-1 text-center text-xs text-white font-mono bg-indigo-500/10 py-2.5 rounded-xl border border-indigo-500/20">
                        {new Date(historyPoints[historyIndex]?.timestamp || Date.now()).toLocaleTimeString('ar-SA')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zones List */}
          <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex-1 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
            
            <div className="flex justify-between items-center mb-5 mt-1 relative z-10">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                النطاقات الجغرافية
              </h2>
              <button 
                onClick={() => {
                  setZoneModal({
                    isOpen: true,
                    mode: 'new',
                    zoneId: '',
                    title: '',
                    type: 'office',
                    radius: 100,
                    inputLink: ''
                  });
                }}
                className="p-1.5 rounded-lg border transition-all bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 no-scrollbar space-y-3 flex-1 relative z-10">
              {zones.map(z => (
                <div 
                  key={z.id} 
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-800/10 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-500/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-pointer transition-all group"
                  onClick={() => { setSelectedPoint(z.center); setSelectedUserId(null); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setZoneModal({
                      isOpen: true,
                      mode: 'edit',
                      zoneId: z.id,
                      title: z.name,
                      type: z.type || 'project',
                      radius: z.radiusMeters || 100,
                      inputLink: z.center ? `${z.center.lat}, ${z.center.lng}` : ''
                    });
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl shadow-inner transition-transform group-hover:scale-110 ${
                      z.type === 'office' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 
                      z.type === 'project' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                      'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                    }`}>
                      {z.type === 'office' ? <Building2 className="w-4 h-4" /> : z.type === 'project' ? <Crosshair className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">{z.name}</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">{z.radiusMeters} متر</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {missingLocationProjects.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3 relative z-10">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  مشاريع نشطة بلا نطاق راداري
                </h3>
                <div className="space-y-2">
                  {missingLocationProjects.map(proj => (
                    <div 
                      key={`missing-${proj.id}`} 
                      onClick={() => {
                        setZoneModal({
                          isOpen: true,
                          mode: 'missing',
                          zoneId: proj.id,
                          title: proj.title || proj.name || 'مشروع بدون اسم',
                          type: 'project',
                          radius: 100,
                          inputLink: ''
                        });
                      }}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all cursor-pointer group shadow-sm"
                      title="اضغط لإضافة رابط أو إحداثيات الموقع"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform shadow-inner">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors">{proj.title || proj.name || 'مشروع بدون اسم'}</p>
                            <p className="text-[11px] font-bold text-amber-400/80 mt-0.5">
                              اضغط لإضافة الموقع
                            </p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center opacity-50 group-hover:opacity-100 group-hover:bg-amber-500/20 transition-all">
                          <Plus className="w-4 h-4 text-amber-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Mock Data Button */}
            {points.some(p => ['أحمد سعد', 'محمود علي', 'فارس المشرف', 'سعيد يوسف'].includes(p.userName)) && (
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setIsLiveSimulating(!isLiveSimulating)}
                  className={`flex-1 border py-2 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${isLiveSimulating ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800/80 text-slate-300 border-slate-700/50 hover:bg-slate-700/80'}`}
                >
                  <Activity className="w-4 h-4" />
                  {isLiveSimulating ? 'إيقاف الحركة' : 'محاكاة حركة الموظفين'}
                </button>

                <button 
                  onClick={handleCleanMockData}
                  disabled={isSeeding}
                  className="w-10 flex-shrink-0 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl flex items-center justify-center transition-colors"
                  title="حذف البيانات الوهمية"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Center Spacer */}
        <div className="flex-1" />

        {/* Left Panel - Live Alerts (Floating Bubbles) */}
        <div className="w-80 h-full flex flex-col gap-3 pointer-events-none pr-4 pt-4">
          <AnimatePresence>
            {liveAlerts.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-end mb-2 pointer-events-auto"
              >
                <button 
                  onClick={() => setLiveAlerts([])}
                  className="bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-400 text-slate-300 text-xs px-4 py-1.5 rounded-full transition-all flex items-center gap-2 shadow-lg"
                >
                  <X className="w-3 h-3" />
                  مسح جميع الإنذارات
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar hide-scrollbar-thumb">
            <AnimatePresence>
              {liveAlerts.map(alert => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, padding: 0, border: 0 }}
                  className={`p-4 rounded-2xl border pointer-events-auto shadow-2xl relative group backdrop-blur-xl ${alert.type === 'error' ? 'bg-rose-950/80 border-rose-500/50 text-rose-100' : 'bg-amber-950/80 border-amber-500/50 text-amber-100'}`}
                >
                  <button 
                    onClick={() => removeAlert(alert.id)}
                    className="absolute left-2 top-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60 hover:scale-110"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  <div className="flex gap-3">
                    <AlertTriangle className={`w-5 h-5 shrink-0 ${alert.type === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div className="flex-1">
                      <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] mt-2 opacity-60 text-left font-mono" dir="ltr">{alert.time}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Users List Modal */}
      <AnimatePresence>
        {showUsersModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setShowUsersModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  {showUsersModal === 'active' ? <Activity className="w-5 h-5 text-emerald-400" /> : <Users className="w-5 h-5 text-slate-400" />}
                  {showUsersModal === 'active' ? 'المستخدمون النشطون حالياً' : 'غير النشطين (أوفلاين)'}
                </h2>
                <button onClick={() => setShowUsersModal(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {points.filter(p => showUsersModal === 'active' ? (p.status === 'active' || p.status === 'idle') : p.status === 'offline').length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-bold">لا يوجد مستخدمين لعرضهم</div>
                ) : (
                  points
                    .filter(p => showUsersModal === 'active' ? (p.status === 'active' || p.status === 'idle') : p.status === 'offline')
                    .map(point => {
                      let timeAgoStr = 'غير متاح';
                      if (point.timestamp) {
                        const diffMs = Date.now() - new Date(point.timestamp).getTime();
                        const diffMins = Math.round(diffMs / 60000);
                        if (diffMins < 1) timeAgoStr = 'الآن';
                        else if (diffMins < 60) timeAgoStr = `منذ ${diffMins} دقيقة`;
                        else {
                          const diffHours = Math.floor(diffMins / 60);
                          if (diffHours < 24) timeAgoStr = `منذ ${diffHours} ساعة`;
                          else timeAgoStr = `منذ ${Math.floor(diffHours / 24)} يوم`;
                        }
                      }

                      return (
                        <div 
                          key={point.id} 
                          className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50 cursor-pointer"
                          onClick={() => {
                            if (point.lat && point.lng) {
                              setSelectedPoint({ lat: point.lat, lng: point.lng });
                              setSelectedUserId(point.userId);
                              setShowUsersModal(null);
                            } else {
                              toast.error('الموقع الجغرافي غير متوفر حالياً لهذا الموظف');
                            }
                          }}
                        >
                          {point.photoURL ? (
                            <img src={point.photoURL} alt={point.userName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-black text-slate-300 text-lg">
                              {point.userName?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-black text-slate-200">{point.userName}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                               آخر نشاط: {timeAgoStr}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className={`text-[10px] font-black px-2 py-1 rounded-md inline-block mb-1 ${point.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : point.status === 'idle' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                              {point.status === 'active' ? 'نشط' : point.status === 'idle' ? 'خامل' : 'أوفلاين'}
                            </div>
                            {point.batteryLevel !== undefined && (
                              <div className={`text-[10px] font-bold ${point.batteryLevel < 20 ? 'text-red-400' : 'text-slate-500'}`}>
                                البطارية {point.batteryLevel}%
                              </div>
                            )}
                            {point.speed !== undefined && point.status !== 'offline' && (
                              <div className={`text-[10px] font-bold mt-1 ${point.speed > 120 ? 'text-red-400' : 'text-emerald-500'}`} dir="ltr">
                                {point.speed} km/h
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Zone Management Modal */}
      <AnimatePresence>
        {zoneModal.isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setZoneModal(prev => ({...prev, isOpen: false}))}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col p-6"
            >
              <h2 className="text-xl font-black text-white mb-2">
                {zoneModal.mode === 'new' ? 'إضافة نطاق جديد' : zoneModal.mode === 'edit' ? 'إدارة النطاق الجغرافي' : 'تحديد نطاق المشروع'}
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                ألصق الإحداثيات المباشرة (مثل: <code className="bg-slate-800 text-amber-400 px-1 rounded">24.713, 46.675</code>) أو رابط جوجل ماب الطويل.
              </p>
              
              <div className="space-y-4">
                {zoneModal.mode !== 'missing' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-2">اسم النطاق</label>
                      <input
                        type="text"
                        value={zoneModal.title}
                        onChange={(e) => setZoneModal(prev => ({...prev, title: e.target.value}))}
                        disabled={dbProjects.some(p => p.id === zoneModal.zoneId)} // Disabled if it's a real project
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none disabled:opacity-50"
                      />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-300 block mb-2">نوع النطاق</label>
                        <select
                          value={zoneModal.type}
                          onChange={(e) => setZoneModal(prev => ({...prev, type: e.target.value}))}
                          disabled={dbProjects.some(p => p.id === zoneModal.zoneId)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white outline-none disabled:opacity-50"
                        >
                          <option value="project">مشروع</option>
                          <option value="office">مكتب إداري</option>
                          <option value="accommodation">سكن عمال</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-300 block mb-2">قطر الرادار (بالمتر)</label>
                        <input
                          type="number"
                          value={zoneModal.radius}
                          onChange={(e) => setZoneModal(prev => ({...prev, radius: Number(e.target.value)}))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">رابط الموقع أو الإحداثيات {zoneModal.mode === 'missing' && `لمشروع (${zoneModal.title})`}</label>
                  <input
                    type="text"
                    value={zoneModal.inputLink}
                    onChange={(e) => setZoneModal(prev => ({...prev, inputLink: e.target.value}))}
                    placeholder="24.7136, 46.6753"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    dir="ltr"
                  />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveZoneModal}
                    disabled={!zoneModal.inputLink.trim() && zoneModal.mode !== 'edit'}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl transition-colors disabled:opacity-50"
                  >
                    حفظ النطاق
                  </button>
                  {zoneModal.mode === 'edit' && !dbProjects.some(p => p.id === zoneModal.zoneId) && (
                    <button
                      onClick={() => {
                        handleDeleteZone(zoneModal.zoneId);
                        setZoneModal(prev => ({...prev, isOpen: false}));
                      }}
                      className="px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold h-12 rounded-xl transition-colors"
                    >
                      حذف
                    </button>
                  )}
                  <button
                    onClick={() => setZoneModal(prev => ({...prev, isOpen: false}))}
                    className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold h-12 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dispatch Modal */}
      <AnimatePresence>
        {dispatchModal?.isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
              onClick={() => setDispatchModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col p-6"
            >
              <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-emerald-400" />
                توجيه مهمة ذكي
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                سيتم إرسال المهمة لأقرب موظف متاح للموقع الذي قمت بتحديده.
              </p>
              
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 mb-6">
                <div className="text-xs text-slate-500 mb-1">الموقع المحدد:</div>
                <div className="text-sm font-mono text-slate-300" dir="ltr">{dispatchModal.lat.toFixed(5)}, {dispatchModal.lng.toFixed(5)}</div>
                
                <div className="mt-4 pt-4 border-t border-slate-800/50">
                  <div className="text-xs text-slate-500 mb-2">أقرب موظف מتاح:</div>
                  {dispatchModal.nearestUser ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500/50 flex items-center justify-center overflow-hidden">
                        {dispatchModal.nearestUser.photoURL ? (
                          <img src={dispatchModal.nearestUser.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-slate-400">{dispatchModal.nearestUser.userName?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{dispatchModal.nearestUser.userName}</div>
                        <div className="text-xs text-emerald-400">يبعد مسافة قريبة جداً</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-rose-400 text-sm font-bold">لا يوجد موظفين نشطين حالياً</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    toast.success('تم إرسال المهمة بنجاح');
                    setDispatchModal(null);
                  }}
                  disabled={!dispatchModal.nearestUser}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-xl transition-colors disabled:opacity-50"
                >
                  إرسال المهمة الآن
                </button>
                <button
                  onClick={() => setDispatchModal(null)}
                  className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold h-12 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
