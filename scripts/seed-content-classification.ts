import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedContentClassification } from '../prisma/seed/content-classification';

const prisma = new PrismaClient();
seedContentClassification(prisma)
  .then(() => console.log('Approved content classification seeded successfully.'))
  .catch((error: unknown) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
