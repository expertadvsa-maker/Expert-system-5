import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Folder, Users, LayoutDashboard, Settings, FileText, ArrowLeft, Loader2, Target, Briefcase, ShoppingCart, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, getDocs, limit, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
}

const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: LayoutDashboard, category: 'navigation' },
  { id: 'projects', label: 'سجل المشاريع', icon: Folder, category: 'navigation' },
  { id: 'tasks', label: 'المهام', icon: Target, category: 'navigation' },
  { id: 'employees', label: 'الموظفين', icon: Users, category: 'navigation' },
  { id: 'sales', label: 'المبيعات', icon: Activity, category: 'navigation' },
  { id: 'purchases', label: 'المشتريات', icon: ShoppingCart, category: 'navigation' },
  { id: 'settings', label: 'الإعدادات العامة', icon: Settings, category: 'navigation' },
];

export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // the parent handles opening, but since we are inside we can't open ourselves.
          // Wait, the parent will listen to Cmd+K to open it. This component just closes on Esc.
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const performSearch = async () => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const searchResults: any[] = [];

      // 1. Search Navigation
      const navMatches = NAVIGATION_ITEMS.filter(item => 
        item.label.toLowerCase().includes(q)
      );
      if (navMatches.length > 0) {
        searchResults.push(...navMatches);
      }

      try {
        const collectionsToSearch = [
          { name: 'projects', icon: Briefcase, color: 'indigo', tab: 'projects' },
          { name: 'users', icon: Users, color: 'blue', tab: 'employees' },
          { name: 'tasks', icon: Target, color: 'emerald', tab: 'tasks' },
          { name: 'sales', icon: Activity, color: 'amber', tab: 'sales' },
          { name: 'purchases', icon: ShoppingCart, color: 'rose', tab: 'purchases' },
          { name: 'inventory', icon: Folder, color: 'cyan', tab: 'inventory' },
          { name: 'expenses', icon: FileText, color: 'red', tab: 'expenses' },
          { name: 'subcontractors', icon: Users, color: 'purple', tab: 'subcontractors' },
        ];

        if (profile?.role === 'manager' || profile?.role === 'supervisor') {
          const promises = collectionsToSearch.map(async (colInfo) => {
            try {
              const colRef = collection(db, colInfo.name);
              // Fetch up to 50 recent docs per collection to avoid massive reads
              // We don't order by createdAt because some collections might not have it, 
              // but we limit to keep it fast.
              const colQuery = query(colRef, limit(50));
              const snapshot = await getDocs(colQuery);
              
              snapshot.forEach(doc => {
                const data = doc.data();
                // Dynamic deep search: check if ANY string value in the document contains the query
                let foundMatch = false;
                let matchPreview = '';
                let mainTitle = data.title || data.name || data.clientName || data.supplierName || data.itemName || data.id;

                const searchInObject = (obj: any) => {
                  if (foundMatch) return;
                  for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'string') {
                      if (val.toLowerCase().includes(q)) {
                        foundMatch = true;
                        // If it's not the main title, show a snippet
                        if (val !== mainTitle && val.length > 3) {
                          matchPreview = val.length > 50 ? val.substring(0, 50) + '...' : val;
                        }
                        break;
                      }
                    } else if (typeof val === 'object' && val !== null) {
                      searchInObject(val);
                    }
                  }
                };

                searchInObject(data);

                if (foundMatch) {
                  searchResults.push({
                    id: doc.id,
                    label: mainTitle || 'سجل بدون اسم',
                    subLabel: matchPreview ? `تم إيجاد "${q}" في: ${matchPreview}` : (data.role || data.status || 'سجل متوافق'),
                    icon: colInfo.icon,
                    category: colInfo.name,
                    color: colInfo.color,
                    action: () => onNavigate(colInfo.tab)
                  });
                }
              });
            } catch (e) {
              console.warn(`Error searching collection ${colInfo.name}`, e);
            }
          });

          await Promise.all(promises);
        }
      } catch (err) {
        console.error("Search error:", err);
      }

      // Sort results to show exact matches first, then limit to 20
      searchResults.sort((a, b) => {
        const aExact = a.label.toLowerCase().startsWith(q) ? -1 : 1;
        const bExact = b.label.toLowerCase().startsWith(q) ? -1 : 1;
        return aExact - bExact;
      });

      setResults(searchResults.slice(0, 20));
      setIsSearching(false);
    };

    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, profile]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
          dir="rtl"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-zinc-800">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="ابحث عن مشروع، عميل، موظف، أو صفحة في النظام..."
              className="flex-1 px-4 bg-transparent outline-none text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700">ESC</span>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
            {!searchTerm ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400">
                <Search className="w-12 h-12 text-slate-200 dark:text-zinc-800 mb-4" />
                <p className="font-bold text-slate-500">ابدأ الكتابة للبحث في جميع أنحاء النظام</p>
                <p className="text-xs mt-1 text-slate-400">يمكنك البحث عن أقسام، مشاريع، أو أسماء موظفين</p>
              </div>
            ) : results.length === 0 && !isSearching ? (
              <div className="py-12 text-center text-slate-500">
                <p>لم نجد أي نتائج تتطابق مع "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, idx) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (result.action) {
                          result.action();
                        } else {
                          onNavigate(result.id);
                        }
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors group text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          result.category === 'navigation' ? 'bg-primary/10 text-primary' :
                          result.category === 'project' ? 'bg-indigo-500/10 text-indigo-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-zinc-200 group-hover:text-primary transition-colors">
                            {result.label}
                          </p>
                          {result.subLabel && (
                            <p className="text-xs text-slate-500">{result.subLabel}</p>
                          )}
                        </div>
                      </div>
                      <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
