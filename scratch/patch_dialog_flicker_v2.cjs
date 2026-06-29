const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'ProjectsV2.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Let's find where we can insert the body scroll lock useEffect.
// We can insert it right after the draft saving useEffect.
const targetEffect = `  // حفظ مسودة المشروع تلقائياً عند تغيير الحقول
  useEffect(() => {
    localStorage.setItem('expert_project_draft', JSON.stringify(newProject));
  }, [newProject]);`;

const newEffect = `  // حفظ مسودة المشروع تلقائياً عند تغيير الحقول
  useEffect(() => {
    localStorage.setItem('expert_project_draft', JSON.stringify(newProject));
  }, [newProject]);

  // قفل التمرير على الصفحة الخلفية لخدمة تجربة استخدام فائقة الجودة ومنع الوميض وتضارب التمرير
  useEffect(() => {
    const isAnyDialogOpen = isGuideOpen || (detailsDialog !== null);
    if (isAnyDialogOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isGuideOpen, detailsDialog]);`;

if (content.includes(targetEffect)) {
  content = content.replace(targetEffect, newEffect);
  console.log('Successfully injected scroll lock useEffect.');
} else {
  console.error('Target effect not found.');
}

// 2. Let's optimize DialogContent classes to anchor it stably at the top (top-[5vh] and !-translate-y-0)
// instead of letting it recalculate top-1/2 and -translate-y-1/2 on scroll.
const targetDialogContent = `            <DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white focus:outline-none transform-gpu backface-visibility-hidden scrollbar-thin" dir="rtl">`;
const replacementDialogContent = `            <DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white focus:outline-none transform-gpu backface-visibility-hidden scrollbar-thin top-[5vh] !-translate-y-0" dir="rtl">`;

if (content.includes(targetDialogContent)) {
  content = content.replace(targetDialogContent, replacementDialogContent);
  console.log('Successfully optimized DialogContent position classes to prevent scroll centering recalculation loop.');
} else {
  console.error('Target DialogContent not found.');
}

fs.writeFileSync(filePath, content, 'utf8');
