import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle, 
  ArrowLeft, 
  Hammer,
  Layers,
  Settings,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';

interface MaterialItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes?: string;
}

interface DynamicMaterialsFormProps {
  projectId: string;
  projectType: string;
  projectTitle: string;
  onClose?: () => void;
  onSaved?: () => void;
}

// 1. القوائم الافتراضية الذكية للمواد بناء على نوع السور
const DEFAULT_MATERIALS_MAP: Record<string, MaterialItem[]> = {
  shinko: [
    { name: 'ألواح صاج شينكو مضلع (سمك 0.4 مم)', quantity: 50, unit: 'لوح', category: 'تغطيات' },
    { name: 'أعمدة حديد تيوبات 3*3 بوصة', quantity: 20, unit: 'حبة', category: 'هيكل حديدي' },
    { name: 'جسر حديد أفقي 2*2 بوصة', quantity: 40, unit: 'حبة', category: 'هيكل حديدي' },
    { name: 'براغي تثبيت مجلفنة ومطاطية', quantity: 500, unit: 'برغي', category: 'إكسسوارات' },
    { name: 'خرسانة جاهزة صب القواعد', quantity: 5, unit: 'متر مكعب', category: 'أساسات' },
    { name: 'دهان أساس مقاوم للصدأ (رشة أولى)', quantity: 2, unit: 'جالون', category: 'تشطيبات' },
  ],
  commercial_clad: [
    { name: 'ألواح أسمنت بورد (Cement Board)', quantity: 30, unit: 'لوح', category: 'تغطيات' },
    { name: 'ألواح خشب معالج خارجي مقاوم للرطوبة', quantity: 15, unit: 'لوح', category: 'تغطيات' },
    { name: 'هيكل حديدي تيوبات مجلفنة 4*4 بوصة', quantity: 12, unit: 'حبة', category: 'هيكل حديدي' },
    { name: 'رول بنر إعلاني عالي الجودة مقوى', quantity: 2, unit: 'رول', category: 'بصريات' },
    { name: 'براغي أسمنت بورد تيتانيوم مقواة', quantity: 400, unit: 'برغي', category: 'إكسسوارات' },
    { name: 'زوايا تثبيت حديدية سميكة', quantity: 50, unit: 'حبة', category: 'إكسسوارات' },
  ],
  chain_link: [
    { name: 'شبك حديد مجلفن فتحة 5*5 سم (ارتفاع 2م)', quantity: 100, unit: 'متر طولي', category: 'تغطيات' },
    { name: 'مواسير حديد مجلفن للأعمدة 2 بوصة', quantity: 35, unit: 'حبة', category: 'هيكل حديدي' },
    { name: 'أسلاك شد حديدية مجلفنة سمك 3 مم', quantity: 3, unit: 'لفة', category: 'إكسسوارات' },
    { name: 'خرسانة قواعد الأعمدة خلط يدوي', quantity: 30, unit: 'كيس', category: 'أساسات' },
    { name: 'أغطية حماية لأعمدة السور (Caps)', quantity: 35, unit: 'حبة', category: 'إكسسوارات' },
  ]
};

