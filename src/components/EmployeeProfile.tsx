import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Briefcase, 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  Star,
  Activity,
  History,
  FileText,
  CreditCard,
  Target,
  Award,
  Zap,
  Loader2,
  Trash2,
  AlertTriangle,
  MapPin,
  Plus,
  Minus,
  Plane,
  Fingerprint,
  Download,
  Image as ImageIcon,
  PenLine,
  Wallet,
  MessageSquare
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where, 
  orderBy, 
  doc, 
  getDoc,
  limit,
  addDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { sendNotification } from '@/lib/notifications';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCompanyQuery, addCompanyDoc } from '../lib/firestoreUtils';
import { useAuth } from '../lib/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import SmartAttendance from './SmartAttendance';

const getRoleArabic = (role?: string) => {
  if (!role) return 'غير محدد';
  const r = role.toLowerCase().trim();
  if (r === 'manager') return 'مدير عام';
  if (r === 'owner') return 'مالك المؤسسة';
  if (r === 'supervisor') return 'مشرف ميداني';
  if (r === 'employee') return 'موظف إداري';
  if (r === 'sales_rep') return 'مندوب مبيعات';
  if (r === 'worker') return 'عامل مهني';
  return role;
};

interface EmployeeProfileProps {
  employeeId: string;
  onBack: () => void;
}

