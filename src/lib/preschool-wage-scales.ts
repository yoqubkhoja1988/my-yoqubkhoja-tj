import { KINDERGARTEN_SCHOOL_ID } from '@/lib/activity-directions';
import { isKindergartenOrganization } from '@/lib/organization-scope';
import { EmployeeWageScale, StaffEmployee } from '@/types/organization-section';

export type WageScaleGroup =
  | 'management'
  | 'educator-20h'
  | 'teacher-18h'
  | 'library'
  | 'medical'
  | 'psychologist'
  | 'auxiliary';

export type StudentBracket =
  | 'upTo100'
  | 'from101to280'
  | 'from281to400'
  | 'from401to880'
  | 'from881to1600'
  | 'from1601to2500'
  | 'over2500';

export type EducationLevel =
  | 'general_secondary'
  | 'secondary_vocational'
  | 'secondary_vocational_c2'
  | 'secondary_vocational_c1'
  | 'higher'
  | 'higher_c2'
  | 'higher_c1'
  | 'higher_superior';

export type ManagementRole = 'director' | 'deputy_education' | 'deputy_other';

export type LibraryRole =
  | 'head_higher'
  | 'head_vocational'
  | 'librarian_higher'
  | 'librarian_vocational'
  | 'student_org';

export type MedicalCategory = 'none' | 'superior' | 'category_1' | 'category_2';

export type ExtraDuty = 'class_leadership' | 'notebook_check' | 'cabinet_management';

export const WAGE_SCALE_GROUPS: WageScaleGroup[] = [
  'management',
  'educator-20h',
  'teacher-18h',
  'library',
  'medical',
  'psychologist',
  'auxiliary',
];

export const STUDENT_BRACKETS: StudentBracket[] = [
  'upTo100',
  'from101to280',
  'from281to400',
  'from401to880',
  'from881to1600',
  'from1601to2500',
  'over2500',
];

export const EDUCATION_LEVELS: EducationLevel[] = [
  'general_secondary',
  'secondary_vocational',
  'secondary_vocational_c2',
  'secondary_vocational_c1',
  'higher',
  'higher_c2',
  'higher_c1',
  'higher_superior',
];

/** МДТМ кӯдакистон: 8 дараҷаи таҳсилот/категория (Қарори №113) */
export const KINDERGARTEN_EDUCATION_LEVELS: EducationLevel[] = [
  'general_secondary',
  'secondary_vocational',
  'secondary_vocational_c2',
  'secondary_vocational_c1',
  'higher',
  'higher_c2',
  'higher_c1',
  'higher_superior',
];

export function getEducationLevelsForOrganization(organizationId?: string): EducationLevel[] {
  return organizationId === KINDERGARTEN_SCHOOL_ID ? KINDERGARTEN_EDUCATION_LEVELS : EDUCATION_LEVELS;
}

export function normalizeEducationLevel(
  level: EducationLevel | undefined,
  organizationId?: string
): EducationLevel {
  const levels = getEducationLevelsForOrganization(organizationId);
  if (level && levels.includes(level)) return level;
  return organizationId === KINDERGARTEN_SCHOOL_ID ? 'higher_c1' : 'higher_c1';
}

const MANAGEMENT_SALARIES: Record<ManagementRole, Record<StudentBracket, number>> = {
  director: {
    upTo100: 1803,
    from101to280: 1889,
    from281to400: 1989,
    from401to880: 2197,
    from881to1600: 2393,
    from1601to2500: 2699,
    over2500: 2972,
  },
  deputy_education: {
    upTo100: 1602,
    from101to280: 1702,
    from281to400: 1803,
    from401to880: 1989,
    from881to1600: 2197,
    from1601to2500: 2393,
    over2500: 2634,
  },
  deputy_other: {
    upTo100: 1498,
    from101to280: 1571,
    from281to400: 1623,
    from401to880: 1757,
    from881to1600: 2063,
    from1601to2500: 2243,
    over2500: 2519,
  },
};

type TeachingScaleRow = {
  workUnit: number;
  hourly: number;
  classLeadership: number;
  notebookCheck: number;
  cabinet: number;
};

function buildTeachingRow(workUnit: number): TeachingScaleRow {
  return {
    workUnit,
    hourly: workUnit / 20,
    classLeadership: workUnit * 0.15,
    notebookCheck: workUnit * 0.2,
    cabinet: workUnit * 0.1,
  };
}

