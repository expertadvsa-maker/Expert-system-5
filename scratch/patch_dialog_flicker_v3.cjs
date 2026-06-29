const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'ProjectsV2.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = '<DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white focus:outline-none transform-gpu backface-visibility-hidden scrollbar-thin top-[5vh] !-translate-y-0" dir="rtl">';
const replacementStr = '<DialogContent className="max-w-3xl sm:max-w-3xl rounded-[2rem] p-8 border-none shadow-2xl overflow-y-auto max-h-[90vh] bg-white focus:outline-none transform-gpu backface-visibility-hidden scrollbar-thin" style={{ top: \'5vh\', transform: \'translate(-50%, 0)\' }} dir="rtl">';

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched ProjectsV2.tsx with direct inline style positioning to prevent scroll centering recalculation loop.');
} else {
  console.error('Target string not found in ProjectsV2.tsx');
}
