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
  MapPin, CheckCircle2, TrendingUp, Download, Building2
} from "lucide-react";
import { toast } from "sonner";
import { fetchAliphiaClients, fetchAliphiaInvoices, fetchAliphiaQuotations, createAliphiaDocument } from "../lib/aliphia";
import AIQuotationBuilder from "./AIQuotationBuilder";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../lib/AuthContext";
import { sendNotification } from "../lib/notifications";

export default function Clients() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'with_invoices', 'no_contact'

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
      setClients(fetchedClients || []);
      setInvoices(fetchedInvoices || []);
      setQuotes(fetchedQuotes || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("فشل في جلب بيانات العملاء. يرجى التحقق من اتصال ألف ياء.");
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
    }

    return matchSearch && matchFilter;
  });

  const totalClients = clients.length;
  const activeClients = clients.filter(c => getClientFinancials(c.id).clientInvoices.length > 0).length;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 min-h-screen bg-slate-50/50" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl mb-4 shadow-inner">
            <Users className="w-8 h-8 text-primary" />
          </div>

          <p className="text-slate-500 font-bold mt-2 text-sm max-w-xl leading-relaxed">
            استعرض وأدر جميع عملائك من منصة ألف ياء بنظام النوافذ الذكية وتتبع المعاملات المالية بسهولة.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchData} variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 hover:bg-white font-bold text-slate-600 shadow-sm" disabled={isLoading}>
            <Loader2 className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{totalClients}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">إجمالي العملاء</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900">{activeClients}</h3>
            <p className="text-xs font-bold text-slate-500 mt-1">عملاء نشطون مالياً</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="ابحث بالاسم، الجوال، الإيميل..." 
            className="pl-4 pr-12 h-14 rounded-2xl border-slate-200 bg-white font-bold text-sm focus-visible:ring-primary/20 shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-sm min-w-[200px] shadow-sm">
            <SelectValue placeholder="تصفية العملاء" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all" className="font-bold">كل العملاء</SelectItem>
            <SelectItem value="with_invoices" className="font-bold">لديهم فواتير</SelectItem>
            <SelectItem value="no_contact" className="font-bold">بدون بيانات تواصل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Clients List ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="font-bold text-sm animate-pulse">جاري جلب العملاء...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-700 mb-1">لا يوجد عملاء</h3>
          <p className="text-slate-500 text-sm font-bold">لم يتم العثور على عملاء يطابقون بحثك</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredClients.map((client, index) => {
              const { clientInvoices, totalInvoiced, balance } = getClientFinancials(client.id);
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  key={client.id}
                >
                  <Card 
                    className="rounded-3xl border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group bg-white"
                    onClick={() => {
                      setSelectedClient(client);
                      setIsModalOpen(true);
                    }}
                  >
                    <div className="h-2 w-full bg-slate-100 group-hover:bg-primary transition-colors" />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {client.name?.charAt(0) || <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm line-clamp-1" title={client.name}>{client.name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">#{client.id}</p>
                          </div>
                        </div>
                        {balance > 0 && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 font-bold px-2 py-0.5 text-[10px]">
                            مستحقات: {balance.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr">{client.phone || 'غير مسجل'}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="line-clamp-1">{client.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">الفواتير</p>
                          <p className="font-black text-slate-700 text-sm">{clientInvoices.length}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">إجمالي التعاملات</p>
                          <p className="font-black text-emerald-600 text-sm">{totalInvoiced.toLocaleString()} ر.س</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="w-[95vw] md:w-full max-w-5xl p-0 overflow-hidden bg-slate-50 h-[90vh] flex flex-col rounded-[2rem] border-0 shadow-2xl" dir="rtl">
          {selectedClient && (
            <>
              {/* Modal Header */}
              <div className="bg-white border-b border-slate-100 p-6 flex items-start justify-between z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      {selectedClient.name}
                      {getClientFinancials(selectedClient.id).balance > 0 && (
                        <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse relative top-0.5" title="يوجد مديونية" />
                      )}
                    </h2>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{selectedClient.phone || 'غير مسجل'}</span>
                      </p>
                      {selectedClient.email && (
                        <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{selectedClient.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowDocBuilder('quotation')}
                    variant="outline" 
                    className="rounded-xl h-10 border-primary/20 text-primary hover:bg-primary/5 font-bold text-xs"
                  >
                    <FileText className="w-4 h-4 ml-2" />
                    عرض سعر جديد
                  </Button>
                  <Button 
                    onClick={() => setShowDocBuilder('invoice')}
                    className="rounded-xl h-10 bg-primary text-white hover:bg-primary/90 shadow-md font-bold text-xs"
                  >
                    <Receipt className="w-4 h-4 ml-2" />
                    فاتورة جديدة
                  </Button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Client Stats Grid */}
                {(() => {
                  const { totalInvoiced, totalPaid, balance, clientInvoices, clientQuotes } = getClientFinancials(selectedClient.id);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="rounded-2xl border-0 shadow-sm bg-white">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">إجمالي الفواتير</p>
                              <p className="text-lg font-black text-slate-800">{clientInvoices.length}</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-0 shadow-sm bg-white">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">إجمالي المبالغ</p>
                              <p className="text-lg font-black text-slate-800">{totalInvoiced.toLocaleString()} ر.س</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="rounded-2xl border-0 shadow-sm bg-white">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400">المدفوع</p>
                              <p className="text-lg font-black text-green-600">{totalPaid.toLocaleString()} ر.س</p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card className={`rounded-2xl border-0 shadow-sm ${balance > 0 ? 'bg-rose-50' : 'bg-white'}`}>
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                              <ArrowUpRight className="w-5 h-5" />
                            </div>
                            <div>
                              <p className={`text-[10px] font-bold ${balance > 0 ? 'text-rose-500' : 'text-slate-400'}`}>المتبقي (المديونية)</p>
                              <p className={`text-lg font-black ${balance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{balance.toLocaleString()} ر.س</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Invoices List */}
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-primary" />
                              فواتير العميل
                            </h3>
                            <Badge variant="outline" className="font-bold border-slate-200 bg-white">
                              {clientInvoices.length}
                            </Badge>
                          </div>
                          <div className="p-2 h-[300px] overflow-y-auto custom-scrollbar">
                            {clientInvoices.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">لا يوجد فواتير</div>
                            ) : (
                              <div className="space-y-2">
                                {clientInvoices.map(inv => (
                                  <div key={inv.id} className="p-3 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{inv.invoice_number || inv.number || `#${inv.id}`}</p>
                                      <p className="text-[10px] font-bold text-slate-500 mt-1">{inv.invoice_date_created || inv.date}</p>
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-black text-slate-900">{parseFloat(inv.invoice_total || inv.total || 0).toLocaleString()} ر.س</p>
                                      {parseFloat(inv.invoice_balance || inv.balance || 0) > 0 ? (
                                        <p className="text-[10px] font-bold text-rose-500">متبقي: {parseFloat(inv.invoice_balance || inv.balance || 0).toLocaleString()}</p>
                                      ) : (
                                        <p className="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-1"><CheckCircle2 className="w-3 h-3"/> مدفوعة</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>

                        {/* Quotes List */}
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
                          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              عروض الأسعار
                            </h3>
                            <Badge variant="outline" className="font-bold border-slate-200 bg-white">
                              {clientQuotes.length}
                            </Badge>
                          </div>
                          <div className="p-2 h-[300px] overflow-y-auto custom-scrollbar">
                            {clientQuotes.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">لا يوجد عروض أسعار</div>
                            ) : (
                              <div className="space-y-2">
                                {clientQuotes.map(quote => (
                                  <div key={quote.id} className="p-3 rounded-2xl border border-slate-100 hover:border-blue-500/20 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{quote.quote_number || quote.number || `#${quote.id}`}</p>
                                      <p className="text-[10px] font-bold text-slate-500 mt-1">{quote.quote_date_created || quote.date}</p>
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm font-black text-slate-900">{parseFloat(quote.quote_total || quote.total || 0).toLocaleString()} ر.س</p>
                                      <p className="text-[10px] font-bold text-slate-400">{quote.status || 'معلق'}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Document Builder Modal ── */}
      <Dialog open={!!showDocBuilder} onOpenChange={(open) => !open && setShowDocBuilder(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-50 h-[90vh] flex flex-col rounded-3xl border-0 shadow-2xl" dir="rtl">
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-10 sticky top-0">
            <div>
               <h2 className="text-xl font-black text-slate-800">
                 {showDocBuilder === 'quotation' ? 'إصدار عرض سعر' : 'إصدار فاتورة'} لـ <span className="text-primary">{selectedClient?.name}</span>
               </h2>
               <p className="text-xs font-bold text-slate-500 mt-1">يمكنك تفعيل الذكاء الاصطناعي لتعبئة البنود تلقائياً</p>
            </div>
            <Button onClick={() => setShowDocBuilder(null)} variant="ghost" className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200">X</Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50">
            {showDocBuilder && selectedClient && (
              <AIQuotationBuilder 
                type={showDocBuilder} 
                // We pre-fill the client by passing client ID or we can let the component handle it if we modify it.
                // Currently AIQuotationBuilder supports `initialProjectId`, but for a standalone client we can pass `standalone`
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
