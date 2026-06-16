import {
  formatWageScaleQualificationLabel,
  getEducationLevelsForOrganization,
  hydrateWageScale,
  type EducationLevel,
  type WageScaleQualificationLabels,
} from '@/lib/preschool-wage-scales';
import { parseEmployeeSchoolingLevel } from '@/lib/staff-schooling';
import { generateNextPersonnelNumber } from '@/lib/staff-personnel-number';
import { EmploymentWorkType, EmployeeSchoolingLevel, StaffEmployee } from '@/types/organization-section';

export type EmployeeImportField =
  | 'index'
  | 'fullName'
  | 'position'
  | 'employmentWorkType'
  | 'department'
  | 'personnelNumber'
  | 'ris'
  | 'rma'
  | 'phone'
  | 'email'
  | 'bankAccount'
  | 'hiredAt'
  | 'schooling'
  | 'education'
  | 'qualification'
  | 'experience'
  | 'birthYear'
  | 'specializationCycle'
  | 'qualificationUpgradeCycle'
  | 'status';

export type EmployeeImportColumnDef = {
  key: EmployeeImportField;
  labels: string[];
};

export type EmployeeImportRow = {
  fullName: string;
  position: string;
  department?: string;
  employmentWorkType?: EmploymentWorkType;
  personnelNumber?: string;
  ris?: string;
  rma?: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  hiredAt?: string;
  schooling?: EmployeeSchoolingLevel;
  education?: string;
  experience?: string;
  birthYear?: string;
  status?: string;
};

export type EmployeeImportParseResult = {
  rows: EmployeeImportRow[];
  errors: { row: number; message: string }[];
  skipped: number;
};

export type EmployeeImportMergeResult = {
  employees: StaffEmployee[];
  added: number;
  updated: number;
  errors: { row: number; message: string }[];
};

const IMPORTABLE_FIELDS = new Set<EmployeeImportField>([
  'fullName',
  'position',
  'employmentWorkType',
  'department',
  'personnelNumber',
  'ris',
  'rma',
  'phone',
  'email',
  'bankAccount',
  'hiredAt',
  'schooling',
  'education',
  'qualification',
  'experience',
  'birthYear',
  'status',
]);

const FIELD_ALIASES: Partial<Record<EmployeeImportField, string[]>> = {
  fullName: ['фио', 'ном', 'name', 'full name', 'сотрудник'],
  position: ['вазифа', 'должность', 'job title'],
  department: ['шуъба', 'отдел', 'department'],
  personnelNumber: ['кадр', 'табельный', 'personnel'],
  phone: ['тел', 'телефон', 'phone'],
  bankAccount: ['суратҳисоб', 'счет', 'iban', 'account'],
  schooling: ['таҳсилот', 'образование', 'education', 'ta\'lim'],
  education: ['тахассус', 'квалификация', 'qualification'],
  qualification: ['тахассус', 'дарача', 'категория', 'квалификация', 'qualification'],
  experience: ['таҷриба', 'стаж', 'experience'],
  birthYear: ['соли таваллуд', 'год рождения', 'birth year'],
};

