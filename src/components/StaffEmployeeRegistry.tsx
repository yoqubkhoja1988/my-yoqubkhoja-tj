'use client';

import { analyzeStaffing } from '@/lib/staff-analytics';
import {
  downloadCsv,
  downloadEmployeesExcel,
  employeeExportFilename,
  exportEmployeesToCsv,
  ExportColumn,
} from '@/lib/staff-export';
import {
  assignMissingPersonnelNumbers,
  generateNextPersonnelNumber,
  hasMissingPersonnelNumbers,
} from '@/lib/staff-personnel-number';
import {
  inferSchoolingFromWageEducationLevel,
  schoolingMessageKey,
} from '@/lib/staff-schooling';
import {
  buildEmployeeImportColumns,
  isEmployeeImportFile,
  mergeImportedEmployees,
  parseEmployeesCsv,
  parseEmployeesExcel,
} from '@/lib/staff-import';
import { updateOrganizationSection } from '@/lib/organization-sections';
import {
  calculateWageScale,
  EDUCATION_LEVELS,
  emptyWageScale,
  formatWageAmount,
  formatWorkUnitRate,
  formatWageScaleQualificationLabel,
  hydrateWageScale,
  MedicalCategory,
  parseWageAmount,
  parseWorkUnitRate,
  resolveEmployeeQualificationLabel,
  type EducationLevel,
} from '@/lib/preschool-wage-scales';
import {
  extractStaffingOptions,
  getPositionsForDepartment,
} from '@/lib/staff-staffing-options';
import StaffEducationFields from '@/components/StaffEducationFields';
import PreschoolWageScaleFields from '@/components/PreschoolWageScaleFields';
import StaffProfessionalDevelopmentFields, {
  formatProfessionalCycleSummary,
} from '@/components/StaffProfessionalDevelopmentFields';
import { useOrganizationAccess } from '@/contexts/organization-access-context';
import { formatAppDate } from '@/lib/intl-locale';
import { calcIncomeTax } from '@/lib/finance-payroll-ledger';
import {
  emptyProfessionalDevelopment,
  normalizeProfessionalDevelopment,
  usesEducationProfessionalDevelopment,
} from '@/lib/staff-professional-development';
import {
  EmployeeWageScale,
  EmploymentWorkType,
  EmployeeProfessionalDevelopment,
  EmployeeSchoolingLevel,
  OrganizationSectionContent,
  StaffEmployee,
} from '@/types/organization-section';
import { useLocale, useTranslations } from 'next-intl';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type EmployeeForm = {
  fullName: string;
  position: string;
  employmentWorkType: EmploymentWorkType;
  department: string;
  phone: string;
  email: string;
  bankAccount: string;
  ris: string;
  rma: string;
  personnelNumber: string;
  hiredAt: string;
  schooling?: EmployeeSchoolingLevel;
  education: string;
  experience: string;
  birthYear: string;
  status: string;
  wageScale: EmployeeWageScale;
  professionalDevelopment: EmployeeProfessionalDevelopment;
};

const emptyForm: EmployeeForm = {
  fullName: '',
  position: '',
  employmentWorkType: 'primary',
  department: '',
  phone: '',
  email: '',
  bankAccount: '',
  ris: '',
  rma: '',
  personnelNumber: '',
  hiredAt: '',
  education: '',
  experience: '',
  birthYear: '',
  status: 'active',
  wageScale: emptyWageScale(),
  professionalDevelopment: emptyProfessionalDevelopment(),
};

type Props = {
  organizationId: string;
  content: OrganizationSectionContent;
  onUpdate: (content: OrganizationSectionContent) => void;
};

function toForm(employee: StaffEmployee): EmployeeForm {
  return {
    fullName: employee.fullName,
    position: employee.position,
    employmentWorkType: employee.employmentWorkType ?? 'primary',
    department: employee.department || '',
    phone: employee.phone || '',
    email: employee.email || '',
    bankAccount: employee.bankAccount || '',
    ris: employee.ris || '',
    rma: employee.rma || '',
    personnelNumber: employee.personnelNumber || '',
    hiredAt: employee.hiredAt || '',
    schooling: employee.schooling,
    education: employee.education || '',
    experience: employee.experience || '',
    birthYear: employee.birthYear || '',
    status: employee.status || 'active',
    wageScale: employee.wageScale ?? emptyWageScale(),
    professionalDevelopment: employee.professionalDevelopment ?? emptyProfessionalDevelopment(),
  };
}

