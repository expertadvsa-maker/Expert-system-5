import type { WidgetMeta, WidgetInstance, ColorScheme } from './dashboardTypes';

export const WIDGET_REGISTRY: WidgetMeta[] = [
  // ── Financial ──
  {
    type: 'stat_income', nameAr: 'الدخل الإجمالي', descriptionAr: 'إجمالي الإيرادات خلال 90 يوم مع مؤشر دائري',
    icon: 'TrendingUp', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'emerald'
  },
  {
    type: 'stat_expenses', nameAr: 'المصروفات', descriptionAr: 'إجمالي المصروفات مع نسبة من الدخل',
    icon: 'TrendingDown', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'rose'
  },
  {
    type: 'stat_profit', nameAr: 'صافي الربح', descriptionAr: 'الربح الصافي وهامش الربح',
    icon: 'Wallet', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'indigo'
  },
  {
    type: 'stat_pending', nameAr: 'طلبات معلقة', descriptionAr: 'عدد طلبات الشراء التي تنتظر الموافقة',
    icon: 'Clock', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'amber'
  },
  {
    type: 'stat_tax_income', nameAr: 'ضريبة الدخل والزكاة', descriptionAr: 'الضريبة المستحقة للدولة بالرياض (مخرجات/زكاة/أرباح)',
    icon: 'Building2', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'slate'
  },
  {
    type: 'stat_tax_purchases', nameAr: 'ضريبة المشتريات المجمعة', descriptionAr: 'ضريبة المدخلات من فواتير المشتريات الممسوحة والمضافة',
    icon: 'CreditCard', category: 'financial', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'blue'
  },
  {
    type: 'financial_summary', nameAr: 'الملخص المالي الكامل', descriptionAr: 'جميع البطاقات المالية الأربع في صف واحد',
    icon: 'BarChart2', category: 'financial', defaultSize: 'xl', availableSizes: ['xl', 'xxl'], requiredRole: 'owner', defaultColorScheme: 'slate'
  },
  {
    type: 'chart_weekly', nameAr: 'الرسم البياني الأسبوعي', descriptionAr: 'مخطط الأداء خلال الأسبوع',
    icon: 'AreaChart', category: 'financial', defaultSize: 'xl', availableSizes: ['md', 'lg', 'xl', 'xxl'], requiredRole: 'owner', defaultColorScheme: 'blue'
  },
  {
    type: 'list_transactions', nameAr: 'آخر المعاملات', descriptionAr: 'أحدث العمليات المالية المسجّلة',
    icon: 'Receipt', category: 'financial', defaultSize: 'lg', availableSizes: ['md', 'lg', 'xl'], requiredRole: 'owner', defaultColorScheme: 'slate'
  },
  // ── Operations ──
  {
    type: 'stat_workers', nameAr: 'عمال اليومية', descriptionAr: 'عدد العمال مع نسبة حضور اليوم',
    icon: 'HardHat', category: 'operations', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'emerald'
  },
  {
    type: 'stat_projects', nameAr: 'المشاريع النشطة', descriptionAr: 'عدد المشاريع قيد التنفيذ',
    icon: 'Building2', category: 'operations', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'blue'
  },
  {
    type: 'stat_team', nameAr: 'الفريق', descriptionAr: 'عدد الموظفين مع نسبة الحضور',
    icon: 'Users', category: 'operations', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'slate'
  },
  {
    type: 'stat_purchases', nameAr: 'إجمالي المشتريات', descriptionAr: 'مجموع المشتريات خلال 90 يوم',
    icon: 'ShoppingBag', category: 'operations', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'orange'
  },
  {
    type: 'ops_summary', nameAr: 'الملخص التشغيلي الكامل', descriptionAr: 'جميع البطاقات التشغيلية الأربع في صف',
    icon: 'Layers', category: 'operations', defaultSize: 'xl', availableSizes: ['xl', 'xxl'], requiredRole: 'elevated', defaultColorScheme: 'slate'
  },
  {
    type: 'attendance_today', nameAr: 'حضور اليوم', descriptionAr: 'قائمة العمال الحاضرين اليوم',
    icon: 'UserCheck', category: 'operations', defaultSize: 'lg', availableSizes: ['md', 'lg', 'xl'], requiredRole: 'elevated', defaultColorScheme: 'teal'
  },
  // ── Smart ──
  {
    type: 'ai_insight', nameAr: 'المستشار الذكي (AI)', descriptionAr: 'تحليل ذكي للمصروفات والأداء',
    icon: 'Sparkles', category: 'smart', defaultSize: 'md', availableSizes: ['md', 'lg'], requiredRole: 'owner', defaultColorScheme: 'violet'
  },
  {
    type: 'voice_briefing', nameAr: 'الموجز الصوتي', descriptionAr: 'استمع للتقرير الصوتي الذكي',
    icon: 'Volume2', category: 'smart', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'rose'
  },
  // ── Actions ──
  {
    type: 'quick_actions', nameAr: 'الوصول السريع', descriptionAr: 'أزرار التنقل السريع لأقسام المنصة',
    icon: 'Zap', category: 'actions', defaultSize: 'xl', availableSizes: ['md', 'lg', 'xl'], requiredRole: 'all', defaultColorScheme: 'slate'
  },
  {
    type: 'list_tasks', nameAr: 'المهام والعمليات', descriptionAr: 'قائمة المهام التشغيلية المشتركة',
    icon: 'ListTodo', category: 'actions', defaultSize: 'lg', availableSizes: ['lg', 'xl', 'xxl'], requiredRole: 'all', defaultColorScheme: 'indigo'
  },
  {
    type: 'alerts_panel', nameAr: 'التنبيهات والتحذيرات', descriptionAr: 'تنبيهات النظام التي تحتاج انتباهك',
    icon: 'AlertTriangle', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'amber'
  },
  {
    type: 'announcement', nameAr: 'إعلان الإدارة', descriptionAr: 'الإعلان العام من إدارة الشركة',
    icon: 'Bell', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'all', defaultColorScheme: 'amber'
  },
  {
    type: 'calendar_events', nameAr: 'تقويم الأعمال والمؤشرات', descriptionAr: 'تقويم شهري ديناميكي يعرض مواعيد المشاريع والمهام المعلقة',
    icon: 'Calendar', category: 'actions', defaultSize: 'lg', availableSizes: ['md', 'lg', 'xl'], requiredRole: 'all', defaultColorScheme: 'indigo'
  },
  {
    type: 'btn_create_invoice', nameAr: 'إنشاء فاتورة', descriptionAr: 'اختصار سريع للذهاب لصفحة الفواتير وإنشائها',
    icon: 'Receipt', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'emerald'
  },
  {
    type: 'btn_create_quote', nameAr: 'إنشاء عرض سعر', descriptionAr: 'اختصار سريع للذهاب لصفحة عروض الأسعار وتسعير بالذكاء الاصطناعي',
    icon: 'FileText', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'blue'
  },
  {
    type: 'btn_manage_clients', nameAr: 'إدارة العملاء', descriptionAr: 'اختصار للذهاب لسجل العملاء الشامل',
    icon: 'Users', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'elevated', defaultColorScheme: 'slate'
  },
  {
    type: 'btn_manage_reps', nameAr: 'إدارة المناديب', descriptionAr: 'اختصار للذهاب لإدارة مناديب المبيعات',
    icon: 'Briefcase', category: 'actions', defaultSize: 'sm', availableSizes: ['sm', 'md'], requiredRole: 'owner', defaultColorScheme: 'amber'
  },
];

