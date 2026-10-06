const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
console.log('=== Student sidebar tabs (panel-tab-s) ===');
lines.forEach((l, i) => {
  if (l.includes('panel-tab-s') && l.includes('data-spanel')) {
    console.log((i+1) + ': ' + l.trim().slice(0, 120));
  }
});
console.log('\n=== Student panel containers (panel-content-s / mount-s-) ===');
lines.forEach((l, i) => {
  if (l.includes('panel-s-') || l.includes('mount-s-')) {
    console.log((i+1) + ': ' + l.trim().slice(0, 120));
  }
});
