const fs = require('fs');
const file = 'src/components/EmployeeProfile.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                        <p className="text-xs font-bold text-blue-700 max-w-[200px] truncate" title={assignedLocations.join('، ')}>
                         {assignedLocations.join('، ')}
                       </p>`;

const replacement = `                        <p className="text-xs font-bold text-blue-700 max-w-[200px] truncate" title={assignedLocations.join('، ') || 'عام (غير مرتبط)'}>
                         {assignedLocations.length > 0 ? assignedLocations.join('، ') : 'عام (غير مرتبط)'}
                       </p>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Replaced successfully.");
} else {
  console.log("Target not found!");
}
