const fs = require('fs');

const estCode = fs.readFileSync('estudiantes.js', 'utf8');

const regex = /on[a-z]+\s*=\s*["']([a-zA-Z0-9_$]+)\s*\(/g;
let m;
const handlers = new Set();
while ((m = regex.exec(estCode)) !== null) {
  handlers.add(m[1]);
}

console.log('DOM handlers called in estudiantes.js HTML strings:');
for (const h of handlers) {
  console.log(' - ' + h);
}
