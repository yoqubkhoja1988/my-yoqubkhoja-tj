/**
 * Генератсияи PDF аз ҳуҷҷатҳои HTML дар private/admin-docs/
 * Иҷро: node scripts/generate-utoq-docs-pdf.mjs
 */
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const docsDir = join(root, 'private', 'admin-docs');
const pdfDir = join(docsDir, 'pdf');

const DOCUMENTS = [
  ['shartnomai-hizmatrasoni-utoqi-shakhsi.html', 'shartnomai-hizmatrasoni-utoqi-shakhsi.pdf'],
  ['narknomai-utoqi-shakhsi.html', 'narknomai-utoqi-shakhsi.pdf'],
];

async function main() {
  if (!existsSync(pdfDir)) {
    mkdirSync(pdfDir, { recursive: true });
  }

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    for (const [htmlName, pdfName] of DOCUMENTS) {
      const htmlPath = join(docsDir, htmlName);
      const pdfPath = join(pdfDir, pdfName);
      const page = await browser.newPage();
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '12mm', left: '12mm', right: '12mm' },
      });
      await page.close();
      console.log(`✓ ${pdfName}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nPDFҳо дар: ${pdfDir}`);
}

main().catch((error) => {
  console.error('Хатогӣ:', error.message);
  console.error('\nАгар puppeteer насб нашуда бошад: npm install -D puppeteer');
  console.error('Ё HTML-ҳоро дар браузер кушоед ва Ctrl+P → Save as PDF кунед.');
  process.exit(1);
});