/** Меъёрҳои мураббӣ/омӯзгор — Сохтори таркибии кӯдакистон (101–280 тарбиягиранда) */
const EDUCATOR_20H: Record<EducationLevel, TeachingScaleRow> = {
  general_secondary: buildTeachingRow(1191),
  secondary_vocational: buildTeachingRow(1702),
  secondary_vocational_c2: buildTeachingRow(1803),
  secondary_vocational_c1: buildTeachingRow(1889),
  higher: buildTeachingRow(1989),
  higher_c2: buildTeachingRow(2197),
  higher_c1: buildTeachingRow(2393),
  higher_superior: buildTeachingRow(2699),
};

const TEACHER_18H: Record<EducationLevel, TeachingScaleRow> = {
  general_secondary: {
    workUnit: 1121,
    hourly: 62.28,
    classLeadership: 168.15,
    notebookCheck: 224.2,
    cabinet: 112.1,
  },
  secondary_vocational: {
    workUnit: 1230,
    hourly: 68.33,
    classLeadership: 184.5,
    notebookCheck: 246.0,
    cabinet: 123.0,
  },
  secondary_vocational_c2: {
    workUnit: 1335,
    hourly: 74.17,
    classLeadership: 200.25,
    notebookCheck: 267.0,
    cabinet: 133.5,
  },
  secondary_vocational_c1: {
    workUnit: 1420,
    hourly: 78.89,
    classLeadership: 213.0,
    notebookCheck: 284.0,
    cabinet: 142.0,
  },
  higher: {
    workUnit: 1510,
    hourly: 83.89,
    classLeadership: 226.5,
    notebookCheck: 302.0,
    cabinet: 151.0,
  },
  higher_c2: {
    workUnit: 2120,
    hourly: 117.78,
    classLeadership: 318.0,
    notebookCheck: 424.0,
    cabinet: 212.0,
  },
  higher_c1: {
    workUnit: 2340,
    hourly: 130.0,
    classLeadership: 351.0,
    notebookCheck: 468.0,
    cabinet: 234.0,
  },
  higher_superior: {
    workUnit: 2479,
    hourly: 137.72,
    classLeadership: 371.85,
    notebookCheck: 495.8,
    cabinet: 247.9,
  },
};

const LIBRARY_SALARIES: Record<LibraryRole, number> = {
  head_higher: 1889,
  head_vocational: 1702,
  librarian_higher: 1505,
  librarian_vocational: 1307,
  student_org: 1712,
};

const MEDICAL_SALARIES: Record<MedicalCategory, number> = {
  none: 1604.77,
  superior: 2079.84,
  category_1: 1869.92,
  category_2: 1687.54,
};

const PSYCHOLOGIST_SALARIES: Record<EducationLevel, number> = {
  general_secondary: 1602,
  secondary_vocational: 1712,
  secondary_vocational_c2: 1830,
  secondary_vocational_c1: 1950,
  higher: 2070,
  higher_c2: 2250,
  higher_c1: 2370,
  higher_superior: 2479,
};

const AUXILIARY_SALARY = 1387;
const ACCOUNTANT_SALARY = 1790.1;

export const DEFAULT_STUDENT_BRACKET: StudentBracket = 'from101to280';
/** МДТМ Кӯдакистони №1: 400 тарбиягиранда → меъёри 281–400 */
export const KINDERGARTEN_STUDENT_BRACKET: StudentBracket = 'from281to400';

export const KINDERGARTEN_WAGE_SCALE_GROUPS: WageScaleGroup[] = [
  'management',
  'educator-20h',
  'medical',
  'auxiliary',
];

export function usesPreschoolWageScales(organizationId: string): boolean {
  return isKindergartenOrganization(organizationId);
}

export function getDefaultStudentBracket(organizationId?: string): StudentBracket {
  return organizationId === KINDERGARTEN_SCHOOL_ID
    ? KINDERGARTEN_STUDENT_BRACKET
    : DEFAULT_STUDENT_BRACKET;
}

