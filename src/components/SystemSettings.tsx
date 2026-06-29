import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Save, 
  Trash2, 
  Loader2, 
  Building2, 
  Settings as SettingsIcon, 
  Globe, 
  Radius,
  ShieldCheck,
  Building,
  CreditCard,
  Wallet,
  Database,
  Trash,
  Volume2,
  ShieldAlert,
  RefreshCw,
  Paintbrush,
  Palette,
  Home,
  Mail,
  Send,
  Sparkles,
  Clock,
  Check,
  HelpCircle,
  Eye,
  EyeOff,
  MessageCircle,
  Smartphone,
  Phone,
  Info,
  AlertTriangle
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
  writeBatch,
  where
} from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BankAccount } from '../types';
import { useAuth } from '../lib/AuthContext';
import { getCompanyQuery } from '../lib/firestoreUtils';
import { sendNotification } from '../lib/notifications';
import { sendWhatsappMessage } from '../lib/whatsapp';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CompanyProfile from './CompanyProfile';
import GeminiKeyCard from './GeminiKeyCard';
import AliphiaStatusCard from './AliphiaStatusCard';
import AliphiaSettingsModal from './AliphiaSettingsModal';
import CompaniesManagement from './CompaniesManagement';

export default function SystemSettings({ initialTab }: { initialTab?: string }) {
  const { user, profile, activeCompanyId } = useAuth();

  if (user?.email !== 'expertadvsa@gmail.com') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px] bg-white rounded-3xl border border-slate-100 shadow-sm" dir="rtl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">عذراً، هذه الصفحة مخصصة للمالك فقط</h2>
        <p className="text-sm text-slate-500 max-w-md">لا تملك صلاحية الوصول إلى إعدادات المنصة والمفاتيح السرية الحساسة.</p>
      </div>
    );
  }

  const isManager = profile?.role === 'manager';

  const [activeTab, setActiveTab] = useState<string>('');
  const [offices, setOffices] = useState<any[]>([]);
  const [housing, setHousing] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showHub, setShowHub] = useState<boolean>(true);

  useEffect(() => {
    if (initialTab !== undefined) {
      if (initialTab === '') {
        setShowHub(true);
      } else {
        setActiveTab(initialTab);
        setShowHub(false);
      }
    }
  }, [initialTab]);

  // Helper function to get status summary for settings tabs
  const getTabStatus = (id: string) => {
    switch (id) {
      case 'company_profile':
        return { label: settings.companyName ? 'مكتمل ✅' : 'غير مكتمل ⚠️' };
      case 'general':
        return { label: 'مكتمل ✅' };
      case 'notifications':
        return { label: 'نشط 📬' };
      case 'attendance':
        return { label: `سياج ${settings.attendanceRadius}م 📍` };
      case 'ai':
        return { label: settings.geminiApiKey ? 'متصل ⚡' : 'غير متصل 🔌' };
      case 'locations':
        return { label: `${offices.length + housing.length} مقرات/سكن` };
      case 'banks':
        return { label: `${bankAccounts.length} حسابات/خزائن` };
      case 'theme':
        return { label: 'نشط 🎨' };
      case 'data':
        return { label: 'مؤمن 🔒' };
      case 'aliphia':
        return { label: 'جاهز 🔌' };
      default:
        return { label: 'جاهز' };
    }
  };

  // Helper function to get color and visual styles for settings tabs
  const getTabColorInfo = (id: string) => {
    switch (id) {
      case 'company_profile':
        return { gradient: 'from-blue-500 to-indigo-600' };
      case 'general':
        return { gradient: 'from-slate-700 to-slate-900' };
      case 'notifications':
        return { gradient: 'from-sky-400 to-blue-500' };
      case 'attendance':
        return { gradient: 'from-amber-500 to-orange-600' };
      case 'ai':
        return { gradient: 'from-purple-500 to-violet-600 animate-[pulse_2s_infinite]' };
      case 'banks':
        return { gradient: 'from-green-500 to-emerald-600' };
      case 'theme':
        return { gradient: 'from-pink-500 to-rose-600' };
      case 'data':
        return { gradient: 'from-red-500 to-rose-700' };
      case 'aliphia':
        return { gradient: 'from-emerald-500 to-teal-500' };
      default:
        return { gradient: 'from-primary to-primary-dark' };
    }
  };

  // Helper function to get descriptions for settings tabs
  const getTabDescription = (id: string) => {
    switch (id) {
      case 'company_profile':
        return 'تحديث بيانات السجل التجاري، الأوراق الحكومية، والعنوان الوطني الرسمي.';
      case 'general':
        return 'إدارة معلومات المؤسسة الأساسية، العملة الافتراضية، التفضيلات الضريبية والمالية.';
      case 'notifications':
        return 'تخصيص قوالب الرسائل البريدية التلقائية وإشعارات الرواتب والوثائق المنتهية.';
      case 'attendance':
        return 'تحديد ساعات العمل، أيام الإجازات الأسبوعية، ونطاق السياج الجغرافي للمواقع.';
      case 'ai':
        return 'ربط مفتاح ذكاء Gemini، وتخصيص تفضيلات الموجز الصوتي الإداري اليومي.';
      case 'banks':
        return 'تسجيل الحسابات البنكية للمؤسسة، وصناديق النقد (الكاش) وإدارتها.';
      case 'theme':
        return 'تعديل تفضيلات المظهر (فاتح/داكن)، الألوان المخصصة، وحواف البطاقات.';
      case 'data':
        return 'تنظيف قاعدة البيانات من البيانات التجريبية، صيانة الكاش، ورفع مستوى الأمان.';
      case 'whatsapp':
        return 'ربط النظام بخدمات واتساب المجانية (مثل Evolution API / GreenAPI) وتخصيص قوالب رسائل النظام للعملاء والموظفين حسب الصلاحيات.';
      case 'aliphia':
        return 'إدارة الربط مع نظام ألف ياء المحاسبي، اختبار الاتصال، ومزامنة الفواتير والعملاء.';
      default:
        return 'تعديل وتخصيص إعدادات هذا القسم.';
    }
  };

  // Locations State
  const [employees, setEmployees] = useState<any[]>([]);
  const [newOffice, setNewOffice] = useState({
    name: '',
    type: 'office',
    latitude: '',
    longitude: '',
    locationLink: '',
    address: '',
    assignedEmployees: [] as string[]
  });

  // Bank Account State
  const [newAccount, setNewAccount] = useState({
    name: '',
    iban: '',
    type: 'bank' as 'bank' | 'cash',
    initialBalance: '0'
  });

  const [waLocalStatus, setWaLocalStatus] = useState<string>('disconnected');
  const [waQrData, setWaQrData] = useState<string | null>(null);

  // Global Settings State
  const [settings, setSettings] = useState({
    companyName: 'خبراء الرسم',
    companySub: 'للمقاولات والديكور',
    language: 'ar',
    attendanceRadius: 100,
    allowManualAttendance: false,
    currency: 'SAR',
    workingHoursStart: '08:00',
    workingHoursEnd: '17:00',
    taxRate: 15,
    taxNumber: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    logoUrl: 'https://i.imgur.com/yYZDeHZ.jpg',
    allowOvertime: false,
    weekendDays: 'الجمعة والسبت',
    sidebarColor: '#1a4d4e',
    primaryColor: '#2c7a7d',
    enableSmartSupplierMatching: true,
    calendarType: 'gregorian',
    geminiApiKey: '',

    enableAutoCategorization: true,
    housingLocations: [],
    emailTemplates: {
      payroll: {
        subject: 'إشعار صرف راتب - {month}',
        body: 'عزيزي الموظف {name}، تم إيداع راتبك لشهر {month} في حسابك البنكي بنجاح.\n\nنتمنى لك دوام التوفيق والنجاح.',
        enabled: true
      },
      welcome: {
        subject: 'مرحباً بك في {companyName}',
        body: 'أهلاً بك {name} في فريق عملنا.\n\nيسعدنا انضمامك لأسرة {companyName}. تم تفعيل حسابك على النظام الإداري بنجاح.',
        enabled: true
      },
      expiry: {
        subject: 'تنبيه انتهاء وثيقة: {documentName}',
        body: 'عزيزي {name}، نود تذكيركم بأن وثيقة {documentName} ستنتهي بتاريخ {expiryDate}. يرجى اتخاذ الإجراء اللازم.',
        enabled: true
      }
    },
    briefingSettings: {
      includeFinance: true,
      includeAttendance: true,
      includeProjects: true,
      includePurchases: true,
      voiceSpeed: 1,
      voicePitch: 1
    },
    whatsappSettings: {
      enabled: false,
      provider: 'evolution', // 'evolution', 'greenapi', 'ultramsg', 'wwebjs'
      apiUrl: '',
      instanceId: '',
      token: '',
      managerPhone: '',
      notifyClientNewProject: true,
      notifyClientInvoice: true,
      notifyEmployeeMeeting: true,
      senderName: 'النظام الآلي'
    }
  });

  // Define All Navigation Tabs
  const tabs = [
    { id: 'companies', label: 'إدارة الشركات (المالك)', icon: Building2, roles: ['owner'], description: 'إنشاء وإدارة الشركات المتعددة في النظام' },
    { id: 'company_profile', label: 'هوية النظام الأساسية', icon: Building2, roles: ['manager', 'owner'], description: 'إدارة معلومات المنشأة والتفضيلات المالية وتخصيص الفواتير' },
    { id: 'general', label: 'الإعدادات العامة', icon: SettingsIcon, roles: ['manager', 'owner'], description: 'التحكم بالخيارات العامة للنظام' },
    { id: 'whatsapp', label: 'مكتبة واتساب المجانية والرسائل', icon: MessageCircle, roles: ['manager', 'owner'], description: 'إعداد رسائل واتساب الآلية والقوالب' },
    { id: 'notifications', label: 'البريد والإشعارات', icon: Mail, roles: ['manager', 'owner'], description: 'إدارة إشعارات البريد الإلكتروني والتنبيهات' },
    { id: 'attendance', label: 'نظام الدوام والـ GPS', icon: Clock, roles: ['manager', 'owner'], description: 'إعدادات تسجيل الحضور والانصراف والمواقع' },
    { id: 'ai', label: 'الذكاء الاصطناعي', icon: Sparkles, roles: ['manager', 'owner'], description: 'إعداد مفاتيح API وتفضيلات الذكاء الاصطناعي' },
    { id: 'locations', label: 'المقرات والسكن', icon: MapPin, roles: ['manager', 'owner'], description: 'إدارة مواقع العمل ومقرات سكن العمال' },
    { id: 'banks', label: 'الحسابات البنكية', icon: CreditCard, roles: ['manager', 'owner'], description: 'إدارة الحسابات البنكية وطرق الدفع' },
    { id: 'aliphia', label: 'الربط المحاسبي (ألف ياء)', icon: Globe, roles: ['manager', 'owner'], description: 'ربط النظام مع منصة ألف ياء المحاسبية' },
    { id: 'theme', label: 'المظهر والثيم البصري', icon: Paintbrush, roles: ['manager', 'supervisor', 'employee', 'owner'], description: 'تخصيص الألوان والمظهر البصري للنظام' },
    { id: 'data', label: 'إدارة البيانات والأمان', icon: Database, roles: ['manager', 'owner'], description: 'النسخ الاحتياطي وأمان البيانات' }
  ];

  // Include owner in roles check
  const visibleTabs = tabs.filter(tab => tab.roles.includes(profile?.role || 'employee') || profile?.role === 'owner');

  useEffect(() => {
    if (visibleTabs.length > 0 && !activeTab) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    // Load Locations
    const unsubOffices = onSnapshot(
      getCompanyQuery('offices', activeCompanyId),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        docs.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setOffices(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading offices:", error);
        setLoading(false);
      }
    );

    // Load Employees
    const unsubEmployees = onSnapshot(
      getCompanyQuery('users', activeCompanyId),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(docs);
      }
    );

    // Load Global Settings & Active Company Overrides
    const loadSettings = async () => {
      const docRef = doc(db, 'system', 'settings');
      const docSnap = await getDoc(docRef);
      let globalData: any = {};
      if (docSnap.exists()) {
        globalData = docSnap.data();
        if (globalData.housingLocations) setHousing(globalData.housingLocations);
      }
      
      let companyData = {};
      if (activeCompanyId) {
        const compSnap = await getDoc(doc(db, 'companies', activeCompanyId));
        if (compSnap.exists()) {
          const c = compSnap.data();
          companyData = {
            companyName: c.name || '',
            companySub: c.settings?.companySub || '',
            taxNumber: c.taxNumber || '',
            companyAddress: c.address || '',
            companyPhone: c.phone || '',
            companyEmail: c.email || '',
            logoUrl: c.logoUrl || '',
            sidebarColor: c.settings?.sidebarColor || globalData.sidebarColor || '#1a4d4e',
            primaryColor: c.settings?.primaryColor || globalData.primaryColor || '#2c7a7d',
          };
        }
      }

      setSettings(prev => ({ ...prev, ...globalData, ...companyData }));
    };
    loadSettings();

    // Load Bank Accounts
    const unsubBanks = onSnapshot(getCompanyQuery('bankAccounts', activeCompanyId), (snapshot) => {
      setBankAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
    });

    return () => {
      unsubOffices();
      unsubEmployees();
      unsubBanks();
    };
  }, [activeCompanyId]);

  const handleTestWhatsapp = async () => {
    if (!settings.whatsappSettings?.managerPhone) {
      toast.error('الرجاء إدخال رقم هاتف مدير النظام لاختبار الاتصال');
      return;
    }
    setIsTestingWhatsapp(true);
    try {
      toast.info('جاري إرسال رسالة اختبار لمدير النظام...');
      const success = await sendWhatsappMessage(
        settings.whatsappSettings.managerPhone,
        `*اختبار اتصال ناجح!* ✅\nهذه رسالة اختبار من نظام ${settings.companyName} للتأكد من عمل إشعارات الواتساب بشكل صحيح.`
      );
      if (success) {
        toast.success('تم إرسال رسالة الاختبار بنجاح!');
      } else {
        toast.error('فشل إرسال رسالة الاختبار. يرجى التأكد من تشغيل السيرفر ومن صحة الرقم (بدون أصفار أو رمز دولي، مثلا: 966500000000)');
      }
    } catch (e: any) {
      toast.error('حدث خطأ أثناء الاتصال بالخادم: ' + e.message);
    } finally {
      setIsTestingWhatsapp(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      if (activeCompanyId) {
        await updateDoc(doc(db, 'companies', activeCompanyId), {
           name: settings.companyName,
           taxNumber: settings.taxNumber,
           address: settings.companyAddress,
           phone: settings.companyPhone,
           email: settings.companyEmail,
           logoUrl: settings.logoUrl,
           settings: {
             companySub: settings.companySub,
             sidebarColor: settings.sidebarColor,
             primaryColor: settings.primaryColor,
           }
        });
      }

      // Fallback & Global Settings
      await setDoc(doc(db, 'system', 'settings'), {
        ...settings,
        updatedAt: new Date().toISOString()
      });

      await sendNotification({
        title: 'تحديث إعدادات النظام',
        message: `قام ${profile?.name} بتعديل إعدادات النظام العامة أو ألوان الهوية`,
        type: 'info',
        category: 'system',
        targetRole: 'manager',
        priority: 'medium'
      });

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSystemReset = async () => {
    if (!user) return;
    setIsSubmitting(true);
    const loadingToast = toast.loading('جاري تنظيف النظام من البيانات التجريبية...');
    
    try {
      const collectionsToClear = [
        'projects', 
        'transactions', 
        'inventory', 
        'attendance', 
        'dailyLogs', 
        'notifications', 
        'workerTransactions', 
        'workers', 
        'subcontractors',
        'activities'
      ];

      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      // Special case for users: Keep only the current admin
      const userSnap = await getDocs(query(collection(db, 'users'), where('email', '!=', user.email?.toLowerCase())));
      const userBatch = writeBatch(db);
      userSnap.docs.forEach((d) => userBatch.delete(d.ref));
      await userBatch.commit();

      toast.dismiss(loadingToast);
      toast.success('تم تنظيف النظام بنجاح. يمكنك الآن البدء بإدخال البيانات الفعلية.');
      window.location.reload(); // Refresh to clear state
    } catch (error) {
      console.error("Reset Error:", error);
      toast.dismiss(loadingToast);
      toast.error('حدث خطأ أثناء تنظيف البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsSubmitting(true);
      const loadingToast = toast.loading('جاري مسح الذاكرة المؤقتة...');
      
      // 1. Clear Local Storage
      localStorage.clear();
      
      // 2. Clear Session Storage
      sessionStorage.clear();
      
      // 3. Clear Service Worker Caches if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      toast.dismiss(loadingToast);
      toast.success('تم مسح الذاكرة المؤقتة بنجاح، سيتم تحديث النظام', { icon: '🔄' });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء مسح الذاكرة المؤقتة');
      setIsSubmitting(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name) {
      toast.error('يرجى إدخال اسم الحساب');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bankAccounts'), {
        ...newAccount,
        companyId: activeCompanyId || null,
        initialBalance: parseFloat(newAccount.initialBalance) || 0,
        createdAt: serverTimestamp()
      });

      await sendNotification({
        title: 'حساب مالي جديد',
        message: `تمت إضافة حساب ${newAccount.name} (${newAccount.type}) إلى ميزانية المؤسسة`,
        type: 'success',
        category: 'financial',
        targetRole: 'manager',
        priority: 'medium'
      });

      toast.success('تمت إضافة الحساب بنجاح');
      setNewAccount({ name: '', iban: '', type: 'bank', initialBalance: '0' });
    } catch (e) {
      toast.error('فشل في إضافة الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      await deleteDoc(doc(db, 'bankAccounts', id));
      toast.success('تم حذف الحساب');
    } catch (error) {
      toast.error('فشل في حذف الحساب');
    }
  };

  const handleAddOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let parsedLat = newOffice.latitude;
      let parsedLng = newOffice.longitude;
      
      if (newOffice.locationLink) {
        const url = newOffice.locationLink;
        const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        
        if (atMatch && atMatch.length >= 3) {
          parsedLat = atMatch[1];
          parsedLng = atMatch[2];
        } else if (qMatch && qMatch.length >= 3) {
          parsedLat = qMatch[1];
          parsedLng = qMatch[2];
        }
      }

      if (!parsedLat || !parsedLng) {
        throw new Error('يرجى إدخال رابط خرائط جوجل صحيح يحتوي على الإحداثيات');
      }
      
      await addDoc(collection(db, 'offices'), {
        ...newOffice,
        companyId: activeCompanyId || null,
        latitude: parseFloat(parsedLat),
        longitude: parseFloat(parsedLng),
        createdAt: new Date().toISOString()
      });

      // Notify the assigned employees
      for (const empId of newOffice.assignedEmployees) {
        await sendNotification({
          title: 'تعيين مقر عمل',
          message: `تم تعيينك للدوام في المقر الجديد: ${newOffice.name}. يرجى الالتزام بالحضور ضمن النطاق.`,
          type: 'info',
          category: 'system',
          targetRole: 'worker', // Will be ignored if targetUserId is set
          targetUserId: empId,
          priority: 'high'
        });
      }

      await sendNotification({
        title: 'إضافة مقر جديد',
        message: `تم تسجيل مقر جديد: ${newOffice.name} وتعيين ${newOffice.assignedEmployees.length} موظفين.`,
        type: 'info',
        category: 'system',
        targetRole: 'manager',
        priority: 'low'
      });

      toast.success('تمت إضافة المقر بنجاح');
      setNewOffice({ name: '', type: 'office', latitude: '', longitude: '', locationLink: '', address: '', assignedEmployees: [] });
    } catch (error: any) {
      toast.error(error.message || 'فشل في إضافة المقر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOffice = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المقر؟')) return;
    try {
      await deleteDoc(doc(db, 'offices', id));
      toast.success('تم حذف المقر');
    } catch (error) {
      toast.error('فشل في حذف المقر');
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      toast.promise(
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setNewOffice(prev => ({
                ...prev,
                latitude: pos.coords.latitude.toString(),
                longitude: pos.coords.longitude.toString()
              }));
              resolve(pos);
            },
            reject
          );
        }),
        {
          loading: 'جاري تحديد موقعك الحالي...',
          success: 'تم التقاط الإحداثيات بنجاح',
          error: 'فشل في تحديد الموقع'
        }
      );
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'whatsapp' && settings.whatsappSettings?.enabled) {
      const fetchWaStatus = async () => {
        try {
          const baseUrl = settings.whatsappSettings?.apiUrl?.replace(/\/$/, '') || '/api/whatsapp';
          const res = await fetch(`${baseUrl}/status`);
          if (res.ok) {
            const data = await res.json();
            setWaLocalStatus(data.status);
            setWaQrData(data.qr);
          } else {
            console.error('WhatsApp API Error:', await res.text());
          }
        } catch(e) {
          console.error('WhatsApp Local Server is not running or proxy failed:', e);
          setWaLocalStatus('error');
        }
      };
      fetchWaStatus();
      interval = setInterval(fetchWaStatus, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeTab, settings.whatsappSettings?.enabled]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4" dir="rtl">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black text-slate-400">جاري تحميل إعدادات النظام وتحديث المظهر...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-24 px-2 md:px-4" dir="rtl">
      {showHub ? (
        <div>
          {/* Title Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-1">

              <p className="text-slate-500 font-bold text-sm">إدارة هوية الشركة، نظام الأمان، تفضيلات المظهر والذكاء الاصطناعي</p>
            </div>
            <div className="flex items-center gap-3 bg-white/80 border border-slate-200/60 backdrop-blur-md rounded-2xl py-2.5 px-4 shadow-sm h-fit">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 leading-none">صلاحية الدخول الحالية</p>
                <p className="text-xs font-black text-slate-800 mt-1">
                  {profile?.role === 'manager' ? '👑 مدير عام النظام' : profile?.role === 'supervisor' ? '⚡ مشرف النظام' : '💎 موظف'}
                </p>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleTabs.map((tab) => {
              const status = getTabStatus(tab.id);
              const colorInfo = getTabColorInfo(tab.id);
              return (
                <motion.div
                  key={tab.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setShowHub(false);
                  }}
                  className="cursor-pointer group relative p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/50 dark:border-zinc-800/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between min-h-[175px]"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${colorInfo.gradient} text-white shadow-md group-hover:scale-105 transition-transform duration-300`}>
                      <tab.icon className="w-5.5 h-5.5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-800 dark:text-zinc-150 group-hover:text-primary transition-colors text-sm leading-snug">
                        {tab.label}
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-bold leading-normal">
                        {getTabDescription(tab.id)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/50 pt-3 mt-4">
                    <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      {status.label}
                    </span>
                    <span className="text-[10px] font-black text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      تعديل الإعدادات <span className="text-sm">←</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[1400px] mx-auto">
          {/* Breadcrumbs Header */}
          <div className="flex flex-col gap-3 mb-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-zinc-500">
              <span className="cursor-pointer hover:text-primary transition-colors flex items-center gap-1" onClick={() => {
                if (visibleTabs.length > 1) setShowHub(true);
              }}>
                <SettingsIcon className="w-3.5 h-3.5" />
                لوحة الإعدادات
              </span>
              <span>/</span>
              <span className="text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{visibleTabs.find(t => t.id === activeTab)?.label}</span>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-3">
                  {React.createElement(visibleTabs.find(t => t.id === activeTab)?.icon || SettingsIcon, {
                    className: "w-8 h-8 text-primary p-1.5 bg-primary/10 rounded-xl"
                  })}
                  {visibleTabs.find(t => t.id === activeTab)?.label}
                </h1>
                <p className="text-slate-500 text-sm font-medium">{visibleTabs.find(t => t.id === activeTab)?.description}</p>
              </div>

              {visibleTabs.length > 1 && (
                <Button
                  onClick={() => setShowHub(true)}
                  variant="outline"
                  className="rounded-2xl border-2 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 text-sm font-bold transition-all px-6 py-5 flex items-center gap-2"
                >
                  <span className="text-xl leading-none">→</span> العودة للقائمة الرئيسية
                </Button>
              )}
            </div>
          </div>

          {/* Page Content Card */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-800/60 shadow-xl rounded-[2.5rem] p-6 md:p-10 min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                
               <div className="w-full max-w-[1400px] mx-auto min-h-[500px]">
                
                {activeTab === 'companies' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <CompaniesManagement />
                  </motion.div>
                )}

                {/* 1. COMPANY PROFILE TAB */}
                {activeTab === 'company_profile' && (
                  <div className="space-y-6">
                    <div className="border-b pb-4 mb-6">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-primary" />
                        هوية الشركة والأرشيف الرسمي
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تحديث الأوراق الحكومية والعناوين الموحدة واشتراكات السحابة</p>
                    </div>
                    
                    {/* Embedded CompanyProfile Component */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-2 md:p-4 overflow-hidden">
                      <CompanyProfile />
                    </div>
                  </div>
                )}

                {/* 2. GENERAL SETTINGS */}
                {activeTab === 'general' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-primary" />
                        الإعدادات العامة وهويتك
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">إدارة معلومات المنشأة والتفضيلات المالية وتخصيص الفواتير</p>
                    </div>

                    {/* Hint for Multi-Tenancy */}
                    {activeCompanyId ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 items-start">
                        <div className="p-2 bg-indigo-100 rounded-xl shrink-0">
                          <Info className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-900 text-sm mb-1">ملاحظة هامة (نظام الشركات)</h4>
                          <p className="text-indigo-700/80 text-xs leading-relaxed">
                            أنت الآن تقوم بتعديل إعدادات الهوية والضرائب الخاصة بالشركة المحددة <strong>(أعلى القائمة الجانبية)</strong>. هذه التعديلات ستنطبق فقط على هذه الشركة ولن تؤثر على الشركات الأخرى.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
                        <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm mb-1">الإعدادات العامة للنظام</h4>
                          <p className="text-amber-700/80 text-xs leading-relaxed">
                            لم تقم باختيار شركة محددة، لذلك التعديلات هنا ستُحفظ كـ (إعدادات افتراضية وعامة) للنظام بالكامل ولن تنطبق على الشركات التي لديها إعداداتها الخاصة.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Identity Card */}
                      <Card className="rounded-[2rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Building className="w-5 h-5 text-primary" />
                          معلومات المؤسسة الأساسية
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">اسم المؤسسة</Label>
                            <Input 
                              value={settings.companyName}
                              onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">وصف المؤسسة الفرعي (Subtitle)</Label>
                            <Input 
                              value={settings.companySub || ''}
                              placeholder="مثال: للمقاولات العامة والديكور"
                              onChange={(e) => setSettings({...settings, companySub: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">العنوان الرسمي</Label>
                            <Input 
                              value={settings.companyAddress}
                              placeholder="مثال: الرياض، حي السليمانية"
                              onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">رقم التواصل</Label>
                            <Input 
                              value={settings.companyPhone}
                              onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Taxes and billing */}
                      <Card className="rounded-[2rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <CreditCard className="w-5 h-5 text-primary" />
                          الضرائب والفوترة
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">الرقم الضريبي الرسمي</Label>
                            <Input 
                              value={settings.taxNumber}
                              placeholder="300000000000003"
                              onChange={(e) => setSettings({...settings, taxNumber: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">نسبة ضريبة القيمة المضافة (%)</Label>
                            <Input 
                              type="number"
                              value={settings.taxRate}
                              onChange={(e) => setSettings({...settings, taxRate: parseInt(e.target.value) || 0})}
                              className="h-11 rounded-xl text-right bg-white focus:ring-primary/20 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">العملة الافتراضية</Label>
                            <select 
                              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              value={settings.currency}
                              onChange={(e) => setSettings({...settings, currency: e.target.value})}
                            >
                              <option value="SAR">ريال سعودي (SAR)</option>
                              <option value="USD">دولار أمريكي (USD)</option>
                            </select>
                          </div>
                        </div>
                      </Card>

                      {/* Language and Calendar */}
                      <Card className="rounded-[2rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4 md:col-span-2">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Globe className="w-5 h-5 text-primary" />
                          التاريخ واللغة المفضلة للنظام
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">لغة الواجهة</Label>
                            <select
                              value={settings.language}
                              onChange={(e) => setSettings({...settings, language: e.target.value})}
                              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                              <option value="ar">العربية (Default)</option>
                              <option value="en">English (Coming Soon)</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">نوع التقويم</Label>
                            <select
                              value={settings.calendarType}
                              onChange={(e) => setSettings({...settings, calendarType: e.target.value as any})}
                              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            >
                              <option value="gregorian">ميلادي (Gregorian)</option>
                              <option value="hijri">هجري (Hijri)</option>
                            </select>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl font-black bg-primary text-white hover:bg-black transition-all gap-2 shadow-lg shadow-primary/20"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ الإعدادات العامة</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 2.5 WHATSAPP TAB */}
                {activeTab === 'whatsapp' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <MessageCircle className="w-7 h-7 text-emerald-500" />
                        الواتساب والإشعارات الآلية
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تفعيل إرسال رسائل الواتساب المجانية عبر واجهات API لعملائك وموظفيك</p>
                    </div>

                    <Card className="rounded-[2.5rem] border-none bg-emerald-50/30 shadow-none p-6 md:p-8">
                      <div className="flex items-center justify-between mb-6">
                         <div>
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                               <Smartphone className="w-5 h-5 text-emerald-600" />
                               خدمة الواتساب النشطة (مكتبة الواتساب)
                            </h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">يُرجى توفير رابط API الخاص بالمكتبة المجانية وربط الحساب.</p>
                         </div>
                         <Button
                            variant="outline"
                            className={`h-10 rounded-2xl font-black text-xs px-6 border-2 transition-all ${settings.whatsappSettings?.enabled ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                            onClick={() => {
                               const wSet = settings.whatsappSettings || {};
                               setSettings({...settings, whatsappSettings: {...wSet, enabled: !wSet.enabled}} as any);
                            }}
                         >
                            {settings.whatsappSettings?.enabled ? '✅ الخدمات مفعلة حالياً' : '❌ خدمات الواتساب معطلة'}
                         </Button>
                      </div>

                       <div className={`space-y-6 transition-all duration-500 ${!settings.whatsappSettings?.enabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                             <div className="bg-white rounded-3xl p-6 border border-emerald-100 flex flex-col md:flex-row gap-8 items-center justify-between shadow-sm">
                               <div className="flex-1 space-y-4">
                                 <h4 className="text-xl font-black text-emerald-900">ربط الواتساب مباشرة عبر السيرفر الداخلي (مجاني 100%)</h4>
                                 <p className="text-sm font-bold text-slate-500 leading-relaxed">
                                   هذا الخيار يستخدم مكتبة Baileys ويربط الواتساب بالسيرفر الداخلي للبرنامج مجاناً بشكل كامل.
                                   يضمن لك الخصوصية التامة وعدم الاعتماد على أي خدمات خارجية. (تأكد من عمل السيرفر المحلي).
                                 </p>
                                 <div className="flex items-center gap-4">
                                   <div className="flex-1 space-y-1.5">
                                      <Label className="text-xs font-black text-emerald-800">رابط السيرفر (Backend URL)</Label>
                                      <Input 
                                        value={settings.whatsappSettings?.apiUrl || ''}
                                        onChange={e => setSettings({...settings, whatsappSettings: {...settings.whatsappSettings, apiUrl: e.target.value}} as any)}
                                        placeholder="مثال: http://localhost:8080 أو رابط استضافتك..."
                                        className="h-10 bg-white border-emerald-200 focus:ring-emerald-500/20 rounded-xl text-left"
                                        dir="ltr"
                                      />
                                      <p className="text-[9px] font-bold text-emerald-600">اتركه فارغاً إذا كنت تعمل محلياً (Localhost)</p>
                                   </div>
                                   
                                   {waLocalStatus === 'connected' && (
                                     <Button 
                                       onClick={async () => {
                                         if (window.confirm('هل أنت متأكد من تسجيل الخروج وفصل الواتساب؟')) {
                                           const baseUrl = settings.whatsappSettings?.apiUrl?.replace(/\/$/, '') || '/api/whatsapp';
                                           await fetch(`${baseUrl}/logout`, { method: 'POST' });
                                           toast.success('تم تسجيل الخروج بنجاح');
                                         }
                                       }}
                                       className="h-12 border-none bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-black text-xs px-4"
                                     >
                                       تسجيل خروج الجهاز
                                     </Button>
                                   )}
                                 </div>
                               </div>
                               
                               <div className="w-[200px] shrink-0 border-2 border-dashed border-emerald-200 rounded-3xl min-h-[200px] flex flex-col items-center justify-center p-4 bg-emerald-50/50">
                                 {waLocalStatus === 'connected' ? (
                                   <div className="flex flex-col items-center text-center gap-3">
                                     <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                                       <span className="text-3xl">✅</span>
                                     </div>
                                     <span className="font-black text-emerald-800 text-sm">متصل وجاهز للإرسال</span>
                                   </div>
                                 ) : waLocalStatus === 'qr' && waQrData ? (
                                   <div className="flex flex-col items-center text-center gap-2">
                                     <img src={waQrData} alt="WhatsApp QR Code" className="w-full max-w-[160px] h-auto rounded-xl shadow-sm" />
                                     <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-100 mt-1">امسح الكود عبر تطبيق واتساب</span>
                                   </div>
                                 ) : waLocalStatus === 'error' ? (
                                   <div className="flex flex-col items-center text-center gap-3">
                                     <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shadow-inner">
                                       <span className="text-3xl">❌</span>
                                     </div>
                                     <span className="font-black text-rose-800 text-sm">السيرفر المحلي لا يعمل</span>
                                     <span className="text-[10px] text-slate-500 font-bold leading-tight">يرجى تشغيل <br/><code className="bg-rose-50 px-1 py-0.5 rounded text-rose-700">node server.js</code><br/> في الخلفية</span>
                                   </div>
                                 ) : waLocalStatus === 'disconnected' ? (
                                   <div className="flex flex-col items-center text-center gap-3">
                                     <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center shadow-inner">
                                       <span className="text-3xl">🔌</span>
                                     </div>
                                     <span className="font-black text-slate-800 text-sm">غير متصل بالواتساب</span>
                                     <Button 
                                       onClick={async () => {
                                         setWaLocalStatus('connecting');
                                         const baseUrl = settings.whatsappSettings?.apiUrl?.replace(/\/$/, '') || '/api/whatsapp';
                                         await fetch(`${baseUrl}/start`, { method: 'POST' });
                                       }}
                                       className="h-9 px-4 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                                     >
                                       بدء الاتصال (طلب باركود)
                                     </Button>
                                   </div>
                                 ) : (
                                   <div className="flex flex-col items-center text-center gap-3">
                                     <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                     <span className="font-black text-emerald-800 text-sm">جاري التجهيز...</span>
                                     <span className="text-[10px] text-slate-500 font-bold">انتظر قليلاً لجلب الباركود</span>
                                   </div>
                                 )}
                               </div>
                             </div>
                         
                         <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm mt-8">
                            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-4 mb-4">إعدادات الإشعارات لمدير النظام</h4>
                            <div className="space-y-1.5 mb-6">
                              <Label className="text-xs font-black text-emerald-800">رقم هاتف مدير النظام (WhatsApp)</Label>
                              <Input 
                                value={settings.whatsappSettings?.managerPhone || ''}
                                onChange={e => setSettings({...settings, whatsappSettings: {...settings.whatsappSettings, managerPhone: e.target.value}} as any)}
                                placeholder="مثال: 966500000000"
                                className="h-10 bg-white border-slate-200 focus:ring-emerald-500/20 rounded-xl text-left"
                                dir="ltr"
                              />
                                <p className="text-[10px] font-bold text-slate-500">ستصله إشعارات فورية بالاعتمادات الجديدة، طلبات الشراء، وتحديثات المشاريع الهامة.</p>
                                
                                <Button 
                                  onClick={handleTestWhatsapp} 
                                  disabled={isTestingWhatsapp}
                                  variant="outline" 
                                  className="w-full mt-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl font-black text-xs h-10 gap-2"
                                >
                                  {isTestingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                  إرسال رسالة اختبار لهذا الرقم
                                </Button>
                              </div>
                            
                            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-4 mb-4">اختيار الإشعارات التلقائية والصلاحيات للعملاء والموظفين</h4>
                            
                            <div className="space-y-4">
                               <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                  <input 
                                     type="checkbox" 
                                     className="w-5 h-5 rounded-md text-emerald-500 focus:ring-0 border-slate-300" 
                                     checked={settings.whatsappSettings?.notifyClientNewProject !== false}
                                     onChange={e => setSettings({...settings, whatsappSettings: {...settings.whatsappSettings, notifyClientNewProject: e.target.checked}} as any)}
                                  />
                                  <div className="flex-1">
                                     <p className="text-sm font-black text-slate-800">إشعار إنشاء مشروع جديد (للعميل)</p>
                                     <p className="text-xs font-bold text-slate-400 mt-1">إرسال رسالة ترحيبية للعميل عند إضافته كعميل أو فتح مشروعه الخاص.</p>
                                  </div>
                               </label>
                               
                               <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                  <input 
                                     type="checkbox" 
                                     className="w-5 h-5 rounded-md text-emerald-500 focus:ring-0 border-slate-300" 
                                     checked={settings.whatsappSettings?.notifyClientInvoice !== false}
                                     onChange={e => setSettings({...settings, whatsappSettings: {...settings.whatsappSettings, notifyClientInvoice: e.target.checked}} as any)}
                                  />
                                  <div className="flex-1">
                                     <p className="text-sm font-black text-slate-800">إشعار استخراج الفواتير ومطالبات الدفع (للعملاء)</p>
                                     <p className="text-xs font-bold text-slate-400 mt-1">يُشعر العميل برسالة فور إصدار فاتورة أو دفعة مستحقة على مشروعه في النظام.</p>
                                  </div>
                               </label>

                               <label className="flex items-center gap-4 cursor-pointer p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                  <input 
                                     type="checkbox" 
                                     className="w-5 h-5 rounded-md text-emerald-500 focus:ring-0 border-slate-300" 
                                     checked={settings.whatsappSettings?.notifyEmployeeMeeting !== false}
                                     onChange={e => setSettings({...settings, whatsappSettings: {...settings.whatsappSettings, notifyEmployeeMeeting: e.target.checked}} as any)}
                                  />
                                  <div className="flex-1">
                                     <p className="text-sm font-black text-slate-800">إشعار اجتماعات الفيديو (للموظفين والمهندسين)</p>
                                     <p className="text-xs font-bold text-slate-400 mt-1">عند بدء اجتماع فيديو من داخل المشروع سيصلهم رابط الدعوة مباشرة.</p>
                                  </div>
                               </label>
                            </div>
                         </div>
                      </div>
                    </Card>
                    
                    <div className="flex justify-end gap-3 mt-8">
                      <Button className="h-12 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 text-sm shadow-md" onClick={handleSaveSettings}>
                        <Save className="w-4 h-4 ml-2" />
                        حفظ إعدادات الواتساب
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Mail className="w-7 h-7 text-primary" />
                        نظام الإشعارات والبريد التلقائي
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تخصيص تصاميم رسائل البريد وقوالب الإشعارات التلقائية للموظفين</p>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Logo and Primary Color for Email Branding */}
                      <Card className="rounded-[2rem] border-none bg-slate-50/50 shadow-sm p-6">
                        <h3 className="text-lg font-black text-slate-800 border-r-4 border-primary pr-3 leading-none mb-4">هوية البريد الإلكتروني للشركة</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">شعار الشركة (رابط لوجو مباشر)</Label>
                              <Input 
                                value={settings.logoUrl}
                                onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                                className="h-11 rounded-xl bg-white border-slate-200 focus:ring-primary/20"
                                placeholder="رابط الصورة المباشر..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-slate-400 uppercase">لون أزرار البريد (Accent Color)</Label>
                              <div className="flex gap-2">
                                 <Input 
                                    type="color"
                                    value={settings.primaryColor}
                                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                                    className="w-14 h-11 p-1 rounded-xl cursor-pointer border border-slate-200"
                                 />
                                 <Input 
                                    value={settings.primaryColor}
                                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                                    className="flex-1 h-11 rounded-xl text-left font-mono bg-white border-slate-200 focus:ring-primary/20"
                                    dir="ltr"
                                 />
                              </div>
                            </div>
                          </div>

                          {/* Email Preview Frame */}
                          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-inner relative overflow-hidden">
                             <div className="absolute top-0 right-0 left-0 h-1.5" style={{ backgroundColor: settings.primaryColor }} />
                             <p className="text-[9px] font-black text-slate-300 uppercase mb-3 text-center border-b pb-2">معاينة الهوية بالبريد</p>
                             <div className="flex flex-col items-center gap-4 py-2">
                                <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain rounded-lg shadow-sm" onError={(e) => {
                                  (e.target as any).src = 'https://i.imgur.com/yYZDeHZ.jpg';
                                }} />
                                <div className="w-full space-y-2">
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full" />
                                  <div className="w-3/4 h-2.5 bg-slate-50 rounded-full" />
                                </div>
                                <Button className="w-36 h-9 rounded-xl text-xs font-black shadow-sm text-white" style={{ backgroundColor: settings.primaryColor }}>
                                  زر التفعيل أو الرابط
                                </Button>
                             </div>
                          </div>
                        </div>
                      </Card>

                      {/* Email Templates Section */}
                      <div className="space-y-4">
                         <h3 className="text-lg font-black text-slate-800 border-r-4 border-primary pr-3 leading-none">قوالب الرسائل البريدية الجاهزة</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries((settings as any).emailTemplates || {}).map(([key, template]: [string, any]) => (
                              <div key={key} className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 space-y-4 shadow-sm hover:border-primary/20 transition-all flex flex-col justify-between">
                                 <div className="flex items-center justify-between">
                                    <Badge className="bg-primary/10 text-primary border-none rounded-xl px-3 py-1 font-black text-[10px] uppercase">
                                      {key === 'payroll' ? 'إشعار الراتب' : key === 'welcome' ? 'رسالة ترحيب' : 'تنبيه انتهاء'}
                                    </Badge>
                                    <SettingToggle 
                                      title="" 
                                      description="" 
                                      enabled={template.enabled} 
                                      onToggle={() => {
                                        const newTemplates = { ...(settings as any).emailTemplates };
                                        newTemplates[key].enabled = !template.enabled;
                                        setSettings({...settings, emailTemplates: newTemplates} as any);
                                      }} 
                                    />
                                 </div>
                                 <div className="space-y-3 mt-3">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-black text-slate-400">موضوع الرسالة</Label>
                                      <Input 
                                        value={template.subject}
                                        onChange={(e) => {
                                          const newTemplates = { ...(settings as any).emailTemplates };
                                          newTemplates[key].subject = e.target.value;
                                          setSettings({...settings, emailTemplates: newTemplates} as any);
                                        }}
                                        className="h-10 rounded-xl font-bold bg-white border-slate-200"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-black text-slate-400">محتوى الرسالة</Label>
                                      <textarea 
                                        value={template.body}
                                        onChange={(e) => {
                                          const newTemplates = { ...(settings as any).emailTemplates };
                                          newTemplates[key].body = e.target.value;
                                          setSettings({...settings, emailTemplates: newTemplates} as any);
                                        }}
                                        className="w-full min-h-[110px] p-3 rounded-2xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                        dir="rtl"
                                      />
                                      <p className="text-[9px] font-bold text-slate-400 mt-1">
                                        الوسوم الذكية المتاحة: {'{name}, {companyName}, {month}, {date}, {documentName}'}
                                      </p>
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                      <Button 
                        variant="outline"
                        className="h-12 px-6 rounded-2xl font-black border-2 border-slate-200 text-slate-600 gap-2 hover:bg-slate-50 transition-all text-xs"
                        onClick={() => toast.info('سيتم إرسال بريد تجريبي لهوية شركتك الآن...')}
                      >
                        إرسال بريد تجريبي
                      </Button>
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl bg-primary text-white font-black hover:bg-black transition-all gap-2 shadow-lg shadow-primary/20 text-xs"
                      >
                         {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ تصاميم البريد</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 4. ATTENDANCE RADAR & GPS TAB */}
                {activeTab === 'attendance' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Clock className="w-7 h-7 text-primary" />
                        نظام الدوام وسياج الـ GPS
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تحديد النطاقات الجغرافية للحضور والانصراف، وضبط الأوقات والإجازات</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Attendance settings */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Radius className="w-5 h-5 text-primary" />
                          ضوابط وساعات العمل
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">نطاق الحضور المسموح به (بالمتر)</Label>
                            <div className="relative">
                              <Input 
                                type="number"
                                value={settings.attendanceRadius}
                                onChange={(e) => setSettings({...settings, attendanceRadius: parseInt(e.target.value) || 100})}
                                className="h-11 rounded-xl text-right pl-16 bg-white border-slate-200 focus:ring-primary/20"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border">متر</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="font-bold text-xs text-slate-500">بداية الدوام اليومي</Label>
                              <Input 
                                type="time"
                                value={settings.workingHoursStart}
                                onChange={(e) => setSettings({...settings, workingHoursStart: e.target.value})}
                                className="h-11 rounded-xl text-right bg-white border-slate-200"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="font-bold text-xs text-slate-500">نهاية الدوام اليومي</Label>
                              <Input 
                                type="time"
                                value={settings.workingHoursEnd}
                                onChange={(e) => setSettings({...settings, workingHoursEnd: e.target.value})}
                                className="h-11 rounded-xl text-right bg-white border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">أيام العطلة الإسبوعية</Label>
                            <Input 
                              value={settings.weekendDays}
                              placeholder="الجمعة والسبت"
                              onChange={(e) => setSettings({...settings, weekendDays: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white border-slate-200"
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Dynamic toggles */}
                      <div className="space-y-6">
                        <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                          <h3 className="text-lg font-black text-slate-800 leading-none">تجاوزات الحضور</h3>
                          <p className="text-xs font-bold text-slate-400">تفعيل/إلغاء قيود التوقيع الجغرافي للموظفين والعمالة</p>
                          <div className="space-y-4 mt-2">
                            <SettingToggle 
                              title="تفعيل التوقيع اليدوي"
                              description="السماح للموظف بتسجيل الحضور يدوياً دون سياج الـ GPS"
                              enabled={settings.allowManualAttendance}
                              onToggle={() => setSettings({...settings, allowManualAttendance: !settings.allowManualAttendance})}
                            />

                            <SettingToggle 
                              title="تفعيل احتساب الساعات الإضافية"
                              description="احتساب ساعات عمل إضافية بعد انتهاء وقت الدوام الرسمي تلقائياً"
                              enabled={settings.allowOvertime}
                              onToggle={() => setSettings({...settings, allowOvertime: !settings.allowOvertime})}
                            />
                          </div>
                        </Card>
                        
                        <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-100 flex gap-3">
                          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                            <strong>تنبيه الأمان الجغرافي:</strong> النطاق الجغرافي القياسي هو 100 متر حول إحداثيات المقر. زيادة النطاق تسمح للموظفين بتسجيل الحضور من مسافات أبعد. يفضل تدوين المقرات الحقيقية بدقة.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl bg-primary text-white font-black hover:bg-black transition-all gap-2 shadow-lg shadow-primary/20"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ إعدادات الدوام</>}
                      </Button>
                    </div>
                  </div>
                )}

                {/* LOCATIONS TAB */}
                {activeTab === 'locations' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <MapPin className="w-7 h-7 text-primary" />
                        المقرات والمواقع الذكية (Smart Zones)
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">إضافة مكاتب ومعارض وربط الموظفين جغرافياً بها لمنع الحضور الوهمي</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-1 p-6 rounded-[2.5rem] shadow-sm bg-white border-none space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Plus className="w-5 h-5 text-primary" />
                          إضافة مقر جديد
                        </h3>
                        <form onSubmit={handleAddOffice} className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">اسم المقر</Label>
                            <Input 
                              value={newOffice.name}
                              onChange={e => setNewOffice({...newOffice, name: e.target.value})}
                              placeholder="الفرع الرئيسي"
                              required
                              className="h-11 rounded-xl text-right bg-slate-50 border-slate-200"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500">الموقع الجغرافي (رابط خرائط جوجل) *</Label>
                            <Input 
                              value={newOffice.locationLink}
                              onChange={e => setNewOffice({...newOffice, locationLink: e.target.value})}
                              placeholder="https://maps.app.goo.gl/..."
                              required
                              className="h-11 rounded-xl text-left font-mono text-xs bg-slate-50 border-slate-200"
                              dir="ltr"
                            />
                            <p className="text-[10px] text-slate-400 font-bold pr-1">النظام سيستخرج خطوط الطول والعرض تلقائياً من الرابط.</p>
                          </div>
                          
                          <div className="space-y-1.5 pt-2">
                            <Label className="font-bold text-xs text-slate-500 mb-2 flex items-center justify-between">
                              الموظفون المصرح لهم بالدوام هنا
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {newOffice.assignedEmployees.length} محدد
                              </span>
                            </Label>
                            <div className="max-h-[150px] overflow-y-auto border rounded-xl p-2 bg-slate-50 space-y-1">
                              {employees.map(emp => {
                                const isChecked = newOffice.assignedEmployees.includes(emp.uid || emp.id);
                                return (
                                  <label key={emp.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setNewOffice({...newOffice, assignedEmployees: [...newOffice.assignedEmployees, emp.uid || emp.id]});
                                        } else {
                                          setNewOffice({...newOffice, assignedEmployees: newOffice.assignedEmployees.filter(id => id !== (emp.uid || emp.id))});
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
                          </div>

                          <Button type="submit" disabled={isSubmitting} className="w-full h-11 rounded-xl bg-primary hover:bg-black font-black text-white mt-4">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إضافة المقر الجغرافي'}
                          </Button>
                        </form>
                      </Card>

                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-lg font-black text-slate-800">المقرات الحالية ({offices.length})</h3>
                        {offices.length === 0 ? (
                          <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-[2.5rem]">لا توجد مقرات مضافة. أضف مقراً جديداً.</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {offices.map((office: any) => (
                              <Card key={office.id} className="p-5 rounded-[2rem] border-none bg-slate-50/80 shadow-sm relative group">
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute top-4 left-4 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeleteOffice(office.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <MapPin className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-800">{office.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 font-mono text-left" dir="ltr">{office.latitude}, {office.longitude}</p>
                                  </div>
                                </div>
                                <div className="bg-white rounded-xl p-3 flex flex-wrap gap-1 mt-2">
                                  <div className="text-[10px] font-bold text-slate-500 w-full mb-1">الموظفين المصرح لهم ({office.assignedEmployees?.length || 0}):</div>
                                  {office.assignedEmployees?.map((empId: string) => {
                                    const emp = employees.find(e => (e.uid === empId || e.id === empId));
                                    return (
                                      <span key={empId} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold">
                                        {emp?.name || 'موظف محذوف'}
                                      </span>
                                    );
                                  })}
                                  {(!office.assignedEmployees || office.assignedEmployees.length === 0) && (
                                    <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-md">مفتوح للجميع (قديم)</span>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ARTIFICIAL INTELLIGENCE TAB */}
                {activeTab === 'ai' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                        خوارزميات الذكاء الاصطناعي والموجز الصوتي
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تخصيص أداء المساعد الذكي وربط الفواتير اليومية وإدارة مفاتيح API</p>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Explain algorithms */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                          خوارزمية المطابقة التقريبية (Fuzzy Matching)
                        </h3>
                        <p className="text-xs font-bold text-slate-500 leading-relaxed">
                          يستعين نظام الذكاء بمطابقة Levenshtein الذكية لمسح ومطابقة أسماء الموردين بمعدل دقة <strong className="text-primary">90%</strong>. 
                          هذا يمكن النظام من ربط فواتير "شركة الاتصالات السعودية" بالفاتورة المرفوعة باسم "شركة الاتصالات" وتجنب تكرار الموردين في قاعدة البيانات.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <SettingToggle 
                            title="المطابقة الذكية للموردين"
                            description="ربط الفواتير تلقائياً بنفس المورد بناء على الاسم التقريبي"
                            enabled={settings.enableSmartSupplierMatching}
                            onToggle={() => setSettings({...settings, enableSmartSupplierMatching: !settings.enableSmartSupplierMatching})}
                          />
                          <SettingToggle 
                            title="تنبؤ وتصنيف بنود الشراء"
                            description="توقع أقسام المشتريات والمواد بناء على التاريخ الحركي للمورد"
                            enabled={settings.enableAutoCategorization}
                            onToggle={() => setSettings({...settings, enableAutoCategorization: !settings.enableAutoCategorization})}
                          />
                        </div>
                      </Card>

                      {/* API credentials */}
                      <GeminiKeyCard
                        value={settings.geminiApiKey || ''}
                        onChange={(v) => setSettings({...settings, geminiApiKey: v})}
                        showKey={showGeminiKey}
                        onToggleShow={() => setShowGeminiKey(!showGeminiKey)}
                      />

                      {/* Briefing settings */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-primary" />
                          تخصيص الموجز الصوتي الذكي (Voice Briefing)
                        </h3>
                        <p className="text-xs font-bold text-slate-400">حدد البنود التي تود سماعها في الملخص الصوتي اليومي في بداية اليوم</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <SettingToggle 
                            title="ملخص الميزانية والسيولة"
                            description="إدراج الدخل والمصروفات وصافي الأرباح المتوقعة"
                            enabled={settings.briefingSettings?.includeFinance}
                            onToggle={() => setSettings({...settings, briefingSettings: {...settings.briefingSettings, includeFinance: !settings.briefingSettings?.includeFinance}})}
                          />
                          <SettingToggle 
                            title="ملخص الحضور والدوام"
                            description="معدل غياب وتأخر موظفي المكاتب والمواقع"
                            enabled={settings.briefingSettings?.includeAttendance}
                            onToggle={() => setSettings({...settings, briefingSettings: {...settings.briefingSettings, includeAttendance: !settings.briefingSettings?.includeAttendance}})}
                          />
                          <SettingToggle 
                            title="تطور ونسب إنجاز المشاريع"
                            description="تنبيهات المشاريع النشطة والمتأخرة"
                            enabled={settings.briefingSettings?.includeProjects}
                            onToggle={() => setSettings({...settings, briefingSettings: {...settings.briefingSettings, includeProjects: !settings.briefingSettings?.includeProjects}})}
                          />
                          <SettingToggle 
                            title="طلبات التوريد والمشتريات"
                            description="عروض الأسعار المعلقة والاعتمادات المالية المفتوحة"
                            enabled={settings.briefingSettings?.includePurchases}
                            onToggle={() => setSettings({...settings, briefingSettings: {...settings.briefingSettings, includePurchases: !settings.briefingSettings?.includePurchases}})}
                          />
                        </div>
                      </Card>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isSubmitting}
                        className="h-12 px-8 rounded-2xl bg-primary text-white font-black hover:bg-black transition-all gap-2 shadow-lg shadow-primary/20"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ تفضيلات الذكاء</>}
                      </Button>
                    </div>
                  </div>
                )}



                {/* 11. ALIPHIA INTEGRATION TAB */}
                {activeTab === 'aliphia' && (
                  <div className="space-y-6">
                    <div className="border-b pb-4 mb-6">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Globe className="w-7 h-7 text-primary" />
                        الربط المحاسبي (ألف ياء)
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">إدارة حالة الاتصال بالنظام المحاسبي ألف ياء وإعدادات المزامنة</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-1">
                        <AliphiaStatusCard />
                      </div>
                      
                      <div className="md:col-span-1">
                         <Card className="rounded-[2rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                            <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                              <RefreshCw className="w-5 h-5 text-primary" />
                              معلومات المزامنة
                            </h3>
                            <div className="space-y-4 text-sm font-bold text-slate-600">
                               <p>1. تأكد من إدخال مفتاح API الخاص بنظام ألف ياء.</p>
                               <p>2. الاتصال يتيح جلب وإنشاء الفواتير وعروض الأسعار والعملاء.</p>
                               <p>3. يتم عرض حالة الاتصال في هذه الصفحة ويتم استخدامها في باقي أقسام النظام.</p>
                            </div>
                         </Card>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. BANK ACCOUNTS TAB */}
                {activeTab === 'banks' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-7 h-7 text-primary" />
                        الحسابات البنكية وصناديق الخزينة
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تحديد حسابات المؤسسة الرسمية، وإدارة رؤوس الأموال النقدية والـ Cash</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Add Account Card */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Plus className="w-5 h-5 text-primary" />
                          إضافة حساب أو خزينة كاش
                        </h3>
                        <form onSubmit={handleAddAccount} className="space-y-4">
                          <div className="space-y-1">
                            <Label className="font-bold text-xs text-slate-500">اسم الحساب (أو الصندوق المالي)</Label>
                            <Input 
                              required
                              placeholder="مثال: مصرف الراجحي المؤسسي، خزينة العهدة..."
                              value={newAccount.name}
                              onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white border-slate-200"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="font-bold text-xs text-slate-500">نوع الصندوق</Label>
                            <select 
                              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                              value={newAccount.type}
                              onChange={(e) => setNewAccount({...newAccount, type: e.target.value as any})}
                            >
                              <option value="bank">حساب بنكي (Bank Account)</option>
                              <option value="cash">خزينة مكتبية / نقد كاش (Vault Cash)</option>
                            </select>
                          </div>

                          {newAccount.type === 'bank' && (
                            <div className="space-y-1 animate-in slide-in-from-top-2">
                              <Label className="font-bold text-xs text-slate-500">رقم الآيبان (IBAN)</Label>
                              <Input 
                                placeholder="SA0000000000000000000000"
                                value={newAccount.iban}
                                onChange={(e) => setNewAccount({...newAccount, iban: e.target.value})}
                                className="h-11 rounded-xl text-left font-mono"
                                dir="ltr"
                              />
                            </div>
                          )}

                          <div className="space-y-1">
                            <Label className="font-bold text-xs text-slate-500">الرصيد الافتتاحي المقدر (ر.س)</Label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={newAccount.initialBalance}
                              onChange={(e) => setNewAccount({...newAccount, initialBalance: e.target.value})}
                              className="h-11 rounded-xl text-right bg-white border-slate-200"
                            />
                          </div>

                          <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-xl font-black bg-primary hover:bg-black text-white transition-all text-xs"
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تسجيل وحفظ الحساب المالي'}
                          </Button>
                        </form>
                      </Card>

                      {/* Display bank accounts list */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">الحسابات والصناديق النشطة ({bankAccounts.length})</h3>
                        
                        <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar">
                          {bankAccounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-[2rem] transition-all group">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl transition-all ${
                                  account.type === 'bank' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {account.type === 'bank' ? <CreditCard className="w-4.5 h-4.5" /> : <Wallet className="w-4.5 h-4.5" />}
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-800 leading-tight text-sm">{account.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                                    {account.type === 'bank' ? `IBAN: ${account.iban || ' SA...'}` : 'خزينة عهدة كاش'} 
                                    • الرصيد: <strong className="text-slate-700">{account.initialBalance.toLocaleString()} ر.س</strong>
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteAccount(account.id)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl w-9 h-9"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}

                          {bankAccounts.length === 0 && (
                            <div className="p-8 text-center bg-slate-50/40 rounded-[2rem] border border-dashed border-slate-200">
                               <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-55" />
                               <p className="text-xs font-bold text-slate-400">لا يوجد حسابات مالية مضافة للنظام</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. VISUAL IDENTITY & THEMES TAB */}
                {activeTab === 'theme' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Paintbrush className="w-7 h-7 text-primary animate-[bounce_2s_infinite]" />
                        تخصيص المظهر والهوية البصرية
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تحديد طابع النظام، الألوان الخاصة، وتعديل إعلانات شاشة الترحيب</p>
                    </div>

                    {/* Hint for Multi-Tenancy */}
                    {activeCompanyId ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 items-start">
                        <div className="p-2 bg-indigo-100 rounded-xl shrink-0">
                          <Palette className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-900 text-sm mb-1">تخصيص ألوان الشركة الحالية</h4>
                          <p className="text-indigo-700/80 text-xs leading-relaxed">
                            الألوان التي تختارها هنا ستُطبق فقط على الشركة المحددة، مما يتيح لك تمييز كل شركة بألوان وهوية بصرية مختلفة داخل النظام.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
                        <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900 text-sm mb-1">تخصيص ألوان النظام العامة</h4>
                          <p className="text-amber-700/80 text-xs leading-relaxed">
                            لأنك لم تحدد شركة من القائمة العلوية، هذه الألوان ستُحفظ كلون افتراضي عام للنظام ويُطبق على أي شركة لا تملك ألوانها الخاصة.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Theme settings form */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-6">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Palette className="w-5 h-5 text-primary" />
                          ألوان وسمات الواجهة
                        </h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500 flex justify-between px-1">
                              <span>لون القائمة الجانبية (Sidebar)</span>
                              <span className="font-mono text-xs text-slate-400" dir="ltr">{settings.sidebarColor}</span>
                            </Label>
                            <div className="flex gap-3">
                              <Input 
                                type="color"
                                value={settings.sidebarColor}
                                onChange={(e) => setSettings({...settings, sidebarColor: e.target.value})}
                                className="w-16 h-12 p-1 rounded-xl cursor-pointer border border-slate-200 bg-white"
                              />
                              <Input 
                                type="text"
                                value={settings.sidebarColor}
                                onChange={(e) => setSettings({...settings, sidebarColor: e.target.value})}
                                className="flex-1 h-12 rounded-xl text-left font-mono border border-slate-200 bg-white focus:ring-primary/20"
                                dir="ltr"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="font-bold text-xs text-slate-500 flex justify-between px-1">
                              <span>اللون الأساسي المتوهج (Primary Accent)</span>
                              <span className="font-mono text-xs text-slate-400" dir="ltr">{settings.primaryColor}</span>
                            </Label>
                            <div className="flex gap-3">
                              <Input 
                                type="color"
                                value={settings.primaryColor}
                                onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                                className="w-16 h-12 p-1 rounded-xl cursor-pointer border border-slate-200 bg-white"
                              />
                              <Input 
                                type="text"
                                value={settings.primaryColor}
                                onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                                className="flex-1 h-12 rounded-xl text-left font-mono border border-slate-200 bg-white focus:ring-primary/20"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest border-r-2 border-primary pr-2">خيارات الواجهة الإضافية</p>
                          
                          <SettingToggle 
                            title="مؤثرات المظهر الزجاجي (Glassmorphism)"
                            description="إضافة مؤثرات التمويه والشفافية الرائعة للنظام"
                            enabled={(settings as any).enableGlassEffect || false}
                            onToggle={() => setSettings({...settings, enableGlassEffect: !(settings as any).enableGlassEffect} as any)}
                          />

                          <div className="space-y-1.5 pt-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase">📢 شريط الإعلانات العام (لكل المستخدمين)</Label>
                            <Input 
                              value={settings.generalAnnouncement || ""}
                              onChange={(e) => setSettings({...settings, generalAnnouncement: e.target.value} as any)}
                              className="h-10 text-xs rounded-xl bg-white border-slate-200"
                              placeholder="أدخل رسالة تظهر كشريط علوي لكل الموظفين..."
                            />
                          </div>
                          
                          <div className="pt-2">
                             <SettingToggle 
                              title="شاشة الترحيب الذكية (Onboarding)"
                              description="تفعيل ظهور رسالة ترحيبية وإرشادات عند بدء الدخول"
                              enabled={settings.showWelcomeMessage !== false}
                              onToggle={() => setSettings({...settings, showWelcomeMessage: settings.showWelcomeMessage === false} as any)}
                            />
                          </div>

                          {settings.showWelcomeMessage !== false && (
                            <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                              {['manager', 'supervisor', 'employee'].map((role) => (
                                <div key={role} className="p-4 bg-white rounded-2xl border border-slate-100 space-y-3 shadow-inner">
                                  <Label className="text-xs font-black text-primary uppercase">
                                    {role === 'manager' ? '👑 رسائل المدير العام' : role === 'supervisor' ? '⚡ رسائل المشرف' : '💎 رسائل الموظف'}
                                  </Label>
                                  <div className="space-y-2">
                                    <Input 
                                      value={settings.roleWelcomeMessages?.[role]?.title || ""}
                                      onChange={(e) => {
                                        const newMessages = { ...settings.roleWelcomeMessages };
                                        if (typeof newMessages[role] !== 'object' || newMessages[role] === null) {
                                          newMessages[role] = { title: typeof newMessages[role] === 'string' ? newMessages[role] : '', tips: [] };
                                        }
                                        newMessages[role].title = e.target.value;
                                        setSettings({ ...settings, roleWelcomeMessages: newMessages } as any);
                                      }}
                                      className="h-9 text-xs rounded-lg"
                                      placeholder="مثال: أهلاً بك أيها القائد..."
                                    />
                                    <textarea 
                                      value={settings.roleWelcomeMessages?.[role]?.tips?.join(',') || ""}
                                      onChange={(e) => {
                                        const newMessages = { ...settings.roleWelcomeMessages };
                                        if (typeof newMessages[role] !== 'object' || newMessages[role] === null) {
                                          newMessages[role] = { title: typeof newMessages[role] === 'string' ? newMessages[role] : '', tips: [] };
                                        }
                                        newMessages[role].tips = e.target.value.split(',').filter(t => t.trim());
                                        setSettings({ ...settings, roleWelcomeMessages: newMessages } as any);
                                      }}
                                      className="w-full min-h-[70px] p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 outline-none"
                                      placeholder="نصائح تظهر أسفل الترحيب (افصل بفاصلة ,)"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="font-bold text-xs text-slate-500">حواف الأزرار والبطاقات (Radius)</Label>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { id: 'none', label: 'حادة 📐', val: '0px' },
                                { id: 'sm', label: 'كلاسيك 📂', val: '4px' },
                                { id: 'md', label: 'دائرية 📱', val: '12px' },
                                { id: 'lg', label: 'انسيابية 🔮', val: '24px' }
                              ].map((r) => (
                                <button
                                  type="button"
                                  key={r.id}
                                  onClick={() => setSettings({...settings, borderRadius: r.val} as any)}
                                  className={`py-2 rounded-xl text-[11px] font-black border transition-all ${
                                    (settings as any).borderRadius === r.val 
                                    ? 'bg-primary border-primary text-white shadow-sm' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-primary/20'
                                  }`}
                                >
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                          <Button 
                            onClick={async () => {
                              if (!user) return;
                              setIsSubmitting(true);
                              try {
                                const { updateDoc, doc } = await import('firebase/firestore');
                                await updateDoc(doc(db, 'users', profile?.uid || user.uid), {
                                  userTheme: {
                                    sidebarColor: settings.sidebarColor,
                                    primaryColor: settings.primaryColor,
                                    borderRadius: (settings as any).borderRadius || '12px',
                                    enableGlassEffect: (settings as any).enableGlassEffect || false,
                                    isDarkMode: document.documentElement.classList.contains('dark')
                                  }
                                });
                                toast.success('تم حفظ وتثبيت ثيمك الخاص بنجاح');
                              } catch (err) {
                                toast.error('فشل في حفظ الثيم الخاص بك');
                              } finally {
                                setIsSubmitting(false);
                              }
                            }}
                            disabled={isSubmitting}
                            className="w-full h-12 rounded-2xl font-black bg-slate-900 text-white hover:bg-black transition-all gap-2 text-xs"
                          >
                            <Save className="w-4 h-4" /> حفظ في ثيمي الخاص
                          </Button>

                          {isManager && (
                            <Button 
                              onClick={handleSaveSettings}
                              disabled={isSubmitting}
                              variant="outline"
                              className="w-full h-11 rounded-2xl font-black border-2 border-primary text-primary hover:bg-primary/5 transition-all gap-2 text-xs"
                            >
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Globe className="w-4 h-4" /> تطبيق للجميع بالمنشأة</>}
                            </Button>
                          )}
                        </div>
                      </Card>

                      {/* Display preset templates */}
                      <Card className="rounded-[2.5rem] border-none bg-slate-50/50 shadow-sm p-6 space-y-6">
                        <h3 className="text-lg font-black flex items-center gap-2 text-slate-800">
                          <Palette className="w-5 h-5 text-primary" />
                          سمات وستايلات فخمة جاهزة
                        </h3>
                        <p className="text-xs font-bold text-slate-400">اختر من تشكيلتنا المصممة بعناية لتلائم ذوقك ونظامك بضغطة زر واحدة</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { name: "الهوية العامة (Default)", sidebar: "#1a4d4e", primary: "#2c7a7d", radius: "12px", glass: false },
                            { name: "النايت أليت (Elite Dark)", sidebar: "#020617", primary: "#6366f1", radius: "12px", glass: true },
                            { name: "العصرية (Modern)", sidebar: "#fafafa", primary: "#10b981", radius: "24px", glass: true },
                            { name: "الفخامة الكلاسيكية (Luxury)", sidebar: "#1c1917", primary: "#d4af37", radius: "0px", glass: false },
                            { name: "تقنية المستقبل (Tech Cyber)", sidebar: "#0f172a", primary: "#38bdf8", radius: "8px", glass: true },
                            { name: "الربيع المفعم (Classic)", sidebar: "#27272a", primary: "#f43f5e", radius: "4px", glass: false },
                          ].map((theme, i) => (
                            <button
                              type="button"
                              key={i}
                              onClick={() => setSettings({
                                ...settings, 
                                sidebarColor: theme.sidebar, 
                                primaryColor: theme.primary,
                                borderRadius: theme.radius,
                                enableGlassEffect: theme.glass
                              } as any)}
                              className="flex flex-col gap-3 p-4 rounded-2xl border bg-white hover:border-primary/40 hover:bg-slate-50/60 transition-all text-right shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black text-slate-700">{theme.name}</span>
                                {theme.glass && <Badge className="bg-blue-500/10 text-blue-500 rounded-md border-none p-0 px-1 text-[8px] scale-90">زجاجي</Badge>}
                              </div>
                              <div className="flex h-10 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                                <div className="w-1/3" style={{ backgroundColor: theme.sidebar }} />
                                <div className="w-2/3 animate-pulse" style={{ backgroundColor: theme.primary }} />
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-2">
                          <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold text-slate-500 leading-normal">
                            ملاحظة: السمات ذات الطابع الزجاجي تستخدم الشفافية المتأصلة مما يعطي جمالية ملفتة عند التمرير والعمل على الأجهزة الذكية.
                          </p>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* 9. DATA RESET & DATABASE SECURITY TAB */}
                {activeTab === 'data' && (
                  <div className="space-y-8">
                    <div className="border-b pb-4">
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Database className="w-7 h-7 text-red-600" />
                        إدارة البيانات وصيانة النظام
                      </h2>
                      <p className="text-xs font-bold text-slate-400 mt-1">تفريغ قواعد البيانات التجريبية، تهيئة الكاش، وضوابط الوصول للملفات</p>
                    </div>

                    <Card className="rounded-[2.5rem] border border-red-100 overflow-hidden bg-red-50/10">
                      <div className="p-6 bg-red-500/10 border-b border-red-100 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-red-600" />
                        <div>
                          <h3 className="text-lg font-black text-red-950">منطقة الأمان الحساسة للغاية</h3>
                          <p className="text-xs font-bold text-red-700">هذه الإجراءات غير قابلة للتراجع وتؤثر على كامل المنشأة مباشرة</p>
                        </div>
                      </div>

                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <span className="w-7 h-7 bg-red-100 text-red-600 font-black rounded-full inline-flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                            <div>
                              <h4 className="text-sm font-black text-slate-800">حذف وتطهير البيانات التجريبية</h4>
                              <p className="text-xs font-bold text-slate-500 leading-relaxed mt-1">
                                سيقوم هذا الإجراء بإزالة كامل المشاريع، المعاملات، القيود اليومية، المشتريات، ملفات المناديب، الحضور والانصراف، والعمالة. 
                                لن يتم مسح بيانات حسابك كمدير أو حسابات البنوك لتسهيل البدء الفعلي.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-4 border-t pt-4">
                            <span className="w-7 h-7 bg-red-100 text-red-600 font-black rounded-full inline-flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                            <div>
                              <h4 className="text-sm font-black text-slate-800">حظر وتطهير الموظفين والعمالة</h4>
                              <p className="text-xs font-bold text-slate-500 leading-relaxed mt-1">
                                سيتم إزالة حسابات المشرفين والموظفين والمناديب المرتبطين للمنشأة بشكل كامل لإتاحة تسجيل فريق عملك الحقيقي على بياض.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons container */}
                        <div className="pt-6 border-t border-slate-100 space-y-6">
                          
                          {/* Cache clean */}
                          <div className="space-y-2">
                             <h4 className="text-sm font-black text-slate-800 leading-none">تهيئة الذاكرة المؤقتة (Clear Cache)</h4>
                             <p className="text-[10px] font-bold text-slate-400">امسح الكوكيز والبيانات المخزنة محلياً بالمتصفح لتحديث الواجهات وحل المشاكل الفنية الطارئة دون المساس بالبيانات في السحابة.</p>
                             <Button 
                               onClick={handleClearCache}
                               variant="outline"
                               className="w-full h-12 rounded-xl font-black bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 text-xs gap-2"
                             >
                               <RefreshCw className="w-4 h-4" />
                               تهيئة الكاش وإعادة تشغيل النظام
                             </Button>
                          </div>

                          {/* Factory Reset */}
                          <div className="pt-4 border-t border-red-100/50">
                             <h4 className="text-sm font-black text-red-900 mb-2 leading-none">إعادة ضبط المصنع وتطهير الخادم</h4>
                             <p className="text-[10px] font-bold text-red-700 mb-4">احذف كامل الأنشطة والمشاريع والموردين للبدء فوراً في العمل الفعلي الفوري.</p>
                             
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button 
                                   className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs gap-2 shadow-lg shadow-red-100"
                                 >
                                   <Trash className="w-4 h-4" />
                                   تطهير النظام وإعادة ضبط المصنع الكامل
                                 </Button>
                               </AlertDialogTrigger>
                               
                               <AlertDialogContent className="rounded-3xl border-none">
                                 <AlertDialogHeader>
                                   <AlertDialogTitle className="text-xl font-black text-red-900 text-right">هل أنت متأكد تماماً من قرار الحذف؟</AlertDialogTitle>
                                   <AlertDialogDescription className="text-sm font-bold text-slate-500 text-right mt-2">
                                     هذا الإجراء سيقوم بحذف كافة السجلات والمشاريع والعمالة والمعاملات بشكل قطعي. لن تتوفر صلاحية تراجع أو استعادة.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 
                                 <AlertDialogFooter className="flex flex-row-reverse gap-2 sm:justify-start mt-4">
                                   <AlertDialogAction 
                                     variant="destructive" size="default"
                                     onClick={handleSystemReset}
                                     className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-black px-6"
                                   >
                                     نعم، امسح البيانات نهائياً
                                   </AlertDialogAction>
                                   <AlertDialogCancel variant="outline" size="default" className="bg-slate-100 hover:bg-slate-200 border-none rounded-xl font-black px-6">
                                     إلغاء الأمر
                                   </AlertDialogCancel>
                                 </AlertDialogFooter>
                               </AlertDialogContent>
                             </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
               </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}

// PREMIUM CUSTOM TOGGLE BUTTON COMPONENT
function SettingToggle({ title, description, enabled, onToggle }: { 
  title: string; 
  description: string; 
  enabled: boolean; 
  onToggle: () => void; 
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/60 hover:border-primary/20 hover:shadow-sm transition-all duration-200 select-none">
      <div className="space-y-1">
        <p className="text-sm font-black text-slate-800 leading-tight">{title}</p>
        <p className="text-[10px] font-bold text-slate-400 leading-snug">{description}</p>
      </div>
      <button 
        type="button"
        onClick={onToggle}
        className={`w-12 h-6.5 rounded-full relative transition-colors duration-300 focus:outline-none shrink-0 ${enabled ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 left-1 w-4.5 h-4.5 bg-white rounded-full transition-all duration-300 transform shadow-sm ${enabled ? 'translate-x-5.5' : ''}`} />
      </button>
    </div>
  );
}
