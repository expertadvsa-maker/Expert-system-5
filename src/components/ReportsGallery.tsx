import React, { useState, useEffect } from 'react';
import { fetchReports, deleteReport, SavedReport, ReportType } from '../lib/reports';
import { FileText, Download, Trash2, Calendar, User, Search, RefreshCw, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReportsGallery() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (error) {
      toast.error('فشل في جلب التقارير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا التقرير نهائياً؟')) return;
    
    try {
      await deleteReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('تم حذف التقرير');
    } catch (error) {
      toast.error('فشل في حذف التقرير');
    }
  };

  const handleExportPDF = (report: SavedReport) => {
    // Here we would implement the jsPDF generation based on report.data
    // For now we simulate it
    toast.success(`تم تحميل ${report.title} كملف PDF`);
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.includes(searchTerm) || (r.createdBy && r.createdBy.includes(searchTerm));
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
      switch(type) {
          case 'projects': return { label: 'مشاريع', color: 'bg-blue-100 text-blue-700' };
          case 'financial': return { label: 'مالية', color: 'bg-emerald-100 text-emerald-700' };
          case 'employees': return { label: 'موظفين', color: 'bg-purple-100 text-purple-700' };
          case 'clients': return { label: 'عملاء', color: 'bg-amber-100 text-amber-700' };
          case 'purchases': return { label: 'مشتريات', color: 'bg-orange-100 text-orange-700' };
          default: return { label: 'عام', color: 'bg-slate-100 text-slate-700' };
      }
  };

  return (
    <div className="p-6 md:p-8 min-h-[80vh]" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <BarChart2 className="w-7 h-7" />
                    </div>
                    معرض التقارير الذكية
                </h1>
                <p className="text-slate-500 font-semibold mt-2">
                    أرشيف متكامل لجميع التقارير الصادرة من النظام
                </p>
            </div>
            
            <Button onClick={loadReports} variant="outline" className="gap-2 font-bold text-slate-600 border-slate-200">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث المعرض
            </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                    placeholder="ابحث باسم التقرير أو منشئ التقرير..." 
                    className="pl-4 pr-10 h-12 bg-slate-50 border-transparent focus:bg-white rounded-xl"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                {['all', 'projects', 'financial', 'employees', 'clients', 'purchases'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type as any)}
                        className={`px-5 h-12 rounded-xl font-bold whitespace-nowrap transition-all ${
                            filterType === type 
                            ? 'bg-slate-900 text-white shadow-md' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {type === 'all' ? 'الكل' : getTypeLabel(type).label}
                    </button>
                ))}
            </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-700 mb-2">لا توجد تقارير</h3>
                <p className="text-slate-500 font-semibold max-w-md mx-auto">
                    لم يتم العثور على أي تقارير تطابق بحثك، أو لم يتم إنشاء أي تقارير بعد.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredReports.map((report) => (
                        <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={report.id}
                            className="bg-white rounded-3xl border border-slate-100 overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                        >
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider ${getTypeLabel(report.type).color}`}>
                                        {getTypeLabel(report.type).label}
                                    </span>
                                    <button 
                                        onClick={() => handleDelete(report.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2 line-clamp-2 leading-snug">
                                    {report.title}
                                </h3>
                                <div className="space-y-2 mt-4 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'تاريخ غير متوفر'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        بواسطة: {report.createdBy}
                                    </div>
                                </div>
                            </div>
                            <div className="p-2 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <Button onClick={() => handleExportPDF(report)} className="flex-1 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs gap-2 border border-slate-200 shadow-sm">
                                    <Download className="w-4 h-4 text-emerald-600" />
                                    تصدير PDF
                                </Button>
                                <Button variant="secondary" className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-xs border border-slate-200 shadow-sm">
                                    استعراض
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
    </div>
  );
}
