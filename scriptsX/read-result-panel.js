const fs = require('fs');
const c = fs.readFileSync('src/components/code-editor/problem/ResultPanel.tsx', 'utf8');

// Find the close of TestResultsTab return
const marker = '</ul>\n        </div>\n    );\n}';
const idx = c.indexOf(marker);
console.log('--- End of TestResultsTab ---');
console.log('Index:', idx);
console.log(JSON.stringify(c.substring(idx - 50, idx + marker.length + 20)));
