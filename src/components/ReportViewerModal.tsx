import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Calendar, Sparkles, Building2, BrainCircuit, Activity, BarChart4 } from 'lucide-react';
import { SavedReport } from '../lib/reports';
import { useAuth } from '../lib/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReportViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: SavedReport | null;
}

export default function ReportViewerModal({ isOpen, onClose, report }: ReportViewerModalProps) {
  const { profile, activeCompanyId } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!activeCompanyId) return;
      const q = query(collection(db, 'companies'), where('__name__', '==', activeCompanyId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCompanyProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    };
    if (isOpen) fetchCompanyProfile();
  }, [activeCompanyId, isOpen]);

  const handlePrint = () => {
    window.print();
  };

  if (!report) return null;

  const renderDataRecords = () => {
    if (!report.data?.records || !Array.isArray(report.data.records) || report.data.records.length === 0) {
      return (
        <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mt-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-lg font-medium text-slate-500">لا توجد بيانات تفصيلية مسجلة</p>
          <p className="text-sm">هذا التقرير لا يحتوي على أي سجلات في الفترة المحددة</p>
        </div>
      );
    }

    const records = report.data.records;
    
    let keys = Object.keys(records[0]).filter(k => 
        k !== 'id' && 
        k !== 'companyId' &&
        !k.includes('Id') &&
        typeof records[0][k] !== 'object'
    );

    keys = keys.slice(0, 6);

    const keyTranslations: Record<string, string> = {
      name: 'الاسم', title: 'العنوان', description: 'الوصف', amount: 'المبلغ',
      status: 'الحالة', date: 'التاريخ', type: 'النوع', phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني', role: 'الدور', joinedAt: 'تاريخ الانضمام',
      createdAt: 'تاريخ الإنشاء', updatedAt: 'تاريخ التحديث', uid: 'المعرف',
      iqamaExpiry: 'انتهاء الإقامة', nationality: 'الجنسية', salary: 'الراتب',
      total: 'الإجمالي', cost: 'التكلفة', balance: 'الرصيد', paymentMethod: 'طريقة الدفع',
      referenceNumber: 'الرقم المرجعي', notes: 'ملاحظات', value: 'القيمة', category: 'التصنيف'
    };

    const translateKey = (k: string) => keyTranslations[k] || k;

    const formatValue = (val: any) => {
        if (val === null || val === undefined || val === '') return '-';
        if (typeof val === 'boolean') return val ? 'نعم' : 'لا';
        if (typeof val === 'number') {
            return val > 1000 ? val.toLocaleString('ar-SA') : val;
        }
        const str = String(val);
        if (str.length > 50) return str.substring(0, 50) + '...';
        return str;
    };

    return (
      <div className="mt-8 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <BarChart4 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">سجلات البيانات التفصيلية</h3>
        </div>
        <Table>
          <TableHeader className="bg-white">
            <TableRow className="border-b border-slate-200 hover:bg-transparent">
              {keys.map(key => (
                <TableHead key={key} className="font-bold text-slate-500 py-4 px-6 bg-slate-50/50">{translateKey(key)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.slice(0, 100).map((record: any, idx: number) => (
              <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                {keys.map(key => (
                  <TableCell key={key} className="text-slate-700 py-4 px-6 font-medium">
                    {formatValue(record[key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl w-[95vw] h-[90vh] bg-slate-100 p-0 shadow-2xl flex flex-col overflow-hidden border border-slate-200" dir="rtl">
        
        {/* Control Bar (Not printed) */}
        <div className="print:hidden flex justify-between items-center p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm z-50">
          <div className="font-bold text-lg text-slate-800 truncate px-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {report.title}
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md rounded-xl hover:scale-105 transition-all">
              <Printer className="w-4 h-4 ml-2" />
              طباعة / حفظ PDF
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                إغلاق
            </Button>
          </div>
        </div>

        {/* Printable Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar print:overflow-visible print:p-0 bg-slate-100">
          <div className="print:block bg-white shadow-xl print:shadow-none rounded-3xl overflow-hidden min-h-[297mm] w-full max-w-[210mm] mx-auto text-slate-900 border print:border-none relative">
            
            {/* Elegant Header */}
            <div className="bg-slate-900 text-white px-10 py-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div className="space-y-4 max-w-lg">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-bold mb-2">
                            <Building2 className="w-3 h-3" />
                            {companyProfile?.name || 'الشركة'}
                        </div>
                        <h1 className="text-3xl font-black leading-tight tracking-tight text-white">
                            {report.title}
                        </h1>
                        {report.dateRange && (
                            <div className="flex items-center gap-2 text-indigo-200/80 text-sm font-medium">
                                <Calendar className="w-4 h-4" />
                                {new Date(report.dateRange.start).toLocaleDateString('ar-SA')} 
                                <span className="mx-2 opacity-50">إلى</span> 
                                {new Date(report.dateRange.end).toLocaleDateString('ar-SA')}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-left flex flex-col items-end">
                        {companyProfile?.logoUrl ? (
                            <img src={companyProfile.logoUrl} alt="Logo" className="h-20 object-contain rounded-xl bg-white/10 p-2 border border-white/10 backdrop-blur-sm" />
                        ) : (
                            <div className="w-20 h-20 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white/50 shadow-inner">
                                <Building2 className="w-10 h-10" />
                            </div>
                        )}
                        <div className="mt-6 text-xs text-white/60 space-y-1 text-left font-mono">
                            <p>الرقم الضريبي: {companyProfile?.taxNumber || '---'}</p>
                            <p>الهاتف: {companyProfile?.phone || '---'}</p>
                            <p>تاريخ الإصدار: {new Date(report.data?.generatedAt || report.createdAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 space-y-8">
                {/* Metrics Grid */}
                {report.data?.metrics && report.data.metrics.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {report.data.metrics.map((m: any, i: number) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                        <p className="text-slate-500 text-sm font-bold mb-2">{m.label}</p>
                        <p className="text-3xl font-black text-indigo-900">{m.value}</p>
                    </div>
                    ))}
                </div>
                )}

                {/* Smart AI Insight Card */}
                {report.data?.aiSummary && (
                <div className="relative mt-8 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-indigo-50">
                                <BrainCircuit className="w-6 h-6 animate-pulse" />
                            </div>
                            <h3 className="font-black text-xl text-indigo-950">التحليل الذكي والرؤى</h3>
                        </div>
                        <div className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap font-medium pr-2">
                            {report.data.aiSummary}
                        </div>
                    </div>
                </div>
                )}

                {/* Data Records */}
                {renderDataRecords()}
            </div>

            {/* Print Footer */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between text-sm text-slate-500 mx-10 mb-10">
              <div className="text-center w-48">
                <p className="mb-8 font-bold text-slate-800">اعتماد الإدارة</p>
                <div className="border-b-2 border-dashed border-slate-300 w-full mb-2"></div>
                <p className="font-medium">المدير العام / الختم</p>
              </div>
              <div className="text-left text-xs text-slate-400 mt-auto bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-600 mb-1">تقرير معتمد ومستخرج آلياً</p>
                <p>بواسطة: {report.createdBy}</p>
                <p className="font-mono mt-1 opacity-70">REF: {report.id}</p>
              </div>
            </div>

          </div>
        </div>

      </DialogContent>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .custom-scrollbar {
             overflow: visible !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}} />
    </Dialog>
  );
}
