import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Printer, 
  Download, 
  FileText, 
  Calendar, 
  Briefcase, 
  Users, 
  Building2, 
  TrendingUp, 
  FileSpreadsheet, 
  Filter,
  Loader2
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCompanyQuery } from '../lib/firestoreUtils';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';

export default function SmartReports() {
  const { profile, activeCompanyId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('financial'); // financial, attendance, projects
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  useEffect(() => {
    // Load Company Details for Report Header
    const fetchCompanyProfile = async () => {
      if (!activeCompanyId) return;
      const q = query(collection(db, 'companies'), where('__name__', '==', activeCompanyId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setCompanyProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    };
    fetchCompanyProfile();
  }, [activeCompanyId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-full px-4 md:px-8 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Control Panel (Hidden during Print) */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-zinc-800/50 shadow-xl">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-l from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              التقارير الذكية 📄
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              استخراج تقارير احترافية مخصصة للطباعة والمحاسبة
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handlePrint} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 transition-all shadow-lg">
              <Printer className="w-4 h-4 ml-2" />
              طباعة التقرير
            </Button>
            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/20">
              <Download className="w-4 h-4 ml-2" />
              تصدير PDF
            </Button>
          </div>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs value={reportType} onValueChange={setReportType} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl">
                <TabsTrigger value="financial" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <TrendingUp className="w-4 h-4 ml-2" />
                  التقرير المالي
                </TabsTrigger>
                <TabsTrigger value="attendance" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Users className="w-4 h-4 ml-2" />
                  حضور الموظفين
                </TabsTrigger>
                <TabsTrigger value="projects" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Briefcase className="w-4 h-4 ml-2" />
                  حالة المشاريع
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-500 mb-1.5 block">من تاريخ</label>
                  <Input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-500 mb-1.5 block">إلى تاريخ</label>
                  <Input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                    className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
                <Button variant="secondary" className="w-32">
                  <Filter className="w-4 h-4 ml-2" />
                  تحديث
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Printable Area (A4 Style) */}
      <div className="print:block print:w-full print:m-0 print:p-0 bg-white shadow-2xl rounded-2xl p-12 min-h-[297mm] mx-auto overflow-hidden relative">
        
        {/* Report Header */}
        <div className="flex justify-between items-start border-b-2 border-zinc-100 pb-8 mb-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900">
              {companyProfile?.name || 'اسم الشركة'}
            </h2>
            <div className="text-sm text-zinc-500 space-y-1">
              <p>الرقم الضريبي: {companyProfile?.taxNumber || '---'}</p>
              <p>العنوان: {companyProfile?.address || '---'}</p>
              <p>الهاتف: {companyProfile?.phone || '---'}</p>
            </div>
          </div>
          
          <div className="text-left space-y-2">
            {companyProfile?.logoUrl ? (
              <img src={companyProfile.logoUrl} alt="Logo" className="h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                <Building2 className="w-8 h-8" />
              </div>
            )}
            <div className="mt-4 text-left">
              <h3 className="font-bold text-zinc-900 text-lg">
                {reportType === 'financial' ? 'التقرير المالي العام' :
                 reportType === 'attendance' ? 'تقرير الحضور والانصراف' : 'تقرير حالة المشاريع'}
              </h3>
              <p className="text-sm text-zinc-500 mt-1">
                الفترة: {new Date(dateRange.start).toLocaleDateString('ar-SA')} - {new Date(dateRange.end).toLocaleDateString('ar-SA')}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                تاريخ الإصدار: {new Date().toLocaleDateString('ar-SA')}
              </p>
            </div>
          </div>
        </div>

        {/* Report Body Placeholder */}
        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50/50">
          <FileSpreadsheet className="w-16 h-16 mb-4 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-600">جاري جلب بيانات التقرير...</p>
          <p className="text-sm mt-2">سيتم عرض الجداول والبيانات المالية هنا بناءً على الفترة المحددة أعلاه.</p>
        </div>

        {/* Report Footer */}
        <div className="absolute bottom-12 left-12 right-12 border-t-2 border-zinc-100 pt-8 flex justify-between text-sm text-zinc-500">
          <div className="text-center">
            <p className="mb-8">المدير العام / الاعتماد</p>
            <p>.................................</p>
          </div>
          <div className="text-left text-xs text-zinc-400 mt-auto">
            <p>تم استخراج هذا التقرير آلياً من نظام إدارة الشركات</p>
            <p>بواسطة: {profile?.name}</p>
          </div>
        </div>

      </div>

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
            margin: 1cm;
          }
        }
      `}} />
    </div>
  );
}
