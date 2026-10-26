import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPasswords() {
  const newPassword = process.argv[2] || 'Solar123!';
  const targetEmail = process.argv[3]; // optional specific email

  console.log(`Resetting password to: "${newPassword}"`);
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const filter = targetEmail ? { email: targetEmail.toLowerCase().trim() } : {};

  const users = await prisma.user.findMany({ where: filter });

  if (users.length === 0) {
    console.log(`No users found matching filter: ${JSON.stringify(filter)}`);
    return;
  }

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: passwordHash, is_active: true }
    });
    console.log(`Updated user: ${user.email} (${user.role}) -> Password set to: "${newPassword}"`);
  }

  console.log('\nAll users successfully updated!');
}

resetPasswords()
  .catch((e) => {
    console.error('Error resetting passwords:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
