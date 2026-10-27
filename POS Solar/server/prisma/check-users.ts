import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      is_active: true,
    },
  });
  console.log('CURRENT USERS IN DB:');
  console.table(users);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
