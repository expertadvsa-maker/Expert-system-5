import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../../lib/AuthContext';
import { 
  Clock, 
  Calendar, 
  CheckSquare, 
  Wallet, 
  UserCircle, 
  LogIn, 
  LogOut, 
  FileText,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ArrowUpLeft,
  CheckCircle2,
  StickyNote,
  Palette,
  LayoutGrid,
  Trash2,
  Pin,
  Plus,
  X,
  MessageSquare,
  DollarSign,
  Briefcase,
  FilePlus,
  Send,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { addDoc, collection, serverTimestamp, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SmartAttendance from '../SmartAttendance';

export default function EmployeeDashboard() {
  const { profile } = useAuth();

  // Sticky Notes and Customization States
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);
  const [dashboardTheme, setDashboardTheme] = useState<'glass' | 'velvet' | 'neon' | 'emerald'>('glass');

  // Action Dialog States
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Submitting loaders
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [leaveData, setLeaveLeaveData] = useState({ startDate: '', endDate: '', type: 'annual', reason: '' });
  const [expenseData, setExpenseData] = useState({ amount: '', type: 'petty_cash', description: '', project: '' });
  const [reportData, setReportData] = useState({ title: '', content: '', hours: '8' });
  const [contactData, setContactData] = useState({ message: '', department: 'hr' });

  // Dynamic Features States
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaveReqs, setLeaveReqs] = useState<any[]>([]);
  const [cashReqs, setCashReqs] = useState<any[]>([]);
  const [perfStats, setPerfStats] = useState({ score: 100, absences: 0, lateDays: 0, status: 'ممتاز' });
  const [payrollData, setPayrollData] = useState({ base: 0, bonus: 0, deductions: 0, net: 0, isCalculated: false });

  // Fetch Dynamic Data
  useEffect(() => {
    if (!profile?.uid) return;

    // 1. Tasks
    const qTasks = query(collection(db, 'tasks'), where('assignedTo', '==', profile.uid));
    const unsubTasks = onSnapshot(qTasks, snap => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Leave Requests
    const qLeaves = query(collection(db, 'leave_requests'), where('employeeId', '==', profile.uid));
    const unsubLeaves = onSnapshot(qLeaves, snap => {
      setLeaveReqs(snap.docs.map(doc => ({ id: doc.id, _type: 'إجازة', ...doc.data() })));
    });

    // 3. Petty Cash Requests
    const qCash = query(collection(db, 'petty_cash_requests'), where('employeeId', '==', profile.uid));
    const unsubCash = onSnapshot(qCash, snap => {
      setCashReqs(snap.docs.map(doc => ({ id: doc.id, _type: 'عهدة/سلفة', ...doc.data() })));
    });

    // 4. Performance Score
    const fetchPerf = async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const attQ = query(collection(db, 'attendance'), where('userId', '==', profile.uid));
      const snap = await getDocs(attQ);
      const userAtt = snap.docs.map(d => d.data()).filter(a => new Date(a.date) >= sixtyDaysAgo);
      
      const presentDays = userAtt.filter(a => a.status === 'present').length;
      const lateDays = userAtt.filter(a => a.status === 'late').length;
      let score = (presentDays / 44) * 100;
      if (score > 100) score = 100;
      const absences = 44 - presentDays;
      
      let status = 'ممتاز';
      if (score < 50) status = 'ضعيف';
      else if (score < 75) status = 'يحتاج تحسين';
      else if (score < 90) status = 'جيد جداً';

      setPerfStats({ score: Math.round(score), absences: absences > 0 ? absences : 0, lateDays, status });
    };
    fetchPerf();

    // 5. Payroll Data
    const fetchPayroll = async () => {
      // Query adjustments for this user
      const q1 = query(collection(db, 'financialAdjustments'), where('workerId', '==', profile.uid), where('status', 'in', ['approved', 'applied', 'applied_manually']));
      const q2 = query(collection(db, 'financialAdjustments'), where('userId', '==', profile.uid), where('status', 'in', ['approved', 'applied', 'applied_manually']));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const adjsMap = new Map();
      snap1.docs.forEach(doc => adjsMap.set(doc.id, doc.data()));
      snap2.docs.forEach(doc => adjsMap.set(doc.id, doc.data()));
      const adjs = Array.from(adjsMap.values());

      const base = Number(profile.salary) || Number(profile.baseSalary) || 0;
      const bonus = adjs.filter(a => a.type === 'bonus').reduce((acc, curr) => acc + Number(curr.amount), 0);
      const deductions = adjs.filter(a => ['deduction', 'advance'].includes(a.type)).reduce((acc, curr) => acc + Number(curr.amount), 0);
      
      setPayrollData({ base, bonus, deductions, net: base + bonus - deductions, isCalculated: true });
    };
    fetchPayroll();

    return () => {
      unsubTasks();
      unsubLeaves();
      unsubCash();
    };
  }, [profile?.uid]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      toast.success('تم إنجاز المهمة بنجاح ✅');
    } catch (e) {
      toast.error('حدث خطأ أثناء تحديث المهمة');
    }
  };

  const allRequests = [...leaveReqs, ...cashReqs].sort((a, b) => {
    const da = a.createdAt?.seconds || 0;
    const dbTime = b.createdAt?.seconds || 0;
    return dbTime - da;
  }).slice(0, 5); // Last 5 requests

  // Synchronize Sticky Notes
  useEffect(() => {
    const updatePinned = () => {
      const saved = localStorage.getItem('smart_sticky_notes_v2');
      if (saved) {
        const notes = JSON.parse(saved);
        setPinnedNotes(notes.filter((n: any) => n.isPinned));
      } else {
        setPinnedNotes([]);
      }
    };
    updatePinned();
    window.addEventListener('sticky-notes-updated', updatePinned);
    return () => {
      window.removeEventListener('sticky-notes-updated', updatePinned);
    };
  }, []);

  // Glassmorphism and Theme Styles Helper
  const getGlassStyle = () => {
    switch (dashboardTheme) {
      case 'velvet':
        return "bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-950/20";
      case 'neon':
        return "bg-slate-900/80 backdrop-blur-xl border border-blue-500/20 shadow-2xl shadow-blue-950/30";
      case 'emerald':
        return "bg-emerald-950/40 dark:bg-emerald-950/60 backdrop-blur-xl border border-emerald-500/20 shadow-2xl shadow-emerald-950/20";
      default:
        return "bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/40 dark:shadow-none";
    }
  };

  const themeClasses = getGlassStyle();

  // Handlers
  // Fake attendance handlers removed.

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveData.startDate || !leaveData.endDate || !leaveData.reason) {
      toast.error('الرجاء إدخال جميع الحقول المطلوبة');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leave_requests'), {
        employeeId: profile?.uid || 'unknown',
        employeeName: profile?.name || 'موظف',
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        type: leaveData.type,
        reason: leaveData.reason,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('تم إرسال طلب الإجازة بنجاح ✈️', {
        description: 'بانتظار مراجعة واعتماد الإدارة للطلب'
      });
      setIsLeaveModalOpen(false);
      setLeaveLeaveData({ startDate: '', endDate: '', type: 'annual', reason: '' });
    } catch (err: any) {
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.amount || !expenseData.description) {
      toast.error('الرجاء إدخال المبلغ والوصف بالتفصيل');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'petty_cash_requests'), {
        employeeId: profile?.uid || 'unknown',
        employeeName: profile?.name || 'موظف',
        amount: parseFloat(expenseData.amount),
        type: expenseData.type,
        description: expenseData.description,
        project: expenseData.project || 'عام',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('تم رفع طلب العهدة / المصروف بنجاح 💰', {
        description: 'تم توجيه الطلب للمسؤول المالي للاعتماد'
      });
      setIsExpenseModalOpen(false);
      setExpenseData({ amount: '', type: 'petty_cash', description: '', project: '' });
    } catch (err: any) {
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportData.title || !reportData.content) {
      toast.error('الرجاء تعبئة عنوان ومحتوى التقرير اليومي');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'daily_reports'), {
        employeeId: profile?.uid || 'unknown',
        employeeName: profile?.name || 'موظف',
        title: reportData.title,
        content: reportData.content,
        hours: reportData.hours,
        createdAt: serverTimestamp()
      });
      toast.success('تم إرسال التقرير اليومي بنجاح 📑', {
        description: 'تم تسجيل إنجازك اليوم بنجاح ووضعه بملف المتابعة'
      });
      setIsReportModalOpen(false);
      setReportData({ title: '', content: '', hours: '8' });
    } catch (err: any) {
      toast.error('حدث خطأ أثناء رفع التقرير');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactData.message) {
      toast.error('الرجاء كتابة رسالتك قبل الإرسال');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'internal_messages'), {
        senderId: profile?.uid || 'unknown',
        senderName: profile?.name || 'موظف',
        message: contactData.message,
        department: contactData.department,
        status: 'unread',
        createdAt: serverTimestamp()
      });
      toast.success('تم إرسال رسالتك للإدارة بنجاح ✉️', {
        description: 'سيتم الرد عليك في أقرب وقت ممكن'
      });
      setIsContactModalOpen(false);
      setContactData({ message: '', department: 'hr' });
    } catch (err: any) {
      toast.error('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500 relative" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Background aesthetic decoration circles */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full blur-[90px] bg-indigo-500/20" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full blur-[110px] bg-rose-500/10" />
      </div>

      {/* Top Controls: Styling Theme Selector & Sticky Notes */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-3xl ${themeClasses} gap-4 relative z-20`}
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary animate-pulse" /> تخصيص وتنسيق بوابتي الرقمية
          </span>
        </div>

        {/* Theme presets and notes trigger */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-700/40">
            <button 
              onClick={() => setDashboardTheme('glass')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'glass' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              افتراضي
            </button>
            <button 
              onClick={() => setDashboardTheme('velvet')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'velvet' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/15' : 'text-slate-500'}`}
            >
              مخملي 💜
            </button>
            <button 
              onClick={() => setDashboardTheme('neon')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'neon' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' : 'text-slate-500'}`}
            >
              نيون 💙
            </button>
            <button 
              onClick={() => setDashboardTheme('emerald')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'emerald' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15' : 'text-slate-500'}`}
            >
              زمردي 💚
            </button>
          </div>

          <Button
            onClick={() => setIsNotesOpen(true)}
            className="h-10 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-2 shadow-lg shadow-amber-500/15 relative shrink-0"
          >
            <StickyNote className="w-4 h-4 text-slate-950" />
            الملاحظات اللاصقة 📌
            {pinnedNotes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white border-2 border-white text-[9px] flex items-center justify-center font-bold">
                {pinnedNotes.length}
              </span>
            )}
          </Button>
        </div>
      </motion.div>
      
      {/* Premium Glass Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-2xl border border-white/5"
      >
        {/* Background glowing effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <motion.div 
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.8 }}
            className="w-20 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0 shadow-lg"
          >
            <UserCircle className="w-14 h-14 text-slate-100" />
          </motion.div>
          
          <div className="text-center md:text-right space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black text-amber-300">
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              حساب موظف معتمد
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">مرحباً بك، {profile?.name || 'يا زميل'} 👋</h1>
            <p className="text-slate-300 font-bold text-sm">
              {profile?.jobTitle || 'موظف'} — <span className="text-primary-hover">{profile?.department || 'القسم العام'}</span>
            </p>
          </div>
          
          <div className="shrink-0">
            <div className="bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 px-5 py-2.5 rounded-2xl flex items-center gap-2.5 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-black text-xs">حالة الحضور التلقائي (GPS) نشط وبراق 📡</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Premium Actions Grid: Similar design to manager's */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            لوحة الأدوات والعمليات المباشرة
          </h3>
          <span className="text-[10px] text-slate-400 font-black">طراز مخصص فائق السرعة ⚡</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2 sm:col-span-3 lg:col-span-6 mb-4">
            <SmartAttendance />
          </div>
          <ActionBtn 
            icon={Calendar} 
            label="طلب إجازة" 
            color="bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black shadow-lg shadow-indigo-500/15" 
            onClick={() => setIsLeaveModalOpen(true)} 
          />
          <ActionBtn 
            icon={DollarSign} 
            label="سلفة / عهدة" 
            color="bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black shadow-lg shadow-amber-500/15" 
            onClick={() => setIsExpenseModalOpen(true)} 
          />
          <ActionBtn 
            icon={FilePlus} 
            label="التقرير اليومي" 
            color="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-black shadow-lg shadow-purple-500/15" 
            onClick={() => setIsReportModalOpen(true)} 
          />
          <ActionBtn 
            icon={MessageSquare} 
            label="مراسلة الإدارة" 
            color="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-950 dark:to-slate-900 border border-slate-700/30 text-white font-black shadow-lg shadow-slate-950/20" 
            onClick={() => setIsContactModalOpen(true)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 relative z-20">
        
        {/* Left Column: Tasks, Payroll, Performance */}
        <div className="space-y-4">
          
          {/* Performance & Payroll Banner */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl ${themeClasses} overflow-hidden p-6 relative`}
          >
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              الأداء والتقييم المالي
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">التقييم الشهري</span>
                <span className={`text-lg font-black ${perfStats.score >= 90 ? 'text-emerald-500' : perfStats.score >= 75 ? 'text-blue-500' : 'text-rose-500'}`}>
                  {perfStats.status}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">مؤشر الحضور: {perfStats.score}%</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">صافي الراتب المستحق</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {payrollData.isCalculated ? `${payrollData.net} ر.س` : <Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500" />}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  أساسي: {payrollData.base} | حوافز: {payrollData.bonus}
                </span>
              </div>
            </div>
            {payrollData.deductions > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-600">إجمالي الخصومات المسجلة هذا الشهر:</span>
                <span className="text-xs font-black text-rose-700">-{payrollData.deductions} ر.س</span>
              </div>
            )}
          </motion.div>

          {/* Tasks */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl ${themeClasses} overflow-hidden`}
          >
            <CardContent className="p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <CheckSquare className="w-5 h-5 text-orange-500" />
                أحدث المهام المطلوبة
              </h3>
              <div className="space-y-4">
                {tasks.filter(t => t.status !== 'completed').length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic text-xs font-bold">لا يوجد مهام نشطة حالياً</div>
                ) : (
                  tasks.filter(t => t.status !== 'completed').map(task => (
                    <div key={task.id} className="p-4.5 bg-slate-50/50 dark:bg-slate-800/25 rounded-2xl border border-slate-100/60 dark:border-slate-800/60 flex justify-between items-center group hover:border-orange-200/50 dark:hover:border-orange-950/40 transition-all">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm">{task.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{task.description}</p>
                        <p className="text-[9px] text-orange-500 font-bold mt-1">بواسطة: {task.createdByDetails?.name || 'المشرف'}</p>
                      </div>
                      <Button size="sm" onClick={() => handleCompleteTask(task.id)} className="rounded-xl h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-lg shadow-orange-500/10 shrink-0">
                        إنجاز المهمة
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </motion.div>
        </div>

        {/* Right Column: Requests, Documents */}
        <div className="space-y-4">
          
          {/* Documents Wallet */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl ${themeClasses} overflow-hidden`}
          >
            <CardContent className="p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Briefcase className="w-5 h-5 text-amber-500" />
                محفظة المستندات والصلاحيات
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 font-bold block">رقم الهوية / الإقامة</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{profile?.iqamaNumber || 'غير مسجل'}</span>
                  {profile?.iqamaExpiry && <span className="text-[9px] text-emerald-500 font-bold block mt-1">ينتهي في: {profile.iqamaExpiry}</span>}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 font-bold block">رخصة القيادة</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{profile?.drivingLicenseNumber || 'غير مسجل'}</span>
                  {profile?.drivingLicenseExpiry && <span className="text-[9px] text-amber-500 font-bold block mt-1">ينتهي في: {profile.drivingLicenseExpiry}</span>}
                </div>
              </div>
            </CardContent>
          </motion.div>

          {/* Attendance Log / Requests */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`rounded-3xl ${themeClasses} overflow-hidden`}
          >
            <CardContent className="p-6 md:p-8 space-y-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Clock className="w-5 h-5 text-blue-500" />
                متابعة حالة طلباتي
              </h3>
              <div className="space-y-4">
                {allRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 italic text-xs font-bold">لم تقم برفع أي طلبات مؤخراً</div>
                ) : (
                  allRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4.5 bg-slate-50/50 dark:bg-slate-800/25 rounded-2xl border border-slate-100/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-blue-100/60 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                          {req._type === 'إجازة' ? <Calendar className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-100 text-sm">طلب {req._type}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{req.reason || req.description}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        {req.status === 'pending' && <span className="font-black text-[10px] block text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">قيد المراجعة ⏳</span>}
                        {req.status === 'approved' && <span className="font-black text-[10px] block text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">معتمد ✅</span>}
                        {req.status === 'rejected' && <span className="font-black text-[10px] block text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">مرفوض ❌</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </motion.div>
        </div>

      </div>

      {/* --- ACTION DIALOGS --- */}

      {/* 1. Leave Request Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> تقديم طلب إجازة رسمي
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">تاريخ البدء</label>
                <input 
                  type="date" 
                  required
                  value={leaveData.startDate}
                  onChange={e => setLeaveLeaveData({...leaveData, startDate: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">تاريخ الانتهاء</label>
                <input 
                  type="date" 
                  required
                  value={leaveData.endDate}
                  onChange={e => setLeaveLeaveData({...leaveData, endDate: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">نوع الإجازة</label>
              <select
                value={leaveData.type}
                onChange={e => setLeaveLeaveData({...leaveData, type: e.target.value})}
                className="w-full text-xs font-black p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
              >
                <option value="annual">إجازة سنوية</option>
                <option value="sick">إجازة مرضية</option>
                <option value="emergency">إجازة اضطرارية</option>
                <option value="unpaid">إجازة بدون راتب</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">السبب والتفاصيل</label>
              <textarea 
                required
                placeholder="أذكر سبب تقديم طلب الإجازة هنا..."
                value={leaveData.reason}
                onChange={e => setLeaveLeaveData({...leaveData, reason: e.target.value})}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsLeaveModalOpen(false)} className="font-bold text-xs">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 rounded-xl">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تقديم الطلب'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Expense / Petty Cash Request Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" /> رفع طلب عهدة أو سلفة مالية
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4 mt-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">المبلغ المطلوب (ر.س)</label>
              <input 
                type="number" 
                required
                placeholder="مثال: 500"
                value={expenseData.amount}
                onChange={e => setExpenseData({...expenseData, amount: e.target.value})}
                className="w-full text-xs font-mono font-black p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">نوع الطلب</label>
              <select
                value={expenseData.type}
                onChange={e => setExpenseData({...expenseData, type: e.target.value})}
                className="w-full text-xs font-black p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
              >
                <option value="petty_cash">عهدة مالية لمشروع</option>
                <option value="salary_advance">سلفة على الراتب</option>
                <option value="compensation">طلب تعويض مصروفات</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">المشروع المستهدف (إن وجد)</label>
              <input 
                type="text" 
                placeholder="اسم المشروع الميداني..."
                value={expenseData.project}
                onChange={e => setExpenseData({...expenseData, project: e.target.value})}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">تفاصيل الصرف والوصف</label>
              <textarea 
                required
                placeholder="أذكر تفاصيل وسبب طلب هذا المبلغ المالي بوضوح..."
                value={expenseData.description}
                onChange={e => setExpenseData({...expenseData, description: e.target.value})}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsExpenseModalOpen(false)} className="font-bold text-xs">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-6 rounded-xl">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تقديم الطلب المالي'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Daily Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FilePlus className="w-5 h-5 text-purple-500" /> تقديم التقرير اليومي عن سير العمل
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportSubmit} className="space-y-4 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">عنوان التقرير</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: إنجاز أعمال الدهان"
                  value={reportData.title}
                  onChange={e => setReportData({...reportData, title: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 block">ساعات العمل الفعلية</label>
                <input 
                  type="number" 
                  required
                  value={reportData.hours}
                  onChange={e => setReportData({...reportData, hours: e.target.value})}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">تفاصيل الإنجاز والملاحظات</label>
              <textarea 
                required
                placeholder="أكتب تفصيلياً ما تم إنجازه خلال ساعات عملك اليوم والمشاكل التي واجهتها إن وجدت..."
                value={reportData.content}
                onChange={e => setReportData({...reportData, content: e.target.value})}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent min-h-[100px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsReportModalOpen(false)} className="font-bold text-xs">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-6 rounded-xl">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال التقرير اليومي'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Contact Management Modal */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" /> مراسلة الإدارة والطلب المباشر
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 mt-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">القسم الموجه له الرسالة</label>
              <select
                value={contactData.department}
                onChange={e => setContactData({...contactData, department: e.target.value})}
                className="w-full text-xs font-black p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent"
              >
                <option value="hr">الموارد البشرية (HR)</option>
                <option value="financial">الإدارة المالية</option>
                <option value="it">الدعم التقني والـ IT</option>
                <option value="ceo">الإدارة العامة مباشرة</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 block">نص الرسالة أو الطلب</label>
              <textarea 
                required
                placeholder="أكتب رسالتك أو استفسارك هنا بكل تفصيل..."
                value={contactData.message}
                onChange={e => setContactData({...contactData, message: e.target.value})}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent min-h-[100px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsContactModalOpen(false)} className="font-bold text-xs">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black text-xs px-6 rounded-xl">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال الرسالة للإدارة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Synchronized Pinned Sticky Notes Draggable Widgets on Screen */}
      <AnimatePresence>
        {!isNotesOpen && pinnedNotes.map(note => {
          const colors = [
            { id: 'amber', bg: 'bg-amber-100/90 dark:bg-amber-950/90', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100' },
            { id: 'rose', bg: 'bg-rose-100/90 dark:bg-rose-950/90', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-100' },
            { id: 'emerald', bg: 'bg-emerald-100/90 dark:bg-emerald-950/90', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-100' },
            { id: 'blue', bg: 'bg-blue-100/90 dark:bg-blue-950/90', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100' },
            { id: 'violet', bg: 'bg-violet-100/90 dark:bg-violet-950/90', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-900 dark:text-violet-100' }
          ];
          const scheme = colors.find(c => c.id === note.color) || colors[0];

          return (
            <motion.div
              key={`pinned-${note.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, x: note.pinnedX || 0, y: note.pinnedY || 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              drag
              dragMomentum={false}
              onDragEnd={(event, info) => {
                const saved = localStorage.getItem('smart_sticky_notes_v2');
                if (saved) {
                  const allNotes = JSON.parse(saved);
                  const updated = allNotes.map((n: any) => n.id === note.id ? { ...n, pinnedX: (n.pinnedX || 0) + info.offset.x, pinnedY: (n.pinnedY || 0) + info.offset.y } : n);
                  localStorage.setItem('smart_sticky_notes_v2', JSON.stringify(updated));
                  window.dispatchEvent(new Event('sticky-notes-updated'));
                }
              }}
              className={`fixed top-32 left-8 z-[60] w-64 p-4 rounded-3xl shadow-2xl border backdrop-blur-md cursor-grab active:cursor-grabbing ${scheme.bg} ${scheme.border} ${scheme.text}`}
            >
              <div className="flex items-center justify-between border-b border-slate-900/10 dark:border-white/10 pb-2 mb-2 pointer-events-none">
                <span className="text-[10px] font-black tracking-widest flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-current text-rose-500" />
                  ملاحظة مثبتة
                </span>
                <span className="text-[9px] font-bold opacity-60">اسحب للتحريك</span>
              </div>
              <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{note.content || "ملاحظة فارغة..."}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Sticky Notes Sidebar Manager Drawer */}
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full sm:w-[450px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[90] flex flex-col"
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

