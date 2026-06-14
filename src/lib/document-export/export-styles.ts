/** Услубҳои экспорт — ҳамон дизайни чоп, бо ранги hex (барои PDF/Word/Excel) */
import {
  LEGAL_DOCUMENT_FONT_FAMILY,
  LEGAL_DOCUMENT_FONT_SIZE,
  LEGAL_DOCUMENT_LINE_HEIGHT,
} from '@/lib/legal-document-typography';

export const EXPORT_DOCUMENT_CSS = `
.export-render,
.export-render * {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.export-render {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 16px 20px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  border: none !important;
  box-shadow: none !important;
  font-family: 'Times New Roman', Times, serif !important;
  line-height: 1.45 !important;
}

.export-render .print-supplement {
  display: none !important;
}

.export-render header,
.export-render h1,
.export-render h2,
.export-render h3,
.export-render h4,
.export-render p,
.export-render span,
.export-render strong,
.export-render td,
.export-render th {
  color: #0f172a !important;
}

.export-render .text-slate-500,
.export-render .text-slate-600,
.export-render .text-slate-700 {
  color: #334155 !important;
}

.export-render .text-slate-900 {
  color: #0f172a !important;
}

.export-render .bg-amber-100 {
  background-color: #fef3c7 !important;
}

.export-render .bg-sky-100 {
  background-color: #e0f2fe !important;
}

.export-render .bg-slate-50 {
  background-color: #f8fafc !important;
}

.export-render table {
  width: 100% !important;
  border-collapse: collapse !important;
  color: #0f172a !important;
}

.export-render th,
.export-render td {
  border: 1px solid #cbd5e1 !important;
  padding: 4px 6px !important;
  vertical-align: top !important;
  background: #ffffff !important;
}

.export-render thead th,
.export-render tr.bg-sky-100 th,
.export-render tr.bg-sky-100 td {
  background-color: #e0f2fe !important;
  font-weight: 700 !important;
}

.export-render tr.bg-slate-50 th,
.export-render tr.bg-slate-50 td {
  background-color: #f8fafc !important;
  font-weight: 600 !important;
}

.export-render tr.font-semibold td,
.export-render tr.font-semibold th {
  font-weight: 700 !important;
}

.export-render .border-t {
  border-top: 1px solid #94a3b8 !important;
}

.export-render .text-center {
  text-align: center !important;
}

.export-render .text-right {
  text-align: right !important;
}

.export-render .text-justify {
  text-align: justify !important;
}

.export-render .font-bold,
.export-render .font-semibold {
  font-weight: 700 !important;
}

.export-render .uppercase {
  text-transform: uppercase !important;
}

.export-render .font-mono {
  font-family: Consolas, 'Courier New', monospace !important;
}

.export-render .overflow-x-auto {
  overflow: visible !important;
}

#finance-payroll-ledger-document.export-render table {
  font-size: 8px !important;
}

#finance-payroll-ledger-document.export-render th,
#finance-payroll-ledger-document.export-render td {
  padding: 2px 4px !important;
}

#staff-timesheet-document.export-render {
  background: #ffffff !important;
  color: #0f172a !important;
}

#staff-timesheet-document.export-render th,
#staff-timesheet-document.export-render td {
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid #cbd5e1 !important;
}

#staff-timesheet-document.export-render table {
  font-size: 9px !important;
}

#finance-bank-payment-document.export-render table {
  font-size: 10px !important;
}

#finance-bank-payment-document.export-render header {
  background-color: #fef3c7 !important;
  border-radius: 6px !important;
  padding: 12px 16px !important;
  text-align: center !important;
}

#vacancy-notice-document.export-render {
  padding: 24px !important;
}

.export-render .grid {
  display: grid !important;
  gap: 24px !important;
}

.export-render .md\\:grid-cols-2 {
  grid-template-columns: 1fr 1fr !important;
}

.export-render .org-legal-document,
.export-render.org-legal-document {
  font-family: ${LEGAL_DOCUMENT_FONT_FAMILY} !important;
  font-size: ${LEGAL_DOCUMENT_FONT_SIZE} !important;
  line-height: ${LEGAL_DOCUMENT_LINE_HEIGHT} !important;
}

.export-render .org-legal-document *,
.export-render.org-legal-document * {
  font-family: inherit !important;
}

.export-render .org-logo-document {
  display: flex !important;
  justify-content: center !important;
  margin-bottom: 16px !important;
}

.export-render .org-logo-image {
  object-fit: contain !important;
  background: transparent !important;
}
`;
