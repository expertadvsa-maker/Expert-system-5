const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'gemini.ts');
let fileContent = fs.readFileSync(filePath, 'utf8');

// Define the new interface ExtractedProjectData
const newInterface = `export interface ExtractedProjectData {
  title?: string;
  description?: string;
  budget?: number;
  projectValue?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  locationLink?: string;
  startDate?: string;
  endDate?: string;
  projectType?: 'facade_cladding' | '3d_letters' | 'flex_banner' | 'unipole_megastructure' | 'outdoor_led' | 'indoor_led' | 'exhibition_booth' | 'vehicle_wrap' | 'project_hoarding' | 'maintenance_repair';
  supervisor?: string;
  contractNumber?: string;
  engOffice?: string;
  totalArea?: string;

  // New engineering/technical fields
  claddingThickness?: string;
  ironStructureType?: string;
  letterLightingType?: string;
  ledPixelPitch?: string;
  ledAccessType?: string;
  ledBrightness?: string;
  vehicleType?: string;
  vinylType?: string;
  concreteDepth?: string;
  corrugatedThickness?: string;

  // Real-world dynamic contracting wizard fields
  installationHeightMeters?: number;
  requiredEquipment?: string[];
  highwaySpeedRisk?: boolean;

  materialEstimates?: Array<{
    name: string;
    qty: number;
    unit: string;
    purpose: string;
    wastagePercent?: number;
  }>;

  safetyGaps?: Array<{
    severity: 'critical' | 'warning';
    field: string;
    issue: string;
    recommendation: string;
    fallbackValue?: string;
  }>;

  visualLocationAnalysis?: {
    estimatedFloors?: number;
    risksDetected?: string[];
    equipmentReasoning?: string;
  };

  historicalPrecedent?: {
    similarProjectTitle?: string;
    similarityReasoning?: string;
    lessonsLearned?: string[];
  };

  municipalityCompliance?: {
    isCompliant?: boolean;
    municipalityName?: string;
    regulationsApplicable?: string[];
    violationsDetected?: string[];
    remedialActions?: string[];
  };
}`;

