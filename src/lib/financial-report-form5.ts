import { SectionTable } from '@/types/organization-section';

export const FORM5_REVENUE_TABLE_TITLE = 'Шакли №5 — Даромадҳо';
export const FORM5_EXPENSE_TABLE_TITLE = 'Шакли №5 — Хароҷотҳо';

export function isForm5Table(title: string): boolean {
  return title.startsWith('Шакли №5 —');
}

export function buildDefaultForm5Tables(): SectionTable[] {
  return [
    {
      title: FORM5_REVENUE_TABLE_TITLE,
      caption: 'Ҳисоботи иҷроиши сметаи даромад — воҳиди ченак: сомонӣ',
      columns: [
        'Рамз',
        'Сатр',
        'Нақшаи тасдиқшуда',
        'Нақшаи утоқшуда',
        'Даромади кассавӣ',
        'Даромади воқеӣ',
      ],
      rows: [
        ['', 'Бақия ба аввал', '0,00', '0,00', '0,00', '0,00'],
        ['1', 'Даромадҳо', '0,00', '0,00', '0,00', '0,00'],
        ['1.01', 'Грантҳои буҷетӣ', '0,00', '0,00', '0,00', '0,00'],
        ['1.02', 'Дигар даромадҳо', '0,00', '0,00', '0,00', '0,00'],
        ['', 'Ҷамъи даромадҳо', '0,00', '0,00', '0,00', '0,00'],
      ],
    },
    {
      title: FORM5_EXPENSE_TABLE_TITLE,
      caption: 'Ҳисоботи иҷроиши сметаи хароҷот — воҳиди ченак: сомонӣ',
      columns: [
        'Рамз',
        'Сатр',
        'Нақшаи тасдиқшуда',
        'Нақшаи утоқшуда',
        'Хароҷоти кассавӣ',
        'Хароҷоти воқеӣ',
      ],
      rows: [
        ['', 'Бақия ба аввал', '0,00', '0,00', '0,00', '0,00'],
        ['2', 'Хароҷотҳо', '0,00', '0,00', '0,00', '0,00'],
        ['211', 'Музди меҳнати кормандон', '0,00', '0,00', '0,00', '0,00'],
        ['2111', 'Музди меҳнат', '0,00', '0,00', '0,00', '0,00'],
        ['21113', 'Мукофотпулӣ', '0,00', '0,00', '0,00', '0,00'],
        ['22', 'Молҳо ва хизматрасонӣ', '0,00', '0,00', '0,00', '0,00'],
        ['221', 'Хариди молҳо ва хизматрасонӣ', '0,00', '0,00', '0,00', '0,00'],
        ['2211', 'Захираҳои моддӣ', '0,00', '0,00', '0,00', '0,00'],
        ['', 'Ҷамъи хароҷотҳо', '0,00', '0,00', '0,00', '0,00'],
        ['', 'Бақия ба охир', '0,00', '0,00', '0,00', '0,00'],
      ],
    },
  ];
}

export function ensureForm5Tables(tables?: SectionTable[]): SectionTable[] {
  const existing = tables ?? [];
  const hasForm5 = existing.some((table) => isForm5Table(table.title));
  if (hasForm5) return existing;
  return [...existing, ...buildDefaultForm5Tables()];
}

export function form5TablesFromAll(tables?: SectionTable[]): SectionTable[] {
  return (tables ?? []).filter((table) => isForm5Table(table.title));
}