export default function DynamicMaterialsForm({ projectId, projectType, projectTitle, onClose, onSaved }: DynamicMaterialsFormProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // إعداد حقول المادة الجديدة المخصصة
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('حبة');
  const [newItemCategory, setNewItemCategory] = useState('مواد عامة');

  useEffect(() => {
    async function loadProjectMaterials() {
      try {
        const docRef = doc(db, 'projects', projectId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.materialsList && Array.isArray(data.materialsList) && data.materialsList.length > 0) {
            setMaterials(data.materialsList);
          } else {
            // جلب القائمة الافتراضية حسب نوع السور، أو قائمة عامة فارغة
            const normalizedType = projectType?.toLowerCase() || '';
            let defaultList: MaterialItem[] = [];
            if (normalizedType.includes('شينكو') || normalizedType.includes('shinko')) {
              defaultList = DEFAULT_MATERIALS_MAP.shinko;
            } else if (normalizedType.includes('مكسو') || normalizedType.includes('clad') || normalizedType.includes('commercial')) {
              defaultList = DEFAULT_MATERIALS_MAP.commercial_clad;
            } else if (normalizedType.includes('شبك') || normalizedType.includes('link') || normalizedType.includes('chain')) {
              defaultList = DEFAULT_MATERIALS_MAP.chain_link;
            } else {
              defaultList = [
                { name: 'إسمنت بورتلاندي عادي', quantity: 10, unit: 'كيس', category: 'أساسات' },
                { name: 'حديد تسليح مقاس 12 مم', quantity: 5, unit: 'سيخ', category: 'هياكل' },
              ];
            }
            setMaterials(defaultList);
          }
        }
      } catch (error) {
        console.error('Error loading materials:', error);
        toast.error('فشل في تحميل مواد المشروع');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadProjectMaterials();
    }
  }, [projectId, projectType]);

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty < 0) return;
    const updated = [...materials];
    updated[index].quantity = newQty;
    setMaterials(updated);
  };

  const handleUpdateNotes = (index: number, note: string) => {
    const updated = [...materials];
    updated[index].notes = note;
    setMaterials(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = materials.filter((_, i) => i !== index);
    setMaterials(updated);
    toast.info('تمت إزالة المادة من المسودة');
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      toast.error('الرجاء إدخال اسم المادة');
      return;
    }
    const item: MaterialItem = {
      name: newItemName.trim(),
      quantity: newItemQty,
      unit: newItemUnit,
      category: newItemCategory,
    };
    setMaterials([...materials, item]);
    setNewItemName('');
    setNewItemQty(1);
    toast.success('تمت إضافة المادة بنجاح للمخطط');
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, {
        materialsList: materials,
        materialsApproved: true,
        materialsApprovedAt: new Date().toISOString()
      });
      toast.success('تم حفظ واعتماد مخطط المواد والقطع لهذا المشروع بنجاح!');
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error saving materials:', error);
      toast.error('فشل في حفظ قائمة المواد');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12 gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500 font-bold">جاري تحميل مخطط البنود والمواد...</span>
      </div>
    );
  }

  return (
    <Card className="border border-indigo-100 bg-white shadow-xl rounded-2xl overflow-hidden animate-in fade-in duration-300">
      <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base sm:text-lg font-black text-primary">
                مخطط المواد والمشتريات الأساسية للمشروع
              </CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm font-bold text-indigo-950/70">
              مشروع: {projectTitle}
            </CardDescription>
          </div>
          <Badge className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs self-start sm:self-auto py-1 px-3">
            {projectType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Alerts & instructions */}
        <div className="bg-emerald-50/50 rounded-xl p-3 sm:p-4 border border-emerald-100 flex items-start gap-3">
          <Hammer className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-bold text-emerald-950 leading-relaxed">
            لقد تم اقتراح المواد والمقاسات القياسية لهذا المشروع تلقائياً لتناسب نوع العمل المختار. 
            يمكنك التعديل، الحذف، أو إضافة بنود مخصصة لتلائم الاتفاقية الموقعة مع العميل قبل ترحيلها للمشتريات.
          </div>
        </div>

        {/* Materials Table / List */}
        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner">
          <div className="bg-slate-100/50 px-4 py-3 border-b border-slate-200 grid grid-cols-12 text-[11px] sm:text-xs font-black text-slate-600 text-right gap-2">
            <div className="col-span-5 sm:col-span-5">اسم المادة / الوصف</div>
            <div className="col-span-2 text-center">الكمية</div>
            <div className="col-span-2 text-center">الوحدة</div>
            <div className="col-span-2 sm:col-span-2 text-center hidden sm:block">التصنيف</div>
            <div className="col-span-3 sm:col-span-1 text-center">إجراء</div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
            {materials.map((item, index) => (
              <div key={index} className="px-4 py-3 grid grid-cols-12 items-center gap-2 hover:bg-slate-50/50 transition-colors text-right">
                <div className="col-span-5 sm:col-span-5">
                  <span className="text-xs sm:text-sm font-black text-primary block leading-tight">{item.name}</span>
                  <input 
                    type="text" 
                    placeholder="ملاحظات أو مواصفات إضافية..."
                    value={item.notes || ''} 
                    onChange={(e) => handleUpdateNotes(index, e.target.value)}
                    className="mt-1 w-full text-[10px] bg-transparent text-slate-500 border-none focus:outline-none focus:ring-0 p-0 text-right placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQty(index, Number(e.target.value))}
                    className="w-12 sm:w-16 text-center text-xs border border-slate-200 rounded-md p-1 focus:ring-1 focus:ring-indigo-400 font-bold"
                  />
                </div>
                <div className="col-span-2 text-center">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none text-[10px] sm:text-xs font-bold">
                    {item.unit}
                  </Badge>
                </div>
                <div className="col-span-2 text-center hidden sm:block">
                  <Badge variant="outline" className="border-indigo-50 text-indigo-600 bg-indigo-50/40 text-[9px] font-bold">
                    {item.category}
                  </Badge>
                </div>
                <div className="col-span-3 sm:col-span-1 flex justify-center">
                  <Button
                    onClick={() => handleRemoveItem(index)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {materials.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                قائمة المواد فارغة حالياً. قم بإضافة بنود باستخدام النموذج أدناه.
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Form */}
        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-3">
          <div className="text-xs font-black text-slate-700 flex items-center gap-1">
            <Plus className="w-4 h-4 text-indigo-600" />
            إضافة مادة أو بند مخصص جديد:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="اسم المادة (مثال: جسور حديدية، كابلات شريطية...)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="sm:col-span-2 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-right font-medium"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="الكمية"
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-20 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 text-center font-bold"
              />
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="flex-1 text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 font-bold"
              >
                <option value="حبة">حبة</option>
                <option value="لوح">لوح</option>
                <option value="لفة">لفة</option>
                <option value="كيس">كيس</option>
                <option value="متر طولي">متر طولي</option>
                <option value="متر مكعب">متر مكعب</option>
                <option value="طن">طن</option>
                <option value="جالون">جالون</option>
              </select>
            </div>
            <Button
              onClick={handleAddItem}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة للمخطط
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              className="font-bold text-xs rounded-xl"
            >
              إغلاق النافذة
            </Button>
          )}
          <Button
            onClick={handleSavePlan}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl h-11 px-6 gap-2 shadow-md hover:shadow-lg transition-all"
          >
            {saving ? 'جاري الحفظ والاعتماد...' : 'حفظ واعتماد مخطط المواد والترحيل'}
            <CheckCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
