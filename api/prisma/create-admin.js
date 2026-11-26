/*
 * Crea el negocio y el usuario administrador iniciales si todavía no existen.
 * Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... BUSINESS_NAME=... node prisma/create-admin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Faltan ADMIN_EMAIL y ADMIN_PASSWORD');

  if (await prisma.user.findUnique({ where: { email } })) {
    console.log(`= ${email} ya existe`);
    return;
  }
  const business = await prisma.business.create({
    data: { name: process.env.BUSINESS_NAME || 'Mi negocio' },
  });
  await prisma.user.create({
    data: {
      businessId: business.id,
      name: process.env.ADMIN_NAME || 'Administrador',
      email,
      role: 'SUPERADMIN',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`✓ ${email} (SUPERADMIN) en "${business.name}"`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
