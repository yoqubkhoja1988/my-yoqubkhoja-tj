import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngPath = path.join(root, 'public/images/organization-eagle-logo.png');
const base64 = fs.readFileSync(pngPath).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <image href="data:image/png;base64,${base64}" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
</svg>`;

for (const target of [
  path.join(root, 'public/favicon.svg'),
  path.join(root, 'docs/presentation/assets/favicon.svg'),
]) {
  fs.writeFileSync(target, svg);
}

console.log('Updated favicon SVG files');
