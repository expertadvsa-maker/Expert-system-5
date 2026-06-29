const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'ProjectsV2.tsx');
let fileContent = fs.readFileSync(filePath, 'utf8');

// Convert CRLF to LF for consistent matching
fileContent = fileContent.replace(/\r\n/g, '\n');

// 1. Add state variables under 'const [aiInputText, setAiInputText] = useState('');'
const stateInsert = `  const [aiInputText, setAiInputText] = useState('');
  const [showAiConsole, setShowAiConsole] = useState(false);
  const [aiConsoleTab, setAiConsoleTab] = useState<'file' | 'text'>('file');`;

fileContent = fileContent.replace("  const [aiInputText, setAiInputText] = useState('');", stateInsert);

// 2. Add transform-gpu to DialogContent to fix chromium scroll flicker/blink issues
fileContent = fileContent.replace(
  'className="max-w-4xl sm:max-w-4xl rounded-3xl p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh]"',
  'className="max-w-4xl sm:max-w-4xl rounded-3xl p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] transform-gpu backface-hidden"'
);

// 3. Replace the entire bulky smart console container with our clean tabbed expandable widget
const dialogHeaderEnd = '                  </div>\n                </div>\n              </DialogHeader>';
const step1Start = '              {/* {/\\* ظ…ط­طھظˆظ‰ ط§ظ„ط®ط·ظˆط§طھ ظ…ط¹ طھط£ط«ظٹط±ط§طھ Framer Motion *\\/}/ }'; // Let's use a more robust way: locate based on " AnimatePresence mode="wait" "

const headerEndIndex = fileContent.indexOf(dialogHeaderEnd);
const step1SearchTerm = '              {/* '; // We can find the next "min-h-[350px] mt-8 pb-4" or similar
const step1StartIndex = fileContent.indexOf('              {/* مأشروحات الخطوات مع تأثيرات Framer Motion */}', headerEndIndex); // Or garbled characters
// Let's find "min-h-[350px] mt-8 pb-4" instead
const targetMarker = '              <div className="min-h-[350px] mt-8 pb-4">';
const step1MarkerIndex = fileContent.indexOf(targetMarker);

if (headerEndIndex === -1 || step1MarkerIndex === -1) {
  console.error("Could not find DialogHeader end or min-h-350 marker in ProjectsV2.tsx!", {
    headerEndIndex,
    step1MarkerIndex
  });
  process.exit(1);
}

