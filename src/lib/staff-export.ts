type ExportColumn<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
};

export function exportEmployeesToCsv<T extends Record<string, unknown>>(
  employees: T[],
  columns: ExportColumn<T>[]
): string {
  const header = columns.map((column) => `"${column.label.replace(/"/g, '""')}"`).join(';');
  const rows = employees.map((employee, index) =>
    columns
      .map((column) => {
        let value = '';
        if (column.key === 'index') value = String(index + 1);
        else value = String(employee[column.key] ?? '');
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  return `\uFEFF${[header, ...rows].join('\n')}`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
