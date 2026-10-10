/* Reemplaza las imágenes de prueba por fotos REALES y coherentes por tipo de producto,
 * usando las bases abiertas Open Food/Beauty/Products/PetFood Facts (licencia ODbL).
 * Respeta el rate limit de búsqueda (10 req/min). ~2/3 de cada tipo quedan con foto. */
const { PrismaClient } = require('@prisma/client');
const { writeFile, mkdir, rm } = require('fs/promises');
const { join } = require('path');
const prisma = new PrismaClient();

const UPLOADS = join(__dirname, '..', 'uploads', 'products');
const UA = 'VentraPOS-TestSeed/1.0 (sistema de prueba)';
const BASES = {
  food: 'https://world.openfoodfacts.org',
  beauty: 'https://world.openbeautyfacts.org',
  products: 'https://world.openproductsfacts.org',
  petfood: 'https://world.openpetfoodfacts.org',
};

// [prefijo exacto del nombre, instancia, término de búsqueda]
const MAPA = [
  // Abarrotes
  ['Arroz', 'food', 'rice'], ['Fideos Espirales', 'food', 'fusilli'], ['Fideos Cabello', 'food', 'spaghetti'],
  ['Lentejas', 'food', 'lentils'], ['Porotos Negros', 'food', 'black beans'], ['Garbanzos', 'food', 'chickpeas'],
  ['Harina', 'food', 'wheat flour'], ['Azúcar', 'food', 'sugar'], ['Sal de Mar', 'food', 'sea salt'],
  ['Aceite de Oliva', 'food', 'olive oil'], ['Aceite Vegetal', 'food', 'sunflower oil'],
  ['Atún en Agua', 'food', 'canned tuna'], ['Salsa de Tomate', 'food', 'tomato sauce'],
  ['Arvejas en Conserva', 'food', 'canned peas'], ['Choclo en Conserva', 'food', 'sweet corn'],
  ['Mayonesa', 'food', 'mayonnaise'], ['Ketchup', 'food', 'ketchup'], ['Mostaza', 'food', 'mustard'],
  ['Vinagre', 'food', 'vinegar'], ['Café Instantáneo', 'food', 'instant coffee'], ['Té Negro', 'food', 'black tea'],
  ['Avena Instantánea', 'food', 'oat flakes'], ['Cereal Hojuelas', 'food', 'corn flakes'],
  ['Mermelada Durazno', 'food', 'peach jam'], ['Manjar', 'food', 'dulce de leche'],
  // Bebidas
  ['Bebida Cola', 'food', 'cola'], ['Bebida Naranja', 'food', 'orange soda'], ['Agua Mineral', 'food', 'mineral water'],
  ['Agua con Gas', 'food', 'sparkling water'], ['Jugo Néctar Durazno', 'food', 'peach nectar'],
  ['Jugo Néctar Mango', 'food', 'mango juice'], ['Bebida Energética', 'food', 'energy drink'],
  ['Té Helado Limón', 'food', 'iced tea'], ['Bebida Isotónica', 'food', 'sports drink'],
  ['Agua Saborizada', 'food', 'flavoured water'],
  // Lácteos
  ['Leche Entera', 'food', 'whole milk'], ['Leche Descremada', 'food', 'skimmed milk'],
  ['Leche Sin Lactosa', 'food', 'lactose free milk'], ['Leche Cultivada', 'food', 'fermented milk'],
  ['Yogurt Natural', 'food', 'natural yogurt'], ['Yogurt Frutilla', 'food', 'strawberry yogurt'],
  ['Yogurt Griego', 'food', 'greek yogurt'], ['Queso Gauda', 'food', 'gouda'], ['Queso Mantecoso', 'food', 'cheese'],
  ['Quesillo', 'food', 'fresh cheese'], ['Mantequilla', 'food', 'butter'], ['Crema de Leche', 'food', 'cooking cream'],
  ['Postre de Leche', 'food', 'milk dessert'],
  // Panadería
  ['Pan de Molde Blanco', 'food', 'sliced bread'], ['Pan de Molde Integral', 'food', 'whole wheat bread'],
  ['Pan Hallulla', 'food', 'bread rolls'], ['Pan Marraqueta', 'food', 'baguette'], ['Pan Pita', 'food', 'pita bread'],
  ['Queque Vainilla', 'food', 'vanilla cake'], ['Galletas de Soda', 'food', 'crackers'],
  ['Galletas Avena', 'food', 'oat biscuits'], ['Galletas Chocolate', 'food', 'chocolate biscuits'],
  ['Tostadas Integrales', 'food', 'toasts'], ['Empanada de Queso', 'food', 'empanada'],
  // Aseo y Hogar
  ['Detergente Líquido', 'products', 'laundry detergent'], ['Detergente Polvo', 'products', 'washing powder'],
  ['Lavalozas', 'products', 'dishwashing liquid'], ['Cloro Gel', 'products', 'bleach'],
  ['Limpiador Multiuso', 'products', 'cleaner'], ['Desinfectante Aerosol', 'products', 'disinfectant'],
  ['Esponja Multiuso', 'products', 'sponge'], ['Papel Higiénico', 'products', 'toilet paper'],
  ['Toalla de Papel', 'products', 'paper towels'], ['Servilletas', 'products', 'napkins'],
  ['Bolsas de Basura', 'products', 'bin bags'], ['Suavizante', 'products', 'fabric softener'],
  ['Jabón Barra', 'beauty', 'bar soap'], ['Pastilla Baño', 'products', 'toilet cleaner'],
  // Dulces y Snacks
  ['Papas Fritas', 'food', 'potato chips'], ['Ramitas Saladas', 'food', 'salty snacks'],
  ['Suflitos', 'food', 'corn puffs'], ['Maní Salado', 'food', 'salted peanuts'],
  ['Mix Frutos Secos', 'food', 'trail mix'], ['Chocolate con Leche', 'food', 'milk chocolate'],
  ['Chocolate Almendras', 'food', 'almond chocolate'], ['Galletón Avena', 'food', 'oat cookie'],
  ['Caramelos Surtidos', 'food', 'candies'], ['Chicle Menta', 'food', 'chewing gum'],
  ['Gomitas Frutales', 'food', 'gummy candies'], ['Barra de Cereal', 'food', 'cereal bar'],
  ['Cuchuflí', 'food', 'wafer rolls'], ['Alfajor', 'food', 'alfajor'],
  // Congelados
  ['Papas Prefritas', 'food', 'frozen french fries'], ['Hamburguesas de Vacuno', 'food', 'beef burgers'],
  ['Nuggets de Pollo', 'food', 'chicken nuggets'], ['Pescado Apanado', 'food', 'fish fingers'],
  ['Verduras Salteadas', 'food', 'frozen vegetables'], ['Choclo Congelado', 'food', 'frozen corn'],
  ['Pizza Familiar', 'food', 'pizza'], ['Helado Crema', 'food', 'ice cream'],
  ['Empanadas Cocktail', 'food', 'mini empanadas'],
  // Fiambrería
  ['Jamón de Pavo', 'food', 'turkey ham'], ['Jamón Artesanal', 'food', 'cooked ham'],
  ['Mortadela', 'food', 'mortadella'], ['Salame', 'food', 'salami'], ['Paté de Campo', 'food', 'pate'],
  ['Vienesas', 'food', 'hot dog sausages'], ['Longaniza', 'food', 'chorizo'], ['Tocino Ahumado', 'food', 'bacon'],
  // Frutas y Verduras
  ['Palta Hass', 'food', 'avocado'], ['Tomate', 'food', 'tomatoes'], ['Lechuga Costina', 'food', 'lettuce'],
  ['Cebolla', 'food', 'onions'], ['Papa', 'food', 'potatoes'], ['Zanahoria', 'food', 'carrots'],
  ['Plátano', 'food', 'bananas'], ['Manzana Fuji', 'food', 'apples'], ['Naranja', 'food', 'oranges'],
  ['Limón', 'food', 'lemons'],
  // Mascotas
  ['Alimento Perro Adulto', 'petfood', 'dog food'], ['Alimento Gato Adulto', 'petfood', 'cat food'],
  ['Alimento Cachorro', 'petfood', 'puppy food'], ['Arena Sanitaria', 'products', 'cat litter'],
  ['Snack Perro', 'petfood', 'dog treats'], ['Sachet Gato', 'petfood', 'cat pouch'],
  // Bebés
  ['Pañales Talla M', 'products', 'diapers'], ['Pañales Talla G', 'products', 'diapers'],
  ['Toallitas Húmedas', 'beauty', 'baby wipes'], ['Colado de Frutas', 'food', 'baby food'],
  ['Leche de Fórmula', 'food', 'infant formula'], ['Shampoo Bebé', 'beauty', 'baby shampoo'],
  // Licores
  ['Cerveza Lager', 'food', 'lager beer'], ['Cerveza Artesanal', 'food', 'craft beer'],
  ['Vino Tinto Reserva', 'food', 'red wine'], ['Vino Blanco', 'food', 'white wine'],
  ['Pisco 35°', 'food', 'pisco'], ['Ron Añejo', 'food', 'rum'], ['Espumante Brut', 'food', 'sparkling wine'],
  // Higiene Personal (prefijos largos primero se resuelven por orden de match)
  ['Shampoo Bebé', 'beauty', 'baby shampoo'], ['Shampoo', 'beauty', 'shampoo'],
  ['Acondicionador', 'beauty', 'hair conditioner'], ['Jabón Líquido', 'beauty', 'liquid soap'],
  ['Pasta Dental', 'beauty', 'toothpaste'], ['Cepillo Dental', 'beauty', 'toothbrush'],
  ['Desodorante Spray', 'beauty', 'deodorant'], ['Papel Toalla Facial', 'beauty', 'facial tissues'],
  ['Máquina de Afeitar', 'beauty', 'razor'], ['Toallas Femeninas', 'beauty', 'sanitary towels'],
  // Farmacia Básica
  ['Parche Curita', 'beauty', 'plasters'], ['Alcohol Gel', 'beauty', 'hand sanitizer'],
  ['Algodón', 'beauty', 'cotton pads'], ['Suero Fisiológico', 'beauty', 'saline solution'],
  ['Termómetro Digital', 'products', 'thermometer'], ['Mascarillas', 'beauty', 'face masks'],
];

