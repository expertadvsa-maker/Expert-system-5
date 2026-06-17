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
  GripVertical
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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

      {/* Top Controls: Navigation and Notes Trigger */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-3xl ${themeClasses} gap-4 relative z-20`}
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {subPage !== 'dashboard' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('rep_dashboard')}
              className="gap-2 text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-black hover:bg-slate-100/80 dark:hover:bg-slate-800/80 rounded-xl px-4 h-10 transition-all"
            >
              <ArrowRight className="w-4 h-4 text-primary" /> العودة للوحة التحكم الرئيسية
            </Button>
          ) : (
            <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" /> لوحة المندوب الرسمية المتطورة
            </span>
          )}
        </div>

        {/* Custom Controls Hub */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Sticky Notes Toggle Button */}
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
