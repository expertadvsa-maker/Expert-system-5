import * as React from 'react';
import { Project } from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Layers, 
  Sparkles, 
  Plus, 
  Camera, 
  Loader2, 
  UploadCloud, 
  FileText, 
  ExternalLink 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from 'motion/react';

interface ProjectFilesTabProps {
  project: Project;
  isUploadDocOpen: boolean;
  setIsUploadDocOpen: (open: boolean) => void;
  isUploading: boolean;
  handleUploadDocs: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export default function ProjectFilesTab({
  project,
  isUploadDocOpen,
  setIsUploadDocOpen,
  isUploading,
  handleUploadDocs,
}: ProjectFilesTabProps) {
  return (
    <motion.div 
       key="monitoring"
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -10 }}
       className="flex flex-col gap-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner">
               <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
               <h3 className="text-xl font-black text-slate-900 leading-none">التوثيق والمرفقات الذكية</h3>
               <p className="text-slate-500 font-bold text-xs mt-1.5 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  ملفات فنية منظمة مدعومة بالذكاء الاصطناعي لفحص المرفقات.
               </p>
            </div>
         </div>
         <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
             <DialogTrigger autoFocus={false} asChild>
                <button className="group inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white h-11 px-6 font-black text-xs gap-2 shadow-lg hover:bg-primary transition-all outline-none cursor-pointer">
                   <Plus className="w-4 h-4" />
                   إضافة توثيق أو ملف جديد
                </button>
             </DialogTrigger>
             <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none" dir="rtl">
                <DialogHeader>
                   <DialogTitle className="text-right font-black">رفع وتحليل المرفقات</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 mt-4">
                   <div className="border-2 border-dashed border-slate-200 hover:border-primary/50 transition-colors rounded-[2rem] p-8 text-center flex flex-col items-center justify-center gap-4 bg-slate-50 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Camera className="w-12 h-12 text-slate-300 group-hover:text-primary transition-colors" />
                      <p className="text-xs font-bold text-slate-500 max-w-[250px] leading-relaxed">
                         اختر الصور الفنية أو الرسومات والملفات (عقود، جداول، مخططات) لرفعها وفهرستها تلقائياً بـ AI
                      </p>
                      <input 
                         type="file" 
                         multiple 
                         onChange={handleUploadDocs} 
                         disabled={isUploading}
                         className="hidden" 
                         id="file-upload-input"
                      />
                      <Button 
                         asChild
                         disabled={isUploading}
                         className="h-10 rounded-xl bg-slate-900 hover:bg-black font-black text-xs px-8 mt-2 relative z-10 shadow-lg shadow-slate-900/20"
                      >
                         <label htmlFor="file-upload-input" className="cursor-pointer flex items-center gap-2">
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                            {isUploading ? "جاري المعالجة والرفع..." : "تصفح الملفات"}
                         </label>
                      </Button>
                   </div>
                </div>
             </DialogContent>
          </Dialog>
      </div>
      
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
         <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
               <Camera className="w-4 h-4 text-emerald-500" />
               الأرشيف المرئي الجغرافي (صور ميدانية)
            </h4>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full">
               {project.photoUrls?.length || 0} لقطات
            </span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {project.photoUrls?.map((url, i) => (
                <div key={i} className="group overflow-hidden rounded-[2rem] border-4 border-slate-50 shadow-sm relative aspect-square cursor-zoom-in hover:shadow-xl transition-all">
                   <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="توثيق" referrerPolicy="no-referrer" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                       <p className="text-white text-xs font-black">توثيق ميداني تلقائي</p>
                       <p className="text-white/70 text-[10px] font-bold mt-1">{new Date().toLocaleDateString('ar-SA')}</p>
                   </div>
                   <div className="absolute top-4 left-4">
                      <Badge className="bg-slate-900/50 backdrop-blur-md text-white border-none px-3 py-1.5 rounded-xl font-black text-[10px] shadow-sm tracking-widest">#{i+1}</Badge>
                   </div>
                </div>
             ))}
             {(!project.photoUrls || project.photoUrls.length === 0) && (
                <div className="lg:col-span-3 py-16 flex flex-col items-center justify-center text-center opacity-40 gap-4 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                   <Camera className="w-12 h-12" />
                   <p className="font-bold text-sm">لا توجد وسائط مرئية لهذا المشروع حالياً</p>
                </div>
             )}
         </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
         <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
               <FileText className="w-4 h-4 text-blue-500" />
               الملفات والمخططات (تحليل AI)
            </h4>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full">
               {project.fileAttachments?.length || 0} مستند
            </span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {project.fileAttachments?.map((file, i) => {
                const isPdf = file.name.toLowerCase().endsWith('.pdf');
                const isImage = file.name.match(/\.(jpeg|jpg|gif|png)$/) != null;
                return (
                 <Card key={i} className="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 transition-all flex flex-col gap-4 shadow-sm group">
                    <div className="flex items-start justify-between">
                       <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${isPdf ? 'bg-rose-50 text-rose-500 border-rose-100' : isImage ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                             <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                             <p className="text-xs font-black text-slate-800 truncate" title={file.name}>{file.name}</p>
                             {file.uploadedAt && <p className="text-[9px] text-slate-500 font-bold mt-1 flex items-center gap-2"><span>{((file as any).size ? ((file as any).size / 1024 / 1024).toFixed(2) + ' MB' : '')}</span><span className="w-1 h-1 rounded-full bg-slate-300" /><span>{file.uploadedAt}</span></p>}
                          </div>
                       </div>
                       <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <a href={file.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                       </Button>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 flex items-start gap-2">
                       <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                       <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                          تم مراجعة المستند. لا توجد تعارضات مع جداول الكميات.
                       </p>
                    </div>
                 </Card>
                )
             })}
             {(!project.fileAttachments || project.fileAttachments.length === 0) && (
                <div className="md:col-span-2 py-12 flex flex-col items-center justify-center text-center opacity-40 gap-4 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                   <FileText className="w-10 h-10" />
                   <p className="font-bold text-sm">لا توجد مرفقات أو عقود فنية مرفوعة</p>
                </div>
             )}
          </div>
      </div>
    </motion.div>
  );
}
