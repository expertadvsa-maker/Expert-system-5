import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash, Settings, Shield, Ruler } from 'lucide-react';

interface CustomSpec {
  id: string;
  name: string;
  value: string;
}

interface FenceSpecsWizardProps {
  projectType: string;
  onChange: (specs: any) => void;
  initialSpecs?: any;
}

export default function FenceSpecsWizard({ projectType, onChange, initialSpecs = {} }: FenceSpecsWizardProps) {
  // States for Shinko Fence
  const [corrugatedThickness, setCorrugatedThickness] = useState(initialSpecs.corrugatedThickness || '0.40mm');
  const [installationMethod, setInstallationMethod] = useState(initialSpecs.installationMethod || 'concrete_bases');
  
  // States for Commercial Clad Fence
  const [coveringMaterial, setCoveringMaterial] = useState(initialSpecs.coveringMaterial || 'cement_board');
  const [structureReinforcement, setStructureReinforcement] = useState(initialSpecs.structureReinforcement || 'heavy_40');

  // States for Chain-link Fence
  const [meshType, setMeshType] = useState(initialSpecs.meshType || 'galvanized');
  const [postSpacing, setPostSpacing] = useState(initialSpecs.postSpacing || '3m');

  // Custom flexible specifications
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>(initialSpecs.customSpecs || []);

  // Update parent when any value changes
  useEffect(() => {
    const specs: any = { customSpecs };
    
    if (projectType === 'fence_shinko' || projectType === 'project_hoarding') {
      specs.corrugatedThickness = corrugatedThickness;
      specs.installationMethod = installationMethod;
      specs.concreteStyle = installationMethod === 'concrete_bases' ? 'wet_cast' : 'precast';
    } else if (projectType === 'fence_commercial') {
      specs.coveringMaterial = coveringMaterial;
      specs.structureReinforcement = structureReinforcement;
      specs.coveringStyle = coveringMaterial === 'plywood' ? 'plywood' : 'corrugated_sheet';
    } else if (projectType === 'fence_chainlink') {
      specs.meshType = meshType;
      specs.postSpacing = postSpacing;
    }

    onChange(specs);
  }, [
    projectType, 
    corrugatedThickness, 
    installationMethod, 
    coveringMaterial, 
    structureReinforcement, 
    meshType, 
    postSpacing, 
    customSpecs
  ]);

  const addCustomSpec = () => {
    setCustomSpecs([
      ...customSpecs, 
      { id: Math.random().toString(36).substr(2, 9), name: '', value: '' }
    ]);
  };

  const removeCustomSpec = (id: string) => {
    setCustomSpecs(customSpecs.filter(spec => spec.id !== id));
  };

  const updateCustomSpec = (id: string, field: 'name' | 'value', val: string) => {
    setCustomSpecs(customSpecs.map(spec => spec.id === id ? { ...spec, [field]: val } : spec));
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 space-y-6">
      {/* 🟢 سور شينكو */}
      {(projectType === 'fence_shinko' || projectType === 'project_hoarding') && (
        <div className="space-y-4">
          <h5 className="font-black text-xs text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Shield className="w-4 h-4" />
            <span>🚧 المواصفات الهندسية لسور الشينكو (المؤقت للمواقع)</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">سماكة الزنك المعدني المستعمل (الشينكو)</Label>
              <select
                value={corrugatedThickness}
                onChange={(e) => setCorrugatedThickness(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="0.30mm">سماكة 0.30 ملم (خفيف واقتصادي للمواقع الصغيرة)</option>
                <option value="0.40mm">سماكة 0.40 ملم (معياري هندسي متين ومقاوم للرياح)</option>
                <option value="0.50mm">سماكة 0.50 ملم (ثقيل جداً ومقاوم للالتواء والصدمات)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">طريقة التثبيت بالأرض والتأسيس</Label>
              <select
                value={installationMethod}
                onChange={(e) => setInstallationMethod(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="direct_soil">تثبيت مباشر بالأرض (أوتاد حديدية بدون صبة خرسانية)</option>
                <option value="concrete_bases">صب قواعد خرسانية (قواعد إسمنتية تحت الأعمدة لثبات تام ضد العواصف)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 🔵 سور تجاري مكسو */}
      {projectType === 'fence_commercial' && (
        <div className="space-y-4">
          <h5 className="font-black text-xs text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Settings className="w-4 h-4" />
            <span>🎨 مواصفات السور التجاري المكسو (لوحات دعاية وتجميل المواقع)</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">نوع مادة الكسوة والتلبيس</Label>
              <select
                value={coveringMaterial}
                onChange={(e) => setCoveringMaterial(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="cement_board">أسمنت بورد Cement Board (مقاوم للرطوبة وسهل الدهان بلون موحد مالي)</option>
                <option value="plywood">خشب بلايوود معالج Plywood (مظهر جمالي راقي قابل للدهان والتشطيب)</option>
                <option value="banner">بنر دعائي عريض Banner (مشدود مباشرة على الهيكل - سريع واقتصادي)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">طريقة تدعيم وهندسة الهيكل الخلفي</Label>
              <select
                value={structureReinforcement}
                onChange={(e) => setStructureReinforcement(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="heavy_40">حديد ثقيل مدعم كل 40 سم (مثالي للأسمنت بورد الثقيل لمقاومة العزوم)</option>
                <option value="standard_60">فريمات حديد قياسية كل 60 سم (اقتصادي ومناسب للبنر والارتفاعات العادية)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 🟡 سور شبك */}
      {projectType === 'fence_chainlink' && (
        <div className="space-y-4">
          <h5 className="font-black text-xs text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Ruler className="w-4 h-4" />
            <span>🐐 مواصفات سور الشبك (حماية مزارع وأراضي مفتوحة)</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">نوع ومواصفات السلك والشبك</Label>
              <select
                value={meshType}
                onChange={(e) => setMeshType(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="galvanized">شبك مجلفن متين ضد الصدأ (معياري للحماية الميدانية)</option>
                <option value="pvc_green">شبك مجلفن مغطى بالبلاستيك الأخضر PVC (مظهر جمالي وحماية إضافية)</option>
                <option value="barbed_wire">شبك مجلفن مع سلك شائك علوي (تأمين أمني عالي لمنع التسلل)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase">المسافة بين أعمدة التثبيت الحديدية</Label>
              <select
                value={postSpacing}
                onChange={(e) => setPostSpacing(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-950 border-slate-800 transition-all font-bold text-xs text-slate-200 focus:border-indigo-500/50"
              >
                <option value="2m">كل 2 متر (تدعيم أقصى للأراضي المعرضة للضغط أو الماشية)</option>
                <option value="3m">كل 3 متر (مسافة معيارية ممتازة وعملية)</option>
                <option value="4m">كل 4 متر (اقتصادي جداً للأراضي المفتوحة والمساحات الضخمة)</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            * تنبيه: يتم حفر حفر دائرية صغيرة في التربة وصب خرسانة إسمنتية لتثبيت الأعمدة الفولاذية قبل تمديد وربط الشبك.
          </p>
        </div>
      )}

      {/* 🛠️ المواصفات المخصصة وحرية الاتفاق مع العميل */}
      <div className="space-y-4 border-t border-slate-800/40 pt-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-black text-xs text-slate-200 block">🛠️ مواصفات استثنائية وبنود خاصة بالعميل</span>
            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
              أضف أي تفاصيل أو متطلبات خاصة تم الاتفاق عليها مع العميل في عقده ومخططه
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addCustomSpec}
            className="h-8 gap-1.5 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-black"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة خانة مخصصة
          </Button>
        </div>

        {customSpecs.length > 0 && (
          <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
            {customSpecs.map((spec) => (
              <div key={spec.id} className="flex gap-2 items-center bg-slate-950/40 p-2 rounded-xl border border-slate-800/50">
                <Input
                  value={spec.name}
                  onChange={(e) => updateCustomSpec(spec.id, 'name', e.target.value)}
                  placeholder="اسم البند (مثال: سلك حلزوني علوي)"
                  className="flex-1 h-9 bg-slate-950 border-slate-800 text-xs font-bold text-slate-200"
                />
                <Input
                  value={spec.value}
                  onChange={(e) => updateCustomSpec(spec.id, 'value', e.target.value)}
                  placeholder="القيمة والكمية (مثال: طول 350 متر)"
                  className="flex-1 h-9 bg-slate-950 border-slate-800 text-xs font-bold text-slate-200"
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeCustomSpec(spec.id)}
                  className="h-9 w-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-0 rounded-lg"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
