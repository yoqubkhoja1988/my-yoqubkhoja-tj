import {
  collectDocumentBlocks,
  estimateTableColumns,
} from './collect-document-blocks';
import { downloadBlob, sanitizeFilename } from './download-blob';
import { styleExcelCell } from './excel-styles';
import { autoFitSheetColumns, exportTableToSheet } from './table-to-excel';
import { mountExportClone, waitForExportLayout } from './prepare-export-clone';
import { resolvePrintOrientation } from './print-orientation';

export async function exportDocumentToExcel(documentId: string, filename: string) {
  const element = document.getElementById(documentId);
  if (!element) {
    throw new Error(`Document #${documentId} not found`);
  }

  const orientation = resolvePrintOrientation(element);
  const { clone, cleanup } = mountExportClone(element);

  try {
    await waitForExportLayout();

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'my-yoqubkhoja-tj';
    workbook.created = new Date();

    const blocks = collectDocumentBlocks(clone);
    const maxCols = Math.max(
      4,
      ...blocks
        .filter((block) => block.kind === 'table')
        .map((block) => estimateTableColumns(block.table))
    );

    const sheet = workbook.addWorksheet('Document', {
      pageSetup: { paperSize: 9, orientation, fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
    });

    let rowIndex = 1;

    for (const block of blocks) {
      if (block.kind === 'text') {
        for (const line of block.lines) {
          sheet.mergeCells(rowIndex, 1, rowIndex, maxCols);
          styleExcelCell(sheet.getCell(rowIndex, 1), {
            value: line,
            bold: block.bold ?? false,
            size: block.bold ? 12 : 11,
            bg: block.bg,
            hAlign: block.center ? 'center' : 'left',
            wrap: true,
          });
          sheet.getRow(rowIndex).height = Math.min(120, 18 + Math.floor(line.length / 80) * 14);
          rowIndex += 1;
        }
        rowIndex += 1;
        continue;
      }

      rowIndex = exportTableToSheet(sheet, block.table, rowIndex);
      rowIndex += 1;
    }

    autoFitSheetColumns(sheet, maxCols);

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${sanitizeFilename(filename)}.xlsx`
    );
  } finally {
    cleanup();
  }
}
