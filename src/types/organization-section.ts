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
  /** Меъёри воҳиди корӣ — тариқи дастӣ (масалан 1, 0,5, 0,75) */
  workUnitRate?: string;
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

/** Навъи иловапулӣ мувофиқи қонунгузории меҳнатии ҶТ */
export type AllowanceAdjustmentKind =
  | 'past_month_difference'
  | 'qualification_degree_difference';

/**
 * Ҳуҷҷати иловапулӣ (фарқияти моҳҳои гузашта ё дараҷаи тахассус).
 * КМҶ моддаҳои 161, 165; Қарори Ҳукумати ҶТ №113 (тарифи музди меҳнат).
 */
export interface SalaryAllowanceAdjustment {
  id: string;
  preparedAt: string;
  orderNumber: string;
  employeeId: string;
  department: string;
  position: string;
  kind: AllowanceAdjustmentKind;
  /** Санаи эътибори тариф/дараҷаи нав */
  effectiveDate: string;
  /** Моҳи пардохти иловапулӣ (YYYY-MM) */
  paymentMonth: string;
  /** Маоши вазифавии қаблӣ (сомонӣ) */
  fromDutySalary?: string;
  /** Маоши вазифавии нав (сомонӣ) */
  toDutySalary?: string;
  /** Дараҷаи таҳсилот/категорияи қаблӣ */
  fromEducationLevel?: EmployeeWageScale['educationLevel'];
  /** Дараҷаи таҳсилот/категорияи нав */
  toEducationLevel?: EmployeeWageScale['educationLevel'];
  /** Асоси ҳуқуқӣ */
  legalBasis: string;
  reason: string;
  notes?: string;
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

/** Ташкилоти харидор / мизоҷ барои шартномаҳо */
export interface ContractCounterparty {
  id: string;
  name: string;
  legalForm?: string;
  tin?: string;
  address?: string;
  director?: string;
  phone?: string;
  bankBik?: string;
  bankName?: string;
  correspondentAccount?: string;
  bankAccount?: string;
}

export type ServiceContractStatus = 'draft' | 'active' | 'completed' | 'terminated';

/** Шартномаи хизматрасмонӣ бо ташкилот */
export interface OrganizationServiceContract {
  id: string;
  contractNumber: string;
  preparedAt: string;
  signedAt?: string;
  validFrom: string;
  validTo?: string;
  counterpartyId: string;
  counterpartyName: string;
  subject: string;
  servicesDescription: string;
  amount: string;
  currency: 'TJS';
  vatApplicable: boolean;
  vatRate: number;
  paymentTerms: string;
  legalBasis: string;
  status: ServiceContractStatus;
}

export type ServiceInvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export interface ServiceInvoiceLineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  amount: string;
}

/** Ҳисобнома-фактура мувофиқи Кодекси андоз */
export interface OrganizationServiceInvoice {
  id: string;
  invoiceNumber: string;
  contractId: string;
  contractNumber: string;
  preparedAt: string;
  dueDate: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyTin?: string;
  counterpartyAddress?: string;
  lineItems: ServiceInvoiceLineItem[];
  subtotal: string;
  vatRate: number;
  vatAmount: string;
  total: string;
  paymentPurpose: string;
  legalBasis: string;
  status: ServiceInvoiceStatus;
}

/** Маълумот барои сарлавҳаи расмии ҳисоботҳои ташкилот */
export type OrganizationReportLocale = 'tj' | 'ru' | 'en' | 'uz';

export type OrganizationReportNames = Partial<Record<OrganizationReportLocale, string>>;

export interface OrganizationReportHeader {
  /** Номи ташкилот (TJ) — мувофиқи reportOrganizationNames.tj */
  reportOrganizationName?: string;
  /** Номи ташкилот барои ҳар забон — бе тарҷумаи автоматӣ */
  reportOrganizationNames?: OrganizationReportNames;
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
  salaryAllowanceAdjustments?: SalaryAllowanceAdjustment[];
  laborLeaves?: LaborLeave[];
  contractCounterparties?: ContractCounterparty[];
  serviceContracts?: OrganizationServiceContract[];
  serviceInvoices?: OrganizationServiceInvoice[];
  reportHeader?: OrganizationReportHeader;
  /** Танзимоти талаботи музди меҳнат ба раёсати молияи маҳал */
  localPayrollRequirementSettings?: LocalPayrollRequirementMonthSettings[];
}

export interface LocalPayrollRequirementMonthSettings {
  month: string;
  budgetArticle2121Amount?: string;
  decree469ByGroup?: Partial<
    Record<
      'admin_teachers' | 'technical' | 'leadership_specialists' | 'service_staff',
      string
    >
  >;
}

export type OrganizationSectionsMap = Record<string, OrganizationSectionContent>;
