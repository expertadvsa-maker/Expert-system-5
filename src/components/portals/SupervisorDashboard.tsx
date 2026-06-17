import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '../../lib/AuthContext';
import { 
  Briefcase, 
  Package, 
  UsersRound, 
  Image as ImageIcon, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  StickyNote,
  Palette,
  LayoutGrid,
  Trash2,
  Pin,
  Plus,
  X,
  Clock,
  LogIn,
  LogOut,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { toast } from 'sonner';

export default function SupervisorDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, activeCompanyId } = useAuth();
  const [projectsCount, setProjectsCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Sticky Notes and Customization States
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [pinnedNotes, setPinnedNotes] = useState<any[]>([]);
  const [dashboardTheme, setDashboardTheme] = useState<'glass' | 'velvet' | 'neon' | 'emerald'>('glass');

  // Synchronize Sticky Notes
  useEffect(() => {
    const updatePinned = () => {
      const saved = localStorage.getItem('smart_sticky_notes_v2');
      if (saved) {
        const notes = JSON.parse(saved);
        setPinnedNotes(notes.filter((n: any) => n.isPinned));
      } else {
        setPinnedNotes([]);
      }
    };
    updatePinned();
    window.addEventListener('sticky-notes-updated', updatePinned);
    return () => {
      window.removeEventListener('sticky-notes-updated', updatePinned);
    };
  }, []);

  useEffect(() => {
    // Listen for projects
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjectsCount(snap.size);
    });

    // Listen for team members (employees)
    const unsubTeam = onSnapshot(query(collection(db, 'users'), where('role', '==', 'employee')), (snap) => {
      setTeamCount(snap.size);
    });

    // Listen for low stock in inventory
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snap) => {
      let low = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.quantity <= (data.reorderLevel || 5)) low++;
      });
      setLowStockCount(low);
    });

    return () => {
      unsubProjects();
      unsubTeam();
      unsubInv();
    };
  }, []);

  // Glassmorphism and Theme Styles Helper
  const getGlassStyle = () => {
    switch (dashboardTheme) {
      case 'velvet':
        return "bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xl border border-purple-500/20 shadow-2xl shadow-purple-950/20";
      case 'neon':
        return "bg-slate-900/80 backdrop-blur-xl border border-blue-500/20 shadow-2xl shadow-blue-950/30";
      case 'emerald':
        return "bg-emerald-950/40 dark:bg-emerald-950/60 backdrop-blur-xl border border-emerald-500/20 shadow-2xl shadow-emerald-950/20";
      default:
        return "bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/40 dark:shadow-none";
    }
  };

  const themeClasses = getGlassStyle();

  const handleAttendanceIn = () => {
    toast.success('تم تسجيل الحضور كـ مشرف ميداني 📡', {
      description: `تم توثيق التواجد الجغرافي بنجاح (${new Date().toLocaleTimeString('ar-SA')})`,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500 relative" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      
      {/* Background aesthetic decoration circles */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full blur-[90px] bg-indigo-500/20" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full blur-[110px] bg-emerald-500/10" />
      </div>

      {/* Top Controls: Styling Theme Selector & Sticky Notes */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex flex-col sm:flex-row items-center justify-between p-4 rounded-3xl ${themeClasses} gap-4 relative z-20`}
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-500 animate-pulse" /> تخصيص وتنسيق غرفة العمليات
          </span>
        </div>

        {/* Theme presets and notes trigger */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-700/40">
            <button 
              onClick={() => setDashboardTheme('glass')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'glass' ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
            >
              افتراضي
            </button>
            <button 
              onClick={() => setDashboardTheme('velvet')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'velvet' ? 'bg-purple-600 text-white shadow-md shadow-purple-600/15' : 'text-slate-500'}`}
            >
              مخملي 💜
            </button>
            <button 
              onClick={() => setDashboardTheme('neon')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'neon' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' : 'text-slate-500'}`}
            >
              نيون 💙
            </button>
            <button 
              onClick={() => setDashboardTheme('emerald')} 
              className={`px-3 py-1 rounded-xl text-[10px] font-black transition-all ${dashboardTheme === 'emerald' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15' : 'text-slate-500'}`}
            >
              زمردي 💚
            </button>
          </div>

          <Button
            onClick={() => setIsNotesOpen(true)}
            className="h-10 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-2 shadow-lg shadow-amber-500/15 relative shrink-0"
          >
            <StickyNote className="w-4 h-4 text-slate-950" />
            الملاحظات اللاصقة 📌
            {pinnedNotes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white border-2 border-white text-[9px] flex items-center justify-center font-bold">
                {pinnedNotes.length}
              </span>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shrink-0 relative z-10">
          <MapPin className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="text-center md:text-right relative z-10 flex-1">
          <h1 className="text-3xl font-black mb-2 tracking-tight">غرفة عمليات المشرف</h1>
          <p className="text-slate-300 font-medium text-lg">مرحباً {profile?.name}، جاهز لإدارة المواقع والفريق اليوم؟</p>
        </div>
        
        <div className="flex gap-3 relative z-10">
          <Button onClick={() => onNavigate?.('camera')} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-12 px-6 font-bold shadow-lg shadow-emerald-500/15">
            <ImageIcon className="w-5 h-5 ml-2" />
            رفع تقرير مصور
          </Button>
        </div>
      </div>

      {/* Premium Actions Grid: Same as manager's */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            لوحة الإجراءات السريعة والمباشرة للمشرف
          </h3>
          <span className="text-[10px] text-emerald-500 font-black">تحكم ذكي بالكامل 📡</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <ActionBtn 
            icon={ImageIcon} 
            label="تقرير مصور" 
            color="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black shadow-lg shadow-emerald-500/15" 
            onClick={() => onNavigate?.('camera')} 
          />
          <ActionBtn 
            icon={Briefcase} 
            label="المشاريع" 
            color="bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black shadow-lg shadow-indigo-500/15" 
            onClick={() => onNavigate?.('projects')} 
          />
          <ActionBtn 
            icon={UsersRound} 
            label="فريق العمل" 
            color="bg-gradient-to-br from-purple-500 to-indigo-700 text-white font-black shadow-lg shadow-purple-500/15" 
            onClick={() => onNavigate?.('employees')} 
          />
          <ActionBtn 
            icon={Package} 
            label="المستودع والمواد" 
            color="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black shadow-lg shadow-amber-500/15" 
            onClick={() => onNavigate?.('inventory')} 
          />
          <ActionBtn 
            icon={Clock} 
            label="تسجيل حضور GPS" 
            color="bg-gradient-to-br from-slate-900 to-slate-800 text-white font-black shadow-lg shadow-slate-900/15" 
            onClick={handleAttendanceIn} 
          />
          <ActionBtn 
            icon={StickyNote} 
            label="لوحة الملاحظات" 
            color="bg-gradient-to-br from-rose-500 to-pink-600 text-white font-black shadow-lg shadow-rose-500/15" 
            onClick={() => setIsNotesOpen(true)} 
          />
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard title="المشاريع الميدانية" value={String(projectsCount)} subtitle="متابعة سير عمل المشاريع الحالية" icon={Briefcase} color="from-blue-500 to-indigo-600 font-black" onClick={() => onNavigate?.('projects')} />
        <DashboardCard title="فريق العمل" value={String(teamCount)} subtitle="متابعة حضور وإنتاجية العمال" icon={UsersRound} color="from-emerald-500 to-teal-600 font-black" onClick={() => onNavigate?.('employees')} />
        <DashboardCard title="المستودع والمواد" value={lowStockCount > 0 ? `${lowStockCount} نواقص` : "مستقر"} subtitle="استلام وصرف المواد للمواقع" icon={Package} color={lowStockCount > 0 ? "from-rose-500 to-red-600 font-black animate-pulse" : "from-orange-500 to-amber-600 font-black"} onClick={() => onNavigate?.('inventory')} />
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl ${themeClasses} overflow-hidden`}
        >
          <CardContent className="p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              تنبيهات الموقع العاجلة
            </h3>
            {lowStockCount > 0 ? (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                <Package className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-800">نقص في بعض المواد الأساسية</h4>
                  <p className="text-sm text-rose-600 mt-1">يوجد {lowStockCount} مواد وصلت للحد الأدنى، يرجى التنسيق لطلب توريدها.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400 opacity-50" />
                <p className="font-medium">جميع الأمور مستقرة في المواقع</p>
              </div>
            )}
          </CardContent>
        </motion.div>
      </div>

      {/* Synchronized Pinned Sticky Notes Draggable Widgets on Screen */}
      <AnimatePresence>
        {!isNotesOpen && pinnedNotes.map(note => {
          const colors = [
            { id: 'amber', bg: 'bg-amber-100/90 dark:bg-amber-950/90', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100' },
            { id: 'rose', bg: 'bg-rose-100/90 dark:bg-rose-950/90', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-100' },
            { id: 'emerald', bg: 'bg-emerald-100/90 dark:bg-emerald-950/90', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-100' },
            { id: 'blue', bg: 'bg-blue-100/90 dark:bg-blue-950/90', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100' },
            { id: 'violet', bg: 'bg-violet-100/90 dark:bg-violet-950/90', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-900 dark:text-violet-100' }
          ];
          const scheme = colors.find(c => c.id === note.color) || colors[0];

          return (
            <motion.div
              key={`pinned-${note.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1, x: note.pinnedX || 0, y: note.pinnedY || 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              drag
              dragMomentum={false}
              onDragEnd={(event, info) => {
                const saved = localStorage.getItem('smart_sticky_notes_v2');
                if (saved) {
                  const allNotes = JSON.parse(saved);
                  const updated = allNotes.map((n: any) => n.id === note.id ? { ...n, pinnedX: (n.pinnedX || 0) + info.offset.x, pinnedY: (n.pinnedY || 0) + info.offset.y } : n);
                  localStorage.setItem('smart_sticky_notes_v2', JSON.stringify(updated));
                  window.dispatchEvent(new Event('sticky-notes-updated'));
                }
              }}
              className={`fixed top-32 left-8 z-[60] w-64 p-4 rounded-3xl shadow-2xl border backdrop-blur-md cursor-grab active:cursor-grabbing ${scheme.bg} ${scheme.border} ${scheme.text}`}
            >
              <div className="flex items-center justify-between border-b border-slate-900/10 dark:border-white/10 pb-2 mb-2 pointer-events-none">
                <span className="text-[10px] font-black tracking-widest flex items-center gap-1">
                  <Pin className="w-3 h-3 fill-current text-rose-500" />
                  ملاحظة مثبتة
                </span>
                <span className="text-[9px] font-bold opacity-60">اسحب للتحريك</span>
              </div>
              <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">{note.content || "ملاحظة فارغة..."}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Sticky Notes Sidebar Manager Drawer */}
      <StickyNotesBoard isOpen={isNotesOpen} onClose={() => setIsNotesOpen(false)} />
    </div>
  );
}

/* Action Button Component matching the Manager's structure */
function ActionBtn({ icon: Icon, label, onClick, color }: {
  icon: React.ElementType; label: string; onClick: () => void; color: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-black
        text-xs text-center transition-all min-h-[92px] ${color}`}
    >
      <div className="p-2 bg-white/15 rounded-xl shrink-0">
        <Icon className="w-5 h-5 text-current" />
      </div>
      <span className="leading-tight">{label}</span>
    </motion.button>
  );
}

interface DashboardCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  onClick?: () => void;
}

function DashboardCard({ title, value, subtitle, icon: Icon, color, onClick }: DashboardCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-3xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl shadow-slate-100/40 dark:shadow-none bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl overflow-hidden group cursor-pointer transition-all duration-300"
    >
      <CardContent className="p-6 flex flex-col justify-between h-full relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/15 transition-all duration-300" />
        
        <div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg bg-gradient-to-br ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1.5">{value}</h3>
          <p className="font-bold text-slate-500 dark:text-slate-400 text-xs">{title}</p>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 font-black flex items-center gap-1 group-hover:text-primary transition-colors border-t border-slate-100/50 dark:border-slate-800/50 pt-3">
          {subtitle} 
          <ChevronLeft className="w-3.5 h-3.5 mr-auto group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </motion.div>
  );
}

/* Synchronized Sticky Notes Board Drawer Component */
function StickyNotesBoard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('smart_sticky_notes_v2');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  const saveNotes = (newNotes: any[]) => {
    setNotes(newNotes);
    localStorage.setItem('smart_sticky_notes_v2', JSON.stringify(newNotes));
    window.dispatchEvent(new Event('sticky-notes-updated'));
  };

  const addNote = () => {
    saveNotes([{ id: Date.now().toString(), content: '', color: 'amber', createdAt: Date.now(), alertHours: 0 }, ...notes]);
  };

  const updateNote = (id: string, updates: any) => {
    saveNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id));
  };

  const colors = [
    { id: 'amber', bg: 'bg-amber-100 dark:bg-amber-950/60', border: 'border-amber-300 dark:border-amber-800', text: 'text-amber-900 dark:text-amber-100', head: 'text-amber-800' },
    { id: 'rose', bg: 'bg-rose-100 dark:bg-rose-950/60', border: 'border-rose-300 dark:border-rose-800', text: 'text-rose-900 dark:text-rose-100', head: 'text-rose-800' },
    { id: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-950/60', border: 'border-emerald-300 dark:border-emerald-800', text: 'text-emerald-900 dark:text-emerald-100', head: 'text-emerald-800' },
    { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-950/60', border: 'border-blue-300 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100', head: 'text-blue-800' },
    { id: 'violet', bg: 'bg-violet-100 dark:bg-violet-950/60', border: 'border-violet-300 dark:border-violet-800', text: 'text-violet-900 dark:text-violet-100', head: 'text-violet-800' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-full sm:w-[450px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl z-[90] flex flex-col"
            dir="rtl"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-amber-500 animate-bounce" /> الملاحظات اللاصقة
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">تزامن حقيقي وتلقائي مع كافة البوابات</p>
              </div>
              <div className="flex gap-2">
                <button onClick={addNote} className="h-9 px-3 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-600 transition font-black text-xs flex items-center gap-1">
                  <Plus className="w-4 h-4" /> ملصق جديد
                </button>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notes.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                  <StickyNote className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">لا توجد ملاحظات حالياً</p>
                </div>
              )}
              
              <Reorder.Group axis="y" values={notes} onReorder={saveNotes} className="space-y-4">
                {notes.map(note => {
                  const scheme = colors.find(c => c.id === note.color) || colors[0];
                  const isPinned = !!note.isPinned;

                  return (
                    <Reorder.Item 
                      key={note.id} 
                      value={note}
                      className={`rounded-2xl p-4 flex flex-col shadow-sm border ${scheme.bg} ${scheme.border} relative group cursor-grab active:cursor-grabbing`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {colors.map(c => (
                            <button 
                              key={c.id} 
                              onPointerDown={(e) => e.stopPropagation()} 
                              onClick={() => updateNote(note.id, { color: c.id })} 
                              className={`w-4 h-4 rounded-full border ${c.bg} ${note.color === c.id ? 'border-slate-800 dark:border-white' : 'border-transparent'}`} 
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => updateNote(note.id, { isPinned: !isPinned })} 
                            className={`p-1.5 rounded-lg transition ${isPinned ? 'text-rose-600 bg-rose-100/50' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={note.content}
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => updateNote(note.id, { content: e.target.value })}
                        placeholder="اكتب ملاحظة لاصقة جديدة..."
                        className={`w-full bg-transparent border-none outline-none text-xs font-bold leading-relaxed ${scheme.text} resize-none min-h-[70px]`}
                      />
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

