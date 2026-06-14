import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngPath = path.join(root, 'public/images/organization-eagle-logo.png');
const base64 = fs.readFileSync(pngPath).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <clipPath id="c">
      <circle cx="32" cy="32" r="30"/>
    </clipPath>
  </defs>
  <circle cx="32" cy="32" r="31" fill="#0f2847"/>
  <image href="data:image/png;base64,${base64}" width="64" height="64" clip-path="url(#c)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="32" cy="32" r="30" fill="none" stroke="#c9a227" stroke-width="2"/>
</svg>`;

for (const target of [
  path.join(root, 'public/favicon.svg'),
  path.join(root, 'docs/presentation/assets/favicon.svg'),
]) {
  fs.writeFileSync(target, svg);
}

console.log('Updated favicon SVG files');
