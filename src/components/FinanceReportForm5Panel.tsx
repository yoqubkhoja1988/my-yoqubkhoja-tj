'use client';

import UserContentText from '@/components/UserContentText';
import { SectionTable } from '@/types/organization-section';
import { useTranslations } from 'next-intl';

type Props = {
  tables: SectionTable[];
  editing?: boolean;
  onCellChange?: (
    tableIndex: number,
    rowIndex: number,
    cellIndex: number,
    value: string
  ) => void;
  onAddRow?: (tableIndex: number) => void;
};

export default function FinanceReportForm5Panel({
  tables,
  editing = false,
  onCellChange,
  onAddRow,
}: Props) {
  const t = useTranslations();

  if (!tables.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <p className="text-sm text-[var(--text-muted)]">{t('financeReportForm5Empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{t('financeReportForm5Hint')}</p>
      {tables.map((table, tableIndex) => (
        <div key={table.title} className="space-y-2">
          <div>
            <h5 className="text-sm font-bold">
              <UserContentText text={table.title} as="span" />
            </h5>
            {table.caption && (
              <p className="text-xs text-[var(--text-muted)]">
                <UserContentText text={table.caption} as="span" />
              </p>
            )}
          </div>
          <div className="table-wrapper overflow-x-auto">
            <table className="min-w-[48rem]">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} className="whitespace-nowrap text-xs">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={`${tableIndex}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="text-xs">
                        {editing && onCellChange ? (
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) =>
                              onCellChange(tableIndex, rowIndex, cellIndex, e.target.value)
                            }
                            className="input-field min-w-[5rem] py-1 text-xs"
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editing && onAddRow && (
            <button
              type="button"
              onClick={() => onAddRow(tableIndex)}
              className="btn-secondary text-xs"
            >
              + {t('financeReportForm5AddRow')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
