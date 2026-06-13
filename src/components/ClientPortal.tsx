import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, where } from 'firebase/firestore';
import { Project, MaintenanceRequest, ProjectMilestone, Quotation } from '../types';
import { ShieldCheck, Lock, CheckCircle2, FileCheck, Layers, CalendarDays, Loader2, Receipt, FileText, Download, Wallet, CreditCard, Clock, Activity, MessageSquare, Image as ImageIcon, Wrench, ChevronRight, Send, UploadCloud } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast, Toaster } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClientPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('projectId');
  const [pinInput, setPinInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data States
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Quotation[]>([]);
  const [clientChats, setClientChats] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'media' | 'support' | 'chat'>('overview');
  const [newRequest, setNewRequest] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [signConsent, setSignConsent] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false);
    setDeferredPrompt(null);
  };

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
       // Maintenance Requests
       const qMaint = query(collection(db, 'projects', project.id, 'maintenance'), orderBy('date', 'desc'));
       const unsubMaint = onSnapshot(qMaint, (snap) => {
         setMaintenanceRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRequest)));
       });
       
       // Client Chats
       const qChats = query(collection(db, 'projects', project.id, 'clientChats'), orderBy('createdAt', 'asc'));
       const unsubChats = onSnapshot(qChats, (snap) => {
         setClientChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         setTimeout(() => {
           if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
         }, 100);
       });
       
       // Receipts
       const qReceipts = query(collection(db, 'projects', project.id, 'receipts'), orderBy('uploadedAt', 'desc'));
       const unsubReceipts = onSnapshot(qReceipts, (snap) => {
         setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
       });

       return () => { unsubMaint(); unsubChats(); unsubReceipts(); };
    }
  }, [isAuthenticated, project?.id]);

  useEffect(() => {
    if (isAuthenticated && project?.clientName) {
      const qQuotes = query(collection(db, 'quotations'), where('clientName', '==', project.clientName));
      const unsubQ = onSnapshot(qQuotes, (snap) => {
        setQuotations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quotation)));
      });

      const qInvoices = query(collection(db, 'invoices'), where('clientName', '==', project.clientName));
      const unsubI = onSnapshot(qInvoices, (snap) => {
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quotation)));
      });

      return () => { unsubQ(); unsubI(); };
    }
  }, [isAuthenticated, project?.clientName]);

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
      toast.success('تم رفع الطلب للإدارة بنجاح');
    } catch(err) {
      toast.error('فشل تقديم الطلب');
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !project) return;
    setIsSendingChat(true);
    try {
      await addDoc(collection(db, 'projects', project.id, 'clientChats'), {
        content: chatInput.trim(),
        senderRole: 'client',
        senderName: project.clientName,
        createdAt: new Date().toISOString()
      });
      setChatInput('');
    } catch (err) {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت.');
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await addDoc(collection(db, 'projects', project.id, 'receipts'), {
          fileName: file.name,
          fileData: base64String,
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        });

        // Send notification to Admin
        await addDoc(collection(db, 'notifications'), {
          title: 'إيصال تحويل جديد',
          message: `قام العميل برفع إيصال تحويل جديد لمشروع: ${project.name}`,
          type: 'info',
          projectId: project.id,
          isRead: false,
          timestamp: new Date().toISOString()
        });

        toast.success('تم رفع إيصال التحويل بنجاح، سيتم مراجعته من قبل الإدارة.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('فشل رفع الإيصال');
    } finally {
      setIsUploadingReceipt(false);
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

  if (loading) return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
      <p className="text-slate-400 font-bold animate-pulse">جاري تجهيز البوابة المخصصة لك...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4" dir="rtl">
      <Card className="max-w-md w-full p-8 text-center rounded-[2rem] bg-slate-800/50 border-slate-700/50 backdrop-blur-xl">
        <ShieldCheck className="w-20 h-20 mx-auto text-rose-500 mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
        <h2 className="text-2xl font-black text-white mb-2">عذراً، تعذر الوصول</h2>
        <p className="text-slate-400 font-bold">{error}</p>
      </Card>
    </div>
  );

  if (!isAuthenticated && project) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0B0F19] p-4 relative overflow-hidden" dir="rtl">
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
          <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-violet-600/10 blur-[120px]" />
        </div>

        <Toaster position="top-center" rtl theme="dark" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="w-full p-8 border border-white/5 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-indigo-900/20 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/30 rotate-3">
              <Lock className="w-10 h-10 -rotate-3" />
            </div>
            <h1 className="text-3xl font-black text-center text-white mb-3 tracking-tight">بوابة العميل</h1>
            <p className="text-center text-sm font-bold text-slate-400 mb-8 leading-relaxed">
              يرجى إدخال رمز الوصول الخاص بك لمتابعة مشروع:<br/>
              <span className="text-indigo-400 font-black text-base mt-1 block">{project.title}</span>
            </p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative">
                <input 
                  type="text" 
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="أدخل الرمز السري (6 أرقام)"
                  className="w-full h-16 bg-black/20 border border-white/10 rounded-2xl text-center text-2xl font-black tracking-[0.5em] text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm"
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-xl shadow-indigo-500/25 border-none transition-all hover:scale-[1.02] active:scale-[0.98]">
                تسجيل الدخول الآمن
              </Button>
            </form>
          </Card>

          {isInstallable && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-center">
              <button onClick={handleInstallClick} className="px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold backdrop-blur-md transition-all flex items-center justify-center gap-2 mx-auto">
                📱 تثبيت التطبيق للوصول السريع
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (!project) return null;

  const totalInvoices = project?.budget || 0;
  const totalPaid = project?.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const balance = totalInvoices - totalPaid;

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900" dir="rtl">
      <Toaster position="top-center" rtl />
      
      {/* Top Header Nav */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
           <div>
             <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{project.title}</h1>
             <div className="flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
               <p className="text-xs font-bold text-slate-500">أهلاً بك <span className="text-indigo-600">{project.clientName}</span></p>
             </div>
           </div>
           
           <div className="hidden md:flex items-center gap-4">
              {isInstallable && (
                <Button onClick={handleInstallClick} variant="outline" className="h-10 rounded-xl font-bold text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                  تثبيت التطبيق 📱
                </Button>
              )}
              <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-xs flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" /> اتصال مشفر
              </div>
           </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100">
          {[
            { id: 'overview', label: 'ملخص المشروع', icon: Activity },
            { id: 'financial', label: 'المركز المالي', icon: Wallet },
            { id: 'media', label: 'المعرض والتحديثات', icon: ImageIcon },
            ...(project?.status === 'completed' ? [{ id: 'support', label: 'الدعم والصيانة', icon: Wrench }] : []),
            { id: 'chat', label: 'التواصل المباشر', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Mobile Install Prompt */}
        {isInstallable && (
          <Card className="md:hidden mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white flex items-center justify-between gap-4 border-none shadow-lg shadow-indigo-200">
            <div>
              <h3 className="font-black text-sm mb-1">ثبت التطبيق على جهازك!</h3>
              <p className="text-[10px] font-bold text-indigo-100">وصول سريع لمشروعك في أي وقت.</p>
            </div>
            <Button onClick={handleInstallClick} className="bg-white text-indigo-600 hover:bg-slate-50 font-black rounded-xl text-xs h-10 px-4">
              تثبيت
            </Button>
          </Card>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <Card className="p-5 rounded-[2rem] border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                        <Activity className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">حالة المشروع</span>
                      <span className="text-lg font-black text-slate-800">
                         {project.status === 'completed' ? 'مكتمل' : project.status === 'maintenance' ? 'صيانة وضمان' : 'قيد التنفيذ'}
                      </span>
                   </Card>
                   <Card className="p-5 rounded-[2rem] border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">تاريخ الإنتهاء</span>
                      <span className="text-lg font-black text-slate-800">{project.endDate ? new Date(project.endDate).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                   </Card>
                   <Card className="p-5 rounded-[2rem] border-none shadow-sm bg-white hover:shadow-md transition-shadow col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                          <Layers className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-black text-indigo-600">{project.progress || 0}%</span>
                      </div>
                      <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">نسبة الإنجاز العام</span>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                   </Card>
                </div>

                {/* Handover Block */}
                {project.status !== 'maintenance' && project.status !== 'completed' && project.handoverSignatureText && !project.handoverAccepted && (
                  <Card className="p-8 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <FileCheck className="w-7 h-7 text-white" />
                         </div>
                         <div>
                            <h2 className="text-2xl font-black">توثيق تسليم العمل</h2>
                            <p className="text-sm font-bold text-emerald-100 mt-1">يرجى قراءة إقرار الاستلام والاعتماد لإقفال المشروع.</p>
                         </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl text-sm font-bold leading-relaxed border border-white/20 shadow-inner mb-6">
                        "{project.handoverSignatureText}"
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-3xl border border-white/10">
                         <label className="flex flex-1 items-center gap-3 cursor-pointer select-none">
                            <input type="checkbox" checked={signConsent} onChange={e => setSignConsent(e.target.checked)} className="w-6 h-6 rounded-lg text-emerald-600 border-white/30 bg-white/20 focus:ring-emerald-500" />
                            <span className="text-sm font-black text-white">أقر بمطابقة العمل للمواصفات وأوافق على الاستلام النهائي.</span>
                         </label>
                         <Button disabled={!signConsent || isSigning} onClick={handleSignHandover} className="w-full sm:w-auto px-8 h-12 rounded-xl bg-white text-emerald-600 hover:bg-slate-50 font-black shadow-lg">
                            {isSigning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'اعتماد وتوقيع'}
                         </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Milestones Timeline */}
                <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
                  <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-indigo-500" /> الجدول الزمني للمراحل
                  </h2>
                  <div className="relative border-r-2 border-slate-100 pr-6 space-y-8">
                     {project.milestones?.map((m: ProjectMilestone, i: number) => {
                        const isCompleted = m.status === 'completed';
                        const isInProgress = m.status === 'in-progress';
                        const isPending = m.status === 'pending';
                        
                        return (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="relative"
                          >
                             {/* Connector Line (unless last item) */}
                             {i !== project.milestones.length - 1 && (
                               <div className={`absolute -right-[23px] top-8 w-[2px] h-[calc(100%+1rem)] ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'} transition-colors duration-500`} />
                             )}
                             
                             {/* Icon / Dot */}
                             <div className={`absolute -right-[35px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white z-10 transition-all duration-500 ${
                               isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 
                               isInProgress ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200 animate-pulse' : 
                               'bg-slate-200 text-slate-400'
                             }`}>
                                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isInProgress ? <Activity className="w-3 h-3" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                             </div>
                             
                             {/* Card */}
                             <div className={`p-5 rounded-2xl border transition-all duration-300 ${
                               isInProgress ? 'bg-indigo-50/50 border-indigo-200 shadow-md transform scale-[1.02]' : 
                               isCompleted ? 'bg-white border-emerald-100 shadow-sm' :
                               'bg-slate-50 border-slate-100 opacity-70'
                             }`}>
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                 <div>
                                   <h3 className={`font-black text-base ${isCompleted ? 'text-slate-800' : isInProgress ? 'text-indigo-900' : 'text-slate-500'}`}>
                                     {m.title}
                                   </h3>
                                   {(m.dueDate || m.date) && (
                                     <div className="flex items-center gap-4 mt-2">
                                       {m.dueDate && (
                                         <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                           <Clock className="w-3 h-3" /> مخطط: {new Date(m.dueDate).toLocaleDateString('ar-SA')}
                                         </span>
                                       )}
                                       {m.date && isCompleted && (
                                         <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                           <CheckCircle2 className="w-3 h-3" /> التنفيذ: {new Date(m.date).toLocaleDateString('ar-SA')}
                                         </span>
                                       )}
                                     </div>
                                   )}
                                 </div>
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap self-start sm:self-center ${
                                   isCompleted ? 'bg-emerald-100 text-emerald-700' : 
                                   isInProgress ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-100' : 'bg-slate-200 text-slate-500'
                                 }`}>
                                   {isCompleted ? 'مكتمل' : isInProgress ? 'جاري العمل الآن' : 'معلق'}
                                 </span>
                               </div>
                             </div>
                          </motion.div>
                        );
                     })}
                     {(!project.milestones || project.milestones.length === 0) && (
                       <p className="text-sm font-bold text-slate-400 py-4">لم يتم تحديد مراحل للمشروع حتى الآن.</p>
                     )}
                  </div>
                </Card>
              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
                    <div className="relative z-10">
                      <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">إجمالي الفواتير</span>
                      <span className="text-3xl font-black">{totalInvoices.toLocaleString('ar-SA')} <span className="text-sm text-slate-400 font-bold">ر.س</span></span>
                    </div>
                  </Card>
                  <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-emerald-50 text-emerald-900 border border-emerald-100">
                    <span className="text-[11px] uppercase font-bold text-emerald-600 block mb-2">المبالغ المدفوعة</span>
                    <span className="text-3xl font-black">{totalPaid.toLocaleString('ar-SA')} <span className="text-sm text-emerald-600/70 font-bold">ر.س</span></span>
                  </Card>
                  <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-rose-50 text-rose-900 border border-rose-100">
                    <span className="text-[11px] uppercase font-bold text-rose-600 block mb-2">المبلغ المتبقي</span>
                    <span className="text-3xl font-black">{balance.toLocaleString('ar-SA')} <span className="text-sm text-rose-600/70 font-bold">ر.س</span></span>
                  </Card>
                </div>

                {/* Upload Receipt */}
                <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-black mb-1 flex items-center gap-2">
                      <UploadCloud className="w-5 h-5" /> رفع إيصال تحويل
                    </h3>
                    <p className="text-xs font-bold text-indigo-100">قم برفع صورة لإيصال التحويل البنكي ليتم مراجعته واعتماده.</p>
                  </div>
                  <div>
                    <input type="file" id="receipt-upload" className="hidden" accept="image/*,.pdf" onChange={handleUploadReceipt} disabled={isUploadingReceipt} />
                    <label htmlFor="receipt-upload" className={`cursor-pointer px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${isUploadingReceipt ? 'bg-indigo-400 text-indigo-200' : 'bg-white text-indigo-600 hover:bg-slate-50 shadow-lg'}`}>
                      {isUploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      {isUploadingReceipt ? 'جاري الرفع...' : 'اختيار ملف الإيصال'}
                    </label>
                  </div>
                </Card>

                {/* Uploaded Receipts Status */}
                {receipts.length > 0 && (
                  <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                      <Wallet className="w-6 h-6 text-emerald-500" /> إيصالات التحويل المرفوعة
                    </h2>
                    <div className="space-y-3">
                      {receipts.map(rec => (
                        <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                               <FileCheck className="w-5 h-5" />
                             </div>
                             <div>
                               <p className="text-sm font-black text-slate-800 line-clamp-1">{rec.fileName}</p>
                               <p className="text-[10px] font-bold text-slate-500">{new Date(rec.uploadedAt).toLocaleDateString('ar-SA')}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-3">
                             <div className={`px-3 py-1 text-[10px] font-black rounded-lg ${rec.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : rec.status === 'rejected' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                               {rec.status === 'approved' ? 'معتمد' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                             </div>
                             {rec.fileData && (
                               <Button onClick={() => {
                                 // Create a temporary link to preview/download
                                 const link = document.createElement('a');
                                 link.href = rec.fileData;
                                 link.download = rec.fileName || 'receipt';
                                 link.click();
                               }} variant="outline" className="h-8 px-3 rounded-lg text-xs font-black gap-2 border-slate-200">
                                 <Download className="w-3.5 h-3.5" /> عرض
                               </Button>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Documents List */}
                <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <Receipt className="w-6 h-6 text-violet-500" /> الفواتير وعروض الأسعار
                  </h2>
                  
                  {invoices.length === 0 && quotations.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-bold">لا توجد مستندات مالية متاحة حالياً.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invoices.map(inv => (
                        <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Receipt className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="font-black text-base text-slate-800 block mb-1">فاتورة ضريبية #{inv.docNumber || 'معلقة'}</span>
                              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{inv.totalAmount?.toLocaleString('ar-SA')} ر.س</span>
                                <span>{new Date(inv.date).toLocaleDateString('ar-SA')}</span>
                              </div>
                            </div>
                          </div>
                          {inv.pdfUrl && (
                            <Button onClick={() => window.open(inv.pdfUrl, '_blank')} className="h-12 px-6 rounded-xl text-sm font-black gap-2 bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto">
                              <Download className="w-4 h-4" /> تحميل PDF
                            </Button>
                          )}
                        </div>
                      ))}

                      {quotations.map(q => (
                        <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <FileText className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="font-black text-base text-slate-800 block mb-1">عرض سعر #{q.docNumber || 'معلق'}</span>
                              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                <span className="text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded-md">{q.totalAmount?.toLocaleString('ar-SA')} ر.س</span>
                                <span>{new Date(q.date).toLocaleDateString('ar-SA')}</span>
                              </div>
                            </div>
                          </div>
                          {q.pdfUrl && (
                            <Button onClick={() => window.open(q.pdfUrl, '_blank')} variant="outline" className="h-12 px-6 rounded-xl text-sm font-black gap-2 border-slate-300 w-full sm:w-auto">
                              <Download className="w-4 h-4" /> تحميل PDF
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                <Card className="p-12 text-center rounded-[2.5rem] border-dashed border-2 border-slate-200 bg-slate-50/50">
                  <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-6">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">معرض الصور والملفات</h3>
                  <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">سيتم إضافة صور المخططات وتحديثات العمل هنا قريباً من قبل فريق العمل لتتمكن من الاطلاع عليها وإبداء ملاحظاتك.</p>
                </Card>
              </div>
            )}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                <Card className="p-6 md:p-8 rounded-[2.5rem] border-none shadow-sm bg-white">
                   <div className="flex items-start justify-between mb-8">
                     <div>
                       <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
                         <MessageSquare className="w-6 h-6 text-blue-500" /> تذاكر الدعم والصيانة
                       </h2>
                       <p className="text-sm font-bold text-slate-500">ارفع ملاحظاتك أو طلبات الصيانة مباشرة لفريق الدعم الفني.</p>
                     </div>
                   </div>

                   <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 mb-8">
                     <label className="block text-sm font-black text-blue-900 mb-3">وصف المشكلة أو الطلب:</label>
                     <textarea 
                       value={newRequest}
                       onChange={e => setNewRequest(e.target.value)}
                       className="w-full bg-white border border-blue-100 rounded-2xl p-4 font-bold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-none mb-4"
                       placeholder="اكتب تفاصيل طلبك هنا..."
                     />
                     <Button onClick={handleAddMaintenance} disabled={!newRequest.trim()} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-8 font-black shadow-lg shadow-blue-500/20">
                       إرسال الطلب للإدارة
                     </Button>
                   </div>
                   
                   <div className="space-y-4">
                     <h3 className="text-lg font-black text-slate-800 mb-4">طلباتك السابقة</h3>
                     {maintenanceRequests.length === 0 ? (
                       <div className="text-center py-8 text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-slate-100">لا يوجد بلاغات سابقة.</div>
                     ) : (
                       maintenanceRequests.map(req => (
                         <div key={req.id} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(req.date).toLocaleDateString('ar-SA')}</span>
                                <span className="text-[10px] uppercase font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(req.date).toLocaleTimeString('ar-SA')}</span>
                              </div>
                              <p className="text-sm font-bold text-slate-800 leading-relaxed">{req.description}</p>
                            </div>
                            <div className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black text-center ${
                              req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              req.status === 'in-progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {req.status === 'completed' ? 'تم الحل والمراجعة' : req.status === 'in-progress' ? 'قيد المعالجة حالياً' : 'قيد الانتظار'}
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                </Card>
               </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="space-y-6">
                <Card className="flex flex-col h-[600px] rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">التواصل المباشر</h2>
                      <p className="text-xs font-bold text-slate-500">تواصل مع إدارة خبراء الرسم بخصوص مشروعك.</p>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#efeae2]" ref={chatScrollRef} style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundSize: '100px' }}>
                    {clientChats.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-white/50 rounded-3xl mx-4 backdrop-blur-sm p-8 text-center border border-white/60 shadow-sm">
                        <MessageSquare className="w-12 h-12 mb-3 text-indigo-300" />
                        <p className="font-black text-sm text-slate-700">مرحباً بك في المحادثة المباشرة 👋</p>
                        <p className="text-xs mt-2 font-bold leading-relaxed">نحن هنا للإجابة على جميع استفساراتك حول المشروع.<br/>اكتب رسالتك بالأسفل وسنرد عليك في أقرب وقت.</p>
                      </div>
                    ) : (
                      clientChats.map((msg, i) => {
                        const isClient = msg.senderRole === 'client';
                        return (
                          <div key={msg.id || i} className={`flex ${isClient ? 'justify-start' : 'justify-end'}`}>
                            <div className={`relative max-w-[85%] rounded-2xl p-3 shadow-sm ${isClient ? 'bg-white text-slate-800 rounded-tr-sm' : 'bg-[#e1fed3] text-slate-800 rounded-tl-sm'}`}>
                               {/* Tail */}
                               <div className={`absolute top-0 w-3 h-3 ${isClient ? '-right-2 bg-white' : '-left-2 bg-[#e1fed3]'} mask-chat-tail`} style={{ clipPath: isClient ? 'polygon(0 0, 0% 100%, 100% 0)' : 'polygon(0 0, 100% 100%, 100% 0)' }} />
                               <p className="text-sm font-bold leading-relaxed relative z-10 whitespace-pre-wrap">{msg.content || msg.text}</p>
                               <div className="flex items-center gap-1 text-[9px] mt-1 font-bold justify-end text-slate-400">
                                 <span>{new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                                 {!isClient && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                               </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
                     <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="relative flex items-center gap-2">
                       <input 
                         type="text"
                         value={chatInput}
                         onChange={e => setChatInput(e.target.value)}
                         placeholder="اكتب رسالتك هنا..."
                         className="flex-1 bg-white border border-slate-200 shadow-sm rounded-full h-12 px-6 font-bold text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-6 pl-14"
                         disabled={isSendingChat}
                       />
                       <Button type="submit" disabled={isSendingChat || !chatInput.trim()} className="absolute left-1.5 w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center p-0 shadow-md transition-all">
                         {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-1" />}
                       </Button>
                     </form>
                  </div>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Footer Branding */}
      <div className="text-center pb-8 pt-4">
        <p className="text-[10px] font-bold text-slate-400">نظام إدارة المشاريع الذكي • خبراء الرسم</p>
      </div>
    </div>
  );
}
