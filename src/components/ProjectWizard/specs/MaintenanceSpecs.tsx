import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function MaintenanceSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: MaintenanceSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Maintenance Contract Type */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع وهدف الصيانة (Maintenance Type)</Label>
          <select
            value={specs.maintenanceType || 'corrective_emergency'}
            onChange={(e) => updateSpec('maintenanceType', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="corrective_emergency">صيانة تصحيحية طارئة (إصلاح أعطال فورية، استبدال ليد/محولات تالفة)</option>
            <option value="preventive_scheduled">صيانة وقائية دورية مجدولة (تنظيف، فحص تمديدات، تقييم سلامة الهيكل)</option>
            <option value="structure_refurbishment">تجديد وإعادة تأهيل واجهة بالكامل (إعادة شد بنر، دهان الهيكل، عزل ممتاز)</option>
          </select>
        </div>

        {/* Height and Access Equipment */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">الارتفاع ومعدات الوصول للموقع (Access Requirements)</Label>
          <select
            value={specs.accessEquipment || 'manlift_hydraulic'}
            onChange={(e) => updateSpec('accessEquipment', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="manlift_hydraulic">توفير رافعة هيدروليكية ذراع (Manlift) للوصول للارتفاعات الكبيرة</option>
            <option value="scaffolding_fixed">تركيب سقالات حديدية ثابتة (Scaffolding) للمواقع الشاقة</option>
            <option value="double_ladders_low">سلالم مزدوجة خفيفة (للارتفاعات أقل من 4 أمتار)</option>
            <option value="rope_access">فريق تسلق بالحبال (Rope Access) للأبراج والواجهات الشاهقة</option>
          </select>
        </div>

        {/* Electrical & Infrastructure Work */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">الأعمال الكهربائية والإنشائية المرافقة</Label>
          <select
            value={specs.electricalInfras || 'led_rewiring'}
            onChange={(e) => updateSpec('electricalInfras', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="led_rewiring">إعادة تسليك وتوجيه الكابلات الكهربائية وتوزيع الأحمال (Rewiring)</option>
            <option value="transformer_replace">استبدال محولات القدرة وتوريد علب حماية مضادة للماء</option>
            <option value="iron_welding_support">أعمال لحام وتدعيم حديدي وتأمين زوايا الصدأ والهياكل القديمة</option>
            <option value="none_simple">فحص ظاهري بسيط بدون تمديدات صعبة</option>
          </select>
        </div>

        {/* Warranty on Maintenance */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">تفاصيل الضمان وقطع الغيار (Warranty)</Label>
          <select
            value={specs.maintenanceWarranty || '3_months'}
            onChange={(e) => updateSpec('maintenanceWarranty', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="3_months">ضمان 3 أشهر على الأعمال المنفذة وقطع الغيار المستبدلة</option>
            <option value="6_months">ضمان 6 أشهر للأعمال الكبرى واللوحات الشاملة</option>
            <option value="1_year_premium">ضمان سنة كاملة مع عقد زيارة فحص مجانية كل 3 أشهر</option>
            <option value="no_warranty_labor">ضمان تشغيلي فوري لحظة التسليم فقط (أجور يد فقط)</option>
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
              placeholder="مثال: أوقات العمل المسموح بها بالموقع، توفير لوحة مؤقتة..."
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
