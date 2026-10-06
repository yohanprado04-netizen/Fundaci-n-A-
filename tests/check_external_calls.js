const fs = require('fs');

let estCode = fs.readFileSync('estudiantes.js', 'utf8');

// Strip block comments and line comments
estCode = estCode.replace(/\/\*[\s\S]*?\*\//g, '');
estCode = estCode.replace(/\/\/[^\n]*/g, '');

// Strip strings and template literals except expressions
// Better: test with an AST or simple parser
// Let's use node's built-in syntax or simple regex on code
const lines = estCode.split('\n');
const calledFns = new Set();

for (const line of lines) {
  // Ignore lines that are comments
  const trimmed = line.trim();
  if (!trimmed) continue;
  
  // Find foo(...)
  const matches = trimmed.matchAll(/(?:^|[^a-zA-Z0-9_$.])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g);
  for (const m of matches) {
    calledFns.add(m[1]);
  }
}

const standard = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'Function', 'Math', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'JSON', 'Error',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'alert', 'confirm', 'prompt',
  'require', 'FileReader'
]);

const localDeclared = new Set();
const declRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=)/g;
let m;
while ((m = declRegex.exec(estCode)) !== null) {
  if (m[1]) localDeclared.add(m[1]);
  if (m[2]) localDeclared.add(m[2]);
}

const external = [];
for (const fn of calledFns) {
  if (!standard.has(fn) && !localDeclared.has(fn)) {
    external.push(fn);
  }
}

console.log('Real external functions called in estudiantes.js:', external);
