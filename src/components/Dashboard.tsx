import * as React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Users, Wallet, Bell, ShoppingBag, ShoppingCart,
  AlertTriangle, CheckCircle, FileText, Clock, Zap,
  Briefcase, Scan, HardHat, Loader2, X, TrendingUp,
  TrendingDown, Building2, ChevronLeft, ArrowLeft,
  Package, BarChart2, Banknote, UserCheck, Star, Receipt,
  Plus, Calendar, Flame, ListTodo, Search, ThumbsUp, AlertCircle, Volume2, Pause, VolumeX
} from 'lucide-react';
import {
  collection, query, limit, onSnapshot, orderBy, where, getDocs, doc, addDoc, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCompanyQuery } from '../lib/firestoreUtils';
import { useAuth } from '../lib/AuthContext';
import { sendNotification } from '../lib/notifications';
import { AnimatePresence, motion } from 'motion/react';
import {
  AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
import SmartAttendance from './SmartAttendance';
import { analyzeProjectSpending } from '../lib/gemini';

/* ─── Types ─── */
interface DashboardStats {
  income: number;
  expenses: number;
  purchases: number;
  employeesCount: number;
  pendingInvoices: number;
  workerExpense: number;
  activeWorkers: number;
  activeProjects: number;
}
interface AlertItem {
  id: string; text: string; type: 'amber' | 'red' | 'blue'; icon: React.ElementType; tab: string;
}
interface BriefingItem {
  id: string; text: string; done: boolean; icon: React.ElementType;
}

/* ─── Helpers ─── */
function fmtNum(n: number): string {
  // Show full number with commas, no abbreviations
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
function fmtDate(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء النور';
  return 'مساء الخير';
}
function todayAr() {
  return new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ─── CircleRing ─── */
function CircleRing({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

/* ─── StatCard ─── */
function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg, onClick, alert, ring }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
  onClick?: () => void; alert?: boolean;
  ring?: {
    displayPct: number;   // visual ring fill 0–100 (capped)
    realPct: number;      // actual real percentage shown in text
    color: string;
    label?: string;       // short subtitle under value
    tooltip?: string;     // full explanation shown on hover
  };
}) {
  const [showTip, setShowTip] = React.useState(false);
  return (
    <button
      onClick={onClick}
      className={`w-full text-right bg-white rounded-xl border p-4 flex flex-col gap-2
        hover:shadow-md transition-all active:scale-[0.97] relative overflow-visible
        ${alert ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}
    >
      {/* Top row: icon + ring */}
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {ring ? (
          <div
            className="relative cursor-help"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
          >
            {/* Ring SVG – rotated via inline style so % label stays upright */}
            <CircleRing pct={ring.displayPct} color={ring.color} size={64} />
            {/* % label – no rotation, sits over the SVG */}
            <span
              className="absolute inset-0 flex items-center justify-center text-[11px] font-black pointer-events-none"
              style={{ color: ring.color }}
            >
              {Math.round(ring.realPct)}%
            </span>
            {/* Tooltip */}
            {showTip && ring.tooltip && (
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-48 bg-slate-900 text-white text-[10px] font-semibold rounded-xl px-3 py-2.5 shadow-2xl leading-relaxed text-center pointer-events-none"
                dir="rtl"
              >
                <p className="font-black text-[11px] mb-1" style={{ color: ring.color }}>{label}</p>
                <p className="text-slate-300">{ring.tooltip}</p>
                <div className="absolute left-1/2 -translate-x-1/2 top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 w-0 h-0" />
              </div>
            )}
          </div>
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
        )}
      </div>
      {/* Content */}
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-xl font-black leading-none ${alert ? 'text-amber-700' : 'text-slate-900'}`}>
          {typeof value === 'number' ? fmtNum(value) : value}
        </p>
        {(sub || ring?.label) && (
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            {ring?.label || sub}
          </p>
        )}
      </div>
    </button>
  );
}

/* ─── ActionBtn ─── */
function ActionBtn({ icon: Icon, label, onClick, color }: {
  icon: React.ElementType; label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold
        text-[11px] whitespace-nowrap transition-all active:scale-95 min-w-[68px] ${color}`}
    >
      <Icon className={`w-5 h-5 ${Icon === Loader2 ? 'animate-spin' : ''}`} />
      {label}
    </button>
  );
}

/* ─── Section Header ─── */
function Section({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">{label}</p>
      {sub && <p className="text-[9px] text-slate-400 font-semibold">{sub}</p>}
    </div>
  );
}

/* ═══════════ MAIN ═══════════ */
export default function Dashboard({ goToTab }: { goToTab: (tabId: string) => void }) {
  const { user, profile, activeCompanyId } = useAuth();
  const isOwner      = profile?.email?.toLowerCase().trim() === 'expertadvsa@gmail.com';
  const isManager    = profile?.role === 'manager' || isOwner;
  const isSupervisor = profile?.role === 'supervisor';
  const isElevated   = isManager || isSupervisor;

  const [aiInsight, setAiInsight]   = useState<string | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [stats, setStats]           = useState<DashboardStats>({
    income: 0, expenses: 0, purchases: 0, employeesCount: 0,
    pendingInvoices: 0, workerExpense: 0, activeWorkers: 0, activeProjects: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [workers, setWorkers]           = useState<any[]>([]);
  const [alerts, setAlerts]             = useState<AlertItem[]>([]);
  const [briefing, setBriefing]         = useState<BriefingItem[]>([]);
  const [announcement, setAnnouncement] = useState('');
  
  // Real-time voice briefing integration
  const [todayAttendance, setTodayAttendance] = useState<number>(0);
  const dashboardAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [dashboardPlayback, setDashboardPlayback] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');

  useEffect(() => {
    return () => {
      if (dashboardAudioRef.current) {
        dashboardAudioRef.current.pause();
      }
    };
  }, []);

  const handlePlayBriefingDirectly = async () => {
    if (dashboardPlayback === 'playing') {
      if (dashboardAudioRef.current) {
        dashboardAudioRef.current.pause();
      }
      setDashboardPlayback('paused');
      return;
    }
    
    if (dashboardPlayback === 'paused') {
      if (dashboardAudioRef.current) {
        await dashboardAudioRef.current.play();
        setDashboardPlayback('playing');
      }
      return;
    }

    setDashboardPlayback('loading');
    
    // Formulate key exactly matching the briefing system's state structure:
    const netAmount = stats.income - stats.expenses;
    const cacheKey = `briefing_v2_${stats.income}_${stats.expenses}_${stats.pendingInvoices}_${stats.activeProjects}_${stats.activeWorkers}_${stats.employeesCount}_${todayAttendance}_all`;

    try {
      if (dashboardAudioRef.current) {
        dashboardAudioRef.current.pause();
      }

      const cachedText = localStorage.getItem(cacheKey + '_text');
      const cachedAudio = localStorage.getItem(cacheKey + '_audio');

      if (cachedText && cachedAudio) {
        const uri = `data:audio/wav;base64,${cachedAudio}`;
        const audio = new Audio(uri);
        dashboardAudioRef.current = audio;
        
        audio.onplay = () => setDashboardPlayback('playing');
        audio.onpause = () => {
          if (!audio.ended) setDashboardPlayback('paused');
        };
        audio.onended = () => setDashboardPlayback('stopped');
        audio.onerror = () => {
          toast.error('حدث عطل في تشغيل التقرير الصباحي المحفوظ');
          setDashboardPlayback('stopped');
        };
        
        toast.success('تشغيل فوري للتقرير المحفوظ ⚡ (لعدم حدوث تغييرات في النظام)', { duration: 4500 });
        await audio.play();
        return;
      }

      toast.info('جاري صياغة تقرير مباشر بلهجة عامية ومختصرة... 🧠', { duration: 4000 });
      
      const customKey = localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('gemini_api_key') || '';
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: {
            income: stats.income,
            expenses: stats.expenses,
            net: netAmount,
            pendingPurchases: stats.pendingInvoices,
            activeProjects: stats.activeProjects,
            totalWorkers: stats.activeWorkers,
            totalEmployees: stats.employeesCount,
            todayAttendance: todayAttendance
          },
          voiceFocus: 'all',
          customKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'فشل جلب الموجز الصوتي من الخادم');
      }

      const generatedText = data.text || 'التقرير الصباحي جاهز.';
      const audioBase64 = data.audio;

      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('briefing_v2_')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(cacheKey + '_text', generatedText);
        localStorage.setItem(cacheKey + '_audio', audioBase64);
      } catch (cacheErr) {
        console.warn('Failed to save to local cache:', cacheErr);
      }

      const uri = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(uri);
      dashboardAudioRef.current = audio;

      audio.onplay = () => setDashboardPlayback('playing');
      audio.onpause = () => {
        if (!audio.ended) setDashboardPlayback('paused');
      };
      audio.onended = () => setDashboardPlayback('stopped');
      audio.onerror = () => {
        toast.error('حدث عطل في تشغيل ملف الصوت المولد');
        setDashboardPlayback('stopped');
      };

      toast.success('تم توليد التقرير بنجاح! جاري البدء في السرد 🎙️');
      await audio.play();

    } catch (err: any) {
      console.error(err);
      toast.error('أخفق تشغيل السرد الصوتي المباشر: ' + err.message);
      setDashboardPlayback('stopped');
    }
  };
  
  // General operational task manager states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemProjects, setSystemProjects] = useState<any[]>([]);
  const [systemSuppliers, setSystemSuppliers] = useState<any[]>([]);
  const [generalTasks, setGeneralTasks] = useState<any[]>([]);
  const [isSavingTask, setIsSavingTask] = useState(false);
  
  // Task filter states
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all'); // all | pending | completed

  // New task form fields
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedEmployees: [] as string[],
    taskType: 'none', // none | project | purchases | inventory
    linkedEntityId: '', // project id or supplier id
    dueDate: '',
    priority: 'medium', // low | medium | high
    milestoneWeight: 10,
    estimatedBudget: 0,
    inventoryAction: 'جرد مخازن', // 'جرد مخازن' | 'صرف مواد' | 'استلام بضاعة'
  });
  const [chartData] = useState([
    { d: 'السبت', v: 400 }, { d: 'الأحد', v: 300 }, { d: 'الاثنين', v: 500 },
    { d: 'الثلاثاء', v: 278 }, { d: 'الأربعاء', v: 189 },
    { d: 'الخميس', v: 390 }, { d: 'الجمعة', v: 349 },
  ]);

  /* ── AI ── */
  useEffect(() => {
    if (!isManager) return;
    (async () => {
      setAiLoading(true);
      try {
        const pSnap = await getDocs(query(getCompanyQuery('projects', activeCompanyId), limit(1)));
        const tSnap = await getDocs(query(getCompanyQuery('transactions', activeCompanyId), limit(10)));
        if (!pSnap.empty) {
          setAiInsight(await analyzeProjectSpending(
            pSnap.docs[0].data(), tSnap.docs.map(d => d.data())
          ));
        } else {
          setAiInsight('لا توجد مشاريع مسجلة حتى الآن. أضف أول مشروع من قسم المشاريع.');
        }
      } catch (e) { console.error('AI:', e); }
      finally { setAiLoading(false); }
    })();
  }, [isManager]);

  /* ── Announcement ── */
  useEffect(() => {
    const u = onSnapshot(doc(db, 'system', 'settings'), s => {
      if (s.exists()) setAnnouncement(s.data().generalAnnouncement || '');
    });
    return u;
  }, []);

  /* ── Projects ── */
  useEffect(() => {
    if (!profile) return;
    const u = onSnapshot(getCompanyQuery('projects', activeCompanyId), s => {
      const allowedDocs = s.docs.filter(d => {
        if (isOwner) return true;
        const data = d.data();
        const isSupervisorName = data.supervisor && profile.name && data.supervisor.trim().toLowerCase() === profile.name.trim().toLowerCase();
        const isWorker = data.workerIds && profile.uid && data.workerIds.includes(profile.uid);
        const isWorkerById = data.workerIds && profile.id && data.workerIds.includes(profile.id);
        const isMilestoneAssignee = data.milestones && data.milestones.some((m: any) => 
          (profile.id && m.assignedWorkerId === profile.id) || 
          (profile.uid && m.assignedWorkerId === profile.uid)
        );
        return isSupervisorName || isWorker || isWorkerById || isMilestoneAssignee;
      });
      setStats(p => ({
        ...p,
        activeProjects: allowedDocs.filter(d => ['in-progress', 'active'].includes(d.data().status)).length
      }));
    }, e => console.error('Projects:', e));
    return u;
  }, [profile, isOwner]);

  /* ── Alerts & Briefing ── */
  useEffect(() => {
    if (!isElevated || !profile) return;
    (async () => {
      const al: AlertItem[] = [];
      const br: BriefingItem[] = [];
      if (stats.pendingInvoices > 0) {
        al.push({ id: 'pur', text: `${stats.pendingInvoices} طلبات شراء تنتظر موافقتك`, type: 'amber', icon: ShoppingBag, tab: 'purchases' });
        br.push({ id: 'b1', text: 'اعتماد طلبات الشراء المعلقة', done: false, icon: FileText });
      }
      if (stats.expenses > stats.income * 0.8 && stats.income > 0) {
        al.push({ id: 'exp', text: 'المصروفات تجاوزت 80% من الدخل', type: 'red', icon: AlertTriangle, tab: 'financials' });
      }
      try {
        const ps = await getDocs(query(getCompanyQuery('projects', activeCompanyId), limit(10)));
        const ap = ps.docs.filter(d => d.data().status === 'in-progress');
        if (ap.length > 0)
          br.push({ id: 'b2', text: `متابعة ${ap.length} مشاريع نشطة`, done: false, icon: Briefcase });
        const today = new Date().toISOString().split('T')[0];
        const att = await getDocs(query(getCompanyQuery('attendance', activeCompanyId), where('dateString', '==', today)));
        if (att.size < stats.employeesCount * 0.5 && stats.employeesCount > 0) {
          al.push({ id: 'att', text: 'نسبة الحضور منخفضة اليوم', type: 'blue', icon: Users, tab: 'attendance_manager' });
          br.push({ id: 'b3', text: 'مراجعة سجل الحضور والانصراف', done: false, icon: Clock });
        }
        if (stats.income > 5000)
          br.push({ id: 'b4', text: 'تحليل الأداء الربحي للشهر', done: true, icon: CheckCircle });
      } catch (e) { console.error('Insights:', e); }
      setAlerts(al);
      setBriefing(br.slice(0, 5));
    })();
  }, [isElevated, profile, stats.pendingInvoices, stats.income, stats.expenses, stats.employeesCount]);

  /* ── Transactions & Stats ── */
  useEffect(() => {
    if (!profile) return;
    const subs: (() => void)[] = [];

    const qT = isOwner
      ? query(getCompanyQuery('transactions', activeCompanyId), orderBy('date', 'desc'), limit(6))
      : query(getCompanyQuery('transactions', activeCompanyId), where('createdBy', '==', user?.uid), orderBy('date', 'desc'), limit(6));

    subs.push(onSnapshot(qT, s => {
      setTransactions(s.docs.map(d => {
        const data = d.data();
        let dateOriginal: Date = new Date();
        if (data.date) {
          dateOriginal = typeof data.date.toDate === 'function'
            ? data.date.toDate() : new Date(data.date);
        }
        return { id: d.id, ...data, dateOriginal };
      }));
    }, e => console.error('Trans:', e)));

    if (isOwner) {
      subs.push(onSnapshot(getCompanyQuery('workerTransactions', activeCompanyId), s => {
        const total = s.docs.reduce((acc, d) =>
          d.data().type === 'payment' ? acc + (d.data().amount || 0) : acc, 0);
        setStats(p => ({ ...p, workerExpense: total }));
      }, e => console.error('WorkerTrans:', e)));

      const ago90 = new Date();
      ago90.setDate(ago90.getDate() - 90);
      subs.push(onSnapshot(
        query(getCompanyQuery('transactions', activeCompanyId), where('date', '>=', ago90.toISOString())),
        s => {
          let inc = 0, exp = 0, pur = 0, pend = 0;
          s.docs.forEach(d => {
            const data = d.data();
            if (data.type === 'income')    inc  += data.amount || 0;
            if (data.type === 'expense')   exp  += data.amount || 0;
            if (data.type === 'purchase')  pur  += data.amount || 0;
            if (data.status === 'pending') pend++;
          });
          setStats(p => ({ ...p, income: inc, expenses: exp, purchases: pur, pendingInvoices: pend }));
        }, e => console.error('Stats:', e)));
    }

    if (isElevated) {

      subs.push(onSnapshot(query(getCompanyQuery('users', activeCompanyId), limit(100)), s =>
        setStats(p => ({ ...p, employeesCount: s.size }))));

      subs.push(onSnapshot(query(getCompanyQuery('workers', activeCompanyId), limit(100)), s => {
        setWorkers(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setStats(p => ({ ...p, activeWorkers: s.size }));
      }));

      const todayStr = new Date().toISOString().split('T')[0];
      subs.push(onSnapshot(
        query(getCompanyQuery('attendance', activeCompanyId), where('dateString', '==', todayStr)),
        s => {
          setTodayAttendance(s.size);
        }
      ));
    }

    return () => subs.forEach(u => u());
  }, [profile, isElevated, user?.uid]);

  /* ── General Task System Data Listeners ── */
  useEffect(() => {
    if (!profile) return;

    // 1. Listen to general tasks
    const unSubTasks = onSnapshot(
      query(getCompanyQuery('generalTasks', activeCompanyId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setGeneralTasks(snapshot.docs.map(doc => {
          const data = doc.data();
          let parsedDate = null;
          if (data.createdAt) {
            parsedDate = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
          }
          return { id: doc.id, ...data, parsedDate };
        }));
      },
      (err) => console.error("Error loading tasks:", err)
    );

    // 2. Listen to system users/employees for assignment
    const unSubUsers = onSnapshot(
      query(getCompanyQuery('users', activeCompanyId), orderBy('name', 'asc')),
      (snapshot) => {
        setSystemUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      },
      (err) => console.error("Error loading system users:", err)
    );

    // 3. Listen to system projects
    const unSubProjects = onSnapshot(
      query(getCompanyQuery('projects', activeCompanyId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setSystemProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.error("Error loading system projects:", err)
    );

    // 4. Listen to system suppliers
    const unSubSuppliers = onSnapshot(
      getCompanyQuery('suppliers', activeCompanyId),
      (snapshot) => {
        setSystemSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.error("Error loading system suppliers:", err)
    );

    return () => {
      unSubTasks();
      unSubUsers();
      unSubProjects();
      unSubSuppliers();
    };
  }, [profile]);

  /* ── Task Master Actions ── */
  const handleCreateGeneralTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.error('الرجاء كتابة عنوان المهمة');
      return;
    }

    setIsSavingTask(true);
    const toastId = toast.loading('جاري حفظ المهمة في النظام وإرسال الإشعارات...');

    try {
      // 1. Prepare data
      const linkedName = 
        taskForm.taskType === 'project' 
          ? systemProjects.find(p => p.id === taskForm.linkedEntityId)?.title || ''
          : taskForm.taskType === 'purchases'
          ? systemSuppliers.find(s => s.id === taskForm.linkedEntityId)?.name || ''
          : '';

      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedEmployees: taskForm.assignedEmployees,
        taskType: taskForm.taskType,
        linkedEntityId: taskForm.linkedEntityId,
        linkedEntityName: linkedName,
        dueDate: taskForm.dueDate || '',
        priority: taskForm.priority,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || '',
        createdByName: profile?.name || 'المدير',
        milestoneWeight: taskForm.taskType === 'project' ? Number(taskForm.milestoneWeight) : null,
        estimatedBudget: taskForm.taskType === 'purchases' ? Number(taskForm.estimatedBudget) : null,
        inventoryAction: taskForm.taskType === 'inventory' ? taskForm.inventoryAction : null,
      };

      // 2. Save in Firestore generalTasks
      await addDoc(collection(db, 'generalTasks'), {
        companyId: activeCompanyId || null,
        ...taskData
      });

      // 3. If connected to project direct, append/inject to its milestones too!
      if (taskForm.taskType === 'project' && taskForm.linkedEntityId) {
        const projectRef = doc(db, 'projects', taskForm.linkedEntityId);
        const pSnap = await getDoc(projectRef);
        if (pSnap.exists()) {
          const projectData = pSnap.data();
          const milestones = projectData.milestones || [];
          
          // Check if milestone with same title already exists
          const exists = milestones.some((m: any) => m.title === taskForm.title);
          if (!exists) {
            const updatedMilestones = [
              ...milestones,
              {
                title: taskForm.title.trim(),
                weight: Number(taskForm.milestoneWeight) || 10,
                status: 'pending',
                date: taskForm.dueDate || '',
                assignedTo: taskForm.assignedEmployees,
                description: taskForm.description.trim(),
              }
            ];

            await updateDoc(projectRef, {
              milestones: updatedMilestones,
              progress: updatedMilestones.length > 0 
                ? Math.round((updatedMilestones.filter((m: any) => m.status === 'completed').length / updatedMilestones.length) * 100) 
                : 0
            });
          }
        }
      }

      // 4. Send rich notifications to each assigned employee
      if (taskForm.assignedEmployees.length > 0) {
        for (const empId of taskForm.assignedEmployees) {
          const empProfile = systemUsers.find(u => u.uid === empId);
          await sendNotification({
            title: 'تم إسناد مهمة جديدة لك',
            message: `قام ${profile?.name || 'المدير'} بإسناد المهمة: "${taskForm.title}" إليك. تاريخ الاستحقاق: ${taskForm.dueDate || 'غير محدد'}.`,
            type: 'info',
            category: 'project',
            targetRole: empProfile?.role || 'employee',
            priority: taskForm.priority as any
          });
        }
      }

      toast.success('تمت إضافة المهمة التشغيلية بنجاح وتم إشعار الموظفين!', { id: toastId });
      
      // Reset form & state
      setTaskForm({
        title: '',
        description: '',
        assignedEmployees: [],
        taskType: 'none',
        linkedEntityId: '',
        dueDate: '',
        priority: 'medium',
        milestoneWeight: 10,
        estimatedBudget: 0,
        inventoryAction: 'جرد مخازن',
      });
      setIsTaskModalOpen(false);
    } catch (err) {
      console.error('Error creating general task:', err);
      toast.error('حدث خطأ أثناء إضافة المهمة', { id: toastId });
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleToggleGeneralTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      // 1. Update general tasks status
      await updateDoc(doc(db, 'generalTasks', task.id), {
        status: nextStatus
      });

      // 2. If project linked, sync milestone inside project
      if (task.taskType === 'project' && task.linkedEntityId) {
        const projectRef = doc(db, 'projects', task.linkedEntityId);
        const pSnap = await getDoc(projectRef);
        if (pSnap.exists()) {
          const projectData = pSnap.data();
          const milestones = projectData.milestones || [];
          const updatedMilestones = milestones.map((m: any) => {
            if (m.title === task.title) {
              return {
                ...m,
                status: nextStatus as any,
                date: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : ''
              };
            }
            return m;
          });

          await updateDoc(projectRef, {
            milestones: updatedMilestones,
            progress: updatedMilestones.length > 0 
              ? Math.round((updatedMilestones.filter((m: any) => m.status === 'completed').length / updatedMilestones.length) * 100) 
              : 0
          });
        }
      }

      toast.success(`تم تحديث حالة المهمة بنجاح إلى: ${nextStatus === 'completed' ? 'مكتملة' : 'قيد الانتظار'}`);
    } catch (err) {
      console.error('Error toggling task status:', err);
      toast.error('حدث خطأ أثناء تغيير حالة المهمة');
    }
  };

  const handleDeleteGeneralTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'generalTasks', taskId), {
        archived: true
      });
      toast.success('تم حذف المهمة بنجاح');
    } catch (e) {
      toast.error('فشل في حذف المهمة');
    }
  };

  /* ── Derived ── */
  const filteredGenTasks = React.useMemo(() => {
    return generalTasks.filter(t => {
      if (t.archived) return false;
      
      // Role constraint: normal employees only see tasks assigned to them
      if (!isElevated && t.assignedEmployees && !t.assignedEmployees.includes(user?.uid)) {
        return false;
      }

      // Search filters
      const matchesSearch = !taskSearchQuery.trim() || 
        t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) || 
        (t.description && t.description.toLowerCase().includes(taskSearchQuery.toLowerCase()));
      
      // Status filters
      const matchesStatus = taskStatusFilter === 'all' || t.status === taskStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [generalTasks, taskSearchQuery, taskStatusFilter, isElevated, user?.uid]);

  const totalExpenses = stats.expenses + stats.workerExpense;
  const netBalance    = stats.income - totalExpenses;
  const profitPct     = stats.income > 0 ? Math.round((netBalance / stats.income) * 100) : 0;

  /* ═══════ RENDER ═══════ */
  return (
    <div className="min-h-screen bg-slate-50 pb-28" dir="rtl">
      <div className="w-full px-3 sm:px-5 py-5 space-y-5">

        {/* ══ HEADER ══ */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">{greeting()}</p>
            <h1 className="text-xl font-black text-slate-900">{profile?.name || 'المدير'}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">{todayAr()}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {announcement && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 bg-amber-50 border border-amber-200
                    text-amber-800 rounded-xl px-3 py-2 text-[10px] font-bold max-w-[130px] truncate hover:bg-amber-100 transition">
                    <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{announcement}</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm font-black">
                      <Bell className="w-4 h-4 text-amber-500" /> إعلان الإدارة
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-700 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100">
                    {announcement}
                  </p>
                </DialogContent>
              </Dialog>
            )}
            <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg">V2.1</span>
          </div>
        </div>

        {/* ══ EMPLOYEE VIEW ══ */}
        {!isElevated && <SmartAttendance />}

        {/* ══ ALERTS ══ */}
        {isManager && alerts.length > 0 && (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <motion.div
                  key={alert.id} layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    alert.type === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    alert.type === 'red'   ? 'bg-red-600 border-none text-white shadow-md shadow-red-650/10' :
                                             'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg text-white shrink-0 ${
                    alert.type === 'amber' ? 'bg-amber-500' :
                    alert.type === 'red'   ? 'bg-white/20' : 'bg-blue-500'
                  }`}><alert.icon className="w-3.5 h-3.5" /></div>
                  <p className="flex-1 text-xs font-bold cursor-pointer truncate"
                    onClick={() => goToTab(alert.tab)}>{alert.text}</p>
                  <button
                    onClick={() => setAlerts(p => p.filter(a => a.id !== alert.id))}
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition ${
                      alert.type === 'red' ? 'text-white/80 hover:text-white' : 'text-slate-500'
                    }`}>
                    <X className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* ══ QUICK ACTIONS ══ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">الوصول السريع والمهام</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar-y no-scrollbar">
            <ActionBtn icon={Plus}          label="مهمة عامة +" color="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black shadow-sm" onClick={() => setIsTaskModalOpen(true)} />
            <ActionBtn 
              icon={
                dashboardPlayback === 'loading' ? Loader2 :
                dashboardPlayback === 'playing' ? Pause :
                Volume2
              } 
              label={
                dashboardPlayback === 'loading' ? "جاري الصياغة..." :
                dashboardPlayback === 'playing' ? "إيقاف مؤقت ⏸️" :
                dashboardPlayback === 'paused' ? "استئناف 🎙️" :
                "سرد الموجز 🎙️"
              } 
              color={
                dashboardPlayback === 'loading' ? "bg-slate-400 text-white cursor-not-allowed shadow-none" :
                dashboardPlayback === 'playing' ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black animate-pulse shadow-sm" :
                dashboardPlayback === 'paused' ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-black shadow-sm" :
                "bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black animate-pulse shadow-sm"
              } 
              onClick={handlePlayBriefingDirectly} 
            />
            <ActionBtn icon={HardHat}       label="العمالة"     color="bg-emerald-500 text-white"   onClick={() => goToTab('workers_management')} />
            <ActionBtn icon={Scan}          label="مسح فاتورة"  color="bg-slate-900 text-white"     onClick={() => goToTab('camera')} />
            <ActionBtn icon={Clock}         label="الحضور"      color="bg-blue-500 text-white"      onClick={() => goToTab('attendance_manager')} />
            <ActionBtn icon={ShoppingCart}  label="المشتريات"   color="bg-amber-500 text-white"     onClick={() => goToTab('purchases')} />
            <ActionBtn icon={Briefcase}     label="المشاريع"    color="bg-indigo-500 text-white"    onClick={() => goToTab('projects')} />
            <ActionBtn icon={Wallet}        label="الماليات"    color="bg-teal-600 text-white"      onClick={() => goToTab('financials')} />
            {isManager && <>
              <ActionBtn icon={TrendingUp}  label="المبيعات"    color="bg-pink-500 text-white"      onClick={() => goToTab('sales')} />
              <ActionBtn icon={Users}       label="الفريق"      color="bg-purple-500 text-white"    onClick={() => goToTab('employees')} />
              <ActionBtn icon={Package}     label="المخزون"     color="bg-orange-500 text-white"    onClick={() => goToTab('inventory')} />
              <ActionBtn icon={Banknote}    label="البنوك"      color="bg-cyan-600 text-white"      onClick={() => goToTab('banking')} />
            </>}
          </div>
        </div>

        {/* ══ KPI: FINANCIAL ══ */}
        {isOwner && (
          <div>
            <Section label="المالية" sub="آخر 90 يوم" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="الدخل الإجمالي" value={stats.income}
                icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50"
                onClick={() => goToTab('financials')}
                ring={{
                  displayPct: (stats.income + totalExpenses) > 0 ? Math.round((stats.income / (stats.income + totalExpenses)) * 100) : 0,
                  realPct: (stats.income + totalExpenses) > 0 ? Math.round((stats.income / (stats.income + totalExpenses)) * 100) : 0,
                  color: '#10b981',
                  label: (stats.income + totalExpenses) > 0 ? `${Math.round((stats.income / (stats.income + totalExpenses)) * 100)}% من التدفق` : 'لا يوجد دخل',
                  tooltip: `الدخل ${fmtNum(stats.income)} من إجمالي تدفق ${fmtNum(stats.income + totalExpenses)} — الباقي مصروفات`
                }}
              />
              <StatCard
                label="المصروفات" value={totalExpenses}
                icon={TrendingDown} iconColor="text-red-500" iconBg="bg-red-50"
                onClick={() => goToTab('financials')}
                ring={{
                  displayPct: stats.income > 0 ? Math.min(100, Math.round((totalExpenses / stats.income) * 100)) : 100,
                  realPct: stats.income > 0 ? Math.round((totalExpenses / stats.income) * 100) : 0,
                  color: stats.income > 0 && totalExpenses > stats.income ? '#dc2626' : '#ef4444',
                  label: stats.income > 0 ? `${Math.round((totalExpenses / stats.income) * 100)}% من الدخل` : 'لا يوجد دخل',
                  tooltip: totalExpenses > stats.income
                    ? `⚠️ المصروفات ${fmtNum(totalExpenses)} تتجاوز الدخل ${fmtNum(stats.income)} — فجوة ${fmtNum(totalExpenses - stats.income)}`
                    : `المصروفات ${fmtNum(totalExpenses)} = ${Math.round((totalExpenses / stats.income) * 100)}% من الدخل ${fmtNum(stats.income)}`
                }}
              />
              <StatCard
                label="صافي الربح" value={netBalance}
                icon={Wallet}
                iconColor={netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}
                iconBg={netBalance >= 0 ? 'bg-indigo-50' : 'bg-red-50'}
                onClick={() => goToTab('financials')}
                ring={{
                  displayPct: Math.min(100, Math.max(0, Math.abs(profitPct))),
                  realPct: Math.abs(profitPct),
                  color: netBalance >= 0 ? '#6366f1' : '#ef4444',
                  label: netBalance >= 0 ? `هامش ربح ${profitPct}%` : `خسارة ${Math.abs(profitPct)}%`,
                  tooltip: netBalance >= 0
                    ? `ربح صافي ${fmtNum(netBalance)} — هامش ${profitPct}% من الدخل`
                    : `خسارة ${fmtNum(Math.abs(netBalance))} — المصروف يتجاوز الدخل بـ ${Math.abs(profitPct)}%`
                }}
              />
              <StatCard
                label="طلبات معلقة" value={stats.pendingInvoices}
                icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50"
                alert={stats.pendingInvoices > 0}
                onClick={() => goToTab('purchases')}
                ring={{
                  displayPct: Math.min(100, stats.pendingInvoices * 20),
                  realPct: stats.pendingInvoices,
                  color: stats.pendingInvoices >= 5 ? '#dc2626' : stats.pendingInvoices > 0 ? '#f59e0b' : '#94a3b8',
                  label: stats.pendingInvoices > 0 ? 'تنتظر موافقتك' : 'لا يوجد معلق',
                  tooltip: stats.pendingInvoices > 0
                    ? `${stats.pendingInvoices} طلب شراء لم يُعتمد — اضغط للمراجعة`
                    : 'جميع طلبات الشراء تمت معالجتها'
                }}
              />
            </div>
          </div>
        )}

        {/* ══ KPI: OPERATIONS ══ */}
        {isElevated && (
          <div>
            <Section label="التشغيل والموارد" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="عمال اليومية" value={stats.activeWorkers}
                icon={HardHat} iconColor="text-emerald-600" iconBg="bg-emerald-50"
                onClick={() => goToTab('workers_management')}
                ring={{
                  displayPct: stats.activeWorkers > 0 ? Math.min(100, Math.round((todayAttendance / stats.activeWorkers) * 100)) : 0,
                  realPct: stats.activeWorkers > 0 ? Math.round((todayAttendance / stats.activeWorkers) * 100) : 0,
                  color: todayAttendance >= stats.activeWorkers * 0.8 ? '#10b981' : todayAttendance > 0 ? '#f59e0b' : '#ef4444',
                  label: `${todayAttendance} حضروا اليوم`,
                  tooltip: `${todayAttendance} من أصل ${stats.activeWorkers} عامل سجّلوا حضورهم اليوم`
                }}
              />
              <StatCard
                label="المشاريع النشطة" value={stats.activeProjects}
                icon={Building2} iconColor="text-blue-600" iconBg="bg-blue-50"
                onClick={() => goToTab('projects')}
                ring={{
                  displayPct: systemProjects.length > 0 ? Math.min(100, Math.round((stats.activeProjects / systemProjects.length) * 100)) : 0,
                  realPct: systemProjects.length > 0 ? Math.round((stats.activeProjects / systemProjects.length) * 100) : 0,
                  color: '#3b82f6',
                  label: `من أصل ${systemProjects.length} مشروع`,
                  tooltip: `${stats.activeProjects} مشروع نشط من إجمالي ${systemProjects.length} مشاريع مسجّلة`
                }}
              />
              <StatCard
                label="الفريق" value={stats.employeesCount}
                icon={Users} iconColor="text-slate-600" iconBg="bg-slate-100"
                onClick={() => goToTab('employees')}
                ring={{
                  displayPct: stats.employeesCount > 0 ? Math.min(100, Math.round((todayAttendance / stats.employeesCount) * 100)) : 0,
                  realPct: stats.employeesCount > 0 ? Math.round((todayAttendance / stats.employeesCount) * 100) : 0,
                  color: '#64748b',
                  label: `${todayAttendance} حضور اليوم`,
                  tooltip: `${todayAttendance} موظف سجّل حضوره من أصل ${stats.employeesCount} موظف مسجّل`
                }}
              />
              <StatCard
                label="إجمالي المشتريات" value={stats.purchases}
                icon={ShoppingBag} iconColor="text-orange-600" iconBg="bg-orange-50"
                onClick={() => goToTab('purchases')}
                ring={{
                  displayPct: stats.income > 0 ? Math.min(100, Math.round((stats.purchases / stats.income) * 100)) : 0,
                  realPct: stats.income > 0 ? Math.round((stats.purchases / stats.income) * 100) : 0,
                  color: '#f97316',
                  label: stats.income > 0 ? `${Math.round((stats.purchases / stats.income) * 100)}% من الدخل` : 'آخر 90 يوم',
                  tooltip: `المشتريات ${fmtNum(stats.purchases)} = ${stats.income > 0 ? Math.round((stats.purchases / stats.income) * 100) : 0}% من الدخل ${fmtNum(stats.income)}`
                }}
              />
            </div>
          </div>
        )}

        {/* ══ MAIN CONTENT GRID ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ─── LEFT COL: Transactions + Workers ─── */}
          <div className="lg:col-span-3 space-y-4">

            {/* 📋 المهام والعمليات العامة والتشغيلية */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-indigo-600" />
                    <p className="text-sm font-black text-slate-900">المهام والعمليات المشتركة</p>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {filteredGenTasks.filter(t => t.status === 'pending').length} معلقة
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">تتبع المهام المستقلة أو المرتبطة بالمشاريع والمشتريات والمخازن</p>
                </div>
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" /> مهمة تشغيلية جديدة
                </button>
              </div>

              {/* شريط البحث والتصفية */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو التفاصيل..."
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="flex bg-slate-100 rounded-xl p-0.5 self-start">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'pending', label: 'المعلقة' },
                    { id: 'completed', label: 'المكتملة' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setTaskStatusFilter(tab.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black transition ${
                        taskStatusFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* قائمة المهام الفعالة */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredGenTasks.length > 0 ? (
                  filteredGenTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group relative flex items-start gap-3 p-3 rounded-xl border transition duration-200 ${
                        task.status === 'completed'
                          ? 'bg-slate-50/70 border-slate-100 opacity-75'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      {/* زر الاختيار الدائري */}
                      <button
                        onClick={() => handleToggleGeneralTaskStatus(task)}
                        className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-350 hover:border-indigo-500 hover:bg-slate-50 text-transparent'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p
                            className={`text-xs font-black leading-tight truncate ${
                              task.status === 'completed'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </p>

                          {/* مستوى الأهمية */}
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                              task.priority === 'high'
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : task.priority === 'medium'
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-slate-55 text-slate-600 border border-slate-100'
                            }`}
                          >
                            {task.priority === 'high' ? 'عاجلة' : task.priority === 'medium' ? 'متوسطة' : 'عادية'}
                          </span>

                          {/* أيقونة الارتباط (مشروع/مشتريات/مخزن) */}
                          {task.taskType === 'project' && (
                            <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Briefcase className="w-2.5 h-2.5" /> مشروع: {task.linkedEntityName}
                            </span>
                          )}
                          {task.taskType === 'purchases' && (
                            <span className="bg-amber-50 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <ShoppingCart className="w-2.5 h-2.5" /> مورد: {task.linkedEntityName}
                            </span>
                          )}
                          {task.taskType === 'inventory' && (
                            <span className="bg-orange-50 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <Package className="w-2.5 h-2.5" /> مخزن: {task.inventoryAction}
                            </span>
                          )}
                          {task.taskType === 'none' && (
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                              عامة مستقلة
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className={`text-[10px] leading-relaxed line-clamp-2 ${
                            task.status === 'completed' ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {task.description}
                          </p>
                        )}

                        {/* إسناد الموظفين + التواريخ */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-1.5">
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>الاستحقاق: {task.dueDate}</span>
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400">| بواسطة: {task.createdByName || 'النظام'}</span>
                          </div>

                          {/* الموظفين المسندة إليهم */}
                          {task.assignedEmployees && task.assignedEmployees.length > 0 && (
                            <div className="flex -space-x-1.5 overflow-hidden items-center">
                              {task.assignedEmployees.map((empId: string) => {
                                const emp = systemUsers.find(u => u.uid === empId);
                                const initials = emp?.name ? emp.name.substring(0, 2) : '..';
                                return (
                                  <div
                                    key={empId}
                                    title={emp?.name || 'موظف'}
                                    className="w-5.5 h-5.5 rounded-full bg-indigo-500 text-white border-2 border-white flex items-center justify-center text-[8px] font-black cursor-default shrink-0"
                                  >
                                    {initials}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* زر الحذف */}
                      {isElevated && (
                        <button
                          onClick={() => handleDeleteGeneralTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 absolute left-2 top-2 w-6 h-6 hover:bg-red-50 text-red-500 rounded-lg flex items-center justify-center transition duration-150"
                          title="حذف المهمة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                    <ListTodo className="w-10 h-10 text-slate-350 stroke-[1.5] mb-2" />
                    <p className="text-xs font-black text-slate-600">لا توجد مهام تشغيلية حالياً</p>
                    <p className="text-[10px] text-slate-400 max-w-[240px] mt-0.5">انقر على الزر بالأعلى أو في شريط الوصول السريع لإضافة مهمة عامة جديدة للفريق</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-black text-slate-900">آخر الحركات المالية</p>
                  <p className="text-[10px] text-slate-400">العمليات المسجلة حديثاً</p>
                </div>
                <button
                  onClick={() => goToTab('financials')}
                  className="flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:opacity-70 transition">
                  عرض الكل <ArrowLeft className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {transactions.length > 0 ? transactions.map((tx: any, i: number) => (
                  <button key={tx.id || i} onClick={() => goToTab('financials')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-right">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-50' :
                      tx.type === 'purchase' ? 'bg-orange-50' : 'bg-red-50'
                    }`}>
                      {tx.type === 'income'
                        ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                        : tx.type === 'purchase'
                        ? <ShoppingBag className="w-4 h-4 text-orange-500" />
                        : <TrendingDown className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{tx.description || 'عملية مالية'}</p>
                      <p className="text-[10px] text-slate-400">{fmtDate(tx.dateOriginal)}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className={`text-sm font-black ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'income' ? '+' : '−'}{fmtNum(tx.amount || 0)}
                      </p>
                      <p className="text-[9px] text-slate-400 font-semibold">ر.س</p>
                    </div>
                  </button>
                )) : (
                  <div className="py-10 text-center text-slate-300">
                    <Wallet className="w-8 h-8 mx-auto opacity-25 mb-2" />
                    <p className="text-xs font-bold">لا توجد حركات مالية</p>
                  </div>
                )}
              </div>
            </div>

            {/* Workers Preview */}
            {isElevated && workers.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-black text-slate-900">عمال اليومية</p>
                    <p className="text-[10px] text-slate-400">آخر المسجلين</p>
                  </div>
                  <button
                    onClick={() => goToTab('workers_management')}
                    className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:opacity-70 transition">
                    إدارة الكل <ArrowLeft className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {workers.slice(0, 5).map(w => (
                    <button key={w.id} onClick={() => goToTab('workers_management')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-right">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm shrink-0">
                        {(w.name?.[0] || '؟')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{w.name}</p>
                        <p className="text-[10px] text-slate-400">{w.role || 'عامل يومي'}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-600 shrink-0">{w.dailyRate} ر.س/يوم</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT COL: AI + Chart + Briefing ─── */}
          <div className="lg:col-span-2 space-y-4">

            {/* AI Card — Manager only */}
            {isManager && (
              <div className="bg-slate-900 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black">الذكاء الميداني</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest">AI Field Analysis</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-3 mb-3 min-h-[72px]">
                  {aiLoading ? (
                    <div className="flex items-center gap-2 text-white/40">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">جاري تحليل بيانات المشاريع...</span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/80 leading-relaxed line-clamp-4">
                      {aiInsight || 'لا توجد بيانات كافية للتحليل الآن.'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => goToTab('briefing')}
                  className="w-full py-2.5 rounded-lg bg-white text-slate-900 text-xs font-black hover:bg-slate-100 transition">
                  فتح الموجز التنفيذي ←
                </button>
              </div>
            )}

            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-900">مؤشر الإنتاجية الأسبوعي</p>
              <p className="text-[10px] text-slate-400 mb-3">التوزيع التشغيلي</p>
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height={130} minWidth={0} minHeight={0}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#0d9488" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="d" axisLine={false} tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 700 }} dy={5} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10, border: 'none',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        fontFamily: 'Cairo', fontSize: 11
                      }}
                      cursor={{ stroke: '#0d9488', strokeWidth: 1.5 }}
                    />
                    <Area type="monotone" dataKey="v" stroke="#0d9488"
                      strokeWidth={2} fill="url(#ga)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Briefing */}
            {isElevated && briefing.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <p className="text-sm font-black text-slate-900">موجز اليوم</p>
                </div>
                <div className="space-y-2">
                  {briefing.map(b => (
                    <div key={b.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg text-xs font-semibold ${
                      b.done
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-700 border border-slate-100'
                    }`}>
                      <b.icon className={`w-3.5 h-3.5 shrink-0 ${b.done ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{b.text}</span>
                      {b.done && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Links — Manager shortcuts to key sections */}
            {isManager && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">روابط إدارية</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'دفتر الأستاذ',   icon: Receipt,    tab: 'general_ledger', color: 'text-slate-700' },
                    { label: 'الاعتمادات',      icon: CheckCircle, tab: 'approvals',     color: 'text-emerald-700' },
                    { label: 'تقييم الأداء',    icon: Star,        tab: 'evaluation',    color: 'text-amber-700' },
                    { label: 'التحليلات',       icon: BarChart2,   tab: 'analytics',     color: 'text-indigo-700' },
                    { label: 'الأرشيف',         icon: Package,     tab: 'archive',       color: 'text-slate-600' },
                    { label: 'إعدادات النظام',  icon: UserCheck,   tab: 'settings',      color: 'text-teal-700' },
                  ].map(link => (
                    <button key={link.tab} onClick={() => goToTab(link.tab)}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100
                        hover:bg-slate-100 hover:border-slate-200 transition text-right">
                      <link.icon className={`w-3.5 h-3.5 shrink-0 ${link.color}`} />
                      <span className="text-[11px] font-bold text-slate-700 truncate">{link.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ 🛠️ نافذة إنشاء مهمة عامة أو تشغيلية ذكية ══ */}
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
          <DialogContent className="max-w-lg rounded-2xl overflow-y-auto max-h-[92vh]" dir="rtl">
            <DialogHeader className="border-b border-slate-50 pb-3">
              <DialogTitle className="flex items-center gap-2 text-sm font-black text-slate-900">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <ListTodo className="w-4 h-4" />
                </div>
                إنشاء مهمة عامة / تشغيلية جديدة
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateGeneralTask} className="space-y-4 pt-2">
              {/* عنوان المهمة */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">العنوان الأساسي للمهمة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طباعة وتركيب لوحة الكلادينج لفرع العليا"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* وصف المهمة */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">تفاصيل أو وصف المهمة</label>
                <textarea
                  placeholder="أدخل تفاصيل التوجيه الميداني أو متطلبات الإنجاز المباشرة..."
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* إسناد الموظفين */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 block">إسناد وتوجيه الموظفين (اختر موظف أو أكثر)</label>
                <div className="flex flex-wrap gap-1.5 max-h-[105px] overflow-y-auto bg-slate-50 border border-slate-150 rounded-xl p-2">
                  {systemUsers.length > 0 ? (
                    systemUsers.map(emp => {
                      const isSelected = taskForm.assignedEmployees.includes(emp.uid);
                      return (
                        <button
                          key={emp.uid}
                          type="button"
                          onClick={() => {
                            setTaskForm(p => {
                              const curr = p.assignedEmployees;
                              const updated = curr.includes(emp.uid)
                                ? curr.filter(id => id !== emp.uid)
                                : [...curr, emp.uid];
                              return { ...p, assignedEmployees: updated };
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white border-slate-150 text-slate-600 hover:border-slate-350'
                          }`}
                        >
                          {emp.name} ({emp.role === 'manager' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'موظف'})
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[10px] text-slate-400 p-1">لا يوجد موظفين مسجلين في النظام</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* تاريخ الاستحقاق */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">تاريخ الإنجاز المطلوب</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                {/* مستوى الأهمية */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 block">مستوى الأهمية والسرعة</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  >
                    <option value="low">متدني / عادي</option>
                    <option value="medium">متوسط الأهمية</option>
                    <option value="high">عاجل جداً 🔥</option>
                  </select>
                </div>
              </div>

              {/* نوع أو جهة ارتباط المهمة */}
              <div className="space-y-1.5 p-3 bg-indigo-50/40 border border-indigo-50 rounded-2xl">
                <label className="text-[10px] font-black text-indigo-905 block">جهة ارتباط المهمة بالمنصة (التوجيه المتكامل)</label>
                <select
                  value={taskForm.taskType}
                  onChange={(e) => setTaskForm(p => ({ ...p, taskType: e.target.value, linkedEntityId: '' }))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-205 rounded-xl text-xs font-black focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="none">عامة مستلقة (غير مرتبطة بقسم حالياً)</option>
                  <option value="project">📁 تابعة لقسم المشاريع وإنجاز الأعمال ماديًا</option>
                  <option value="purchases">🛒 تابعة للمشتريات والموردين والتوريد ماديًا</option>
                  <option value="inventory">📦 تابعة لقسم المستودعات والمخازن ماديًا</option>
                </select>

                {/* الحقول الشرطية الديناميكية */}
                <span className="block h-0.5"></span>

                {/* 1. مشاريع */}
                {taskForm.taskType === 'project' && (
                  <div className="space-y-3 p-3 bg-white/50 rounded-xl border border-indigo-100/50 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 block">اختر المشروع المستهدف <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={taskForm.linkedEntityId}
                        onChange={(e) => setTaskForm(p => ({ ...p, linkedEntityId: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="">-- اختر من قائمة المشاريع --</option>
                        {systemProjects.map(proj => (
                          <option key={proj.id} value={proj.id}>{proj.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 block">تأثير المهمة على تقدم المشروع (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={taskForm.milestoneWeight}
                        onChange={(e) => setTaskForm(p => ({ ...p, milestoneWeight: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}

                {/* 2. مشتريات */}
                {taskForm.taskType === 'purchases' && (
                  <div className="space-y-3 p-3 bg-white/50 rounded-xl border border-indigo-100/50 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 block">اختر المورد المستهدف <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={taskForm.linkedEntityId}
                        onChange={(e) => setTaskForm(p => ({ ...p, linkedEntityId: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="">-- اختر من قائمة الموردين --</option>
                        {systemSuppliers.map(sup => (
                          <option key={sup.id} value={sup.id}>{sup.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 block">الميزانية التقديرية (ريال سعودي)</label>
                      <input
                        type="number"
                        placeholder="مثال: 5500"
                        value={taskForm.estimatedBudget || ''}
                        onChange={(e) => setTaskForm(p => ({ ...p, estimatedBudget: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}

                {/* 3. مستودع */}
                {taskForm.taskType === 'inventory' && (
                  <div className="space-y-3 p-3 bg-white/50 rounded-xl border border-indigo-100/50 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 block">نوع الإجراء المستودعي المستهدف</label>
                      <select
                        value={taskForm.inventoryAction}
                        onChange={(e) => setTaskForm(p => ({ ...p, inventoryAction: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="جرد مخازن">جرد الدوري للمخازن والمستودعات</option>
                        <option value="صرف مواد">جدولة وصرف مواد لمشروع ميداني</option>
                        <option value="استلام بضاعة">فرز واستلام بضاعة واردة</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* أزرار الإرسال */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 text-xs font-black rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  {isSavingTask ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الحفظ والتسجيل...
                    </>
                  ) : (
                    <>
                      حفظ العمل وإسناد المهمة للفريق
                    </>
                  )}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
