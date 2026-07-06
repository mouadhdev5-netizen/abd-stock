const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  { pattern: /\btext-left\b/g, replacement: 'text-start' },
  { pattern: /\btext-right\b/g, replacement: 'text-end' },
  { pattern: /\bml-([\d\.]+)\b/g, replacement: 'ms-$1' },
  { pattern: /\bmr-([\d\.]+)\b/g, replacement: 'me-$1' },
  { pattern: /\bpl-([\d\.]+)\b/g, replacement: 'ps-$1' },
  { pattern: /\bpr-([\d\.]+)\b/g, replacement: 'pe-$1' },
  { pattern: /\b-ml-([\d\.]+)\b/g, replacement: '-ms-$1' },
  { pattern: /\b-mr-([\d\.]+)\b/g, replacement: '-me-$1' }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { pattern, replacement } of replacements) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
console.log('RTL classes updated successfully.');
