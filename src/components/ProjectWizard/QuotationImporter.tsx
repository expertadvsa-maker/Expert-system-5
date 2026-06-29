import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Loader2, CheckCircle2, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { fetchAliphiaQuotations } from '../../lib/aliphia';
import { toast } from 'sonner';

interface QuotationImporterProps {
  onImport: (quote: any) => void;
  onClose?: () => void;
}

export default function QuotationImporter({ onImport, onClose }: QuotationImporterProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAcceptedOnly, setFilterAcceptedOnly] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    const loadQuotes = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAliphiaQuotations();
        setQuotes(data || []);
      } catch (error) {
        console.error('Error in QuotationImporter loading:', error);
        toast.error('فشل في تحميل عروض الأسعار من ألف ياء');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuotes();
  }, []);

  const getStatusLabel = (status: string | number) => {
    const s = String(status).toLowerCase();
    if (s === '4' || s === 'accepted' || s === 'مقبولة') {
      return { label: 'مقبول', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    }
    if (s === '3' || s === 'rejected' || s === 'declined' || s === 'مرفوضة') {
      return { label: 'مرفوض', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    }
    return { label: 'معلق', color: 'bg-amber-50 text-amber-600 border-amber-200' };
  };

  const isAccepted = (status: string | number) => {
    const s = String(status).toLowerCase();
    return s === '4' || s === 'accepted' || s === 'مقبولة';
  };

  const isWithinLastWeek = (dateStr: string) => {
    if (!dateStr) return false;
    try {
      const qDate = new Date(dateStr.split(' ')[0]);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - qDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } catch {
      return false;
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const clientName = String(quote.client_name || quote.client?.name || '');
    const number = String(quote.quote_number || quote.number || '');
    const total = String(quote.quote_total || quote.total || '');
    const desc = String(quote.notes || quote.description || '');
    const dateStr = quote.quote_date || quote.date || '';

    const matchesSearch = 
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      total.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());

    const statusId = quote.quote_status_id || quote.status;
    const matchesStatus = filterAcceptedOnly ? isAccepted(statusId) : true;
    
    if (timeFilter === 'recent' && !searchTerm) {
      return matchesSearch && matchesStatus && isWithinLastWeek(dateStr);
    }
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-50/60 border border-slate-200/80 rounded-3xl p-5 shadow-inner space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            استيراد عروض أسعار ألف ياء 📊
          </h4>
          <p className="text-[10px] text-slate-500 font-bold">
            اختر عرض سعر لتأسيس المشروع بدقة دون إدخال يدوي مكرر
          </p>
        </div>

        {/* أزرار التصفية السريعة */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => setTimeFilter('recent')}
            className={`h-8 px-3 rounded-lg text-[10px] font-black transition-all ${
              timeFilter === 'recent'
                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            آخر 7 أيام ⏱️
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setTimeFilter('all')}
            className={`h-8 px-3 rounded-lg text-[10px] font-black transition-all ${
              timeFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            كل العروض 📂
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setFilterAcceptedOnly(!filterAcceptedOnly)}
            className={`h-8 px-3 rounded-lg text-[10px] font-black transition-all ${
              filterAcceptedOnly 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100/50' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {filterAcceptedOnly ? 'المقبولة فقط' : 'الكل'}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث باسم العميل أو رقم عرض السعر لاسترجاعه فوراً..."
          className="w-full pr-9 pl-4 h-9 bg-white border-slate-200 rounded-xl font-bold text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 shadow-inner"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4 gap-2">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-[10px] text-slate-500 font-bold">جاري المزامنة مع ألف ياء...</span>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="py-6 px-4 bg-white rounded-2xl border border-slate-200/60 text-center space-y-1">
          <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-[11px] text-slate-700 font-black">لا توجد عروض أسعار مطابقة حالياً</p>
          <p className="text-[10px] text-slate-400 font-bold">
            {timeFilter === 'recent' 
              ? 'لم نعثر على عروض مقبولة هذا الأسبوع. انقر على "كل العروض" أعلاه أو ابحث بالاسم.'
              : 'جرب إدخال اسم عميل آخر للبحث في النظام.'}
          </p>
          {timeFilter === 'recent' && (
            <Button
              type="button"
              variant="link"
              onClick={() => setTimeFilter('all')}
              className="text-[10px] text-indigo-600 font-black h-auto p-0 hover:text-indigo-500"
            >
              انقر لعرض كل عروض الأسعار 🔎
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
          {filteredQuotes.map((quote) => {
            const statusInfo = getStatusLabel(quote.quote_status_id || quote.status);
            const clientName = quote.client_name || quote.client?.name || 'عميل غير معروف';
            const quoteNum = quote.quote_number || quote.number || 'N/A';
            const total = quote.quote_total || quote.total || '0.00';
            const date = quote.quote_date || quote.date || '';

            return (
              <div 
                key={quote.id || quoteNum}
                onClick={() => onImport(quote)}
                className="group p-3 bg-white hover:bg-indigo-50/30 border border-slate-200/60 hover:border-indigo-400/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between space-y-2 shadow-sm hover:shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5 min-w-0 text-right">
                    <span className="text-[9px] font-black text-indigo-600 group-hover:text-indigo-700">
                      #{quoteNum}
                    </span>
                    <h5 className="font-black text-[11px] text-slate-700 group-hover:text-slate-900 truncate">
                      {clientName}
                    </h5>
                  </div>
                  <Badge variant="outline" className={`text-[8px] px-1.5 py-0 rounded font-bold shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </Badge>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 text-[9px] font-bold text-slate-400">
                  <span>{date ? date.split(' ')[0] : ''}</span>
                  <span className="text-indigo-600 font-black text-[11px]">
                    {Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 })} ريال
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
