import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock,
  Filter,
  Trash2,
  Loader2,
  Wallet,
  Briefcase,
  Users,
  Package,
  ArrowRight,
  Check,
  X,
  ShieldAlert,
  Search,
  SlidersHorizontal,
  Sparkles,
  Inbox,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  limit, 
  where,
  deleteDoc,
  doc,
  writeBatch,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { markNotificationAsRead, AppNotification } from '../lib/notifications';
import { motion, AnimatePresence } from 'motion/react';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyRequiresAcknowledge, setOnlyRequiresAcknowledge] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile) return;

    let q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
    
    if (profile.role !== 'manager') {
      q = query(
        collection(db, 'notifications'), 
        where('targetRole', 'in', ['all', profile.role]),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timeStr: doc.data().timestamp?.toDate?.()?.toLocaleString('ar-SA') || 'منذ قليل'
      } as AppNotification & { timeStr: string }));

      setNotifications(docs);
      setLoading(false);
    }, (err) => {
      console.error("Notifications listener error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [profile]);

  // Compute stats based on the fetched notifications
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    const critical = notifications.filter(n => n.priority === 'high' && !n.read).length;
    const ackRequired = notifications.filter(n => n.requiresAcknowledge && (!n.acknowledgedBy || !n.acknowledgedBy.includes(profile?.uid))).length;
    
    return {
      total,
      unread,
      critical,
      ackRequired
    };
  }, [notifications, profile]);

  // Search and Filter computation
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesFilter = filter === 'all' || n.category === filter || n.type === filter;
      const matchesUnread = onlyUnread ? !n.read : true;
      const matchesAck = onlyRequiresAcknowledge ? n.requiresAcknowledge : true;
      
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        (n.title && n.title.toLowerCase().includes(searchLower)) ||
        (n.message && n.message.toLowerCase().includes(searchLower));

      return matchesFilter && matchesUnread && matchesAck && matchesSearch;
    });
  }, [notifications, filter, onlyUnread, onlyRequiresAcknowledge, searchQuery]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('تم حذف الإشعار بنجاح');
    } catch (error) {
      toast.error('فشل حذف الإشعار');
    }
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    try {
      const batch = writeBatch(db);
      const unreadDocs = notifications.filter(n => !n.read);
      if (unreadDocs.length === 0) {
        toast.info('جميع الإشعارات مقروءة بالفعل');
        return;
      }
      unreadDocs.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      toast.success('تم تحديد الكل كمقروء');
    } catch (error) {
      toast.error('فشل في تحديث الحالات');
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.id) return;
    
    if (!notif.read) {
      try {
        await markNotificationAsRead(notif.id);
      } catch (error) {
        console.error("Error marking read:", error);
      }
    }
    
    if (notif.tab) {
      // Dispatch both the tab change and the specific entity if exists
      window.dispatchEvent(new CustomEvent('changeTab', { 
        detail: { 
          tab: notif.tab,
          projectId: notif.projectId,
          employeeId: notif.employeeId,
          id: notif.link // Generic ID field
        } 
      }));
      
      toast.success(`جاري الانتقال إلى: ${notif.title}`, {
        icon: <ArrowRight className="w-4 h-4" />,
        duration: 2000
      });
    }
  };

  const getIcon = (type: string, category: string) => {
    if (category === 'financial') return <Wallet className="w-5 h-5" />;
    if (category === 'project') return <Briefcase className="w-5 h-5" />;
    if (category === 'employee') return <Users className="w-5 h-5" />;
    if (category === 'inventory') return <Package className="w-5 h-5" />;
    
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'error': return <X className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getColor = (type: string, category: string) => {
    if (category === 'financial') return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/40';
    if (category === 'project') return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-450 dark:border-indigo-900/40';
    if (category === 'employee') return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-450 dark:border-blue-900/40';
    if (category === 'inventory') return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-450 dark:border-purple-900/40';

    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/40';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/40';
      case 'error': return 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/40';
      default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/60';
    }
  };

  const categories = [
    { id: 'all', label: 'الكل', count: notifications.length, icon: <Bell className="w-4 h-4" /> },
    { id: 'financial', label: 'المالية', count: notifications.filter(n => n.category === 'financial').length, icon: <Wallet className="w-4 h-4" /> },
    { id: 'project', label: 'المشاريع', count: notifications.filter(n => n.category === 'project').length, icon: <Briefcase className="w-4 h-4" /> },
    { id: 'employee', label: 'الموظفين', count: notifications.filter(n => n.category === 'employee').length, icon: <Users className="w-4 h-4" /> },
    { id: 'inventory', label: 'المخزون', count: notifications.filter(n => n.category === 'inventory').length, icon: <Package className="w-4 h-4" /> },
    { id: 'system', label: 'النظام', count: notifications.filter(n => n.category === 'system' || n.type === 'system').length, icon: <SlidersHorizontal className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-2 font-sans text-right" dir="rtl">
      
      {/* Premium Elegant Header */}
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-zinc-800/80 bg-gradient-to-tr from-slate-50/90 via-white to-slate-50/50 dark:from-zinc-950/80 dark:via-zinc-900 dark:to-zinc-950/50 p-6 md:p-8 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.30)] mb-8">
        <div className="absolute top-0 right-0 -mr-6 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse -z-10" />
        <div className="absolute bottom-0 left-0 -ml-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center">
                <Bell className="w-6 h-6 animate-swing" />
              </span>
              <Badge className="bg-primary/15 text-primary dark:bg-primary/25 border-none font-black text-[10px] px-2 py-0.5">
                تحديث فوري نشط
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">مركز التنبيهات المطور</h1>
            <p className="text-xs md:text-sm text-slate-505 dark:text-zinc-400 font-medium">
              متابعة الأنشطة المالية، المشتريات، الموافقات، وتأكيدات استلام المندوبين والمشرفين
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="h-10 px-4 rounded-xl border-slate-200 dark:border-zinc-800 font-bold text-xs gap-1.5 transition-all text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500" />
              تحديد المقروء
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/60 dark:border-zinc-800/60">
          <Card className="rounded-2xl border border-slate-100 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/40 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-300 dark:bg-zinc-700" />
            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500">مجموع الإشعارات</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-slate-800 dark:text-zinc-100">{stats.total}</span>
              <span className="text-[10px] font-bold text-slate-400">إشعار</span>
            </div>
          </Card>

          <Card className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/10 dark:bg-rose-950/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500/80" />
            <span className="text-[10px] font-black text-rose-500 dark:text-rose-400">غير المقروءة حالياً</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-350">{stats.unread}</span>
              <span className="text-[10px] font-bold text-rose-400">جديد</span>
            </div>
          </Card>

          <Card className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">عاجلة وعالية الأهمية</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-350">{stats.critical}</span>
              <span className="text-[10px] font-bold text-amber-450">مهمة</span>
            </div>
          </Card>

          <Card className="rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/10 dark:bg-indigo-950/10 p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500" />
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">بحاجة لتأكيد استلام</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-350">{stats.ackRequired}</span>
              <span className="text-[10px] font-bold text-indigo-400">طلبات</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Double Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Right Sidebar: Dynamic Filters and Search (RTL right-aligned) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          
          {/* Card 1: Search & Toggles */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md p-6 shadow-sm overflow-hidden">
            <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              أدوات البحث والفرز
            </h3>
            
            {/* Search input to filter items in real time */}
            <div className="relative mb-5">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="ابحث في محتوى التنبيهات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pr-10 pl-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 font-bold text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-850"
                >
                  <X className="w-3 h-3 text-slate-450" />
                </button>
              )}
            </div>

            {/* Strict status toggles */}
            <div className="space-y-3 pt-2">
              <label 
                className={`flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none transition-all ${
                  onlyUnread ? 'bg-rose-50/40 border-rose-200/50 dark:bg-rose-950/10' : 'bg-white/40 hover:bg-slate-50'
                }`}
                onClick={() => setOnlyUnread(!onlyUnread)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${onlyUnread ? 'bg-rose-500 animate-pulse' : 'bg-slate-350'}`} />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">غير المقروءة فقط</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={onlyUnread}
                  onChange={() => {}} // Controlled via parent click
                  className="sr-only" 
                />
                <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${onlyUnread ? 'bg-rose-500' : 'bg-slate-200 dark:bg-zinc-800'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${onlyUnread ? '-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>

              <label 
                className={`flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 cursor-pointer select-none transition-all ${
                  onlyRequiresAcknowledge ? 'bg-indigo-50/40 border-indigo-200/50 dark:bg-indigo-950/10' : 'bg-white/40 hover:bg-slate-50'
                }`}
                onClick={() => setOnlyRequiresAcknowledge(!onlyRequiresAcknowledge)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${onlyRequiresAcknowledge ? 'bg-indigo-500 animate-pulse' : 'bg-slate-350'}`} />
                  <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">تتطلب تأكيد استلام</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={onlyRequiresAcknowledge}
                  onChange={() => {}} // Controlled via parent click
                  className="sr-only" 
                />
                <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${onlyRequiresAcknowledge ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-zinc-800'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${onlyRequiresAcknowledge ? '-translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>
          </Card>

          {/* Card 2: Filter Categories Lists */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              الأقسام والتصنيفات
            </h3>
            
            <div className="flex flex-col gap-1.5">
              {categories.map((cat) => {
                const isActive = filter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilter(cat.id)}
                    className={`w-full py-2.5 px-3.5 rounded-xl transition-all flex items-center justify-between text-right font-bold text-xs ${
                      isActive 
                        ? 'bg-primary text-white shadow-md shadow-primary/20 ring-2 ring-primary/10' 
                        : 'bg-white/10 dark:bg-zinc-900/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 border border-slate-100/60 dark:border-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`${isActive ? 'text-white scale-110' : 'text-primary/70 dark:text-primary'} transition-transform`}>
                        {cat.icon}
                      </span>
                      <span>{cat.label}</span>
                    </div>
                    {cat.count > 0 ? (
                      <Badge className={`rounded-xl border-none text-[9px] font-black h-5 min-w-5 flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-650 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                        {cat.count}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">0</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Left Column: Notifications Feed Feed (70%) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-550 dark:text-zinc-400">
                تم العثور على <span className="font-black text-slate-900 dark:text-zinc-100">{filteredNotifications.length}</span> إشعار مطابق للتصفية
              </span>
            </div>
            
            {(searchQuery || filter !== 'all' || onlyUnread || onlyRequiresAcknowledge) && (
              <button 
                onClick={() => {
                  setFilter('all');
                  setOnlyUnread(false);
                  setOnlyRequiresAcknowledge(false);
                  setSearchQuery('');
                }}
                className="text-[11px] font-black text-primary hover:underline"
              >
                إعادة ضبط عناصر التصفية
              </button>
            )}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-white/75 dark:bg-zinc-900/60 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-zinc-800 shadow-inner">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-slate-500 dark:text-zinc-450 font-bold text-center">جاري استيراد وتحديث شريط الإشعارات من السحابة في الوقت الفعلي...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                  >
                    <Card 
                      className={`group relative hover:shadow-xl dark:hover:shadow-black/40 transition-all duration-300 border shadow-sm rounded-2xl overflow-hidden ${
                        !notif.read 
                          ? 'border-r-4 border-r-primary bg-primary/[0.02] dark:bg-primary/[0.03] border-slate-200/90 dark:border-zinc-800' 
                          : 'bg-white/90 dark:bg-zinc-900/80 opacity-85 hover:opacity-100 border-slate-200/80 dark:border-zinc-800/80'
                      }`}
                    >
                      <CardContent className="p-0">
                        <div className="p-5 flex flex-col md:flex-row items-stretch gap-4">
                          
                          {/* Icon Container with Gradient Pin Accent */}
                          <div className="flex items-start md:items-center">
                            <div className={`p-3.5 rounded-2xl border shrink-0 flex items-center justify-center ${getColor(notif.type, notif.category)}`}>
                              {getIcon(notif.type, notif.category)}
                            </div>
                          </div>
                          
                          {/* Content Middle Section */}
                          <div className="flex-1 space-y-2 min-w-0 flex flex-col justify-between">
                            
                            {/* Title & Metadata row */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className={`text-[14px] md:text-[15px] font-black truncate leading-normal ${notif.read ? 'text-slate-550 dark:text-zinc-400' : 'text-slate-900 dark:text-zinc-50'}`}>
                                  {notif.title}
                                </h3>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" title="غير مقروء" />
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 bg-slate-50 dark:bg-zinc-950 px-2 py-1 rounded-xl border border-slate-100/50 dark:border-zinc-800/50 text-[10px] text-slate-500 dark:text-zinc-400">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{notif.timeStr}</span>
                              </div>
                            </div>
                            
                            {/* Body Text message with nice dark readability */}
                            <p className="text-[12.5px] text-slate-650 dark:text-zinc-300 leading-relaxed font-semibold pr-0.5">
                              {notif.message}
                            </p>

                            {/* Responsive Acknowledgment Interface */}
                            {notif.requiresAcknowledge && (
                              <div className="mt-2.5 p-3.5 bg-slate-50/50 dark:bg-zinc-950/40 rounded-xl border border-slate-100/60 dark:border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse shrink-0" />
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 block uppercase tracking-wider">الحاضرين والمستلمين:</span>
                                    <div className="flex items-center gap-2">
                                      <div className="flex -space-x-1.5 overflow-hidden">
                                        {notif.acknowledgedBy && notif.acknowledgedBy.length > 0 ? (
                                          notif.acknowledgedBy.map((uid: string) => (
                                            <div key={uid} className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-sm" title="تم التأكيد">
                                              <Check className="w-2.5 h-2.5 text-white" />
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-[10px] font-bold text-red-500/80 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded italic">لم يتم الاعتماد بعد</span>
                                        )}
                                      </div>
                                      {notif.acknowledgedBy && notif.acknowledgedBy.length > 0 && (
                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">تم الاستلام من قبل ({notif.acknowledgedBy.length})</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(!notif.acknowledgedBy || !notif.acknowledgedBy.includes(profile?.uid)) && (
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-xl gap-1 px-4 shadow-lg shadow-emerald-950/10 transition-all hover:scale-[1.02]"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await updateDoc(doc(db, 'notifications', notif.id), {
                                          acknowledgedBy: arrayUnion(profile?.uid),
                                          acknowledgedAt: serverTimestamp()
                                        });
                                        toast.success('تم تسجيل استلامك للمذكرة بنجاح');
                                      } catch (error) {
                                        toast.error('عذراً، فشل تسجيل الاستلام');
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    تأكيد استلام وقراءة الرسالة
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Badge Categories Row & Quick Action elements */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 mt-1 border-t border-slate-100/40 dark:border-zinc-800/20">
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-[9px] font-black tracking-wider border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-0.5">
                                  {notif.category === 'financial' ? 'قسم المالية' : 
                                   notif.category === 'employee' ? 'شؤون الموظفين' : 
                                   notif.category === 'purchase' ? 'المشتريات والطلبات' : 
                                   notif.category === 'project' ? 'إدارة المشاريع' : 
                                   notif.category === 'inventory' ? 'المخازن والمستودع' : 'إشعار النظام'}
                                </Badge>
                                
                                {notif.priority === 'high' && (
                                  <Badge className="bg-red-500 hover:bg-red-600 text-white border-none text-[9px] font-black flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 animate-pulse" />
                                    عاجل وهام
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {notif.tab && (
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-8 px-3 rounded-lg text-[11px] font-black gap-1 bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 text-primary dark:text-primary-foreground select-none"
                                    onClick={() => handleNotificationClick(notif)}
                                  >
                                    <span>{notif.type === 'approval' ? 'مراجعة واعتماد الآن' : 'انتقال للبيانات'}</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Button>
                                )}
                                
                                {/* Quick Mark read button for desktop ease */}
                                {!notif.read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 shrink-0"
                                    onClick={() => markNotificationAsRead(notif.id)}
                                    title="تحديد كمقروء"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* Managers can sweep and delete alerts to prevent screen garbage */}
                                {profile?.role === 'manager' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(notif.id);
                                    }}
                                    title="حذف نهائي"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              // Enhanced premium empty experience state
              <div className="text-center py-24 bg-white/70 dark:bg-zinc-900/60 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-zinc-800 shadow-sm px-6">
                <div className="w-24 h-24 bg-gradient-to-tr from-slate-50 to-indigo-50 dark:from-zinc-950 dark:to-zinc-900 text-slate-350 dark:text-zinc-550 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100 dark:border-zinc-800">
                  <Inbox className="w-10 h-10 text-primary opacity-60" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-zinc-150">لا توجد تنبيهات مطابقة</h3>
                <p className="text-slate-450 dark:text-zinc-450 font-semibold text-xs mt-2 max-w-sm mx-auto">
                  حسابك نظيف ومحدث بالكامل! لقد قمت بقراءة أو فرز جميع الإشعارات الصادرة عن النظام حالياً.
                </p>
                {(filter !== 'all' || onlyUnread || onlyRequiresAcknowledge || searchQuery) && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilter('all');
                      setOnlyUnread(false);
                      setOnlyRequiresAcknowledge(false);
                      setSearchQuery('');
                    }}
                    className="mt-6 font-bold text-xs h-10 px-5 rounded-xl border-slate-200/80 hover:bg-slate-50 transition-all text-slate-800 dark:text-zinc-200 dark:border-zinc-800"
                  >
                    عرض كافة الإشعارات الفعالة
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
