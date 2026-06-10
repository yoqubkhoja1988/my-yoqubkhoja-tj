import { execFile } from 'node:child_process';
import https from 'node:https';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const ANDOZ_BASE = 'https://www.andoz.tj';

export interface AndozLookupResult {
  rma: string;
  ryam?: string;
  name: string;
  address?: string;
  director?: string;
  chiefAccountant?: string;
  directorPhone?: string;
  chiefAccountantPhone?: string;
  phone?: string;
  taxDistrict?: string;
  status?: string;
  registeredAt?: string;
}

interface HttpsResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; YoqubKhoja/1.0)',
  Accept: '*/*',
  Connection: 'close',
};

function httpsRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  } = {}
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method || 'GET',
        headers: { ...DEFAULT_HEADERS, ...options.headers },
        rejectUnauthorized: false,
        family: 4,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.setTimeout(options.timeoutMs ?? 15000, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function parseCookies(headers: HttpsResponse['headers']): string {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return '';
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.map((item) => item.split(';')[0]).join('; ');
}

function extractToken(html: string): string | null {
  const match = html.match(
    /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/
  );
  return match?.[1] ?? null;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)))
    .trim();
}

function stripTags(text: string): string {
  return decodeHtml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function parseRegisterTable(html: string): Partial<AndozLookupResult> | null {
  const rowMatch = html.match(/<tbody>\s*<tr[^>]*>([\s\S]*?)<\/tr>\s*<\/tbody>/i);
  if (!rowMatch) return null;

  const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
    stripTags(m[1])
  );
  if (cells.length < 5) return null;

  return {
    ryam: cells[0] || undefined,
    rma: cells[1] || undefined,
    name: cells[2] || undefined,
    registeredAt: cells[3] || undefined,
    status: cells[4] || undefined,
  };
}

interface TerminalInfo {
  fullName?: string;
  txtInsp?: string | null;
  txtPhone?: string | null;
  inn?: string;
  nptype?: number | null;
}

async function fetchJsonViaCurl(url: string): Promise<string | null> {
  const binaries = process.platform === 'win32' ? ['curl.exe', 'curl'] : ['curl'];

  for (const binary of binaries) {
    try {
      const { stdout } = await execFileAsync(
        binary,
        ['-k', '-s', '--max-time', '15', url],
        { maxBuffer: 5 * 1024 * 1024 }
      );
      if (stdout.trim()) return stdout.trim();
    } catch {
      // try next binary
    }
  }

  return null;
}

function parseTerminalInfo(body: string): TerminalInfo | null {
  try {
    const data = JSON.parse(body) as {
      Result?: string;
      userInfo?: TerminalInfo[];
    };

    if (data.Result === 'ERROR') return null;
    const info = data.userInfo?.[0];
    if (!info?.inn || !info.fullName) return null;
    if (info.fullName.includes('ёфт нашуд')) return null;
    return info;
  } catch {
    return null;
  }
}

async function fetchTerminalInfo(rma: string): Promise<TerminalInfo | null> {
  const url = `${ANDOZ_BASE}/ForTaxpayer/GetInfoByInnTerminal?${new URLSearchParams({ inn: rma })}`;

  const curlBody = await fetchJsonViaCurl(url);
  if (curlBody) {
    const parsed = parseTerminalInfo(curlBody);
    if (parsed) return parsed;
  }

  try {
    const response = await httpsRequest(url, {
      headers: { Accept: 'application/json' },
      timeoutMs: 10000,
    });
    if (response.statusCode >= 400) return null;
    return parseTerminalInfo(response.body);
  } catch {
    return null;
  }
}

async function fetchRegisterInfo(rma: string): Promise<Partial<AndozLookupResult> | null> {
  const pageUrl = `${ANDOZ_BASE}/ForTaxpayer/UnifiedStateRegister`;
  const page = await httpsRequest(pageUrl, {
    headers: { Accept: 'text/html' },
  });

  const token = extractToken(page.body);
  if (!token) return null;

  const cookies = parseCookies(page.headers);
  const body = new URLSearchParams({
    __RequestVerificationToken: token,
    Data: rma,
    TypeData: '2',
    TypeQuery: '2',
  }).toString();

  const result = await httpsRequest(pageUrl, {
    method: 'POST',
    headers: {
      Accept: 'text/html',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
      Referer: pageUrl,
    },
    body,
  });

  return parseRegisterTable(result.body);
}

export async function lookupOrganizationByRma(rma: string): Promise<AndozLookupResult | null> {
  const normalized = rma.replace(/\D/g, '');
  if (normalized.length < 9) return null;

  const [terminalResult, registerResult] = await Promise.allSettled([
    fetchTerminalInfo(normalized),
    fetchRegisterInfo(normalized),
  ]);

  const terminal = terminalResult.status === 'fulfilled' ? terminalResult.value : null;
  const register = registerResult.status === 'fulfilled' ? registerResult.value : null;

  if (!terminal && !register?.name) return null;

  const name = terminal?.fullName || register?.name || '';
  const taxDistrict = terminal?.txtInsp || undefined;
  const phone = terminal?.txtPhone?.trim() || undefined;

  return {
    rma: terminal?.inn || register?.rma || normalized,
    ryam: register?.ryam,
    name,
    address: register?.address || undefined,
    director: undefined,
    chiefAccountant: undefined,
    directorPhone: phone,
    chiefAccountantPhone: undefined,
    phone,
    taxDistrict,
    status: register?.status,
    registeredAt: register?.registeredAt,
  };
}