export function buildEmployeeImportColumns(
  t: (key: string) => string,
  options: { includeProfessionalDevelopment?: boolean } = {}
): EmployeeImportColumnDef[] {
  const defs: Array<{ key: EmployeeImportField; messageKey: string }> = [
    { key: 'index', messageKey: 'staffColNo' },
    { key: 'fullName', messageKey: 'employeeFullName' },
    { key: 'position', messageKey: 'employeePosition' },
    { key: 'employmentWorkType', messageKey: 'employeeEmploymentWorkType' },
    { key: 'department', messageKey: 'employeeDepartment' },
    { key: 'personnelNumber', messageKey: 'employeePersonnelNumber' },
    { key: 'ris', messageKey: 'employeeRis' },
    { key: 'rma', messageKey: 'organizationRma' },
    { key: 'phone', messageKey: 'employeePhone' },
    { key: 'email', messageKey: 'employeeEmail' },
    { key: 'bankAccount', messageKey: 'employeeBankAccount' },
    { key: 'hiredAt', messageKey: 'employeeHiredAt' },
    { key: 'schooling', messageKey: 'employeeSchooling' },
    { key: 'qualification', messageKey: 'employeeQualification' },
    { key: 'experience', messageKey: 'employeeExperience' },
    { key: 'birthYear', messageKey: 'employeeBirthYear' },
    ...(options.includeProfessionalDevelopment
      ? [
          { key: 'specializationCycle' as const, messageKey: 'employeeCyclePeriodSpecialization' },
          {
            key: 'qualificationUpgradeCycle' as const,
            messageKey: 'employeeCyclePeriodQualificationUpgrade',
          },
        ]
      : []),
    { key: 'status', messageKey: 'employeeStatus' },
  ];

  return defs.map(({ key, messageKey }) => ({
    key,
    labels: [t(messageKey), key, ...(FIELD_ALIASES[key] ?? [])],
  }));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCell(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '';
  return trimmed;
}

function mapHeadersToFields(
  headers: string[],
  columns: EmployeeImportColumnDef[]
): (EmployeeImportField | null)[] {
  return headers.map((header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return null;
    for (const column of columns) {
      if (column.labels.some((label) => normalizeHeader(label) === normalized)) {
        return column.key;
      }
    }
    return null;
  });
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

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseDelimitedRows(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function excelCellToString(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
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

export type EmploymentWorkTypeLabels = {
  primary: string;
  secondary: string;
};

export type EmployeeStatusLabels = {
  active: string;
  vacation: string;
  inactive: string;
};

export function parseEmploymentWorkType(
  value: string,
  labels: EmploymentWorkTypeLabels
): EmploymentWorkType | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (
    normalized === 'secondary' ||
    normalized.includes(labels.secondary.toLowerCase()) ||
    normalized.includes('иловаг') ||
    normalized.includes('дополн') ||
    normalized.includes("qo'shimcha")
  ) {
    return 'secondary';
  }
  if (
    normalized === 'primary' ||
    normalized.includes(labels.primary.toLowerCase()) ||
    normalized.includes('асос') ||
    normalized.includes('основ')
  ) {
    return 'primary';
  }
  return undefined;
}

export function parseEmployeeStatus(value: string, labels: EmployeeStatusLabels): string | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (
    normalized === 'vacation' ||
    normalized.includes(labels.vacation.toLowerCase()) ||
    normalized.includes('таътил') ||
    normalized.includes('отпуск')
  ) {
    return 'vacation';
  }
  if (
    normalized === 'inactive' ||
    normalized.includes(labels.inactive.toLowerCase()) ||
    normalized.includes('ғайри') ||
    normalized.includes('неакт')
  ) {
    return 'inactive';
  }
  if (
    normalized === 'active' ||
    normalized.includes(labels.active.toLowerCase()) ||
    normalized.includes('фаъол') ||
    normalized.includes('актив')
  ) {
    return 'active';
  }
  return undefined;
}

function inferEducationLevelFromLabel(
  label: string,
  educationLabels: Record<EducationLevel, string>,
  organizationId: string
): EducationLevel | undefined {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return undefined;

  for (const level of getEducationLevelsForOrganization(organizationId)) {
    if (educationLabels[level]?.trim().toLowerCase() === normalized) {
      return level;
    }
  }

  return undefined;
}

function rowHasData(values: string[]): boolean {
  return values.some((value) => normalizeCell(value));
}

function parseDataRows(
  matrix: string[][],
  columns: EmployeeImportColumnDef[],
  labels: {
    employmentWorkType: EmploymentWorkTypeLabels;
    status: EmployeeStatusLabels;
  }
): EmployeeImportParseResult {
  if (matrix.length < 2) {
    return { rows: [], errors: [], skipped: 0 };
  }

  const fieldByColumn = mapHeadersToFields(matrix[0], columns);
  const rows: EmployeeImportRow[] = [];
  const errors: { row: number; message: string }[] = [];
  let skipped = 0;

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const raw = matrix[rowIndex];
    if (!rowHasData(raw)) {
      skipped += 1;
      continue;
    }

    const values: Partial<Record<EmployeeImportField, string>> = {};
    raw.forEach((cell, columnIndex) => {
      const field = fieldByColumn[columnIndex];
      if (!field || !IMPORTABLE_FIELDS.has(field)) return;
      const normalized = normalizeCell(cell);
      if (normalized) values[field] = normalized;
    });

    const fullName = values.fullName?.trim() ?? '';
    const position = values.position?.trim() ?? '';

    if (!fullName || !position) {
      errors.push({ row: rowIndex + 1, message: 'missing_required' });
      continue;
    }

    const qualification = values.qualification ?? values.education;

    rows.push({
      fullName,
      position,
      department: values.department,
      employmentWorkType: values.employmentWorkType
        ? parseEmploymentWorkType(values.employmentWorkType, labels.employmentWorkType)
        : undefined,
      personnelNumber: values.personnelNumber,
      ris: values.ris,
      rma: values.rma,
      phone: values.phone,
      email: values.email,
      bankAccount: values.bankAccount,
      hiredAt: values.hiredAt,
      schooling: values.schooling
        ? parseEmployeeSchoolingLevel(values.schooling)
        : undefined,
      education: qualification,
      experience: values.experience,
      birthYear: values.birthYear,
      status: values.status ? parseEmployeeStatus(values.status, labels.status) : undefined,
    });
  }

  return { rows, errors, skipped };
}

export function parseEmployeesCsv(
  content: string,
  columns: EmployeeImportColumnDef[],
  labels: {
    employmentWorkType: EmploymentWorkTypeLabels;
    status: EmployeeStatusLabels;
  }
): EmployeeImportParseResult {
  const matrix = parseDelimitedRows(content);
  return parseDataRows(matrix, columns, labels);
}

export async function parseEmployeesExcel(
  buffer: ArrayBuffer,
  columns: EmployeeImportColumnDef[],
  labels: {
    employmentWorkType: EmploymentWorkTypeLabels;
    status: EmployeeStatusLabels;
  }
): Promise<EmployeeImportParseResult> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { rows: [], errors: [{ row: 0, message: 'no_sheet' }], skipped: 0 };
  }

  const matrix: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: string[] = [];
    const maxColumn = Math.max(row.cellCount, sheet.columnCount, columns.length);
    for (let columnIndex = 1; columnIndex <= maxColumn; columnIndex += 1) {
      values.push(excelCellToString(row.getCell(columnIndex).value));
    }
    while (values.length > 0 && !values[values.length - 1]) {
      values.pop();
    }
    if (rowNumber === 1 || rowHasData(values)) {
      matrix.push(values);
    }
  });

  return parseDataRows(matrix, columns, labels);
}

