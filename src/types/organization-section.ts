export interface SectionField {
  label: string;
  value: string;
}

export interface SectionTable {
  title: string;
  caption?: string;
  columns: string[];
  rows: string[][];
}

export interface SectionItem {
  title: string;
  detail?: string;
  description?: string;
  fields?: SectionField[];
  /** Пайванд ба манбаи расмӣ */
  url?: string;
  sourceSite?: string;
  documentType?: 'law' | 'decision' | 'document';
  officialNumber?: string;
  adoptedAt?: string;
  status?: string;
  /** Шакли ҳисобот (form-1, form-5, ...) мувофиқи дастур №204 */
  reportFormId?: string;
}

export interface EmployeeWageScale {
  group?:
    | 'management'
    | 'educator-20h'
    | 'teacher-18h'
    | 'library'
    | 'medical'
    | 'psychologist'
    | 'auxiliary';
  managementRole?: 'director' | 'deputy_education' | 'deputy_other';
  studentBracket?:
    | 'upTo100'
    | 'from101to280'
    | 'from281to400'
    | 'from401to880'
    | 'from881to1600'
    | 'from1601to2500'
    | 'over2500';
  educationLevel?:
    | 'general_secondary'
    | 'secondary_vocational'
    | 'secondary_vocational_c2'
    | 'secondary_vocational_c1'
    | 'higher'
    | 'higher_c2'
    | 'higher_c1'
    | 'higher_superior';
  libraryRole?:
    | 'head_higher'
    | 'head_vocational'
    | 'librarian_higher'
    | 'librarian_vocational'
    | 'student_org';
  medicalCategory?: 'none' | 'superior' | 'category_1' | 'category_2';
  auxiliaryRole?: 'standard' | 'accountant';
  extraDuties?: ('class_leadership' | 'notebook_check' | 'cabinet_management')[];
  baseSalary?: string;
  hourlyRate?: string;
  calculatedMonthly?: string;
}

/** Кори асосӣ ё кори иловагӣ (совместительство) — тартиботи ҳисоби андоз фарқ мекунад */
export type EmploymentWorkType = 'primary' | 'secondary';

export interface StaffEmployee {
  id: string;
  fullName: string;
  position: string;
  /** Кори асосӣ ё иловагӣ — барои ҳисоби андоз аз даромад */
  employmentWorkType?: EmploymentWorkType;
  department?: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  ris?: string;
  rma?: string;
  personnelNumber?: string;
  hiredAt?: string;
  education?: string;
  experience?: string;
  birthYear?: string;
  status?: string;
  wageScale?: EmployeeWageScale;
}

export interface VacancyNoticeInfo {
  intro?: string;
  requirements?: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt?: string;
}

export interface StaffTimesheetEntry {
  employeeId: string;
  days: Record<string, string>;
}

export interface StaffTimesheet {
  month: string;
  entries: StaffTimesheetEntry[];
}

export interface PayrollLedgerEntry {
  employeeId: string;
  baseSalary: string;
  allowances: string;
  laborLeavePay?: string;
  fhea: string;
  kik: string;
  hhdt: string;
  tax: string;
}

export interface PayrollLedger {
  month: string;
  entries: PayrollLedgerEntry[];
  preparedAt?: string;
}

export interface PositionHandover {
  id: string;
  preparedAt: string;
  effectiveDate: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  department: string;
  position: string;
  reason: string;
  duties: string;
  /** Меъёри % аз маоши вазифавии вогузоршуда барои иловапулиҳо */
  salaryHandoverPercent?: number;
}

export type LaborLeaveType =
  | 'annual'
  | 'unpaid'
  | 'sick'
  | 'maternity'
  | 'study'
  | 'creative'
  | 'other';

/** ПҚҶ №313 (01.06.2007): 12 моҳ ё аз охирин зиёд намудани музди вазифавӣ */
export type LaborLeaveCalculationBasis = 'twelve_months' | 'since_last_raise';

/** КМҶ моддаи 91: стандартӣ / зоиши душвор / фарзанди сегона ё зиёд */
export type MaternityVariant = 'standard' | 'complicated' | 'multiple';

/** ПҚҶ №313 қисми IV, п.14–15: музди вақтӣ ё премиалӣ */
export type SickLeaveWageBasis = 'time_rate' | 'premium';

/**
 * Қонуни ҶТ «Дар бораи суғуртаи иҷтимоӣ» моддаи 12, КМҶ моддаи 217.
 * Фоизи пособие: 60%, 70% ё 100%.
 */
export type SickLeaveBenefitCategory =
  | 'occupational_injury'
  | 'professional_disease'
  | 'war_participant'
  | 'experience_8_plus'
  | 'experience_under_8'
  | 'dependents_3_plus'
  | 'orphan_under_23'
  | 'manual';

export interface LaborLeave {
  id: string;
  preparedAt: string;
  orderNumber: string;
  employeeId: string;
  department: string;
  position: string;
  leaveType: LaborLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  substituteEmployeeId?: string;
  /** Шумораи моҳҳои тақвимӣ барои ҳисоби миёна (пешфарз 12 — ПҚҶ №313) */
  salaryPeriodMonths?: number;
  /** Асоси ҳисоби миёнаи маош */
  calculationBasis?: LaborLeaveCalculationBasis;
  /** Санаи охирин зиёд намудани музди вазифавӣ (барои since_last_raise) */
  lastSalaryRaiseDate?: string;
  /** Санаи чашмидашудаи таваллуд (рухсатии ҳомиладорӣ) */
  expectedBirthDate?: string;
  /** Навъи зоиш — барои муқаррар кардани муддати баъд аз таваллуд */
  maternityVariant?: MaternityVariant;
  /** Рақами листи нетрудоспособности / ҳуҷҷати суғурта */
  certificateNumber?: string;
  /** ПҚҶ №313 п.14 (музди вақтӣ) ё п.15 (премиалӣ) */
  sickWageBasis?: SickLeaveWageBasis;
  /** Категорияи фоизи пособие — Қонуни суғурта моддаи 12 */
  sickBenefitCategory?: SickLeaveBenefitCategory;
  /** Фоизи дастӣ (60–100), агар sickBenefitCategory = manual */
  sickBenefitPercent?: number;
  /** Сил — то 12 моҳ (КМҶ моддаи 217) */
  sickIsTuberculosis?: boolean;
}

/** Маълумот барои сарлавҳаи расмии ҳисоботҳои ташкилот */
export interface OrganizationReportHeader {
  /** Номи ташкилот дар титули ҳисобот (агар холӣ — номи асосии ташкилот) */
  reportOrganizationName?: string;
  /** Сатрҳои мақомоти болоии ташкилот */
  superiorAuthorities?: string[];
}

export interface OrganizationSectionContent {
  summary: string;
  tables?: SectionTable[];
  items?: SectionItem[];
  employees?: StaffEmployee[];
  vacancyNotice?: VacancyNoticeInfo;
  timesheets?: StaffTimesheet[];
  payrollLedgers?: PayrollLedger[];
  positionHandovers?: PositionHandover[];
  laborLeaves?: LaborLeave[];
  reportHeader?: OrganizationReportHeader;
}

export type OrganizationSectionsMap = Record<string, OrganizationSectionContent>;
