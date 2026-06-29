import { GoogleGenAI, Type } from "@google/genai";
import { Project, Transaction } from "../types";

const getGeminiClient = () => {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || 
                 (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_GEMINI_API_KEY') : '') || 
                 (typeof window !== 'undefined' ? (window as any).VITE_GEMINI_API_KEY : '') ||
                 (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') || 
                 '';
  if (!apiKey || apiKey === 'undefined' || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    console.warn("Gemini API key is not configured or is using a placeholder.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- Caching layer to reduce API consumption ---
const hashPrompt = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `ai_cache_${hash}`;
};

const getCachedResponse = (prompt: string): string | null => {
  try { return sessionStorage.getItem(hashPrompt(prompt)); } catch (e) { return null; }
};

const setCachedResponse = (prompt: string, response: string) => {
  try { sessionStorage.setItem(hashPrompt(prompt), response); } catch (e) {}
};
// ------------------------------------------------

export interface InvoiceData {
  amount: number;
  date: string;
  vendor: string;
  vendorPhone?: string;
  invoiceNumber?: string;
  items: string[];
  description: string;
  taxAmount?: number;
  verificationData?: {
    trustScore: number;
    timeDiscrepancyHours: number;
    badges: string[];
  };
}

export interface QuickScanResult {
  isValidInvoice: boolean;
  isBlurry: boolean;
  data?: {
    amount: number;
    vendor: string;
    vendorPhone?: string;
    invoiceNumber?: string;
    date: string;
    items?: string[];
    description?: string;
  };
  errorReason?: string;
}

export const quickAnalyzeInvoice = async (dataUrl: string): Promise<QuickScanResult> => {
  const ai = getGeminiClient();
  if (!ai) throw new Error("مفتاح API غير متوفر.");
  
  let mimeType = "image/jpeg";
  let base64Data = dataUrl;

  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(';');
    mimeType = parts[0].split(':')[1];
    base64Data = parts[1].replace('base64,', '');
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: `كخبير فحص فوري، تحقق من هذه الصورة واطلعني بالنتائج بصيغة JSON فقط:
1. هل هي فاتورة شراء واضحة؟ (isValidInvoice)
2. هل النص مهزوز أو غير مقروء؟ (isBlurry)
3. إذا كانت فاتورة، استخرج (amount, vendor, date).
4. إذا لم تكن فاتورة، اذكر السبب في errorReason باختصار.` },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || "image/jpeg",
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
            isValidInvoice: { type: Type.BOOLEAN },
            isBlurry: { type: Type.BOOLEAN },
            data: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                vendor: { type: Type.STRING },
                date: { type: Type.STRING },
              }
            },
            errorReason: { type: Type.STRING }
          },
          required: ["isValidInvoice", "isBlurry"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as QuickScanResult;
    }
    return { isValidInvoice: false, isBlurry: false, errorReason: "لم يتم التعرف" };
  } catch (error) {
    console.warn("Batch scan warning:", error);
    return { isValidInvoice: false, isBlurry: true, errorReason: "خطأ فني" };
  }
};

