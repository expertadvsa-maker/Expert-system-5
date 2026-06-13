import fs from 'fs';
import path from 'path';

const searchDir = '.';
const searchPatterns = [/picsum/i, /unsplash/i];

function walkDir(currentDir, callback) {
  fs.readdirSync(currentDir).forEach(file => {
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'build' && file !== '.dart_tool') {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  });
}

console.log("Searching for patterns...");
walkDir(searchDir, filePath => {
  if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.dart') || filePath.endsWith('.json')) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of searchPatterns) {
        if (pattern.test(content)) {
          console.log(`Found pattern ${pattern} in file: ${filePath}`);
          // Print lines
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              console.log(`  L${index + 1}: ${line.trim()}`);
            }
          });
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }
});
console.log("Search complete.");
