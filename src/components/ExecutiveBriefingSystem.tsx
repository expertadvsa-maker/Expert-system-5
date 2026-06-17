import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Briefcase, ShoppingBag, Users, ArrowLeft,
  BarChart3, Volume2, Play, Square, Loader2,
  TrendingUp, TrendingDown, Wallet, Clock,
  HardHat, CheckCircle, AlertTriangle, Building2,
  RefreshCw, ChevronLeft, Sparkles, ShieldCheck,
  Coins, Activity, FileText, Pause, Copy, Check, Disc3, VolumeX, Share2, Download
} from 'lucide-react';
import {
  collection, query, onSnapshot, where, orderBy, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeProjectSpending, analyzeCompanyPortfolioCredit } from '../lib/gemini';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';
import { getCompanyQuery } from '../lib/firestoreUtils';

/* ─── Types ─── */
interface BriefingItem {
  id: string;
  type: 'action' | 'insight' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ElementType;
  category: string;
  tab: string;
  count?: number;
}

interface RealStats {
  income: number;
  expenses: number;
  net: number;
  pendingPurchases: number;
  activeProjects: number;
  totalWorkers: number;
  totalEmployees: number;
  todayAttendance: number;
}

/* ─── Helpers ─── */
function numberToArabicWords(n: number): string {
  const num = Math.round(n);
  if (num === 0) return 'صفر';
  
  if (num < 0) {
    return 'خصم وقدره ' + numberToArabicWords(Math.abs(num));
  }

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertLessThanThousand = (val: number): string => {
    if (val === 0) return '';
    let res = '';
    const h = Math.floor(val / 100);
    const remainder = val % 100;
    
    if (h > 0) {
      res = hundreds[h];
    }
    
    if (remainder > 0) {
      if (res) res += ' و ';
      if (remainder < 20) {
        res += units[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        if (u > 0) {
          res += units[u] + ' و ' + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res;
  };

  let result = '';
  let temp = num;

  // Billions if any
  if (temp >= 1_000_000_000) {
    const billions = Math.floor(temp / 1_000_000_000);
    temp %= 1_000_000_000;
    let billionStr = '';
    if (billions === 1) billionStr = 'مليار';
    else if (billions === 2) billionStr = 'ملياران';
    else if (billions >= 3 && billions <= 10) billionStr = convertLessThanThousand(billions) + ' مليارات';
    else billionStr = convertLessThanThousand(billions) + ' مليار';
    result = billionStr;
  }

  // Millions
  if (temp >= 1_000_000) {
    const millions = Math.floor(temp / 1_000_000);
    temp %= 1_000_000;
    
    let millionStr = '';
    if (millions === 1) millionStr = 'مليون';
    else if (millions === 2) millionStr = 'مليونان';
    else if (millions >= 3 && millions <= 10) millionStr = convertLessThanThousand(millions) + ' ملايين';
    else millionStr = convertLessThanThousand(millions) + ' مليون';
    
    if (result) result += ' و ' + millionStr;
    else result = millionStr;
  }

  // Thousands
  if (temp >= 1_000) {
    const thousands = Math.floor(temp / 1_000);
    temp %= 1_000;
    
    let thousandStr = '';
    if (thousands === 1) thousandStr = 'ألف';
    else if (thousands === 2) thousandStr = 'ألفين';
    else if (thousands >= 3 && thousands <= 10) thousandStr = convertLessThanThousand(thousands) + ' آلاف';
    else thousandStr = convertLessThanThousand(thousands) + ' ألف';
    
    if (result) result += ' و ' + thousandStr;
    else result = thousandStr;
  }

  // Units, Tens, Hundreds
  if (temp > 0) {
    const restStr = convertLessThanThousand(temp);
    if (result) result += ' و ' + restStr;
    else result = restStr;
  }

  return result;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' مليون';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + ' ألف';
  return n.toLocaleString('ar-SA');
}

function fmtTime(): string {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, sub, icon: Icon, color, bg, borderClass }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
  borderClass?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg ${bg} ${borderClass ?? 'border-slate-100'}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          color.includes('emerald') ? 'bg-emerald-50 text-emerald-600' : 
          color.includes('red') ? 'bg-red-50 text-red-500' : 
          color.includes('indigo') ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
        }`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1 font-bold">{sub}</p>}
    </div>
  );
}

/* Split text into clean phonetic chunks to prevent the Chrome/Safari speechSynthesis max length truncation/hang bugs */
function splitTextIntoSpeechChunks(text: string): string[] {
  // Match sentences including their punctuation to preserve natural pause and NLP markers
  const rawParts = text.match(/[^.،,؛;؟?!\n\r]+[.،,؛;؟?!\n\r]*/g) || [text];
  const chunks: string[] = [];
  
  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // If a segment is too long, break it up safely at spaces
    if (trimmed.length > 200) {
      const words = trimmed.split(/\s+/);
      let currentChunk = '';
      for (const word of words) {
        if ((currentChunk + ' ' + word).length > 200) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk = currentChunk ? currentChunk + ' ' + word : word;
        }
      }
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
    } else {
      chunks.push(trimmed);
    }
  }
  return chunks;
}

/* ═══════ MAIN ═══════ */
export default function ExecutiveBriefingSystem({ goToTab }: { goToTab?: (tab: string) => void }) {
  const { activeCompanyId, companies } = useAuth();
  const companyName = companies.find(c => c.id === activeCompanyId)?.name || 'مؤسستك الموقرة';
  const [loading, setLoading] = useState(true);
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped' | 'loading'>('stopped');
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [voiceFocus, setVoiceFocus] = useState<'all' | 'financial' | 'operations'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium'>('all');
  const [lastUpdated, setLastUpdated] = useState(fmtTime());
  const [stats, setStats] = useState<RealStats>({
    income: 0, expenses: 0, net: 0,
    pendingPurchases: 0, activeProjects: 0,
    totalWorkers: 0, totalEmployees: 0, todayAttendance: 0
  });
  const [briefingItems, setBriefingItems] = useState<BriefingItem[]>([]);
  const [compiledText, setCompiledText] = useState<string>('');
  
  // RAW text displayed dynamically as TTS speaks
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Raw collections for AI analysis
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [projectAnalysisMap, setProjectAnalysisMap] = useState<Record<string, { reading: boolean; text?: string; isError?: boolean }>>({});
  const [globalPortfolioAnalysis, setGlobalPortfolioAnalysis] = useState<{ reading: boolean; text?: string }>({ reading: false });
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const [cacheAvailable, setCacheAvailable] = useState<boolean>(false);

  const getCachedBriefing = () => {
    const cacheKey = `briefing_v2_${stats.income}_${stats.expenses}_${stats.pendingPurchases}_${stats.activeProjects}_${stats.totalWorkers}_${stats.totalEmployees}_${stats.todayAttendance}_${voiceFocus}`;
    const text = localStorage.getItem(cacheKey + '_text');
    const audio = localStorage.getItem(cacheKey + '_audio');
    return { text, audio };
  };

  useEffect(() => {
    const cached = getCachedBriefing();
    setCacheAvailable(!!cached.audio);
  }, [stats, voiceFocus]);

  const handleDownloadAudio = () => {
    const cached = getCachedBriefing();
    if (!cached.audio) {
      toast.error('الرجاء تشغيل الصوت أولاً لتوليده وحفظه قبل التحميل');
      return;
    }
    try {
      const byteCharacters = atob(cached.audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير_صباحي_${voiceFocus === 'all' ? 'شامل' : voiceFocus === 'financial' ? 'مالي' : 'ميداني'}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تحميل الملف الصوتي للتقرير الصباحي بنجاح 💾');
    } catch (err: any) {
      toast.error('أخفق في تحميل ملف الصوت: ' + err.message);
    }
  };

  const handleShareAudio = async () => {
    const cached = getCachedBriefing();
    if (!cached.audio) {
      toast.error('الرجاء تشغيل الصوت أولاً لتوليده وحفظه قبل المشاركة');
      return;
    }
    try {
      const byteCharacters = atob(cached.audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      const file = new File([blob], 'التقرير_الصباحي.wav', { type: 'audio/wav' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `التقرير الصباحي - ${companyName}`,
          text: cached.text || `التقرير الصباحي الصوتي لـ ${companyName}.`
        });
        toast.success('تمت مشاركة صوت التقرير الصباحي بنجاح! 🚀');
      } else {
        const shareText = `*التقرير الصباحي لمالك المؤسسة 🎙️*\n\n${cached.text || ''}\n\n_تم التوليد فورياً عبر نظام ${companyName} الرقمي_`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
        handleDownloadAudio();
        toast.info('تم فتح واتساب لمشاركة النص وجاري تحميل الملف الصوتي للمشاركة اليدوية 📲');
      }
    } catch (err: any) {
      console.error('Sharing failed', err);
      const shareText = `*التقرير الصباحي لمالك المؤسسة 🎙️*\n\n${cached.text || ''}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      handleDownloadAudio();
    }
  };

  // Bulletproof Speech Chunk Sequencer states
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [speechIndex, setSpeechIndex] = useState<number>(-1);
  const speechIndexRef = useRef<number>(-1);
  const speechQueueRef = useRef<string[]>([]);

  useEffect(() => {
    speechIndexRef.current = speechIndex;
  }, [speechIndex]);

  useEffect(() => {
    speechQueueRef.current = speechQueue;
  }, [speechQueue]);

  // Clean up completely Native voice fetching logic since we use Server TTS now
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);


  /* ── Build briefing items from real stats ── */
  useEffect(() => {
    const items: BriefingItem[] = [];

    if (stats.pendingPurchases > 0) {
      items.push({
        id: 'pur-1', type: 'warning', priority: 'high',
        title: 'اعتماد طلبات المشتريات المعلقة',
        description: `يوجد حالياً عدد ${stats.pendingPurchases} طلب شراء في قائمة الانتظار بحاجة إلى مراجعتك واعتمادك لضبط جدول توريد المواقع الميدانية.`,
        icon: ShoppingBag, category: 'المشتريات', tab: 'purchases', count: stats.pendingPurchases
      });
    }

    if (stats.activeProjects > 0) {
      items.push({
        id: 'proj-1', type: 'action', priority: 'medium',
        title: 'مشاريع حية قيد الإشراف الميداني',
        description: `تتابع المؤسسة عدد ${stats.activeProjects} مواقع تشغيلية نشطة. تأكد من تقييس ميزانيات المواد والكلادينج مقارنة بنسب الإنجاز.`,
        icon: Building2, category: 'المشاريع', tab: 'projects', count: stats.activeProjects
      });
    }

    if (stats.net < 0) {
      items.push({
        id: 'fin-warn', type: 'warning', priority: 'high',
        title: 'تنبيه: عجز مؤقت في رصيد المعاملات',
        description: `صافي الحسابات الجارية سالب بمقدار ${fmtNum(Math.abs(stats.net))} ر.س خلال الفترة المحددة. يتطلب إعادة جدولة للمطالبات.`,
        icon: AlertTriangle, category: 'المالية', tab: 'financials'
      });
    } else if (stats.income > 0) {
      const margin = Math.round((stats.net / stats.income) * 100);
      items.push({
        id: 'fin-1', type: 'insight', priority: 'low',
        title: 'تحليل التدفق النقدي والهامش التشغيلي',
        description: `إجمالي الواردات: ${fmtNum(stats.income)} ر.س مقابل مصروفات قدرها ${fmtNum(stats.expenses)} ر.س، محققين خفض أعباء ومعدل هامش قدره ${margin}٪.`,
        icon: BarChart3, category: 'المالية', tab: 'financials'
      });
    }

    if (stats.totalWorkers > 0) {
      items.push({
        id: 'wkr-1', type: 'action', priority: 'low',
        title: 'أجور العمال الميدانيين والعمالة التشغيلية',
        description: `يوجد عدد ${stats.totalWorkers} عمال مسجلين في النظام. ندعو إلى تصفية المستحقات اليومية لضمان الإنتاجية المستمرة في ساحات العمل.`,
        icon: HardHat, category: 'العمالة', tab: 'workers_management', count: stats.totalWorkers
      });
    }

    if (stats.todayAttendance > 0 && stats.totalEmployees > 0) {
      const pct = Math.round((stats.todayAttendance / stats.totalEmployees) * 100);
      const isLow = pct < 70;
      items.push({
        id: 'att-1',
        type: isLow ? 'warning' : 'insight',
        priority: isLow ? 'high' : 'low',
        title: isLow ? 'تحذير: حضور الكادر الإداري منخفض اليوم' : 'تقرير الانضباط والحضور الموقّع',
        description: `تم رصد حضور عدد ${stats.todayAttendance} من أصل ${stats.totalEmployees} موظفاً بنسبة حضور إجمالية بلغت ${pct}٪ لهذا اليوم.`,
        icon: Users, category: 'الحضور', tab: 'attendance_manager', count: stats.todayAttendance
      });
    }

    setBriefingItems(items);
    setLastUpdated(fmtTime());
    if (items.length > 0 || stats.income > 0) setLoading(false);
  }, [stats]);

  /* ── Firebase real-time subscriptions ── */
  useEffect(() => {
    const subs: (() => void)[] = [];
    const today = new Date().toISOString().split('T')[0];
    const ago90 = new Date();
    ago90.setDate(ago90.getDate() - 90);

    // Transactions
    subs.push(onSnapshot(
      query(getCompanyQuery('transactions', activeCompanyId), where('date', '>=', ago90.toISOString())),
      snap => {
        let inc = 0, exp = 0, pend = 0;
        const txsList: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          txsList.push({ id: d.id, ...data });
          if (data.type === 'income') inc += data.amount || 0;
          if (data.type === 'expense' || data.type === 'purchase') exp += data.amount || 0;
          if (data.status === 'pending') pend++;
        });
        setRawTransactions(txsList);
        setStats(p => ({ ...p, income: inc, expenses: exp, net: inc - exp, pendingPurchases: pend }));
        setLoading(false);
      },
      err => { console.error('Briefing/Trans:', err); setLoading(false); }
    ));

    // Projects
    subs.push(onSnapshot(getCompanyQuery('projects', activeCompanyId), snap => {
      const projsList: any[] = [];
      snap.forEach(d => {
        projsList.push({ id: d.id, ...d.data() });
      });
      setRawProjects(projsList);
      const active = projsList.filter(p => ['in-progress', 'active'].includes(p.status)).length;
      setStats(p => ({ ...p, activeProjects: active }));
    }));

    // Workers
    subs.push(onSnapshot(query(getCompanyQuery('workers', activeCompanyId), limit(200)), snap => {
      setStats(p => ({ ...p, totalWorkers: snap.size }));
    }));

    // Employees
    subs.push(onSnapshot(query(getCompanyQuery('users', activeCompanyId), limit(200)), snap => {
      setStats(p => ({ ...p, totalEmployees: snap.size }));
    }));

    // Today attendance
    subs.push(onSnapshot(
      query(getCompanyQuery('attendance', activeCompanyId), where('dateString', '==', today)),
      snap => setStats(p => ({ ...p, todayAttendance: snap.size }))
    ));

    return () => {
      subs.forEach(u => u());
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeCompanyId]);

  // 🧹 Removed autoplay because setTimeout breaks Web Speech API user gesture rules in modern browsers.

  /* Generate highly structured phonetic Arabic text suited perfectly for TTS */
  const buildBriefingSpeechText = () => {
    const margin = stats.income > 0 ? Math.round((stats.net / stats.income) * 100) : 0;
    const highAlerts = briefingItems.filter(i => i.priority === 'high').length;
    
    let text = `مرحباً بك يا طويل العمر، سعادة المدير العام لـ ${companyName}، السلام عليكم ورحمة الله وبركاته، إليك تقرير الأداء المالي والتشغيلي المباشر والسريع لليوم: `;

    if (voiceFocus === 'all' || voiceFocus === 'financial') {
      text += `الجانب المالي، `;
      text += `بلغ إجمالي التدفقات الواردة ${numberToArabicWords(stats.income)} ريال سعودي، `;
      text += `والمصروفات سجلت ${numberToArabicWords(stats.expenses)} ريال سعودي. `;
      
      if (stats.net >= 0) {
        text += `الفائض يسجل ربحاً قدره ${numberToArabicWords(stats.net)} ريال سعودي، بنسبة هامش ربحي وأمان تبلغ ${numberToArabicWords(margin)} في المائة. الموقف مستقر بفضل توجيهاتكم الحكيمة. `;
      } else {
        text += `يوجد عجز مؤقت قدره ${numberToArabicWords(Math.abs(stats.net))} ريال سعودي بسبب زيادة التوريدات. نوصي بتوجيه التحصيل لجمع المستحقات فوراً. `;
      }
    }

    if (voiceFocus === 'all' || voiceFocus === 'operations') {
      text += `الجانب الميداني، `;
      
      if (stats.activeProjects > 0) {
        text += `يسير العمل في عدد ${numberToArabicWords(stats.activeProjects)} مواقع نشطة، بنسب إنجاز ممتازة. `;
      } else {
        text += `لا توجد مشاريع نشطة حالياً. `;
      }

      if (stats.pendingPurchases > 0) {
        text += `ولدينا عدد ${numberToArabicWords(stats.pendingPurchases)} طلبات توريد بانتظار توقيعكم الإداري. `;
      } else {
        text += `وطلبات الشراء معتمدة بالكامل. `;
      }

      if (stats.totalWorkers > 0) {
        text += `ويبلغ إجمالي عمال الميدان ${numberToArabicWords(stats.totalWorkers)} عامل. `;
      }
    }

    if (highAlerts > 0) {
      text += `ختاماً، يرصد النظام عدد ${numberToArabicWords(highAlerts)} تنبيهات هامة للمراجعة. شكراً لاستماعكم وتوجيهاتكم المستمرة، وتمنياتنا لكم بيوم موفق وسعيد، والسلام عليكم ورحمة الله وبركاته.`;
    } else {
      text += `ختاماً، ولله الحمد، لا يرصد النظام أي مخاطر عقيمة اليوم. نتمنى لكم يوماً سعيداً ومباركاً، والسلام عليكم ورحمة الله وبركاته.`;
    }

    return text;
  };

  /* ── Voice Synthesis Controls ── */
  const playTTSFull = async () => {
    setPlaybackState('loading');
    
    // Generate actual cacheKey based on current stats and chosen voiceFocus
    const cacheKey = `briefing_v2_${stats.income}_${stats.expenses}_${stats.pendingPurchases}_${stats.activeProjects}_${stats.totalWorkers}_${stats.totalEmployees}_${stats.todayAttendance}_${voiceFocus}`;
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      const cachedText = localStorage.getItem(cacheKey + '_text');
      const cachedAudio = localStorage.getItem(cacheKey + '_audio');
      
      if (cachedText && cachedAudio) {
        // Cache Hit! Run immediately
        setCompiledText(cachedText);
        setSpeechQueue([cachedText]);
        setSpeechIndex(0);
        
        const uri = `data:audio/wav;base64,${cachedAudio}`;
        const audio = new Audio(uri);
        audioRef.current = audio;
        
        audio.playbackRate = speechRate;
        audio.onplay = () => setPlaybackState('playing');
        audio.onpause = () => {
          if (!audio.ended) {
            setPlaybackState('paused');
          }
        };
        audio.onended = () => {
          setPlaybackState('stopped');
          setSpeechIndex(-1);
        };
        audio.onerror = () => {
          toast.error('حدث عطل في تشغيل الملف الصوتي المحفوظ');
          setPlaybackState('stopped');
          setSpeechIndex(-1);
        };
        
        toast.success('تشغيل فوري للتقرير المحفوظ ⚡ (لعدم حدوث تغييرات في النظام)', { duration: 4000 });
        await audio.play();
        return;
      }
      
      // Cache Miss! Fetch from Server with actual stats and focus configuration
      toast.info('جاري صياغة تقرير مباشر بلهجة عامية ومختصرة... 🧠', { duration: 3000 });
      const customKey = localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('gemini_api_key') || '';
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stats, 
          voiceFocus, 
          customKey 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        if (data.details && data.details.includes('429')) {
           throw new Error('رصيد الذكاء الاصطناعي الخاص بك (Gemini) قد نفد. يرجى مراجعة إعدادات الدفع في AI Studio.');
        } else if (data.details && data.details.includes('RESOURCE_EXHAUSTED')) {
           throw new Error('تم استنفاد رصيد واجهة الذكاء الاصطناعي، يرجى تحديث الباقة.');
        }
        throw new Error(data.details || data.error || 'فشل جلب الموجز الصوتي من الخادم');
      }

      const generatedText = data.text || 'التقرير الصباحي جاهز.';
      const audioBase64 = data.audio;

      // Save to localStorage (clearing previous keys to avoid quota overflow)
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('briefing_v2_')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem(cacheKey + '_text', generatedText);
        localStorage.setItem(cacheKey + '_audio', audioBase64);
        setCacheAvailable(true);
      } catch (cacheErr) {
        console.warn('Failed to save to cache:', cacheErr);
      }

      setCompiledText(generatedText);
      setSpeechQueue([generatedText]);
      setSpeechIndex(0);

      const uri = `data:audio/wav;base64,${audioBase64}`;
      const audio = new Audio(uri);
      audioRef.current = audio;

      audio.playbackRate = speechRate;
      audio.onplay = () => setPlaybackState('playing');
      audio.onpause = () => {
        if (!audio.ended) {
          setPlaybackState('paused');
        }
      };
      audio.onended = () => {
        setPlaybackState('stopped');
        setSpeechIndex(-1);
      };
      audio.onerror = () => {
        toast.error('حدث عطل في تشغيل الملف الصوتي');
        setPlaybackState('stopped');
        setSpeechIndex(-1);
      };

      await audio.play();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || '';
      
      // Fallback
      const textToSpeak = buildBriefingSpeechText();
      setCompiledText(textToSpeak);
      
      if (errMsg.includes('نفد') || errMsg.includes('استنفاد') || errMsg.includes('429')) {
        toast.error('رصيد الدفع المعترف به للذكاء الاصطناعي قد نفد. سيتم تشغيل السرد تلقائياً باستخدام قارئ النظام لديك كبديل مجاني.', { duration: 6000 });
        playFallbackTTS(textToSpeak);
      } else {
        toast.error('عطل في توليد الصوت: ' + errMsg);
        setPlaybackState('stopped');
        setSpeechIndex(-1);
      }
    }
  };

  const playFallbackTTS = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast.error('محرّك الصوت المحلي غير متوفر كبديل في هذا المتصفح.');
        setPlaybackState('stopped');
        setSpeechIndex(-1);
        return;
    }
    
    // Cleanup any stuck TTS
    window.speechSynthesis.cancel();
    
    const chunks = splitTextIntoSpeechChunks(text);
    if (chunks.length === 0) return;
    
    setSpeechQueue(chunks);
    setSpeechIndex(0);
    
    const synthUtterances: SpeechSynthesisUtterance[] = [];
    
    const playChunk = (index: number) => {
      if (index >= chunks.length) {
        setPlaybackState('stopped');
        setSpeechIndex(-1);
        return;
      }
      
      const chunkText = chunks[index];
      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.lang = 'ar-SA';
      utterance.rate = speechRate;
      
      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = voices.find(v => v.lang.toLowerCase() === 'ar-sa' && (v.name.includes('Premium') || v.name.includes('Natural') || v.name.includes('Online')));
      if (!matchedVoice) matchedVoice = voices.find(v => v.lang.toLowerCase() === 'ar-sa');
      if (!matchedVoice) matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar') && (v.name.includes('Premium') || v.name.includes('Natural') || v.name.includes('Online')));
      if (!matchedVoice) matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar'));
      if (matchedVoice) {
         utterance.voice = matchedVoice;
         utterance.lang = matchedVoice.lang;
      }
      
      utterance.onstart = () => setPlaybackState('playing');
      utterance.onend = () => {
         const nextIdx = index + 1;
         setSpeechIndex(nextIdx);
         playChunk(nextIdx);
      };
      utterance.onerror = (e) => {
         console.warn('Fallback TTS piece errored', e);
         if (e.error !== 'interrupted' && e.error !== 'canceled') {
            const nextIdx = index + 1;
            setSpeechIndex(nextIdx);
            playChunk(nextIdx);
         }
      };
      
      synthUtterances.push(utterance);
      if (synthUtterances.length > 5) synthUtterances.shift(); // stop GC
      
      window.speechSynthesis.speak(utterance);
    };
    
    playChunk(0);
  };

  const handlePlayVoice = () => {
    if (playbackState === 'paused') {
      if (audioRef.current) {
        audioRef.current.play();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      setPlaybackState('playing');
      return;
    }

    playTTSFull();
  };

  const handlePauseVoice = () => {
    if (audioRef.current && playbackState === 'playing') {
      audioRef.current.pause();
      setPlaybackState('paused');
    } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPlaybackState('paused');
    }
  };

  const handleStopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState('stopped');
    setSpeechIndex(-1);
  };

  // Adjust speech speed rate dynamically
  const changeSpeechSpeed = (speed: number) => {
    setSpeechRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      toast.info(`تم ضبط سرعة السرد الصوتي إلى ${speed}x`);
    } else if (playbackState === 'playing' || playbackState === 'paused') {
      toast.info(`تم تعديل سرعة السرد الصوتي المحلي إلى ${speed}x`);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        // Since we cancelled, we can replay from current index
        const chunks = speechQueueRef.current;
        const currentIdx = speechIndexRef.current >= 0 ? speechIndexRef.current : 0;
        
        // inline logic for resume
        const resumeChunk = (idx: number) => {
           if (idx >= chunks.length) { setPlaybackState('stopped'); setSpeechIndex(-1); return; }
           const utterance = new SpeechSynthesisUtterance(chunks[idx]);
           utterance.lang = 'ar-SA';
           utterance.rate = speed;
           const voices = window.speechSynthesis.getVoices();
           let matchedVoice = voices.find(v => v.lang.toLowerCase() === 'ar-sa');
           if (!matchedVoice) matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar'));
           if (matchedVoice) utterance.voice = matchedVoice;
           utterance.onend = () => { const next = idx + 1; setSpeechIndex(next); resumeChunk(next); };
           window.speechSynthesis.speak(utterance);
        };
        resumeChunk(currentIdx);
      }
    } else {
      toast.info(`سيتم تشغيل السرد المستقبلي بسرعة ${speed}x`);
    }
  };

  const copyTranscriptToClipboard = () => {
    if (!compiledText) {
      const txt = buildBriefingSpeechText();
      navigator.clipboard.writeText(txt);
    } else {
      navigator.clipboard.writeText(compiledText);
    }
    setCopiedText(true);
    toast.success('تم نسخ النص الكامل للموجز التنفيذي بنجاح');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleProjectAIAnalysis = async (project: any) => {
    setProjectAnalysisMap(prev => ({ ...prev, [project.id]: { reading: true } }));
    try {
      const relatedTxs = rawTransactions.filter(t => t.projectId === project.id);
      const resText = await analyzeProjectSpending(project, relatedTxs);
      setProjectAnalysisMap(prev => ({
        ...prev,
        [project.id]: { reading: false, text: resText || 'تعذر الحصول على استجابة.' }
      }));
      toast.success('تم تحليل بيانات المشروع بنجاح');
    } catch (e: any) {
      console.error(e);
      setProjectAnalysisMap(prev => ({
        ...prev,
        [project.id]: { reading: false, text: 'حدث خطأ أثناء الاتصال بـ Gemini: ' + (e.message || e), isError: true }
      }));
      toast.error('فشل الاتصال بالذكاء الاصطناعي');
    }
  };

  const handleCompanyPortfolioAIAnalysis = async () => {
    setGlobalPortfolioAnalysis({ reading: true });
    try {
      const activeProjects = rawProjects.filter(p => !p.status || ['in-progress', 'active', 'on-hold'].includes(p.status));
      const projectsSummary = activeProjects.map(p => {
        const relatedTxs = rawTransactions.filter(t => t.projectId === p.id);
        const totalExp = relatedTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        return {
          id: p.id,
          title: p.title || p.name || 'مشروع بدون عنوان',
          budget: Number(p.budget) || 0,
          progress: Number(p.progress) || 0,
          totalExpenses: totalExp,
          remaining: (Number(p.budget) || 0) - totalExp
        };
      });

      const resultText = await analyzeCompanyPortfolioCredit(projectsSummary, rawTransactions);
      setGlobalPortfolioAnalysis({ reading: false, text: resultText });
      toast.success('اكتمل التقرير المالي الاستشاري');
    } catch (e: any) {
      console.error(e);
      setGlobalPortfolioAnalysis({ reading: false, text: 'عذراً، فشل تنفيذ التحليل الائتماني الشامل: ' + (e.message || e) });
      toast.error('تعذر إجراء تقييم المحفظة');
    }
  };

  /* ── Filter ── */
  const filtered = briefingItems.filter(item => {
    if (activeFilter === 'high') return item.priority === 'high';
    if (activeFilter === 'medium') return item.priority === 'medium';
    return true;
  });

  const highCount = briefingItems.filter(i => i.priority === 'high').length;

  /* ═══════ RENDER ═══════ */
  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-right" dir="rtl">
      {/* EXPLICIT STYLING FOR CAIRO FONT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        .brief-container {
          font-family: 'Cairo', sans-serif !important;
        }
      `}} />

      <div className="w-full px-4 sm:px-6 py-6 space-y-6 max-w-7xl mx-auto brief-container">

        {/* 🏛️ UPGRADED PREMIUM HEADER BOARD */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden border border-slate-800 shadow-xl">
          {/* Neon radial light decoration */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              {/* Top Row with Badge & Live Update Feed Info */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  أمان مالي ونظام كاشف نشط
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/5 border border-white/15 text-white/50">
                  <RefreshCw className="w-3 h-3 text-white/30 shrink-0" />
                  أحدث تزامن: {lastUpdated}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
                  مركز البث والموجز التنفيذي الذكي
                  <Sparkles className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
                </h1>
                <p className="text-xs md:text-sm text-slate-300 max-w-2xl mt-2 leading-relaxed">
                  مرحباً بك مجدداً سعادة المدير العام. ترحب بك واجهة الرقابة المالية الوقائية الحية لمؤسسة خبراء الرسم. المؤشرات والبيانات الحركية أدناه مبنية بالتطابق المطلق والحي من قيود المعاملات في الميدان.
                </p>
              </div>

              {/* Status Banner */}
              {highCount > 0 ? (
                <div className="inline-flex items-center gap-3 bg-red-500/15 border border-red-500/25 rounded-2xl px-4 py-3 text-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-red-300">يوجد عدد {highCount} بنود وقرارات مستعجلة للغاية</p>
                    <p className="text-[10px] text-red-400/80 mt-0.5 font-medium">سرد صدمات السيولة أو طلبات الشراء بانتظار توقيعكم الإداري.</p>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 text-emerald-200">
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold text-emerald-300">كافة المؤشرات في مستوى آمن ومستقر</p>
                    <p className="text-[10px] text-emerald-400/80 mt-0.5 font-medium">لا توجد ثغرات ذمة أو عجز حاد في نفقات تلميحات الـ AI.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Quick stats overview inside title */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0 md:w-64 flex flex-col justify-between align-stretch backdrop-blur-sm self-stretch justify-self-stretch">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-3 border-b border-white/10 pb-2">سجل الكوادر والآليات</span>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold">المشاريع الحرة</p>
                  <p className="text-sm font-black text-white">{stats.activeProjects} مواقع</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 font-bold">عمال الميدان</p>
                  <p className="text-sm font-black text-white">{stats.totalWorkers} أفراد</p>
                </div>
                <div className="text-right mt-1">
                  <p className="text-[9px] text-slate-400 font-bold">نسبة حضور اليوم</p>
                  <p className="text-sm font-black text-[#38BDF8]">{stats.todayAttendance} حاضر</p>
                </div>
                <div className="text-right mt-1">
                  <p className="text-[9px] text-slate-400 font-bold">مجموع الكادر</p>
                  <p className="text-sm font-black text-white">{stats.totalEmployees} موظف</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 🎙️ THE CHIEF EXECUTIVE AUDIO BROADCASTING SYSTEM */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition relative overflow-hidden">
          {/* Subtle design gradient accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left/Center Visualizer & Playback Actions (4 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-l border-slate-100 pb-6 lg:pb-0 lg:pl-8 space-y-4">
              <div className="flex items-center gap-3 self-start lg:self-center mb-1">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 leading-tight">مركز السرد والبث المالي</h3>
                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Executive Radio System</p>
                </div>
              </div>

              {/* Animated Wave Lines */}
              <div className="h-10 flex items-end gap-1 px-4">
                {[...Array(14)].map((_, i) => {
                  const delays = [0.1, 0.4, 0.25, 0.6, 0.3, 0.15, 0.5, 0.2, 0.45, 0.35, 0.1, 0.3, 0.2, 0.4];
                  return (
                    <motion.div
                      key={i}
                      animate={playbackState === 'playing' ? {
                        height: [4, 28, 8, 36, 12, 4]
                      } : { height: 4 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.1,
                        ease: 'easeInOut',
                        delay: delays[i]
                      }}
                      className={`w-1 rounded-full ${
                        playbackState === 'playing' ? 'bg-indigo-600' : 'bg-slate-250'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Play / Action Buttons */}
              <div className="flex items-center gap-2.5 w-full max-w-sm">
                {playbackState === 'playing' ? (
                  <button
                    onClick={handlePauseVoice}
                    className="flex-1 h-11 rounded-2xl bg-amber-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/15 hover:bg-amber-600 transition cursor-pointer border-none"
                  >
                    <Pause className="w-4 h-4 fill-white shrink-0" /> إيقاف مؤقت
                  </button>
                ) : playbackState === 'loading' ? (
                  <button
                    disabled
                    className="flex-1 h-11 rounded-2xl bg-slate-200 text-slate-500 text-xs font-black flex items-center justify-center gap-2 cursor-wait border-none"
                  >
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" /> جاري توليد الصوت...
                  </button>
                ) : (
                  <button
                    onClick={handlePlayVoice}
                    disabled={loading || playbackState === 'loading'}
                    className="flex-1 h-11 rounded-2xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/15 hover:bg-indigo-700 transition cursor-pointer disabled:opacity-40 border-none animate-bounce"
                  >
                    <Play className="w-4 h-4 fill-white shrink-0" /> نقر لتشغيل الصوت
                  </button>
                )}

                {playbackState !== 'stopped' && (
                  <button
                    onClick={handleStopVoice}
                    className="w-11 h-11 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer border-none"
                    title="إنهاء التشغيل"
                  >
                    <Square className="w-4 h-4 fill-rose-600 text-rose-600" />
                  </button>
                )}
              </div>

              {/* Caching & Sharing Actions */}
              {cacheAvailable && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-sm p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 flex flex-col gap-2"
                >
                  <p className="text-[10px] font-black text-indigo-900/40 uppercase tracking-wider">مشاركة أو حفظ التقرير الصبّاحي الملخص</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShareAudio}
                      className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/15 transition cursor-pointer border-none"
                    >
                      <Share2 className="w-3.5 h-3.5 text-white shrink-0" /> مشاركة فوريّة (واتساب)
                    </button>
                    <button
                      onClick={handleDownloadAudio}
                      className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-slate-705 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                      title="تحميل الملف الصوتي للجهاز"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" /> تحميل الصّوت
                    </button>
                  </div>
                </motion.div>
              )}

              {playbackState === 'playing' && speechIndex >= 0 && speechQueue[speechIndex] && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-indigo-900 text-[11px] font-bold text-center leading-relaxed max-h-32 overflow-y-auto"
                >
                  " {speechQueue[speechIndex]} "
                </motion.div>
              )}

              <div className="text-[10px] text-slate-450 font-bold flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${playbackState === 'playing' || playbackState === 'loading' ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                {playbackState === 'loading' ? 'جاري تجهيز السرد من الخادم...' : playbackState === 'playing' ? 'يقرأ حالياً في الخلفية بلهجة طبيعية...' : 'مستعد للسرد بلهجة طبيعية محاكية'}
              </div>
            </div>

            {/* Right Voice Settings Console (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">تركيز مادة السرد الصوتي</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                    {([
                      { v: 'all', label: 'موجز شامل' },
                      { v: 'financial', label: 'المال مالي' },
                      { v: 'operations', label: 'الميدان' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setVoiceFocus(opt.v)}
                        className={`py-1.5 rounded-lg text-[10px] font-extrabold transition border-none cursor-pointer ${
                          voiceFocus === opt.v
                            ? 'bg-white text-slate-900 shadow-sm font-black'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* Speed adjusting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">سرعة النطق الإدارية</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {([0.9, 1.0, 1.2, 1.4] as number[]).map(speed => (
                      <button
                        key={speed}
                        onClick={() => changeSpeechSpeed(speed)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition border-none cursor-pointer ${
                          speechRate === speed
                            ? 'bg-white text-indigo-700 shadow-sm font-black'
                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                        }`}
                      >
                        {speed === 1.0 ? 'طبيعي' : `${speed}x`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Arabic Premium voices list selection (Disabled since using Server TTS) */}
                <div className="md:col-span-8 space-y-1.5 opacity-60 pointer-events-none">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex justify-between">
                    <span>نبرة ومعالج الصوت العربي المعتمد</span>
                    <span className="text-[8px] text-white bg-emerald-600 px-1.5 py-0.2 rounded font-extrabold">الخادم (Gemini Flash TTS)</span>
                  </label>
                  <select
                    disabled
                    value={'Kore (صوت بشري طبيعي)'}
                    className="w-full text-xs font-bold p-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 outline-none cursor-not-allowed"
                  >
                    <option>Kore (صوت بشري طبيعي - سيرفر)</option>
                  </select>
                </div>

                {/* Instant copy button */}
                <div className="md:col-span-4">
                  <button
                    onClick={copyTranscriptToClipboard}
                    className="w-full h-10 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-slate-800 transition cursor-pointer border-none shadow-sm active:scale-95"
                    title="نسخ محتوى الذكاء الاصطناعي السري"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم نسخ النص!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>نسخ مادة التقرير</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 📊 DYNAMIC FINANCIAL INDEX METRIC SYSTEM */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <KpiCard 
            label="الدخل خلال الـ90 يوماً الماضية" 
            value={`${fmtNum(stats.income)} ر.س`}
            sub="إيرادات المشاريع المسجلة" 
            icon={TrendingUp} 
            color="text-emerald-600" 
            bg="bg-white" 
            borderClass="border-emerald-100"
          />
          <KpiCard 
            label="إجمالي نفقات المواد والأجور" 
            value={`${fmtNum(stats.expenses)} ر.س`}
            sub="مدفوعات الفواتير والمواقع" 
            icon={TrendingDown} 
            color="text-red-500" 
            bg="bg-white" 
            borderClass="border-red-100"
          />
          <KpiCard
            label="صافي القيمة الحالية" 
            value={`${stats.net >= 0 ? '+' : ''}${fmtNum(stats.net)} ر.س`}
            sub={stats.income > 0 ? `معدل الأمان النقدي هامش ${Math.round((stats.net / stats.income) * 100)}٪` : 'بانتظار ايرادات'}
            icon={Wallet}
            color={stats.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}
            bg={stats.net >= 0 ? 'bg-indigo-50/20' : 'bg-red-50/20'}
            borderClass={stats.net >= 0 ? 'border-indigo-100' : 'border-red-200'}
          />
          <KpiCard 
            label="طلبات شراء معلقة" 
            value={stats.pendingPurchases.toString()}
            sub="بانتظار توقيع الاعتماد المالي" 
            icon={Clock}
            color={stats.pendingPurchases > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-500'}
            bg="bg-white" 
            borderClass={stats.pendingPurchases > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}
          />
        </div>

        {/* ══ FILTER CHANNELS BAR ══ */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
          <div className="flex bg-slate-200/50 border border-slate-300/40 p-1 rounded-2xl gap-1">
            {([
              { v: 'all', label: `الكل الأنشطة (${briefingItems.length})` },
              { v: 'high', label: `عاجل وهام (${highCount})` },
              { v: 'medium', label: 'أولوية متوسطة' },
            ] as const).map(f => (
              <button
                key={f.v}
                onClick={() => setActiveFilter(f.v)}
                className={`h-9 px-4 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                  activeFilter === f.v
                    ? f.v === 'high' ? 'bg-rose-600 text-white shadow-md shadow-rose-650/10'
                    : 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#475569] font-extrabold bg-[#E2E8F0]/30 border border-[#CBD5E1]/40 px-3.5 py-1.5 rounded-full">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            اتصال مباشر ومؤكد ببيانات Firestore
          </div>
        </div>

        {/* 🗳️ PRIMARY BRIEFING TIMELINES GRID LIST */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-sm">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-70 animate-bounce" />
            <p className="text-base font-extrabold text-slate-700">البيئة الإدارية والمالية معافاة بالكامل</p>
            <p className="text-xs text-slate-400 mt-1 font-semibold">لا توجد ثغرات ذمة أو معوقات في فئة الفحص الحالية.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <div className={`bg-white rounded-3xl border h-full flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md transition ${
                    item.priority === 'high' ? 'border-rose-200 bg-rose-50/5' :
                    item.priority === 'medium' ? 'border-amber-200 bg-amber-50/5' : 'border-slate-200'
                  }`}>
                    {/* Upper */}
                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.priority === 'high' ? 'bg-red-50 text-red-600' :
                          item.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-row-reverse">
                          <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-large">
                            {item.category}
                          </span>
                          {item.count !== undefined && (
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                              item.priority === 'high' ? 'bg-red-100 text-red-700' :
                              item.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>{item.count}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{item.title}</h4>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-1.5">{item.description}</p>
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className={`px-5 py-3 border-t flex items-center justify-between ${
                      item.priority === 'high' ? 'bg-red-50/30 border-red-100' :
                      item.priority === 'medium' ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                        item.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                        item.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-500'
                      }`}>
                        {item.priority === 'high' ? '● تهديد عاجل' : item.priority === 'medium' ? '◐ مراجعة تشغيلية' : '○ مراقبة عادية'}
                      </span>
                      {goToTab && (
                        <button
                          onClick={() => goToTab(item.tab)}
                          className="flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:opacity-70 transition border-none bg-transparent cursor-pointer"
                        >
                          فتح القسم والتدقيق <ChevronLeft className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 🏛️ MODERN RADAR / COGNITIVE RISK ENGINE BY GEMINI AI (EBS-3) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 leading-tight">الرادار الاستشاري الوقائي (Gemini Model 3.5 AI)</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Corporate Credit Deficit Predictions & Insights</p>
              </div>
            </div>
            
            <button
              onClick={handleCompanyPortfolioAIAnalysis}
              disabled={globalPortfolioAnalysis.reading || rawProjects.length === 0}
              className="px-5 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 border-none"
            >
              {globalPortfolioAnalysis.reading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  جاري تشخيص الذمة الشاملة للمحفظة...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  إجراء تقييم ائتماني وقائي لعموم المشروعات
                </>
              )}
            </button>
          </div>

          {/* Global executive advisory output block */}
          {globalPortfolioAnalysis.text && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0f172a] text-slate-200 rounded-2xl p-5 space-y-4 relative overflow-hidden border border-slate-800 shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-xs font-black text-white">التقرير الائتماني والتقييمي الموحد</h4>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(globalPortfolioAnalysis.text || '');
                    toast.success('تم نسخ تقرير التقييم المالي لمشاركته!');
                  }}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg border-none text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  مشاركة التقييم
                </button>
              </div>
              <div className="text-xs leading-relaxed font-semibold text-slate-100 whitespace-pre-line text-right selection:bg-slate-700 selection:text-white pb-2" style={{ direction: 'rtl' }}>
                {globalPortfolioAnalysis.text}
              </div>
            </motion.div>
          )}

          {/* Individual site audit card matrix */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">مصفوفة تدقيق نفقات المواقع الفردية</h4>
            
            {rawProjects.filter(p => !p.status || ['in-progress', 'active'].includes(p.status)).length === 0 ? (
              <p className="text-xs text-slate-450 font-semibold text-center py-6 bg-slate-50 rounded-xl">لا توجد حالياً مواقع نشطة خاضعة للرهن المالي التشغيلي.</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {rawProjects
                  .filter(p => !p.status || ['in-progress', 'active'].includes(p.status))
                  .map(p => {
                    const relatedTxs = rawTransactions.filter(t => t.projectId === p.id);
                    const totalSpent = relatedTxs
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                    const budget = Number(p.budget) || 0;
                    const balance = budget - totalSpent;
                    const pct = budget > 0 ? Math.min(100, Math.round((totalSpent / budget) * 100)) : 0;
                    const isOverBudget = totalSpent > budget && budget > 0;
                    const isApproachingCrisis = pct >= 75 && pct <= 100 && budget > 0;
                    const aiResult = projectAnalysisMap[p.id];

                    return (
                      <div 
                        key={p.id} 
                        className={`border rounded-2xl p-5 transition bg-white relative flex flex-col justify-between ${
                          isOverBudget ? 'border-red-200 bg-red-50/5' :
                          isApproachingCrisis ? 'border-amber-200 bg-amber-50/5' : 'border-slate-150 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div>
                          {/* Project Header */}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <span className="inline-block text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                {(p.projectType === 'hoardings' && 'أسوار دعائية لوحات') || 
                                 (p.projectType === 'signage_printing' && 'لوحات طباعة') || 
                                 (p.projectType === 'cladding_letters' && 'كلادينج وحروف بارزة') || 
                                 (p.projectType === 'digital_screens' && 'شاشات ومجسمات ضوئية') || 'دعاية وإنشاءات المقاولات'}
                              </span>
                              <h5 className="font-extrabold text-sm text-slate-800 mt-2">{p.title || p.name}</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">المالك/العميل المستفيد: {p.clientName || 'مستند خارجي'}</p>
                            </div>

                            <div className="text-left">
                              <span className="inline-block text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg">
                                الإنجاز الميداني: {p.progress || 0}%
                              </span>
                            </div>
                          </div>

                          {/* financial summary parameters detailed */}
                          <div className="grid grid-cols-3 gap-2 py-3 border border-slate-100/80 mb-3 bg-slate-50/50 rounded-xl p-3 select-none text-right">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block mb-0.5">الموازنة الكلية</span>
                              <span className="text-[11px] font-black text-slate-800">{budget > 0 ? budget.toLocaleString('ar-SA') : '—'} <span className="text-[8px] font-bold text-slate-400">ر.س</span></span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block mb-0.5">نفقات تشغيلية فعلي</span>
                              <span className={`text-[11px] font-black ${isOverBudget ? 'text-red-650' : 'text-slate-800'}`}>{totalSpent.toLocaleString('ar-SA')} <span className="text-[8px] font-bold text-slate-400">ر.س</span></span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 block mb-0.5">رصيد الأمان الحالي</span>
                              <span className={`text-[11px] font-black ${balance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{balance.toLocaleString('ar-SA')} <span className="text-[8px] font-bold text-slate-400">ر.س</span></span>
                            </div>
                          </div>

                          {/* progress meter layout */}
                          {budget > 0 && (
                            <div className="space-y-1 mb-4 pt-1">
                              <div className="flex justify-between text-[10px] font-extrabold">
                                <span className="text-slate-400">معدل التآكل والصرف من الميزانية:</span>
                                <span className={`${pct > 90 ? 'text-red-600 font-extrabold' : pct > 70 ? 'text-amber-600' : 'text-indigo-600'}`}>{pct}٪</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isOverBudget ? 'bg-red-500' :
                                    isApproachingCrisis ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`} 
                                  style={{ width: `${pct}%` }} 
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* action triggers */}
                        <div className="space-y-3 pt-1">
                          <button
                            onClick={() => handleProjectAIAnalysis(p)}
                            disabled={aiResult?.reading}
                            className="w-full h-9 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-250 font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            {aiResult?.reading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                جاري تحليل الصرف بـ Gemini...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                الفحص الذكي للتدفق (Gemini AI)
                              </>
                            )}
                          </button>

                          {aiResult?.text && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`p-4 rounded-xl text-[11px] leading-relaxed font-semibold border ${
                                aiResult.isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1.5 font-black text-slate-800">
                                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                توصيات المستشار ائتماني المحددة:
                              </div>
                              <p className="text-right whitespace-pre-line">{aiResult.text}</p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* 🗺️ SECURE METADATA CORPORATE FOOTER */}
        <div className="bg-[#0f172a] rounded-2xl p-5 text-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'الآليات الميدانية المسجلة', value: stats.totalWorkers, icon: HardHat },
              { label: 'نفاذية وعدد المشاريع المستمرة', value: stats.activeProjects, icon: Building2 },
              { label: 'الموظفون الإداريون والتقنيون', value: stats.totalEmployees, icon: Users },
              { label: 'أوراق انضباط حضور اليوم', value: stats.todayAttendance, icon: CheckCircle },
            ].map(s => (
              <div key={s.label} className="space-y-1 text-right md:text-center">
                <s.icon className="w-4.5 h-4.5 text-white/20 mx-auto hidden md:block" />
                <p className="text-lg font-black text-white">{s.value.toLocaleString('ar-SA')}</p>
                <p className="text-[9.5px] text-slate-400 font-extrabold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
