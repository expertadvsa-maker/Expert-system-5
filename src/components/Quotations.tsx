import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, Search, Filter, ArrowUpDown, Loader2, 
  CheckCircle2, Clock, XCircle, Plus, Bot 
} from "lucide-react";
import { toast } from "sonner";
import { fetchAliphiaQuotations } from "../lib/aliphia";
import AIQuotationBuilder from "./AIQuotationBuilder";
import SmartOfferBot from "./SmartOfferBot";
import { motion, AnimatePresence } from "motion/react";

export default function Quotations() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date-desc");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAliphiaQuotations();
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("فشل في جلب عروض الأسعار. يرجى التحقق من اتصال ألف ياء.");
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
    if (s === '3' || s === 'rejected' || s === 'مرفوضة' || s === 'declined') return { label: 'مرفوضة', color: 'bg-rose-100 text-rose-600 border-rose-200' };
    if (s === '4' || s === 'accepted' || s === 'مقبولة') return { label: 'مقبولة', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
    return { label: s || 'غير محدد', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Stats
  const totalQuotesCount = quotes.length;
  const acceptedQuotesCount = quotes.filter(q => {
    const s = String(q.quote_status_id || q.status).toLowerCase();
    return s === '4' || s === 'accepted' || s === 'مقبولة';
  }).length;
  const pendingQuotesCount = quotes.filter(q => {
    const s = String(q.quote_status_id || q.status).toLowerCase();
    return s === '1' || s === 'draft' || s === '2' || s === 'sent';
  }).length;
  const rejectedQuotesCount = quotes.filter(q => {
    const s = String(q.quote_status_id || q.status).toLowerCase();
    return s === '3' || s === 'rejected' || s === 'declined' || s === 'مرفوضة';
  }).length;

  const filteredQuotes = quotes.filter(quote => {
    const name = String(quote.client_name || quote.client?.name || '');
    const number = String(quote.quote_number || quote.number || '');
    const total = String(quote.quote_total || quote.total || '');
    
    const matchesSearch = matchSearchQuery(`${name} ${number} ${total}`, searchTerm);
    if (!matchesSearch) return false;

    if (statusFilter !== 'all') {
      const statusId = String(quote.quote_status_id || quote.status).toLowerCase();
      if (statusFilter === 'accepted' && !(statusId === '4' || statusId === 'accepted' || statusId === 'مقبولة')) return false;
      if (statusFilter === 'pending' && !(statusId === '1' || statusId === 'draft' || statusId === '2' || statusId === 'sent')) return false;
      if (statusFilter === 'rejected' && !(statusId === '3' || statusId === 'rejected' || statusId === 'declined' || statusId === 'مرفوضة')) return false;
    }

    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.quote_date_created || a.date || 0).getTime();
    const dateB = new Date(b.quote_date_created || b.date || 0).getTime();
    const totalA = parseFloat(a.quote_total || a.total || a.amount || 0);
    const totalB = parseFloat(b.quote_total || b.total || b.amount || 0);

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
            <FileText className="w-8 h-8 text-primary" />
          </div>

          <p className="text-slate-500 font-bold mt-2 text-sm max-w-xl leading-relaxed">
            مساحة إدارة عروض الأسعار، والمقترحات الفنية. مدعومة بالذكاء الاصطناعي لمساعدتك في التسعير.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchData} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white font-bold text-slate-600 shadow-sm" disabled={isLoading}>
            <Loader2 className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <TabsTrigger value="list" className="rounded-xl font-bold py-2 px-6 text-sm gap-2">
            <FileText className="w-4 h-4" /> قائمة العروض
          </TabsTrigger>
          <TabsTrigger value="builder" className="rounded-xl font-bold py-2 px-6 text-sm gap-2">
            <Plus className="w-4 h-4" /> باني الوثائق والمقترحات
          </TabsTrigger>
          <TabsTrigger value="ai_bot" className="rounded-xl font-bold py-2 px-6 text-sm gap-2">
            <Bot className="w-4 h-4" /> المساعد الذكي للتسعير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 animate-in fade-in duration-300">
          {/* ── Stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{totalQuotesCount}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">إجمالي العروض</p>
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
                <h3 className="text-3xl font-black text-emerald-700">{acceptedQuotesCount}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">عروض مقبولة</p>
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
                <h3 className="text-3xl font-black text-amber-700">{pendingQuotesCount}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">معلقة / مسودة</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-rose-700">{rejectedQuotesCount}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">عروض مرفوضة</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Controls ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="ابحث باسم العميل أو رقم العرض..." 
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
                    <SelectItem value="all">كل العروض</SelectItem>
                    <SelectItem value="accepted">المقبولة</SelectItem>
                    <SelectItem value="pending">المعلقة</SelectItem>
                    <SelectItem value="rejected">المرفوضة</SelectItem>
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

          {/* ── Quotes List ── */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
              <p className="font-bold text-sm animate-pulse">جاري جلب العروض...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-700 mb-1">لا يوجد عروض أسعار</h3>
              <p className="text-slate-500 text-sm font-bold">لم يتم العثور على عروض تطابق بحثك أو قد تكون القائمة فارغة</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-bold">
                    <tr>
                      <th className="px-6 py-4 rounded-tr-3xl">رقم العرض</th>
                      <th className="px-6 py-4">العميل</th>
                      <th className="px-6 py-4">التاريخ</th>
                      <th className="px-6 py-4">المبلغ الإجمالي</th>
                      <th className="px-6 py-4 rounded-tl-3xl">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {filteredQuotes.map((quote, index) => {
                        const status = getStatusInfo(quote.quote_status_id || quote.status);
                        const total = parseFloat(quote.quote_total || quote.total || 0);
                        
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            key={quote.id} 
                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          >
                            <td className="px-6 py-4 font-black text-slate-800">
                              {quote.quote_number || quote.number || `#${quote.id}`}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700">
                              {quote.client_name || quote.client?.name || 'غير معروف'}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-bold text-xs">
                              {quote.quote_date_created || quote.date}
                            </td>
                            <td className="px-6 py-4 font-black text-slate-900">
                              {total.toLocaleString()} ر.س
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
        </TabsContent>

        <TabsContent value="builder" className="animate-in fade-in duration-300">
           <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
             <CardContent className="p-0">
               <AIQuotationBuilder type="quotation" />
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="ai_bot" className="animate-in fade-in duration-300">
           <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
             <CardContent className="p-0">
               <SmartOfferBot />
             </CardContent>
           </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