function findExistingEmployeeIndex(
  existing: StaffEmployee[],
  row: EmployeeImportRow
): number {
  if (row.personnelNumber?.trim()) {
    const personnelNumber = row.personnelNumber.trim();
    const index = existing.findIndex(
      (employee) => employee.personnelNumber?.trim() === personnelNumber
    );
    if (index >= 0) return index;
  }

  if (row.ris?.trim()) {
    const ris = row.ris.trim();
    const index = existing.findIndex((employee) => employee.ris?.trim() === ris);
    if (index >= 0) return index;
  }

  const nameKey = row.fullName.trim().toLowerCase();
  const positionKey = row.position.trim().toLowerCase();
  const departmentKey = (row.department ?? '').trim().toLowerCase();

  return existing.findIndex(
    (employee) =>
      employee.fullName.trim().toLowerCase() === nameKey &&
      employee.position.trim().toLowerCase() === positionKey &&
      (employee.department ?? '').trim().toLowerCase() === departmentKey
  );
}

function importRowToEmployee(
  row: EmployeeImportRow,
  organizationId: string,
  qualificationLabels: WageScaleQualificationLabels,
  educationLabels: Record<EducationLevel, string>,
  existingId?: string
): StaffEmployee {
  const wageScaleSeed: { educationLevel?: EducationLevel } = {};
  const educationLevel = row.education
    ? inferEducationLevelFromLabel(row.education, educationLabels, organizationId)
    : undefined;
  if (educationLevel) {
    wageScaleSeed.educationLevel = educationLevel;
  }

  const wageScale = hydrateWageScale(wageScaleSeed, organizationId, row.position);
  const educationLabel = formatWageScaleQualificationLabel(wageScale, qualificationLabels);

  const employee: StaffEmployee = {
    id: existingId ?? crypto.randomUUID(),
    fullName: row.fullName.trim(),
    position: row.position.trim(),
    employmentWorkType: row.employmentWorkType ?? 'primary',
    status: row.status ?? 'active',
    wageScale,
  };

  const optional: Array<
    keyof Omit<
      EmployeeImportRow,
      'fullName' | 'position' | 'employmentWorkType' | 'status' | 'education' | 'schooling'
    >
  > = [
    'department',
    'phone',
    'email',
    'bankAccount',
    'ris',
    'rma',
    'personnelNumber',
    'hiredAt',
    'experience',
    'birthYear',
  ];

  for (const key of optional) {
    const value = row[key]?.trim();
    if (value) employee[key] = value;
  }

  if (educationLabel) {
    employee.education = educationLabel;
  }

  if (row.schooling) {
    employee.schooling = row.schooling;
  }

  return employee;
}

export function mergeImportedEmployees(
  existing: StaffEmployee[],
  imported: EmployeeImportRow[],
  organizationId: string,
  qualificationLabels: WageScaleQualificationLabels,
  educationLabels: Record<EducationLevel, string>
): EmployeeImportMergeResult {
  const next = [...existing];
  let added = 0;
  let updated = 0;
  const errors: { row: number; message: string }[] = [];

  imported.forEach((row, index) => {
    const matchIndex = findExistingEmployeeIndex(next, row);
    const existingId = matchIndex >= 0 ? next[matchIndex].id : undefined;
    const employee = importRowToEmployee(
      row,
      organizationId,
      qualificationLabels,
      educationLabels,
      existingId
    );

    if (!employee.personnelNumber?.trim()) {
      employee.personnelNumber = generateNextPersonnelNumber(next);
    }

    if (matchIndex >= 0) {
      next[matchIndex] = employee;
      updated += 1;
    } else {
      next.push(employee);
      added += 1;
    }

    if (!row.department?.trim()) {
      errors.push({ row: index + 2, message: 'missing_department' });
    }
  });

  return { employees: next, added, updated, errors };
}

export function isEmployeeImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.csv') || name.endsWith('.xlsx');
}
