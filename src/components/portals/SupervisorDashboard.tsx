import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../../lib/AuthContext';
import { 
  Briefcase, 
  Package, 
  UsersRound, 
  Image as ImageIcon, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  StickyNote,
  Palette,
  LayoutGrid,
  Trash2,
  Pin,
  Plus,
  X,
  Clock,
  LogIn,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import SmartAttendance from '../SmartAttendance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LiveMap from '../GeoSystem/LiveMap';

export default function SupervisorDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, activeCompanyId } = useAuth();
  const [projectsCount, setProjectsCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingStagesCount, setPendingStagesCount] = useState(0);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);

  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // New features state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [trackingPoints, setTrackingPoints] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictTask, setConflictTask] = useState<any>(null); // للتعامل مع التعارض

  // التحقق من صلاحية الإدارة للأساسيات الاستثنائية
  const isManager = profile?.role === 'manager' || profile?.email?.toLowerCase() === 'expertadvsa@gmail.com';

  useEffect(() => {
    // Listen for projects and filter accurately
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const filtered = list.filter(p => p.status !== 'cancelled' && p.status !== 'deleted' && p.status !== 'archived');
      setProjectsCount(filtered.length);
      setActiveProjects(filtered.slice(0, 4));
      
      // Calculate pending/in-progress stages count
      let stagesCount = 0;
      filtered.forEach(p => {
        if (p.stages) {
          stagesCount += p.stages.filter((s: any) => s.status === 'pending' || s.status === 'in-progress').length;
        }
      });
      setPendingStagesCount(stagesCount);
    });

    // Listen for team members (employees)
    const teamQ = activeCompanyId ? query(collection(db, 'users'), where('companyId', '==', activeCompanyId)) : collection(db, 'users');
    const unsubTeam = onSnapshot(teamQ, (snap) => {
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // تصفية الموظفين فقط واستبعاد الإدارة والمشرفين
      const workers = users.filter(u => 
        u.role !== 'manager' && 
        u.role !== 'supervisor' && 
        u.role !== 'sales_rep' && 
        u.email !== 'expertadvsa@gmail.com' &&
        u.department !== 'الإدارة'
      );
      setTeamCount(workers.length);
      setTeamMembers(workers);
    });

    // Listen for tracking points
    const unsubTracking = onSnapshot(collection(db, 'tracking_points'), (snap) => {
      const activePts = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setTrackingPoints(activePts);
    });

    // Listen for today's attendance
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), where('date', '==', todayStr)), (snap) => {
      setTodayAttendanceCount(snap.size);
    });

    // Listen for low stock in inventory
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snap) => {
      let low = 0;
      const lowItemsList: any[] = [];
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.quantity <= (data.reorderLevel || 5)) {
          low++;
          lowItemsList.push({ id: d.id, ...data });
        }
      });
      setLowStockCount(low);
      setLowStockItems(lowItemsList.slice(0, 4));
    });

    return () => {
      unsubProjects();
      unsubTeam();
      unsubAttendance();
      unsubInv();
      unsubTracking();
    };
  }, []);

  const handleCreateTask = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) {
      toast.error('الرجاء إدخال عنوان المهمة واختيار الموظف');
      return;
    }
    setIsSubmitting(true);
    try {
      // التحقق من التعارض: هل الموظف مشغول بمهمة أخرى حالياً؟
      if (!force) {
        const activeTasksQ = query(
          collection(db, 'tasks'), 
          where('assignedTo', '==', newTask.assignedTo),
          where('status', 'in', ['pending', 'in-progress'])
        );
        const activeTasksSnap = await getDocs(activeTasksQ);
        
        if (!activeTasksSnap.empty) {
          const busyTask = activeTasksSnap.docs[0].data();
          setConflictTask(busyTask); // حفظ بيانات المهمة المتعارضة وعرضها في الواجهة
          setIsSubmitting(false);
          return;
        }
      }

      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        createdBy: profile?.uid || 'supervisor',
        createdByDetails: { name: profile?.name || 'مشرف' },
        status: 'pending',
        isForceAssigned: force,
        createdAt: serverTimestamp()
      });
      toast.success(force ? 'تم الإسناد الإجباري بنجاح ⚡' : 'تم إسناد المهمة بنجاح 📋');
      setIsTaskModalOpen(false);
      setNewTask({ title: '', description: '', assignedTo: '' });
      setConflictTask(null);
    } catch (err) {
      toast.error('حدث خطأ أثناء الإرسال');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-20 animate-in fade-in duration-500 relative" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Modern Operational Header Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/15">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">بوابة المشرف الميداني</h1>
            <p className="text-xs text-slate-500 font-bold mt-1">مرحباً {profile?.name} | جاهز لمتابعة المشروعات والإنتاج اليوم؟</p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <div className="text-left md:text-right">
            <p className="text-[10px] text-slate-400 font-black uppercase">التوقيت الحالي</p>
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <Button 
            onClick={() => setIsNotesOpen(true)}
            variant="outline"
            className="rounded-2xl gap-2 font-black h-11 px-4 border-amber-200 hover:border-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-slate-800 dark:border-slate-700 text-amber-600 dark:text-amber-400 shrink-0 text-xs shadow-sm"
          >
            <StickyNote className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
            الملاحظات اللاصقة
          </Button>
        </div>
      </motion.div>

      {/* ══ ATTENDANCE VIEW ══ */}
      <SmartAttendance />

      {/* Operations Quick Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ActionBtn 
          icon={Briefcase} 
          label="إدارة المشاريع الميدانية" 
          color="bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/10" 
          onClick={() => onNavigate?.('projects')} 
        />
        <ActionBtn 
          icon={UsersRound} 
          label="متابعة فريق العمل والإنتاج" 
          color="bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-md shadow-purple-500/10" 
          onClick={() => onNavigate?.('employees')} 
        />
        <ActionBtn 
          icon={StickyNote} 
          label="إسناد مهمة جديدة" 
          color="bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/10" 
          onClick={() => setIsTaskModalOpen(true)} 
        />
        <ActionBtn 
          icon={Package} 
          label="العهد والمستودعات" 
          color="bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/10" 
          onClick={() => onNavigate?.('inventory')} 
        />
        <ActionBtn 
          icon={Clock} 
          label="سجلات الحضور اليومية" 
          color="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/10" 
          onClick={() => onNavigate?.('employees')} 
        />
      </div>

      {/* Operational KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardCard 
          title="المشروعات النشطة" 
          value={`${projectsCount} مشاريع`} 
          subtitle="متابعة سير عمل مشروعاتك" 
          icon={Briefcase} 
          color="from-blue-500 to-indigo-600 font-black" 
          onClick={() => onNavigate?.('projects')} 
        />
        <DashboardCard 
          title="المراحل تحت التنفيذ" 
          value={`${pendingStagesCount} مراحل`} 
          subtitle="تتطلب متابعة وتوثيق" 
          icon={CheckCircle2} 
          color="from-purple-500 to-indigo-600 font-black" 
          onClick={() => onNavigate?.('projects')} 
        />
        <DashboardCard 
          title="الحضور الميداني اليوم" 
          value={`${todayAttendanceCount} حاضرين`} 
          subtitle="فريق العمل المسجل اليوم" 
          icon={Clock} 
          color="from-emerald-500 to-teal-600 font-black" 
          onClick={() => onNavigate?.('employees')} 
        />
        <DashboardCard 
          title="حالة النواقص والمواد" 
          value={lowStockCount > 0 ? `${lowStockCount} عجز بالمواد` : "مستقر"} 
          subtitle="مراقبة عجز المواد والمستودع" 
          icon={Package} 
          color={lowStockCount > 0 ? "from-rose-500 to-red-600 font-black" : "from-orange-500 to-amber-600 font-black"} 
          onClick={() => onNavigate?.('inventory')} 
        />
      </div>

      {/* Main Dual Panels Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Right Panel: Projects Workflow & Next Milestones (Span 2) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                مراقبة تقدم المشروعات الميدانية
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">عرض لحظي لسير الأعمال الإنشائية والميدانية</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate?.('projects')} className="h-8 rounded-xl px-3 font-bold text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              عرض الكل
            </Button>
          </div>

          <div className="space-y-4">
            {activeProjects.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic text-xs font-bold">لا يوجد مشاريع ميدانية نشطة حالياً</div>
            ) : (
              activeProjects.map((proj) => {
                // Calculate completion percentage
                const stages = proj.stages || [];
                const completed = stages.filter((s: any) => s.status === 'completed').length;
                const total = stages.length;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                // Next active milestone
                const activeMilestone = stages.find((s: any) => s.status === 'pending' || s.status === 'in-progress');

                return (
                  <div key={proj.id} className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{proj.title}</span>
                        <Badge className="bg-indigo-50 text-indigo-700 border-none text-[9px] font-black">{proj.type || 'إنشاءات عمومية'}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                        <span>الموقع الميداني: {proj.clientName || 'موقع العميل'}</span>
                        <span>•</span>
                        <span className="text-indigo-600">المرحلة القادمة: {activeMilestone?.title || 'غير محددة'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full sm:w-48 shrink-0">
                      <div className="flex items-center justify-between text-[10px] font-black">
                        <span className="text-slate-500">معدل الإنجاز العام</span>
                        <span className="text-indigo-600 font-mono">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Left Panel: Material Shortages & Warehouse Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                تنبيهات عجز المواد
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">المواد التي تتطلب إعادة توريد عاجلة للمواقع</p>
            </div>
            <Button variant="ghost" onClick={() => onNavigate?.('inventory')} className="h-8 rounded-xl px-3 font-bold text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50">
              المستودع
            </Button>
          </div>

          <div className="space-y-4">
            {lowStockItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-400 opacity-60" />
                <p className="text-xs font-black">المستودعات والمواد مستقرة بالكامل</p>
              </div>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="p-3.5 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 block">{item.name}</span>
                    <span className="text-[9px] text-slate-500 font-bold block">المستودع: {item.warehouseName || 'الرئيسي'}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-xs font-black text-rose-600 font-mono block">{item.quantity} {item.unit || 'وحدة'}</span>
                    <span className="text-[8px] text-rose-400 font-bold block">الحد الآمن: {item.reorderLevel || 5}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Third Panel: Mini Radar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm flex flex-col gap-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                الرادار الميداني المصغر
              </h3>
              <p className="text-[10px] text-slate-500 font-bold mt-1">تتبع نشاط المواقع الجغرافية للموظفين</p>
            </div>
          </div>
          
          <div className="flex-1 w-full h-[250px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {trackingPoints.length > 0 ? (
              <LiveMap 
                zones={[]} 
                points={trackingPoints} 
                zoom={11} 
                mapTheme="dark" 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">
                <MapPin className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs font-bold">لا يوجد اتصال GPS نشط حالياً</span>
              </div>
            )}
          </div>
        </motion.div>

      </div>

      {/* Dialog for New Task */}
      <Dialog open={isTaskModalOpen} onOpenChange={(open) => {
        setIsTaskModalOpen(open);
        if (!open) setConflictTask(null);
      }}>
        <DialogContent className="max-w-md p-6 rounded-3xl" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-rose-500" /> إسناد مهمة ميدانية جديدة
            </DialogTitle>
          </DialogHeader>

          {conflictTask ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm">الموظف مشغول حالياً!</h4>
                  <p className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80 mt-1 leading-relaxed">
                    هذا الموظف ينفذ حالياً مهمة: <span className="font-black">"{conflictTask.title}"</span> مسندة من قبل <span className="font-black">({conflictTask.createdByDetails?.name || 'الإدارة'})</span>.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1 font-bold text-xs border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setConflictTask(null)}>
                  تغيير الموظف
                </Button>
                {isManager && (
                  <Button disabled={isSubmitting} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-500/20" onClick={() => handleCreateTask(undefined, true)}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إسناد إجباري ⚡'}
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <form onSubmit={e => handleCreateTask(e, false)} className="space-y-4 mt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">عنوان المهمة</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: فحص جودة استلام الخرسانة"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">الموظف المسؤول</label>
                <select
                  required
                  value={newTask.assignedTo}
                  onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                  className="w-full text-xs font-black p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                >
                  <option value="" disabled>اختر الموظف الميداني...</option>
                  {teamMembers.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.email}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">تفاصيل المهمة والملاحظات</label>
                <textarea 
                  required
                  placeholder="أكتب تفاصيل المهمة بوضوح..."
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent min-h-[80px]"
                />
              </div>
              <div className="flex gap-2 justify-end pt-3">
                <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)} className="font-bold text-xs">إلغاء</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-6 rounded-xl">إسناد المهمة</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <StickyNotesBoard isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
}

