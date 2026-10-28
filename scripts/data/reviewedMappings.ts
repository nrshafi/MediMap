export type Selection = { sourceId: string; row: number; label: string };
export type ServiceMapping = {
  id: string;
  name: string;
  category: string;
  aliases: { alias: string; language: 'en' | 'bn' }[];
  selections: Selection[];
};
const bio = 'addin-biochemistry',
  hem = 'addin-hematology',
  imm = 'addin-immunology',
  mic = 'addin-microbiology',
  ser = 'addin-serology',
  vir = 'addin-virology',
  path = 'addin-clinical-pathology',
  usg = 'addin-ultrasonography',
  xray = 'addin-radiology',
  mogh = 'mogh-tests';
function s(sourceId: string, row: number, label: string): Selection {
  return { sourceId, row, label };
}
function service(
  id: string,
  name: string,
  category: string,
  selections: Selection[],
  aliases: string[] = [],
): ServiceMapping {
  return {
    id,
    name,
    category,
    selections,
    aliases: aliases.map((alias) => ({ alias, language: 'en' })),
  };
}
// Each selection is a reviewed row and exact label, not a fuzzy or automatic clinical mapping.
export const mappings: ServiceMapping[] = [
  service(
    'complete-blood-count',
    'Complete Blood Count',
    'Hematology',
    [s(hem, 1, 'CBC'), s(mogh, 11, 'CBC (Govt Rate)')],
    ['CBC', 'Full Blood Count', 'FBC'],
  ),
  service(
    'fasting-blood-sugar',
    'Fasting Blood Sugar',
    'Biochemistry',
    [s(bio, 1, 'FBS (Fasting Plasma Glucose)'), s(mogh, 7, 'Blood Sugar Fasting')],
    ['FBS', 'Fasting Blood Glucose'],
  ),
  service(
    'random-blood-sugar',
    'Random Blood Sugar',
    'Biochemistry',
    [s(bio, 6, 'RBS (Random Blood Sugar)'), s(mogh, 9, 'Blood Sugar Random')],
    ['RBS'],
  ),
  service(
    'post-prandial-blood-sugar',
    'Post-prandial Blood Sugar',
    'Biochemistry',
    [s(bio, 5, 'PPBS (Post Prandial Blood Sugar)')],
    ['PPBS'],
  ),
  service('glucose-2h-after-75g', 'Blood Glucose, 2 Hours After 75 g Glucose', 'Biochemistry', [
    s(bio, 71, '2 hrs after 75 gm Glucose'),
    s(mogh, 3, 'B. Sugar After 2 Hrs 75G Glucose'),
  ]),
  service('glucose-1h-after-75g', 'Blood Glucose, 1 Hour After 75 g Glucose', 'Biochemistry', [
    s(bio, 70, '1 hrs after 75 gm Glucose'),
  ]),
  service('glucose-1h-after-100g', 'Blood Glucose, 1 Hour After 100 g Glucose', 'Biochemistry', [
    s(bio, 2, '1 hr after 100 gm Glucose'),
  ]),
  service('glucose-2h-after-100g', 'Blood Glucose, 2 Hours After 100 g Glucose', 'Biochemistry', [
    s(bio, 3, '2 hrs after 100 gm glucose'),
  ]),
  service('glucose-3h-after-100g', 'Blood Glucose, 3 Hours After 100 g Glucose', 'Biochemistry', [
    s(bio, 4, '3 hrs after 100 gm Glucose'),
  ]),
  service('ogtt-75g-two-samples', 'OGTT, 75 g Glucose, 2 Samples', 'Biochemistry', [
    s(bio, 76, 'OGTT with 75gm Glucose (2 Samples)'),
  ]),
  service('ogtt-75g-three-samples', 'OGTT, 75 g Glucose, 3 Samples', 'Biochemistry', [
    s(bio, 77, 'OGTT with 75gm Glucose (3 Sample)'),
  ]),
  service(
    'hba1c',
    'HbA1c',
    'Biochemistry',
    [s(bio, 39, 'HbA1C (Glycated Hemoglobin)'), s(mogh, 20, 'HbA1c')],
    ['Glycated Hemoglobin', 'Hemoglobin A1c'],
  ),
  service(
    'lipid-profile',
    'Lipid Profile',
    'Biochemistry',
    [s(bio, 41, 'Lipid Profile'), s(mogh, 25, 'Lipid Profile')],
    ['Lipid Panel'],
  ),
  service('fasting-lipid-profile', 'Fasting Lipid Profile', 'Biochemistry', [
    s(bio, 46, 'Fasting Lipid Profile'),
  ]),
  service('serum-total-cholesterol', 'Serum Total Cholesterol', 'Biochemistry', [
    s(bio, 12, 'S. Cholesterol (Total)'),
    s(mogh, 40, 'Serum Cholesterol'),
  ]),
  service('hdl-cholesterol', 'HDL Cholesterol', 'Biochemistry', [
    s(bio, 13, 'S. Cholesterol (HDL)'),
  ]),
  service('ldl-cholesterol', 'LDL Cholesterol', 'Biochemistry', [s(bio, 14, 'LDL-Cholesterol')]),
  service('serum-triglycerides', 'Serum Triglycerides', 'Biochemistry', [
    s(bio, 15, 'S. Triglycerides'),
  ]),
  service('urea', 'Urea', 'Biochemistry', [s(bio, 8, 'Urea'), s(mogh, 46, 'Urea')]),
  service(
    'blood-urea-nitrogen',
    'Blood Urea Nitrogen',
    'Biochemistry',
    [s(bio, 9, 'BUN (Blood Urea Nitrogen)')],
    ['BUN'],
  ),
  service('uric-acid', 'Uric Acid', 'Biochemistry', [
    s(bio, 7, 'Uric Acid'),
    s(mogh, 42, 'Serum Uric Acid'),
  ]),
  service('serum-bilirubin-total', 'Serum Bilirubin, Total', 'Biochemistry', [
    s(bio, 16, 'S. Bilirubin, Total'),
    s(mogh, 38, 'Serum Bilirubin (Total)'),
  ]),
  service('bilirubin-direct', 'Bilirubin, Direct', 'Biochemistry', [
    s(bio, 17, 'Bilirubin, Direct'),
  ]),
  service('serum-bilirubin-indirect', 'Serum Bilirubin, Indirect', 'Biochemistry', [
    s(bio, 18, 'S. Bilirubin (Indirect)'),
  ]),
  service(
    'ast',
    'AST',
    'Biochemistry',
    [s(bio, 20, 'SGOT (AST)'), s(mogh, 43, 'SGOT (AST)')],
    ['SGOT'],
  ),
  service(
    'alt',
    'ALT',
    'Biochemistry',
    [s(bio, 21, 'SGPT (ALT)'), s(mogh, 44, 'SGPT (ALT)')],
    ['SGPT'],
  ),
  service('gamma-gt', 'Gamma-GT', 'Biochemistry', [s(bio, 19, 'Gamma-GT (GGT)')], ['GGT']),
  service('serum-alkaline-phosphatase', 'Serum Alkaline Phosphatase', 'Biochemistry', [
    s(bio, 22, 'S. Alkaline Phosphatase'),
  ]),
  service('total-protein', 'Total Protein', 'Biochemistry', [
    s(bio, 23, 'Protein, total'),
    s(mogh, 29, 'Protein: Total'),
  ]),
  service('serum-albumin', 'Serum Albumin', 'Biochemistry', [s(bio, 24, 'S. Albumin (ALB)')]),
  service('albumin-globulin-ratio', 'Albumin/Globulin Ratio', 'Biochemistry', [
    s(bio, 26, 'A/G Ratio'),
    s(mogh, 28, 'Protein: A.G.Ratio'),
  ]),
  service('serum-amylase', 'Serum Amylase', 'Biochemistry', [
    s(bio, 29, 'S. Amylase'),
    s(mogh, 37, 'Serum Amylase'),
  ]),
  service('lipase', 'Lipase', 'Biochemistry', [s(bio, 56, 'Lipase')]),
  service('serum-calcium', 'Serum Calcium', 'Biochemistry', [
    s(bio, 31, 'S. Calcium'),
    s(mogh, 39, 'Serum Calcium'),
  ]),
  service('serum-magnesium', 'Serum Magnesium', 'Biochemistry', [s(bio, 59, 'S. Magnesium')]),
  service('serum-zinc', 'Serum Zinc', 'Biochemistry', [s(bio, 60, 'S. Zinc')]),
  service('serum-ferritin', 'Serum Ferritin', 'Biochemistry', [
    s(bio, 35, 'S. Ferritin'),
    s(mogh, 35, 'S. Ferritin (Govt Rate)'),
  ]),
  service(
    'tibc',
    'Total Iron Binding Capacity',
    'Biochemistry',
    [s(bio, 34, 'TIBC (Total Iron Binding Capacity)')],
    ['TIBC'],
  ),
  service('troponin-i', 'Troponin I', 'Biochemistry', [s(bio, 25, 'Troponin – I')]),
  service('ldh', 'LDH', 'Biochemistry', [s(bio, 28, 'S. LDH')]),
  service('ck-mb', 'CK-MB', 'Biochemistry', [s(bio, 57, 'S. CK-MB')]),
  service('vitamin-b12', 'Vitamin B12', 'Biochemistry', [s(bio, 58, 'Vitamin B 12')]),
  service('vitamin-d-total', 'Vitamin D, Total', 'Biochemistry', [s(bio, 89, 'Vitamin-D (Total)')]),
  service('vitamin-d3', 'Vitamin D3 Level', 'Biochemistry', [s(mogh, 63, 'Vita D3 Level')]),
  service(
    'crp',
    'C-Reactive Protein',
    'Biochemistry',
    [s(bio, 82, 'CRP (C-Reactive Protein)'), s(mogh, 14, 'CRP (Govt Rate)')],
    ['CRP'],
  ),
  service('ceruloplasmin', 'Ceruloplasmin', 'Biochemistry', [s(bio, 83, 'Ceruloplasmin')]),
  service('fibrinogen', 'Fibrinogen', 'Hematology', [s(bio, 85, 'Fibrinogen')]),
  service('aptt', 'APTT', 'Hematology', [s(bio, 84, 'APTT')]),
  service('factor-viii-assay', 'Factor VIII Assay', 'Hematology', [
    s(bio, 87, 'Factor VIII Assay'),
  ]),
  service('factor-ix-assay', 'Factor IX Assay', 'Hematology', [s(bio, 88, 'Factor IX Assay')]),
  service('prothrombin-time', 'Prothrombin Time', 'Hematology', [
    s(bio, 40, 'Prothrombin Time'),
    s(mogh, 30, 'Prothrombin Time'),
  ]),
  service('hemoglobin', 'Hemoglobin', 'Hematology', [s(hem, 2, 'HB %'), s(mogh, 19, 'Hb%')]),
  service('platelet-count', 'Platelet Count', 'Hematology', [
    s(hem, 3, 'PC (Platelet Count)'),
    s(mogh, 27, 'Platelet Count (PC)'),
  ]),
  service('hematocrit', 'Hematocrit', 'Hematology', [s(hem, 4, 'Hct (Hematocrit)')]),
  service('mcv', 'MCV', 'Hematology', [s(hem, 6, 'MCV')]),
  service('mch', 'MCH', 'Hematology', [s(hem, 7, 'MCH')]),
  service('mchc', 'MCHC', 'Hematology', [s(hem, 8, 'MCHC')]),
  service('esr', 'ESR', 'Hematology', [s(hem, 9, 'ESR'), s(mogh, 18, 'ESR')]),
  service('reticulocyte-count', 'Reticulocyte Count', 'Hematology', [
    s(hem, 18, 'Reticulocyte Count'),
  ]),
  service('bleeding-and-clotting-time', 'Bleeding and Clotting Time', 'Hematology', [
    s(hem, 19, 'BT & CT'),
    s(mogh, 10, 'BT CT'),
  ]),
  service(
    'thyroid-stimulating-hormone',
    'Thyroid Stimulating Hormone (TSH)',
    'Immunology',
    [s(imm, 3, 'TSH'), s(mogh, 62, 'TSH')],
    ['TSH'],
  ),
  service('t3', 'T3', 'Immunology', [s(imm, 1, 'T3'), s(mogh, 58, 'T3')]),
  service('t4', 'T4', 'Immunology', [s(imm, 2, 'T4'), s(mogh, 60, 'T4')]),
  service(
    'free-t3',
    'Free T3',
    'Immunology',
    [s(imm, 4, 'FT3'), s(mogh, 52, 'FT3 (Free T3)')],
    ['FT3'],
  ),
  service(
    'free-t4',
    'Free T4',
    'Immunology',
    [s(imm, 5, 'FT4'), s(mogh, 53, 'FT4 (Free T4)')],
    ['FT4'],
  ),
  service('t3-t4-tsh-panel', 'T3, T4 and TSH Panel', 'Immunology', [
    s(imm, 6, 'T3, T4, TSH'),
    s(mogh, 59, 'T3, T4, TSH'),
  ]),
  service('free-t3-free-t4-tsh-panel', 'Free T3, Free T4 and TSH Panel', 'Immunology', [
    s(imm, 7, 'FT3, FT4, TSH'),
  ]),
  service('prolactin', 'Prolactin', 'Immunology', [
    s(imm, 9, 'S. Prolactin'),
    s(mogh, 57, 'Prolactin'),
  ]),
  service('testosterone', 'Testosterone', 'Immunology', [
    s(imm, 10, 'Testosterone'),
    s(mogh, 61, 'Testosterone'),
  ]),
  service('fsh', 'FSH', 'Immunology', [s(imm, 11, 'FSH'), s(mogh, 51, 'FSH')]),
  service('lh', 'LH', 'Immunology', [s(imm, 12, 'LH'), s(mogh, 54, 'LH')]),
  service('oestrogen', 'Oestrogen', 'Immunology', [
    s(imm, 13, 'Oestrogen'),
    s(mogh, 55, 'Oestrogen'),
  ]),
  service('estradiol', 'Estradiol', 'Immunology', [s(imm, 14, 'Estradiol')]),
  service('progesterone', 'Progesterone', 'Immunology', [
    s(imm, 15, 'Progesterone'),
    s(mogh, 56, 'Progesterone'),
  ]),
  service('acth', 'ACTH', 'Immunology', [s(imm, 16, 'ACTH')]),
  service(
    'parathyroid-hormone',
    'Parathyroid Hormone',
    'Immunology',
    [s(imm, 17, 'PTH (Parathyroid Hormone)')],
    ['PTH'],
  ),
  service('procalcitonin', 'Procalcitonin', 'Immunology', [
    s(imm, 18, 'Pro Calcitonin'),
    s(mogh, 36, 'S. Procalcitonin (Govt Rate)'),
  ]),
  service('growth-hormone', 'Growth Hormone', 'Immunology', [s(imm, 19, 'Growth Hormone (GH)')]),
  service('cortisol', 'Cortisol', 'Immunology', [s(imm, 20, 'Cortisol')]),
  service('free-psa', 'Free PSA', 'Immunology', [s(imm, 22, 'Free PSA')]),
  service('total-psa', 'Total PSA', 'Immunology', [
    s(imm, 45, 'PSA (Total Prostate Specific Antigen)'),
  ]),
  service('cea', 'CEA', 'Immunology', [s(imm, 23, 'CEA')]),
  service('ca-19-9', 'CA 19-9', 'Immunology', [s(imm, 24, 'CA – 19-9')]),
  service('ca-125', 'CA 125', 'Immunology', [s(imm, 25, 'CA 125')]),
  service('ca-15-3', 'CA 15.3', 'Immunology', [s(imm, 46, 'CA 15.3')]),
  service('anti-ccp', 'Anti-CCP', 'Immunology', [s(imm, 47, 'Anti CCP')]),
  service('igm', 'IgM', 'Immunology', [s(imm, 36, 'S. IgM')]),
  service('igg', 'IgG', 'Immunology', [s(imm, 35, 'S. IgG')]),
  service('iga', 'IgA', 'Immunology', [s(imm, 37, 'S. IgA')]),
  service('ige', 'IgE', 'Immunology', [s(imm, 38, 'S. IgE')]),
  service('complement-c3', 'Complement C3', 'Immunology', [s(imm, 42, 'C3')]),
  service('complement-c4', 'Complement C4', 'Immunology', [s(imm, 43, 'C4')]),
  service(
    'urine-routine',
    'Urine Routine Examination',
    'Clinical Pathology',
    [s(path, 8, 'URINE R/M/E'), s(mogh, 95, 'Urine R/M/E')],
    ['Urine R/M/E'],
  ),
  service('stool-routine', 'Stool Routine Examination', 'Clinical Pathology', [
    s(path, 1, 'Stool R/E'),
    s(mogh, 82, 'Stool R/E'),
  ]),
  service('stool-occult-blood', 'Stool Occult Blood Test', 'Clinical Pathology', [
    s(path, 3, 'OBT (Occult Blood Test)'),
    s(mogh, 81, 'Stool OBT'),
  ]),
  service('semen-analysis', 'Semen Analysis', 'Clinical Pathology', [
    s(path, 17, 'SEMEN ANALYSIS'),
    s(mogh, 79, 'Semen Analysis'),
  ]),
  service('mantoux-test', 'Mantoux Test', 'Clinical Pathology', [
    s(path, 18, 'MT (Mantoux Test)'),
    s(mogh, 77, 'MT Test'),
  ]),
  service('urine-pregnancy-test', 'Urine Pregnancy Test', 'Serology', [
    s(ser, 7, 'Urine Pregnancy Test'),
    s(mogh, 94, 'Urine Pregnancy Test'),
  ]),
  service('vdrl', 'VDRL', 'Serology', [s(ser, 10, 'VDRL'), s(mogh, 47, 'VDRL')]),
  service('tpha', 'TPHA', 'Serology', [s(ser, 11, 'TPHA'), s(mogh, 45, 'TPHA')]),
  service('widal-test', 'Widal Test', 'Serology', [
    s(ser, 12, 'Widal Test'),
    s(mogh, 48, 'Widal Test'),
  ]),
  service('aso-titre', 'ASO Titre', 'Serology', [s(ser, 5, 'ASO Titre')]),
  service('hbsag-screening', 'HBsAg Screening Test', 'Serology', [
    s(ser, 9, 'HBsAg (Screening Test)'),
  ]),
  service('hbsag-latex', 'HBsAg, Latex', 'Serology', [s(mogh, 21, 'HbsAg (Latex)')]),
  service('hbsag-confirmatory', 'HBsAg Confirmatory Test', 'Serology', [
    s(mogh, 22, 'HbsAg Confirmatory'),
  ]),
  service('hbsag-elisa', 'HBsAg, ELISA', 'Virology', [s(vir, 25, 'HBsAg (ELISA)')]),
  service('dengue-antibody', 'Dengue Antibody IgG/IgM', 'Serology', [
    s(mogh, 16, 'Dengue (IgG+IgM) Antibody (Govt Rate)'),
  ]),
  service('dengue-antibody-ict', 'Dengue Antibody IgM and IgG, ICT', 'Serology', [
    s(ser, 21, 'Anti-Dengue IgM & IgG (ICT)'),
  ]),
  service('dengue-igm-elisa', 'Dengue IgM, ELISA', 'Virology', [
    s(vir, 7, 'Anti-Dengue IgM (ELISA)'),
  ]),
  service('dengue-igg-elisa', 'Dengue IgG, ELISA', 'Virology', [
    s(vir, 8, 'Anti-Dengue IgG (ELISA)'),
  ]),
  service(
    'dengue-ns1-antigen',
    'Dengue NS1 Antigen',
    'Serology',
    [s(mogh, 17, 'Dengue NS1 (Antigen) (Govt Rate)')],
    ['Dengue NS1'],
  ),
  service('blood-culture-sensitivity', 'Blood Culture and Sensitivity', 'Microbiology', [
    s(mic, 8, 'C & S (Blood)'),
    s(mogh, 64, 'Blood for C/S'),
  ]),
  service('blood-culture-anaerobic', 'Blood Culture and Sensitivity, Anaerobic', 'Microbiology', [
    s(mic, 9, 'C & S Blood (Anaerobic)'),
  ]),
  service('urine-culture-sensitivity', 'Urine Culture and Sensitivity', 'Microbiology', [
    s(mic, 10, 'C & S (Urine)'),
    s(mogh, 93, 'Urine C/S'),
  ]),
  service('stool-culture-sensitivity', 'Stool Culture and Sensitivity', 'Microbiology', [
    s(mic, 11, 'C & S (Stool)'),
    s(mogh, 80, 'Stool C/S'),
  ]),
  service('pus-culture-sensitivity', 'Pus Culture and Sensitivity', 'Microbiology', [
    s(mic, 22, 'C & S (Pus)'),
    s(mogh, 67, 'PUS for C/S'),
  ]),
  service(
    'throat-swab-culture-sensitivity',
    'Throat Swab Culture and Sensitivity',
    'Microbiology',
    [s(mic, 19, 'C & S (Throat Swab) (T/S)'), s(mogh, 70, 'Throat Swab: C/S')],
  ),
  service('hvs-culture-sensitivity', 'High Vaginal Swab Culture and Sensitivity', 'Microbiology', [
    s(mic, 6, 'C/S (HVS)'),
    s(mogh, 65, 'HVS: C/S'),
  ]),
  service(
    'electrocardiogram',
    'Electrocardiogram (ECG)',
    'Cardiology',
    [s(mogh, 71, 'ECG')],
    ['ECG'],
  ),
  service(
    'usg-whole-abdomen',
    'USG of Whole Abdomen',
    'Ultrasonography',
    [s(usg, 5, 'Whole Abdomen (W/A)'), s(mogh, 92, 'Whole Abdomen')],
    ['USG Whole Abdomen'],
  ),
  service('usg-whole-abdomen-pvr', 'USG of Whole Abdomen with PVR', 'Ultrasonography', [
    s(usg, 6, 'W/A + PVR'),
  ]),
  service('usg-lower-abdomen', 'USG of Lower Abdomen', 'Ultrasonography', [
    s(usg, 8, 'Lower Abdomen'),
    s(mogh, 89, 'Lower Abdomen'),
  ]),
  service('usg-thyroid', 'USG of Thyroid', 'Ultrasonography', [
    s(usg, 7, 'Thyroid'),
    s(mogh, 90, 'Thyroid'),
  ]),
  service('usg-kub', 'USG of KUB', 'Ultrasonography', [s(usg, 12, 'KUB'), s(mogh, 87, 'KUB')]),
  service(
    'transvaginal-ultrasound',
    'Transvaginal Ultrasound',
    'Ultrasonography',
    [s(usg, 9, 'TVS'), s(mogh, 91, 'TVS')],
    ['TVS'],
  ),
  service(
    'xray-chest',
    'X-Ray Chest P/A View',
    'Radiology',
    [s(mogh, 98, 'Chest P/A View')],
    ['Chest X-ray P/A'],
  ),
  service('xray-right-knee-bv', 'Right Knee X-Ray, B/V', 'Radiology', [
    s(xray, 49, 'Rt. Knee joint B/V'),
  ]),
  service('xray-left-knee-bv', 'Left Knee X-Ray, B/V', 'Radiology', [
    s(xray, 50, 'Lt. Knee joint B/V'),
    s(mogh, 103, 'Left Knee Joint B/V'),
  ]),
  service('xray-both-knees-bv', 'Both Knees X-Ray, B/V', 'Radiology', [
    s(xray, 52, 'Both Knee joint B/V'),
    s(mogh, 96, 'Both Knee Joint B/V'),
  ]),
  service('xray-cervical-spine-bv', 'Cervical Spine X-Ray, B/V', 'Radiology', [
    s(xray, 16, 'Cervical spine B/V view'),
    s(mogh, 97, 'Cervical Spine B/V'),
  ]),
  service('xray-cervical-spine-ap', 'Cervical Spine X-Ray, A/P', 'Radiology', [
    s(xray, 17, 'Cervical spine A/P view'),
  ]),
  service('xray-cervical-spine-lateral', 'Cervical Spine X-Ray, Lateral', 'Radiology', [
    s(xray, 18, 'Cervical spine Lateral view'),
  ]),
  service('xray-right-shoulder-bv', 'Right Shoulder X-Ray, B/V', 'Radiology', [
    s(xray, 74, 'Rt. Shoulder B/V'),
  ]),
  service('xray-left-shoulder-bv', 'Left Shoulder X-Ray, B/V', 'Radiology', [
    s(xray, 75, 'Lt. Shoulder B/V'),
  ]),
  service('covid-19-rt-pcr', 'COVID-19 RT-PCR', 'PCR', [
    s('holy-family-covid', 1, 'RT-PCR TEST for Covid-19'),
    s(vir, 27, 'COVID-19-RT-PCR'),
  ]),
  service('covid-19-antigen-rapid', 'COVID-19 Antigen Rapid Test', 'Serology', [
    s('holy-family-covid', 2, 'Covid-19 Rapid Antigen Test'),
  ]),
];

export const publicationHolds: Record<string, string> = {
  'mogh-tests:12':
    'CBC/CP is an alternative provider label; its equivalence to the separately listed CBC is not established.',
  'mogh-tests:33':
    'The published creatinine amount is retained in research; its outlying value needs additional confirmation before publication.',
  'mogh-tests:34':
    'Possible same-service conflict with Serum Electrolytes at row 41. Do not select the lower price.',
  'mogh-tests:41':
    'Possible same-service conflict with S. Electrolytes at row 34. Do not select the lower price.',
  'addin-biochemistry:10':
    'Creatinine specimen wording remains unspecified; do not assume serum when other rows explicitly identify urine.',
  'addin-biochemistry:55':
    'Folate and folic-acid rows have different amounts and incomplete variant details. Further mapping review is required.',
  'addin-biochemistry:61':
    'Folic acid and folate rows have different amounts and incomplete variant details. Further mapping review is required.',
};
