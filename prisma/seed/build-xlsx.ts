import { writeXlsx } from '@/utils/xlsx-writer';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main(): Promise<void> {
  const rows: string[][] = [
    ['district', 'commodity', 'activities', 'participants', 'reporting_period'],
    ['Ranchi', 'Lac', '12', '480', 'FY 2025-2026'],
    ['Gumla', 'Honey', '9', '315', 'FY 2025-2026'],
    ['Khunti', 'Ragi / Millets', '11', '402', 'FY 2025-2026'],
    ['Simdega', 'Sal Seed', '7', '226', 'FY 2025-2026'],
    ['Lohardaga', 'Tamarind', '8', '251', 'FY 2025-2026'],
  ];
  const bytes = writeXlsx(rows);
  await writeFile(path.resolve('prisma/seed/assets/dashboard-dataset.xlsx'), bytes);
  console.log('Fixture XLSX created.');
}

void main();
