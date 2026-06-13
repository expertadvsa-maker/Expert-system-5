import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { sendWhatsappToManager } from '../lib/whatsapp';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  MapPin, 
  HelpCircle, 
  Phone, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  LayoutDashboard, 
  Camera, 
  MessageCircle, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  FileText,
  User,
  Info,
  Settings2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Loader2,
  UsersRound,
  Sparkles,
  UploadCloud,
  Video,
  Mail,
  MessageSquare,
  CheckSquare,
  Square,
  Star,
  Hash,
  Maximize,
  Check,
  Lock
} from 'lucide-react';
import { 
  doc, 
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
  serverTimestamp,
  addDoc,
  deleteField
} from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendWhatsappMessage } from '../lib/whatsapp';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { Project, UserProfile as Worker, ProjectUpdate, Transaction, ProjectMilestone } from '../types';
import { calculateProjectProgress } from '../lib/projectUtils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ProjectViewV2Props {
  projectId: string;
  onBack: () => void;
}

const projectTypeLabels: Record<string, string> = {
  hoardings: "أسوار دعائية (تجهيز المواقع)",
  signage_printing: "لوحات وطباعة (واجهات بنر وفليكس)",
  cladding_letters: "كلادينج وحروف بارزة مضيئة",
  digital_screens: "شاشات ومجسمات LED",
  exhibition_booths: "تجهيز معارض ومؤتمرات (أجنحة)",
  megastructures: "مجسمات جمالية وهندسية ضخمة",
  wrapping_branding: "تغليف ودمج هوية المركبات",
  maintenance: "صيانة وقائية وتصحيحية للوحات",
};

