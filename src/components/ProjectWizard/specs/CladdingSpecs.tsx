import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CladdingSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function CladdingSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: CladdingSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Cladding Panel and Brand */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع ولون ألواح الكلادينج (Cladding Panels)</Label>
          <select
            value={specs.cladBrandColor || 'alucobond_premium'}
            onChange={(e) => updateSpec('cladBrandColor', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="alucobond_premium">ألوكوبوند أصلي مقاوم للحريق (سماكة 4 مم / دهان PVDF) - ممتاز</option>
            <option value="national_clad">كلادينج وطني (مقاوم للحريق / سماكة 4 مم)</option>
            <option value="chinese_standard">كلادينج صيني تجاري (سماكة 4 مم / للاستخدامات العادية)</option>
            <option value="custom_color">لون خاص مخصص حسب هوية العميل الإعلانية</option>
          </select>
        </div>

        {/* 3D Letter Type */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نمط ونوع الحروف البارزة (3D Letters)</Label>
          <select
            value={specs.letterType || 'acrylic_light'}
            onChange={(e) => updateSpec('letterType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="acrylic_light">أكريليك مضيء بالكامل (حافة ووجه) - الأكثر طلباً</option>
            <option value="stainless_backlight">استيل بارز غير مضيء (مع إضاءة خلفية هالو Backlit)</option>
            <option value="zinc_painted">زنكور حديد مدهون ناري مع وجه أكريليك مضيء</option>
            <option value="stainless_chrome">حروف استيل كروم فضي/ذهبي مرايا فاخرة</option>
            <option value="none_flat">بدون حروف بارزة (كلادينج سادة مع لصق مباشر)</option>
          </select>
        </div>

        {/* LED Modules & Transformers */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">مواصفات عدسات الليد الداخلية</Label>
          <select
            value={specs.ledSpecs || 'samsung_lens'}
            onChange={(e) => updateSpec('ledSpecs', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="samsung_lens">عدسات ليد سامسونج كوري أصلية 1.2 واط مقاومة للرطوبة</option>
            <option value="epistar_lens">عدسات ليد تايوانية Epistar عالية الكفاءة والضمان</option>
            <option value="chinese_standard_led">عدسات صينية قياسية موفرة للميزانية</option>
          </select>
        </div>

        {/* Power Transformers */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع وقدرة المحولات الكهربائية (Power Supplies)</Label>
          <select
            value={specs.powerSupplies || 'rainproof_400w'}
            onChange={(e) => updateSpec('powerSupplies', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="rainproof_400w">محول أصلي خارجي مضاد للمطر 400 واط (حماية حرارية)</option>
            <option value="ultra_slim_inside">محولات نحيفة مغلفة لوضعها بداخل اللوحة</option>
            <option value="standard_china_transformer">محول صيني تجاري قياسي</option>
          </select>
        </div>
      </div>

      {/* Dynamic custom field addition */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            حقول ومواصفات إضافية خاصة بالاتفاق:
          </span>
          <Button
            type="button"
            onClick={addCustomField}
            variant="outline"
            size="sm"
            className="rounded-xl font-bold text-[10px] h-8 gap-1 border-indigo-100 text-indigo-600 bg-indigo-50/20"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة مواصفة مخصصة
          </Button>
        </div>

        {customFields.map((field) => (
          <div key={field.id} className="flex gap-2 items-center animate-in slide-in-from-top-1 duration-150">
            <input
              type="text"
              placeholder="مثال: سماكة وجه الأكريليك المطلوبة، لون دهان الاستيل..."
              value={field.label}
              onChange={(e) => updateCustomField(field.id, e.target.value)}
              className="flex-1 text-xs p-2 h-9 border border-slate-200 rounded-lg text-right font-medium focus:ring-1 focus:ring-indigo-400 focus:outline-none"
            />
            <Button
              type="button"
              onClick={() => removeCustomField(field.id)}
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
