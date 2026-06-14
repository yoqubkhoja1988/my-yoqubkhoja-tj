import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import https from 'node:https';

const execFileAsync = promisify(execFile);

export const NBT_BIC_PDF_URL = 'https://nbt.tj/upload/files/bic/bic_ru.pdf';
export const MOLIYA_TREASURY_BIK = '350101800';

export interface NbtBankBicEntry {
  bik: string;
  name: string;
  correspondentAccount: string;
  source: 'nbt' | 'moliya';
}

interface NbtBankBicSeedFile {
  updatedAt?: string;
  source?: string;
  banks?: NbtBankBicEntry[];
}

const SEED_FILE = join(process.cwd(), 'data', 'nbt-bank-bic.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedDirectory: Map<string, NbtBankBicEntry> | null = null;
let cachedAt = 0;

function httpsGetBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'GET', rejectUnauthorized: false, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YoqubKhoja/1.0)' } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.setTimeout(20000, () => req.destroy(new Error('Request timeout')));
    req.on('error', reject);
    req.end();
  });
}

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  if (process.platform === 'win32') {
    for (const binary of ['curl.exe', 'curl']) {
      try {
        const { stdout } = await execFileAsync(binary, ['-k', '-s', '-L', '--max-time', '20', url], {
          maxBuffer: 8 * 1024 * 1024,
          encoding: 'buffer',
        });
        if (stdout.length > 0) return Buffer.from(stdout);
      } catch {
        // try next
      }
    }
  }

  return httpsGetBuffer(url);
}

function isHeaderLine(line: string): boolean {
  return (
    !line ||
    line.includes('Банковские идентификационные коды') ||
    line.includes('Наименование финансовой') ||
    line.includes('Номер корсчета') ||
    line.includes('Межбанковские') ||
    line.includes('НФО имеющие') ||
    line.startsWith('####') ||
    line.startsWith('## ')
  );
}

export function parseNbtBicDirectoryText(text: string): Map<string, NbtBankBicEntry> {
  const map = new Map<string, NbtBankBicEntry>();
  let pendingName = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (isHeaderLine(line)) continue;

    const fullMatch = line.match(/^(.*?)\s(350\d{6})\s+(20\d{11,20})\s*$/);
    if (fullMatch) {
      const name = fullMatch[1].trim();
      map.set(fullMatch[2], {
        bik: fullMatch[2],
        name,
        correspondentAccount: fullMatch[3],
        source: 'nbt',
      });
      pendingName = '';
      continue;
    }

    const splitMatch = line.match(/^(350\d{6})\s+(20\d{11,20})/);
    if (splitMatch) {
      const name = pendingName || map.get(splitMatch[1])?.name || '';
      if (name || splitMatch[2]) {
        map.set(splitMatch[1], {
          bik: splitMatch[1],
          name,
          correspondentAccount: splitMatch[2],
          source: 'nbt',
        });
      }
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

  map.set(MOLIYA_TREASURY_BIK, {
    bik: MOLIYA_TREASURY_BIK,
    name: 'ГУЦК МФ Ҷумҳурии Тоҷикистон',
    correspondentAccount: '22402972000002',
    source: 'moliya',
  });

  return map;
}

function readSeedDirectory(): Map<string, NbtBankBicEntry> {
  if (!existsSync(SEED_FILE)) return new Map();

  try {
    const parsed = JSON.parse(readFileSync(SEED_FILE, 'utf8')) as NbtBankBicSeedFile;
    const map = new Map<string, NbtBankBicEntry>();
    for (const bank of parsed.banks ?? []) {
      if (bank.bik && bank.correspondentAccount) {
        map.set(bank.bik, bank);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

async function fetchDirectoryFromNbtPdf(): Promise<Map<string, NbtBankBicEntry>> {
  const buffer = await fetchPdfBuffer(NBT_BIC_PDF_URL);
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse(new Uint8Array(buffer));
  const textResult = await parser.getText();
  const text =
    typeof textResult === 'string'
      ? textResult
      : typeof textResult === 'object' && textResult && 'text' in textResult
        ? String((textResult as { text?: string }).text ?? '')
        : String(textResult);

  return parseNbtBicDirectoryText(text);
}

async function loadDirectory(forceRefresh = false): Promise<Map<string, NbtBankBicEntry>> {
  const now = Date.now();
  if (!forceRefresh && cachedDirectory && now - cachedAt < CACHE_TTL_MS) {
    return cachedDirectory;
  }

  const seed = readSeedDirectory();

  try {
    const live = await fetchDirectoryFromNbtPdf();
    if (live.size > 0) {
      cachedDirectory = live;
      cachedAt = now;
      return live;
    }
  } catch {
    // fall back to seed
  }

  if (seed.size > 0) {
    cachedDirectory = seed;
    cachedAt = now;
    return seed;
  }

  cachedDirectory = seed;
  cachedAt = now;
  return seed;
}

export function normalizeBikInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 9);
}

export function isValidBik(value: string): boolean {
  const bik = normalizeBikInput(value);
  return /^350\d{6}$/.test(bik);
}

export async function lookupBankByBik(bik: string): Promise<NbtBankBicEntry | null> {
  const normalized = normalizeBikInput(bik);
  if (!isValidBik(normalized)) return null;

  const directory = await loadDirectory();
  const entry = directory.get(normalized);
  if (!entry?.correspondentAccount) return null;

  return {
    bik: normalized,
    name: entry.name,
    correspondentAccount: entry.correspondentAccount,
    source: entry.source,
  };
}