/* Action Button Component matching the Manager's structure */
function ActionBtn({ icon: Icon, label, onClick, color }: {
  icon: React.ElementType; label: string; onClick: () => void; color: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-black
        text-xs text-center transition-all min-h-[92px] ${color}`}
    >
      <div className="p-2 bg-white/15 rounded-xl shrink-0">
        <Icon className="w-5 h-5 text-current" />
      </div>
      <span className="leading-tight">{label}</span>
    </motion.button>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  onClick?: () => void;
}

function DashboardCard({ title, value, subtitle, icon: Icon, color, onClick }: DashboardCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-3xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/40 dark:shadow-none bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden group cursor-pointer transition-all duration-300"
    >
      <CardContent className="p-6 flex flex-col justify-between h-full relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-all duration-300" />
        
        <div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1.5">{value}</h3>
          <p className="font-bold text-slate-500 dark:text-slate-400 text-xs">{title}</p>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 font-black flex items-center gap-1 group-hover:text-primary transition-colors border-t border-slate-100/50 dark:border-slate-800/50 pt-3">
          {subtitle} 
          <ChevronLeft className="w-3.5 h-3.5 mr-auto group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </motion.div>
  );
}

/* Synchronized Sticky Notes Board Drawer Component */
function StickyNotesBoard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('smart_sticky_notes_v2');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  const saveNotes = (newNotes: any[]) => {
    setNotes(newNotes);
    localStorage.setItem('smart_sticky_notes_v2', JSON.stringify(newNotes));
    window.dispatchEvent(new Event('sticky-notes-updated'));
  };

  const addNote = () => {
    saveNotes([{ id: Date.now().toString(), content: '', color: 'amber', createdAt: Date.now(), alertHours: 0 }, ...notes]);
  };

  const updateNote = (id: string, updates: any) => {
    saveNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  const colors = [
    { id: 'amber', bg: 'bg-amber-100 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100', head: 'text-amber-800' },
    { id: 'rose', bg: 'bg-rose-100 dark:bg-rose-950/60', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-100', head: 'text-rose-800' },
    { id: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-100', head: 'text-emerald-800' },
    { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100', head: 'text-blue-800' },
    { id: 'violet', bg: 'bg-violet-100 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-900 dark:text-violet-100', head: 'text-violet-800' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[300]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full sm:w-[450px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[310] flex flex-col"
            dir="rtl"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-amber-500 animate-bounce" /> الملاحظات اللاصقة
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">تزامن حقيقي وتلقائي مع كافة البوابات</p>
              </div>
              <div className="flex gap-2">
                <button onClick={addNote} className="h-9 px-3 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-600 transition font-black text-xs flex items-center gap-1">
                  <Plus className="w-4 h-4" /> ملصق جديد
                </button>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notes.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                  <StickyNote className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">لا توجد ملاحظات حالياً</p>
                </div>
              )}
              
              <Reorder.Group axis="y" values={notes} onReorder={saveNotes} className="space-y-4">
                {notes.map(note => {
                  const scheme = colors.find(c => c.id === note.color) || colors[0];
                  const isPinned = !!note.isPinned;

                  return (
                    <Reorder.Item 
                      key={note.id} 
                      value={note}
                      className={`rounded-2xl p-4 flex flex-col shadow-sm border ${scheme.bg} ${scheme.border} relative group cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {colors.map(c => (
                            <button 
                              key={c.id} 
                              onPointerDown={(e) => e.stopPropagation()} 
                              onClick={() => updateNote(note.id, { color: c.id })} 
                              className={`w-4 h-4 rounded-full border ${c.bg} ${note.color === c.id ? 'border-slate-800 dark:border-white' : 'border-transparent'}`} 
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => updateNote(note.id, { isPinned: !isPinned })} 
                            className={`p-1.5 rounded-lg transition ${isPinned ? 'text-rose-600 bg-rose-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={note.content}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => updateNote(note.id, { content: e.target.value })}
                        placeholder="اكتب ملاحظة لاصقة جديدة..."
                        className={`w-full bg-transparent border-none outline-none text-xs font-bold leading-relaxed ${scheme.text} resize-none min-h-[70px]`}
                      />
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

