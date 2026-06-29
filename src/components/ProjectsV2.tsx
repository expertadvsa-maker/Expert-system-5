import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Plus, 
  Download,
  Target,
  Clock,
  Search,
  Grid,
  List,
  LayoutGrid,
  Trello,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  User,
  AlertCircle,
  Loader2,
  Paperclip,
  UploadCloud,
  Trash2,
  UsersRound,
  Lock,
  Layers,
  Receipt,
  Globe,
  HardHat
} from 'lucide-react';
import { parseProjectFromText, analyzeProjectDocument } from '../lib/gemini';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fetchAliphiaClients } from '../lib/aliphia';
import { sendWhatsappMessage } from '../lib/whatsapp';
import AliphiaClientSelector from './AliphiaClientSelector';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { toast } from 'sonner';
import { Project, UserProfile } from '../types';
import { useAuth } from '../lib/AuthContext';
import ProjectViewV2 from './ProjectViewV2';
import SmartSpecsWizard from './ProjectWizard/SmartSpecsWizard';
import QuotationImporter from './ProjectWizard/QuotationImporter';
import { motion, AnimatePresence } from 'motion/react';
import { calculateProjectProgress } from '../lib/projectUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function ProjectsV2({ viewModeType = 'projects' }: { viewModeType?: 'projects' | 'tasks' }) {

  const { profile, activeCompanyId } = useAuth();
  const isOwner = profile?.email?.toLowerCase().trim() === 'expertadvsa@gmail.com';

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Task specific states
  const [taskViewMode, setTaskViewMode] = useState<'grid' | 'kanban'>('kanban');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'review-requested'>('all');
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [creationMode, setCreationMode] = useState<'manual' | 'auto' | 'hybrid' | null>(null);
  const [showSpecsInAuto, setShowSpecsInAuto] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<Record<string, boolean>>({});

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [aliphiaClientsList, setAliphiaClientsList] = useState<{ id: string; name: string; phone: string; email: string; }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [selectedAliphiaClientId, setSelectedAliphiaClientId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<{ id: string; file: File; progress: number; status: 'pending' | 'uploading' | 'success' | 'error'; url?: string; }[]>([]);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);

  const [detailsDialog, setDetailsDialog] = useState<{
    isOpen: boolean;
    type: 'delayed' | 'portal' | 'workers' | 'active' | 'planning' | 'completed';
    title: string;
  } | null>(null);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    budget: 0,
    projectValue: 0,
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientPin: Math.floor(100000 + Math.random() * 900000).toString(),
    sendClientCreds: true,
    locationLink: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    projectType: 'hoardings',
    supervisor: '',
    contractNumber: '',
    engOffice: '',
    totalArea: '',
    projectStatus: 'planning',
    assignedEmployees: [] as string[]
  });

  // Fetch Firestore users and Aliphia clients
  useEffect(() => {
    // Firestore users
    const qUsers = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubUsers = onSnapshot(qUsers, async (snap) => {
      try {
        const leavesSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'approved')));
        const today = new Date().toISOString().split('T')[0];
        const activeLeavesUserIds = new Set(
          leavesSnap.docs
            .map(d => d.data())
            .filter(l => l.startDate <= today && l.endDate >= today)
            .map(l => l.userId)
        );

        setUsersList(snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
          .filter(user => !activeLeavesUserIds.has(user.id) && !activeLeavesUserIds.has(user.uid))
        );
      } catch (err) {
        console.error("Failed to load users", err);
      }
    }, (err) => {
      console.error("Failed to load users", err);
    });

    // Aliphia clients
    setIsLoadingClients(true);
    fetchAliphiaClients().then(clients => {
      setAliphiaClientsList(clients);
    }).catch(err => {
      console.error("Failed to load Aliphia clients", err);
    }).finally(() => {
      setIsLoadingClients(false);
    });

    return () => {
      unsubUsers();
    };
  }, []);

  // إعادة تهيئة النموذج عند إغلاق النافذة
  useEffect(() => {
    if (!isAddOpen) {
      setActiveStep(1);
      setCreationMode(null);
      setShowSpecsInAuto(false);
      setAiInputText('');
      setHighlightedFields({});
      setSelectedFiles([]);
      setIsSavingProject(false);
      setAnalyzingFileId(null);
    }
  }, [isAddOpen]);

  const handleAiAutofill = async () => {
    if (!aiInputText.trim()) {
      toast.error("يرجى إدخال تفاصيل المشروع أولاً ليتم تحليلها");
      return;
    }
    
    setIsAiParsing(true);
    const toastId = toast.loading("جاري تحليل النص بالذكاء الاصطناعي وتعبئة الحقول...");
    
    try {
      const extracted = await parseProjectFromText(aiInputText);
      if (extracted) {
        setNewProject(prev => ({
          ...prev,
          title: extracted.title || prev.title,
          description: extracted.description || prev.description,
          budget: extracted.budget || prev.budget,
          projectValue: extracted.projectValue || prev.projectValue,
          clientName: extracted.clientName || prev.clientName,
          clientPhone: extracted.clientPhone || prev.clientPhone,
          clientEmail: extracted.clientEmail || prev.clientEmail,
          locationLink: extracted.locationLink || prev.locationLink,
          startDate: extracted.startDate || prev.startDate,
          endDate: extracted.endDate || prev.endDate,
          projectType: extracted.projectType || prev.projectType,
          supervisor: extracted.supervisor || prev.supervisor,
          contractNumber: extracted.contractNumber || prev.contractNumber,
          engOffice: extracted.engOffice || prev.engOffice,
          totalArea: extracted.totalArea || prev.totalArea,
        }));

        // محاولة مطابقة اسم العميل مع قائمة العملاء الحالية في ألف ياء
        if (extracted.clientName) {
          const matchedClient = aliphiaClientsList.find(c => 
            c.name.toLowerCase().trim() === extracted.clientName.toLowerCase().trim()
          );
          if (matchedClient) {
            setSelectedAliphiaClientId(matchedClient.id);
            toast.success(`تم مطابقة العميل تلقائياً مع ألف ياء: ${matchedClient.name}`);
          }
        }

        // تحديد الحقول التي تم تعبئتها للإضاءة البصرية
        const highlights: Record<string, boolean> = {};
        Object.keys(extracted).forEach((key) => {
          if ((extracted as any)[key] !== undefined && (extracted as any)[key] !== null && (extracted as any)[key] !== '') {
            highlights[key] = true;
          }
        });
        setHighlightedFields(highlights);
        toast.dismiss(toastId);
        toast.success("تم استخراج البيانات وتعبئة الحقول بنجاح! ✨");
        
        // إيقاف الإضاءة بعد 4 ثوانٍ
        setTimeout(() => {
          setHighlightedFields({});
        }, 4000);
      } else {
        toast.dismiss(toastId);
        toast.error("لم نتمكن من استخراج تفاصيل المشروع. يرجى توضيح النص أكثر.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error(err.message || "فشلت عملية التعبئة التلقائية بالذكاء الاصطناعي");
    } finally {
      setIsAiParsing(false);
    }
  };

  // Phone validation: Saudi mobile format 05xxxxxxxx, 9665xxxxxxxx, +9665xxxxxxxx
  const validatePhone = (phone: string) => {
    if (!phone) return true;
    return /^(05|9665|\+9665)\d{8}$/.test(phone.trim());
  };

  // Location validation: Google Maps link
  const validateLocationLink = (link: string) => {
    if (!link) return false;
    return /^(https?:\/\/)?(www\.)?(google\.\w+\/maps|maps\.google\.\w+|maps\.app\.goo\.gl|goo\.gl\/maps)/.test(link.trim());
  };

  // Get missing requirements for active step
  const getMissingRequirements = (): string[] => {
    const reqs: string[] = [];
    if (activeStep === 1) {
      if (!creationMode) {
        reqs.push("يرجى اختيار أحد الأنماط للبدء بتأسيس المشروع (تلقائي، يدوي، أو هجين)");
      }
    } else if (creationMode === 'auto') {
      if (activeStep === 2) {
        if (!newProject.title && !newProject.clientName && !newProject.description) {
          reqs.push("يرجى استيراد عرض سعر، أو رفع صورة، أو لصق نص لتحليله بالذكاء الاصطناعي");
        }
      } else if (activeStep === 3) {
        if (!newProject.title) {
          reqs.push("عنوان المشروع مطلوب");
        }
        if (!newProject.clientName) {
          reqs.push("اسم العميل مطلوب (يرجى اختياره أو كتابته)");
        }
        if (!newProject.clientPhone) {
          reqs.push("رقم جوال العميل مطلوب لضمان التواصل والترحيب بالواتساب");
        } else {
          const cleanPhone = newProject.clientPhone.replace(/[\s\-\(\)]/g, '');
          if (/^(?:\+?966|0)?1\d{8}$/.test(cleanPhone)) {
            reqs.push("رقم الهاتف المدخل ثابت (أرضي) - يرجى إدخال جوال صالح يبدأ بـ 05 لتصله رسائل الواتساب الترحيبية");
          } else if (!/^(?:\+?966|0)?5\d{8}$/.test(cleanPhone)) {
            reqs.push("صيغة رقم الجوال غير صالحة - يجب أن يتكون من 10 أرقام ويبدأ بـ 05");
          }
        }
        if (!newProject.locationLink || !validateLocationLink(newProject.locationLink)) {
          reqs.push("رابط موقع المشروع الجغرافي مطلوب (يجب أن يكون رابط خرائط جوجل صالح)");
        }
        if (!newProject.supervisor) {
          reqs.push("يرجى اختيار المشرف المسؤول عن المشروع");
        }
      }
    } else if (creationMode === 'manual') {
      if (activeStep === 2) {
        if (!newProject.title) {
          reqs.push("عنوان المشروع مطلوب");
        }
        if (!newProject.clientName) {
          reqs.push("اسم العميل مطلوب (يرجى اختياره أو كتابته)");
        }
        if (!newProject.clientPhone) {
          reqs.push("رقم جوال العميل مطلوب لضمان التواصل والترحيب بالواتساب");
        } else {
          const cleanPhone = newProject.clientPhone.replace(/[\s\-\(\)]/g, '');
          if (/^(?:\+?966|0)?1\d{8}$/.test(cleanPhone)) {
            reqs.push("رقم الهاتف المدخل ثابت (أرضي) - يرجى إدخال جوال صالح يبدأ بـ 05 لتصله رسائل الواتساب الترحيبية");
          } else if (!/^(?:\+?966|0)?5\d{8}$/.test(cleanPhone)) {
            reqs.push("صيغة رقم الجوال غير صالحة - يجب أن يتكون من 10 أرقام ويبدأ بـ 05");
          }
        }
        if (!newProject.locationLink || !validateLocationLink(newProject.locationLink)) {
          reqs.push("رابط موقع المشروع الجغرافي مطلوب (يجب أن يكون رابط خرائط جوجل صالح)");
        }
      } else if (activeStep === 4) {
        if (!newProject.supervisor) {
          reqs.push("يرجى اختيار المشرف المسؤول عن المشروع");
        }
      }
    } else if (creationMode === 'hybrid') {
      if (activeStep === 2) {
        if (!newProject.title && !newProject.clientName && !newProject.description) {
          reqs.push("يرجى استيراد عرض سعر، أو رفع صورة، أو لصق نص لتحليله بالذكاء الاصطناعي");
        }
      } else if (activeStep === 3) {
        if (!newProject.title) {
          reqs.push("عنوان المشروع مطلوب");
        }
        if (!newProject.clientName) {
          reqs.push("اسم العميل مطلوب (يرجى اختياره أو كتابته)");
        }
        if (!newProject.clientPhone) {
          reqs.push("رقم جوال العميل مطلوب لضمان التواصل والترحيب بالواتساب");
        } else {
          const cleanPhone = newProject.clientPhone.replace(/[\s\-\(\)]/g, '');
          if (/^(?:\+?966|0)?1\d{8}$/.test(cleanPhone)) {
            reqs.push("رقم الهاتف المدخل ثابت (أرضي) - يرجى إدخال جوال صالح يبدأ بـ 05 لتصله رسائل الواتساب الترحيبية");
          } else if (!/^(?:\+?966|0)?5\d{8}$/.test(cleanPhone)) {
            reqs.push("صيغة رقم الجوال غير صالحة - يجب أن يتكون من 10 أرقام ويبدأ بـ 05");
          }
        }
        if (!newProject.locationLink || !validateLocationLink(newProject.locationLink)) {
          reqs.push("رابط موقع المشروع الجغرافي مطلوب (يجب أن يكون رابط خرائط جوجل صالح)");
        }
      } else if (activeStep === 5) {
        if (!newProject.supervisor) {
          reqs.push("يرجى اختيار المشرف المسؤول عن المشروع");
        }
      }
    }
    return reqs;
  };


  const handleAnalyzeFile = async (fileId: string) => {
    const item = selectedFiles.find(f => f.id === fileId);
    if (!item) return;

    setAnalyzingFileId(fileId);
    const toastId = toast.loading(`جاري تحليل الملف "${item.file.name}" بالذكاء الاصطناعي...`);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(item.file);
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const result = await analyzeProjectDocument(dataUrl, item.file.type);
          if (result) {
            setNewProject(prev => ({
              ...prev,
              title: result.title || prev.title,
              description: result.description || prev.description,
              budget: result.budget || prev.budget,
              projectValue: result.projectValue || prev.projectValue,
              clientName: result.clientName || prev.clientName,
              clientPhone: result.clientPhone || prev.clientPhone,
              clientEmail: result.clientEmail || prev.clientEmail,
              startDate: result.startDate || prev.startDate,
              endDate: result.endDate || prev.endDate,
              projectType: result.projectType || prev.projectType,
              totalArea: result.totalArea || prev.totalArea,
              contractNumber: result.contractNumber || prev.contractNumber,
            }));

            // تحديد الحقول التي تم تعبئتها للإضاءة البصرية
            const highlights: Record<string, boolean> = {};
            Object.keys(result).forEach((key) => {
              if ((result as any)[key] !== undefined && (result as any)[key] !== null && (result as any)[key] !== '') {
                highlights[key] = true;
              }
            });
            setHighlightedFields(highlights);

            toast.dismiss(toastId);
            toast.success("✨ تم تحليل مستند المشروع بنجاح وتعبئة الحقول بالقيم المستخرجة!");

            // إيقاف الإضاءة بعد 4 ثوانٍ
            setTimeout(() => {
              setHighlightedFields({});
            }, 4000);
          } else {
            toast.dismiss(toastId);
            toast.error("تعذر استخراج البيانات من هذا المستند. يرجى توضيح محتوى الملف أو تعبئته يدوياً.");
          }
        } catch (innerErr: any) {
          toast.dismiss(toastId);
          toast.error(innerErr.message || "فشل تحليل المستند بالذكاء الاصطناعي.");
        } finally {
          setAnalyzingFileId(null);
        }
      };
      reader.onerror = () => {
        toast.dismiss(toastId);
        toast.error("فشل قراءة الملف محلياً.");
        setAnalyzingFileId(null);
      };
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء قراءة أو تحليل الملف.");
      setAnalyzingFileId(null);
    }
  };

  // دالة توليد المراحل الذكية المتكيفة بحسب نوع عمل مقاولة الدعاية والإعلان
  const getDynamicMilestones = (projectType: string, startDate?: string, endDate?: string) => {
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || '';

    switch (projectType) {
      case 'fence_shinko':
      case 'hoardings':
        return [
          { title: 'مخططات وتخطيط مسار السور الشينكو المؤقت', weight: 15, status: 'pending' as const, date: start },
          { title: 'تجهيز وتوريد الأعمدة الحديدية وصاج الشينكو المضلع', weight: 30, status: 'pending' as const, date: '' },
          { title: 'حفر حفر القواعد وصب الخرسانة للأعمدة وتثبيتها', weight: 25, status: 'pending' as const, date: '' },
          { title: 'تركيب وشد صاج الشينكو وربطه بالبراغي المجلفنة', weight: 15, status: 'pending' as const, date: '' },
          { title: 'تسليم الموقع ومعاينة سلامة السور الهندسية الميدانية', weight: 15, status: 'pending' as const, date: end }
        ];
      case 'fence_commercial':
        return [
          { title: 'تصميم ومطابقة الهوية البصرية وإعداد بروفات الكلادينج/البنر الخشبي', weight: 15, status: 'pending' as const, date: start },
          { title: 'تصنيع شاسيهات الحديد للهيكل وتثبيت ألواح الخشب/الأسمنت بورد', weight: 35, status: 'pending' as const, date: '' },
          { title: 'أعمال كسوة السور (طباعة بنر مشدود أو ألواح كلادينج تجاري عالي الجودة)', weight: 25, status: 'pending' as const, date: '' },
          { title: 'توصيل التمديدات الكهربائية لبروجيكتورات كشافات الإضاءة علوياً وتجربتها', weight: 10, status: 'pending' as const, date: '' },
          { title: 'المعاينة النهائية والتسليم الفني المعتمد للبلدية والعميل للبدء بالموقع', weight: 15, status: 'pending' as const, date: end }
        ];
      case 'fence_chainlink':
        return [
          { title: 'تخطيط مسار سور الشبك وحساب المسافات للأعمدة وزوايا الدعم الإنشائية', weight: 15, status: 'pending' as const, date: start },
          { title: 'تأسيس وصب القواعد الخرسانية الميدانية وتثبيت القوائم والمواسير الحاملة', weight: 30, status: 'pending' as const, date: '' },
          { title: 'شد وتمديد سلك الشبك والوايرات الفولاذية المانعة للارتخاء وسقوط الشبك', weight: 30, status: 'pending' as const, date: '' },
          { title: 'تركيب البوابات وملحقات الأسلاك الشائكة والحلزونية (الكونسرتينا) العلوية للأمان', weight: 15, status: 'pending' as const, date: '' },
          { title: 'التسليم الإنشائي الفني والنهائي لكامل مسار السور الشبك', weight: 10, status: 'pending' as const, date: end }
        ];
      case 'signage_printing':
        return [
          { title: 'تصميم بروفا الواجهة ومطابقة الأبعاد والخطوط والموافقة الفنية للعميل', weight: 15, status: 'pending' as const, date: start },
          { title: 'طباعة الفليكس/البنر بالدقة الفائقة وتجهيز صناديق حديد اللوحة والشد المائي', weight: 35, status: 'pending' as const, date: '' },
          { title: 'تركيب موديولات إضاءة الـ LED الداخلية الفاخرة والتوصيلات الكهربائية المقاومة للحرارة', weight: 20, status: 'pending' as const, date: '' },
          { title: 'النقل للموقع والتركيب الميداني بالرافعات والكرين على الواجهة أو العمود المخصص', weight: 20, status: 'pending' as const, date: '' },
          { title: 'اختبار تشغيل الإضاءة الخلفية للوحة والتسليم النهائي والمعاينة', weight: 10, status: 'pending' as const, date: end }
        ];
      case 'cladding_letters':
        return [
          { title: 'تصميم البروفا ثلاثية الأبعاد (3D) واعتماد ألوان كسوة الكلادينج وتوزيع الحروف', weight: 15, status: 'pending' as const, date: start },
          { title: 'تفصيل وتقطيع ألواح الكلادينج بماكينة الـ CNC وتصنيع مجسمات الحروف البارزة (اكريليك/زنكور)', weight: 30, status: 'pending' as const, date: '' },
          { title: 'تثبيت تيوبات حديد الواجهة الحاملة وعمل الكسوة الخارجية للكلادينج بالفواصل والسيليكون', weight: 25, status: 'pending' as const, date: '' },
          { title: 'زرع الحروف البارزة المضيئة وتوصيل ترانسات ومحولات الطاقة مع تمديد قواطع الأمان', weight: 15, status: 'pending' as const, date: '' },
          { title: 'التسليم الفني لجماليات الواجهة وإصدار شهادة ضمان التركيبات للعميل', weight: 15, status: 'pending' as const, date: end }
        ];
      case 'digital_screens':
        return [
          { title: 'تصميم مخططات الأحمال الإنشائية وهندسة الطاقة وتخطيط فتحات التهوية والتبريد الذاتية', weight: 15, status: 'pending' as const, date: start },
          { title: 'بناء وتجهيز شاسيه الحديد الحامل الرئيسي للشاشة وتثبيته وتأمين اتزانه بالموقع الميداني', weight: 25, status: 'pending' as const, date: '' },
          { title: 'تجميع كبائن الشاشة (LED Cabinets) وتوصيل بطاقات المرسل والمستقبل وكابلات الإشارة الفنية', weight: 30, status: 'pending' as const, date: '' },
          { title: 'التوصيل بالإنترنت واختبار البث المستمر ومعايرة السطوع ومقاومة الشمس لـ 24 ساعة', weight: 15, status: 'pending' as const, date: '' },
          { title: 'تدريب العميل على استخدام لوحة تحكم تشغيل وبرمجة المحتوى الإعلاني للشاشة والتسليم الفني', weight: 15, status: 'pending' as const, date: end }
        ];
      case 'exhibition_booths':
        return [
          { title: 'إعداد المخططات ثلاثية الأبعاد (3D Booth Design) واعتمادها رسمياً من إدارة المعرض والمشرفين', weight: 20, status: 'pending' as const, date: start },
          { title: 'تصنيع أخشاب الجدران والأرضيات والمنصات وبناء ديكورات الأجنحة الفنية بالورش والنجارة المخصصة', weight: 30, status: 'pending' as const, date: '' },
          { title: 'التركيب الميداني السريع لجدران وأرضيات البوث وتمديد الإضاءات الديكورية والسبوتات الفاخرة', weight: 25, status: 'pending' as const, date: '' },
          { title: 'تنفيذ المطبوعات والهويات الإعلانية وأعمال الـ Branding والملصقات الفنية على جدران البوث والـ Popups', weight: 15, status: 'pending' as const, date: '' },
          { title: 'تجهيز شاشات العرض التفاعلية والأثاث المكتبي وفحص اللمسات الأخيرة والتسليم قبل انطلاق المعرض', weight: 10, status: 'pending' as const, date: end }
        ];
      case 'wrapping_branding':
        return [
          { title: 'تصميم ومطابقة مقاسات وانحناءات المركبة بدقة وإصدار بروفا التغليف واعتمادها من العميل', weight: 20, status: 'pending' as const, date: start },
          { title: 'طباعة ملصقات الفينيل عالي الجودة والمقاوم للعوامل الجوية مع معالجة حماية التصفيح (Lamination)', weight: 30, status: 'pending' as const, date: '' },
          { title: 'تجهيز وصنفرة وتنظيف أسطح وجسم المركبة بالمذيبات والمواد الكيميائية لضمان تماسك الفينيل الكامل', weight: 15, status: 'pending' as const, date: '' },
          { title: 'قص وتركيب ولصق الفينيل حرارياً بدقة على كامل هيكل المركبة وزوايا الأبواب والمقابض والمرايا', weight: 25, status: 'pending' as const, date: '' },
          { title: 'فحص الحواف البصرية والتأكد من مطابقة الخطوط الجمالية للهوية وسد الثغرات والتسليم النهائي للعميل', weight: 10, status: 'pending' as const, date: end }
        ];
      case 'maintenance':
        return [
          { title: 'تخطيط خطة الصيانة الوقائية والتشخيص الفني المبدئي للأعطال واللوحات بالموقع', weight: 15, status: 'pending' as const, date: start },
          { title: 'تأمين قطع الغيار اللازمة (محولات طاقة، كروت شاشات، موديولات، كشافات، تمديدات كهربائية متينة)', weight: 30, status: 'pending' as const, date: '' },
          { title: 'النزول الميداني للفرقة الفنية واستبدال القطع التالفة وإصلاح الأعطال واختبار المقاومة', weight: 30, status: 'pending' as const, date: '' },
          { title: 'اختبار تشغيل مستمر للوحة/الشاشة والتأكد من موازنة استهلاك الكهرباء وعدم زيادة الأحمال', weight: 15, status: 'pending' as const, date: '' },
          { title: 'إمضاء تقرير الصيانة الفني والاعتماد والضمان للعميل لإعادة التشغيل الآمن', weight: 10, status: 'pending' as const, date: end }
        ];
      case 'megastructures':
        return [
          { title: 'التصميم الهندسي والمخططات الإنشائية الهيكلية وحسابات مقاومة الرياح الشديدة والأوزان الضخمة', weight: 15, status: 'pending' as const, date: start },
          { title: 'تفصيل وصياغة الهيكل الحديدي الثقيل والأقسام الجمالية بالورش واللحام الفني المعتمد والمقاوم للصدأ', weight: 30, status: 'pending' as const, date: '' },
          { title: 'صب وتجهيز القواعد الخرسانية الأرضية المسلحة والبلتات والبراغي الإنشائية الكبيرة بالموقع لتثبيت الهيكل', weight: 25, status: 'pending' as const, date: '' },
          { title: 'التركيب الميداني للأجزاء والمجسمات بالرافعات الثقيلة (الكرينات) والربط الهيكلي الآمن والاختبار الزلزالي', weight: 15, status: 'pending' as const, date: '' },
          { title: 'أعمال التشطيب الجمالي والدهانات الخارجية المقاومة للشمس والإضاءة المسرحية والتسليم النهائي الفني', weight: 15, status: 'pending' as const, date: end }
        ];
      default:
        return [
          { title: 'التصميم وإعداد المخططات الفنية والتوافق مع العميل', weight: 15, status: 'pending' as const, date: start },
          { title: 'تجهيز وتوريد المواد وتصنيع الهياكل الإنشائية', weight: 30, status: 'pending' as const, date: '' },
          { title: 'أعمال الطباعة أو الكلادينج أو تركيب الشاشات المطلوبة للمشروع', weight: 25, status: 'pending' as const, date: '' },
          { title: 'التوصيلات الكهربائية والإضاءة وتجربة الأمان والتشغيل الفني', weight: 15, status: 'pending' as const, date: '' },
          { title: 'التركيب الميداني النهائي والتسليم الرسمي للعميل بالموقع', weight: 15, status: 'pending' as const, date: end }
        ];
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title) {
      toast.error("يرجى إدخال عنوان المشروع");
      return;
    }

    if (!newProject.locationLink || !validateLocationLink(newProject.locationLink)) {
      toast.error("يرجى إدخال وتصحيح رابط موقع المشروع (يجب أن يكون رابطاً صالحاً لخرائط جوجل)");
      return;
    }
    
    if (!newProject.clientPhone && !newProject.clientEmail) {
      toast.error("عذراً، لا يمكن إضافة مشروع لعميل لا يمتلك رقم جوال أو بريد إلكتروني مسجل في النظام");
      return;
    }

    setIsSavingProject(true);
    const toastId = toast.loading("جاري رفع المرفقات وحفظ بيانات المشروع في النظام...");

    // توليد المراحل الذكية المتكيفة بحسب نوع عمل مقاولة الدعاية والإعلان بدلاً من التثبيت اليدوي العقيم
    const defaultMilestones = getDynamicMilestones(newProject.projectType, newProject.startDate, newProject.endDate);

    // توليد الجدولة التلقائية للدفعات المالية لتوفير الجهد على المحاسبين والمديرين
    let defaultPayments: any[] = [];
    if (newProject.projectValue > 0) {
      const start = newProject.startDate || new Date().toISOString().split('T')[0];
      const end = newProject.endDate || '';
      
      // حساب مواعيد الاستحقاق التقريبية للدفعات
      let midDate = '';
      if (end) {
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const midTime = startTime + (endTime - startTime) / 2;
        midDate = new Date(midTime).toISOString().split('T')[0];
      } else {
        const tempDate = new Date(start);
        tempDate.setDate(tempDate.getDate() + 10);
        midDate = tempDate.toISOString().split('T')[0];
      }
      
      const finalDate = end || (() => {
        const tempDate = new Date(start);
        tempDate.setDate(tempDate.getDate() + 20);
        return tempDate.toISOString().split('T')[0];
      })();

      defaultPayments = [
        {
          id: Math.random().toString(36).substr(2, 9),
          amount: Math.round(newProject.projectValue * 0.50), // 50% مقدم
          dueDate: start,
          status: 'pending' as const,
          description: 'الدفعة الأولى: دفعة مقدمة 50% لبدء تأمين وتجهيز المواد في الورشة'
        },
        {
          id: Math.random().toString(36).substr(2, 9),
          amount: Math.round(newProject.projectValue * 0.40), // 40% عند الجاهزية
          dueDate: midDate,
          status: 'pending' as const,
          description: 'الدفعة الثانية: دفعة تصنيع وشحن 40% عند جاهزية المواد وقبل المباشرة بالتركيب الميداني'
        },
        {
          id: Math.random().toString(36).substr(2, 9),
          amount: Math.round(newProject.projectValue * 0.10), // 10% عند التسليم
          dueDate: finalDate,
          status: 'pending' as const,
          description: 'الدفعة الثالثة: دفعة ختامية 10% عند إتمام التسليم النهائي وتوقيع إقرار الاستلام'
        }
      ];
    }

    try {
      // 1. توليد معرّف فريد للمشروع أولاً لتخزين مرفقاته في مجلد خاص به
      const projectRef = doc(collection(db, 'projects'));
      const projectId = projectRef.id;

      const photoUrls: string[] = [];
      const fileAttachments: { name: string; url: string; uploadedAt: string }[] = [];

      // 2. رفع الملفات إلى Firebase Storage
      for (const item of selectedFiles) {
        try {
          const storageRef = ref(storage, `projects/${projectId}/attachments/${item.file.name}`);
          const uploadResult = await uploadBytes(storageRef, item.file);
          const downloadUrl = await getDownloadURL(uploadResult.ref);

          if (item.file.type.startsWith('image/')) {
            photoUrls.push(downloadUrl);
          } else {
            fileAttachments.push({
              name: item.file.name,
              url: downloadUrl,
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (uploadErr) {
          console.error("Failed to upload file:", item.file.name, uploadErr);
          toast.dismiss(toastId);
          toast.error(`فشل رفع الملف: ${item.file.name}`);
          setIsSavingProject(false);
          return;
        }
      }

      // محاولة استخراج الإحداثيات من رابط جوجل ماب
      let locationCoords = undefined;
      if (newProject.locationLink) {
        const url = newProject.locationLink;
        const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        
        if (atMatch && atMatch.length >= 3) {
          locationCoords = { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        } else if (qMatch && qMatch.length >= 3) {
          locationCoords = { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        }
      }

      // 3. حفظ مستند المشروع بقاعدة البيانات
      await setDoc(projectRef, {
        ...newProject,
        locationCoords,
        companyId: activeCompanyId || null,
        id: projectId,
        name: newProject.title, // حقل الاسم لضمان التوافقية البرمجية مع كافة واجهات النظام
        status: 'planning',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        workerIds: [],
        assignedEmployees: newProject.assignedEmployees,
        milestones: defaultMilestones,
        photoUrls,
        fileAttachments,
        payments: defaultPayments,
        progress: 0
      });

      toast.dismiss(toastId);
      toast.success("تم إنشاء المشروع بنجاح مع رفع المرفقات وتهيئة مراحل العمل الافتراضية");
      
      if (newProject.clientPhone && newProject.sendClientCreds) {
        const clientMsg = `✨ *مرحباً بك ${newProject.clientName} في خبراء الرسم!*\n\nيسعدنا إخبارك بأنه تم إنشاء مشروعك الجديد بنجاح:\n📁 *المشروع:* ${newProject.title}\n\nحرصاً منا على راحتك، وفرنا لك بوابة إلكترونية مخصصة لتتمكن من متابعة تطورات المشروع وإدارة فواتيرك بكل شفافية وسهولة.\n\n🔑 *بيانات الدخول:* (يرجى تسجيل الدخول كـ "عميل")\n📧 *البريد الإلكتروني:* ${newProject.clientEmail || 'البريد الذي تم تزويدنا به'}\n🔒 *رمز المرور المؤقت:* ${newProject.clientPin}\n\n🌐 *رابط الدخول السريع:*\n${window.location.origin}\n\nنتمنى لك تجربة رائعة معنا!`;
        await sendWhatsappMessage(newProject.clientPhone, clientMsg);
      }

      // Notify the assigned employees
      if (newProject.assignedEmployees && newProject.assignedEmployees.length > 0) {
        for (const empId of newProject.assignedEmployees) {
          await sendNotification({
            title: 'تكليف بمشروع جديد',
            message: `تم تكليفك للعمل في مشروع: ${newProject.title}. يرجى مراجعة تفاصيل المشروع.`,
            type: 'project',
            category: 'project',
            targetRole: 'worker', 
            targetUserId: empId,
            projectId: projectId,
            priority: 'high'
          });
        }
      }
      
      setIsAddOpen(false);
      setSelectedAliphiaClientId('');

      // إعادة تهيئة الحقول
      setNewProject({ 
        title: '', 
        description: '', 
        budget: 0, 
        projectValue: 0,
        clientName: '', 
        clientPhone: '', 
        clientEmail: '',
        clientPin: Math.floor(100000 + Math.random() * 900000).toString(),
        sendClientCreds: true,
        locationLink: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        projectType: 'hoardings',
        supervisor: '',
        contractNumber: '',
        engOffice: '',
        totalArea: '',
        projectStatus: 'planning',
        assignedEmployees: [] as string[]
      });
      setSelectedFiles([]);
    } catch (error) {
      toast.dismiss(toastId);
      handleFirestoreError(error, OperationType.WRITE, 'projects', auth);
    } finally {
      setIsSavingProject(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    
    const handleOpenAddProject = () => setIsAddOpen(true);
    window.addEventListener('open-add-project', handleOpenAddProject);
    
    const unsubProjects = onSnapshot(
      activeCompanyId 
        ? query(collection(db, 'projects'), where('companyId', '==', activeCompanyId))
        : query(collection(db, 'projects')),
      (snapshot) => {
        const rawProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        
        // فرز المشاريع حسب تاريخ الإنشاء (الأحدث أولاً) لتجنب أخطاء فهرسة فايربيس
        rawProjects.sort((a, b) => {
           const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
           const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
           return dateB - dateA;
        });
        
        if (isOwner) {
          setProjects(rawProjects);
        } else {
          // Filter projects that the user was assigned to or concerns them
          const filtered = rawProjects.filter(p => {
            const isSupervisorName = p.supervisor && profile.name && p.supervisor.trim().toLowerCase() === profile.name.trim().toLowerCase();
            const isWorker = p.workerIds && profile.uid && p.workerIds.includes(profile.uid);
            const isWorkerById = p.workerIds && profile.id && p.workerIds.includes(profile.id);
            const isMilestoneAssignee = p.milestones && p.milestones.some(m => 
              (profile.id && m.assignedWorkerId === profile.id) || 
              (profile.uid && m.assignedWorkerId === profile.uid)
            );
            
            return isSupervisorName || isWorker || isWorkerById || isMilestoneAssignee;
          });
          setProjects(filtered);
        }
      },
      (error) => {
        if (!activeCompanyId) return; // Prevent spurious errors when no company is selected
        console.error("Firestore Error (Projects):", error);
        toast.error("خطأ في تحميل المشاريع");
      }
    );

    return () => {
      window.removeEventListener('open-add-project', handleOpenAddProject);
      unsubProjects();
    };
  }, [profile, isOwner, activeCompanyId]);

  const filteredProjectsByTime = useMemo(() => {
    if (timeFilter === 'all') return projects;

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);
    
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    if (timeFilter === 'today') {
      // Today is just today (already set)
    } else if (timeFilter === 'week') {
      // Assuming week starts on Sunday
      periodStart.setDate(now.getDate() - now.getDay());
    } else if (timeFilter === 'month') {
      periodStart.setDate(1);
    } else if (timeFilter === 'year') {
      periodStart.setMonth(0, 1);
    }

    return projects.filter(p => {
      // Resolve start date
      let pStart = new Date(0);
      if (p.startDate) {
        pStart = new Date(p.startDate);
      } else if (p.createdAt) {
        pStart = typeof p.createdAt.toDate === 'function' ? p.createdAt.toDate() : new Date(p.createdAt);
      }

      // Resolve end date
      let pEnd = new Date(8640000000000000); // Far future
      if (p.status === 'completed' || p.status === 'closed' || p.status === 'cancelled') {
        if (p.endDate) {
          pEnd = new Date(p.endDate);
        } else if (p.handoverDate) {
           pEnd = new Date(p.handoverDate);
        } else {
           pEnd = pStart; // Fallback
        }
      }

      return pStart <= periodEnd && pEnd >= periodStart;
    });
  }, [projects, timeFilter]);

  const filteredProjects = useMemo(() => {
    return filteredProjectsByTime.filter(p => {
      if (p.status === 'cancelled' && statusFilter !== 'cancelled') return false;
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (p.description?.toLowerCase().includes(searchQuery.toLowerCase() ?? ''));
      const matchesStatus = statusFilter === 'all' ? (p.status !== 'cancelled') : p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [filteredProjectsByTime, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);
    
    const periodStart = new Date(now);
    periodStart.setHours(0, 0, 0, 0);

    if (timeFilter === 'week') {
      periodStart.setDate(now.getDate() - now.getDay());
    } else if (timeFilter === 'month') {
      periodStart.setDate(1);
    } else if (timeFilter === 'year') {
      periodStart.setMonth(0, 1);
    }

    const activeProjects = filteredProjectsByTime.filter(p => p.status !== 'cancelled');
    
    // For counts, we rely on the already filtered activeProjects which represent projects "active/overlapping" in the period
    const active = activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress').length;
    const completed = activeProjects.filter(p => p.status === 'completed').length;
    const planning = activeProjects.filter(p => p.status === 'planning').length;
    const maintenance = activeProjects.filter(p => p.status === 'maintenance' || p.status === 'handover_pending').length;
    
    // Delayed projects
    const today = new Date().toISOString().split('T')[0];
    const delayed = activeProjects.filter(p => p.status !== 'completed' && p.status !== 'maintenance' && p.endDate && p.endDate < today).length;

    // Portal users
    const portalUsers = activeProjects.filter(p => !!p.clientPin).length;

    // Active workers
    const activeWorkers = new Set();
    activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress').forEach(p => {
       if (p.workerIds) p.workerIds.forEach(w => activeWorkers.add(w));
    });

    // EVENT-BASED FINANCIALS: Only count budget for projects CREATED in the period
    const totalBudget = activeProjects.reduce((acc, curr) => {
      let createdDate = new Date(0);
      if (curr.createdAt) {
        createdDate = typeof curr.createdAt.toDate === 'function' ? curr.createdAt.toDate() : new Date(curr.createdAt);
      }
      if (timeFilter === 'all' || (createdDate >= periodStart && createdDate <= periodEnd)) {
        return acc + (curr.projectValue ?? curr.budget ?? 0);
      }
      return acc;
    }, 0);
    
    // EVENT-BASED PAYMENTS: Only count payments PAID in the period
    const totalCollected = projects.reduce((acc, proj) => { // we use all projects here just in case a past project received payment now
      if (!proj.payments) return acc;
      const projCollected = proj.payments.filter(p => {
        if (p.status !== 'paid') return false;
        if (timeFilter === 'all') return true;
        let paidDate = new Date(0);
        if (p.paidAt) {
           paidDate = typeof p.paidAt.toDate === 'function' ? p.paidAt.toDate() : new Date(p.paidAt);
        } else if (p.date) {
           paidDate = typeof p.date.toDate === 'function' ? p.date.toDate() : new Date(p.date);
        }
        return paidDate >= periodStart && paidDate <= periodEnd;
      }).reduce((sum, p) => sum + (p.amount || 0), 0);
      return acc + projCollected;
    }, 0);
    
    // Outstanding should ideally be totalBudget (of all active projects) - totalCollected (of all active projects)
    // But since totalBudget here is filtered by creation date, outstanding might become negative.
    // Let's recalculate full budget for outstanding calculation, or just use the filtered one if that's what the user wants.
    // Usually, outstanding is a snapshot metric: "What is the current outstanding amount for all ongoing projects?"
    const fullActiveBudget = activeProjects.reduce((acc, curr) => acc + (curr.projectValue ?? curr.budget ?? 0), 0);
    const fullActiveCollected = activeProjects.reduce((acc, proj) => {
      if (!proj.payments) return acc;
      return acc + proj.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    }, 0);
    const outstanding = fullActiveBudget - fullActiveCollected > 0 ? fullActiveBudget - fullActiveCollected : 0;

    return { 
      active, 
      completed, 
      planning,
      maintenance,
      delayed,
      portalUsers,
      activeWorkers: activeWorkers.size,
      totalBudget, 
      totalCollected,
      outstanding,
      totalValid: activeProjects.length 
    };
  }, [projects]);

  // تجميع كافة المهام من كافة المشاريع
  const allTasks = useMemo(() => {
    const list: any[] = [];
    projects.forEach(p => {
      if (p.milestones) {
        p.milestones.forEach((m, idx) => {
          list.push({
            ...m,
            projectId: p.id,
            projectTitle: p.title,
            milestoneIndex: idx
          });
        });
      }
    });
    return list;
  }, [projects]);

  // تصفية المهام بناءً على شروط البحث والفلاتر
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
                           (t.description?.toLowerCase().includes(taskSearchQuery.toLowerCase()) ?? false) ||
                           t.projectTitle.toLowerCase().includes(taskSearchQuery.toLowerCase());
      const matchesStatus = taskStatusFilter === 'all' || t.status === taskStatusFilter;
      const matchesProject = taskProjectFilter === 'all' || t.projectId === taskProjectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [allTasks, taskSearchQuery, taskStatusFilter, taskProjectFilter]);

  // إحصائيات المهام المجمعة
  const taskStats = useMemo(() => {
    const total = allTasks.length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const review = allTasks.filter(t => t.status === 'review-requested').length;
    return { total, pending, inProgress, completed, review };
  }, [allTasks]);

  // تغيير حالة المهمة في قاعدة البيانات
  const handleToggleTaskStatus = async (projectId: string, taskTitle: string, currentStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // التبديل بين مكتملة وقيد الانتظار
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const newMilestones = (project.milestones || []).map(m => {
      if (m.title === taskTitle) {
        return {
          ...m,
          status: nextStatus as any,
          date: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : ''
        };
      }
      return m;
    });

    const updatedProjectTemp = { ...project, milestones: newMilestones } as any;
    const progressVal = calculateProjectProgress(updatedProjectTemp);

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        milestones: newMilestones,
        progress: progressVal
      });
      toast.success(`تم تحديث حالة المهمة بنجاح إلى: ${nextStatus === 'completed' ? 'مكتملة' : 'قيد الانتظار'}`);
    } catch (err) {
      console.error("Failed to toggle task status:", err);
      toast.error("حدث خطأ أثناء تحديث حالة المهمة");
    }
  };

  const renderTaskCard = (task: any) => {
    const isCompleted = task.status === 'completed';
    const isPending = task.status === 'pending';
    const isInProgress = task.status === 'in-progress';
    const isReview = task.status === 'review-requested';

    return (
      <motion.div
        key={`${task.projectId}-${task.title}`}
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, scale: 1.01 }}
        transition={{ duration: 0.3 }}
        className="group"
      >
        <Card className="rounded-[2rem] border-none bg-white overflow-hidden shadow-md shadow-slate-200/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 p-5 flex flex-col justify-between h-full min-h-[180px] ring-0 relative">
          <div className="absolute top-0 left-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-2">
              <button
                type="button"
                onClick={() => setSelectedProjectId(task.projectId)}
                className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg text-right hover:bg-indigo-100 transition-colors truncate max-w-[150px]"
              >
                📁 {task.projectTitle}
              </button>
              
              <Badge className={`border-none rounded-xl text-[9px] font-black ${
                isCompleted ? 'bg-emerald-50 text-emerald-700' :
                isReview ? 'bg-amber-50 text-amber-700 animate-pulse' :
                isInProgress ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {isCompleted ? 'منجزة ✓' :
                 isReview ? 'مراجعة معلقة ⏳' :
                 isInProgress ? 'نشطة ⚡' : 'معلقة ⏱️'}
              </Badge>
            </div>

            <div className="text-right">
              <h4 className="font-extrabold text-sm text-slate-800 leading-snug group-hover:text-primary transition-colors">{task.title}</h4>
              {task.description && (
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>

            {(task.assignedWorkerId || task.dueDate) && (
              <div className="flex gap-2 text-[10px] items-center justify-end flex-row-reverse text-slate-500 font-bold bg-slate-50 p-2 rounded-xl mt-3">
                 {task.dueDate && <span className="flex items-center gap-1 text-red-500"><Calendar className="w-3 h-3"/> {task.dueDate}</span>}
                 {task.assignedWorkerId && <span>👤 مخصصة</span>}
              </div>
            )}
            
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400">تأثير الإنجاز</p>
              <p className="text-xs font-black text-slate-700">{task.weight || 0}%</p>
            </div>

            <Button
              type="button"
              onClick={() => handleToggleTaskStatus(task.projectId, task.title, task.status)}
              className={`h-9 px-4 rounded-xl font-black text-xs transition-all flex items-center gap-1 shadow-sm ${
                isCompleted 
                  ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border-none' 
                  : 'bg-slate-900 hover:bg-emerald-600 text-white border-none'
              }`}
            >
              {isCompleted ? 'إعادة فتح' : 'إكمال المهمة'}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderCardList = (type: string) => {
    const today = new Date().toISOString().split('T')[0];
    const activeProjects = projects.filter(p => p.status !== 'cancelled');
    
    let list: any[] = [];
    if (type === 'active') {
      list = activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress');
    } else if (type === 'planning') {
      list = activeProjects.filter(p => p.status === 'planning');
    } else if (type === 'completed') {
      list = activeProjects.filter(p => p.status === 'completed');
    } else if (type === 'delayed') {
      list = activeProjects.filter(p => p.status !== 'completed' && p.status !== 'maintenance' && p.endDate && p.endDate < today);
    } else if (type === 'portal') {
      list = activeProjects.filter(p => !!p.clientPin);
    } else if (type === 'workers') {
      const activeWorkers = new Set<string>();
      activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress').forEach(p => {
        if (p.workerIds) p.workerIds.forEach(w => activeWorkers.add(w));
      });
      if (activeWorkers.size === 0) return <div className="hidden group-hover:block"><p className="text-center text-slate-400 text-xs py-4 mt-4 border-t border-slate-100">لا يوجد بيانات</p></div>;
      return (
        <div className="hidden group-hover:flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 max-h-48 overflow-y-auto custom-scrollbar w-full">
          {Array.from(activeWorkers).map(wId => {
            const worker = usersList.find(u => u.id === wId || u.uid === wId);
            return (
              <div key={wId as string} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 w-full">
                <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 text-[10px] font-black">
                  {worker?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-[10px] truncate">{worker?.name || 'غير معروف'}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (list.length === 0) return <div className="hidden group-hover:block"><p className="text-center text-slate-400 text-xs py-4 border-t border-slate-100 mt-4">لا يوجد بيانات</p></div>;

    return (
      <div className="hidden group-hover:flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 max-h-48 overflow-y-auto custom-scrollbar w-full">
        {list.map(p => (
          <div key={p.id} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100 w-full" onClick={() => { setDetailsDialog(null); setSelectedProjectId(p.id); }}>
            <p className="font-black text-slate-800 text-[10px] truncate mb-1" title={p.title}>{p.title}</p>
            <Badge className="bg-white text-slate-600 border border-slate-200 text-[8px] px-1 py-0">{p.status === 'active' ? 'نشط' : p.status === 'planning' ? 'تخطيط' : p.status}</Badge>
          </div>
        ))}
      </div>
    );
  };

  if (selectedProjectId) {
    return <ProjectViewV2 projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  if (viewModeType === 'tasks') {
    return (
      <div className="w-full px-4 md:px-6 py-6 animate-in fade-in duration-700" dir="rtl">
        {/* 🌌 High-End Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2">
               <div className="h-5 w-5 md:h-7 md:w-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Target className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
               </div>
               <span className="text-[7px] md:text-[9px] font-black text-primary uppercase tracking-[0.2em]">إدارة العمليات والمهام التشغيلية</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none">
              المهام <span className="text-primary italic">والمراحل الميدانية</span>
            </h1>
            <p className="text-slate-500 font-bold max-w-lg text-[10px] md:text-sm leading-relaxed">
              متابعة دقيقة لكافة المهام والمراحل الميدانية عبر مشاريع المؤسسة.
            </p>
          </div>
        </div>

        {/* 📊 Bento Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="rounded-3xl border border-slate-200/60 shadow-sm p-6 bg-white opacity-100 relative overflow-hidden group ring-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">إجمالي المهام</p>
              <span className="text-2xl font-black text-slate-900">{taskStats.total}</span>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200/60 shadow-sm p-6 bg-white opacity-100 relative overflow-hidden group ring-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">مهام معلقة ونشطة</p>
              <span className="text-2xl font-black text-slate-900">{taskStats.pending + taskStats.inProgress}</span>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200/60 shadow-sm p-6 bg-white opacity-100 relative overflow-hidden group ring-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">مهام منجزة</p>
              <span className="text-2xl font-black text-slate-900">{taskStats.completed}</span>
            </div>
          </Card>

          <Card className="rounded-3xl bg-slate-900 border-none shadow-xl p-6 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-2xl" />
            <div className="relative z-10">
              <div className="h-10 w-10 bg-white/10 text-white rounded-lg flex items-center justify-center mb-4 border border-white/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">نسبة الإنجاز الكلية</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black">{taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}</span>
                <span className="text-[9px] font-bold text-slate-500">%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 🔍 Search and Filters */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={taskSearchQuery}
              onChange={(e) => setTaskSearchQuery(e.target.value)}
              placeholder="البحث عن مهمة أو مشروع..." 
              className="w-full h-12 pl-4 pr-12 rounded-xl bg-white border border-slate-200 shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* تصفية حسب المشروع */}
            <select
              value={taskProjectFilter}
              onChange={(e) => setTaskProjectFilter(e.target.value)}
              className="w-full sm:w-64 h-12 rounded-xl bg-white border border-slate-200 shadow-sm font-bold text-sm text-slate-700 pr-4 pl-8 focus:border-primary focus:ring-0"
            >
              <option value="all">كل المشاريع</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            {/* تصفية حسب حالة المهمة وطريقة العرض */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
              <div className="flex bg-slate-100 p-1 rounded-xl ml-4">
                <button
                  type="button"
                  onClick={() => setTaskViewMode('kanban')}
                  className={`p-2 rounded-lg transition-all ${taskViewMode === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Trello className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTaskViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${taskViewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setTaskStatusFilter('all')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${taskStatusFilter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
              >
                الكل
              </button>
              <button 
                type="button"
                onClick={() => setTaskStatusFilter('pending')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${taskStatusFilter === 'pending' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
              >
                معلقة
              </button>
              <button 
                type="button"
                onClick={() => setTaskStatusFilter('in-progress')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${taskStatusFilter === 'in-progress' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
              >
                قيد العمل
              </button>
              <button 
                type="button"
                onClick={() => setTaskStatusFilter('review-requested')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${taskStatusFilter === 'review-requested' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
              >
                بانتظار المراجعة
              </button>
              <button 
                type="button"
                onClick={() => setTaskStatusFilter('completed')}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${taskStatusFilter === 'completed' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
              >
                منجزة
              </button>
            </div>
          </div>
        </div>

        {/* 🖼/ Tasks Listing */}
        {taskViewMode === 'kanban' ? (
          <div className="flex gap-6 overflow-x-auto pb-8 items-start min-h-[600px] snap-x no-scrollbar">
            {[
              { id: 'pending', title: 'معلقة', color: 'slate' },
              { id: 'in-progress', title: 'قيد العمل', color: 'blue' },
              { id: 'review-requested', title: 'بانتظار المراجعة', color: 'amber' },
              { id: 'completed', title: 'منجزة', color: 'emerald' },
            ].map(col => (
              <div key={col.id} className="min-w-[320px] max-w-[320px] shrink-0 bg-slate-50/50 rounded-[2rem] p-4 snap-center border border-slate-100 flex flex-col gap-4">
                 <div className="flex items-center justify-between px-2">
                    <h4 className={`font-black text-xs text-${col.color}-700 bg-${col.color}-100 px-3 py-1.5 rounded-lg`}>{col.title}</h4>
                    <span className="text-xs font-bold text-slate-400 bg-white shadow-sm px-2 py-0.5 rounded-full">{filteredTasks.filter(t => t.status === col.id).length}</span>
                 </div>
                 <div className="flex flex-col gap-3">
                   {filteredTasks.filter(t => t.status === col.id).map(task => renderTaskCard(task))}
                   {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                      <div className="p-6 text-center text-xs font-bold text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl">لا توجد مهام</div>
                   )}
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredTasks.length > 0 ? (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredTasks.map((task) => renderTaskCard(task))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center"
              >
                <div className="w-24 h-24 bg-slate-100/90 dark:bg-zinc-800 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-center mb-8 text-slate-300">
                   <Target className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">لا توجد مهام</h3>
                <p className="text-slate-500 font-bold max-w-sm px-6">
                  لم يتم العثور على أي مهام تطابق شروط التصفية والبحث الحالية.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }

  if (selectedProjectId) {
    return <ProjectViewV2 projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  return (
    <div className="w-full px-4 md:px-6 py-6 animate-in fade-in duration-700" dir="rtl">
      {/* 🌌 High-End Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* 🗓️ Global Time Filter */}
        <div className="overflow-x-auto no-scrollbar flex-1">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 w-fit">
            <Button
              variant={timeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('all')}
              className={`rounded-xl px-4 text-xs font-bold transition-all ${timeFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'}`}
            >
              جميع الأوقات
            </Button>
            <Button
              variant={timeFilter === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('today')}
              className={`rounded-xl px-4 text-xs font-bold transition-all ${timeFilter === 'today' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'}`}
            >
              اليوم
            </Button>
            <Button
              variant={timeFilter === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('week')}
              className={`rounded-xl px-4 text-xs font-bold transition-all ${timeFilter === 'week' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'}`}
            >
              هذا الأسبوع
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeFilter('month')}
              className={`rounded-xl px-4 text-xs font-bold transition-all ${timeFilter === 'month' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'}`}
            >
              هذا الشهر
            </Button>
          </div>
        </div>

        {/* زر إنشاء مشروع جديد وبوابة المعالج الفاخر */}
        <div className="flex items-center gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all active:scale-95">
                <Plus className="w-4 h-4" />
                تأسيس مشروع جديد ✨
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[95vw] sm:max-w-5xl rounded-[2.5rem] p-6 border-none max-h-[92vh] overflow-y-auto" dir="rtl">
              <DialogHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="text-right">
                  <DialogTitle className="font-black text-lg text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                    معالج تأسيس وتصميم المشاريع الهندسي
                  </DialogTitle>
                </div>

                {/* مؤصل الخطوات الديناميكي التكيفي */}
                <div className="flex items-center gap-2 self-center md:self-auto">
                    {(() => {
                      const stepList = creationMode === 'manual' 
                        ? [{ id: 1, label: 'النمط' }, { id: 2, label: 'البيانات والعميل' }, { id: 3, label: 'المواصفات الفنية' }, { id: 4, label: 'الاعتماد المالي' }]
                        : creationMode === 'auto'
                        ? [{ id: 1, label: 'النمط' }, { id: 2, label: 'التحليل الذكي' }, { id: 3, label: 'المراجعة والاعتماد' }]
                        : creationMode === 'hybrid'
                        ? [{ id: 1, label: 'النمط' }, { id: 2, label: 'المرفقات وعروض الأسعار' }, { id: 3, label: 'البيانات والعميل' }, { id: 4, label: 'المواصفات الفنية' }, { id: 5, label: 'الاعتماد المالي' }]
                        : [{ id: 1, label: 'اختيار نمط العمل' }];

                      return stepList.map((step, idx) => (
                        <React.Fragment key={step.id}>
                          <div 
                            onClick={() => {
                              if (step.id < activeStep) setActiveStep(step.id);
                            }}
                            className={`h-9 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black transition-all cursor-pointer ${
                              activeStep === step.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' 
                                : activeStep > step.id 
                                  ? 'bg-emerald-500 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                            title={step.label}
                          >
                            {activeStep > step.id ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <span className="opacity-80">#{step.id}</span>
                            )}
                            <span className="hidden sm:inline text-[10px]">{step.label}</span>
                          </div>
                          {idx < stepList.length - 1 && (
                            <div className={`h-1 w-6 rounded-full transition-all ${
                              activeStep > step.id ? 'bg-emerald-500' : 'bg-slate-100'
                            }`} />
                          )}
                        </React.Fragment>
                      ));
                    })()}
                  </div>
              </DialogHeader>

              {/* محتوى الخطوات التكيفي مع تأثيرات Framer Motion الفخمة */}
              <div className="min-h-[400px] mt-4 pb-4">
                <AnimatePresence mode="wait">
                  {/* الخطوة 1: اختيار نمط العمل */}
                  {activeStep === 1 && (
                    <motion.div
                      key="step_mode"
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-6"
                    >
                      <div className="flex flex-col items-center text-center max-w-xl mx-auto space-y-2 mb-2">
                        <Badge className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 font-black px-3 py-1 text-[10px] uppercase tracking-wider rounded-lg">أنماط العمل الذكية ✨</Badge>
                        <h3 className="text-lg font-black text-slate-900">كيف ترغب في تأسيس ملف هذا المشروع؟</h3>
                        <p className="text-slate-500 font-bold text-xs leading-relaxed">اختر النمط المفضل لديك الآن ليوفر لك المعالج أفضل تدفق شاشات مخصص وسلس وخالٍ من أي تعقيد</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* النمط التلقائي بالكامل */}
                        <div 
                          onClick={() => {
                            setCreationMode('auto');
                            setActiveStep(2);
                            toast.info("تم اختيار النمط التلقائي بالكامل! ارفع العقد أو الصق نص الواتساب.");
                          }}
                          className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col justify-between text-right space-y-4 group hover:scale-[1.02] duration-300 relative overflow-hidden ${
                            creationMode === 'auto'
                              ? 'border-indigo-600 bg-indigo-50/10 shadow-xl shadow-indigo-100/50'
                              : 'border-slate-150 bg-white hover:border-indigo-400 hover:shadow-md'
                          }`}
                        >
                          <div className="absolute -top-6 -left-6 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10" />
                          <div className="space-y-3 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <Sparkles className="w-5 h-5 text-indigo-500 group-hover:text-white animate-pulse" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-black text-sm text-slate-800">تلقائي بالكامل بالذكاء الاصطناعي 🚀</h4>
                              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                مثالي للعقود، الصور، ونصوص الواتساب. ارفع المستند أو انسخ النص وسيقوم نظام Gemini بتوليد وتأسيس كافة البيانات الفنية والمواصفات في شاشة واحدة فوراً!
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 text-[10px] font-black text-indigo-600 group-hover:translate-x-[-3px] transition-transform">
                            <span>الوضع فائق السرعة (3 خطوات فقط)</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* النمط نصف التلقائي */}
                        <div 
                          onClick={() => {
                            setCreationMode('hybrid');
                            setActiveStep(2);
                            toast.info("تم اختيار النمط نصف التلقائي! يمكنك البدء باستيراد عروض الأسعار والتحليل.");
                          }}
                          className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col justify-between text-right space-y-4 group hover:scale-[1.02] duration-300 relative overflow-hidden ${
                            creationMode === 'hybrid'
                              ? 'border-indigo-600 bg-indigo-50/10 shadow-xl shadow-indigo-100/50'
                              : 'border-slate-150 bg-white hover:border-indigo-400 hover:shadow-md'
                          }`}
                        >
                          <div className="absolute -top-6 -left-6 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10" />
                          <div className="space-y-3 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <Layers className="w-5 h-5 text-indigo-500 group-hover:text-white" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-black text-sm text-slate-800">نصف تلقائي بالمعالج الهجين ⚙️</h4>
                              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                امزج بين ميزات الاستيراد الفوري من عروض أسعار (ألف ياء ERP)، رفع ملفات الموقع والتحليل، ثم تخصيص ومراجعة الحقول والمدخلات خطوة بخطوة بالكامل.
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 text-[10px] font-black text-indigo-600 group-hover:translate-x-[-3px] transition-transform">
                            <span>الوضع المخصص الشامل (5 خطوات)</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* النمط اليدوي */}
                        <div 
                          onClick={() => {
                            setCreationMode('manual');
                            setActiveStep(2);
                            toast.info("تم اختيار النمط اليدوي الكلاسيكي المباشر!");
                          }}
                          className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col justify-between text-right space-y-4 group hover:scale-[1.02] duration-300 relative overflow-hidden ${
                            creationMode === 'manual'
                              ? 'border-indigo-600 bg-indigo-50/10 shadow-xl shadow-indigo-100/50'
                              : 'border-slate-150 bg-white hover:border-indigo-400 hover:shadow-lg'
                          }`}
                        >
                          <div className="absolute -top-6 -left-6 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10" />
                          <div className="space-y-3 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                              <User className="w-5 h-5 text-indigo-500 group-hover:text-white" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-black text-sm text-slate-800">تأسيس يدوي سريع ومباشر ✍️</h4>
                              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                تخطى ميزات الذكاء الاصطناعي ومزامنة الملفات مؤقتاً، وابدأ بتعبئة تفاصيل العميل، والمواصفات الفنية للمشروع، والمشرف، والماليات يدوياً بنفسك فوراً.
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 text-[10px] font-black text-indigo-600 group-hover:translate-x-[-3px] transition-transform">
                            <span>الوضع اليدوي الدقيق (4 خطوات)</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* شاشة التحليل والرفع والمزامنة (الخطوة 2 للنمط التلقائي والهجين) */}
                  {((creationMode === 'auto' || creationMode === 'hybrid') && activeStep === 2) && (
                    <motion.div
                      key="step_ai_uploads"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-2 border-r-4 border-indigo-600 pr-3 mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">الخطوة 2: المرفقات والتحليل الذكي ومزامنة عروض الأسعار</span>
                      </div>

                      {/* جلب عروض الأسعار - مع الفلتر الذكي المحدث */}
                      <QuotationImporter 
                        onImport={(quote) => {
                          const parsedTotal = Number(quote.quote_total || quote.total || 0);
                          const clientName = quote.client_name || quote.client?.name || '';
                          const quoteNum = quote.quote_number || quote.number || '';
                          
                          // 🧠 مصنف ذكي لتحديد نوع المشروع (projectType) تلقائياً من نصوص عرض السعر
                          const textToScan = `${quote.title || ''} ${quote.quote_notes || ''} ${quote.notes || ''} ${quote.description || ''} ${clientName}`.toLowerCase();
                          let detectedType = 'hoardings'; // افتراضي
                          if (textToScan.includes('شينكو')) {
                            detectedType = 'fence_shinko';
                          } else if (textToScan.includes('تجاري') || textToScan.includes('مكسو') || textToScan.includes('خشب') || textToScan.includes('أسمنت') || textToScan.includes('اسمنت') || textToScan.includes('بنر')) {
                            detectedType = 'fence_commercial';
                          } else if (textToScan.includes('شبك') || textToScan.includes('حماية مزارع') || textToScan.includes('مزارع')) {
                            detectedType = 'fence_chainlink';
                          } else if (textToScan.includes('لوحة') || textToScan.includes('لوحات') || textToScan.includes('طباعة') || textToScan.includes('بنر') || textToScan.includes('فليكس')) {
                            detectedType = 'signage_printing';
                          } else if (textToScan.includes('كلادينج') || textToScan.includes('كلادنج') || textToScan.includes('حروف') || textToScan.includes('زنكور') || textToScan.includes('اكريليك') || textToScan.includes('أكريليك')) {
                            detectedType = 'cladding_letters';
                          } else if (textToScan.includes('شاشه') || textToScan.includes('شاشات') || textToScan.includes('شاشة') || textToScan.includes('led')) {
                            detectedType = 'digital_screens';
                          } else if (textToScan.includes('معرض') || textToScan.includes('معارض') || textToScan.includes('مؤتمر') || textToScan.includes('بوث')) {
                            detectedType = 'exhibition_booths';
                          } else if (textToScan.includes('سيارة') || textToScan.includes('سيارات') || textToScan.includes('مركبة') || textToScan.includes('مركبات') || textToScan.includes('تغليف')) {
                            detectedType = 'wrapping_branding';
                          } else if (textToScan.includes('صيانة') || textToScan.includes('وقائية')) {
                            detectedType = 'maintenance';
                          } else if (textToScan.includes('ضخم') || textToScan.includes('مجسم') || textToScan.includes('مجسمات')) {
                            detectedType = 'megastructures';
                          } else if (textToScan.includes('سور') || textToScan.includes('اسوار') || textToScan.includes('أسوار')) {
                            detectedType = 'hoardings';
                          }

                          setNewProject((prev: any) => ({
                            ...prev,
                            title: quote.title || `مشروع عرض سعر #${quoteNum} - ${clientName}` || prev.title,
                            clientName: clientName || prev.clientName,
                            clientPhone: quote.client_phone || quote.client?.phone || quote.phone || prev.clientPhone,
                            clientEmail: quote.client_email || quote.client?.email || quote.email || prev.clientEmail,
                            budget: parsedTotal > 0 ? parsedTotal * 0.7 : prev.budget,
                            projectValue: parsedTotal > 0 ? parsedTotal : prev.projectValue,
                            aliphiaQuoteId: quote.quote_id || quote.id || '',
                            description: quote.quote_notes || quote.notes || quote.description || prev.description || '',
                            projectType: detectedType,
                          }));
                          
                          const clientId = quote.client_id || quote.client?.id;
                          if (clientId) {
                            setSelectedAliphiaClientId(String(clientId));
                            
                            // 🔍 فحص ذكي وتعبئة باقي تفاصيل العميل تلقائياً من قائمة عملاء ألف ياء بالخلفية لضمان عدم نقصان أي حقل
                            fetchAliphiaClients().then((clients) => {
                              const matched = clients.find(c => String(c.id) === String(clientId));
                              if (matched) {
                                setNewProject((prev: any) => ({
                                  ...prev,
                                  clientName: matched.name || prev.clientName,
                                  clientPhone: matched.phone || prev.clientPhone,
                                  clientEmail: matched.email || prev.clientEmail,
                                }));
                              }
                            }).catch(err => console.error("Error matching client inside onImport", err));
                          }
                          
                          toast.success('تم استيراد كافة تفاصيل عرض السعر ومطابقة العميل وتحديد نوع العمل بنجاح! 📊✨');
                          
                          // في النمط التلقائي، الانتقال تلقائياً لشاشة المراجعة لإعطاء طابع خارق وذكي
                          if (creationMode === 'auto') {
                            setActiveStep(3);
                          }
                        }}
                      />

                      {/* التعبئة بالذكاء الاصطناعي */}
                      <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/10 rounded-[1.5rem] p-5 shadow-sm space-y-3">
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <h4 className="font-black text-xs text-slate-800">التأسيس السريع بالذكاء الاصطناعي (العقود النصية / محادثات WhatsApp) ✨</h4>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400">
                          انسخ محادثة الاتفاق مع المالك من الواتساب بالكامل والصقها بالأسفل، وسيقوم نظام Gemini المتطور بملء المشروع نيابة عنك!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <textarea
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            placeholder="مثال: مشروع قصر سكني للمالك محمد العتيبي 0555123456 بقيمة 950,000 ريال، المساحة 600 متر، يبدأ العمل في 2026-07-01 بإشراف المهندس عبدالمحسن ومكتب الرياض للاستشارات..."
                            rows={2}
                            className="flex-1 rounded-xl bg-white border border-slate-200 shadow-inner font-bold p-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                          />
                          <Button 
                            type="button"
                            onClick={async () => {
                              await handleAiAutofill();
                              if (creationMode === 'auto') {
                                setActiveStep(3);
                              }
                            }}
                            disabled={isAiParsing}
                            className="h-auto px-5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md self-stretch sm:self-auto"
                          >
                            {isAiParsing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                جاري استخراج البيانات...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                تحليل ذكي للمحادثة
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* المرفقات والرسومات والتحليل */}
                      <div className="space-y-3">
                        <Label className="text-xs font-black text-slate-500 block">معاينة صور ومخططات الموقع / العقود ومستندات الأسعار</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-6 text-center bg-slate-50/40 relative hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                          <input 
                            type="file" 
                            multiple 
                            onChange={e => {
                              if (e.target.files) {
                                const filesArray = Array.from(e.target.files).map(file => ({
                                  id: Math.random().toString(36).substring(7),
                                  file,
                                  progress: 0,
                                  status: 'pending' as const
                                }));
                                setSelectedFiles(prev => [...prev, ...filesArray]);
                                toast.success("تم اختيار الملفات بنجاح، اضغط على 'تحليل بالذكاء الاصطناعي' لاسترجاع محتواها!");
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                          <div className="flex flex-col items-center gap-2 relative z-0">
                            <div className="h-12 w-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors shadow-sm">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-black text-slate-700 text-xs">اسحب الملفات هنا أو انقر للتصفح</p>
                              <p className="text-[9px] text-slate-400 font-bold mt-0.5">يدعم الرسومات الهندسية، مخططات PDF، وصور الموقع المعاينة الفنية</p>
                            </div>
                          </div>
                        </div>

                        {/* قائمة المستندات */}
                        {selectedFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                              {selectedFiles.map((item) => {
                                const canAnalyze = item.file.type.startsWith('image/') || item.file.type === 'application/pdf';
                                return (
                                  <div key={item.id} className="p-2.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                                      <div className="min-w-0 text-right">
                                        <p className="text-xs font-bold text-slate-800 truncate max-w-[220px]">{item.file.name}</p>
                                        <p className="text-[8px] text-slate-400 font-bold">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {canAnalyze && (
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={analyzingFileId !== null}
                                          onClick={async () => {
                                            await handleAnalyzeFile(item.id);
                                            if (creationMode === 'auto') {
                                              setActiveStep(3);
                                            }
                                          }}
                                          className="h-7 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[9px] border-none shadow-none flex items-center gap-1"
                                        >
                                          {analyzingFileId === item.id ? (
                                            <>
                                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                              جاري التحليل...
                                            </>
                                          ) : (
                                            <>
                                              <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                                              قراءة ذكية بالـ AI 🧠
                                            </>
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== item.id))}
                                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* لوحة المراجعة والاعتماد الموحدة (الخطوة 3 للنمط التلقائي بالكامل) */}
                  {(creationMode === 'auto' && activeStep === 3) && (
                    <motion.div
                      key="step_auto_dashboard"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-5"
                    >
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <div className="h-8 w-8 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-black text-xs text-emerald-900">رائع! تم استخراج وثائق وبيانات المشروع بنجاح ✨</h4>
                          <p className="text-[10px] text-emerald-700 font-bold">يرجى مراجعة البيانات المستخرجة وتعديل أي حقل، واختيار المشرف لتأسيس المشروع فوراً.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. البيانات الأساسية المكتشفة */}
                        <div className="space-y-3 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-right">
                          <h4 className="font-black text-xs text-slate-700 flex items-center gap-1"><Grid className="w-4 h-4 text-indigo-500" /> البيانات الأساسية المكتشفة</h4>
                          
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 block">عنوان المشروع المولد</Label>
                            <Input 
                              value={newProject.title}
                              onChange={e => setNewProject({...newProject, title: e.target.value})}
                              placeholder="عنوان ملف المشروع"
                              className="h-10 text-xs font-bold rounded-lg bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black text-slate-400 block">المقاسات / المساحة</Label>
                              <Input 
                                value={newProject.totalArea}
                                onChange={e => setNewProject({...newProject, totalArea: e.target.value})}
                                placeholder="مثال: لوحة 4x3 م"
                                className="h-10 text-xs font-bold rounded-lg bg-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black text-slate-400 block">نوع المشروع</Label>
                              <select
                                value={newProject.projectType}
                                onChange={e => setNewProject({...newProject, projectType: e.target.value})}
                                className="w-full h-10 rounded-lg bg-white border border-slate-200 font-bold text-xs pr-2"
                              >
                                <option value="fence_shinko">🚧 سور شينكو</option>
                                <option value="fence_commercial">🎨 سور تجاري مكسو</option>
                                <option value="fence_chainlink">🔗 سور شبك</option>
                                <option value="hoardings">أسوار أخرى</option>
                                <option value="signage_printing">لوحات وطباعة</option>
                                <option value="cladding_letters">كلادينج وحروف</option>
                                <option value="digital_screens">شاشات ومجسمات</option>
                                <option value="exhibition_booths">تجهيز معارض</option>
                                <option value="megastructures">مجسمات ضخمة</option>
                                <option value="wrapping_branding">تغليف مركبات</option>
                                <option value="maintenance">صيانة لوحات</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-black text-slate-400 block">موقع جوجل ماب (خرائط جوجل) *</Label>
                            <Input 
                              value={newProject.locationLink}
                              onChange={e => setNewProject({...newProject, locationLink: e.target.value})}
                              placeholder="https://maps.app.goo.gl/..."
                              className="h-10 text-xs font-bold rounded-lg bg-white text-left"
                            />
                            {!validateLocationLink(newProject.locationLink) && (
                              <span className="text-[9px] text-rose-500 font-bold block mt-1">يجب إدخال رابط خرائط جوجل صالح</span>
                            )}
                          </div>
                        </div>

                        {/* 2. العميل والمسؤوليات */}
                        <div className="space-y-3 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-right flex flex-col justify-between">
                          <div className="space-y-3">
                            <h4 className="font-black text-xs text-slate-700 flex items-center gap-1"><User className="w-4 h-4 text-emerald-500" /> العميل والمشرف والماليات</h4>
                            
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black text-slate-400 block">اختر العميل المطابق من ألف ياء</Label>
                              <AliphiaClientSelector
                                selectedClientId={selectedAliphiaClientId}
                                onSelect={(client) => {
                                  if (client) {
                                    setNewProject(prev => ({
                                      ...prev,
                                      clientName: client.name,
                                      clientPhone: client.phone || prev.clientPhone,
                                      clientEmail: client.email || prev.clientEmail
                                    }));
                                    setSelectedAliphiaClientId(client.id);
                                  } else {
                                    setNewProject(prev => ({ ...prev, clientName: '', clientPhone: '', clientEmail: '' }));
                                    setSelectedAliphiaClientId('');
                                  }
                                }}
                              />
                            </div>

                            {/* تأكيد وتعديل بيانات اتصال العميل بالنمط التلقائي */}
                            {newProject.clientName && (
                              <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-100 text-right">
                                <h5 className="font-bold text-[10px] text-slate-400">بيانات اتصال العميل:</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1 col-span-2">
                                    <Label className="text-[9px] font-bold text-slate-400">اسم العميل *</Label>
                                    <Input
                                      value={newProject.clientName}
                                      onChange={e => setNewProject({...newProject, clientName: e.target.value})}
                                      placeholder="اسم العميل"
                                      className="h-8 text-xs font-bold rounded bg-slate-50 border-slate-200"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-slate-400">جوال العميل (واتساب) *</Label>
                                    <Input
                                      value={newProject.clientPhone}
                                      onChange={e => setNewProject({...newProject, clientPhone: e.target.value})}
                                      placeholder="مثال: 05xxxxxxxx"
                                      className="h-8 text-xs font-bold rounded bg-slate-50 border-slate-200 text-left"
                                      dir="ltr"
                                    />
                                    {newProject.clientPhone && (
                                      (() => {
                                        const clean = newProject.clientPhone.replace(/[\s\-\(\)]/g, '');
                                        if (/^(?:\+?966|0)?1\d{8}$/.test(clean)) {
                                          return <span className="text-[8px] text-rose-500 font-bold block mt-0.5">⚠️ ثابت (لن تصله رسائل)</span>;
                                        }
                                        if (!/^(?:\+?966|0)?5\d{8}$/.test(clean)) {
                                          return <span className="text-[8px] text-amber-600 font-bold block mt-0.5">⚠️ صيغة جوال غير صالحة</span>;
                                        }
                                        return <span className="text-[8px] text-emerald-600 font-bold block mt-0.5">✓ رقم جوال صالح للواتساب</span>;
                                      })()
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-slate-400">البريد الإلكتروني</Label>
                                    <Input
                                      value={newProject.clientEmail}
                                      onChange={e => setNewProject({...newProject, clientEmail: e.target.value})}
                                      placeholder="client@email.com"
                                      className="h-8 text-xs font-bold rounded bg-slate-50 border-slate-200 text-left"
                                      dir="ltr"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-slate-400 block">المشرف المسؤول *</Label>
                                <select
                                  value={newProject.supervisor}
                                  onChange={e => setNewProject({...newProject, supervisor: e.target.value})}
                                  className="w-full h-10 rounded-lg bg-white border border-slate-200 font-bold text-xs pr-2"
                                >
                                  <option value="">-- اختر المشرف --</option>
                                  {usersList.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black text-slate-400 block">قيمة العقد (ريال)</Label>
                                <Input 
                                  value={newProject.projectValue}
                                  onChange={e => setNewProject({...newProject, projectValue: Number(e.target.value.replace(/\D/g, ''))})}
                                  className="h-10 text-xs font-black rounded-lg bg-white text-emerald-600 text-left pr-2"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs mt-2">
                            <span className="font-bold text-slate-500">رمز المرور للعميل:</span>
                            <span className="font-black text-indigo-600 bg-indigo-50/50 px-2.5 py-0.5 rounded shadow-inner text-sm tracking-widest">{newProject.clientPin}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3. أكورديون المواصفات التكيفية المستخرجة */}
                      <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowSpecsInAuto(!showSpecsInAuto)}
                          className="w-full h-12 px-4 flex items-center justify-between hover:bg-slate-50 font-black text-xs text-slate-700 border-none"
                        >
                          <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> تعديل وتخصيص المواصفات الفنية الذكية المستخرجة</span>
                          <span>{showSpecsInAuto ? 'إغلاق التفاصيل ⚠️' : 'توسيع ومراجعة التفاصيل 👁️'}</span>
                        </Button>
                        <AnimatePresence>
                          {showSpecsInAuto && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="border-t border-slate-100 bg-slate-50/50 p-4 overflow-hidden"
                            >
                              <SmartSpecsWizard
                                projectType={newProject.projectType}
                                onChange={(specs) => {
                                  setNewProject((prev: any) => ({
                                    ...prev,
                                    ...specs
                                  }));
                                }}
                                initialSpecs={newProject}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {/* شاشة البيانات والعميل (الخطوة 3 للهجين / الخطوة 2 لليدوي) */}
                  {((creationMode === 'hybrid' && activeStep === 3) || (creationMode === 'manual' && activeStep === 2)) && (
                    <motion.div
                      key="step_basic_info"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-2 border-r-4 border-indigo-600 pr-3 mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {creationMode === 'hybrid' ? 'الخطوة 3: معلومات المشروع وتحديد العميل واللوحة' : 'الخطوة 2: معلومات المشروع وتحديد العميل واللوحة'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">عنوان المشروع *</Label>
                          <Input 
                            value={newProject.title}
                            onChange={e => setNewProject({...newProject, title: e.target.value})}
                            placeholder="مثال: لوحة واجهة محل - فرع السليمانية" 
                            className={`h-11 rounded-xl bg-slate-50 border-transparent transition-all font-bold text-xs shadow-inner ${
                              highlightedFields.title ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-primary/20 focus:bg-white'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">نوع عمل مقاولة الدعاية والإعلان *</Label>
                          <select
                            value={newProject.projectType}
                            onChange={e => setNewProject({...newProject, projectType: e.target.value})}
                            className={`w-full h-11 rounded-xl bg-slate-50 border-slate-200 transition-all font-bold text-xs shadow-inner pr-3 pl-8 focus:border-indigo-500 focus:bg-white focus:ring-0 ${
                              highlightedFields.projectType ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : ''
                            }`}
                          >
                            <option value="fence_shinko">🚧 سور شينكو (مؤقت للمواقع والإنشاءات)</option>
                            <option value="fence_commercial">🎨 سور تجاري مكسو (خشب، أسمنت بورد، أو بنر)</option>
                            <option value="fence_chainlink">🔗 سور شبك (حماية مزارع، ومناطق مفتوحة)</option>
                            <option value="hoardings">أسوار أخرى (تجهيز المواقع والمشاريع الخارجية)</option>
                            <option value="signage_printing">لوحات وطباعة (واجهات، يوني بول، بنر وفليكس)</option>
                            <option value="cladding_letters">كلادينج وحروف بارزة (مضيئة، زنكور، اكريليك)</option>
                            <option value="digital_screens">شاشات ومجسمات (LED وتجهيز معارض)</option>
                            <option value="exhibition_booths">تجهيز معارض ومؤتمرات (بناء أجنحة وبوثات)</option>
                            <option value="wrapping_branding">تغليف مركبات (تغليف وتغيير هوية السيارات)</option>
                            <option value="maintenance">صيانة لوحات وشاشات (وقائية وتصحيحية)</option>
                            <option value="megastructures">مجسمات ضخمة (جمالية وهندسية ضخمة)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">المساحة الإجمالية أو المقاسات الفنية</Label>
                          <Input 
                            value={newProject.totalArea}
                            onChange={e => setNewProject({...newProject, totalArea: e.target.value})}
                            placeholder="مثال: لوحة 4x3 م أو مساحة 120م٢" 
                            className={`h-11 rounded-xl bg-slate-50 border-transparent transition-all font-bold text-xs shadow-inner ${
                              highlightedFields.totalArea ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-primary/20 focus:bg-white'
                            }`}
                          />
                        </div>
                      </div>

                      {/* اختيار العميل من ألف ياء */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">اختر عميل من النظام (ألف ياء ERP) *</Label>
                        <AliphiaClientSelector
                          selectedClientId={selectedAliphiaClientId}
                          onSelect={(client) => {
                            if (client) {
                              setNewProject(prev => ({
                                ...prev,
                                clientName: client.name,
                                clientPhone: client.phone || prev.clientPhone,
                                clientEmail: client.email || prev.clientEmail
                              }));
                              setSelectedAliphiaClientId(client.id);
                              toast.success(`تم اختيار العميل بنجاح: ${client.name}`);
                            } else {
                              setNewProject(prev => ({ ...prev, clientName: '', clientPhone: '', clientEmail: '' }));
                              setSelectedAliphiaClientId('');
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100 flex flex-col justify-center space-y-3">
                          <h4 className="font-black text-emerald-900 text-xs flex items-center gap-1.5"><UsersRound className="w-4 h-4 text-emerald-500" /> بيانات العميل وتعديل جهات الاتصال</h4>
                          {newProject.clientName ? (
                            <div className="text-xs font-bold text-slate-600 space-y-2 mt-1">
                              <div>
                                <label className="text-[10px] text-slate-400 font-bold block mb-0.5">اسم العميل *</label>
                                <Input 
                                  value={newProject.clientName}
                                  onChange={e => setNewProject({...newProject, clientName: e.target.value})}
                                  placeholder="اسم العميل"
                                  className="h-9 rounded-lg bg-white border-slate-200 text-xs font-bold"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">رقم الجوال (واتساب) *</label>
                                  <Input 
                                    value={newProject.clientPhone}
                                    onChange={e => setNewProject({...newProject, clientPhone: e.target.value})}
                                    placeholder="مثال: 05xxxxxxxx"
                                    className="h-9 rounded-lg bg-white border-slate-200 text-xs font-bold text-left"
                                    dir="ltr"
                                  />
                                  {newProject.clientPhone && (
                                    (() => {
                                      const clean = newProject.clientPhone.replace(/[\s\-\(\)]/g, '');
                                      if (/^(?:\+?966|0)?1\d{8}$/.test(clean)) {
                                        return <span className="text-[9px] text-rose-500 font-bold block mt-1 leading-tight">⚠️ هاتف ثابت (أرضي) - لن تصله رسائل واتساب!</span>;
                                      }
                                      if (!/^(?:\+?966|0)?5\d{8}$/.test(clean)) {
                                        return <span className="text-[9px] text-amber-600 font-bold block mt-1 leading-tight">⚠️ صيغة جوال غير صالحة للواتساب</span>;
                                      }
                                      return <span className="text-[9px] text-emerald-600 font-bold block mt-1 leading-tight">✓ رقم جوال صالح للواتساب</span>;
                                    })()
                                  )}
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">البريد الإلكتروني</label>
                                  <Input 
                                    value={newProject.clientEmail}
                                    onChange={e => setNewProject({...newProject, clientEmail: e.target.value})}
                                    placeholder="client@email.com"
                                    className="h-9 rounded-lg bg-white border-slate-200 text-xs font-bold text-left"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-slate-400 mt-1">يرجى اختيار عميل من القائمة أعلاه</p>
                          )}
                        </div>

                        <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100 flex flex-col justify-center">
                          <h4 className="font-black text-indigo-900 text-xs flex items-center gap-1.5"><Lock className="w-4 h-4 text-indigo-500" /> حماية الدخول للمشروع</h4>
                          <div className="text-[10px] font-bold text-slate-600 space-y-1 mt-1">
                            <p>رمز الوصول للعميل: <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded shadow-sm text-xs tracking-widest">{newProject.clientPin}</span></p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input 
                                type="checkbox" 
                                id="sendCreds"
                                checked={newProject.sendClientCreds}
                                onChange={e => setNewProject({...newProject, sendClientCreds: e.target.checked})}
                                className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                              />
                              <label htmlFor="sendCreds" className="font-bold text-slate-600 text-[9px] cursor-pointer">
                                إرسال رمز الوصول وتفاصيل الدخول لهاتف العميل تلقائياً
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">الموقع الجغرافي (رابط خرائط جوجل Google Maps Link) *</Label>
                        <Input 
                          value={newProject.locationLink}
                          onChange={e => setNewProject({...newProject, locationLink: e.target.value})}
                          placeholder="https://maps.app.goo.gl/..."
                          className={`h-11 rounded-xl bg-slate-50 border-transparent transition-all shadow-inner font-bold text-xs text-left ${
                            highlightedFields.locationLink ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-primary/20 focus:bg-white'
                          }`}
                        />
                        {!validateLocationLink(newProject.locationLink) && (
                          <span className="text-[9px] text-rose-500 font-bold block mt-1">رابط الخريطة غير صحيح (يجب أن يكون رابط خرائط جوجل)</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">نطاق العمل وملاحظات العقد</Label>
                        <textarea 
                          value={newProject.description}
                          onChange={e => setNewProject({...newProject, description: e.target.value})}
                          rows={2}
                          placeholder="أدخل ملاحظات نطاق العمل الفنية العامة للالتزام بها..."
                          className={`w-full rounded-xl bg-slate-50 border-transparent shadow-inner font-bold p-3 text-xs focus:ring-0 transition-all ${
                            highlightedFields.description ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:bg-white'
                          }`}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* شاشة المعالج الذكي للمواصفات الفنية التكيفية (الخطوة 4 للهجين / الخطوة 3 لليدوي) */}
                  {((creationMode === 'hybrid' && activeStep === 4) || (creationMode === 'manual' && activeStep === 3)) && (
                    <motion.div
                      key="step_smart_specs"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 border-r-4 border-indigo-500 pr-3 mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {creationMode === 'hybrid' ? 'الخطوة 4: معالج مواصفات العمل التكيفية والهندسية' : 'الخطوة 3: معالج مواصفات العمل التكيفية والهندسية'}
                        </span>
                      </div>

                      {newProject.projectType && (
                        <div className="mt-1">
                          <SmartSpecsWizard
                            projectType={newProject.projectType}
                            onChange={(specs) => {
                              setNewProject((prev: any) => ({
                                ...prev,
                                ...specs
                              }));
                            }}
                            initialSpecs={newProject}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* شاشة الاعتماد والماليات والمشرف (الخطوة 5 للهجين / الخطوة 4 لليدوي) */}
                  {((creationMode === 'hybrid' && activeStep === 5) || (creationMode === 'manual' && activeStep === 4)) && (
                    <motion.div
                      key="step_financials"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      <div className="flex items-center gap-2 border-r-4 border-purple-500 pr-3 mb-2">
                        <span className="text-xs font-black text-slate-900 uppercase">
                          {creationMode === 'hybrid' ? 'الخطوة 5: التفاصيل المالية، المسؤوليات والجدولة الزمنية' : 'الخطوة 4: التفاصيل المالية، المسؤوليات والجدولة الزمنية'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">قيمة المشروع الكلية للعميل (ر.س) *</Label>
                          <div className="relative">
                            <Input 
                              type="text"
                              inputMode="numeric"
                              value={newProject.projectValue}
                              onChange={e => {
                                 const val = e.target.value.replace(/[^0-9]/g, '');
                                 setNewProject({...newProject, projectValue: Number(val)});
                              }}
                              className={`h-12 rounded-xl bg-slate-50 border-transparent transition-all font-black text-lg text-emerald-600 shadow-inner pr-12 text-left ${
                                highlightedFields.projectValue ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-emerald-500/20 focus:bg-white'
                              }`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">SAR</div>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 pr-1">القيمة المالية الكلية المدونة في العقد الأصلي لفوترة العميل.</p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">الميزانية التشغيلية الداخلية المخصصة (ر.س) *</Label>
                          <div className="relative">
                            <Input 
                              type="text"
                              inputMode="numeric"
                              value={newProject.budget}
                              onChange={e => {
                                 const val = e.target.value.replace(/[^0-9]/g, '');
                                 setNewProject({...newProject, budget: Number(val)});
                              }}
                              className={`h-12 rounded-xl bg-slate-50 border-transparent transition-all font-black text-lg text-amber-600 shadow-inner pr-12 text-left ${
                                highlightedFields.budget ? 'ring-2 ring-amber-500/50 bg-amber-50/50 border-amber-500/20' : 'focus:border-amber-500/20 focus:bg-white'
                              }`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">SAR</div>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 pr-1">الميزانية التشغيلية المخصصة لتنفيذ وشراء المواد (لا تظهر للعميل).</p>
                        </div>

                        {/* مؤشر الربحية الذكي المباشر */}
                        {(() => {
                          const val = newProject.projectValue || 0;
                          const bud = newProject.budget || 0;
                          if (val > 0) {
                            const profit = val - bud;
                            const marginPercent = Math.round((profit / val) * 100);
                            let bannerBg = "";
                            let bannerBorder = "";
                            let iconColor = "";
                            let titleText = "";
                            let descText = "";

                            if (marginPercent >= 30) {
                              bannerBg = "bg-emerald-50/75 backdrop-blur-sm";
                              bannerBorder = "border-emerald-500/20";
                              iconColor = "text-emerald-500";
                              titleText = `مؤشر الربحية ممتاز (هامش الربح المتوقع: ${marginPercent}%)`;
                              descText = `المشروع آمن مالياً ومربح بشكل ممتاز بقيمة صافية متوقعة تبلغ ${profit.toLocaleString()} ر.س.`;
                            } else if (marginPercent > 0) {
                              bannerBg = "bg-amber-50/75 backdrop-blur-sm";
                              bannerBorder = "border-amber-500/20";
                              iconColor = "text-amber-500";
                              titleText = `مؤشر الربحية مقبول لكنه منخفض (هامش الربح المتوقع: ${marginPercent}%)`;
                              descText = `هامش الربح في النطاق الضيق بقيمة صافية متوقعة تبلغ ${profit.toLocaleString()} ر.س. يفضل مراجعة بنود الميزانية التشغيلية لتجنب أي زيادة في تكاليف الإنتاج.`;
                            } else {
                              bannerBg = "bg-rose-50/75 backdrop-blur-sm";
                              bannerBorder = "border-rose-500/20";
                              iconColor = "text-rose-500";
                              titleText = `تحذير مالي حرج: هامش ربح سلبي أو صفري (${marginPercent}%)`;
                              descText = `خطورة خسارة مادية! الميزانية التشغيلية المخصصة (${bud.toLocaleString()} ر.س) أعلى من أو تساوي قيمة العقد للعميل (${val.toLocaleString()} ر.س). يرجى مراجعة الأسعار فوراً قبل الاعتماد والبدء.`;
                            }

                            return (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="md:col-span-2 p-4 rounded-xl border flex gap-3 items-start transition-all shadow-sm bg-slate-50/50"
                                style={{
                                  backgroundColor: marginPercent >= 30 ? 'rgba(16, 185, 129, 0.08)' : marginPercent > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                  borderColor: marginPercent >= 30 ? 'rgba(16, 185, 129, 0.2)' : marginPercent > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                                }}
                              >
                                <div className={`p-2 rounded-lg bg-white shadow-sm ${iconColor}`}>
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    {marginPercent >= 30 ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    ) : marginPercent > 0 ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    )}
                                  </svg>
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className={`text-xs font-black ${iconColor}`}>{titleText}</h4>
                                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{descText}</p>
                                </div>
                              </motion.div>
                            );
                          }
                          return null;
                        })()}
                        
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">المشرف المسؤول من المهندسين/الموظفين في النظام *</Label>
                          <select
                            value={newProject.supervisor}
                            onChange={e => setNewProject({...newProject, supervisor: e.target.value})}
                            className={`w-full h-11 rounded-xl bg-slate-50 border-slate-200 transition-all font-bold text-xs shadow-inner pr-3 pl-8 focus:border-indigo-500 focus:bg-white focus:ring-0 ${
                              highlightedFields.supervisor ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : ''
                            }`}
                          >
                            <option value="">-- اختر المهندس/المشرف الميداني المسؤول --</option>
                            {usersList.map(u => (
                              <option key={u.id || u.uid} value={u.name}>
                                {u.name} ({u.role === 'manager' ? 'مدير' : u.role === 'supervisor' ? 'مشرف' : u.role === 'sales_rep' ? 'مندوب' : 'موظف'})
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] font-bold text-slate-400 pr-1">المشرف أو المسؤول الميداني المباشر لتسليم المهام وتصنيع المواد.</p>
                        </div>
                      </div>

                      {/* تعيين الموظفين الجغرافي (Smart Zones) */}
                      <div className="space-y-1.5 pt-3 border-t border-slate-100 md:col-span-2">
                        <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1 flex items-center justify-between">
                          الموظفون المكلفون بالعمل (Smart Zones)
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {newProject.assignedEmployees?.length || 0} محدد
                          </span>
                        </Label>
                        <div className="max-h-[150px] overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                          {usersList.map(emp => {
                            const isChecked = newProject.assignedEmployees?.includes(emp.uid || emp.id);
                            return (
                              <label key={emp.id || emp.uid} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const currentAssigned = newProject.assignedEmployees || [];
                                    if (e.target.checked) {
                                      setNewProject({...newProject, assignedEmployees: [...currentAssigned, emp.uid || emp.id]});
                                    } else {
                                      setNewProject({...newProject, assignedEmployees: currentAssigned.filter(id => id !== (emp.uid || emp.id))});
                                    }
                                  }}
                                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                                <span className="text-[10px] text-slate-400 mr-auto">{emp.role === 'manager' ? 'مدير' : emp.role === 'supervisor' ? 'مشرف' : 'موظف'}</span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 pr-1">الموظفون المسموح لهم بتسجيل الدخول والانصراف في موقع هذا المشروع.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">تاريـخ البدء والتشغيل</Label>
                          <Input 
                            type="date"
                            value={newProject.startDate}
                            onChange={e => setNewProject({...newProject, startDate: e.target.value})}
                            className={`h-11 rounded-xl bg-slate-50 border-transparent transition-all shadow-inner font-bold text-xs ${
                              highlightedFields.startDate ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-primary/20 focus:bg-white'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="font-black text-slate-500 text-[10px] uppercase tracking-wider pr-1">تاريـخ الانتهاء والتركيب (تقديري)</Label>
                          <Input 
                            type="date"
                            value={newProject.endDate}
                            onChange={e => setNewProject({...newProject, endDate: e.target.value})}
                            className={`h-11 rounded-xl bg-slate-50 border-transparent transition-all shadow-inner font-bold text-xs ${
                              highlightedFields.endDate ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 border-emerald-500/20' : 'focus:border-primary/20 focus:bg-white'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* قائمة الشروط والمتمتطلبات التفاعلية الذكية لضمان سلامة البيانات */}
              {(() => {
                const missing = getMissingRequirements();
                // لا داعي لعرض القائمة إذا كنا في الخطوة الأولى ولم يتم اختيار النمط بعد لتجنب تشتيت المستخدم
                if (activeStep === 1 && !creationMode) return null;
                
                return (
                  <div className={`mt-4 p-4 rounded-2xl border transition-all duration-300 text-right ${
                    missing.length > 0 
                      ? 'bg-rose-50/40 border-rose-100/60 shadow-sm' 
                      : 'bg-emerald-50/40 border-emerald-100/60 shadow-sm'
                  }`}>
                    {missing.length > 0 ? (
                      <div className="space-y-2.5" dir="rtl">
                        <div className="flex items-center gap-2 text-rose-800 font-black text-xs">
                          <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                            <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" />
                          </div>
                          <span>شروط متبقية للمتابعة لتجنب الأخطاء ({missing.length}):</span>
                        </div>
                        <ul className="space-y-1.5 pr-1">
                          {missing.map((req, i) => (
                            <li key={i} className="text-[10px] text-rose-700 font-bold flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 text-emerald-800 font-black text-xs" dir="rtl">
                        <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 animate-pulse">
                          ✓
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-xs">جميع الشروط والتحققات مستوفاة وصحيحة بنسبة 100% ✨</span>
                          <span className="text-[9px] text-emerald-600 font-bold">تم التحقق من كافة الحقول وصلاحية أرقام الجوال وخريطة الموقع بنجاح.</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* أزرار التحكم بالخطوات والاعتماد الديناميكية التكيفية */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
                <div>
                  {activeStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSavingProject}
                      onClick={() => {
                        if (activeStep === 2) {
                          setCreationMode(null); // إعادة تهيئة اختيار النمط عند العودة للأصل
                        }
                        setActiveStep(prev => prev - 1);
                      }}
                      className="h-11 px-5 rounded-xl border-slate-200 bg-white font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                      رجوع للنمط السابق
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* تحديد إن كانت الخطوة الحالية هي الخطوة الأخيرة بناءً على نمط التأسيس المختار */}
                  {(() => {
                    const isLastStep = 
                      (creationMode === 'auto' && activeStep === 3) ||
                      (creationMode === 'manual' && activeStep === 4) ||
                      (creationMode === 'hybrid' && activeStep === 5) ||
                      (!creationMode && activeStep === 1);

                    const missing = getMissingRequirements();
                    const isStepInvalid = missing.length > 0;

                    if (!isLastStep) {
                      return (
                        <Button
                          type="button"
                          onClick={() => {
                            if (isStepInvalid) {
                              toast.error("⚠️ يرجى استكمال وتصحيح الشروط المطلوبة أولاً للمتابعة!");
                              return;
                            }
                            setActiveStep(prev => prev + 1);
                          }}
                          disabled={isStepInvalid}
                          className={`h-11 px-6 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow ${
                            isStepInvalid
                              ? 'bg-slate-150 text-slate-400 opacity-60 cursor-not-allowed shadow-none border border-slate-200/50'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-[1.02] active:scale-95'
                          }`}
                        >
                          المتابعة خطوة بخطوة
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      );
                    } else {
                      // زر الحفظ النهائي والاعتماد الفوري
                      return (
                        <Button 
                          type="button"
                          onClick={() => {
                            if (isStepInvalid) {
                              toast.error(`⚠️ يرجى استيفاء كافة الشروط أولاً: ${missing.join(' | ')}`);
                              return;
                            }
                            handleCreateProject();
                          }}
                          disabled={isSavingProject || isStepInvalid}
                          className={`h-12 px-7 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                            isStepInvalid
                              ? 'bg-slate-150 text-slate-400 opacity-60 cursor-not-allowed shadow-none border border-slate-200/50'
                              : 'bg-slate-900 hover:bg-emerald-600 text-white hover:scale-[1.02] active:scale-95'
                          }`}
                        >
                          {isSavingProject ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              جاري تأسيس وحساب الخامات...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              تأسيس المشروع واعتماده فوراً ✨
                            </>
                          )}
                        </Button>
                      );
                    }
                  })()}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 📋 Details Dialog */}
      <Dialog open={detailsDialog !== null} onOpenChange={(open) => !open && setDetailsDialog(null)}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-3xl rounded-[2.5rem] p-6 border-none max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right font-black text-xl mb-4">{detailsDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {detailsDialog && (() => {
              const today = new Date().toISOString().split('T')[0];
              const activeProjects = projects.filter(p => p.status !== 'cancelled');
              
              let list: any[] = [];
              if (detailsDialog.type === 'active') {
                list = activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress');
              } else if (detailsDialog.type === 'planning') {
                list = activeProjects.filter(p => p.status === 'planning');
              } else if (detailsDialog.type === 'completed') {
                list = activeProjects.filter(p => p.status === 'completed');
              } else if (detailsDialog.type === 'delayed') {
                list = activeProjects.filter(p => p.status !== 'completed' && p.status !== 'maintenance' && p.endDate && p.endDate < today);
              } else if (detailsDialog.type === 'portal') {
                list = activeProjects.filter(p => !!p.clientPin);
              } else if (detailsDialog.type === 'workers') {
                const activeWorkers = new Set<string>();
                activeProjects.filter(p => p.status === 'active' || p.status === 'in-progress').forEach(p => {
                  if (p.workerIds) p.workerIds.forEach(w => activeWorkers.add(w));
                });
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from(activeWorkers).map(wId => {
                      const worker = usersList.find(u => u.id === wId || u.uid === wId);
                      return (
                        <div key={wId as string} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 font-black">
                            {worker?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{worker?.name || 'غير معروف'}</p>
                            <p className="text-xs text-slate-500 font-bold">{worker?.role === 'supervisor' ? 'مشرف' : 'موظف / فني'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (list.length === 0) {
                return <p className="text-center text-slate-500 font-bold py-8">لا يوجد بيانات لعرضها</p>;
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => { setDetailsDialog(null); setSelectedProjectId(p.id); }}>
                      <p className="font-black text-slate-900 text-sm mb-1">{p.title}</p>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 mt-2">
                        <span>{p.clientName || 'بدون عميل'}</span>
                        <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-black">{p.status === 'active' ? 'نشط' : p.status === 'planning' ? 'تخطيط' : p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>


      {/* 📊 Smart Stats Row */}
      <div className="w-full overflow-hidden max-w-[calc(100vw-2rem)] xl:max-w-full">
        <div className="flex flex-row overflow-x-auto no-scrollbar gap-3 mb-8 pb-2 snap-x w-full items-start">
        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md hover:border-primary/30 transition-all duration-300">
            <div className="flex items-center gap-3 w-full">
               <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                 <Briefcase className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1">
                 <p className="text-[10px] font-black text-slate-500 mb-0.5">إجمالي المشاريع</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900">{stats.totalValid}</span>
                   <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{stats.active} نشط</span>
                 </div>
               </div>
            </div>
            {renderCardList('active')}
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md hover:border-indigo-300 transition-all duration-300">
            <div className="flex items-center gap-3 w-full">
               <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                 <Layers className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1">
                 <p className="text-[10px] font-black text-slate-500 mb-0.5">قيد التخطيط</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900">{stats.planning}</span>
                   <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">تسعير</span>
                 </div>
               </div>
            </div>
            {renderCardList('planning')}
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex flex-col flex-1">
                <p className="text-[10px] font-black text-slate-500 mb-0.5">إجمالي الميزانيات</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-900">{stats.totalBudget.toLocaleString()}</span>
                  <span className="text-[9px] font-bold text-slate-500">SAR</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md hover:border-rose-300 transition-all duration-300">
            <div className="flex items-center gap-3 w-full">
               <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                 <Clock className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1">
                 <p className="text-[10px] font-black text-slate-500 mb-0.5">مشاريع متأخرة</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900">{stats.delayed}</span>
                   <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">مستعجل</span>
                 </div>
               </div>
            </div>
            {renderCardList('delayed')}
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md hover:border-blue-300 transition-all duration-300">
            <div className="flex items-center gap-3 w-full">
               <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                 <Globe className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1">
                 <p className="text-[10px] font-black text-slate-500 mb-0.5">بوابة العملاء</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900">{stats.portalUsers}</span>
                   <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">عميل مرتبط</span>
                 </div>
               </div>
            </div>
            {renderCardList('portal')}
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md hover:border-teal-300 transition-all duration-300">
            <div className="flex items-center gap-3 w-full">
               <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
                 <HardHat className="w-5 h-5" />
               </div>
               <div className="flex flex-col flex-1">
                 <p className="text-[10px] font-black text-slate-500 mb-0.5">العمالة النشطة</p>
                 <div className="flex items-baseline gap-2">
                   <span className="text-lg font-black text-slate-900">{stats.activeWorkers}</span>
                   <span className="text-[9px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">في المواقع</span>
                 </div>
               </div>
            </div>
            {renderCardList('workers')}
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col flex-1">
                <p className="text-[10px] font-black text-slate-500 mb-0.5">التحصيل (الدفعات)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-slate-900">{stats.totalCollected.toLocaleString()}</span>
                  <span className="text-[9px] font-bold text-slate-500">SAR</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-white flex flex-col items-start gap-0 hover:shadow-md transition-all h-full">
            <div className="flex items-center gap-3 w-full">
              <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="flex flex-col flex-1">
                <p className="text-[10px] font-black text-slate-500 mb-0.5">المبالغ المعلقة</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-rose-600">{stats.outstanding.toLocaleString()}</span>
                  <span className="text-[9px] font-bold text-rose-400">SAR</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="snap-start min-w-[160px] flex-1 group">
          <Card className="rounded-2xl border border-slate-200/60 shadow-sm p-4 bg-slate-900 flex flex-col items-start gap-0 hover:shadow-md hover:border-emerald-500/50 transition-all duration-300">
            <div className="flex flex-col justify-center gap-1 w-full">
              <div className="flex justify-between items-center w-full">
                <p className="text-[10px] font-black text-slate-400">نسبة الإنجاز ({stats.completed})</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-black text-white">{stats.totalValid > 0 ? Math.round((stats.completed / stats.totalValid) * 100) : 0}</span>
                  <span className="text-[9px] font-bold text-emerald-400">%</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                 <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.totalValid > 0 ? (stats.completed / stats.totalValid) * 100 : 0}%` }} />
              </div>
            </div>
            {renderCardList('completed')}
          </Card>
        </div>
      </div>
      </div>

      {/* 🔍 Search and Filters */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث عن مشروع بالاسم أو الوصف..." 
            className="w-full h-12 pl-4 pr-12 rounded-xl bg-white border border-slate-200 shadow-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex items-center gap-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden lg:block mx-1" />

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${statusFilter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
            >
              الكل
            </button>
            <button 
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${statusFilter === 'active' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
            >
              نشط
            </button>
            <button 
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all ${statusFilter === 'completed' ? 'bg-primary text-white shadow-md' : 'bg-white text-slate-500 border border-slate-100 hover:border-primary/50'}`}
            >
              مكتمل
            </button>
          </div>
        </div>
      </div>

      {/* 🖼️ Projects Display */}
      <AnimatePresence mode="popLayout">
        {filteredProjects.length > 0 ? (
          viewMode === 'grid' ? (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {filteredProjects.map((project) => (
                <ProjectGridCard key={project.id} project={project} onSelect={() => setSelectedProjectId(project.id)} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="space-y-4"
            >
              <div className="bg-slate-900/5 rounded-2xl p-4 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:flex">
                 <div className="w-[40%] px-4">اسم المشروع والمعلومات الأساسية</div>
                 <div className="w-[15%] text-center">الميزانية</div>
                 <div className="w-[15%] text-center">تاريخ البدء</div>
                 <div className="w-[15%] text-center">الحالة</div>
                 <div className="w-[15%] text-center">العمليات</div>
              </div>
              {filteredProjects.map((project) => (
                <ProjectListCard key={project.id} project={project} onSelect={() => setSelectedProjectId(project.id)} />
              ))}
            </motion.div>
          )
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center"
          >
            <div className="w-24 h-24 bg-slate-100/90 dark:bg-zinc-800 rounded-[2rem] shadow-sm border border-slate-200 flex items-center justify-center mb-8 text-slate-300">
               <Briefcase className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">لا توجد نتائج</h3>
            <p className="text-slate-500 font-bold max-w-sm px-6">
              لم يتم العثور على أي مشاريع تطابق شروط البحث الحالية. حاول تغيير الفلتر أو إضافة مشروع جديد.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ProjectGridCard = React.memo(({ project, onSelect }: { project: Project, onSelect: () => void }) => {
  const hasPhotos = project.photoUrls && project.photoUrls.length > 0;
  const progress = calculateProjectProgress(project);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onSelect}
      className="group cursor-pointer"
    >
      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col ring-0 h-auto overflow-hidden">
        {/* Compact Image Header */}
        <div className="relative h-28 overflow-hidden bg-slate-100 shrink-0">
          {hasPhotos ? (
            <img 
              src={project.photoUrls[0]} 
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              alt={project.title}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50/80">
              <Briefcase className="w-6 h-6 opacity-30 text-slate-400" />
            </div>
          )}
          
          {/* Top Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
            <Badge className={`border-none px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${
              project.status === 'active' ? 'bg-white text-slate-900' : 'bg-emerald-500 text-white'
            }`}>
              {project.status === 'active' ? '• نشط' : '• مكتمل'}
            </Badge>
          </div>
        </div>

        {/* Content Body */}
        <CardContent className="p-4 flex-1 flex flex-col bg-white">
          <div className="flex items-center justify-between mb-2">
             <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
               {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ar-SA') : 'جديد'}
             </span>
             {project.clientName && (
               <div className="flex items-center gap-1 text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                 <span className="truncate">{project.clientName}</span>
               </div>
             )}
          </div>

          <h3 className="text-sm font-black text-slate-900 mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-1">
            {project.title}
          </h3>
          
          <p className="text-[10px] font-bold text-slate-500 line-clamp-1 mb-3">
            {project.description || 'لا يوجد وصف متاح..'}
          </p>

          <div className="mt-auto border-t border-slate-50 pt-3 flex items-center justify-between">
            <div className="flex flex-col gap-0.5 w-1/2">
               <p className="text-[8px] font-black text-slate-400 uppercase">الميزانية</p>
               <div className="flex items-baseline gap-1">
                 <span className="text-xs font-black text-slate-900">{(project.projectValue ?? project.budget ?? 0).toLocaleString()}</span>
                 <span className="text-[8px] font-bold text-slate-400">SAR</span>
               </div>
            </div>
            
            <div className="w-1/2 text-left flex flex-col items-end gap-1">
               <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black uppercase text-slate-400">الإنجاز</span>
                  <span className="text-[10px] font-black text-emerald-600">{progress}%</span>
               </div>
               <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const ProjectListCard = React.memo(({ project, onSelect }: { project: Project, onSelect: () => void }) => {
  const hasPhotos = project.photoUrls && project.photoUrls.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      onClick={onSelect}
      className="group cursor-pointer"
    >
      <Card className="rounded-2xl border border-slate-200/60 bg-white shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden ring-0">
        <div className="p-3 flex flex-col lg:flex-row lg:items-center gap-5">
           {/* Project Info */}
           <div className="lg:w-[40%] flex items-center gap-4 px-1">
              <div className="h-14 w-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                 {hasPhotos ? (
                    <img src={project.photoUrls[0]} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-200">
                       <Briefcase className="w-5 h-5 opacity-30" />
                    </div>
                 )}
              </div>
              <div className="min-w-0">
                 <h4 className="text-base font-black text-slate-900 group-hover:text-primary transition-colors truncate">{project.title}</h4>
                 <div className="flex items-center gap-3 mt-0.5 text-slate-400">
                    <div className="flex items-center gap-1.5">
                       <MapPin className="w-2.5 h-2.5" />
                       <span className="text-[9px] font-bold">الرياض، المملكة</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Budget */}
           <div className="lg:w-[15%] text-center">
              <p className="text-[9px] font-black text-slate-300 lg:hidden uppercase mb-1">قيمة المشروع</p>
              <div className="flex items-baseline justify-center gap-1">
                 <span className="text-xl font-black text-slate-900">{(project.projectValue ?? project.budget ?? 0).toLocaleString()}</span>
                 <span className="text-[9px] font-bold text-slate-400">SAR</span>
              </div>
           </div>

           {/* Date */}
           <div className="lg:w-[15%] text-center">
              <p className="text-[9px] font-black text-slate-300 lg:hidden uppercase mb-1">تاريخ البدء</p>
              <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-sm underline decoration-slate-200 underline-offset-4">
                 <Clock className="w-3 h-3" />
                 <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString('ar-SA') : '-'}</span>
              </div>
           </div>

           {/* Status */}
           <div className="lg:w-[15%] text-center flex justify-center">
              <p className="text-[9px] font-black text-slate-300 lg:hidden uppercase mb-1">الحالة</p>
              <Badge className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-none ${
                 project.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-600'
              }`}>
                 {project.status === 'active' ? 'نشط ميدانياً' : 'مكتمل'}
              </Badge>
           </div>

           {/* More */}
           <div className="lg:w-[15%] flex justify-center gap-2">
              <Button size="icon" variant="ghost" className="rounded-xl hover:bg-slate-50 font-black text-slate-400 hover:text-primary">
                 <MoreVertical className="w-4 h-4" />
              </Button>
              <Button size="icon" className="rounded-xl bg-slate-900 hover:bg-primary text-white shadow-lg shadow-slate-200">
                 <ArrowUpRight className="w-4 h-4" />
              </Button>
           </div>
        </div>
      </Card>
    </motion.div>
  );
});