/** Кӯдакистон: мудир танҳо роҳбарӣ мекунад (бе маош); мушовир — меъёри 281–400 = 1 989 */
export function getManagementSalary(
  role: ManagementRole,
  bracket: StudentBracket,
  organizationId?: string
): number {
  if (organizationId === KINDERGARTEN_SCHOOL_ID) {
    if (role === 'director') return 0;
    if (role === 'deputy_education' && bracket === 'from281to400') return 1989;
  }
  return MANAGEMENT_SALARIES[role][bracket];
}

export function isKindergartenDirectorWithoutSalary(
  scale: EmployeeWageScale,
  organizationId?: string
): boolean {
  return (
    organizationId === KINDERGARTEN_SCHOOL_ID &&
    scale.group === 'management' &&
    (scale.managementRole ?? 'director') === 'director'
  );
}

export function emptyWageScale(organizationId?: string): EmployeeWageScale {
  return {
    group: 'educator-20h',
    studentBracket: getDefaultStudentBracket(organizationId),
    educationLevel: 'higher_c1',
    medicalCategory: 'category_2',
    auxiliaryRole: 'standard',
    extraDuties: [],
    workUnitRate: '1',
  };
}

function normalizePositionKey(position: string): string {
  return position
    .toLowerCase()
    .replace(/ӣ/g, 'и')
    .replace(/ӯ/g, 'у')
    .replace(/ҳ/g, 'х')
    .replace(/ғ/g, 'г')
    .replace(/қ/g, 'к')
    .replace(/ҷ/g, 'ч');
}

export function usesEducationLevel(group?: EmployeeWageScale['group']): boolean {
  return (
    group === 'educator-20h' ||
    group === 'teacher-18h' ||
    group === 'psychologist'
  );
}

function positionImpliesEducationLevel(position: string): boolean {
  const lower = normalizePositionKey(position);
  return (
    lower.includes('дарача') ||
    lower.includes('категория') ||
    lower.includes('омузгори забон')
  );
}

export function inferEducationLevelFromPosition(position: string): EducationLevel {
  const lower = normalizePositionKey(position);
  if (lower.includes('дарачаи оли') || lower.includes('категорияи оли')) {
    return 'higher_superior';
  }
  if (lower.includes('дарачаи якум') || lower.includes('категорияи якум')) {
    return 'higher_c1';
  }
  if (lower.includes('дарачаи дуюм') || lower.includes('категорияи дуюм')) {
    return 'higher_c2';
  }
  if (lower.includes('бе дарача') || lower.includes('бе категория')) {
    return 'higher';
  }
  if (lower.includes('омузгори забон')) {
    return 'higher';
  }
  return 'higher_c1';
}

export function inferMedicalCategoryFromPosition(position: string): MedicalCategory {
  const lower = normalizePositionKey(position);
  if (lower.includes('дарачаи оли') || lower.includes('категорияи оли')) return 'superior';
  if (lower.includes('дарачаи якум') || lower.includes('категорияи якум')) return 'category_1';
  if (lower.includes('дарачаи дуюм') || lower.includes('категорияи дуюм')) return 'category_2';
  if (lower.includes('бе дарача') || lower.includes('бе категория')) return 'none';
  return 'category_2';
}

export function inferWageScaleFromPosition(
  position: string,
  organizationId?: string
): Partial<EmployeeWageScale> {
  const lower = normalizePositionKey(position);
  const educationLevel = inferEducationLevelFromPosition(position);
  const studentBracket = getDefaultStudentBracket(organizationId);

  if (
    (lower.includes('директор') || lower.includes('мудир')) &&
    !lower.includes('муовин') &&
    !lower.includes('хоҷаг')
  ) {
    return {
      group: 'management',
      managementRole: 'director',
      studentBracket,
    };
  }
  if (lower.includes('сармурабб') || lower.includes('мушовир')) {
    return {
      group: 'management',
      managementRole: 'deputy_education',
      studentBracket,
    };
  }
  if (lower.includes('мухосиб') || lower.includes('сармухосиб')) {
    return { group: 'auxiliary', auxiliaryRole: 'accountant' };
  }
  if (lower.includes('хамшира')) {
    return { group: 'medical', medicalCategory: inferMedicalCategoryFromPosition(position) };
  }
  if (
    lower.includes('ёвар') &&
    lower.includes('мурабб')
  ) {
    return { group: 'auxiliary', auxiliaryRole: 'standard' };
  }
  if (
    lower.includes('мурабб') ||
    lower.includes('омузгор') ||
    lower.includes('рохбари музик')
  ) {
    return { group: 'educator-20h', educationLevel };
  }
  if (
    lower.includes('ошпаз') ||
    lower.includes('фаррош') ||
    lower.includes('ёрирасон') ||
    lower.includes('коргари') ||
    lower.includes('коргузор') ||
    lower.includes('котиба') ||
    lower.includes('мудири хоҷаг') ||
    lower.includes('дардуз') ||
    lower.includes('чомадор') ||
    lower.includes('чомашуй') ||
    lower.includes('хавлируб') ||
    lower.includes('посбон') ||
    lower.includes('оташбон') ||
    lower.includes('доя')
  ) {
    return { group: 'auxiliary', auxiliaryRole: 'standard' };
  }
  return { group: 'educator-20h', educationLevel };
}

