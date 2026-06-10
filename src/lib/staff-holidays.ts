const RECURRING_HOLIDAYS: Record<string, string> = {
  '01-01': 'holidayNewYear',
  '03-08': 'holidayWomensDay',
  '03-21': 'holidayNavruz',
  '03-22': 'holidayNavruz',
  '03-23': 'holidayNavruz',
  '03-24': 'holidayNavruz',
  '05-01': 'holidayLabourDay',
  '05-09': 'holidayVictoryDay',
  '06-27': 'holidayUnityDay',
  '09-09': 'holidayIndependenceDay',
  '11-06': 'holidayConstitutionDay',
};

/** Ид ва рӯзҳои ид — сол ба сол (ҳиҷрӣ) */
const VARIABLE_HOLIDAYS: Record<string, string> = {
  '2025-03-30': 'holidayEidFitr',
  '2025-03-31': 'holidayEidFitr',
  '2025-04-01': 'holidayEidFitr',
  '2025-06-06': 'holidayEidAdha',
  '2025-06-07': 'holidayEidAdha',
  '2025-06-08': 'holidayEidAdha',
  '2026-03-20': 'holidayEidFitr',
  '2026-03-21': 'holidayEidFitr',
  '2026-03-22': 'holidayEidFitr',
  '2026-05-27': 'holidayEidAdha',
  '2026-05-28': 'holidayEidAdha',
  '2026-05-29': 'holidayEidAdha',
  '2027-03-10': 'holidayEidFitr',
  '2027-03-11': 'holidayEidFitr',
  '2027-03-12': 'holidayEidFitr',
  '2027-05-17': 'holidayEidAdha',
  '2027-05-18': 'holidayEidAdha',
  '2027-05-19': 'holidayEidAdha',
};

function toDateKey(monthKey: string, day: number): string {
  const [year, month] = monthKey.split('-');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

export function getHolidayLabelKey(monthKey: string, day: number): string | null {
  const dateKey = toDateKey(monthKey, day);
  if (VARIABLE_HOLIDAYS[dateKey]) return VARIABLE_HOLIDAYS[dateKey];

  const recurringKey = dateKey.slice(5);
  return RECURRING_HOLIDAYS[recurringKey] ?? null;
}

export function isHoliday(monthKey: string, day: number): boolean {
  return getHolidayLabelKey(monthKey, day) !== null;
}

export function getHolidaysInMonth(monthKey: string): { day: number; labelKey: string }[] {
  const daysInMonth = new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)),
    0
  ).getDate();

  const holidays: { day: number; labelKey: string }[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const labelKey = getHolidayLabelKey(monthKey, day);
    if (labelKey) holidays.push({ day, labelKey });
  }
  return holidays;
}
