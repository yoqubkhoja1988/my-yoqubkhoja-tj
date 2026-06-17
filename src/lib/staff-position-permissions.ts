import {
  ACCOUNTANT_SECTION_SLUGS,
  finalizeUserPermissions,
  getAccountantPresetPermissions,
  getOrganizationManagerPresetPermissions,
} from '@/lib/user-permissions-policy';
import { extractStaffingOptions, StaffingDepartment } from '@/lib/staff-staffing-options';
import { OrganizationSectionContent } from '@/types/organization-section';
import { UserPermissions } from '@/types/user';

export type StaffRoleKind =
  | 'organization_manager'
  | 'accountant'
  | 'hr_officer'
  | 'educator'
  | 'medical_nutrition'
  | 'deputy_leader'
  | 'department_head'
  | 'specialist'
  | 'support_staff'
  | 'supervision_inspector';

export type StaffPositionPreset = {
  position: string;
  department: string;
  roleKind: StaffRoleKind;
  roleLabelKey: string;
};

const BASE_SLUGS = ['overview', 'org-info'] as const;

const LEGAL_READ_SLUGS = [
  'laws',
  'government-decisions',
  'official-documents',
  'charter',
  'legal',
] as const;

const EDUCATION_SLUGS = [
  'education-standard',
  'education-programs',
  'work-plan',
  'methodology',
  'age-groups',
  'enrollees',
  'parent-work',
] as const;

const GOVERNANCE_SLUGS = ['governance', 'state-supervision', 'reports'] as const;

const STAFF_SLUGS = ['staff', 'formation-report'] as const;

const MEDICAL_SLUGS = ['medical-service', 'nutrition'] as const;

const SUPPORT_SLUGS = ['material-base', 'reception'] as const;

const FOOD_SAFETY_SLUGS = [
  'sectoral-programs',
  'veterinary',
  'phytosanitary',
  'plant-protection',
  'seed-production',
  'breeding-supervision',
] as const;

export const STAFF_ROLE_LABEL_KEYS: Record<StaffRoleKind, string> = {
  organization_manager: 'staffRoleOrganizationManager',
  accountant: 'staffRoleAccountant',
  hr_officer: 'staffRoleHrOfficer',
  educator: 'staffRoleEducator',
  medical_nutrition: 'staffRoleMedicalNutrition',
  deputy_leader: 'staffRoleDeputyLeader',
  department_head: 'staffRoleDepartmentHead',
  specialist: 'staffRoleSpecialist',
  support_staff: 'staffRoleSupportStaff',
  supervision_inspector: 'staffRoleSupervisionInspector',
};

function normalizeRoleText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function sectionSlugsForRole(role: StaffRoleKind): string[] {
  switch (role) {
    case 'organization_manager':
      return [];
    case 'accountant':
      return [...ACCOUNTANT_SECTION_SLUGS];
    case 'hr_officer':
      return [...BASE_SLUGS, ...STAFF_SLUGS, ...LEGAL_READ_SLUGS];
    case 'educator':
      return [...BASE_SLUGS, ...EDUCATION_SLUGS, 'staff'];
    case 'medical_nutrition':
      return [...BASE_SLUGS, ...MEDICAL_SLUGS, 'staff'];
    case 'deputy_leader':
      return [
        ...BASE_SLUGS,
        ...GOVERNANCE_SLUGS,
        ...EDUCATION_SLUGS,
        ...STAFF_SLUGS,
        'finance',
        'formation-report',
        ...LEGAL_READ_SLUGS,
      ];
    case 'department_head':
      return [
        ...BASE_SLUGS,
        ...GOVERNANCE_SLUGS,
        ...STAFF_SLUGS,
        'finance',
        ...LEGAL_READ_SLUGS,
      ];
    case 'specialist':
      return [...BASE_SLUGS, ...LEGAL_READ_SLUGS, ...FOOD_SAFETY_SLUGS, 'staff'];
    case 'support_staff':
      return [...BASE_SLUGS, ...SUPPORT_SLUGS, ...MEDICAL_SLUGS];
    case 'supervision_inspector':
      return [...BASE_SLUGS, ...GOVERNANCE_SLUGS, ...LEGAL_READ_SLUGS];
    default:
      return [...BASE_SLUGS];
  }
}