/** Меъёрҳои мураббӣ (20 соат) — Сохтори таркибии кӯдакистон, Қарори №113 */
export const KINDERGARTEN_EDUCATOR_DUTY_SALARIES: Record<EducationLevel, number> = {
  general_secondary: 1191,
  secondary_vocational: 1702,
  secondary_vocational_c2: 1803,
  secondary_vocational_c1: 1889,
  higher: 1989,
  higher_c2: 2197,
  higher_c1: 2393,
  higher_superior: 2699,
};

export function getEducationLevelSalary(
  group: EmployeeWageScale['group'],
  level: EducationLevel
): number {
  if (group === 'educator-20h') return EDUCATOR_20H[level].workUnit;
  if (group === 'teacher-18h') return TEACHER_18H[level].workUnit;
  if (group === 'psychologist') return PSYCHOLOGIST_SALARIES[level];
  return 0;
}

export function hydrateWageScale(
  scale: EmployeeWageScale | undefined,
  organizationId: string,
  position?: string
): EmployeeWageScale {
  const defaults = emptyWageScale(organizationId);
  const inferred = position ? inferWageScaleFromPosition(position, organizationId) : {};
  const savedEducation = scale?.educationLevel;
  const savedExtras = scale?.extraDuties ?? [];

  // Вазифа (inferred) барои гурӯҳ/нақш аҳамият дорад; маълумоти интихобшудаи корбар нигоҳ дошта мешавад
  const merged: EmployeeWageScale = {
    ...defaults,
    ...scale,
    ...inferred,
    extraDuties: savedExtras,
  };

  if (
    savedEducation &&
    usesEducationLevel(merged.group) &&
    !(position && positionImpliesEducationLevel(position))
  ) {
    merged.educationLevel = normalizeEducationLevel(savedEducation, organizationId);
  } else if (usesEducationLevel(merged.group)) {
    merged.educationLevel = normalizeEducationLevel(merged.educationLevel, organizationId);
  }

  if (!merged.group) merged.group = defaults.group;

  delete merged.baseSalary;
  delete merged.calculatedMonthly;
  delete merged.hourlyRate;

  return calculateWageScale(merged, organizationId);
}

export function getEducatorDutySalary(
  level: EducationLevel,
  organizationId?: string,
  group: EmployeeWageScale['group'] = 'educator-20h'
): number {
  if (organizationId === KINDERGARTEN_SCHOOL_ID && group === 'educator-20h') {
    return KINDERGARTEN_EDUCATOR_DUTY_SALARIES[level];
  }
  return getEducationLevelSalary(group ?? 'educator-20h', level);
}

export function getMedicalCategorySalary(category: MedicalCategory): number {
  return MEDICAL_SALARIES[category];
}

function sumExtras(row: TeachingScaleRow, extraDuties: ExtraDuty[] = []): number {
  let total = 0;
  if (extraDuties.includes('class_leadership')) total += row.classLeadership;
  if (extraDuties.includes('notebook_check')) total += row.notebookCheck;
  if (extraDuties.includes('cabinet_management')) total += row.cabinet;
  return total;
}

