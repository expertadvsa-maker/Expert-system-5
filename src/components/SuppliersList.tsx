import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Truck, DollarSign, Store, Phone, Mail, MapPin, Plus, Loader2, ArrowDownRight, FileText } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";

export default function SuppliersList() {
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vatNumber: '',
    address: ''
  });

  // Payment Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentBankId, setPaymentBankId] = useState('');

  useEffect(() => {
    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snap) => {
      setSuppliers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBanks = onSnapshot(collection(db, "bankAccounts"), (snap) => {
      setBankAccounts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSuppliers();
      unsubTransactions();
      unsubBanks();
    };
  }, []);

  const getSupplierBalance = (supplierName: string) => {
    let balance = 0;
    transactions.forEach(t => {
      if (t.supplierName === supplierName) {
        if (t.type === 'purchase' && t.paymentMethod === 'credit' && t.status !== 'cancelled') {
          balance += (t.amount || 0);
        } else if (t.type === 'supplier_payment' && t.status !== 'cancelled') {
          balance -= (t.amount || 0);
        } else if (t.type === 'purchase_return' && t.originalPaymentMethod === 'credit' && t.status !== 'cancelled') {
          balance -= (t.amount || 0);
        }
      }
    });
    return balance;
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('يرجى إدخال اسم المورد');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "suppliers"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success('تمت إضافة المورد بنجاح');
      setIsDialogOpen(false);
      setFormData({ name: '', phone: '', vatNumber: '', address: '' });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySupplier = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (!paymentBankId) {
      toast.error('الرجاء اختيار حساب الخصم');
      return;
    }

    const amountNum = Number(paymentAmount);
    setIsSubmitting(true);
    try {
      // Create supplier payment transaction
      await addDoc(collection(db, "transactions"), {
        type: 'supplier_payment',
        amount: amountNum,
        supplierName: selectedSupplier.name,
        bankAccountId: paymentBankId,
        date: serverTimestamp(),
        description: `دفعة من الحساب للمورد: ${selectedSupplier.name}`,
        createdBy: profile?.uid,
        status: 'approved'
      });

      // Deduct from bank
      const bankRef = doc(db, "bankAccounts", paymentBankId);
      await updateDoc(bankRef, {
        balance: increment(-amountNum)
      });

      toast.success('تم تسجيل الدفعة وخصمها من الحساب بنجاح');
      setIsPaymentOpen(false);
      setPaymentAmount('');
      setPaymentBankId('');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOwed = suppliers.reduce((acc, s) => acc + getSupplierBalance(s.name), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">سجل الموردين</h2>
          <p className="text-sm font-bold text-slate-500">إدارة تفاصيل الموردين، ومتابعة الذمم الدائنة والدفعات المتبقية.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-bold h-11 px-6">
              <Plus className="w-5 h-5" />
              إضافة مورد جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-right">مورد جديد</DialogTitle>
              <DialogDescription className="text-right font-bold text-slate-500">
                أدخل تفاصيل المورد لإضافته للسجل
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSupplier} className="space-y-4 pt-4">
              <div className="space-y-2 text-right">
                <Label className="font-bold text-slate-700">اسم المورد / الشركة *</Label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl h-11 text-right"
                  placeholder="شركة المواد الأساسية"
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold text-slate-700">رقم الهاتف</Label>
                <Input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="rounded-xl h-11 text-right"
                  placeholder="05..."
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold text-slate-700">الرقم الضريبي VAT</Label>
                <Input 
                  value={formData.vatNumber}
                  onChange={e => setFormData({...formData, vatNumber: e.target.value})}
                  className="rounded-xl h-11 text-right"
                  placeholder="3000..."
                />
              </div>
              <div className="space-y-2 text-right">
                <Label className="font-bold text-slate-700">العنوان</Label>
                <Input 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="rounded-xl h-11 text-right"
                  placeholder="المدينة، الحي..."
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white mt-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "إضافة المورد"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-3xl border-none shadow-sm bg-blue-50">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-black text-blue-900">الموردين النشطين</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-blue-900">{suppliers.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-amber-50">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-black text-amber-900">إجمالي المديونيات للموردين</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-amber-900">{totalOwed.toLocaleString()} <span className="text-base text-amber-700">ر.س</span></p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => {
          const balance = getSupplierBalance(supplier.name);
          const invoiceCount = transactions.filter(t => t.supplierName === supplier.name && t.type === 'purchase').length;
          return (
            <Card key={supplier.id} className="rounded-3xl border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <Store className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{supplier.name}</h3>
                      {balance > 0 && (
                        <p className="text-amber-600 font-bold text-sm mt-1">مطلوب: {balance.toLocaleString()} ر.س</p>
                      )}
                      {balance < 0 && (
                        <p className="text-emerald-600 font-bold text-sm mt-1">لنا: {Math.abs(balance).toLocaleString()} ر.س</p>
                      )}
                      {balance === 0 && (
                        <p className="text-slate-400 font-bold text-sm mt-1">لا يوجد مديونية</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-slate-100 text-[13px] font-bold text-slate-500">
                  {supplier.phone && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {supplier.phone}</span>
                      <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                        <Phone className="w-3.5 h-3.5" /> اتصال
                      </a>
                    </div>
                  )}
                  {supplier.vatNumber && (
                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> الضريبي: {supplier.vatNumber}</span>
                  )}
                  {supplier.address && (
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {supplier.address}</span>
                  )}
                  <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded w-max"><FileText className="w-4 h-4" /> لديه {invoiceCount} فواتير مسجلة</span>
                </div>

                {profile?.role === 'manager' && balance > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setIsPaymentOpen(true);
                    }}
                    variant="outline"
                    className="w-full mt-4 h-10 border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                  >
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    تسديد دفعة للمورد
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {suppliers.length === 0 && (
           <div className="col-span-full text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <p className="text-lg font-black text-slate-500">لا يوجد موردين مضافين للسجل</p>
           </div>
        )}
      </div>

      {/* Payment Modal */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">تسديد دفعة لمورد</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label className="font-bold text-slate-600">المورد</Label>
              <Input disabled value={selectedSupplier?.name || ''} className="bg-slate-50" />
            </div>
            
            <div className="space-y-1">
              <Label className="font-bold text-slate-600">رصيد المورد الحالي (المديونية)</Label>
              <div className="h-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center px-3 text-amber-700 font-bold">
                {selectedSupplier ? getSupplierBalance(selectedSupplier.name).toLocaleString() : 0} ر.س
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-600">المبلغ المراد سداده</Label>
              <Input 
                type="number" 
                placeholder="أدخل المبلغ" 
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-11 text-lg font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-600">خصم من الحساب البنكي / العهدة</Label>
              <Select value={paymentBankId} onValueChange={setPaymentBankId}>
                <SelectTrigger className="h-11 border-slate-200 text-right" dir="rtl">
                  <SelectValue placeholder="اختر الحساب..." />
                </SelectTrigger>
                <SelectContent dir="rtl" className="text-right">
                  {bankAccounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} - (الرصيد: {acc.balance?.toLocaleString()} ر.س)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handlePaySupplier}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'تأكيد السداد والخصم'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
