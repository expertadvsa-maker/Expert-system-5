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
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';



export default function CommandCenter() {
  const { activeCompanyId } = useAuth();
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
      !proj.dynamicCoords && 
      proj.status === 'active'
    );
  }, [parsedProjects]);

  const points = useMemo(() => {
    const combinedMap = new Map<string, TrackerPoint>();
    dbPoints.forEach(p => combinedMap.set(p.userId || p.id, p));
    
    dbUsers.forEach(u => {
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
      }
    });
    return Array.from(combinedMap.values());
  }, [dbPoints, dbUsers]);
  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lng: number} | undefined>();
  const notifiedAnomalies = useRef<Set<string>>(new Set());

  const [isSeeding, setIsSeeding] = useState(false);
  
  const [zoneModal, setZoneModal] = useState<{
    isOpen: boolean;
    mode: 'new' | 'edit' | 'missing';
    zoneId: string;
    title: string;
    type: string;
    radius: number;
    inputLink: string;
  }>({ isOpen: false, mode: 'new', zoneId: '', title: '', type: 'office', radius: 100, inputLink: '' });

  // New features state
  const [mapType, setMapType] = useState<'default' | 'satellite'>('default');
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, zoneId: string} | null>(null);
  const [showUsersModal, setShowUsersModal] = useState<'active' | 'all' | null>(null);

  // Close context menu on document click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
          
          // Show Toast Bubble
          if (anomaly.severity === 'high') {
             toast.error(`إنذار ميداني: ${anomaly.message}`, { duration: 6000, icon: '🚨' });
          } else {
             toast.warning(`إنذار ميداني: ${anomaly.message}`, { duration: 5000, icon: '⚠️' });
          }
          
          // Send to Global Notifications
          addDoc(collection(db, 'notifications'), {
            companyId: activeCompanyId,
            title: anomaly.type === 'out_of_bounds' ? 'خروج عن النطاق المسموح' : 'إنذار ميداني',
            message: anomaly.message,
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
    const congregations = GeoEngine.detectCongregations(validPoints, 3, 50);
    congregations.forEach(cong => {
      const todayStr = new Date().toISOString().split('T')[0];
      const congKey = `congregation-${cong.pointIds?.join('-')}-${todayStr}`;
      
      if (!notifiedAnomalies.current.has(congKey)) {
        notifiedAnomalies.current.add(congKey);
        
        toast.warning(`تنبيه تجمع: ${cong.message}`, { duration: 6000, icon: '👥' });
        
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

  const handleMapClick = (lat: number, lng: number) => {
    if (isDrawingMode) {
      setTempZone(prev => ({
        ...prev,
        lat,
        lng,
        radius: prev?.radius || 100,
        name: prev?.name || '',
        type: prev?.type || 'project',
        projectId: prev?.projectId
      }));
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
      if (zoneId.startsWith('z')) {
        setZones(zones.filter(z => z.id !== zoneId));
      } else {
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
          center={selectedPoint || { lat: 24.7136, lng: 46.6753 }} 
          zoom={13} 
          onMapClick={() => {}}
          mapType={mapType}
        />
        
        {/* Floating Map Controls */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-[400] flex flex-row gap-4">
          <button 
            onClick={() => setMapType(prev => prev === 'default' ? 'satellite' : 'default')}
            className="w-12 h-12 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-all group relative hover:scale-105"
            title="تبديل الخريطة"
          >
            <Globe className="w-6 h-6" />
            <span className="absolute bottom-full mb-3 bg-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-slate-700">
              {mapType === 'default' ? 'قمر صناعي' : 'خريطة عادية'}
            </span>
          </button>
          
          <button 
            onClick={() => {
               if (navigator.geolocation) {
                 toast.loading('جاري تحديد موقعك...', { id: 'locating' });
                 navigator.geolocation.getCurrentPosition(pos => {
                   toast.success('تم التحديد بنجاح', { id: 'locating' });
                   setSelectedPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                 }, (error) => {
                   toast.error('يرجى تفعيل صلاحية الموقع الجغرافي من المتصفح', { id: 'locating' });
                 }, { enableHighAccuracy: true, timeout: 10000 });
               } else {
                 toast.error('المتصفح لا يدعم تحديد الموقع');
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
            onClick={() => setSelectedPoint({ lat: 24.7136, lng: 46.6753 })}
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
      <div className="relative z-10 w-full h-full pointer-events-none flex p-4 gap-4">
        
        {/* Right Panel - Stats & Controls */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 h-full flex flex-col gap-4 pointer-events-auto"
        >
          {/* Header */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-black flex items-center gap-2 text-white">
                <Radar className="w-6 h-6 text-emerald-400" />
                الرادار الميداني
              </h1>
              
              <button 
                onClick={() => setHistoryMode(!historyMode)}
                className={`text-xs px-3 py-1 rounded-full font-bold transition-all border ${historyMode ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
              >
                {historyMode ? 'إيقاف الأرشيف' : 'تشغيل الأرشيف'}
              </button>
            </div>
            
            {!historyMode ? (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div 
                  onClick={() => setShowUsersModal('active')}
                  className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-700/80 hover:border-emerald-500/50 transition-all active:scale-95"
                >
                  <div className="text-emerald-400 flex items-center gap-1.5 mb-1 text-xs font-bold">
                    <Activity className="w-3.5 h-3.5" />
                    نشط حالياً
                  </div>
                  <div className="text-2xl font-black text-white">{activeCount}</div>
                </div>
                <div 
                  onClick={() => setShowUsersModal('all')}
                  className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-700/80 hover:border-blue-500/50 transition-all active:scale-95"
                >
                  <div className="text-slate-400 flex items-center gap-1.5 mb-1 text-xs font-bold">
                    <Users className="w-3.5 h-3.5" />
                    إجمالي القوة
                  </div>
                  <div className="text-2xl font-black text-white">{points.length}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2 border-t border-slate-800 pt-3">
                <label className="text-xs text-slate-400 font-bold">تاريخ المسار</label>
                <input 
                  type="date" 
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                />
                
                <label className="text-xs text-slate-400 font-bold">الموظف</label>
                <select 
                  value={historyUserId || ''}
                  onChange={(e) => setHistoryUserId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white"
                >
                  <option value="">اختر الموظف...</option>
                  {dbUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>

                {historyPoints.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-indigo-300 mb-1">
                      <span>بداية اليوم</span>
                      <span>نهاية اليوم</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={historyPoints.length - 1} 
                      value={historyIndex}
                      onChange={(e) => setHistoryIndex(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="text-center text-xs text-slate-300 mt-2 font-mono">
                      الوقت: {new Date(historyPoints[historyIndex]?.timestamp || Date.now()).toLocaleTimeString('ar-SA')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zones List */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
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

            <div className="overflow-y-auto pr-1 no-scrollbar space-y-3 flex-1">
              {zones.map(z => (
                <div 
                  key={z.id} 
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPoint(z.center)}
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
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      z.type === 'office' ? 'bg-blue-500/20 text-blue-400' : 
                      z.type === 'project' ? 'bg-amber-500/20 text-amber-400' : 
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {z.type === 'office' ? <Building2 className="w-4 h-4" /> : z.type === 'project' ? <Crosshair className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">{z.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{z.radiusMeters} متر</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {missingLocationProjects.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 flex items-center gap-2 mb-2">
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
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer group"
                      title="اضغط لإضافة رابط أو إحداثيات الموقع"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{proj.title || proj.name || 'مشروع بدون اسم'}</p>
                            <p className="text-[10px] text-amber-300 mt-0.5 flex items-center gap-1">
                              اضغط لإضافة رابط أو إحداثيات الموقع
                            </p>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-amber-500 opacity-50 group-hover:opacity-100" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Mock Data Button */}
            {points.some(p => ['أحمد سعد', 'محمود علي', 'فارس المشرف', 'سعيد يوسف'].includes(p.userName)) && (
              <button 
                onClick={handleCleanMockData}
                disabled={isSeeding}
                className="mt-4 w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 rounded-xl py-2 text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isSeeding ? 'جاري التنظيف...' : 'حذف البيانات الوهمية'}
              </button>
            )}
          </div>
        </motion.div>

        {/* Center Spacer */}
        <div className="flex-1" />
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
                  {showUsersModal === 'active' ? <Activity className="w-5 h-5 text-emerald-400" /> : <Users className="w-5 h-5 text-blue-400" />}
                  {showUsersModal === 'active' ? 'المستخدمون النشطون حالياً' : 'جميع المستخدمين'}
                </h2>
                <button onClick={() => setShowUsersModal(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {points.filter(p => showUsersModal === 'active' ? p.status === 'active' : true).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-bold">لا يوجد مستخدمين لعرضهم</div>
                ) : (
                  points
                    .filter(p => showUsersModal === 'active' ? p.status === 'active' : true)
                    .map(point => (
                    <div 
                      key={point.id} 
                      className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-slate-700/50 cursor-pointer"
                      onClick={() => {
                        setSelectedPoint({ lat: point.lat, lng: point.lng });
                        setShowUsersModal(null);
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
                        <div className="text-xs font-bold text-slate-400 mt-0.5">{point.userRole === 'manager' ? 'مدير' : 'موظف'}</div>
                      </div>
                      <div className="text-left">
                        <div className={`text-[10px] font-black px-2 py-1 rounded-md inline-block mb-1 ${point.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : point.status === 'idle' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                          {point.status === 'active' ? 'نشط' : point.status === 'idle' ? 'خامل' : 'غير متصل'}
                        </div>
                        {point.batteryLevel !== undefined && (
                          <div className={`text-[10px] font-bold ${point.batteryLevel < 20 ? 'text-red-400' : 'text-slate-500'}`}>
                            البطارية {point.batteryLevel}%
                          </div>
                        )}
                        {point.speed !== undefined && (
                          <div className={`text-[10px] font-bold mt-1 ${point.speed > 120 ? 'text-red-400' : 'text-emerald-500'}`} dir="ltr">
                            {point.speed} km/h
                          </div>
                        )}
                      </div>
                    </div>
                  ))
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

    </div>
  );
}