function toEmployee(form: EmployeeForm, organizationId: string, id?: string): StaffEmployee {
  const employee: StaffEmployee = {
    id: id || crypto.randomUUID(),
    fullName: form.fullName.trim(),
    position: form.position.trim(),
    employmentWorkType: form.employmentWorkType,
    status: form.status,
  };

  const optional: (keyof Omit<
    EmployeeForm,
    | 'fullName'
    | 'position'
    | 'status'
    | 'wageScale'
    | 'employmentWorkType'
    | 'professionalDevelopment'
    | 'schooling'
  >)[] = [
    'department',
    'phone',
    'email',
    'bankAccount',
    'ris',
    'rma',
    'personnelNumber',
    'hiredAt',
    'education',
    'experience',
    'birthYear',
  ];

  for (const key of optional) {
    const value = form[key].trim();
    if (value) employee[key] = value;
  }

  if (form.schooling) {
    employee.schooling = form.schooling;
  }

  if (form.wageScale?.group) {
    employee.wageScale = calculateWageScale(form.wageScale, organizationId);
  }

  const professionalDevelopment = normalizeProfessionalDevelopment(form.professionalDevelopment);
  if (professionalDevelopment) {
    employee.professionalDevelopment = professionalDevelopment;
  }

  return employee;
}

