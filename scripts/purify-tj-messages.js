const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../messages/tj.json');
const tj = JSON.parse(fs.readFileSync(file, 'utf8'));

const updates = {
  siteDescription: 'Маркази лоиҳаҳо — портфолиои шахсӣ',
  username: 'Номи вуруд',
  registerUsernameExists: 'Ин номи вуруд аллакай мавҷуд аст',
  registerReservedUsername: 'Ин номи вуруд барои маъмур нигоҳ дошта шудааст',
  adminUsersTitle: 'Сабти номи вуруд ва иҷозатҳо',
  adminUsersAddHint: 'Номи вуруд, рамз, ҳолат ва иҷозатҳоро муайян кунед',
  invalidCredentials: 'Номи вуруд ё рамз нодуруст аст',
  projectUrl: 'Суроғаи пайванд',
  projectCategory: 'Гурӯҳ',
  viewGithub: 'Профили GitHub',
  adminDataSelectCategories: 'Интихоби функсияҳо барои чоп ва барунбар',
  adminDataCatTimesheets: 'Ҷадвалҳои ҳузур',
  actVeterinary: 'Ветеринарӣ',
  actFinance: 'Муҳосибот ва молия',
  financeDefaultSummary: 'Муҳосибот ва молияи марказ.',
  financeNavPayroll: 'Манбаи музди меҳнат',
  financeStatMonthlyPayroll: 'Манбаи моҳонаи музд',
  financeStatAnnualPayroll: 'Манбаи солонаи музд',
  financeBudgetPayrollShare: 'Манбаи музди меҳнат: {annual} ({percent}% аз буҷет)',
  financePayrollTitle: 'Манбаи музди меҳнат',
  financePayrollNoData: 'Манбаи музди меҳнат ёфт нашуд',
  financePayrollTotal: 'Ҷамъи манбаи моҳона',
  payrollLedgerColTabNo: '№ ҲИСОБ',
  bankPaymentSubtitle:
    'Музди меҳнат аз китоби музди меҳнат + ёрипулии суғуртаи иҷтимоӣ (ҳомиладорӣ, беморӣ) — барои чоп ва бонкинги интернетӣ',
  bankPaymentExport: 'Барунбар ба Эксел',
  documentExport: 'Барунбар',
  documentExportPdf: 'Ба формати PDF',
  documentExportWord: 'Ба формати Word',
  documentExportExcel: 'Ба формати Excel',
  documentExportError: 'Барунбар иҷро нашуд. Боз кӯшиш кунед.',
  bankPaymentMissingAccounts:
    '{count} корманд суратҳисоби бонкии 20-рақама надорад — дар варақаи «Воридот» дохил намешаванд.',
  bankPaymentImportHint:
    'Файли Эксел ду варақа дорад: «Варақа» (чоп) ва «Воридот» (суратҳисоб, маблағ, ном, тавзеҳ — барои бонкинги интернетӣ).',
  bankPaymentSheetImport: 'Воридот',
  positionHandoverLedgerHintText:
    'Пас аз захира, маблағи вогузоркунӣ ба сутуни «Иловапулиҳо» барои корманди қабулкунанда дар китоби музди меҳнати моҳи эътибор ворид мешавад. Маблағ аз рӯи рӯзҳои корӣ аз санаи эътибор (аз ҷадвали ҳузур) ҳисоб мешавад.',
  maternityLeaveBenefitPreview: 'Ҳисоби ёрипулӣ',
  maternityLeaveBenefitHint:
    'Ёрипулӣ аз ҳисоби суғуртаи давлатӣ пардохт мешавад (КМҶ моддаи 113). Миёнаи музд аз 3 моҳи пеш аз рухсат: ҷамъи музди ҳисобшуда ÷ рӯзҳои корӣ × рӯзҳои рухсат.',
  sickLeaveBenefitPreview: 'Ҳисоби ёрипулӣ',
  sickLeaveWageBasisTimeRate: 'Музди вақтӣ (ПҚҶ №313, нуқтаи 14)',
  sickLeaveWageBasisPremium: 'Премиявӣ — миёнаи 3 моҳ (нуқтаи 15)',
  sickLeaveBenefitCategory: 'Гурӯҳи фоизи ёрипулӣ',
  sickLeaveCategoryUnder8: '60% — таҷрибаи корӣ то 8 сол (Қонуни суғурта, моддаи 12)',
  sickLeaveCategory8Plus: '70% — таҷрибаи корӣ 8 сол ва зиёд',
  sickLeaveCategoryInjury: '100% — заҳри меҳнат (бе маҳдудияти 2× маоши вазифавӣ)',
  sickLeaveBenefitPercent: 'Фоизи ёрипулӣ',
  sickLeaveWageCappedNote: ' Музди моҳона ба 2× маоши вазифавӣ маҳдуд шуд (ПҚҶ №313, нуқтаи 16).',
  sickLeaveSavedLedgerMonth:
    'Захира шуд. Китоби музди меҳнат барои моҳи {month} навсозӣ шуд — рӯзҳои корношоямӣ дар ҷадвали ҳузур бо рамзи «б» қайд шуданд.',
  sickLeaveBenefitHint:
    'Ёрипулӣ аз Манбаи ҳифзи иҷтимоии аҳолӣ (КМҶ моддаи 217). ПҚҶ №313 нуқтаи 14: музди моҳона ÷ рӯзҳои кории меъёри моҳ × рӯзҳои кории беморӣ × фоиз (60–100%). Рӯзҳои истироҳат ҳисоб намешаванд. Нуқтаи 16: ҳадди аксар 2× маоши вазифавӣ (ҷудо аз заҳри меҳнат/касбӣ).',
  exportEmployees: 'Содирот ба ҷадвал',
  staffGrandTotalsTitle: 'Ҷамъи умумии манбаи музди меҳнат',
  staffNavTimesheet: 'Ҷадвали ҳузур',
  timesheetTitle: 'Ҷадвали ҳузур',
  timesheetSavedHint: 'Ҷадвал нигоҳ дошта шуд. Барои тағйир «Тағйир додан»-ро пахш кунед.',
  confirmDeleteTimesheet: 'Ҷадвали ин моҳро нест кунем?',
  staffStatMonthlyFund: 'Манбаи музди меҳнат',
};

Object.assign(tj, updates);
fs.writeFileSync(file, JSON.stringify(tj, null, 2) + '\n', 'utf8');
console.log('Updated', Object.keys(updates).length, 'keys in tj.json');
