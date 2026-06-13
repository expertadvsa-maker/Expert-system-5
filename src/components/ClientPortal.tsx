import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { Project, MaintenanceRequest, ProjectMilestone } from '../types';
import { ShieldCheck, Lock, CheckCircle2, MapPin, Wrench, FileCheck, Layers, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast, Toaster } from 'sonner';

export default function ClientPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [newRequest, setNewRequest] = useState('');
  const [signConsent, setSignConsent] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setError('رابط المشروع غير صالح أو غير مكتمل');
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        } else {
          setError('لم يتم العثور على المشروع المعني');
        }
      } catch (err) {
         setError('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    if (isAuthenticated && project?.id) {
       const q = query(collection(db, 'projects', project.id, 'maintenance'), orderBy('date', 'desc'));
       const unsub = onSnapshot(q, (snap) => {
         setMaintenanceRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRequest)));
       });
       return () => unsub();
    }
  }, [isAuthenticated, project?.id]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (project?.clientPin === pinInput) {
      setIsAuthenticated(true);
      toast.success('تم التحقق بنجاح، مرحباً بك.');
    } else {
      toast.error('رمز الوصول غير صحيح');
    }
  };

  const handleAddMaintenance = async () => {
    if (!newRequest.trim() || !project) return;
    try {
      await addDoc(collection(db, 'projects', project.id, 'maintenance'), {
        projectId: project.id,
        date: new Date().toISOString(),
        description: newRequest,
        status: 'pending',
        reportedBy: 'client'
      });
      setNewRequest('');
      toast.success('تم رفع طلب الصيانة للشركة بنجاح');
    } catch(err) {
      toast.error('فشل تقديم الطلب');
    }
  };

  const handleSignHandover = async () => {
    if (!project) return;
    setIsSigning(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        status: 'maintenance',
        handoverAccepted: true,
        handoverDate: new Date().toISOString(),
      });
      toast.success('تم تأكيد الاستلام بنجاح، شكراً لثقتكم.');
    } catch (err) {
      toast.error('حدث خطأ أثناء التوثيق');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <Card className="max-w-md w-full p-8 text-center rounded-3xl">
        <ShieldCheck className="w-16 h-16 mx-auto text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">عذراً</h2>
        <p className="text-sm font-bold text-slate-500">{error}</p>
      </Card>
    </div>
  );

  if (!isAuthenticated && project) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <Toaster position="top-center" rtl />
        <Card className="max-w-md w-full p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-center text-slate-800 mb-2">بوابة العميل</h1>
          <p className="text-center text-sm font-bold text-slate-500 mb-8">يرجى إدخال رمز الوصول الخاص بك لمتابعة مشروع: <span className="text-indigo-600 font-black">{project.title}</span></p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="text" 
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder="أدخل رمز الوصول (6 أرقام)"
                className="w-full h-14 bg-slate-100 border-none rounded-xl text-center text-xl font-black tracking-widest focus:ring-2 focus:ring-indigo-500"
                maxLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-14 rounded-xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200">
              دخول آمن للمشروع
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8" dir="rtl">
      <Toaster position="top-center" rtl />
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b-2 border-slate-200/50">
           <div>
             <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{project.title}</h1>
             <p className="text-sm font-bold text-slate-500">أهلاً بك <span className="text-primary font-black">{project.clientName}</span>، في بوابة مراجعة ومتابعة مشروعك.</p>
           </div>
           <div className="hidden md:flex">
             <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> اتصال آمن ومشفر
             </div>
           </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card className="p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-slate-400">حالة المشروع</span>
              <span className="text-lg font-black text-slate-800">
                 {project.status === 'completed' ? 'مكتمل' : project.status === 'maintenance' ? 'في وضع الصيانة' : 'جاري العمل'}
              </span>
           </Card>
           <Card className="p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-slate-400">تاريخ الإنتهاء المتوقع</span>
              <span className="text-lg font-black text-slate-800">{project.endDate ? new Date(project.endDate).toLocaleDateString('ar-SA') : 'رقمياً غير مدرج'}</span>
           </Card>
           <Card className="p-4 rounded-3xl border-none shadow-sm flex flex-col gap-1">
              <span className="text-[10px] uppercase font-black text-slate-400">نسبة تقدم العمل</span>
              <span className="text-lg font-black text-blue-600">{project.progress || 0}%</span>
           </Card>
        </div>

        {/* Handover & Maintenance Blocks */}
        {project.status !== 'maintenance' && project.status !== 'completed' && project.handoverSignatureText && !project.handoverAccepted && (
          <Card className="p-6 md:p-8 rounded-[2.5rem] bg-emerald-50 border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-emerald-900">توثيق تسليم العمل</h2>
                    <p className="text-sm font-bold text-emerald-700/70">يرجى قراءة إقرار الاستلام والاعتماد لإقفال المشروع ونقله للضمان.</p>
                 </div>
              </div>
              <div className="bg-white p-5 rounded-2xl text-sm font-bold text-slate-700 leading-relaxed border border-emerald-50 shadow-sm">
                "{project.handoverSignatureText}"
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center pl-2">
                 <label className="flex flex-1 items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={signConsent} onChange={e => setSignConsent(e.target.checked)} className="w-5 h-5 rounded text-emerald-600 border-emerald-300 focus:ring-emerald-500" />
                    <span className="text-xs font-black text-emerald-800">أقر بمطابقة العمل للمواصفات وموافقتي على الاستلام النهائي.</span>
                 </label>
                 <Button disabled={!signConsent || isSigning} onClick={handleSignHandover} className="w-full sm:w-auto px-8 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                    {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'توقيع إلكتروني واعتماد'}
                 </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Milestones Overview */}
        <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> المراحل المنفذة
          </h2>
          <div className="space-y-4">
             {project.milestones?.map((m: ProjectMilestone, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                   <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                        m.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                         {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : (i + 1)}
                      </div>
                      <span className={`font-bold text-sm ${m.status === 'completed' ? 'text-slate-900' : 'text-slate-500'}`}>{m.title}</span>
                   </div>
                   <div className="text-[10px] font-black text-slate-400 pr-11 sm:pr-0">
                      {m.status === 'completed' ? 'تم الإنجاز' : m.status === 'in-progress' ? 'قيد العمل' : 'معلق'}
                   </div>
                </div>
             ))}
             {(!project.milestones || project.milestones.length === 0) && (
               <p className="text-xs font-bold text-slate-400">لا توجد مراحل مسجلة حالياً.</p>
             )}
          </div>
        </Card>

        {/* Maintenance / Warranty Support */}
        {(project.status === 'maintenance' || project.handoverAccepted) && (
          <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
             <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
               <Wrench className="w-5 h-5 text-blue-500" /> بلاغات الضمان والصيانة
             </h2>
             <div className="flex gap-2 mx-auto max-w-2xl mb-8">
               <input 
                 value={newRequest}
                 onChange={e => setNewRequest(e.target.value)}
                 className="flex-1 bg-slate-50 border-none rounded-xl h-12 px-4 font-bold text-sm focus:ring-2 focus:ring-blue-100"
                 placeholder="اشرح المشكلة وما يحتاج الصيانة..."
               />
               <Button onClick={handleAddMaintenance} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-6 font-black shadow-md">
                 تقديم البلاغ
               </Button>
             </div>
             
             <div className="space-y-3 max-w-2xl mx-auto">
               {maintenanceRequests.length === 0 ? (
                 <div className="text-center py-6 text-slate-400 font-bold text-xs">لا يوجد بلاغات موجهة للشركة.</div>
               ) : (
                 maintenanceRequests.map(req => (
                   <div key={req.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-black text-slate-400">{new Date(req.date).toLocaleDateString('ar-SA')}</span>
                        <p className="text-sm font-bold text-slate-800">{req.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                        req.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        req.status === 'in-progress' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {req.status === 'completed' ? 'تم الحل' : req.status === 'in-progress' ? 'قيد الصيانة' : 'معلق'}
                      </div>
                   </div>
                 ))
               )}
             </div>
          </Card>
        )}

      </div>
    </div>
  );
}
