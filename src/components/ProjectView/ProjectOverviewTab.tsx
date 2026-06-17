import * as React from 'react';
import { Project } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, FileText, MapPin, Calendar, Clock, Users, Info, Lock, Phone, AlertCircle, Trash2, Loader2, Check, User 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface ProjectOverviewTabProps {
  project: Project;
  profile: any;
  achievementStats: number;
  projectAttendance: any[];
  gpsStats: {
    totalDays: number;
    totalHours: number;
    uniqueWorkers: number;
    workersList: any[];
  };
  projectTypeLabels: Record<string, string>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  isDeleting: boolean;
  deleteConfirmationName: string;
  setDeleteConfirmationName: (val: string) => void;
  handleDeleteProject: (type: 'soft' | 'hard') => void;
  setActiveTab: (tab: string) => void;
}

export default function ProjectOverviewTab({
  project,
  profile,
  achievementStats,
  projectAttendance,
  gpsStats,
  projectTypeLabels,
  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  isDeleting,
  deleteConfirmationName,
  setDeleteConfirmationName,
  handleDeleteProject,
  setActiveTab,
}: ProjectOverviewTabProps) {
  return (
    <motion.div 
       key="overview"
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -10 }}
       className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full"
    >
       {/* Primary Insight & Specs Side */}
       <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Highlights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Status Progress */}
             <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-125"></div>
                <div className="flex flex-col gap-2 relative z-10 w-full">
                   <span className="text-xs font-black text-slate-500 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> 
                      معدل إنجاز المشروع
                   </span>
                   <div className="flex items-end justify-between mt-2">
                      <div>
                         <span className="text-4xl font-black text-slate-900">{achievementStats}%</span>
                      </div>
                      <div className="text-left">
                         <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg whitespace-nowrap">
                            {project.milestones?.filter(m => m.status === 'completed').length || 0} من {project.milestones?.length || 0} مراحل
                         </span>
                      </div>
                   </div>
                   <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${achievementStats}%` }}></div>
                   </div>
                </div>
             </div>

             {/* Contract Basic Stats */}
             <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -ml-10 -mt-10 transition-transform group-hover:scale-125"></div>
                <div className="flex justify-between items-start relative z-10 mb-4">
                   <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                   </div>
                   <div className="text-left text-xs font-bold space-y-1">
                      <p className="text-slate-400">بدء العمل</p>
                      <p className="text-slate-800">{project.startDate ? new Date(project.startDate).toLocaleDateString('ar-SA') : '---'}</p>
                   </div>
                </div>
                <div className="relative z-10 flex flex-col gap-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الميزانية الإجمالية</span>
                   <span className="text-2xl font-black text-slate-900">{project.budget?.toLocaleString() || 0} <span className="text-sm text-slate-400">ر.س</span></span>
                </div>
             </div>
          </div>


          {/* GPS Tracking Stats */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] p-8">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                   <MapPin className="w-5 h-5 text-emerald-500" />
                   رقابة الحضور الميداني (GPS)
                </h3>
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">
                   {projectAttendance.length} سجل حضور
                </Badge>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-emerald-500 shrink-0">
                      <Calendar className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">إجمالي أيام العمل</span>
                      <span className="text-xl font-black text-slate-800">{gpsStats.totalDays} <span className="text-xs text-slate-500 font-bold">يوم</span></span>
                   </div>
                </div>

                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-amber-500 shrink-0">
                      <Clock className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">ساعات العمل الفعلية</span>
                      <span className="text-xl font-black text-slate-800">{gpsStats.totalHours} <span className="text-xs text-slate-500 font-bold">ساعة</span></span>
                   </div>
                </div>

                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                      <Users className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">عدد الكوادر بالموقع</span>
                      <span className="text-xl font-black text-slate-800">{gpsStats.uniqueWorkers} <span className="text-xs text-slate-500 font-bold">موظف</span></span>
                   </div>
                </div>
             </div>

             {gpsStats.workersList.length > 0 && (
                <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                   <div className="bg-slate-50 px-4 py-2 text-xs font-black text-slate-600 border-b border-slate-100 grid grid-cols-3 text-right">
                      <span>الموظف / المشرف</span>
                      <span className="text-center">أيام الحضور</span>
                      <span className="text-left">إجمالي الساعات</span>
                   </div>
                   <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {gpsStats.workersList.map((w: any, idx: number) => (
                         <div key={idx} className="px-4 py-3 text-sm font-bold text-slate-800 grid grid-cols-3 items-center hover:bg-slate-50/50">
                            <span className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 shrink-0">
                                  {w.name.charAt(0)}
                               </div>
                               <span className="truncate">{w.name}</span>
                            </span>
                            <span className="text-center text-emerald-600 bg-emerald-50 w-fit mx-auto px-2 py-0.5 rounded-lg text-xs">{w.daysCount} أيام</span>
                            <span className="text-left font-black">{w.totalHours > 0 ? `${w.totalHours} ساعة` : 'بدون انصراف'}</span>
                         </div>
                      ))}
                   </div>
                </div>
             )}
             {gpsStats.workersList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                   <MapPin className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-xs font-bold">لم يتم تسجيل أي حضور ميداني عبر الـ GPS في هذا المشروع بعد</p>
                </div>
             )}
          </div>

          {/* Specs Bento Box */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] p-8">
             <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                   <Info className="w-5 h-5 text-indigo-500" />
                   المواصفات الفنية وبيانات العقد
                </h3>
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => window.print()}
                   className="rounded-xl border-slate-200 font-black text-[10px] gap-2 h-9"
                >
                   <FileText className="w-3.5 h-3.5" />
                   تصدير PDF
                </Button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                      <User className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">العميل / المالك</span>
                      <span className="text-sm font-black text-slate-800 truncate">{project.clientName || '---'}</span>
                   </div>
                </div>

                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                      <FileText className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">نوع أعمال الإعلان</span>
                      <span className="text-sm font-black text-slate-800 truncate">{projectTypeLabels[project.projectType || ''] || project.projectType || '---'}</span>
                   </div>
                </div>

                <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                   <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">المقاسات الكلية</span>
                      <span className="text-sm font-black text-slate-800 truncate" dir="ltr">{project.totalArea || '---'}</span>
                   </div>
                </div>
             </div>
             
             {/* Client access section */}
             {project.clientPin && (
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                         <Lock className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-sm font-black text-slate-800">بيانات وصول العميل</span>
                         <span className="text-[10px] font-bold text-slate-400 mt-1 max-w-[200px]">يمكن للعميل تسجيل الدخول والاطلاع على تقدم المشروع.</span>
                      </div>
                   </div>
                   <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full">
                         <input 
                            readOnly 
                            value={`${window.location.origin}/?clientPortal=true&projectId=${project.id}`}
                            className="bg-transparent text-[10px] font-mono text-slate-500 px-2 w-full min-w-[150px] outline-none select-all"
                            dir="ltr"
                         />
                         <Button 
                            variant="ghost"
                            onClick={() => {
                               navigator.clipboard.writeText(`${window.location.origin}/?clientPortal=true&projectId=${project.id}`);
                               toast.success("تم نسخ رابط البوابة");
                            }}
                            className="h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-black text-[10px] px-3 shadow-sm border border-slate-200 shrink-0"
                         >
                            نسخ الرابط
                         </Button>
                      </div>
                      <div className="flex items-center justify-between bg-amber-50 p-1.5 rounded-2xl border border-amber-100">
                         <div className="flex items-center gap-2 px-2">
                            <span className="text-[10px] font-bold text-amber-700/70">رمز الدخول:</span>
                            <span className="text-sm font-mono font-black text-amber-700 tracking-widest">{project.clientPin}</span>
                         </div>
                         <Button 
                            onClick={() => {
                               navigator.clipboard.writeText(`مرحباً،\nيسعدنا إبلاغك أنه يمكنك متابعة تقدم مشروعك لحظة بلحظة عبر بوابة العميل:\n\n🌐 الرابط: ${window.location.origin}/?clientPortal=true&projectId=${project.id}\n🔑 رمز الدخول الموحد: ${project.clientPin}\n\nشكراً لثقتكم بنا!`);
                               toast.success("تم نسخ رسالة الدعوة الشاملة");
                            }}
                            className="h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] px-4 shrink-0 transition-all shadow-sm"
                         >
                            نسخ الرسالة كاملة
                         </Button>
                      </div>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* Action Cards & Timeline Side */}
       <div className="flex flex-col gap-6">
          {/* Map Preview Logic / Quick Actions */}
          <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-[200px] sm:h-auto">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent blur-xl"></div>
             <div className="relative z-10 flex flex-col gap-2">
                <h4 className="text-white font-black text-lg">تحكم سريع</h4>
                <p className="text-slate-400 text-xs font-bold leading-relaxed">بوابة الاتصال وتحديد الموقع لفرق التركيبات الخارجية.</p>
             </div>
             
             <div className="relative z-10 flex gap-2 mt-6">
                <Button 
                   onClick={() => {
                      if (project.locationLink) window.open(project.locationLink, '_blank');
                      else toast.error("لا يوجد رابط موقع جغرافي مضاف لهذا المشروع");
                   }}
                   className="flex-1 h-12 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-slate-100 hover:scale-105 transition-all shadow-lg"
                >
                   <MapPin className="w-4 h-4 ml-1.5 text-blue-600" />
                   تحديد الموقع
                </Button>
                <Button 
                   onClick={() => {
                      if (project.clientPhone) window.open(`tel:${project.clientPhone}`, '_self');
                      else toast.error("لا يوجد رقم هاتف للعميل");
                   }}
                   className="w-12 h-12 shrink-0 bg-white/10 text-white border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
                >
                   <Phone className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Interactive Mini Timeline */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-[2.5rem] p-6 flex-1 flex flex-col">
             <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h4 className="text-sm font-black text-slate-800">التطور الزمني المصغر</h4>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{project.milestones?.length || 0} مراحل</span>
             </div>

             <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pr-4">
                {project.milestones?.length ? project.milestones.slice(0, 4).map((m, i) => {
                   const isDone = m.status === 'completed';
                   return (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group py-3">
                         <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white ${isDone ? 'bg-emerald-500' : 'bg-slate-200'} shadow shrink-0 absolute right-1 mx-[-11px]`}>
                            {isDone && <Check className="w-3 h-3 text-white" />}
                         </div>
                         <div className="w-full mr-8 pr-2">
                            <div className={`p-4 rounded-2xl shadow-sm border ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'} transition-all`}>
                               <div className="flex items-center justify-between">
                                  <h5 className={`font-black text-[11px] ${isDone ? 'text-emerald-900' : 'text-slate-600'}`}>{m.title}</h5>
                                  {m.date && <span className="text-[9px] font-bold text-slate-400">{new Date(m.date).toLocaleDateString('ar-SA')}</span>}
                               </div>
                            </div>
                         </div>
                      </div>
                   )
                }) : (
                   <div className="py-10 text-center">
                      <p className="text-xs font-bold text-slate-400">لا توجد مراحل مسجلة.</p>
                   </div>
                )}
             </div>
             
             {(project.milestones?.length || 0) > 4 && (
                <Button 
                   variant="ghost" 
                   className="w-full mt-4 h-10 rounded-xl text-xs font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                   onClick={() => setActiveTab('milestones')}
                >
                   عرض باقي المراحل
                </Button>
             )}
          </div>
       </div>

       {/* Danger Zone */}
       <div className="xl:col-span-3 mt-2">
          <div className="bg-rose-50/50 border border-rose-100 rounded-[2rem] p-6 shadow-sm">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                   <h4 className="text-rose-700 font-black text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      منطقة الخطر (إدارة المشروع)
                   </h4>
                   <p className="text-rose-600/70 text-xs font-bold mt-1">
                      هذه المنطقة مخصصة للإجراءات الحساسة مثل إيقاف المشروع أو حذفه بالكامل من النظام.
                   </p>
                </div>
                <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                  if (open && profile?.role !== 'manager' && profile?.role !== 'owner') {
                    toast.error("صلاحيات الحذف محصورة على المالك والمدير فقط.");
                    return;
                  }
                  setIsDeleteDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                     <Button variant="destructive" className="rounded-xl px-6 h-12 font-black shadow-lg shadow-rose-500/20 w-full md:w-auto">
                        <Trash2 className="w-4 h-4 ml-2" />
                        إلغاء أو حذف المشروع
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                     <DialogHeader>
                        <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                           <AlertCircle className="w-8 h-8" />
                        </div>
                        <DialogTitle className="text-center font-black text-xl">حذف أو إلغاء المشروع</DialogTitle>
                        <DialogDescription className="text-center text-slate-500 font-bold mt-2">
                           يرجى اختيار طريقة الحذف المناسبة بناءً على حالة المشروع المالية والتشغيلية
                        </DialogDescription>
                     </DialogHeader>
                     
                     <div className="space-y-6 mt-6">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                           <h4 className="font-black text-amber-800 text-sm mb-1">إلغاء وحذف آمن (موصى به)</h4>
                           <p className="text-[10px] text-amber-700 font-bold leading-relaxed mb-3">
                              يتم تغيير حالة المشروع إلى "ملغى"، وتسريح العمالة فوراً للحفاظ على استمرارية العمل، مع الحفاظ على الفواتير والمصروفات السابقة لضمان عدم توازن الحسابات.
                           </p>
                           <Button 
                              onClick={() => handleDeleteProject('soft')}
                              disabled={isDeleting}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl h-10"
                           >
                              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إلغاء وأرشفة المشروع بأمان"}
                           </Button>
                        </div>

                        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                           <h4 className="font-black text-rose-800 text-sm mb-1">حذف نهائي تدميري</h4>
                           <p className="text-[10px] text-rose-700 font-bold leading-relaxed mb-3">
                              استخدم هذا الخيار فقط للمشاريع "التجريبية" أو "الجديدة كلياً" التي لا تملك أي عمليات مالية أو عمال. لا يمكن التراجع عن هذا الإجراء أبداً.
                           </p>
                           <div className="space-y-3">
                              <Input 
                                 placeholder="اكتب اسم المشروع لتأكيد الحذف"
                                 value={deleteConfirmationName}
                                 onChange={e => setDeleteConfirmationName(e.target.value)}
                                 className="bg-white border-rose-200 focus:ring-rose-500 rounded-xl font-bold text-xs"
                              />
                              <Button 
                                 onClick={() => handleDeleteProject('hard')}
                                 disabled={isDeleting || deleteConfirmationName !== project.title}
                                 variant="destructive"
                                 className="w-full font-black rounded-xl h-10 shadow-lg shadow-rose-500/20"
                              >
                                 {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "المشروع فارغ - حذف نهائي"}
                              </Button>
                           </div>
                        </div>
                     </div>
                  </DialogContent>
                </Dialog>
             </div>
          </div>
       </div>
    </motion.div>
  );
}