export const analyzeInvoice = async (
  dataUrl: string, 
  geoCapture?: {lat: number, lng: number} | null, 
  captureTime?: string | null
): Promise<InvoiceData> => {
  const ai = getGeminiClient();
  if (!ai) throw new Error("مفتاح API غير متوفر. يرجى إضافة GEMINI_API_KEY في النظام.");
  
  let mimeType = "image/jpeg";
  let base64Data = dataUrl;

  if (dataUrl.startsWith('data:')) {
    const parts = dataUrl.split(';');
    mimeType = parts[0].split(':')[1];
    base64Data = parts[1].replace('base64,', '');
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: `قم بتحليل المستند أو الفاتورة المرفقة (سواء صورة أو ملف PDF) واستخراج المعلومات بدقة واحترافية.
**ملاحظة هامة جداً:** يجب إعطاء الأولوية المطلقة للغة العربية في استخراج اسم المورد، الأصناف، والوصف. لا تستخدم الإنجليزية إلا إذا كان النص غير متوفر بالعربية.
1. المبلغ الإجمالي: استخرج الرقم فقط.
2. مبلغ الضريبة (taxAmount): استخرج مبلغ ضريبة القيمة المضافة أو الضرائب الأخرى إن وجدت. إذا لم تكن موجودة أرجع 0.
3. التاريخ: بصيغة YYYY-MM-DD و الوقت.
4. اسم المورد: الاسم التجاري الصريح بدون فروع (استخرجه باللغة العربية كأولوية قصوى).
5. رقم الهاتف (vendorPhone): استخرج رقم هاتف المورد إن وجد في الفاتورة (مثلاً: يبدأ بـ 05 أو 966 أو رقم أرضي). إذا لم يتوفر، اترك الحقل فارغاً أو غير موجود.
6. رقم الفاتورة (invoiceNumber): استخرج رقم الفاتورة التسلسلي (Invoice No / رقم الفاتورة) إن وجد.
7. الأصناف: قائمة بأسماء المنتجات أو الخدمات مع الكميات والأسعار إن وجدت (استخرجها باللغة العربية كأولوية قصوى واكتب كل صنف بالتفصيل مثال: برغي صغير - الكمية 1.66 - السعر 15).
8. الوصف: وصف عام للمستند ومحتواه (بالعربية).
9. بيانات التحقق الذكي (verificationData):
   - وقت الالتقاط الفعلي من النظام: ${captureTime || 'غير متوفر'}
   - إحداثيات الالتقاط: ${geoCapture ? `${geoCapture.lat}, ${geoCapture.lng}` : 'غير متوفر'}
   - المطلوب: قارن وقت الالتقاط بوقت/تاريخ الفاتورة المطبوع. إذا كان الفارق كبيراً، قلل trustScore. إذا كان الوقت قريباً جداً، ارفع الثقة. أعطِ أوسمة (badges) مثل "وقت متطابق", "فاتورة قديمة", "موقع مسجل".

اعتمد على الدقة في القراءة. رد بصيغة JSON فقط متطابقة مع المخطط.` },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || "image/jpeg",
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
            amount: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            vendor: { type: Type.STRING },
            vendorPhone: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            items: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            verificationData: {
              type: Type.OBJECT,
              properties: {
                trustScore: { type: Type.NUMBER },
                timeDiscrepancyHours: { type: Type.NUMBER },
                badges: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          required: ["amount", "vendor"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as InvoiceData;
    }
    throw new Error("لم يتم إرجاع أي نص من الذكاء الاصطناعي");
  } catch (error: unknown) {
    const err = error as any;
    console.warn("Invoice analysis warning:", err.message || err);
    throw new Error(err.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي");
  }
};

export const generateLocalSpendingAnalysis = (projectData: Partial<Project>, transactions: Partial<Transaction>[]): string => {
  const projName = projectData.title || projectData.name || "المشروع التجريبي";
  const budget = Number(projectData.budget) || 0;
  const progress = Number(projectData.progress) || 0;

  // Filter transactions for this project, or default to all if none explicitly linked
  const projectTxs = transactions && transactions.length > 0
    ? transactions.filter(t => !t.projectId || t.projectId === projectData.id)
    : [];

  const totalExpenses = projectTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalIncome = projectTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  if (budget <= 0) {
    const balance = totalIncome - totalExpenses;
    return `📋 مؤشر أداء مشروع (${projName}): يسير بنسق منتظم بنسبة إنجاز مقدرة بـ ${progress}%. بلغ إجمالي المقبوضات المسجلة ${totalIncome.toLocaleString('en-US')} ريال في حين بلغت المصروفات التشغيلية ${totalExpenses.toLocaleString('en-US')} ريال (صافي السيولة المتوفرة: ${balance.toLocaleString('en-US')} ريال).`;
  }

  const spendRatio = Math.round((totalExpenses / budget) * 100);

  if (spendRatio > 100) {
    return `⚠️ تنبيه حرج لمشروع (${projName}): الصرف الفعلي تجاوز قيمة الميزانية الإجمالية بنسبة ${spendRatio}% (المصروفات: ${totalExpenses.toLocaleString('en-US')} ريال مقابل ميزانية مرصودة ${budget.toLocaleString('en-US')} ريال). يوصى بإيقاف الصرف مؤقتاً ومراجعة بنود التكاليف.`;
  }

  if (spendRatio >= 70) {
    return `⚠️ إشعار احترازي لمشروع (${projName}): تدفق الصرف يقترب من الحد الأقصى بنسبة ${spendRatio}% من الميزانية المحددة (${totalExpenses.toLocaleString('en-US')} ريال من أصل ${budget.toLocaleString('en-US')} ريال)، بينما نسبة الإنجاز الفعلي للمشروع عند ${progress}%. ننصح بتدقيق التكاليف القادمة.`;
  }

  return `📈 أداء مستقر وتدفق مالي آمن لمشروع (${projName}): نسبة المصروفات آمنة وتحت السيطرة بنسبة ${spendRatio}% من الميزانية الكلية (المصروفات الفعلية: ${totalExpenses.toLocaleString('en-US')} ريال من ميزانية مرصودة بقيمة ${budget.toLocaleString('en-US')} ريال)، متماشياً مع نسبة الإنجاز الحالية البالغة ${progress}%.`;
};

export const analyzeProjectSpending = async (projectData: Partial<Project>, transactions: Partial<Transaction>[]): Promise<string | null> => {
  const ai = getGeminiClient();
  if (!ai) {
    // If API client is not configured, fallback gracefully to our rule-based analysis
    return generateLocalSpendingAnalysis(projectData, transactions);
  }
  
  try {
    const prompt = `
      بناءً على البيانات التالية للمشروع الحالي، هل هناك بوادر أزمة مالية أو تجاوز للميزانية؟
      المشروع: ${JSON.stringify(projectData)}
      المعاملات المالية المرتبطة: ${JSON.stringify(transactions)}
      أرجو إعطاء تحليل مختصر جداً (جملة واحدة) وتنبيه إذا كان الصرف يتجاوز 70% من الميزانية المرصودة للمرحلة الحالية.
    `;

    const cached = getCachedResponse(prompt);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const result = response.text || generateLocalSpendingAnalysis(projectData, transactions);
    if (response.text) setCachedResponse(prompt, result);
    return result;
  } catch (error: unknown) {
    const err = error as any;
    console.warn("Project spending analysis fell back to local calculations:", err.message || err);
    // Fallback smoothly to rule-based analysis instead of returning null and breaking dashboard display
    return generateLocalSpendingAnalysis(projectData, transactions);
  }
};

export interface ExtractedProjectData {
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
}

export const parseProjectFromText = async (text: string, pastProjects?: any[]): Promise<ExtractedProjectData | null> => {
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
    learningContext = `
**محرك التعلم الذاتي الهندسي (الخبرات والتجارب التشغيلية السابقة للمؤسسة):**
بصفتك مهندساً حكيماً، ادرس وتعلم من المشاريع والتقديرات السابقة لرفع دقة الحسابات وتقدير المواد والاحتياجات:
${JSON.stringify(samples, null, 2)}
`;
  }

  try {
    const prompt = `
      بصفتك مهندساً حقيقياً خبيراً في تقدير وتصميم وتجهيز مشاريع الدعاية والإعلان والمقاولات الإنشائية في المملكة العربية السعودية.
      قم بتحليل النص المرفق لطلب مشروع جديد، واستخرج منه البيانات المطلوبة بدقة هندسية وتقديرية كاملة.

      ${learningContext}

      النص المدخل:
      "${text}"

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
    `;

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
};

export const analyzeProjectDocument = async (dataUrl: string, mimeType: string, pastProjects?: any[]): Promise<ExtractedProjectData> => {
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
    learningContext = `
**محرك التعلم الذاتي الهندسي (الخبرات والتجارب التشغيلية السابقة للمؤسسة):**
بصفتك مهندساً حكيماً، ادرس وتعلم من المشاريع والتقديرات السابقة لرفع دقة الحسابات وتقدير المواد والاحتياجات:
${JSON.stringify(samples, null, 2)}
`;
  }

  try {
    const prompt = `
      أنت مهندس خبير ومستشار فني في تقدير وتحليل مستندات المشاريع والعقود وعروض الأسعار والرسومات الهندسية لشركة مقاولات دعاية وإعلان في المملكة العربية السعودية.
      قم بتحليل الملف المرفق بدقة متناهية واستخرج منه أو قدر له كافة البيانات الفنية والتقديرية المطلوبة لتأسيس ملف مشروع متكامل.

      ${learningContext}
      
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
    `;

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
};

export const analyzeCompanyPortfolioCredit = async (projects: any[], transactions: any[]): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return "يرجى تهيئة مفتاح الذكاء الاصطناعي (Gemini) في الإعدادات لتفعيل التحليل الائتماني الشامل للمحفظة.";
  }
  try {
    const prompt = `
      أنت رئيس القطاع المالي (CFO) لشركة "خبراء الرسم للمقاولات".
      إليك قائمة بالمشاريع التشغيلية النشطة حالياً وتفاصيل ميزانيتها والمصروفات الفعلية المسجلة في النظام:
      المشاريع والمصروفات: ${JSON.stringify(projects)}
      
      المعاملات المالية كاملةً (كعينة لفهم النفقات): ${JSON.stringify(transactions.slice(0, 30))}
      
      المطلوب: تقديم تقرير موجز تنفيذي ائتماني احترافي جداً باللغة العربية يشمل:
      1. تقييم كلي للسيولة والوضع الائتماني للمشاريع كمنظومة متكاملة.
      2. كشف أي مشروع يواجه خطراً داهماً للميزانية (أو تجاوز الصرف ميزانيته أو قارب على ذلك بشكل غير متناسب مع نسبة الإنجاز الفعلي).
      3. إنذار مبكر محدد بالخطوات العملية لمنع حدوث عجز نقدي قبل أن تقع الكارثة.
      4. توجيه عاجل لضبط التخصيص المالي والتحكم بالهدر.
      
      اجعل الرد بصيغة نقاط قوية، واضحة، مهنية، ومكتوبة للمدير التنفيذي فوراً.
    `;

    const cached = getCachedResponse(prompt);
    if (cached) return cached;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });

    const result = response.text || "فشل توليد التقرير.";
    if (response.text) setCachedResponse(prompt, result);
    return result;
  } catch (error: any) {
    console.warn("Portfolio analysis error:", error);
    return "حدث خطأ أثناء فحص محفظة الائتمان بالذكاء الاصطناعي: " + error.message;
  }
};

