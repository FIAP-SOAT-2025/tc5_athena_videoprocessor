import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = createHash('sha256').update('123456').digest('hex');

  await prisma.user.upsert({
    where: { email: 'admin@athena.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@athena.com',
      passwordHash,
      userRole: 'ADMIN',
    },
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