/** Маоши вазифавӣ (воҳиди корӣ) — бе иловагиҳо */
export function getDutySalaryFromScale(
  scale: EmployeeWageScale,
  organizationId?: string
): number {
  switch (scale.group) {
    case 'management': {
      const role = scale.managementRole ?? 'director';
      const bracket = scale.studentBracket ?? getDefaultStudentBracket(organizationId);
      return getManagementSalary(role, bracket, organizationId);
    }
    case 'educator-20h': {
      const level = scale.educationLevel ?? 'higher_c1';
      return getEducatorDutySalary(level, organizationId, 'educator-20h');
    }
    case 'teacher-18h': {
      const level = scale.educationLevel ?? 'higher_c1';
      if (organizationId === KINDERGARTEN_SCHOOL_ID) {
        return getEducatorDutySalary(level, organizationId, 'educator-20h');
      }
      return TEACHER_18H[level].workUnit;
    }
    case 'library':
      return LIBRARY_SALARIES[scale.libraryRole ?? 'librarian_higher'];
    case 'medical':
      return MEDICAL_SALARIES[scale.medicalCategory ?? 'category_2'];
    case 'psychologist':
      return PSYCHOLOGIST_SALARIES[scale.educationLevel ?? 'higher_c1'];
    case 'auxiliary':
      return scale.auxiliaryRole === 'accountant' ? ACCOUNTANT_SALARY : AUXILIARY_SALARY;
    default:
      return 0;
  }
}

function getTeachingExtras(scale: EmployeeWageScale): number {
  const extraDuties = scale.extraDuties ?? [];
  if (scale.group !== 'educator-20h' && scale.group !== 'teacher-18h') return 0;
  const level = scale.educationLevel ?? 'higher_c1';
  const row = scale.group === 'educator-20h' ? EDUCATOR_20H[level] : TEACHER_18H[level];
  return sumExtras(row, extraDuties);
}

function getHourlyRateFromScale(scale: EmployeeWageScale): number | undefined {
  if (scale.group !== 'educator-20h' && scale.group !== 'teacher-18h') return undefined;
  const level = scale.educationLevel ?? 'higher_c1';
  const row = scale.group === 'educator-20h' ? EDUCATOR_20H[level] : TEACHER_18H[level];
  return row.hourly;
}

export function calculateWageScale(
  scale: EmployeeWageScale,
  organizationId?: string
): EmployeeWageScale {
  const dutySalary = getDutySalaryFromScale(scale, organizationId);
  const extras = getTeachingExtras(scale);
  const hourlyRate = getHourlyRateFromScale(scale);
  const workUnitRate = parseWorkUnitRate(scale.workUnitRate);
  const monthlyWage = (dutySalary + extras) * workUnitRate;

  return {
    ...scale,
    workUnitRate: scale.workUnitRate?.trim()
      ? scale.workUnitRate.trim()
      : formatWorkUnitRate(workUnitRate),
    baseSalary: formatWageAmount(dutySalary),
    hourlyRate: hourlyRate !== undefined ? formatWageAmount(hourlyRate) : undefined,
    calculatedMonthly: formatWageAmount(monthlyWage),
  };
}

export function formatWageAmount(value: number): string {
  const [intPart, decPart] = value.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${grouped},${decPart}`;
}

export function formatWorkUnitRate(value: number): string {
  const safe = Math.max(0, value);
  if (Number.isInteger(safe)) return String(safe);
  return safe
    .toFixed(2)
    .replace('.', ',')
    .replace(/,?0+$/, '')
    .replace(/,$/, '');
}

export function parseWorkUnitRate(value?: string): number {
  if (!value?.trim()) return 1;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
}

export function parseWageAmount(value?: string): number | null {
  if (!value?.trim()) return null;
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getEmployeeMonthlyWage(employee: StaffEmployee): number | null {
  if (employee.wageScale?.calculatedMonthly) {
    return parseWageAmount(employee.wageScale.calculatedMonthly);
  }
  if (employee.wageScale?.baseSalary) {
    const base = parseWageAmount(employee.wageScale.baseSalary);
    if (base === null) return null;
    return base * parseWorkUnitRate(employee.wageScale.workUnitRate);
  }
  return null;
}

export function getTeachingScalePreview(
  group: 'educator-20h' | 'teacher-18h',
  level: EducationLevel,
  organizationId?: string
): TeachingScaleRow {
  const effectiveGroup =
    organizationId === KINDERGARTEN_SCHOOL_ID ? 'educator-20h' : group;
  return effectiveGroup === 'educator-20h' ? EDUCATOR_20H[level] : TEACHER_18H[level];
}
