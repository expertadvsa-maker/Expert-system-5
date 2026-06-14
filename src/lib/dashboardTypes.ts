// All TypeScript types for the dashboard customization system

export type WidgetType =
  // Financial
  | 'stat_income'
  | 'stat_expenses'
  | 'stat_profit'
  | 'stat_pending'
  | 'stat_tax_income'
  | 'stat_tax_purchases'
  | 'financial_summary'
  | 'chart_weekly'
  | 'list_transactions'
  // Operations
  | 'stat_workers'
  | 'stat_projects'
  | 'stat_team'
  | 'stat_purchases'
  | 'ops_summary'
  | 'attendance_today'
  // Smart
  | 'ai_insight'
  | 'voice_briefing'
  | 'sticky_note'
  // Action
  | 'quick_actions'
  | 'list_tasks'
  | 'alerts_panel'
  | 'announcement'
  | 'calendar_events'
  | 'btn_create_invoice'
  | 'btn_create_quote'
  | 'btn_manage_clients'
  | 'btn_manage_reps';

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type ColorScheme =
  | 'slate' | 'emerald' | 'blue' | 'indigo' | 'violet'
  | 'rose' | 'amber' | 'teal' | 'cyan' | 'orange';

export interface WidgetInstance {
  id: string;              // unique uuid
  type: WidgetType;        // widget type
  order: number;           // position (0-based)
  size: WidgetSize;        // grid size
  colorScheme: ColorScheme;
  customTitle?: string;    // override default title
  displayMode?: string;    // 'card' | 'chart' | 'table'
  cardStyle?: 'default' | 'glass' | 'neon' | 'gradient';
  alertThreshold?: number; // smart alert threshold
  settings?: Record<string, any>;
}

export interface DashboardConfig {
  version: number;
  widgets: WidgetInstance[];
  lastUpdated: string;
}

export interface WidgetMeta {
  type: WidgetType;
  nameAr: string;
  descriptionAr: string;
  icon: string;            // lucide icon name
  category: 'financial' | 'operations' | 'smart' | 'actions';
  defaultSize: WidgetSize;
  availableSizes: WidgetSize[];
  requiredRole: 'owner' | 'elevated' | 'all';
  defaultColorScheme: ColorScheme;
}