export const askGeminiAdvisor = async (question: string, contextStats: any): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) {
    return "مفتاح API الخاص بـ Gemini غير متوفر. يرجى تهيئته أولاً.";
  }
  try {
    const prompt = `
      أنت المستشار المالي والتشغيلي الذكي لشركة مقاولات دعاية وإعلان.
      الوضع المالي والتشغيلي الحالي للشركة:
      ${JSON.stringify(contextStats)}
      
      سؤال المستخدم: "${question}"
      
      أجب عن سؤال المستخدم بدقة وبشكل مختصر ومباشر وبطريقة مهنية باللغة العربية وبلهجة إيجابية وعملية.
    `;
    const cached = getCachedResponse(prompt);
    if (cached) return cached;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    const result = response.text || "لم أتمكن من صياغة إجابة حالياً.";
    if (response.text) setCachedResponse(prompt, result);
    return result;
  } catch (error: any) {
    console.error("Gemini Advisor query failed:", error);
    return "حدث خطأ أثناء التواصل مع المستشار الذكي: " + error.message;
  }
};

export const generateBIRecommendations = async (stats: any): Promise<string[]> => {
  const ai = getGeminiClient();
  if (!ai) {
    return [
      "تحسين سياسة التحصيل بالمستخلصات لتكثيف النقدية بنسبة 5%",
      "جدولة مشتريات المواد الخام لخفض التكلفة التشغيلية الإضافية",
      "أتمتة طلبات تصاريح المواقع لتسريع مراحل التسليم الفعلي"
    ];
  }
  try {
    const prompt = `
      أنت خبير ذكاء أعمال (BI) متقدم ومستشار مالي لشركة مقاولات دعاية وإعلان.
      إليك إحصاءات الأداء الحالي للشركة للفترة المحددة:
      ${JSON.stringify(stats)}

      المطلوب: توليد 3 توصيات إستراتيجية عملية وعاجلة (باللغة العربية) موجهة للإدارة التنفيذية بناءً على هذه الإحصاءات لمساعدتهم في زيادة الأرباح وتخفيض التكاليف التشغيلية.
      أرجع الإجابة كـ JSON Array يحتوي على 3 نصوص فقط. مثال:
      ["توصية 1", "توصية 2", "توصية 3"]
    `;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
  } catch (error) {
    console.error("Gemini BI Recommendations failed, falling back:", error);
  }
  return [
    "تحسين سياسة التحصيل بالمستخلصات لتكثيف النقدية بنسبة 5%",
    "جدولة مشتريات المواد الخام لخفض التكلفة التشغيلية الإضافية",
    "أتمتة طلبات تصاريح المواقع لتسريع مراحل التسليم الفعلي"
  ];
};

