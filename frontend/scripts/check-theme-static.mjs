import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|jsx|css)$/.test(file)) files.push(file);
  }
}
walk(root);

const color = /#[\da-fA-F]{3,8}\b|(?:rgba?|hsla?)\s*\(|\b(?:text|bg|border|fill|stroke|ring|divide|from|to|via)-(?:white|black|slate|gray|grey|red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose)(?:-\d{2,3})?(?:\/\d+)?\b/g;
const failures = [];
for (const file of files) {
  const rel = path.relative(process.cwd(), file).replaceAll('\\', '/');
  for (const [index, raw] of fs.readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    const line = raw.replace(/\/\*.*?\*\//g, '');
    // Theme token declarations are the sole source of literal palette values.
    if (rel === 'src/index.css' && /^\s*--[\w-]+\s*:/.test(line)) continue;
    for (const match of line.matchAll(color)) {
      failures.push(`${rel}:${index + 1}: ${match[0]}`);
    }
  }
}
console.log(`Theme static check: ${files.length} source files, ${failures.length} hard-coded colors`);
for (const failure of failures.slice(0, 50)) console.log(failure);
if (failures.length > 50) console.log(`... ${failures.length - 50} more`);
if (failures.length) process.exitCode = 1;