export default function StaffEmployeeRegistry({
  organizationId,
  content,
  onUpdate,
}: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const { canEdit } = useOrganizationAccess();
  const showWageScales = true;
  const showProfessionalDevelopment = usesEducationProfessionalDevelopment(organizationId);
  const employees = content.employees ?? [];
  const analytics = useMemo(() => analyzeStaffing(content), [content]);
  const departments = useMemo(
    () => extractStaffingOptions(content.tables),
    [content.tables]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState<StaffEmployee | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const backfillStarted = useRef(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesDepartment =
        filterDepartment === 'all' || employee.department === filterDepartment;
      const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
      const matchesSearch =
        !query ||
        employee.fullName.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query) ||
        (employee.department?.toLowerCase().includes(query) ?? false) ||
        (employee.phone?.includes(query) ?? false) ||
        (employee.personnelNumber?.includes(query) ?? false) ||
        (employee.bankAccount?.includes(query) ?? false) ||
        (employee.ris?.includes(query) ?? false) ||
        (employee.rma?.includes(query) ?? false);

      return matchesDepartment && matchesStatus && matchesSearch;
    });
  }, [employees, search, filterDepartment, filterStatus]);

  const positionOptions = useMemo(() => {
    const fromStaffing = getPositionsForDepartment(departments, form.department);
    if (form.position && !fromStaffing.includes(form.position)) {
      return [...fromStaffing, form.position];
    }
    return fromStaffing;
  }, [departments, form.department, form.position]);

  const estimatedTaxPreview = useMemo(() => {
    const gross = parseWageAmount(form.wageScale?.calculatedMonthly ?? '');
    if (!gross || gross <= 0) return null;
    return calcIncomeTax(gross, undefined, undefined, form.employmentWorkType);
  }, [form.employmentWorkType, form.wageScale?.calculatedMonthly]);

  const capacityWarning = useMemo(() => {
    if (!form.department || !form.position || editingId) return null;
    const slot = analytics.slots.find(
      (item) => item.department === form.department && item.position === form.position
    );
    if (!slot) return null;
    if (slot.filled >= slot.quota) return t('staffPositionFull');
    return null;
  }, [analytics.slots, form.department, form.position, editingId, t]);

  const qualificationLabels = useMemo(
    () => ({
      education: (level: EducationLevel) => t(`wageScaleEducation_${level}`),
      medical: (category: MedicalCategory) => t(`wageScaleMedical_${category}`),
    }),
    [t]
  );

  const importColumns = useMemo(
    () =>
      buildEmployeeImportColumns(t, {
        includeProfessionalDevelopment: showProfessionalDevelopment,
      }),
    [t, showProfessionalDevelopment]
  );

  const importLabelPack = useMemo(
    () => ({
      employmentWorkType: {
        primary: t('employmentWorkTypePrimary'),
        secondary: t('employmentWorkTypeSecondary'),
      },
      status: {
        active: t('employeeStatusActive'),
        vacation: t('employeeStatusVacation'),
        inactive: t('employeeStatusInactive'),
      },
    }),
    [t]
  );

  const educationLabels = useMemo(() => {
    const labels = {} as Record<EducationLevel, string>;
    for (const level of EDUCATION_LEVELS) {
      labels[level] = t(`wageScaleEducation_${level}`);
    }
    return labels;
  }, [t]);

  function wageScaleEducationLabel(scale: EmployeeWageScale): string {
    return formatWageScaleQualificationLabel(scale, qualificationLabels);
  }

  function employeeQualificationLabel(employee: StaffEmployee): string {
    return resolveEmployeeQualificationLabel(
      employee,
      organizationId,
      qualificationLabels,
      showWageScales
    );
  }

  function employeeSchoolingLabel(schooling?: EmployeeSchoolingLevel): string {
    if (!schooling) return '';
    return t(schoolingMessageKey(schooling));
  }

  function handlePositionChange(position: string) {
    setForm((current) => {
      if (!showWageScales) {
        return { ...current, position };
      }

      const wageScale = hydrateWageScale(
        {
          educationLevel: current.wageScale?.educationLevel,
          extraDuties: current.wageScale?.extraDuties ?? [],
          workUnitRate: current.wageScale?.workUnitRate,
        },
        organizationId,
        position
      );
      const education = wageScaleEducationLabel(wageScale);

      return {
        ...current,
        position,
        wageScale,
        education,
      };
    });
  }

  function handleWageScaleChange(wageScale: EmployeeWageScale) {
    const next = calculateWageScale(wageScale, organizationId);
    const education = wageScaleEducationLabel(next);
    setForm((current) => ({
      ...current,
      wageScale: next,
      education,
    }));
  }

  function openModal(id?: string) {
    if (id) {
      const employee = employees.find((item) => item.id === id);
      if (!employee) return;
      const wageScale = showWageScales
        ? hydrateWageScale(employee.wageScale, organizationId, employee.position)
        : employee.wageScale;
      const education = showWageScales
        ? wageScaleEducationLabel(wageScale!)
        : employee.education || '';
      const schooling =
        employee.schooling ??
        inferSchoolingFromWageEducationLevel(wageScale?.educationLevel);
      setEditingId(id);
      setForm({
        ...toForm(employee),
        wageScale: wageScale ?? emptyWageScale(organizationId),
        education,
        schooling,
      });
    } else {
      setEditingId(null);
      const wageScale = emptyWageScale(organizationId);
      setForm({
        ...emptyForm,
        personnelNumber: generateNextPersonnelNumber(employees),
        wageScale,
        education: showWageScales ? wageScaleEducationLabel(wageScale) : '',
      });
    }
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function persistEmployees(nextEmployees: StaffEmployee[]) {
    setSaving(true);
    setError('');

    const payload: OrganizationSectionContent = {
      ...content,
      employees: nextEmployees,
    };

    const saved = await updateOrganizationSection(organizationId, 'staff', payload);
    setSaving(false);

    if (!saved) {
      setError(t('sectionSaveError'));
      return false;
    }

    onUpdate(saved);
    return true;
  }

  useEffect(() => {
    if (backfillStarted.current || !hasMissingPersonnelNumbers(employees)) return;
    void (async () => {
      const saved = await persistEmployees(assignMissingPersonnelNumbers(employees));
      if (saved) backfillStarted.current = true;
    })();
  }, [employees]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.department.trim() || !form.position.trim()) return;

    const personnelNumber = editingId
      ? form.personnelNumber.trim()
      : form.personnelNumber.trim() || generateNextPersonnelNumber(employees);

    const educationLabel = showWageScales
      ? wageScaleEducationLabel(
          hydrateWageScale(form.wageScale, organizationId, form.position)
        )
      : form.education.trim();

    const employee = toEmployee(
      { ...form, personnelNumber, education: educationLabel },
      organizationId,
      editingId ?? undefined
    );
    if (showWageScales && !educationLabel) {
      delete employee.education;
    }
    if (form.schooling) {
      employee.schooling = form.schooling;
    } else if (editingId) {
      delete employee.schooling;
    }
    const nextEmployees = editingId
      ? employees.map((item) => (item.id === editingId ? employee : item))
      : [...employees, employee];

    const ok = await persistEmployees(nextEmployees);
    if (ok) closeModal();
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDeleteEmployee'))) return;
    await persistEmployees(employees.filter((item) => item.id !== id));
  }

  function buildEmployeeExportPayload() {
    const rows = filteredEmployees.map((employee, index) => ({
      index: String(index + 1),
      fullName: employee.fullName,
      position: employee.position,
      employmentWorkType: employmentWorkTypeLabel(employee.employmentWorkType),
      department: employee.department ?? '',
      personnelNumber: employee.personnelNumber ?? '',
      ris: employee.ris ?? '',
      rma: employee.rma ?? '',
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      bankAccount: employee.bankAccount ?? '',
      hiredAt: employee.hiredAt ?? '',
      schooling: employeeSchoolingLabel(employee.schooling),
      qualification: employeeQualificationLabel(employee),
      experience: employee.experience ?? '',
      birthYear: employee.birthYear ?? '',
      specializationCycle: showProfessionalDevelopment
        ? cycleSummary(employee, 'specialization')
        : '',
      qualificationUpgradeCycle: showProfessionalDevelopment
        ? cycleSummary(employee, 'qualification_upgrade')
        : '',
      status: statusLabel(employee.status),
    }));

    const columns: ExportColumn<(typeof rows)[number]>[] = [
      { key: 'index', label: t('staffColNo') },
      { key: 'fullName', label: t('employeeFullName') },
      { key: 'position', label: t('employeePosition') },
      { key: 'employmentWorkType', label: t('employeeEmploymentWorkType') },
      { key: 'department', label: t('employeeDepartment') },
      { key: 'personnelNumber', label: t('employeePersonnelNumber') },
      { key: 'ris', label: t('employeeRis') },
      { key: 'rma', label: t('organizationRma') },
      { key: 'phone', label: t('employeePhone') },
      { key: 'email', label: t('employeeEmail') },
      { key: 'bankAccount', label: t('employeeBankAccount') },
      { key: 'hiredAt', label: t('employeeHiredAt') },
      { key: 'schooling', label: t('employeeSchooling') },
      { key: 'qualification', label: t('employeeQualification') },
      { key: 'experience', label: t('employeeExperience') },
      { key: 'birthYear', label: t('employeeBirthYear') },
      ...(showProfessionalDevelopment
        ? [
            { key: 'specializationCycle' as const, label: t('employeeCyclePeriodSpecialization') },
            {
              key: 'qualificationUpgradeCycle' as const,
              label: t('employeeCyclePeriodQualificationUpgrade'),
            },
          ]
        : []),
      { key: 'status', label: t('employeeStatus') },
    ];

    return { rows, columns };
  }

  function handleExportCsv() {
    const { rows, columns } = buildEmployeeExportPayload();
    const csv = exportEmployeesToCsv(rows, columns);
    downloadCsv(employeeExportFilename('csv'), csv);
  }

  async function handleExportExcel() {
    const { rows, columns } = buildEmployeeExportPayload();
    await downloadEmployeesExcel(rows, columns, employeeExportFilename('xlsx'), t('employeeRegistryTitle'));
  }

  async function handleImportFile(file: File) {
    if (!isEmployeeImportFile(file)) {
      setError(t('employeeImportInvalidFile'));
      return;
    }

    setImporting(true);
    setError('');

    try {
      const lowerName = file.name.toLowerCase();
      const parsed =
        lowerName.endsWith('.csv')
          ? parseEmployeesCsv(await file.text(), importColumns, importLabelPack)
          : await parseEmployeesExcel(await file.arrayBuffer(), importColumns, importLabelPack);

      if (parsed.rows.length === 0) {
        setError(t('employeeImportNoRows'));
        return;
      }

      const mergeResult = mergeImportedEmployees(
        employees,
        parsed.rows,
        organizationId,
        qualificationLabels,
        educationLabels
      );

      const confirmMessage = t('employeeImportConfirm', {
        count: parsed.rows.length,
        added: mergeResult.added,
        updated: mergeResult.updated,
      });
      if (!confirm(confirmMessage)) return;

      const ok = await persistEmployees(mergeResult.employees);
      if (!ok) return;

      const issueMessages = [
        ...parsed.errors.map((issue) =>
          t('employeeImportRowError', {
            row: issue.row,
            message: t(`employeeImportError_${issue.message}`),
          })
        ),
        ...mergeResult.errors.map((issue) =>
          t('employeeImportRowError', {
            row: issue.row,
            message: t(`employeeImportError_${issue.message}`),
          })
        ),
      ];

      window.alert(
        issueMessages.length > 0
          ? `${t('employeeImportSuccess', {
              added: mergeResult.added,
              updated: mergeResult.updated,
            })}\n\n${issueMessages.join('\n')}`
          : t('employeeImportSuccess', {
              added: mergeResult.added,
              updated: mergeResult.updated,
            })
      );
    } catch {
      setError(t('employeeImportInvalidFile'));
    } finally {
      setImporting(false);
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    }
  }

  function handleImportInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void handleImportFile(file);
  }

  function employmentWorkTypeLabel(workType?: EmploymentWorkType) {
    return workType === 'secondary'
      ? t('employmentWorkTypeSecondary')
      : t('employmentWorkTypePrimary');
  }

  function statusLabel(status?: string) {
    if (status === 'vacation') return t('employeeStatusVacation');
    if (status === 'inactive') return t('employeeStatusInactive');
    return t('employeeStatusActive');
  }

  function employeeDutySalary(employee: StaffEmployee): string {
    return employee.wageScale?.baseSalary || '—';
  }

  function employeeWorkUnitRate(employee: StaffEmployee): string {
    return employee.wageScale?.workUnitRate?.trim() || '1';
  }

  function employeeMonthlySalary(employee: StaffEmployee): string {
    if (employee.wageScale?.calculatedMonthly) return employee.wageScale.calculatedMonthly;
    const base = parseWageAmount(employee.wageScale?.baseSalary);
    if (base === null) return '—';
    const rate = parseWorkUnitRate(employee.wageScale?.workUnitRate);
    return formatWageAmount(base * rate);
  }

  function formatCycleDate(iso: string): string {
    return formatAppDate(iso, locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function cycleSummary(
    employee: StaffEmployee,
    kind: 'specialization' | 'qualification_upgrade'
  ): string {
    return formatProfessionalCycleSummary(employee.professionalDevelopment, kind, formatCycleDate, {
      missing: t('employeeCycleStatus_missing'),
      validUntil: (date) => t('employeeCycleValidUntil', { date }),
      dueSoon: (date) => t('employeeCycleDueSoon', { date }),
      overdue: (date) => t('employeeCycleOverdue', { date }),
    });
  }

  function handleDepartmentChange(department: string) {
    const positions = getPositionsForDepartment(departments, department);
    const position = positions.includes(form.position) ? form.position : (positions[0] ?? '');

    if (!showWageScales || !position) {
      setForm({ ...form, department, position });
      return;
    }

    const wageScale = hydrateWageScale(
      {
        educationLevel: form.wageScale?.educationLevel,
        extraDuties: form.wageScale?.extraDuties ?? [],
        workUnitRate: form.wageScale?.workUnitRate,
      },
      organizationId,
      position
    );
    const education = wageScaleEducationLabel(wageScale);

    setForm({
      ...form,
      department,
      position,
      wageScale,
      education,
    });
  }

  return (
    <section id="staff-registry" className="mt-8 border-t border-[var(--border)] pt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="page-eyebrow">{t('employeeRegistry')}</p>
          <h4 className="text-base font-bold">{t('employeeRegistryTitle')}</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{t('employeeRegistrySubtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleImportInputChange}
              />
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                disabled={saving || importing}
                className="btn-secondary"
              >
                {importing ? '...' : t('importEmployees')}
              </button>
            </>
          )}
          <details className="relative">
            <summary
              className={`btn-secondary list-none cursor-pointer [&::-webkit-details-marker]:hidden ${
                filteredEmployees.length === 0 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {t('exportEmployees')} ▾
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1 shadow-lg">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredEmployees.length === 0}
                className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
              >
                {t('exportEmployeesCsv')}
              </button>
              <button
                type="button"
                onClick={() => void handleExportExcel()}
                disabled={filteredEmployees.length === 0}
                className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-[var(--bg-input)]"
              >
                {t('exportEmployeesExcel')}
              </button>
            </div>
          </details>
          {canEdit && (
            <button type="button" onClick={() => openModal()} className="btn-primary" disabled={saving}>
              + {t('addEmployee')}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('employeeSearchPlaceholder')}
          className="input-field lg:max-w-xs"
        />
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="input-field lg:max-w-xs"
        >
          <option value="all">{t('filterAllDepartments')}</option>
          {departments.map((item) => (
            <option key={item.label} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field lg:max-w-[10rem]"
        >
          <option value="all">{t('filterAllStatuses')}</option>
          <option value="active">{t('employeeStatusActive')}</option>
          <option value="vacation">{t('employeeStatusVacation')}</option>
          <option value="inactive">{t('employeeStatusInactive')}</option>
        </select>
      </div>

      {error && !modalOpen && (
        <p className="mb-3 rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {employees.length === 0 ? (
        <div className="empty-state py-8">
          <div className="empty-state-icon">👤</div>
          <p className="text-sm text-[var(--text-muted)]">{t('noEmployees')}</p>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="empty-state py-8">
          <div className="empty-state-icon">🔍</div>
          <p className="text-sm text-[var(--text-muted)]">{t('employeeNoResults')}</p>
        </div>
      ) : (
        <div className="table-wrapper table-scroll-sm">
          <table>
            <caption>
              {t('employeeRegistryTitle')} ({filteredEmployees.length})
            </caption>
            <thead>
              <tr>
                <th>{t('staffColNo')}</th>
                <th>{t('employeeFullName')}</th>
                <th>{t('employeePosition')}</th>
                <th>{t('employeeEmploymentWorkType')}</th>
                <th>{t('wageScaleWorkUnitRate')}</th>
                <th>{t('wageScaleDutySalary')}</th>
                <th>{t('wageScaleCalculatedMonthly')}</th>
                <th>{t('employeeDepartment')}</th>
                <th>{t('employeePersonnelNumber')}</th>
                <th>{t('employeeRis')}</th>
                <th>{t('organizationRma')}</th>
                <th>{t('employeePhone')}</th>
                <th>{t('employeeEmail')}</th>
                <th>{t('employeeBankAccount')}</th>
                <th>{t('employeeHiredAt')}</th>
                <th>{t('employeeSchooling')}</th>
                <th>{t('employeeQualification')}</th>
                <th>{t('employeeExperience')}</th>
                <th>{t('employeeBirthYear')}</th>
                {showProfessionalDevelopment && (
                  <>
                    <th>{t('employeeCyclePeriodSpecialization')}</th>
                    <th>{t('employeeCyclePeriodQualificationUpgrade')}</th>
                  </>
                )}
                <th>{t('employeeStatus')}</th>
                {canEdit && <th>{t('employeeActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee, index) => (
                <tr key={employee.id}>
                  <td>{index + 1}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setViewEmployee(employee)}
                      className="font-semibold text-left hover:text-[var(--accent)]"
                    >
                      {employee.fullName}
                    </button>
                  </td>
                  <td className="text-[var(--accent)]">{employee.position}</td>
                  <td className="text-xs">
                    {employmentWorkTypeLabel(employee.employmentWorkType)}
                  </td>
                  <td className="font-mono text-xs">{employeeWorkUnitRate(employee)}</td>
                  <td className="font-mono text-xs">
                    {employeeDutySalary(employee) === '—'
                      ? '—'
                      : `${employeeDutySalary(employee)} ${t('wageScaleSomoni')}`}
                  </td>
                  <td className="font-mono text-xs font-semibold text-[var(--accent)]">
                    {employeeMonthlySalary(employee) === '—'
                      ? '—'
                      : `${employeeMonthlySalary(employee)} ${t('wageScaleSomoni')}`}
                  </td>
                  <td>{employee.department || '—'}</td>
                  <td>{employee.personnelNumber || '—'}</td>
                  <td className="font-mono text-xs">{employee.ris || '—'}</td>
                  <td className="font-mono text-xs">{employee.rma || '—'}</td>
                  <td className="md:whitespace-nowrap">{employee.phone || '—'}</td>
                  <td>{employee.email || '—'}</td>
                  <td className="md:whitespace-nowrap font-mono text-xs">{employee.bankAccount || '—'}</td>
                  <td className="md:whitespace-nowrap">{employee.hiredAt || '—'}</td>
                  <td>{employeeSchoolingLabel(employee.schooling) || '—'}</td>
                  <td>{employeeQualificationLabel(employee) || '—'}</td>
                  <td>{employee.experience || '—'}</td>
                  <td>{employee.birthYear || '—'}</td>
                  {showProfessionalDevelopment && (
                    <>
                      <td className="min-w-[8rem] text-[10px]">
                        {cycleSummary(employee, 'specialization')}
                      </td>
                      <td className="min-w-[8rem] text-[10px]">
                        {cycleSummary(employee, 'qualification_upgrade')}
                      </td>
                    </>
                  )}
                  <td>
                    <span className="inline-block rounded-full bg-[var(--bg-input)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {statusLabel(employee.status)}
                    </span>
                  </td>
                  {canEdit && (
                  <td>
                    <div className="flex flex-nowrap gap-1">
                      <button
                        type="button"
                        onClick={() => openModal(employee.id)}
                        className="btn-secondary px-2 py-1 text-[10px]"
                        disabled={saving}
                      >
                        {t('editEmployee')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee.id)}
                        className="btn-danger px-2 py-0.5 text-[10px]"
                        disabled={saving}
                      >
                        {t('deleteEmployee')}
                      </button>
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewEmployee && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setViewEmployee(null)}
        >
          <div className="modal-panel max-w-md">
            <h3 className="mb-4 text-lg font-bold">{viewEmployee.fullName}</h3>
            <dl className="space-y-3 text-sm">
              {[
                [t('employeePosition'), viewEmployee.position],
                [
                  t('employeeEmploymentWorkType'),
                  employmentWorkTypeLabel(viewEmployee.employmentWorkType),
                ],
                [t('employeeDepartment'), viewEmployee.department],
                [t('employeePersonnelNumber'), viewEmployee.personnelNumber],
                [t('employeeRis'), viewEmployee.ris],
                [t('organizationRma'), viewEmployee.rma],
                [t('employeePhone'), viewEmployee.phone],
                [t('employeeEmail'), viewEmployee.email],
                [t('employeeBankAccount'), viewEmployee.bankAccount],
                [t('employeeHiredAt'), viewEmployee.hiredAt],
                [t('employeeSchooling'), employeeSchoolingLabel(viewEmployee.schooling)],
                [t('employeeQualification'), employeeQualificationLabel(viewEmployee)],
                [t('employeeExperience'), viewEmployee.experience],
                [t('employeeBirthYear'), viewEmployee.birthYear],
                [t('employeeStatus'), statusLabel(viewEmployee.status)],
                ...(viewEmployee.wageScale?.baseSalary
                  ? [[t('wageScaleDutySalary'), `${viewEmployee.wageScale.baseSalary} ${t('wageScaleSomoni')}`]]
                  : []),
                ...(viewEmployee.wageScale?.workUnitRate
                  ? [[t('wageScaleWorkUnitRate'), viewEmployee.wageScale.workUnitRate]]
                  : []),
                ...(viewEmployee.wageScale?.calculatedMonthly
                  ? [[t('wageScaleCalculatedMonthly'), `${viewEmployee.wageScale.calculatedMonthly} ${t('wageScaleSomoni')}`]]
                  : []),
                ...(viewEmployee.wageScale?.group
                  ? [[t('wageScaleGroup'), t(`wageScaleGroup_${viewEmployee.wageScale.group}`)]]
                  : []),
                ...(showProfessionalDevelopment
                  ? [
                      [t('employeeCyclePeriodSpecialization'), cycleSummary(viewEmployee, 'specialization')],
                      [
                        t('employeeCyclePeriodQualificationUpgrade'),
                        cycleSummary(viewEmployee, 'qualification_upgrade'),
                      ],
                      ...(viewEmployee.professionalDevelopment?.specializationCycle?.lastCompletedAt
                        ? [
                            [
                              t('employeeCycleLastCompletedSpecialization'),
                              formatCycleDate(
                                viewEmployee.professionalDevelopment.specializationCycle.lastCompletedAt
                              ),
                            ],
                          ]
                        : []),
                      ...(viewEmployee.professionalDevelopment?.qualificationUpgradeCycle
                        ?.lastCompletedAt
                        ? [
                            [
                              t('employeeCycleLastCompletedQualificationUpgrade'),
                              formatCycleDate(
                                viewEmployee.professionalDevelopment.qualificationUpgradeCycle
                                  .lastCompletedAt
                              ),
                            ],
                          ]
                        : []),
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-[var(--text-muted)]">{label}</dt>
                  <dd className="font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setViewEmployee(null)} className="btn-secondary">
                {t('cancel')}
              </button>
              {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setViewEmployee(null);
                  openModal(viewEmployee.id);
                }}
                className="btn-primary"
              >
                {t('editEmployee')}
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !saving && closeModal()}
        >
          <div className="modal-panel max-h-[90vh] max-w-2xl overflow-y-auto">
            <h3 className="mb-4 text-lg font-bold">
              {editingId ? t('editEmployee') : t('addEmployee')}
            </h3>

            {error && (
              <p className="mb-3 rounded-lg border border-[var(--danger)]/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            {capacityWarning && (
              <p className="mb-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                {capacityWarning}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="field-label">{t('employeeFullName')}</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeeDepartment')}</label>
                  <select
                    value={form.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">{t('selectDepartment')}</option>
                    {departments.map((item) => (
                      <option key={item.label} value={item.label}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">{t('employeePosition')}</label>
                  <select
                    value={form.position}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    required
                    disabled={!form.department}
                    className="input-field disabled:opacity-60"
                  >
                    <option value="">{t('selectPosition')}</option>
                    {positionOptions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {departments.length === 0 && (
                <p className="text-xs text-[var(--warning)]">{t('noStaffingForSelect')}</p>
              )}

              {showWageScales && form.position && (
                <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-3">
                  <label className="field-label">{t('wageScaleWorkUnitRate')}</label>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.wageScale.workUnitRate ?? '1'}
                      onChange={(e) =>
                        handleWageScaleChange({
                          ...form.wageScale,
                          workUnitRate: e.target.value.replace(/[^\d,.\s]/g, ''),
                        })
                      }
                      onBlur={() =>
                        handleWageScaleChange({
                          ...form.wageScale,
                          workUnitRate: formatWorkUnitRate(
                            parseWorkUnitRate(form.wageScale.workUnitRate)
                          ),
                        })
                      }
                      placeholder={t('wageScaleWorkUnitRatePlaceholder')}
                      className="input-field max-w-[8rem] font-mono"
                    />
                    {form.wageScale.baseSalary && form.wageScale.calculatedMonthly && (
                      <p className="text-sm font-semibold text-[var(--accent)]">
                        {t('wageScaleCalculatedMonthly')}: {form.wageScale.calculatedMonthly}{' '}
                        {t('wageScaleSomoni')}
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    {t('wageScaleWorkUnitRateHint')}
                  </p>
                  {form.wageScale.baseSalary && form.wageScale.calculatedMonthly && (
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      {t('wageScaleMonthlyFormula', {
                        dutySalary: form.wageScale.baseSalary,
                        workUnitRate: form.wageScale.workUnitRate?.trim() || '1',
                        monthly: form.wageScale.calculatedMonthly,
                      })}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="field-label">{t('employeeEmploymentWorkType')}</label>
                <select
                  value={form.employmentWorkType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      employmentWorkType: e.target.value as EmploymentWorkType,
                    })
                  }
                  className="input-field"
                >
                  <option value="primary">{t('employmentWorkTypePrimary')}</option>
                  <option value="secondary">{t('employmentWorkTypeSecondary')}</option>
                </select>
                {estimatedTaxPreview !== null && (
                  <p className="mt-1 text-[10px] text-[var(--accent)]">
                    {t('employmentWorkTypeTaxPreview', {
                      amount: estimatedTaxPreview.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                    })}
                  </p>
                )}
              </div>

              {showWageScales && (
                <PreschoolWageScaleFields
                  organizationId={organizationId}
                  value={form.wageScale}
                  onChange={handleWageScaleChange}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeePersonnelNumber')}</label>
                  <input
                    value={form.personnelNumber}
                    onChange={(e) => setForm({ ...form, personnelNumber: e.target.value })}
                    readOnly={!editingId}
                    className={`input-field ${!editingId ? 'cursor-default bg-[var(--bg-input)]/60' : ''}`}
                  />
                  {!editingId && (
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {t('employeePersonnelNumberAuto')}
                    </p>
                  )}
                </div>
                <div>
                  <label className="field-label">{t('organizationRma')}</label>
                  <input
                    value={form.rma}
                    onChange={(e) =>
                      setForm({ ...form, rma: e.target.value.replace(/\D/g, '').slice(0, 9) })
                    }
                    inputMode="numeric"
                    maxLength={9}
                    placeholder={t('organizationRmaPlaceholder')}
                    className="input-field font-mono"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeeRis')}</label>
                  <input
                    value={form.ris}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ris: e.target.value.replace(/[^0-9A-Za-z\u0400-\u04FF]/g, '').slice(0, 20),
                      })
                    }
                    maxLength={20}
                    placeholder={t('employeeRisPlaceholder')}
                    className="input-field font-mono"
                  />
                </div>
                <div>
                  <label className="field-label">{t('employeePhone')}</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+992 ..."
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeeEmail')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">{t('employeeBankAccount')}</label>
                  <input
                    value={form.bankAccount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bankAccount: e.target.value.replace(/\D/g, '').slice(0, 20),
                      })
                    }
                    inputMode="numeric"
                    maxLength={20}
                    placeholder={t('employeeBankAccountPlaceholder')}
                    className="input-field font-mono"
                  />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="field-label">{t('employeeHiredAt')}</label>
                  <input
                    type="date"
                    value={form.hiredAt}
                    onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="field-label">{t('employeeBirthYear')}</label>
                  <input
                    value={form.birthYear}
                    onChange={(e) =>
                      setForm({ ...form, birthYear: e.target.value.replace(/\D/g, '') })
                    }
                    maxLength={4}
                    placeholder="1988"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StaffEducationFields
                  value={form.schooling}
                  onChange={(schooling) => setForm({ ...form, schooling })}
                />
                <div>
                  <label className="field-label">{t('employeeExperience')}</label>
                  <input
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    placeholder={t('employeeExperiencePlaceholder')}
                    className="input-field"
                  />
                </div>
              </div>

              {showProfessionalDevelopment && (
                <StaffProfessionalDevelopmentFields
                  value={form.professionalDevelopment}
                  onChange={(professionalDevelopment) =>
                    setForm({ ...form, professionalDevelopment })
                  }
                />
              )}

              <div>
                <label className="field-label">{t('employeeStatus')}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">{t('employeeStatusActive')}</option>
                  <option value="vacation">{t('employeeStatusVacation')}</option>
                  <option value="inactive">{t('employeeStatusInactive')}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary" disabled={saving}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
