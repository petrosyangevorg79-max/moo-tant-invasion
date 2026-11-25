const fs = require('fs');
const path = require('path');

const srcDir = './src';
function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) files.push(...walk(p));
    else if (f.endsWith('.js')) files.push(p);
  }
  return files;
}

const files = walk(srcDir);
let issues = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const hasThreeImport = content.includes('import * as THREE') || content.includes('import THREE');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('THREE.') && !hasThreeImport) {
      issues.push(file + ':' + (i + 1) + ' uses THREE but no import');
      break; // one per file is enough
    }
  }
  
  // Check roundRect usage (not supported in all browsers)
  if (content.includes('roundRect')) {
    issues.push(file + ' uses ctx.roundRect (may need polyfill for older browsers)');
  }
  
  // Check OutputPass import (might not exist in older three.js)
  if (content.includes('OutputPass')) {
    issues.push(file + ' imports OutputPass - check three.js version compatibility');
  }
}

if (issues.length === 0) {
  console.log('No issues found!');
} else {
  issues.forEach(i => console.log('ISSUE:', i));
}

// Also check package.json for version
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log('\nDependencies:');
console.log(JSON.stringify({...pkg.dependencies, ...pkg.devDependencies}, null, 2));
