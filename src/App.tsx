import * as React from "react";
import {
  useState,
  useEffect,
  ErrorInfo,
} from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";
import {
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  ShoppingCart,
  ShieldCheck,
  CreditCard,
  Users,
  Briefcase,
  Package,
  FileText,
  PieChart,
  Store,
  UsersRound,
  Clock,
  ClipboardPaste,
  Landmark,
  Receipt,
  Settings,
  Building2,
  Scan,
  Archive as ArchiveIcon,
  Image as ImageIcon,
  MessageCircle,
  Volume2,
  Factory,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Moon,
  Sun,
  ArrowLeft,
  Home,
  User,
  Mail,
  MapPin,
  Database,
  Paintbrush,
  LayoutGrid,
  ExternalLink,
  Search,
  Radar,
  Bug,
  Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";

import GlobalNotificationListener from "./components/GlobalNotificationListener";

import { WelcomeOverlay } from "./components/WelcomeOverlay";

// Views
import Dashboard from "./components/Dashboard";
import DashboardBuilder from "./components/DashboardBuilder";
import Financials from "./components/Financials";
import Employees from "./components/Employees";
import Payrolls from "./components/Payrolls";
import CameraCapture from "./components/CameraCapture";
import Purchases from "./components/Purchases";
import Notifications from "./components/Notifications";
import ProjectsV2 from "./components/ProjectsV2";
import EmployeeProfile from "./components/EmployeeProfile";
import SmartButler from "./components/SmartButler";
import ApprovalCenter from "./components/ApprovalCenter";
import Inventory from "./components/Inventory";
import PerformanceEvaluation from "./components/PerformanceEvaluation";
import AttendanceManager from "./components/AttendanceManager";
import SystemSettings from "./components/SystemSettings";
import Analytics from "./components/Analytics";
import ExecutiveBriefingSystem from "./components/ExecutiveBriefingSystem";
import CommandCenter from "./components/GeoSystem/CommandCenter";
import { useLiveTracking } from "./hooks/useLiveTracking";
import WorkerView from "./components/WorkerView";
import OnboardingGuide from "./components/OnboardingGuide";
import SuppliersList from "./components/SuppliersList";
import Sales from "./components/Sales";
import Clients from "./components/Clients";
import Invoices from "./components/Invoices";
import Quotations from "./components/Quotations";
import Production from "./components/Production";
import WorkersManagement from "./components/WorkersManagement";
import Expenses from "./components/Expenses";
import Archive from "./components/Archive";
import AssetsManagement from "./components/AssetsManagement";
import Gallery from "./components/Gallery";
import ReportsGallery from "./components/ReportsGallery";
import SmartReports from "./components/SmartReports";
import BankingAndVault from "./components/BankingAndVault";

import Subcontractors from "./components/Subcontractors";
import CompanyProfile from "./components/CompanyProfile";
import SalesRepDashboard from "./components/SalesRepDashboard";
import PrivateJobsWorkspace from "./components/PrivateJobsWorkspace";
import SalesRepsManagement from "./components/SalesRepsManagement";
import SalesRepProfile from "./components/SalesRepProfile";
import { GlobalSearch } from "./components/GlobalSearch";

const scrollbarStyles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

import ClientPortal from './components/ClientPortal';

// Error Boundary Component

class ErrorBoundary extends React.Component<any, any> {
  state = { hasError: false, error: null as Error | null, errorInfo: null as ErrorInfo | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("Layout Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errorStr = this.state.error?.toString() || 'Unknown Error';
      const componentStack = this.state.errorInfo?.componentStack || 'No component stack available';

      return (
        <div
          className="min-h-screen bg-slate-900 p-4 md:p-8 text-right"
          dir="rtl"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          <div className="max-w-5xl mx-auto bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col">
            {/* Header */}
            <div className="bg-rose-500/10 border-b border-rose-500/20 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center shadow-inner">
                  <Bug className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-rose-400 tracking-tight">مستكشف الأخطاء البرمجية (Debugger)</h2>
                  <p className="text-xs font-bold text-rose-400/70 mt-1">تم التقاط عطل غير متوقع في النظام. استخدم هذه التفاصيل للتحليل والإصلاح.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                     navigator.clipboard.writeText(`Error: ${errorStr}\n\nStack:\n${componentStack}`);
                     toast.success("تم نسخ تفاصيل الخطأ!");
                  }}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl gap-2 h-10 px-4"
                >
                  <Copy className="w-4 h-4" /> <span className="hidden sm:inline">نسخ التقرير</span>
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 h-10 px-4"
                >
                  <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">إعادة تشغيل النظام</span>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 flex flex-col gap-6">
              
              <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/50">
                 <h3 className="text-sm font-black text-slate-300 flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-rose-400" />
                    رسالة الخطأ (Error Message)
                 </h3>
                 <div className="bg-black/40 p-4 rounded-xl font-mono text-sm text-rose-300 whitespace-pre-wrap text-left" dir="ltr">
                    {errorStr}
                 </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-700/50">
                 <h3 className="text-sm font-black text-slate-300 flex items-center gap-2 mb-3">
                    <LayoutGrid className="w-4 h-4 text-indigo-400" />
                    مسار المكونات (Component Stack)
                 </h3>
                 <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-indigo-300 whitespace-pre-wrap leading-relaxed text-left overflow-x-auto max-h-[400px]" dir="ltr">
                    {componentStack}
                 </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-800/80 p-4 border-t border-slate-700 flex justify-between items-center text-xs font-bold text-slate-500">
               <div className="flex gap-4">
                  <button onClick={() => signOut(auth)} className="hover:text-white transition-colors">تسجيل الخروج وإنهاء الجلسة</button>
               </div>
               <span>نظام خبراء الرسم • وضع التطوير والمراقبة</span>
            </div>

          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const settingsCategories = [
  { id: "", label: "لوحة الإعدادات الرئيسية", icon: LayoutGrid, isHub: true },
  { id: "company_profile", label: "هوية الشركة والأرشيف", icon: Building2 },
  { id: "general", label: "الإعدادات العامة والمالية", icon: Settings },
  { id: "notifications", label: "البريد والإشعارات", icon: Mail },
  { id: "attendance", label: "نظام الدوام والـ GPS", icon: Clock },
  { id: "ai", label: "الذكاء الاصطناعي", icon: Sparkles },
  { id: "locations", label: "المقرات والسكن الإداري", icon: MapPin },
  { id: "banks", label: "الحسابات البنكية والخزائن", icon: CreditCard },
  { id: "theme", label: "المظهر والثيم البصري", icon: Paintbrush },
  { id: "data", label: "إدارة البيانات والأمان", icon: Database }
];

function AppContent() {
  const { user, profile, activeCompanyId, setActiveCompanyId, companies } = useAuth();
  useLiveTracking();
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["overview"]);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [hoveredSubMenuId, setHoveredSubMenuId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [headerNotifications, setHeaderNotifications] = useState<any[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<string>("");
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });
  const [tabHistory, setTabHistory] = useState<string[]>(["dashboard"]);
  const [activeInput, setActiveInput] = useState<{
    element: HTMLInputElement | HTMLTextAreaElement | null;
    key: string;
    history: string[];
  }>({ element: null, key: "", history: [] });

  const [sysSettings, setSysSettings] = useState<any>({
    companyName: "خبراء الرسم",
    companySub: "للدعاية والإعلان",
    logoUrl: "https://i.imgur.com/yYZDeHZ.jpg",
    sidebarColor: "#1a4d4e",
    primaryColor: "#2c7a7d",
    borderRadius: "24px",
    enableGlassEffect: true,
    showWelcomeMessage: true,
    generalAnnouncement: "📢 أهلاً بكم في نظام خبراء الرسم المتكامل. نتمنى لكم يوماً سعيداً!",
    roleWelcomeMessages: {
      manager: {
        title: "مرحباً أيها القائد",
        tips: ["راجع لوحة التقارير لمتابعة الأداء", "تأكد من الموافقات المعلقة", "رؤيتك اليوم تصنع نجاح الغد"]
      },
      supervisor: {
        title: "أهلاً بك يا مشرفنا",
        tips: ["تابع حضور وانصراف فريقك", "تأكد من سير العمل في المواقع", "دعمك للفريق هو سر الجودة"]
      },
      employee: {
        title: "يسعدنا وجودك معنا",
        tips: ["سجل حضورك الآن لتبدأ يومك", "راجع مهامك اليومية بدقة", "إنجازك الصغير اليوم يكمل نجاحنا"]
      }
    }
  });
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [publicWorkerId, setPublicWorkerId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPublicWorkerOnboarding, setShowPublicWorkerOnboarding] =
    useState(false);

  const getSmartSuggestions = (placeholder: string): string[] => {
    const p = (placeholder || "").toLowerCase();
    if (p.includes("تاريخ") || p.includes("التاريخ") || p.includes("date")) {
      const today = new Date().toISOString().split('T')[0];
      return [today];
    }
    if (
      p.includes("مبلغ") ||
      p.includes("سعر") ||
      p.includes("تكلفة") ||
      p.includes("القيمة") ||
      p.includes("السعر") ||
      p.includes("قيمة") ||
      p.includes("الراتب") ||
      p.includes("راتب") ||
      p.includes("amount") ||
      p.includes("price")
    ) {
      return ["100", "500", "1000", "5000"];
    }
    if (
      p.includes("هاتف") ||
      p.includes("جوال") ||
      p.includes("رقم") ||
      p.includes("phone") ||
      p.includes("mobile")
    ) {
      return ["9665"];
    }
    return [];
  };

  const sidebarBg = sysSettings?.sidebarColor || "#1a4d4e";
  const cleanHex = sidebarBg.replace('#', '');
  let isSidebarLight = false;
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    isSidebarLight = (r * 0.299 + g * 0.587 + b * 0.114) > 170;
  } else if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    isSidebarLight = (r * 0.299 + g * 0.587 + b * 0.114) > 170;
  }

  const getSidebarItemClasses = (isActive: boolean) => {
    if (isSidebarLight) {
      if (isActive) {
        return {
          button: "bg-slate-500/15 text-slate-900 font-extrabold shadow-none",
          icon: "text-slate-800",
          indicator: "bg-slate-800"
        };
      } else {
        return {
          button: "text-slate-700 hover:text-slate-900 hover:bg-slate-500/10 font-bold",
          icon: "text-slate-500 group-hover:text-slate-800",
          indicator: ""
        };
      }
    } else {
      if (isActive) {
        return {
          button: "bg-white/12 text-white font-extrabold shadow-sm",
          icon: "text-white",
          indicator: "bg-white"
        };
      } else {
        return {
          button: "text-white/85 hover:text-white hover:bg-white/10 font-bold",
          icon: "text-white/70 group-hover:text-white",
          indicator: ""
        };
      }
    }
  };

  const toggleThemeMode = async (nextDark: boolean) => {
    const root = document.documentElement;
    if (nextDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    setSysSettings((prev: any) => ({
      ...prev,
      isDarkMode: nextDark
    }));

    if (profile?.uid) {
      try {
        const userRef = doc(db, "users", profile.uid);
        await updateDoc(userRef, {
          "userTheme.isDarkMode": nextDark
        });
      } catch (err) {
        console.warn("Could not save theme preference to database", err);
      }
    }
  };

  useEffect(() => {
    setTabHistory((prev) => {
      if (prev[prev.length - 1] === activeTab) return prev;
      return [...prev, activeTab];
    });
  }, [activeTab]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial status
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleInputBlur = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        target.type !== "password"
      ) {
        const val = target.value.trim();
        if (!val) return;

        const key = target.placeholder || target.name || target.id || "عام";
        
        try {
          const stored = localStorage.getItem("input_history");
          const history = stored ? JSON.parse(stored) : {};
          const fieldHistory = history[key] || [];
          
          const filtered = fieldHistory.filter((v: string) => v !== val);
          filtered.unshift(val);
          
          history[key] = filtered.slice(0, 5);
          localStorage.setItem("input_history", JSON.stringify(history));
        } catch (err) {
          console.warn("Error saving input history", err);
        }
      }
    };

    window.addEventListener("blur", handleInputBlur, true);
    return () => {
      window.removeEventListener("blur", handleInputBlur, true);
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const isTextInput =
        (target.tagName === "INPUT" && 
         !["checkbox", "radio", "submit", "button", "file", "range", "color"].includes((target as HTMLInputElement).type)) ||
        target.tagName === "TEXTAREA";

      const menuWidth = 210;
      const menuHeight = isTextInput ? 315 : 285;
      let posX = e.clientX;
      let posY = e.clientY;
      
      if (posX + menuWidth > window.innerWidth) {
        posX = window.innerWidth - menuWidth - 10;
      }
      if (posY + menuHeight > window.innerHeight) {
        posY = window.innerHeight - menuHeight - 10;
      }

      if (isTextInput) {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        const key = inputEl.placeholder || inputEl.name || inputEl.id || "عام";
        
        let fieldHistory: string[] = [];
        try {
          const stored = localStorage.getItem("input_history");
          if (stored) {
            const history = JSON.parse(stored);
            fieldHistory = history[key] || [];
          }
        } catch (err) {
          console.warn(err);
        }
        
        setActiveInput({
          element: inputEl,
          key,
          history: fieldHistory
        });
      } else {
        setActiveInput({ element: null, key: "", history: [] });
      }
      
      setContextMenu({ x: posX, y: posY, visible: true });
    };

    const handleClick = () => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      setShowSettingsDropdown(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
      if (e.altKey && (e.key === "h" || e.key === "H" || e.key === "ا")) {
        e.preventDefault();
        setActiveTab(profile?.role === "sales_rep" ? "rep_dashboard" : "dashboard");
        toast.info("تم الانتقال إلى لوحة التحكم الرئيسية");
      }
      if (e.altKey && (e.key === "s" || e.key === "S" || e.key === "س")) {
        e.preventDefault();
        if (user?.email === "expertadvsa@gmail.com") {
          setActiveTab("settings");
          toast.info("تم الانتقال إلى الإعدادات");
        }
      }
      if (e.altKey && (e.key === "p" || e.key === "P" || e.key === "ح")) {
        e.preventDefault();
        setActiveTab(profile?.role === "sales_rep" ? "sales_rep_profile" : "profile");
        toast.info("تم الانتقال إلى الملف الشخصي");
      }
      if (e.altKey && (e.key === "t" || e.key === "T" || e.key === "ف")) {
        e.preventDefault();
        const root = document.documentElement;
        const nextDark = !root.classList.contains("dark");
        toggleThemeMode(nextDark);
        toast.success(nextDark ? "تم تفعيل المظهر الداكن" : "تم تفعيل المظهر المضيء");
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (tabHistory.length > 1) {
          const newHistory = [...tabHistory];
          newHistory.pop();
          const prevTab = newHistory.pop();
          if (prevTab) {
            setTabHistory(newHistory);
            setActiveTab(prevTab);
            toast.info("تم الرجوع للصفحة السابقة");
          }
        }
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profile, tabHistory]);
  useEffect(() => {
    // Initial splash screen timeout
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const menuGroups: any[] = profile?.role === "sales_rep" ? [
    {
      id: "repWorkspace",
      title: "بوابة المندوب مبيعات",
      items: [
        { id: "rep_dashboard", label: "الرئيسية", icon: LayoutDashboard, roles: ["sales_rep"] },
        { id: "rep_smart_bot", label: "المساعد الذكي (ألف ياء)", icon: Sparkles, roles: ["sales_rep"] },
        { id: "rep_documents", label: "وثائقي الصادرة", icon: FileSpreadsheet, roles: ["sales_rep"] },
        { id: "rep_statement", label: "كشف حسابي الرسمي", icon: Wallet, roles: ["sales_rep"] },
        { id: "private_jobs_page", label: "المقاولات الخاصة", icon: Briefcase, roles: ["sales_rep"] },
      ]
    }
  ] : [
    {
      id: "dashboardGroup",
      title: "الرئيسية",
      items: [
        { id: "dashboard", label: "الرئيسية", icon: LayoutDashboard, roles: ["manager", "supervisor", "employee"] },
        { id: "command_center", label: "الرادار الميداني", icon: Radar, roles: ["manager"] },
        { id: "briefing", label: "موجز AI", icon: Zap, roles: ["manager"] },
      ],
    },
    {
      id: "operationsGroup",
      title: "المشاريع والعمليات",
      items: [
        {
          id: "ops_group",
          label: "المشاريع",
          icon: Briefcase,
          roles: ["manager", "supervisor"],
          subItems: [
            { id: "projects", label: "سجل المشاريع", roles: ["manager", "supervisor"] },
            { id: "tasks", label: "المهام", roles: ["manager", "supervisor"] },
            { id: "subcontractors", label: "المقاولين", roles: ["manager", "supervisor"] },
          ]
        },
        {
          id: "inventory_group",
          label: "المخازن",
          icon: Package,
          roles: ["manager", "supervisor"],
          subItems: [
            { id: "inventory", label: "المخزون والمواد", roles: ["manager", "supervisor"] },
            { id: "production", label: "خطوط الإنتاج", roles: ["manager", "supervisor"] },
            { id: "assets", label: "الأصول والمعدات", roles: ["manager", "supervisor"] },
          ]
        }
      ]
    },
    {
      id: "commercialGroup",
      title: "النشاط التجاري",
      items: [
        {
          id: "sales_group",
          label: "المبيعات",
          icon: TrendingUp,
          roles: ["manager"],
          subItems: [
            { id: "sales", label: "سجل المبيعات", roles: ["manager"] },
            { id: "clients", label: "العملاء", roles: ["manager"] },
            { id: "invoices", label: "الفواتير", roles: ["manager"] },
            { id: "quotations", label: "عروض الأسعار", roles: ["manager"] },
            { id: "private_jobs_page", label: "المقاولات الخاصة", roles: ["manager"] }
          ]
        },
        {
          id: "sales_reps",
          label: "إدارة المناديب",
          icon: Users,
          roles: ["manager"]
        },
        {
          id: "purchases_group",
          label: "المشتريات",
          icon: ShoppingCart,
          roles: ["manager", "supervisor"],
          subItems: [
            { id: "purchases", label: "سجل المشتريات", roles: ["manager", "supervisor"] },
            { id: "suppliers", label: "الموردين", roles: ["manager"] },
            { id: "camera", label: "الماسح الذكي", roles: ["manager", "supervisor"] },
          ]
        },
      ]
    },
    {
      id: "financialGroup",
      title: "المالية والمحاسبة",
      items: [
        {
          id: "finance_group",
          label: "المالية",
          icon: Wallet,
          roles: ["manager"],
          subItems: [
            { id: "financials", label: "الحالة المالية", roles: ["manager"] },
            { id: "expenses", label: "المصروفات", roles: ["manager"] },
            { id: "banking", label: "البنوك والخزينة", roles: ["manager"] },
            { id: "approvals", label: "الاعتمادات", roles: ["manager"] },
          ]
        }
      ]
    },
    {
      id: "hrGroup",
      title: "الموارد البشرية",
      items: [
        {
          id: "hr_group",
          label: "الموارد",
          icon: UsersRound,
          roles: ["manager", "supervisor"],
          subItems: [
            { id: "employees", label: "الموظفين", roles: ["manager", "supervisor"] },
            { id: "attendance_manager", label: "الحضور والغياب", roles: ["manager", "supervisor"] },
            { id: "payrolls", label: "الرواتب", roles: ["manager"] },
            { id: "workers_management", label: "العمالة اليومية", roles: ["manager", "supervisor"] },
            { id: "evaluation", label: "تقييم الأداء", roles: ["manager", "supervisor"] },
          ]
        }
      ]
    },
    {
      id: "mediaGroup",
      title: "التقارير والأرشيف",
      items: [
        {
          id: "reports_group",
          label: "التقارير",
          icon: PieChart,
          roles: ["manager", "supervisor", "employee"],
          subItems: [
            { id: "analytics", label: "التحليلات", roles: ["manager"] },
            { id: "archive", label: "الأرشيف", roles: ["manager"] },
            { id: "gallery", label: "الوسائط", roles: ["manager", "supervisor", "employee"] },
            { id: "reports_gallery", label: "التقارير المحفوظة", roles: ["manager"] },
            { id: "smart_reports", label: "التقارير الذكية", roles: ["manager"] },
          ]
        }
      ]
    }
  ];

  const isTabAllowed = (tabId: string) => {
    if (tabId === "settings") {
      return user?.email === "expertadvsa@gmail.com";
    }
    if (["profile", "notifications", "camera"].includes(tabId)) return true;
    const allItems: any[] = [];
    menuGroups.forEach((g) => {
      g.items.forEach((item) => {
        allItems.push(item);
        if (item.subItems) {
          allItems.push(...item.subItems);
        }
      });
    });
    const item = allItems.find((i) => i.id === tabId);
    if (!item) return true;
    return item.roles.includes(profile?.role || "employee") || profile?.role === "owner";
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  const toggleSubMenu = (menuId: string) => {
    setExpandedSubMenus((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  useEffect(() => {
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.subItems && item.subItems.some((s: any) => s.id === activeTab)) {
          setExpandedSubMenus((prev) =>
            prev.includes(item.id) ? prev : [...prev, item.id]
          );
        }
      });
    });
  }, [activeTab]);

  useEffect(() => {
    if (profile) {
      if ((activeTab === "dashboard" || activeTab === "sales_rep_dashboard") && profile.role === "sales_rep") {
        setActiveTab("rep_dashboard");
        return;
      }
      if (!isTabAllowed(activeTab)) {
        setActiveTab(profile.role === "sales_rep" ? "rep_dashboard" : "dashboard");
        toast.error("ليس لديك صلاحية الوصول لهذه الصفحة");
      }
    }
  }, [profile, activeTab]);

  useEffect(() => {
    // Check URL for public worker view

    const params = new URLSearchParams(window.location.search);
    const workerId = params.get("workerId");
    const view = params.get("view");
    if (workerId && view === "public") {
      setPublicWorkerId(workerId);
      if (!localStorage.getItem("hasSeenGuide_publicWorker_" + workerId)) {
        setShowPublicWorkerOnboarding(true);
      }
    }
  }, []);

  useEffect(() => {
    if (user && profile) {
      if (!localStorage.getItem("hasSeenGuide_" + user.uid)) {
        setShowOnboarding(true);
      }
    }
  }, [user, profile]);

  useEffect(() => {
    const unsubSys = onSnapshot(
      doc(db, "system", "settings"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const key = data.geminiApiKey || "";
          localStorage.setItem("VITE_GEMINI_API_KEY", key);
          localStorage.setItem("gemini_api_key", key);
          (window as any).VITE_GEMINI_API_KEY = key;
          const baseSettings = {
            companyName: data.companyName || "خبراء الرسم",
            companySub: data.companySub || "لإدارة المشاريع والمقارات",
            logoUrl: data.logoUrl || "https://i.imgur.com/yYZDeHZ.jpg",
            sidebarColor: data.sidebarColor || "#1a4d4e",
            primaryColor: data.primaryColor || "#2c7a7d",
            borderRadius: data.borderRadius || "12px",
            enableGlassEffect: data.enableGlassEffect || false,
            showWelcomeMessage: data.showWelcomeMessage !== undefined ? data.showWelcomeMessage : true,
            generalAnnouncement: data.generalAnnouncement || "📢 أهلاً بكم في نظام خبراء الرسم المتكامل.",
            roleWelcomeMessages: (() => {
              const msgs = data.roleWelcomeMessages || {};
              const defaultTips = {
                manager: ["راجع لوحة التقارير لمتابعة الأداء", "تأكد من الموافقات المعلقة", "رؤيتك اليوم تصنع نجاح الغد"],
                supervisor: ["تابع حضور وانصراف فريقك", "تأكد من سير العمل في المواقع", "دعمك للفريق هو سر الجودة"],
                employee: ["سجل حضورك الآن لتبدأ يومك", "راجع مهامك اليومية بدقة", "إنجازك الصغير اليوم يكمل نجاحنا"]
              };
              const roles = ['manager', 'supervisor', 'employee'];
              const result: any = {};
              roles.forEach(role => {
                const val = msgs[role];
                if (typeof val === 'string') {
                  result[role] = { title: val, tips: (defaultTips as any)[role] };
                } else if (typeof val === 'object' && val !== null) {
                  result[role] = val;
                } else {
                  result[role] = { 
                    title: role === 'manager' ? "مرحباً أيها القائد" : role === 'supervisor' ? "أهلاً بك يا مشرفنا" : "يسعدنا وجودك معنا", 
                    tips: (defaultTips as any)[role] 
                  };
                }
              });
              return result;
            })()
          };
          
          setSysSettings((prev: any) => ({ ...prev, ...baseSettings }));
          applyTheme(baseSettings);
        }
      },
      (error) => {
        console.warn("Could not read system settings (guest mode):", error);
      }
    );

    return () => unsubSys();
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    // Listener for user-specific theme overrides
    const unsubUser = onSnapshot(
      doc(db, "users", profile.uid),
      (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          if (userData.userTheme) {
            const theme = userData.userTheme;
            setSysSettings((prev: any) => ({ ...prev, ...theme }));
            applyTheme(theme);
          }
        }
      },
      (error) => {
        console.error("Error reading user-specific settings:", error);
      }
    );

    return () => unsubUser();
  }, [user, profile]);

  const applyTheme = (theme: any) => {
    const root = document.documentElement;
    if (theme.sidebarColor) root.style.setProperty('--sidebar', theme.sidebarColor);
    if (theme.primaryColor) root.style.setProperty('--primary', theme.primaryColor);
    if (theme.borderRadius) root.style.setProperty('--radius', theme.borderRadius);
    
    if (theme.enableGlassEffect !== undefined) {
      if (theme.enableGlassEffect) {
        root.classList.add('glass-theme');
      } else {
        root.classList.remove('glass-theme');
      }
    }

    if (theme.isDarkMode !== undefined) {
      if (theme.isDarkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    if (!profile) return;

    // Listener for notifications badge - only count UNREAD
    let q = query(
      collection(db, "notifications"),
      where("read", "==", false),
      orderBy("timestamp", "desc"),
      limit(20),
    );

    if (profile.role !== "manager" && profile.role !== "owner") {
      q = query(
        collection(db, "notifications"),
        where("targetRole", "in", ["all", profile.role]),
        where("read", "==", false),
        orderBy("timestamp", "desc"),
        limit(20),
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadCount(snapshot.size);
      },
      (error: Error) => console.error("App Notifications Listen Error:", error),
    );

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    // Real-time listener for top 5 notifications for the header dropdown
    let q = query(
      collection(db, "notifications"),
      orderBy("timestamp", "desc"),
      limit(5),
    );

    if (profile.role !== "manager" && profile.role !== "owner") {
      q = query(
        collection(db, "notifications"),
        where("targetRole", "in", ["all", profile.role]),
        orderBy("timestamp", "desc"),
        limit(5),
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });
        setHeaderNotifications(docs);
      },
      (error: Error) => console.error("Header Notifications Listen Error:", error),
    );

    return () => unsubscribe();
  }, [profile]);

  const handleHeaderNotificationClick = async (notif: any) => {
    try {
      if (!notif.read) {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      }
      setShowNotificationsDropdown(false);
      if (notif.tab) {
        setActiveTab(notif.tab);
      } else {
        setActiveTab("notifications");
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAllHeaderNotificationsRead = async () => {
    try {
      const unread = headerNotifications.filter(n => !n.read);
      for (const notif of unread) {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const getNotificationIcon = (category: string) => {
    switch (category) {
      case "financial":
        return <Wallet className="w-4 h-4 text-emerald-500" />;
      case "employee":
        return <Users className="w-4 h-4 text-blue-500" />;
      case "purchase":
        return <ShoppingCart className="w-4 h-4 text-amber-500" />;
      case "project":
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case "inventory":
        return <Package className="w-4 h-4 text-purple-500" />;
      case "system":
        return <Settings className="w-4 h-4 text-slate-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const renderNotificationsDropdown = () => {
    if (!showNotificationsDropdown) return null;
    return (
      <>
        <div 
          className="fixed inset-0 z-[100]" 
          onClick={() => setShowNotificationsDropdown(false)} 
        />
        <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_10px_35px_-5px_rgba(0,0,0,0.15)] border border-slate-200 dark:border-zinc-800 z-[101] text-right overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200 font-sans" dir="rtl">
          {/* Header */}
          <div className="p-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-row-reverse">
              <span className="text-xs font-black text-slate-850 dark:text-zinc-200">الإشعارات الأخيرة</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllHeaderNotificationsRead}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* Content list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans" dir="rtl">
            {headerNotifications.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-slate-400 dark:text-zinc-500">
                <Bell className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-bold">لا توجد إشعارات حديثة</p>
              </div>
            ) : (
              headerNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleHeaderNotificationClick(notif)}
                  className={`p-3 flex gap-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-right items-start relative ${!notif.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 flex items-center justify-center shrink-0">
                    {getNotificationIcon(notif.category || notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-black truncate flex items-center gap-1.5 ${!notif.read ? 'text-slate-900 dark:text-zinc-100' : 'text-slate-600 dark:text-zinc-400'}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-tight font-medium mb-1 home-notif-msg">
                      {notif.message}
                    </p>
                    <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-bold">
                      {notif.timestamp?.toDate?.()?.toLocaleString('ar-SA') || 'منذ قليل'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer expand button */}
          <div className="p-1.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 text-center">
            <button
              onClick={() => {
                setActiveTab("notifications");
                setShowNotificationsDropdown(false);
              }}
              className="w-full py-1.5 px-3 text-[11px] font-black text-primary hover:text-indigo-700 bg-slate-100 dark:bg-zinc-800 rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <span>توسيع وعرض كافة الإشعارات</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </>
    );
  };

  useEffect(() => {
    setSelectedEmployeeId(null);
  }, [activeTab]);

  const handleSidebarCollapseToggle = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    if (newState) {
      setExpandedGroups([]);
    }
  };

  useEffect(() => {
    const handleTabChange = (e: CustomEvent<any>) => {
      const data = e.detail;
      if (typeof data === "string") {
        setActiveTab(data);
      } else if (data && data.tab) {
        setActiveTab(data.tab);
        // Special logic for specific tabs
        if (data.employeeId) {
          setSelectedEmployeeId(data.employeeId);
        }
        if (data.projectId) {
          // If Projects component has a way to receive a selection, we'd trigger it here
        }
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("changeTab", handleTabChange as any);
    window.addEventListener("showOnboarding", (() =>
      setShowOnboarding(true)) as any);
    return () => {
      window.removeEventListener("changeTab", handleTabChange as any);
      window.removeEventListener("showOnboarding", (() =>
        setShowOnboarding(true)) as any);
    };
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    
    try {
      await signInWithPopup(auth, provider);
      setShowWelcomeScreen(true);
      toast.success("تم تسجيل الدخول بنجاح");
    } catch (err: any) {
      console.error("Login Error:", err);
      
      if (err.code === 'auth/unauthorized-domain') {
         toast.error(`تحذير: النطاق (${window.location.hostname}) غير مصرح به. يجب إضافته في إعدادات Firebase Authentication -> Authorized domains.`, { duration: 15000 });
         return;
      }
      
      if (err.code === 'auth/network-request-failed') {
         toast.error("فشل في الاتصال بالشبكة. قد يكون السبب وجود مانع إعلانات (Adblocker) أو جدار حماية يمنع تسجيل الدخول، أو أنك تستخدم نافذة تصفح مخفي.", { duration: 10000 });
         return;
      }

      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup') || err.message?.includes('cross-origin')) {
          toast.error("تم حظر أو إغلاق النافذة المنبثقة! يرجى النقر على (نافذة جديدة - New Tab) بأعلى اليمين بجانب زر المشاركة، ثم المحاولة مرة أخرى.", { duration: 15000 });
          return; // Don't try redirect anymore as it causes infinite loops in blocked iframes
      }
      
      toast.error(err.message || "حدث خطأ غير متوقع أثناء تسجيل الدخول. تأكد من فتح التطبيق في مساحة مستقلة.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("تم تسجيل الخروج");
    } catch {
      toast.error("خطأ في تسجيل الخروج");
    }
  };

  if (isInitialLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" 
        dir="rtl"
        style={{ 
          background: 'radial-gradient(circle at center, #0f2a2c 0%, #030809 100%)',
          fontFamily: "'Cairo', sans-serif"
        }}
      >
        {/* Animated ambient background elements */}
        <div className="absolute top-[-20%] right-[-20%] w-[35rem] h-[35rem] bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[35rem] h-[35rem] bg-emerald-500/5 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 flex flex-col items-center"
        >
          {/* Pulsing Glowing Logo Container */}
          <div className="relative mb-8">
            <div className="absolute -inset-6 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur-2xl opacity-65 animate-pulse" />
            <img 
              src="https://i.imgur.com/yYZDeHZ.jpg" 
              alt="Logo" 
              className="relative w-36 h-36 object-contain rounded-[2.5rem] shadow-2xl border-2 border-white/20 bg-white p-1" 
            />
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white text-3xl font-black tracking-tight mb-2"
          >
            نظام خبراء الرسم
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.5 }}
            className="text-teal-400 font-bold text-xs tracking-[0.25em]"
          >
            جاري تهيئة البيئة الرقمية...
          </motion.p>
          
          {/* Spinner Loader */}
          <div className="mt-8 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce"></span>
          </div>
        </motion.div>

        <div className="absolute bottom-10 flex items-center gap-2 text-white/30 text-[9px] font-black tracking-widest">
           <Zap className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
           <span>POWERED BY ADVANCED INTELLIGENCE</span>
        </div>
      </div>
    );
  }

  if (publicWorkerId) {
    if (showPublicWorkerOnboarding) {
      return (
        <OnboardingGuide
          role="worker"
          onComplete={() => {
            localStorage.setItem(
              "hasSeenGuide_publicWorker_" + publicWorkerId,
              "true",
            );
            setShowPublicWorkerOnboarding(false);
          }}
        />
      );
    }
    return (
      <div
        className="min-h-screen bg-slate-50 p-4 md:p-8"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <div className="w-full">
          <WorkerView
            workerId={publicWorkerId}
            onBack={() => setPublicWorkerId(null)}
            readOnly={true}
          />
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground font-bold italic">
              هذه الصفحة للعرض فقط. لا يمكن تعديل البيانات من هنا.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden text-right select-none p-4 bg-slate-900"
        dir="rtl"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        {/* Animated Dynamic Background Elements */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl bg-teal-500/10 rounded-full mix-blend-screen filter blur-[120px] opacity-30" />
          {/* subtle dot grid pattern */}
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Unified Center Login Form */}
        <div className="relative z-10 w-full max-w-[420px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="w-full bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-10 md:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden group"
          >
            {/* Top highlight line */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
            
            {/* Logo */}
            <div className="flex flex-col items-center mb-10 text-center relative z-10">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="mb-6 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-blue-500 blur-xl rounded-full scale-110 opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                <div className="relative z-10 bg-slate-800/80 p-4 rounded-3xl shadow-xl border border-white/10 backdrop-blur-md">
                  <img
                    src={sysSettings.logoUrl}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded-xl"
                  />
                </div>
              </motion.div>
              
              <h1 className="text-3xl font-black text-white tracking-tight mb-3">
                مرحباً بك مجدداً
              </h1>
              <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-[260px] mx-auto">
                سجل الدخول للمنصة للوصول إلى مساحة العمل الخاصة بك
              </p>

              {window !== window.top && (
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-100 text-xs w-full backdrop-blur-md text-right">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                      <ExternalLink className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold mb-1 text-sm text-blue-300">عرض داخل المحرر</p>
                      <p className="mb-3 text-blue-200/80">يرجى فتح التطبيق في نافذة مستقلة لتسجيل الدخول بأمان.</p>
                      <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all w-full justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                        فتح في نافذة مستقلة
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 relative z-10">
              <Button
                onClick={handleLogin}
                className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-4 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 border border-white/10 cursor-pointer overflow-hidden relative group/btn"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"></div>
                <div className="bg-white/10 p-2 rounded-xl transition-transform group-hover/btn:scale-110 duration-300 backdrop-blur-sm border border-white/5 relative z-10">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                </div>
                <span className="relative z-10 tracking-wide font-bold">المتابعة باستخدام Google</span>
              </Button>
              
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    هذا النظام محمي بطبقات تشفير متقدمة. يقتصر الوصول على الموظفين المصرح لهم فقط.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <div className="mt-8 text-center text-slate-500/80 text-[10px] font-bold tracking-wider uppercase">
            المملكة العربية السعودية © 2026
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding && profile) {
    return (
      <OnboardingGuide
        role={profile.role || "employee"}
        onComplete={() => {
          localStorage.setItem("hasSeenGuide_" + user.uid, "true");
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col lg:flex-row text-right"
      dir="rtl"
      style={{ fontFamily: "'Cairo', sans-serif" }}
    >
      <style>{scrollbarStyles}</style>
      {/* Mobile Header */}
      <div className="lg:hidden bg-card/85 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50 h-[72px]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div
              onClick={() => setActiveTab(profile?.role === "sales_rep" ? "rep_dashboard" : "dashboard")}
              className="flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src={sysSettings.logoUrl}
                alt="logo"
                className="w-8 h-8 object-contain rounded-lg"
              />
            </div>
            {sysSettings.showWelcomeMessage && sysSettings.generalAnnouncement && (
               <Dialog>
                 <DialogTrigger asChild>
                   <div className="max-w-[130px] overflow-hidden truncate cursor-pointer hover:opacity-90 transition-opacity ml-2 shrink-0">
                      <span className="text-[9px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 whitespace-nowrap flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[80px]">{sysSettings.generalAnnouncement}</span>
                      </span>
                   </div>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[425px] rounded-xl p-5 border border-slate-200 bg-white" dir="rtl">
                    <DialogHeader>
                      <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-slate-600" />
                        الرسالة العامة والتوجه الإداري
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-3.5 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                        <Bell className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed text-xs">
                        {sysSettings.generalAnnouncement}
                      </p>
                    </div>
                 </DialogContent>
               </Dialog>
            )}
          </div>
        
        <div className="flex items-center gap-2">
          <div className="relative z-[150]">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </Button>
            {renderNotificationsDropdown()}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab("profile")}
            className="rounded-full overflow-hidden w-9 h-9 border-2 border-slate-100"
          >
            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
              {(
                profile?.name?.[0] ||
                user?.displayName?.[0] ||
                "U"
              ).toUpperCase()}
            </div>
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{
              width: isSidebarCollapsed && window.innerWidth >= 1024 ? 80 : 180,
              opacity: 1,
              x: 0,
            }}
            exit={{ width: 0, opacity: 0 }}
            className={`fixed inset-y-0 right-0 lg:h-screen bg-sidebar/90 backdrop-blur-md text-sidebar-foreground border-l border-slate-200/50 dark:border-zinc-800/50 z-40 lg:relative lg:translate-x-0 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.08)] lg:shadow-none flex flex-col overflow-visible rounded-l-[1.5rem] lg:rounded-none lg:top-0 top-16 bottom-[88px] h-auto`}
          >
            <div className={`p-4 mb-2 transition-all duration-300 ${isSidebarCollapsed ? "px-2" : "px-4"}`}>
              <div 
                onClick={() => setActiveTab(profile?.role === "sales_rep" ? "rep_dashboard" : "dashboard")}
                className="flex items-center gap-3 cursor-pointer active:scale-95 transition-all text-white relative"
                title="الذهاب للوحة الرئيسية"
              >
                <img
                  src={activeCompany?.logoUrl || sysSettings.logoUrl}
                  alt={activeCompany?.name || "خبراء الرسم"}
                  className="w-9 h-9 object-contain rounded-xl shrink-0 transition-all p-0.5 bg-white border border-white/10 shadow-sm"
                />
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col overflow-hidden w-full justify-center relative group"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span 
                          className={`font-black text-white tracking-tight leading-[1.1] mb-0.5 transition-all ${
                            ((activeCompany?.name || sysSettings.companyName)?.length || 0) > 20 ? 'text-[11px]' : 
                            'text-sm'
                          } line-clamp-1`}
                          title={activeCompany?.name || sysSettings.companyName}
                        >
                          {activeCompany?.name || sysSettings.companyName}
                        </span>
                        {companies.length === 0 && (
                          <span className={`uppercase font-bold text-white/65 tracking-widest ${
                            (sysSettings.companySub?.length || 0) > 30 ? 'text-[6px]' : 
                            'text-[8px]'
                          } truncate`}>
                            {sysSettings.companySub}
                          </span>
                        )}
                      </div>
                      
                      {companies.length > 0 && (
                        <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white shrink-0 transition-colors" />
                      )}
                    </div>

                    {/* Hidden interactive select */}
                    {companies.length > 0 && (
                      <select
                        value={activeCompanyId || ''}
                        onChange={(e) => {
                          setActiveCompanyId(e.target.value);
                          // Reload to ensure all components isolate with the new company ID
                          setTimeout(() => {
                            window.location.reload();
                          }, 100);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ appearance: 'none' }}
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>
                        ))}
                      </select>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            <nav className="flex-1 overflow-visible py-4 no-scrollbar">
              {menuGroups.map((group) => {
                const visibleItems = group.items.filter((item) =>
                  item.roles.includes(profile?.role || "employee") || profile?.role === "owner"
                );
                if (visibleItems.length === 0) return null;
                const showFull = !isSidebarCollapsed;

                return (
                  <div key={group.id} className="mb-2">
                    <motion.div
                      animate={{
                        height: "auto",
                        opacity: 1,
                      }}
                      className="overflow-visible space-y-1"
                    >
                      {visibleItems.map((item) => {
                        const currentItem = { ...item };
                        
                        const rawSubItems = item.subItems && item.subItems.length > 0;
                        const allowedSubItems = rawSubItems
                          ? item.subItems.filter((s: any) => s.roles.includes(profile?.role || "employee") || profile?.role === "owner")
                          : [];
                          
                        if (rawSubItems && allowedSubItems.length === 0) return null;
                        
                        // If it has sub-items but only ONE sub-item is allowed for this role, display it directly as flat item!
                        if (rawSubItems && allowedSubItems.length === 1) {
                          currentItem.id = allowedSubItems[0].id;
                          currentItem.label = allowedSubItems[0].label;
                          currentItem.subItems = undefined;
                        }
                        
                        const hasSubItems = currentItem.subItems && currentItem.subItems.length > 0;
                        
                        const isSubActive = hasSubItems && allowedSubItems.some((s: any) => activeTab === s.id);
                        const isHovered = hoveredSubMenuId === currentItem.id;
                        const styleItem = getSidebarItemClasses(isSubActive);
                        
                        if (hasSubItems) {
                          return (
                            <div 
                              key={currentItem.id} 
                              className="relative"
                              onMouseEnter={() => setHoveredSubMenuId(currentItem.id)}
                              onMouseLeave={() => setHoveredSubMenuId(null)}
                            >
                              <button
                                onClick={() => {
                                  if (allowedSubItems.length > 0) {
                                    setActiveTab(allowedSubItems[0].id);
                                  }
                                }}
                                className={`flex items-center justify-between transition-all group rounded-xl w-[calc(100%-20px)] ${
                                  !showFull ? "w-12 h-12 mx-auto justify-center" : "mx-2.5 px-3 py-2"
                                } ${styleItem.button}`}
                              >
                                <div className="flex items-center gap-3">
                                  <currentItem.icon
                                    className={`shrink-0 transition-colors ${
                                      !showFull ? "w-6 h-6" : "w-4 h-4"
                                    } ${styleItem.icon}`}
                                  />
                                  {showFull && (
                                    <span className="text-xs font-bold truncate">
                                      {currentItem.label}
                                    </span>
                                  )}
                                </div>
                                
                                {showFull && (
                                  <ChevronDown 
                                    className={`w-3.5 h-3.5 opacity-55 transition-transform -rotate-90 group-hover:translate-x-[-2px]`} 
                                  />
                                )}
                              </button>
                              
                              {/* Windows 11 / CAD Software Style Flyout Submenu */}
                              {isHovered && (
                                <div 
                                  className="absolute right-[calc(100%-4px)] top-0 mr-2 z-50 w-48 bg-white dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/85 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-2 flex flex-col gap-1 text-right animate-in fade-in slide-in-from-right-2 duration-150"
                                  onMouseEnter={() => setHoveredSubMenuId(currentItem.id)}
                                  onMouseLeave={() => setHoveredSubMenuId(null)}
                                >
                                  <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800/40 mb-1 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 select-none">
                                      {currentItem.label}
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 -rotate-90" />
                                  </div>
                                  
                                  {allowedSubItems.map((sub: any) => (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        setActiveTab(sub.id);
                                        setHoveredSubMenuId(null);
                                        if (window.innerWidth < 1024)
                                          setIsSidebarOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right relative text-xs font-semibold transition-all ${
                                        activeTab === sub.id
                                          ? "bg-slate-500/10 dark:bg-zinc-800/60 font-extrabold"
                                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/5"
                                      }`}
                                      style={activeTab === sub.id ? { color: "var(--primary)" } : {}}
                                    >
                                      {activeTab === sub.id && (
                                        <div className="absolute right-1 top-2.5 bottom-2.5 w-1 rounded-full bg-current" style={{ backgroundColor: "var(--primary)" }} />
                                      )}
                                      <span>{sub.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        const itemStyle = getSidebarItemClasses(activeTab === currentItem.id);
                        return (
                          <button
                            key={currentItem.id}
                            onClick={() => {
                              setActiveTab(currentItem.id);
                              if (window.innerWidth < 1024)
                                setIsSidebarOpen(false);
                            }}
                            onMouseEnter={() => {
                              setHoveredSubMenuId(null);
                            }}
                            className={`flex items-center gap-3 transition-all group relative rounded-xl ${
                              !showFull
                                ? "w-12 h-12 mx-auto justify-center"
                                : "mx-2.5 px-3 py-2"
                            } ${itemStyle.button}`}
                          >
                            {activeTab === currentItem.id && showFull && (
                              <motion.div
                                layoutId="activeTabIndicator"
                                className={`absolute right-0 top-0 bottom-0 w-1 rounded-full ${itemStyle.indicator}`}
                              />
                            )}
                            <currentItem.icon
                              className={`shrink-0 transition-colors ${
                                !showFull ? "w-6 h-6" : "w-4 h-4"
                              } ${itemStyle.icon}`}
                            />
                            {showFull && (
                              <span className="text-xs font-bold truncate">
                                {currentItem.label}
                              </span>
                            )}
                            {currentItem.id === "notifications" && unreadCount > 0 && (
                              <span
                                className={`absolute bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-sidebar ${
                                  !showFull ? "top-2 right-2" : "left-4"
                                }`}
                              >
                                {unreadCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>

                    {!showFull && (
                      <div className="mx-4 my-2 h-[1px] bg-white/5" />
                    )}
                  </div>
                );
              })}
            </nav>

            <div
              className={`p-3 mt-auto transition-all flex flex-col gap-2 ${isSidebarCollapsed ? "items-center px-2" : ""}`}
            >
              {user?.email === "expertadvsa@gmail.com" && (() => {
                const settingsStyle = getSidebarItemClasses(activeTab === "settings");
                return (
                  <div className="relative w-full">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSettingsDropdown(!showSettingsDropdown);
                      }}
                      onMouseEnter={() => {
                        if (!isSidebarCollapsed) {
                          setExpandedSubMenus([]);
                        }
                      }}
                      className={`flex items-center gap-3 cursor-pointer active:scale-95 transition-all duration-300 rounded-xl ${
                        isSidebarCollapsed ? "w-9 h-9 justify-center mx-auto" : "px-3 py-2 w-[calc(100%-20px)] mx-2.5"
                      } ${settingsStyle.button}`}
                      title="الإعدادات"
                    >
                      <Settings className={`w-4 h-4 shrink-0 transition-colors ${settingsStyle.icon} ${
                        activeTab === "settings" ? "stroke-[2.5px]" : "stroke-[1.8px]"
                      }`} />
                      {!isSidebarCollapsed && (
                        <span className="text-xs font-bold truncate">
                          الإعدادات
                        </span>
                      )}
                    </div>

                    {/* Settings Dropdown Popover */}
                    {showSettingsDropdown && (
                      <div 
                        className="absolute bottom-0 right-full mr-3 z-50 w-[230px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_-5px_rgba(0,0,0,0.5)] p-2 text-right flex flex-col gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-zinc-800/50 mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500">خيارات الإعدادات</span>
                          <Settings className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                        </div>
                        
                        {settingsCategories.map((cat) => {
                          const Icon = cat.icon;
                          const isActive = activeTab === "settings" && settingsSubTab === cat.id;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setSettingsSubTab(cat.id);
                                setActiveTab("settings");
                                setShowSettingsDropdown(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer text-right text-[11px] font-bold transition-all ${
                                isActive 
                                  ? "bg-primary text-white" 
                                  : cat.isHub 
                                    ? "text-primary dark:text-primary-foreground font-black bg-primary/10 hover:bg-primary/20"
                                    : "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/70"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl py-5 ${isSidebarCollapsed ? "px-0 justify-center" : ""}`}
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="font-bold text-sm">تسجيل الخروج</span>
                )}
              </Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500 text-white text-[10px] font-black py-1 px-4 flex items-center justify-center gap-2 z-[60] shrink-0"
            >
              <Zap className="w-3 h-3 animate-pulse" />
              <span>أنت تعمل الآن في وضع أوفلاين - قد لا تظهر بعض البيانات المحدثة</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ DESKTOP HEADER ══ */}
        <header className="hidden lg:flex h-14 bg-card/85 backdrop-blur-md border-b border-border/50 items-center justify-between px-5 shrink-0 relative z-[200]" dir="rtl">

          {/* يمين = زر القائمة + الترحيب (جانب الشريط الجانبي) */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSidebarCollapseToggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mb-0.5">مرحباً</p>
              <p className="text-sm font-black text-slate-900 leading-none">
                {profile?.role === "manager" ? "مدير النظام" : profile?.name}
              </p>
            </div>
          </div>

          {/* يسار = الإعلان + البحث + الجرس + البروفايل */}
          <div className="flex items-center gap-3">

            {/* زر البحث */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors w-48 lg:w-64"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-right">ابحث في النظام...</span>
              <div className="flex items-center gap-0.5" dir="ltr">
                <span className="bg-white rounded px-1.5 py-0.5 text-[9px] shadow-sm">Ctrl</span>
                <span className="bg-white rounded px-1.5 py-0.5 text-[9px] shadow-sm">K</span>
              </div>
            </button>

            {/* الإعلان */}
            {sysSettings.generalAnnouncement && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-2.5 py-1.5 text-[10px] font-bold max-w-[200px] hover:bg-amber-100 transition">
                    <Volume2 className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{sysSettings.generalAnnouncement}</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-sm font-black">
                      <Bell className="w-4 h-4 text-amber-500" /> إعلان الإدارة
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-slate-700 leading-relaxed bg-amber-50 rounded-xl p-4 border border-amber-100">
                    {sysSettings.generalAnnouncement}
                  </p>
                </DialogContent>
              </Dialog>
            )}

            {/* الجرس */}
            <div className="relative z-[150]">
              <button
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {renderNotificationsDropdown()}
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* البروفايل */}
            <div
              onClick={() => setActiveTab(profile?.role === "sales_rep" ? "sales_rep_profile" : "profile")}
              className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-all group active:scale-95"
            >
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 leading-tight">{profile?.name}</p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {profile?.role === "manager" ? "مدير عام" :
                   profile?.role === "supervisor" ? "مشرف" :
                   profile?.role === "sales_rep" ? "مندوب مبيعات" : "موظف"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                {(profile?.name?.[0] || user?.displayName?.[0] || "U").toUpperCase()}
              </div>
            </div>

          </div>

        </header>

        <main className="flex-1 overflow-auto bg-background pb-28 lg:pb-8">
          <GlobalNotificationListener />
            <div className="p-2 md:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "dashboard" && <DashboardBuilder goToTab={setActiveTab} />}
                {activeTab === "company_profile" && <CompanyProfile />}
                {activeTab === "analytics" && (
                  <Analytics 
                    onBack={() => setActiveTab("dashboard")} 
                    onSelectEmployee={(empId) => {
                      setActiveTab("employees");
                      setTimeout(() => setSelectedEmployeeId(empId), 0);
                    }}
                  />
                )}
                {activeTab === "profile" && (
                  <EmployeeProfile
                    employeeId={profile?.id || user.uid}
                    onBack={() => setActiveTab("dashboard")}
                  />
                )}
                {activeTab === "sales_rep_profile" && (
                  <SalesRepProfile
                    salesRepId={profile?.id || user.uid}
                    onBack={() => setActiveTab("rep_dashboard")}
                  />
                )}
                {/* Finance Group */}
                {activeTab === "financials" && <Financials />}
                {activeTab === "banking" && <BankingAndVault />}
                {activeTab === "expenses" && <Expenses />}
                {activeTab === "archive" && <Archive />}
                {activeTab === "gallery" && <Gallery />}
                {activeTab === "reports_gallery" && <ReportsGallery />}
                {activeTab === "smart_reports" && <SmartReports />}
                {activeTab === "sales" && <Sales />}
                {activeTab === "clients" && <Clients />}
                {activeTab === "invoices" && <Invoices />}
                {activeTab === "quotations" && <Quotations />}
                {activeTab === "sales_reps" && (
                  <>
                    {!selectedSalesRepId ? (
                      <SalesRepsManagement onSelectRep={setSelectedSalesRepId} />
                    ) : (
                      <SalesRepProfile
                        salesRepId={selectedSalesRepId}
                        onBack={() => setSelectedSalesRepId(null)}
                      />
                    )}
                  </>
                )}
                {activeTab === "rep_dashboard" && (
                  <SalesRepDashboard subPage="dashboard" onNavigate={setActiveTab} />
                )}
                {activeTab === "rep_smart_bot" && (
                  <SalesRepDashboard subPage="bot" onNavigate={setActiveTab} />
                )}
                {activeTab === "rep_documents" && (
                  <SalesRepDashboard subPage="documents" onNavigate={setActiveTab} />
                )}
                {activeTab === "rep_statement" && (
                  <SalesRepDashboard subPage="statement" onNavigate={setActiveTab} />
                )}
                {activeTab === "private_jobs_page" && (
                  <PrivateJobsWorkspace onNavigate={setActiveTab} />
                )}
                {activeTab === "subcontractors" && <Subcontractors />}
                
                {/* Purchases Group */}
                {activeTab === "purchases" && <Purchases />}
                {activeTab === "suppliers" && <SuppliersList />}
                
                {/* Inventory Group */}
                {activeTab === "inventory" && <Inventory />}
                {activeTab === "production" && <Production />}
                {activeTab === "assets" && <AssetsManagement />}
                
                {/* Employees Group */}
                {activeTab === "employees" && (
                  <>
                    {!selectedEmployeeId ? (
                      <Employees onSelectEmployee={setSelectedEmployeeId} />
                    ) : (
                      <EmployeeProfile
                        employeeId={selectedEmployeeId}
                        onBack={() => setSelectedEmployeeId(null)}
                      />
                    )}
                  </>
                )}
                {activeTab === "workers_management" && <WorkersManagement />}
                {activeTab === "projects" && <ProjectsV2 viewModeType="projects" />}
                {activeTab === "tasks" && <ProjectsV2 viewModeType="tasks" />}
                {activeTab === "payrolls" && <Payrolls />}
                {activeTab === "approvals" && <ApprovalCenter />}
                {activeTab === "evaluation" && <PerformanceEvaluation />}
                {activeTab === "notifications" && <Notifications />}
                {activeTab === "camera" && <CameraCapture />}
                {activeTab === "briefing" && <ExecutiveBriefingSystem goToTab={setActiveTab} />}
                {activeTab === "command_center" && <CommandCenter />}
                {activeTab === "attendance_manager" && <AttendanceManager />}
                {activeTab === "settings" && user?.email === "expertadvsa@gmail.com" && <SystemSettings initialTab={settingsSubTab} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <Toaster position="bottom-center" richColors theme="light" />
      <SmartButler />

      {/* Native-style Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 z-50 px-2 pb-[env(safe-area-inset-bottom)] flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-[70px]">
        {/* Button 1: Workers */}
        <button
          onClick={() => {
            setActiveTab("workers_management");
            if ('vibrate' in navigator) navigator.vibrate(5);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all relative px-1 flex-1 min-w-0 h-[60px] -translate-y-1 ${
            activeTab === "workers_management" ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
          }`}
        >
          <Users className="w-5 h-5 transition-transform" />
          <span className="text-[9px] font-black truncate w-full text-center tracking-tighter leading-none">العمالة</span>
        </button>

        {/* Button 2: Finance */}
        <button
          onClick={() => {
            setActiveTab("financials");
            if ('vibrate' in navigator) navigator.vibrate(5);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all relative px-1 flex-1 min-w-0 h-[60px] -translate-y-1 ${
            activeTab === "financials" ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
          }`}
        >
          <Wallet className="w-5 h-5 transition-transform" />
          <span className="text-[9px] font-black truncate w-full text-center tracking-tighter leading-none">المالية</span>
        </button>

        {/* Button 3: HOME (Center) - Distinctive Styling */}
        <button
          onClick={() => {
            setActiveTab("dashboard");
            if ('vibrate' in navigator) navigator.vibrate(5);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all relative px-1 flex-1 min-w-0 h-[60px] -translate-y-1 ${
            activeTab === "dashboard" ? "text-slate-900 opacity-100" : "text-muted-foreground opacity-60"
          }`}
        >
          <div className={`p-2.5 rounded-2xl transition-all shadow-lg shadow-primary/20 ${activeTab === 'dashboard' ? 'bg-primary text-white scale-110' : 'bg-primary/5 text-primary opacity-80'}`}>
            <LayoutDashboard className="w-6 h-6 transition-transform" />
          </div>
          <span className="text-[9px] font-black truncate w-full text-center tracking-tighter leading-none mt-0.5">الرئيسية</span>
        </button>

        {/* Button 4: Field (Scan) */}
        <button
          onClick={() => {
            setActiveTab("camera");
            if ('vibrate' in navigator) navigator.vibrate([10, 30, 10]);
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-all relative px-1 flex-1 min-w-0 h-[60px] -translate-y-1 ${
            activeTab === 'camera' ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
          }`}
        >
          <Scan className="w-5 h-5 transition-transform" />
          <span className="text-[9px] font-black truncate w-full text-center tracking-tighter leading-none">ميداني</span>
        </button>

        {/* Button 5: More (Right) */}
        <button
          onClick={() => {
            setIsSidebarOpen(true);
            if ('vibrate' in navigator) navigator.vibrate(5);
          }}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground opacity-50 px-1 flex-1 min-w-0 h-[60px] -translate-y-1"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-black truncate w-full text-center tracking-tighter leading-none">المزيد</span>
        </button>
      </div>
      {showWelcomeScreen && (
        <WelcomeOverlay 
          user={user} 
          profile={profile} 
          sysSettings={sysSettings} 
          onComplete={() => setShowWelcomeScreen(false)} 
        />
      )}

      {/* Windows 11 Style Context Menu / Smart Input Clipboard */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x 
            }}
            className="fixed z-[9999] w-[210px] rounded-xl border border-slate-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-xl shadow-[0_10px_35px_-5px_rgba(0,0,0,0.2)] p-1 text-slate-800 dark:text-zinc-200 select-none transition-shadow"
            dir="rtl"
          >
            {activeInput.element ? (
              <>
                {/* Header */}
                <div className="px-2.5 py-1.5 text-[10px] font-black text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary-foreground rounded-t-lg mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse shrink-0" />
                  <span className="truncate">حافظة المدخلات: {activeInput.key}</span>
                </div>

                {/* Smart Autocomplete Suggestions */}
                {getSmartSuggestions(activeInput.key).map((suggestion, idx) => (
                  <button
                    key={`smart-${idx}`}
                    onClick={() => {
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      if (activeInput.element) {
                        activeInput.element.value = suggestion;
                        const event = new Event('input', { bubbles: true });
                        activeInput.element.dispatchEvent(event);
                        toast.success(`تم إدخال: ${suggestion}`);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/10 dark:hover:bg-primary/30 text-primary dark:text-primary-foreground rounded-lg cursor-pointer text-right text-[11px] font-black"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">اقتراح تلقائي: {suggestion}</span>
                  </button>
                ))}

                {getSmartSuggestions(activeInput.key).length > 0 && (
                  <div className="h-[1px] bg-slate-100 dark:bg-zinc-800/50 my-1 mx-1" />
                )}

                {/* History Section */}
                <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground/60">
                  المدخلات السابقة المحفوظة:
                </div>

                {activeInput.history.length > 0 ? (
                  activeInput.history.map((val, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setContextMenu(prev => ({ ...prev, visible: false }));
                        if (activeInput.element) {
                          activeInput.element.value = val;
                          const event = new Event('input', { bubbles: true });
                          activeInput.element.dispatchEvent(event);
                          toast.success("تم تعبئة القيمة السابقة");
                        }
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-medium"
                    >
                      <span className="truncate max-w-[150px] font-mono">{val}</span>
                      <span className="text-[9px] text-muted-foreground/40 font-mono">#{idx + 1}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-[10px] text-muted-foreground/70 italic text-center">
                    لا توجد مدخلات سابقة مسجلة
                  </div>
                )}

                <div className="h-[1px] bg-slate-100 dark:bg-zinc-800/50 my-1 mx-1" />

                {/* Paste Action */}
                <button
                  onClick={async () => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    try {
                      const text = await navigator.clipboard.readText();
                      if (activeInput.element) {
                        activeInput.element.value = text;
                        const event = new Event('input', { bubbles: true });
                        activeInput.element.dispatchEvent(event);
                        toast.success("تم لصق النص");
                      }
                    } catch (err) {
                      toast.error("يرجى تفعيل صلاحية اللصق في المتصفح");
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>لصق من الحافظة</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Ctrl + V</span>
                </button>

                {/* Copy Action */}
                <button
                  disabled={!activeInput.element?.value}
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    if (activeInput.element?.value) {
                      navigator.clipboard.writeText(activeInput.element.value);
                      toast.success("تم نسخ النص");
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right disabled:opacity-40 disabled:cursor-not-allowed group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>نسخ النص الحالي</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Ctrl + C</span>
                </button>

                {/* Clear Action */}
                <button
                  disabled={!activeInput.element?.value}
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    if (activeInput.element) {
                      activeInput.element.value = "";
                      const event = new Event('input', { bubbles: true });
                      activeInput.element.dispatchEvent(event);
                      toast.info("تم تفريغ الحقل");
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors text-right text-red-500 hover:text-red-655 disabled:opacity-40 disabled:cursor-not-allowed group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 rotate-90 text-red-400 group-hover:text-red-500 transition-colors" />
                    <span>مسح محتوى الحقل</span>
                  </div>
                  <span className="text-[9px] text-red-450/50 font-mono tracking-tighter">Del</span>
                </button>
              </>
            ) : (
              <>
                {/* 1. Back */}
                <button
                  disabled={tabHistory.length <= 1}
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    if (tabHistory.length > 1) {
                      const newHistory = [...tabHistory];
                      newHistory.pop(); // Remove current
                      const prevTab = newHistory.pop(); // Get previous
                      if (prevTab) {
                        setTabHistory(newHistory);
                        setActiveTab(prevTab);
                        toast.info("تم الرجوع للخلف");
                      }
                    }
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right disabled:opacity-40 disabled:cursor-not-allowed group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>رجوع للخلف</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Alt + ←</span>
                </button>

                {/* 2. Refresh */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    toast.loading("جاري تحديث النظام...");
                    setTimeout(() => {
                      window.location.reload();
                    }, 400);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>تحديث الصفحة</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">F5</span>
                </button>

                <div className="h-[1px] bg-slate-100 dark:bg-zinc-800/50 my-1 mx-1" />

                {/* 3. Dashboard */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    setActiveTab(profile?.role === "sales_rep" ? "rep_dashboard" : "dashboard");
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>الرئيسية</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Alt + H</span>
                </button>

                {/* 4. Profile */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    setActiveTab(profile?.role === "sales_rep" ? "sales_rep_profile" : "profile");
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>الملف الشخصي</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Alt + P</span>
                </button>

                {/* 5. Settings */}
                {profile?.role === "manager" && (
                  <button
                    onClick={() => {
                      setContextMenu(prev => ({ ...prev, visible: false }));
                      setActiveTab("settings");
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span>الإعدادات</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Alt + S</span>
                  </button>
                )}

                <div className="h-[1px] bg-slate-100 dark:bg-zinc-800/50 my-1 mx-1" />

                {/* 6. Toggle Theme */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    const root = document.documentElement;
                    const nextDark = !root.classList.contains("dark");
                    toggleThemeMode(nextDark);
                    toast.success(nextDark ? "تم تفعيل المظهر الداكن" : "تم تفعيل المظهر المضيء");
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 dark:hidden text-muted-foreground group-hover:text-primary transition-colors" />
                    <Sun className="w-3.5 h-3.5 hidden dark:block text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>تغيير المظهر</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Alt + T</span>
                </button>

                {/* 7. Copy URL */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("تم نسخ رابط الصفحة بنجاح!");
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-100/80 dark:hover:bg-zinc-800/70 rounded-lg cursor-pointer transition-colors text-right group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>نسخ الرابط</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 font-mono tracking-tighter">Ctrl + C</span>
                </button>

                <div className="h-[1px] bg-slate-100 dark:bg-zinc-800/50 my-1 mx-1" />

                {/* 8. Logout */}
                <button
                  onClick={() => {
                    setContextMenu(prev => ({ ...prev, visible: false }));
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors text-right text-red-500 hover:text-red-650 group text-[11px] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 text-red-400 group-hover:text-red-500 transition-colors" />
                    <span>تسجيل الخروج</span>
                  </div>
                  <span className="text-[9px] text-red-450/70 font-mono tracking-tighter">Alt + L</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalSearch 
        isOpen={isGlobalSearchOpen} 
        onClose={() => setIsGlobalSearchOpen(false)} 
        onNavigate={setActiveTab} 
      />
    </div>
  );
}

export default function App() {
  const isClientPortal = new URLSearchParams(window.location.search).get('clientPortal');

  if (isClientPortal) {
    return <ClientPortal />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

