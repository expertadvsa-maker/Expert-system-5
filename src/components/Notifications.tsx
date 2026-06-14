import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
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
    
    if (profile.role !== 'manager' && profile.role !== 'owner') {
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
        timeStr: doc.data().timestamp?.toDate?.()?.toLocaleString('ar-SA', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) || 'منذ قليل'
      } as AppNotification & { timeStr: string }));

      setNotifications(docs);
      setLoading(false);
    }, (err) => {
      console.error("Notifications listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  // Compute stats based on the fetched notifications
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;
    return { total, unread };
  }, [notifications]);

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
      window.dispatchEvent(new CustomEvent('changeTab', { 
        detail: { 
          tab: notif.tab,
          projectId: notif.projectId,
          employeeId: notif.employeeId,
          id: notif.link
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
    if (category === 'financial') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
    if (category === 'project') return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400';
    if (category === 'employee') return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
    if (category === 'inventory') return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';

    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      case 'warning': return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
      case 'error': return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const categories = [
    { id: 'all', label: 'الكل', count: notifications.length },
    { id: 'financial', label: 'المالية', count: notifications.filter(n => n.category === 'financial').length },
    { id: 'project', label: 'المشاريع', count: notifications.filter(n => n.category === 'project').length },
    { id: 'employee', label: 'الموظفين', count: notifications.filter(n => n.category === 'employee').length },
    { id: 'inventory', label: 'المخزون', count: notifications.filter(n => n.category === 'inventory').length },
    { id: 'system', label: 'النظام', count: notifications.filter(n => n.category === 'system' || n.type === 'system').length },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 md:py-10 font-sans text-right" dir="rtl">
      
      {/* Sleek Minimal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-50 tracking-tight flex items-center gap-3">
            مركز الإشعارات
            {stats.unread > 0 && (
              <Badge className="bg-rose-500 hover:bg-rose-600 text-white border-none font-black text-xs px-2.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-500/20">
                {stats.unread} جديد
              </Badge>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium mt-2">
            متابعة الأحداث والطلبات والتنبيهات الموجهة لك بشكل فوري.
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={handleMarkAllRead}
          className="h-10 rounded-xl border-slate-200 dark:border-zinc-800 font-bold text-xs gap-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 shadow-sm"
        >
          <CheckCheck className="w-4 h-4 text-emerald-500" />
          تحديد الكل كمقروء
        </Button>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-800/60 rounded-2xl p-2 mb-6 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between sticky top-4 z-20">
        
        {/* Horizontal Scrollable Categories */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:w-auto px-1 py-1">
          {categories.map((cat) => {
            const isActive = filter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {cat.label}
                {cat.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'}`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="w-px h-8 bg-slate-200 dark:bg-zinc-800 hidden sm:block mx-1" />

        {/* Action Toggles & Search */}
        <div className="flex items-center gap-2 w-full sm:w-auto px-1">
          {/* Unread Toggle */}
          <button 
            onClick={() => setOnlyUnread(!onlyUnread)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors border ${
              onlyUnread 
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' 
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="غير المقروءة فقط"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Requires Ack Toggle */}
          <button 
            onClick={() => setOnlyRequiresAcknowledge(!onlyRequiresAcknowledge)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors border ${
              onlyRequiresAcknowledge 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400' 
                : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="تتطلب تأكيد استلام"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Search */}
          <div className="relative flex-1 sm:w-48 transition-all focus-within:sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-slate-100/50 dark:bg-zinc-900/50 border border-slate-200/50 dark:border-zinc-800/50 font-semibold text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm">جاري التحديث...</p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
              >
                <div 
                  className={`group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    !notif.read 
                      ? 'bg-white dark:bg-zinc-900 border-primary/20 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] dark:shadow-none dark:border-primary/30 ring-1 ring-primary/5' 
                      : 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200/60 dark:border-zinc-800/60 hover:bg-white dark:hover:bg-zinc-900 shadow-sm'
                  }`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Unread Indicator Line */}
                  {!notif.read && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                  )}

                  {/* Icon */}
                  <div className={`p-3 rounded-2xl shrink-0 flex items-center justify-center ${getColor(notif.type, notif.category)}`}>
                    {getIcon(notif.type, notif.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-black truncate ${!notif.read ? 'text-slate-900 dark:text-zinc-50' : 'text-slate-700 dark:text-zinc-300'}`}>
                        {notif.title}
                      </h3>
                      {notif.priority === 'high' && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-[9px] border-none font-black">
                          عاجل
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-450 leading-relaxed font-semibold line-clamp-2 md:line-clamp-1">
                      {notif.message}
                    </p>

                    {/* Inline Acknowledgment Box */}
                    {notif.requiresAcknowledge && (
                      <div className="mt-3 inline-flex flex-wrap items-center gap-3 p-2 bg-slate-100/50 dark:bg-zinc-950/50 rounded-xl border border-slate-200/50 dark:border-zinc-800/50" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 px-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">حالة الاستلام:</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {notif.acknowledgedBy && notif.acknowledgedBy.length > 0 ? (
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              تم الاعتماد من {notif.acknowledgedBy.length} مستخدمين
                            </div>
                          ) : (
                            <div className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg">
                              بانتظار التأكيد
                            </div>
                          )}
                        </div>

                        {(!notif.acknowledgedBy || !notif.acknowledgedBy.includes(profile?.uid)) && (
                          <Button 
                            size="sm" 
                            className="h-7 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5 px-3 ml-auto transition-transform hover:scale-105 active:scale-95"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await updateDoc(doc(db, 'notifications', notif.id), {
                                  acknowledgedBy: arrayUnion(profile?.uid),
                                  acknowledgedAt: serverTimestamp()
                                });
                                toast.success('تم التأكيد بنجاح');
                              } catch (error) {
                                toast.error('فشل التأكيد');
                              }
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            تأكيد الإستلام
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Trailing Actions & Time */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pl-2">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.timeStr}
                    </span>
                    
                    <div className="flex items-center gap-1 sm:mt-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notif.id); }}
                          title="تحديد كمقروء"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {(profile?.role === 'manager' || profile?.role === 'owner') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                          title="حذف الإشعار"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
            <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-zinc-100">لا توجد إشعارات</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 font-semibold mt-1 max-w-sm">
              لا توجد عناصر مطابقة لبحثك أو الفلاتر المحددة حالياً. حسابك منظم ومحدث بالكامل!
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
                className="mt-6 rounded-xl text-xs font-bold"
              >
                إعادة ضبط الفلاتر
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
