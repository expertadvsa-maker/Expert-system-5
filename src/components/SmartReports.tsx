import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Sparkles, 
  BarChart2, 
  History,
  TrendingUp,
  Users,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';
import ReportGeneratorModal from './ReportGeneratorModal';

export default function SmartReports() {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-500" dir="rtl">
      
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-900 to-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full blur-3xl mix-blend-screen"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl mix-blend-screen"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 text-sm font-bold mb-2">
                    <Sparkles className="w-4 h-4" />
                    الجيل الجديد من التقارير
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                    مركز التقارير الذكية
                </h1>
                <p className="text-indigo-100/80 text-lg max-w-xl leading-relaxed">
                    قم بتوليد تقارير شاملة، تحليل مالي مدعوم بالذكاء الاصطناعي، واستخراج رؤى دقيقة لشركتك بضغطة زر.
                </p>
            </div>

            <div className="shrink-0">
                <Button 
                    onClick={() => setIsGeneratorOpen(true)}
                    className="h-16 px-8 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 font-black text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)]"
                >
                    <FileText className="w-6 h-6 ml-3" />
                    إنشاء تقرير جديد الآن
                </Button>
            </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-all">
            <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                    <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">تحليل مالي دقيق</h3>
                <p className="text-slate-500">تقارير مالية مفصلة مع رسوم بيانية توضح الإيرادات والمصروفات بدقة متناهية.</p>
            </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-all">
            <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">تتبع المشاريع</h3>
                <p className="text-slate-500">تقارير شاملة لحالة المشاريع ونسب الإنجاز والتكاليف المرتبطة بكل مشروع.</p>
            </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-all">
            <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">أداء الموظفين</h3>
                <p className="text-slate-500">تتبع الحضور، الانصراف، الرواتب، وتقييم أداء فريق العمل بسهولة.</p>
            </CardContent>
        </Card>
      </div>

      <ReportGeneratorModal 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)} 
      />
    </div>
  );
}