export const generateReportInsights = async (reportData: any, reportType: string): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) return "التحليل الذكي غير متوفر: مفتاح API غير موجود.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: `أنت مستشار أعمال مالي وإداري خبير. قم بقراءة وتحليل بيانات التقرير التالية من نوع (${reportType}).
استخرج أهم المؤشرات، الإيجابيات، السلبيات (إن وجدت)، وقدم توصية استراتيجية واضحة.
يجب أن يكون الرد في فقرة واحدة متماسكة واحترافية باللغة العربية (لا تزد عن 100 كلمة).
البيانات:
${JSON.stringify(reportData, null, 2)}
            ` }
          ]
        }
      ],
      config: {
        temperature: 0.3,
      }
    });
    return response.text?.trim() || "لا توجد ملاحظات واضحة.";
  } catch (error) {
    console.error("Error generating report insights:", error);
    return "عذراً، حدث خطأ أثناء تحليل بيانات التقرير.";
  }
};

export const generateClientInsights = async (taskType: "summary" | "pitch" | "debt_collection", clientInfo: any): Promise<string> => {
  const ai = getGeminiClient();
  if (!ai) return "مفتاح API الخاص بـ Gemini غير متوفر. يرجى تهيئته أولاً.";
  
  try {
    let prompt = "";
    if (taskType === "summary") {
      prompt = `
        أنت مستشار علاقات العملاء الذكي لشركة مقاولات ودعاية وإعلان.
        قم بتحليل محفظة العملاء التالية وتقديم ملخص استراتيجي لفرص النمو والعملاء الأكثر قيمة والعملاء المتعثرين:
        ${JSON.stringify(clientInfo, null, 2)}
        
        اكتب الملخص باللغة العربية بأسلوب احترافي وجذاب، مقسم كإشارات سريعة ونقاط قوة ونقاط تحسين.
        اجعل جميع الأرقام المذكورة في ردك بالأرقام الإنجليزية (مثال: 123456 وليس ١٢٣٤٥٦).
      `;
    } else if (taskType === "pitch") {
      prompt = `
        أنت مندوب مبيعات محترف ومبدع للغاية لشركة مقاولات ودعاية وإعلان.
        بناءً على معلومات هذا العميل وتعامله المالي السابق:
        ${JSON.stringify(clientInfo, null, 2)}
        
        اكتب مسودة رسالة ترويجية (رسالة WhatsApp أو إيميل) مخصصة وجذابة ومقنعة للغاية لهذا العميل لعرض خدمات جديدة أو إقناعه ببدء مشروع جديد معنا.
        اجعل الأرقام باللغة الإنجليزية والحروف بالعربية بالكامل، وتجنب العبارات التقليدية المملة.
        تأكد من استخدام الأرقام الإنجليزية حصراً (مثال: 50,000 ر.س وليس ٥٠،٠٠٠ ر.س).
      `;
    } else if (taskType === "debt_collection") {
      prompt = `
        أنت مستشار مالي لبق ومحترف في تحصيل الديون لشركة مقاولات ودعاية وإعلان.
        العميل التالي لديه مديونية مستحقة ومتبقية:
        ${JSON.stringify(clientInfo, null, 2)}
        
        اكتب مسودة رسالة تذكيرية رقيقة ومحترفة للغاية وبنفس الوقت حازمة ومقنعة (مخصصة للـ WhatsApp أو الإيميل) لمطالبته بجدولة أو سداد المديونية المتبقية بطريقة ممتازة تحافظ على الود والعلاقة الطيبة.
        تأكد من استخدام الأرقام الإنجليزية حصراً (مثال: 15,400 ر.س وليس ١٥،٤٠٠ ر.س).
        اجعل الأرقام باللغة الإنجليزية والحروف بالعربية بالكامل.
      `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
    });
    
    return response.text?.trim() || "لم يتم إنتاج نص من الذكاء الاصطناعي.";
  } catch (error: any) {
    console.error("Error generating client insights:", error);
    return "عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: " + error.message;
  }
};