// Define the prompt and new function implementations
const newParseFunction = `export const parseProjectFromText = async (text: string, pastProjects?: any[]): Promise<ExtractedProjectData | null> => {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("مفتاح API غير متوفر أو غير صالح. يرجى إعداد مفتاح الذكاء الاصطناعي في الإعدادات.");
  }

  let learningContext = "";
  if (pastProjects && pastProjects.length > 0) {
    const samples = pastProjects.slice(0, 12).map(p => ({
      title: p.title,
      projectType: p.projectType,
      description: p.description,
      budget: p.budget,
      materialEstimates: p.materialEstimates,
      safetyGaps: p.safetyGaps,
      requiredEquipment: p.requiredEquipment,
      installationHeightMeters: p.installationHeightMeters
    }));
    learningContext = \`
**محرك التعلم الذاتي الهندسي (الخبرات والتجارب التشغيلية السابقة للمؤسسة):**
بصفتك مهندساً حكيماً، ادرس وتعلم من المشاريع والتقديرات السابقة لرفع دقة الحسابات وتقدير المواد والاحتياجات:
\${JSON.stringify(samples, null, 2)}
\`;
  }

  try {
    const prompt = \`
      بصفتك مهندساً حقيقياً خبيراً في تقدير وتصميم وتجهيز مشاريع الدعاية والإعلان والمقاولات الإنشائية في المملكة العربية السعودية.
      قم بتحليل النص المرفق لطلب مشروع جديد، واستخرج منه البيانات المطلوبة بدقة هندسية وتقديرية كاملة.

      \${learningContext}

      النص المدخل:
      "\${text}"

      المعايير والاشتراطات الهندسية للتقدير الذكي والتحليل:
      1. projectType (نوع العمل بدقة): حدد بدقة متناهية واحداً من الأنواع التالية:
         - 'facade_cladding' (واجهات كلادينج)
         - '3d_letters' (حروف بارزة مضيئة)
         - 'flex_banner' (لوحات فليكس وبنر)
         - 'unipole_megastructure' (يوني بول وميجا ستراكشر)
         - 'outdoor_led' (شاشات LED خارجية)
         - 'indoor_led' (شاشات LED داخلية)
         - 'exhibition_booth' (تجهيز معارض وبوثات)
         - 'vehicle_wrap' (تغليف مركبات وهويات سيارات)
         - 'project_hoarding' (أسوار مواقع ومشاريع إنشائية)
         - 'maintenance_repair' (صيانة لوحات وشاشات)
      2. التقديرات الفنية الخاصة بنوع العمل:
         - للكلادينج: claddingThickness (مثال: '4mm' أو '3mm')، ironStructureType (مثال: 'تيوب حديد 40x40 مم').
         - للحروف: letterLightingType (مثال: 'LED داخلي مقاوم للماء').
         - للشاشات: ledPixelPitch (مثال: 'P3.91' أو 'P4' أو 'P10')، ledAccessType (مثال: 'صيانة أمامية' أو 'صيانة خلفية').
         - للسيارات: vehicleType (مثال: 'دينا' أو 'باص')، vinylType (مثال: 'ثيرمال ألماني كاست').
         - لليوني بول والأعمدة: concreteDepth (عمق القواعد الخرسانية).
         - للأسوار الإنشائية: corrugatedThickness (سمك الشنكو).
      3. materialEstimates (جدول كميات المواد التقديري): بصفتك مهندساً حقيقياً، قم بحساب وتقدير المواد المطلوبة للعمل (الحديد، الأسلاك، الإضاءة، المسامير، الكلادينج، الأجهزة، الأسمنت، إلخ) مع تحديد الكمية، الوحدة، والهدف من الاستخدام باللغة العربية بدقة متناهية.
      4. safetyGaps (رادار فحص السلامة والمخاطر الهندسية): افحص المخاطر مثل قرب الموقع من طريق سريع، ارتفاع شاهق، رياح شديدة، نقص التدعيم الإنشائي وصغها كتوصيات سلامة هندسية.
      5. municipalityCompliance (رادار الالتزام بالاشتراطات البلدية السعودية): حدد الأمانة المعنية (مثال: أمانة منطقة الرياض) وافحص توافق اللوحة مع شروط البروز، التراخيص، والسلامة العامة لتفادي المخالفات والبلدية.
      6. historicalPrecedent (الذاكرة التراكمية الذكية): ابحث في المشاريع السابقة الموفرة لك أعلاه عن مشروع مشابه للتعلم منه وتطبيق دروسه المستفادة لتفادي تكرار الأخطاء البرمجية أو الإنشائية.

      أرجع النتيجة بصيغة JSON فقط مطابقة للمخطط تماماً دون أي مقدمات أو تعليقات خارجية.
    \`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            budget: { type: Type.NUMBER },
            projectValue: { type: Type.NUMBER },
            clientName: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            locationLink: { type: Type.STRING },
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            projectType: { 
              type: Type.STRING,
              enum: ['facade_cladding', '3d_letters', 'flex_banner', 'unipole_megastructure', 'outdoor_led', 'indoor_led', 'exhibition_booth', 'vehicle_wrap', 'project_hoarding', 'maintenance_repair']
            },
            claddingThickness: { type: Type.STRING },
            ironStructureType: { type: Type.STRING },
            letterLightingType: { type: Type.STRING },
            ledPixelPitch: { type: Type.STRING },
            ledAccessType: { type: Type.STRING },
            ledBrightness: { type: Type.STRING },
            vehicleType: { type: Type.STRING },
            vinylType: { type: Type.STRING },
            concreteDepth: { type: Type.STRING },
            corrugatedThickness: { type: Type.STRING },
            installationHeightMeters: { type: Type.NUMBER },
            requiredEquipment: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            highwaySpeedRisk: { type: Type.BOOLEAN },
            materialEstimates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  qty: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  wastagePercent: { type: Type.NUMBER }
                },
                required: ["name", "qty", "unit", "purpose"]
              }
            },
            safetyGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['critical', 'warning'] },
                  field: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  fallbackValue: { type: Type.STRING }
                },
                required: ["severity", "field", "issue", "recommendation"]
              }
            },
            visualLocationAnalysis: {
              type: Type.OBJECT,
              properties: {
                estimatedFloors: { type: Type.NUMBER },
                risksDetected: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                equipmentReasoning: { type: Type.STRING }
              }
            },
            historicalPrecedent: {
              type: Type.OBJECT,
              properties: {
                similarProjectTitle: { type: Type.STRING },
                similarityReasoning: { type: Type.STRING },
                lessonsLearned: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            municipalityCompliance: {
              type: Type.OBJECT,
              properties: {
                isCompliant: { type: Type.BOOLEAN },
                municipalityName: { type: Type.STRING },
                regulationsApplicable: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                violationsDetected: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                remedialActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractedProjectData;
    }
    return null;
  } catch (error) {
    console.error("AI parsing failed:", error);
    throw error;
  }
};`;

