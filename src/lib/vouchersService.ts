// src/lib/vouchersService.ts
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface ReceiptVoucher {
  id?: string;
  voucherNumber: string;         // رقم السند التلقائي المولد
  clientId: string;              // معرف العميل
  clientName: string;            // اسم العميل
  projectId: string;             // معرف المشروع
  projectTitle: string;          // عنوان المشروع
  amount: number;                // قيمة السند
  paymentMethod: string;         // طريقة الدفع (تحويل بنكي، نقدي، إلخ)
  bankName?: string;             // اسم البنك
  transferDate?: string;         // تاريخ التحويل
  receiptImgUrl?: string;        // رابط صورة إيصال العميل
  approvedBy?: string;           // المدير الذي اعتمد السند
  createdAt: Timestamp | any;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

/**
 * توليد رقم سند فريد متسلسل
 */
export async function generateVoucherNumber(): Promise<string> {
  try {
    const q = query(collection(db, 'receipt_vouchers'));
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    const pad = String(count).padStart(5, '0');
    const year = new Date().getFullYear();
    return `REC-${year}-${pad}`;
  } catch (error) {
    console.error('Error generating voucher number:', error);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `REC-${new Date().getFullYear()}-${randomSuffix}`;
  }
}

/**
 * رفع طلب سند قبض جديد من بوابة العميل (حالة معلقةpending)
 */
export async function createPendingVoucherRequest(params: {
  clientId: string;
  clientName: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  transferDate?: string;
  receiptImgUrl: string;
  notes?: string;
}): Promise<string> {
  const voucherNumber = await generateVoucherNumber();
  
  const docRef = await addDoc(collection(db, 'receipt_vouchers'), {
    ...params,
    voucherNumber,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * جلب السندات الخاصة بعميل معين
 */
export async function getClientVouchers(clientId: string): Promise<ReceiptVoucher[]> {
  const q = query(
    collection(db, 'receipt_vouchers'), 
    where('clientId', '==', clientId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ReceiptVoucher[];
}

/**
 * جلب جميع السندات المعلقة لمراجعة المدير
 */
export async function getPendingVouchers(): Promise<ReceiptVoucher[]> {
  const q = query(
    collection(db, 'receipt_vouchers'), 
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ReceiptVoucher[];
}

/**
 * اعتماد السند من قبل المدير وتوليد السند التلقائي المعتمد
 */
export async function approveReceiptVoucher(voucherId: string, managerName: string): Promise<void> {
  const voucherRef = doc(db, 'receipt_vouchers', voucherId);
  await updateDoc(voucherRef, {
    status: 'approved',
    approvedBy: managerName,
    approvedAt: serverTimestamp(),
  });

  // جلب تفاصيل السند لإجراء التحديثات المالية اللازمة على المشروع
  const snap = await getDoc(voucherRef);
  if (snap.exists()) {
    const data = snap.data() as ReceiptVoucher;
    const projectRef = doc(db, 'projects', data.projectId);
    const projSnap = await getDoc(projectRef);
    
    if (projSnap.exists()) {
      const projData = projSnap.data();
      // إضافة دفعة جديدة لسجل الدفعات داخل المشروع وتحديث المدفوع المالي الإجمالي
      const currentPaid = Number(projData.amountPaid || 0);
      const newPaid = currentPaid + Number(data.amount);
      const paymentsList = projData.paymentsList || [];
      
      const newPaymentRecord = {
        id: voucherId,
        voucherNumber: data.voucherNumber,
        amount: data.amount,
        date: data.transferDate || new Date().toISOString().split('T')[0],
        method: data.paymentMethod || 'bank_transfer',
        receiptUrl: data.receiptImgUrl || '',
        status: 'approved',
        approvedBy: managerName,
        approvedAt: new Date().toISOString()
      };

      await updateDoc(projectRef, {
        amountPaid: newPaid,
        paymentsList: [...paymentsList, newPaymentRecord]
      });
    }
  }
}

/**
 * رفض السند مع ذكر السبب
 */
export async function rejectReceiptVoucher(voucherId: string, reason: string): Promise<void> {
  const voucherRef = doc(db, 'receipt_vouchers', voucherId);
  await updateDoc(voucherRef, {
    status: 'rejected',
    rejectionReason: reason,
    rejectedAt: serverTimestamp()
  });
}
