export const STAFF_SECTION_IDS = [
  'staff-stats',
  'staff-schedule',
  'staff-vacancy',
  'staff-registry',
  'staff-timesheet',
] as const;

export type StaffSectionId = (typeof STAFF_SECTION_IDS)[number];

export function isStaffSectionId(value: string): value is StaffSectionId {
  return (STAFF_SECTION_IDS as readonly string[]).includes(value);
}

export const DEFAULT_STAFF_SECTION: StaffSectionId = 'staff-stats';
