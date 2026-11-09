/**
 * Crea negocios y ofertas DE PRUEBA alrededor de un punto, para ver el mapa funcionando.
 * Todos se marcan con is_demo = 1 para poder borrarlos despues sin tocar datos reales.
 *
 * Uso (desde la raiz del proyecto):
 *   node --env-file=.env server/seed-demo.mjs --lat 19.4326 --lng -99.1332
 *   node --env-file=.env server/seed-demo.mjs --lat 19.4326 --lng -99.1332 --radius 2000
 *   node --env-file=.env server/seed-demo.mjs --clear      (borra solo los datos demo)
 *
 * En la Orange Pi (sin .env) basta con exportar DB_HOST/DB_USER/DB_PASSWORD/DB_NAME o usar los valores por defecto.
 */
import mysql from 'mysql2/promise';
import { ensurePlacesSchema } from './placesApi.mjs';

function arg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  const value = process.argv[idx + 1];
  return value === undefined || value.startsWith('--') ? true : value;
}

const DEMO_PLACES = [
  {
    name: 'Fonda Doña Lupita', type: 'fonda',
    description: 'Comida corrida casera: sopa, guisado del día y agua fresca.',
    hours: 'Lun-Sab 8:00-18:00',
    offers: [
      { title: 'Comida corrida del día', kind: 'producto', original: 85, price: 35, qty: 6, tags: 'casero' },
      { title: 'Guisado sobrante para llevar', kind: 'producto', original: 60, price: 0, qty: 3, tags: 'gratis' }
    ]
  },
  {
    name: 'Panadería La Espiga', type: 'panaderia',
    description: 'Pan dulce y bolillo horneado hoy.',
    hours: 'Diario 7:00-21:00',
    offers: [
      { title: 'Bolsa sorpresa de pan dulce', kind: 'paquete_sorpresa', original: 120, price: 40, qty: 5, tags: 'vegetariano', allergens: 'gluten, huevo, lácteos' }
    ]
  },
  {
    name: 'Tacos El Güero', type: 'puesto',
    description: 'Tacos de guisado al cierre del puesto.',
    hours: 'Lun-Vie 9:00-16:00',
    offers: [
      { title: 'Orden de 4 tacos de guisado', kind: 'producto', original: 70, price: 25, qty: 2, tags: '' }
    ]
  },
  {
    name: 'Comedor Comunitario San José', type: 'comedor',
    description: 'Comedor comunitario. Platillos sin costo al final del servicio.',
    hours: 'Lun-Vie 12:00-17:00',
    offers: [
      { title: 'Plato del día', kind: 'producto', original: 0, price: 0, qty: 15, tags: 'gratis' }
    ]
  },
  {
    name: 'Cafetería Raíz', type: 'cafeteria',
    description: 'Café de especialidad, sándwiches y repostería.',
    hours: 'Diario 8:00-20:00',
    offers: [
      { title: 'Sándwich del día', kind: 'producto', original: 95, price: 45, qty: 4, tags: 'vegetariano', allergens: 'gluten, lácteos' },
      { title: 'Paquete sorpresa de repostería', kind: 'paquete_sorpresa', original: 150, price: 55, qty: 3, tags: '', allergens: 'gluten, huevo, nueces' }
    ]
  },
  {
    name: 'Cocina Económica Mary', type: 'fonda',
    description: 'Menú económico y desayunos.',
    hours: 'Lun-Sab 7:30-17:00',
    offers: [
      { title: 'Arroz con mole y tortillas', kind: 'producto', original: 75, price: 30, qty: 1, tags: '' }
    ]
  },
  {
    name: 'Pizzería Nonna', type: 'restaurante',
    description: 'Pizza al horno de leña.',
    hours: 'Mar-Dom 13:00-23:00',
    offers: [
      { title: 'Rebanadas del cierre (caja de 4)', kind: 'paquete_sorpresa', original: 160, price: 60, qty: 4, tags: '', allergens: 'gluten, lácteos' }
    ]
  },
  {
    name: 'Jugos y Tortas Chabelita', type: 'puesto',
    description: 'Tortas, jugos y licuados.',
    hours: 'Lun-Sab 7:00-15:00',
    offers: [
      { title: 'Fruta picada del día', kind: 'producto', original: 40, price: 0, qty: 5, tags: 'vegano, gratis' }
    ]
  }
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'FOODLINK'
  });

  try {
    await ensurePlacesSchema(pool);

    if (arg('clear')) {
      const [result] = await pool.query('DELETE FROM businesses WHERE is_demo = 1');
      console.log(`Datos demo eliminados: ${result.affectedRows} negocios (sus ofertas se borran en cascada).`);
      return;
    }

    const lat = Number(arg('lat'));
    const lng = Number(arg('lng'));
    const radius = Number(arg('radius', 1500));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error('Indica el centro: --lat 19.4326 --lng -99.1332');
      process.exitCode = 1;
      return;
    }

    const now = Date.now();
    let offersCount = 0;

    for (const place of DEMO_PLACES) {
      // Punto aleatorio dentro del radio
      const distance = radius * Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      const pLat = lat + (distance * Math.cos(angle)) / 111320;
      const pLng = lng + (distance * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));

      const [result] = await pool.query(
        `INSERT INTO businesses (name, type, description, address, lat, lng, opening_hours, is_verified, is_demo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [place.name, place.type, place.description, 'Dirección de prueba', pLat.toFixed(6), pLng.toFixed(6), place.hours]
      );

      for (const offer of place.offers) {
        const start = new Date(now - 30 * 60 * 1000);
        const end = new Date(now + (1 + Math.random() * 4) * 60 * 60 * 1000);
        await pool.query(
          `INSERT INTO offers (business_id, title, kind, original_price, price, quantity_total, quantity_left,
                               pickup_start, pickup_end, tags, allergens)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [result.insertId, offer.title, offer.kind, offer.original, offer.price, offer.qty, offer.qty,
           start, end, offer.tags || null, offer.allergens || null]
        );
        offersCount++;
      }
    }

    console.log(`Listo: ${DEMO_PLACES.length} negocios demo y ${offersCount} ofertas alrededor de ${lat}, ${lng}.`);
    console.log('Las ofertas vencen en 1 a 5 horas; vuelve a ejecutar el script para renovarlas.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Error al crear datos demo:', error);
  process.exitCode = 1;
});
