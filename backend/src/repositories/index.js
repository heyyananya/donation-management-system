// Single switching seam between JSON and Postgres implementations.
// Swap by changing REPO_DRIVER in .env.
import { env } from '../config/env.js';

import { donorRepo as jsonDonor } from './json/donorRepo.js';
import { trustRepo as jsonTrust } from './json/trustRepo.js';
import { remarkRepo as jsonRemark } from './json/remarkRepo.js';
import { receiptRepo as jsonReceipt } from './json/receiptRepo.js';
import { yearRepo as jsonYear } from './json/yearRepo.js';
import { userRepo as jsonUser } from './json/userRepo.js';

import { donorRepo as pgDonor } from './postgres/donorRepo.js';
import { trustRepo as pgTrust } from './postgres/trustRepo.js';
import { remarkRepo as pgRemark } from './postgres/remarkRepo.js';
import { receiptRepo as pgReceipt } from './postgres/receiptRepo.js';
import { yearRepo as pgYear } from './postgres/yearRepo.js';
import { userRepo as pgUser } from './postgres/userRepo.js';

const drivers = {
  json: {
    donorRepo: jsonDonor,
    trustRepo: jsonTrust,
    remarkRepo: jsonRemark,
    receiptRepo: jsonReceipt,
    yearRepo: jsonYear,
    userRepo: jsonUser,
  },
  postgres: {
    donorRepo: pgDonor,
    trustRepo: pgTrust,
    remarkRepo: pgRemark,
    receiptRepo: pgReceipt,
    yearRepo: pgYear,
    userRepo: pgUser,
  },
};

const driver = drivers[env.repoDriver] || drivers.json;

export const { donorRepo, trustRepo, remarkRepo, receiptRepo, yearRepo, userRepo } = driver;
