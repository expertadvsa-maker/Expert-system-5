import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DigitalScreenSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function DigitalScreenSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: DigitalScreenSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Pixel Pitch */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">دقة بكسل الشاشة (Pixel Pitch)</Label>
          <select
            value={specs.pixelPitch || 'P4_outdoor'}
            onChange={(e) => updateSpec('pixelPitch', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="P1.8_indoor">شاشة داخلية عالية الدقة الفائقة P1.8 (مسافة رؤية قريبة جداً)</option>
            <option value="P2.5_indoor">شاشة داخلية ممتازة P2.5 قاعات وصالات عرض</option>
            <option value="P3.91_outdoor">شاشة خارجية عالية الدقة P3.91 (واجهات ومحلات راقية)</option>
            <option value="P4_outdoor">شاشة خارجية قياسية ممتازة P4 (الأكثر توازناً وجودة)</option>
            <option value="P5_outdoor">شاشة خارجية عادية P5 للمسافات المتوسطة</option>
            <option value="P10_outdoor">شاشة خارجية اقتصادية P10 لوحات الطريق الضخمة</option>
          </select>
        </div>

        {/* Indoor/Outdoor environment */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">بيئة وعزل الشاشة (Screen Environment)</Label>
          <select
            value={specs.screenEnvironment || 'outdoor_waterproof'}
            onChange={(e) => updateSpec('screenEnvironment', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="outdoor_waterproof">خارجية معزولة بالكامل IP65 مضادة للماء ومقاومة للغبار والحرارة</option>
            <option value="indoor_standard">داخلية قياسية مخصصة للمجمعات والمكاتب (بدون مقاومة رطوبة مفرطة)</option>
            <option value="semi_outdoor">شبه خارجية (مظلات، داخل معارض مفتوحة) - معزولة جزئياً</option>
          </select>
        </div>

        {/* Cabinet Specifications */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع وهيكل كابينت الشاشة (Cabinet Specs)</Label>
          <select
            value={specs.cabinetType || 'diecast_aluminum'}
            onChange={(e) => updateSpec('cabinetType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="diecast_aluminum">كابينت ألمنيوم مصبوب خفيف (Die-Cast Aluminum) - فائق الجودة والوزن</option>
            <option value="iron_cabinet">كابينت حديد ثقيل مع أبواب فتح خلفية للتهوية والصيانة</option>
            <option value="custom_framework">شاسيه حديدي مخصص بدون كوابينت جاهزة (صيانة أمامية مباشرة)</option>
          </select>
        </div>

        {/* Controlling system */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نظام معالجة والتحكم بالشاشة (Control System)</Label>
          <select
            value={specs.controlSystem || 'novastar_premium'}
            onChange={(e) => updateSpec('controlSystem', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="novastar_premium">معالج ونظام تحكم نوفاستار (NovaStar) - الأقوى والأشمل للتحكم عن بعد</option>
            <option value="huidu_wifi">كرت تحكم يدوي Huidu مع منفذ USB وواي فاي وتطبيق جوال</option>
            <option value="colorlight_pro">نظام تحكم كولورلايت (ColorLight) عالي الدقة والسرعة</option>
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
              placeholder="مثال: معدل التحديث Refresh Rate، ماركة المروحة الكهربائية..."
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
