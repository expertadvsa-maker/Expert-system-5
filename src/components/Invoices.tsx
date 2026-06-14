import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Receipt, Search, Filter, ArrowUpDown, Loader2, 
  CheckCircle2, Clock, AlertTriangle, FileText, Plus 
} from "lucide-react";
import { toast } from "sonner";
import { fetchAliphiaInvoices } from "../lib/aliphia";
import AIQuotationBuilder from "./AIQuotationBuilder";
import { motion, AnimatePresence } from "motion/react";

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-desc");
  const [showDocBuilder, setShowDocBuilder] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAliphiaInvoices();
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("فشل في جلب الفواتير. يرجى التحقق من اتصال ألف ياء.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeArabicText = (text: string): string => {
    if (!text) return '';
    return text.toLowerCase().replace(/[أإآا]/g, 'ا').replace(/[ةه]/g, 'ه').replace(/[ىي]/g, 'ي').trim();
  };

  const matchSearchQuery = (text: string, query: string) => {
    if (!query) return true;
    const normalizedText = normalizeArabicText(text);
    const normalizedQuery = normalizeArabicText(query);
    const keywords = normalizedQuery.split(' ').filter(k => k.trim() !== '');
    return keywords.every(kw => normalizedText.includes(kw));
  };

  const getStatusInfo = (status: string | number) => {
    const s = String(status).toLowerCase();
    if (s === '1' || s === 'draft' || s === 'مسودة') return { label: 'مسودة', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (s === '2' || s === 'sent' || s === 'مرسلة') return { label: 'مرسلة', color: 'bg-blue-100 text-blue-600 border-blue-200' };
    if (s === '3' || s === 'viewed' || s === 'شوهدت') return { label: 'شوهدت', color: 'bg-indigo-100 text-indigo-600 border-indigo-200' };
    if (s === '4' || s === 'paid' || s === 'مدفوعة') return { label: 'مدفوعة', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
    if (s === '5' || s === 'overdue' || s === 'متأخرة') return { label: 'متأخرة', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    if (s === '6' || s === 'unpaid' || s === 'غير مدفوعة') return { label: 'غير مدفوعة', color: 'bg-amber-100 text-amber-600 border-amber-200' };
    return { label: s || 'غير محدد', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Stats
  const totalInvoicesCount = invoices.length;
  const paidInvoicesCount = invoices.filter(i => {
    const s = String(i.invoice_status_id || i.status).toLowerCase();
    return s === '4' || s === 'paid' || s === 'مدفوعة';
  }).length;
  const pendingInvoicesCount = invoices.filter(i => {
    const s = String(i.invoice_status_id || i.status).toLowerCase();
    return s === '2' || s === 'sent' || s === '6' || s === 'unpaid' || s === '1' || s === 'draft';
  }).length;
  const overdueInvoicesCount = invoices.filter(i => {
    const s = String(i.invoice_status_id || i.status).toLowerCase();
    return s === '5' || s === 'overdue' || s === 'متأخرة';
  }).length;

  const filteredInvoices = invoices.filter(inv => {
    const name = String(inv.client_name || inv.client?.name || '');
    const number = String(inv.invoice_number || inv.number || '');
    const total = String(inv.invoice_total || inv.total || '');
    
    const matchesSearch = matchSearchQuery(`${name} ${number} ${total}`, searchTerm);
    if (!matchesSearch) return false;

    if (statusFilter !== 'all') {
      const statusId = String(inv.invoice_status_id || inv.status).toLowerCase();
      if (statusFilter === 'paid' && !(statusId === '4' || statusId === 'paid' || statusId === 'مدفوعة')) return false;
      if (statusFilter === 'unpaid' && !(statusId === '2' || statusId === 'sent' || statusId === '6' || statusId === 'unpaid' || statusId === '1' || statusId === 'draft')) return false;
      if (statusFilter === 'overdue' && !(statusId === '5' || statusId === 'overdue' || statusId === 'متأخرة')) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.invoice_date_created || a.date || 0).getTime();
    const dateB = new Date(b.invoice_date_created || b.date || 0).getTime();
    const totalA = parseFloat(a.invoice_total || a.total || a.amount || 0);
    const totalB = parseFloat(b.invoice_total || b.total || b.amount || 0);

    if (sortOrder === 'date-asc') return dateA - dateB;
    if (sortOrder === 'date-desc') return dateB - dateA;
    if (sortOrder === 'amount-asc') return totalA - totalB;
    if (sortOrder === 'amount-desc') return totalB - totalA;
    return dateB - dateA;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 min-h-screen bg-slate-50/50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl mb-4 shadow-inner">
            <Receipt className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">إدارة الفواتير</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm max-w-xl leading-relaxed">
            استعرض فواتيرك الصادرة من منصة ألف ياء، تابع المدفوعات والمديونيات بشكل فوري، وأصدر فواتير جديدة بالذكاء الاصطناعي.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchData} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white font-bold text-slate-600 shadow-sm" disabled={isLoading}>
            <Loader2 className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
          <Button onClick={() => setShowDocBuilder(true)} className="h-12 px-6 rounded-2xl font-bold text-white shadow-md bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 ml-2" />
            إصدار فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{totalInvoicesCount}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">إجمالي الفواتير</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-emerald-700">{paidInvoicesCount}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">فواتير مدفوعة</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-amber-700">{pendingInvoicesCount}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">غير مدفوعة / معلقة</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-rose-700">{overdueInvoicesCount}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">فواتير متأخرة</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="ابحث باسم العميل أو رقم الفاتورة..." 
            className="pl-4 pr-12 h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-sm focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-sm min-w-[160px]">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold">
                <SelectItem value="all">كل الفواتير</SelectItem>
                <SelectItem value="paid">المدفوعة فقط</SelectItem>
                <SelectItem value="unpaid">الغير مدفوعة</SelectItem>
                <SelectItem value="overdue">المتأخرة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold text-sm min-w-[160px]">
                <SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent className="rounded-xl font-bold">
                <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
                <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
                <SelectItem value="amount-desc">المبلغ (الأعلى)</SelectItem>
                <SelectItem value="amount-asc">المبلغ (الأقل)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Invoices List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="font-bold text-sm animate-pulse">جاري جلب الفواتير...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-700 mb-1">لا يوجد فواتير</h3>
          <p className="text-slate-500 text-sm font-bold">لم يتم العثور على فواتير تطابق بحثك أو قد تكون القائمة فارغة</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-bold">
                <tr>
                  <th className="px-6 py-4 rounded-tr-3xl">رقم الفاتورة</th>
                  <th className="px-6 py-4">العميل</th>
                  <th className="px-6 py-4">التاريخ</th>
                  <th className="px-6 py-4">المبلغ الإجمالي</th>
                  <th className="px-6 py-4">المتبقي</th>
                  <th className="px-6 py-4 rounded-tl-3xl">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence>
                  {filteredInvoices.map((inv, index) => {
                    const status = getStatusInfo(inv.invoice_status_id || inv.status);
                    const total = parseFloat(inv.invoice_total || inv.total || 0);
                    const balance = parseFloat(inv.invoice_balance || inv.balance || 0);
                    
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        key={inv.id} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 font-black text-slate-800">
                          {inv.invoice_number || inv.number || `#${inv.id}`}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          {inv.client_name || inv.client?.name || 'غير معروف'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-bold text-xs">
                          {inv.invoice_date_created || inv.date}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {total.toLocaleString()} ر.س
                        </td>
                        <td className="px-6 py-4 font-black">
                          {balance > 0 ? (
                            <span className="text-rose-600">{balance.toLocaleString()} ر.س</span>
                          ) : (
                            <span className="text-emerald-500 text-xs">0.00 ر.س</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`${status.color} font-bold px-3 py-1 rounded-lg border`}>
                            {status.label}
                          </Badge>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Document Builder Modal ── */}
      <Dialog open={showDocBuilder} onOpenChange={setShowDocBuilder}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl" dir="rtl">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10 sticky top-0">
            <div>
               <h2 className="text-xl font-black text-slate-800">إصدار فاتورة جديدة</h2>
               <p className="text-xs font-bold text-slate-500 mt-1">يمكنك تفعيل الذكاء الاصطناعي لتعبئة البنود تلقائياً</p>
            </div>
            <Button onClick={() => setShowDocBuilder(false)} variant="ghost" className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200">X</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50">
             <AIQuotationBuilder type="invoice" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
