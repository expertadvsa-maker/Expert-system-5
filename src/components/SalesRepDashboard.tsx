import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Quotation, Transaction, BankAccount } from '../types';
import SmartOfferBot from './SmartOfferBot';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Share2,
  FileDown,
  Eye,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Wallet,
  Briefcase,
  ArrowRight,
  ArrowUpLeft,
  ChevronLeft,
  Activity,
  User,
  Zap,
  ShieldCheck,
  StickyNote,
  Trash2,
  Pin,
  BellRing,
  Plus,
  X,
  Palette,
  LayoutGrid,
  GripVertical,
  Calculator,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

function fmtNum(n: number): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function CircleRing({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const dash = (clamped / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(241, 245, 249, 0.1)" strokeWidth={4} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

interface SalesRepDashboardProps {
  subPage?: 'dashboard' | 'bot' | 'documents' | 'statement';
  onNavigate?: (tab: string) => void;
}

export default function SalesRepDashboard({ subPage = 'dashboard', onNavigate }: SalesRepDashboardProps) {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [activePrivateJobsCount, setActivePrivateJobsCount] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Quotation | null>(null);
  const [docFilter, setDocFilter] = useState<'all' | 'quotation' | 'invoice'>('all');

  // Sticky Notes and Customization States
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);
  const [dashboardTheme, setDashboardTheme] = useState<'glass' | 'velvet' | 'neon' | 'emerald'>('glass');

  // Smart Multi-services States (Calculator & Specialized Rep Reports)
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [isRepReportsOpen, setIsRepReportsOpen] = useState(false);
  const [reportRange, setReportRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // New states for the Sales Representative Smart Reports Engine
  const [repReportSubject, setRepReportSubject] = useState<'projects' | 'clients' | 'financials'>('projects');
  const [repReportTarget, setRepReportTarget] = useState<string>('all');
  const [repReportStartDate, setRepReportStartDate] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  );
  const [repReportEndDate, setRepReportEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [repIncludeCharts, setRepIncludeCharts] = useState(true);
  const [repIncludeFinance, setRepIncludeFinance] = useState(true);
  const [repAiAnalysis, setRepAiAnalysis] = useState(true);
  const [repDetailedBreakdown, setRepDetailedBreakdown] = useState(false);
  const [repGeneratedReport, setRepGeneratedReport] = useState<any | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [archivedReports, setArchivedReports] = useState<any[]>([]);

  useEffect(() => {
    if (isRepReportsOpen) {
      const saved = localStorage.getItem('smart_rep_reports_archive');
      if (saved) {
        setArchivedReports(JSON.parse(saved));
      }
    }
  }, [isRepReportsOpen]);



  useEffect(() => {
    if (!profile) return;

    // Fetch quotations
    const unsubQuotes = onSnapshot(
      query(collection(db, 'quotations'), where('salesRepId', '==', profile.uid)),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data(), docType: 'quotation' } as Quotation));
        setQuotations(prev => {
          const rest = prev.filter(q => q.docType !== 'quotation');
          return [...items, ...rest].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });
        });
      }
    );

    // Fetch invoices
    const unsubInvoices = onSnapshot(
      query(collection(db, 'invoices'), where('salesRepId', '==', profile.uid)),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data(), docType: 'invoice' } as Quotation));
        setQuotations(prev => {
          const rest = prev.filter(q => q.docType !== 'invoice');
          return [...items, ...rest].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });
        });
      }
    );

    // Fetch transactions
    const unsubTx = onSnapshot(
      query(collection(db, 'transactions'), where('salesRepId', '==', profile.uid)),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        items.sort((a, b) => {
          const dateA = a.date?.seconds || 0;
          const dateB = b.date?.seconds || 0;
          return dateB - dateA;
        });
        setTransactions(items);
      }
    );

    // Fetch bank accounts
    const unsubAccounts = onSnapshot(collection(db, 'bankAccounts'), (snapshot) => {
      setBankAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    });

    // Fetch active private jobs count
    const unsubJobs = onSnapshot(
      query(collection(db, 'rep_private_jobs'), where('salesRepId', '==', profile.uid), where('status', '==', 'active')),
      (snap) => {
        setActivePrivateJobsCount(snap.docs.length);
      }
    );

    return () => { 
      unsubQuotes(); 
      unsubInvoices();
      unsubTx(); 
      unsubAccounts();
      unsubJobs();
    };
  }, [profile]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-rose-400" />;
      default: return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'معتمد';
      case 'rejected': return 'مرفوض';
      default: return 'بانتظار الموافقة ⏳';
    }
  };

  const handleShareWhatsApp = (q: Quotation) => {
    const label = q.docType === 'quotation' ? 'عرض السعر' : 'الفاتورة';
    const text = `السلام عليكم ورحمة الله وبركاته،\n\nأهلاً بك أخي الكريم.\n\nمرفق ${label} رقم *${q.docNumber || '—'}* بقيمة *${q.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س* شاملاً ضريبة القيمة المضافة.${q.pdfUrl ? `\n\nيمكنك الاطلاع عليه من الرابط:\n${q.pdfUrl}` : ''}\n\nشكراً لتعاملكم معنا.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredDocs = quotations.filter(q => {
    if (docFilter === 'all') return true;
    return q.docType === docFilter;
  });

  const approvedDocs = quotations.filter(q => q.status === 'approved');
  const totalSales = approvedDocs.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const approvedInvoices = approvedDocs.filter(q => q.docType === 'invoice');
  const approvedInvoicesTotal = approvedInvoices.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const approvedQuotes = approvedDocs.filter(q => q.docType === 'quotation');
  const approvedQuotesTotal = approvedQuotes.reduce((s, q) => s + (q.totalAmount || 0), 0);

  const repShare = totalSales * 0.85; 
  const repShareFromInvoices = approvedInvoicesTotal * 0.85;
  const repShareFromQuotes = approvedQuotesTotal * 0.85;
  const companyShare = totalSales * 0.15; 
  
  const approvedPayouts = transactions.filter(t => t.type === 'expense' && t.status === 'approved');
  const totalPaid = approvedPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

  const pendingPayouts = transactions.filter(t => t.type === 'expense' && (t.status === 'pending' || !t.status));
  const totalPendingPayouts = pendingPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

  const rejectedPayouts = transactions.filter(t => t.type === 'expense' && t.status === 'rejected');
  const totalRejectedPayouts = rejectedPayouts.reduce((sum, t) => sum + (t.amount || 0), 0);

  const remainingBalance = repShare - totalPaid;

  const pendingDocs = quotations.filter(q => q.status === 'pending' || q.status === 'draft' || !q.status || q.status === '');
  const totalPendingSales = pendingDocs.reduce((s, q) => s + (q.totalAmount || 0), 0);
  const pendingInvoicesCount = pendingDocs.filter(q => q.docType === 'invoice').length;
  const pendingQuotesCount = pendingDocs.filter(q => q.docType === 'quotation').length;
  const pendingRepShare = totalPendingSales * 0.85;
  const companySharePending = totalPendingSales * 0.15;

  const getAccountName = (accountId?: string) => {
    if (!accountId) return '—';
    const acc = bankAccounts.find(b => b.id === accountId);
    return acc ? acc.name : '—';
  };

  // Glassmorphism and Theme Styles Helper
  const getGlassStyle = () => {
    switch (dashboardTheme) {
      case 'velvet':
        return "bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-950/20";
      case 'neon':
        return "bg-slate-900/80 backdrop-blur-xl border border-blue-500/20 shadow-2xl shadow-blue-950/30";
      case 'emerald':
        return "bg-emerald-950/40 dark:bg-emerald-950/60 backdrop-blur-xl border border-emerald-500/20 shadow-2xl";
      default:
        return "bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/40 dark:shadow-none";
    }
  };

  const themeClasses = getGlassStyle();

  return (
    <div className="p-4 md:p-6 w-full space-y-6 relative overflow-hidden min-h-screen" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Background aesthetic decor matching the Theme */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-[100px] bg-primary/20" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[130px] bg-purple-500/10" />
      </div>

      {/* ── Ultra-compact, premium Top Controls Bar ── */}
      <div className="flex items-center justify-between gap-4 relative z-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-3 rounded-[1.5rem] border border-slate-200/30 dark:border-slate-800/30">
        <div>
          {subPage !== 'dashboard' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('rep_dashboard')}
              className="gap-2 text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-black hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl px-4 h-10 transition-all bg-white/60 dark:bg-slate-900/60"
            >
              <ArrowRight className="w-4 h-4 text-primary" /> العودة للوحة التحكم الرئيسية
            </Button>
          ) : (
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 flex items-center gap-2 pr-2">
              <LayoutGrid className="w-3.5 h-3.5" /> لوحة المندوب
            </span>
          )}
        </div>

        {/* Multi-services Dropdown */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/95 hover:to-accent/95 text-white font-black text-xs gap-2 shadow-lg shadow-primary/10 shrink-0"
              >
                <span>الخدمات المساندة الذكية</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5 border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-xl text-right z-[100]" dir="rtl">
              <div className="font-black text-[10px] text-slate-400 dark:text-slate-500 pr-3 py-2">بوابة الخدمات والأدوات</div>
              
              <DropdownMenuItem 
                className="rounded-xl font-bold text-xs py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-900 cursor-pointer flex items-center justify-between"
                onClick={() => setIsNotesOpen(true)}
              >
                <div className="flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <span>الملاحظات اللاصقة</span>
                </div>
                {pinnedNotes.length > 0 && (
                  <span className="bg-rose-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                    {pinnedNotes.length}
                  </span>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-900" />

              <DropdownMenuItem 
                className="rounded-xl font-bold text-xs py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-900 cursor-pointer flex items-center gap-2"
                onClick={() => setIsCalculatorOpen(true)}
              >
                <Calculator className="w-4 h-4 text-emerald-500" />
                <span>الحاسبة المالية الذكية</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-900" />

              <DropdownMenuItem 
                className="rounded-xl font-bold text-xs py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-900 cursor-pointer flex items-center gap-2"
                onClick={() => setIsRepReportsOpen(true)}
              >
                <TrendingUp className="w-4 h-4 text-violet-500" />
                <span>أداة تقارير المندوب المخصصة</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* === DASHBOARD HOME VIEW === */}
      {subPage === 'dashboard' && (
        <div className="space-y-6 relative z-10">
          
          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Approved Sales Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate?.('rep_documents')}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 cursor-pointer relative overflow-hidden transition-all flex items-center justify-between"
            >
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المبيعات المعتمدة</p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono leading-none">
                  {fmtNum(totalSales)} <span className="text-[10px] font-normal text-slate-400">ر.س</span>
                </h3>
                <div className="flex gap-2 text-[9px] font-bold text-slate-500">
                  <span>عروض: {fmtNum(approvedQuotesTotal)}</span>
                  <span>•</span>
                  <span>فواتير: {fmtNum(approvedInvoicesTotal)}</span>
                </div>
              </div>
              <div className="relative shrink-0 flex items-center justify-center">
                <CircleRing pct={Math.min(100, Math.round((totalSales / 100000) * 100))} color="#0d9488" size={60} />
                <span className="absolute text-[10px] font-mono font-black text-teal-600 dark:text-teal-400">
                  {Math.round((totalSales / 100000) * 100)}%
                </span>
              </div>
            </motion.div>

            {/* 2. Rep Net Commissions Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate?.('rep_statement')}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 cursor-pointer relative overflow-hidden transition-all flex items-center justify-between"
            >
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">صافي العمولات المستحقة</p>
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none">
                  {fmtNum(remainingBalance)} <span className="text-[10px] font-normal text-slate-400">ر.س</span>
                </h3>
                <div className="flex gap-2 text-[9px] font-bold text-slate-500">
                  <span>مستلم: {fmtNum(totalPaid)}</span>
                  <span>•</span>
                  <span>كلي: {fmtNum(repShare)}</span>
                </div>
              </div>
              <div className="relative shrink-0 flex items-center justify-center">
                <CircleRing pct={repShare > 0 ? Math.min(100, Math.round((totalPaid / repShare) * 100)) : 0} color="#059669" size={60} />
                <span className="absolute text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {repShare > 0 ? Math.round((totalPaid / repShare) * 100) : 0}%
                </span>
              </div>
            </motion.div>

            {/* 3. Offer Conversion Rate Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate?.('rep_documents')}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 cursor-pointer relative overflow-hidden transition-all flex items-center justify-between"
            >
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معدل تحويل الصفقات</p>
                <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none">
                  {Math.round((approvedDocs.length / Math.max(1, quotations.length)) * 100)}%
                </h3>
                <div className="flex gap-2 text-[9px] font-bold text-slate-500">
                  <span>معتمد: {approvedDocs.length}</span>
                  <span>•</span>
                  <span>إجمالي: {quotations.length}</span>
                </div>
              </div>
              <div className="relative shrink-0 flex items-center justify-center">
                <CircleRing pct={Math.round((approvedDocs.length / Math.max(1, quotations.length)) * 100)} color="#4f46e5" size={60} />
                <span className="absolute text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {Math.round((approvedDocs.length / Math.max(1, quotations.length)) * 100)}%
                </span>
              </div>
            </motion.div>

            {/* 4. Active Projects Card */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onNavigate?.('private_jobs_page')}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/60 cursor-pointer relative overflow-hidden transition-all flex items-center justify-between"
            >
              <div className="space-y-2 text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المشاريع والمقاولات النشطة</p>
                <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono leading-none">
                  {activePrivateJobsCount} <span className="text-[10px] font-normal text-slate-400">مشاريع</span>
                </h3>
                <div className="flex gap-2 text-[9px] font-bold text-slate-500">
                  <span>معلق تحت المراجعة: {fmtNum(totalPendingSales)} ر.س</span>
                </div>
              </div>
              <div className="relative shrink-0 flex items-center justify-center">
                <CircleRing pct={activePrivateJobsCount > 0 ? 100 : 0} color="#d97706" size={60} />
                <span className="absolute text-[10px] font-mono font-black text-amber-600 dark:text-amber-400">
                  {activePrivateJobsCount > 0 ? 100 : 0}%
                </span>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions Grid (Manager-style Action Buttons) */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 p-5 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
              الوصول السريع والإجراءات
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar-y no-scrollbar">
              <button
                onClick={() => onNavigate?.('rep_smart_bot')}
                className="flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all active:scale-95 min-w-[100px] bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                المساعد (ألف ياء)
              </button>
              <button
                onClick={() => onNavigate?.('rep_documents')}
                className="flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all active:scale-95 min-w-[100px] bg-teal-600 text-white"
              >
                <FileText className="w-5 h-5" />
                سجل الوثائق
              </button>
              <button
                onClick={() => onNavigate?.('rep_statement')}
                className="flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all active:scale-95 min-w-[100px] bg-blue-600 text-white"
              >
                <Wallet className="w-5 h-5" />
                كشف الحساب
              </button>
              <button
                onClick={() => onNavigate?.('private_jobs_page')}
                className="flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all active:scale-95 min-w-[100px] bg-amber-500 text-slate-950"
              >
                <Briefcase className="w-5 h-5" />
                المقاولات الخاصة
              </button>
            </div>
          </div>

          {/* Recent Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Recent Documents Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] ${themeClasses} overflow-hidden`}
            >
              <CardHeader className="pb-3 border-b border-slate-100/50 dark:border-slate-800/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-teal-500" /> أحدث الوثائق الصادرة
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate?.('rep_documents')}
                  className="text-[10px] text-primary hover:text-primary-hover font-black h-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2.5"
                >
                  عرض الكل
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {quotations.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-slate-400 font-bold">لا توجد وثائق صادرة حالياً</p>
                ) : (
                  <div className="space-y-2.5">
                    {quotations.slice(0, 3).map(q => (
                      <div key={q.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl text-[11px] font-bold border border-slate-100/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 dark:text-slate-200 block">{q.clientName}</span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {q.docType === 'invoice' ? 'فاتورة' : 'عرض سعر'} {q.docNumber ? `#${q.docNumber}` : ''}
                          </span>
                        </div>
                        <div className="text-left space-y-0.5">
                          <span className="text-primary font-black block">{q.totalAmount?.toLocaleString('en-US')} ر.س</span>
                          <span className={`text-[9px] flex items-center gap-1 justify-end ${q.status === 'approved' ? 'text-emerald-500' : q.status === 'rejected' ? 'text-rose-500' : 'text-amber-500'}`}>
                            {getStatusIcon(q.status)}
                            {getStatusText(q.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>

            {/* Recent Transactions Card */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] ${themeClasses} overflow-hidden`}
            >
              <CardHeader className="pb-3 border-b border-slate-100/50 dark:border-slate-800/50 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-blue-500 animate-pulse" /> أحدث الحركات المالية
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onNavigate?.('rep_statement')}
                  className="text-[10px] text-primary hover:text-primary-hover font-black h-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2.5"
                >
                  عرض الكل
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                {transactions.length === 0 ? (
                  <p className="text-center py-8 text-[11px] text-slate-400 font-bold">لا توجد حركات مالية مسجلة</p>
                ) : (
                  <div className="space-y-2.5">
                    {transactions.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl text-[11px] font-bold border border-slate-100/50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 dark:text-slate-200 block">{t.category || 'دفعة مالية'}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{t.description}</span>
                        </div>
                        <div className="text-left space-y-0.5">
                          <span className={`block font-black ${t.type === 'income' ? 'text-green-500' : 'text-rose-500'}`}>
                            {t.type === 'income' ? '+' : '-'}{t.amount?.toLocaleString('en-US')} ر.س
                          </span>
                          <span className="text-[9px] text-slate-400 font-normal">{t.date?.seconds ? new Date(t.date.seconds * 1000).toLocaleDateString('en-US') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>

          </div>

        </div>
      )}

      {/* Financial Summary Cards (Show ONLY on Statement and Documents Pages) */}
      {(subPage === 'statement' || subPage === 'documents') && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
        >
          {/* Total Sales Card */}
          <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 border border-white/5 shadow-xl flex justify-between items-center group">
            <div className="space-y-1.5 relative z-10">
              <p className="text-[10px] font-black text-slate-400">إجمالي المبيعات المعتمدة</p>
              <h3 className="text-xl font-black font-mono tracking-tight">{totalSales.toLocaleString('en-US')} <span className="text-xs font-normal">ر.س</span></h3>
              <p className="text-[9px] text-slate-400 font-bold">الفواتير والعروض المعتمدة</p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-teal-300" />
            </div>
          </div>

          {/* Rep Share Card */}
          <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-5 border border-white/5 shadow-xl flex justify-between items-center group">
            <div className="space-y-1.5 relative z-10">
              <p className="text-[10px] font-black text-emerald-100">مستحقاتي له (85%)</p>
              <h3 className="text-xl font-black font-mono tracking-tight">{repShare.toLocaleString('en-US')} <span className="text-xs font-normal">ر.س</span></h3>
              <p className="text-[9px] text-emerald-200 font-bold">خصم 15% عمولة للمؤسسة</p>
            </div>
            <div className="bg-white/15 p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Paid Card */}
          <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 border border-white/5 shadow-xl flex justify-between items-center group">
            <div className="space-y-1.5 relative z-10">
              <p className="text-[10px] font-black text-amber-950">المدفوع لي عليه</p>
              <h3 className="text-xl font-black font-mono tracking-tight">{totalPaid.toLocaleString('en-US')} <span className="text-xs font-normal">ر.س</span></h3>
              <p className="text-[9px] text-amber-950/80 font-bold">إجمالي الدفعات المستلمة</p>
            </div>
            <div className="bg-white/15 p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="w-5 h-5 text-slate-950" />
            </div>
          </div>

          {/* Net Remaining Balance Card */}
          <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white p-5 border border-white/5 shadow-xl flex justify-between items-center group">
            <div className="space-y-1.5 relative z-10">
              <p className="text-[10px] font-black text-blue-100">صافي المستحق للمندوب</p>
              <h3 className="text-xl font-black font-mono tracking-tight">{remainingBalance.toLocaleString('en-US')} <span className="text-xs font-normal">ر.س</span></h3>
              <p className="text-[9px] text-blue-200 font-bold">جاهز للدفع الفوري</p>
            </div>
            <div className="bg-white/15 p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Pages Content Switcher */}
      <div className="w-full relative z-10">
        {subPage === 'bot' && (
          <div className="space-y-6">
            <SmartOfferBot />
          </div>
        )}

        {subPage === 'documents' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-3xl ${themeClasses} p-4 md:p-6`}>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-500" />
                    سجل وثائقي الصادرة
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">تابع حالة عروض الأسعار والفواتير وأرسلها لعملائك بنقرة زر</p>
                </div>

                <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl self-start lg:self-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDocFilter('all')}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${docFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    الكل ({quotations.length})
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDocFilter('quotation')}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${docFilter === 'quotation' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    عروض أسعار ({quotations.filter(q => q.docType === 'quotation').length})
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDocFilter('invoice')}
                    className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${docFilter === 'invoice' ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    فواتير ({quotations.filter(q => q.docType === 'invoice').length})
                  </Button>
                </div>
              </div>

              <div className="pt-6">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-3">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="font-black text-sm">لا توجد وثائق مطابقة للفلاتر الحالية</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">استخدم المساعد الذكي (ألف ياء) لإنشاء عروض أسعار وفواتير بضغطة زر وبثوانٍ قليلة.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredDocs.map(q => (
                      <motion.div 
                        key={q.id} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col lg:flex-row lg:items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[1.8rem] border border-slate-100/60 dark:border-slate-800/60 transition-all gap-4"
                      >
                        
                        <div className="flex-1 min-w-0 flex items-start gap-4">
                          <div className="mt-1">
                            {q.docType === 'invoice' ? (
                              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30 shadow-none font-black text-[10px] px-3 py-1 rounded-lg">فاتورة</Badge>
                            ) : (
                              <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/30 shadow-none font-black text-[10px] px-3 py-1 rounded-lg">عرض سعر</Badge>
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{q.clientName}</h4>
                              <span className="text-[10px] text-slate-400 font-black bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                {q.docNumber ? `#${q.docNumber}` : '—'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs md:max-w-xl font-medium">{q.items}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 border-t lg:border-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                          <div className="text-right shrink-0">
                            <p className="font-black text-primary text-sm">{q.totalAmount?.toLocaleString('en-US')} ر.س</p>
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              {getStatusIcon(q.status)}
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{getStatusText(q.status)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => setSelectedDoc(q)}
                              className="w-9 h-9 rounded-xl hover:text-primary hover:border-primary/30 transition-all"
                              title="تفاصيل البنود"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </Button>
                            
                            {q.pdfUrl && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => window.open(q.pdfUrl, '_blank')}
                                  className="w-9 h-9 rounded-xl hover:text-teal-600 hover:border-teal-300 dark:hover:text-teal-400 transition-all"
                                  title="تحميل PDF"
                                >
                                  <FileDown className="w-4.5 h-4.5" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  onClick={() => handleShareWhatsApp(q)}
                                  className="w-9 h-9 rounded-xl hover:text-green-600 hover:border-green-300 dark:hover:text-green-400 transition-all"
                                  title="مشاركة عبر واتساب"
                                >
                                  <Share2 className="w-4.5 h-4.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {subPage === 'statement' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className={`rounded-3xl ${themeClasses} p-4 md:p-6`}>
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    كشف حسابي التشغيلي والرسمي
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">جدول تفصيلي بكامل الدفعات المحولة من المؤسسة وعمولات المبيعات</p>
                </div>
              </div>

              <div className="pt-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 space-y-3">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Wallet className="w-8 h-8" />
                    </div>
                    <p className="font-black text-sm">لا توجد حركات مالية مسجلة بعد</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">سيتم عرض كشف كامل بحركات الدفع والمستحقات فور تحويلها واعتمادها من الإدارة.</p>
                  </div>
                ) : (
                  <div className="border border-slate-100/70 dark:border-slate-800/70 rounded-2xl overflow-hidden shadow-inner bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400 font-black text-[10px]">
                            <th className="p-4">البيان والتفاصيل</th>
                            <th className="p-4">طريقة الدفع</th>
                            <th className="p-4">الحساب الصادر</th>
                            <th className="p-4 text-center">التاريخ</th>
                            <th className="p-4 text-left">المبلغ</th>
                            <th className="p-4 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="p-4">
                                <p className="font-black text-slate-800 dark:text-slate-200">{tx.category || 'دفعة مالية'}</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{tx.description}</p>
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">
                                {tx.paymentMethod === 'transfer' ? 'تحويل بنكي' : 'نقداً'}
                              </td>
                              <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">
                                {getAccountName(tx.bankAccountId)}
                              </td>
                              <td className="p-4 text-center text-slate-500 dark:text-slate-400 font-medium font-mono">
                                {tx.date?.seconds 
                                  ? new Date(tx.date.seconds * 1000).toLocaleDateString('en-US')
                                  : '—'
                                }
                              </td>
                              <td className={`p-4 text-left font-black font-mono text-sm ${tx.type === 'income' ? 'text-green-500' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'}{(tx.amount || 0).toLocaleString('en-US')} ر.س
                              </td>
                              <td className="p-4 text-center">
                                <Badge className={`border-none shadow-none font-black text-[9px] px-2.5 py-0.5 rounded-lg ${
                                  tx.status === 'approved' 
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                    : tx.status === 'rejected' 
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                }`}>
                                  {getStatusText(tx.status || 'approved')}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Document Details Modal */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="sm:max-w-3xl w-full rounded-[2.5rem] p-6 text-right border border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl" dir="rtl">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <DialogTitle className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              تفاصيل {selectedDoc?.docType === 'invoice' ? 'الفاتورة المالية' : 'عرض السعر الرسمي'}
            </DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-5 font-bold text-xs" style={{ fontFamily: "'Cairo', sans-serif" }}>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                <div>
                  <span className="text-slate-400 text-[10px] block mb-0.5">العميل المستفيد</span>
                  <span className="text-slate-800 dark:text-slate-100 font-black">{selectedDoc.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block mb-0.5">رقم المستند</span>
                  <span className="text-slate-800 dark:text-slate-100 font-black font-mono">{selectedDoc.docNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block mb-0.5">المبلغ الإجمالي</span>
                  <span className="text-primary dark:text-primary-hover font-black text-sm font-mono">{selectedDoc.totalAmount?.toLocaleString('en-US')} ر.س</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block mb-0.5">حالة الاعتماد</span>
                  <span className="inline-flex items-center gap-1.5 mt-1">
                    {getStatusIcon(selectedDoc.status)}
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">{getStatusText(selectedDoc.status)}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-slate-800 dark:text-slate-100 font-black block text-xs">بنود وتفاصيل المستند</span>
                {selectedDoc.itemsDetail && selectedDoc.itemsDetail.length > 0 ? (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-900/10">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/50 dark:border-slate-800/50 text-slate-500 dark:text-slate-400 font-black text-[10px]">
                          <th className="p-3">البند</th>
                          <th className="p-3 text-center">الكمية</th>
                          <th className="p-3 text-left">السعر</th>
                          <th className="p-3 text-left">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDoc.itemsDetail.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-100/30 dark:hover:bg-slate-800/20">
                            <td className="p-3">
                              <p className="font-black text-slate-800 dark:text-slate-200">{item.name}</p>
                              {item.desc && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">{item.desc}</p>}
                            </td>
                            <td className="p-3 text-center text-slate-600 dark:text-slate-300 font-mono font-bold">{item.qty}</td>
                            <td className="p-3 text-left text-slate-600 dark:text-slate-300 font-mono font-bold">{(item.price || 0).toLocaleString('en-US')} ر.س</td>
                            <td className="p-3 text-left text-primary dark:text-primary-hover font-black font-mono">{((item.qty || 1) * (item.price || 0)).toLocaleString('en-US')} ر.س</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                    <p className="text-slate-500 text-[10px] font-bold mb-1.5">تم إنشاء هذا المستند بنص إجمالي:</p>
                    <p className="text-slate-800 dark:text-slate-200 font-black leading-relaxed text-xs">{selectedDoc.items}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {selectedDoc.pdfUrl && (
                  <>
                    <Button 
                      className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 font-black gap-2 transition-all shadow-lg shadow-teal-600/10"
                      onClick={() => window.open(selectedDoc.pdfUrl, '_blank')}
                    >
                      <FileDown className="w-4 h-4" /> تحميل المستند رسمي (PDF)
                    </Button>
                    <Button 
                      variant="outline"
                      className="rounded-xl h-11 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/40 dark:text-green-400 dark:hover:bg-green-950/20 font-black gap-2 px-4 transition-all"
                      onClick={() => handleShareWhatsApp(selectedDoc)}
                    >
                      <Share2 className="w-4 h-4" /> مشاركة واتساب
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  className="rounded-xl h-11 px-5 text-slate-500 dark:text-slate-400 font-bold transition-all"
                  onClick={() => setSelectedDoc(null)}
                >
                  إغلاق
                </Button>
              </div>

            </div>
          )}
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

      {/* ── Smart Calculator Modal ── */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="w-[95vw] sm:!max-w-[400px] p-6 bg-slate-900 text-white rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col text-right font-sans" dir="rtl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-white">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>الحاسبة المالية للمندوب</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold mt-1">
              حسابات سريعة واقتطاع عمولات المبيعات الذاتية
            </DialogDescription>
          </DialogHeader>

          {/* Calculator Screen */}
          <div className="bg-slate-950 p-4 rounded-2xl mb-4 text-left font-mono border border-slate-800/60 min-h-[85px] flex flex-col justify-between">
            <div className="text-slate-400 text-xs font-bold text-right min-h-[16px] break-all">{calcInput || "0"}</div>
            <div className="text-2xl font-black text-emerald-400 text-right break-all mt-1">{calcResult || "0"}</div>
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* Row: Comm & Tax helpers */}
            <Button
              onClick={() => {
                const baseVal = parseFloat(calcResult || calcInput || "0");
                if (!isNaN(baseVal)) {
                  setCalcInput(`85% من (${baseVal})`);
                  setCalcResult((baseVal * 0.85).toFixed(2));
                }
              }}
              className="col-span-2 h-10 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-500/20 hover:bg-violet-600/40 text-xs font-black"
            >
              عمولتي (85%)
            </Button>
            <Button
              onClick={() => {
                const baseVal = parseFloat(calcResult || calcInput || "0");
                if (!isNaN(baseVal)) {
                  setCalcInput(`15% شركة من (${baseVal})`);
                  setCalcResult((baseVal * 0.15).toFixed(2));
                }
              }}
              className="col-span-2 h-10 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-500/20 hover:bg-blue-600/40 text-xs font-black"
            >
              حصة الشركة (15%)
            </Button>

            {/* Basic Keys */}
            {['C', '(', ')', '/'].map(k => (
              <Button
                key={k}
                onClick={() => {
                  if (k === 'C') {
                    setCalcInput('');
                    setCalcResult('');
                  } else {
                    setCalcInput(prev => prev + k);
                  }
                }}
                className={`h-11 rounded-xl font-black text-sm ${k === 'C' ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {k}
              </Button>
            ))}

            {['7', '8', '9', '*'].map(k => (
              <Button
                key={k}
                onClick={() => setCalcInput(prev => prev + k)}
                className={`h-11 rounded-xl font-black text-sm ${k === '*' ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {k === '*' ? '×' : k}
              </Button>
            ))}

            {['4', '5', '6', '-'].map(k => (
              <Button
                key={k}
                onClick={() => setCalcInput(prev => prev + k)}
                className={`h-11 rounded-xl font-black text-sm ${k === '-' ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {k}
              </Button>
            ))}

            {['1', '2', '3', '+'].map(k => (
              <Button
                key={k}
                onClick={() => setCalcInput(prev => prev + k)}
                className={`h-11 rounded-xl font-black text-sm ${k === '+' ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
              >
                {k}
              </Button>
            ))}

            {/* Zero, Dot, Equal */}
            <Button
              onClick={() => setCalcInput(prev => prev + '0')}
              className="col-span-2 h-11 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-black text-sm"
            >
              0
            </Button>
            <Button
              onClick={() => setCalcInput(prev => prev + '.')}
              className="h-11 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-black text-sm"
            >
              .
            </Button>
            <Button
              onClick={() => {
                try {
                  const safeStr = calcInput.replace(/[^0-9+\-*/().]/g, '');
                  const res = Function(`"use strict"; return (${safeStr})`)();
                  if (res !== undefined) {
                    setCalcResult(String(res));
                  }
                } catch {
                  setCalcResult('خطأ');
                }
              }}
              className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm"
            >
              =
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Specialized Rep Reporting Tool Modal (Smart Reports Engine) ── */}
      <Dialog open={isRepReportsOpen} onOpenChange={setIsRepReportsOpen}>
        <DialogContent style={{ width: '95vw', maxWidth: '1050px', height: '88vh' }} className="rep-reports-dialog-content p-0 overflow-hidden bg-slate-50 flex flex-col rounded-[2.5rem] border-0 shadow-2xl text-right" dir="rtl">

          {/* Header Area */}
          <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between sticky top-0 z-20 print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-slate-800">محرك التقارير الذكي</h2>
                  <Badge className="bg-violet-50 text-violet-600 border border-violet-100 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                    إصدار متقدم
                  </Badge>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-1">توليد وتحليل التقارير الذكية والمقيدة بحسابك فقط كمندوب</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {repGeneratedReport && (
                <Button onClick={() => window.print()} className="rounded-xl h-10 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs gap-1.5 text-white">
                  <FileText className="w-4 h-4" /> طباعة وتحميل التقرير
                </Button>
              )}
              <Button onClick={() => setIsRepReportsOpen(false)} variant="ghost" className="h-10 w-10 p-0 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Control Panel Grid (Exactly matching the user screenshot) */}
            <div className="p-6 md:p-8 bg-white border-b border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
              
              {/* Right Column: Basic Report Data (بيانات التقرير الأساسية) */}
              <div className="lg:col-span-5 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-5">
                <div className="flex items-center gap-2 text-slate-700 font-black text-sm pb-1 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">📂</span>
                  <span>بيانات التقرير الأساسية</span>
                </div>

                {/* Report Subject */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">موضوع التقرير</label>
                  <div className="relative">
                    <select
                      value={repReportSubject}
                      onChange={(e) => {
                        setRepReportSubject(e.target.value as any);
                        setRepReportTarget('all');
                      }}
                      className="w-full h-11 px-4 pr-10 rounded-xl border border-blue-100 bg-blue-50/30 text-blue-900 font-bold text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="projects">المشاريع والطلبات (Projects)</option>
                      <option value="clients">العملاء والشركاء (Clients)</option>
                      <option value="financials">المبيعات والعمولات (Financials)</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-blue-600 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Target Entity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الكيان المستهدف</label>
                  <div className="relative">
                    <select
                      value={repReportTarget}
                      onChange={(e) => setRepReportTarget(e.target.value)}
                      className="w-full h-11 px-4 pr-10 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="all">الكل (All)</option>
                      {repReportSubject === 'projects' && (
                        Array.from(new Set(quotations.map(q => q.projectName || q.projectId).filter(Boolean))).map(projName => (
                          <option key={projName} value={projName}>{projName}</option>
                        ))
                      )}
                      {repReportSubject === 'clients' && (
                        Array.from(new Set(quotations.map(q => q.clientName).filter(Boolean))).map(cName => (
                          <option key={cName} value={cName}>{cName}</option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Time Period */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500">الفترة الزمنية</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">من تاريخ</span>
                      <Input
                        type="date"
                        value={repReportStartDate}
                        onChange={(e) => setRepReportStartDate(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 font-bold text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400">إلى تاريخ</span>
                      <Input
                        type="date"
                        value={repReportEndDate}
                        onChange={(e) => setRepReportEndDate(e.target.value)}
                        className="h-10 rounded-xl border-slate-200 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Left Column: Advanced Options (خيارات التقرير المتقدمة) */}
              <div className="lg:col-span-7 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-700 font-black text-sm pb-1 border-b border-slate-100 mb-5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">⚙️</span>
                    <span>خيارات التقرير المتقدمة</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Include Graphs */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">📈</div>
                        <div>
                          <p className="text-xs font-black text-slate-700">تضمين رسوم بيانية</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">إضافة مخططات توضيحية للبيانات</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={repIncludeCharts}
                          onChange={(e) => setRepIncludeCharts(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    {/* Financial Details */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">🪙</div>
                        <div>
                          <p className="text-xs font-black text-slate-700">التفاصيل المالية</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">إظهر التدفقات النقدية الدقيقة</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={repIncludeFinance}
                          onChange={(e) => setRepIncludeFinance(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">✨</div>
                        <div>
                          <p className="text-xs font-black text-slate-700">تحليل ذكي (AI)</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">استخراج توصيات واقتراحات آلية</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={repAiAnalysis}
                          onChange={(e) => setRepAiAnalysis(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    {/* Detailed breakdown */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">🗒️</div>
                        <div>
                          <p className="text-xs font-black text-slate-700">تفكيك مفصل</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">جدول تفصيلي بدلاً من الملخص فقط</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={repDetailedBreakdown}
                          onChange={(e) => setRepDetailedBreakdown(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-violet-500/20 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setIsGeneratingReport(true);
                      setTimeout(() => {
                        const start = new Date(repReportStartDate);
                        const end = new Date(repReportEndDate);
                        end.setHours(23, 59, 59, 999);

                        const filtered = quotations.filter(q => {
                          const date = q.createdAt ? new Date(q.createdAt) : new Date();
                          const matchesDate = date >= start && date <= end;
                          
                          let matchesTarget = true;
                          if (repReportTarget !== 'all') {
                            if (repReportSubject === 'projects') {
                              matchesTarget = q.projectName === repReportTarget || q.projectId === repReportTarget;
                            } else if (repReportSubject === 'clients') {
                              matchesTarget = q.clientName === repReportTarget;
                            }
                          }
                          return matchesDate && matchesTarget;
                        });

                        const invoices = filtered.filter(q => q.docType === 'invoice');
                        const quotes = filtered.filter(q => q.docType === 'quotation');
                        const approved = invoices.filter(i => i.status === 'approved');
                        const pending = invoices.filter(i => i.status === 'pending');

                        const sumApproved = approved.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
                        const sumPending = pending.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

                        const reportData = {
                          subject: repReportSubject,
                          target: repReportTarget,
                          startDate: repReportStartDate,
                          endDate: repReportEndDate,
                          items: filtered,
                          quotesCount: quotes.length,
                          invoicesCount: invoices.length,
                          approvedCount: approved.length,
                          pendingCount: pending.length,
                          sumApproved,
                          sumPending,
                          repCommissionApproved: sumApproved * 0.85,
                          repCommissionPending: sumPending * 0.85,
                          companyShareApproved: sumApproved * 0.15,
                        };

                        setRepGeneratedReport(reportData);

                        const archiveItem = {
                          id: Date.now().toString(),
                          subject: repReportSubject,
                          target: repReportTarget,
                          startDate: repReportStartDate,
                          endDate: repReportEndDate,
                          includeCharts: repIncludeCharts,
                          includeFinance: repIncludeFinance,
                          aiAnalysis: repAiAnalysis,
                          detailedBreakdown: repDetailedBreakdown,
                          createdAt: new Date().toISOString(),
                          metrics: {
                            repCommissionApproved: sumApproved * 0.85,
                            quotesCount: quotes.length,
                            invoicesCount: invoices.length,
                          }
                        };

                        setArchivedReports(prev => {
                          const filteredPrev = prev.filter(item => !(
                            item.subject === repReportSubject &&
                            item.target === repReportTarget &&
                            item.startDate === repReportStartDate &&
                            item.endDate === repReportEndDate
                          ));
                          const updated = [archiveItem, ...filteredPrev];
                          localStorage.setItem('smart_rep_reports_archive', JSON.stringify(updated));
                          return updated;
                        });

                        setIsGeneratingReport(false);
                      }, 750);
                    }}
                    disabled={isGeneratingReport}
                    className="w-full h-12 rounded-2xl bg-[#0e1629] hover:bg-[#1a253f] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95"
                  >
                    {isGeneratingReport ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                        جاري معالجة وتركيب التقرير الذكي...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 text-violet-400" />
                        بناء وحفظ التقرير الشامل الآن
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Archived Reports Section (سجل التقارير المحفوظة والمؤرشفة) */}
            {archivedReports.length > 0 && (
              <div className="p-6 bg-slate-50/80 border-b border-slate-200/60 space-y-3 print:hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 font-black text-xs">
                    <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">📚</span>
                    <span>سجل التقارير المحفوظة والمؤرشفة ({archivedReports.length})</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setArchivedReports([]);
                      localStorage.removeItem('smart_rep_reports_archive');
                    }}
                    className="text-[10px] font-black text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 h-auto rounded-lg"
                  >
                    مسح السجل بالكامل
                  </Button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {archivedReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex-shrink-0 w-80 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 relative group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold ${
                            report.subject === 'projects' ? 'bg-blue-50 text-blue-600' :
                            report.subject === 'clients' ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'
                          }`}>
                            {report.subject === 'projects' ? 'المشاريع والطلبات' :
                             report.subject === 'clients' ? 'العملاء والشركاء' : 'المبيعات والعمولات'}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400">
                            {new Date(report.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-[11px] font-black text-slate-700 truncate">
                          الهدف: {report.target === 'all' ? 'الكل' : report.target}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                          الفترة: {new Date(report.startDate).toLocaleDateString('ar-SA')} - {new Date(report.endDate).toLocaleDateString('ar-SA')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-slate-400 block">العمولة المقدرة</span>
                          <span className="text-xs font-black text-violet-600">
                            {fmtNum(report.metrics?.repCommissionApproved || 0)} ر.س
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => {
                              // Restore states
                              setRepReportSubject(report.subject);
                              setRepReportTarget(report.target);
                              setRepReportStartDate(report.startDate);
                              setRepReportEndDate(report.endDate);
                              setRepIncludeCharts(report.includeCharts);
                              setRepIncludeFinance(report.includeFinance);
                              setRepAiAnalysis(report.aiAnalysis);
                              setRepDetailedBreakdown(report.detailedBreakdown);

                              // Recompile right away
                              setIsGeneratingReport(true);
                              setTimeout(() => {
                                const start = new Date(report.startDate);
                                const end = new Date(report.endDate);
                                end.setHours(23, 59, 59, 999);

                                const filtered = quotations.filter(q => {
                                  const date = q.createdAt ? new Date(q.createdAt) : new Date();
                                  const matchesDate = date >= start && date <= end;
                                  
                                  let matchesTarget = true;
                                  if (report.target !== 'all') {
                                    if (report.subject === 'projects') {
                                      matchesTarget = q.projectName === report.target || q.projectId === report.target;
                                    } else if (report.subject === 'clients') {
                                      matchesTarget = q.clientName === report.target;
                                    }
                                  }
                                  return matchesDate && matchesTarget;
                                });

                                const invoices = filtered.filter(q => q.docType === 'invoice');
                                const quotes = filtered.filter(q => q.docType === 'quotation');
                                const approved = invoices.filter(i => i.status === 'approved');
                                const pending = invoices.filter(i => i.status === 'pending');

                                const sumApproved = approved.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
                                const sumPending = pending.reduce((sum, item) => sum + (item.totalAmount || 0), 0);

                                setRepGeneratedReport({
                                  subject: report.subject,
                                  target: report.target,
                                  startDate: report.startDate,
                                  endDate: report.endDate,
                                  items: filtered,
                                  quotesCount: quotes.length,
                                  invoicesCount: invoices.length,
                                  approvedCount: approved.length,
                                  pendingCount: pending.length,
                                  sumApproved,
                                  sumPending,
                                  repCommissionApproved: sumApproved * 0.85,
                                  repCommissionPending: sumPending * 0.85,
                                  companyShareApproved: sumApproved * 0.15,
                                });
                                setIsGeneratingReport(false);
                              }, 300);
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl px-2.5 h-7 font-black text-[10px] gap-1"
                          >
                            استعادة سريعة
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setArchivedReports(prev => {
                                const updated = prev.filter(item => item.id !== report.id);
                                localStorage.setItem('smart_rep_reports_archive', JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            className="h-7 w-7 p-0 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Report Section (A4 Printable Layout Sheet) */}
            <div className="p-8 bg-slate-100 flex items-center justify-center min-h-[40vh] print:p-0 print:bg-white">
              {repGeneratedReport ? (
                <>
                  <style>{`
                    @media print {
                      /* Hide everything under body except the radix portal */
                      body > *:not(div[data-radix-portal]) {
                        display: none !important;
                      }

                      /* Override all radix portal containers to absolute/static flow so they print correctly */
                      div[data-radix-portal],
                      div[data-radix-portal] > div,
                      div[data-radix-portal] > div > div {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        display: block !important;
                        background: white !important;
                        box-shadow: none !important;
                        border: none !important;
                        transform: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                      }

                      /* Disable overlays/backdrop black masks completely during print */
                      div[data-state="open"] {
                        background: transparent !important;
                        background-color: transparent !important;
                        backdrop-filter: none !important;
                        box-shadow: none !important;
                      }
                      
                      /* Style the dialog wrapper exactly and override flex layout or custom widths */
                      .rep-reports-dialog-content {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        min-height: 100vh !important;
                        display: block !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                      }

                      /* Hide any elements styled with print:hidden */
                      .print\\:hidden,
                      .print\\:hidden * {
                        display: none !important;
                      }

                      /* Ensure color printing for commissions progress bars */
                      * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }

                      /* Enforce standard standalone A4 sheet sizing */
                      #rep-printable-sheet {
                        display: block !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 20mm !important;
                        margin: 0 auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                        font-family: inherit;
                        box-sizing: border-box;
                        page-break-after: avoid;
                        overflow: visible !important;
                      }
                    }
                  `}</style>

                  <div id="rep-printable-sheet" className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-200/60 p-[20mm] rounded-[1.5rem] text-right flex flex-col justify-between" dir="rtl">
                    <div>
                      {/* Clean Professional Corporate Header */}
                      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                        <div className="space-y-1.5 text-right">
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            تقرير الأداء والنشاط المالي للمندوب
                          </h1>
                          <div className="text-[12px] font-medium text-slate-600 space-y-1">
                            <p>المندوب المسؤول: <span className="text-slate-900 font-bold">{profile?.name || '---'}</span></p>
                            <p>المعرف الموحد: <span className="font-mono text-slate-900">{profile?.uid?.substring(0, 10) || '---'}</span></p>
                          </div>
                        </div>

                        <div className="text-left space-y-1.5 text-[12px] font-medium text-slate-600">
                          <p className="text-lg font-black text-slate-900 tracking-wider">EXPERT SYSTEM</p>
                          <p>تاريخ الصدور: {new Date().toLocaleDateString('ar-SA')}</p>
                          <p>الفترة المشمولة: {new Date(repGeneratedReport.startDate).toLocaleDateString('ar-SA')} - {new Date(repGeneratedReport.endDate).toLocaleDateString('ar-SA')}</p>
                        </div>
                      </div>

                      {/* Summary Section (Simple, clean, no emojis or redundant titles) */}
                      <div className="mb-8">
                        <h2 className="text-sm font-black text-slate-900 mb-4 border-r-4 border-slate-900 pr-2">
                          خلاصة المؤشرات المالية
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 block">إجمالي المبيعات المعتمدة</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">
                              {fmtNum(repGeneratedReport.sumApproved)} ر.س
                            </span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 block">العمولة المستحقة (85%)</span>
                            <span className="text-base font-black text-indigo-600 mt-1 block">
                              {fmtNum(repGeneratedReport.repCommissionApproved)} ر.س
                            </span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 block">المبالغ قيد التحصيل</span>
                            <span className="text-base font-black text-amber-600 mt-1 block">
                              {fmtNum(repGeneratedReport.sumPending)} ر.س
                            </span>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-500 block">المستندات الصادرة</span>
                            <span className="text-base font-black text-slate-900 mt-1 block">
                              {repGeneratedReport.items.length} وثائق
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Sharing visualization */}
                      {repIncludeFinance && (
                        <div className="mb-8">
                          <h2 className="text-sm font-black text-slate-900 mb-4 border-r-4 border-slate-900 pr-2">
                            توزيع الحصص والعمولات
                          </h2>
                          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3">
                            <div className="relative pt-1">
                              <div className="overflow-hidden h-2.5 text-xs flex rounded-full bg-slate-200">
                                <div style={{ width: `${repGeneratedReport.sumApproved > 0 ? 85 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all"></div>
                                <div style={{ width: `${repGeneratedReport.sumApproved > 0 ? 15 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-slate-400 transition-all"></div>
                              </div>
                              <div className="flex justify-between text-[11px] font-bold text-slate-600 mt-2">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full inline-block" />
                                  حصة المندوب (85%): {fmtNum(repGeneratedReport.repCommissionApproved)} ر.س
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 bg-slate-400 rounded-full inline-block" />
                                  حصة الشركة (15%): {fmtNum(repGeneratedReport.companyShareApproved)} ر.س
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Charts visualization (Clean layout, no duplicate blocks) */}
                      {repIncludeCharts && (
                        <div className="mb-8">
                          <h2 className="text-sm font-black text-slate-900 mb-4 border-r-4 border-slate-900 pr-2">
                            الرسوم والنسب التوضيحية
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                              <h4 className="text-[11px] font-bold text-slate-700">مستويات الإنجاز والاعتماد المالي</h4>
                              <div className="space-y-2.5">
                                <div>
                                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span>الفواتير المعتمدة والمحصلة</span>
                                    <span>{fmtNum(repGeneratedReport.sumApproved > 0 ? 100 : 0)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${repGeneratedReport.sumApproved > 0 ? 100 : 0}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                                    <span>المبالغ المعلقة قيد المتابعة</span>
                                    <span>{repGeneratedReport.sumPending > 0 ? 'نشط' : 'لا يوجد'}</span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full">
                                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${repGeneratedReport.sumPending > 0 ? 60 : 0}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 flex flex-col justify-between">
                              <h4 className="text-[11px] font-bold text-slate-700">توزع المستندات الصادرة</h4>
                              <div className="flex justify-around items-center h-full">
                                <div className="text-center">
                                  <p className="text-sm font-black text-slate-800">{repGeneratedReport.quotesCount}</p>
                                  <p className="text-[10px] font-bold text-slate-400">عروض الأسعار</p>
                                </div>
                                <div className="w-[1px] h-8 bg-slate-200" />
                                <div className="text-center">
                                  <p className="text-sm font-black text-slate-800">{repGeneratedReport.invoicesCount}</p>
                                  <p className="text-[10px] font-bold text-slate-400">الفواتير الكلية</p>
                                </div>
                                <div className="w-[1px] h-8 bg-slate-200" />
                                <div className="text-center">
                                  <p className="text-sm font-black text-slate-800">{repGeneratedReport.approvedCount}</p>
                                  <p className="text-[10px] font-bold text-slate-400">الفواتير المعتمدة</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Intelligent Analysis Recommendations */}
                      {repAiAnalysis && (
                        <div className="mb-8">
                          <h2 className="text-sm font-black text-slate-900 mb-4 border-r-4 border-slate-900 pr-2">
                            التوصيات والتحليل الآلي
                          </h2>
                          <div className="bg-indigo-50/30 border border-indigo-100/60 p-5 rounded-xl space-y-3">
                            <ul className="space-y-2 text-right text-[11px] font-bold text-slate-700">
                              <li className="flex items-start gap-1.5">
                                <span className="text-indigo-600 font-extrabold mt-0.5">•</span>
                                <span>يظهر التقرير مستوى متميزاً من المبيعات المعتمدة، وهو ما يدل على فاعلية الاتصال والجهود التسويقية المبذولة خلال هذه الفترة.</span>
                              </li>
                              {repGeneratedReport.sumPending > 0 ? (
                                <li className="flex items-start gap-1.5">
                                  <span className="text-indigo-600 font-extrabold mt-0.5">•</span>
                                  <span>تنبيه التحصيل: توجد مبالغ معلقة قيد التحصيل تبلغ قيمتها {fmtNum(repGeneratedReport.sumPending)} ر.س. يُقترح التواصل مع العملاء بانتظام لسرعة تصفية المستحقات.</span>
                                </li>
                              ) : (
                                <li className="flex items-start gap-1.5">
                                  <span className="text-indigo-600 font-extrabold mt-0.5">•</span>
                                  <span>مؤشر التحصيل: نثمن خلو الفواتير من أي مستحقات معلقة حالياً، وهو ما يعني تحصيل المستحقات بنسبة كاملة 100%.</span>
                                </li>
                              )}
                              <li className="flex items-start gap-1.5">
                                <span className="text-indigo-600 font-extrabold mt-0.5">•</span>
                                <span>التوجيه المقترح: التركيز على عروض الأسعار قيد الانتظار لمواصلة تنشيط وتحويل الصفقات إلى إيرادات معتمدة لزيادة قيمة العمولات الإجمالية.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Detailed Tables */}
                      {repDetailedBreakdown && (
                        <div className="mb-8">
                          <h2 className="text-sm font-black text-slate-900 mb-4 border-r-4 border-slate-900 pr-2">
                            جدول تفصيلي بالعمليات والمستندات
                          </h2>
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-right border-collapse text-[10px]">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-200">
                                  <th className="p-3">المستند</th>
                                  <th className="p-3">العميل</th>
                                  <th className="p-3">المشروع</th>
                                  <th className="p-3">الحالة</th>
                                  <th className="p-3 text-left">القيمة الكلية</th>
                                </tr>
                              </thead>
                              <tbody>
                                {repGeneratedReport.items.map((doc: any, idx: number) => (
                                  <tr key={doc.id || idx} className="border-b border-slate-100 hover:bg-slate-50/50 font-bold text-slate-700">
                                    <td className="p-3">
                                      {doc.docType === 'invoice' ? 'فاتورة' : 'عرض سعر'} {doc.docNumber || `#${idx+1}`}
                                    </td>
                                    <td className="p-3 text-slate-900">{doc.clientName || '---'}</td>
                                    <td className="p-3">{doc.projectName || '---'}</td>
                                    <td className="p-3">
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                                        doc.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                        doc.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                      }`}>
                                        {doc.status === 'approved' ? 'معتمد' : doc.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                                      </span>
                                    </td>
                                    <td className="p-3 text-left text-slate-900 font-mono">{fmtNum(doc.totalAmount || 0)} ر.س</td>
                                  </tr>
                                ))}
                                {repGeneratedReport.items.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="text-center p-6 text-slate-400 font-bold">لا توجد مستندات لهذه الفترة الزمنية المحددة.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Report Footer */}
                    <div className="border-t border-slate-300 pt-6 mt-8 flex justify-between text-[11px] text-slate-500 font-bold">
                      <div className="text-center space-y-4">
                        <p>توقيع المندوب المسؤول</p>
                        <p className="text-slate-900 font-black">{profile?.name}</p>
                        <p>التوقيع: ............................</p>
                      </div>
                      <div className="text-left text-[9px] text-slate-400 mt-auto max-w-sm">
                        <p>تم استخراج وتعميد هذا التقرير آلياً وبصيغة رسمية ومقيدة بحساب المندوب المعتمد في الأنظمة الرئيسية.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-3">
                  <span className="text-5xl block animate-bounce">📄</span>
                  <p className="font-black text-slate-600">محرك التقارير بانتظار الإطلاق</p>
                  <p className="text-xs max-w-sm text-slate-400 mx-auto">
                    قم بضبط خيارات التقرير في الأعلى ثم اضغط على زر "بناء وحفظ التقرير الشامل الآن" لتوليد الصفحة بصورة ذكية فورياً.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Sticky Notes Sidebar Manager Drawer */}
      <StickyNotesBoard isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
}

/* Synchronized Sticky Notes Board Drawer Component */
function StickyNotesBoard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('smart_sticky_notes_v2');
    if (saved) {
      setNotes(JSON.parse(saved));
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[240]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full sm:w-[450px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[250] flex flex-col"
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
