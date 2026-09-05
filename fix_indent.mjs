import fs from 'fs';

let c = fs.readFileSync('convex/academyAdmin.ts', 'utf8');

const lines = c.split('\n');

// Fix the .query line indentation (line with just whitespace + .query("academyLessons"))
for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/^\s+\.query\("academyLessons"\)$/) && lines[i-1] && lines[i-1].includes('await ctx.db')) {
    lines[i] = '      .query("academyLessons")';
  }
}

// Fix the for loop line - it got merged onto the previous line
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('created.modules += 1;') && lines[i].includes('for (let li')) {
    const idx = lines[i].indexOf('for (let li');
    lines[i] = lines[i].substring(0, idx - 1);
    lines.splice(i + 1, 0, '          for (let li = 0; li < moduleSeed.lessons.length; li++) {');
  }
}

c = lines.join('\n');

fs.writeFileSync('convex/academyAdmin.ts', c);
console.log('Fixed!');

