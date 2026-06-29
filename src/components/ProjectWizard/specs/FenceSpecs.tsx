import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FenceSpecsProps {
  fenceModel: string;
  setFenceModel: (val: string) => void;
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function FenceSpecs({
  fenceModel,
  setFenceModel,
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: FenceSpecsProps) {
  return (
    <div className="space-y-6">
      {/* Fence Model Selector */}
      <div className="space-y-2">
        <Label className="font-black text-slate-500 text-[11px] uppercase tracking-wider pr-1">نوع السور الفرعي المتكيف *</Label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setFenceModel('shinko')}
            className={`p-3 rounded-xl border font-bold text-xs sm:text-sm text-center transition-all ${
              fenceModel === 'shinko'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
            }`}
          >
            🚧 سور شينكو مؤقت
          </button>
          <button
            type="button"
            onClick={() => setFenceModel('commercial')}
            className={`p-3 rounded-xl border font-bold text-xs sm:text-sm text-center transition-all ${
              fenceModel === 'commercial'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
            }`}
          >
            🎨 سور مكسو تجاري
          </button>
          <button
            type="button"
            onClick={() => setFenceModel('chainlink')}
            className={`p-3 rounded-xl border font-bold text-xs sm:text-sm text-center transition-all ${
              fenceModel === 'chainlink'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-600'
            }`}
          >
            🔗 سور شبك حماية
          </button>
        </div>
      </div>

      {/* Model-specific specs rendering */}
      {fenceModel === 'shinko' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">نوع الصاج ومواصفاته</Label>
            <select
              value={specs.shinkoType || '0.4'}
              onChange={(e) => updateSpec('shinkoType', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="0.4">صاج شينكو مضلع مجلفن (سمك 0.4 مم) - قياسي</option>
              <option value="0.5">صاج شينكو مضلع مجلفن (سمك 0.5 مم) - ثقيل</option>
              <option value="0.35">صاج شينكو عادي خفيف (سمك 0.35 مم)</option>
              <option value="painted_blue">شينكو ملون جاهز (أزرق بيج) - سمك 0.45 مم</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">طريقة تثبيت القواعد والأعمدة</Label>
            <select
              value={specs.shinkoBase || 'concrete_poured'}
              onChange={(e) => updateSpec('shinkoBase', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="concrete_poured">صب قواعد خرسانية بالكامل في الأرض (الأكثر ثباتاً)</option>
              <option value="direct_soil">تثبيت ودق الأعمدة مباشرة في الأرض الصلبة</option>
              <option value="bolted_asphalt">تثبيت بمسامير وبراغي توسيع على أرض أسفلتية/خرسانية</option>
            </select>
          </div>
        </div>
      )}

      {fenceModel === 'commercial' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">مادة المكسو الأساسية (Cladding)</Label>
            <select
              value={specs.cladMaterial || 'cement_board'}
              onChange={(e) => updateSpec('cladMaterial', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="cement_board">لوح أسمنت بورد (مقاوم للعوامل الجوية) - قياسي</option>
              <option value="plywood_wood">ألواح خشب أبلكاش/بلايوود خارجي معالج</option>
              <option value="advertising_banner">هيكل حديدي مشدود عليه بنر إعلاني عالي السماكة</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">مواصفات الهيكل الحديدي الحامل</Label>
            <select
              value={specs.cladIronStructure || 'tubes_3_inch'}
              onChange={(e) => updateSpec('cladIronStructure', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="tubes_3_inch">تيوبات حديد مجلفنة 3*3 بوصة (سمك 2 مم) - قياسي</option>
              <option value="tubes_4_inch">تيوبات ثقيلة 4*4 بوصة لمقاومة الرياح القوية</option>
              <option value="light_angles">زوايا حديد خفيفة وهيكل أفقي مساند</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">مقاومة الرياح والتدعيم الخلفي</Label>
            <select
              value={specs.windReinforcement || 'back_supports'}
              onChange={(e) => updateSpec('windReinforcement', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="back_supports">تركيب دعامات وخلفيات مثلثة مائلة (مقاوم للرياح)</option>
              <option value="double_posts">أعمدة مزدوجة وتثبيت مكثف بدون دعامات خلفية</option>
              <option value="standard_bracing">تدعيم أفقي داخلي قياسي</option>
            </select>
          </div>
        </div>
      )}

      {fenceModel === 'chainlink' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">نوع الشبك والارتفاع</Label>
            <select
              value={specs.chainlinkHeightType || 'galvanized_2m'}
              onChange={(e) => updateSpec('chainlinkHeightType', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="galvanized_2m">شبك حديد مجلفن - ارتفاع 2 متر (فتحة 5*5 سم)</option>
              <option value="galvanized_3m">شبك حديد مجلفن - ارتفاع 3 متر للمواقع الأمنية</option>
              <option value="pvc_green_2m">شبك مغطى ببلاستيك أخضر PVC - ارتفاع 2 متر جمالي</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-black text-slate-500">سلك شائك أو إضافات علوية</Label>
            <select
              value={specs.barbedWireOption || 'none'}
              onChange={(e) => updateSpec('barbedWireOption', e.target.value)}
              className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
            >
              <option value="none">بدون أسلاك شائكة إضافية</option>
              <option value="barbed_straight_3rows">3 صفوف أسلاك شائكة مستقيمة علوية</option>
              <option value="concertina_spiral">سلك شائك شفرات حلزوني (Concertina Razor Wire)</option>
            </select>
          </div>
        </div>
      )}

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
              placeholder="مثال: نوع الباب المقترح، تفاصيل دهان الإطار..."
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
