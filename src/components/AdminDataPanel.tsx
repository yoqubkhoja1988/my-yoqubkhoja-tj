'use client';

import DocumentExportMenu from '@/components/DocumentExportMenu';
import OrganizationDocumentSignatureFooter from '@/components/OrganizationDocumentSignatureFooter';
import { downloadAdminDataExcel } from '@/lib/admin-data-export';
import { getProjects } from '@/lib/projects';
import { toIntlLocale } from '@/lib/intl-locale';
import { printDocument } from '@/lib/print-document';
import {
  ADMIN_DATA_CATEGORIES,
  AdminDataCategory,
  AdminDataSnapshot,
} from '@/types/admin-data';
import { Project } from '@/types/project';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

const CATEGORY_LABEL_KEYS: Record<AdminDataCategory, string> = {
  projects: 'adminDataCatProjects',
  organizations: 'adminDataCatOrganizations',
  employees: 'adminDataCatEmployees',
  timesheets: 'adminDataCatTimesheets',
  payrollLedgers: 'adminDataCatPayroll',
  laborLeaves: 'adminDataCatLeaves',
  positionHandovers: 'adminDataCatHandovers',
  sectionOverview: 'adminDataCatSections',
};

const SECTION_LABEL_KEYS: Record<string, string> = {
  overview: 'actOverview',
  'org-info': 'actOrgInfo',
  staff: 'actStaff',
  finance: 'actFinance',
  legal: 'actLegal',
  laws: 'actLaws',
  'government-decisions': 'actGovernmentDecisions',
  'official-documents': 'actOfficialDocuments',
  'formation-report': 'actFormationReport',
  'financial-reports': 'actFinancialReportsOverview',
  'financial-reports-form2': 'actFinancialReportsForm2',
  'financial-reports-form3': 'actFinancialReportsForm3',
  'financial-reports-form4': 'actFinancialReportsForm4',
  'financial-reports-form5': 'actFinancialReportsForm5',
  'financial-reports-form6': 'actFinancialReportsForm6',
  'financial-reports-annual': 'actFinancialReportsAnnual',
  'financial-reports-quarterly': 'actFinancialReportsQuarterly',
  'financial-reports-deadlines': 'actFinancialReportsDeadlines',
  reports: 'actReports',
  news: 'actNews',
  reception: 'actReception',
};

