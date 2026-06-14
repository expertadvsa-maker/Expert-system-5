import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, addDoc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Company } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Building2, Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Database, Phone, Mail, Globe, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function CompaniesManagement() {
  const { user, profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    logoUrl: '',
    taxNumber: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'owner') return;

    const q = query(collection(db, 'companies'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Company)));
    });

    return unsubscribe;
  }, [profile]);

  if (profile?.role !== 'owner') {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h3 className="text-xl font-bold mb-2">صلاحيات محدودة</h3>
        <p>هذه الصفحة مخصصة لمالك النظام فقط.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('اسم الشركة مطلوب');
      return;
    }

    try {
      if (isEditing && editingId) {
        await updateDoc(doc(db, 'companies', editingId), formData);
        toast.success('تم تحديث بيانات الشركة بنجاح');
      } else {
        await addDoc(collection(db, 'companies'), {
          ...formData,
          ownerId: user?.uid,
          createdAt: new Date().toISOString(),
          settings: {}
        });
        toast.success('تم إضافة الشركة بنجاح');
      }
      resetForm();
    } catch (e) {
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الشركة؟ لا يمكن التراجع عن هذا الإجراء وسيتم قطع وصول جميع البيانات المربوطة بها.')) return;
    
    try {
      await deleteDoc(doc(db, 'companies', id));
      toast.success('تم حذف الشركة بنجاح');
    } catch (e) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ 
      name: '', logoUrl: '', taxNumber: '', address: '',
      phone: '', whatsapp: '', email: '', website: ''
    });
    setUploadProgress(0);
    setIsUploading(false);
  };

  const editCompany = (c: Company) => {
    setFormData({ 
      name: c.name, logoUrl: c.logoUrl || '', taxNumber: c.taxNumber || '', address: c.address || '',
      phone: c.phone || '', whatsapp: c.whatsapp || '', email: c.email || '', website: c.website || ''
    });
    setEditingId(c.id);
    setIsEditing(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const storageRef = ref(storage, `companies/logos/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setIsUploading(true);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        toast.error('حدث خطأ أثناء رفع الشعار');
        setIsUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, logoUrl: downloadURL }));
        setIsUploading(false);
        toast.success('تم رفع الشعار بنجاح');
      }
    );
  };

  const handleMigrateData = async (companyId: string) => {
    if (!confirm('تنبيه: سيتم ربط جميع البيانات الحالية غير المربوطة (مشاريع، مالية، موظفين) بهذه الشركة. استمر؟')) return;
    
    setIsMigrating(true);
    try {
      const collectionsToMigrate = ['projects', 'transactions', 'users', 'attendance', 'clients', 'subcontractors', 'inventory', 'daily_logs'];
      
      let totalMigrated = 0;
      
      for (const collName of collectionsToMigrate) {
        const q = query(collection(db, collName));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        let batchCount = 0;

        snap.docs.forEach(d => {
          const data = d.data();
          if (!data.companyId) {
            batch.update(d.ref, { companyId: companyId });
            batchCount++;
            totalMigrated++;
          }
        });

        if (batchCount > 0) {
          await batch.commit();
        }
      }
      
      toast.success(`تم بنجاح! تم نقل ${totalMigrated} سجل إلى هذه الشركة.`);
    } catch (e) {
      toast.error('حدث خطأ أثناء نقل البيانات');
      console.error(e);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* List of Companies */}
      {!isEditing && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">إدارة الشركات</h2>
              <p className="text-slate-500 text-sm mt-1">يمكنك إضافة أكثر من شركة وإدارتها بشكل مستقل.</p>
            </div>
            <Button onClick={() => setIsEditing(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              <Plus className="w-5 h-5" />
              إضافة شركة جديدة
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map(c => (
              <div key={c.id} className="border border-slate-200 rounded-2xl p-5 flex items-start gap-4 hover:border-indigo-200 hover:shadow-md transition-all">
                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{c.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                    {c.taxNumber && <p className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> الضريبي: {c.taxNumber}</p>}
                    {c.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {c.phone}</p>}
                    {c.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {c.email}</p>}
                    {c.website && <p className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {c.website}</p>}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button onClick={() => editCompany(c)} variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                      <Edit2 className="w-3.5 h-3.5" />
                      تعديل
                    </Button>
                    <Button onClick={() => handleDelete(c.id)} variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {companies.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                لا يوجد شركات مضافة بعد.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800">
              {editingId ? 'تعديل بيانات الشركة' : 'إضافة شركة جديدة'}
            </h2>
            <Button onClick={resetForm} variant="ghost" className="rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-5 max-w-2xl">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">اسم الشركة / المؤسسة *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="bg-slate-50 border-slate-200 rounded-xl"
                placeholder="أدخل الاسم التجاري"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">الرقم الضريبي (اختياري)</Label>
              <Input 
                value={formData.taxNumber} 
                onChange={e => setFormData({...formData, taxNumber: e.target.value})} 
                className="bg-slate-50 border-slate-200 rounded-xl"
                placeholder="15 رقم"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">العنوان (اختياري)</Label>
              <Input 
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
                className="bg-slate-50 border-slate-200 rounded-xl"
                placeholder="المدينة، الحي، الشارع"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  رقم الجوال
                </Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  رقم الواتساب
                </Label>
                <Input 
                  value={formData.whatsapp} 
                  onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  البريد الإلكتروني
                </Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="info@company.com"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-slate-700 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  الموقع الإلكتروني
                </Label>
                <Input 
                  value={formData.website} 
                  onChange={e => setFormData({...formData, website: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="www.company.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                شعار الشركة (Logo)
              </Label>
              <div className="flex items-center gap-4">
                {formData.logoUrl && (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                    <img src={formData.logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <Label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-5 h-5 text-slate-500 mb-1" />
                      <p className="text-xs text-slate-500 font-medium">اضغط لرفع صورة الشعار</p>
                    </div>
                    <input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                      disabled={isUploading}
                    />
                  </Label>
                  {isUploading && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 font-bold h-12">
                <Save className="w-5 h-5" />
                حفظ بيانات الشركة
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1 rounded-xl gap-2 font-bold h-12 text-slate-600 border-slate-200 hover:bg-slate-50">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