const newAnalyzeFunction = `export const analyzeProjectDocument = async (dataUrl: string, mimeType: string, pastProjects?: any[]): Promise<ExtractedProjectData> => {
  const ai = getGeminiClient();
  if (!ai) throw new Error("مفتاح API غير متوفر أو غير صالح. يرجى إعداد مفتاح الذكاء الاصطناعي في الإعدادات.");
  
  let base64Data = dataUrl;
  if (dataUrl.includes(';base64,')) {
    base64Data = dataUrl.split(';base64,')[1];
  } else if (dataUrl.startsWith('data:')) {
    base64Data = dataUrl.split(',')[1];
  }

  let learningContext = "";
  if (pastProjects && pastProjects.length > 0) {
    const samples = pastProjects.slice(0, 12).map(p => ({
      title: p.title,
      projectType: p.projectType,
      description: p.description,
      budget: p.budget,
      materialEstimates: p.materialEstimates,
      safetyGaps: p.safetyGaps,
      requiredEquipment: p.requiredEquipment,
      installationHeightMeters: p.installationHeightMeters
    }));
    learningContext = \`
**محرك التعلم الذاتي الهندسي (الخبرات والتجارب التشغيلية السابقة للمؤسسة):**
بصفتك مهندساً حكيماً، ادرس وتعلم من المشاريع والتقديرات السابقة لرفع دقة الحسابات وتقدير المواد والاحتياجات:
\${JSON.stringify(samples, null, 2)}
\`;
  }

  try {
    const prompt = \`
      أنت مهندس خبير ومستشار فني في تقدير وتحليل مستندات المشاريع والعقود وعروض الأسعار والرسومات الهندسية لشركة مقاولات دعاية وإعلان في المملكة العربية السعودية.
      قم بتحليل الملف المرفق بدقة متناهية واستخرج منه أو قدر له كافة البيانات الفنية والتقديرية المطلوبة لتأسيس ملف مشروع متكامل.

      \${learningContext}
      
      البيانات الفنية والهندسية المطلوبة:
      1. title: عنوان المشروع (مثال: لوحة واجهة محل - فرع السليمانية).
      2. description: وصف تفصيلي لنطاق العمل الفني والمواصفات المذكورة.
      3. budget: القيمة الإجمالية للمشروع كـ رقم فقط (مثال: 45000).
      4. projectType (نوع العمل بدقة): حدد بدقة متناهية واحداً من الأنواع التالية:
         - 'facade_cladding' (واجهات كلادينج)
         - '3d_letters' (حروف بارزة مضيئة)
         - 'flex_banner' (لوحات فليكس وبنر)
         - 'unipole_megastructure' (يوني بول وميجا ستراكشر)
         - 'outdoor_led' (شاشات LED خارجية)
         - 'indoor_led' (شاشات LED داخلية)
         - 'exhibition_booth' (تجهيز معارض وبوثات)
         - 'vehicle_wrap' (تغليف مركبات وهويات سيارات)
         - 'project_hoarding' (أسوار مواقع ومشاريع إنشائية)
         - 'maintenance_repair' (صيانة لوحات وشاشات)
      5. التقديرات الفنية الخاصة بنوع العمل:
         - للكلادينج: claddingThickness (سمك الكلادينج)، ironStructureType (نوع هيكل الحديد).
         - للحروف: letterLightingType (نوع إضاءة الحروف).
         - للشاشات: ledPixelPitch (بيكسل بيتش)، ledAccessType (طريقة الصيانة).
         - للسيارات: vehicleType (نوع السيارة)، vinylType (نوع الفينيل والمطبوعات).
         - لليوني بول والأعمدة: concreteDepth (عمق القواعد الخرسانية).
         - للأسوار الإنشائية: corrugatedThickness (سمك الشنكو).
      6. materialEstimates (جدول كميات المواد التقديري): بصفتك مهندساً حقيقياً، قم بحساب وتقدير المواد المطلوبة للعمل (الحديد، الأسلاك، الإضاءة، المسامير، الكلادينج، الأجهزة، الأسمنت، إلخ) مع تحديد الكمية، الوحدة، والهدف من الاستخدام باللغة العربية بدقة متناهية.
      7. safetyGaps (رادار فحص السلامة والمخاطر الهندسية): افحص المخاطر وصغها كتوصيات سلامة هندسية.
      8. municipalityCompliance (رادار الالتزام بالاشتراطات البلدية السعودية): حدد الأمانة المعنية وافحص توافق اللوحة مع الشروط.
      9. historicalPrecedent (الذاكرة التراكمية الذكية): ابحث في المشاريع السابقة الموفرة لك أعلاه عن مشروع مشابه للتعلم منه وتطبيق دروسه المستفادة.

      أرجع النتيجة بصيغة JSON فقط مطابقة للمخطط تماماً وبشكل صارم دون أي تعليقات خارجية.
    \`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || "application/pdf",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            budget: { type: Type.NUMBER },
            projectValue: { type: Type.NUMBER },
            clientName: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            startDate: { type: Type.STRING },
            endDate: { type: Type.STRING },
            contractNumber: { type: Type.STRING },
            totalArea: { type: Type.STRING },
            projectType: { 
              type: Type.STRING,
              enum: ['facade_cladding', '3d_letters', 'flex_banner', 'unipole_megastructure', 'outdoor_led', 'indoor_led', 'exhibition_booth', 'vehicle_wrap', 'project_hoarding', 'maintenance_repair']
            },
            claddingThickness: { type: Type.STRING },
            ironStructureType: { type: Type.STRING },
            letterLightingType: { type: Type.STRING },
            ledPixelPitch: { type: Type.STRING },
            ledAccessType: { type: Type.STRING },
            ledBrightness: { type: Type.STRING },
            vehicleType: { type: Type.STRING },
            vinylType: { type: Type.STRING },
            concreteDepth: { type: Type.STRING },
            corrugatedThickness: { type: Type.STRING },
            installationHeightMeters: { type: Type.NUMBER },
            requiredEquipment: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            highwaySpeedRisk: { type: Type.BOOLEAN },
            materialEstimates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  qty: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  wastagePercent: { type: Type.NUMBER }
                },
                required: ["name", "qty", "unit", "purpose"]
              }
            },
            safetyGaps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING, enum: ['critical', 'warning'] },
                  field: { type: Type.STRING },
                  issue: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                  fallbackValue: { type: Type.STRING }
                },
                required: ["severity", "field", "issue", "recommendation"]
              }
            },
            visualLocationAnalysis: {
              type: Type.OBJECT,
              properties: {
                estimatedFloors: { type: Type.NUMBER },
                risksDetected: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                equipmentReasoning: { type: Type.STRING }
              }
            },
            historicalPrecedent: {
              type: Type.OBJECT,
              properties: {
                similarProjectTitle: { type: Type.STRING },
                similarityReasoning: { type: Type.STRING },
                lessonsLearned: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            municipalityCompliance: {
              type: Type.OBJECT,
              properties: {
                isCompliant: { type: Type.BOOLEAN },
                municipalityName: { type: Type.STRING },
                regulationsApplicable: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                violationsDetected: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                remedialActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractedProjectData;
    }
    throw new Error("لم يتم إرجاع أي بيانات من التحليل");
  } catch (error) {
    console.error("AI document analysis failed:", error);
    throw error;
  }
};`;

// Locate the original targets and replace them
// We replace ExtractedProjectData, parseProjectFromText and analyzeProjectDocument.
// The block to replace starts with: export interface ExtractedProjectData
// and ends with the end of analyzeProjectDocument function.

const startMark = "export interface ExtractedProjectData";
const endMark = "export const analyzeCompanyPortfolioCredit";

const startIndex = fileContent.indexOf(startMark);
const endIndex = fileContent.indexOf(endMark);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start/end marks in gemini.ts!");
  process.exit(1);
}

const replacement = `${newInterface}\n\n${newParseFunction}\n\n${newAnalyzeFunction}\n\n`;

const finalContent = fileContent.substring(0, startIndex) + replacement + fileContent.substring(endIndex);
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("Successfully patched src/lib/gemini.ts!");
