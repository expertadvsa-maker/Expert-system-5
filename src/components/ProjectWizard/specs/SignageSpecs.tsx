import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignageSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function SignageSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: SignageSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Signage material face */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">مادة وجه اللوحة (Face Material)</Label>
          <select
            value={specs.signFaceMaterial || 'flex_face'}
            onChange={(e) => updateSpec('signFaceMaterial', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="flex_face">فليكس فيس كوري عالي الجودة (مضيء) - قياسي</option>
            <option value="banner_backlit">بنر إعلاني مشدود (إضاءة خارجية)</option>
            <option value="vinyl_sticker">ملصق فينيل لاصق مع طبقة حماية (رينوليت)</option>
            <option value="acrylic_flat">اكريليك مسطح مع وجه طباعة ديجيتال</option>
          </select>
        </div>

        {/* Framing and structure */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع الإطار الداخلي والهيكل</Label>
          <select
            value={specs.signFrameType || 'iron_structure'}
            onChange={(e) => updateSpec('signFrameType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="iron_structure">زاوية حديد مجلفنة تيوب 1.5 بوصة - قياسي</option>
            <option value="heavy_duty_box">علبة حديدية ثقيلة للوحات الكبيرة واليوني بول</option>
            <option value="wood_frame">إطار خشبي سويدي خفيف للوحات الداخلية والمؤقتة</option>
          </select>
        </div>

        {/* Lighting system */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نظام الإضاءة المقترح</Label>
          <select
            value={specs.signLightingSystem || 'led_tubes'}
            onChange={(e) => updateSpec('signLightingSystem', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="led_tubes">أنابيب ليد LED عالية السطوع موفرة للطاقة - قياسي</option>
            <option value="led_modules">عدسات ليد (LED Modules) مقاومة للماء والحرارة</option>
            <option value="external_spotlights">كشافات ليد خارجية (Spotlights) مشدودة على ذراع حديدي</option>
            <option value="none">لوحة عادية بدون إضاءة</option>
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
              placeholder="مثال: دقة الطباعة المطلوبة DPI، لون الإطار الخارجي..."
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
