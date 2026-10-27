import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning users to keep ONLY CEO and Manager ---');
  
  // Find any records created by admin or cashier just in case
  const toDelete = await prisma.user.findMany({
    where: {
      email: {
        notIn: ['ceo@solarpos.com', 'manager@solarpos.com'],
      },
    },
  });

  console.log(`Found ${toDelete.length} users to remove:`, toDelete.map(u => `${u.email} (${u.role})`));

  for (const user of toDelete) {
    try {
      await prisma.user.delete({
        where: { id: user.id },
      });
      console.log(`Successfully deleted user: ${user.email}`);
    } catch (err: any) {
      console.warn(`Could not delete ${user.email} directly, deactivating instead:`, err.message);
      await prisma.user.update({
        where: { id: user.id },
        data: { is_active: false },
      });
    }
  }

  const remaining = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, role: true, is_active: true }
  });
  console.log('REMAINING USERS IN DATABASE:');
  console.table(remaining);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
