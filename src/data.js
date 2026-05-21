// Mock data for "ครัวคุณยาย" — a Thai restaurant chain
// LV1-LV10. Departments: ผู้บริหาร, ปฏิบัติการ, ครัว, การตลาด, การเงิน, บุคคล, เทคโนโลยี
// Each person: { id, name, role (EN), lv, deptId, parentId, photo?, branchId? }

window.SEED_DATA = (() => {
  const people = [];
  const departments = [
    { id: 'd-exec', name: 'ผู้บริหาร', nameEn: 'Executive', color: '#FF6B47' },
    { id: 'd-ops',  name: 'ปฏิบัติการสาขา', nameEn: 'Operations', color: '#FF8A3D' },
    { id: 'd-kitchen', name: 'ครัวกลาง', nameEn: 'Central Kitchen', color: '#FFC857' },
    { id: 'd-mkt',  name: 'การตลาด', nameEn: 'Marketing', color: '#B89BE5' },
    { id: 'd-fin',  name: 'การเงินและบัญชี', nameEn: 'Finance & Accounting', color: '#4FD1A5' },
    { id: 'd-hr',   name: 'ทรัพยากรบุคคล', nameEn: 'People', color: '#FFB5BA' },
    { id: 'd-tech', name: 'เทคโนโลยี', nameEn: 'Technology', color: '#7CC4F0' },
  ];

  const add = (p) => { people.push(p); return p.id; };

  // ── Executive ─────────────────────────────────────────
  add({ id: 'p001', name: 'สมหญิง วงศ์สุวรรณ', role: 'Founder & CEO', lv: 10, deptId: 'd-exec', parentId: null });
  add({ id: 'p002', name: 'ธนา จิตต์ประเสริฐ', role: 'Chief Operating Officer', lv: 9, deptId: 'd-exec', parentId: 'p001' });
  add({ id: 'p003', name: 'ศรัณยา เพ็ชรเงิน', role: 'Chief Marketing Officer', lv: 9, deptId: 'd-exec', parentId: 'p001' });
  add({ id: 'p004', name: 'วีรชัย ตันสกุล', role: 'Chief Financial Officer', lv: 9, deptId: 'd-exec', parentId: 'p001' });
  add({ id: 'p005', name: 'นภาพร อินทร์ทอง', role: 'Chief People Officer', lv: 9, deptId: 'd-exec', parentId: 'p001' });
  add({ id: 'p006', name: 'กิตติศักดิ์ ภูริทัศน์', role: 'Chief Technology Officer', lv: 9, deptId: 'd-exec', parentId: 'p001' });

  // ── Operations (under COO) ────────────────────────────
  add({ id: 'p010', name: 'พงษ์ศักดิ์ สังข์ทอง', role: 'Director, North Region', lv: 8, deptId: 'd-ops', parentId: 'p002' });
  add({ id: 'p011', name: 'อภิญญา รัตนพันธ์', role: 'Director, South Region',  lv: 8, deptId: 'd-ops', parentId: 'p002' });
  add({ id: 'p012', name: 'สมชาย ใจดี',         role: 'Director, Bangkok',     lv: 8, deptId: 'd-ops', parentId: 'p002' });

  // Bangkok area managers
  add({ id: 'p020', name: 'ภัทรา สุขสมบูรณ์', role: 'Area Manager, Sukhumvit', lv: 7, deptId: 'd-ops', parentId: 'p012' });
  add({ id: 'p021', name: 'ณรงค์ฤทธิ์ พรหมมา', role: 'Area Manager, Siam',     lv: 7, deptId: 'd-ops', parentId: 'p012' });

  // Sukhumvit branches
  add({ id: 'p030', name: 'มาลี ศรีสวัสดิ์',      role: 'Branch Manager · Asoke',  lv: 6, deptId: 'd-ops', parentId: 'p020' });
  add({ id: 'p031', name: 'จักรกฤษณ์ พรหมเทพ',   role: 'Branch Manager · Thonglor', lv: 6, deptId: 'd-ops', parentId: 'p020' });

  // Asoke branch staff
  add({ id: 'p040', name: 'สุรีย์รัตน์ จันทร์เพ็ญ', role: 'Asst. Branch Manager',  lv: 5, deptId: 'd-ops', parentId: 'p030' });
  add({ id: 'p041', name: 'อนุชา พันธ์เพ็ง',      role: 'Floor Captain',          lv: 5, deptId: 'd-ops', parentId: 'p030' });
  add({ id: 'p042', name: 'กมลชนก แก้วใส',        role: 'Sr. Server',             lv: 4, deptId: 'd-ops', parentId: 'p041' });
  add({ id: 'p043', name: 'นันทพร เกตุแก้ว',       role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p041' });
  add({ id: 'p044', name: 'พีระพล วัฒนกุล',       role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p041' });
  add({ id: 'p045', name: 'อรอนงค์ สังข์ทอง',     role: 'Cashier',               lv: 3, deptId: 'd-ops', parentId: 'p040' });
  add({ id: 'p046', name: 'ชนะชัย ไทรงาม',        role: 'Host',                  lv: 2, deptId: 'd-ops', parentId: 'p040' });

  // Thonglor staff
  add({ id: 'p050', name: 'ปิยะพร เทียนทอง', role: 'Asst. Branch Manager', lv: 5, deptId: 'd-ops', parentId: 'p031' });
  add({ id: 'p051', name: 'ฐิติพงษ์ บัวขาว',   role: 'Floor Captain',        lv: 5, deptId: 'd-ops', parentId: 'p031' });
  add({ id: 'p052', name: 'ศิริพร เพ็ชรล้อม',  role: 'Sr. Server',            lv: 4, deptId: 'd-ops', parentId: 'p051' });
  add({ id: 'p053', name: 'ธีระพงศ์ จันทร์เกษม', role: 'Server',              lv: 3, deptId: 'd-ops', parentId: 'p051' });
  add({ id: 'p054', name: 'พัชราภา ทองสุข',     role: 'Server',              lv: 3, deptId: 'd-ops', parentId: 'p051' });

  // Siam branches
  add({ id: 'p060', name: 'เกษม วิเชียรชัย', role: 'Branch Manager · Paragon', lv: 6, deptId: 'd-ops', parentId: 'p021' });
  add({ id: 'p061', name: 'รัตนา พิทักษ์',      role: 'Branch Manager · Central World', lv: 6, deptId: 'd-ops', parentId: 'p021' });
  add({ id: 'p062', name: 'อนงค์นุช วีระศักดิ์', role: 'Asst. Branch Manager', lv: 5, deptId: 'd-ops', parentId: 'p060' });
  add({ id: 'p063', name: 'ปรีชา เพ็ชรเรือง',    role: 'Floor Captain',        lv: 5, deptId: 'd-ops', parentId: 'p060' });
  add({ id: 'p064', name: 'วรรณวิภา สุขใจ',      role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p063' });
  add({ id: 'p065', name: 'นิรันดร์ สิริชัย',     role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p063' });

  // North region
  add({ id: 'p070', name: 'สรวิชญ์ คำมา', role: 'Area Manager, Chiang Mai', lv: 7, deptId: 'd-ops', parentId: 'p010' });
  add({ id: 'p071', name: 'จิราภรณ์ ปัญญา', role: 'Branch Manager · Nimman', lv: 6, deptId: 'd-ops', parentId: 'p070' });
  add({ id: 'p072', name: 'วุฒิชัย ดวงแก้ว',  role: 'Asst. Branch Manager', lv: 5, deptId: 'd-ops', parentId: 'p071' });
  add({ id: 'p073', name: 'ทิพวรรณ คำดี',    role: 'Floor Captain',        lv: 5, deptId: 'd-ops', parentId: 'p071' });
  add({ id: 'p074', name: 'พิมพ์พิชชา ขำดี', role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p073' });

  // South region
  add({ id: 'p080', name: 'ฮาริส อาแว', role: 'Area Manager, Phuket', lv: 7, deptId: 'd-ops', parentId: 'p011' });
  add({ id: 'p081', name: 'นูรีย๊ะ ฮาซัน', role: 'Branch Manager · Patong', lv: 6, deptId: 'd-ops', parentId: 'p080' });
  add({ id: 'p082', name: 'สมศักดิ์ ทะเลใส', role: 'Asst. Branch Manager', lv: 5, deptId: 'd-ops', parentId: 'p081' });
  add({ id: 'p083', name: 'อมรรัตน์ ชายทะเล', role: 'Floor Captain',        lv: 5, deptId: 'd-ops', parentId: 'p081' });
  add({ id: 'p084', name: 'ภานุพงศ์ บัวบาน',   role: 'Server',                lv: 3, deptId: 'd-ops', parentId: 'p083' });

  // ── Central Kitchen (under COO) ───────────────────────
  add({ id: 'p100', name: 'เชฟปรีดา ทองอิน', role: 'Executive Chef',       lv: 8, deptId: 'd-kitchen', parentId: 'p002' });
  add({ id: 'p101', name: 'นรา พรประเสริฐ',   role: 'Head Chef · Thai',    lv: 6, deptId: 'd-kitchen', parentId: 'p100' });
  add({ id: 'p102', name: 'ไอวอน เพิร์ค',     role: 'Head Chef · Pastry',  lv: 6, deptId: 'd-kitchen', parentId: 'p100' });
  add({ id: 'p103', name: 'ดนัย แสงทอง',      role: 'Sous Chef',            lv: 5, deptId: 'd-kitchen', parentId: 'p101' });
  add({ id: 'p104', name: 'พรพิมล สมทรง',     role: 'Line Cook',            lv: 3, deptId: 'd-kitchen', parentId: 'p103' });
  add({ id: 'p105', name: 'ชนินทร์ บุญมา',     role: 'Line Cook',            lv: 3, deptId: 'd-kitchen', parentId: 'p103' });
  add({ id: 'p106', name: 'เมธาวี ปานทอง',     role: 'Pastry Chef',          lv: 4, deptId: 'd-kitchen', parentId: 'p102' });
  add({ id: 'p107', name: 'อิสรา เพ็ชรงาม',    role: 'Quality Control Lead', lv: 6, deptId: 'd-kitchen', parentId: 'p100' });

  // ── Marketing (under CMO) ─────────────────────────────
  add({ id: 'p200', name: 'ธันยพร ปานทอง',  role: 'Marketing Director',   lv: 8, deptId: 'd-mkt', parentId: 'p003' });
  add({ id: 'p201', name: 'พิมพ์ลภัส ขุนแก้ว', role: 'Brand Manager',        lv: 6, deptId: 'd-mkt', parentId: 'p200' });
  add({ id: 'p202', name: 'อิสริยะ สาธิตชน',  role: 'Digital Marketing Lead', lv: 6, deptId: 'd-mkt', parentId: 'p200' });
  add({ id: 'p203', name: 'รวิวรรณ จันทรา',   role: 'Content Manager',      lv: 5, deptId: 'd-mkt', parentId: 'p202' });
  add({ id: 'p204', name: 'ปุญญิศา เพ็ชรล้ำ',  role: 'Social Media Specialist', lv: 3, deptId: 'd-mkt', parentId: 'p203' });
  add({ id: 'p205', name: 'ปวีณ์ธิดา หาญสมบัติ', role: 'Graphic Designer',   lv: 3, deptId: 'd-mkt', parentId: 'p201' });

  // ── Finance (under CFO) ───────────────────────────────
  add({ id: 'p300', name: 'สุรชัย พัฒนเจริญ',  role: 'Finance Director',    lv: 8, deptId: 'd-fin', parentId: 'p004' });
  add({ id: 'p301', name: 'พรรณราย เกตุแก้ว',  role: 'Accounting Manager',  lv: 6, deptId: 'd-fin', parentId: 'p300' });
  add({ id: 'p302', name: 'ธีรยุทธ บุญเย็น',   role: 'FP&A Manager',         lv: 6, deptId: 'd-fin', parentId: 'p300' });
  add({ id: 'p303', name: 'จันทิมา สุขเกษม',   role: 'Sr. Accountant',      lv: 4, deptId: 'd-fin', parentId: 'p301' });
  add({ id: 'p304', name: 'อรพรรณ ใจกล้า',     role: 'Accountant',           lv: 3, deptId: 'd-fin', parentId: 'p301' });

  // ── HR (under CHRO) ───────────────────────────────────
  add({ id: 'p400', name: 'จุฑามาศ ทองอินทร์', role: 'People Director',      lv: 8, deptId: 'd-hr',  parentId: 'p005' });
  add({ id: 'p401', name: 'ภคพร อภิวงศ์',      role: 'Recruiting Manager',   lv: 6, deptId: 'd-hr',  parentId: 'p400' });
  add({ id: 'p402', name: 'ธิดารัตน์ พิมพา',   role: 'L&D Manager',           lv: 6, deptId: 'd-hr',  parentId: 'p400' });
  add({ id: 'p403', name: 'ณัฐริกา ดิเรก',     role: 'HR Business Partner',  lv: 5, deptId: 'd-hr',  parentId: 'p400' });
  add({ id: 'p404', name: 'พิชญา สิริวัฒน์',    role: 'Recruiter',             lv: 3, deptId: 'd-hr',  parentId: 'p401' });

  // ── Tech (under CTO) ──────────────────────────────────
  add({ id: 'p500', name: 'อนวัช กฤษณะ',        role: 'Engineering Manager', lv: 8, deptId: 'd-tech', parentId: 'p006' });
  add({ id: 'p501', name: 'ปวริศ คุณานนท์',     role: 'Sr. Software Engineer', lv: 6, deptId: 'd-tech', parentId: 'p500' });
  add({ id: 'p502', name: 'นภัสรพี ดิษฐสุข',    role: 'Software Engineer',     lv: 4, deptId: 'd-tech', parentId: 'p501' });
  add({ id: 'p503', name: 'ปริญญา ขันธ์เพ็ชร',   role: 'Data Analyst',          lv: 5, deptId: 'd-tech', parentId: 'p500' });
  add({ id: 'p504', name: 'ภาวิตา ศิริประเสริฐ', role: 'IT Support',            lv: 3, deptId: 'd-tech', parentId: 'p500' });

  // Initial history entries
  const history = [
    { ts: Date.now() - 1000 * 60 * 60 * 24 * 3,  type: 'create', who: 'p502', msg: 'เพิ่ม นภัสรพี ดิษฐสุข เข้าทีม Tech' },
    { ts: Date.now() - 1000 * 60 * 60 * 24 * 2,  type: 'promote', who: 'p042', msg: 'เลื่อนตำแหน่ง กมลชนก แก้วใส → LV4' },
    { ts: Date.now() - 1000 * 60 * 60 * 24,      type: 'move', who: 'p107', msg: 'ย้าย อิสรา เพ็ชรงาม จากสาขา Asoke → ครัวกลาง' },
    { ts: Date.now() - 1000 * 60 * 60 * 6,       type: 'promote', who: 'p030', msg: 'เลื่อนตำแหน่ง มาลี ศรีสวัสดิ์ → LV6 (Branch Manager)' },
  ];

  return { people, departments, history };
})();
