#!/usr/bin/env node
/**
 * Refresh data/nbt-bank-bic.json from the official NBT BIC directory PDF.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFParse } from 'pdf-parse';
import https from 'node:https';

const NBT_BIC_PDF_URL = 'https://nbt.tj/upload/files/bic/bic_ru.pdf';

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function isHeaderLine(line) {
  return (
    !line ||
    line.includes('Банковские идентификационные коды') ||
    line.includes('Наименование финансовой') ||
    line.includes('Номер корсчета') ||
    line.includes('Межбанковские') ||
    line.startsWith('####') ||
    line.startsWith('## ')
  );
}

function parseNbtBicDirectoryText(text) {
  const map = new Map();
  let pendingName = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (isHeaderLine(line)) continue;

    const fullMatch = line.match(/^(.*?)\s(350\d{6})\s+(20\d{11,20})\s*$/);
    if (fullMatch) {
      map.set(fullMatch[2], {
        bik: fullMatch[2],
        name: fullMatch[1].trim(),
        correspondentAccount: fullMatch[3],
        source: 'nbt',
      });
      pendingName = '';
      continue;
    }

    const splitMatch = line.match(/^(350\d{6})\s+(20\d{11,20})/);
    if (splitMatch) {
      const name = pendingName || map.get(splitMatch[1])?.name || '';
      map.set(splitMatch[1], {
        bik: splitMatch[1],
        name,
        correspondentAccount: splitMatch[2],
        source: 'nbt',
      });
      pendingName = '';
      continue;
    }

    if (
      line.length > 8 &&
      !/^\d/.test(line) &&
      !line.startsWith('в том числе') &&
      !line.startsWith('Филиал') &&
      !line.startsWith('Ф-ал')
    ) {
      pendingName = line.replace(/\s+в том числе.*$/i, '').trim();
    }
  }

  map.set('350101800', {
    bik: '350101800',
    name: 'ГУЦК МФ Ҷумҳурии Тоҷикистон',
    correspondentAccount: '22402972000002',
    source: 'moliya',
  });

  return [...map.values()].sort((a, b) => a.bik.localeCompare(b.bik));
}

async function main() {
  const buffer = await httpsGetBuffer(NBT_BIC_PDF_URL);
  const parser = new PDFParse(new Uint8Array(buffer));
  const textResult = await parser.getText();
  const text =
    typeof textResult === 'string'
      ? textResult
      : typeof textResult === 'object' && textResult && 'text' in textResult
        ? String(textResult.text ?? '')
        : String(textResult);

  const banks = parseNbtBicDirectoryText(text);
  const output = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: NBT_BIC_PDF_URL,
    banks,
  };

  const file = join(process.cwd(), 'data', 'nbt-bank-bic.json');
  writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${banks.length} bank BIC row(s) to ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
