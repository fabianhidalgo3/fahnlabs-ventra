/* Crea usuarios iniciales: admin y vendedor */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'Fabian (Admin)', email: 'admin@fhanlabs.cl', role: 'ADMIN', password: 'admin123' },
    { name: 'Vendedor Demo', email: 'vendedor@fhanlabs.cl', role: 'VENDEDOR', password: 'vendedor123' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      },
    });
    console.log(`✓ ${u.email} (${u.role})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
