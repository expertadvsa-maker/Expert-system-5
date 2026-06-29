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
  ArrowRight, 
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
  Calendar,
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
  Lock,
  Receipt,
  X,
  FileCheck,
  Download,
  ClipboardList
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
  deleteField,
  getDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { sendWhatsappMessage } from '../lib/whatsapp';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { Project, UserProfile as Worker, ProjectUpdate, Transaction, ProjectMilestone, Quotation } from '../types';
import { calculateProjectProgress } from '../lib/projectUtils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import AIQuotationBuilder from './AIQuotationBuilder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import ProjectOverviewTab from './ProjectView/ProjectOverviewTab';
import ProjectFinancialsTab from './ProjectView/ProjectFinancialsTab';
import ProjectTeamTab from './ProjectView/ProjectTeamTab';
import ProjectFilesTab from './ProjectView/ProjectFilesTab';
import DynamicMaterialsForm from './ProjectWizard/DynamicMaterialsForm';

export default function ProjectViewV2({ projectId, onBack }: ProjectViewV2Props) {
  const { profile, activeCompanyId } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [usersList, setUsersList] = useState<Worker[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clientChats, setClientChats] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);

  // ── Quotations & Invoices ──
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Quotation[]>([]);
  const [showDocBuilder, setShowDocBuilder] = useState<'quotation' | 'invoice' | null>(null);

  // ── GPS Tracking & Attendance ──
  const [projectAttendance, setProjectAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (!project?.title || !projectId) return;
    
    // Listen to attendance by projectId
    const q1 = query(collection(db, 'attendance'), where('projectId', '==', projectId));
    const unsub1 = onSnapshot(q1, (snap1) => {
      const docs1: any[] = snap1.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Also fetch by locationName for old records
      getDocs(query(collection(db, 'attendance'), where('locationName', '==', `مشروع: ${project.title}`)))
        .then(snap2 => {
          const docs2: any[] = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
          // Merge unique records
          const merged = [...docs1];
          docs2.forEach(d2 => {
            if (!merged.find(m => m.id === d2.id)) merged.push(d2);
          });
          
          // Sort by date/checkIn descending
          merged.sort((a, b) => {
            const timeA = a.checkIn ? new Date(a.checkIn).getTime() : new Date(a.date).getTime();
            const timeB = b.checkIn ? new Date(b.checkIn).getTime() : new Date(b.date).getTime();
            return timeB - timeA;
          });
          
          setProjectAttendance(merged);
        }).catch(err => console.error("Error fetching old attendance:", err));
    });

    return () => unsub1();
  }, [project?.title, projectId]);

  useEffect(() => {
    if (!projectId) return;

    const qQuotes = query(collection(db, 'quotations'), where('projectId', '==', projectId));
    const unsubQ = onSnapshot(qQuotes, snap => {
      setQuotations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quotation)));
    });

    const qInvoices = query(collection(db, 'invoices'), where('projectId', '==', projectId));
    const unsubI = onSnapshot(qInvoices, snap => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quotation)));
    });

    return () => { unsubQ(); unsubI(); };
  }, [projectId]);
  const chatScrollRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState<'milestones' | 'team_list'>('milestones');

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
  
  // Deletion States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
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
        companyId: activeCompanyId || null,
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
        companyId: activeCompanyId || null,
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
        companyId: activeCompanyId || null,
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
        companyId: activeCompanyId || null,
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
        companyId: activeCompanyId || null,
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
      const filesArray = Array.from(e.target.files) as File[];
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
      async (snapshot) => {
        try {
          const leavesSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'approved')));
          const today = new Date().toISOString().split('T')[0];
          const activeLeavesUserIds = new Set(
            leavesSnap.docs
              .map(d => d.data())
              .filter(l => l.startDate <= today && l.endDate >= today)
              .map(l => l.userId)
          );

          setUsersList(snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Worker))
            .filter(user => !activeLeavesUserIds.has(user.id) && !activeLeavesUserIds.has(user.uid))
          );
        } catch (err) {
          console.error("Failed to load users in ProjectView", err);
        }
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
      .filter(u => {
        const role = u.role?.toLowerCase() || '';
        const dept = (u.department || u.dept || '').trim();
        
        // Strictly exclude administrative and sales representatives
        if (['manager', 'admin', 'sales_rep'].includes(role)) {
          return false;
        }
        if (['المالية', 'الإدارة', 'الرئيسي'].includes(dept)) {
          return false;
        }
        
        // Only allow technicians, supervisors, or general employees who are in production/design
        return (
          role === 'worker' ||
          role === 'supervisor' ||
          dept === 'الإنتاج' ||
          dept === 'التصميم' ||
          role === 'employee'
        );
      })
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

  // Calculate GPS Tracking stats
  const gpsStats = useMemo(() => {
    if (!projectAttendance || projectAttendance.length === 0) return { totalDays: 0, totalHours: 0, uniqueWorkers: 0, workersList: [] };
    
    const uniqueDays = new Set<string>();
    const uniqueWorkersMap = new Map<string, any>();
    let totalMinutes = 0;

    projectAttendance.forEach(att => {
      // Collect unique days
      if (att.date) uniqueDays.add(att.date);
      
      // Collect unique workers and their hours
      if (att.userId) {
        if (!uniqueWorkersMap.has(att.userId)) {
          uniqueWorkersMap.set(att.userId, {
            id: att.userId,
            name: att.userName || 'غير معروف',
            totalHours: 0,
            days: new Set<string>(),
          });
        }
        const workerStats = uniqueWorkersMap.get(att.userId);
        if (att.date) workerStats.days.add(att.date);
        
        // Calculate hours if checkIn and checkOut exist
        if (att.checkIn && att.checkOut) {
          const inTime = new Date(att.checkIn).getTime();
          const outTime = new Date(att.checkOut).getTime();
          const diffMins = Math.max(0, (outTime - inTime) / (1000 * 60));
          totalMinutes += diffMins;
          workerStats.totalHours += diffMins / 60;
        }
      }
    });

    const workersList = Array.from(uniqueWorkersMap.values()).map(w => ({
      ...w,
      daysCount: w.days.size,
      totalHours: Math.round(w.totalHours * 10) / 10
    })).sort((a, b) => b.totalHours - a.totalHours);

    return {
      totalDays: uniqueDays.size,
      totalHours: Math.round(totalMinutes / 60),
      uniqueWorkers: uniqueWorkersMap.size,
      workersList
    };
  }, [projectAttendance]);

  const handleDeleteProject = async (action: 'soft' | 'hard') => {
    if (!project) return;
    if (action === 'hard' && deleteConfirmationName !== project.title) {
       toast.error("اسم المشروع غير مطابق للتأكيد");
       return;
    }
    
    setIsDeleting(true);
    try {
       if (action === 'hard') {
         await deleteDoc(doc(db, 'projects', projectId));
         toast.success("تم الحذف النهائي للمشروع بنجاح");
         onBack();
       } else {
         await updateDoc(doc(db, 'projects', projectId), {
           status: 'cancelled',
           workerIds: [], // Release all workers
           projectStatus: 'تم الإلغاء والأرشفة',
           updatedAt: serverTimestamp()
         });
         toast.success("تم الحذف الآمن وإلغاء المشروع وإضافته للأرشيف وتسريح العمالة");
         onBack();
       }
    } catch(err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`, auth);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleUpdateProject = async () => {
    try {
      let updatedCoords = editForm.locationCoords;
      if (editForm.locationLink) {
        const atMatch = editForm.locationLink.match(/(?:@|%40)(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
        const qMatch = editForm.locationLink.match(/q=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
        const directMatch = editForm.locationLink.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        
        if (atMatch) {
          updatedCoords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        } else if (qMatch) {
          updatedCoords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        } else if (directMatch) {
          updatedCoords = { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
        }
      }

      await updateDoc(doc(db, 'projects', projectId), {
        ...editForm,
        locationCoords: updatedCoords,
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
    { id: 'materials', label: 'المواد والمشتريات', icon: <ClipboardList /> },
    { id: 'team', label: 'الفريق الفني', icon: <Users /> },
    { id: 'financials', label: 'الحسابات', icon: <DollarSign /> },
    { id: 'monitoring', label: 'التوثيق', icon: <Camera /> },
    { id: 'chat', label: 'تواصل', icon: <MessageCircle /> },
    { id: 'handover', label: 'التسليم والصيانة', icon: <ShieldCheck /> },
  ];

  return (
    <div className="w-full px-4 py-4 flex flex-col gap-6" dir="rtl">
      
      <section className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
           <div className="flex items-start gap-4">
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack} 
              className="rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 h-12 w-12 shrink-0 transition-all active:scale-95"
             >
                <ArrowRight className="w-5 h-5 text-slate-900" />
             </Button>
             
             <div className="flex flex-col gap-2 mt-1">
                <div className="flex flex-wrap items-center gap-2">
                   <div className={`h-2 w-2 rounded-full ${
                      project.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 
                      project.status === 'planning' ? 'bg-indigo-500 animate-pulse' :
                      project.status === 'handover_pending' ? 'bg-amber-500 animate-pulse' :
                      project.status === 'maintenance' ? 'bg-blue-500' :
                      'bg-slate-400'
                   }`} />
                   <span className="text-[10px] font-black text-slate-500 tracking-wider">
                      {project.status === 'active' ? 'قيد التنفيذ والمتابعة' : 
                       project.status === 'planning' ? 'تخطيط وتسعير' :
                       project.status === 'handover_pending' ? 'بانتظار توقيع العميل' :
                       project.status === 'maintenance' ? 'صيانة وضمان' :
                       project.status === 'completed' ? 'مشروع منتهي' :
                       'متوقف مؤقتاً'}
                   </span>
                   <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] px-2.5 py-0.5 rounded-lg uppercase tracking-widest">
                      ID: {project.id?.slice(-6) || '---'}
                   </Badge>
                </div>
                
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                   {project.title}
                </h1>
                
                <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-2xl mt-1">
                   {project.description || 'لا يوجد وصف مفصل لهذا المشروع حالياً في النظام.'}
                </p>
             </div>
           </div>

           <div className="flex items-center gap-3">
              {project.status === 'planning' && (profile?.role === 'manager' || profile?.role === 'owner') && (
                 <button 
                    onClick={async () => {
                       try {
                          await updateDoc(doc(db, 'projects', project.id), { status: 'active' });
                          toast.success('تم تحويل المشروع إلى قيد التنفيذ وبدء العمل!');
                       } catch(err) {
                          toast.error('حدث خطأ أثناء تفعيل المشروع');
                       }
                    }}
                    className="group/button shrink-0 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white h-12 px-5 font-black text-xs gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all outline-none cursor-pointer active:scale-95"
                 >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد وبدء التنفيذ</span>
                 </button>
              )}



            <Dialog open={isEditOpen} onOpenChange={(open) => {
              if (open && profile?.role !== 'manager' && profile?.role !== 'owner') {
                 toast.error("صلاحيات الإدارة محصورة على المالك والمدير فقط لمنع التلاعب.");
                 return;
              }
              setIsEditOpen(open);
           }}>
              <DialogTrigger asChild>
                 <button className="group/button shrink-0 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white h-12 px-5 font-black text-xs gap-2 hover:bg-slate-50 transition-all outline-none cursor-pointer self-start shadow-sm active:scale-95">
                    <Settings2 className="w-4 h-4 text-slate-700" />
                    <span className="text-slate-700">إدارة المشروع</span>
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
        </div>
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
                  <ProjectOverviewTab
                     project={project}
                     profile={profile}
                     achievementStats={achievementStats}
                     projectAttendance={projectAttendance}
                     gpsStats={gpsStats}
                     projectTypeLabels={projectTypeLabels}
                     isDeleteDialogOpen={isDeleteDialogOpen}
                     setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                     isDeleting={isDeleting}
                     deleteConfirmationName={deleteConfirmationName}
                     setDeleteConfirmationName={setDeleteConfirmationName}
                     handleDeleteProject={handleDeleteProject}
                      setActiveTab={setActiveTab}
                   />
                )}

                {activeTab === 'materials' && (
                   <motion.div 
                      key="materials"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                   >
                      <DynamicMaterialsForm
                         projectId={projectId}
                         projectType={project.type || 'سياج مخصص'}
                         projectTitle={project.title}
                      />
                   </motion.div>
                )}

               {activeTab === 'milestones' && (
                  <ProjectTeamTab
                     project={project}
                     projectId={projectId}
                     projectWorkers={projectWorkers}
                     teamCandidates={teamCandidates}
                     transactions={transactions}
                     isAddingStage={isAddingStage}
                     setIsAddingStage={setIsAddingStage}
                     newStage={newStage}
                     setNewStage={setNewStage}
                     handleAddStage={handleAddStage}
                     handleDeleteStage={handleDeleteStage}
                     handleToggleMilestone={handleToggleMilestone}
                     isManageTeamOpen={isManageTeamOpen}
                     setIsManageTeamOpen={setIsManageTeamOpen}
                     handleToggleWorker={handleToggleWorker}
                     setActiveTab={setActiveTab}
                     activeSubTab={activeSubTab}
                     setActiveSubTab={setActiveSubTab}
                      activeTab={activeTab}
                   />
               )}
               {activeTab === 'team' && (
                  <ProjectTeamTab
                     project={project}
                     projectId={projectId}
                     projectWorkers={projectWorkers}
                     teamCandidates={teamCandidates}
                     transactions={transactions}
                     isAddingStage={isAddingStage}
                     setIsAddingStage={setIsAddingStage}
                     newStage={newStage}
                     setNewStage={setNewStage}
                     handleAddStage={handleAddStage}
                     handleDeleteStage={handleDeleteStage}
                     handleToggleMilestone={handleToggleMilestone}
                     isManageTeamOpen={isManageTeamOpen}
                     setIsManageTeamOpen={setIsManageTeamOpen}
                     handleToggleWorker={handleToggleWorker}
                     setActiveTab={setActiveTab}
                     activeSubTab={activeSubTab}
                     setActiveSubTab={setActiveSubTab}
                      activeTab={activeTab}
                   />
               )}

               {activeTab === 'financials' && (
                  <ProjectFinancialsTab
                     project={project}
                     projectId={projectId}
                     db={db}
                     financialStats={financialStats}
                     transactions={transactions}
                     isAddPaymentOpen={isAddPaymentOpen}
                     setIsAddPaymentOpen={setIsAddPaymentOpen}
                     paymentForm={paymentForm}
                     setPaymentForm={setPaymentForm}
                     handleAddPayment={handleAddPayment}
                     isAddExpenseOpen={isAddExpenseOpen}
                     setIsAddExpenseOpen={setIsAddExpenseOpen}
                     expenseForm={expenseForm}
                     setExpenseForm={setExpenseForm}
                     handleAddExpense={handleAddExpense}
                     handleApproveInstallment={handleApproveInstallment}
                     receipts={receipts}
                     quotations={quotations}
                     invoices={invoices}
                     setShowDocBuilder={setShowDocBuilder}
                  />
               )}

               {activeTab === 'monitoring' && (
                  <ProjectFilesTab
                     project={project}
                     isUploadDocOpen={isUploadDocOpen}
                     setIsUploadDocOpen={setIsUploadDocOpen}
                     isUploading={isUploading}
                     handleUploadDocs={handleUploadDocs}
                  />
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
        companyId: activeCompanyId || null,
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
        companyId: activeCompanyId || null,
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

      {/* ── Document Builder Dialog ── */}
      <Dialog open={!!showDocBuilder} onOpenChange={(open) => !open && setShowDocBuilder(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10 sticky top-0">
            <div>
               <h2 className="text-xl font-black text-slate-800">
                 {showDocBuilder === 'quotation' ? 'إصدار عرض سعر ذكي' : 'إصدار فاتورة ذكية'}
               </h2>
               <p className="text-xs font-bold text-slate-500 mt-1">تعبئة ذكية باستخدام الذكاء الاصطناعي</p>
            </div>
            <div className="flex gap-2">
               <Button onClick={() => setShowDocBuilder(null)} variant="ghost" className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 p-0">
                  <X className="w-5 h-5" />
               </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50">
            {showDocBuilder && (
              <AIQuotationBuilder 
                type={showDocBuilder} 
                initialProjectId={project.id} 
                initialProjectName={project.title} 
                initialProjectDesc={project.description} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
