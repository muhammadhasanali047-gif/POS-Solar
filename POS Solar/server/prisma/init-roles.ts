import prisma from '../src/config/database';

async function main() {
  const roles = await prisma.role.findMany();
  console.log('Existing roles in DB:', roles);

  const defaultRoles = [
    {
      name: 'ADMIN',
      description: 'System Administrator with full unrestricted access',
      is_system: true,
      permissions: JSON.stringify(['*']),
    },
    {
      name: 'CEO',
      description: 'Chief Executive Officer with full executive authority',
      is_system: true,
      permissions: JSON.stringify([
        'dashboard', 'quick-flow', 'pos', 'quotations', 'packages', 'customers',
        'products', 'inventory', 'serials', 'suppliers', 'installations',
        'warranties', 'claims', 'settings', 'access'
      ]),
    },
    {
      name: 'MANAGER',
      description: 'Finance & Operations Branch Manager',
      is_system: false,
      permissions: JSON.stringify([
        'dashboard', 'quick-flow', 'pos', 'quotations', 'packages', 'customers',
        'products', 'inventory', 'serials', 'suppliers', 'installations',
        'warranties', 'claims'
      ]),
    },
    {
      name: 'CASHIER',
      description: 'Counter Cashier & POS Sales Executive',
      is_system: false,
      permissions: JSON.stringify([
        'quick-flow', 'dashboard', 'pos', 'quotations', 'customers'
      ]),
    },
  ];

  for (const r of defaultRoles) {
    const existing = await prisma.role.findUnique({ where: { name: r.name } });
    if (!existing) {
      await prisma.role.create({ data: r });
      console.log(`Created default role: ${r.name}`);
    } else {
      console.log(`Role ${r.name} already exists`);
    }
  }

  const all = await prisma.role.findMany();
  console.table(all);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
