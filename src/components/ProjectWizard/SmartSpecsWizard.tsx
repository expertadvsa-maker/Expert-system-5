import React, { useState, useEffect } from 'react';
import { Shield, Settings, Ruler, HelpCircle } from 'lucide-react';
import FenceSpecs from './specs/FenceSpecs';
import SignageSpecs from './specs/SignageSpecs';
import CladdingSpecs from './specs/CladdingSpecs';
import DigitalScreenSpecs from './specs/DigitalScreenSpecs';
import VehicleWrappingSpecs from './specs/VehicleWrappingSpecs';
import ExhibitionBoothSpecs from './specs/ExhibitionBoothSpecs';
import MaintenanceSpecs from './specs/MaintenanceSpecs';
import MegastructureSpecs from './specs/MegastructureSpecs';

interface CustomSpec {
  id: string;
  name: string;
  value: string;
}

interface SmartSpecsWizardProps {
  projectType: string;
  onChange: (specs: any) => void;
  initialSpecs?: any;
}

export default function SmartSpecsWizard({ projectType, onChange, initialSpecs = {} }: SmartSpecsWizardProps) {
  // General specs state dictionary
  const [specs, setSpecs] = useState<any>(initialSpecs.specs || initialSpecs || {});
  
  // Custom specs state
  const [customSpecs, setCustomSpecs] = useState<CustomSpec[]>(
    initialSpecs.customSpecs || initialSpecs.customFields?.map((f: any) => ({ id: f.id, name: f.label, value: f.value })) || []
  );

  // For fence model state
  const [fenceModel, setFenceModel] = useState<string>(() => {
    if (projectType === 'fence_shinko' || projectType === 'project_hoarding' || projectType === 'hoardings') return 'shinko';
    if (projectType === 'fence_commercial') return 'commercial';
    if (projectType === 'fence_chainlink') return 'chainlink';
    return 'shinko';
  });

  // Sync fenceModel with projectType if projectType changes
  useEffect(() => {
    if (projectType === 'fence_shinko' || projectType === 'project_hoarding' || projectType === 'hoardings') {
      setFenceModel('shinko');
    } else if (projectType === 'fence_commercial') {
      setFenceModel('commercial');
    } else if (projectType === 'fence_chainlink') {
      setFenceModel('chainlink');
    }
  }, [projectType]);

  // Update a single spec value
  const updateSpec = (key: string, val: any) => {
    setSpecs((prev: any) => ({
      ...prev,
      [key]: val
    }));
  };

  // Add custom specification
  const addCustomField = () => {
    setCustomSpecs((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), name: '', value: '' }
    ]);
  };

  // Update custom specification label
  const updateCustomField = (id: string, val: string) => {
    setCustomSpecs((prev) =>
      prev.map((field) => (field.id === id ? { ...field, name: val, value: val } : field))
    );
  };

  // Remove custom specification
  const removeCustomField = (id: string) => {
    setCustomSpecs((prev) => prev.filter((field) => field.id !== id));
  };

  // Notify parent on change
  useEffect(() => {
    const customFieldsMapped = customSpecs.map(f => ({ id: f.id, label: f.name, value: f.value }));
    const combinedSpecs = {
      ...specs,
      customSpecs,
      customFields: customFieldsMapped,
      projectTypeUsed: projectType,
      fenceModel: (projectType.includes('fence') || projectType === 'project_hoarding' || projectType === 'hoardings') ? fenceModel : undefined
    };
    onChange(combinedSpecs);
  }, [specs, customSpecs, projectType, fenceModel]);

  // Determine which sub-wizard to show
  const isFence = projectType.includes('fence') || projectType === 'project_hoarding' || projectType === 'hoardings';
  const isSignage = projectType.includes('sign') || projectType.includes('print') || projectType === 'signage';
  const isCladding = projectType.includes('clad') || projectType === 'cladding';
  const isScreen = projectType.includes('screen') || projectType.includes('digital');
  const isWrap = projectType.includes('wrap') || projectType.includes('car') || projectType.includes('vehicle');
  const isBooth = projectType.includes('booth') || projectType.includes('exhabit') || projectType.includes('exhibition');
  const isMaintenance = projectType.includes('maintain') || projectType.includes('maintenance') || projectType.includes('repair');
  const isMegastructure = projectType.includes('mega') || projectType.includes('sculpture') || projectType === 'megastructures';

  // Map custom field array format for the child components
  const childCustomFields = customSpecs.map(f => ({ id: f.id, label: f.name, value: f.value }));

  const handleChildCustomUpdate = (id: string, val: string) => {
    updateCustomField(id, val);
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 space-y-6 shadow-sm">
      {/* Dynamic Headers based on type */}
      {isFence && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Shield className="w-4 h-4" />
          <span>🚧 المواصفات الهندسية للأسوار المتكيفة</span>
        </h5>
      )}

      {isSignage && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Settings className="w-4 h-4" />
          <span>🎨 مواصفات وتصنيع اللوحات الإعلانية والطباعة</span>
        </h5>
      )}

      {isCladding && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Settings className="w-4 h-4" />
          <span>🏢 مواصفات وأعمال الكلادينج والحروف البارزة</span>
        </h5>
      )}

      {isScreen && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Ruler className="w-4 h-4" />
          <span>📺 مواصفات وتجهيز الشاشات الرقمية والشاشات الإعلانية</span>
        </h5>
      )}

      {isWrap && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Settings className="w-4 h-4" />
          <span>🚗 مواصفات طباعة وتغليف المركبات والسيارات</span>
        </h5>
      )}

      {isBooth && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Ruler className="w-4 h-4" />
          <span>🎪 مواصفات وتصميم البوثات وأجنحة المعارض</span>
        </h5>
      )}

      {isMaintenance && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Shield className="w-4 h-4" />
          <span>🛠️ تفاصيل ومواصفات صيانة اللوحات والشاشات</span>
        </h5>
      )}

      {isMegastructure && (
        <h5 className="font-black text-xs text-indigo-600 flex items-center gap-1.5 border-b border-slate-200/80 pb-2">
          <Ruler className="w-4 h-4" />
          <span>🗼 تفاصيل ومواصفات المجسمات الجمالية والإنشائية الضخمة</span>
        </h5>
      )}

      {/* RENDER THE CORRESPONDING CHILD COMPONENT */}
      <div className="text-slate-800">
        {isFence && (
          <FenceSpecs
            fenceModel={fenceModel}
            setFenceModel={setFenceModel}
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isSignage && (
          <SignageSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isCladding && (
          <CladdingSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isScreen && (
          <DigitalScreenSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isWrap && (
          <VehicleWrappingSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isBooth && (
          <ExhibitionBoothSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isMaintenance && (
          <MaintenanceSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {isMegastructure && (
          <MegastructureSpecs
            specs={specs}
            updateSpec={updateSpec}
            customFields={childCustomFields}
            addCustomField={addCustomField}
            updateCustomField={handleChildCustomUpdate}
            removeCustomField={removeCustomField}
          />
        )}

        {/* Fallback if none of the pre-defined categories matched */}
        {!isFence && !isSignage && !isCladding && !isScreen && !isWrap && !isBooth && !isMaintenance && !isMegastructure && (
          <div className="space-y-4">
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200/80 text-center">
              <HelpCircle className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-bold">معالج المواصفات العامة الذكي</p>
              <p className="text-[10px] text-slate-500 mt-1">يرجى إضافة أي بنود أو مواصفات خاصة بهذا المشروع أدناه بالضغط على إضافة مواصفة مخصصة</p>
            </div>
            
            <FenceSpecs
              fenceModel="shinko"
              setFenceModel={() => {}}
              specs={specs}
              updateSpec={updateSpec}
              customFields={childCustomFields}
              addCustomField={addCustomField}
              updateCustomField={handleChildCustomUpdate}
              removeCustomField={removeCustomField}
            />
          </div>
        )}
      </div>
    </div>
  );
}
