import { downloadBlob } from '@/lib/document-export/download-blob';
import { EXCEL_COLORS, styleExcelCell } from '@/lib/document-export/excel-styles';
import { CharterDocument } from '@/types/organization-section';

const META_PREFIX = '#meta';
const ARTICLE_PREFIX = '#article';

export function charterExportFilename(ext: 'json' | 'csv' | 'xlsx', date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  if (ext === 'json') return `charter-${stamp}.json`;
  if (ext === 'csv') return `charter-${stamp}.csv`;
  return `charter-${stamp}.xlsx`;
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

export function exportCharterToJson(charter: CharterDocument): string {
  return `${JSON.stringify(charter, null, 2)}\n`;
}

export function exportCharterToCsv(charter: CharterDocument): string {
  const lines = [
    `${META_PREFIX};title;${escapeCsvCell(charter.title)}`,
    `${META_PREFIX};subtitle;${escapeCsvCell(charter.subtitle ?? '')}`,
    `${META_PREFIX};preamble;${escapeCsvCell(charter.preamble)}`,
    `${META_PREFIX};location;${escapeCsvCell(charter.location ?? '')}`,
    `${META_PREFIX};adoptedAt;${escapeCsvCell(charter.adoptedAt ?? '')}`,
    `${META_PREFIX};approvedBy;${escapeCsvCell(charter.approvedBy ?? '')}`,
    `${META_PREFIX};legalBasis;${escapeCsvCell(charter.legalBasis.join(' | '))}`,
    `${ARTICLE_PREFIX};number;title;content`,
    ...charter.articles.map((article) =>
      [ARTICLE_PREFIX, article.number, article.title, article.content]
        .map((cell) => escapeCsvCell(cell))
        .join(';')
    ),
  ];

  return `\uFEFF${lines.join('\n')}`;
}

export async function downloadCharterExcel(charter: CharterDocument, filename: string) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'my-yoqubkhoja-tj';
  workbook.created = new Date();

  const metaSheet = workbook.addWorksheet('Маълумот');
  const metaRows: Array<[string, string]> = [
    ['Сарлавҳа', charter.title],
    ['Тавсиф', charter.subtitle ?? ''],
    ['Муқаддима', charter.preamble],
    ['Ҷойгиршавӣ', charter.location ?? ''],
    ['Санаи қабул', charter.adoptedAt ?? ''],
    ['Тасдиқкунанда', charter.approvedBy ?? ''],
    ['Асоси ҳуқуқӣ', charter.legalBasis.join('; ')],
  ];

  metaRows.forEach(([label, value], index) => {
    const rowNumber = index + 1;
    styleExcelCell(metaSheet.getCell(rowNumber, 1), { value: label, bold: true, wrap: true });
    styleExcelCell(metaSheet.getCell(rowNumber, 2), { value, wrap: true });
    metaSheet.getRow(rowNumber).height = 22;
  });
  metaSheet.getColumn(1).width = 18;
  metaSheet.getColumn(2).width = 72;

  const sheet = workbook.addWorksheet('Моддаҳо');
  ['№', 'Сарлавҳа', 'Матн'].forEach((label, index) => {
    styleExcelCell(sheet.getCell(1, index + 1), {
      value: label,
      bold: true,
      bg: EXCEL_COLORS.headerBlue,
      hAlign: 'center',
      wrap: true,
    });
  });
  sheet.getRow(1).height = 28;

  charter.articles.forEach((article, rowIndex) => {
    const rowNumber = rowIndex + 2;
    styleExcelCell(sheet.getCell(rowNumber, 1), {
      value: article.number,
      hAlign: 'center',
    });
    styleExcelCell(sheet.getCell(rowNumber, 2), { value: article.title, wrap: true });
    styleExcelCell(sheet.getCell(rowNumber, 3), { value: article.content, wrap: true });
    sheet.getRow(rowNumber).height = 48;
  });

  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 72;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  );
}

export function downloadCharterJson(charter: CharterDocument, filename: string) {
  downloadBlob(
    new Blob([exportCharterToJson(charter)], { type: 'application/json;charset=utf-8' }),
    filename.endsWith('.json') ? filename : `${filename}.json`
  );
}

export function downloadCharterCsv(charter: CharterDocument, filename: string) {
  downloadBlob(
    new Blob([exportCharterToCsv(charter)], { type: 'text/csv;charset=utf-8' }),
    filename.endsWith('.csv') ? filename : `${filename}.csv`
  );
}

