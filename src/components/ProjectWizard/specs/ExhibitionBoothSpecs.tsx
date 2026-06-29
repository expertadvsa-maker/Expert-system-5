import React from 'react';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExhibitionBoothSpecsProps {
  specs: any;
  updateSpec: (key: string, val: any) => void;
  customFields: Array<{ id: string; label: string; value: string }>;
  addCustomField: () => void;
  updateCustomField: (id: string, val: string) => void;
  removeCustomField: (id: string) => void;
}

export default function ExhibitionBoothSpecs({
  specs,
  updateSpec,
  customFields,
  addCustomField,
  updateCustomField,
  removeCustomField
}: ExhibitionBoothSpecsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-100">
        {/* Booth Main Structure */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">الهيكل والديكور الأساسي (Booth Structure)</Label>
          <select
            value={specs.boothStructure || 'painted_wood'}
            onChange={(e) => updateSpec('boothStructure', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="painted_wood">هيكل خشبي مخصص (MDF / بلايوود) مع تشطيب دهان ناري فاخر أو ورق جدران</option>
            <option value="space_frame_aluminum">ألمنيوم سبيس فريم (Space Frame) مع ألواح بي في سي وستائر بنر مشدودة</option>
            <option value="iron_mesh">هيكل حديد ثقيل صناعي مطعم بعناصر إضاءة حديثة</option>
          </select>
        </div>

        {/* Flooring Type */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">نوع وتشطيب الأرضية (Flooring Type)</Label>
          <select
            value={specs.boothFlooring || 'raised_parquet'}
            onChange={(e) => updateSpec('boothFlooring', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="raised_parquet">أرضية خشبية مرتفعة (Platform) مغطاة بباركيه خشبي مقاوم للماء</option>
            <option value="carpet_direct">فرش سجاد معرض عالي الجودة مباشرة على الأرضية مع إطارات حماية</option>
            <option value="backlit_glass">أرضية زجاجية مضيئة بالكامل لغرض عرض منتجات خاصة</option>
          </select>
        </div>

        {/* Graphics & Lighting */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">الرسومات الجدارية واللوحات (Wall Graphics)</Label>
          <select
            value={specs.boothGraphics || 'textile_backlit'}
            onChange={(e) => updateSpec('boothGraphics', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="textile_backlit">قماش ثري دي مشدود بإضاءة خلفية (Tension Fabric Backlit Box)</option>
            <option value="forex_diecut">ألواح فوركس منقوشة ديجيتال ومقصوصة بشكل مجسم</option>
            <option value="banner_backlight">بنر كوري سميك مشدود ومثبت بمسامير مخفية</option>
          </select>
        </div>

        {/* Specialized Furniture */}
        <div className="space-y-2">
          <Label className="text-xs font-black text-slate-500">الأثاث وتجهيزات الضيافة والـ Counters</Label>
          <select
            value={specs.boothFurniture || 'custom_counter'}
            onChange={(e) => updateSpec('boothFurniture', e.target.value)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-xs font-bold pr-3"
          >
            <option value="custom_counter">كونتر استقبال خشبي مخصص مضيء مع كراسي بار وتجهيز شاشة عرض</option>
            <option value="rental_furniture_standard">أثاث إيجار قياسي (طاولة واجتماع وشاشات عمودية)</option>
            <option value="none_bare">بدون أثاث داخلي (هيكل البوث والجدران فقط)</option>
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
              placeholder="مثال: ارتفاع الواجهة الإجمالية، توفير إنترنت، حوامل العرض..."
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
