/* Seed masivo de prueba: ~500 productos surtidos, ~40% con imagen, lotes con vencimiento. */
const { PrismaClient } = require('@prisma/client');
const { writeFile, mkdir } = require('fs/promises');
const { join } = require('path');
const prisma = new PrismaClient();

const UPLOADS = join(__dirname, '..', 'uploads', 'products');

function ean13(seq) {
  const base = '200' + String(seq).padStart(9, '0');
  const d = base.split('').map(Number);
  const check = (10 - (d.reduce((s, x, i) => s + x * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10;
  return base + check;
}

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// [categoría, [tipos de producto], [marcas], [formatos], rango precio CLP, vida útil días]
const SURTIDO = [
  ['Abarrotes', ['Arroz', 'Fideos Espirales', 'Fideos Cabello', 'Lentejas', 'Porotos Negros', 'Garbanzos', 'Harina', 'Azúcar', 'Sal de Mar', 'Aceite Vegetal', 'Aceite de Oliva', 'Atún en Agua', 'Salsa de Tomate', 'Arvejas en Conserva', 'Choclo en Conserva', 'Mayonesa', 'Ketchup', 'Mostaza', 'Vinagre', 'Café Instantáneo', 'Té Negro', 'Avena Instantánea', 'Cereal Hojuelas', 'Mermelada Durazno', 'Manjar'], ['Campo Lindo', 'Doña Rosa', 'El Molino', 'Monte Sur', 'La Espiga'], ['500g', '1kg', '250g', '400g', '900ml', 'tarro 170g'], [690, 6990], 240],
  ['Bebidas', ['Bebida Cola', 'Bebida Naranja', 'Agua Mineral', 'Agua con Gas', 'Jugo Néctar Durazno', 'Jugo Néctar Mango', 'Bebida Energética', 'Té Helado Limón', 'Bebida Isotónica', 'Agua Saborizada'], ['Andina', 'Cumbre', 'Fresh', 'Vital Sur', 'Tropik'], ['350ml', '591ml', '1.5L', '3L', 'six pack'], [590, 4990], 300],
  ['Lácteos', ['Leche Entera', 'Leche Descremada', 'Leche Sin Lactosa', 'Yogurt Natural', 'Yogurt Frutilla', 'Yogurt Griego', 'Queso Gauda', 'Queso Mantecoso', 'Quesillo', 'Mantequilla', 'Crema de Leche', 'Leche Cultivada', 'Postre de Leche'], ['Lácteos del Sur', 'Campo Verde', 'La Pradera', 'Don Quesos'], ['1L', '125g', '250g', '500g', 'pack 4'], [450, 7990], 25],
  ['Panadería', ['Pan de Molde Blanco', 'Pan de Molde Integral', 'Pan Hallulla', 'Pan Marraqueta', 'Pan Pita', 'Queque Vainilla', 'Galletas de Soda', 'Galletas Avena', 'Galletas Chocolate', 'Tostadas Integrales', 'Empanada de Queso'], ['La Espiga', 'Horno Dorado', 'Doña Rosa', 'Trigo Real'], ['500g', '380g', 'unidad', 'bolsa 6 un'], [590, 3990], 8],
  ['Aseo y Hogar', ['Detergente Líquido', 'Detergente Polvo', 'Lavalozas', 'Cloro Gel', 'Limpiador Multiuso', 'Desinfectante Aerosol', 'Esponja Multiuso', 'Papel Higiénico', 'Toalla de Papel', 'Servilletas', 'Bolsas de Basura', 'Suavizante', 'Jabón Barra', 'Pastilla Baño'], ['Limpiomax', 'Brillante', 'Casa Clara', 'Aroma Sur'], ['1L', '3L', '750ml', 'pack 4', 'pack 12', '30 un'], [890, 9990], 720],
  ['Dulces y Snacks', ['Papas Fritas', 'Ramitas Saladas', 'Suflitos', 'Maní Salado', 'Mix Frutos Secos', 'Chocolate con Leche', 'Chocolate Almendras', 'Galletón Avena', 'Caramelos Surtidos', 'Chicle Menta', 'Gomitas Frutales', 'Barra de Cereal', 'Cuchuflí', 'Alfajor'], ['Krispo', 'Dulce Sur', 'Montaña', 'Pica Pica'], ['150g', '250g', '45g', 'pack 6', 'display 20'], [390, 4490], 150],
  ['Congelados', ['Papas Prefritas', 'Hamburguesas de Vacuno', 'Nuggets de Pollo', 'Pescado Apanado', 'Verduras Salteadas', 'Choclo Congelado', 'Pizza Familiar', 'Helado Crema', 'Empanadas Cocktail'], ['Frío Sur', 'Del Mar', 'Campo Lindo', 'Nevada'], ['1kg', '500g', '4 un', '1L', '12 un'], [1990, 8990], 180],
  ['Fiambrería', ['Jamón de Pavo', 'Jamón Artesanal', 'Mortadela', 'Salame', 'Paté de Campo', 'Vienesas', 'Longaniza', 'Tocino Ahumado'], ['Don Cerdo', 'La Granja', 'Fiambres del Sur'], ['250g', '200g', 'pack 8', '500g'], [1290, 6990], 20],
  ['Frutas y Verduras', ['Palta Hass', 'Tomate', 'Lechuga Costina', 'Cebolla', 'Papa', 'Zanahoria', 'Plátano', 'Manzana Fuji', 'Naranja', 'Limón'], ['Huerto Fresco', 'Del Valle'], ['kg', 'malla 1kg', 'unidad', 'bandeja'], [490, 3990], 7],
  ['Mascotas', ['Alimento Perro Adulto', 'Alimento Gato Adulto', 'Alimento Cachorro', 'Arena Sanitaria', 'Snack Perro', 'Sachet Gato'], ['Mascota Feliz', 'Can Fuerte', 'Minino'], ['1kg', '3kg', '8kg', '85g', '4L'], [990, 19990], 365],
  ['Bebés', ['Pañales Talla M', 'Pañales Talla G', 'Toallitas Húmedas', 'Colado de Frutas', 'Leche de Fórmula', 'Shampoo Bebé'], ['Bebito', 'Suave Sur', 'Mamá Osa'], ['pack 40', 'pack 60', '80 un', '113g', '400g'], [1490, 15990], 400],
  ['Licores', ['Cerveza Lager', 'Cerveza Artesanal', 'Vino Tinto Reserva', 'Vino Blanco', 'Pisco 35°', 'Ron Añejo', 'Espumante Brut'], ['Cordillera', 'Valle Escondido', 'Puerto Viejo', 'Toro Negro'], ['330ml', 'six pack', '750ml', '1L'], [1290, 12990], 720],
  ['Higiene Personal', ['Shampoo', 'Acondicionador', 'Jabón Líquido', 'Pasta Dental', 'Cepillo Dental', 'Desodorante Spray', 'Papel Toalla Facial', 'Máquina de Afeitar', 'Toallas Femeninas'], ['Fresh', 'Dermasur', 'Sonrisa', 'Pureza'], ['400ml', '90g', 'pack 2', 'pack 10'], [790, 7990], 540],
  ['Farmacia Básica', ['Parche Curita', 'Alcohol Gel', 'Algodón', 'Suero Fisiológico', 'Termómetro Digital', 'Mascarillas'], ['SaludYa', 'Botiquín'], ['caja 20', '250ml', '100g', 'pack 50'], [690, 8990], 720],
];

async function main() {
  await mkdir(UPLOADS, { recursive: true });

  // Categorías
  const cats = {};
  for (const [name] of SURTIDO) {
    cats[name] = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const existentes = await prisma.product.count();
  console.log(`Productos existentes: ${existentes}. Creando 500 más…`);

  const creados = [];
  const usados = new Set();
  let seq = 10000;
  let n = 0;

  while (n < 500) {
    const [cat, tipos, marcas, formatos, [pMin, pMax], vida] = pick(SURTIDO);
    const nombre = `${pick(tipos)} ${pick(marcas)} ${pick(formatos)}`;
    if (usados.has(nombre)) continue; // sin duplicados de nombre
    usados.add(nombre);
    seq++;
    n++;

    // Precio realista redondeado a $10
    const price = Math.round(rnd(pMin, pMax) / 10) * 10;
    const stock = rnd(0, 120); // algunos en 0 para ver el deshabilitado del POS
    const p = await prisma.product.create({
      data: {
        name: nombre,
        sku: `SKU-M${String(seq).padStart(5, '0')}`,
        barcode: ean13(seq),
        price,
        cost: Math.round((price * rnd(55, 75)) / 1000) * 10,
        stock,
        minStock: rnd(3, 15),
        categoryId: cats[cat].id,
      },
    });

    // ~35% con lote y vencimiento futuro acorde a la vida útil
    if (Math.random() < 0.35 && stock > 0) {
      await prisma.productBatch.create({
        data: {
          productId: p.id,
          lotCode: `L-M${String(seq).slice(-4)}`,
          quantity: Math.max(1, Math.floor(stock * 0.7)),
          expiresAt: new Date(Date.now() + rnd(2, Math.max(vida, 10)) * 86400000),
        },
      });
    }

    creados.push(p);
    if (n % 100 === 0) console.log(`  ${n}/500…`);
  }

  // ~40% con imagen de prueba (determinística por producto)
  const conImagen = creados.filter(() => Math.random() < 0.4);
  console.log(`Descargando ${conImagen.length} imágenes de prueba…`);
  let ok = 0;
  const lote = 10;
  for (let i = 0; i < conImagen.length; i += lote) {
    await Promise.all(
      conImagen.slice(i, i + lote).map(async (p) => {
        try {
          const res = await fetch(`https://picsum.photos/seed/ventra-${p.sku}/400/400.jpg`, {
            signal: AbortSignal.timeout(15000),
            redirect: 'follow',
          });
          if (!res.ok) return;
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 1000) return;
          await writeFile(join(UPLOADS, `${p.id}.jpg`), buf);
          await prisma.product.update({
            where: { id: p.id },
            data: { imageUrl: `/uploads/products/${p.id}.jpg` },
          });
          ok++;
        } catch {}
      }),
    );
    if ((i / lote) % 5 === 0) console.log(`  imágenes ${Math.min(i + lote, conImagen.length)}/${conImagen.length}…`);
  }

  console.log(`✓ 500 productos creados (${ok} con imagen, ${500 - ok} sin imagen).`);
  console.log(`✓ Total productos ahora: ${await prisma.product.count()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
