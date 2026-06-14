import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, Building2, Calendar, Sparkles } from 'lucide-react';
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
        <div className="py-12 text-center text-zinc-400 border border-dashed rounded-lg bg-zinc-50">
          لا توجد بيانات تفصيلية في هذا التقرير.
        </div>
      );
    }

    const records = report.data.records;
    const keys = Object.keys(records[0]).filter(k => k !== 'id' && typeof records[0][k] !== 'object');

    return (
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm mt-6">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              {keys.slice(0, 5).map(key => (
                <TableHead key={key} className="font-bold text-zinc-700">{key}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.slice(0, 100).map((record: any, idx: number) => (
              <TableRow key={idx}>
                {keys.slice(0, 5).map(key => (
                  <TableCell key={key} className="text-zinc-600 truncate max-w-[200px]">
                    {String(record[key])}
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
        <div className="print:hidden flex justify-between items-center p-4 bg-white border-b shadow-sm shrink-0">
          <div className="font-bold text-lg text-slate-800 truncate px-4">{report.title}</div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">
              <Printer className="w-4 h-4 ml-2" />
              طباعة / PDF
            </Button>
            <Button variant="outline" onClick={onClose}>إغلاق</Button>
          </div>
        </div>

        {/* Printable Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar print:overflow-visible print:p-0">
          <div className="print:block bg-white shadow-lg print:shadow-none rounded-xl p-8 md:p-12 min-h-[297mm] w-full max-w-[210mm] mx-auto text-slate-900 border print:border-none relative">
            
            {/* Letterhead */}
            <div className="flex justify-between items-start border-b-2 border-indigo-100 pb-8 mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-indigo-900">
                  {companyProfile?.name || 'الشركة'}
                </h2>
                <div className="text-sm font-medium text-slate-600 space-y-1">
                  <p>الرقم الضريبي: <span className="font-mono">{companyProfile?.taxNumber || '---'}</span></p>
                  <p>العنوان: {companyProfile?.address || '---'}</p>
                  <p>الهاتف: <span className="font-mono">{companyProfile?.phone || '---'}</span></p>
                </div>
              </div>
              <div className="text-left flex flex-col items-end">
                {companyProfile?.logoUrl ? (
                  <img src={companyProfile.logoUrl} alt="Logo" className="h-20 object-contain" />
                ) : (
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-200">
                    <Building2 className="w-10 h-10" />
                  </div>
                )}
                <div className="mt-4 text-left">
                  <h3 className="font-bold text-slate-800 text-xl">{report.title}</h3>
                  <div className="flex items-center justify-end gap-2 text-sm text-slate-500 mt-2">
                    <Calendar className="w-4 h-4" />
                    <span>تاريخ الإصدار: {new Date(report.createdAt?.toDate ? report.createdAt.toDate() : report.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            {report.data?.metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {report.data.metrics.map((m: any, i: number) => (
                  <div key={i} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-center">
                    <div className="text-xs text-indigo-600/80 font-bold mb-1">{m.label}</div>
                    <div className="text-2xl font-black text-indigo-900">{m.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary */}
            {report.data?.aiSummary && (
              <div className="mb-8 p-6 bg-gradient-to-l from-indigo-50 to-white border border-indigo-100 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>
                <div className="relative z-10">
                    <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        التحليل الذكي والرؤى
                    </h4>
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base font-medium">
                    {report.data.aiSummary}
                    </p>
                </div>
              </div>
            )}

            {/* Data Tables */}
            <div className="mb-12">
              <h4 className="font-bold text-slate-800 mb-4 text-lg border-b pb-2">سجلات البيانات</h4>
              {renderDataRecords()}
            </div>

            {/* Footer Signatures */}
            <div className="mt-16 pt-8 border-t-2 border-slate-100 flex justify-between items-end text-sm font-bold text-slate-600 pb-12">
              <div className="text-center w-48">
                <p className="mb-8 text-slate-400">إعداد / تصدير</p>
                <p className="border-t border-dashed border-slate-300 pt-2">{report.createdBy}</p>
              </div>
              <div className="text-center w-48">
                <p className="mb-8 text-slate-400">اعتماد الإدارة</p>
                <p className="border-t border-dashed border-slate-300 pt-2">المدير العام / الختم</p>
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
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
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
