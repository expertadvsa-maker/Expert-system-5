import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileText, Download, Loader2, Sparkles } from 'lucide-react';
import { saveReport, ReportType } from '../lib/reports';
import { toast } from 'sonner';

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportGeneratorModal({ isOpen, onClose }: ReportGeneratorModalProps) {
  const [reportType, setReportType] = useState<ReportType>('projects');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
        // In a real scenario, this would fetch data based on the type and date range
        // For demonstration of the feature, we will create a smart summary block
        const dummyData = {
          generatedAt: new Date().toISOString(),
          metrics: [
            { label: 'إجمالي السجلات', value: Math.floor(Math.random() * 100) + 10 },
            { label: 'مكتملة', value: Math.floor(Math.random() * 50) + 5 },
            { label: 'قيد التنفيذ', value: Math.floor(Math.random() * 20) + 2 }
          ]
        };
        
        const typeLabels: Record<ReportType, string> = {
            projects: 'المشاريع',
            financial: 'المالية',
            employees: 'الموظفين',
            clients: 'العملاء',
            purchases: 'المشتريات',
            tasks: 'المهام',
            custom: 'مخصص'
        };

        const reportTitle = `تقرير ${typeLabels[reportType]} الذكي`;

        await saveReport({
            title: reportTitle,
            type: reportType,
            dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
            data: dummyData,
            createdBy: "النظام"
        });

        toast.success('تم توليد التقرير وحفظه في المعرض بنجاح! 🎉');
        onClose();
    } catch (e) {
        toast.error('حدث خطأ أثناء توليد التقرير');
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100" dir="rtl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-800">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Sparkles className="w-6 h-6" />
            </div>
            توليد تقرير ذكي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-slate-600 font-bold text-sm">نوع التقرير المستهدف</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold">
                        <SelectValue placeholder="اختر نوع التقرير" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="projects">تقرير المشاريع والأداء</SelectItem>
                        <SelectItem value="financial">التقرير المالي وحركة الخزينة</SelectItem>
                        <SelectItem value="employees">تقرير الموظفين والرواتب</SelectItem>
                        <SelectItem value="clients">تقرير العملاء النشطين</SelectItem>
                        <SelectItem value="purchases">تقرير المشتريات والموردين</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                    <Label className="text-slate-600 font-bold text-xs">من تاريخ (اختياري)</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-slate-200 rounded-lg shadow-sm" />
                </div>
                <div className="space-y-2">
                    <Label className="text-slate-600 font-bold text-xs">إلى تاريخ (اختياري)</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-slate-200 rounded-lg shadow-sm" />
                </div>
            </div>

            <div className="pt-2">
                <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating} 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            جاري الجمع والتوليد...
                        </>
                    ) : (
                        <>
                            <FileText className="w-5 h-5" />
                            إنشاء وحفظ التقرير في المعرض
                        </>
                    )}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