const HelpTooltip = ({ content }: { content: string }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div className="relative inline-flex items-center mx-1 select-none z-30">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-slate-400 hover:text-primary transition-colors cursor-help outline-none p-0.5"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 w-56 p-3 bg-slate-900 text-white rounded-2xl text-[10px] font-bold leading-relaxed shadow-xl border border-slate-800 text-right z-50 pointer-events-none"
          >
            <div className="absolute top-full right-1/2 translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-800" />
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

import HandoverAndMaintenance from './HandoverAndMaintenance';

export default function ProjectViewV2({ projectId, onBack }: ProjectViewV2Props) {
  const { profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [usersList, setUsersList] = useState<Worker[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clientChats, setClientChats] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  // States for interactive dialogs
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [selectedMeetingParticipants, setSelectedMeetingParticipants] = useState<string[]>([]);
  const [activeMeetingUrl, setActiveMeetingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef<any>(null);
  const recordedChunksRef = React.useRef<Blob[]>([]);
  const [isClientChatOpen, setIsClientChatOpen] = useState(false);
  const [clientMessage, setClientMessage] = useState('');

  // Financial Forms
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'transfer',
    description: ''
  });
  
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'شراء خامات ومواد',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'transfer',
    description: ''
  });

  // Chat Input State
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [presence, setPresence] = useState<{ online: Record<string, any>; typing: Record<string, any> }>({ online: {}, typing: {} });
  const [activeUsersList, setActiveUsersList] = useState<any[]>([]);

  // Real-time listener for presence
  useEffect(() => {
    if (!projectId || !auth.currentUser) return;
    
    const presenceRef = doc(db, 'projectPresence', projectId);

    const updatePresenceLocal = async () => {
      if (!auth.currentUser) return;
      const now = new Date().toISOString();
      await setDoc(presenceRef, {
        online: { [auth.currentUser.uid]: { time: now, name: profile?.name || auth.currentUser.email } }
      }, { merge: true });
    };
    
    updatePresenceLocal();
    const interval = setInterval(updatePresenceLocal, 60000); // refresh every 60s

    const unsubscribe = onSnapshot(presenceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPresence({
          online: data.online || {},
          typing: data.typing || {}
        });
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      if (auth.currentUser) {
        updateDoc(presenceRef, {
          [`online.${auth.currentUser.uid}`]: deleteField(),
          [`typing.${auth.currentUser.uid}`]: deleteField()
        }).catch(err => console.error("Error removing presence on unmount:", err));
      }
    };
  }, [projectId, auth.currentUser, profile?.name]);

  // Debounce typing state locally
  const lastTypingTime = React.useRef(0);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    
    if (!auth.currentUser) return;
    
    const now = Date.now();
    if (now - lastTypingTime.current > 2000) {
      lastTypingTime.current = now;
      setDoc(doc(db, 'projectPresence', projectId), {
        typing: { [auth.currentUser.uid]: { time: new Date().toISOString(), name: profile?.name || auth.currentUser.email } }
      }, { merge: true });
    }
  };


  // Upload Doc State
  const [isUploading, setIsUploading] = useState(false);

  // Functions for CRUD actions
  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    try {
      const amountVal = parseFloat(paymentForm.amount);
      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        id: txRef.id,
        type: 'income',
        category: 'دفعة عميل',
        amount: amountVal,
        description: paymentForm.description || 'دفعة عميل للمشروع',
        paymentMethod: paymentForm.paymentMethod,
        date: paymentForm.date,
        projectId: projectId,
        createdBy: auth.currentUser?.uid || 'system',
        status: 'approved',
        timestamp: serverTimestamp()
      } as any);

      toast.success("تم تسجيل الدفعة بنجاح");
      setIsAddPaymentOpen(false);
      setPaymentForm({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions', auth);
    }
  };

  const handleApproveInstallment = async (installment: any) => {
    if (!project) return;
    try {
      const updatedPayments = (project.payments || []).map(p => {
        if (p.id === installment.id) {
          return {
            ...p,
            status: 'paid' as const,
            paidAt: new Date().toISOString()
          };
        }
        return p;
      });

      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        id: txRef.id,
        type: 'income',
        category: 'دفعة عميل',
        amount: installment.amount,
        description: installment.description || `تحصيل الدفعة المستحقة`,
        paymentMethod: 'transfer',
        date: new Date().toISOString().split('T')[0],
        projectId: projectId,
        createdBy: auth.currentUser?.uid || 'system',
        status: 'approved',
        timestamp: serverTimestamp()
      } as any);

      await updateDoc(doc(db, 'projects', projectId), {
        payments: updatedPayments
      });

      toast.success("تم تحصيل الدفعة بنجاح وتسجيل الحركة في الحسابات");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    try {
      const amountVal = parseFloat(expenseForm.amount);
      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        id: txRef.id,
        type: 'expense',
        category: expenseForm.category,
        amount: amountVal,
        description: expenseForm.description || 'مصروف إنتاج وتصنيع',
        paymentMethod: expenseForm.paymentMethod,
        date: expenseForm.date,
        projectId: projectId,
        createdBy: auth.currentUser?.uid || 'system',
        status: 'approved',
        timestamp: serverTimestamp()
      } as any);

      toast.success("تم تسجيل المصروف بنجاح");
      setIsAddExpenseOpen(false);
      setExpenseForm({
        amount: '',
        category: 'شراء خامات ومواد',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        description: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'transactions', auth);
    }
  };

  const handleToggleWorker = async (workerId: string, isAssigned: boolean) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        workerIds: isAssigned ? arrayRemove(workerId) : arrayUnion(workerId)
      });
      if (!isAssigned) {
         await addDoc(collection(db, 'notifications'), {
            title: 'تم إضافتك لمشروع جديد',
            message: `تم تكليفك ضمن الفريق الفني لمشروع: ${project?.title || 'مشروع جديد'}`,
            type: 'info',
            category: 'project',
            timestamp: serverTimestamp(),
            read: false,
            targetUserId: workerId,
            projectId: projectId
         });
      }
      toast.success(isAssigned ? "تم إزالة الموظف من الفريق" : "تم إضافة الموظف للفريق وإرسال إشعار له");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setIsSendingChat(true);
    try {
      const updateRef = doc(collection(db, 'projectUpdates'));
      await setDoc(updateRef, {
        id: updateRef.id,
        projectId: projectId,
        content: chatInput.trim(),
        createdAt: new Date().toISOString(),
        authorId: auth.currentUser?.uid || 'system',
        authorName: profile?.name || auth.currentUser?.email || 'موظف النظام'
      });
      setChatInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectUpdates', auth);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleUploadDocs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading("جاري رفع الملفات وتوثيقها في النظام...");
    
    try {
      const filesArray = Array.from(e.target.files);
      for (const file of filesArray) {
        // 1. Validate file size (max 15MB)
        const maxSizeBytes = 15 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          toast.error(`الملف ${file.name} يتجاوز الحد الأقصى المسموح به (15 ميجابايت)`);
          continue;
        }

        // 2. Validate file type/extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.dwg', '.docx', '.xlsx', '.txt'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExtension) && !file.type.startsWith('image/')) {
          toast.error(`صيغة الملف ${file.name} غير مدعومة`);
          continue;
        }

        const storageRef = ref(storage, `projects/${projectId}/attachments/${file.name}`);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);

        if (file.type.startsWith('image/')) {
          await updateDoc(doc(db, 'projects', projectId), {
            photoUrls: arrayUnion(downloadUrl)
          });
        } else {
          await updateDoc(doc(db, 'projects', projectId), {
            fileAttachments: arrayUnion({
              name: file.name,
              url: downloadUrl,
              uploadedAt: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA')
            })
          });
        }
      }
      toast.dismiss(toastId);
      toast.success("تم رفع وتوثيق المرفقات بنجاح");
      setIsUploadDocOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      const errMsg = err && err.message ? err.message : String(err);
      toast.error(`فشل رفع المرفقات: ${errMsg}. تأكد من تفعيل Storage وتهيئة CORS وقواعد الحماية.`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadData = () => {
    setIsLoading(true);
    setError(null);

    const unsubProject = onSnapshot(doc(db, 'projects', projectId), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Project;
          setProject(data);
          setEditForm(data);
        } else {
          toast.error("المشروع غير موجود");
          onBack();
        }
        setIsLoading(false);
      },
      (err) => {
        setError("فشل الاتصال: تعذر جلب بيانات المشروع");
        handleFirestoreError(err, OperationType.GET, `projects/${projectId}`, auth);
      }
    );

    const unsubWorkers = onSnapshot(collection(db, 'workers'), 
      (snapshot) => {
        setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'workers', auth)
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('name', 'asc')),
      (snapshot) => {
        setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
      },
      (err) => {
        console.error("Failed to load users in ProjectView", err);
      }
    );

    const unsubUpdates = onSnapshot(
      query(collection(db, 'projectUpdates'), where('projectId', '==', projectId)),
      (snapshot) => {
        const sortedUpdates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectUpdate)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUpdates(sortedUpdates);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'projectUpdates', auth)
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), where('projectId', '==', projectId)),
      (snapshot) => {
        const sortedTxs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedTxs);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'project-transactions', auth)
    );

    const unsubClientChats = onSnapshot(
      query(collection(db, 'projects', projectId, 'clientChats'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        setClientChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        // Auto scroll to bottom when new messages arrive
        setTimeout(() => {
          if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
          }
        }, 100);
      },
      (err) => console.log('Client chats list disabled/empty or error')
    );

    const unsubReceipts = onSnapshot(
      query(collection(db, 'projects', projectId, 'receipts'), orderBy('uploadedAt', 'desc')),
      (snapshot) => {
        setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => console.log('Receipts list disabled/empty or error')
    );

    return () => {
      unsubProject();
      unsubWorkers();
      unsubUsers();
      unsubUpdates();
      unsubTransactions();
      unsubClientChats();
      unsubReceipts();
    };
  };

  useEffect(() => {
    const unsub = loadData();
    return () => unsub();
  }, [projectId]);

  const projectWorkers = useMemo(() => {
    if (!project?.workerIds) return [];
    const allAvailable = [
      ...usersList.map(u => ({ ...u, isDailyWage: false })),
      ...workers.map(w => ({ ...w, isDailyWage: true, role: w.role || 'عامل يومية' }))
    ] as Array<any>;
    return allAvailable.filter(w => project.workerIds?.includes(w.id));
  }, [project, usersList, workers]);

  const teamCandidates = useMemo(() => {
    const productionEmployees = usersList
      .filter(u => u.department === 'الإنتاج' || u.dept === 'الإنتاج' || u.role === 'worker')
      .map(u => ({ ...u, isDailyWage: false }));
      
    const dailyWageWorkers = workers.map(w => ({
      ...w,
      isDailyWage: true,
      role: w.role || 'عامل يومية'
    }));
    
    return [...productionEmployees, ...dailyWageWorkers] as Array<any>;
  }, [usersList, workers]);

  const siteSupervisor = useMemo(() => {
    if (project?.supervisor && project.supervisor.trim() !== '') {
      return project.supervisor;
    }
    const supervisor = projectWorkers.find(w => w.role?.toLowerCase().includes('supervisor') || w.role?.toLowerCase().includes('manager'));
    return supervisor ? supervisor.name : 'قيد التعيين';
  }, [project, projectWorkers]);

  const handleUpdateProject = async () => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        ...editForm,
        updatedAt: new Date().toISOString()
      });
      toast.success("تم تحديث بيانات المشروع");
      setIsEditOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`, auth);
    }
  };

  const financialStats = useMemo(() => {
    if (!project) return { paid: 0, balance: 0, expenses: 0, netProfit: 0 };
    const paidIncomes = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    // To prevent double-counting installments that are also recorded as transactions in paidIncomes:
    const paid = (project.depositAmount || 0) + paidIncomes;
    const balance = (project.projectValue ?? project.budget ?? 0) - paid;
    const expenses = transactions.filter(t => t.type === 'expense' || t.type === 'purchase').reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = (project.projectValue ?? project.budget ?? 0) - expenses;
    return { paid, balance, expenses, netProfit };
  }, [project, transactions]);

  const achievementStats = useMemo(() => {
    if (!project) return 0;
    return calculateProjectProgress(project as Project);
  }, [project]);

  const [newStage, setNewStage] = useState<{title: string; description: string; weight: number; dueDate: string; assignedWorkerId: string}>({ 
    title: '', 
    description: '',
    weight: 10,
    dueDate: '',
    assignedWorkerId: ''
  });
  const [isAddingStage, setIsAddingStage] = useState(false);

  const handleAddStage = async () => {
    if (!newStage.title || newStage.weight <= 0) {
      toast.error("يرجى إدخال اسم المرحلة ووزنها");
      return;
    }

    try {
      const milestone: ProjectMilestone = {
        title: newStage.title,
        description: newStage.description,
        weight: newStage.weight,
        status: 'pending',
        date: new Date().toISOString(),
        dueDate: newStage.dueDate,
        assignedWorkerId: newStage.assignedWorkerId
      };

      await updateDoc(doc(db, 'projects', projectId), {
        milestones: arrayUnion(milestone)
      });
      
      toast.success("تم إضافة المرحلة بنجاح");
      setNewStage({ title: '', description: '', weight: 10, dueDate: '', assignedWorkerId: '' });
      setIsAddingStage(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
    }
  };

  const handleDeleteStage = async (milestone: ProjectMilestone) => {
     try {
        await updateDoc(doc(db, 'projects', projectId), {
           milestones: arrayRemove(milestone)
        });
        toast.success("تم حذف المرحلة");
     } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
     }
  };

  const handleToggleMilestone = async (stageTitle: string) => {
    if (!project) return;
    
    try {
      const newMilestones = (project.milestones || []).map(m => {
        if (m.title === stageTitle) {
          return {
            ...m,
            status: (m.status === 'completed' ? 'pending' : 'completed') as ProjectMilestone['status'],
            date: new Date().toISOString()
          };
        }
        return m;
      });

      const allCompleted = newMilestones.length > 0 && newMilestones.every(m => m.status === 'completed');
      const nextStatus = allCompleted ? 'completed' : 'active';

      await updateDoc(doc(db, 'projects', projectId), {
        milestones: newMilestones,
        status: nextStatus
      });
      
      const newlyCompleted = newMilestones.find(m => m.title === stageTitle)?.status === 'completed';
      if (newlyCompleted) {
        const waMsg = `✅ *إنجاز جديد في المشروع*\n\n📁 *المشروع:* ${project.title}\n🎯 *المرحلة المنجزة:* ${stageTitle}\n📊 *حالة المشروع الكلية:* ${nextStatus === 'completed' ? '🌟 مكتمل بالكامل' : '⏳ قيد التنفيذ'}\n\nيرجى مراجعة تفاصيل المشروع في النظام.`;
        await sendWhatsappToManager(waMsg);
      }

      toast.success("تم تحديث حالة المرحلة");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
        <div className="h-14 w-14 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        <p className="font-black text-slate-500 animate-pulse">جاري تحميل منصة المشروع...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6" dir="rtl">
        <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center">
           <Zap className="w-10 h-10" />
        </div>
        <div className="space-y-2">
           <h2 className="text-2xl font-black text-slate-900">انقطع الاتصال بالقاعدة</h2>
           <p className="text-slate-500 font-bold text-sm max-w-xs mx-auto">{error}</p>
        </div>
        <Button onClick={() => loadData()} className="h-14 w-full max-w-xs rounded-2xl bg-slate-900 font-black">
           إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (!project) return null;

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard /> },
    { id: 'milestones', label: 'مراحل المشروع', icon: <Layers /> },
    { id: 'team', label: 'الفريق الفني', icon: <Users /> },
    { id: 'financials', label: 'الحسابات', icon: <DollarSign /> },
    { id: 'monitoring', label: 'التوثيق', icon: <Camera /> },
    { id: 'chat', label: 'تواصل', icon: <MessageCircle /> },
    { id: 'handover', label: 'التسليم والصيانة', icon: <ShieldCheck /> },
  ];

  return (
    <div className="w-full px-4 py-4 flex flex-col gap-6" dir="rtl">
      
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between w-full">
           <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="rounded-xl bg-white shadow-sm border border-slate-100 h-8 w-8"
           >
              <ArrowLeft className="w-4 h-4 text-slate-900" />
           </Button>
           <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] px-3 py-1 rounded-lg uppercase tracking-widest">
              ID: {project.id.slice(-6)}
           </Badge>
        </div>
        
        <div className="space-y-2">
           <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{project.status === 'active' ? 'قيد التنفيذ والمتابعة' : 'مشروع منتهي'}</span>
           </div>
           <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                 {project.title}
              </h1>
              <Dialog open={isEditOpen} onOpenChange={(open) => {
                 if (open && profile?.role !== 'manager') {
                    toast.error("صلاحيات الإدارة محصورة على المالك (المدير) فقط لمنع التلاعب.");
                    return;
                 }
                 setIsEditOpen(open);
              }}>
                 <DialogTrigger asChild>
                    <button className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-background h-8 px-3 font-black text-[9px] gap-2 hover:bg-muted transition-all outline-none cursor-pointer">
                       <Settings2 className="w-2.5 h-2.5" />
                       إدارة
                    </button>
                 </DialogTrigger>
                 <DialogContent className="max-w-lg rounded-[2.5rem] p-8 border-none" dir="rtl">
                    <DialogHeader>
                       <DialogTitle className="text-right font-black">تعديل بيانات المشروع</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 mt-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                             <Label className="text-xs font-black text-slate-400">عنوان المشروع *</Label>
                             <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="rounded-xl border-slate-100 font-bold" />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">نوع المشروع / اللوحة *</Label>
                             <select
                                value={editForm.projectType || 'hoardings'}
                                onChange={e => setEditForm({...editForm, projectType: e.target.value})}
                                className="w-full h-10 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs pr-4 focus:ring-0 focus:border-primary outline-none"
                             >
                                <option value="hoardings">أسوار دعائية (تجهيز المواقع والمشاريع الخارجية)</option>
                                <option value="signage_printing">لوحات وطباعة (واجهات محلات، يوني بول، بنر وفليكس)</option>
                                <option value="cladding_letters">كلادينج وحروف بارزة (حروف مضيئة، زنكور، اكريليك واستيل)</option>
                                <option value="digital_screens">شاشات ومجسمات (شاشات LED وتجهيز معارض ومؤتمرات)</option>
                                <option value="exhibition_booths">تجهيز معارض ومؤتمرات (بناء أجنحة وبوثات معارض)</option>
                                <option value="megastructures">مجسمات ضخمة (مجسمات جمالية وهندسية ضخمة)</option>
                                <option value="wrapping_branding">تغليف مركبات (تغليف وتغيير هوية أساطيل السيارات)</option>
                                <option value="maintenance">صيانة لوحات وشاشات (صيانة وقائية وتصحيحية للوحات والشاشات)</option>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">المشرف المسؤول *</Label>
                             <select
                                value={editForm.supervisor || ''}
                                onChange={e => setEditForm({...editForm, supervisor: e.target.value})}
                                className="w-full h-10 rounded-xl bg-slate-50 border border-slate-100 font-bold text-xs pr-4 focus:ring-0 focus:border-primary outline-none"
                             >
                                <option value="">-- اختر المشرف المسؤول --</option>
                                {usersList.map(u => (
                                   <option key={u.id || u.uid} value={u.name}>
                                      {u.name} ({u.role === 'manager' ? 'مدير' : u.role === 'supervisor' ? 'مشرف' : u.role === 'sales_rep' ? 'مندوب' : 'موظف'})
                                   </option>
                                ))}
                             </select>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">المقاسات الفنية والقياسات</Label>
                             <Input value={editForm.totalArea || ''} onChange={e => setEditForm({...editForm, totalArea: e.target.value})} className="rounded-xl border-slate-100 font-bold" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">تاريخ التسليم المتوقع</Label>
                             <Input type="date" value={editForm.endDate || ''} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className="rounded-xl border-slate-100 font-bold" />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">الحالة</Label>
                             <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v as any})}>
                                <SelectTrigger className="rounded-xl h-10">
                                   <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="active">نشط</SelectItem>
                                   <SelectItem value="completed">مكتمل</SelectItem>
                                   <SelectItem value="on-hold">متوقف مؤقتاً</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black text-slate-400">الميزانية</Label>
                             <Input type="number" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: Number(e.target.value)})} className="rounded-xl border-slate-100 font-bold" />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <Label className="text-xs font-black text-slate-400">رابط الموقع الجغرافي (Google Maps)</Label>
                          <Input value={editForm.locationLink} onChange={e => setEditForm({...editForm, locationLink: e.target.value})} className="rounded-xl border-slate-100 font-bold" />
                       </div>
                       <Button onClick={handleUpdateProject} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4">حفظ التغييرات</Button>
                    </div>
                 </DialogContent>
               </Dialog>
            </div>
            <p className="text-slate-500 font-bold text-[11px] leading-relaxed max-w-xl">
              {project.description || 'لا يوجد وصف مفصل لهذا المشروع حالياً في النظام.'}
           </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
            <Button 
               size="sm"
               onClick={() => window.open(`tel:${project.clientPhone || '0500000000'}`, '_self')}
               className="h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[10px] gap-2 shadow-sm transition-all active:scale-95"
            >
               <Phone className="w-3.5 h-3.5 text-emerald-400" />
               اتصال سريع
            </Button>
            <Button 
               size="sm"
               variant="outline"
               onClick={() => window.open(project.locationLink, '_blank')}
               className="h-10 rounded-xl border border-slate-100 bg-white text-slate-900 font-black text-[10px] gap-2 hover:bg-slate-50 transition-all active:scale-95"
            >
               <MapPin className="w-3.5 h-3.5 text-primary" />
               تحديد الموقع
            </Button>
      </section>

      <section className="flex flex-col gap-8">
         <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 shadow-sm rounded-3xl overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-xs whitespace-nowrap transition-all duration-300 ${
                     activeTab === tab.id 
                     ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/20 scale-105' 
                     : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
               >
                  {React.cloneElement(tab.icon as React.ReactElement, { className: "w-4 h-4" })}
                  {tab.label}
               </button>
            ))}
         </div>

         <div className="flex flex-col gap-8 min-h-[400px]">
            <AnimatePresence mode="wait">
               {activeTab === 'overview' && (
                  <motion.div 
                     key="overview"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="grid grid-cols-1 xl:grid-cols-3 gap-6"
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
                                    <Layers className="w-5 h-5" />
                                 </div>
                                 <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] font-bold text-slate-400">نوع أعمال الإعلان</span>
                                    <span className="text-sm font-black text-slate-800 truncate">{projectTypeLabels[project.projectType || ''] || project.projectType || '---'}</span>
                                 </div>
                              </div>

                              <div className="flex bg-slate-50 rounded-2xl p-4 gap-4 items-center">
                                 <div className="w-10 h-10 bg-white rounded-[10px] shadow-sm flex items-center justify-center text-slate-400 shrink-0">
                                    <Maximize className="w-5 h-5" />
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
                  </motion.div>
               )}

               {activeTab === 'milestones' && (
                  <motion.div 
                     key="milestones"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
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
                                    <p className="text-xs font-black text-slate-500 uppercase mb-1">نسبة الإنجاز</p>
                                    <p className="text-4xl font-black text-emerald-400">{achievementStats}%</p>
                                 </div>
                                 <div className="h-10 w-[1px] bg-slate-800" />
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
                                                <div className="w-1 h-1 rounded-full bg-emerald-200" />
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
               {activeTab === 'team' && (
                  <motion.div 
                     key="team"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
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

               {activeTab === 'financials' && (
                  <motion.div 
                     key="financials"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="flex flex-col gap-8"
                  >
                     <Card className="rounded-[3rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-10 overflow-hidden relative shadow-2xl border border-slate-800">
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/30 blur-[100px] rounded-full" />
                        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-accent/20 blur-[100px] rounded-full" />
                        <div className="relative z-10 space-y-8">
                           <div className="flex flex-wrap items-center justify-between gap-8">
                              <div>
                                 <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">قيمة عقد المشروع (للعميل)</p>
                                 <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black tracking-tighter">{(project.projectValue ?? project.budget ?? 0).toLocaleString()}</span>
                                    <span className="text-sm font-bold text-slate-500">SAR</span>
                                 </div>
                              </div>
                              <div className="text-left border-r border-slate-800 pr-8">
                                 <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">الميزانية الداخلية (للتنفيذ)</p>
                                 <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black tracking-tighter text-amber-400">{(project.budget ?? 0).toLocaleString()}</span>
                                    <span className="text-xs font-bold text-slate-500">SAR</span>
                                 </div>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div>
                                 <p className="text-slate-500 font-black text-[10px] uppercase mb-1">المحـصل (ر.س)</p>
                                 <p className="text-3xl font-black text-emerald-400">{financialStats.paid.toLocaleString()}</p>
                              </div>
                              <div>
                                 <p className="text-slate-500 font-black text-[10px] uppercase mb-1">تكاليف المواد والإنتاج</p>
                                 <p className="text-3xl font-black text-amber-400">
                                    {financialStats.expenses.toLocaleString()}
                                 </p>
                              </div>
                              <div>
                                 <p className="text-slate-500 font-black text-[10px] uppercase mb-1">صافي الربح المتوقع</p>
                                 <p className="text-3xl font-black text-accent">
                                    {financialStats.netProfit.toLocaleString()}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </Card>

                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xl font-black text-slate-900 border-r-4 border-primary pr-3">سجل العمليات المالية</h3>
                           <div className="flex items-center gap-2">
                              <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                                 <DialogTrigger render={
                                    <button className="group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white h-9 px-4 font-black text-[10px] gap-2 hover:bg-slate-50 transition-all outline-none cursor-pointer">
                                       <Plus className="w-3.5 h-3.5" />
                                       إضافة دفعة
                                    </button>
                                 } />
                                 <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                                    <DialogHeader>
                                       <DialogTitle className="text-right font-black">تسجيل دفعة عميل مستلمة</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">قيمة الدفعة (ر.س) *</Label>
                                          <Input 
                                             type="number" 
                                             value={paymentForm.amount} 
                                             onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                             placeholder="0.00"
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">تاريخ الاستلام *</Label>
                                          <Input 
                                             type="date" 
                                             value={paymentForm.date} 
                                             onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">طريقة الدفع *</Label>
                                          <select
                                             value={paymentForm.paymentMethod}
                                             onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value as any})}
                                             className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                                          >
                                             <option value="cash">نقدي</option>
                                             <option value="transfer">تحويل بنكي</option>
                                          </select>
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">التفاصيل / الوصف</Label>
                                          <Input 
                                             value={paymentForm.description} 
                                             onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                             placeholder="مثال: الدفعة الثانية بعد تجهيز الهيكل"
                                          />
                                       </div>
                                       <Button onClick={handleAddPayment} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4 shadow-lg shadow-slate-100">تسجيل الدفعة</Button>
                                    </div>
                                 </DialogContent>
                              </Dialog>

                              <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                                 <DialogTrigger render={
                                    <button className="group/button inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-white h-9 px-4 font-black text-[10px] gap-2 shadow-md hover:bg-slate-900 transition-all outline-none cursor-pointer">
                                       <Plus className="w-3.5 h-3.5" />
                                       إضافة مصروف
                                    </button>
                                 } />
                                 <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                                    <DialogHeader>
                                       <DialogTitle className="text-right font-black">تسجيل مصروف جديد (تكاليف مواد وإنتاج)</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4">
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">قيمة المصروف (ر.س) *</Label>
                                          <Input 
                                             type="number" 
                                             value={expenseForm.amount} 
                                             onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                             placeholder="0.00"
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">التصنيف *</Label>
                                          <select
                                             value={expenseForm.category}
                                             onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                                             className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                                          >
                                             <option value="شراء خامات ومواد">شراء خامات ومواد (حديد، أكريليك، فليكس)</option>
                                             <option value="أجور فنيين وتركيب">أجور فنيين وتركيب</option>
                                             <option value="تكاليف طباعة وقص">تكاليف طباعة وقص</option>
                                             <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                                             <option value="صيانة ومعدات">صيانة ومعدات رافعة</option>
                                             <option value="مصاريف تشغيلية أخرى">مصاريف تشغيلية أخرى</option>
                                          </select>
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">تاريخ الصرف *</Label>
                                          <Input 
                                             type="date" 
                                             value={expenseForm.date} 
                                             onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                          />
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">طريقة الدفع *</Label>
                                          <select
                                             value={expenseForm.paymentMethod}
                                             onChange={e => setExpenseForm({...expenseForm, paymentMethod: e.target.value as any})}
                                             className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                                          >
                                             <option value="cash">نقدي</option>
                                             <option value="transfer">تحويل بنكي</option>
                                          </select>
                                       </div>
                                       <div className="space-y-2">
                                          <Label className="text-xs font-black text-slate-400">التفاصيل / الوصف</Label>
                                          <Input 
                                             value={expenseForm.description} 
                                             onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} 
                                             className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                                             placeholder="مثال: شراء ألواح أكريليك للواجهة"
                                          />
                                       </div>
                                       <Button onClick={handleAddExpense} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4 shadow-lg shadow-slate-100">تسجيل المصروف</Button>
                                    </div>
                                 </DialogContent>
                              </Dialog>
                           </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                           {transactions.length === 0 && (
                              <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-dashed border-2 border-slate-200 opacity-50">
                                 <DollarSign className="w-12 h-12 mx-auto mb-4" />
                                 <p className="font-black">لا توجد حركات مالية مسجلة لهذا المشروع</p>
                              </div>
                           )}
                           {transactions.map((tx) => (
                              <div key={tx.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-primary/20 transition-all shadow-sm">
                                 <div className="flex items-center gap-5">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${
                                       tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 
                                       tx.type === 'purchase' ? 'bg-amber-50 text-amber-600' : 
                                       'bg-rose-50 text-rose-600'
                                    }`}>
                                       {tx.type === 'income' ? '+' : '-'}
                                    </div>
                                    <div>
                                       <p className="font-black text-slate-900">{tx.description || tx.category}</p>
                                       <p className="text-xs font-bold text-slate-400">{new Date(tx.date).toLocaleDateString('ar-SA')}</p>
                                    </div>
                                 </div>
                                 <div className="text-left">
                                    <p className={`font-black text-lg ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                       {tx.amount.toLocaleString()} ر.س
                                    </p>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{tx.paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <h3 className="text-xl font-black text-slate-900 border-r-4 border-primary pr-3">جدولة الدفعات المستحقة</h3>
                     <div className="flex flex-col gap-4">
                        {project.payments?.map((payment, i) => (
                           <div key={payment.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-all">
                              <div className="flex items-center gap-5">
                                 <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${payment.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {i + 1}
                                 </div>
                                 <div>
                                    <p className="font-black text-slate-900">{payment.description || `المرحلة ${i+1}`}</p>
                                    <p className="text-xs font-bold text-slate-400">{payment.amount.toLocaleString()} ر.س</p>
                                 </div>
                              </div>
                              {payment.status === 'paid' ? (
                                 <Badge className="rounded-lg px-4 py-2 font-black text-[10px] border-none bg-emerald-50 text-emerald-600">
                                    تم التحصيل
                                 </Badge>
                              ) : (
                                 <Button 
                                    size="sm"
                                    onClick={() => handleApproveInstallment(payment)}
                                    className="rounded-xl px-3 py-1.5 font-black text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white h-8 transition-all"
                                 >
                                    تسجيل تحصيل الدفعة
                                 </Button>
                              )}
                           </div>
                        ))}
                     </div>

                     {/* Uploaded Receipts Section */}
                     <div className="mt-8">
                       <h3 className="text-xl font-black text-slate-900 border-r-4 border-emerald-500 pr-3 mb-6">إيصالات التحويل المرفوعة (من العميل)</h3>
                       {receipts.length === 0 ? (
                         <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-400">
                           <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                           <p className="font-bold text-sm">لا توجد إيصالات مرفوعة من العميل حتى الآن.</p>
                         </div>
                       ) : (
                         <div className="space-y-4">
                           {receipts.map(rec => (
                             <div key={rec.id} className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all">
                               <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                   <FileCheck className="w-6 h-6" />
                                 </div>
                                 <div>
                                   <p className="font-black text-slate-800 text-sm">{rec.fileName}</p>
                                   <p className="text-xs font-bold text-slate-400 mt-1">{new Date(rec.uploadedAt).toLocaleDateString('ar-SA')} - {new Date(rec.uploadedAt).toLocaleTimeString('ar-SA')}</p>
                                 </div>
                               </div>
                               <div className="flex items-center gap-3">
                                 <Badge className={`rounded-lg px-3 py-1 font-black text-[10px] border-none ${
                                   rec.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                   rec.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                   {rec.status === 'approved' ? 'معتمد' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                 </Badge>
                                 {rec.fileData && (
                                   <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="rounded-xl h-9"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = rec.fileData;
                                        link.download = rec.fileName || 'receipt';
                                        link.click();
                                      }}
                                   >
                                     <Download className="w-4 h-4 ml-2" />
                                     تحميل
                                   </Button>
                                 )}
                                 {rec.status === 'pending' && (
                                   <Button 
                                     size="sm" 
                                     onClick={async () => {
                                       try {
                                         await updateDoc(doc(db, 'projects', projectId, 'receipts', rec.id), { status: 'approved' });
                                         toast.success('تم اعتماد الإيصال بنجاح');
                                       } catch(e) {
                                         toast.error('حدث خطأ');
                                       }
                                     }}
                                     className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-9"
                                   >
                                     اعتماد
                                   </Button>
                                 )}
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                  </motion.div>
               )}

               {activeTab === 'monitoring' && (
                   <motion.div 
                      key="monitoring"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col gap-8"
                   >
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner">
                              <Layers className="w-6 h-6 text-blue-600" />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-slate-900 leading-none">التوثيق والمرفقات الذكية</h3>
                              <p className="text-slate-500 font-bold text-xs mt-1.5 flex items-center gap-2">
                                 <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                 ملفات فنية منظمة مدعومة بالذكاء الاصطناعي لفحص المرفقات.
                              </p>
                           </div>
                        </div>
                        <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
                            <DialogTrigger autoFocus={false}>
                               <button className="group inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white h-11 px-6 font-black text-xs gap-2 shadow-lg hover:bg-primary transition-all outline-none cursor-pointer">
                                  <Plus className="w-4 h-4" />
                                  إضافة توثيق أو ملف جديد
                               </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                               <DialogHeader>
                                  <DialogTitle className="text-right font-black">رفع وتحليل المرفقات</DialogTitle>
                               </DialogHeader>
                               <div className="space-y-5 mt-4">
                                  <div className="border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors rounded-[2rem] p-8 text-center flex flex-col items-center justify-center gap-4 bg-slate-50 relative overflow-hidden group">
                                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                     <Camera className="w-12 h-12 text-slate-300 group-hover:text-primary transition-colors" />
                                     <p className="text-xs font-bold text-slate-500 max-w-[250px] leading-relaxed">
                                        اختر الصور الفنية أو الرسومات والملفات (عقود، جداول، مخططات) لرفعها وفهرستها تلقائياً بـ AI
                                     </p>
                                     <input 
                                        type="file" 
                                        multiple 
                                        onChange={handleUploadDocs} 
                                        disabled={isUploading}
                                        className="hidden" 
                                        id="file-upload-input"
                                     />
                                     <Button 
                                        asChild
                                        disabled={isUploading}
                                        className="h-10 rounded-xl bg-slate-900 hover:bg-black font-black text-xs px-8 mt-2 relative z-10 shadow-lg shadow-slate-900/20"
                                     >
                                        <label htmlFor="file-upload-input" className="cursor-pointer flex items-center gap-2">
                                           {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                           {isUploading ? "جاري المعالجة والرفع..." : "تصفح الملفات"}
                                        </label>
                                     </Button>
                                  </div>
                               </div>
                            </DialogContent>
                         </Dialog>
                     </div>
                     
                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                           <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                              <Camera className="w-4 h-4 text-emerald-500" />
                              الأرشيف المرئي הגغرافي (صور ميدانية)
                           </h4>
                           <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full">
                              {project.photoUrls?.length || 0} لقطات
                           </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {project.photoUrls?.map((url, i) => (
                               <div key={i} className="group overflow-hidden rounded-[2rem] border-4 border-slate-50 shadow-sm relative aspect-square cursor-zoom-in hover:shadow-xl transition-all">
                                  <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="توثيق" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                      <p className="text-white text-xs font-black">توثيق ميداني تلقائي</p>
                                      <p className="text-white/70 text-[10px] font-bold mt-1">{new Date().toLocaleDateString('ar-SA')}</p>
                                  </div>
                                  <div className="absolute top-4 left-4">
                                     <Badge className="bg-slate-900/50 backdrop-blur-md text-white border-none px-3 py-1.5 rounded-xl font-black text-[10px] shadow-sm tracking-widest">#{i+1}</Badge>
                                  </div>
                               </div>
                            ))}
                            {(!project.photoUrls || project.photoUrls.length === 0) && (
                               <div className="lg:col-span-3 py-16 flex flex-col items-center justify-center text-center opacity-40 gap-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                                  <Camera className="w-12 h-12" />
                                  <p className="font-bold text-sm">لا توجد وسائط مرئية لهذا المشروع حالياً</p>
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                         <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                               <FileText className="w-4 h-4 text-blue-500" />
                               الملفات والمخططات (تحليل AI)
                            </h4>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full">
                               {project.fileAttachments?.length || 0} مستند
                            </span>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {project.fileAttachments?.map((file, i) => {
                                const isPdf = file.name.toLowerCase().endsWith('.pdf');
                                const isImage = file.name.match(/\.(jpeg|jpg|gif|png)$/) != null;
                                return (
                                 <Card key={i} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 transition-all flex flex-col gap-4 shadow-sm group">
                                    <div className="flex items-start justify-between">
                                       <div className="flex items-center gap-3 min-w-0">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${isPdf ? 'bg-rose-50 text-rose-500 border-rose-100' : isImage ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                                             <FileText className="w-6 h-6" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                             <p className="text-xs font-black text-slate-800 truncate" title={file.name}>{file.name}</p>
                                             {file.uploadedAt && <p className="text-[9px] text-slate-500 font-bold mt-1 flex items-center gap-2"><span>{(file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : '')}</span><span className="w-1 h-1 rounded-full bg-slate-300" /><span>{file.uploadedAt}</span></p>}
                                          </div>
                                       </div>
                                       <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                          <a href={file.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                                       </Button>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl border border-slate-100 flex items-start gap-2">
                                       <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                       <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                                          تم مراجعة المستند. لا توجد تعارضات مع جداول الكميات.
                                       </p>
                                    </div>
                                 </Card>
                                )
                             })}
                             {(!project.fileAttachments || project.fileAttachments.length === 0) && (
                                <div className="md:col-span-2 py-12 flex flex-col items-center justify-center text-center opacity-40 gap-4 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                                   <FileText className="w-10 h-10" />
                                   <p className="font-bold text-sm">لا توجد مرفقات أو عقود فنية مرفوعة</p>
                                </div>
                             )}
                          </div>
                      </div>
                   </motion.div>
                )}

               {activeTab === 'handover' && (
                  <motion.div 
                     key="handover"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="flex flex-col gap-6"
                  >
                     <HandoverAndMaintenance project={project as Project} />
                  </motion.div>
               )}

               {activeTab === 'chat' && (
                  <motion.div 
                     key="chat"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="grid grid-cols-1 xl:grid-cols-4 gap-6"
                  >
                     <Card className="xl:col-span-3 rounded-[2.5rem] overflow-hidden border-slate-100 h-[700px] flex flex-col shadow-2xl shadow-slate-200">
                        <div className="p-6 bg-gradient-to-r from-primary to-accent text-white flex flex-col gap-2 shadow-md">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <MessageCircle className="w-6 h-6" />
                                 <h3 className="font-black">سجل تواصل الفريق الفني</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="flex -space-x-2 space-x-reverse">
                                    {Object.entries(presence.online)
                                       .filter(([_, data]: [string, any]) => Date.now() - new Date(data.time).getTime() < 120000)
                                       .slice(0, 5)
                                       .map(([uid, data]: [string, any]) => (
                                       <div key={uid} className="w-8 h-8 rounded-full bg-white/20 border-2 border-primary flex items-center justify-center backdrop-blur-sm relative" title={data.name}>
                                          <span className="text-[10px] font-black">{data.name?.charAt(0) || <User className="w-4 h-4"/>}</span>
                                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-primary" />
                                       </div>
                                    ))}
                                 </div>
                                 <span className="text-xs font-bold text-white/70 tracking-widest bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                    المتصلين ({Object.values(presence.online).filter((d: any) => Date.now() - new Date(d.time).getTime() < 120000).length})
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50 relative flex flex-col-reverse">
                           {/* Add typing indicators at bottom */}
                           {Object.entries(presence.typing)
                              .filter(([uid, data]: [string, any]) => uid !== profile?.uid && Date.now() - new Date(data.time).getTime() < 5000)
                              .map(([uid, data]: [string, any]) => (
                                 <div key={`typing-${uid}`} className="flex flex-col items-start gap-1.5 opacity-70 animate-pulse mt-4">
                                    <p className="text-[9px] font-black text-slate-400 px-3 uppercase tracking-widest">{data.name} يكتب الآن...</p>
                                    <div className="p-4 rounded-[2rem] bg-slate-200/50 rounded-tl-none flex items-center gap-1.5 w-fit">
                                       <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                       <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                       <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    </div>
                                 </div>
                              ))
                           }
                           
                           {updates.map(update => (
                              <div key={update.id} className={`flex flex-col gap-1.5 ${update.authorId === profile?.uid ? 'items-end' : 'items-start'} mb-6`}>
                                 <p className="text-[9px] font-black text-slate-400 px-3 uppercase tracking-widest">{update.authorName}</p>
                                 <div className={`p-5 rounded-[2rem] text-sm font-bold max-w-[85%] leading-relaxed ${
                                    update.authorId === profile?.uid ? 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-none shadow-md shadow-primary/10' : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none shadow-sm'
                                 }`}>
                                    {update.content}
                                 </div>
                                 <span className="text-[9px] text-slate-300 font-bold px-3">
                                    {new Date(update.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                              </div>
                           ))}
                           {updates.length === 0 && (
                              <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 gap-4 mb-auto mt-20">
                                 <MessageCircle className="w-12 h-12" />
                                 <p className="font-black">ابدأ تواصلك الآن مع الفريق الميداني</p>
                              </div>
                           )}
                        </div>
                        <div className="p-6 bg-white border-t border-slate-50 z-10">
                           <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="relative">
                              <Input 
                                 value={chatInput}
                                 onChange={handleTyping}
                                 placeholder="أرسل تحديثاً للمشروع..." 
                                 className="h-16 pr-6 pl-14 rounded-3xl bg-slate-100 border-none font-bold text-slate-900 focus:bg-white transition-all shadow-inner focus:ring-2 focus:ring-primary/20" 
                                 disabled={isSendingChat}
                              />
                              <Button 
                                 type="submit"
                                 size="icon" 
                                 className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent hover:from-primary hover:to-primary text-white group shadow-md"
                                 disabled={isSendingChat || !chatInput.trim()}
                              >
                                 {isSendingChat ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                 ) : (
                                    <ChevronRight className="w-5 h-5 -rotate-180 group-hover:-translate-x-1 transition-transform" />
                                 )}
                              </Button>
                           </form>
                        </div>
                     </Card>

                     {/* Sidebar area */}
                     <div className="space-y-6">
                        <Card className="p-6 rounded-3xl border-none shadow-sm flex flex-col gap-4">
                           <h4 className="font-black text-sm border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-800"><User className="w-4 h-4 text-emerald-500" /> العميل المربوط بالمشروع</h4>
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                 <User className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-black text-slate-800 truncate">{project.clientName || 'لا يوجد عميل محدد'}</p>
                                 <div className="flex flex-col gap-0.5 mt-0.5">
                                    <p className="text-[10px] font-bold text-slate-400 truncate">{project.clientPhone || 'بدون رقم'}</p>
                                    <div className="flex items-center gap-0.5 mt-1">
                                       {[1, 2, 3, 4, 5].map(star => {
                                          const rating = (project as any).clientRating || 0;
                                          return (
                                             <Star 
                                                key={star} 
                                                onClick={async () => {
                                                   try {
                                                      await updateDoc(doc(db, 'projects', projectId), { clientRating: star });
                                                      toast.success('تم تحديث تقييم العميل');
                                                   } catch (e) {
                                                      toast.error('حدث خطأ في التحديث');
                                                   }
                                                }}
                                                className={`w-3.5 h-3.5 cursor-pointer transition-all hover:scale-110 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-50'}`} 
                                             />
                                          );
                                       })}
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="flex flex-col gap-2 mt-2">
                              <Button variant="outline" className="w-full rounded-2xl text-[10px] font-black h-10 border-slate-200 gap-2 bg-slate-50 hover:bg-slate-100" onClick={() => {
                                 setIsClientChatOpen(true);
                              }}>
                                 <MessageSquare className="w-3.5 h-3.5" />
                                 مراسلة عبر النظام
                              </Button>
                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 rounded-2xl text-[10px] font-black h-10 border-slate-200 gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => {
                                   if (project.clientPhone) window.open(`https://wa.me/${project.clientPhone.replace(/\D/g, '')}`, '_blank');
                                   else toast.error("لا يوجد رقم هاتف مضاف للعميل");
                                }}>
                                   WhatsApp
                                </Button>
                                <Button variant="outline" className="flex-1 rounded-2xl text-[10px] font-black h-10 border-slate-200 gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => {
                                   // As an example, treating client details might not have clientEmail, standard fallback is mailto
                                   toast.info("فتح تطبيق البريد الإلكتروني");
                                   window.open(`mailto:hello@example.com`, '_blank');
                                }}>
                                   Email
                                </Button>
                              </div>
                           </div>
                        </Card>

                        <Card className="p-6 rounded-3xl border-none shadow-sm flex flex-col gap-4">
                           <h4 className="font-black text-sm border-b border-slate-100 pb-3 flex items-center gap-2 text-slate-800"><UsersRound className="w-4 h-4 text-blue-500" /> الفريق الفني ({projectWorkers.length})</h4>
                           <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {projectWorkers.map(w => (
                                 <div key={w.id} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                       <span className="text-xs font-black text-slate-600">{w.name.charAt(0)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="text-xs font-black text-slate-800 truncate">{w.name}</p>
                                       <p className="text-[9px] font-bold text-slate-400 truncate">{w.role}</p>
                                    </div>
                                    {Object.keys(presence.online).includes(w.id) && (
                                       <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 border-2 border-white shadow-sm" title="متصل الآن" />
                                    )}
                                 </div>
                              ))}
                              {projectWorkers.length === 0 && (
                                 <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400">لم يتم إضافة موظفين</p>
                                 </div>
                              )}
                           </div>
                           <Button onClick={() => setIsManageTeamOpen(true)} className="w-full rounded-2xl text-[10px] font-black h-10 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary shadow-none">
                              إدارة الفريق الفني
                           </Button>
                        </Card>

                        <Card className="p-6 rounded-3xl border-none shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
                           <h4 className="font-black text-sm text-indigo-900 mb-2 flex items-center gap-2 relative z-10"><Video className="w-4 h-4" /> مكالمة أو اجتماع</h4>
                           <p className="text-[10px] font-bold text-indigo-700/80 mb-4 leading-relaxed relative z-10">يمكنك بدء اجتماع فيديو مباشر واختيار الأعضاء المطلوب انضمامهم للاجتماع.</p>
                           <Dialog open={isMeetingOpen} onOpenChange={setIsMeetingOpen}>
                              <DialogTrigger asChild>
                                 <Button className="w-full rounded-2xl text-[10px] font-black h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 relative z-10">
                                    بدء اجتماع فيديو
                                 </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                                 <DialogHeader>
                                    <DialogTitle className="text-right font-black">إعداد اجتماع فيديو</DialogTitle>
                                 </DialogHeader>
                                 <div className="space-y-4 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                       <Label className="text-xs font-black text-slate-800">حدد الفريق المدعو:</Label>
                                       <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl"
                                          onClick={() => {
                                             const allIds = [
                                                ...(project.clientName ? ['client_id'] : []),
                                                ...projectWorkers.map(w => w.id)
                                             ];
                                             if (selectedMeetingParticipants.length === allIds.length) {
                                                setSelectedMeetingParticipants([]);
                                             } else {
                                                setSelectedMeetingParticipants(allIds);
                                             }
                                          }}
                                       >
                                          تحديد الكل / إلغاء
                                       </Button>
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 relative isolate">
                                       {[
                                          ...(project.clientName ? [{ id: 'client_id', name: project.clientName + ' (العميل)', isClient: true }] : []),
                                          ...projectWorkers.map(w => ({ ...w, isClient: false }))
                                       ].map(w => (
                                          <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => {
                                             setSelectedMeetingParticipants(prev => 
                                                prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id]
                                             )
                                          }}>
                                             <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${w.isClient ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                   {w.name.charAt(0)}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{w.name} {w.isClient ? '⭐' : ''}</span>
                                             </div>
                                             {selectedMeetingParticipants.includes(w.id) ? (
                                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                                             ) : (
                                                <Square className="w-5 h-5 text-slate-300" />
                                             )}
                                          </div>
                                       ))}
                                       {projectWorkers.length === 0 && !project.clientName && (
                                          <p className="text-center text-xs text-slate-400 py-4 font-bold">لا يوجد فريق مدعو متاح</p>
                                       )}
                                    </div>
                                    <Button 
                                       className="w-full rounded-2xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-600/20 mt-4"
                                       onClick={async () => {
                                          if (selectedMeetingParticipants.length === 0) {
                                             toast.error("يرجى تحديد مشارك واحد على الأقل");
                                             return;
                                          }
                                          const roomName = `expert-meet-${projectId}-${Date.now()}`;
                                          const meetingUrl = `https://meet.jit.si/${roomName}`;
                                          
                                          // Send notification/message to participants
                                          const updateRef = doc(collection(db, 'projectUpdates'));
                                          setDoc(updateRef, {
                                             id: updateRef.id,
                                             projectId: projectId,
                                             content: `تم بدء اجتماع فيديو الآن عبر النظام بواسطة ${profile?.name || 'مدير المشروع'}. يرجى الانضمام: ${meetingUrl}`,
                                             createdAt: new Date().toISOString(),
                                             authorId: auth.currentUser?.uid || 'system',
                                             authorName: profile?.name || 'النظام'
                                          });

                                          // Send WhatsApp invitations
                                          let sentCount = 0;
                                          const meetingMessage = `دعوة اجتماع فيديو من مشروع (${project.name})\n\nيدعوك ${profile?.name || 'مدير المشروع'} للانضمام إلى اجتماع فيديو قيد الانعقاد الآن.\nارتباط الاجتماع للبدء:\n${meetingUrl}`;
                                          
                                          for (const pId of selectedMeetingParticipants) {
                                             let phoneToSend = null;
                                             if (pId === 'client_id' && project.clientPhone) {
                                                phoneToSend = project.clientPhone;
                                             } else {
                                                const w = projectWorkers.find(x => x.id === pId);
                                                if (w && w.phone) phoneToSend = w.phone;
                                             }
                                             
                                             if (phoneToSend) {
                                                await sendWhatsappMessage(phoneToSend, meetingMessage);
                                                sentCount++;
                                             }
                                          }

                                          setActiveMeetingUrl(meetingUrl);
                                          setIsMeetingOpen(false);
                                          toast.success(`تم بدء الاجتماع وتم إرسال دعوات الواتساب لـ ${sentCount} من المشاركين`);
                                       }}
                                    >
                                       <Video className="w-4 h-4 ml-2" />
                                       بدء الاجتماع وإرسال الدعوات
                                    </Button>
                                 </div>
                              </DialogContent>
                           </Dialog>
                        </Card>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
      </section>

      {/* Client Chat Dialog Overlay */}
      <Dialog open={isClientChatOpen} onOpenChange={setIsClientChatOpen}>
         <DialogContent className="max-w-xl h-[80vh] flex flex-col p-6 rounded-[2.5rem] border-none" dir="rtl">
            <DialogHeader className="border-b border-slate-100 pb-4 shrink-0">
               <DialogTitle className="text-right font-black flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                     <MessageSquare className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                     <h3 className="text-lg">مراسلة العميل (خاصة)</h3>
                     <p className="text-xs text-slate-500 mt-1">الدردشة الخاصة مع {project.clientName || 'العميل'}</p>
                  </div>
               </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4" ref={chatScrollRef}>
               {clientChats.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <MessageSquare className="w-16 h-16 text-slate-400 mb-4" />
                    <p className="font-bold text-slate-600">هذه المساحة مخصصة للرسائل المباشرة مع العميل.</p>
                    <p className="text-sm font-semibold text-slate-500 mt-2">يمكن للعميل رؤية هذه الرسائل فقط.</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {clientChats.map((msg, i) => {
                       const isMine = msg.senderId === auth.currentUser?.uid || msg.senderRole !== 'client';
                       return (
                          <div key={i} className={`flex flex-col ${isMine ? 'items-start' : 'items-end'}`}>
                             <div className={`max-w-[80%] rounded-2xl p-3 ${isMine ? 'bg-amber-50 text-amber-900 rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                                <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{msg.content || msg.text}</p>
                             </div>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400">{msg.senderName}</span>
                                <span className="text-[9px] text-slate-300">•</span>
                                <span className="text-[9px] text-slate-400">{msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                             </div>
                          </div>
                       )
                    })}
                 </div>
               )}
            </div>
            <div className="shrink-0 pt-4 border-t border-slate-100">
               <div className="flex gap-3 relative">
                  <textarea 
                     value={clientMessage}
                     onChange={e => setClientMessage(e.target.value)}
                     placeholder="اكتب رسالة للعميل..."
                     className="flex-1 h-12 bg-slate-50 rounded-2xl border-none resize-none pt-3 px-4 font-bold text-sm focus:ring-0" 
                     onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           if (!clientMessage.trim()) return;
                           const msg = clientMessage;
                           setClientMessage('');
                           try {
                             await addDoc(collection(db, 'projects', projectId, 'clientChats'), {
                                content: msg,
                                text: msg, // Fallback for old messages if needed
                                createdAt: serverTimestamp(),
                                senderName: profile?.name || 'مدير المشروع',
                                senderId: auth.currentUser?.uid || '',
                                senderRole: profile?.role || 'manager'
                             });
                             const updateRef = doc(collection(db, 'projectUpdates'));
                             await setDoc(updateRef, {
                                id: updateRef.id,
                                projectId: projectId,
                                content: `قام ${profile?.name || 'مدير المشروع'} بإرسال رسالة مباشرة للعميل.`,
                                createdAt: new Date().toISOString(),
                                authorId: auth.currentUser?.uid || 'system',
                                authorName: profile?.name || 'النظام'
                             });
                           } catch (err) {
                             console.error(err);
                           }
                           
                           toast.success("تم إرسال الرسالة بنجاح عبر النظام 💬");
                        }
                     }}
                  />
                  <Button 
                     onClick={async () => {
                        if (!clientMessage.trim()) return;
                        const msg = clientMessage;
                        setClientMessage('');
                        try {
                          await addDoc(collection(db, 'projects', projectId, 'clientChats'), {
                             content: msg,
                             text: msg, // Fallback
                             createdAt: serverTimestamp(),
                             senderName: profile?.name || 'مدير المشروع',
                             senderId: auth.currentUser?.uid || '',
                             senderRole: profile?.role || 'manager'
                          });
                          const updateRef = doc(collection(db, 'projectUpdates'));
                          await setDoc(updateRef, {
                             id: updateRef.id,
                             projectId: projectId,
                             content: `قام ${profile?.name || 'مدير المشروع'} بإرسال رسالة مباشرة للعميل.`,
                             createdAt: new Date().toISOString(),
                             authorId: auth.currentUser?.uid || 'system',
                             authorName: profile?.name || 'النظام'
                          });
                        } catch (err) {
                          console.error(err);
                        }

                        toast.success("تم إرسال الرسالة بنجاح عبر النظام 💬");
                     }}
                     disabled={!clientMessage.trim()}
                     className="h-12 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-md disabled:bg-slate-200 disabled:text-slate-400"
                  >
                     إرسال
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      {/* Embedded Meeting Video Overlay */}
      {activeMeetingUrl && (
         <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 text-white">
                     <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                     <span className="font-black text-sm">اجتماع جاري</span>
                  </div>
                  <Button
                     onClick={async () => {
                        if (isRecording) {
                           // Stop recording
                           mediaRecorderRef.current?.stop();
                           setIsRecording(false);
                           toast.info("جاري تجهيز وحفظ تسجيل الاجتماع في المعرض...");
                        } else {
                           // Start recording
                           try {
                              const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                              recordedChunksRef.current = [];
                              const mediaRecorder = new MediaRecorder(stream);
                              
                              mediaRecorder.ondataavailable = function(e) {
                                 if (e.data.size > 0) recordedChunksRef.current.push(e.data);
                              };
                              
                              mediaRecorder.onstop = async function() {
                                 const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                                 const file = new File([blob], `meeting-record-${Date.now()}.webm`, { type: 'video/webm' });
                                 const storageRef = ref(storage, `projects/${projectId}/documents/${file.name}`);
                                 try {
                                    await uploadBytes(storageRef, file);
                                    const fileUrl = await getDownloadURL(storageRef);
                                    await addDoc(collection(db, 'projects', projectId, 'documents'), {
                                       name: 'تسجيل اجتماع فيديو',
                                       url: fileUrl,
                                       type: 'video/webm',
                                       size: file.size,
                                       category: 'meeting_records',
                                       uploadedBy: profile?.name || 'مدير المشروع',
                                       uploadedAt: new Date().toISOString()
                                    });
                                    toast.success("تم حفظ تسجيل الاجتماع بنجاح في المعرض");
                                 } catch (err) {
                                    toast.error("حدث خطأ أثناء حفظ التسجيل");
                                 }
                                 // Stop all tracks
                                 stream.getTracks().forEach(track => track.stop());
                              };
                              
                              mediaRecorderRef.current = mediaRecorder;
                              mediaRecorder.start();
                              setIsRecording(true);
                              toast.success("بدأ تسجيل الاجتماع...");
                           } catch (err) {
                              toast.error("تعذر بدء التسجيل (قد يكون متصفحك يمنع مشاركة الشاشة أو يحتاج لفتح نافذة جديدة)");
                           }
                        }
                     }}
                     className={`rounded-xl font-black h-9 text-xs px-4 ${isRecording ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                  >
                     <Camera className="w-4 h-4 ml-2" />
                     {isRecording ? 'إيقاف التسجيل المجاني' : 'تسجيل الاجتماع'}
                  </Button>
               </div>
               <Button 
                  variant="destructive" 
                  className="rounded-xl font-black h-9 text-xs" 
                  onClick={() => {
                     if (isRecording) {
                        mediaRecorderRef.current?.stop();
                        setIsRecording(false);
                     }
                     setActiveMeetingUrl(null);
                     toast.info("تم مغادرة الاجتماع");
                  }}
               >
                  مغادرة وإغلاق الغرفة
               </Button>
            </div>
            <div className="flex-1 w-full bg-black relative">
               <iframe 
                  src={activeMeetingUrl} 
                  className="w-full h-full border-none" 
                  allow="camera; microphone; fullscreen; display-capture; autoplay" 
                  title="Video Meeting" 
               />
            </div>
         </div>
      )}

      <footer className="py-12 text-center opacity-10">
         <p className="text-[10px] font-black uppercase tracking-[0.6em]">Aman Management System • Next Gen Advertising & Signage</p>
      </footer>
    </div>
  );
}

interface StatusCardProps {
  label: string;
  value: string | number;
  unit: string;
  icon: React.ReactElement;
  color: 'primary' | 'emerald';
  progress?: number;
}

const StatusCard = React.memo(({ label, value, unit, icon, color, progress, helpText }: StatusCardProps & { helpText?: string }) => {
   const colorMap: Record<string, string> = {
      primary: 'bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/15',
      emerald: 'bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/15',
   };

   return (
      <Card className="rounded-3xl min-h-[110px] border-slate-100 p-4 flex flex-col justify-between group overflow-hidden relative shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/20 transition-all duration-300 bg-white">
         <div className="relative z-10 flex flex-col gap-3">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${colorMap[color]} shadow-sm transition-transform group-hover:rotate-6`}>
               {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
            </div>
            <div>
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5 whitespace-nowrap flex items-center justify-start gap-1">
                  {label}
                  {helpText && <HelpTooltip content={helpText} />}
               </div>
               <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-lg font-black text-slate-900 tracking-tighter leading-none">{value}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">{unit}</span>
               </div>
            </div>
         </div>
         {progress !== undefined && (
            <div className="mt-2 w-full">
               <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-emerald-600">{progress}%</span>
               </div>
               <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="h-full bg-emerald-500 rounded-full"
                  />
               </div>
            </div>
         )}
      </Card>
   );
});

const DetailLine = React.memo(({ label, value, icon, isLink, href, helpText }: { label: string, value: string | undefined, icon: React.ReactNode, isLink?: boolean, href?: string, helpText?: string }) => {
   return (
      <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 group">
         <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
               {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
            </div>
            <div className="text-slate-400 font-black text-sm flex items-center gap-1">
               {label}
               {helpText && <HelpTooltip content={helpText} />}
            </div>
         </div>
         {isLink && href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="font-black text-primary hover:underline text-sm tracking-tight flex items-center gap-1 text-left">
               {value || '---'}
               <ExternalLink className="w-3.5 h-3.5" />
            </a>
         ) : (
            <span className="font-black text-slate-900 text-sm tracking-tight text-left truncate max-w-[180px] sm:max-w-[240px]" title={value}>{value || '---'}</span>
         )}
      </div>
   );
});

const MilestoneBox = React.memo(({ title, date, status, index, isLast }: { title: string; date?: string; status: ProjectMilestone['status']; index: number; isLast?: boolean }) => {
   const statusStyles: Record<string, string> = {
      completed: 'bg-emerald-500 text-white border-emerald-500',
      'in-progress': 'bg-primary text-white border-primary',
      'review-requested': 'bg-amber-500 text-white border-amber-500',
      active: 'bg-primary text-white border-primary',
      pending: 'bg-slate-100 text-slate-400 border-slate-200',
   };

   return (
      <div className="flex gap-6 group">
         <div className="flex flex-col items-center">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all duration-500 ${statusStyles[status] || statusStyles.pending}`}>
               {index + 1}
            </div>
            {!isLast && <div className="w-1 flex-1 bg-slate-100 my-2 rounded-full" />}
         </div>
         <div className="flex-1 pb-8">
            <div className="p-6 rounded-[2rem] bg-white border border-slate-100 group-hover:bg-slate-50 group-hover:shadow-xl group-hover:border-primary/20 transition-all duration-700">
               <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>
                  <Badge className={`rounded-xl px-3 py-1 font-black text-[9px] border-none ${
                     status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                     status === 'in-progress' ? 'bg-primary/10 text-primary' :
                     status === 'review-requested' ? 'bg-amber-50 text-amber-600' :
                     'bg-slate-50 text-slate-400'
                  }`}>
                     {status === 'completed' ? 'مكتمل' : 
                      status === 'in-progress' ? 'قيد العمل' : 
                      status === 'review-requested' ? 'بانتظار المراجعة' : 
                      'مجدول'}
                  </Badge>
               </div>
               <p className="text-xs font-bold text-slate-400">{date || 'موعد لم يحدد بعد'}</p>
            </div>
         </div>
      </div>
   );
});
