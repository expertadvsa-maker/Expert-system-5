import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Search, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Activity,
  Fingerprint
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  where
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function AttendanceManager() {
  const { activeCompanyId } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const q = activeCompanyId 
      ? query(collection(db, 'attendance'), where('date', '==', filterDate), where('companyId', '==', activeCompanyId), orderBy('checkIn', 'desc'))
      : query(collection(db, 'attendance'), where('date', '==', filterDate), orderBy('checkIn', 'desc'));

    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [filterDate, activeCompanyId]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.locationName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const stats = useMemo(() => {
    const present = logs.filter(l => l.status === 'present' || l.checkIn).length;
    const late = logs.filter(l => l.status === 'late' || (l.checkIn && new Date(l.checkIn).getHours() > 9)).length;
    // Assuming absent logic requires knowing all employees, but for now we just count 'absent' status
    const absent = logs.filter(l => l.status === 'absent').length;

    return { present, late, absent };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-4 sm:p-6" dir="rtl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-gradient-to-l from-indigo-900 to-indigo-800 p-6 sm:p-10 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <Activity className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">لوحة المراقبة الشاملة</h1>
              <p className="text-indigo-200 font-medium mt-1 text-sm">مراقبة حية وتفصيلية لحركة وتواجد الفريق الميداني والإداري</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex gap-3">
           <Input 
             type="date"
             value={filterDate}
             onChange={(e) => setFilterDate(e.target.value)}
             className="bg-white/10 border-white/20 text-white [&::-webkit-calendar-picker-indicator]:filter-[invert(1)] rounded-xl h-12 font-bold"
           />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="المتواجدون حالياً" count={stats.present} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <StatCard title="حالات التأخير" count={stats.late} icon={Clock} color="bg-amber-50 text-amber-600 border-amber-100" />
        <StatCard title="الغياب المسجل" count={stats.absent} icon={AlertTriangle} color="bg-rose-50 text-rose-600 border-rose-100" />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="ابحث عن موظف، مشروع، أو موقع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-12 h-14 bg-white border-slate-200 rounded-2xl text-base shadow-sm font-bold placeholder:font-medium focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredLogs.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
             <Fingerprint className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-sm font-bold text-muted-foreground">لا توجد سجلات حضور مسجلة في هذا التاريخ</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <EmployeeStatusCard key={log.id} log={log} />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }: any) {
  return (
    <Card className={`rounded-2xl border ${color} shadow-sm overflow-hidden`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold opacity-80 mb-1">{title}</p>
            <h3 className="text-3xl font-black">{count}</h3>
          </div>
          <div className="p-4 bg-white/50 rounded-2xl">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeStatusCard({ log }: any) {
  const isFar = log.distanceFromTarget > 100;
  return (
    <Card className="rounded-2xl border-border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full border-r-4 border-r-indigo-500">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-700 text-lg flex-shrink-0">
            {log.userName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-slate-800 text-sm truncate">{log.userName}</h4>
            <p className="text-xs text-muted-foreground font-bold truncate">{log.department || 'موظف'}</p>
          </div>
          <div className="flex-shrink-0">
             {isFar ? (
               <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-none font-black text-[10px] px-2 py-1">
                 خارج النطاق
               </Badge>
             ) : (
               <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] px-2 py-1">
                 داخل النطاق
               </Badge>
             )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 flex-1">
           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
             <p className="text-[10px] text-slate-500 font-bold mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> الدخول</p>
             <p className="text-sm font-black text-slate-800">{log.checkIn ? new Date(log.checkIn).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</p>
           </div>
           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
             <p className="text-[10px] text-slate-500 font-bold mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> الخروج</p>
             <p className="text-sm font-black text-slate-800">{log.checkOut ? new Date(log.checkOut).toLocaleTimeString('ar-SA', {hour: '2-digit', minute:'2-digit'}) : 'لم ينصرف بعد'}</p>
           </div>
        </div>

        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mt-auto">
          <div className="text-[10px] font-bold text-indigo-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            الموقع الجغرافي المسجل
          </div>
          <p className="text-xs font-bold text-indigo-900 truncate">
             {log.locationName || 'موقع غير محدد'}
          </p>
          {isFar && log.distanceFromTarget && (
            <p className="text-[10px] text-rose-600 font-bold mt-1">يبعد {log.distanceFromTarget} متر عن الهدف</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
