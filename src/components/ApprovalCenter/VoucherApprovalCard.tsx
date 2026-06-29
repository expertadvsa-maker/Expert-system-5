import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  User, 
  FileText, 
  CreditCard, 
  ExternalLink,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { approveReceiptVoucher, rejectReceiptVoucher } from '../../lib/vouchersService';
import { toast } from 'sonner';

interface VoucherApprovalCardProps {
  voucher: {
    id: string;
    voucherNumber: string;
    clientId: string;
    clientName: string;
    projectId: string;
    projectTitle: string;
    amount: number;
    paymentMethod: string;
    bankName?: string;
    transferDate?: string;
    receiptImgUrl?: string;
    notes?: string;
  };
  onActionComplete: () => void;
  managerName: string;
  key?: any;
}

export default function VoucherApprovalCard({ voucher, onActionComplete, managerName }: VoucherApprovalCardProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveReceiptVoucher(voucher.id, managerName);
      toast.success(`تم اعتماد سند القبض ${voucher.voucherNumber} بنجاح`);
      onActionComplete();
    } catch (error) {
      console.error(error);
      toast.error('فشل في اعتماد سند القبض');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error('الرجاء إدخال سبب الرفض أولاً');
      return;
    }
    setLoading(true);
    try {
      await rejectReceiptVoucher(voucher.id, reason);
      toast.warning(`تم رفض السند ${voucher.voucherNumber}`);
      onActionComplete();
    } catch (error) {
      console.error(error);
      toast.error('فشل في رفض السند');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden border-r-2 sm:border-r-4 border-r-emerald-500 flex flex-col h-full">
      <CardContent className="p-3 sm:p-6 flex flex-col flex-1">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-600 font-black text-[10px] sm:text-base">
              <CreditCard className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-primary text-[11px] sm:text-sm truncate leading-tight">
                {voucher.voucherNumber}
              </h4>
              <p className="text-[9px] sm:text-xs text-muted-foreground font-medium truncate">
                {voucher.clientName}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-1.5 py-0 sm:px-3 sm:py-1 text-[8px] sm:text-[10px] font-bold">
              بانتظار التحقق
            </Badge>
          </div>
        </div>

        {/* Project Details */}
        <div className="mb-2 p-2 sm:p-3 bg-slate-50/50 rounded-lg sm:rounded-xl border border-dashed border-slate-200">
          <div className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 font-bold mb-1">
            <FileText className="w-3.5 h-3.5" />
            المشروع:
          </div>
          <p className="text-[11px] sm:text-sm text-primary font-black truncate">
            {voucher.projectTitle}
          </p>
        </div>

        {/* Transfer Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50/30 p-2 rounded-lg border border-slate-100">
            <span className="text-[9px] text-slate-400 block">المبلغ:</span>
            <span className="text-xs sm:text-sm font-black text-emerald-600">
              {voucher.amount.toLocaleString()} ر.س
            </span>
          </div>
          <div className="bg-slate-50/30 p-2 rounded-lg border border-slate-100">
            <span className="text-[9px] text-slate-400 block">البنك:</span>
            <span className="text-xs font-bold text-slate-700 truncate block">
              {voucher.bankName || 'تحويل بنكي'}
            </span>
          </div>
          {voucher.transferDate && (
            <div className="bg-slate-50/30 p-2 rounded-lg border border-slate-100 col-span-2 flex items-center justify-between">
              <span className="text-[9px] text-slate-400">تاريخ التحويل:</span>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {voucher.transferDate}
              </span>
            </div>
          )}
        </div>

        {/* Notes if any */}
        {voucher.notes && (
          <p className="text-[9px] sm:text-xs text-slate-600 mb-3 bg-amber-50/40 p-2 rounded-lg border border-amber-100 border-dashed italic">
            ملاحظات العميل: {voucher.notes}
          </p>
        )}

        {/* Receipt Attachment Link */}
        {voucher.receiptImgUrl ? (
          <a 
            href={voucher.receiptImgUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mb-3 sm:mb-4 p-2 sm:p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-dashed border-slate-200 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 transition-all cursor-pointer text-xs font-bold"
          >
            <ImageIcon className="w-4 h-4" />
            <span>عرض إيصال التحويل المرفق</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <div className="mb-3 sm:mb-4 p-2 text-center bg-slate-100 rounded-lg text-[10px] text-slate-400">
            لا يوجد إيصال مرفق
          </div>
        )}

        {/* Rejection input box */}
        {rejecting && (
          <div className="mb-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <textarea
              placeholder="اكتب سبب الرفض هنا ليظهر للعميل في بوابته..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 text-right font-medium"
              rows={2}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleReject}
                disabled={loading}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex-1 h-7"
              >
                تأكيد الرفض
              </Button>
              <Button 
                onClick={() => setRejecting(false)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="font-bold text-[10px] flex-1 h-7"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Main action buttons */}
        {!rejecting && (
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 mt-auto border-t border-slate-50">
            <Button 
              onClick={handleApprove} 
              disabled={loading}
              size="sm"
              className="flex-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold h-8 sm:h-11 gap-1 sm:gap-2 text-[10px] sm:text-sm px-0"
            >
              <CheckCircle2 className="w-3 h-3 sm:w-4 h-4" />
              اعتماد وإصدار السند
            </Button>
            <Button 
              onClick={() => setRejecting(true)} 
              disabled={loading}
              size="sm"
              variant="outline" 
              className="flex-1 rounded-lg sm:rounded-xl border-red-100 text-red-600 hover:bg-red-50 font-bold h-8 sm:h-11 gap-1 sm:gap-2 text-[10px] sm:text-sm px-0"
            >
              <XCircle className="w-3 h-3 sm:w-4 h-4" />
              رفض
            </Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
