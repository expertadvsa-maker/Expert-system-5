import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon, 
  BarChart3, 
  ArrowUpRight,
  ChevronRight,
  Layers,
  Users,
  CheckCircle2,
  Briefcase,
  Activity,
  Zap,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Transaction, Project, UserProfile, Attendance } from '../types';
import { generateBIRecommendations } from '../lib/gemini';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export default function Analytics({ 
  onBack, 
  onSelectEmployee 
}: { 
  onBack?: () => void; 
  onSelectEmployee?: (id: string) => void; 
}) {
  const { activeCompanyId } = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [workerTransactions, setWorkerTransactions] = useState<any[]>([]);
  
  const [recommendations, setRecommendations] = useState<string[]>([
    "تحسين سياسة التحصيل بالمستخلصات لتكثيف النقدية بنسبة 5%",
    "جدولة مشتريات المواد الخام لخفض التكلفة التشغيلية الإضافية",
    "أتمتة طلبات تصاريح المواقع لتسريع مراحل التسليم الفعلي"
  ]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    const unsubTx = onSnapshot(
      activeCompanyId ? query(collection(db, 'transactions'), where('companyId', '==', activeCompanyId), orderBy('date', 'desc')) : query(collection(db, 'transactions'), orderBy('date', 'desc')), 
      (snap) => {
      setTransactions(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        dateObj: d.data().date?.toDate?.() || new Date(d.data().date) 
      } as any)));
    }, (err) => {
      if (!activeCompanyId) return;
      console.error("Analytics Transactions Listen Error:", err);
    });

    const unsubProj = onSnapshot(
      activeCompanyId ? query(collection(db, 'projects'), where('companyId', '==', activeCompanyId)) : collection(db, 'projects'), 
      (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      if (!activeCompanyId) return;
      console.error("Analytics Projects Listen Error:", err);
    });

    const unsubEmp = onSnapshot(
      activeCompanyId ? query(collection(db, 'users'), where('companyId', '==', activeCompanyId)) : collection(db, 'users'), 
      (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      if (!activeCompanyId) return;
      console.error("Analytics Employees Listen Error:", err);
    });

    const unsubAtt = onSnapshot(
      activeCompanyId ? query(collection(db, 'attendance'), where('companyId', '==', activeCompanyId)) : collection(db, 'attendance'), 
      (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      if (!activeCompanyId) return;
      console.error("Analytics Attendance Listen Error:", err);
    });

    const unsubWorkerTx = onSnapshot(
      activeCompanyId ? query(collection(db, 'workerTransactions'), where('companyId', '==', activeCompanyId)) : collection(db, 'workerTransactions'), 
      (snap) => {
      setWorkerTransactions(snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        dateObj: d.data().date?.toDate?.() || new Date(d.data().date)
      } as any)));
    }, (err) => console.error("Analytics Worker Tx Listen Error:", err));

    return () => {
      unsubTx();
      unsubProj();
      unsubEmp();
      unsubAtt();
      unsubWorkerTx();
    };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      prevStartDate.setDate(now.getDate() - 1);
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setDate(now.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      startDate.setDate(now.getDate() - 7);
      prevStartDate.setDate(now.getDate() - 14);
      prevEndDate.setDate(now.getDate() - 7);
    } else if (period === 'monthly') {
      startDate.setMonth(now.getMonth() - 1);
      prevStartDate.setMonth(now.getMonth() - 2);
      prevEndDate.setMonth(now.getMonth() - 1);
    } else if (period === 'yearly') {
      startDate.setFullYear(now.getFullYear() - 1);
      prevStartDate.setFullYear(now.getFullYear() - 2);
      prevEndDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0);
      prevStartDate = new Date(0);
      prevEndDate = new Date(0);
    }

    const txs = transactions.filter(t => t.dateObj >= startDate);
    const atts = attendance.filter(a => (a.date?.toDate?.() || new Date(a.date)) >= startDate);

    // Stats
    const wTxs = workerTransactions.filter(t => t.dateObj >= startDate);
    const workerExpense = wTxs.filter(t => t.type === 'payment').reduce((acc, t) => acc + (t.amount || 0), 0);

    const income = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
    const purchase = txs.filter(t => t.type === 'purchase').reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalExp = expense + purchase + workerExpense;
    const netProfit = income - totalExp;
    const margin = income > 0 ? (netProfit / income) * 100 : 0;
    
    // Project Stats
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const activeProjects = projects.filter(p => p.status === 'in-progress' || p.status === 'pending').length;
    
    // Employee Stats
    const attendanceCount = atts.length;
    const daysInPeriod = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : period === 'yearly' ? 365 : 100;
    const attendanceRate = (employees.length > 0 && daysInPeriod > 0) ? (attendanceCount / (employees.length * daysInPeriod)) * 100 : 85;

    // Previous Period Stats for Growth Calculations
    const prevTxs = transactions.filter(t => t.dateObj >= prevStartDate && t.dateObj < prevEndDate);
    const prevAtts = attendance.filter(a => {
      const d = a.date?.toDate?.() || new Date(a.date);
      return d >= prevStartDate && d < prevEndDate;
    });

    const prevWTxs = workerTransactions.filter(t => t.dateObj >= prevStartDate && t.dateObj < prevEndDate);
    const prevWorkerExpense = prevWTxs.filter(t => t.type === 'payment').reduce((acc, t) => acc + (t.amount || 0), 0);

    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
    const prevExpense = prevTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
    const prevPurchase = prevTxs.filter(t => t.type === 'purchase').reduce((acc, t) => acc + (t.amount || 0), 0);
    const prevTotalExp = prevExpense + prevPurchase + prevWorkerExpense;
    const prevNetProfit = prevIncome - prevTotalExp;
    const prevMargin = prevIncome > 0 ? (prevNetProfit / prevIncome) * 100 : 0;

    const prevAttCount = prevAtts.length;
    const prevAttRate = (employees.length > 0 && daysInPeriod > 0) ? (prevAttCount / (employees.length * daysInPeriod)) * 100 : 85;

    // Calculate Growth Trends
    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? `+100%` : `0%`;
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    const incomeTrend = calcGrowth(income, prevIncome);
    const profitTrend = calcGrowth(netProfit, prevNetProfit);
    const marginTrend = calcGrowth(margin, prevMargin);
    const attendanceTrend = calcGrowth(attendanceRate, prevAttRate);

    // Chart grouping
    const chartGroups: any = {};
    txs.forEach(t => {
      let key = '';
      if (period === 'daily') key = t.dateObj.getHours() + ':00';
      else if (period === 'weekly') key = t.dateObj.toLocaleDateString('ar-SA', { weekday: 'short' });
      else if (period === 'monthly' || period === 'all') key = t.dateObj.toLocaleDateString('ar-SA', { month: 'short' });
      else key = t.dateObj.getFullYear().toString();

      if (!chartGroups[key]) chartGroups[key] = { name: key, income: 0, expense: 0, profit: 0, timestamp: t.dateObj.getTime() };
      if (t.type === 'income') chartGroups[key].income += t.amount;
      else if (t.type === 'expense' || t.type === 'purchase') chartGroups[key].expense += t.amount;
      chartGroups[key].profit = chartGroups[key].income - chartGroups[key].expense;
    });

    wTxs.forEach(t => {
      if (t.type !== 'payment') return;
      let key = '';
      if (period === 'daily') key = t.dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      else if (period === 'weekly') key = t.dateObj.toLocaleDateString('ar-SA', { weekday: 'short' });
      else if (period === 'monthly' || period === 'all') key = t.dateObj.toLocaleDateString('ar-SA', { month: 'short' });
      else key = t.dateObj.getFullYear().toString();

      if (!chartGroups[key]) chartGroups[key] = { name: key, income: 0, expense: 0, profit: 0, timestamp: t.dateObj.getTime() };
      chartGroups[key].expense += t.amount || 0;
      chartGroups[key].profit = chartGroups[key].income - chartGroups[key].expense;
    });

    const sortedCharts = Object.values(chartGroups).sort((a: any, b: any) => a.timestamp - b.timestamp);

    // Riyadh VAT tax calculation (15%)
    const vatOutput = income * 0.15;
    const vatInput = (txs.filter(t => t.type === 'purchase').reduce((acc, t) => acc + (t.amount || 0), 0) * 0.15) / 1.15;
    const vatNet = vatOutput - vatInput;

    // Asset operational efficiency calculation
    const completedProjectsCount = projects.filter(p => p.status === 'completed').length;
    const totalProjectsCount = projects.length;
    const projRatio = totalProjectsCount > 0 ? (completedProjectsCount + 1) / (totalProjectsCount + 1) : 1;
    const calculatedAssetEfficiency = Math.min(100, Math.round(attendanceRate * 0.4 + projRatio * 60));

    // Expense Breakdown
    const expenseBreakdown: Record<string, number> = {};
    txs.filter(t => t.type === 'expense' || t.type === 'purchase').forEach(t => {
      const cat = t.category || 'غير مصنف';
      expenseBreakdown[cat] = (expenseBreakdown[cat] || 0) + (t.amount || 0);
    });
    
    if (workerExpense > 0) {
      expenseBreakdown['رواتب ومدفوعات العمال'] = workerExpense;
    }
    
    const sortedExpenseBreakdown = Object.entries(expenseBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      income,
      expense: totalExp,
      netProfit,
      margin,
      activeProjects,
      completedProjects,
      attendanceRate: Math.min(attendanceRate, 100),
      chartData: sortedCharts,
      incomeTrend,
      profitTrend,
      marginTrend,
      attendanceTrend,
      vatOutput,
      vatInput,
      vatNet,
      assetEfficiency: calculatedAssetEfficiency,
      expenseBreakdown: sortedExpenseBreakdown
    };
  }, [period, transactions, projects, employees, attendance]);

  // Rank employees by multi-dimensional performance index during the selected period
  const rankedEmployees = useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    if (period === 'daily') startDate.setHours(0, 0, 0, 0);
    else if (period === 'weekly') startDate.setDate(now.getDate() - 7);
    else if (period === 'monthly') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'yearly') startDate.setFullYear(now.getFullYear() - 1);
    else startDate = new Date(0);

    const daysInPeriod = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : period === 'yearly' ? 365 : 100;

    // 1. Gather attendance metrics (Punctuality & Hours)
    const empAttendanceStats: Record<string, { presentDays: number; totalDays: number; lateCount: number; workHoursTotal: number }> = {};
    attendance.forEach(att => {
      const attDate = att.date?.toDate?.() || new Date(att.date);
      if (attDate >= startDate) {
        const empId = att.userId || (att as any).employeeId;
        if (empId) {
          if (!empAttendanceStats[empId]) {
            empAttendanceStats[empId] = { presentDays: 0, totalDays: 0, lateCount: 0, workHoursTotal: 0 };
          }
          empAttendanceStats[empId].totalDays += 1;
          if (att.status === 'present') {
            empAttendanceStats[empId].presentDays += 1;
            if (att.checkIn) {
              const [h, m] = att.checkIn.split(':').map(Number);
              if (h > 8 || (h === 8 && m > 15)) {
                empAttendanceStats[empId].lateCount += 1;
              }
              if (att.checkOut) {
                const [oh, om] = att.checkOut.split(':').map(Number);
                const diffHours = (oh + om / 60) - (h + m / 60);
                if (diffHours > 0) empAttendanceStats[empId].workHoursTotal += diffHours;
              }
            }
          }
        }
      }
    });

    // 2. Gather project milestones metrics (Completion Rate & Compliance Scores)
    const empMilestonesStats: Record<string, { total: number; completed: number; totalComplianceScore: number; complianceCount: number }> = {};
    projects.forEach(p => {
      if (p.milestones) {
        p.milestones.forEach(m => {
          if (m.assignedWorkerId) {
            const workerId = m.assignedWorkerId;
            if (!empMilestonesStats[workerId]) {
              empMilestonesStats[workerId] = { total: 0, completed: 0, totalComplianceScore: 0, complianceCount: 0 };
            }
            empMilestonesStats[workerId].total += 1;
            if (m.status === 'completed') {
              empMilestonesStats[workerId].completed += 1;
            }
            if (m.verification && m.verification.complianceScore !== undefined) {
              empMilestonesStats[workerId].totalComplianceScore += m.verification.complianceScore;
              empMilestonesStats[workerId].complianceCount += 1;
            }
          }
        });
      }
    });

    // 3. Compute combined score for each employee
    return employees.map(emp => {
      const empId = emp.id || emp.uid || '';
      
      // Attendance Score (40% weight)
      const attStats = empAttendanceStats[empId] || { presentDays: 0, totalDays: 0, lateCount: 0, workHoursTotal: 0 };
      const attRate = daysInPeriod > 0 ? (attStats.presentDays / daysInPeriod) * 100 : 0;
      const latenessRate = attStats.presentDays > 0 ? (attStats.lateCount / attStats.presentDays) : 0;
      const attScore = Math.max(0, attRate * (1 - latenessRate * 0.3));

      // Milestone Performance & Quality Score (40% weight)
      const mileStats = empMilestonesStats[empId] || { total: 0, completed: 0, totalComplianceScore: 0, complianceCount: 0 };
      const completionRate = mileStats.total > 0 ? (mileStats.completed / mileStats.total) * 100 : 0;
      const avgCompliance = mileStats.complianceCount > 0 ? (mileStats.totalComplianceScore / mileStats.complianceCount) : 0;
      const milestoneScore = (completionRate * 0.6) + (avgCompliance * 0.4);

      // Productivity Score (20% weight) - computed from average working hours
      const expectedHours = attStats.presentDays * 8;
      const workHoursRatio = expectedHours > 0 ? Math.min(1.2, attStats.workHoursTotal / expectedHours) : 1.0;
      const productivityScore = workHoursRatio * 100;

      // Combined Performance Index
      const hasData = attStats.totalDays > 0 || mileStats.total > 0;
      let finalIndex = hasData ? (attScore * 0.4) + (milestoneScore * 0.4) + (productivityScore * 0.2) : 0;

      return {
        ...emp,
        hasData,
        attendanceRate: Math.min(100, Math.max(0, finalIndex)),
        attRate: Math.min(100, attRate),
        tasksRate: Math.round(completionRate)
      };
    }).sort((a, b) => {
      if (!a.hasData && b.hasData) return 1;
      if (a.hasData && !b.hasData) return -1;
      return b.attendanceRate - a.attendanceRate;
    });
  }, [employees, attendance, projects, period]);

  useEffect(() => {
    // Generate AI recommendations on period or financial data change
    if (filteredData.income === 0 && filteredData.expense === 0) return;
    
    const cacheKey = `bi_recs_${period}_${filteredData.income}_${filteredData.expense}_${filteredData.netProfit}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setRecommendations(JSON.parse(cached));
      return;
    }

    let isSubscribed = true;
    const fetchRecs = async () => {
      setRecsLoading(true);
      try {
        const stats = {
          income: filteredData.income,
          expense: filteredData.expense,
          netProfit: filteredData.netProfit,
          margin: filteredData.margin,
          activeProjects: filteredData.activeProjects,
          completedProjects: filteredData.completedProjects,
          attendanceRate: filteredData.attendanceRate
        };
        const res = await generateBIRecommendations(stats);
        if (isSubscribed && res && res.length === 3) {
          setRecommendations(res);
          localStorage.setItem(cacheKey, JSON.stringify(res));
        }
      } catch (err) {
        console.error("Error loading BI recommendations:", err);
      } finally {
        if (isSubscribed) setRecsLoading(false);
      }
    };

    fetchRecs();
    return () => { isSubscribed = false; };
  }, [period, filteredData.income, filteredData.expense, filteredData.netProfit]);

  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body {
          background: white !important;
          color: black !important;
        }
        aside, nav, footer, .lg\\:hidden, button, select, input, .no-print, [role="toolbar"], header, .bg-indigo-600, .bg-gradient-to-r {
          display: none !important;
        }
        main, .min-h-screen, .space-y-6 {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        .grid {
          gap: 12px !important;
        }
        .bg-white, .border {
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6 pb-20 w-full px-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button onClick={onBack} variant="ghost" size="icon" className="rounded-lg bg-white shadow-sm border border-slate-200 h-9 w-9">
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">ذكاء الأعمال والتحليلات (Business BI)</h1>
            <p className="text-slate-500 text-xs font-semibold flex items-center gap-2 mt-0.5">
               مركز التقارير وقراءة مؤشرات كفاءة الأداء المالي والتشغيلي للمشاريع ثانية بثانية
               <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 py-0.5 h-4.5 text-[9px] font-bold animate-pulse">مباشر</Badge>
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start">
          <PeriodButton active={period === 'daily'} label="يومي" onClick={() => setPeriod('daily')} />
          <PeriodButton active={period === 'weekly'} label="أسبوعي" onClick={() => setPeriod('weekly')} />
          <PeriodButton active={period === 'monthly'} label="شهري" onClick={() => setPeriod('monthly')} />
          <PeriodButton active={period === 'yearly'} label="سنوي" onClick={() => setPeriod('yearly')} />
          <PeriodButton active={period === 'all'} label="شامل" onClick={() => setPeriod('all')} />
        </div>
      </div>

      {/* Main Grid: Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Row 1: KPI Cards */}
        <StatCard 
          title="صافي الأرباح" 
          value={filteredData.netProfit} 
          subtitle="الأداء المالي الإجمالي الصافي"
          icon={Wallet} 
          trend={filteredData.profitTrend}
          color="blue" 
        />
        <StatCard 
          title="نسبة الإنجاز" 
          value={filteredData.completedProjects} 
          subtitle="مشاريع منتهية ومسلمة"
          icon={CheckCircle2} 
          isCount
          trend={`إجمالي ${projects.length}`}
          color="emerald" 
        />
        <StatCard 
          title="نسبة حضور وانضباط الفريق" 
          value={filteredData.attendanceRate.toFixed(1)} 
          subtitle="معدل الحضور والانضباط اليومي"
          icon={Activity} 
          isPercent
          trend={filteredData.attendanceTrend}
          color="amber" 
        />
        <StatCard 
          title="معدل نمو المؤسسة" 
          value={filteredData.margin.toFixed(1)} 
          subtitle="هامش الربحية التشغيلي"
          icon={TrendingUp} 
          isPercent
          trend={filteredData.marginTrend}
          color="indigo" 
        />

        {/* Row 2: Charts */}
        <Card className="lg:col-span-3 rounded-xl border border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
               <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                    <BarChart3 className="w-4.5 h-4.5 text-slate-700" />
                    تحليل التدفقات والربحية والسيولة المتوقعة
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400 mt-0.5">مراقبة الأداء المالي المباشر وتتبع العوائد مقابل المصاريف</CardDescription>
               </div>
               <div className="flex gap-4">
                  <LegendItem label="إيرادات" color="bg-emerald-500" />
                  <LegendItem label="أرباح صافية" color="bg-blue-500" />
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[320px] w-full" style={{ minHeight: 320 }}>
              <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0}>
                <AreaChart data={filteredData.chartData}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 600, fill: '#64748b'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 600, fill: '#64748b'}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Cairo', padding: '10px 14px' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Secondary Insights */}
        <div className="flex flex-col gap-4">
           <Card className="rounded-xl border border-slate-900 bg-slate-950 text-white p-6 flex flex-col justify-between h-1/2">
              <div className="flex justify-between items-start">
                <Zap className="w-8 h-8 text-amber-400" />
                <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/10 border-none text-[8px]">مؤشر الكفاءة</Badge>
              </div>
              <div>
                 <h4 className="text-sm font-bold text-slate-100">كفاءة تشغيل الأصول</h4>
                 <p className="text-[10px] text-slate-400 font-medium">وفق المشاريع الفعالة الحالية ومعدلات حضور الكادر البشري</p>
              </div>
              <div className="mt-4">
                 <div className="text-3xl font-bold font-mono text-amber-400">{filteredData.assetEfficiency}%</div>
                 <div className="w-full h-1.5 bg-white/10 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-1000" style={{ width: `${filteredData.assetEfficiency}%` }} />
                 </div>
              </div>
           </Card>

           <Card className="rounded-xl border border-slate-200/60 bg-white p-6 flex flex-col justify-between h-1/2 relative overflow-hidden">
              <div className="relative z-10 space-y-1">
                 <div className="w-8 h-8 bg-emerald-50 text-emerald-700 flex items-center justify-center rounded-lg mb-2">
                   <Briefcase className="w-4 h-4" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-400">المشاريع النشطة حالياً</p>
                 <h4 className="text-base font-bold text-slate-800">{filteredData.activeProjects} مشاريع قيد التنفيذ</h4>
              </div>
              <div className="absolute right-2 -bottom-2 opacity-[0.03]">
                 <Layers className="w-24 h-24 text-slate-950" />
              </div>
           </Card>
        </div>

        {/* Row 3: Employees & Tasks */}
        <Card className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm flex flex-col">
           <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                 <Users className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-sm font-black text-slate-800">الأكثر كفاءة والتزاماً</h4>
           </div>
           <div className="space-y-4 flex-1">
              {rankedEmployees.slice(0, 4).map((emp, i) => (
                 <div 
                    key={i} 
                    onClick={() => onSelectEmployee?.(emp.id || emp.uid || '')}
                    className={`flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-indigo-50/20 hover:border-indigo-200 transition duration-200 ${onSelectEmployee ? 'cursor-pointer' : ''}`}
                 >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shrink-0">
                             {emp.name?.[0]}
                          </div>
                          <div>
                             <p className="text-xs font-black text-slate-800">{emp.name}</p>
                             <p className="text-[10px] text-slate-400 font-bold">
                               {emp.role === 'manager' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'فني'}
                             </p>
                          </div>
                       </div>
                       <Badge variant="outline" className={`text-[9px] font-black shadow-none px-2 py-0.5 rounded-lg ${!emp.hasData ? 'bg-slate-50 text-slate-400 border-slate-200' : emp.attendanceRate >= 90 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                         {!emp.hasData ? 'لا توجد بيانات 🚫' : emp.attendanceRate >= 90 ? 'ممتاز ⭐' : 'نشط'}
                       </Badge>
                    </div>

                    {/* Progress Bar & Key Stats */}
                    <div className="mt-2 space-y-1.5">
                       <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-500">مؤشر الكفاءة العام</span>
                          <span className={emp.hasData ? "text-indigo-600 font-black" : "text-slate-400 font-bold"}>
                            {emp.hasData ? `${Math.round(emp.attendanceRate)}%` : 'N/A'}
                          </span>
                       </div>
                       <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                             className={`h-full rounded-full transition-all duration-500 ${emp.hasData ? 'bg-indigo-600' : 'bg-slate-300'}`} 
                             style={{ width: `${emp.hasData ? Math.round(emp.attendanceRate) : 0}%` }} 
                          />
                       </div>
                       <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold pt-0.5">
                          <span>الالتزام بالحضور: {emp.hasData ? `${Math.round(emp.attRate)}%` : 'N/A'}</span>
                          <span>معالم المشاريع: {emp.hasData ? `${Math.round(emp.tasksRate)}%` : 'N/A'}</span>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </Card>

        {/* Row 3: Distribution Chart */}
        <Card className="lg:col-span-2 rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-800">
              <PieChartIcon className="w-4.5 h-4.5 text-slate-500" />
              توزيع وتخصيص التدفقات النقدية والضرائب
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               <div className="h-[180px] w-full" style={{ minHeight: 180 }}>
                  <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={[
                           { name: 'إيراد', value: filteredData.income },
                           { name: 'صرف', value: filteredData.expense },
                           { name: 'صافي', value: filteredData.netProfit > 0 ? filteredData.netProfit : 0 },
                           { name: 'ضريبة', value: Math.max(0, filteredData.vatNet) }
                        ]}
                        cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value"
                      >
                        {COLORS.map((c, i) => <Cell key={i} fill={c} cornerRadius={4} />)}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex justify-between items-center">
                     <div>
                        <span className="text-[9px] font-semibold text-emerald-700">الإيرادات (إجمالي التدفق)</span>
                        <div className="text-xs font-bold text-emerald-900 mt-0.5">{filteredData.income.toLocaleString()} ر.س</div>
                     </div>
                     <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex justify-between items-center">
                     <div>
                        <span className="text-[9px] font-semibold text-blue-700">الأرباح الصافية</span>
                        <div className="text-xs font-bold text-blue-900 mt-0.5">{filteredData.netProfit.toLocaleString()} ر.س</div>
                     </div>
                     <Zap className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100 flex justify-between items-center">
                     <div>
                        <span className="text-[9px] font-semibold text-red-700">المصروفات والتشغيل</span>
                        <div className="text-xs font-bold text-red-900 mt-0.5">{filteredData.expense.toLocaleString()} ر.س</div>
                     </div>
                     <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex justify-between items-center">
                     <div>
                        <span className="text-[9px] font-semibold text-indigo-700">صافي الضريبة والزكاة بالرياض (VAT 15%)</span>
                        <div className="text-xs font-bold text-indigo-900 mt-0.5">{filteredData.vatNet.toLocaleString(undefined, {maximumFractionDigits:2})} ر.س</div>
                     </div>
                     <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
               </div>
            </div>

            {/* Expense Breakdown Section */}
            {filteredData.expenseBreakdown && filteredData.expenseBreakdown.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5" />
                  تحليل المصروفات (أين تذهب الأموال؟)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredData.expenseBreakdown.slice(0, 4).map((exp: any, i: number) => {
                    const pct = filteredData.expense > 0 ? (exp.value / filteredData.expense) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex justify-between w-full text-[10px] font-bold text-slate-700">
                            <span>{exp.name}</span>
                            <span>{exp.value.toLocaleString()} ر.س ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </Card>

        {/* Row 3: Insights Panel */}
        <Card className="rounded-xl border border-slate-900 bg-slate-950 text-white p-6 shadow-sm flex flex-col justify-between">
           <div>
              <div className="flex justify-between items-center">
                 <h4 className="text-sm font-bold flex items-center gap-2">
                     <ArrowUpRight className="w-4.5 h-4.5 text-emerald-400" />
                     توصيات ذكية مقترحة
                 </h4>
                 {recsLoading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
              </div>
              {recsLoading ? (
                 <div className="space-y-4 mt-6 animate-pulse">
                    <div className="h-3 bg-white/10 rounded w-5/6" />
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-4/5" />
                 </div>
              ) : (
                 <div className="space-y-3.5 mt-5">
                    {recommendations.map((rec, i) => (
                       <InsightItem key={i} text={rec} color={i === 0 ? "bg-emerald-400" : i === 1 ? "bg-blue-400" : "bg-amber-400"} />
                    ))}
                 </div>
              )}
           </div>
           <Button 
              onClick={handleExportPDF}
              className="w-full mt-6 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 h-9 text-xs font-semibold cursor-pointer"
           >
              تصدير كشف مؤشرات الأداء
           </Button>
        </Card>
      </div>
    </div>
  );
}

function PeriodButton({ active, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all cursor-pointer ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, isPercent, isCount, trend }: any) {
  const themes: any = {
    blue: 'border-l-4 border-l-blue-500',
    emerald: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    indigo: 'border-l-4 border-l-indigo-500'
  };

  return (
    <Card className={`${themes[color]} rounded-xl border border-slate-200/60 bg-white p-5 shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
           <div className="p-2.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-100">
              <Icon className="w-4 h-4" />
           </div>
           <Badge variant="secondary" className="bg-slate-50 text-slate-600 border border-slate-100 font-bold text-[9px] pointer-events-none">{trend}</Badge>
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-xl md:text-2xl font-bold text-slate-900 font-mono mt-0.5 tracking-tight">
          {isPercent ? `${value}%` : isCount ? value : `${Math.round(value).toLocaleString()} ر.س`}
        </h3>
        <p className="text-[9px] mt-1 font-medium text-slate-400">{subtitle}</p>
      </div>
    </Card>
  );
}

function LegendItem({ label, color }: any) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
    </div>
  );
}

function InsightItem({ text, color }: any) {
  return (
    <div className="flex items-start gap-2.5">
       <div className={`w-1 h-1 rounded-full ${color} mt-2 shrink-0`} />
       <p className="text-[11px] font-medium text-slate-300 leading-relaxed">{text}</p>
    </div>
  );
}
