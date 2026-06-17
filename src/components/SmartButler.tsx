import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, X, Send, Loader2, MessageSquare, Sparkles, FileText, 
  AlertTriangle, Headset, Phone, Search, Image as ImageIcon, 
  Globe, Trash2, ArrowLeft, ExternalLink, Paperclip 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface AttachedImage {
  mimeType: string;
  data: string; // base64 string
  preview: string; // data URL
}

interface ChatConversation {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
}

export default function SmartButler() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load conversations from local storage
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('khabeer_chats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'default',
        title: 'محادثة ترحيبية',
        messages: [
          { 
            role: 'bot', 
            text: 'مرحباً بك! أنا "خبير" العين الساهرة ومستشارك الذكي المتكامل في الشركة. تم تطويري وتزويدي بقدرات تحليل الصور الميدانية ولقطات الشاشة ومحرك بحث جوجل المباشر لأجيبك على أي استفسار بدقة متناهية. كيف بدك نخدمك اليوم؟',
            sources: []
          }
        ],
        createdAt: Date.now()
      }
    ];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    const savedActive = localStorage.getItem('khabeer_active_chat');
    return savedActive || 'default';
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('khabeer_chats', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('khabeer_active_chat', activeConversationId);
  }, [activeConversationId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0] || {
    id: 'default',
    title: 'محادثة ترحيبية',
    messages: [
      { 
        role: 'bot', 
        text: 'مرحباً بك! أنا "خبير" العين الساهرة ومستشارك الذكي المتكامل في الشركة. تم تطويري وتزويدي بقدرات تحليل الصور الميدانية ولقطات الشاشة ومحرك بحث جوجل المباشر لأجيبك على أي استفسار بدقة متناهية. كيف بدك نخدمك اليوم؟',
        sources: []
      }
    ]
  };

  const messages = activeConversation.messages;

  const setMessages = (updateFnOrValue: any[] | ((prev: any[]) => any[])) => {
    setConversations(prev => {
      return prev.map(c => {
        if (c.id === activeConversationId) {
          const newMsgs = typeof updateFnOrValue === 'function' ? updateFnOrValue(c.messages) : updateFnOrValue;
          // Auto update title based on first user question
          let updatedTitle = c.title;
          if (c.title === 'محادثة ترحيبية' || c.title === 'محادثة جديدة' || c.title.startsWith('محادثة ')) {
            const firstUserMsg = newMsgs.find(m => m.role === 'user');
            if (firstUserMsg) {
              updatedTitle = firstUserMsg.text.slice(0, 25) + (firstUserMsg.text.length > 25 ? '...' : '');
            }
          }
          return { ...c, messages: newMsgs, title: updatedTitle };
        }
        return c;
      });
    });
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<AttachedImage | null>(null);
  const [showOptions, setShowOptions] = useState(true);
  const [botEmployees, setBotEmployees] = useState<any[]>([]);
  const [botEmpSearch, setBotEmpSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const QUICK_ACTIONS = [
    { label: 'استشارة فنية ذكية', id: 'expert', icon: <Sparkles className="w-4 h-4 text-amber-500" />, prompt: 'أهلاً خبير، هل يمكنك تزويدي باستشارة فنية سريعة حول تصميم لوحة إعلانية خارجية وتكلفة المواد بالمتوسط؟' },
    { label: 'دليل استخدام المنصة', id: 'guide', icon: <FileText className="w-4 h-4 text-emerald-500" />, prompt: 'أريد قراءة دليل استخدام النظام والتعرف على مميزاته وخصائصه.' },
    { label: 'مراسلة موظف بالواتساب', id: 'whatsapp_employee', icon: <Phone className="w-4 h-4 text-green-500" />, prompt: 'أريد مراسلة أحد الموظفين أو إرسال ملفات له عبر الواتساب.' },
    { label: 'تقديم طلب إداري', id: 'request', icon: <FileText className="w-4 h-4 text-blue-500" />, prompt: 'أرغب في تقديم طلب جديد (إجازة، عهدة، أو طلب شراء).' },
  ];

  const [companyName, setCompanyName] = useState('مؤسسة خبراء الرسم');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const getSettings = async () => {
      try {
        const settingsSnap = await getDocs(query(collection(db, 'systemSettings'), limit(1)));
        if (!settingsSnap.empty) {
          const data = settingsSnap.docs[0].data();
          if (data.companyName) setCompanyName(data.companyName);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
        }
      } catch (e) {
        console.warn("Could not fetch company settings for bot header", e);
      }
    };
    getSettings();
  }, []);

  useEffect(() => {
    const fetchBotEmployees = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setBotEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Could not fetch users list for bot search", e);
      }
    };
    fetchBotEmployees();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleActionClick = (action: typeof QUICK_ACTIONS[0]) => {
    setShowOptions(false);
    setInput(action.prompt);
    setTimeout(() => handleSend(action.prompt), 100);
  };

  const handleSendWhatsAppTemplate = (emp: any, templateType: 'general' | 'payslip' | 'attendance') => {
    let message = '';
    const name = emp.name || 'الموظف';
    const cleanPhone = (emp.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      toast.error('لا يوجد رقم هاتف متاح للموظف');
      return;
    }
    
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('5')) {
      formattedPhone = '966' + formattedPhone;
    }
    
    if (templateType === 'general') {
      message = `مرحباً أخي ${name}،\nنود إشعارك بـ: `;
    } else if (templateType === 'payslip') {
      const salary = emp.salary || emp.baseSalary || 0;
      message = `السلام عليكم أخي ${name}،\nمرفق تفاصيل مستحقاتك المالية لشهر ${new Date().toLocaleString('ar-SA', { month: 'long' })}:\n• الراتب الأساسي: ${salary.toLocaleString()} ر.س\n• الحالة: جاهز للاستلام\n\nيرجى مراجعة المحاسب للتوقيع على مسير الرواتب.`;
    } else if (templateType === 'attendance') {
      message = `السلام عليكم أخي ${name}،\nيرجى الالتزام بتسجيل الحضور والانصراف اليومي عبر تطبيق المنصة الذكية فور دخولك موقع العمل لتجنب أي خصومات.\nشكراً لتعاونك.`;
    }
    
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setSelectedImage({
        mimeType: file.type,
        data: base64,
        preview: reader.result as string
      });
      toast.success('تم إرفاق اللقطة بنجاح، يمكنك الآن طلب تحليلها!');
    };
    reader.readAsDataURL(file);
  };

  // Support paste screenshot directly (Win+Shift+S / clipboard paste)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input;
    if (!textToSend.trim() && !selectedImage) return;

    const userMsg = textToSend.trim();
    if (typeof overrideInput !== 'string') setInput('');
    setShowOptions(false);

    const currentImg = selectedImage;
    setSelectedImage(null);

    // Save user message (with image preview if present)
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMsg || 'تحليل الصورة المرفقة 📷', 
      imagePreview: currentImg?.preview 
    }]);
    setIsLoading(true);

    try {
      const textLower = userMsg.toLowerCase();
      
      // Quick local check
      if (userMsg === 'أريد قراءة دليل استخدام النظام والتعرف على مميزاته وخصائصه.' || textLower === 'دليل استخدام النظام' || textLower === 'شرح النظام') {
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'bot', text: 'أهلاً بك! جاري تشغيل الدليل التفاعلي الشامل وشرح كافة تفاصيل الواجهة الآن.' }]);
          window.dispatchEvent(new CustomEvent('showOnboarding'));
          setIsLoading(false);
        }, 800);
        return;
      }

      if (textLower.includes('واتساب') || textLower.includes('واتس') || textLower.includes('مراسلة') || userMsg === 'أريد مراسلة أحد الموظفين أو إرسال ملفات له عبر الواتساب.') {
        setTimeout(() => {
          const responseText = 'حسناً أشرت للواتساب! إليك واجهة مراسلة الموظفين وتوليد الرسائل الجاهزة بمختلف المناسبات بضغطة زر واحدة:';
          setMessages(prev => [...prev, { role: 'bot', text: responseText, type: 'whatsapp_helper' }]);
          setIsLoading(false);
        }, 800);
        return;
      }

      // Easy local navigation mapping!
      const navMatches: { keys: string[]; tab: string; sectionName: string }[] = [
        { keys: ['لوحة التحكم', 'الرئيسية', 'الرئيسيه', 'الرئيسي'], tab: 'dashboard', sectionName: 'لوحة التحكم الرئيسية' },
        { keys: ['المشاريع', 'مشاريع', 'مشروع'], tab: 'projects', sectionName: 'المشاريع الجارية' },
        { keys: ['المهام', 'مهام', 'تاسك'], tab: 'tasks', sectionName: 'المهام والتكليفات' },
        { keys: ['الموظفين', 'موظف', 'موظفين', 'أعضاء الفنيين', 'أعضاء'], tab: 'employees', sectionName: 'شؤون الموظفين والرواتب' },
        { keys: ['التحضير', 'حضور', 'الدوام', 'حضور وغياب', 'بصمة'], tab: 'attendance_manager', sectionName: 'سجل الحضور والدوام' },
        { keys: ['المالية', 'الماليه', 'أرباح', 'خسائر', 'تقارير مالية'], tab: 'financials', sectionName: 'الحسابات والقوائم المالية' },
        { keys: ['الخزينة', 'الخزينه', 'البنك', 'بنوك', 'الصندوق'], tab: 'banking', sectionName: 'الخزينة والحسابات البنكية' },
        { keys: ['المصاريف', 'مصروفات', 'مصاريف', 'تذكرة مصروفات', 'فاتورة صرف'], tab: 'expenses', sectionName: 'إدارة المصروفات' },
        { keys: ['المبيعات', 'عروض أسعار', 'عرض سعر', 'مبيعات'], tab: 'sales', sectionName: 'المبيعات وعروض الأسعار' },
        { keys: ['المشتريات', 'شراء مواد', 'فواتير المشتريات'], tab: 'purchases', sectionName: 'المشتريات والمصانع' },
        { keys: ['الموردين', 'موردين', 'مورد'], tab: 'suppliers', sectionName: 'قائمة الموردين المعتمدين' },
        { keys: ['المخزن', 'المخزون', 'مخزن', 'مستودع'], tab: 'inventory', sectionName: 'المخزون وجرد المستودع' },
        { keys: ['الإنتاج', 'الانتاج', 'تصنيع', 'توزيع العمل'], tab: 'production', sectionName: 'عمليات الإنتاج والتوزيع' },
        { keys: ['الأصول', 'اصول', 'معدات', 'سيارات المؤسسة'], tab: 'assets', sectionName: 'إدارة الأصول والمعدات' },
        { keys: ['الرواتب', 'رواتب', 'مسير الرواتب', 'Payroll'], tab: 'payrolls', sectionName: 'مسيرات رواتب الموظفين' },
        { keys: ['الموافقات', 'مركز الموافقات', 'طلب موافقة', 'الاعتمادات'], tab: 'approvals', sectionName: 'مركز الموافقات والاعتمادات' },
        { keys: ['الأرشيف', 'الارشيف', 'المستندات القديمة'], tab: 'archive', sectionName: 'أرشيف المستندات والوثائق' },
        { keys: ['المعرض', 'معرض الصور', 'الصور', 'لقطات المشاريع'], tab: 'gallery', sectionName: 'معرض لقطات المشاريع والعمل الميداني' },
        { keys: ['كاميرا', 'التحضير بالوجه', 'الملء بالصورة'], tab: 'camera', sectionName: 'التحضير الذكي بالوجوه' },
        { keys: ['موجز الإدارة', 'موجز الادارة', 'executive briefing', 'موجز ذكي'], tab: 'briefing', sectionName: 'نظام الإيجاز التنفيذي' },
        { keys: ['الإعدادات', 'الاعدادات', 'إعدادات النظام'], tab: 'settings', sectionName: 'إعدادات النظام والذكاء الاصطناعي' },
        { keys: ['الإشعارات', 'الاشعارات', 'تنبيهات', 'البريد والاشعارات'], tab: 'notifications', sectionName: 'مركز التنبيهات ونظام المتابعة' }
      ];

      const foundNav = navMatches.find(match => 
        match.keys.some(key => textLower.includes(key))
      );

      if (foundNav && (textLower.startsWith('انتقل') || textLower.startsWith('اذهب') || textLower.startsWith('افتح') || textLower.startsWith('أريد فتح') || textLower.startsWith('عرض') || textLower.includes('صفحة') || textLower.includes('قسم'))) {
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'bot', 
            text: `أبشر! جاري نقلك الآن وبشكل فوري تلقائياً إلى **${foundNav.sectionName}** لتسهيل عملك ومتابعة البيانات بكل يسر.` 
          }]);
          window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: foundNav.tab } }));
          setIsLoading(false);
        }, 800);
        return;
      }

      // Context gathering
      let projectsList: any[] = [];
      let employeesList: any[] = [];
      let todayAttendanceList: any[] = [];
      let recentTransactionsList: any[] = [];
      const attendanceRadius = 100;

      try {
        const projectsSnap = await getDocs(query(collection(db, 'projects'), limit(15)));
        projectsList = projectsSnap.docs.map(d => {
          const data = d.data();
          return { title: data.title || data.name || 'بدون اسم', status: data.status || 'نشط', progress: data.progress || 0 };
        });

        const usersSnap = await getDocs(query(collection(db, 'users'), limit(15)));
        employeesList = usersSnap.docs.map(d => {
          const data = d.data();
          return { name: data.name || 'غير معروف', role: data.role || 'عضو فني', department: data.department || 'الإنتاج' };
        });

        const attendanceSnap = await getDocs(query(collection(db, 'attendance'), limit(10)));
        todayAttendanceList = attendanceSnap.docs.map(d => {
          const data = d.data();
          return { employeeName: data.employeeName || data.name || 'موظف', status: data.status || 'حاضر', date: data.date || '' };
        });

        const txSnap = await getDocs(query(collection(db, 'transactions'), limit(10)));
        recentTransactionsList = txSnap.docs.map(d => {
          const data = d.data();
          return { amount: data.amount || 0, type: data.type || 'expense', category: data.category || '', description: data.description || '' };
        });
      } catch (e) {
        console.warn("Context details retrieved partly for safety", e);
      }

      const todayString = new Date().toISOString().split('T')[0];
      const todayAtt = todayAttendanceList.filter(a => a.date === todayString);
      const todayAttendanceSummary = {
        date: todayString,
        totalEmployees: employeesList.length,
        todayCount: todayAtt.length,
        present: todayAtt.filter(a => a.status === 'present' || a.status === 'حاضر').length,
        absent: todayAtt.filter(a => a.status === 'absent' || a.status === 'غائب').length,
      };

      const docContext = {
        companyName: companyName,
        attendanceRadius: attendanceRadius,
        userProfile: profile ? { name: profile.name, role: profile.role } : null,
        projects: projectsList,
        employees: employeesList,
        todayAttendanceSummary: todayAttendanceSummary,
        recentTransactions: recentTransactionsList
      };

      const historyToSend = messages.slice(1).map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        text: m.text
      }));

      const customKey = (typeof localStorage !== "undefined" ? localStorage.getItem("VITE_GEMINI_API_KEY") : "") || "";

      const bodyPayload = {
        message: userMsg || 'قم بتحليل الصورة والتعليق عليها.',
        history: historyToSend,
        context: docContext,
        image: currentImg ? { mimeType: currentImg.mimeType, data: currentImg.data } : null,
        customKey
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) throw new Error();

      const resData = await response.json();
      let rText = resData.text || '';
      
      const navigateRegex = /\[NAVIGATE:\s*([a-zA-Z0-9_]+)\]/;
      const match = rText.match(navigateRegex);
      if (match && match[1]) {
        const targetTab = match[1];
        window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: targetTab } }));
        rText = rText.replace(navigateRegex, '').trim();
        toast.success(`تم تشغيل الانتقال الذكي التلقائي 🚀`);
      }

      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: rText, 
        sources: resData.sources || [] 
      }]);
      setIsLoading(false);

    } catch (error) {
      toast.error('أخفق خبير فنيّاً، يرجى إعادة المحاولة');
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'عذراً منك، يبدو أن هناك ضغطاً مؤقتاً في معالج الذكاء الاصطناعي وبحث جوجل. يرجى التحقق من إعداد مفتاح GEMINI_API_KEY وحاول مجدداً!'
      }]);
      setIsLoading(false);
    }
  };

  const handleCreateNewChat = () => {
    const newId = Date.now().toString();
    const newChat: ChatConversation = {
      id: newId,
      title: 'محادثة جديدة',
      messages: [
        { 
          role: 'bot', 
          text: 'مرحباً بك! أنا "خبير" العين الساهرة ومستشارك الذكي المتكامل في الشركة. تم تطويري وتزويدي بقدرات تحليل الصور الميدانية ولقطات الشاشة ومحرك بحث جوجل المباشر لأجيبك على أي استفسار بدقة متناهية. كيف بدك نخدمك اليوم؟',
          sources: []
        }
      ],
      createdAt: Date.now()
    };
    setConversations(prev => [newChat, ...prev]);
    setActiveConversationId(newId);
    setShowOptions(true);
    setShowHistory(false);
    toast.success('تم فتح محادثة جديدة 💬');
  };

  const handleDeleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      // If only one chat, reset it instead of deleting
      const newId = 'default';
      setConversations([
        {
          id: newId,
          title: 'محادثة ترحيبية',
          messages: [
            { 
              role: 'bot', 
              text: 'مرحباً بك! أنا "خبير" العين الساهرة ومستشارك الذكي المتكامل في الشركة. تم تطويري وتزويدي بقدرات تحليل الصور الميدانية ولقطات الشاشة ومحرك بحث جوجل المباشر لأجيبك على أي استفسار بدقة متناهية. كيف بدك نخدمك اليوم؟',
              sources: []
            }
          ],
          createdAt: Date.now()
        }
      ]);
      setActiveConversationId(newId);
      setShowOptions(true);
      toast.success('تم تفريغ المحادثة');
      return;
    }
    
    const filtered = conversations.filter(c => c.id !== id);
    setConversations(filtered);
    if (activeConversationId === id) {
      setActiveConversationId(filtered[0].id);
      setShowOptions(filtered[0].messages.length <= 1);
    }
    toast.success('تم حذف المحادثة');
  };

  return (
    <div className={`fixed ${isOpen ? 'inset-0 md:inset-auto md:bottom-6 md:left-6' : 'bottom-24 md:bottom-6 left-6'} z-[999] flex flex-col items-start font-sans`} dir="rtl">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full md:w-[420px] h-full md:h-[620px] md:mb-4 flex flex-col overflow-hidden"
          >
            <Card className="rounded-none md:rounded-[2rem] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] overflow-hidden bg-white/98 backdrop-blur-md h-full flex flex-col">
              
              {/* Top Premium Redesigned Header */}
              <CardHeader className="bg-gradient-to-r from-primary via-primary/95 to-slate-800 p-5 shrink-0 flex flex-row items-center justify-between text-white relative">
                {/* Decorative neon dot */}
                <div className="absolute top-1/2 left-4 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="w-8 h-8 object-contain" />
                    ) : (
                      <Bot className="w-6 h-6 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm font-black tracking-wide">المساعد الذكي خبير</CardTitle>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>
                    <p className="text-[10px] opacity-80 font-medium">العين الساهرة • تدعم اللقطات والبحث المباشر</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 relative z-10">
                  {/* Button to show/hide chats history list */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowHistory(!showHistory)} 
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
                    title="قائمة المحادثات"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 transition-transform hover:scale-105">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Chat Viewport Area */}
              <CardContent className="p-0 flex flex-col flex-1 bg-slate-50/50 overflow-hidden relative" onPaste={handlePaste}>
                
                {/* Conversations History Panel */}
                {showHistory && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-30 transition-all">
                    <div className="absolute left-0 right-0 top-0 h-[85%] bg-white rounded-b-[2rem] border-b border-slate-100 flex flex-col p-4 shadow-xl z-40 animate-in slide-in-from-top duration-300">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                        <span className="text-xs font-black text-slate-800">سجل المحادثات مع خبير</span>
                        <Button 
                          onClick={handleCreateNewChat} 
                          className="bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black px-2.5 py-1.5 flex items-center gap-1 h-7 shadow-sm"
                        >
                          <Sparkles className="w-3 w-3" />
                          <span>محادثة جديدة</span>
                        </Button>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 scrollbar-thin">
                        {conversations.map(c => {
                          const isActive = c.id === activeConversationId;
                          return (
                            <div 
                              key={c.id}
                              onClick={() => {
                                setActiveConversationId(c.id);
                                setShowHistory(false);
                                setShowOptions(c.messages.length <= 1);
                              }}
                              className={`p-3 rounded-2xl border text-right cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                                isActive 
                                ? 'bg-primary/5 border-primary/20 text-primary font-black' 
                                : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50 hover:border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                                <span className="text-xs font-bold truncate">{c.title}</span>
                              </div>
                              
                              <button 
                                onClick={(e) => handleDeleteChat(c.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0 animate-in fade-in"
                                title="حذف المحادثة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <Button 
                        variant="secondary" 
                        onClick={() => setShowHistory(false)} 
                        className="w-full rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 h-9"
                      >
                        إغلاق السجل
                      </Button>
                    </div>
                  </div>
                )}

                {/* Drag and Paste Floating advice */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800/10 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-black text-slate-500 pointer-events-none tracking-wide z-10 transition-opacity">
                  💡 تلميح: يمكنك لصق لقطة الشاشة (Ctrl+V) مباشرة هنا!
                </div>

                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scroll-smooth"
                >
                  {messages.map((msg, i) => {
                    const isBot = msg.role === 'bot';
                    return (
                      <div key={i} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} gap-1.5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        
                        {/* Sender Label */}
                        <span className="text-[9px] text-slate-400 px-2 font-black">
                          {isBot ? 'المستشار الذكي خبير' : (profile?.name || 'أنت')}
                        </span>

                        {/* Image attached layout */}
                        {msg.imagePreview && (
                          <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200 max-w-[70%] bg-slate-100 p-1 mb-1 transform hover:scale-102 transition-transform">
                            <img src={msg.imagePreview} alt="لقطة مرفقة" className="max-h-40 rounded-xl object-contain" />
                            <div className="absolute bottom-1 right-1 bg-black/50 text-[8px] text-white px-1.5 py-0.5 rounded-md font-mono">
                              لقطة شاشة
                            </div>
                          </div>
                        )}

                        {/* Speech Bubble */}
                        <div className={`max-w-[88%] p-3.5 rounded-3xl text-[12.5px] font-bold leading-relaxed whitespace-pre-line ${
                          isBot 
                          ? 'bg-white text-slate-800 border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]' 
                          : 'bg-primary text-white shadow-md'
                        }`}>
                          {msg.text}
                          
                          {/* Sourced Research ground links for Bouchra search grounding query */}
                          {isBot && msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                              <p className="text-[10px] text-slate-400 font-extrabold flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5 text-primary" /> مراجع وبحث جوجل المباشر:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src: any, index: number) => (
                                  <a 
                                    key={index} 
                                    href={src.uri} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="bg-primary/5 hover:bg-primary/10 text-primary text-[10px] py-1 px-2.5 rounded-full inline-flex items-center gap-1 border border-primary/10 transition-all font-medium hover:scale-102 truncate max-w-[150px]"
                                    title={src.title}
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    <span>{src.title || 'رابط البحث'}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Embedded WhatsApp helper UI inside chat context */}
                        {msg.type === 'whatsapp_helper' && (
                          <div className="w-full max-w-[95%] p-4 bg-white border border-slate-100 rounded-[2rem] space-y-3 text-right shadow-lg animate-in fade-in duration-300">
                            <p className="text-xs font-black text-slate-700">ابحث عن الموظف لتوليد رسالته التلقائية:</p>
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="اسم الموظف أو القسم..." 
                                value={botEmpSearch} 
                                onChange={(e) => setBotEmpSearch(e.target.value)} 
                                className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-200 text-xs font-bold text-right focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50"
                              />
                              <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                              {botEmployees
                                .filter(emp => 
                                  !botEmpSearch ||
                                  emp.name?.toLowerCase().includes(botEmpSearch.toLowerCase()) ||
                                  emp.role?.toLowerCase().includes(botEmpSearch.toLowerCase()) ||
                                  emp.department?.toLowerCase().includes(botEmpSearch.toLowerCase())
                                )
                                .map(emp => (
                                  <div key={emp.id} className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100/80 flex items-center justify-between gap-2 shadow-sm hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Avatar className="w-8 h-8 rounded-lg shrink-0">
                                        <AvatarImage src={emp.photoURL} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black rounded-lg">
                                          {emp.name?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="text-right min-w-0">
                                        <p className="text-xs font-extrabold text-slate-800 truncate">{emp.name}</p>
                                        <p className="text-[9px] text-slate-400 font-mono truncate">{emp.phone || 'بدون رقم'}</p>
                                      </div>
                                    </div>
                                    
                                    {emp.phone ? (
                                      <div className="flex gap-1 shrink-0">
                                        <button
                                          onClick={() => handleSendWhatsAppTemplate(emp, 'general')}
                                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[9px] font-black px-2.5 py-1 rounded-lg border border-emerald-100 transition-colors"
                                          title="إرسال إشعار عام"
                                        >
                                          إشعار
                                        </button>
                                        <button
                                          onClick={() => handleSendWhatsAppTemplate(emp, 'payslip')}
                                          className="bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white text-[9px] font-black px-2.5 py-1 rounded-lg border border-blue-100 transition-colors"
                                          title="إرسال تفاصيل الراتب"
                                        >
                                          راتب
                                        </button>
                                        <button
                                          onClick={() => handleSendWhatsAppTemplate(emp, 'attendance')}
                                          className="bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white text-[9px] font-black px-2.5 py-1 rounded-lg border border-amber-100 transition-colors"
                                          title="تنبيه حضور"
                                        >
                                          تنبيه
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-350 italic font-bold">بدون هاتف</span>
                                    )}
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* First state suggestions bento boxes */}
                  {showOptions && messages.length === 1 && (
                    <div className="grid grid-cols-1 gap-2 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[10px] text-slate-400 font-extrabold px-1 mb-1">أشياء شائعة يمكنك القيام بها:</p>
                      {QUICK_ACTIONS.map(action => (
                        <button 
                          key={action.id}
                          onClick={() => handleActionClick(action)}
                          className="flex items-center text-right justify-start gap-3 w-full bg-white hover:bg-primary/5 active:scale-98 py-3.5 px-4 rounded-2xl border border-slate-100 hover:border-primary/20 shadow-sm transition-all hover:shadow-md text-slate-600 font-extrabold group"
                        >
                          <div className="bg-primary/10 p-2.5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:rotate-6">
                            {action.icon}
                          </div>
                          <span className="text-[12.5px] group-hover:text-slate-800 transition-colors">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thinking Loader state */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-100 p-3.5 rounded-3xl flex items-center gap-2 px-4 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-[11px] text-muted-foreground font-black animate-pulse">العين الساهرة تبحث وتحلل بنظرة ذكية...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected attachment preview just above footer inputs */}
                {selectedImage && (
                  <div className="px-4 py-2 border-t bg-slate-50/80 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-1 divide-x divide-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-inner bg-slate-200">
                        <img src={selectedImage.preview} alt="معاينة" className="w-full h-full object-cover" />
                      </div>
                      <div className="text-right min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">لقطة الشاشة جاهزة للتحليل</p>
                        <p className="text-[8px] text-slate-400 font-mono">طراز الصورة: {selectedImage.mimeType.split('/')[1].toUpperCase()}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedImage(null)} 
                      className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Redesigned interactive input bar */}
                <div className="p-4 border-t bg-white flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2 w-full">
                    
                    {/* Image Selector Action */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline" 
                      type="button"
                      className="rounded-xl w-11 h-11 p-0 shrink-0 border-slate-200 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all hover:scale-105"
                      title="إرفاق لقطة شاشة للتحليل"
                    >
                      <ImageIcon className="w-5 h-5 text-slate-500 active:text-primary" />
                    </Button>

                    {/* Chat Text Input field */}
                    <Input 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="اسألني أي شيء أو الصق لقطة صورة..."
                      className="rounded-xl border-slate-200 h-11 text-right text-[12px] font-extrabold focus-visible:ring-primary focus-visible:border-primary/40"
                    />

                    {/* Submit Button */}
                    <Button 
                      onClick={() => handleSend()} 
                      disabled={isLoading} 
                      className="rounded-xl w-11 h-11 p-0 shrink-0 shadow-md bg-gradient-to-tr from-primary to-slate-800 hover:shadow-lg transition-transform active:scale-95"
                    >
                      <Send className="w-4.5 h-4.5 rotate-180" />
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button Launcher on screen edge with dynamic halo pulse */}
      {!isOpen && (
        <div className="relative">
          {/* Futuristic Radar/Scanner Pulse Circles */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              animate={{
                scale: [1, 1.8],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="absolute w-14 h-14 rounded-full border-2 border-indigo-500/40"
            />
            <motion.div
              animate={{
                scale: [1, 1.4],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5,
              }}
              className="absolute w-14 h-14 rounded-full bg-indigo-500/10 dark:bg-primary/20 blur-[2px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.25],
                opacity: [0.9, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1,
              }}
              className="absolute w-14 h-14 rounded-full bg-amber-500/10 blur-[4px]"
            />
          </div>

          <motion.button
            whileHover={{ 
              scale: 1.15,
              boxShadow: "0 20px 45px -10px rgba(99, 102, 241, 0.5)",
            }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(!isOpen)}
            className="bg-gradient-to-tr from-indigo-600 via-primary to-amber-500 text-white w-14 h-14 rounded-full shadow-[0_10px_35px_-5px_rgba(30,41,59,0.3)] flex items-center justify-center relative group border-2 border-white/20 overflow-visible transition-shadow"
          >
            {/* Glossy overlay sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
            
            {/* Center smart assistant icons container */}
            <div className="relative w-full h-full flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-10 h-10 rounded-full border border-dashed border-white/30 pointer-events-none"
              />
              
              <motion.div
                animate={{
                  y: [0, -2, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative z-10 flex items-center justify-center"
              >
                <Bot className="w-6 h-6 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" />
              </motion.div>
              
              <Sparkles className="absolute w-3.5 h-3.5 text-amber-300 right-2 top-2 animate-pulse" />
            </div>
            
            {/* Soft pulsing green status notification light */}
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white shadow-sm"></span>
            </span>
            
            <span className="absolute bottom-full mb-3 left-0 bg-slate-900/95 dark:bg-zinc-950/95 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-[0_12px_35px_-8px_rgba(0,0,0,0.3)] text-[11px] font-black whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 origin-bottom-left pointer-events-none border border-slate-800/80 max-w-xs text-right leading-relaxed flex items-center gap-1.5" dir="rtl">
               <span>استشارة ذكاء اصطناعي تفاعلية مع خبير! 🤖</span>
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
