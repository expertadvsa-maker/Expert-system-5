import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MegastructureSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function MegastructureSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: MegastructureSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Main Sculpting/Casting Material */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">المادة الأساسية والتشكيل (Megastructure Material)</Label>
          <select
            value={specs.sculptureMaterial || 'fiberglass_reinforced'}
            onChange={(e) => updateSpec('sculptureMaterial', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="fiberglass_reinforced">فايبر جلاس مسلح بالبوليستر (Fiberglass) - مقاوم للحرارة وخفيف الوزن</option>
            <option value="structural_steel">هيكل فولاذي إنشائي ضخم (Heavy Structural Steel) - للارتفاعات والأحمال الكبيرة</option>
            <option value="eps_sculpting">EPS فوم بوليسترين عالي الكثافة منحوت ومحمي بطبقة بولي يوريا صلبة</option>
            <option value="carbon_fiber_lux">ألياف الكربون (Carbon Fiber) - فخامة فائقة ووزن خفيف جداً</option>
          </select>
        </div>

        {/* Foundation & Safety Anchorage */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">هندسة التثبيت والأرضية (Foundation & Anchorage)</Label>
          <select
            value={specs.anchorageType || 'concrete_pad_anchors'}
            onChange={(e) => updateSpec('anchorageType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="concrete_pad_anchors">صب لبشة خرسانية مسلحة (Concrete Pad) مع براغي تثبيت كيميائية J-bolts</option>
            <option value="heavy_base_plate">قاعدة حديدية ذاتية الثقل (Counter-weight base) للمعارض والمواقع المؤقتة</option>
            <option value="soil_piles">أوتاد خرسانية عميقة في التربة (Piles) لضمان عدم الانكفاء بفعل الرياح</option>
          </select>
        </div>

        {/* Outer Finish Coating */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">التشطيب والدهان الخارجي (Finishing Paint)</Label>
          <select
            value={specs.finishCoating || 'auto_epoxy'}
            onChange={(e) => updateSpec('finishCoating', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="auto_epoxy">دهان إيبوكسي فرن سيارات مقاوم للخدش والأشعة البنفسجية UV - حماية تامة</option>
            <option value="gold_chrome_leaf">تجليد ذهبي أو فضي كروم ناصع بورق الذهب (Premium Foil)</option>
            <option value="matte_stone">ملمس حجري خشن يحاكي الجرانيت أو الرخام الطبيعي للمجسمات التراثية</option>
          </select>
        </div>

        {/* Lighting & Effects */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">مؤثرات الإضاءة والعروض المصاحبة (Effects & Lighting)</Label>
          <select
            value={specs.megastructureLighting || 'dynamic_rgb_neon'}
            onChange={(e) => updateSpec('megastructureLighting', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="dynamic_rgb_neon">إضاءة نيون مرن RGB متفاعل ومبرمج مع أنماط حركية ديناميكية</option>
            <option value="mapping_projection">تجهيز ومواءمة السطح لعروض بروجيكتور ذكي (Projection Mapping)</option>
            <option value="external_led_floods">كشافات ليد خارجية غامرة (Flood Lights) بزوايا رؤية درامية</option>
            <option value="none">مظهر جمالي طبيعي بدون إضاءة ليلية</option>
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
              placeholder="مثال: سماكة الحديد الداخلي، توفير تقارير التربة والرياح..."
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
