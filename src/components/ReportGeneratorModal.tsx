import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Sparkles, Database, BrainCircuit, User } from 'lucide-react';
import { saveReport, ReportType } from '../lib/reports';
import { toast } from 'sonner';
import { getDocs } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { getCompanyQuery } from '../lib/firestoreUtils';
import { generateReportInsights } from '../lib/gemini';

const Switch = ({ checked, onCheckedChange, className = '' }: { checked: boolean, onCheckedChange: (c: boolean) => void, className?: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'} ${className}`}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportGeneratorModal({ isOpen, onClose }: ReportGeneratorModalProps) {
  const { activeCompanyId, profile } = useAuth();
  const [reportType, setReportType] = useState<ReportType | 'comprehensive_employee'>('comprehensive_employee');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Advanced options
  const [includeFinancials, setIncludeFinancials] = useState(true);
  const [aiInsights, setAiInsights] = useState(true);
  const [detailedBreakdown, setDetailedBreakdown] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [specificTarget, setSpecificTarget] = useState('all');

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
  }, [isOpen, activeCompanyId]);

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
            comprehensive_employee: 'الشامل للموظف',
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
            if (['employees', 'comprehensive_employee', 'attendance', 'payrolls', 'workers', 'tasks'].includes(reportType)) targetName = employees.find(e => e.id === specificTarget)?.name || 'محدد';
            if (['projects', 'tasks', 'financial', 'purchases'].includes(reportType)) targetName = projects.find(p => p.id === specificTarget)?.title || 'محدد';
            if (['clients', 'financial', 'invoices', 'quotations'].includes(reportType)) targetName = clients.find(c => c.id === specificTarget)?.name || 'محدد';
        }

        const reportTitle = `تقرير ${typeLabels[reportType] || 'عام'} الذكي (${targetName})`;

        let rawData: any[] = [];
        
        if (reportType === 'comprehensive_employee') {
            if (specificTarget === 'all') {
                toast.error('الرجاء تحديد موظف لاستخراج التقرير الشامل');
                setIsGenerating(false);
                return;
            }
            // Fetch comprehensive data
            const collectionsToFetch = ['users', 'attendance', 'payrolls', 'tasks'];
            for (const colName of collectionsToFetch) {
                const q = getCompanyQuery(colName, activeCompanyId);
                const snap = await getDocs(q);
                let colData = snap.docs.map(d => ({ id: d.id, ...d.data(), sourceCollection: colName }));
                rawData = rawData.concat(colData);
            }
        } else {
            // Standard fetch
            let collectionName = reportType;
            if (reportType === 'financial') collectionName = 'transactions';
            if (reportType === 'employees') collectionName = 'users';
            if (reportType === 'payrolls') collectionName = 'payrolls';
            
            let q = getCompanyQuery(collectionName, activeCompanyId);
            const snap = await getDocs(q);
            rawData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        
        // Filter by date if provided
        if (startDate && endDate) {
            rawData = rawData.filter((item: any) => {
                const itemDate = item.date || item.createdAt || item.timestamp || item.joinedAt;
                if (!itemDate) return true; // Keep items without date in filtered results
                if (item.sourceCollection === 'users') return true; // Profile data should always be included in comprehensive report
                
                let dateStr = '';
                if (typeof itemDate === 'string') dateStr = itemDate;
                else if (itemDate.toDate) dateStr = itemDate.toDate().toISOString();
                
                return dateStr >= startDate && dateStr <= endDate + 'T23:59:59.999Z';
            });
        }
        
        // Specific target filtering
        if (specificTarget !== 'all') {
            rawData = rawData.filter((item: any) => {
                return item.id === specificTarget ||
                       item.userId === specificTarget || 
                       item.employeeId === specificTarget || 
                       item.projectId === specificTarget || 
                       item.clientId === specificTarget ||
                       item.workerId === specificTarget ||
                       item.assignedTo === specificTarget ||
                       item.purchaserId === specificTarget;
            });
        }

        // Cap data to prevent massive payload issues
        const TOTAL_RECORDS = rawData.length;
        if (rawData.length > 2000) {
            rawData = rawData.slice(0, 2000); // Safety limit for memory
        }

        // Enrich Data with names instead of raw IDs
        const enrichedData = rawData.map((item: any) => {
            const enriched = { ...item };
            if (enriched.clientId) enriched.clientName = clients.find(c => c.id === enriched.clientId)?.name || enriched.clientId;
            if (enriched.projectId) enriched.projectName = projects.find(p => p.id === enriched.projectId)?.title || enriched.projectId;
            if (enriched.userId || enriched.employeeId || enriched.workerId || enriched.assignedTo) {
                const empId = enriched.userId || enriched.employeeId || enriched.workerId || enriched.assignedTo;
                enriched.employeeName = employees.find(e => e.id === empId)?.name || empId;
            }
            return enriched;
        });

        // Smart Aggregation for AI (Summarization)
        let totalAmount = 0;
        let typeCounts: Record<string, number> = {};
        let statusCounts: Record<string, number> = {};
        
        enrichedData.forEach((item: any) => {
            if (item.amount) totalAmount += Number(item.amount) || 0;
            if (item.total) totalAmount += Number(item.total) || 0;
            if (item.netSalary) totalAmount += Number(item.netSalary) || 0;
            if (item.cost) totalAmount += Number(item.cost) || 0;
            
            const type = item.type || item.category || item.sourceCollection || 'غير محدد';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            
            const status = item.status || 'غير محدد';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Metrics Generation
        const metrics = [
            { label: 'إجمالي السجلات المرتبطة', value: TOTAL_RECORDS },
            { label: 'السجلات المحللة', value: enrichedData.length },
            ...(totalAmount > 0 ? [{ label: 'الإجمالي المالي المرتبط', value: totalAmount.toLocaleString('ar-SA') }] : [])
        ];

        let aiSummary = null;
        if (aiInsights && enrichedData.length > 0) {
            const summaryPayload = {
                reportType: typeLabels[reportType] || 'عام',
                totalRecords: TOTAL_RECORDS,
                analyzedRecords: enrichedData.length,
                totalFinancialAmount: totalAmount,
                typeDistribution: typeCounts,
                statusDistribution: statusCounts,
                sampleRecords: enrichedData.slice(0, 15) // Context payload
            };
            aiSummary = await generateReportInsights([summaryPayload], typeLabels[reportType] || 'عام');
        } else if (aiInsights) {
            aiSummary = "لا توجد بيانات كافية ضمن الفترة المحددة لتحليلها ذكياً.";
        }

        const realData = {
          generatedAt: new Date().toISOString(),
          optionsUsed: { includeFinancials, aiInsights, detailedBreakdown },
          metrics,
          records: enrichedData,
          aiSummary
        };

        await saveReport({
            title: reportTitle,
            type: reportType as ReportType,
            dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
            data: realData,
            createdBy: profile?.name || "النظام الذكي"
        });

        toast.success('تم توليد التقرير المتقدم وحفظه بنجاح! 🎉');
        onClose();
    } catch (e) {
        toast.error('حدث خطأ أثناء توليد التقرير');
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl w-[95vw] h-[90vh] md:h-[85vh] bg-slate-50 rounded-3xl p-0 shadow-2xl flex flex-col overflow-hidden border border-slate-200" dir="rtl">
        
        {/* Massive Hero Header */}
        <div className="bg-gradient-to-l from-indigo-900 to-purple-900 px-10 py-10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between">
              <div>
                  <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 mb-3">
                      <Sparkles className="w-10 h-10 text-indigo-300" />
                      استوديو التقارير الذكية
                  </h2>
                  <p className="text-indigo-200 text-lg font-medium max-w-xl">
                      اختر مسار البيانات، ودع الذكاء الاصطناعي يقرأ، يحلل، ويستنتج لك أعمق الرؤى بضغطة زر.
                  </p>
              </div>
          </div>
        </div>

        <div className="p-8 md:p-10 flex-1 overflow-y-auto custom-scrollbar grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Primary Selections) */}
            <div className="lg:col-span-8 space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Database className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">تخصيص البيانات</h3>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-slate-700 font-bold text-base">نوع التقرير ومجال البحث</Label>
                        <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType | 'comprehensive_employee')}>
                            <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold text-lg px-4 hover:bg-indigo-50 transition-colors focus:ring-indigo-500">
                                <SelectValue placeholder="اختر مجال التقرير" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80 rounded-xl border-slate-200 shadow-xl" dir="rtl">
                                <div className="p-2 space-y-1">
                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">تقارير شاملة متقدمة</div>
                                    <SelectItem value="comprehensive_employee" className="font-bold text-indigo-700 focus:bg-indigo-50 py-3 rounded-lg"><span className="flex items-center gap-2"><User className="w-5 h-5"/> التقرير الشامل للموظف (حضور، رواتب، مهام، ملف)</span></SelectItem>
                                    
                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 mt-2 uppercase tracking-wider">الموارد البشرية</div>
                                    <SelectItem value="employees" className="font-medium py-2 rounded-lg">قائمة الموظفين والملفات</SelectItem>
                                    <SelectItem value="attendance" className="font-medium py-2 rounded-lg">سجلات الحضور والانصراف</SelectItem>
                                    <SelectItem value="payrolls" className="font-medium py-2 rounded-lg">مسيرات الرواتب والأجور</SelectItem>
                                    <SelectItem value="workers" className="font-medium py-2 rounded-lg">يوميات العمالة</SelectItem>

                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 mt-2 uppercase tracking-wider">الإدارة والتشغيل</div>
                                    <SelectItem value="projects" className="font-medium py-2 rounded-lg">المشاريع والأداء العام</SelectItem>
                                    <SelectItem value="tasks" className="font-medium py-2 rounded-lg">المهام المنجزة والتكاليف</SelectItem>
                                    <SelectItem value="subcontractors" className="font-medium py-2 rounded-lg">مقاولي الباطن</SelectItem>
                                    
                                    <div className="text-xs font-bold text-slate-400 px-2 py-1 mt-2 uppercase tracking-wider">المالية والمبيعات</div>
                                    <SelectItem value="financial" className="font-medium py-2 rounded-lg">الحركة المالية والخزينة</SelectItem>
                                    <SelectItem value="clients" className="font-medium py-2 rounded-lg">العملاء والمبيعات</SelectItem>
                                    <SelectItem value="invoices" className="font-medium py-2 rounded-lg">الفواتير الضريبية</SelectItem>
                                    <SelectItem value="purchases" className="font-medium py-2 rounded-lg">المشتريات والموردين</SelectItem>
                                </div>
                            </SelectContent>
                        </Select>
                        {reportType === 'comprehensive_employee' && (
                            <p className="text-sm text-indigo-600 font-medium bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                هذا الخيار سيقوم بجمع كافة بيانات الموظف من جميع الأقسام ليقرأها الذكاء الاصطناعي.
                            </p>
                        )}
                    </div>

                    <div className="space-y-4 pt-4">
                        <Label className="text-slate-700 font-bold text-base">تحديد الكيان (اختياري)</Label>
                        <Select value={specificTarget} onValueChange={setSpecificTarget}>
                            <SelectTrigger className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold text-lg px-4 hover:bg-indigo-50 transition-colors focus:ring-indigo-500">
                                <SelectValue placeholder="الكل (شامل)" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80 rounded-xl border-slate-200 shadow-xl" dir="rtl">
                                <SelectItem value="all" className="font-bold py-3 rounded-lg">الكل (شامل)</SelectItem>
                                
                                {['employees', 'comprehensive_employee', 'attendance', 'payrolls', 'workers', 'tasks'].includes(reportType) && employees.map(emp => (
                                    <SelectItem key={`emp-${emp.id}`} value={emp.id} className="py-2 rounded-lg">👤 {emp.name}</SelectItem>
                                ))}
                                
                                {['projects', 'tasks', 'financial', 'purchases'].includes(reportType) && projects.map(proj => (
                                    <SelectItem key={`proj-${proj.id}`} value={proj.id} className="py-2 rounded-lg">🏗️ {proj.title}</SelectItem>
                                ))}

                                {['clients', 'financial', 'invoices', 'quotations'].includes(reportType) && clients.map(client => (
                                    <SelectItem key={`client-${client.id}`} value={client.id} className="py-2 rounded-lg">🏢 {client.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-bold text-sm">من تاريخ</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-slate-600 font-bold text-sm">إلى تاريخ</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (AI Settings & Actions) */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* AI Features */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-2 mb-6">
                        <BrainCircuit className="w-6 h-6 text-indigo-600" />
                        <h3 className="font-bold text-indigo-900 text-lg">قدرات الذكاء الاصطناعي</h3>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-slate-800">تحليل ورؤى ذكية</Label>
                                <p className="text-xs text-slate-500 font-medium">استخراج نتائج وتوصيات</p>
                            </div>
                            <Switch checked={aiInsights} onCheckedChange={setAiInsights} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-slate-800">تحليل مالي عميق</Label>
                                <p className="text-xs text-slate-500 font-medium">قراءة التدفقات النقدية</p>
                            </div>
                            <Switch checked={includeFinancials} onCheckedChange={setIncludeFinancials} />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-indigo-50 shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold text-slate-800">تفصيل دقيق</Label>
                                <p className="text-xs text-slate-500 font-medium">قراءة الحركات الفردية</p>
                            </div>
                            <Switch checked={detailedBreakdown} onCheckedChange={setDetailedBreakdown} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-6 h-6 ml-2 animate-spin" /> جاري التوليد...</>
                        ) : (
                            <><Sparkles className="w-6 h-6 ml-2" /> توليد التقرير الذكي</>
                        )}
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        className="w-full h-12 rounded-xl font-bold text-slate-600"
                        disabled={isGenerating}
                    >
                        إلغاء
                    </Button>
                </div>
            </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
