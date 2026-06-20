const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const replacements = {
  'text-gray-100': 'text-slate-900',
  'text-gray-200': 'text-slate-800',
  'text-gray-300': 'text-slate-700',
  'text-gray-400': 'text-slate-500',
  'text-gray-500': 'text-slate-400',
  'bg-slate-900': 'bg-slate-50',
  'bg-slate-800': 'bg-white',
  'bg-slate-700': 'bg-slate-100',
  'bg-slate-600': 'bg-slate-200',
  'border-slate-800': 'border-slate-200',
  'border-slate-700': 'border-slate-300',
  'bg-surface': 'bg-white'
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    // Replace whole words only for Tailwind classes using regex
    const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
    content = content.replace(regex, newClass);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
});