export default function EmployeeProfile({ employeeId, onBack }: EmployeeProfileProps) {
  const { profile, activeCompanyId } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [justifications, setJustifications] = useState<any[]>([]);
  const [assignedLocations, setAssignedLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog States
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isSpecialRequestDialogOpen, setIsSpecialRequestDialogOpen] = useState(false);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isJustificationDialogOpen, setIsJustificationDialogOpen] = useState(false);
  
  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [noteContent, setNoteContent] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [specialRequestContent, setSpecialRequestContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States

  const [leaveForm, setLeaveForm] = useState({ type: 'annual', startDate: '', endDate: '', reason: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ type: 'deduction', amount: '', reason: '' });
  const [loanForm, setLoanForm] = useState({ amount: '', reason: '' });
  const [goalForm, setGoalForm] = useState({ title: '', progress: 0, color: 'bg-blue-500' });
  const [performanceForm, setPerformanceForm] = useState({ score: 90, month: new Date().toISOString().substring(0, 7) });
  const [warningForm, setWarningForm] = useState({ reason: '', type: 'لفت نظر' });
  const [justificationForm, setJustificationForm] = useState({ reason: '', date: '' });

  // Listen to messages for direct internal chat
  useEffect(() => {
    if (!isChatOpen || !profile?.uid || !employeeId) return;

    let unsubscribe: () => void = () => {};

    if (profile.uid === employeeId) {
      // The employee themselves is viewing their profile and chatting.
      // They should see all messages where they are either sender or receiver.
      const qSent = query(
        collection(db, 'internal_chats'),
        where('senderId', '==', profile.uid)
      );
      const qReceived = query(
        collection(db, 'internal_chats'),
        where('receiverId', '==', profile.uid)
      );

      const unsubSent = onSnapshot(qSent, (snapSent) => {
        const sentMsgs = snapSent.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChatMessages(prev => {
          const others = prev.filter(m => m.senderId !== profile.uid);
          const merged = [...others, ...sentMsgs];
          // Remove duplicates
          const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
          return unique.sort((a: any, b: any) => {
            const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
            const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
            return tA - tB;
          });
        });
      });

      const unsubReceived = onSnapshot(qReceived, (snapRec) => {
        const recMsgs = snapRec.docs.map(doc => {
          const data = doc.data();
          // Update status to read if not read
          if (data.status !== 'read') {
            updateDoc(doc.ref, { status: 'read' });
          }
          return { id: doc.id, ...data };
        });
        setChatMessages(prev => {
          const others = prev.filter(m => m.receiverId !== profile.uid);
          const merged = [...others, ...recMsgs];
          // Remove duplicates
          const unique = Array.from(new Map(merged.map(m => [m.id, m])).values());
          return unique.sort((a: any, b: any) => {
            const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
            const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
            return tA - tB;
          });
        });
      });

      unsubscribe = () => {
        unsubSent();
        unsubReceived();
      };
    } else {
      // Manager/Supervisor is viewing the employee's profile
      const conversationId = [profile.uid, employeeId].sort().join('_');
      const q = query(
        collection(db, 'internal_chats'),
        where('conversationId', '==', conversationId)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          // If the logged-in user is the receiver, mark as read!
          if (data.receiverId === profile.uid && data.status !== 'read') {
            updateDoc(doc.ref, { status: 'read' });
          }
          return {
            id: doc.id,
            ...data
          };
        });
        
        // Sort in memory to fix the local-null serverTimestamp bug
        msgs.sort((a: any, b: any) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now());
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : Date.now());
          return tA - tB;
        });

        setChatMessages(msgs);
      }, (err) => {
        console.error("Error loading chat messages:", err);
      });
    }

    return () => unsubscribe();
  }, [isChatOpen, profile?.uid, employeeId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile?.uid || !employeeId) return;

    let receiverId = employeeId;
    let receiverName = employee?.name || 'موظف';

    if (profile.uid === employeeId) {
      // Employee replying. Find the last message received to get the manager/supervisor ID.
      const lastReceivedMsg = [...chatMessages]
        .reverse()
        .find(m => m.senderId !== profile.uid);

      if (lastReceivedMsg) {
        receiverId = lastReceivedMsg.senderId;
        receiverName = lastReceivedMsg.senderName || 'الإدارة';
      } else if (employee?.supervisorId) {
        // Fallback to supervisor if set
        receiverId = employee.supervisorId;
        receiverName = 'المشرف المباشر';
      } else {
        // Fallback to active company's manager/admin
        receiverId = 'manager'; 
        receiverName = 'إدارة الشركة';
      }
    }

    const conversationId = [profile.uid, receiverId].sort().join('_');
    const msgText = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'internal_chats'), {
        conversationId,
        senderId: profile.uid,
        senderName: profile.name || 'مجهول',
        receiverId,
        receiverName,
        message: msgText,
        createdAt: serverTimestamp(),
        companyId: activeCompanyId || null,
        status: 'sent'
      });

      await sendNotification({
        title: 'رسالة داخلية جديدة 💬',
        message: `أرسل لك ${profile.name}: "${msgText.slice(0, 50)}${msgText.length > 50 ? '...' : ''}"`,
        type: 'info',
        category: 'system',
        targetRole: receiverId === 'manager' ? 'manager' : ('direct' as any),
        targetUserId: receiverId !== 'manager' ? receiverId : undefined,
        tab: 'profile'
      });
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error('فشل في إرسال الرسالة');
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const fetchEmployee = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', employeeId));
        if (docSnap.exists() && active) {
          const empData = { id: docSnap.id, ...docSnap.data() };
          setEmployee(empData);
          
          const qOffices = getCompanyQuery('offices', activeCompanyId);
          const qProjects = getCompanyQuery('projects', activeCompanyId);
          
          let officesFetched = false;
          let projectsFetched = false;
          let tempLocations: string[] = [];
          
          const unsubOffices = onSnapshot(qOffices, (officesSnap) => {
             officesFetched = true;
             (window as any).__DEBUG_LEN = officesSnap.docs.length;
             (window as any).__DEBUG_OFFICES = officesSnap.docs.reduce((acc: any, d) => {
               acc[d.data().name] = d.data().assignedEmployees;
               return acc;
             }, {});
             
             tempLocations = tempLocations.filter(l => !l.startsWith('مقر:'));
             officesSnap.docs.forEach(d => {
                const data = d.data();
                const hasAssignedArray = data.assignedEmployees && Array.isArray(data.assignedEmployees);
                const isAssigned = !hasAssignedArray || data.assignedEmployees.includes(empData.uid) || data.assignedEmployees.includes(empData.id);
                if (isAssigned) {
                  tempLocations.push(`مقر: ${data.name || 'بدون اسم'}`);
                }
             });
             
             if (officesFetched && projectsFetched) {
                setAssignedLocations(tempLocations.length > 0 ? tempLocations : ['عام (غير مرتبط - محدث 2)']);
             }
          });

          const unsubProjects = onSnapshot(qProjects, (projectsSnap) => {
             projectsFetched = true;
             tempLocations = tempLocations.filter(l => !l.startsWith('مشروع:'));
             projectsSnap.docs.forEach(d => {
                const data = d.data();
                const hasAssignedArray = data.assignedEmployees && Array.isArray(data.assignedEmployees);
                const isAssigned = !hasAssignedArray || data.assignedEmployees.includes(empData.uid) || data.assignedEmployees.includes(empData.id);
                if (isAssigned) {
                  tempLocations.push(`مشروع: ${data.name || 'بدون اسم'}`);
                }
             });
             
             if (officesFetched && projectsFetched) {
                setAssignedLocations(tempLocations.length > 0 ? tempLocations : ['عام (غير مرتبط - محدث 2)']);
             }
          });
          
          // Store unsubs so they can be cleaned up
          (window as any).__unsubOffices = unsubOffices;
          (window as any).__unsubProjects = unsubProjects;

        } else if (active) {
          toast.error('الموظف غير موجود');
          onBack();
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEmployee();
    return () => { 
       active = false; 
       if ((window as any).__unsubOffices) { (window as any).__unsubOffices(); }
       if ((window as any).__unsubProjects) { (window as any).__unsubProjects(); }
    };
  }, [employeeId, activeCompanyId]); // Removed onBack to prevent unnecessary re-renders when parent passes a new function

  useEffect(() => {
    if (!employee) return;

    // Use both document ID and Auth UID to find all associated records
    const userIds = [employeeId];
    if (employee.uid && employee.uid !== employeeId) {
      userIds.push(employee.uid);
    }

    // Listen to activities
    const qActivities = query(
      collection(db, 'activities'),
      where('userId', 'in', userIds),
      limit(100)
    );

    // Listen to attendance
    const qAttendance = query(
      collection(db, 'attendance'),
      where('userId', 'in', userIds),
      limit(100)
    );

    // Listen to leaves
    const qLeaves = query(
      collection(db, 'leaveRequests'),
      where('userId', 'in', userIds)
    );

    // Listen to adjustments
    const qAdjustments = query(
      collection(db, 'financialAdjustments'),
      where('userId', 'in', userIds)
    );

    // Listen to goals
    const qGoals = query(
      collection(db, 'employeeGoals'),
      where('userId', 'in', userIds)
    );

    // Listen to performance
    const qPerformance = query(
      getCompanyQuery('employeePerformance', activeCompanyId),
      where('userId', 'in', userIds)
    );

    // Listen to warnings
    const qWarnings = query(
      collection(db, 'warnings'),
      where('userId', 'in', userIds)
    );

    // Listen to justifications
    const qJustifications = query(
      collection(db, 'justifications'),
      where('userId', 'in', userIds)
    );

    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      let acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      acts.sort((a: any, b: any) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
      });
      setActivities(acts.slice(0, 10));
    });

    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      let att = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      att.sort((a: any, b: any) => {
        const tA = a.date ? new Date(a.date).getTime() : 0;
        const tB = b.date ? new Date(b.date).getTime() : 0;
        return tB - tA;
      });
      setAttendance(att.slice(0, 30));
    });

    const unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
      let lvs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      lvs.sort((a: any, b: any) => {
        const tA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const tB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return tB - tA;
      });
      setLeaves(lvs);
    });

    const unsubAdjustments = onSnapshot(qAdjustments, (snapshot) => {
      let adjs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      adjs.sort((a: any, b: any) => {
        const tA = a.date ? new Date(a.date).getTime() : 0;
        const tB = b.date ? new Date(b.date).getTime() : 0;
        return tB - tA;
      });
      setAdjustments(adjs);
    });

    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      let gls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      gls.sort((a: any, b: any) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setGoals(gls);
    });

    const unsubPerformance = onSnapshot(qPerformance, (snapshot) => {
      setPerformance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubWarnings = onSnapshot(qWarnings, (snapshot) => {
      setWarnings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubJustifications = onSnapshot(qJustifications, (snapshot) => {
      setJustifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubActivities();
      unsubAttendance();
      unsubLeaves();
      unsubAdjustments();
      unsubGoals();
      unsubPerformance();
      unsubWarnings();
      unsubJustifications();
    };
  }, [employeeId, employee, activeCompanyId]);


  const handleAddLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    setIsSubmitting(true);
    try {
      const isManager = profile?.role === 'manager' || profile?.role === 'owner';
      
      await addCompanyDoc('leaveRequests', {
        ...leaveForm,
        userId: employeeId,
        status: isManager ? 'approved' : 'pending',
        createdAt: serverTimestamp(),
      }, activeCompanyId);

      if (isManager && profile?.uid !== employeeId) {
        // Manager added it for the employee, notify the employee
        await sendNotification({
          title: 'تسجيل إجازة إدارية',
          message: `قامت الإدارة بتسجيل إجازة ${leaveForm.type} لك من ${leaveForm.startDate} إلى ${leaveForm.endDate}`,
          type: 'info',
          category: 'system',
          targetUserId: employeeId,
          tab: 'leaves',
          priority: 'high'
        });
      } else {
        // Employee requested it, notify manager
        await sendNotification({
          title: 'طلب إجازة جديد',
          message: `قام الموظف ${employee?.name} بطلب إجازة ${leaveForm.type} من ${leaveForm.startDate}`,
          type: 'approval',
          category: 'employee',
          targetRole: 'manager',
          tab: 'approvals',
          priority: 'high'
        });
      }

      setIsLeaveDialogOpen(false);
      toast.success(isManager ? 'تم تسجيل واعتماد الإجازة' : 'تم إرسال طلب الإجازة');
    } catch (e) {
      toast.error('فشل في إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAdjustment = async () => {
    if (!adjustmentForm.amount || !adjustmentForm.reason) return;
    setIsSubmitting(true);
    try {
      const isApproved = (profile?.role === 'manager' || profile?.role === 'owner');
      await addCompanyDoc('financialAdjustments', {
        ...adjustmentForm,
        amount: Number(adjustmentForm.amount),
        userId: employeeId,
        date: serverTimestamp(),
        status: isApproved ? 'approved' : 'pending',
        createdBy: profile?.uid
      }, activeCompanyId);

      let arabicType = 'حركة مالية';
      if (adjustmentForm.type === 'bonus') arabicType = 'مكافأة';
      else if (adjustmentForm.type === 'deduction') arabicType = 'خصم';
      else if (adjustmentForm.type === 'custody_deposit') arabicType = 'إيداع عهدة';
      else if (adjustmentForm.type === 'purchase_expense') arabicType = 'مصروف مشتريات عهدة';
      else if (adjustmentForm.type === 'loan') arabicType = 'سلفة';

      if (isApproved && profile?.uid !== employeeId) {
        // Manager added it for the employee, notify the employee
        await sendNotification({
          title: `تم تسجيل ${arabicType}`,
          message: `قامت الإدارة بتسجيل ${arabicType} لك بقيمة ${adjustmentForm.amount} ر.س`,
          type: adjustmentForm.type.includes('deposit') || adjustmentForm.type === 'bonus' ? 'success' : 'warning',
          category: 'financial',
          targetUserId: employeeId,
          tab: 'financials',
          priority: 'high'
        });
      } else {
        // Employee requested it, notify manager
        await sendNotification({
          title: `طلب حركة مالية: ${arabicType}`,
          message: `طلب ${employee?.name} تسجيل ${arabicType} بقيمة ${adjustmentForm.amount} ر.س`,
          type: 'warning',
          category: 'financial',
          targetRole: 'manager',
          tab: 'financials',
          priority: 'high'
        });
      }

      setIsAdjustmentDialogOpen(false);
      toast.success(isApproved ? 'تمت إضافة الحركة المالية بنجاح' : 'تم إرسال الحركة المالية للمراجعة والاعتماد');
    } catch (e) {
      toast.error('فشل في إضافة الحركة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddGoal = async () => {
    if (!goalForm.title) return;
    setIsSubmitting(true);
    try {
      await addCompanyDoc('employeeGoals', {
        ...goalForm,
        userId: employeeId,
        createdAt: serverTimestamp(),
        createdBy: profile?.uid
      }, activeCompanyId);
      
      setIsGoalDialogOpen(false);
      setGoalForm({ title: '', progress: 0, color: 'bg-blue-500' });
      toast.success('تمت إضافة الهدف بنجاح');
    } catch (e) {
      toast.error('فشل إضافة الهدف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGoal = async (goalId: string, progress: number) => {
    try {
      await updateDoc(doc(db, 'employeeGoals', goalId), { progress });
    } catch (e) {
      toast.error('فشل تحديث الهدف');
    }
  };

  const handleAddPerformance = async () => {
    setIsSubmitting(true);
    try {
      await addCompanyDoc('employeePerformance', {
        ...performanceForm,
        userId: employeeId,
        createdAt: serverTimestamp(),
        createdBy: profile?.uid
      }, activeCompanyId);
      
      setIsPerformanceDialogOpen(false);
      toast.success('تم إضافة التقييم بنجاح');
    } catch (e) {
      toast.error('فشل إضافة التقييم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestLoan = async () => {
    if (!loanForm.amount || !loanForm.reason) return;
    setIsSubmitting(true);
    try {
      await addCompanyDoc('financialAdjustments', {
        type: 'loan',
        amount: Number(loanForm.amount),
        reason: loanForm.reason,
        userId: employeeId,
        date: serverTimestamp(),
        status: 'pending',
        createdBy: profile?.uid
      }, activeCompanyId);

      await sendNotification({
        title: 'طلب سلفة جديد',
        message: `الموظف ${employee?.name} طلب سلفة بقيمة ${loanForm.amount} ر.س لسبب: ${loanForm.reason}`,
        type: 'warning',
        category: 'financial',
        targetRole: 'manager',
        tab: 'approvals',
        priority: 'high'
      });

      setLoanForm({ amount: '', reason: '' });
      setIsAdjustmentDialogOpen(false);
      toast.success('تم إرسال طلب السلفة بنجاح');
    } catch (e) {
      toast.error('فشل في إرسال طلب السلفة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSpecialRequest = async () => {
    if (!specialRequestContent.trim()) return;
    setIsSubmitting(true);
    try {
      await addCompanyDoc('activities', {
        title: 'طلب خاص من الموظف',
        description: specialRequestContent,
        type: 'warning',
        source: 'employee_request',
        userId: employeeId,
        timestamp: serverTimestamp(),
        createdBy: profile?.uid,
        status: 'pending'
      }, activeCompanyId);
      
      await sendNotification({
        title: 'طلب خاص من موظف',
        message: `الموظف ${employee?.name} أرسل طلباً خاصاً: ${specialRequestContent.slice(0, 50)}...`,
        type: 'warning',
        category: 'employee',
        targetRole: 'manager',
        tab: 'projects',
        priority: 'high'
      });

      setSpecialRequestContent('');
      setIsSpecialRequestDialogOpen(false);
      toast.success('تم إرسال طلبك الخاص بنجاح');
    } catch (e) {
      toast.error('فشل في إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = useMemo(() => {
    if (!employee) return { base: 0, bonuses: 0, deductions: 0, net: 0 };
    const base = employee.salary || employee.baseSalary || 0;
    const bonusTotal = (adjustments || []).filter(a => a.type === 'bonus').reduce((acc: number, a: any) => acc + (Number(a.amount) || 0), 0);
    const deductionTotal = (adjustments || []).filter(a => a.type === 'deduction').reduce((acc: number, a: any) => acc + (Number(a.amount) || 0), 0);
    return {
      base,
      bonuses: bonusTotal,
      deductions: deductionTotal,
      net: base + bonusTotal - deductionTotal
    };
  }, [employee, adjustments]);

  const custodyTotals = useMemo(() => {
    const deposits = (adjustments || [])
      .filter(a => a.type === 'custody_deposit' && a.status === 'approved')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const expenses = (adjustments || [])
      .filter(a => a.type === 'purchase_expense' && a.status === 'approved')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    return { deposits, expenses, balance: deposits - expenses };
  }, [adjustments]);

  const handleRequestReimbursement = async () => {
    if (custodyTotals.balance >= 0) return;
    setIsSubmitting(true);
    try {
      const amountToClaim = Math.abs(custodyTotals.balance);
      await addCompanyDoc('financialAdjustments', {
        type: 'reimbursement_request',
        amount: amountToClaim,
        reason: 'طلب استعاضة/تعويض لـ تغطية مصاريف المشتريات الزائدة عن العهدة',
        userId: employeeId,
        date: serverTimestamp(),
        status: 'pending',
        createdBy: profile?.uid
      }, activeCompanyId);

      await sendNotification({
        title: 'طلب تعويض عهدة جديد',
        message: `الموظف ${employee?.name} يطالب باستعاضة عهدة بقيمة ${amountToClaim} ر.س لتغطية عجز العهدة بالسالب`,
        type: 'warning',
        category: 'financial',
        targetRole: 'manager',
        tab: 'approvals',
        priority: 'high'
      });

      toast.success('تم إرسال طلب استعاضة العهدة بنجاح');
    } catch (e) {
      toast.error('فشل في إرسال طلب الاستعاضة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() && !noteFile) return;
    setIsSubmitting(true);
    try {
      let attachmentUrl = '';
      if (noteFile) {
        const fileRef = ref(storage, `activities/${activeCompanyId}/${Date.now()}_${noteFile.name}`);
        const uploadResult = await uploadBytes(fileRef, noteFile);
        attachmentUrl = await getDownloadURL(uploadResult.ref);
      }

      await addCompanyDoc('activities', {
        title: 'تحديث إداري',
        description: noteContent,
        attachmentUrl: attachmentUrl || null,
        type: attachmentUrl ? 'image' : 'info',
        source: 'employee',
        userId: employeeId,
        timestamp: serverTimestamp(),
        createdBy: profile?.uid || 'admin'
      }, activeCompanyId);

      await sendNotification({
        title: 'تحديث في ملف الموظف',
        message: `تمت إضافة تحديث إداري جديد لملف ${employee?.name}: ${noteContent}`,
        type: 'info',
        category: 'employee',
        targetRole: 'manager',
        tab: 'employees',
        priority: 'low'
      });

      setNoteContent('');
      setNoteFile(null);
      setIsNoteDialogOpen(false);
      toast.success('تمت إضافة الملاحظة والتحديث لملف الموظف');
    } catch (e) {
      console.error(e);
      toast.error('فشل في إضافة الملاحظة والتحديث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const performanceData = useMemo(() => {
    if (!performance || performance.length === 0) {
      return [
        { name: 'لا يوجد تقييمات', value: 0 }
      ];
    }
    return performance.map(p => ({
      name: p.month,
      value: p.score
    }));
  }, [performance]);

  const disciplineStats = useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    let lateDays = 0;
    let lateMinutes = 0;
    let absentDays = 0;
    let totalWorkedMinutes = 0;
    let overtimeMinutesTotal = 0;
    let earlyLeaveMinutesTotal = 0;
    let actualWorkedDays = 0;
    
    attendance.forEach(a => {
      if (!a.date?.startsWith(currentMonth)) return;
      if (a.status === 'late') {
        lateDays++;
        lateMinutes += a.lateMinutes || 0;
      }
      if (a.status === 'absent') {
        absentDays++;
      } else {
        actualWorkedDays++;
      }
      // Calculate total worked hours (if workedMinutes exists, add it)
      let dayWorkedMinutes = 0;
      if (a.workedMinutes) {
        dayWorkedMinutes = a.workedMinutes;
      } else if (a.checkIn && a.checkOut) {
         const checkInTime = new Date(a.checkIn).getTime();
         const checkOutTime = new Date(a.checkOut).getTime();
         if (!isNaN(checkInTime) && !isNaN(checkOutTime)) {
            dayWorkedMinutes = Math.floor((checkOutTime - checkInTime) / 60000);
         }
      }
      totalWorkedMinutes += dayWorkedMinutes;

      const targetDailyMinutes = 600; // 10 hours
      if (dayWorkedMinutes > targetDailyMinutes) {
        overtimeMinutesTotal += (dayWorkedMinutes - targetDailyMinutes);
      } else if (dayWorkedMinutes > 0 && dayWorkedMinutes < targetDailyMinutes) {
        earlyLeaveMinutesTotal += (targetDailyMinutes - dayWorkedMinutes);
      }
    });

    const pendingJustifications = justifications.filter(j => j.status === 'pending').length;
    
    // Calculate total working days in the current month (excluding Fridays)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDaysThisMonth = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      if (d.getDay() !== 5) { // 5 is Friday
        workingDaysThisMonth++;
      }
    }

    const totalMonthlyHours = Math.floor(totalWorkedMinutes / 60);
    const targetMonthlyHours = workingDaysThisMonth * 10; // 10 hours per working day
    const hoursProgress = Math.min(100, Math.round((totalMonthlyHours / (targetMonthlyHours || 1)) * 100));

    const avgDailyHours = actualWorkedDays > 0 ? (totalWorkedMinutes / 60 / actualWorkedDays).toFixed(1) : '0';
    const totalOvertimeHours = Math.floor(overtimeMinutesTotal / 60);
    const totalEarlyLeaveHours = Math.floor(earlyLeaveMinutesTotal / 60);
    // Base 100%, deduct points for bad behavior
    const disciplineIndex = Math.max(0, 100 - (lateDays * 2) - (absentDays * 5) - (warnings.length * 10));

    return { 
      lateDays, 
      absentDays, 
      lateMinutes, 
      warningsCount: warnings.length,
      pendingJustifications,
      totalMonthlyHours,
      targetMonthlyHours,
      hoursProgress,
      avgDailyHours,
      totalOvertimeHours,
      totalEarlyLeaveHours,
      disciplineIndex
    };
  }, [attendance, warnings, justifications]);

  const attendancePercentage = useMemo(() => {
    if (employee?.role === 'sales_rep') return 100;
    if (!attendance || attendance.length === 0) return 0; // Return 0% if no records
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthRecords = attendance.filter(a => a.date?.startsWith(currentMonth));
    
    if (monthRecords.length === 0) return 0;
    
    const presentCount = monthRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    let score = Math.round((presentCount / monthRecords.length) * 100);
    
    // Penalize score by discipline stats (e.g., late penalty, warnings penalty)
    score -= (disciplineStats.lateDays * 2);
    score -= (disciplineStats.warningsCount * 5); // Reduced penalty weight for warnings on attendance
    
    return Math.max(0, Math.min(100, score));
  }, [employee?.role, attendance, disciplineStats]);

  const generalEvaluation = useMemo(() => {
    if (employee?.role === 'sales_rep') return "5.0";
    
    let baseScore = 5.0;
    
    if (performance && performance.length > 0) {
      const sum = performance.reduce((acc, p) => acc + (p.score || 0), 0);
      const avg = sum / performance.length;
      baseScore = avg / 20; // Assumes score out of 100 -> converts to out of 5.0
    } else {
      // If no performance, base it off of attendance ratio
      if (!attendance || attendance.length === 0) return "0.0";
      const currentMonth = new Date().toISOString().substring(0, 7);
      const monthRecords = attendance.filter(a => a.date?.startsWith(currentMonth));
      if (monthRecords.length > 0) {
        const presentCount = monthRecords.filter(a => a.status === 'present' || a.status === 'late').length;
        baseScore = (presentCount / monthRecords.length) * 5.0;
      } else {
        baseScore = 0.0;
      }
    }
    
    // Penalize base score by discipline stats dynamically
    baseScore -= (disciplineStats.absentDays * 0.2);
    baseScore -= (disciplineStats.lateDays * 0.05);
    baseScore -= (disciplineStats.warningsCount * 0.5);
    
    return Math.max(0.0, Math.min(5.0, baseScore)).toFixed(1);
  }, [performance, disciplineStats, employee?.role, attendance]);

  const currentLocation = useMemo(() => {
    if (!attendance || attendance.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = attendance.find(a => a.date === todayStr);
    if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
      return todayRecord.locationName;
    }
    return null;
  }, [attendance]);



  const handleIssueWarning = async () => {
    if (!warningForm.reason) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'warnings'), {
        userId: employeeId,
        userName: employee.name,
        type: warningForm.type,
        reason: warningForm.reason,
        date: new Date().toISOString(),
        issuedBy: profile?.uid || 'manager',
        companyId: activeCompanyId || null
      });

      await sendNotification({
        title: `إنذار إداري جديد (${warningForm.type})`,
        message: `تم إصدار إنذار إداري لك بسبب: ${warningForm.reason}`,
        type: 'error',
        category: 'system',
        targetRole: 'worker',
        targetUserId: employeeId,
        priority: 'high'
      });

      toast.success('تم إصدار الإنذار وحفظه في سجل الموظف');
      setIsWarningDialogOpen(false);
      setWarningForm({ reason: '', type: 'لفت نظر' });
    } catch (e) {
      toast.error('فشل في إصدار الإنذار');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitJustification = async () => {
    if (!justificationForm.reason) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'justifications'), {
        userId: employeeId,
        userName: employee.name,
        reason: justificationForm.reason,
        date: justificationForm.date || new Date().toISOString().split('T')[0],
        status: 'pending',
        submittedAt: new Date().toISOString(),
        companyId: activeCompanyId || null
      });

      await sendNotification({
        title: 'عذر مرفوع من موظف',
        message: `قام الموظف ${employee.name} برفع تبرير لتأخير/غياب بتاريخ ${justificationForm.date}`,
        type: 'info',
        category: 'employee',
        targetRole: 'manager',
        tab: 'employees',
        priority: 'normal'
      });

      toast.success('تم رفع العذر للإدارة بانتظار المراجعة');
      setIsJustificationDialogOpen(false);
      setJustificationForm({ reason: '', date: '' });
    } catch (e) {
      toast.error('فشل في رفع العذر');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !employee) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold italic underline decoration-accent underline-offset-4 animate-pulse">جاري سحب الملف الشخصي الذكي...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full xl:max-w-7xl mx-auto px-4">
      {profile?.uid === employeeId && (
        <SmartAttendance />
      )}
      {/* Header Profile Section */}
      <div className="relative group overflow-hidden rounded-3xl bg-white border shadow-sm p-4 md:p-6 lg:p-8">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:bg-accent/10 transition-colors duration-700" />
        <Button 
          onClick={onBack} 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200"
        >
          <ChevronRight className="w-5 h-5 text-primary" />
        </Button>
        
        <div className="relative flex flex-col items-center md:items-start gap-6 w-full">
          {/* 1. Top Section: Identity & Basics */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 w-full">
            {/* Avatar */}
            <div className="relative shrink-0 mt-8 md:mt-0">
              <Avatar className="w-28 h-28 md:w-32 md:h-32 rounded-3xl border-4 border-white shadow-xl ring-2 ring-slate-100">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.name}`} />
                <AvatarFallback className="bg-primary text-white text-3xl font-black">{employee.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -left-2 md:-right-2 md:left-auto bg-emerald-500 border-4 border-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg" title="نشط الآن">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>

            {/* Name, ID, Badges */}
            <div className="flex-1 text-center md:text-right pt-2">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-black text-primary tracking-tight">{employee.name}</h1>
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none px-3 py-1.5 text-xs font-bold transition-colors">
                  ID: #{employee.id.slice(0, 6).toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary border border-primary/10">
                  <Briefcase className="w-3.5 h-3.5" />
                  {getRoleArabic(employee.role)}
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 border border-blue-100">
                  <Shield className="w-3.5 h-3.5" />
                  قسم {employee.department || 'الإنتاج'}
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 border border-emerald-100">
                  <Calendar className="w-3.5 h-3.5" />
                  منذ {employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString('ar-SA') : 'البداية'}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-slate-100 my-1" />

          {/* 2. Middle Section: Locations & Status */}
          <div className="w-full grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4 items-stretch">
            {/* Current Location Box */}
            <div className={`p-4 rounded-2xl flex flex-col items-center text-center justify-center border transition-all ${currentLocation ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${currentLocation ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">التواجد الحالي</p>
              <p className={`text-sm md:text-base font-black ${currentLocation ? 'text-emerald-700' : 'text-slate-600'}`}>
                {currentLocation ? currentLocation : 'غير متواجد حالياً'}
              </p>
            </div>

            {/* Assigned Locations Strip */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-muted-foreground font-bold uppercase">المقرات المصرحة للموظف</p>
              </div>
              <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[80px] custom-scrollbar pr-1">
                {assignedLocations.length > 0 ? (
                  assignedLocations.map((loc, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-slate-700">{loc}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                    <span className="text-xs font-bold">غير مرتبط بمقرات</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Stats Section */}
          <div className="w-full">
            {/* Smart Discipline & Performance Unified Card */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex flex-col gap-5">
               {/* Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-y-6 gap-x-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200">
                 
                 <div className="text-center md:text-right px-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">الغياب (الشهر)</p>
                   <p className={`text-2xl font-black ${disciplineStats.absentDays > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{disciplineStats.absentDays}</p>
                 </div>
                 
                 <div className="text-center md:text-right px-2 pt-4 md:pt-0">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">أيام التأخير</p>
                   <p className={`text-2xl font-black ${disciplineStats.lateDays > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{disciplineStats.lateDays}</p>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">ساعات التأخير</p>
                   <p className={`text-2xl font-black ${disciplineStats.lateMinutes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{Math.floor(disciplineStats.lateMinutes / 60)} <span className="text-[10px] font-normal text-muted-foreground">س</span></p>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">الإنذارات</p>
                   <div className="flex items-center justify-center md:justify-start gap-2">
                     <p className={`text-2xl font-black ${disciplineStats.warningsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{disciplineStats.warningsCount}</p>
                     {disciplineStats.pendingJustifications > 0 && (
                       <Badge variant="destructive" className="animate-pulse text-[10px] px-1.5 h-5">{disciplineStats.pendingJustifications} معلق</Badge>
                     )}
                   </div>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0 md:border-t md:border-slate-200 md:mt-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">العمل الإضافي</p>
                   <p className="text-2xl font-black text-purple-600">{disciplineStats.totalOvertimeHours} <span className="text-[10px] font-normal text-muted-foreground">س</span></p>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0 md:border-t md:border-slate-200 md:mt-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">الخروج المبكر</p>
                   <p className={`text-2xl font-black ${disciplineStats.totalEarlyLeaveHours > 0 ? 'text-rose-600' : 'text-slate-600'}`}>{disciplineStats.totalEarlyLeaveHours} <span className="text-[10px] font-normal text-muted-foreground">س</span></p>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0 md:border-t md:border-slate-200 md:mt-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">متوسط العمل اليومي</p>
                   <p className="text-2xl font-black text-blue-600">{disciplineStats.avgDailyHours} <span className="text-[10px] font-normal text-muted-foreground">س</span></p>
                 </div>

                 <div className="text-center md:text-right px-2 pt-4 md:pt-0 md:border-t md:border-slate-200 md:mt-2">
                   <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">مؤشر الانضباط</p>
                   <p className={`text-2xl font-black ${disciplineStats.disciplineIndex >= 90 ? 'text-emerald-600' : disciplineStats.disciplineIndex >= 75 ? 'text-amber-500' : 'text-rose-600'}`}>{disciplineStats.disciplineIndex}%</p>
                 </div>
                 
               </div>

               {/* Progress Bar Section (Full Width) */}
               <div className="pt-4 border-t border-slate-200">
                 <div className="flex items-center justify-between mb-2">
                   <p className="text-xs text-muted-foreground font-bold uppercase">إجمالي ساعات العمل المنجزة (الشهر)</p>
                   <p className="text-xs text-muted-foreground font-bold">
                     <span className="text-blue-700 text-sm">{disciplineStats.totalMonthlyHours}</span> / {disciplineStats.targetMonthlyHours} س
                   </p>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                     <div className={`h-full rounded-full transition-all duration-1000 ${disciplineStats.hoursProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, disciplineStats.hoursProgress)}%` }} />
                   </div>
                   <span className="text-sm font-black text-slate-700 min-w-[35px] text-left">{disciplineStats.hoursProgress}%</span>
                 </div>
               </div>
            </div>
          </div>

          {/* 4. Action Bar (Bottom Toolbar) */}
          <div className="w-full bg-slate-50/80 p-2 md:p-3 rounded-2xl border border-slate-100">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {(profile?.uid === employeeId || profile?.id === employeeId) ? (
                <>
                  <Button 
                    onClick={() => setIsLeaveDialogOpen(true)}
                    className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                  >
                    <Plane className="w-3.5 h-3.5" />
                    طلب إجازة
                  </Button>
                  <Button 
                    onClick={() => {
                      setAdjustmentForm({ type: 'loan', amount: '', reason: '' });
                      setIsAdjustmentDialogOpen(true);
                    }}
                    className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    طلب سلفة
                  </Button>
                  {(disciplineStats.absentDays > 0 || disciplineStats.lateDays > 0) && (
                    <Button 
                      onClick={() => setIsJustificationDialogOpen(true)}
                      className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs animate-bounce"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      تبرير دوام
                    </Button>
                  )}
                  <Button 
                    onClick={() => setIsSpecialRequestDialogOpen(true)}
                    className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    طلب خاص
                  </Button>
                  <Button 
                    onClick={() => setIsChatOpen(true)}
                    className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    مراسلة الإدارة
                  </Button>
                </>
              ) : (
                <>
                  {((profile?.role === 'manager' || profile?.role === 'owner') || profile?.role === 'supervisor') && (
                    <Button 
                      onClick={() => setIsNoteDialogOpen(true)}
                      className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      إضافة تحديث
                    </Button>
                  )}
                  {(profile?.role === 'manager' || profile?.role === 'owner') && (
                    <Button 
                      onClick={() => {
                        setAdjustmentForm({ type: 'bonus', amount: '', reason: '' });
                        setIsAdjustmentDialogOpen(true);
                      }}
                      className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      إجراء مالي
                    </Button>
                  )}
                  {(profile?.role === 'manager' || profile?.role === 'owner') && (
                    <Button 
                      onClick={() => setIsWarningDialogOpen(true)}
                      className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      إنذار إداري
                    </Button>
                  )}
                  <Button 
                    onClick={() => setIsChatOpen(true)}
                    className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    مراسلة الموظف
                  </Button>
                  {employee.phone && (
                    <Button 
                      onClick={() => window.open(`https://wa.me/${employee.phone.replace(/\D/g, '')}`, '_blank')}
                      className="flex-1 md:flex-none rounded-xl gap-2 font-black h-11 px-4 bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-sm transition-all active:scale-95 text-[11px] md:text-xs"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      تواصل عبر واتساب
                    </Button>
                  )}
                </>
              )}
            </div>
        </div>
      </div>

      </div>
      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar: Performance & Details */}
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                تتبع الأداء الذكي
              </CardTitle>
              {(profile?.role === 'manager' || profile?.role === 'owner') && (
                <Button onClick={() => setIsPerformanceDialogOpen(true)} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-white">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-800">تحليل الذكاء الاصطناعي</p>
                  <p className="text-[11px] text-emerald-600">
                    {(profile?.uid === employeeId || profile?.id === employeeId) 
                      ? 'أداؤك متميز، وتحافظ على مستوى تصاعدي في الأداء خلال الربع الحالي.' 
                      : 'موظف متميز، يحافظ على مستوى تصاعدي في الأداء خلال الربع الحالي.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm border-border">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                {(profile?.uid === employeeId || profile?.id === employeeId) ? 'أهدافي الحالية' : 'أهداف الموظف الحالية'}
              </CardTitle>
              {(profile?.role === 'manager' || profile?.role === 'owner') && (
                <Button onClick={() => setIsGoalDialogOpen(true)} variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200">
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-4">لا توجد أهداف مسجلة حالياً</p>
              ) : (
                goals.map((g) => (
                  <GoalItem 
                    key={g.id} 
                    title={g.title} 
                    progress={g.progress} 
                    color={g.color} 
                    canEdit={(profile?.role === 'manager' || profile?.role === 'owner')}
                    onUpdate={(val: number) => handleUpdateGoal(g.id, val)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Area: Tabs & Tables */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className={`w-full max-w-2xl bg-slate-100 p-1 rounded-2xl grid ${((profile?.role === 'manager' || profile?.role === 'owner') || profile?.uid === employeeId || profile?.id === employeeId) ? 'grid-cols-6' : 'grid-cols-5'}`}>
              <TabsTrigger value="activity" className="rounded-xl font-bold py-2.5">
                النشاطات
              </TabsTrigger>
              <TabsTrigger value="attendance" className="rounded-xl font-bold py-2.5 text-xs">
                الحضور
              </TabsTrigger>
              <TabsTrigger value="leaves" className="rounded-xl font-bold py-2.5 text-xs">
                الإجازات
              </TabsTrigger>
              {((profile?.role === 'manager' || profile?.role === 'owner') || profile?.uid === employeeId || profile?.id === employeeId) && (
                <TabsTrigger value="finance" className="rounded-xl font-bold py-2.5 text-xs">
                  المالية
                </TabsTrigger>
              )}
              {employee.isSponsored && (
                <TabsTrigger value="docs" className="rounded-xl font-bold py-2.5 text-xs">
                  الوثائق
                </TabsTrigger>
              )}
              <TabsTrigger value="info" className="rounded-xl font-bold py-2.5">
                التفاصيل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-primary">سجل النشاط العام</h3>
                <Button onClick={() => setIsNoteDialogOpen(true)} variant="outline" size="sm" className="rounded-xl gap-2 font-bold">
                  <Plus className="w-4 h-4" />
                  إضافة ملاحظة
                </Button>
              </div>
              {activities.length > 0 ? (
                activities.map((act) => (
                  <div key={act.id} className="group relative bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${
                        act.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                        act.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {act.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <History className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-primary text-sm">{act.title}</h4>
                          <span className="text-[10px] text-muted-foreground font-bold" dir="ltr">
                            {act.timestamp?.toDate?.()?.toLocaleString('ar-SA') || 'منذ قليل'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">لا توجد نشاطات مسجلة مؤخراً</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="attendance" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-primary">سجل الحضور والانصراف</h3>
                  <p className="text-xs text-muted-foreground font-bold">مراجعة ساعات العمل والالتزام</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AttendanceStatCard label="أيام الحضور" value={attendance.filter(a => a.status === 'present').length} icon={CheckCircle2} color="text-emerald-600" />
                <AttendanceStatCard label="أيام الغياب" value={attendance.filter(a => a.status === 'absent').length} icon={AlertTriangle} color="text-red-500" />
                <AttendanceStatCard label="تأخير" value={attendance.filter(a => a.status === 'late').length} icon={Clock} color="text-amber-500" />
              </div>

              <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="text-[12px] font-bold">{att.date}</TableCell>
                        <TableCell>
                          <Badge className={`
                            ${att.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 
                              att.status === 'absent' ? 'bg-red-50 text-red-700' :
                              att.status === 'late' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-50 text-slate-700'} border-none text-[10px]
                          `}>
                            {att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : att.status === 'late' ? 'متأخر' : 'درجة'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{att.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="leaves" className="mt-6 space-y-6">
               <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-primary">نظام الإجازات</h3>
                  <p className="text-xs text-muted-foreground font-bold">إدارة طلبات الموظف وأرصدة الإجازات</p>
                </div>
                <Button onClick={() => setIsLeaveDialogOpen(true)} className="rounded-xl gap-2 font-black bg-blue-600 hover:bg-blue-700">
                  <Plane className="w-4 h-4" />
                  {((profile?.role === 'manager' || profile?.role === 'owner') && profile?.uid !== employeeId) ? 'تسجيل إجازة للموظف' : 'طلب إجازة جديدة'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {leaves.map((leave) => (
                   <Card key={leave.id} className="p-4 rounded-2xl border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-primary">إجازة {leave.type === 'annual' ? 'سنوية' : leave.type === 'sick' ? 'مرضية' : 'اضطرارية'}</p>
                          <p className="text-[11px] text-muted-foreground font-bold">من {leave.startDate} إلى {leave.endDate}</p>
                        </div>
                      </div>
                      <Badge className={`
                        ${leave.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 
                          leave.status === 'rejected' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'} border-none text-[10px]
                      `}>
                        {leave.status === 'approved' ? 'معتمدة' : leave.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                      </Badge>
                   </Card>
                 ))}
              </div>
            </TabsContent>

            {employee.isSponsored && (
              <TabsContent value="docs" className="mt-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-primary">المستندات والوثائق الرقمية</h3>
                    <p className="text-xs text-muted-foreground font-bold">الأرشيف الرقمي لثبوتيات الموظف</p>
                  </div>
                  {employee.isSponsored && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-none px-3 py-1 font-black">على الكفالة</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DocumentCard 
                    title="الإقامة الرسمية" 
                    number={employee.iqamaNumber}
                    expiry={employee.iqamaExpiry} 
                    image={employee.iqamaPhotoURL} 
                    icon={Shield}
                  />
                  <DocumentCard 
                    title="رخصة القيادة" 
                    number={employee.drivingLicenseNumber}
                    expiry={employee.drivingLicenseExpiry} 
                    image={employee.drivingLicensePhotoURL} 
                    icon={Briefcase}
                  />
                  <DocumentCard 
                    title="جواز السفر" 
                    number={employee.passportNumber}
                    expiry={employee.passportExpiry} 
                    image={employee.passportPhotoURL} 
                    icon={Plane}
                  />
                  <Card className="rounded-2xl border-border bg-emerald-50/30 overflow-hidden group">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-primary">عقد العمل الموثق</h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Digital Work Contract</p>
                        </div>
                      </div>
                      {employee.contractURL ? (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 font-black" onClick={() => window.open(employee.contractURL, '_blank')}>
                          <Download className="w-4 h-4" />
                          استعراض العقد PDF
                        </Button>
                      ) : (
                        <div className="text-center py-4 text-xs font-bold text-slate-400 italic">لا يوجد نسخة رقمية للعقد</div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            )}

            <TabsContent value="finance" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 {/* Card 1: Net salary */}
                 <Card className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all" />
                    <Zap className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
                    <p className="text-[10px] opacity-70 font-bold uppercase">صافي المستحقات الحالي</p>
                    <h3 className="text-3xl font-black mt-2">{totals.net.toLocaleString()} <span className="text-sm font-normal">ر.س</span></h3>
                    <div className="mt-6 flex items-center justify-between">
                       <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg font-bold">الراتب الشهري: {totals.base.toLocaleString()} ر.س</Badge>
                       <CreditCard className="w-6 h-6 opacity-30" />
                    </div>
                 </Card>

                 {/* Card 2: Adjustments */}
                 <Card className="bg-accent text-white rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all" />
                    <Award className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
                    <p className="text-[10px] opacity-70 font-bold uppercase">الخصميات / البدلات</p>
                    <div className="flex items-end gap-3 mt-2">
                       <h3 className="text-3xl font-black text-amber-300">-{totals.deductions.toLocaleString()}</h3>
                       <h3 className="text-3xl font-black text-emerald-300">+{totals.bonuses.toLocaleString()}</h3>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                       {(profile?.role === 'manager' || profile?.role === 'owner') ? (
                         <Button onClick={() => setIsAdjustmentDialogOpen(true)} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg h-8 font-black">إضافة حركة مالية</Button>
                       ) : (
                         <div />
                       )}
                       <TrendingUp className="w-6 h-6 opacity-30" />
                    </div>
                 </Card>

                 {/* Card 3: Custody Balance */}
                 <Card className={`${custodyTotals.balance < 0 ? 'bg-rose-950 border border-rose-500/40 shadow-rose-900/20' : 'bg-slate-800 border border-slate-700/40'} text-white rounded-3xl p-6 relative overflow-hidden group transition-all`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all" />
                    <CreditCard className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 rotate-12" />
                    <p className="text-[10px] opacity-70 font-bold uppercase">العهدة المالية الحالية</p>
                    <div className="flex items-baseline gap-1 mt-2">
                       <h3 className={`text-3xl font-black ${custodyTotals.balance < 0 ? 'text-rose-400' : 'text-sky-300'}`}>
                          {custodyTotals.balance.toLocaleString()}
                       </h3>
                       <span className="text-sm font-normal opacity-85">ر.س</span>
                    </div>
                    {custodyTotals.balance < 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-rose-300 font-bold bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
                        <span>يوجد مستحقات بذمة الشركة للموظف</span>
                      </div>
                    )}
                    <div className="mt-4 flex flex-col gap-2">
                       <div className="flex justify-between text-[9px] opacity-80 font-bold border-t border-white/15 pt-2">
                          <span>إيداع: {custodyTotals.deposits.toLocaleString()} ر.س</span>
                          <span>مصروف: {custodyTotals.expenses.toLocaleString()} ر.س</span>
                       </div>
                       
                       {custodyTotals.balance < 0 && (
                         <Button 
                           onClick={handleRequestReimbursement} 
                           disabled={isSubmitting}
                           className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 h-9 text-xs font-black shadow-lg shadow-indigo-600/20 gap-2 transition-all"
                         >
                           {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                           طلب تعويض المصاريف الزائدة
                         </Button>
                       )}
                    </div>
                 </Card>
              </div>

              <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b py-4 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold">سجل الحركات والتعديلات المالية</CardTitle>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right">الحركة</TableHead>
                      <TableHead className="text-right">السبب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj) => {
                      // Custom helper logic inline for badge rendering
                      let text = 'تعديل مالي';
                      let className = 'bg-slate-50 text-slate-700';
                      if (adj.type === 'bonus') {
                        text = 'مكافأة';
                        className = 'bg-emerald-50 text-emerald-700';
                      } else if (adj.type === 'deduction') {
                        text = 'خصم';
                        className = 'bg-red-50 text-red-700';
                      } else if (adj.type === 'loan') {
                        text = 'سلفة';
                        className = 'bg-amber-50 text-amber-700';
                      } else if (adj.type === 'custody_deposit') {
                        text = 'إيداع عهدة';
                        className = 'bg-sky-50 text-sky-700';
                      } else if (adj.type === 'purchase_expense') {
                        text = 'مصروف عهدة';
                        className = 'bg-rose-50 text-rose-700';
                      } else if (adj.type === 'reimbursement_request') {
                        text = 'طلب استعاضة عهدة';
                        className = 'bg-indigo-50 text-indigo-700';
                      }

                      const isPositive = adj.type === 'bonus' || adj.type === 'custody_deposit';
                      const isNegative = adj.type === 'deduction' || adj.type === 'purchase_expense' || adj.type === 'loan';

                      return (
                        <TableRow key={adj.id}>
                          <TableCell>
                            <Badge className={`${className} border-none text-[10px] font-bold`}>
                              {text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[12px] font-bold">
                            {adj.reason}
                            {adj.status === 'pending' && <span className="text-[10px] text-amber-500 mr-2 font-black">(قيد الانتظار)</span>}
                          </TableCell>
                          <TableCell className={`text-[12px] font-black ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-indigo-600'}`}>
                            {isPositive ? '+' : isNegative ? '-' : ''}{adj.amount.toLocaleString()} ر.س
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground font-bold" dir="ltr">
                             {adj.date?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="info" className="mt-6">
               <Card className="rounded-3xl shadow-sm border-border p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <InfoItem label="الاسم الرباعي" value={employee.name} icon={FileText} />
                     <InfoItem label="البريد الإلكتروني" value={employee.email} icon={Mail} />
                     <InfoItem label="المسمى الوظيفي" value={getRoleArabic(employee.role)} icon={Briefcase} />
                     <InfoItem label="الراتب الشهري" value={`${(employee.salary || 0).toLocaleString()} ر.س`} icon={CreditCard} />
                     <InfoItem label="رقم الجوال" value={employee.phone || 'غير متوفر'} icon={Phone} />
                     <InfoItem label="العنوان / الفرع" value="الرياض - حي الرائد" icon={MapPin} />
                     <InfoItem label="تاريخ مباشرة العمل" value={employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString() : '-'} icon={Calendar} />
                  </div>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">إضافة تحديث لملف الموظف</DialogTitle>
            <DialogDescription>سيتم تسجيل هذا التحديث كجزء من السجل التاريخي للموظف.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>نص الملاحظة / التحديث</Label>
              <Input 
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="مثلاً: الموظف أنجز مهمته قبل الموعد المحدد..."
                className="h-12 rounded-xl text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>إرفاق صورة (اختياري)</span>
              </Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 transition-all bg-slate-50/50 relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {noteFile ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                    <span className="text-xs font-semibold truncate max-w-[200px] text-slate-700">{noteFile.name}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteFile(null);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                    <span className="text-xs text-slate-500">اضغط هنا أو اسحب الصورة لإرفاقها</span>
                    <span className="text-[10px] text-slate-400">تدعم صيغ الصور (PNG, JPG, GIF)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddNote}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-primary hover:bg-black font-black"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'توثيق التحديث الآن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Leave Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">إضافة طلب إجازة</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>نوع الحجازة</Label>
              <Select value={leaveForm.type} onValueChange={(v) => setLeaveForm({...leaveForm, type: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">سنوية</SelectItem>
                  <SelectItem value="sick">مرضية</SelectItem>
                  <SelectItem value="emergency">اضطرارية</SelectItem>
                  <SelectItem value="unpaid">بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>بدءاً من</Label>
                <Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>حتى تاريخ</Label>
                <Input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Input value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder="أدخل سبب الإجازة..." className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddLeave} disabled={isSubmitting} className="w-full h-11 rounded-xl font-black bg-blue-600">
               {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إرسال الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">
              {adjustmentForm.type === 'loan' ? 'طلب سلفة مالية' : 'تعديل مالي (خصم/مكافأة)'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             {adjustmentForm.type !== 'loan' && (
               <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => setAdjustmentForm({...adjustmentForm, type: 'bonus'})}
                    variant={adjustmentForm.type === 'bonus' ? 'default' : 'outline'}
                    className={`rounded-xl gap-2 font-black ${adjustmentForm.type === 'bonus' ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' : ''}`}
                  >
                    <Plus className="w-4 h-4" /> مكافأة
                  </Button>
                  <Button 
                    onClick={() => setAdjustmentForm({...adjustmentForm, type: 'deduction'})}
                    variant={adjustmentForm.type === 'deduction' ? 'default' : 'outline'}
                    className={`rounded-xl gap-2 font-black ${adjustmentForm.type === 'deduction' ? 'bg-rose-600 hover:bg-rose-700 text-white border-none' : ''}`}
                  >
                    <Minus className="w-4 h-4" /> خصم
                  </Button>
                  <Button 
                    onClick={() => setAdjustmentForm({...adjustmentForm, type: 'custody_deposit'})}
                    variant={adjustmentForm.type === 'custody_deposit' ? 'default' : 'outline'}
                    className={`rounded-xl gap-2 font-black ${adjustmentForm.type === 'custody_deposit' ? 'bg-sky-600 hover:bg-sky-700 text-white border-none' : ''}`}
                  >
                    <Plus className="w-4 h-4" /> إيداع عهدة
                  </Button>
                  <Button 
                    onClick={() => setAdjustmentForm({...adjustmentForm, type: 'purchase_expense'})}
                    variant={adjustmentForm.type === 'purchase_expense' ? 'default' : 'outline'}
                    className={`rounded-xl gap-2 font-black ${adjustmentForm.type === 'purchase_expense' ? 'bg-amber-600 hover:bg-amber-700 text-white border-none' : ''}`}
                  >
                    <Minus className="w-4 h-4" /> مصروف عهدة
                  </Button>
               </div>
             )}
             
             <div className="space-y-2">
                <Label>المبلغ (ر.س)</Label>
                <Input 
                  type="number" 
                  value={adjustmentForm.type === 'loan' ? loanForm.amount : adjustmentForm.amount} 
                  onChange={(e) => adjustmentForm.type === 'loan' ? setLoanForm({...loanForm, amount: e.target.value}) : setAdjustmentForm({...adjustmentForm, amount: e.target.value})} 
                  placeholder="0.00" 
                  className="rounded-xl" 
                />
             </div>
             <div className="space-y-2">
                <Label>{adjustmentForm.type === 'loan' ? 'سبب طلب السلفة' : 'السبب / المبرر'}</Label>
                <Input 
                  value={adjustmentForm.type === 'loan' ? loanForm.reason : adjustmentForm.reason} 
                  onChange={(e) => adjustmentForm.type === 'loan' ? setLoanForm({...loanForm, reason: e.target.value}) : setAdjustmentForm({...adjustmentForm, reason: e.target.value})} 
                  placeholder={adjustmentForm.type === 'loan' ? "لماذا تحتاج السلفة؟" : "مثلاً: تأخير متكرر / عمل إضافي..."} 
                  className="rounded-xl" 
                />
             </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={adjustmentForm.type === 'loan' ? handleRequestLoan : handleAddAdjustment} 
              disabled={isSubmitting} 
              className="w-full h-11 rounded-xl font-black bg-primary"
            >
               {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (adjustmentForm.type === 'loan' ? 'إرسال طلب السلفة' : 'اعتماد الحركة المالية')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Special Request Dialog */}
      <Dialog open={isSpecialRequestDialogOpen} onOpenChange={setIsSpecialRequestDialogOpen}>
        <DialogContent className="sm:max-w-[425px] text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary">رفع طلب خاص للإدارة</DialogTitle>
            <DialogDescription>سيصل طلبك مباشرة للمدير العام للمراجعة.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>محتوى الطلب</Label>
              <Input 
                value={specialRequestContent}
                onChange={(e) => setSpecialRequestContent(e.target.value)}
                placeholder="اكتب طلبك هنا بالتفصيل..."
                className="h-24 rounded-xl text-right"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleAddSpecialRequest}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-zinc-800 hover:bg-black font-black"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال الطلب الآن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 text-right" dir="rtl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-primary">إضافة هدف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-2 block">عنوان الهدف</label>
              <Input 
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder="مثال: تسليم 10 تصاميم..."
                className="h-12 rounded-xl text-right"
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block">اللون المميز</label>
              <div className="flex gap-2">
                {['bg-primary', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'].map(c => (
                  <button
                    key={c}
                    onClick={() => setGoalForm({ ...goalForm, color: c })}
                    className={`w-8 h-8 rounded-full ${c} ${goalForm.color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              onClick={handleAddGoal}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-primary hover:bg-black font-black text-white"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ الهدف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Dialog */}
      <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 text-right" dir="rtl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-primary">إضافة تقييم الأداء الشهري</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold mb-2 block">التقييم (من 100)</label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={performanceForm.score}
                onChange={(e) => setPerformanceForm({ ...performanceForm, score: Number(e.target.value) })}
                className="h-12 rounded-xl text-right"
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block">الشهر المستهدف</label>
              <Input 
                type="month"
                value={performanceForm.month}
                onChange={(e) => setPerformanceForm({ ...performanceForm, month: e.target.value })}
                className="h-12 rounded-xl text-right"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              onClick={handleAddPerformance}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 font-black text-white"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التقييم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Internal Chat Dialog */}
      <Dialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 text-right" dir="rtl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              إصدار إنذار إداري
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">نوع الإنذار</Label>
              <Select value={warningForm.type} onValueChange={(val) => setWarningForm({...warningForm, type: val})}>
                <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="اختر نوع الإنذار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="لفت نظر">لفت نظر (إنذار شفهي)</SelectItem>
                  <SelectItem value="إنذار كتابي أول">إنذار كتابي أول</SelectItem>
                  <SelectItem value="إنذار كتابي نهائي">إنذار كتابي نهائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">سبب الإنذار والتفاصيل</Label>
              <textarea 
                value={warningForm.reason}
                onChange={e => setWarningForm({...warningForm, reason: e.target.value})}
                placeholder="اكتب أسباب وتفاصيل الإنذار والمخالفة المرتكبة..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={handleIssueWarning} disabled={isSubmitting || !warningForm.reason} className="w-full h-11 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-white">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'اعتماد الإنذار'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isJustificationDialogOpen} onOpenChange={setIsJustificationDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6 text-right" dir="rtl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تقديم تبرير دوام
            </DialogTitle>
            <DialogDescription className="text-xs font-bold">
              يرجى توضيح سبب التأخير أو الغياب ليتم مراجعته من الإدارة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">التاريخ المرتبط بالتأخير أو الغياب</Label>
              <Input 
                type="date"
                value={justificationForm.date}
                onChange={e => setJustificationForm({...justificationForm, date: e.target.value})}
                className="rounded-xl h-11 bg-slate-50 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">نص التبرير</Label>
              <textarea 
                value={justificationForm.reason}
                onChange={e => setJustificationForm({...justificationForm, reason: e.target.value})}
                placeholder="اكتب سبب التأخير أو الغياب بالتفصيل هنا..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button onClick={handleSubmitJustification} disabled={isSubmitting || !justificationForm.reason} className="w-full h-11 rounded-xl bg-primary hover:bg-black font-black text-white">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إرسال للإدارة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0 overflow-hidden text-right rounded-3xl" dir="rtl">
          <DialogHeader className="p-6 bg-slate-50 border-b shrink-0">
            <DialogTitle className="text-xl font-black text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              المحادثة الداخلية: {profile?.uid === employeeId ? "أرشيف رسائلك" : employee?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">تواصل مباشر وآمن بين المشرفين والإدارة بشكل لحظي.</DialogDescription>
          </DialogHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="text-4xl">💬</span>
                <p className="text-xs font-bold">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId === profile?.uid;
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 ${
                        isMe 
                          ? 'bg-violet-600 text-white rounded-tl-none' 
                          : 'bg-white text-slate-800 border rounded-tr-none'
                      }`}
                    >
                      <p className="font-bold leading-relaxed break-words">{msg.message}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[9px] text-slate-400 font-bold">
                        {msg.senderName} • {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                      </span>
                      {isMe && (
                        <div className="flex items-center">
                          {msg.status === 'read' ? (
                            <span className="text-sky-400 font-black text-[11px]" title="مقروءة">✓✓</span>
                          ) : msg.createdAt ? (
                            <span className="text-slate-300 font-black text-[11px]" title="مستلمة">✓✓</span>
                          ) : (
                            <span className="text-slate-300 font-black text-[11px]" title="جاري الإرسال">✓</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2 items-center shrink-0">
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 h-12 rounded-xl text-right border-slate-200 focus-visible:ring-violet-600"
            />
            <Button 
              type="submit" 
              className="h-12 px-6 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-xl shadow-md transition-all active:scale-95 text-xs"
            >
              إرسال
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttendanceStatCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="p-4 rounded-2xl border-slate-100 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-slate-50 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
        <p className="text-xl font-black text-primary">{value} <span className="text-xs font-normal">أيام</span></p>
      </div>
    </Card>
  );
}

function GoalItem({ title, progress, color = 'bg-primary', canEdit = false, onUpdate }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span>{title}</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      {canEdit ? (
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress} 
          onChange={(e) => onUpdate?.(Number(e.target.value))}
          className="w-full accent-primary h-2 bg-slate-100 rounded-full appearance-none outline-none cursor-pointer"
        />
      ) : (
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">{label}</label>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function DocumentCard({ title, number, expiry, image, icon: Icon }: any) {
  const isExpired = expiry && new Date(expiry) < new Date();
  
  return (
    <Card className={`rounded-2xl border-border overflow-hidden transition-all hover:shadow-md ${isExpired ? 'border-red-200 bg-red-50/10' : ''}`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl shadow-sm ${isExpired ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-primary'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h4 className="font-black text-primary leading-tight">{title}</h4>
              <div className="flex flex-col gap-0.5 mt-0.5">
                {number && <p className="text-[10px] font-bold text-primary/60">رقم: {number}</p>}
                <p className={`text-[11px] font-bold ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                  {expiry ? `ينتهي في: ${expiry}` : 'تاريخ الصلاحية غير متوفر'}
                </p>
              </div>
            </div>
          </div>
          {isExpired && (
            <Badge variant="destructive" className="text-[9px] font-black animate-pulse">منتهية</Badge>
          )}
        </div>
        
        {image ? (
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 group">
            <img src={image} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Button variant="secondary" size="sm" className="rounded-lg gap-2 font-bold" onClick={() => window.open(image, '_blank')}>
                 <Activity className="w-4 h-4" />
                 عرض الحجم الكامل
               </Button>
            </div>
          </div>
        ) : (
          <div className="aspect-[16/9] rounded-xl bg-slate-50 border border-dashed flex flex-col items-center justify-center gap-2 text-slate-300">
            <Icon className="w-8 h-8 opacity-20" />
            <span className="text-[10px] font-bold">بانتظار الرفع</span>
          </div>
        )}
      </div>
    </Card>
  );
}
