import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, User, Search, Phone, Mail, FileText, 
  Receipt, ArrowUpRight, Loader2, Sparkles, Plus,
  MapPin, CheckCircle2, TrendingUp, Download, Building2,
  AlertTriangle, Crown, MessageSquare, Copy, Send, X,
  Clock, BarChart3, ShieldAlert, Sparkle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { fetchAliphiaClients, fetchAliphiaInvoices, fetchAliphiaQuotations } from "../lib/aliphia";
import AIQuotationBuilder from "./AIQuotationBuilder";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateClientInsights } from "../lib/gemini";

function fmtNum(n: number): string {
  if (!isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const normalizeArabicText = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase().replace(/[أإآا]/g, 'ا').replace(/[ةه]/g, 'ه').replace(/[ىي]/g, 'ي').trim();
};

export default function Clients({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'with_invoices', 'no_contact', 'debtors', 'vip'
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);

  // AI Insights States
  const [aiPortfolioSummary, setAiPortfolioSummary] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiSummaryPanel, setShowAiSummaryPanel] = useState(false);

  // Client AI Tool States
  const [activeClientTab, setActiveClientTab] = useState<"financials" | "transactions" | "ai_helper">("financials");
  const [aiToolType, setAiToolType] = useState<"pitch" | "debt_collection" | null>(null);
  const [aiGeneratedText, setAiGeneratedText] = useState("");
  const [isAiToolLoading, setIsAiToolLoading] = useState(false);

  // Smart Modal States
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDocBuilder, setShowDocBuilder] = useState<'quotation' | 'invoice' | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedClients, fetchedInvoices, fetchedQuotes] = await Promise.all([
        fetchAliphiaClients(),
        fetchAliphiaInvoices(),
        fetchAliphiaQuotations()
      ]);

      let finalClients = fetchedClients || [];
      let finalInvoices = fetchedInvoices || [];
      let finalQuotes = fetchedQuotes || [];

      if (profile?.role === 'sales_rep') {
        const [quotesSnap, invoicesSnap, jobsSnap] = await Promise.all([
          getDocs(query(collection(db, 'quotations'), where('salesRepId', '==', profile.uid))),
          getDocs(query(collection(db, 'invoices'), where('salesRepId', '==', profile.uid))),
          getDocs(query(collection(db, 'rep_private_jobs'), where('salesRepId', '==', profile.uid)))
        ]);

        const allowedClientIds = new Set<string>();
        const allowedClientNames = new Set<string>();

        quotesSnap.forEach(doc => {
          const d = doc.data();
          if (d.clientId) allowedClientIds.add(String(d.clientId));
          if (d.clientName) allowedClientNames.add(normalizeArabicText(d.clientName));
        });

        invoicesSnap.forEach(doc => {
          const d = doc.data();
          if (d.clientId) allowedClientIds.add(String(d.clientId));
          if (d.clientName) allowedClientNames.add(normalizeArabicText(d.clientName));
        });

        jobsSnap.forEach(doc => {
          const d = doc.data();
          if (d.clientName) allowedClientNames.add(normalizeArabicText(d.clientName));
        });

        finalClients = finalClients.filter((c: any) => 
          allowedClientIds.has(String(c.id)) || 
          allowedClientNames.has(normalizeArabicText(c.name))
        );

        const activeClientIds = new Set<string>(finalClients.map((c: any) => String(c.id)));

        finalInvoices = finalInvoices.filter((inv: any) => 
          activeClientIds.has(String(inv.client_id))
        );

        finalQuotes = finalQuotes.filter((q: any) => 
          activeClientIds.has(String(q.client_id))
        );
      }

      setClients(finalClients);
      setInvoices(finalInvoices);
      setQuotes(finalQuotes);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("فشل في جلب بيانات العملاء. يرجى التحقق من اتصال ألف ياء.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const getClientFinancials = (clientId: string) => {
    const clientInvoices = invoices.filter(inv => String(inv.client_id) === String(clientId));
    const clientQuotes = quotes.filter(q => String(q.client_id) === String(clientId));
    
    const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoice_total || inv.total || 0), 0);
    const totalPaid = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoice_paid || inv.paid || 0), 0);
    const balance = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoice_balance || inv.balance || 0), 0);

    return { clientInvoices, clientQuotes, totalInvoiced, totalPaid, balance };
  };

  const filteredClients = clients.filter(c => {
    const name = String(c.name || '');
    const phone = String(c.phone || '');
    const email = String(c.email || '');
    
    const normalizedQuery = normalizeArabicText(searchTerm);
    const matchSearch = !normalizedQuery || 
      normalizeArabicText(name).includes(normalizedQuery) ||
      phone.includes(searchTerm) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());

    const financials = getClientFinancials(c.id);

    let matchFilter = true;
    if (filterType === 'with_invoices') {
      matchFilter = financials.clientInvoices.length > 0;
    } else if (filterType === 'no_contact') {
      matchFilter = !c.phone && !c.email;
    } else if (filterType === 'debtors') {
      matchFilter = financials.balance > 0;
    } else if (filterType === 'vip') {
      matchFilter = financials.totalInvoiced >= 50000;
    }

    return matchSearch && matchFilter;
  });

  // Calculate high-premium client dashboard metrics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => getClientFinancials(c.id).clientInvoices.length > 0).length;
  const debtorClients = clients.filter(c => getClientFinancials(c.id).balance > 0).length;
  const totalOutstandingDebts = clients.reduce((sum, c) => sum + getClientFinancials(c.id).balance, 0);
  const vipClients = clients.filter(c => getClientFinancials(c.id).totalInvoiced >= 50000).length;

  const activePercentage = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
  const debtorPercentage = totalClients > 0 ? (debtorClients / totalClients) * 100 : 0;

  // Run AI analysis on entire portfolio
  const handleAnalyzePortfolio = async () => {
    if (clients.length === 0) {
      toast.error("لا يوجد عملاء كافيين لتحليل محفظة المبيعات.");
      return;
    }
    setIsAiLoading(true);
    setShowAiSummaryPanel(true);
    setAiPortfolioSummary("");
    try {
      const summaryData = clients.map(c => {
        const fin = getClientFinancials(c.id);
        return {
          id: c.id,
          name: c.name,
          totalInvoiced: fin.totalInvoiced,
          balance: fin.balance,
          invoicesCount: fin.clientInvoices.length
        };
      });

      const responseText = await generateClientInsights("summary", {
        summary: {
          totalClients,
          activeClients,
          debtorClients,
          totalOutstandingDebts,
          vipClients
        },
        clients: summaryData
      });
      setAiPortfolioSummary(responseText);
    } catch (e: any) {
      console.error(e);
      toast.error("فشل المساعد الذكي في تحليل المحفظة.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Run AI Tool inside Client Dialog
  const handleGenerateClientAITool = async (type: "pitch" | "debt_collection") => {
    if (!selectedClient) return;
    setIsAiToolLoading(true);
    setAiToolType(type);
    setAiGeneratedText("");
    try {
      const fin = getClientFinancials(selectedClient.id);
      const payload = {
        name: selectedClient.name,
        phone: selectedClient.phone,
        email: selectedClient.email,
        totalInvoiced: fin.totalInvoiced,
        balance: fin.balance,
        lastInvoices: fin.clientInvoices.slice(0, 3).map(inv => ({
          number: inv.invoice_number || inv.number,
          total: inv.invoice_total || inv.total,
          balance: inv.invoice_balance || inv.balance
        }))
      };
      const text = await generateClientInsights(type, payload);
      setAiGeneratedText(text);
    } catch (error) {
      console.error(error);
      toast.error("فشل توليد النص الذكي.");
    } finally {
      setIsAiToolLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص الذكي إلى الحافظة!");
  };

  const sendWhatsApp = (phone: string, text: string) => {
    if (!phone) {
      toast.error("هذا العميل لا يمتلك رقم جوال مسجل.");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    // Ensure country code is added if missing (e.g. Saudi Arabia 966)
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith("05")) {
      formattedPhone = "966" + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith("5")) {
      formattedPhone = "966" + formattedPhone;
    }
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 min-h-screen bg-slate-50/30 text-right relative overflow-hidden" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* ── Background Aesthetics ── */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-accent/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center p-2.5 bg-primary/10 rounded-xl">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              دليل العملاء والتحصيل الذكي
            </h1>
            <p className="text-slate-400 font-bold text-[10px]">
              تتبع المديونيات وأدوات تواصل المساعد الذكي
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAnalyzePortfolio} 
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-indigo-600/10 border-0 flex items-center gap-1.5 text-xs group transition-all"
            disabled={isLoading || isAiLoading}
          >
            <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
            تحليل المحفظة (AI)
          </Button>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            className="h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-600 shadow-sm flex items-center gap-1.5 text-xs" 
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* ── AI Portfolio Insights Panel ── */}
      <AnimatePresence>
        {showAiSummaryPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="rounded-[2rem] border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/30 shadow-xl shadow-indigo-600/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 border-b border-violet-100/80 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-600 text-white rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-violet-950">تحليل محفظة العملاء الذكي</h3>
                      <p className="text-[10px] font-bold text-violet-500">تم التحليل بواسطة نماذج Gemini 2.5 Pro</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowAiSummaryPanel(false)} 
                    className="h-8 w-8 p-0 rounded-full hover:bg-violet-100/50"
                  >
                    <X className="w-4 h-4 text-violet-700" />
                  </Button>
                </div>

                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-violet-600 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-bold text-sm animate-pulse">جاري صياغة قراءة استراتيجية لبيانات المحفظة...</p>
                  </div>
                ) : (
                  <div className="text-right text-slate-700 leading-relaxed text-sm whitespace-pre-wrap font-bold bg-white/60 p-5 rounded-2xl border border-violet-100 max-h-[350px] overflow-y-auto custom-scrollbar">
                    {aiPortfolioSummary}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── High-Premium Stats Grid (5 Status Cards - Compact, Elegant & Clickable) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Clients */}
        <Card 
          onClick={() => setFilterType("all")}
          className={`rounded-2xl border shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${
            filterType === 'all' ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-100/80'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-12 h-0.5 bg-gradient-to-l from-primary to-accent" />
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <Badge variant="secondary" className="font-bold text-[9px] bg-slate-50 text-slate-500 border-0 px-1.5 py-0 shrink-0">نشط ومراقب</Badge>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 leading-none">{fmtNum(totalClients)}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">إجمالي عملاء المندوب</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Clients */}
        <Card 
          onClick={() => setFilterType("with_invoices")}
          className={`rounded-2xl border shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${
            filterType === 'with_invoices' ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/10' : 'border-slate-100/80'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-12 h-0.5 bg-emerald-500" />
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50/80 flex items-center justify-center shadow-inner shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <Badge className="font-bold text-[9px] bg-emerald-50 text-emerald-600 border-0 px-1.5 py-0 shrink-0">
                {fmtNum(activePercentage)}%
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 leading-none">{fmtNum(activeClients)}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">عملاء نشطون مالياً</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${activePercentage}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Premium Partners (Most Active Clients) */}
        <Card 
          onClick={() => setFilterType("vip")}
          className={`rounded-2xl border shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${
            filterType === 'vip' ? 'border-violet-600 ring-2 ring-violet-600/10 bg-violet-50/10' : 'border-slate-100/80'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-12 h-0.5 bg-violet-600" />
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shadow-inner shrink-0">
                <Crown className="w-4 h-4 text-violet-600" />
              </div>
              <Badge className="font-bold text-[9px] bg-violet-50 text-violet-600 border-0 px-1.5 py-0 shrink-0">نشط جداً</Badge>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 leading-none">{fmtNum(vipClients)}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">العملاء الأكثر نشاطاً</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Debtor Clients */}
        <Card 
          onClick={() => setFilterType("debtors")}
          className={`rounded-2xl border shadow-sm bg-white overflow-hidden relative group hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] ${
            filterType === 'debtors' ? 'border-amber-500 ring-2 ring-amber-500/10 bg-amber-50/10' : 'border-slate-100/80'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-12 h-0.5 bg-amber-500" />
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shadow-inner shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <Badge className="font-bold text-[9px] bg-amber-50 text-amber-600 border-0 px-1.5 py-0 shrink-0">{fmtNum(debtorPercentage)}%</Badge>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 leading-none">{fmtNum(debtorClients)}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">عملاء مدينون</p>
              <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${debtorPercentage}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Total Outstanding Balance (Opens detailed modal) */}
        <Card 
          onClick={() => setIsDebtModalOpen(true)}
          className="rounded-2xl border border-rose-100/60 shadow-sm bg-gradient-to-br from-white via-white to-rose-50/30 overflow-hidden relative group hover:shadow-md transition-all duration-300 col-span-2 lg:col-span-1 cursor-pointer active:scale-[0.98] hover:border-rose-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-12 h-0.5 bg-rose-500" />
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shadow-inner shrink-0">
                <Receipt className="w-4 h-4 text-rose-600" />
              </div>
              <Badge className="font-bold text-[9px] bg-rose-500 text-white border-0 px-1.5 py-0 shrink-0">تحصيل فوري (نافذة)</Badge>
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-600 leading-none">{fmtNum(totalOutstandingDebts)} <span className="text-[10px] font-bold text-slate-500">ر.س</span></h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1">إجمالي مديونيات المحفظة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search and Advanced Filter Controls (Perfect Alignment & Matching Height) ── */}
      <div className="flex flex-col md:flex-row items-stretch gap-3 bg-white/60 p-3 rounded-2xl border border-slate-100 shadow-sm backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="ابحث بالاسم، رقم الجوال، أو البريد الإلكتروني..." 
            className="pl-4 pr-11 h-12 rounded-xl border-slate-100 bg-white font-bold text-xs focus-visible:ring-primary/20 shadow-inner w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="!h-12 rounded-xl border-slate-100 bg-white font-bold text-xs min-w-[240px] shadow-sm text-slate-700 text-right flex flex-row-reverse items-center justify-between px-4 gap-2" dir="rtl">
            <span className="text-right w-full block">
              {filterType === 'all' && `كل عملاء المحفظة (${fmtNum(totalClients)})`}
              {filterType === 'with_invoices' && `لديهم معاملات مالية (${fmtNum(activeClients)})`}
              {filterType === 'debtors' && `العملاء المدينون فقط (${fmtNum(debtorClients)})`}
              {filterType === 'vip' && `العملاء الأكثر نشاطاً (${fmtNum(vipClients)})`}
              {filterType === 'no_contact' && 'بدون بيانات اتصال'}
            </span>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100">
            <SelectItem value="all" className="font-bold text-xs">كل عملاء المحفظة ({fmtNum(totalClients)})</SelectItem>
            <SelectItem value="with_invoices" className="font-bold text-xs">لديهم معاملات مالية ({fmtNum(activeClients)})</SelectItem>
            <SelectItem value="debtors" className="font-bold text-xs">العملاء المدينون فقط ({fmtNum(debtorClients)})</SelectItem>
            <SelectItem value="vip" className="font-bold text-xs">العملاء الأكثر نشاطاً ({fmtNum(vipClients)})</SelectItem>
            <SelectItem value="no_contact" className="font-bold text-xs">بدون بيانات اتصال</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Clients Grid List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
          <p className="font-bold text-sm animate-pulse">جاري استيراد عملاء المندوب الآمنين من ألف ياء...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Users className="w-16 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-slate-800 mb-1">لا يوجد عملاء يطابقون الفلاتر</h3>
          <p className="text-slate-500 text-sm font-bold">يرجى تعديل خيارات التصفية أو البحث بالاسم والبيانات المسجلة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredClients.map((client, index) => {
              const { clientInvoices, totalInvoiced, balance } = getClientFinancials(client.id);
              const isVIP = totalInvoiced >= 50000;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.015 }}
                  key={client.id}
                >
                  <Card 
                    className="rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden group bg-white relative flex flex-col justify-between h-full"
                    onClick={() => {
                      setSelectedClient(client);
                      setIsModalOpen(true);
                      setActiveClientTab("financials");
                      setAiToolType(null);
                      setAiGeneratedText("");
                    }}
                  >
                    {/* Glowing Top Indicator */}
                    <div className={`h-2 w-full transition-colors ${
                      balance > 0 ? "bg-amber-400 group-hover:bg-rose-500" : isVIP ? "bg-violet-500" : "bg-slate-100 group-hover:bg-primary"
                    }`} />
                    
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-lg transition-colors ${
                              isVIP ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary"
                            }`}>
                              {client.name?.charAt(0) || <User className="w-5 h-5" />}
                            </div>
                            <div>
                              <h3 className="font-black text-slate-900 text-sm line-clamp-1 flex items-center gap-1" title={client.name}>
                                {client.name}
                                {isVIP && <Crown className="w-3.5 h-3.5 text-violet-600 inline" />}
                              </h3>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">الرقم المرجعي: #{client.id}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span dir="ltr">{client.phone || "غير مسجل"}</span>
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="line-clamp-1">{client.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 mb-0.5">حجم المعاملات</p>
                            <p className="font-black text-emerald-600 text-xs">{fmtNum(totalInvoiced)} ر.س</p>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-bold text-slate-400 mb-0.5">عدد الفواتير</p>
                            <p className="font-black text-slate-800 text-xs">{fmtNum(clientInvoices.length)} فواتير</p>
                          </div>
                        </div>

                        {balance > 0 ? (
                          <div className="bg-rose-50/80 rounded-2xl p-2.5 flex items-center justify-between text-xs font-bold text-rose-600 border border-rose-100">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>مستحقات معلقة:</span>
                            </div>
                            <span className="font-black">{fmtNum(balance)} ر.س</span>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-2xl p-2.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                            <span>لا توجد أي مستحقات معلقة</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Premium Client Dashboard Dialog ── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="w-[95vw] sm:!max-w-xl md:!max-w-3xl lg:!max-w-5xl xl:!max-w-6xl p-0 overflow-hidden bg-slate-50 h-[92vh] flex flex-col rounded-[2rem] border-0 shadow-2xl text-right" dir="rtl">
          {selectedClient && (
            <>
              {/* Modal Header */}
              <div className="bg-white border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      {selectedClient.name}
                      {getClientFinancials(selectedClient.id).balance > 0 && (
                        <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse relative top-0.5" title="مطلوب تحصيل سداد فوري" />
                      )}
                    </h2>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{selectedClient.phone || "غير مسجل"}</span>
                      </p>
                      {selectedClient.email && (
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedClient.email}</span>
                        </p>
                      )}
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Badge variant="outline" className="font-bold border-slate-200">الرقم المرجعي: {selectedClient.id}</Badge>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowDocBuilder("quotation")}
                    variant="outline" 
                    className="rounded-xl h-11 border-primary/20 text-primary hover:bg-primary/5 font-bold text-xs shadow-sm"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    عرض سعر جديد
                  </Button>
                  <Button 
                    onClick={() => setShowDocBuilder("invoice")}
                    className="rounded-xl h-11 bg-primary text-white hover:bg-primary/90 shadow-md font-bold text-xs"
                  >
                    <Receipt className="w-4 h-4 ml-2" />
                    فاتورة جديدة
                  </Button>
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="bg-white border-b border-slate-100 px-6 flex items-center gap-4">
                <button
                  onClick={() => setActiveClientTab("financials")}
                  className={`py-3 px-1 font-black text-sm border-b-2 transition-all flex items-center gap-1.5 ${
                    activeClientTab === "financials" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  الملخص المالي والتحليل
                </button>
                <button
                  onClick={() => setActiveClientTab("transactions")}
                  className={`py-3 px-1 font-black text-sm border-b-2 transition-all flex items-center gap-1.5 ${
                    activeClientTab === "transactions" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  سجل المعاملات المباشر
                </button>
                <button
                  onClick={() => setActiveClientTab("ai_helper")}
                  className={`py-3 px-1 font-black text-sm border-b-2 transition-all flex items-center gap-1.5 text-violet-600 ${
                    activeClientTab === "ai_helper" ? "border-violet-600" : "border-transparent text-violet-400 hover:text-violet-700"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  المساعد الذكي (AI)
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {activeClientTab === "financials" && (
                  <div className="space-y-6">
                    {/* Financial Stats Cards */}
                    {(() => {
                      const { totalInvoiced, totalPaid, balance, clientInvoices, clientQuotes } = getClientFinancials(selectedClient.id);
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card className="rounded-2xl border-0 shadow-sm bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                <Receipt className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">عدد الفواتير الصادرة</p>
                                <p className="text-lg font-black text-slate-800">{fmtNum(clientInvoices.length)} فواتير</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="rounded-2xl border-0 shadow-sm bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">إجمالي التعاملات</p>
                                <p className="text-lg font-black text-slate-800">{fmtNum(totalInvoiced)} ر.س</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="rounded-2xl border-0 shadow-sm bg-white">
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">إجمالي المبالغ المدفوعة</p>
                                <p className="text-lg font-black text-green-600">{fmtNum(totalPaid)} ر.س</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className={`rounded-2xl border-0 shadow-sm ${balance > 0 ? 'bg-rose-50/60 border border-rose-100' : 'bg-white'}`}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                <ArrowUpRight className="w-5 h-5" />
                              </div>
                              <div>
                                <p className={`text-[10px] font-bold ${balance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>المديونية المتبقية</p>
                                <p className={`text-lg font-black ${balance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{fmtNum(balance)} ر.س</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}

                    {/* Quick Profile Summary */}
                    <Card className="rounded-3xl border-0 shadow-sm bg-white p-6">
                      <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        الملف العام للعميل وبيانات التواصل
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400">الاسم التجاري للعميل / المنشأة</p>
                          <p className="text-sm font-bold text-slate-700">{selectedClient.name || "غير محدد"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400">رقم الهاتف والجوال</p>
                          <p className="text-sm font-bold text-slate-700" dir="ltr">{selectedClient.phone || "غير متوفر"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400">البريد الإلكتروني المعتمد</p>
                          <p className="text-sm font-bold text-slate-700">{selectedClient.email || "غير متوفر"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400">مقر العميل الرئيسي</p>
                          <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {selectedClient.address || "غير مسجل"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400">نوع الكيان</p>
                          <p className="text-sm font-bold text-slate-700">{selectedClient.company || "عميل فردي"}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeClientTab === "transactions" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Invoices List */}
                    {(() => {
                      const { clientInvoices } = getClientFinancials(selectedClient.id);
                      return (
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-primary" />
                              الفواتير الصادرة للعميل
                            </h3>
                            <Badge variant="outline" className="font-bold border-slate-200 bg-white">
                              {fmtNum(clientInvoices.length)} فواتير
                            </Badge>
                          </div>
                          <div className="p-4 h-[350px] overflow-y-auto custom-scrollbar">
                            {clientInvoices.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-2">
                                <Receipt className="w-8 h-8 text-slate-200" />
                                <span>لا توجد أي فواتير مصدرة حالياً.</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {clientInvoices.map(inv => (
                                  <div key={inv.id} className="p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-all flex items-center justify-between group">
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{inv.invoice_number || inv.number || `#${inv.id}`}</p>
                                      <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {inv.invoice_date_created || inv.date}
                                      </p>
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-black text-slate-950">{fmtNum(parseFloat(inv.invoice_total || inv.total || 0))} ر.س</p>
                                      {parseFloat(inv.invoice_balance || inv.balance || 0) > 0 ? (
                                        <p className="text-[10px] font-bold text-rose-500">متبقي: {fmtNum(parseFloat(inv.invoice_balance || inv.balance || 0))} ر.س</p>
                                      ) : (
                                        <p className="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 className="w-3 h-3"/> مسددة بالكامل</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* Quotes List */}
                    {(() => {
                      const { clientQuotes } = getClientFinancials(selectedClient.id);
                      return (
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              عروض الأسعار التاريخية
                            </h3>
                            <Badge variant="outline" className="font-bold border-slate-200 bg-white">
                              {fmtNum(clientQuotes.length)} عروض أسعار
                            </Badge>
                          </div>
                          <div className="p-4 h-[350px] overflow-y-auto custom-scrollbar">
                            {clientQuotes.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-2">
                                <FileText className="w-8 h-8 text-slate-200" />
                                <span>لا توجد عروض أسعار مسجلة لهذا العميل.</span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {clientQuotes.map(quote => (
                                  <div key={quote.id} className="p-3 rounded-2xl border border-slate-100 hover:border-blue-500/20 hover:bg-slate-50 transition-all flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{quote.quote_number || quote.number || `#${quote.id}`}</p>
                                      <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {quote.quote_date_created || quote.date}
                                      </p>
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-black text-slate-950">{fmtNum(parseFloat(quote.quote_total || quote.total || 0))} ر.س</p>
                                      <Badge variant="outline" className="font-bold text-[10px] border-slate-200">{quote.status || "معلق"}</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })()}
                  </div>
                )}

                {activeClientTab === "ai_helper" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left side panel: Select Tool Option */}
                    <div className="space-y-4">
                      <h4 className="font-black text-sm text-slate-700 mb-2">اختر وظيفة المساعد الذكي</h4>
                      
                      {/* Tool Option 1 */}
                      <button
                        onClick={() => handleGenerateClientAITool("pitch")}
                        className={`w-full text-right p-4 rounded-2xl border transition-all flex flex-col justify-between group h-28 ${
                          aiToolType === "pitch" 
                            ? "bg-violet-50/80 border-violet-200 shadow-md shadow-violet-100" 
                            : "bg-white border-slate-100 hover:border-violet-100 hover:bg-violet-50/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${aiToolType === "pitch" ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600"}`}>
                            <Sparkle className="w-4 h-4" />
                          </div>
                          <span className="font-black text-xs text-slate-800">توليد عرض ترويجي (WhatsApp)</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 line-clamp-2">
                          يحلل المساعد تعاملات العميل ويولد صياغة ذكية لعرض ترويجي لخدمات ومشاريع جديدة.
                        </p>
                      </button>

                      {/* Tool Option 2 */}
                      {getClientFinancials(selectedClient.id).balance > 0 && (
                        <button
                          onClick={() => handleGenerateClientAITool("debt_collection")}
                          className={`w-full text-right p-4 rounded-2xl border transition-all flex flex-col justify-between group h-28 ${
                            aiToolType === "debt_collection" 
                              ? "bg-rose-50/80 border-rose-200 shadow-md shadow-rose-100" 
                              : "bg-white border-slate-100 hover:border-rose-100 hover:bg-rose-50/20"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${aiToolType === "debt_collection" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-600"}`}>
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                            <span className="font-black text-xs text-slate-800">صياغة تذكير تحصيل ديون لبق</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 mt-2 line-clamp-2">
                            صياغة ذكية لتذكير العميل بالمستحقات المتبقية ({fmtNum(getClientFinancials(selectedClient.id).balance)} ر.س) للحفاظ على العلاقات الودية.
                          </p>
                        </button>
                      )}
                    </div>

                    {/* Right side panel: Workspace Output */}
                    <div className="lg:col-span-2">
                      <Card className="rounded-3xl border-0 shadow-sm bg-white overflow-hidden flex flex-col h-full min-h-[350px]">
                        <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                          <h3 className="font-black text-xs text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-violet-600" />
                            نتيجة النص المولد ذكياً
                          </h3>
                          {aiGeneratedText && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(aiGeneratedText)}
                                className="h-8 rounded-xl font-bold text-[10px] border-slate-200 bg-white shadow-inner"
                              >
                                <Copy className="w-3.5 h-3.5 ml-1 text-slate-500" />
                                نسخ النص
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => sendWhatsApp(selectedClient.phone, aiGeneratedText)}
                                className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm shadow-emerald-600/10"
                              >
                                <Send className="w-3.5 h-3.5 ml-1" />
                                إرسال عبر WhatsApp
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-center">
                          {isAiToolLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                              <p className="font-bold text-xs animate-pulse">جاري صياغة النص الذكي مخصصاً لهذا العميل...</p>
                            </div>
                          ) : aiGeneratedText ? (
                            <textarea
                              value={aiGeneratedText}
                              onChange={e => setAiGeneratedText(e.target.value)}
                              className="w-full h-64 p-4 border border-slate-100 rounded-2xl font-bold text-xs text-slate-800 leading-relaxed bg-slate-50/50 resize-none focus:outline-none focus:border-violet-100 custom-scrollbar text-right"
                              dir="rtl"
                            />
                          ) : (
                            <div className="text-center text-slate-400 py-12 space-y-2">
                              <MessageSquare className="w-12 h-12 text-slate-200 mx-auto" />
                              <p className="font-bold text-xs">قم باختيار إحدى الأدوات من اليمين ليقوم الذكاء الاصطناعي بتحضير الرسالة لك فورياً.</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Document Builder Modal ── */}
      <Dialog open={!!showDocBuilder} onOpenChange={(open) => !open && setShowDocBuilder(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl text-right" dir="rtl">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10 sticky top-0">
            <div>
               <h2 className="text-xl font-black text-slate-800">
                 {showDocBuilder === "quotation" ? "إصدار عرض سعر" : "إصدار فاتورة"} لـ <span className="text-primary">{selectedClient?.name}</span>
               </h2>
               <p className="text-xs font-bold text-slate-500 mt-1">تكامل ذكي لتعبئة البنود وتحديد مبالغ المعاملة</p>
            </div>
            <Button onClick={() => setShowDocBuilder(null)} variant="ghost" className="h-9 w-9 p-0 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
              <X className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50">
            {showDocBuilder && selectedClient && (
              <AIQuotationBuilder 
                type={showDocBuilder} 
                initialProjectId="" // Since it's standalone, we don't bind to an existing project directly.
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Outstanding Debts Collection Report Modal ── */}
      <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
        <DialogContent className="w-[95vw] sm:!max-w-lg md:!max-w-2xl lg:!max-w-4xl xl:!max-w-5xl p-0 overflow-hidden bg-slate-50 h-[85vh] flex flex-col rounded-[2rem] border-0 shadow-2xl text-right" dir="rtl">
          <div className="bg-white border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">نافذة تحصيل المديونيات المعلقة</h2>
                <p className="text-xs font-bold text-slate-400 mt-0.5">تتبع سداد الفواتير وإرسال تذكيرات الدفع الفورية</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onNavigate && (
                <Button 
                  onClick={() => {
                    setIsDebtModalOpen(false);
                    onNavigate("invoices");
                  }}
                  variant="outline" 
                  className="rounded-xl h-10 border-slate-200 bg-white hover:bg-slate-50 font-bold text-xs"
                >
                  <FileText className="w-4 h-4 ml-1.5 text-slate-500" />
                  الانتقال لصفحة الفواتير ↗
                </Button>
              )}
              <Button onClick={() => setIsDebtModalOpen(false)} variant="ghost" className="h-9 w-9 p-0 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Stats inside modal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 p-4 rounded-2xl border border-rose-100/50">
                <p className="text-[10px] font-bold text-rose-600">إجمالي المديونيات المعلقة</p>
                <p className="text-2xl font-black text-rose-700 mt-1">{fmtNum(totalOutstandingDebts)} ر.س</p>
              </div>
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-100/50">
                <p className="text-[10px] font-bold text-amber-600">عدد العملاء المدينين</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{fmtNum(debtorClients)} عملاء</p>
              </div>
              <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200/50 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500">متوسط مديونية العميل الواحد</p>
                <p className="text-lg font-black text-slate-800 mt-1">
                  {debtorClients > 0 ? fmtNum(totalOutstandingDebts / debtorClients) : 0} ر.س
                </p>
              </div>
            </div>

            {/* Debtor Clients List */}
            <div className="space-y-3">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                قائمة المطالبات المالية المستحقة
              </h3>
              
              {clients.filter(c => getClientFinancials(c.id).balance > 0).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-bold text-slate-600 text-sm">ممتاز! لا توجد أي مديونيات معلقة في محفظتك حالياً.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {clients
                    .filter(c => getClientFinancials(c.id).balance > 0)
                    .map((client) => {
                      const fin = getClientFinancials(client.id);
                      return (
                        <div 
                          key={client.id}
                          className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                              {client.name?.charAt(0) || "ع"}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-sm flex items-center gap-1">
                                {client.name}
                                {fin.totalInvoiced >= 50000 && <Crown className="w-3.5 h-3.5 text-violet-600 inline" />}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs font-bold text-slate-400" dir="ltr">{client.phone || "بدون هاتف"}</span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[10px] font-bold text-slate-400">إجمالي الفواتير: {fmtNum(fin.clientInvoices.length)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            <div className="text-right md:text-left">
                              <p className="text-[10px] font-bold text-rose-500">مستحق الدفع</p>
                              <p className="font-black text-rose-600 text-sm">{fmtNum(fin.balance)} ر.س</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  const msg = `مرحباً أ. ${client.name}، نود تذكيركم بلطف بوجود مستحقات مالية معلقة بقيمة ${fmtNum(fin.balance)} ر.س لم يتم سدادها بعد. يرجى التكرم بجدولة السداد في أقرب وقت. شاكرين ومقدرين لتعاونكم الدائم.`;
                                  sendWhatsApp(client.phone, msg);
                                }}
                                size="sm"
                                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                              >
                                <Send className="w-3.5 h-3.5" />
                                تذكير سداد (واتساب)
                              </Button>
                              <Button
                                onClick={() => {
                                  setIsDebtModalOpen(false);
                                  setSelectedClient(client);
                                  setIsModalOpen(true);
                                }}
                                size="sm"
                                variant="outline"
                                className="h-9 px-3 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs"
                              >
                                عرض الملف
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
