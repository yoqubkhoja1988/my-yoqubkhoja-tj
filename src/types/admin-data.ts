import { Organization } from '@/types/organization';
import {
  LaborLeave,
  OrganizationSectionContent,
  PayrollLedger,
  PositionHandover,
  StaffEmployee,
  StaffTimesheet,
} from '@/types/organization-section';
import { Project } from '@/types/project';

export const ADMIN_DATA_CATEGORIES = [
  'projects',
  'organizations',
  'employees',
  'timesheets',
  'payrollLedgers',
  'laborLeaves',
  'positionHandovers',
  'sectionOverview',
] as const;

export type AdminDataCategory = (typeof ADMIN_DATA_CATEGORIES)[number];

export type AdminEmployeeRow = {
  organizationId: string;
  organizationName: string;
  employee: StaffEmployee;
};

export type AdminTimesheetRow = {
  organizationId: string;
  organizationName: string;
  timesheet: StaffTimesheet;
};

export type AdminPayrollRow = {
  organizationId: string;
  organizationName: string;
  ledger: PayrollLedger;
};

export type AdminLaborLeaveRow = {
  organizationId: string;
  organizationName: string;
  leave: LaborLeave;
};

export type AdminHandoverRow = {
  organizationId: string;
  organizationName: string;
  handover: PositionHandover;
};

export type AdminSectionOverviewRow = {
  organizationId: string;
  organizationName: string;
  sectionSlug: string;
  content: OrganizationSectionContent;
};

export type AdminDataStats = {
  projects: number;
  organizations: number;
  employees: number;
  timesheets: number;
  payrollLedgers: number;
  laborLeaves: number;
  positionHandovers: number;
  sections: number;
};

export type AdminDataSnapshot = {
  generatedAt: string;
  stats: AdminDataStats;
  projects: Project[];
  organizations: Organization[];
  employees: AdminEmployeeRow[];
  timesheets: AdminTimesheetRow[];
  payrollLedgers: AdminPayrollRow[];
  laborLeaves: AdminLaborLeaveRow[];
  positionHandovers: AdminHandoverRow[];
  sectionOverview: AdminSectionOverviewRow[];
};
