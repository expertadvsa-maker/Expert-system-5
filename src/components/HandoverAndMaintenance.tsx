import React, { useState, useEffect } from 'react';
import { Project, MaintenanceRequest } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, FileCheck, Wrench, CheckCircle2, Loader2, Award, UploadCloud, Star, Download, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';

export default function HandoverAndMaintenance({ project }: { project: Project }) {
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [handoverText, setHandoverText] = useState('');
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [handoverFiles, setHandoverFiles] = useState<File[]>([]);
  const [rating, setRating] = useState(5);

  const defaultGuarantees = [
    'ضمان الهيكل الإنشائي (10 سنوات)',
    'ضمان العزل المائي والحراري (5 سنوات)',
    'ضمان التمديدات الكهربائية والسباكة (سنة كاملة)',
    'صيانة وقائية مجانية (أول 6 أشهر)'
  ];

  useEffect(() => {
    if (!project?.id) return;
    const q = query(collection(db, 'projects', project.id, 'maintenance'), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMaintenanceRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRequest)));
    });
    return () => unsub();
  }, [project?.id]);

  const generateAIHandoverText = async () => {
    const text = `أقر أنا (${project.clientName || 'العميل'}) بصفتي المالك أو الممثل النظامي للمشروع، باستلام مشروع (${project.title}) بالكامل.
وبعد المعاينة والفحص الميداني، أؤكد أن جميع الأعمال والمراحل والتشطيبات قد تم تنفيذها وتسليمها بحسب المواصفات الفنية وجداول الكميات المتفق عليها بالعقد، وبجودة مرضية تماماً ولا يوجد لدي أي التزامات متبقية أو ملاحظات فنية تمنع التسليم، وأقر بسريان شروط الضمانات المحددة للأنظمة المرفقة.`;
    setHandoverText(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       setHandoverFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSignHandover = async () => {
    if (!handoverText) {
      toast.error('يرجى إدخال أو توليد نص الاستلام أولاً');
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        status: 'handover_pending',
        handoverSignatureText: handoverText,
        guarantees: defaultGuarantees
      });
      toast.success('تم إرسال الإقرار للعميل! المشروع الآن بانتظار توقيع العميل عبر بوابته الإلكترونية.');
      setIsSignOpen(false);
    } catch (err: any) {
      toast.error('فشل توثيق الاستلام: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMaintenance = async () => {
    if (!newRequest.trim()) return;
    try {
      await addDoc(collection(db, 'projects', project.id, 'maintenance'), {
        projectId: project.id,
        date: new Date().toISOString(),
        description: newRequest,
        status: 'pending',
        reportedBy: 'staff'
      });
      setNewRequest('');
      toast.success('تم تسجيل طلب الصيانة بنجاح');
    } catch(err) {
      toast.error('فشل حفظ طلب الصيانة');
    }
  };

  const isHandedOver = project.handoverAccepted;

  return (
    <div className="space-y-6">
      {/* Handover Section */}
      <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative">
        {!isHandedOver ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-amber-50 to-orange-50 text-amber-500 flex items-center justify-center shadow-inner">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">التسليم النهائي وإصدار الضمانات</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">المرحلة الأخيرة في رحلة المشروع لضمان حقوق كافة الأطراف.</p>
              </div>
            </div>
            
            {project.status === 'handover_pending' ? (
              <div className="bg-amber-50 p-6 rounded-3xl border border-dashed border-amber-200 text-center flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                <h4 className="font-black text-amber-700">بانتظار توقيع العميل عبر البوابة الإلكترونية</h4>
                <p className="text-sm font-bold text-amber-600/70">تم إرسال الإقرار بنجاح. سيتم الاعتماد فور توقيع العميل.</p>
              </div>
            ) : !isSignOpen ? (
              <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center gap-4 hover:bg-slate-100 transition-colors">
                <FileCheck className="w-12 h-12 text-slate-300" />
                <h4 className="font-black text-slate-700">لم يتم تسليم المشروع للعميل بعد</h4>
                <Button onClick={() => { setIsSignOpen(true); generateAIHandoverText(); }} className="bg-gradient-to-l from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white rounded-2xl h-12 px-8 font-black shadow-lg shadow-slate-900/20">
                  بدء إجراء التسليم وإنشاء الإقرار
                </Button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-slate-50/80 rounded-[2rem] border border-slate-100 flex flex-col gap-6">
                <div>
                  <Label className="font-black text-sm text-slate-800 flex items-center gap-2 mb-3">
                     <FileCheck className="w-4 h-4 text-emerald-500" />
                     نص إقرار الاستلام للعميل
                     <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">مولد ذكياً بالتفاصيل</span>
                  </Label>
                  <div className="relative">
                     <textarea 
                        value={handoverText}
                        onChange={(e) => setHandoverText(e.target.value)}
                        className="w-full text-sm font-bold bg-white rounded-2xl min-h-[140px] p-5 text-slate-700 border-2 border-slate-100 outline-none focus:border-emerald-500 leading-relaxed shadow-inner"
                     />
                     <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={generateAIHandoverText}
                        className="absolute bottom-4 left-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black"
                     >
                        <Sparkles className="w-3 h-3 ml-1 text-amber-500" />
                        إعادة الصياغة
                     </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-5 rounded-3xl border border-slate-100">
                      <Label className="font-black text-sm text-slate-800 flex items-center gap-2 mb-3">
                         <ShieldCheck className="w-4 h-4 text-blue-500" />
                         الضمانات المرفقة بالتسليم
                      </Label>
                      <ul className="space-y-2">
                         {defaultGuarantees.map((g, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                               <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                               {g}
                            </li>
                         ))}
                      </ul>
                   </div>

                   <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shrink-0">
                         <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                         <p className="text-sm font-black text-slate-800">إرفاق محاضر مطبوعة (اختياري)</p>
                         <p className="text-[10px] font-bold text-slate-500 mt-1">تحديد المرفقات المؤيدة للتسليم ({handoverFiles.length} مرفقات)</p>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                   <Label className="font-black text-sm text-slate-800">تقييم العميل لرحلة المشروع</Label>
                   <div className="flex items-center gap-1 flex-row-reverse">
                      {[1, 2, 3, 4, 5].map(star => (
                         <button key={star} onClick={() => setRating(star)} className="outline-none focus:outline-none transition-transform hover:scale-110">
                            <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-50'}`} />
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
                  <Button variant="outline" onClick={() => setIsSignOpen(false)} className="rounded-2xl h-12 px-6 font-black border-slate-200">إلغاء العملية</Button>
                  <Button onClick={handleSignHandover} disabled={isSaving} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl h-12 px-8 font-black shadow-lg shadow-emerald-500/20">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 ml-2" />}
                    اعتماد التوقيع وإقفال المشروع
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-8 relative z-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100 pb-6 relative">
               <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm ring-4 ring-emerald-50">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-emerald-900 tracking-tight leading-none mb-1.5 flex items-center gap-2">
                       المشروع مكتمل نهائياً
                       <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">محمي</span>
                    </h3>
                    <p className="text-sm font-bold text-slate-600">تاريخ التسليم: <span className="font-black text-emerald-700" dir="ltr">{new Date(project.handoverDate || '').toLocaleDateString('ar-SA')}</span></p>
                  </div>
               </div>
               <div className="flex items-center bg-amber-50 p-3 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-black text-amber-900 ml-3">تقييم العميل</span>
                  <div className="flex items-center gap-1 flex-row-reverse">
                      {[1, 2, 3, 4, 5].map(star => (
                         <Star key={star} className={`w-4 h-4 ${star <= ((project as any).clientRating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-none'}`} />
                      ))}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
               <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600" /> نص الإقرار المعتمد المحفوظ بالنظام
                     </h4>
                     <p className="text-xs font-bold text-slate-600 leading-relaxed bg-white p-4 rounded-2xl shadow-sm">
                        "{project.handoverSignatureText}"
                     </p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                     <h4 className="font-black text-sm text-slate-800 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-600" /> الضمانات السارية الفعالة
                     </h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {((project as any).guarantees || defaultGuarantees).map((g: string, i: number) => (
                           <div key={i} className="flex items-start gap-2 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-[11px] font-bold text-slate-700">{g}</span>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <Card className="p-5 rounded-3xl border border-slate-100 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                     <h4 className="font-black text-sm text-blue-900 mb-2 flex items-center gap-2"><Download className="w-4 h-4" /> المرفقات النهائية</h4>
                     <p className="text-[10px] font-bold text-blue-700/80 mb-4 leading-relaxed">تحميل شهادة إنجاز المشروع وإبراء الذمة بملف PDF معتمد.</p>
                     <Button className="w-full rounded-2xl text-[10px] font-black h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20">
                        تحميل الشهادة (PDF)
                     </Button>
                  </Card>
               </div>
            </div>
          </div>
        )}
      </Card>

      {/* Maintenance Section */}
      {(isHandedOver || project.status === 'maintenance') && (
        <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative">
          <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100/50 shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800">سجل خدمات الصيانة والمتابعة الدورية</h3>
              <p className="text-[10px] font-bold text-slate-500 mt-1">تتبع بلاغات الصيانة للضمانات أو الزيارات الدورية.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8 relative z-10">
            <input 
              type="text"
              value={newRequest}
              onChange={e => setNewRequest(e.target.value)}
              placeholder="اكتب وصف مشكلة الصيانة بتفصيل للتبليغ..."
              className="flex-1 rounded-2xl bg-slate-50 border-2 border-slate-100 px-5 py-4 text-sm font-bold focus:border-blue-500 focus:bg-white transition-all outline-none"
            />
            <Button onClick={handleAddMaintenance} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-auto py-4 px-8 font-black shadow-lg shadow-blue-600/20 shrink-0">
              تسجيل الطلب
            </Button>
          </div>

          <div className="space-y-4 relative z-10">
             {maintenanceRequests.length === 0 ? (
               <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 text-slate-300">
                     <Wrench className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-slate-700 mb-1">صيانة مستقرة</h4>
                  <p className="text-xs font-bold text-slate-400">لا توجد طلبات صيانة مسجلة حتى الآن للمشروع.</p>
               </div>
             ) : (
               <AnimatePresence>
                  {maintenanceRequests.map(req => (
                     <motion.div 
                        key={req.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                     >
                        <div className="flex flex-col gap-1.5">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-white bg-slate-800 px-2.5 py-0.5 rounded-lg">بلاغ #{req.id.substring(0, 5)}</span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(req.date).toLocaleDateString('ar-SA', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                           </div>
                           <p className="text-sm font-black text-slate-800 leading-relaxed">{req.description}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                           <div className={`px-4 py-2 rounded-xl text-[10px] font-black border ${
                              req.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100' :
                              req.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-100' : 
                              'bg-amber-50 text-amber-700 border-amber-100 shadow-sm shadow-amber-100'
                           }`}>
                              {req.status === 'completed' ? 'تم الحل مكتمل' : req.status === 'in-progress' ? 'قيد الصيانة والتنفيذ' : 'معلق للمعاينة'}
                           </div>
                           {req.status !== 'completed' && (
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[10px] font-black hover:bg-emerald-50 hover:text-emerald-600">
                                 تحديث الحالة
                              </Button>
                           )}
                        </div>
                     </motion.div>
                  ))}
               </AnimatePresence>
             )}
          </div>
        </Card>
      )}
    </div>
  );
}