export function classifyStaffRole(position: string, department?: string): StaffRoleKind {
  const positionText = normalizeRoleText(position);
  const departmentText = normalizeRoleText(department ?? '');
  const combined = `${departmentText} ${positionText}`;

  if (
    includesAny(combined, [
      /назорат|инспектор|фитосанитар|ветеринар|санҷиши қонун/,
      /supervision|inspector/,
    ]) &&
    !includesAny(positionText, [/муҳосиб|омӯзгор|мураббия/])
  ) {
    return 'supervision_inspector';
  }

  if (
    includesAny(positionText, [
      /^сардор$/,
      /^директор$/,
      /^мудир$/,
      /директори шуъба/,
    ]) &&
    !includesAny(positionText, [/муовин|омӯзгор|мураббия|бахш/])
  ) {
    return 'organization_manager';
  }

  if (includesAny(combined, [/муҳосиб|бухгалтер|сармуҳосиб|муҳосибот/])) {
    return 'accountant';
  }

  if (includesAny(combined, [/кадр|кадры|ҳамшираи тиб|диетолог|тиббӣ|ҳамшира/])) {
    if (includesAny(combined, [/кадр|кадры/])) {
      return 'hr_officer';
    }
    return 'medical_nutrition';
  }

  if (
    includesAny(combined, [
      /омӯзгор|мураббия|тарбиягир|муаллим|мушовир|роҳбари мусиқӣ|таълим|тарбия/,
    ])
  ) {
    return 'educator';
  }

  if (includesAny(combined, [/муовин|мушовир|ҷонишин/])) {
    return 'deputy_leader';
  }

  if (includesAny(positionText, [/мудири бахш|сармутахассис|директори шуъба/])) {
    return 'department_head';
  }

  if (includesAny(combined, [/фаррош|посбон|хоҷагӣ|ошпаз|коргар|ёрирасон/])) {
    return 'support_staff';
  }

  if (includesAny(positionText, [/мутахассис/])) {
    return 'specialist';
  }

  if (includesAny(departmentText, [/муҳосибот|кадр/])) {
    return departmentText.includes('муҳосиб') ? 'accountant' : 'hr_officer';
  }

  if (includesAny(departmentText, [/мураббия|таълим|тарбия/])) {
    return 'educator';
  }

  return 'specialist';
}

export function getPermissionsForStaffRole(
  role: StaffRoleKind,
  base: Pick<UserPermissions, 'canAccessProjects' | 'organizationIds'>,
  meta?: { position?: string; department?: string }
): UserPermissions {
  if (role === 'organization_manager') {
    return {
      ...getOrganizationManagerPresetPermissions(base),
      assignedStaffPosition: meta?.position,
      assignedStaffDepartment: meta?.department,
      assignedStaffRole: role,
    };
  }

  if (role === 'accountant') {
    return {
      ...getAccountantPresetPermissions(base),
      assignedStaffPosition: meta?.position,
      assignedStaffDepartment: meta?.department,
      assignedStaffRole: role,
    };
  }

  if (role === 'supervision_inspector') {
    return finalizeUserPermissions({
      canAccessProjects: base.canAccessProjects,
      organizationIds: base.organizationIds,
      organizationManager: false,
      supervisionOnly: true,
      sectionSlugs: sectionSlugsForRole(role),
      assignedStaffPosition: meta?.position,
      assignedStaffDepartment: meta?.department,
      assignedStaffRole: role,
    });
  }

  return finalizeUserPermissions({
    canAccessProjects: base.canAccessProjects,
    organizationIds: base.organizationIds,
    organizationManager: false,
    supervisionOnly: false,
    sectionSlugs: sectionSlugsForRole(role),
    assignedStaffPosition: meta?.position,
    assignedStaffDepartment: meta?.department,
    assignedStaffRole: role,
  });
}

export function getPermissionsForPosition(
  position: string,
  department: string | undefined,
  base: Pick<UserPermissions, 'canAccessProjects' | 'organizationIds'>
): UserPermissions {
  const role = classifyStaffRole(position, department);
  return getPermissionsForStaffRole(role, base, { position, department });
}

export function buildStaffPositionPresets(
  staffContent: OrganizationSectionContent | null | undefined
): StaffPositionPreset[] {
  const departments = extractStaffingOptions(staffContent?.tables ?? []);
  const presets: StaffPositionPreset[] = [];

  for (const department of departments) {
    for (const position of department.positions) {
      const roleKind = classifyStaffRole(position, department.label);
      presets.push({
        position,
        department: department.label,
        roleKind,
        roleLabelKey: STAFF_ROLE_LABEL_KEYS[roleKind],
      });
    }
  }

  return presets;
}

export function groupPresetsByDepartment(
  presets: StaffPositionPreset[]
): { department: string; items: StaffPositionPreset[] }[] {
  const map = new Map<string, StaffPositionPreset[]>();
  for (const preset of presets) {
    const list = map.get(preset.department) ?? [];
    list.push(preset);
    map.set(preset.department, list);
  }
  return [...map.entries()].map(([department, items]) => ({ department, items }));
}

export type OrganizationStaffPresets = {
  organizationId: string;
  organizationName: string;
  departments: StaffingDepartment[];
  presets: StaffPositionPreset[];
};

export function buildOrganizationStaffPresets(input: {
  organizationId: string;
  organizationName: string;
  staffContent: OrganizationSectionContent | null | undefined;
}): OrganizationStaffPresets {
  const departments = extractStaffingOptions(input.staffContent?.tables ?? []);
  const presets = buildStaffPositionPresets(input.staffContent);
  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    departments,
    presets,
  };
}
