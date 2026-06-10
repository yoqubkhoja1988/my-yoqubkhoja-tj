import ExcelJS from 'exceljs';
import { downloadBlob } from '@/lib/document-export/download-blob';
import {
  AdminDataCategory,
  AdminDataSnapshot,
} from '@/types/admin-data';

type ExportLabels = {
  projects: string;
  organizations: string;
  employees: string;
  timesheets: string;
  payrollLedgers: string;
  laborLeaves: string;
  positionHandovers: string;
  sectionOverview: string;
  sheetSummary: string;
  generatedAt: string;
  name: string;
  status: string;
  category: string;
  description: string;
  url: string;
  createdAt: string;
  rma: string;
  address: string;
  director: string;
  organization: string;
  position: string;
  department: string;
  phone: string;
  month: string;
  entries: string;
  orderNumber: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: string;
  section: string;
  tables: string;
  items: string;
  summary: string;
};

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = Math.min(len + 2, 48);
    });
    column.width = max;
  });
}

export async function downloadAdminDataExcel(
  snapshot: AdminDataSnapshot,
  categories: AdminDataCategory[],
  labels: ExportLabels,
  filename: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Yoqubkhoja Hub';
  workbook.created = new Date(snapshot.generatedAt);

  const summary = workbook.addWorksheet(labels.sheetSummary);
  summary.addRow([labels.generatedAt, snapshot.generatedAt]);
  summary.addRow([]);
  for (const category of categories) {
    summary.addRow([labels[category], snapshot.stats[category === 'sectionOverview' ? 'sections' : category]]);
  }
  autoWidth(summary);

  if (categories.includes('projects')) {
    const sheet = workbook.addWorksheet(labels.projects);
    sheet.addRow([labels.name, labels.status, labels.category, labels.description, labels.url, labels.createdAt]);
    snapshot.projects.forEach((project) => {
      sheet.addRow([
        project.name,
        project.status,
        project.category,
        project.description,
        project.url,
        project.createdAt,
      ]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('organizations')) {
    const sheet = workbook.addWorksheet(labels.organizations);
    sheet.addRow([labels.name, labels.rma, labels.address, labels.director, labels.phone, labels.createdAt]);
    snapshot.organizations.forEach((org) => {
      sheet.addRow([
        org.name,
        org.rma ?? '',
        org.address ?? '',
        org.director ?? '',
        org.phone ?? '',
        org.createdAt,
      ]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('employees')) {
    const sheet = workbook.addWorksheet(labels.employees);
    sheet.addRow([
      labels.organization,
      labels.name,
      labels.position,
      labels.department,
      labels.phone,
      labels.status,
    ]);
    snapshot.employees.forEach(({ organizationName, employee }) => {
      sheet.addRow([
        organizationName,
        employee.fullName,
        employee.position,
        employee.department ?? '',
        employee.phone ?? '',
        employee.status ?? '',
      ]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('timesheets')) {
    const sheet = workbook.addWorksheet(labels.timesheets);
    sheet.addRow([labels.organization, labels.month, labels.entries]);
    snapshot.timesheets.forEach(({ organizationName, timesheet }) => {
      sheet.addRow([organizationName, timesheet.month, timesheet.entries.length]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('payrollLedgers')) {
    const sheet = workbook.addWorksheet(labels.payrollLedgers);
    sheet.addRow([labels.organization, labels.month, labels.entries]);
    snapshot.payrollLedgers.forEach(({ organizationName, ledger }) => {
      sheet.addRow([organizationName, ledger.month, ledger.entries.length]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('laborLeaves')) {
    const sheet = workbook.addWorksheet(labels.laborLeaves);
    sheet.addRow([
      labels.organization,
      labels.orderNumber,
      labels.leaveType,
      labels.startDate,
      labels.endDate,
      labels.days,
    ]);
    snapshot.laborLeaves.forEach(({ organizationName, leave }) => {
      sheet.addRow([
        organizationName,
        leave.orderNumber,
        leave.leaveType,
        leave.startDate,
        leave.endDate,
        leave.days,
      ]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('positionHandovers')) {
    const sheet = workbook.addWorksheet(labels.positionHandovers);
    sheet.addRow([labels.organization, labels.department, labels.position, labels.startDate]);
    snapshot.positionHandovers.forEach(({ organizationName, handover }) => {
      sheet.addRow([
        organizationName,
        handover.department,
        handover.position,
        handover.effectiveDate,
      ]);
    });
    autoWidth(sheet);
  }

  if (categories.includes('sectionOverview')) {
    const sheet = workbook.addWorksheet(labels.sectionOverview);
    sheet.addRow([labels.organization, labels.section, labels.tables, labels.items, labels.summary]);
    snapshot.sectionOverview.forEach(({ organizationName, sectionSlug, content }) => {
      sheet.addRow([
        organizationName,
        sectionSlug,
        content.tables?.length ?? 0,
        content.items?.length ?? 0,
        content.summary,
      ]);
    });
    autoWidth(sheet);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filename}.xlsx`
  );
}
