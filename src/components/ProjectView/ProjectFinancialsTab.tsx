import * as React from 'react';
import { Project, Quotation } from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, DollarSign, FileText, Download, FileCheck, Receipt, ExternalLink 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { updateDoc, doc } from 'firebase/firestore';

interface ProjectFinancialsTabProps {
  project: Project;
  projectId: string;
  db: any;
  financialStats: {
    paid: number;
    expenses: number;
    netProfit: number;
  };
  transactions: any[];
  isAddPaymentOpen: boolean;
  setIsAddPaymentOpen: (open: boolean) => void;
  paymentForm: any;
  setPaymentForm: (form: any) => void;
  handleAddPayment: () => void;
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (open: boolean) => void;
  expenseForm: any;
  setExpenseForm: (form: any) => void;
  handleAddExpense: () => void;
  handleApproveInstallment: (installment: any) => void;
  receipts: any[];
  quotations: Quotation[];
  invoices: Quotation[];
  setShowDocBuilder: (val: 'quotation' | 'invoice' | null) => void;
}

export default function ProjectFinancialsTab({
  project,
  projectId,
  db,
  financialStats,
  transactions,
  isAddPaymentOpen,
  setIsAddPaymentOpen,
  paymentForm,
  setPaymentForm,
  handleAddPayment,
  isAddExpenseOpen,
  setIsAddExpenseOpen,
  expenseForm,
  setExpenseForm,
  handleAddExpense,
  handleApproveInstallment,
  receipts,
  quotations,
  invoices,
  setShowDocBuilder,
}: ProjectFinancialsTabProps) {
  return (
    <motion.div 
       key="financials"
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -10 }}
       className="flex flex-col gap-8 w-full"
    >
       <Card className="rounded-[3rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-10 overflow-hidden relative shadow-2xl border border-slate-800">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/30 blur-[100px] rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-accent/20 blur-[100px] rounded-full" />
          <div className="relative z-10 space-y-8">
             <div className="flex flex-wrap items-center justify-between gap-8">
                <div>
                   <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">قيمة عقد المشروع (للعميل)</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter">{(project.projectValue ?? project.budget ?? 0).toLocaleString()}</span>
                      <span className="text-sm font-bold text-slate-500">SAR</span>
                   </div>
                </div>
                <div className="text-left border-r border-slate-800 pr-8">
                   <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">الميزانية الداخلية (للتنفيذ)</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tighter text-amber-400">{(project.budget ?? 0).toLocaleString()}</span>
                      <span className="text-xs font-bold text-slate-500">SAR</span>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                   <p className="text-slate-500 font-black text-[10px] uppercase mb-1">المحـصل (ر.س)</p>
                   <p className="text-3xl font-black text-emerald-400">{financialStats.paid.toLocaleString()}</p>
                </div>
                <div>
                   <p className="text-slate-500 font-black text-[10px] uppercase mb-1">تكاليف المواد والإنتاج</p>
                   <p className="text-3xl font-black text-amber-400">
                      {financialStats.expenses.toLocaleString()}
                   </p>
                </div>
                <div>
                   <p className="text-slate-500 font-black text-[10px] uppercase mb-1">صافي الربح المتوقع</p>
                   <p className="text-3xl font-black text-accent">
                      {financialStats.netProfit.toLocaleString()}
                   </p>
                </div>
             </div>
          </div>
       </Card>

       <div className="space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-xl font-black text-slate-900 border-r-4 border-primary pr-3">سجل العمليات المالية</h3>
             <div className="flex items-center gap-2">
                <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
                   <DialogTrigger render={
                      <button className="group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white h-9 px-4 font-black text-[10px] gap-2 hover:bg-slate-50 transition-all outline-none cursor-pointer">
                         <Plus className="w-3.5 h-3.5" />
                         إضافة دفعة
                      </button>
                   } />
                   <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                      <DialogHeader>
                         <DialogTitle className="text-right font-black">تسجيل دفعة عميل مستلمة</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">قيمة الدفعة (ر.س) *</Label>
                            <Input 
                               type="number" 
                               value={paymentForm.amount} 
                               onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                               placeholder="0.00"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">تاريخ الاستلام *</Label>
                            <Input 
                               type="date" 
                               value={paymentForm.date} 
                               onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">طريقة الدفع *</Label>
                            <select
                               value={paymentForm.paymentMethod}
                               onChange={e => setPaymentForm({...paymentForm, paymentMethod: e.target.value as any})}
                               className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                            >
                               <option value="cash">نقدي</option>
                               <option value="transfer">تحويل بنكي</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">التفاصيل / الوصف</Label>
                            <Input 
                               value={paymentForm.description} 
                               onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                               placeholder="مثال: الدفعة الثانية بعد تجهيز الهيكل"
                            />
                         </div>
                         <Button onClick={handleAddPayment} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4 shadow-lg shadow-slate-100">تسجيل الدفعة</Button>
                      </div>
                   </DialogContent>
                </Dialog>

                <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
                   <DialogTrigger render={
                      <button className="group/button inline-flex shrink-0 items-center justify-center rounded-xl bg-primary text-white h-9 px-4 font-black text-[10px] gap-2 shadow-md hover:bg-slate-900 transition-all outline-none cursor-pointer">
                         <Plus className="w-3.5 h-3.5" />
                         إضافة مصروف
                      </button>
                   } />
                   <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                      <DialogHeader>
                         <DialogTitle className="text-right font-black">تسجيل مصروف جديد (تكاليف مواد وإنتاج)</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">قيمة المصروف (ر.س) *</Label>
                            <Input 
                               type="number" 
                               value={expenseForm.amount} 
                               onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                               placeholder="0.00"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">التصنيف *</Label>
                            <select
                               value={expenseForm.category}
                               onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                               className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                            >
                               <option value="شراء خامات ومواد">شراء خامات ومواد (حديد، أكريليك، فليكس)</option>
                               <option value="أجور فنيين وتركيب">أجور فنيين وتركيب</option>
                               <option value="تكاليف طباعة وقص">تكاليف طباعة وقص</option>
                               <option value="نقل ولوجستيات">نقل ولوجستيات</option>
                               <option value="صيانة ومعدات">صيانة ومعدات رافعة</option>
                               <option value="مصاريف تشغيلية أخرى">مصاريف تشغيلية أخرى</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">تاريخ الصرف *</Label>
                            <Input 
                               type="date" 
                               value={expenseForm.date} 
                               onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">طريقة الدفع *</Label>
                            <select
                               value={expenseForm.paymentMethod}
                               onChange={e => setExpenseForm({...expenseForm, paymentMethod: e.target.value as any})}
                               className="w-full h-12 rounded-xl bg-slate-50 border-none font-bold text-xs pr-4 focus:ring-0 outline-none"
                            >
                               <option value="cash">نقدي</option>
                               <option value="transfer">تحويل بنكي</option>
                            </select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-400">التفاصيل / الوصف</Label>
                            <Input 
                               value={expenseForm.description} 
                               onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} 
                               className="rounded-xl h-12 bg-slate-50 border-none font-bold" 
                               placeholder="مثال: شراء ألواح أكريليك للواجهة"
                            />
                         </div>
                         <Button onClick={handleAddExpense} className="w-full h-12 rounded-2xl bg-slate-900 font-black mt-4 shadow-lg shadow-slate-100">تسجيل المصروف</Button>
                      </div>
                   </DialogContent>
                </Dialog>
             </div>
          </div>
          
          <div className="flex flex-col gap-4">
             {transactions.length === 0 && (
                <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-dashed border-2 border-slate-200 opacity-50">
                   <DollarSign className="w-12 h-12 mx-auto mb-4" />
                   <p className="font-black">لا توجد حركات مالية مسجلة لهذا المشروع</p>
                </div>
             )}
             {transactions.map((tx) => (
                <div key={tx.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-primary/20 transition-all shadow-sm">
                   <div className="flex items-center gap-5">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${
                         tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 
                         tx.type === 'purchase' ? 'bg-amber-50 text-amber-600' : 
                         'bg-rose-50 text-rose-600'
                      }`}>
                         {tx.type === 'income' ? '+' : '-'}
                      </div>
                      <div>
                         <p className="font-black text-slate-900">{tx.description || tx.category}</p>
                         <p className="text-xs font-bold text-slate-400">{new Date(tx.date).toLocaleDateString('ar-SA')}</p>
                      </div>
                   </div>
                   <div className="text-left">
                      <p className={`font-black text-lg ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                         {tx.amount.toLocaleString()} ر.س
                      </p>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{tx.paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}</span>
                   </div>
                </div>
             ))}
          </div>
       </div>

       <h3 className="text-xl font-black text-slate-900 border-r-4 border-primary pr-3">جدولة الدفعات المستحقة</h3>
       <div className="flex flex-col gap-4">
          {project.payments?.map((payment, i) => (
             <div key={payment.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-5">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black ${payment.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {i + 1}
                   </div>
                   <div>
                      <p className="font-black text-slate-900">{payment.description || `المرحلة ${i+1}`}</p>
                      <p className="text-xs font-bold text-slate-400">{payment.amount.toLocaleString()} ر.س</p>
                   </div>
                </div>
                {payment.status === 'paid' ? (
                   <Badge className="rounded-lg px-4 py-2 font-black text-[10px] border-none bg-emerald-50 text-emerald-600">
                      تم التحصيل
                   </Badge>
                ) : (
                   <Button 
                      size="sm"
                      onClick={() => handleApproveInstallment(payment)}
                      className="rounded-xl px-3 py-1.5 font-black text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white h-8 transition-all"
                   >
                      تسجيل تحصيل الدفعة
                   </Button>
                )}
             </div>
          ))}
       </div>

       {/* Uploaded Receipts Section */}
       <div className="mt-8">
         <h3 className="text-xl font-black text-slate-900 border-r-4 border-emerald-500 pr-3 mb-6">إيصالات التحويل المرفوعة (من العميل)</h3>
         {receipts.length === 0 ? (
           <div className="p-8 text-center bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-400">
             <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
             <p className="font-bold text-sm">لا توجد إيصالات مرفوعة من العميل حتى الآن.</p>
           </div>
         ) : (
           <div className="space-y-4">
             {receipts.map(rec => (
               <div key={rec.id} className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-all">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                     <FileCheck className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="font-black text-slate-800 text-sm">{rec.fileName}</p>
                     <p className="text-xs font-bold text-slate-400 mt-1">{new Date(rec.uploadedAt).toLocaleDateString('ar-SA')} - {new Date(rec.uploadedAt).toLocaleTimeString('ar-SA')}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <Badge className={`rounded-lg px-3 py-1 font-black text-[10px] border-none ${
                     rec.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                     rec.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                   }`}>
                     {rec.status === 'approved' ? 'معتمد' : rec.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                   </Badge>
                   {rec.fileData && (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl h-9"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = rec.fileData;
                          link.download = rec.fileName || 'receipt';
                          link.click();
                        }}
                     >
                       <Download className="w-4 h-4 ml-2" />
                       تحميل
                     </Button>
                   )}
                   {rec.status === 'pending' && (
                     <Button 
                       size="sm" 
                       onClick={async () => {
                         try {
                           await updateDoc(doc(db, 'projects', projectId, 'receipts', rec.id), { status: 'approved' });
                           toast.success('تم اعتماد الإيصال بنجاح');
                         } catch(e) {
                           toast.error('حدث خطأ');
                         }
                       }}
                       className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-9"
                     >
                       اعتماد
                     </Button>
                   )}
                 </div>
               </div>
             ))}
           </div>
         )}
       </div>

       {/* ── Quotations & Invoices ── */}
       <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm mt-8">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                 <FileText className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                 <h3 className="text-lg font-black text-slate-800">عروض الأسعار والفواتير</h3>
                 <p className="text-xs font-bold text-slate-400 mt-1">المستندات المالية المرتبطة بالمشروع</p>
              </div>
           </div>
           <div className="flex gap-2">
              <Button onClick={() => setShowDocBuilder('quotation')} variant="outline" className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold h-10 px-4">
                 + عرض سعر
              </Button>
              <Button onClick={() => setShowDocBuilder('invoice')} variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold h-10 px-4">
                 + فاتورة
              </Button>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {[...quotations, ...invoices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(doc => (
             <div key={doc.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
               <div className="flex items-start justify-between">
                 <div className="flex items-center gap-2">
                   {doc.docType === 'invoice' ? <Receipt className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-indigo-600" />}
                   <span className="font-bold text-sm text-slate-800">{doc.docType === 'invoice' ? 'فاتورة' : 'عرض سعر'}</span>
                 </div>
                 <span className="text-xs font-bold text-slate-400">{new Date(doc.createdAt).toLocaleDateString('ar-SA')}</span>
               </div>
               <div className="flex items-center justify-between mt-2">
                 <span className="text-lg font-black text-slate-800">{doc.totalAmount?.toLocaleString('ar-SA')} ر.س</span>
                 <Button variant="ghost" size="sm" onClick={() => window.open(doc.pdfUrl || '#', '_blank')} className="h-8 text-xs font-bold gap-1 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-100">
                   <ExternalLink className="w-3 h-3" /> عرض PDF
                 </Button>
               </div>
             </div>
           ))}
           {quotations.length === 0 && invoices.length === 0 && (
             <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
               <p className="text-sm font-bold text-slate-500">لا توجد مستندات مرتبطة بهذا المشروع</p>
             </div>
           )}
         </div>
       </div>
    </motion.div>
  );
}