export const COLOR_SCHEMES: Record<string, { bg: string; ring: string; icon: string; border: string; text: string; light: string }> = {
  slate:   { bg: 'bg-slate-900',   ring: '#64748b', icon: 'text-slate-400',   border: 'border-slate-700', text: 'text-white',   light: 'bg-slate-100' },
  emerald: { bg: 'bg-emerald-600', ring: '#10b981', icon: 'text-emerald-100', border: 'border-emerald-500', text: 'text-white',   light: 'bg-emerald-50' },
  blue:    { bg: 'bg-blue-600',    ring: '#3b82f6', icon: 'text-blue-100',    border: 'border-blue-500',   text: 'text-white',   light: 'bg-blue-50' },
  indigo:  { bg: 'bg-indigo-600',  ring: '#6366f1', icon: 'text-indigo-100',  border: 'border-indigo-500', text: 'text-white',   light: 'bg-indigo-50' },
  violet:  { bg: 'bg-violet-600',  ring: '#8b5cf6', icon: 'text-violet-100',  border: 'border-violet-500', text: 'text-white',   light: 'bg-violet-50' },
  rose:    { bg: 'bg-rose-600',    ring: '#f43f5e', icon: 'text-rose-100',    border: 'border-rose-500',   text: 'text-white',   light: 'bg-rose-50' },
  amber:   { bg: 'bg-amber-500',   ring: '#f59e0b', icon: 'text-amber-100',   border: 'border-amber-400',  text: 'text-white',   light: 'bg-amber-50' },
  teal:    { bg: 'bg-teal-600',    ring: '#14b8a6', icon: 'text-teal-100',    border: 'border-teal-500',   text: 'text-white',   light: 'bg-teal-50' },
  cyan:    { bg: 'bg-cyan-600',    ring: '#06b6d4', icon: 'text-cyan-100',    border: 'border-cyan-500',   text: 'text-white',   light: 'bg-cyan-50' },
  orange:  { bg: 'bg-orange-500',  ring: '#f97316', icon: 'text-orange-100',  border: 'border-orange-400', text: 'text-white',   light: 'bg-orange-50' },
};

export const SIZE_GRID_CLASSES: Record<string, string> = {
  sm:  'col-span-3',   // 3/12 columns
  md:  'col-span-6',   // 6/12
  lg:  'col-span-6 row-span-2',  // 6/12 tall
  xl:  'col-span-12',  // full row
  xxl: 'col-span-12 row-span-2', // full row tall
};

export const SIZE_LABELS: Record<string, string> = {
  sm: 'صغير',
  md: 'متوسط',
  lg: 'كبير',
  xl: 'عريض',
  xxl: 'ضخم',
};

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 'w1', type: 'quick_actions',     order: 0, size: 'xl',  colorScheme: 'slate',   },
  { id: 'w2', type: 'financial_summary', order: 1, size: 'xl',  colorScheme: 'slate',   },
  { id: 'w3', type: 'ops_summary',       order: 2, size: 'xl',  colorScheme: 'slate',   },
  { id: 'w4', type: 'list_tasks',        order: 3, size: 'lg',  colorScheme: 'indigo',  },
  { id: 'w5', type: 'list_transactions', order: 4, size: 'lg',  colorScheme: 'slate',   },
  { id: 'w6', type: 'chart_weekly',      order: 5, size: 'xl',  colorScheme: 'blue',    },
  { id: 'w7', type: 'ai_insight',        order: 6, size: 'md',  colorScheme: 'violet',  },
  { id: 'w8', type: 'alerts_panel',      order: 7, size: 'md',  colorScheme: 'amber',   },
];
