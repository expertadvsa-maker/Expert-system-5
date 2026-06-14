import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileText, Download, Loader2, Sparkles, Filter, BarChart3, Database, BrainCircuit, AlignLeft } from 'lucide-react';
import { saveReport, ReportType } from '../lib/reports';
import { toast } from 'sonner';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { getCompanyQuery } from '../lib/firestoreUtils';
import { generateReportInsights } from '../lib/gemini';

const Switch = ({ checked, onCheckedChange, className = '' }: { checked: boolean, onCheckedChange: (c: boolean) => void, className?: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${checked ? 'bg-indigo-600 ' + className : 'bg-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? '-translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportGeneratorModal({ isOpen, onClose }: ReportGeneratorModalProps) {
  const { profile, activeCompanyId } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('projects');
  const [specificTarget, setSpecificTarget] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Advanced Options
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeFinancials, setIncludeFinancials] = useState(false);
  const [aiInsights, setAiInsights] = useState(true);
  const [detailedBreakdown, setDetailedBreakdown] = useState(false);

  // Data fetching for dynamic dropdowns
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [projects, setProjects] = useState<{id: string, title: string}[]>([]);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchDropdownData = async () => {
      try {
        const usersSnap = await getDocs(getCompanyQuery('users', activeCompanyId));
        setEmployees(usersSnap.docs.map(d => ({ id: d.id, name: d.data().name || 'بدون اسم' })));

        const projectsSnap = await getDocs(getCompanyQuery('projects', activeCompanyId));
        setProjects(projectsSnap.docs.map(d => ({ id: d.id, title: d.data().title || 'مشروع بدون اسم' })));

        const clientsSnap = await getDocs(getCompanyQuery('clients', activeCompanyId));
        setClients(clientsSnap.docs.map(d => ({ id: d.id, name: d.data().name || 'عميل بدون اسم' })));
      } catch (e) {
        console.error("Error fetching data for report modal", e);
      }
    };
    
    fetchDropdownData();
  }, [isOpen]);

  // Reset specific target when report type changes
  useEffect(() => {
    setSpecificTarget('all');
  }, [reportType]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        const typeLabels: Record<string, string> = {
            projects: 'المشاريع',
            financial: 'المالية',
            employees: 'الموظفين',
            attendance: 'الحضور والانصراف',
            payrolls: 'الرواتب والأجور',
            workers: 'العمالة اليومية',
            clients: 'العملاء',
            invoices: 'الفواتير',
            quotations: 'عروض الأسعار',
            purchases: 'المشتريات',
            inventory: 'المخزون',
            assets: 'الأصول',
            subcontractors: 'مقاولي الباطن',
            tasks: 'المهام',
            custom: 'مخصص'
        };

        let targetName = 'الكل';
        if (specificTarget !== 'all') {
            if (reportType === 'employees') targetName = employees.find(e => e.id === specificTarget)?.name || 'محدد';
            if (reportType === 'projects') targetName = projects.find(p => p.id === specificTarget)?.title || 'محدد';
            if (reportType === 'clients') targetName = clients.find(c => c.id === specificTarget)?.name || 'محدد';
        }

        const reportTitle = `تقرير ${typeLabels[reportType] || 'عام'} الذكي (${targetName})`;

        // Real Data Fetching Based on reportType
        let collectionName = reportType;
        if (reportType === 'financial') collectionName = 'transactions';
        if (reportType === 'employees') collectionName = 'users';
        if (reportType === 'payrolls') collectionName = 'payrolls';
        
        let q = getCompanyQuery(collectionName, activeCompanyId);
        // We could add date filtering to query, but for simplicity we fetch all for the company and filter in JS if needed
        const snap = await getDocs(q);
        
        let rawData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter by date if provided
        if (startDate && endDate) {
            rawData = rawData.filter((item: any) => {
                const itemDate = item.date || item.createdAt || item.timestamp;
                if (!itemDate) return true; // Keep items without date
                
                let dateStr = '';
                if (typeof itemDate === 'string') dateStr = itemDate;
                else if (itemDate.toDate) dateStr = itemDate.toDate().toISOString();
                
                return dateStr >= startDate && dateStr <= endDate + 'T23:59:59.999Z';
            });
        }

        // Metrics Generation
        const metrics = [
            { label: 'إجمالي السجلات المرتبطة', value: rawData.length },
            { label: 'حجم البيانات المحللة', value: `${(JSON.stringify(rawData).length / 1024).toFixed(2)} KB` }
        ];

        let aiSummary = null;
        if (aiInsights && rawData.length > 0) {
            aiSummary = await generateReportInsights(rawData.slice(0, 50), typeLabels[reportType] || 'عام'); // slice to avoid huge payload
        } else if (aiInsights) {
            aiSummary = "لا توجد بيانات كافية ضمن الفترة المحددة لتحليلها ذكياً.";
        }

        const realData = {
          generatedAt: new Date().toISOString(),
          optionsUsed: { includeCharts, includeFinancials, aiInsights, detailedBreakdown },
          metrics,
          records: rawData,
          aiSummary
        };

        await saveReport({
            title: reportTitle,
            type: reportType,
            dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
            data: realData,
            createdBy: profile?.name || "النظام الذكي"
        });

        toast.success('تم توليد التقرير المتقدم وحفظه بنجاح! 🎉');
        onClose();
    } catch (e) {
        toast.error('حدث خطأ أثناء توليد التقرير');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[95vw] md:w-full bg-slate-50/50 rounded-3xl p-0 shadow-2xl overflow-hidden border border-slate-200" dir="rtl">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <DialogTitle className="flex items-center gap-4 text-2xl font-black text-slate-800">
            <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-6 h-6" />
            </div>
            محرك التقارير الذكي
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">إصدار متقدم</span>
          </DialogTitle>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Left Column (Primary Selections) */}
            <div className="md:col-span-5 space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Database className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-800">بيانات التقرير الأساسية</h3>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-slate-600 font-bold text-sm">موضوع التقرير</Label>
                        <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold">
                                <SelectValue placeholder="اختر نوع التقرير" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="projects">المشاريع والأداء</SelectItem>
                                <SelectItem value="financial">الحركة المالية والخزينة</SelectItem>
                                <SelectItem value="employees">الموظفين والمناديب</SelectItem>
                                <SelectItem value="attendance">الحضور والانصراف</SelectItem>
                                <SelectItem value="payrolls">الرواتب والأجور</SelectItem>
                                <SelectItem value="workers">العمالة اليومية</SelectItem>
                                <SelectItem value="clients">العملاء والمبيعات</SelectItem>
                                <SelectItem value="invoices">الفواتير الضريبية</SelectItem>
                                <SelectItem value="quotations">عروض الأسعار</SelectItem>
                                <SelectItem value="purchases">المشتريات والموردين</SelectItem>
                                <SelectItem value="inventory">المخزون والمستودعات</SelectItem>
                                <SelectItem value="assets">الأصول والمعدات</SelectItem>
                                <SelectItem value="subcontractors">مقاولي الباطن</SelectItem>
                                <SelectItem value="tasks">المهام والتكاليف</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-slate-600 font-bold text-sm">الكيان المستهدف</Label>
                        <Select value={specificTarget} onValueChange={setSpecificTarget}>
                            <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold">
                                <SelectValue placeholder="الكل" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل (شامل)</SelectItem>
                                
                                {reportType === 'employees' && employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                                
                                {reportType === 'projects' && projects.map(proj => (
                                    <SelectItem key={proj.id} value={proj.id}>{proj.title}</SelectItem>
                                ))}

                                {reportType === 'clients' && clients.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-slate-600 font-bold text-sm">الفترة الزمنية</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-slate-400 font-semibold text-[10px]">من تاريخ</Label>
                                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-slate-50 border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-slate-400 font-semibold text-[10px]">إلى تاريخ</Label>
                                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-slate-50 border-slate-200 rounded-lg text-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (Advanced Options) */}
            <div className="md:col-span-7 space-y-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <Filter className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-bold text-slate-800">خيارات التقرير المتقدمة</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <BarChart3 className="w-4 h-4 text-blue-500" />
                                    تضمين رسوم بيانية
                                </div>
                                <p className="text-xs text-slate-500">إضافة مخططات توضيحية للبيانات</p>
                            </div>
                            <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} />
                        </label>

                        <label className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <Database className="w-4 h-4 text-rose-500" />
                                    التفاصيل المالية
                                </div>
                                <p className="text-xs text-slate-500">إظهار التدفقات النقدية الدقيقة</p>
                            </div>
                            <Switch checked={includeFinancials} onCheckedChange={setIncludeFinancials} />
                        </label>

                        <label className="flex items-start justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 cursor-pointer hover:bg-indigo-50 transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 font-black text-indigo-700">
                                    <BrainCircuit className="w-4 h-4 text-indigo-500" />
                                    تحليل ذكي (AI)
                                </div>
                                <p className="text-xs text-indigo-500/80">استخراج توصيات واقتراحات آلية</p>
                            </div>
                            <Switch checked={aiInsights} onCheckedChange={setAiInsights} className="data-[state=checked]:bg-indigo-600" />
                        </label>

                        <label className="flex items-start justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition-colors">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <AlignLeft className="w-4 h-4 text-slate-600" />
                                    تفكيك مفصل
                                </div>
                                <p className="text-xs text-slate-500">بدلاً من الملخص العام فقط</p>
                            </div>
                            <Switch checked={detailedBreakdown} onCheckedChange={setDetailedBreakdown} />
                        </label>
                    </div>
                </div>

                <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating} 
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-900/20 font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            جاري تحليل البيانات وتوليد التقرير المتقدم...
                        </>
                    ) : (
                        <>
                            <FileText className="w-6 h-6" />
                            بناء وحفظ التقرير الشامل الآن
                        </>
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
