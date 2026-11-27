import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mappings } from './reviewedMappings';

test('icddr,b qualified rows map explicitly to canonical services with exact labels', () => {
  const expected: [string, string, string][] = [
    ['complete-blood-count', 'icddrb-cbc', 'Hemogram/CBC'],
    ['fasting-blood-sugar', 'icddrb-glucose-f', 'Glucose (F)'],
    ['fasting-lipid-profile', 'icddrb-lipid-profile', 'Lipid Profile'],
    ['alt', 'icddrb-alt', 'ALT (SGPT)'],
    ['thyroid-stimulating-hormone', 'icddrb-tsh', 'TSH'],
    ['urine-routine', 'icddrb-urine-rme', 'Urine RME'],
    ['covid-19-rt-pcr', 'icddrb-covid-rtpcr', 'Covid-19 Real Time RT PCR'],
  ];

  for (const [serviceId, sourceId, label] of expected) {
    const service = mappings.find((item) => item.id === serviceId);
    assert.ok(service, `Missing canonical service: ${serviceId}`);
    const selection = service.selections.find((item) => item.sourceId === sourceId);
    assert.deepEqual(selection, { sourceId, row: 1, label });
  }
});

test('DCIMCH qualified rows map explicitly to canonical services with exact codes and labels', () => {
  const expected: [string, number, string][] = [
    ['glucose-1h-after-75g', 324, '1HR AFTER 75GM GLUCOSE'],
    ['glucose-2h-after-75g', 211, '2HRS AFTER 75GM GLUCOSE'],
    ['albumin-globulin-ratio', 45, 'A/G RATIO (ALBUMIN & GLOBULIN) SERUM'],
    ['alt', 41, 'ALT (SGPT) BLOOD'],
    ['aptt', 91, 'APTT'],
    ['ast', 42, 'AST (SGOT) BLOOD'],
    ['serum-bilirubin-total', 40, 'BILIRUBIN TOTAL BLOOD'],
    ['blood-urea-nitrogen', 34, 'BUN'],
    ['complement-c3', 285, 'C3'],
    ['complement-c4', 286, 'C4'],
    ['ceruloplasmin', 563, 'CERULOPLASMIN BLOOD'],
    ['crp', 170, 'CRP (C-REACTIVE PROTEIN)'],
    ['fasting-blood-sugar', 31, 'FBS'],
    ['gamma-gt', 290, 'GAMMA-GT (GGT)'],
  ];

  for (const [serviceId, row, label] of expected) {
    const service = mappings.find((item) => item.id === serviceId);
    assert.ok(service, `Missing canonical service: ${serviceId}`);
    const selection = service.selections.find((item) => item.sourceId === 'dcimch-diagnostics');
    assert.deepEqual(selection, { sourceId: 'dcimch-diagnostics', row, label });
  }
});