// prefijos más largos primero para evitar colisiones (Papa vs Papas Fritas, Shampoo vs Shampoo Bebé)
MAPA.sort((a, b) => b[0].length - a[0].length);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscarPool(instancia, termino) {
  const url = `${BASES[instancia]}/cgi/search.pl?action=process&search_simple=1&json=1&page_size=40&fields=image_front_url&search_terms=${encodeURIComponent(termino)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? [])
      .map((p) => p.image_front_url)
      .filter((u) => typeof u === 'string' && u.startsWith('https://'));
  } catch {
    return [];
  }
}

async function descargar(url, destino) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) return false;
    await writeFile(destino, buf);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(UPLOADS, { recursive: true });
  const productos = await prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } });

  // Agrupar productos por tipo y juntar términos únicos
  const porBusqueda = new Map(); // "instancia|termino" -> productos[]
  let sinTipo = 0;
  for (const p of productos) {
    const regla = MAPA.find(([pref]) => p.name.startsWith(pref + ' ') || p.name === pref);
    if (!regla) { sinTipo++; continue; }
    const key = `${regla[1]}|${regla[2]}`;
    if (!porBusqueda.has(key)) porBusqueda.set(key, []);
    porBusqueda.get(key).push(p);
  }
  console.log(`Productos: ${productos.length} · búsquedas únicas: ${porBusqueda.size} · sin tipo mapeado: ${sinTipo}`);
  console.log(`Tiempo estimado: ~${Math.ceil((porBusqueda.size * 6.5) / 60)} min (rate limit de Open Food Facts)\n`);

  let conFoto = 0, sinPool = 0, limpiados = 0;
  let i = 0;
  for (const [key, prods] of porBusqueda) {
    const [instancia, termino] = key.split('|');
    i++;
    const pool = await buscarPool(instancia, termino);
    process.stdout.write(`[${i}/${porBusqueda.size}] ${termino} (${instancia}): ${pool.length} fotos → `);

    let asignadas = 0;
    for (let j = 0; j < prods.length; j++) {
      const p = prods[j];
      const destino = join(UPLOADS, `${p.id}.jpg`);
      // ~1/3 queda sin imagen a propósito (para ver el placeholder conviviendo)
      const dejarSin = j % 3 === 2;
      if (dejarSin || !pool.length) {
        if (p.imageUrl) {
          await rm(destino, { force: true });
          await prisma.product.update({ where: { id: p.id }, data: { imageUrl: null } });
          limpiados++;
        }
        if (!pool.length) sinPool++;
        continue;
      }
      const url = pool[(j + i) % pool.length];
      if (await descargar(url, destino)) {
        await prisma.product.update({ where: { id: p.id }, data: { imageUrl: `/uploads/products/${p.id}.jpg` } });
        conFoto++;
        asignadas++;
      } else if (p.imageUrl) {
        await rm(destino, { force: true });
        await prisma.product.update({ where: { id: p.id }, data: { imageUrl: null } });
        limpiados++;
      }
      await sleep(250); // descargas con calma
    }
    console.log(`${asignadas} asignadas`);
    await sleep(6500); // rate limit búsqueda: 10/min
  }

  console.log(`\n✓ Fotos reales asignadas: ${conFoto}`);
  console.log(`✓ Imágenes incoherentes eliminadas: ${limpiados}`);
  console.log(`✓ Sin pool disponible: ${sinPool}`);
  console.log(`✓ Con imagen ahora: ${await prisma.product.count({ where: { imageUrl: { not: null } } })} / ${productos.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
