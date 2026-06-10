import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AdminDataSnapshot,
  AdminDataStats,
} from '@/types/admin-data';
import { Organization } from '@/types/organization';
import { OrganizationSectionsMap } from '@/types/organization-section';
import { Project } from '@/types/project';
import { readOrganizationsFile } from '@/lib/organizations-store';
import { readOrganizationSections } from '@/lib/organization-sections-store';

function readProjectsFile(): Project[] {
  try {
    const file = join(process.cwd(), 'data', 'projects.json');
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function buildAdminDataSnapshot(): Promise<AdminDataSnapshot> {
  const organizations = await readOrganizationsFile();
  const sectionsByOrg = await readOrganizationSections();
  const projects = readProjectsFile();
  const orgNameById = new Map(organizations.map((org) => [org.id, org.name]));

  const employees: AdminDataSnapshot['employees'] = [];
  const timesheets: AdminDataSnapshot['timesheets'] = [];
  const payrollLedgers: AdminDataSnapshot['payrollLedgers'] = [];
  const laborLeaves: AdminDataSnapshot['laborLeaves'] = [];
  const positionHandovers: AdminDataSnapshot['positionHandovers'] = [];
  const sectionOverview: AdminDataSnapshot['sectionOverview'] = [];

  for (const [organizationId, sections] of Object.entries(sectionsByOrg)) {
    const organizationName = orgNameById.get(organizationId) ?? organizationId;

    for (const [sectionSlug, content] of Object.entries(sections as OrganizationSectionsMap)) {
      sectionOverview.push({ organizationId, organizationName, sectionSlug, content });

      for (const employee of content.employees ?? []) {
        employees.push({ organizationId, organizationName, employee });
      }

      for (const timesheet of content.timesheets ?? []) {
        timesheets.push({ organizationId, organizationName, timesheet });
      }

      for (const ledger of content.payrollLedgers ?? []) {
        payrollLedgers.push({ organizationId, organizationName, ledger });
      }

      for (const leave of content.laborLeaves ?? []) {
        laborLeaves.push({ organizationId, organizationName, leave });
      }

      for (const handover of content.positionHandovers ?? []) {
        positionHandovers.push({ organizationId, organizationName, handover });
      }
    }
  }

  const stats: AdminDataStats = {
    projects: projects.length,
    organizations: organizations.length,
    employees: employees.length,
    timesheets: timesheets.length,
    payrollLedgers: payrollLedgers.length,
    laborLeaves: laborLeaves.length,
    positionHandovers: positionHandovers.length,
    sections: sectionOverview.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    stats,
    projects,
    organizations,
    employees,
    timesheets,
    payrollLedgers,
    laborLeaves,
    positionHandovers,
    sectionOverview,
  };
}