function mergeProjects(serverProjects: Project[], clientProjects: Project[]): Project[] {
  const byId = new Map<string, Project>();
  serverProjects.forEach((project) => byId.set(project.id, project));
  clientProjects.forEach((project) => byId.set(project.id, project));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(toIntlLocale(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AdminDataPanel() {
  const t = useTranslations();
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState<AdminDataSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminDataCategory[]>([...ADMIN_DATA_CATEGORIES]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/data', { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as AdminDataSnapshot;
      const mergedProjects = mergeProjects(data.projects, getProjects());
      setSnapshot({
        ...data,
        projects: mergedProjects,
        stats: {
          ...data.stats,
          projects: mergedProjects.length,
        },
      });
    } catch {
      setError(t('adminDataLoadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visible = useMemo(() => {
    if (!snapshot) return null;
    return {
      projects: selected.includes('projects') ? snapshot.projects : [],
      organizations: selected.includes('organizations') ? snapshot.organizations : [],
      employees: selected.includes('employees') ? snapshot.employees : [],
      timesheets: selected.includes('timesheets') ? snapshot.timesheets : [],
      payrollLedgers: selected.includes('payrollLedgers') ? snapshot.payrollLedgers : [],
      laborLeaves: selected.includes('laborLeaves') ? snapshot.laborLeaves : [],
      positionHandovers: selected.includes('positionHandovers') ? snapshot.positionHandovers : [],
      sectionOverview: selected.includes('sectionOverview') ? snapshot.sectionOverview : [],
    };
  }, [snapshot, selected]);

  const hasExportData = useMemo(() => {
    if (!visible) return false;
    return Object.values(visible).some((rows) => rows.length > 0);
  }, [visible]);

  function toggleCategory(category: AdminDataCategory) {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function sectionLabel(slug: string) {
    const key = SECTION_LABEL_KEYS[slug];
    return key ? t(key) : slug;
  }

  async function handleExcelExport() {
    if (!snapshot) return;
    await downloadAdminDataExcel(snapshot, selected, {
      projects: t('adminDataCatProjects'),
      organizations: t('adminDataCatOrganizations'),
      employees: t('adminDataCatEmployees'),
      timesheets: t('adminDataCatTimesheets'),
      payrollLedgers: t('adminDataCatPayroll'),
      laborLeaves: t('adminDataCatLeaves'),
      positionHandovers: t('adminDataCatHandovers'),
      sectionOverview: t('adminDataCatSections'),
      sheetSummary: t('adminDataSheetSummary'),
      generatedAt: t('adminDataGeneratedAt'),
      name: t('projectName'),
      status: t('projectStatus'),
      category: t('projectCategory'),
      description: t('projectDesc'),
      url: t('projectUrl'),
      createdAt: t('adminDataCreatedAt'),
      rma: t('organizationRma'),
      address: t('adminDataAddress'),
      director: t('adminDataDirector'),
      organization: t('adminDataOrganization'),
      position: t('adminDataPosition'),
      department: t('adminDataDepartment'),
      phone: t('adminDataPhone'),
      month: t('adminDataMonth'),
      entries: t('adminDataEntries'),
      orderNumber: t('adminDataOrderNumber'),
      leaveType: t('adminDataLeaveType'),
      startDate: t('adminDataStartDate'),
      endDate: t('adminDataEndDate'),
      days: t('adminDataDays'),
      section: t('adminDataSection'),
      tables: t('adminDataTables'),
      items: t('adminDataItems'),
      summary: t('adminDataSummary'),
    }, `admin-data-${new Date().toISOString().slice(0, 10)}`);
  }

  if (loading) {
    return <div className="py-12 text-center text-[var(--text-muted)]">{t('adminDataLoading')}</div>;
  }

  if (error || !snapshot || !visible) {
    return (
      <div className="rounded-lg border border-[var(--danger)]/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error || t('adminDataLoadError')}
        <button type="button" onClick={() => void loadData()} className="btn-secondary ml-3 text-xs">
          {t('adminDataRefresh')}
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="glass-card p-4">
        <p className="page-eyebrow">{t('adminDataEyebrow')}</p>
        <h3 className="text-lg font-bold">{t('adminDataTitle')}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t('adminDataSubtitle')}</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {t('adminDataGeneratedAt')}: {formatDate(snapshot.generatedAt, locale)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ADMIN_DATA_CATEGORIES.map((category) => (
          <div key={category} className="stat-card">
            <p className="text-[10px] text-[var(--text-muted)]">{t(CATEGORY_LABEL_KEYS[category])}</p>
            <p className="mt-0.5 text-lg font-bold text-blue-400">
              {category === 'sectionOverview'
                ? snapshot.stats.sections
                : snapshot.stats[category]}
            </p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <h4 className="text-sm font-bold">{t('adminDataSelectCategories')}</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {ADMIN_DATA_CATEGORIES.map((category) => {
            const active = selected.includes(category);
            return (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-gradient-to-r from-[var(--accent)] to-indigo-500 text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-muted)]'
                }`}
              >
                {t(CATEGORY_LABEL_KEYS[category])}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => printDocument('admin-data-document')}
            className="btn-primary text-xs"
            disabled={!hasExportData}
          >
            🖨 {t('bankPaymentPrint')}
          </button>
          <DocumentExportMenu
            documentId="admin-data-document"
            filename={`admin-data-${new Date().toISOString().slice(0, 10)}`}
            disabled={!hasExportData}
            customExcelExport={handleExcelExport}
          />
          <button type="button" onClick={() => void loadData()} className="btn-secondary text-xs">
            ↻ {t('adminDataRefresh')}
          </button>
        </div>
      </div>

      <div
        id="admin-data-document"
        data-print-orientation="landscape"
        className="glass-card space-y-6 p-4 print:border-0 print:bg-white print:text-black"
      >
        <div>
          <h4 className="text-base font-bold">Yoqubkhoja Hub — {t('adminDataTitle')}</h4>
          <p className="text-xs text-[var(--text-muted)] print:text-gray-600">
            {t('adminDataGeneratedAt')}: {formatDate(snapshot.generatedAt, locale)}
          </p>
        </div>

        {visible.projects.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatProjects')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('projectName')}</th>
                    <th>{t('projectStatus')}</th>
                    <th>{t('projectCategory')}</th>
                    <th>{t('projectDesc')}</th>
                    <th>{t('projectUrl')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.projects.map((project) => (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{project.status}</td>
                      <td>{project.category}</td>
                      <td>{project.description || '—'}</td>
                      <td>{project.url || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.organizations.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatOrganizations')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('organizationName')}</th>
                    <th>{t('organizationRma')}</th>
                    <th>{t('adminDataAddress')}</th>
                    <th>{t('adminDataDirector')}</th>
                    <th>{t('adminDataPhone')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.organizations.map((org) => (
                    <tr key={org.id}>
                      <td>{org.name}</td>
                      <td>{org.rma || '—'}</td>
                      <td>{org.address || '—'}</td>
                      <td>{org.director || '—'}</td>
                      <td>{org.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.employees.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatEmployees')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataEmployee')}</th>
                    <th>{t('adminDataPosition')}</th>
                    <th>{t('adminDataDepartment')}</th>
                    <th>{t('adminDataPhone')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.employees.map(({ organizationName, employee }) => (
                    <tr key={`${organizationName}-${employee.id}`}>
                      <td>{organizationName}</td>
                      <td>{employee.fullName}</td>
                      <td>{employee.position}</td>
                      <td>{employee.department || '—'}</td>
                      <td>{employee.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.timesheets.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatTimesheets')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataMonth')}</th>
                    <th>{t('adminDataEntries')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.timesheets.map(({ organizationName, timesheet }) => (
                    <tr key={`${organizationName}-${timesheet.month}`}>
                      <td>{organizationName}</td>
                      <td>{timesheet.month}</td>
                      <td>{timesheet.entries.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.payrollLedgers.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatPayroll')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataMonth')}</th>
                    <th>{t('adminDataEntries')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.payrollLedgers.map(({ organizationName, ledger }) => (
                    <tr key={`${organizationName}-${ledger.month}`}>
                      <td>{organizationName}</td>
                      <td>{ledger.month}</td>
                      <td>{ledger.entries.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.laborLeaves.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatLeaves')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataOrderNumber')}</th>
                    <th>{t('adminDataLeaveType')}</th>
                    <th>{t('adminDataStartDate')}</th>
                    <th>{t('adminDataEndDate')}</th>
                    <th>{t('adminDataDays')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.laborLeaves.map(({ organizationName, leave }) => (
                    <tr key={leave.id}>
                      <td>{organizationName}</td>
                      <td>{leave.orderNumber}</td>
                      <td>{leave.leaveType}</td>
                      <td>{leave.startDate}</td>
                      <td>{leave.endDate}</td>
                      <td>{leave.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.positionHandovers.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatHandovers')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataDepartment')}</th>
                    <th>{t('adminDataPosition')}</th>
                    <th>{t('adminDataStartDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.positionHandovers.map(({ organizationName, handover }) => (
                    <tr key={handover.id}>
                      <td>{organizationName}</td>
                      <td>{handover.department}</td>
                      <td>{handover.position}</td>
                      <td>{handover.effectiveDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {visible.sectionOverview.length > 0 && (
          <div>
            <h5 className="mb-2 text-sm font-bold">{t('adminDataCatSections')}</h5>
            <div className="table-wrapper table-scroll-sm">
              <table>
                <thead>
                  <tr>
                    <th>{t('adminDataOrganization')}</th>
                    <th>{t('adminDataSection')}</th>
                    <th>{t('adminDataTables')}</th>
                    <th>{t('adminDataItems')}</th>
                    <th>{t('adminDataSummary')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.sectionOverview.map(({ organizationName, sectionSlug, content }) => (
                    <tr key={`${organizationName}-${sectionSlug}`}>
                      <td>{organizationName}</td>
                      <td>{sectionLabel(sectionSlug)}</td>
                      <td>{content.tables?.length ?? 0}</td>
                      <td>{content.items?.length ?? 0}</td>
                      <td>{content.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!hasExportData && (
          <p className="text-sm text-[var(--text-muted)]">{t('adminDataEmpty')}</p>
        )}

        <OrganizationDocumentSignatureFooter
          director={{ label: t('payrollLedgerDirector') }}
          accountant={{ label: t('payrollLedgerAccountant') }}
          sealLabel={t('payrollLedgerSeal')}
        />
      </div>
    </section>
  );
}
