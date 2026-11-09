/**
 * API de lugares (negocios), ofertas de rescate, reservas con QR,
 * favoritos, resenas, impacto ambiental y panel de negocio de Foodlink.
 *
 * Modulo compartido entre:
 *  - server/placesPlugin.ts  (servidor de desarrollo de Vite)
 *  - server/standalone.mjs   (servidor de produccion con PM2)
 */

const EARTH_RADIUS_M = 6371000;
const DEFAULT_RADIUS_M = 3000;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 25000;
const MAX_RESULTS = 100;

export const PLACES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NULL,
    owner_email VARCHAR(190) DEFAULT NULL,
    name VARCHAR(140) NOT NULL,
    type ENUM('restaurante','fonda','panaderia','cafeteria','puesto','mercado','comedor','otro') NOT NULL DEFAULT 'otro',
    description VARCHAR(500) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    opening_hours VARCHAR(255) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 4.80,
    rating_count INT NOT NULL DEFAULT 1,
    is_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_demo TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_businesses_lat_lng (lat, lng),
    INDEX idx_businesses_owner (owner_id),
    INDEX idx_businesses_owner_email (owner_email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    title VARCHAR(140) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    kind ENUM('producto','paquete_sorpresa') NOT NULL DEFAULT 'producto',
    original_price DECIMAL(8,2) NOT NULL DEFAULT 0,
    price DECIMAL(8,2) NOT NULL DEFAULT 0,
    quantity_total INT NOT NULL DEFAULT 1,
    quantity_left INT NOT NULL DEFAULT 1,
    est_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.65,
    pickup_start DATETIME NOT NULL,
    pickup_end DATETIME NOT NULL,
    tags VARCHAR(255) DEFAULT NULL,
    allergens VARCHAR(255) DEFAULT NULL,
    status ENUM('active','sold_out','expired','cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_offers_active (business_id, status, pickup_end),
    CONSTRAINT fk_offers_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(190) NOT NULL,
    user_name VARCHAR(140) NOT NULL DEFAULT 'Comensal Foodlink',
    business_id INT NOT NULL,
    offer_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,
    original_unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(8,2) NOT NULL DEFAULT 0,
    est_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.65,
    pickup_code VARCHAR(24) NOT NULL,
    status ENUM('reserved','picked_up','cancelled') NOT NULL DEFAULT 'reserved',
    has_review TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at DATETIME DEFAULT NULL,
    UNIQUE KEY idx_orders_code (pickup_code),
    INDEX idx_orders_user (user_email, created_at),
    INDEX idx_orders_business (business_id, status),
    CONSTRAINT fk_orders_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(190) NOT NULL,
    business_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_favorites_unique (user_email, business_id),
    INDEX idx_favorites_user (user_email),
    CONSTRAINT fk_favorites_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    order_id INT DEFAULT NULL,
    user_email VARCHAR(190) NOT NULL,
    user_name VARCHAR(140) NOT NULL DEFAULT 'Comensal',
    stars TINYINT NOT NULL,
    comment VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reviews_business (business_id, created_at),
    CONSTRAINT fk_reviews_business FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(190) NOT NULL,
    pickup_alias VARCHAR(140) DEFAULT NULL,
    dietary_tags VARCHAR(500) DEFAULT NULL,
    notify_favorites TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_user_preferences_email (user_email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

const SCHEMA_ALTERS = [
  "ALTER TABLE businesses ADD COLUMN owner_email VARCHAR(190) DEFAULT NULL",
  "ALTER TABLE businesses ADD COLUMN rating_avg DECIMAL(3,2) NOT NULL DEFAULT 4.80",
  "ALTER TABLE businesses ADD COLUMN rating_count INT NOT NULL DEFAULT 1",
  "ALTER TABLE offers ADD COLUMN est_weight_kg DECIMAL(6,2) NOT NULL DEFAULT 0.65",
  "ALTER TABLE users ADD COLUMN pickup_alias VARCHAR(140) DEFAULT NULL",
  "ALTER TABLE users ADD COLUMN dietary_tags VARCHAR(500) DEFAULT NULL"
];

export const DEMO_PLACES = [
  {
    name: 'Fonda Doña Lupita', type: 'fonda',
    description: 'Comida corrida casera: sopa, guisado del día y agua fresca.',
    address: 'Av. Principal 118, Local B',
    phone: '55 4123 8910',
    hours: 'Lun-Sáb 8:00-18:00',
    rating: 4.9, ratingCount: 18,
    dLatM: 240, dLngM: -190,
    reviews: [
      { user: 'Mariana G.', stars: 5, comment: 'Porciones generosas y el guisado recién hecho. Excelente trato al recoger.' },
      { user: 'Carlos R.', stars: 5, comment: 'Rescaté dos comidas corridas a mitad de precio, todo súper limpio y rápido.' }
    ],
    offers: [
      { title: 'Comida corrida del día', kind: 'producto', original: 85, price: 35, qty: 6, weight: 0.75, hoursLeft: 3.5, tags: 'casero, completo' },
      { title: 'Guisado sobrante para llevar', kind: 'producto', original: 60, price: 0, qty: 3, weight: 0.55, hoursLeft: 2.0, tags: 'gratis, solidario' }
    ]
  },
  {
    name: 'Panadería La Espiga', type: 'panaderia',
    description: 'Pan dulce tradicional y bolillo horneado hoy.',
    address: 'Calle Hidalgo 42',
    phone: '55 8392 1044',
    hours: 'Diario 7:00-21:00',
    rating: 4.8, ratingCount: 24,
    dLatM: -360, dLngM: 290,
    reviews: [
      { user: 'Sofía M.', stars: 5, comment: 'La bolsa sorpresa traía 7 piezas de pan dulce del día. Vale muchísimo la pena.' }
    ],
    offers: [
      { title: 'Bolsa sorpresa de pan dulce', kind: 'paquete_sorpresa', original: 120, price: 40, qty: 5, weight: 0.60, hoursLeft: 4.0, tags: 'vegetariano, dulce', allergens: 'gluten, huevo, lácteos' }
    ]
  },
  {
    name: 'Tacos El Güero', type: 'puesto',
    description: 'Tacos de guisado y arroz al cierre del puesto.',
    address: 'Esquina Reforma y Juárez',
    phone: '55 6712 3309',
    hours: 'Lun-Vie 9:00-17:00',
    rating: 4.7, ratingCount: 11,
    dLatM: 520, dLngM: 410,
    reviews: [
      { user: 'Diego T.', stars: 5, comment: 'Llegué con mi código QR y en dos minutos me entregaron mi orden bien servida.' }
    ],
    offers: [
      { title: 'Orden de 4 tacos de guisado', kind: 'producto', original: 70, price: 25, qty: 2, weight: 0.50, hoursLeft: 1.2, tags: 'al cierre, tradicional' }
    ]
  },
  {
    name: 'Comedor Comunitario San José', type: 'comedor',
    description: 'Comedor solidario. Platillos completos sin costo al final del servicio.',
    address: 'Calle Morelos 205',
    phone: '55 2901 4450',
    hours: 'Lun-Vie 12:00-17:30',
    rating: 5.0, ratingCount: 31,
    dLatM: -680, dLngM: -440,
    reviews: [
      { user: 'Elena V.', stars: 5, comment: 'Gran labor comunitaria, comida caliente y nutritiva sin desperdicio.' }
    ],
    offers: [
      { title: 'Plato caliente del día', kind: 'producto', original: 65, price: 0, qty: 12, weight: 0.70, hoursLeft: 3.0, tags: 'gratis, comunitario' }
    ]
  },
  {
    name: 'Cafetería Raíz', type: 'cafeteria',
    description: 'Café de especialidad, sándwiches artesanales y repostería.',
    address: 'Calle Allende 77',
    phone: '55 9104 2211',
    hours: 'Diario 8:00-20:30',
    rating: 4.9, ratingCount: 15,
    dLatM: 890, dLngM: -520,
    reviews: [
      { user: 'Andrés L.', stars: 5, comment: 'El paquete de repostería artesanal es increíble y evita que tiren pan de masa madre.' }
    ],
    offers: [
      { title: 'Sándwich artesanal del día', kind: 'producto', original: 95, price: 45, qty: 4, weight: 0.45, hoursLeft: 2.8, tags: 'vegetariano', allergens: 'gluten, lácteos' },
      { title: 'Paquete sorpresa de repostería', kind: 'paquete_sorpresa', original: 150, price: 55, qty: 3, weight: 0.65, hoursLeft: 3.8, tags: 'dulce, artesanal', allergens: 'gluten, huevo, nueces' }
    ]
  },
  {
    name: 'Cocina Económica Mary', type: 'fonda',
    description: 'Menú económico casero y desayunos.',
    address: 'Calle Zaragoza 19',
    phone: '55 3348 7721',
    hours: 'Lun-Sáb 7:30-17:00',
    rating: 4.8, ratingCount: 9,
    dLatM: -950, dLngM: 680,
    reviews: [
      { user: 'Patricia S.', stars: 5, comment: 'El mole casero está delicioso y las tortillas recién salidas del comal.' }
    ],
    offers: [
      { title: 'Arroz con mole y tortillas recién hechas', kind: 'producto', original: 75, price: 30, qty: 2, weight: 0.70, hoursLeft: 0.9, tags: 'últimas porciones, casero' }
    ]
  },
  {
    name: 'Pizzería Nonna', type: 'restaurante',
    description: 'Pizza artesanal de masa madre al horno de leña.',
    address: 'Av. Insurgentes 310',
    phone: '55 7823 9901',
    hours: 'Mar-Dom 13:00-23:00',
    rating: 4.8, ratingCount: 22,
    dLatM: 1250, dLngM: 760,
    reviews: [
      { user: 'Roberto H.', stars: 5, comment: 'Cuatro rebanadas grandes al horno de leña por 60 pesos al cierre. Súper recomendado.' }
    ],
    offers: [
      { title: 'Caja de 4 rebanadas del cierre', kind: 'paquete_sorpresa', original: 160, price: 60, qty: 4, weight: 0.85, hoursLeft: 4.5, tags: 'horno de leña, vegetariano', allergens: 'gluten, lácteos' }
    ]
  },
  {
    name: 'Jugos y Tortas Chabelita', type: 'puesto',
    description: 'Tortas, jugos naturales y fruta fresca del día.',
    address: 'Mercado Municipal, Pasillo 2',
    phone: '55 5019 6432',
    hours: 'Lun-Sáb 7:00-16:00',
    rating: 4.9, ratingCount: 14,
    dLatM: -420, dLngM: -860,
    reviews: [
      { user: 'Lucía P.', stars: 5, comment: 'Fruta súper fresca que regalan antes de cerrar el puesto para que no se desperdicie.' }
    ],
    offers: [
      { title: 'Vaso grande de fruta picada del día', kind: 'producto', original: 40, price: 0, qty: 5, weight: 0.50, hoursLeft: 2.2, tags: 'vegano, gratis, sin gluten' }
    ]
  }
];

const ACTIVE_OFFER_SQL = "o.status = 'active' AND o.quantity_left > 0 AND o.pickup_end > NOW()";

let schemaPromise = null;

export function ensurePlacesSchema(pool) {
  if (process.env.FOODLINK_DISABLE_PLACES_DB === '1') {
    return Promise.resolve(false);
  }
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of PLACES_SCHEMA) {
        await pool.query(statement);
      }
      for (const alter of SCHEMA_ALTERS) {
        try {
          await pool.query(alter);
        } catch {
          // Columna ya existe
        }
      }
      return true;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function haversineSql() {
  return `(${EARTH_RADIUS_M} * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(b.lat - ?) / 2), 2) +
    COS(RADIANS(?)) * COS(RADIANS(b.lat)) * POWER(SIN(RADIANS(b.lng - ?) / 2), 2)
  )))`;
}

function generatePickupCode() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `FL-${suffix}`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy();
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

function serializeOffer(row) {
  return {
    id: Number(row.id),
    business_id: Number(row.business_id),
    title: row.title,
    description: row.description || null,
    kind: row.kind || 'producto',
    original_price: Number(row.original_price || 0),
    price: Number(row.price || 0),
    quantity_total: Number(row.quantity_total || 1),
    quantity_left: Number(row.quantity_left || 0),
    est_weight_kg: Number(row.est_weight_kg || 0.65),
    pickup_start: row.pickup_start instanceof Date ? row.pickup_start.toISOString() : String(row.pickup_start),
    pickup_end: row.pickup_end instanceof Date ? row.pickup_end.toISOString() : String(row.pickup_end),
    tags: Array.isArray(row.tags)
      ? row.tags
      : row.tags
        ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    allergens: row.allergens || null,
    status: row.status || 'active'
  };
}

function serializePlace(row, offers, isFavorite = false) {
  return {
    id: Number(row.id),
    owner_email: row.owner_email || null,
    name: row.name,
    type: row.type,
    description: row.description || null,
    address: row.address || null,
    phone: row.phone || null,
    lat: Number(row.lat),
    lng: Number(row.lng),
    opening_hours: row.opening_hours || null,
    image_url: row.image_url || null,
    rating_avg: Number(row.rating_avg || 4.8),
    rating_count: Number(row.rating_count || 1),
    is_verified: Boolean(row.is_verified),
    is_favorite: Boolean(isFavorite),
    distance_m: row.distance_m !== undefined && row.distance_m !== null ? Math.round(Number(row.distance_m)) : null,
    offers
  };
}

function computeImpactSummary(orders) {
  const activeOrDone = orders.filter((o) => o.status === 'reserved' || o.status === 'picked_up');
  const completed = orders.filter((o) => o.status === 'picked_up');
  const rescuesCount = activeOrDone.reduce((acc, o) => acc + Number(o.quantity || 1), 0);
  const completedCount = completed.reduce((acc, o) => acc + Number(o.quantity || 1), 0);
  const kgSaved = Number(activeOrDone.reduce((acc, o) => acc + Number(o.est_weight_kg || 0.65), 0).toFixed(2));
  const co2AvoidedKg = Number((kgSaved * 2.5).toFixed(2));
  const waterLiters = Math.round(kgSaved * 680);
  const moneySaved = Math.round(
    activeOrDone.reduce((acc, o) => {
      const orig = Number(o.original_unit_price || 0);
      const paid = Number(o.unit_price || 0);
      const diff = orig > paid ? orig - paid : paid === 0 ? 55 : 0;
      return acc + diff * Number(o.quantity || 1);
    }, 0)
  );

  const tiers = [
    { min: 0, max: 2, title: 'Semilla Solidaria', next: 'Guardián del Barrio' },
    { min: 2, max: 5, title: 'Guardián del Barrio', next: 'Maestro del Rescate' },
    { min: 5, max: 12, title: 'Maestro del Rescate', next: 'Leyenda Culinaria' },
    { min: 12, max: 999, title: 'Leyenda Culinaria', next: 'Nivel Máximo' }
  ];
  const tier = tiers.find((t) => rescuesCount < t.max) || tiers[tiers.length - 1];
  const progress = tier.max === 999
    ? 100
    : Math.min(100, Math.round(((rescuesCount - tier.min) / Math.max(1, tier.max - tier.min)) * 100));

  const badges = [
    { id: 'first_rescue', title: 'Primer Rescate', desc: 'Apartaste tu primera comida en Foodlink', unlocked: rescuesCount >= 1 },
    { id: 'surprise_fan', title: 'Explorador Sorpresa', desc: 'Rescataste un paquete sorpresa al cierre', unlocked: activeOrDone.some((o) => o.offer_kind === 'paquete_sorpresa') },
    { id: 'zero_waste', title: 'Impacto 2 kg', desc: 'Evitaste el desperdicio de al menos 2 kg de alimentos', unlocked: kgSaved >= 2 },
    { id: 'community_hero', title: 'Héroe del Barrio', desc: '5 o más porciones rescatadas en comercios locales', unlocked: rescuesCount >= 5 }
  ];

  return {
    rescues_count: rescuesCount,
    completed_count: completedCount,
    kg_saved: kgSaved,
    co2_avoided_kg: co2AvoidedKg,
    water_liters: waterLiters,
    money_saved: moneySaved,
    level_title: tier.title,
    next_level_title: tier.next,
    next_level_target: tier.max === 999 ? rescuesCount : tier.max,
    level_progress: progress,
    badges
  };
}

export async function seedDemoPlacesAt(pool, lat, lng) {
  const now = Date.now();
  const cosLat = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  let offersCount = 0;

  for (const place of DEMO_PLACES) {
    const pLat = lat + place.dLatM / 111320;
    const pLng = lng + place.dLngM / (111320 * cosLat);

    const [result] = await pool.query(
      `INSERT INTO businesses (name, type, description, address, phone, lat, lng, opening_hours, rating_avg, rating_count, is_verified, is_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        place.name,
        place.type,
        place.description,
        place.address,
        place.phone,
        pLat.toFixed(6),
        pLng.toFixed(6),
        place.hours,
        place.rating || 4.8,
        place.ratingCount || 10
      ]
    );

    const businessId = result.insertId;

    for (const offer of place.offers) {
      const start = new Date(now - 30 * 60 * 1000);
      const end = new Date(now + (offer.hoursLeft || 3) * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO offers (business_id, title, kind, original_price, price, quantity_total, quantity_left,
                             est_weight_kg, pickup_start, pickup_end, tags, allergens)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessId,
          offer.title,
          offer.kind,
          offer.original,
          offer.price,
          offer.qty,
          offer.qty,
          offer.weight || 0.65,
          start,
          end,
          offer.tags || null,
          offer.allergens || null
        ]
      );
      offersCount++;
    }

    if (Array.isArray(place.reviews)) {
      for (const rev of place.reviews) {
        await pool.query(
          `INSERT INTO reviews (business_id, user_email, user_name, stars, comment)
           VALUES (?, 'demo@foodlink.mx', ?, ?, ?)`,
          [businessId, rev.user, rev.stars, rev.comment]
        );
      }
    }
  }
  return { placesCount: DEMO_PLACES.length, offersCount };
}

async function ensureDemoDataNear(pool, lat, lng) {
  const [[counts]] = await pool.query(
    'SELECT SUM(is_demo = 0) AS real_count, SUM(is_demo = 1) AS demo_count FROM businesses'
  );
  if (Number(counts?.real_count || 0) > 0) return;

  const dLat = MAX_RADIUS_M / 111320;
  const dLng = MAX_RADIUS_M / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  const [nearbyDemo] = await pool.query(
    'SELECT id FROM businesses WHERE is_demo = 1 AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? LIMIT 1',
    [lat - dLat, lat + dLat, lng - dLng, lng + dLng]
  );

  if (nearbyDemo.length === 0) {
    if (Number(counts?.demo_count || 0) > 0) {
      await pool.query('DELETE FROM businesses WHERE is_demo = 1');
    }
    await seedDemoPlacesAt(pool, lat, lng);
    return;
  }

  await pool.query(
    `UPDATE offers o
     JOIN businesses b ON b.id = o.business_id
     SET o.pickup_start = DATE_SUB(NOW(), INTERVAL 20 MINUTE),
         o.pickup_end = DATE_ADD(NOW(), INTERVAL 3 HOUR),
         o.quantity_left = o.quantity_total,
         o.status = 'active'
     WHERE b.is_demo = 1 AND (o.pickup_end <= NOW() OR o.quantity_left <= 0)`
  );
}

/* ------------------------------------------------------------------ */
/* Estado en memoria para desarrollo sin conexion a la Orange Pi       */
/* ------------------------------------------------------------------ */

const memoryStore = {
  center: null,
  places: [],
  nextPlaceId: 100,
  nextOfferId: 500,
  nextOrderId: 1000,
  nextReviewId: 2000,
  orders: [],
  favoritesByEmail: new Map(), // email -> Set<number>
  reviewsByBusiness: new Map(), // businessId -> Review[]
  preferencesByEmail: new Map() // email -> { pickup_alias, dietary_tags, notify_favorites }
};

function ensureMemorySeeded(centerLat, centerLng) {
  if (
    memoryStore.places.length === 0 ||
    (memoryStore.center &&
      haversineMeters(centerLat, centerLng, memoryStore.center.lat, memoryStore.center.lng) > MAX_RADIUS_M &&
      memoryStore.places.every((p) => p.is_demo))
  ) {
    memoryStore.center = { lat: centerLat, lng: centerLng };
    const cosLat = Math.max(0.01, Math.cos((centerLat * Math.PI) / 180));
    const now = Date.now();
    let offerId = 1;
    let revId = 1;

    memoryStore.places = DEMO_PLACES.map((p, idx) => {
      const id = idx + 1;
      const lat = Number((centerLat + p.dLatM / 111320).toFixed(6));
      const lng = Number((centerLng + p.dLngM / (111320 * cosLat)).toFixed(6));
      const offers = p.offers.map((o) => ({
        id: offerId++,
        business_id: id,
        title: o.title,
        description: null,
        kind: o.kind,
        original_price: o.original,
        price: o.price,
        quantity_total: o.qty,
        quantity_left: o.qty,
        est_weight_kg: o.weight || 0.65,
        pickup_start: new Date(now - 30 * 60 * 1000).toISOString(),
        pickup_end: new Date(now + (o.hoursLeft || 3) * 60 * 60 * 1000).toISOString(),
        tags: o.tags ? o.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        allergens: o.allergens || null,
        status: 'active'
      }));

      if (!memoryStore.reviewsByBusiness.has(id)) {
        memoryStore.reviewsByBusiness.set(
          id,
          (p.reviews || []).map((r) => ({
            id: revId++,
            business_id: id,
            user_name: r.user,
            stars: r.stars,
            comment: r.comment,
            created_at: new Date(now - 3600 * 1000 * 12).toISOString()
          }))
        );
      }

      return {
        id,
        owner_email: null,
        name: p.name,
        type: p.type,
        description: p.description,
        address: p.address,
        phone: p.phone,
        lat,
        lng,
        opening_hours: p.hours,
        image_url: null,
        rating_avg: p.rating || 4.8,
        rating_count: p.ratingCount || 10,
        is_verified: true,
        is_demo: true,
        offers
      };
    });
  }
}

function getMemoryFavSet(email) {
  const key = (email || 'invitado@foodlink.local').trim().toLowerCase();
  if (!memoryStore.favoritesByEmail.has(key)) {
    memoryStore.favoritesByEmail.set(key, new Set());
  }
  return memoryStore.favoritesByEmail.get(key);
}

/* ------------------------------------------------------------------ */
/* Consultas SQL auxiliares                                            */
/* ------------------------------------------------------------------ */

async function loadActiveOffers(pool, businessIds) {
  const byBusiness = new Map();
  if (businessIds.length === 0) return byBusiness;

  const [rows] = await pool.query(
    `SELECT o.* FROM offers o
     WHERE o.business_id IN (?) AND ${ACTIVE_OFFER_SQL}
     ORDER BY o.price ASC, o.pickup_end ASC`,
    [businessIds]
  );

  for (const row of rows) {
    if (!byBusiness.has(row.business_id)) byBusiness.set(row.business_id, []);
    byBusiness.get(row.business_id).push(serializeOffer(row));
  }
  return byBusiness;
}

async function loadUserFavoriteIds(pool, email) {
  if (!email) return new Set();
  const [rows] = await pool.query(
    'SELECT business_id FROM favorites WHERE user_email = ?',
    [email.trim().toLowerCase()]
  );
  return new Set(rows.map((r) => Number(r.business_id)));
}

/* ------------------------------------------------------------------ */
/* Handlers de endpoints                                               */
/* ------------------------------------------------------------------ */

async function handleNearby(url, pool, dbReady) {
  const lat = toNumber(url.searchParams.get('lat'));
  const lng = toNumber(url.searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return [400, { success: false, message: 'Parámetros lat y lng inválidos.' }];
  }

  const radiusParam = toNumber(url.searchParams.get('radius'));
  const radius = clamp(Number.isFinite(radiusParam) ? radiusParam : DEFAULT_RADIUS_M, MIN_RADIUS_M, MAX_RADIUS_M);
  const filter = url.searchParams.get('filter') || 'all';
  const category = url.searchParams.get('category') || 'all';
  const favoritesOnly = url.searchParams.get('favoritesOnly') === '1';
  const withoutOffers = url.searchParams.get('withoutOffers') === '1';
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();

  const filterOfferFn = (o) => {
    if (o.status && o.status !== 'active') return false;
    if (o.quantity_left <= 0) return false;
    if (filter === 'free') return o.price === 0;
    if (filter === 'discount') return o.price > 0;
    if (filter === 'surprise') return o.kind === 'paquete_sorpresa';
    return true;
  };

  if (!dbReady) {
    ensureMemorySeeded(lat, lng);
    const favSet = email ? getMemoryFavSet(email) : new Set();

    const allWithOffers = memoryStore.places.map((p) => {
      const distance_m = Math.round(haversineMeters(lat, lng, p.lat, p.lng));
      const activeOffers = p.offers.filter((o) => o.status === 'active' && o.quantity_left > 0);
      return { ...p, distance_m, is_favorite: favSet.has(p.id), activeOffers };
    });

    const activeFavoriteAlerts = allWithOffers
      .filter((p) => p.is_favorite && p.activeOffers.length > 0)
      .map((p) => ({ id: p.id, name: p.name, offers_count: p.activeOffers.length, distance_m: p.distance_m }));

    const places = allWithOffers
      .filter((p) => p.distance_m <= radius)
      .filter((p) => (category === 'all' ? true : p.type === category))
      .filter((p) => (favoritesOnly ? p.is_favorite : true))
      .map((p) => ({
        ...p,
        offers: p.activeOffers.filter(filterOfferFn)
      }))
      .filter((p) => (withoutOffers && filter === 'all' ? true : p.offers.length > 0))
      .sort((a, b) => a.distance_m - b.distance_m);

    return [200, {
      success: true,
      center: { lat, lng },
      radius,
      filter,
      category,
      favorite_ids: Array.from(favSet),
      active_favorite_alerts: activeFavoriteAlerts,
      server_time: new Date().toISOString(),
      places
    }];
  }

  await ensureDemoDataNear(pool, lat, lng);
  const favSet = await loadUserFavoriteIds(pool, email);

  const dLat = radius / 111320;
  const dLng = radius / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));

  let offerCondition = ACTIVE_OFFER_SQL;
  if (filter === 'free') offerCondition += ' AND o.price = 0';
  if (filter === 'discount') offerCondition += ' AND o.price > 0';
  if (filter === 'surprise') offerCondition += " AND o.kind = 'paquete_sorpresa'";

  const requireOffers = !withoutOffers || filter !== 'all';
  const existsClause = requireOffers
    ? `AND EXISTS (SELECT 1 FROM offers o WHERE o.business_id = b.id AND ${offerCondition})`
    : '';

  const [rows] = await pool.query(
    `SELECT b.*, ${haversineSql()} AS distance_m
     FROM businesses b
     WHERE b.lat BETWEEN ? AND ? AND b.lng BETWEEN ? AND ?
     ${existsClause}
     HAVING distance_m <= ?
     ORDER BY distance_m ASC
     LIMIT ${MAX_RESULTS}`,
    [lat, lat, lng, lat - dLat, lat + dLat, lng - dLng, lng + dLng, radius]
  );

  const offersByBusiness = await loadActiveOffers(pool, rows.map((r) => r.id));

  const allPlaces = rows.map((row) => {
    const offers = (offersByBusiness.get(row.id) || []).filter(filterOfferFn);
    return serializePlace(row, offers, favSet.has(Number(row.id)));
  });

  const activeFavoriteAlerts = allPlaces
    .filter((p) => p.is_favorite && p.offers.length > 0)
    .map((p) => ({ id: p.id, name: p.name, offers_count: p.offers.length, distance_m: p.distance_m }));

  const places = allPlaces
    .filter((p) => (category === 'all' ? true : p.type === category))
    .filter((p) => (favoritesOnly ? p.is_favorite : true))
    .filter((p) => (withoutOffers && filter === 'all' ? true : p.offers.length > 0));

  return [200, {
    success: true,
    center: { lat, lng },
    radius,
    filter,
    category,
    favorite_ids: Array.from(favSet),
    active_favorite_alerts: activeFavoriteAlerts,
    server_time: new Date().toISOString(),
    places
  }];
}

async function handlePlaceById(id, url, pool, dbReady) {
  const lat = toNumber(url.searchParams.get('lat'));
  const lng = toNumber(url.searchParams.get('lng'));
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng);

  if (!dbReady) {
    const ref = hasOrigin ? { lat, lng } : memoryStore.center || { lat: 19.4326, lng: -99.1332 };
    ensureMemorySeeded(ref.lat, ref.lng);
    const found = memoryStore.places.find((p) => p.id === id);
    if (!found) return [404, { success: false, message: 'Lugar no encontrado.' }];
    const favSet = email ? getMemoryFavSet(email) : new Set();
    const distance_m = hasOrigin ? Math.round(haversineMeters(lat, lng, found.lat, found.lng)) : null;
    const reviews = memoryStore.reviewsByBusiness.get(id) || [];
    const activeOffers = found.offers.filter((o) => o.status === 'active' && o.quantity_left > 0);
    return [200, {
      success: true,
      server_time: new Date().toISOString(),
      place: { ...found, distance_m, is_favorite: favSet.has(id), offers: activeOffers, reviews }
    }];
  }

  const [rows] = hasOrigin
    ? await pool.query(`SELECT b.*, ${haversineSql()} AS distance_m FROM businesses b WHERE b.id = ? LIMIT 1`, [lat, lat, lng, id])
    : await pool.query('SELECT b.* FROM businesses b WHERE b.id = ? LIMIT 1', [id]);

  if (rows.length === 0) {
    return [404, { success: false, message: 'Lugar no encontrado.' }];
  }

  const [offersByBusiness, favSet, [reviewRows]] = await Promise.all([
    loadActiveOffers(pool, [id]),
    loadUserFavoriteIds(pool, email),
    pool.query(
      'SELECT id, business_id, user_name, stars, comment, created_at FROM reviews WHERE business_id = ? ORDER BY created_at DESC LIMIT 15',
      [id]
    )
  ]);

  const place = serializePlace(rows[0], offersByBusiness.get(id) || [], favSet.has(id));
  place.reviews = reviewRows.map((r) => ({
    id: Number(r.id),
    business_id: Number(r.business_id),
    user_name: r.user_name,
    stars: Number(r.stars),
    comment: r.comment,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
  }));

  return [200, {
    success: true,
    server_time: new Date().toISOString(),
    place
  }];
}

async function handleCreateOrder(body, pool, dbReady) {
  const email = String(body.email || 'invitado@foodlink.local').trim().toLowerCase();
  const userName = String(body.userName || 'Comensal Foodlink').trim() || 'Comensal Foodlink';
  const offerId = Number(body.offerId);
  const quantity = clamp(Math.floor(Number(body.quantity || 1)), 1, 10);

  if (!Number.isFinite(offerId) || offerId <= 0) {
    return [400, { success: false, message: 'Selecciona una oferta válida para apartar.' }];
  }

  const pickupCode = generatePickupCode();

  if (!dbReady) {
    let targetPlace = null;
    let targetOffer = null;
    for (const p of memoryStore.places) {
      const off = p.offers.find((o) => o.id === offerId);
      if (off) {
        targetPlace = p;
        targetOffer = off;
        break;
      }
    }
    if (!targetPlace || !targetOffer) {
      return [404, { success: false, message: 'La oferta ya no existe.' }];
    }
    if (targetOffer.status !== 'active' || targetOffer.quantity_left < quantity) {
      return [409, { success: false, message: `Solo quedan ${targetOffer.quantity_left} unidades disponibles.` }];
    }

    targetOffer.quantity_left -= quantity;
    if (targetOffer.quantity_left <= 0) {
      targetOffer.status = 'sold_out';
    }

    const estWeight = Number(((targetOffer.est_weight_kg || 0.65) * quantity).toFixed(2));
    const order = {
      id: memoryStore.nextOrderId++,
      user_email: email,
      user_name: userName,
      business_id: targetPlace.id,
      business_name: targetPlace.name,
      business_type: targetPlace.type,
      business_address: targetPlace.address,
      business_phone: targetPlace.phone,
      business_lat: targetPlace.lat,
      business_lng: targetPlace.lng,
      offer_id: targetOffer.id,
      offer_title: targetOffer.title,
      offer_kind: targetOffer.kind,
      pickup_start: targetOffer.pickup_start,
      pickup_end: targetOffer.pickup_end,
      quantity,
      unit_price: targetOffer.price,
      original_unit_price: targetOffer.original_price,
      total_price: Number((targetOffer.price * quantity).toFixed(2)),
      est_weight_kg: estWeight,
      pickup_code: pickupCode,
      status: 'reserved',
      has_review: false,
      created_at: new Date().toISOString(),
      picked_up_at: null
    };
    memoryStore.orders.unshift(order);
    return [201, { success: true, message: 'Reserva confirmada. Muestra tu código QR en el local.', order }];
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [offerRows] = await conn.query(
      `SELECT o.*, b.name AS business_name, b.type AS business_type, b.address AS business_address,
              b.phone AS business_phone, b.lat AS business_lat, b.lng AS business_lng
       FROM offers o
       JOIN businesses b ON b.id = o.business_id
       WHERE o.id = ? FOR UPDATE`,
      [offerId]
    );

    if (offerRows.length === 0) {
      await conn.rollback();
      return [404, { success: false, message: 'La oferta seleccionada no existe.' }];
    }

    const off = offerRows[0];
    if (off.status !== 'active' || Number(off.quantity_left) < quantity) {
      await conn.rollback();
      return [409, { success: false, message: `Lo sentimos, solo quedan ${off.quantity_left} disponibles.` }];
    }

    const newLeft = Number(off.quantity_left) - quantity;
    const newStatus = newLeft <= 0 ? 'sold_out' : 'active';
    await conn.query(
      'UPDATE offers SET quantity_left = ?, status = ? WHERE id = ?',
      [newLeft, newStatus, offerId]
    );

    const unitPrice = Number(off.price || 0);
    const origUnitPrice = Number(off.original_price || 0);
    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    const estWeight = Number(((Number(off.est_weight_kg || 0.65)) * quantity).toFixed(2));

    const [ins] = await conn.query(
      `INSERT INTO orders (user_email, user_name, business_id, offer_id, quantity, unit_price, original_unit_price,
                           total_price, est_weight_kg, pickup_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved')`,
      [email, userName, off.business_id, offerId, quantity, unitPrice, origUnitPrice, totalPrice, estWeight, pickupCode]
    );

    await conn.commit();

    const order = {
      id: ins.insertId,
      user_email: email,
      user_name: userName,
      business_id: Number(off.business_id),
      business_name: off.business_name,
      business_type: off.business_type,
      business_address: off.business_address,
      business_phone: off.business_phone,
      business_lat: Number(off.business_lat),
      business_lng: Number(off.business_lng),
      offer_id: Number(off.id),
      offer_title: off.title,
      offer_kind: off.kind,
      pickup_start: off.pickup_start instanceof Date ? off.pickup_start.toISOString() : String(off.pickup_start),
      pickup_end: off.pickup_end instanceof Date ? off.pickup_end.toISOString() : String(off.pickup_end),
      quantity,
      unit_price: unitPrice,
      original_unit_price: origUnitPrice,
      total_price: totalPrice,
      est_weight_kg: estWeight,
      pickup_code: pickupCode,
      status: 'reserved',
      has_review: false,
      created_at: new Date().toISOString(),
      picked_up_at: null
    };

    return [201, { success: true, message: 'Reserva confirmada. Muestra tu código QR en el local.', order }];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function handleListOrders(url, pool, dbReady) {
  const email = (url.searchParams.get('email') || 'invitado@foodlink.local').trim().toLowerCase();

  if (!dbReady) {
    const orders = memoryStore.orders.filter((o) => o.user_email === email);
    return [200, {
      success: true,
      orders,
      impact: computeImpactSummary(orders)
    }];
  }

  const [rows] = await pool.query(
    `SELECT ord.*,
            o.title AS offer_title, o.kind AS offer_kind, o.pickup_start, o.pickup_end,
            b.name AS business_name, b.type AS business_type, b.address AS business_address,
            b.phone AS business_phone, b.lat AS business_lat, b.lng AS business_lng
     FROM orders ord
     JOIN offers o ON o.id = ord.offer_id
     JOIN businesses b ON b.id = ord.business_id
     WHERE ord.user_email = ?
     ORDER BY ord.created_at DESC
     LIMIT 60`,
    [email]
  );

  const orders = rows.map((r) => ({
    id: Number(r.id),
    user_email: r.user_email,
    user_name: r.user_name,
    business_id: Number(r.business_id),
    business_name: r.business_name,
    business_type: r.business_type,
    business_address: r.business_address,
    business_phone: r.business_phone,
    business_lat: Number(r.business_lat),
    business_lng: Number(r.business_lng),
    offer_id: Number(r.offer_id),
    offer_title: r.offer_title,
    offer_kind: r.offer_kind,
    pickup_start: r.pickup_start instanceof Date ? r.pickup_start.toISOString() : String(r.pickup_start),
    pickup_end: r.pickup_end instanceof Date ? r.pickup_end.toISOString() : String(r.pickup_end),
    quantity: Number(r.quantity),
    unit_price: Number(r.unit_price),
    original_unit_price: Number(r.original_unit_price),
    total_price: Number(r.total_price),
    est_weight_kg: Number(r.est_weight_kg),
    pickup_code: r.pickup_code,
    status: r.status,
    has_review: Boolean(r.has_review),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    picked_up_at: r.picked_up_at instanceof Date ? r.picked_up_at.toISOString() : r.picked_up_at || null
  }));

  return [200, {
    success: true,
    orders,
    impact: computeImpactSummary(orders)
  }];
}

async function handleCancelOrder(orderId, body, pool, dbReady) {
  const email = String(body.email || 'invitado@foodlink.local').trim().toLowerCase();

  if (!dbReady) {
    const ord = memoryStore.orders.find((o) => o.id === orderId && o.user_email === email);
    if (!ord) return [404, { success: false, message: 'Pedido no encontrado.' }];
    if (ord.status !== 'reserved') {
      return [400, { success: false, message: 'Solo se pueden cancelar reservas pendientes.' }];
    }
    ord.status = 'cancelled';
    for (const p of memoryStore.places) {
      const off = p.offers.find((o) => o.id === ord.offer_id);
      if (off) {
        off.quantity_left += ord.quantity;
        off.status = 'active';
        break;
      }
    }
    return [200, { success: true, message: 'Reserva cancelada y unidades liberadas.', order: ord }];
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT * FROM orders WHERE id = ? AND user_email = ? FOR UPDATE',
      [orderId, email]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return [404, { success: false, message: 'Reserva no encontrada.' }];
    }
    const ord = rows[0];
    if (ord.status !== 'reserved') {
      await conn.rollback();
      return [400, { success: false, message: 'Esta reserva ya no está activa.' }];
    }
    await conn.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
    await conn.query(
      "UPDATE offers SET quantity_left = quantity_left + ?, status = 'active' WHERE id = ?",
      [ord.quantity, ord.offer_id]
    );
    await conn.commit();
    return [200, { success: true, message: 'Reserva cancelada y unidades devueltas.' }];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function handleToggleFavorite(body, pool, dbReady) {
  const email = String(body.email || 'invitado@foodlink.local').trim().toLowerCase();
  const businessId = Number(body.businessId);
  if (!Number.isFinite(businessId) || businessId <= 0) {
    return [400, { success: false, message: 'Negocio inválido.' }];
  }

  if (!dbReady) {
    const favSet = getMemoryFavSet(email);
    let isFav = false;
    if (favSet.has(businessId)) {
      favSet.delete(businessId);
      isFav = false;
    } else {
      favSet.add(businessId);
      isFav = true;
    }
    return [200, {
      success: true,
      is_favorite: isFav,
      favorite_ids: Array.from(favSet)
    }];
  }

  const [existing] = await pool.query(
    'SELECT id FROM favorites WHERE user_email = ? AND business_id = ? LIMIT 1',
    [email, businessId]
  );

  let isFav = false;
  if (existing.length > 0) {
    await pool.query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
    isFav = false;
  } else {
    await pool.query(
      'INSERT IGNORE INTO favorites (user_email, business_id) VALUES (?, ?)',
      [email, businessId]
    );
    isFav = true;
  }

  const favSet = await loadUserFavoriteIds(pool, email);
  return [200, {
    success: true,
    is_favorite: isFav,
    favorite_ids: Array.from(favSet)
  }];
}

async function handleCreateReview(body, pool, dbReady) {
  const email = String(body.email || 'invitado@foodlink.local').trim().toLowerCase();
  const userName = String(body.userName || 'Comensal Foodlink').trim() || 'Comensal Foodlink';
  const businessId = Number(body.businessId);
  const orderId = body.orderId ? Number(body.orderId) : null;
  const stars = clamp(Math.round(Number(body.stars || 5)), 1, 5);
  const comment = String(body.comment || '').trim().slice(0, 480);

  if (!Number.isFinite(businessId) || businessId <= 0) {
    return [400, { success: false, message: 'Selecciona un negocio válido.' }];
  }

  if (!dbReady) {
    const place = memoryStore.places.find((p) => p.id === businessId);
    if (!place) return [404, { success: false, message: 'Negocio no encontrado.' }];

    const list = memoryStore.reviewsByBusiness.get(businessId) || [];
    const review = {
      id: memoryStore.nextReviewId++,
      business_id: businessId,
      user_name: userName,
      stars,
      comment: comment || 'Excelente atención y comida fresca.',
      created_at: new Date().toISOString()
    };
    list.unshift(review);
    memoryStore.reviewsByBusiness.set(businessId, list);

    const prevTotal = place.rating_avg * place.rating_count;
    place.rating_count += 1;
    place.rating_avg = Number(((prevTotal + stars) / place.rating_count).toFixed(2));

    if (orderId) {
      const ord = memoryStore.orders.find((o) => o.id === orderId);
      if (ord) ord.has_review = true;
    }

    return [201, {
      success: true,
      message: 'Gracias por tu reseña.',
      review,
      rating_avg: place.rating_avg,
      rating_count: place.rating_count
    }];
  }

  const [ins] = await pool.query(
    'INSERT INTO reviews (business_id, order_id, user_email, user_name, stars, comment) VALUES (?, ?, ?, ?, ?, ?)',
    [businessId, orderId, email, userName, stars, comment || null]
  );

  if (orderId) {
    await pool.query('UPDATE orders SET has_review = 1 WHERE id = ?', [orderId]);
  }

  const [[agg]] = await pool.query(
    'SELECT AVG(stars) AS avg_stars, COUNT(*) AS cnt FROM reviews WHERE business_id = ?',
    [businessId]
  );
  const ratingAvg = Number(Number(agg?.avg_stars || stars).toFixed(2));
  const ratingCount = Number(agg?.cnt || 1);

  await pool.query(
    'UPDATE businesses SET rating_avg = ?, rating_count = ? WHERE id = ?',
    [ratingAvg, ratingCount, businessId]
  );

  return [201, {
    success: true,
    message: 'Gracias por compartir tu reseña.',
    review: {
      id: ins.insertId,
      business_id: businessId,
      user_name: userName,
      stars,
      comment: comment || null,
      created_at: new Date().toISOString()
    },
    rating_avg: ratingAvg,
    rating_count: ratingCount
  }];
}

async function handleBusinessPanel(url, pool, dbReady) {
  const email = (url.searchParams.get('email') || 'invitado@foodlink.local').trim().toLowerCase();
  const requestedId = Number(url.searchParams.get('businessId') || 0);
  const lat = toNumber(url.searchParams.get('lat')) || 19.4326;
  const lng = toNumber(url.searchParams.get('lng')) || -99.1332;

  if (!dbReady) {
    ensureMemorySeeded(lat, lng);
    const available = memoryStore.places.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      is_owner: p.owner_email === email
    }));

    let selected =
      (requestedId ? memoryStore.places.find((p) => p.id === requestedId) : null) ||
      memoryStore.places.find((p) => p.owner_email === email) ||
      memoryStore.places[0] ||
      null;

    if (!selected) {
      return [200, { success: true, business: null, available_businesses: [], offers: [], orders: [], stats: null }];
    }

    const orders = memoryStore.orders.filter((o) => o.business_id === selected.id);
    const completed = orders.filter((o) => o.status === 'picked_up');
    const pending = orders.filter((o) => o.status === 'reserved');
    const kgRescued = Number(completed.reduce((acc, o) => acc + Number(o.est_weight_kg || 0.65), 0).toFixed(2));
    const revenue = Math.round(completed.reduce((acc, o) => acc + Number(o.total_price || 0), 0));

    return [200, {
      success: true,
      business: selected,
      available_businesses: available,
      offers: selected.offers,
      orders,
      stats: {
        active_offers: selected.offers.filter((o) => o.status === 'active' && o.quantity_left > 0).length,
        pending_orders: pending.length,
        completed_orders: completed.length,
        revenue_mxn: revenue,
        kg_rescued: kgRescued,
        co2_avoided_kg: Number((kgRescued * 2.5).toFixed(2)),
        rating_avg: selected.rating_avg,
        rating_count: selected.rating_count
      }
    }];
  }

  await ensureDemoDataNear(pool, lat, lng);

  const [allBiz] = await pool.query(
    'SELECT id, name, type, owner_email, description, address, phone, lat, lng, opening_hours, rating_avg, rating_count, is_verified FROM businesses ORDER BY (owner_email = ?) DESC, id ASC LIMIT 30',
    [email]
  );

  const available = allBiz.map((b) => ({
    id: Number(b.id),
    name: b.name,
    type: b.type,
    is_owner: Boolean(b.owner_email && String(b.owner_email).toLowerCase() === email)
  }));

  const targetRow =
    (requestedId ? allBiz.find((b) => Number(b.id) === requestedId) : null) ||
    allBiz.find((b) => b.owner_email && String(b.owner_email).toLowerCase() === email) ||
    allBiz[0] ||
    null;

  if (!targetRow) {
    return [200, { success: true, business: null, available_businesses: [], offers: [], orders: [], stats: null }];
  }

  const bizId = Number(targetRow.id);
  const [[offerRows], [orderRows]] = await Promise.all([
    pool.query('SELECT * FROM offers WHERE business_id = ? ORDER BY created_at DESC LIMIT 30', [bizId]),
    pool.query(
      `SELECT ord.*, o.title AS offer_title, o.kind AS offer_kind, o.pickup_start, o.pickup_end
       FROM orders ord
       JOIN offers o ON o.id = ord.offer_id
       WHERE ord.business_id = ?
       ORDER BY ord.created_at DESC
       LIMIT 40`,
      [bizId]
    )
  ]);

  const offers = offerRows.map(serializeOffer);
  const orders = orderRows.map((r) => ({
    id: Number(r.id),
    user_email: r.user_email,
    user_name: r.user_name,
    business_id: Number(r.business_id),
    offer_id: Number(r.offer_id),
    offer_title: r.offer_title,
    offer_kind: r.offer_kind,
    quantity: Number(r.quantity),
    unit_price: Number(r.unit_price),
    total_price: Number(r.total_price),
    est_weight_kg: Number(r.est_weight_kg),
    pickup_code: r.pickup_code,
    status: r.status,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    picked_up_at: r.picked_up_at instanceof Date ? r.picked_up_at.toISOString() : r.picked_up_at || null
  }));

  const completed = orders.filter((o) => o.status === 'picked_up');
  const pending = orders.filter((o) => o.status === 'reserved');
  const kgRescued = Number(completed.reduce((acc, o) => acc + Number(o.est_weight_kg || 0.65), 0).toFixed(2));
  const revenue = Math.round(completed.reduce((acc, o) => acc + Number(o.total_price || 0), 0));

  return [200, {
    success: true,
    business: serializePlace(targetRow, offers, false),
    available_businesses: available,
    offers,
    orders,
    stats: {
      active_offers: offers.filter((o) => o.status === 'active' && o.quantity_left > 0).length,
      pending_orders: pending.length,
      completed_orders: completed.length,
      revenue_mxn: revenue,
      kg_rescued: kgRescued,
      co2_avoided_kg: Number((kgRescued * 2.5).toFixed(2)),
      rating_avg: Number(targetRow.rating_avg || 4.8),
      rating_count: Number(targetRow.rating_count || 1)
    }
  }];
}

async function handleSaveBusiness(body, pool, dbReady) {
  const email = String(body.email || 'invitado@foodlink.local').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const type = String(body.type || 'fonda').trim();
  const description = String(body.description || '').trim() || null;
  const address = String(body.address || '').trim() || null;
  const phone = String(body.phone || '').trim() || null;
  const openingHours = String(body.opening_hours || 'Lun-Sáb 9:00-20:00').trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!name || name.length < 2) {
    return [400, { success: false, message: 'Escribe el nombre del negocio.' }];
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [400, { success: false, message: 'Coordenadas de ubicación inválidas.' }];
  }

  if (!dbReady) {
    const newBiz = {
      id: memoryStore.nextPlaceId++,
      owner_email: email,
      name,
      type,
      description,
      address,
      phone,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      opening_hours: openingHours,
      image_url: null,
      rating_avg: 5.0,
      rating_count: 1,
      is_verified: true,
      is_demo: false,
      offers: []
    };
    memoryStore.places.unshift(newBiz);
    return [201, { success: true, message: 'Negocio registrado en el mapa.', business: newBiz }];
  }

  const [ins] = await pool.query(
    `INSERT INTO businesses (owner_email, name, type, description, address, phone, lat, lng, opening_hours, rating_avg, rating_count, is_verified, is_demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.00, 1, 1, 0)`,
    [email, name, type, description, address, phone, lat.toFixed(6), lng.toFixed(6), openingHours]
  );

  return [201, {
    success: true,
    message: 'Establecimiento registrado en el mapa.',
    business: {
      id: ins.insertId,
      owner_email: email,
      name,
      type,
      description,
      address,
      phone,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      opening_hours: openingHours,
      rating_avg: 5.0,
      rating_count: 1,
      is_verified: true,
      offers: []
    }
  }];
}

async function handleCreateOffer(body, pool, dbReady) {
  const businessId = Number(body.businessId);
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim() || null;
  const kind = body.kind === 'paquete_sorpresa' ? 'paquete_sorpresa' : 'producto';
  const originalPrice = Math.max(0, Number(body.original_price || 0));
  const price = Math.max(0, Number(body.price || 0));
  const quantityTotal = clamp(Math.floor(Number(body.quantity_total || 3)), 1, 200);
  const pickupHours = clamp(Number(body.pickup_hours || 3), 0.5, 24);
  const estWeightKg = clamp(Number(body.est_weight_kg || 0.65), 0.1, 25);
  const tags = String(body.tags || '').trim() || null;
  const allergens = String(body.allergens || '').trim() || null;

  if (!Number.isFinite(businessId) || businessId <= 0) {
    return [400, { success: false, message: 'Selecciona el negocio donde se publicará la oferta.' }];
  }
  if (!title || title.length < 3) {
    return [400, { success: false, message: 'Escribe el título de la oferta o paquete.' }];
  }

  const now = Date.now();
  const pickupStart = new Date(now - 5 * 60 * 1000);
  const pickupEnd = new Date(now + pickupHours * 60 * 60 * 1000);

  if (!dbReady) {
    const place = memoryStore.places.find((p) => p.id === businessId);
    if (!place) return [404, { success: false, message: 'Negocio no encontrado.' }];

    const offer = {
      id: memoryStore.nextOfferId++,
      business_id: businessId,
      title,
      description,
      kind,
      original_price: originalPrice,
      price,
      quantity_total: quantityTotal,
      quantity_left: quantityTotal,
      est_weight_kg: estWeightKg,
      pickup_start: pickupStart.toISOString(),
      pickup_end: pickupEnd.toISOString(),
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      allergens,
      status: 'active'
    };
    place.offers.unshift(offer);
    return [201, { success: true, message: 'Oferta publicada y activa en el mapa.', offer }];
  }

  const [ins] = await pool.query(
    `INSERT INTO offers (business_id, title, description, kind, original_price, price, quantity_total, quantity_left,
                         est_weight_kg, pickup_start, pickup_end, tags, allergens, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      businessId,
      title,
      description,
      kind,
      originalPrice,
      price,
      quantityTotal,
      quantityTotal,
      estWeightKg,
      pickupStart,
      pickupEnd,
      tags,
      allergens
    ]
  );

  return [201, {
    success: true,
    message: 'Oferta publicada y visible en el mapa.',
    offer: {
      id: ins.insertId,
      business_id: businessId,
      title,
      description,
      kind,
      original_price: originalPrice,
      price,
      quantity_total: quantityTotal,
      quantity_left: quantityTotal,
      est_weight_kg: estWeightKg,
      pickup_start: pickupStart.toISOString(),
      pickup_end: pickupEnd.toISOString(),
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      allergens,
      status: 'active'
    }
  }];
}

async function handleCloseOffer(offerId, pool, dbReady) {
  if (!dbReady) {
    for (const p of memoryStore.places) {
      const off = p.offers.find((o) => o.id === offerId);
      if (off) {
        off.status = 'cancelled';
        off.quantity_left = 0;
        return [200, { success: true, message: 'Oferta cerrada.' }];
      }
    }
    return [404, { success: false, message: 'Oferta no encontrada.' }];
  }

  await pool.query("UPDATE offers SET status = 'cancelled', quantity_left = 0 WHERE id = ?", [offerId]);
  return [200, { success: true, message: 'Oferta finalizada.' }];
}

async function handleRedeemOrder(body, pool, dbReady) {
  let rawCode = String(body.pickup_code || '').trim().toUpperCase();
  if (!rawCode) {
    return [400, { success: false, message: 'Ingresa el código QR o código de recogida (ej. FL-7K4M92).' }];
  }
  if (rawCode.startsWith('FOODLINK:')) {
    rawCode = rawCode.replace(/^FOODLINK:/, '').trim();
  }
  if (!rawCode.startsWith('FL-') && rawCode.length === 6) {
    rawCode = `FL-${rawCode}`;
  }

  if (!dbReady) {
    const ord = memoryStore.orders.find((o) => o.pickup_code.toUpperCase() === rawCode);
    if (!ord) {
      return [404, { success: false, message: `No se encontró ninguna reserva con el código ${rawCode}.` }];
    }
    if (ord.status === 'picked_up') {
      return [400, { success: false, message: `El código ${rawCode} ya fue canjeado anteriormente.` }];
    }
    if (ord.status === 'cancelled') {
      return [400, { success: false, message: `La reserva ${rawCode} fue cancelada.` }];
    }
    ord.status = 'picked_up';
    ord.picked_up_at = new Date().toISOString();
    return [200, {
      success: true,
      message: `Entrega validada: ${ord.quantity}x ${ord.offer_title} para ${ord.user_name}.`,
      order: ord
    }];
  }

  const [rows] = await pool.query(
    `SELECT ord.*, o.title AS offer_title
     FROM orders ord
     JOIN offers o ON o.id = ord.offer_id
     WHERE UPPER(ord.pickup_code) = ? LIMIT 1`,
    [rawCode]
  );

  if (rows.length === 0) {
    return [404, { success: false, message: `No existe ninguna reserva con el código ${rawCode}.` }];
  }

  const ord = rows[0];
  if (ord.status === 'picked_up') {
    return [400, { success: false, message: `El código ${rawCode} ya fue entregado anteriormente.` }];
  }
  if (ord.status === 'cancelled') {
    return [400, { success: false, message: `La reserva ${rawCode} está cancelada.` }];
  }

  await pool.query(
    "UPDATE orders SET status = 'picked_up', picked_up_at = NOW() WHERE id = ?",
    [ord.id]
  );

  return [200, {
    success: true,
    message: `Entrega validada: ${ord.quantity}x ${ord.offer_title} para ${ord.user_name}.`,
    order: {
      id: Number(ord.id),
      pickup_code: ord.pickup_code,
      user_name: ord.user_name,
      offer_title: ord.offer_title,
      quantity: Number(ord.quantity),
      total_price: Number(ord.total_price),
      status: 'picked_up'
    }
  }];
}

/* ------------------------------------------------------------------ */
/* 9. GET y POST /api/places/profile (preferencias en FOODLINK)        */
/* ------------------------------------------------------------------ */

async function handleGetProfile(url, pool, dbReady) {
  const userEmail = (url.searchParams.get('user_email') || 'invitado@foodlink.local').trim().toLowerCase();

  if (!dbReady) {
    const saved = memoryStore.preferencesByEmail.get(userEmail) || {
      pickup_alias: null,
      dietary_tags: ['Sin restricciones', 'Comida corrida casera'],
      notify_favorites: true
    };
    return [200, { success: true, profile: saved }];
  }

  const [prefRows] = await pool.query(
    'SELECT pickup_alias, dietary_tags, notify_favorites FROM user_preferences WHERE user_email = ? LIMIT 1',
    [userEmail]
  );

  if (prefRows.length > 0) {
    const row = prefRows[0];
    const tags = row.dietary_tags
      ? String(row.dietary_tags).split(',').map((t) => t.trim()).filter(Boolean)
      : ['Sin restricciones', 'Comida corrida casera'];
    return [200, {
      success: true,
      profile: {
        pickup_alias: row.pickup_alias || null,
        dietary_tags: tags,
        notify_favorites: Boolean(row.notify_favorites)
      }
    }];
  }

  return [200, {
    success: true,
    profile: {
      pickup_alias: null,
      dietary_tags: ['Sin restricciones', 'Comida corrida casera'],
      notify_favorites: true
    }
  }];
}

async function handleSaveProfile(body, pool, dbReady) {
  const userEmail = String(body.user_email || 'invitado@foodlink.local').trim().toLowerCase();
  const pickupAlias = String(body.pickup_alias || body.name || '').trim() || null;
  const rawTags = Array.isArray(body.dietary_tags)
    ? body.dietary_tags.map((t) => String(t).trim()).filter(Boolean)
    : String(body.dietary_tags || '').split(',').map((t) => t.trim()).filter(Boolean);
  const tagsCsv = rawTags.join(', ');
  const notifyFavorites = body.notify_favorites === undefined ? 1 : body.notify_favorites ? 1 : 0;

  if (!dbReady) {
    const pref = {
      pickup_alias: pickupAlias,
      dietary_tags: rawTags,
      notify_favorites: Boolean(notifyFavorites)
    };
    memoryStore.preferencesByEmail.set(userEmail, pref);
    return [200, {
      success: true,
      message: 'Preferencias guardadas.',
      profile: pref
    }];
  }

  await pool.query(
    `INSERT INTO user_preferences (user_email, pickup_alias, dietary_tags, notify_favorites)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       pickup_alias = VALUES(pickup_alias),
       dietary_tags = VALUES(dietary_tags),
       notify_favorites = VALUES(notify_favorites)`,
    [userEmail, pickupAlias, tagsCsv || null, notifyFavorites]
  );

  if (pickupAlias) {
    await pool.query(
      'UPDATE users SET name = ?, pickup_alias = ?, dietary_tags = ? WHERE email = ?',
      [pickupAlias, pickupAlias, tagsCsv || null, userEmail]
    );
  }

  return [200, {
    success: true,
    message: 'Preferencias guardadas en la base de datos FOODLINK.',
    profile: {
      pickup_alias: pickupAlias,
      dietary_tags: rawTags,
      notify_favorites: Boolean(notifyFavorites)
    }
  }];
}

/* ------------------------------------------------------------------ */
/* Router principal /api/places/*                                      */
/* ------------------------------------------------------------------ */

export async function handlePlacesRequest(req, res, url, pool, sendJson) {
  const pathname = url.pathname.replace(/\/+$/, '');
  if (!pathname.startsWith('/api/places')) return false;

  const method = (req.method || 'GET').toUpperCase();

  try {
    let dbReady = true;
    try {
      dbReady = Boolean(await ensurePlacesSchema(pool));
    } catch (dbErr) {
      dbReady = false;
      console.warn('[Places API]: Usando almacenamiento en memoria:', dbErr?.message || dbErr);
    }

    if (method === 'GET' && pathname === '/api/places/profile') {
      const [status, body] = await handleGetProfile(url, pool, dbReady);
      sendJson(res, status, body);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/profile') {
      const body = await parseBody(req);
      const [status, payload] = await handleSaveProfile(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'GET' && pathname === '/api/places/nearby') {
      const [status, body] = await handleNearby(url, pool, dbReady);
      sendJson(res, status, body);
      return true;
    }

    if (method === 'GET' && pathname === '/api/places/orders') {
      const [status, body] = await handleListOrders(url, pool, dbReady);
      sendJson(res, status, body);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/orders') {
      const body = await parseBody(req);
      const [status, payload] = await handleCreateOrder(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    const cancelMatch = pathname.match(/^\/api\/places\/orders\/(\d+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      const body = await parseBody(req);
      const [status, payload] = await handleCancelOrder(Number(cancelMatch[1]), body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/favorites/toggle') {
      const body = await parseBody(req);
      const [status, payload] = await handleToggleFavorite(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/reviews') {
      const body = await parseBody(req);
      const [status, payload] = await handleCreateReview(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'GET' && pathname === '/api/places/business/panel') {
      const [status, payload] = await handleBusinessPanel(url, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/business') {
      const body = await parseBody(req);
      const [status, payload] = await handleSaveBusiness(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/business/offers') {
      const body = await parseBody(req);
      const [status, payload] = await handleCreateOffer(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    const closeOfferMatch = pathname.match(/^\/api\/places\/business\/offers\/(\d+)\/close$/);
    if (method === 'POST' && closeOfferMatch) {
      const [status, payload] = await handleCloseOffer(Number(closeOfferMatch[1]), pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    if (method === 'POST' && pathname === '/api/places/business/redeem') {
      const body = await parseBody(req);
      const [status, payload] = await handleRedeemOrder(body, pool, dbReady);
      sendJson(res, status, payload);
      return true;
    }

    const placeMatch = pathname.match(/^\/api\/places\/(\d+)$/);
    if (method === 'GET' && placeMatch) {
      const [status, body] = await handlePlaceById(Number(placeMatch[1]), url, pool, dbReady);
      sendJson(res, status, body);
      return true;
    }

    sendJson(res, 404, { success: false, message: 'Ruta no encontrada en el servicio de lugares.' });
    return true;
  } catch (error) {
    console.error('[Places API Error]:', error);
    sendJson(res, 500, { success: false, message: 'Error al procesar la solicitud en Foodlink.' });
    return true;
  }
}
