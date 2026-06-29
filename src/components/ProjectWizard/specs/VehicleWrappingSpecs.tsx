import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VehicleWrappingSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function VehicleWrappingSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: VehicleWrappingSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Vehicle Type */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع وهيكل المركبة (Vehicle Type)</Label>
          <select
            value={specs.vehicleType || 'sedan_suv'}
            onChange={(e) => updateSpec('vehicleType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="sedan_suv">سيارة سيدان صغيرة أو سيارة SUV عائلية</option>
            <option value="delivery_van">حافلة نقل بضائع / فان ديليفري صغير</option>
            <option value="truck_dyna">شاحنة متوسطة (دينا) أو صندوق خلفي مسطح</option>
            <option value="large_bus">حافلة ركاب كبيرة (أوتوبيس) - تغليف دعائي شامل</option>
          </select>
        </div>

        {/* Wrapping Coverage */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">مستوى وحجم التغليف (Wrapping Coverage)</Label>
          <select
            value={specs.wrapCoverage || 'full_wrap'}
            onChange={(e) => updateSpec('wrapCoverage', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="full_wrap">تغليف دعائي كامل لكامل هيكل السيارة مع النوافذ (Full Wrap)</option>
            <option value="partial_wrap">تغليف جزئي (الأبواب الجانبية والخلفية فقط) - اقتصادي ومتزن</option>
            <option value="logos_only">لصق شعارات ومعلومات الشركة مقصوصة بالكمبيوتر (Cutout Decals)</option>
          </select>
        </div>

        {/* Vinyl Sticker Brand */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">العلامة التجارية والشركة للفينيل (Vinyl Brand)</Label>
          <select
            value={specs.vinylBrand || '3M_ij180'}
            onChange={(e) => updateSpec('vinylBrand', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="3M_ij180">فينيل ثري إم كاست أصلي (3M IJ180) عالي الحماية والمرونة - فائق التميز</option>
            <option value="avery_dennison">أفيري دينيسون ألماني أصلي (Avery Dennison) - ممتاز وسلس الفك</option>
            <option value="oracal_premium">أوراكال ألماني ممتاز (Oracal 970 Premium) - ثبات ألوان فائق</option>
            <option value="chinese_promo">فينيل صيني ترويجي عادي (للمناسبات والحملات القصيرة)</option>
          </select>
        </div>

        {/* Overlamination and UV Protection */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">طبقة الحماية ومقاومة الخدوش (Overlaminate)</Label>
          <select
            value={specs.overlamination || 'gloss_uv'}
            onChange={(e) => updateSpec('overlamination', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="gloss_uv">طبقة حماية لامعة مضادة للأشعة فوق البنفسجية UV (Glossy Laminate) - قياسي</option>
            <option value="matte_premium">طبقة حماية مطفية ناعمة فخمة (Matte Laminate)</option>
            <option value="perforated_glass">لاصق زجاج مخرم (One-Way Vision) يسمح بالرؤية للداخل والخارج</option>
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
              placeholder="مثال: فك مقبض الباب والمرايا لإتقان التركيب، تغطية السقف..."
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
