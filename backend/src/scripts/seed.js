import bcrypt from 'bcryptjs';
import { trustRepo, donorRepo, remarkRepo, yearRepo, userRepo } from '../repositories/index.js';
import { currentFinancialYear } from '../utils/financialYear.js';
import { env } from '../config/env.js';

async function ensureTrust() {
  const trusts = await trustRepo.findAll();
  if (trusts.some((t) => t.name === 'SHREE VALLABH GAUSHALA TRUST')) return;
  await trustRepo.create({
    name: 'SHREE VALLABH GAUSHALA TRUST',
    address: 'Shree Vallabh Ashram, Killa - Pardi-396125, Dist.Valsad, Gujarat, India.',
    area: 'Killa-Pardi',
    taluka: 'Pardi',
    district: 'Valsad',
    establishDate: '',
    contactNumber: '+91 9375712470',
    trustType: 'Public Trust',
    sanchalan: '',
    registrationNumber: 'E/1075/Valsad',
    registrationText: '(Registered Under Bombay Public Trust Act. 1950, NO. E/1075/Valsad )',
    unitText: '(Balda & Nana Vaghchhipa Unit)',
    correspondenceAddress: 'Shree Vallabh Ashram\nKilla - Pardi-396125. Dist.Valsad, Gujarat, India.',
    phone: '+91 9375712470',
    eightyGText: 'IT 80 G Exemption Certificate No. AABTS3394JF20214 DT.31-05-2021',
    pan: 'AABTS3394J',
    panText: 'PAN : AABTS3394J',
    letterAddressLines: ['VALLABH ASHRAM N.H.NO-48', 'KILLA PARDI-396125', 'DIST.VALSAD'],
    footerInformation: '',
    logoFileName: '',
  });
}

async function ensureDonor() {
  const donors = await donorRepo.findAll();
  if (donors.some((d) => d.name === 'V. V. Mehta And Associetes')) return;
  await donorRepo.create({
    name: 'V. V. Mehta And Associetes',
    mobile: '9876543210',
    pan: 'AAAPM8763G',
    aadhaar: '',
    passport: '',
    address: '601, Balarama, BKC, Bandra (East),\nMumbai-400051',
    documents: [],
  });
}

async function ensureCurrentYear() {
  const name = currentFinancialYear();
  if (await yearRepo.findByName(name)) return;
  const startYear = Number(name.split('-')[0]);
  await yearRepo.create({
    name,
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
    isActive: true,
  });
}

async function ensureAdminUser() {
  const username = env.adminUsername;
  const existing = await userRepo.findByUsername(username);
  if (existing) return;
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  await userRepo.create({
    username,
    passwordHash,
    displayName: 'Administrator',
    role: 'admin',
    isActive: true,
  });
  console.log(`[seed] admin user "${username}" created.`);
}

async function ensureRemarks() {
  const want = [
    'Donation for cow grass',
    'Donation for Education',
    'Donation for Hostel',
    'Donation for Temple',
    'General Donation',
  ];
  const existing = await remarkRepo.findAll();
  const have = new Set(existing.map((r) => r.name));
  for (const name of want) {
    if (!have.has(name)) await remarkRepo.create({ name });
  }
}

console.log(`[seed] driver: ${env.repoDriver}`);
await ensureAdminUser();
await ensureTrust();
await ensureDonor();
await ensureRemarks();
await ensureCurrentYear();
console.log('[seed] complete.');
process.exit(0);
