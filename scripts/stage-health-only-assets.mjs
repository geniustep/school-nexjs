import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const locales = ['ar', 'en', 'fr', 'es'];
const healthPath = ['admin', 'student360', 'health'];

function getAt(obj, path) {
  return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function setAt(obj, path, value) {
  let cursor = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

for (const locale of locales) {
  const file = `messages/${locale}.json`;
  const head = JSON.parse(execSync(`git show HEAD:${file}`, { encoding: 'utf8' }));
  const working = JSON.parse(readFileSync(file, 'utf8'));
  const headHealth = getAt(head, healthPath);
  const workingHealth = getAt(working, healthPath);
  if (workingHealth && JSON.stringify(headHealth) !== JSON.stringify(workingHealth)) {
    setAt(head, healthPath, workingHealth);
    writeFileSync(file, `${JSON.stringify(head, null, 2)}\n`, 'utf8');
    console.log(`Updated health messages in ${file}`);
  }
}

const headCss = execSync('git show HEAD:src/features/admin/students/student-360.css', {
  encoding: 'utf8',
});
const workingLines = readFileSync('src/features/admin/students/student-360.css', 'utf8').split(/\r?\n/);
const healthStart = workingLines.findIndex((line) => line === '.student-health-grid {');
const healthEnd = workingLines.findIndex((line) => line === '.health-tri-state-field__hint {');
if (healthStart === -1 || healthEnd === -1) {
  throw new Error('Could not locate health CSS block in working tree');
}
let hintEnd = healthEnd;
while (hintEnd < workingLines.length && workingLines[hintEnd].trim() !== '}') hintEnd += 1;
const healthBlock = workingLines.slice(healthStart, hintEnd + 1).join('\n');

const marker = '.student-health-grid {';
const sharedMarker = '/* Shared tab panel layout */';
const headStart = headCss.indexOf(marker);
const sharedStart = headCss.indexOf(sharedMarker);
if (headStart === -1 || sharedStart === -1 || sharedStart < headStart) {
  throw new Error('Could not locate health CSS splice points in HEAD');
}

const nextCss = `${headCss.slice(0, headStart)}${healthBlock}\n\n${headCss.slice(sharedStart)}`;
writeFileSync('src/features/admin/students/student-360.css', nextCss, 'utf8');
console.log('Updated student-360.css with health-only block');
