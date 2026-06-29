import * as React from 'react';
import { Project } from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Layers, Clock, CheckCircle2, AlertCircle, Users, Phone, Check, CheckSquare, Camera 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from 'motion/react';

interface ProjectTeamTabProps {
  project: Project;
  projectId: string;
  projectWorkers: any[];
  teamCandidates: any[];
  transactions: any[];
  isAddingStage: boolean;
  setIsAddingStage: (val: boolean) => void;
  newStage: any;
  setNewStage: (val: any) => void;
  handleAddStage: () => void;
  handleDeleteStage: (stage: any) => void;
  handleToggleMilestone: (title: string) => void;
  isManageTeamOpen: boolean;
  setIsManageTeamOpen: (open: boolean) => void;
  handleToggleWorker: (workerId: string, isAssigned: boolean) => void;
  setActiveTab: (tab: string) => void;
  activeSubTab: 'milestones' | 'team_list';
  setActiveSubTab: (tab: 'milestones' | 'team_list') => void;
  activeTab?: string;
}

export default function ProjectTeamTab({
  project,
  projectId,
  projectWorkers,
  teamCandidates,
  transactions,
  isAddingStage,
  setIsAddingStage,
  newStage,
  setNewStage,
  handleAddStage,
  handleDeleteStage,
  handleToggleMilestone,
  isManageTeamOpen,
  setIsManageTeamOpen,
  handleToggleWorker,
  setActiveTab,
  activeSubTab,
  setActiveSubTab,
  activeTab,
}: ProjectTeamTabProps) {
  const showMilestones = activeTab ? activeTab === 'milestones' : activeSubTab === 'milestones';
  const showTeamList = activeTab ? activeTab === 'team' : activeSubTab === 'team_list';
  const showSubTabsHeader = !activeTab;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Sub tabs inside Team area */}
      {showSubTabsHeader && (
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit self-start gap-1">
          <button 
            onClick={() => setActiveSubTab('milestones')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeSubTab === 'milestones' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            هيكلة مراحل التنفيذ
          </button>
          <button 
            onClick={() => setActiveSubTab('team_list')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeSubTab === 'team_list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            الفريق الفني للإنتاج والتركيب
          </button>
        </div>
      )}

      {showMilestones && (
        <motion.div 
           key="milestones_sub"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col gap-8"
        >
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                 <div className="space-y-4">
                    <h3 className="text-2xl font-black">هيكلة مراحل التنفيذ</h3>
                    <p className="text-slate-400 font-bold max-w-md">قم بتعريف المراحل المخصصة لهذا المشروع وتحديد أوزانها لضبط دقة الإنجاز.</p>
                    <div className="pt-4 flex items-center gap-6">
                       <div>
                          <p className="text-xs font-black text-slate-500 uppercase mb-1">المراحل المعتمدة</p>
                          <p className="text-4xl font-black text-white">{project.milestones?.length || 0}</p>
                       </div>
                    </div>
                 </div>
                 
                 <Dialog open={isAddingStage} onOpenChange={setIsAddingStage}>
                    <DialogTrigger render={
                       <button className="group/button inline-flex shrink-0 items-center justify-center h-14 px-8 rounded-2xl bg-white text-slate-900 font-black hover:bg-slate-100 gap-3 shadow-xl transition-all outline-none cursor-pointer">
                          <Plus className="w-5 h-5" />
                          إضافة مرحلة عمل
                       </button>
                    } />
                    <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                       <DialogHeader>
                          <DialogTitle className="text-right font-black">إضافة مرحلة جديدة للمشروع</DialogTitle>
                       </DialogHeader>
                       <div className="space-y-5 mt-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">اسم المرحلة</Label>
                             <Input 
                                value={newStage.title} 
                                onChange={e => setNewStage({...newStage, title: e.target.value})} 
                                placeholder="مثال: تصنيع الهيكل الحديدي وتجهيز الاكريليك"
                                className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">وصف المرحلة</Label>
                             <textarea 
                                value={newStage.description || ''} 
                                onChange={e => setNewStage({...newStage, description: e.target.value})} 
                                placeholder="تفاصيل الإنتاج الفني أو التركيب لهذه المرحلة..."
                                className="w-full rounded-xl bg-slate-50 border-none font-bold p-4 text-sm focus:ring-0 min-h-[90px]"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400">الوزن النسبي (%)</Label>
                                <Input 
                                   type="number" 
                                   value={newStage.weight} 
                                   onChange={e => setNewStage({...newStage, weight: Number(e.target.value)})} 
                                   className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-400">تاريخ التسليم المتوقع</Label>
                                <Input 
                                   type="date" 
                                   value={newStage.dueDate || ''} 
                                   onChange={e => setNewStage({...newStage, dueDate: e.target.value})} 
                                   className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">تعيين لموظف (اختياري)</Label>
                             <select
                                 value={newStage.assignedWorkerId || ''}
                                 onChange={e => setNewStage({...newStage, assignedWorkerId: e.target.value})}
                                 className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 focus:border-primary outline-none"
                             >
                                 <option value="">-- بدون تعيين --</option>
                                 {projectWorkers.map(w => (
                                     <option key={w.id || (w as any).uid} value={w.id || (w as any).uid}>{(w as any).name}</option>
                                 ))}
                             </select>
                          </div>
                          <Button onClick={handleAddStage} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4 shadow-lg shadow-slate-100">إضافة المرحلة</Button>
                       </div>
                    </DialogContent>
                 </Dialog>
              </div>
           </div>

           <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xl font-black text-slate-900 border-r-4 border-primary pr-3">المراحل التشغيلية الحالية</h3>
                 <Badge className="bg-slate-100 text-slate-500 border-none font-bold">إجمالي الأوزان: {project.milestones?.reduce((a,c) => a + (c.weight || 0), 0)}%</Badge>
              </div>
              
              <div className="relative flex flex-col gap-8 pt-4">
                 {(!project?.milestones || project.milestones.length === 0) && (
                    <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                       <Layers className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                       <p className="font-black text-slate-400">لم يتم تعريف أي مراحل لهذا المشروع بعد</p>
                       <p className="text-xs font-bold text-slate-300 mt-1">ابدأ بإضافة المراحل لبناء هيكل الإنتاج والتركيب</p>
                    </div>
                 )}
                 
                 {project.milestones && project.milestones.length > 0 && (
                     <div className="absolute top-0 bottom-0 right-[25px] w-[2px] bg-slate-100 hidden sm:block z-0" />
                 )}

                 {project.milestones?.map((milestone, i) => {
                    const isCompleted = milestone.status === 'completed';
                    const associatedTransactions = transactions.filter(t => t.description?.includes(milestone.title) || t.category?.includes(milestone.title));
                    
                    return (
                       <div key={i} className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
                          <div className={`hidden sm:flex shrink-0 w-[52px] h-[52px] rounded-full border-4 border-white items-center justify-center font-black text-lg shadow-sm ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                             {i + 1}
                          </div>
                          <Card className={`flex-1 p-5 rounded-3xl transition-all duration-300 w-full ${isCompleted ? 'bg-emerald-50/30 border-emerald-100 shadow-none' : 'bg-white hover:border-slate-300 hover:shadow-md border-slate-100 shadow-sm'}`}>
                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                   <div className={`flex sm:hidden shrink-0 w-10 h-10 rounded-xl items-center justify-center font-black text-sm ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                      {i + 1}
                                   </div>
                                   <div>
                                      <h4 className="font-black text-slate-900 text-base">{milestone.title}</h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                         <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-1 rounded-lg uppercase tracking-widest shrink-0">الوزن: {milestone.weight}%</span>
                                         {associatedTransactions.length > 0 && (
                                            <Badge variant="outline" className="text-[9px] font-black border-amber-200 text-amber-600 px-2 py-0 bg-amber-50">مصاريف مرتبطة</Badge>
                                         )}
                                         {milestone.dueDate && (
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                               <Clock className="w-3 h-3" />
                                               مخطط: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString('ar-SA') : 'غير محدد'}
                                            </span>
                                         )}
                                      </div>
                                      {milestone.description && (
                                         <p className="text-xs font-bold text-slate-500 mt-3 leading-relaxed border-r-2 border-slate-200 pr-3 line-clamp-2 hover:line-clamp-none transition-all">
                                            {milestone.description}
                                         </p>
                                      )}
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 md:grid md:grid-cols-2 md:gap-2 shrink-0 self-end md:self-auto w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-0 border-slate-100">
                                   <Button 
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteStage(milestone)}
                                      className="h-10 rounded-xl text-rose-500 border-rose-100 hover:text-rose-600 hover:bg-rose-50 font-black text-xs flex-1 md:flex-none"
                                   >
                                      حذف المرحلة
                                   </Button>
                                   <Button 
                                      onClick={() => handleToggleMilestone(milestone.title)}
                                      size="sm"
                                      className={`h-10 rounded-xl px-4 font-black text-xs transition-all flex-1 md:flex-none ${isCompleted ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none' : 'bg-slate-900 text-white hover:bg-black shadow-md'}`}
                                   >
                                      {isCompleted ? <CheckCircle2 className="w-4 h-4 ml-1.5" /> : null}
                                      {isCompleted ? 'مكتملة معتمدة' : 'اعتماد المرحلة'}
                                   </Button>
                                </div>
                             </div>
                             
                             {isCompleted && milestone.date && (
                                <div className="mt-4 pt-3 border-t border-emerald-100/50 flex items-center justify-between bg-emerald-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-3xl">
                                   <div className="flex items-center gap-4">
                                      <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1.5">
                                         <CheckSquare className="w-3.5 h-3.5" />
                                         تم التنفيذ في: {milestone.date ? new Date(milestone.date).toLocaleDateString('ar-SA') : 'غير محدد'}
                                      </p>
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-200" />
                                      <p className="text-[10px] font-bold text-emerald-600">تم تحديث الإنجاز المالي</p>
                                   </div>
                                   <Button variant="ghost" size="sm" className="text-[10px] font-black gap-1.5 h-7 px-3 bg-white hover:bg-emerald-100 text-emerald-700 rounded-lg shadow-sm border border-emerald-100" onClick={() => setActiveTab('monitoring')}>
                                      <Camera className="w-3.5 h-3.5" />
                                      مرفقات
                                   </Button>
                                </div>
                             )}
                          </Card>
                       </div>
                    );
                 })}
              </div>
           </div>

           <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 flex gap-6">
              <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                 <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-black text-amber-900">تعليمات الربط الميداني</p>
                 <p className="text-xs font-bold text-amber-700 leading-relaxed">
                    يجب أن يتطابق تسمية المرحلة مع وصف المشتريات أو المصاريف ليتم ربطها تلقائياً. 
                    يمكنك إضافة صور التوثيق لكل مرحلة من تبويب "التوثيق" لضمان صرف الدفعات من العميل.
                 </p>
              </div>
           </div>
        </motion.div>
      )}

      {showTeamList && (
        <motion.div 
           key="team_list_sub"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="flex flex-col gap-6"
        >
           <div className="flex items-center justify-between mb-4">
              <div className="border-r-4 border-primary pr-3 text-right">
                 <h3 className="text-xl font-black text-slate-900 leading-none">الفريق الفني للإنتاج والتركيب</h3>
                 <p className="text-slate-500 font-bold text-[10px] mt-1">إدارة الفنيين والمصنعين والمسؤولين عن التركيب للمشروع</p>
              </div>
              <Dialog open={isManageTeamOpen} onOpenChange={setIsManageTeamOpen}>
                 <DialogTrigger render={
                    <button className="group/button inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-white h-9 px-4 font-black text-[10px] gap-2 shadow-md hover:bg-slate-900 transition-all outline-none cursor-pointer">
                       <Plus className="w-3.5 h-3.5" />
                       إدارة أعضاء الفريق
                    </button>
                 } />
                 <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                    <DialogHeader>
                       <DialogTitle className="text-right font-black">إدارة أعضاء الفريق الفني</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4 max-h-[400px] overflow-y-auto pr-1">
                       {teamCandidates.map(worker => {
                             const isAssigned = project.workerIds?.includes(worker.id);
                             return (
                                <div key={worker.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                                   <div>
                                      <p className="font-bold text-sm text-slate-900">{worker.name}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold">
                                         {worker.isDailyWage ? `عامل يومية (${worker.role})` : 
                                          worker.role === 'worker' ? 'فني مختص' : 
                                          worker.role === 'supervisor' ? 'مشرف فني' : 
                                          worker.role === 'manager' ? 'مدير المشروع' : worker.role || 'عضو الفريق'}
                                      </p>
                                   </div>
                                   <Button 
                                      onClick={() => handleToggleWorker(worker.id, !!isAssigned)}
                                      variant={isAssigned ? "destructive" : "default"}
                                      size="sm"
                                      className="rounded-xl font-black text-[10px] h-8"
                                   >
                                      {isAssigned ? "إزالة" : "إضافة"}
                                   </Button>
                                </div>
                             );
                          })
                       }
                       {teamCandidates.length === 0 && (
                          <p className="text-center text-xs font-bold text-slate-400 py-4">لا يوجد موظفين أو عمال مسجلين</p>
                       )}
                    </div>
                 </DialogContent>
              </Dialog>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectWorkers.length === 0 && (
                 <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="font-black text-slate-400">لا يوجد أعضاء في الفريق الفني حالياً</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">اضغط على زر "إدارة أعضاء الفريق" لإسناد فنيين للمشروع</p>
                 </div>
              )}
              {projectWorkers.map(worker => (
                 <Card key={worker.id} className="p-6 rounded-[2rem] border-slate-100 flex flex-row items-center justify-between shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 bg-gradient-to-br from-primary to-accent text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-primary/10">
                          {worker.name.charAt(0)}
                       </div>
                       <div className="text-right">
                          <p className="font-black text-slate-900">{worker.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             {worker.isDailyWage ? `عامل يومية (${worker.role})` : 
                              worker.role === 'worker' ? 'فني مختص' : 
                              worker.role === 'supervisor' ? 'مشرف فني' : 
                              worker.role === 'manager' ? 'مدير المشروع' : 'عضو الفريق'}
                          </p>
                       </div>
                    </div>
                    {worker.phone ? (
                       <a 
                          href={`tel:${worker.phone}`} 
                          className="rounded-xl h-12 w-12 text-emerald-500 bg-emerald-50 flex items-center justify-center transition-colors hover:bg-emerald-100 hover:text-emerald-600 outline-none"
                          title="اتصال هاتفى"
                       >
                          <Phone className="w-5 h-5" />
                       </a>
                    ) : (
                       <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 text-slate-300 bg-slate-50 cursor-not-allowed">
                          <Phone className="w-5 h-5" />
                       </Button>
                    )}
                 </Card>
              ))}
           </div>
        </motion.div>
      )}
    </div>
  );
}
