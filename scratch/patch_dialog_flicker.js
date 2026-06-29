const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'ProjectsV2.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = '<DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white/95 backdrop-blur-md" dir="rtl">';
const replacementStr = '<DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white focus:outline-none transform-gpu backface-visibility-hidden scrollbar-thin" dir="rtl">';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched ProjectsV2.tsx to remove backdrop-blur-md and optimize rendering layers.');
} else {
  console.error('Target string not found in ProjectsV2.tsx');
}
