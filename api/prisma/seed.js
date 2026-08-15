/* Seed de datos de ejemplo para Ventra */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function ean13(seq) {
  const base = '200' + String(seq).padStart(9, '0');
  const digits = base.split('').map(Number);
  const check =
    (10 - (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) %
    10;
  return base + check;
}

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log('Ya hay datos, seed omitido.');
    return;
  }

  const cats = {};
  for (const name of ['Abarrotes', 'Lácteos', 'Bebidas', 'Panadería', 'Aseo']) {
    cats[name] = await prisma.category.create({ data: { name } });
  }

  const productDefs = [
    ['Arroz Grado 1 1kg', 'Abarrotes', 1890, 1200, 48, 10, 90],
    ['Aceite Vegetal 1L', 'Abarrotes', 3290, 2400, 30, 8, 180],
    ['Leche Entera 1L', 'Lácteos', 1290, 950, 60, 15, 12],
    ['Yogurt Natural 125g', 'Lácteos', 450, 280, 80, 20, 6],
    ['Queso Gauda 250g', 'Lácteos', 3590, 2700, 25, 5, 20],
    ['Bebida Cola 1.5L', 'Bebidas', 2190, 1500, 55, 12, 150],
    ['Agua Mineral 1.5L', 'Bebidas', 990, 600, 70, 15, 365],
    ['Pan de Molde Integral', 'Panadería', 2490, 1700, 22, 6, 5],
    ['Galletas Avena 300g', 'Panadería', 1590, 1000, 35, 8, 60],
    ['Detergente Líquido 3L', 'Aseo', 6990, 5000, 18, 4, 720],
    ['Lavalozas 750ml', 'Aseo', 1790, 1200, 26, 6, 540],
    ['Huevos Docena', 'Abarrotes', 3990, 3000, 40, 10, 18],
  ];

  let seq = 1;
  const products = [];
  for (const [name, cat, price, cost, stock, minStock, shelfDays] of productDefs) {
    const p = await prisma.product.create({
      data: {
        name,
        sku: 'SKU-' + String(seq).padStart(4, '0'),
        barcode: ean13(seq),
        price,
        cost,
        stock,
        minStock,
        categoryId: cats[cat].id,
      },
    });
    // Dos lotes por producto: uno próximo a vencer, otro más lejano
    await prisma.productBatch.create({
      data: {
        productId: p.id,
        lotCode: `L-${String(seq).padStart(3, '0')}A`,
        quantity: Math.ceil(stock / 2),
        expiresAt: new Date(Date.now() + Math.min(shelfDays, 3 + seq) * 86400000),
      },
    });
    await prisma.productBatch.create({
      data: {
        productId: p.id,
        lotCode: `L-${String(seq).padStart(3, '0')}B`,
        quantity: Math.floor(stock / 2),
        expiresAt: new Date(Date.now() + shelfDays * 86400000),
      },
    });
    products.push(p);
    seq++;
  }

  // Ventas de los últimos 30 días para alimentar reportes
  const payments = ['EFECTIVO', 'DEBITO', 'CREDITO', 'TRANSFERENCIA'];
  for (let day = 30; day >= 0; day--) {
    const nSales = 2 + Math.floor(Math.random() * 5);
    for (let v = 0; v < nSales; v++) {
      const date = new Date(Date.now() - day * 86400000);
      date.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));
      const nItems = 1 + Math.floor(Math.random() * 4);
      const chosen = [...products].sort(() => 0.5 - Math.random()).slice(0, nItems);
      const lines = chosen.map((p) => {
        const qty = 1 + Math.floor(Math.random() * 3);
        return { productId: p.id, quantity: qty, unitPrice: p.price, total: Number(p.price) * qty };
      });
      const total = lines.reduce((s, l) => s + Number(l.total), 0);
      const neto = Math.round(total / 1.19);
      await prisma.sale.create({
        data: {
          subtotal: neto,
          tax: total - neto,
          total,
          payment: payments[Math.floor(Math.random() * payments.length)],
          createdAt: date,
          items: { create: lines },
          boleta: { create: { createdAt: date } },
        },
      });
    }
  }

  console.log(`Seed listo: ${products.length} productos, categorías, lotes y ~120 ventas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