const premiumConsoleWidget = `
              {/* 🌟 كونسول التأسيس السريع والتحليل الفوري الفائق - تصميم غلاسورفي ذكي ومضغوط */}
              {activeStep === 1 && (
                <div className="mt-6">
                  {!showAiConsole ? (
                    <div 
                      onClick={() => setShowAiConsole(true)}
                      className="bg-gradient-to-br from-indigo-500/[0.04] via-violet-500/[0.02] to-white hover:from-indigo-500/[0.07] hover:via-indigo-500/[0.04] border border-indigo-100/70 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center justify-between group overflow-hidden relative"
                    >
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/[0.03] rounded-full blur-2xl group-hover:scale-125 transition-all duration-500"></div>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="h-11 w-11 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-110 transition-all duration-300 shrink-0">
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                        </div>
                        <div className="text-right">
                          <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5 flex-wrap">
                            مساعد التأسيس والتحليل الفوري الذكي (Gemini)
                            <span className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-[9px] font-black text-white px-2.5 py-0.5 rounded-full shadow-sm shadow-indigo-100">توفير الوقت ⚡</span>
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 mt-1 leading-relaxed">
                            هل تريد تعبئة بيانات ومواصفات المشروع والمواد تلقائياً؟ انقر هنا لرفع المستندات (الكروكيات والعقود) أو نسخ نصوص الاتفاق.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-black text-indigo-600 group-hover:translate-x-1 transition-all">
                        <span>دخول</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden transition-all duration-500 text-right">
                      <div className="absolute top-0 right-0 bg-indigo-500/10 w-48 h-48 blur-3xl rounded-full"></div>
                      
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
                            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                          </div>
                          <div className="text-right">
                            <h4 className="font-black text-sm text-white">مساعد التأسيس والتحليل الفوري الفائق ⚡</h4>
                            <p className="text-[10px] font-black text-indigo-300/60 mt-0.5">حلل ملفاتك، مخططاتك، أو نصوصك فوراً لملء النموذج والمواد والمخاطر والالتزام البلدي</p>
                          </div>
                        </div>

                        <Button 
                          type="button"
                          variant="ghost"
                          onClick={() => setShowAiConsole(false)}
                          className="h-8 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-3 transition-all"
                        >
                          إغلاق المساعد
                        </Button>
                      </div>

                      {/* Tab Selector */}
                      <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50 max-w-sm mx-auto relative z-10" dir="ltr">
                        <button
                          type="button"
                          onClick={() => setAiConsoleTab('file')}
                          className={\`flex-1 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 \${
                            aiConsoleTab === 'file'
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                              : 'text-slate-400 hover:text-white'
                          }\`}
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          تحليل ملف / كروكي / عقد
                        </button>
                        <button
                          type="button"
                          onClick={() => setAiConsoleTab('text')}
                          className={\`flex-1 py-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 \${
                            aiConsoleTab === 'text'
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                              : 'text-slate-400 hover:text-white'
                          }\`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          تحليل نصوص ومحادثات
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="relative z-10">
                        {aiConsoleTab === 'file' ? (
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 leading-relaxed text-center">
                              اسحب وأسقط مخططات التصميم، الكروكيات، أو عروض الأسعار (الصور و الـ PDF) ليتم تفريغ كافة المواصفات والقرارات تلقائياً:
                            </p>
                            
                            <div 
                              onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                              }}
                              onDragLeave={() => setIsDragOver(false)}
                              onDrop={async (e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                  await handleAnalyzeFileDirectly(e.dataTransfer.files[0]);
                                }
                              }}
                              onClick={() => {
                                document.getElementById('wizard-direct-file-input')?.click();
                              }}
                              className={\`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden group \${
                                isDragOver 
                                  ? 'border-indigo-400 bg-indigo-950/40' 
                                  : 'border-slate-700 hover:border-indigo-500 hover:bg-slate-800/40'
                              }\`}
                            >
                              {isDirectAnalyzing ? (
                                <div className="space-y-2 flex flex-col items-center justify-center">
                                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                  <span className="font-black text-xs text-indigo-300 animate-pulse">جاري ضغط وتحليل المستند بالذكاء الاصطناعي...</span>
                                  <span className="text-[9px] font-black text-slate-500">نظامنا يتعامل مع الملفات الكبيرة والخرائط المعقدة بدقة فائقة 🛡️</span>
                                </div>
                              ) : (
                                <div className="space-y-2 flex flex-col items-center justify-center">
                                  <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-full group-hover:scale-110 transition-all border border-indigo-500/20">
                                    <UploadCloud className="w-6 h-6" />
                                  </div>
                                  <span className="font-black text-xs text-slate-200 block">اسحب ملف المخطط أو عرض السعر هنا، أو تصفح جهازك</span>
                                  <span className="text-[9px] font-black text-slate-500">يدعم الصور عالية الدقة والـ PDF (مستندات كبيرة أو صغيرة)</span>
                                </div>
                              )}
                              <input 
                                id="wizard-direct-file-input"
                                type="file"
                                className="hidden"
                                accept="image/*,application/pdf"
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    await handleAnalyzeFileDirectly(e.target.files[0]);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 leading-relaxed text-center">
                              الصق شروط العقد، تفاصيل المشروع، أو رسائل العميل هنا لتعبئة الحقول بذكاء:
                            </p>
                            <textarea
                              value={aiInputText}
                              onChange={(e) => setAiInputText(e.target.value)}
                              placeholder="مثال: مشروع أسوار دعائية بطريق الملك فهد للعميل محمد العتيبي 0555123456 بميزانية 450,000 ريال بمساحة إجمالية 350 متر، تبدأ يوم 2026-07-01..."
                              rows={4}
                              className="w-full rounded-2xl bg-slate-800/60 border border-slate-700 shadow-inner font-black p-4 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-right"
                            />
                            <Button 
                              type="button"
                              onClick={handleAiAutofill}
                              disabled={isAiParsing}
                              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-900/30"
                            >
                              {isAiParsing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  جاري استخراج وتحليل النص...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  تعبئة ذكية فورية للنص
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}\n\n              `;

// Replace the old bulky console container (which lies between DialogHeader end and the start of step1 container)
const finalContent = fileContent.substring(0, headerEndIndex + dialogHeaderEnd.length) + premiumConsoleWidget + fileContent.substring(step1MarkerIndex);

// Save with native windows line endings (\r\n) or let git handle it.
fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("Successfully updated wizard layout with collapsible AI assistant and hardware accelerated Dialog scrolling!");