function normalizeCharter(input: Partial<CharterDocument>): CharterDocument | null {
  if (!input.title?.trim() || !input.preamble?.trim() || !Array.isArray(input.articles)) {
    return null;
  }

  const articles = input.articles
    .map((article, index) => ({
      number: String(article.number ?? index + 1).trim(),
      title: String(article.title ?? '').trim(),
      content: String(article.content ?? '').trim(),
    }))
    .filter((article) => article.title && article.content);

  if (articles.length === 0) return null;

  return {
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || undefined,
    preamble: input.preamble.trim(),
    legalBasis: (input.legalBasis ?? []).map((item) => String(item).trim()).filter(Boolean),
    articles,
    adoptedAt: input.adoptedAt?.trim() || undefined,
    approvedBy: input.approvedBy?.trim() || undefined,
    location: input.location?.trim() || undefined,
  };
}

export function parseCharterFromJson(content: string): CharterDocument | null {
  try {
    const parsed = JSON.parse(content) as Partial<CharterDocument>;
    return normalizeCharter(parsed);
  } catch {
    return null;
  }
}

export function parseCharterFromCsv(content: string): CharterDocument | null {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  const draft: Partial<CharterDocument> = {
    legalBasis: [],
    articles: [],
  };

  for (const rawLine of lines) {
    const delimiter = rawLine.includes(';') ? ';' : ',';
    const cells = parseCsvLine(rawLine, delimiter);
    const kind = cells[0]?.trim();

    if (kind === META_PREFIX) {
      const key = cells[1]?.trim();
      const value = cells.slice(2).join(delimiter === ';' ? ';' : ',').replace(/^"|"$/g, '');
      if (key === 'title') draft.title = value;
      if (key === 'subtitle') draft.subtitle = value;
      if (key === 'preamble') draft.preamble = value;
      if (key === 'location') draft.location = value;
      if (key === 'adoptedAt') draft.adoptedAt = value;
      if (key === 'approvedBy') draft.approvedBy = value;
      if (key === 'legalBasis') {
        draft.legalBasis = value
          .split('|')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      continue;
    }

    if (kind === ARTICLE_PREFIX && cells[1] !== 'number') {
      draft.articles?.push({
        number: cells[1]?.trim() ?? '',
        title: cells[2]?.trim() ?? '',
        content: cells.slice(3).join(delimiter === ';' ? ';' : ',').replace(/^"|"$/g, ''),
      });
    }
  }

  return normalizeCharter(draft);
}

function excelCellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();
    }
    if ('result' in value) return excelCellToString(value.result);
  }
  return String(value).trim();
}

export async function parseCharterFromExcel(buffer: ArrayBuffer): Promise<CharterDocument | null> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const metaSheet = workbook.worksheets.find((sheet) => sheet.name.toLowerCase().includes('маълумот'))
    ?? workbook.worksheets[0];
  const articleSheet = workbook.worksheets.find((sheet) => sheet.name.toLowerCase().includes('модда'))
    ?? workbook.worksheets[1]
    ?? workbook.worksheets[0];

  const draft: Partial<CharterDocument> = {
    legalBasis: [],
    articles: [],
  };

  if (metaSheet) {
    metaSheet.eachRow({ includeEmpty: false }, (row) => {
      const label = excelCellToString(row.getCell(1).value).toLowerCase();
      const value = excelCellToString(row.getCell(2).value);
      if (!value) return;
      if (label.includes('сарлавҳа')) draft.title = value;
      if (label.includes('тавсиф')) draft.subtitle = value;
      if (label.includes('муқаддима')) draft.preamble = value;
      if (label.includes('ҷойгир')) draft.location = value;
      if (label.includes('сана')) draft.adoptedAt = value;
      if (label.includes('тасдиқ')) draft.approvedBy = value;
      if (label.includes('асос')) {
        draft.legalBasis = value
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    });
  }

  if (articleSheet) {
    let headerSkipped = false;
    articleSheet.eachRow({ includeEmpty: false }, (row) => {
      const number = excelCellToString(row.getCell(1).value);
      const title = excelCellToString(row.getCell(2).value);
      const content = excelCellToString(row.getCell(3).value);
      if (!headerSkipped && (number === '№' || title.toLowerCase().includes('сарлавҳа'))) {
        headerSkipped = true;
        return;
      }
      if (!title || !content) return;
      draft.articles?.push({
        number: number || String((draft.articles?.length ?? 0) + 1),
        title,
        content,
      });
    });
  }

  return normalizeCharter(draft);
}

export function isCharterImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.json') || name.endsWith('.csv') || name.endsWith('.xlsx');
}

export async function parseCharterFile(file: File): Promise<CharterDocument | null> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.json')) {
    return parseCharterFromJson(await file.text());
  }
  if (lowerName.endsWith('.csv')) {
    return parseCharterFromCsv(await file.text());
  }
  if (lowerName.endsWith('.xlsx')) {
    return parseCharterFromExcel(await file.arrayBuffer());
  }
  return null;
}
