/* Crea promociones de ejemplo: "Lácteos -10%" y "Bebida Cola 3×$5.000" */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1) Lácteos -10% (PORCENTAJE sobre toda la categoría Lácteos)
  const lacteos = await prisma.category.findUnique({ where: { name: 'Lácteos' } });
  if (!lacteos) {
    console.warn('⚠ Categoría "Lácteos" no existe; se omite esa promo');
  } else {
    const existing = await prisma.promotion.findFirst({ where: { name: 'Lácteos -10%' } });
    if (!existing) {
      await prisma.promotion.create({
        data: {
          name: 'Lácteos -10%',
          type: 'PORCENTAJE',
          percent: 10,
          categoryId: lacteos.id,
        },
      });
    }
    console.log('✓ Lácteos -10% (PORCENTAJE 10, categoría Lácteos)');
  }

  // 2) Bebida Cola 3×$5.000 (PACK_PRECIO sobre un producto)
  const cola = await prisma.product.findUnique({ where: { barcode: '2000000000060' } });
  if (!cola) {
    console.warn('⚠ Producto con barcode 2000000000060 no existe; se omite esa promo');
  } else {
    const existing = await prisma.promotion.findFirst({ where: { name: 'Bebida Cola 3×$5.000' } });
    if (!existing) {
      await prisma.promotion.create({
        data: {
          name: 'Bebida Cola 3×$5.000',
          type: 'PACK_PRECIO',
          packQty: 3,
          packPrice: 5000,
          products: { create: [{ productId: cola.id }] },
        },
      });
    }
    console.log(`✓ Bebida Cola 3×$5.000 (PACK_PRECIO 3 × $5.000, producto "${cola.name}")`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
