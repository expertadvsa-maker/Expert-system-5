import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Plus, Settings2, X, GripVertical, Zap, LayoutGrid,
  RotateCcw, Save, Eye, Edit3, ChevronDown, ChevronUp,
  Check, Palette, Maximize2, Minimize2, Sparkles,
  TrendingUp, TrendingDown, Wallet, Clock, HardHat,
  Building2, Users, ShoppingBag, Volume2, AlertTriangle, CreditCard,
  Bell, ListTodo, Receipt, AreaChart, UserCheck, Layers,
  BarChart2, Loader2, Pause, CheckCircle, Briefcase,
  ShoppingCart, Package, Search, ArrowRight, Star, Wand2,
  Archive, Camera, Calendar, Lock, Unlock, Undo, Redo, UserPlus
} from 'lucide-react';
import {
  collection, query, limit, onSnapshot, orderBy, where,
  getDocs, doc, addDoc, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { toast as sonnerToast } from 'sonner';
import {
  AreaChart as ReAreaChart, Area, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar
} from 'recharts';
import { analyzeProjectSpending, askGeminiAdvisor } from '../lib/gemini';
import { sendNotification } from '../lib/notifications';

import type { WidgetInstance, WidgetSize, ColorScheme, WidgetType } from '../lib/dashboardTypes';
import {
  WIDGET_REGISTRY, COLOR_SCHEMES, SIZE_GRID_CLASSES,
  SIZE_LABELS, DEFAULT_LAYOUT, generateId
} from '../lib/widgetRegistry';
import {
  loadDashboardConfig, saveDashboardConfig, getDefaultConfig
} from '../lib/dashboardConfig';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { createAliphiaClient } from '../lib/aliphia';

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function fmtNum(n: number): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
function fmtDate(d: Date): string {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء النور';
  return 'مساء الخير';
}
function todayAr() {
  return new Date().toLocaleDateString('ar-SA', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

/* ═══════════════════════════════════════════════
   CIRCULAR RING (reused from Dashboard)
═══════════════════════════════════════════════ */
function CircleRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  const cx = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#f1f5f9" strokeWidth={5} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   COLOR SCHEME PICKER
═══════════════════════════════════════════════ */
const SCHEME_COLORS: Record<ColorScheme, string> = {
  slate: '#64748b', emerald: '#10b981', blue: '#3b82f6', indigo: '#6366f1',
  violet: '#8b5cf6', rose: '#f43f5e', amber: '#f59e0b', teal: '#14b8a6',
  cyan: '#06b6d4', orange: '#f97316',
};

function ColorPicker({ value, onChange }: { value: ColorScheme; onChange: (c: ColorScheme) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.entries(SCHEME_COLORS) as [ColorScheme, string][]).map(([key, hex]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`w-6 h-6 rounded-full border-2 transition-all ${value === key ? 'border-slate-900 scale-125' : 'border-transparent hover:scale-110'}`}
          style={{ backgroundColor: hex }}
          title={key}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   WIDGET SETTINGS MINI-PANEL
═══════════════════════════════════════════════ */
function WidgetSettingsPanel({
  widget, meta, onUpdate, onClose, onRemove
}: {
  widget: WidgetInstance;
  meta: typeof WIDGET_REGISTRY[0];
  onUpdate: (updates: Partial<WidgetInstance>) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [title, setTitle] = useState(widget.customTitle || '');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      className="absolute top-full left-0 z-50 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 space-y-4"
      dir="rtl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-900">إعدادات الودجت</p>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
          <X className="w-3 h-3 text-slate-600" />
        </button>
      </div>

      {/* Custom Title */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">عنوان مخصص</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => onUpdate({ customTitle: title || undefined })}
          placeholder={meta.nameAr}
          className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
        />
      </div>

      {/* Size */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">الحجم</label>
        <div className="grid grid-cols-5 gap-1">
          {meta.availableSizes.map(s => (
            <button
              key={s}
              onClick={() => onUpdate({ size: s })}
              className={`py-1 rounded-lg text-[9px] font-black transition ${widget.size === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">اللون</label>
        <ColorPicker value={widget.colorScheme} onChange={c => onUpdate({ colorScheme: c })} />
      </div>

      {/* Card Style Selector */}
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">نمط المظهر</label>
        <div className="grid grid-cols-4 gap-1">
          {([
            { id: 'default', label: 'افتراضي' },
            { id: 'glass', label: 'زجاجي' },
            { id: 'neon', label: 'نيون' },
            { id: 'gradient', label: 'تدرج' }
          ] as const).map(style => (
            <button
              key={style.id}
              onClick={() => onUpdate({ cardStyle: style.id })}
              className={`py-1 rounded-lg text-[9px] font-black transition ${widget.cardStyle === style.id || (!widget.cardStyle && style.id === 'default') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Smart Threshold Alert */}
      {(meta.category === 'financial' || meta.category === 'operations') && widget.type.startsWith('stat_') && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">حد التنبيه الذكي ⚠️</label>
          <input
            type="number"
            value={widget.alertThreshold !== undefined ? widget.alertThreshold : ''}
            onChange={e => {
              const val = e.target.value ? parseFloat(e.target.value) : undefined;
              onUpdate({ alertThreshold: val });
            }}
            placeholder="مثال: 50000"
            className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
          />
        </div>
      )}

      {/* Contextual Widget Settings */}
      {meta.type === 'chart_weekly' && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">نوع المخطط البياني</label>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { id: 'area', label: 'مساحي Area' },
              { id: 'bar', label: 'أعمدة Bar' }
            ] as const).map(type => (
              <button
                key={type.id}
                onClick={() => onUpdate({ settings: { ...widget.settings, chartType: type.id } })}
                className={`py-1 rounded-lg text-[9px] font-black transition ${widget.settings?.chartType === type.id || (!widget.settings?.chartType && type.id === 'area') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(meta.type === 'list_transactions' || meta.type === 'list_tasks' || meta.type === 'attendance_today') && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">الحد الأقصى للعناصر</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([3, 5, 10] as const).map(limit => (
              <button
                key={limit}
                onClick={() => onUpdate({ settings: { ...widget.settings, itemLimit: limit } })}
                className={`py-1 rounded-lg text-[9px] font-black transition ${widget.settings?.itemLimit === limit || (!widget.settings?.itemLimit && limit === 5) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {limit} عناصر
              </button>
            ))}
          </div>
        </div>
      )}

      {meta.type === 'quick_actions' && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">تخصيص محتويات الوصول السريع</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
            {[
              { id: 'briefing', label: 'الموجز الصوتي 🎙️' },
              { id: 'workers_management', label: 'العمالة اليومية 👷‍♂️' },
              { id: 'camera', label: 'الماسح الذكي 📷' },
              { id: 'attendance_manager', label: 'حضور اليوم ⏱️' },
              { id: 'purchases', label: 'المشتريات والفواتير 🛒' },
              { id: 'projects', label: 'المشاريع النشطة 🏗️' },
              { id: 'financials', label: 'الحسابات والمالية 💰' },
              { id: 'banking', label: 'البنوك والخزينة 🏦' },
              { id: 'expenses', label: 'المصروفات العامة 📉' },
              { id: 'sales', label: 'المبيعات والعقود 📈' },
              { id: 'inventory', label: 'المستودع والمخازن 📦' },
              { id: 'production', label: 'خطوط الإنتاج 🏭' },
              { id: 'employees', label: 'شؤون الموظفين 👥' },
              { id: 'subcontractors', label: 'مقاولي الباطن 🤝' },
              { id: 'payrolls', label: 'الرواتب والأجور 💵' },
              { id: 'approvals', label: 'مركز الاعتمادات ✍️' },
              { id: 'archive', label: 'الأرشيف والمستندات 📁' },
              { id: 'assets', label: 'إدارة الأصول 🚜' },
              { id: 'evaluation', label: 'تقييم الأداء ⭐' },
              { id: 'suppliers', label: 'قائمة الموردين 🚚' },
              { id: 'settings', label: 'إعدادات النظام ⚙️' }
            ].map(act => {
              const enabledActions = widget.settings?.enabledActions || [
                'briefing', 'workers_management', 'camera', 'attendance_manager', 'purchases', 'projects', 'financials'
              ];
              const isChecked = enabledActions.includes(act.id);
              return (
                <label key={act.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-100/50 rounded px-1 transition text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked 
                        ? enabledActions.filter((x: string) => x !== act.id)
                        : [...enabledActions, act.id];
                      onUpdate({ settings: { ...widget.settings, enabledActions: next } });
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>{act.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {meta.type === 'financial_summary' && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">تخصيص بطاقات الملخص المالي</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
            {[
              { id: 'stat_income', label: 'الإيرادات' },
              { id: 'stat_expenses', label: 'المصروفات' },
              { id: 'stat_profit', label: 'صافي الربح' },
              { id: 'stat_pending', label: 'طلبات معلقة' },
              { id: 'stat_tax_income', label: 'ضريبة الدخل والزكاة' },
              { id: 'stat_tax_purchases', label: 'ضريبة المشتريات' }
            ].map(card => {
              const enabledCards = widget.settings?.enabledCards || [
                'stat_income', 'stat_expenses', 'stat_profit', 'stat_pending'
              ];
              const isChecked = enabledCards.includes(card.id);
              return (
                <label key={card.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-100/50 rounded px-1 transition text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked 
                        ? enabledCards.filter((x: string) => x !== card.id)
                        : [...enabledCards, card.id];
                      onUpdate({ settings: { ...widget.settings, enabledCards: next } });
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>{card.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {meta.type === 'ops_summary' && (
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">تخصيص بطاقات التشغيل</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-100">
            {[
              { id: 'stat_workers', label: 'عمال اليومية' },
              { id: 'stat_projects', label: 'المشاريع النشطة' },
              { id: 'stat_team', label: 'الفريق' },
              { id: 'stat_purchases', label: 'إجمالي المشتريات' }
            ].map(card => {
              const enabledCards = widget.settings?.enabledCards || [
                'stat_workers', 'stat_projects', 'stat_team', 'stat_purchases'
              ];
              const isChecked = enabledCards.includes(card.id);
              return (
                <label key={card.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-slate-100/50 rounded px-1 transition text-[11px] font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked 
                        ? enabledCards.filter((x: string) => x !== card.id)
                        : [...enabledCards, card.id];
                      onUpdate({ settings: { ...widget.settings, enabledCards: next } });
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>{card.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-full py-1.5 rounded-xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-1.5"
      >
        <X className="w-3.5 h-3.5" /> إزالة من اللوحة
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   WIDGET PICKER PANEL (slides from right)
═══════════════════════════════════════════════ */
const CATEGORY_LABELS: Record<string, string> = {
  financial: '💰 المالية',
  operations: '⚙️ التشغيل',
  smart: '🤖 الذكي',
  actions: '⚡ العمليات',
};

function WidgetPickerPanel({
  onAdd, onClose, isOwner, isElevated
}: {
  onAdd: (type: string) => void;
  onClose: () => void;
  isOwner: boolean;
  isElevated: boolean;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = WIDGET_REGISTRY.filter(w => {
    if (w.requiredRole === 'owner' && !isOwner) return false;
    if (w.requiredRole === 'elevated' && !isElevated) return false;
    if (activeCategory !== 'all' && w.category !== activeCategory) return false;
    if (search && !w.nameAr.includes(search) && !w.descriptionAr.includes(search)) return false;
    return true;
  });

  const grouped = ['financial', 'operations', 'smart', 'actions'].reduce((acc, cat) => {
    const items = filtered.filter(w => w.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, typeof WIDGET_REGISTRY>);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl border-r border-slate-100 flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600">
        <div>
          <p className="text-xs font-black text-white/70 uppercase tracking-widest">مكتبة الودجتات</p>
          <h2 className="text-sm font-black text-white">اختر ما تريد إضافته</h2>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن ودجت..."
            className="w-full pr-9 pl-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:border-indigo-400 transition"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 p-2 border-b border-slate-100 overflow-x-auto">
        {(['all', 'financial', 'operations', 'smart', 'actions']).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black transition ${activeCategory === cat ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {cat === 'all' ? '🔹 الكل' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Widgets list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{CATEGORY_LABELS[cat]}</p>
            <div className="space-y-2">
              {items.map(w => (
                <button
                  key={w.type}
                  onClick={() => { onAdd(w.type); }}
                  className="w-full text-right flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-xl transition group"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm group-hover:border-indigo-300 transition">
                    <span className="text-base">{
                      w.category === 'financial' ? '💰' :
                      w.category === 'operations' ? '⚙️' :
                      w.category === 'smart' ? '🤖' : '⚡'
                    }</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 group-hover:text-indigo-700 transition">{w.nameAr}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{w.descriptionAr}</p>
                    <span className="text-[9px] font-black text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5 mt-0.5 inline-block">{SIZE_LABELS[w.defaultSize]}</span>
                  </div>
                  <Plus className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   PRESETS CONFIGURATIONS
   ═══════════════════════════════════════════════ */
const DASHBOARD_PRESETS: { id: string; nameAr: string; descriptionAr: string; widgets: WidgetInstance[] }[] = [
  {
    id: 'financial',
    nameAr: '📊 التخطيط المالي',
    descriptionAr: 'يركز على الإيرادات والمصروفات والتدفقات المالية مع الرسم البياني الأسبوعي.',
    widgets: [
      { id: 'w_fin_1', type: 'quick_actions', order: 0, size: 'xl', colorScheme: 'slate' },
      { id: 'w_fin_2', type: 'financial_summary', order: 1, size: 'xl', colorScheme: 'slate' },
      { id: 'w_fin_3', type: 'chart_weekly', order: 2, size: 'xl', colorScheme: 'blue' },
      { id: 'w_fin_4', type: 'list_transactions', order: 3, size: 'lg', colorScheme: 'slate' },
      { id: 'w_fin_5', type: 'ai_insight', order: 4, size: 'md', colorScheme: 'violet' }
    ]
  },
  {
    id: 'operations',
    nameAr: '⚙️ التخطيط التشغيلي',
    descriptionAr: 'يركز على حضور العمال والموظفين والمهام والمشاريع المفتوحة.',
    widgets: [
      { id: 'w_ops_1', type: 'quick_actions', order: 0, size: 'xl', colorScheme: 'slate' },
      { id: 'w_ops_2', type: 'ops_summary', order: 1, size: 'xl', colorScheme: 'slate' },
      { id: 'w_ops_3', type: 'attendance_today', order: 2, size: 'lg', colorScheme: 'teal' },
      { id: 'w_ops_4', type: 'list_tasks', order: 3, size: 'lg', colorScheme: 'indigo' },
      { id: 'w_ops_5', type: 'alerts_panel', order: 4, size: 'md', colorScheme: 'amber' }
    ]
  },
  {
    id: 'minimalist',
    nameAr: '🍃 التخطيط المبسّط',
    descriptionAr: 'تخطيط هادئ وموجز يظهر المستشار الذكي وأزرار الوصول السريع والتنبيهات الهامة فقط.',
    widgets: [
      { id: 'w_min_1', type: 'quick_actions', order: 0, size: 'lg', colorScheme: 'slate' },
      { id: 'w_min_2', type: 'ai_insight', order: 1, size: 'md', colorScheme: 'violet' },
      { id: 'w_min_3', type: 'alerts_panel', order: 2, size: 'sm', colorScheme: 'rose' }
    ]
  }
];

/* ═══════════════════════════════════════════════
   EMPTY STATE
═══════════════════════════════════════════════ */
function EmptyState({ onSelectPreset, onStartCustomize }: { onSelectPreset: (presetId: string) => void; onStartCustomize: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      dir="rtl"
    >
      {/* Animated grid illustration */}
      <div className="relative w-48 h-36 mb-8">
        {[0,1,2,3,4,5].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring' }}
            className={`absolute rounded-xl bg-gradient-to-br ${
              i === 0 ? 'from-indigo-500 to-violet-600 w-28 h-16 top-0 right-0' :
              i === 1 ? 'from-emerald-400 to-teal-500 w-16 h-16 top-0 left-0' :
              i === 2 ? 'from-rose-400 to-pink-500 w-20 h-14 top-20 right-8' :
              i === 3 ? 'from-amber-400 to-orange-500 w-12 h-10 bottom-0 left-0' :
              i === 4 ? 'from-blue-400 to-cyan-500 w-14 h-10 bottom-0 left-14' :
              'from-slate-400 to-slate-500 w-10 h-10 bottom-0 right-0'
            } shadow-lg`}
          />
        ))}
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-2">لوحة تحكمك فارغة</h2>
      <p className="text-sm text-slate-500 font-medium mb-8 max-w-xs leading-relaxed">
        اختر أحد التخطيطات الذكية الجاهزة للبدء فوراً، أو ابدأ بالتخصيص يدوياً
      </p>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {DASHBOARD_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
            className="text-right p-4 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-2xl transition group shadow-sm active:scale-98 cursor-pointer"
          >
            <p className="text-xs font-black text-slate-800 group-hover:text-indigo-700 transition">{preset.nameAr}</p>
            <p className="text-[10px] text-slate-500 mt-2 font-semibold leading-relaxed">{preset.descriptionAr}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onSelectPreset('default')}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg cursor-pointer"
        >
          <Wand2 className="w-4 h-4" />
          ملء تلقائي بالافتراضي
        </button>
        <button
          onClick={onStartCustomize}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/30"
        >
          <Plus className="w-4 h-4" />
          ابدأ التخصيص يدوياً
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   WIDGET WRAPPER (edit mode shell)
═══════════════════════════════════════════════ */
function WidgetShell({
  widget, isEditMode, isLocked, onUpdate, onRemove, children,
  dragHandleProps, isDragging
}: {
  widget: WidgetInstance;
  isEditMode: boolean;
  isLocked: boolean;
  onUpdate: (u: Partial<WidgetInstance>) => void;
  onRemove: () => void;
  children: React.ReactNode;
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const meta = WIDGET_REGISTRY.find(m => m.type === widget.type)!;

  const shellClass =
    widget.cardStyle === 'glass' ? 'widget-shell-glass' :
    widget.cardStyle === 'neon' ? 'widget-shell-neon' :
    widget.cardStyle === 'gradient' ? `widget-shell-gradient-${widget.colorScheme}` : '';

  return (
    <div
      className={`relative group transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''} ${shellClass}`}
      style={{ gridColumn: `span ${getColSpan(widget.size)}`, gridRow: `span ${getRowSpan(widget.size)}` }}
    >
      {/* Edit mode overlay */}
      {isEditMode && !isLocked && (
        <div className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-indigo-300 pointer-events-none" />
      )}

      {/* Edit controls */}
      {isEditMode && !isLocked && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg shadow border border-slate-200 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-50 transition"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-500" />
          </div>
          {/* Settings */}
          <button
            onClick={() => setShowSettings(p => !p)}
            className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg shadow border border-slate-200 flex items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
          </button>
          {/* Remove */}
          <button
            onClick={onRemove}
            className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg shadow border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      )}

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && !isLocked && (
          <WidgetSettingsPanel
            widget={widget}
            meta={meta}
            onUpdate={u => { onUpdate(u); }}
            onClose={() => setShowSettings(false)}
            onRemove={() => { onRemove(); setShowSettings(false); }}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div className={`h-full transition-all ${isEditMode && !isLocked ? 'pointer-events-none select-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function getColSpan(size: WidgetSize): number {
  return { sm: 3, md: 6, lg: 6, xl: 12, xxl: 12 }[size];
}
function getRowSpan(size: WidgetSize): number {
  return { sm: 1, md: 1, lg: 2, xl: 1, xxl: 2 }[size];
}

/* ═══════════════════════════════════════════════
   INDIVIDUAL WIDGET RENDERERS
═══════════════════════════════════════════════ */
interface WidgetData {
  stats: any;
  transactions: any[];
  workers: any[];
  alerts: any[];
  generalTasks: any[];
  systemProjects: any[];
  systemUsers: any[];
  systemSuppliers: any[];
  todayAttendance: number;
  totalExpenses: number;
  netBalance: number;
  profitPct: number;
  announcement: string;
  aiInsight: string | null;
  aiLoading: boolean;
  dashboardPlayback: string;
  onPlayBriefing: () => void;
  goToTab: (tab: string) => void;
  onTaskCreate: (e: React.FormEvent) => void;
  onTaskToggle: (task: any) => void;
  onTaskDelete: (id: string) => void;
  isOwner: boolean;
  isElevated: boolean;
  isManager: boolean;
  onUpdateWidget?: (id: string, updates: Partial<WidgetInstance>) => void;
}

function renderWidget(widget: WidgetInstance, data: WidgetData, fmtNum: (n: number) => string): React.ReactNode {
  const cs = COLOR_SCHEMES[widget.colorScheme] || COLOR_SCHEMES.slate;
  const title = widget.customTitle;

  switch (widget.type) {
    /* ── STAT CARDS ── */
    case 'stat_income':
      return <MiniStatCard
        label={title || 'الدخل الإجمالي'} value={data.stats.income}
        icon={TrendingUp} color={cs.ring} bgLight="bg-emerald-50" iconColor="text-emerald-600"
        ringPct={(data.stats.income + data.totalExpenses) > 0 ? Math.round((data.stats.income / (data.stats.income + data.totalExpenses)) * 100) : 0}
        sub={`${(data.stats.income + data.totalExpenses) > 0 ? Math.round((data.stats.income / (data.stats.income + data.totalExpenses)) * 100) : 0}% من التدفق`}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.income < widget.alertThreshold}
        onClick={() => data.goToTab('financials')} fmtNum={fmtNum}
        tooltip={`الدخل ${fmtNum(data.stats.income)} من إجمالي ${fmtNum(data.stats.income + data.totalExpenses)}`}
      />;
    case 'stat_tax_income': {
      const income = data.stats.income || 0;
      const tax = income * 0.15;
      return <MiniStatCard
        label={title || 'ضريبة المخرجات (15%)'} value={tax}
        icon={Building2} color={cs.ring} bgLight="bg-slate-50" iconColor="text-slate-600"
        ringPct={15} sub="من إجمالي الإيرادات"
        isThresholdAlert={widget.alertThreshold !== undefined && tax > widget.alertThreshold}
        onClick={() => data.goToTab('financials')} fmtNum={fmtNum}
        tooltip={`ضريبة القيمة المضافة المقدرة على الإيرادات: ${fmtNum(tax)} ر.س`}
      />;
    }
    case 'stat_tax_purchases': {
      const purchases = data.transactions.filter(t => t.type === 'purchase' && t.status === 'approved');
      const totalPurchases = purchases.reduce((acc, t) => acc + (t.amount || 0), 0);
      const tax = (totalPurchases * 0.15) / 1.15;
      return <MiniStatCard
        label={title || 'ضريبة المشتريات المجمعة'} value={tax}
        icon={CreditCard} color={cs.ring} bgLight="bg-blue-50" iconColor="text-blue-600"
        ringPct={15} sub="من فواتير المشتريات المعتمدة"
        isThresholdAlert={widget.alertThreshold !== undefined && tax > widget.alertThreshold}
        onClick={() => data.goToTab('financials')} fmtNum={fmtNum}
        tooltip={`ضريبة المشتريات المجمعة المعتمدة: ${fmtNum(tax)} ر.س`}
      />;
    }
    case 'stat_expenses':
      return <MiniStatCard
        label={title || 'المصروفات'} value={data.totalExpenses}
        icon={TrendingDown} color={cs.ring} bgLight="bg-red-50" iconColor="text-red-500"
        ringPct={data.stats.income > 0 ? Math.min(100, Math.round((data.totalExpenses / data.stats.income) * 100)) : 100}
        realPct={data.stats.income > 0 ? Math.round((data.totalExpenses / data.stats.income) * 100) : 0}
        sub={data.stats.income > 0 ? `${Math.round((data.totalExpenses / data.stats.income) * 100)}% من الدخل` : 'لا دخل'}
        isThresholdAlert={widget.alertThreshold !== undefined && data.totalExpenses > widget.alertThreshold}
        onClick={() => data.goToTab('financials')} fmtNum={fmtNum}
        tooltip={data.totalExpenses > data.stats.income ? `⚠️ مصروفات تتجاوز الدخل` : `${Math.round((data.totalExpenses / data.stats.income) * 100)}% من الدخل`}
      />;
    case 'stat_profit':
      return <MiniStatCard
        label={title || 'صافي الربح'} value={data.netBalance}
        icon={Wallet} color={data.netBalance >= 0 ? '#6366f1' : '#ef4444'}
        bgLight={data.netBalance >= 0 ? 'bg-indigo-50' : 'bg-red-50'}
        iconColor={data.netBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}
        ringPct={Math.min(100, Math.abs(data.profitPct))} realPct={Math.abs(data.profitPct)}
        sub={data.netBalance >= 0 ? `هامش ${data.profitPct}%` : `خسارة ${Math.abs(data.profitPct)}%`}
        isThresholdAlert={widget.alertThreshold !== undefined && data.netBalance < widget.alertThreshold}
        onClick={() => data.goToTab('financials')} fmtNum={fmtNum}
        tooltip={data.netBalance >= 0 ? `ربح صافي ${fmtNum(data.netBalance)}` : `خسارة ${fmtNum(Math.abs(data.netBalance))}`}
      />;
    case 'stat_pending':
      return <MiniStatCard
        label={title || 'طلبات معلقة'} value={data.stats.pendingInvoices}
        icon={Clock} color={data.stats.pendingInvoices > 0 ? '#f59e0b' : '#94a3b8'}
        bgLight="bg-amber-50" iconColor="text-amber-600"
        ringPct={Math.min(100, data.stats.pendingInvoices * 20)} realPct={data.stats.pendingInvoices}
        sub={data.stats.pendingInvoices > 0 ? 'تنتظر موافقتك' : 'لا يوجد معلق'}
        alert={data.stats.pendingInvoices > 0}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.pendingInvoices > widget.alertThreshold}
        onClick={() => data.goToTab('purchases')} fmtNum={fmtNum}
        tooltip={`${data.stats.pendingInvoices} طلب شراء معلق`}
      />;
    case 'stat_workers':
      return <MiniStatCard
        label={title || 'عمال اليومية'} value={data.stats.activeWorkers}
        icon={HardHat} color="#10b981" bgLight="bg-emerald-50" iconColor="text-emerald-600"
        ringPct={data.stats.activeWorkers > 0 ? Math.min(100, Math.round((data.todayAttendance / data.stats.activeWorkers) * 100)) : 0}
        sub={`${data.todayAttendance} حضروا اليوم`}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.activeWorkers < widget.alertThreshold}
        onClick={() => data.goToTab('workers_management')} fmtNum={fmtNum}
        tooltip={`${data.todayAttendance} من ${data.stats.activeWorkers} حضروا`}
      />;
    case 'stat_projects':
      return <MiniStatCard
        label={title || 'المشاريع النشطة'} value={data.stats.activeProjects}
        icon={Building2} color="#3b82f6" bgLight="bg-blue-50" iconColor="text-blue-600"
        ringPct={data.systemProjects.length > 0 ? Math.min(100, Math.round((data.stats.activeProjects / data.systemProjects.length) * 100)) : 0}
        sub={`من أصل ${data.systemProjects.length} مشروع`}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.activeProjects < widget.alertThreshold}
        onClick={() => data.goToTab('projects')} fmtNum={fmtNum}
        tooltip={`${data.stats.activeProjects} نشط من ${data.systemProjects.length} إجمالي`}
      />;
    case 'stat_team':
      return <MiniStatCard
        label={title || 'الفريق'} value={data.stats.employeesCount}
        icon={Users} color="#64748b" bgLight="bg-slate-100" iconColor="text-slate-600"
        ringPct={data.stats.employeesCount > 0 ? Math.min(100, Math.round((data.todayAttendance / data.stats.employeesCount) * 100)) : 0}
        sub={`${data.todayAttendance} حضور اليوم`}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.employeesCount < widget.alertThreshold}
        onClick={() => data.goToTab('employees')} fmtNum={fmtNum}
        tooltip={`${data.todayAttendance} موظف حضر اليوم`}
      />;
    case 'stat_purchases':
      return <MiniStatCard
        label={title || 'إجمالي المشتريات'} value={data.stats.purchases}
        icon={ShoppingBag} color="#f97316" bgLight="bg-orange-50" iconColor="text-orange-600"
        ringPct={data.stats.income > 0 ? Math.min(100, Math.round((data.stats.purchases / data.stats.income) * 100)) : 0}
        sub={data.stats.income > 0 ? `${Math.round((data.stats.purchases / data.stats.income) * 100)}% من الدخل` : 'آخر 90 يوم'}
        isThresholdAlert={widget.alertThreshold !== undefined && data.stats.purchases > widget.alertThreshold}
        onClick={() => data.goToTab('purchases')} fmtNum={fmtNum}
        tooltip={`المشتريات ${fmtNum(data.stats.purchases)}`}
      />;

    /* ── SUMMARY CARDS ── */
    case 'financial_summary':
      return <FinancialSummaryWidget data={data} fmtNum={fmtNum} title={title} settings={widget.settings} />;
    case 'ops_summary':
      return <OpsSummaryWidget data={data} fmtNum={fmtNum} title={title} settings={widget.settings} />;

    /* ── LISTS ── */
    case 'list_transactions':
      return <TransactionsWidget transactions={data.transactions} goToTab={data.goToTab} title={title} settings={widget.settings} />;
    case 'list_tasks':
      return <TasksWidget
        tasks={data.generalTasks} systemUsers={data.systemUsers}
        systemProjects={data.systemProjects} systemSuppliers={data.systemSuppliers}
        onToggle={data.onTaskToggle} onDelete={data.onTaskDelete}
        goToTab={data.goToTab} title={title} settings={widget.settings}
      />;
    case 'attendance_today':
      return <AttendanceWidget workers={data.workers} todayAttendance={data.todayAttendance} goToTab={data.goToTab} title={title} settings={widget.settings} />;

    /* ── CHART ── */
    case 'chart_weekly':
      return <WeeklyChartWidget title={title} settings={widget.settings} />;

    /* ── SMART ── */
    case 'ai_insight':
      return <AIInsightWidget
        aiInsight={data.aiInsight}
        aiLoading={data.aiLoading}
        title={title}
        stats={{
          income: data.stats.income,
          expenses: data.totalExpenses,
          net: data.netBalance,
          activeProjects: data.stats.activeProjects,
          activeWorkers: data.stats.activeWorkers,
          totalEmployees: data.stats.employeesCount,
          todayAttendance: data.todayAttendance
        }}
      />;
    case 'voice_briefing':
      return <VoiceBriefingWidget playback={data.dashboardPlayback} onPlay={data.onPlayBriefing} title={title} />;
    case 'sticky_note':
      return <StickyNoteWidget widget={widget} onUpdate={data.onUpdateWidget || (() => {})} title={title} />;
    case 'calendar_events':
      return <CalendarWidget generalTasks={data.generalTasks} systemProjects={data.systemProjects} title={title} />;

    /* ── ACTIONS ── */
    case 'quick_actions':
      return <QuickActionsWidget goToTab={data.goToTab} isOwner={data.isOwner} isManager={data.isManager} isElevated={data.isElevated} title={title} dashboardPlayback={data.dashboardPlayback} onPlayBriefing={data.onPlayBriefing} settings={widget.settings} />;
    case 'alerts_panel':
      return <AlertsWidget alerts={data.alerts} goToTab={data.goToTab} title={title} />;
    case 'announcement':
      return <AnnouncementWidget text={data.announcement} title={title} />;

    default:
      return (
        <div className="h-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center">
          <p className="text-xs text-slate-400 font-bold">ودجت غير معروف</p>
        </div>
      );
  }
}

/* ─── Mini Stat Card ─── */
function MiniStatCard({ label, value, icon: Icon, color, bgLight, iconColor, ringPct, realPct, sub, alert, isThresholdAlert, onClick, fmtNum, tooltip }: any) {
  const [showTip, setShowTip] = React.useState(false);
  const displayPct = realPct !== undefined ? realPct : ringPct;
  return (
    <button onClick={onClick}
      className={`w-full h-full text-right bg-white rounded-2xl border p-4 flex flex-col gap-2 hover:shadow-lg transition-all active:scale-[0.97] overflow-visible relative ${
        isThresholdAlert
          ? 'border-red-500 bg-red-50/10 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
          : alert
            ? 'border-amber-300 bg-amber-50/40'
            : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isThresholdAlert ? 'bg-red-100' : bgLight}`}>
          <Icon className={`w-4 h-4 ${isThresholdAlert ? 'text-red-600' : iconColor}`} />
        </div>
        <div className="relative cursor-help" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
          <CircleRing pct={ringPct} color={isThresholdAlert ? '#ef4444' : color} size={64} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black pointer-events-none" style={{ color: isThresholdAlert ? '#ef4444' : color }}>
            {Math.round(displayPct)}%
          </span>
          {showTip && tooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-44 bg-slate-900 text-white text-[10px] font-semibold rounded-xl px-3 py-2 shadow-2xl text-center pointer-events-none" dir="rtl">
              <p style={{ color: isThresholdAlert ? '#ef4444' : color }} className="font-black text-[11px] mb-1">{label}</p>
              {tooltip}
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 w-0 h-0" />
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
          <span>{label}</span>
          {isThresholdAlert && <span className="text-red-500 animate-bounce text-xs">⚠️</span>}
        </p>
        <p className={`text-xl font-black leading-none ${isThresholdAlert ? 'text-red-700' : alert ? 'text-amber-700' : 'text-slate-900'}`}>
          {typeof value === 'number' ? fmtNum(value) : value}
        </p>
        {sub && <p className="text-[10px] text-slate-400 font-semibold mt-1">{sub}</p>}
      </div>
    </button>
  );
}

/* ─── Financial Summary (4 stat cards in a row) ─── */
function FinancialSummaryWidget({ data, fmtNum, title, settings }: any) {
  const enabledCards = settings?.enabledCards || [
    'stat_income', 'stat_expenses', 'stat_profit', 'stat_pending'
  ];

  const cardDefinitions: Record<string, { type: any, colorScheme: any }> = {
    stat_income: { type: 'stat_income', colorScheme: 'emerald' },
    stat_expenses: { type: 'stat_expenses', colorScheme: 'rose' },
    stat_profit: { type: 'stat_profit', colorScheme: 'indigo' },
    stat_pending: { type: 'stat_pending', colorScheme: 'amber' },
    stat_tax_income: { type: 'stat_tax_income', colorScheme: 'slate' },
    stat_tax_purchases: { type: 'stat_tax_purchases', colorScheme: 'blue' }
  };

  const activeCards = enabledCards
    .filter((id: string) => cardDefinitions[id])
    .map((id: string) => cardDefinitions[id]);

  const cols = activeCards.length;
  const gridColsClass = cols === 1 ? 'grid-cols-1' :
                       cols === 2 ? 'grid-cols-2' :
                       cols === 3 ? 'grid-cols-3' :
                       cols === 4 ? 'grid-cols-4' :
                       cols === 5 ? 'grid-cols-2 md:grid-cols-5' :
                       'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title || 'الملخص المالي'} — آخر 90 يوم</p>
      <div className={`grid gap-3 h-[calc(100%-2rem)] ${gridColsClass}`}>
        {activeCards.map((card: any, idx: number) => (
          <React.Fragment key={idx}>
            {renderWidget({ ...({} as any), type: card.type, colorScheme: card.colorScheme, size: 'sm', id: '', order: 0 }, data, fmtNum)}
          </React.Fragment>
        ))}
        {activeCards.length === 0 && (
          <div className="col-span-full h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl py-6">
            <p className="text-xs font-bold text-slate-400">يرجى اختيار بطاقات لعرضها من إعدادات القسم</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Ops Summary ─── */
function OpsSummaryWidget({ data, fmtNum, title, settings }: any) {
  const enabledCards = settings?.enabledCards || [
    'stat_workers', 'stat_projects', 'stat_team', 'stat_purchases'
  ];

  const cardDefinitions: Record<string, { type: any, colorScheme: any }> = {
    stat_workers: { type: 'stat_workers', colorScheme: 'emerald' },
    stat_projects: { type: 'stat_projects', colorScheme: 'blue' },
    stat_team: { type: 'stat_team', colorScheme: 'slate' },
    stat_purchases: { type: 'stat_purchases', colorScheme: 'orange' }
  };

  const activeCards = enabledCards
    .filter((id: string) => cardDefinitions[id])
    .map((id: string) => cardDefinitions[id]);

  const cols = activeCards.length;
  const gridColsClass = cols === 1 ? 'grid-cols-1' :
                       cols === 2 ? 'grid-cols-2' :
                       cols === 3 ? 'grid-cols-3' :
                       'grid-cols-4';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title || 'التشغيل والموارد'}</p>
      <div className={`grid gap-3 h-[calc(100%-2rem)] ${gridColsClass}`}>
        {activeCards.map((card: any, idx: number) => (
          <React.Fragment key={idx}>
            {renderWidget({ ...({} as any), type: card.type, colorScheme: card.colorScheme, size: 'sm', id: '', order: 0 }, data, fmtNum)}
          </React.Fragment>
        ))}
        {activeCards.length === 0 && (
          <div className="col-span-full h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl py-6">
            <p className="text-xs font-bold text-slate-400">يرجى اختيار بطاقات لعرضها من إعدادات القسم</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Transactions ─── */
function TransactionsWidget({ transactions, goToTab, title, settings }: any) {
  const limit = settings?.itemLimit || 5;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title || 'آخر المعاملات'}</p>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {transactions.slice(0, limit).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {t.type === 'income' ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              </div>
              <p className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{t.description || t.type}</p>
            </div>
            <p className={`text-[11px] font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
              {t.type === 'income' ? '+' : '-'}{(t.amount || 0).toLocaleString()}
            </p>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-6">لا توجد معاملات</p>
        )}
      </div>
    </div>
  );
}

/* ─── Tasks (mini version) ─── */
function TasksWidget({ tasks, onToggle, goToTab, title, settings }: any) {
  const limit = settings?.itemLimit || 5;
  const pending = tasks.filter((t: any) => !t.archived && t.status !== 'completed').slice(0, limit);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title || 'المهام والعمليات'}</p>
        <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{pending.length} معلقة</span>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {pending.map((t: any) => (
          <div key={t.id} className="flex items-center gap-2.5 group">
            <button
              onClick={() => onToggle(t)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${t.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-indigo-400'}`}
            >
              {t.status === 'completed' && <Check className="w-3 h-3 text-white" />}
            </button>
            <p className={`text-[11px] font-bold flex-1 truncate ${t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</p>
            <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-red-50 text-red-600' : t.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
              {t.priority === 'high' ? 'عاجل' : t.priority === 'medium' ? 'متوسط' : 'عادي'}
            </span>
          </div>
        ))}
        {pending.length === 0 && <p className="text-center text-xs text-slate-400 py-6">لا توجد مهام معلقة 🎉</p>}
      </div>
    </div>
  );
}

/* ─── Attendance ─── */
function AttendanceWidget({ workers, todayAttendance, goToTab, title, settings }: any) {
  const limit = settings?.itemLimit || 5;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title || 'حضور اليوم'}</p>
        <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{todayAttendance} حاضر</span>
      </div>
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {workers.slice(0, limit).map((w: any) => (
          <div key={w.id} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
              <span className="text-[8px] font-black text-slate-600">{(w.name || 'ع').charAt(0)}</span>
            </div>
            <p className="text-[11px] font-bold text-slate-700 flex-1 truncate">{w.name}</p>
          </div>
        ))}
        {workers.length === 0 && <p className="text-center text-xs text-slate-400 py-4">لا توجد بيانات</p>}
      </div>
    </div>
  );
}

/* ─── Weekly Chart ─── */
const CHART_DATA = [
  { d: 'السبت', v: 400 }, { d: 'الأحد', v: 300 }, { d: 'الاثنين', v: 500 },
  { d: 'الثلاثاء', v: 278 }, { d: 'الأربعاء', v: 189 },
  { d: 'الخميس', v: 390 }, { d: 'الجمعة', v: 349 },
];
function WeeklyChartWidget({ title, settings }: any) {
  const isBar = settings?.chartType === 'bar';
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title || 'الأداء الأسبوعي'}</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {isBar ? (
            <BarChart data={CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="d" tick={{ fontSize: 9, fontFamily: 'Cairo' }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="v" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <ReAreaChart data={CHART_DATA}>
              <defs>
                <linearGradient id="db_grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="d" tick={{ fontSize: 9, fontFamily: 'Cairo' }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#db_grad)" />
            </ReAreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── AI Insight ─── */
function AIInsightWidget({ aiInsight, aiLoading, title, stats }: any) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [customResponse, setCustomResponse] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const ans = await askGeminiAdvisor(query, stats);
      setCustomResponse(ans);
    } catch (err: any) {
      toast.error('خطأ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-4 flex flex-col text-white relative overflow-hidden text-right" dir="rtl">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-200" />
          <p className="text-[10px] font-black text-violet-200 uppercase tracking-widest">{title || 'المستشار الذكي (AI)'}</p>
        </div>
        {customResponse && (
          <button
            onClick={() => { setCustomResponse(null); setQuery(''); }}
            className="text-[9px] font-black bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg transition"
          >
            التحليل العام ↩️
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-3 text-xs leading-relaxed min-h-0 select-text">
        {loading || aiLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white/60 animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 whitespace-pre-line font-medium text-white/90">
            {customResponse ? (
              <div>
                <p className="text-[9px] font-black text-violet-200 mb-1">الرد على استفسارك:</p>
                <p>{customResponse}</p>
              </div>
            ) : (
              <p>{aiInsight || 'جاري تحليل بياناتك للمرة الأولى...'}</p>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleAsk} className="flex gap-1.5 shrink-0 mt-auto">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="اسأل المستشار الذكي عن أي شيء..."
          className="flex-1 bg-white/10 border border-white/10 hover:border-white/20 focus:border-violet-300 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/50 focus:outline-none transition"
        />
        <button
          type="submit"
          disabled={loading || aiLoading || !query.trim()}
          className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs rounded-xl transition disabled:opacity-50"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}

/* ─── Sticky Note Widget ─── */
function StickyNoteWidget({ widget, onUpdate, title }: { widget: WidgetInstance, onUpdate: (id: string, updates: Partial<WidgetInstance>) => void, title?: string }) {
  const [content, setContent] = useState(widget.settings?.noteContent || '');

  useEffect(() => {
    setContent(widget.settings?.noteContent || '');
  }, [widget.settings?.noteContent]);

  const saveTimeout = useRef<any>(null);
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      onUpdate(widget.id, { settings: { ...widget.settings, noteContent: val } });
    }, 800);
  };

  return (
    <div className="h-full bg-gradient-to-br from-amber-100 to-amber-200 text-slate-800 rounded-2xl p-4 flex flex-col shadow-inner relative border border-amber-300 text-right" dir="rtl">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-500 rounded-full shadow border border-rose-600 z-10" />
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">{title || 'ملاحظة لاصقة ذكية'}</p>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="اكتب ملاحظاتك هنا... سيتم حفظها تلقائياً ✍️"
        className="flex-1 w-full bg-transparent resize-none border-none outline-none text-xs font-bold leading-relaxed text-amber-950 placeholder-amber-700/50"
      />
    </div>
  );
}

/* ─── Calendar Widget ─── */
function CalendarWidget({ generalTasks, systemProjects, title }: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const weekdaysAr = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const targetDay = selectedDay || new Date();

  const dayTasks = generalTasks.filter((t: any) => {
    if (!t.parsedDate) return false;
    return t.parsedDate.toDateString() === targetDay.toDateString();
  });

  const dayProjects = systemProjects.filter((p: any) => {
    if (!p.createdAt) return false;
    const pDate = typeof p.createdAt.toDate === 'function' ? p.createdAt.toDate() : new Date(p.createdAt);
    return pDate.toDateString() === targetDay.toDateString();
  });

  const selectedDayEvents = [
    ...dayTasks.map((t: any) => ({ title: t.title, typeAr: `مهمة (${t.priority === 'high' ? 'عاجلة' : 'عادية'})` })),
    ...dayProjects.map((p: any) => ({ title: p.name, typeAr: 'مشروع جديد' }))
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 h-full flex flex-col sm:flex-row gap-4">
      {/* Calendar Area */}
      <div className="flex-1 flex flex-col min-w-[200px] text-right" dir="rtl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title || 'تقويم الفعاليات'}</p>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-600 font-bold text-xs">◀</button>
            <span className="text-xs font-black text-slate-800">{monthNamesAr[month]} {year}</span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 transition text-slate-600 font-bold text-xs">▶</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-1 mb-1.5">
          {weekdaysAr.map((wd, i) => (
            <span key={i} className="text-[9px] font-black text-slate-400">{wd}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="aspect-square" />;

            const isToday = new Date().toDateString() === day.toDateString();
            const isSelected = selectedDay && selectedDay.toDateString() === day.toDateString();

            const tasksOnDay = generalTasks.filter((t: any) => t.parsedDate && t.parsedDate.toDateString() === day.toDateString());
            const projectsOnDay = systemProjects.filter((p: any) => {
              if (!p.createdAt) return false;
              const pDate = typeof p.createdAt.toDate === 'function' ? p.createdAt.toDate() : new Date(p.createdAt);
              return pDate.toDateString() === day.toDateString();
            });

            const total = tasksOnDay.length + projectsOnDay.length;

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square flex flex-col items-center justify-between p-1 rounded-xl relative border transition ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isToday
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-extrabold'
                      : 'bg-slate-50/50 border-slate-100 text-slate-700 hover:bg-indigo-50/30'
                }`}
              >
                <span className="text-[10px] font-black">{day.getDate()}</span>
                {total > 0 && (
                  <div className="flex gap-0.5 justify-center mt-auto w-full">
                    {tasksOnDay.map((t: any, i: number) => (
                      <span key={`t-${i}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : t.priority === 'high' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                    ))}
                    {projectsOnDay.map((p: any, i: number) => (
                      <span key={`p-${i}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Panel */}
      <div className="w-full sm:w-48 border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4 flex flex-col overflow-y-auto text-right" dir="rtl">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
          مواعيد {targetDay.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
        </p>
        <div className="space-y-1.5 flex-1 max-h-[160px] sm:max-h-none overflow-y-auto">
          {selectedDayEvents.map((ev: any, i: number) => (
            <div key={i} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 flex flex-col gap-0.5">
              <span className="text-slate-800 font-extrabold text-xs">{ev.title}</span>
              <span className="text-[8px] text-slate-400 font-black">{ev.typeAr}</span>
            </div>
          ))}
          {selectedDayEvents.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6 font-bold">لا توجد مواعيد</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Voice Briefing ─── */
function VoiceBriefingWidget({ playback, onPlay, title }: any) {
  return (
    <button
      onClick={onPlay}
      className={`w-full h-full rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
        playback === 'playing'
          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white animate-pulse'
          : 'bg-gradient-to-br from-rose-500 to-pink-600 text-white hover:from-rose-400 hover:to-pink-500'
      }`}
    >
      {playback === 'loading' ? <Loader2 className="w-6 h-6 animate-spin" /> :
       playback === 'playing' ? <Pause className="w-6 h-6" /> :
       <Volume2 className="w-6 h-6" />}
      <p className="text-xs font-black">
        {playback === 'loading' ? 'جاري الصياغة...' :
         playback === 'playing' ? 'إيقاف مؤقت' :
         title || 'الموجز الصوتي 🎙️'}
      </p>
    </button>
  );
}

/* ─── Quick Actions ─── */
function QuickActionsWidget({ goToTab, isOwner, isManager, isElevated, title, dashboardPlayback, onPlayBriefing, settings }: any) {
  const actionItems: Record<string, { icon: any, label: string, color: string, tab: string, requiredRole: 'owner' | 'manager' | 'elevated' | 'all' }> = {
    workers_management: { icon: HardHat, label: 'العمالة', color: 'bg-emerald-500', tab: 'workers_management', requiredRole: 'elevated' },
    camera: { icon: Camera, label: 'الماسح', color: 'bg-slate-900', tab: 'camera', requiredRole: 'all' },
    attendance_manager: { icon: Clock, label: 'الحضور', color: 'bg-blue-500', tab: 'attendance_manager', requiredRole: 'elevated' },
    purchases: { icon: ShoppingCart, label: 'المشتريات', color: 'bg-amber-500', tab: 'purchases', requiredRole: 'elevated' },
    projects: { icon: Building2, label: 'المشاريع', color: 'bg-indigo-500', tab: 'projects', requiredRole: 'elevated' },
    financials: { icon: Wallet, label: 'الماليات', color: 'bg-teal-600', tab: 'financials', requiredRole: 'manager' },
    banking: { icon: CreditCard, label: 'البنوك', color: 'bg-sky-600', tab: 'banking', requiredRole: 'manager' },
    expenses: { icon: TrendingDown, label: 'المصروفات', color: 'bg-red-500', tab: 'expenses', requiredRole: 'manager' },
    sales: { icon: TrendingUp, label: 'المبيعات', color: 'bg-pink-500', tab: 'sales', requiredRole: 'manager' },
    inventory: { icon: Package, label: 'المخزون', color: 'bg-orange-500', tab: 'inventory', requiredRole: 'elevated' },
    production: { icon: Layers, label: 'الإنتاج', color: 'bg-violet-600', tab: 'production', requiredRole: 'elevated' },
    employees: { icon: Users, label: 'الفريق', color: 'bg-purple-500', tab: 'employees', requiredRole: 'elevated' },
    subcontractors: { icon: Briefcase, label: 'الباطن', color: 'bg-teal-700', tab: 'subcontractors', requiredRole: 'elevated' },
    payrolls: { icon: Receipt, label: 'الرواتب', color: 'bg-indigo-600', tab: 'payrolls', requiredRole: 'manager' },
    approvals: { icon: CheckCircle, label: 'الاعتمادات', color: 'bg-green-600', tab: 'approvals', requiredRole: 'manager' },
    archive: { icon: Archive, label: 'الأرشيف', color: 'bg-slate-600', tab: 'archive', requiredRole: 'manager' },
    assets: { icon: Building2, label: 'الأصول', color: 'bg-cyan-600', tab: 'assets', requiredRole: 'elevated' },
    evaluation: { icon: Star, label: 'التقييم', color: 'bg-yellow-600', tab: 'evaluation', requiredRole: 'elevated' },
    suppliers: { icon: Users, label: 'الموردين', color: 'bg-stone-600', tab: 'suppliers', requiredRole: 'manager' },
    settings: { icon: Settings2, label: 'الإعدادات', color: 'bg-slate-700', tab: 'settings', requiredRole: 'owner' }
  };

  const enabledKeys = settings?.enabledActions || [
    'briefing', 'workers_management', 'camera', 'attendance_manager', 'purchases', 'projects', 'financials', 'sales', 'employees', 'inventory'
  ];

  const actions = Object.entries(actionItems)
    .filter(([key]) => enabledKeys.includes(key))
    .map(([_, val]) => val)
    .filter(a => {
      if (a.requiredRole === 'owner' && !isOwner) return false;
      if (a.requiredRole === 'manager' && !isManager) return false;
      if (a.requiredRole === 'elevated' && !isElevated) return false;
      return true;
    });

  const showBriefing = enabledKeys.includes('briefing');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{title || 'الوصول السريع'}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-right" dir="rtl">
        {showBriefing && (
          <button
            onClick={onPlayBriefing}
            className={`flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap shrink-0 transition active:scale-95 min-w-[68px] ${
              dashboardPlayback === 'playing' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white animate-pulse' :
              'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
            }`}
          >
            {dashboardPlayback === 'playing' ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            {dashboardPlayback === 'playing' ? 'إيقاف' : 'الموجز 🎙️'}
          </button>
        )}
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => goToTab(a.tab)}
            className={`flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-xl font-bold text-[11px] whitespace-nowrap shrink-0 transition active:scale-95 min-w-[68px] text-white ${a.color}`}
          >
            <a.icon className="w-5 h-5" />
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Alerts ─── */
function AlertsWidget({ alerts, goToTab, title }: any) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = alerts.filter((a: any) => !dismissed.includes(a.id)).slice(0, 3);
  return (
    <div className="h-full bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title || 'التنبيهات'}</p>
      <div className="space-y-2 flex-1">
        {visible.map((a: any) => (
          <div key={a.id} className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${
            a.type === 'red' ? 'bg-red-50 text-red-800 border border-red-200' :
            a.type === 'amber' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            <a.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 truncate cursor-pointer" onClick={() => goToTab(a.tab)}>{a.text}</span>
            <button onClick={() => setDismissed(p => [...p, a.id])} className="shrink-0 w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {visible.length === 0 && <p className="text-center text-xs text-emerald-600 font-bold py-4">✅ لا توجد تنبيهات</p>}
      </div>
    </div>
  );
}

/* ─── Announcement ─── */
function AnnouncementWidget({ text, title }: any) {
  if (!text) return (
    <div className="h-full bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center justify-center">
      <p className="text-xs text-amber-600 font-bold">لا يوجد إعلان حالياً</p>
    </div>
  );
  return (
    <div className="h-full bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-2">
      <Bell className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">{title || 'إعلان الإدارة'}</p>
        <p className="text-xs text-amber-800 font-semibold leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD BUILDER
═══════════════════════════════════════════════ */
export default function DashboardBuilder({ goToTab }: { goToTab: (tab: string) => void }) {
  const { user, profile } = useAuth();
  const isOwner      = profile?.email?.toLowerCase().trim() === 'expertadvsa@gmail.com';
  const isManager    = profile?.role === 'manager' || isOwner;
  const isSupervisor = profile?.role === 'supervisor';
  const isElevated   = isManager || isSupervisor;

  /* ── State ── */
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [past, setPast] = useState<WidgetInstance[][]>([]);
  const [future, setFuture] = useState<WidgetInstance[][]>([]);
  const [isLocked, setIsLocked] = useState(false);
  
  // For adding a new client globally from dashboard control panel
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '' });
  const [isAddingClient, setIsAddingClient] = useState(false);

  const handleAddNewClient = async () => {
    if (!newClientData.name) {
      toast.error('يرجى إدخال اسم العميل');
      return;
    }
    setIsAddingClient(true);
    try {
      const result = await createAliphiaClient(newClientData);
      if (result.success) {
        toast.success('تم إضافة العميل بنجاح في نظام ألف ياء ERP ✨');
        setIsAddClientOpen(false);
        setNewClientData({ name: '', phone: '', email: '' });
      } else {
        toast.error(result.error || 'فشل إضافة العميل في ألف ياء');
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إضافة العميل');
    } finally {
      setIsAddingClient(false);
    }
  };

  const updateWidgetsState = (newWidgets: WidgetInstance[], skipHistory = false) => {
    if (!skipHistory) {
      setPast(prev => [...prev, widgets]);
      setFuture([]);
    }
    setWidgets(newWidgets);
  };

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture(prev => [widgets, ...prev]);
    setWidgets(previous);
    toast.info('تم التراجع ↩️');
  }, [past, widgets]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast(prev => [...prev, widgets]);
    setFuture(newFuture);
    setWidgets(next);
    toast.info('تم الإعادة ↪️');
  }, [future, widgets]);

  // Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo]);

  // PDF Exporting Handler
  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body {
          background: white !important;
          color: black !important;
        }
        aside, nav, footer, .lg\\:hidden, button, select, input, .no-print, [role="toolbar"], header, .bg-indigo-600, .bg-gradient-to-r {
          display: none !important;
        }
        main, .min-h-screen {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        .grid {
          gap: 8px !important;
        }
        .bg-white {
          border: 1px solid #e2e8f0 !important;
          box-shadow: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  /* ── Dashboard Data ── */
  const [stats, setStats] = useState({ income: 0, expenses: 0, purchases: 0, employeesCount: 0, pendingInvoices: 0, workerExpense: 0, activeWorkers: 0, activeProjects: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [generalTasks, setGeneralTasks] = useState<any[]>([]);
  const [systemProjects, setSystemProjects] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemSuppliers, setSystemSuppliers] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const dashboardAudioRef = useRef<HTMLAudioElement | null>(null);
  const [dashboardPlayback, setDashboardPlayback] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');

  /* ── Derived ── */
  const totalExpenses = stats.expenses + stats.workerExpense;
  const netBalance    = stats.income - totalExpenses;
  const profitPct     = stats.income > 0 ? Math.round((netBalance / stats.income) * 100) : 0;

  /* ── Load config ── */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const cfg = await loadDashboardConfig(user.uid);
      if (cfg && cfg.widgets.length > 0) {
        setWidgets(cfg.widgets.sort((a, b) => a.order - b.order));
      } else {
        // First time: load default layout
        setWidgets(DEFAULT_LAYOUT);
      }
      setConfigLoaded(true);
    })();
  }, [user?.uid]);

  /* ── Auto-save on widget change ── */
  const saveTimeout = useRef<any>(null);
  useEffect(() => {
    if (!configLoaded || !user?.uid || widgets.length === 0) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await saveDashboardConfig(user.uid, widgets);
      } catch (e) { console.error('Auto-save failed:', e); }
    }, 1200);
    return () => clearTimeout(saveTimeout.current);
  }, [widgets, configLoaded, user?.uid]);

  /* ── Data subscriptions (same as original Dashboard) ── */
  useEffect(() => {
    const u = onSnapshot(doc(db, 'system', 'settings'), s => {
      if (s.exists()) setAnnouncement(s.data().generalAnnouncement || '');
    });
    return u;
  }, []);

  useEffect(() => {
    if (!profile) return;
    const u = onSnapshot(collection(db, 'projects'), s => {
      const docs = s.docs.filter(d => {
        if (isOwner) return true;
        const data = d.data();
        return (data.supervisor && profile.name && data.supervisor.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
          (data.workerIds && (data.workerIds.includes(profile.uid) || data.workerIds.includes(profile.id)));
      });
      setStats(p => ({ ...p, activeProjects: docs.filter(d => ['in-progress','active'].includes(d.data().status)).length }));
    });
    return u;
  }, [profile, isOwner]);

  useEffect(() => {
    if (!profile) return;
    const subs: (() => void)[] = [];
    const qT = isOwner
      ? query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(6))
      : query(collection(db, 'transactions'), where('createdBy', '==', user?.uid), orderBy('date', 'desc'), limit(6));
    subs.push(onSnapshot(qT, s => {
      setTransactions(s.docs.map(d => {
        const data = d.data();
        let dateOriginal = new Date();
        if (data.date) dateOriginal = typeof data.date.toDate === 'function' ? data.date.toDate() : new Date(data.date);
        return { id: d.id, ...data, dateOriginal };
      }));
    }));
    if (isOwner) {
      subs.push(onSnapshot(collection(db, 'workerTransactions'), s => {
        const total = s.docs.reduce((acc, d) => d.data().type === 'payment' ? acc + (d.data().amount || 0) : acc, 0);
        setStats(p => ({ ...p, workerExpense: total }));
      }));
      const ago90 = new Date(); ago90.setDate(ago90.getDate() - 90);
      subs.push(onSnapshot(query(collection(db, 'transactions'), where('date', '>=', ago90.toISOString())), s => {
        let inc = 0, exp = 0, pur = 0, pend = 0;
        s.docs.forEach(d => {
          const data = d.data();
          if (data.type === 'income') inc += data.amount || 0;
          if (data.type === 'expense') exp += data.amount || 0;
          if (data.type === 'purchase') pur += data.amount || 0;
          if (data.status === 'pending') pend++;
        });
        setStats(p => ({ ...p, income: inc, expenses: exp, purchases: pur, pendingInvoices: pend }));
      }));
    }
    if (isElevated) {
      subs.push(onSnapshot(query(collection(db, 'users'), limit(100)), s => setStats(p => ({ ...p, employeesCount: s.size }))));
      subs.push(onSnapshot(query(collection(db, 'workers'), limit(100)), s => {
        setWorkers(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setStats(p => ({ ...p, activeWorkers: s.size }));
      }));
      const todayStr = new Date().toISOString().split('T')[0];
      subs.push(onSnapshot(query(collection(db, 'attendance'), where('dateString', '==', todayStr)), s => setTodayAttendance(s.size)));
    }
    return () => subs.forEach(u => u());
  }, [profile, isElevated, user?.uid]);

  useEffect(() => {
    if (!profile) return;
    const unSubTasks = onSnapshot(query(collection(db, 'generalTasks'), orderBy('createdAt', 'desc')), s => {
      setGeneralTasks(s.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, parsedDate: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt)) : null };
      }));
    });
    const unSubUsers = onSnapshot(query(collection(db, 'users'), orderBy('name', 'asc')), s => setSystemUsers(s.docs.map(d => ({ uid: d.id, ...d.data() }))));
    const unSubProjects = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), s => setSystemProjects(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unSubSuppliers = onSnapshot(collection(db, 'suppliers'), s => setSystemSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unSubTasks(); unSubUsers(); unSubProjects(); unSubSuppliers(); };
  }, [profile]);

  /* ── Alerts ── */
  useEffect(() => {
    if (!isElevated) return;
    const al: any[] = [];
    if (stats.pendingInvoices > 0) al.push({ id: 'pur', text: `${stats.pendingInvoices} طلبات شراء تنتظر موافقتك`, type: 'amber', icon: ShoppingBag, tab: 'purchases' });
    if (stats.expenses > stats.income * 0.8 && stats.income > 0) al.push({ id: 'exp', text: 'المصروفات تجاوزت 80% من الدخل', type: 'red', icon: AlertTriangle, tab: 'financials' });
    setAlerts(al);
  }, [stats.pendingInvoices, stats.income, stats.expenses, isElevated]);

  /* ── AI ── */
  useEffect(() => {
    if (!isManager) return;
    (async () => {
      setAiLoading(true);
      try {
        const pSnap = await getDocs(query(collection(db, 'projects'), limit(1)));
        const tSnap = await getDocs(query(collection(db, 'transactions'), limit(10)));
        if (!pSnap.empty) setAiInsight(await analyzeProjectSpending(pSnap.docs[0].data(), tSnap.docs.map(d => d.data())));
        else setAiInsight('لا توجد مشاريع مسجلة حتى الآن.');
      } catch (e) { console.error('AI:', e); }
      finally { setAiLoading(false); }
    })();
  }, [isManager]);

  /* ── Voice Briefing ── */
  useEffect(() => { return () => { if (dashboardAudioRef.current) dashboardAudioRef.current.pause(); }; }, []);

  const handlePlayBriefingDirectly = async () => {
    if (dashboardPlayback === 'playing') { dashboardAudioRef.current?.pause(); setDashboardPlayback('paused'); return; }
    if (dashboardPlayback === 'paused') { await dashboardAudioRef.current?.play(); setDashboardPlayback('playing'); return; }
    setDashboardPlayback('loading');
    const netAmount = stats.income - totalExpenses;
    const cacheKey = `briefing_v2_${stats.income}_${stats.expenses}_${stats.pendingInvoices}_${stats.activeProjects}_${stats.activeWorkers}_${stats.employeesCount}_${todayAttendance}_all`;
    try {
      dashboardAudioRef.current?.pause();
      const cachedText = localStorage.getItem(cacheKey + '_text');
      const cachedAudio = localStorage.getItem(cacheKey + '_audio');
      if (cachedText && cachedAudio) {
        const audio = new Audio(`data:audio/wav;base64,${cachedAudio}`);
        dashboardAudioRef.current = audio;
        audio.onplay = () => setDashboardPlayback('playing');
        audio.onpause = () => { if (!audio.ended) setDashboardPlayback('paused'); };
        audio.onended = () => setDashboardPlayback('stopped');
        toast.success('تشغيل فوري للتقرير المحفوظ ⚡');
        await audio.play(); return;
      }
      toast.info('جاري صياغة التقرير... 🧠', { duration: 4000 });
      const customKey = localStorage.getItem('VITE_GEMINI_API_KEY') || '';
      const response = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: { income: stats.income, expenses: totalExpenses, net: netAmount, pendingPurchases: stats.pendingInvoices, activeProjects: stats.activeProjects, totalWorkers: stats.activeWorkers, totalEmployees: stats.employeesCount, todayAttendance }, voiceFocus: 'all', customKey })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'فشل');
      try {
        Object.keys(localStorage).forEach(k => { if (k.startsWith('briefing_v2_')) localStorage.removeItem(k); });
        localStorage.setItem(cacheKey + '_text', data.text || '');
        localStorage.setItem(cacheKey + '_audio', data.audio);
      } catch {}
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
      dashboardAudioRef.current = audio;
      audio.onplay = () => setDashboardPlayback('playing');
      audio.onpause = () => { if (!audio.ended) setDashboardPlayback('paused'); };
      audio.onended = () => setDashboardPlayback('stopped');
      toast.success('جاهز! جاري السرد 🎙️');
      await audio.play();
    } catch (err: any) { toast.error('فشل: ' + err.message); setDashboardPlayback('stopped'); }
  };

  /* ── Task handlers ── */
  const handleTaskToggle = async (task: any) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try { await updateDoc(doc(db, 'generalTasks', task.id), { status: next }); } catch {}
  };
  const handleTaskDelete = async (id: string) => {
    try { await updateDoc(doc(db, 'generalTasks', id), { archived: true }); } catch {}
  };

  /* ── Widget management ── */
  const addWidget = (type: string) => {
    const meta = WIDGET_REGISTRY.find(m => m.type === type);
    if (!meta) return;
    const newWidget: WidgetInstance = {
      id: generateId(),
      type: type as any,
      order: widgets.length,
      size: meta.defaultSize,
      colorScheme: meta.defaultColorScheme,
    };
    updateWidgetsState([...widgets, newWidget]);
    toast.success(`تم إضافة "${meta.nameAr}" للوحتك ✨`);
  };

  const updateWidget = (id: string, updates: Partial<WidgetInstance>) => {
    updateWidgetsState(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWidget = (id: string) => {
    updateWidgetsState(widgets.filter(w => w.id !== id));
    toast.success('تم إزالة الودجت');
  };

  const autoFill = async () => {
    updateWidgetsState(DEFAULT_LAYOUT.map((w, i) => ({ ...w, id: generateId(), order: i })));
    toast.success('تم ملء اللوحة بالتخطيط الافتراضي ✅');
  };

  const saveManually = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await saveDashboardConfig(user.uid, widgets);
      toast.success('تم حفظ التخصيص بنجاح 💾');
      setIsEditMode(false);
    } catch { toast.error('فشل الحفظ'); }
    finally { setIsSaving(false); }
  };

  /* ── Drag & Drop ── */
  const handleDragStart = (index: number) => {
    setPast(prev => [...prev, widgets]);
    setFuture([]);
    setDragIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    
    // Live sort immediately
    const newWidgets = [...widgets];
    const [moved] = newWidgets.splice(dragIndex, 1);
    newWidgets.splice(index, 0, moved);
    
    setWidgets(newWidgets.map((w, i) => ({ ...w, order: i })));
    setDragIndex(index);
    setDragOverIndex(index);
  };
  const handleDrop = (index: number) => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /* ── Widget data ── */
  const widgetData: WidgetData = {
    stats, transactions, workers, alerts, generalTasks,
    systemProjects, systemUsers, systemSuppliers, todayAttendance,
    totalExpenses, netBalance, profitPct, announcement, aiInsight, aiLoading,
    dashboardPlayback, onPlayBriefing: handlePlayBriefingDirectly,
    goToTab, onTaskCreate: () => {}, onTaskToggle: handleTaskToggle,
    onTaskDelete: handleTaskDelete, isOwner, isElevated, isManager
  };

  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-slate-600">جاري تحميل لوحتك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28" dir="rtl">
      {/* ── Picker Overlay ── */}
      <AnimatePresence>
        {showPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowPicker(false)}
            />
            <WidgetPickerPanel
              onAdd={(type) => { addWidget(type); setShowPicker(false); }}
              onClose={() => setShowPicker(false)}
              isOwner={isOwner} isElevated={isElevated}
            />
          </>
        )}
      </AnimatePresence>

      <div className="w-full px-3 sm:px-5 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">{greeting()}</p>
            <h1 className="text-xl font-black text-slate-900">{profile?.name || 'المدير'}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">{todayAr()}</p>
          </div>

          {/* Edit mode toolbar */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isEditMode ? (
              <>
                {/* Undo / Redo */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={handleUndo}
                    disabled={past.length === 0}
                    className="flex items-center justify-center w-7 h-7 hover:bg-slate-50 text-slate-600 rounded-lg transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    title="تراجع (Ctrl+Z)"
                  >
                    <Undo className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={future.length === 0}
                    className="flex items-center justify-center w-7 h-7 hover:bg-slate-50 text-slate-600 rounded-lg transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                    title="إعادة (Ctrl+Y)"
                  >
                    <Redo className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lock Toggle */}
                <button
                  onClick={() => setIsLocked(l => !l)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition active:scale-95 border ${
                    isLocked 
                      ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {isLocked ? 'إلغاء القفل' : 'قفل اللوحة'}
                </button>

                {/* PDF Export */}
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[11px] font-black rounded-xl hover:bg-slate-50 transition active:scale-95 shadow-sm"
                >
                  تصدير PDF
                </button>

                {/* Add widget (hidden when locked) */}
                {!isLocked && (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black rounded-xl shadow-lg shadow-indigo-500/30 hover:from-indigo-500 hover:to-violet-500 transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> إضافة ودجت
                  </button>
                )}

                {/* Presets Select (hidden when locked) */}
                {!isLocked && (
                  <div className="relative flex items-center">
                    <Wand2 className="absolute right-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                    <select
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (!val) return;
                        if (val === 'default') {
                          autoFill();
                        } else {
                          const preset = DASHBOARD_PRESETS.find(p => p.id === val);
                          if (preset) {
                            const updatedWidgets = preset.widgets.map((w, i) => ({ ...w, id: generateId(), order: i }));
                            updateWidgetsState(updatedWidgets);
                            toast.success(`تم تطبيق "${preset.nameAr}" 🪄`);
                          }
                        }
                        e.target.value = '';
                      }}
                      defaultValue=""
                      className="pr-8 pl-3 py-2 bg-white border border-slate-200 text-slate-700 text-[11px] font-black rounded-xl hover:bg-slate-50 transition outline-none cursor-pointer appearance-none min-w-[110px]"
                    >
                      <option value="" disabled>قوالب جاهزة 🪄</option>
                      <option value="default">التخطيط الافتراضي</option>
                      {DASHBOARD_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Save */}
                <button
                  onClick={saveManually}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl hover:bg-emerald-500 transition active:scale-95 disabled:opacity-60"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  حفظ
                </button>

                {/* Exit edit */}
                <button
                  onClick={() => setIsEditMode(false)}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-slate-700 transition active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> عرض
                </button>
              </>
            ) : (
              <>
                {isManager && (
                  <button
                    onClick={() => setIsAddClientOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl hover:bg-emerald-700 transition active:scale-95 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> إضافة عميل
                  </button>
                )}
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[11px] font-black rounded-xl hover:bg-slate-50 transition active:scale-95 shadow-sm"
                >
                  تصدير PDF
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-[11px] font-black rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition active:scale-95 shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" /> تخصيص اللوحة
                </button>
                <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg">V3.0</span>
              </>
            )}
          </div>
        </div>

        {/* ── Edit mode banner ── */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl px-4 py-3"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black">وضع التخصيص نشط</p>
                <p className="text-[10px] text-indigo-200">اسحب الودجتات لإعادة ترتيبها • اضغط ⚙️ لتغيير الإعدادات • اضغط ✕ لإزالة ودجت</p>
              </div>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty State ── */}
        {widgets.length === 0 && !isEditMode ? (
          <EmptyState
            onSelectPreset={async (presetId) => {
              if (presetId === 'default') {
                autoFill();
                return;
              }
              const preset = DASHBOARD_PRESETS.find(p => p.id === presetId);
              if (preset) {
                const updatedWidgets = preset.widgets.map((w, i) => ({ ...w, id: generateId(), order: i }));
                updateWidgetsState(updatedWidgets);
                if (user?.uid) {
                  try {
                    await saveDashboardConfig(user.uid, updatedWidgets);
                    toast.success('تم تطبيق التخطيط بنجاح 🎉');
                  } catch {
                    toast.error('فشل حفظ التخطيط');
                  }
                }
              }
            }}
            onStartCustomize={() => { setIsEditMode(true); setShowPicker(true); }}
          />
        ) : (
          /* ── Grid ── */
          <div className="grid grid-cols-12 grid-flow-row-dense gap-4 auto-rows-[minmax(180px,auto)]">
            <AnimatePresence mode="popLayout">
              {widgets.map((widget, index) => {
                const meta = WIDGET_REGISTRY.find(m => m.type === widget.type);
                if (!meta) return null;

                // Role check
                if (meta.requiredRole === 'owner' && !isOwner) return null;
                if (meta.requiredRole === 'elevated' && !isElevated) return null;

                return (
                  <motion.div
                    key={widget.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                      gridColumn: `span ${getColSpan(widget.size)}`,
                      gridRow: `span ${getRowSpan(widget.size)}`
                    }}
                    onDragOver={(e) => !isLocked && handleDragOver(e, index)}
                    onDrop={() => !isLocked && handleDrop(index)}
                    className={`relative transition-all duration-300 ${dragOverIndex === index && dragIndex !== index && !isLocked ? 'border-2 border-indigo-500 border-dashed bg-indigo-50/20 scale-[1.02] shadow-indigo-500/10 rounded-2xl' : ''} ${dragIndex === index ? 'opacity-30 scale-95 border-dashed border-2 border-slate-300 rounded-2xl' : ''}`}
                  >
                    <WidgetShell
                      widget={widget}
                      isEditMode={isEditMode}
                      isLocked={isLocked}
                      onUpdate={(u) => updateWidget(widget.id, u)}
                      onRemove={() => removeWidget(widget.id)}
                      isDragging={dragIndex === index}
                      dragHandleProps={{
                        draggable: isEditMode && !isLocked,
                        onDragStart: () => handleDragStart(index),
                        onDragEnd: () => { setDragIndex(null); setDragOverIndex(null); }
                      }}
                    >
                      {renderWidget(widget, widgetData, fmtNum)}
                    </WidgetShell>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add more in edit mode */}
            {isEditMode && !isLocked && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowPicker(true)}
                className="col-span-3 border-2 border-dashed border-indigo-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer min-h-[180px]"
                style={{ gridColumn: 'span 3' }}
              >
                <Plus className="w-8 h-8" />
                <p className="text-xs font-black">إضافة ودجت</p>
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* ── Add Client Dialog ── */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              إضافة عميل جديد لنظام ألف ياء ERP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">اسم العميل / الشركة *</Label>
              <Input 
                placeholder="شركة التقنية المحدودة" 
                value={newClientData.name}
                onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                className="h-11 rounded-xl border-slate-200 text-right font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">رقم الجوال</Label>
              <Input 
                placeholder="05XXXXXXXX" 
                value={newClientData.phone}
                onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                className="h-11 rounded-xl border-slate-200 text-right font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">البريد الإلكتروني</Label>
              <Input 
                type="email"
                placeholder="client@example.com" 
                value={newClientData.email}
                onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                className="h-11 rounded-xl border-slate-200 text-right font-bold"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button 
                type="button"
                onClick={handleAddNewClient} 
                disabled={!newClientData.name || isAddingClient}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-md"
              >
                {isAddingClient ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ وإنشاء في ألف ياء"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl font-bold"
                onClick={() => setIsAddClientOpen(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
