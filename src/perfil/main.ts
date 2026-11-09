/**
 * FOODLINK - Seccion dedicada Mi Perfil (/perfil/):
 *  - Resumen de Cuenta y Preferencias (alias, etiquetas alimentarias, sesion).
 *  - Mis Pedidos y Codigos QR escaneables (SVG ISO/IEC 18004) para pago en el local.
 *  - Mi Impacto Ambiental y Ahorro (kg salvados, CO2 evitado, agua preservada, ahorro MXN e insignias).
 *  - Locales Favoritos y Alertas de rescate.
 *  - Panel de Mi Negocio (alta de local, estadisticas, canje de codigos QR y publicacion en 20s con plantillas).
 * Zero emojis strictly enforced.
 */

import { getStoredUser, setStoredUser, clearStoredUser, type AuthUser } from '../utils/auth.ts';
import { sendVerificationEmail } from '../services/emailService.ts';
import {
    fetchNearby, fetchOrdersAndImpact, cancelOrder, toggleFavorite,
    fetchBusinessPanel, registerBusiness, publishBusinessOffer,
    closeBusinessOffer, redeemOrderCode, discountPercent,
    PLACE_TYPE_LABEL,
    type Place, type PlaceType, type FavoriteAlert, type Order,
    type ImpactSummary, type BusinessPanelResponse
} from '../explorar/api.ts';
import { formatDistance, formatClock, formatPrice, escapeHtml, type LatLng } from '../explorar/geo.ts';
import { icons } from '../explorar/icons.ts';
import { renderQrSvg } from '../explorar/qr.ts';

type ProfileTab = 'cuenta' | 'pedidos' | 'impacto' | 'favoritos' | 'negocio';

const DEFAULT_CENTER: LatLng = { lat: 19.4326, lng: -99.1332 };
const LAST_CENTER_KEY = 'foodlink_last_center';
const GUEST_PROFILE_KEY = 'foodlink_guest_profile';
const PREFS_KEY = 'foodlink_user_prefs';

interface UserPreferences {
    role: 'comensal' | 'ambos';
    dietTags: string[];
    zoneNote: string;
}

const DIET_OPTIONS = [
    'Sin restricciones',
    'Vegetariano',
    'Vegano',
    'Sin gluten',
    'Sin lacteos',
    'Panaderia y dulce',
    'Comida corrida casera'
];

interface QuickTemplate {
    id: string;
    label: string;
    title: string;
    kind: 'producto' | 'paquete_sorpresa';
    original_price: number;
    price: number;
    quantity_total: number;
    pickup_hours: number;
    est_weight_kg: number;
    tags: string;
    allergens: string;
}

const QUICK_OFFER_TEMPLATES: QuickTemplate[] = [
    {
        id: 'surprise_close',
        label: 'Bolsa sorpresa al cierre',
        title: 'Paquete sorpresa del cierre',
        kind: 'paquete_sorpresa',
        original_price: 130,
        price: 45,
        quantity_total: 5,
        pickup_hours: 3,
        est_weight_kg: 0.75,
        tags: 'sorpresa, al cierre',
        allergens: 'Consultar en mostrador'
    },
    {
        id: 'daily_meal',
        label: 'Comida corrida del dia',
        title: 'Comida corrida completa para llevar',
        kind: 'producto',
        original_price: 90,
        price: 35,
        quantity_total: 6,
        pickup_hours: 2.5,
        est_weight_kg: 0.8,
        tags: 'casero, completo',
        allergens: ''
    },
    {
        id: 'bakery_pack',
        label: 'Lote de pan recien horneado',
        title: 'Bolsa de 6 piezas de pan del dia',
        kind: 'paquete_sorpresa',
        original_price: 110,
        price: 38,
        quantity_total: 4,
        pickup_hours: 4,
        est_weight_kg: 0.6,
        tags: 'panaderia, vegetariano',
        allergens: 'gluten, huevo, lacteos'
    },
    {
        id: 'free_donation',
        label: 'Donacion solidaria gratis',
        title: 'Porcion solidaria del dia sin costo',
        kind: 'producto',
        original_price: 65,
        price: 0,
        quantity_total: 8,
        pickup_hours: 2,
        est_weight_kg: 0.65,
        tags: 'gratis, solidario',
        allergens: ''
    }
];

interface ProfileState {
    tab: ProfileTab;
    center: LatLng;
    prefs: UserPreferences;
    orders: Order[];
    impact: ImpactSummary | null;
    places: Place[];
    favoriteIds: Set<number>;
    favoriteAlerts: FavoriteAlert[];
    businessPanel: BusinessPanelResponse | null;
    selectedBusinessId: number | null;
    showNewBusinessForm: boolean;
    authMode: 'login' | 'register';
    loading: boolean;
}

function readStoredCenter(): LatLng {
    try {
        const raw = localStorage.getItem(LAST_CENTER_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) return { lat: p.lat, lng: p.lng };
        }
    } catch {
        // ignorar
    }
    return DEFAULT_CENTER;
}

function readPrefs(): UserPreferences {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                role: parsed?.role === 'ambos' ? 'ambos' : 'comensal',
                dietTags: Array.isArray(parsed?.dietTags) ? parsed.dietTags : ['Sin restricciones'],
                zoneNote: typeof parsed?.zoneNote === 'string' ? parsed.zoneNote : ''
            };
        }
    } catch {
        // ignorar
    }
    return { role: 'comensal', dietTags: ['Sin restricciones'], zoneNote: '' };
}

function savePrefs(prefs: UserPreferences): void {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // ignorar
    }
}

function getActiveUserIdentity(): { email: string; name: string; isLogged: boolean; isVerified: boolean } {
    const stored = getStoredUser();
    if (stored && stored.email) {
        return {
            email: stored.email.trim().toLowerCase(),
            name: stored.name || 'Comensal Foodlink',
            isLogged: true,
            isVerified: Boolean(stored.is_verified)
        };
    }
    try {
        const raw = localStorage.getItem(GUEST_PROFILE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.email && parsed?.name) {
                return { email: parsed.email, name: parsed.name, isLogged: false, isVerified: false };
            }
        }
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const guest = { email: `comensal_${suffix}@foodlink.local`, name: 'Comensal Invitado' };
        localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(guest));
        return { ...guest, isLogged: false, isVerified: false };
    } catch {
        return { email: 'invitado@foodlink.local', name: 'Comensal Invitado', isLogged: false, isVerified: false };
    }
}

const state: ProfileState = {
    tab: 'pedidos',
    center: readStoredCenter(),
    prefs: readPrefs(),
    orders: [],
    impact: null,
    places: [],
    favoriteIds: new Set<number>(),
    favoriteAlerts: [],
    businessPanel: null,
    selectedBusinessId: null,
    showNewBusinessForm: false,
    authMode: 'login',
    loading: true
};

const userCardEl = document.getElementById('pf-user-card')!;
const navEl = document.getElementById('pf-nav')!;
const mainEl = document.getElementById('pf-main')!;
const toastEl = document.getElementById('pf-toast')!;
let toastTimer: number | undefined;

function init(): void {
    if (!getStoredUser()) {
        window.location.replace('/?login=1');
        return;
    }

    document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
        const key = el.dataset.icon as keyof typeof icons;
        if (icons[key]) el.innerHTML = icons[key](18);
    });

    const urlTab = new URLSearchParams(location.search).get('tab') as ProfileTab | null;
    if (urlTab && ['cuenta', 'pedidos', 'impacto', 'favoritos', 'negocio'].includes(urlTab)) {
        state.tab = urlTab;
    } else {
        state.tab = 'cuenta';
    }

    navEl.addEventListener('click', onNavClick);
    mainEl.addEventListener('click', onMainClick);
    mainEl.addEventListener('change', onMainChange);
    mainEl.addEventListener('submit', onMainSubmit);

    window.addEventListener('focus', () => {
        void loadAllProfileData();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            void loadAllProfileData();
        }
    });
    window.setInterval(() => {
        if (document.visibilityState === 'visible' && !document.activeElement?.matches('input, select, textarea')) {
            void loadAllProfileData();
        }
    }, 12000);

    renderAll();
    void loadAllProfileData();
}

async function loadAllProfileData(): Promise<void> {
    state.loading = true;
    const identity = getActiveUserIdentity();

    try {
        const [ordersRes, nearbyRes, bizRes, profRes, meRes] = await Promise.all([
            fetchOrdersAndImpact(identity.email),
            fetchNearby(state.center, 10000, 'all', { email: identity.email, withoutOffers: true }),
            fetchBusinessPanel(identity.email, state.selectedBusinessId, state.center),
            fetch(`/api/places/profile?user_email=${encodeURIComponent(identity.email)}`)
                .then((r) => (r.ok ? r.json() : null))
                .catch(() => null),
            identity.isLogged
                ? fetch(`/api/auth/me?email=${encodeURIComponent(identity.email)}`)
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null)
                : Promise.resolve(null)
        ]);

        if (meRes?.success && meRes.user) {
            const stored = getStoredUser();
            if (stored && (stored.name !== meRes.user.name || stored.is_verified !== meRes.user.is_verified)) {
                setStoredUser(meRes.user as AuthUser);
            }
        }

        state.orders = ordersRes.orders;
        state.impact = ordersRes.impact;
        state.places = nearbyRes.places;
        state.favoriteIds = new Set(nearbyRes.favorite_ids ?? []);
        state.favoriteAlerts = nearbyRes.active_favorite_alerts ?? [];
        state.businessPanel = bizRes;
        state.selectedBusinessId = bizRes.business?.id ?? null;

        if (profRes?.success && profRes.profile) {
            if (Array.isArray(profRes.profile.dietary_tags) && profRes.profile.dietary_tags.length > 0) {
                state.prefs.dietTags = profRes.profile.dietary_tags;
                savePrefs(state.prefs);
            }
            if (profRes.profile.pickup_alias) {
                const stored = getStoredUser();
                if (stored && stored.name !== profRes.profile.pickup_alias) {
                    setStoredUser({ ...stored, name: profRes.profile.pickup_alias });
                }
            }
        }
    } catch (err) {
        toast((err as Error).message || 'No se pudieron sincronizar algunos datos.');
    } finally {
        state.loading = false;
        renderAll();
    }
}

function setTab(tab: ProfileTab): void {
    state.tab = tab;
    const url = new URL(location.href);
    url.searchParams.set('tab', tab);
    history.replaceState(null, '', url);
    renderAll();
    void loadAllProfileData();
}

function renderAll(): void {
    renderUserCard();
    renderNav();
    renderMain();
}

function renderUserCard(): void {
    const id = getActiveUserIdentity();
    const initial = (id.name.trim().charAt(0) || 'C').toUpperCase();
    const activeOrders = state.orders.filter((o) => o.status === 'reserved').length;
    const kgSaved = state.impact?.kg_saved ?? 0;
    const favCount = state.favoriteIds.size;

    userCardEl.innerHTML = `
        <div class="pf-user-top">
            <div class="pf-avatar">${escapeHtml(initial)}</div>
            <div class="pf-user-info">
                <h2 class="pf-user-name">${escapeHtml(id.name)}</h2>
                <span class="pf-user-email">${escapeHtml(id.email)}</span>
            </div>
        </div>
        <div class="pf-user-badges">
            ${id.isLogged
                ? `<span class="pf-pill pf-pill--sage">${icons.shield(12)} Cuenta activa</span>`
                : `<span class="pf-pill pf-pill--saffron">Perfil local invitado</span>`}
            <span class="pf-pill">${escapeHtml(state.impact?.level_title || 'Semilla Solidaria')}</span>
        </div>
        <div class="pf-user-quickstats">
            <div class="pf-mini-stat">
                <strong>${activeOrders}</strong>
                <span>QR activos</span>
            </div>
            <div class="pf-mini-stat">
                <strong>${kgSaved} kg</strong>
                <span>Salvados</span>
            </div>
            <div class="pf-mini-stat">
                <strong>${favCount}</strong>
                <span>Favoritos</span>
            </div>
        </div>
    `;
}

function renderNav(): void {
    const activeOrdersCount = state.orders.filter((o) => o.status === 'reserved').length;
    const favCount = state.favoriteIds.size;

    const items: Array<{ id: ProfileTab; label: string; icon: string; badge?: number }> = [
        { id: 'cuenta', label: 'Mi Cuenta', icon: icons.user(17) },
        { id: 'pedidos', label: 'Mis Pedidos y QR', icon: icons.ticket(17), badge: activeOrdersCount > 0 ? activeOrdersCount : undefined },
        { id: 'impacto', label: 'Mi Impacto', icon: icons.leaf(17) },
        { id: 'favoritos', label: 'Favoritos y Alertas', icon: icons.heart(17), badge: favCount > 0 ? favCount : undefined },
        { id: 'negocio', label: 'Mi Negocio', icon: icons.store(17) }
    ];

    navEl.innerHTML = items.map((item) => `
        <button type="button"
                class="pf-nav-btn${state.tab === item.id ? ' is-active' : ''}"
                data-tab="${item.id}"
                aria-selected="${state.tab === item.id}">
            <span class="pf-nav-icon">${item.icon}</span>
            <span class="pf-nav-label">${item.label}</span>
            ${item.badge ? `<span class="pf-nav-badge">${item.badge}</span>` : ''}
        </button>
    `).join('');
}

function renderMain(): void {
    if (state.tab === 'cuenta') mainEl.innerHTML = renderCuentaSection();
    else if (state.tab === 'pedidos') mainEl.innerHTML = renderPedidosSection();
    else if (state.tab === 'impacto') mainEl.innerHTML = renderImpactoSection();
    else if (state.tab === 'favoritos') mainEl.innerHTML = renderFavoritosSection();
    else if (state.tab === 'negocio') mainEl.innerHTML = renderNegocioSection();
}

/* ------------------------------------------------------------------ */
/* 1. Seccion: Mi Cuenta                                               */
/* ------------------------------------------------------------------ */

function renderCuentaSection(): string {
    const id = getActiveUserIdentity();
    const dietPills = DIET_OPTIONS.map((tag) => {
        const on = state.prefs.dietTags.includes(tag);
        return `<button type="button" class="pf-tag-toggle${on ? ' is-on' : ''}" data-action="toggle-diet" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    }).join('');

    const activeOrders = state.orders.filter((o) => o.status === 'reserved');

    return `
        ${activeOrders.length > 0 ? `
            <div class="pf-alert-banner">
                <div>
                    <strong>Tienes ${activeOrders.length} ${activeOrders.length === 1 ? 'reserva activa con codigo QR' : 'reservas activas con codigo QR'}</strong>
                    <p style="margin:2px 0 0;font-size:13px;color:var(--pf-muted)">Recuerda presentar tu codigo QR en el local antes del horario limite.</p>
                </div>
                <button type="button" class="pf-btn pf-btn--primary pf-btn--sm" data-action="go-tab" data-tab="pedidos">
                    ${icons.qr(15)} Ver mis codigos QR
                </button>
            </div>
        ` : ''}

        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Datos personales y preferencias</p>
                ${id.isLogged
                    ? `<button type="button" class="pf-btn pf-btn--subtle pf-btn--sm" data-action="logout">Cerrar sesion</button>`
                    : `<span class="pf-pill pf-pill--saffron">Modo sin cuenta (guardado en este dispositivo)</span>`}
            </div>
            <h1 class="pf-title">Mi Perfil Foodlink</h1>
            <p class="pf-subtitle">Personaliza tu nombre para las reservas con QR, tus preferencias alimentarias y el rol de tu cuenta.</p>

            <form class="pf-form" id="pf-profile-form" style="margin-top:18px">
                <div class="pf-field-grid">
                    <label class="pf-field">
                        <span>Nombre o alias al recoger pedidos</span>
                        <input type="text" name="display_name" value="${escapeHtml(id.name)}" required>
                    </label>
                    <label class="pf-field">
                        <span>Tipo de uso en Foodlink</span>
                        <select name="role">
                            <option value="comensal"${state.prefs.role === 'comensal' ? ' selected' : ''}>Comensal (Busco comida para rescatar)</option>
                            <option value="ambos"${state.prefs.role === 'ambos' ? ' selected' : ''}>Comensal + Dueno de Negocio</option>
                        </select>
                    </label>
                </div>
                <label class="pf-field">
                    <span>Colonia o zona habitual de busqueda</span>
                    <input type="text" name="zone_note" value="${escapeHtml(state.prefs.zoneNote)}" placeholder="Ej. Roma Norte, Centro, Coyoacan...">
                </label>
                <div class="pf-field">
                    <span>Preferencias alimentarias</span>
                    <div class="pf-tags-selector">${dietPills}</div>
                </div>
                <div>
                    <button type="submit" class="pf-btn pf-btn--primary">Guardar preferencias</button>
                </div>
            </form>
        </section>

        ${!id.isLogged ? `
            <section class="pf-panel-card">
                <div class="pf-eyebrow-row">
                    <p class="pf-eyebrow">Sincroniza tu cuenta</p>
                    <button type="button" class="pf-link-btn" data-action="switch-auth-mode">
                        ${state.authMode === 'login' ? 'No tengo cuenta · Registrarme' : 'Ya tengo cuenta · Iniciar sesion'}
                    </button>
                </div>
                <h2 class="pf-title" style="font-size:26px">${state.authMode === 'login' ? 'Iniciar sesion en Foodlink' : 'Crear cuenta de comensal'}</h2>
                <p class="pf-subtitle">Conecta tu correo para conservar tus pedidos, favoritos e insignias en la web y en la app Android.</p>

                <form class="pf-form" id="pf-auth-form" style="margin-top:16px">
                    ${state.authMode === 'register' ? `
                        <label class="pf-field">
                            <span>Nombre completo</span>
                            <input type="text" name="name" required placeholder="Tu nombre y apellido">
                        </label>
                    ` : ''}
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Correo electronico</span>
                            <input type="email" name="email" required placeholder="tu@correo.com">
                        </label>
                        <label class="pf-field">
                            <span>Contrasena</span>
                            <input type="password" name="password" minlength="8" required placeholder="Minimo 8 caracteres">
                        </label>
                    </div>
                    <div>
                        <button type="submit" class="pf-btn pf-btn--primary">
                            ${state.authMode === 'login' ? 'Iniciar sesion' : 'Registrarme'}
                        </button>
                    </div>
                </form>
            </section>
        ` : ''}
    `;
}

/* ------------------------------------------------------------------ */
/* 2. Seccion: Mis Pedidos y Codigos QR                                */
/* ------------------------------------------------------------------ */

function renderPedidosSection(): string {
    if (state.orders.length === 0) {
        return `
            <section class="pf-panel-card">
                <p class="pf-eyebrow">Pases de recogida</p>
                <h1 class="pf-title">Mis Pedidos con Codigo QR</h1>
                <p class="pf-subtitle">Aparta paquetes sorpresa o platillos del dia sin pagar en linea y presenta tu codigo QR al recoger en el establecimiento.</p>
                <div class="pf-empty">
                    ${icons.ticket(36)}
                    <h3>No tienes reservas registradas todavia</h3>
                    <p>Explora el mapa interactivo, elige una oferta cercana y pulsa "Apartar con QR" para generar tu pase de recogida inmediato.</p>
                    <a href="/explorar/" class="pf-btn pf-btn--primary">
                        ${icons.map(16)} Ir al mapa de rescate
                    </a>
                </div>
            </section>
        `;
    }

    const cards = state.orders.map((ord) => {
        const isReserved = ord.status === 'reserved';
        const isPicked = ord.status === 'picked_up';
        const statusLabel = isReserved ? 'Activo · Mostrar en local' : isPicked ? 'Entregado' : 'Cancelado';
        const pillClass = isReserved ? 'pf-pill--sage' : isPicked ? 'pf-pill--saffron' : '';
        const qrSvg = isReserved ? renderQrSvg(`FOODLINK:${ord.pickup_code}`, 144) : '';

        return `
            <li class="pf-order-card${isReserved ? ' is-reserved' : ''}">
                <div class="pf-order-top">
                    <span class="pf-pill ${pillClass}">${statusLabel}</span>
                    <span class="pf-pill">${escapeHtml(ord.pickup_code)}</span>
                </div>
                <h3 class="pf-order-biz">${escapeHtml(ord.business_name)}</h3>
                <p class="pf-order-offer">${ord.quantity}x ${escapeHtml(ord.offer_title)}</p>
                <div class="pf-order-meta">
                    <span>${ord.total_price === 0 ? 'Sin costo (Gratis)' : `Pago en el local: ${formatPrice(ord.total_price)}`}</span>
                    <span>&middot;</span>
                    <span>~${ord.est_weight_kg} kg rescatados</span>
                </div>

                ${isReserved ? `
                    <div class="pf-qr-box">
                        <div class="pf-qr-frame">${qrSvg}</div>
                        <div class="pf-qr-info">
                            <span class="pf-eyebrow">Codigo de entrega</span>
                            <strong class="pf-qr-code">${escapeHtml(ord.pickup_code)}</strong>
                            <p>Muestra este QR en <strong>${escapeHtml(ord.business_name)}</strong> antes de las ${formatClock(new Date(ord.pickup_end))}.</p>
                        </div>
                    </div>
                    <div class="pf-order-actions">
                        <a href="/explorar/?lugar=${ord.business_id}&ruta=1" class="pf-btn pf-btn--primary pf-btn--sm">
                            ${icons.route(15)} Como llegar en mapa
                        </a>
                        <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="redeem-quick" data-code="${escapeHtml(ord.pickup_code)}">
                            ${icons.check(15)} Ya lo recogi
                        </button>
                        <button type="button" class="pf-btn pf-btn--subtle pf-btn--sm pf-btn--danger" data-action="cancel-order" data-order-id="${ord.id}">
                            Cancelar
                        </button>
                    </div>
                ` : `
                    <div class="pf-order-actions">
                        <a href="/explorar/?lugar=${ord.business_id}" class="pf-btn pf-btn--ghost pf-btn--sm">
                            Ver negocio en el mapa
                        </a>
                    </div>
                `}
            </li>
        `;
    }).join('');

    return `
        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Pases activos e historial</p>
                <a href="/explorar/" class="pf-btn pf-btn--ghost pf-btn--sm">${icons.map(15)} Reservar otra comida</a>
            </div>
            <h1 class="pf-title">Mis Pedidos (${state.orders.length})</h1>
            <p class="pf-subtitle">Presenta tu codigo QR al llegar al negocio y realiza ahi mismo tu pago.</p>
            <ul class="pf-orders-grid" style="margin-top:18px">${cards}</ul>
        </section>
    `;
}

/* ------------------------------------------------------------------ */
/* 3. Seccion: Mi Impacto                                              */
/* ------------------------------------------------------------------ */

function renderImpactoSection(): string {
    const imp = state.impact ?? {
        rescues_count: 0,
        completed_count: 0,
        kg_saved: 0,
        co2_avoided_kg: 0,
        water_liters: 0,
        money_saved: 0,
        level_title: 'Semilla Solidaria',
        next_level_title: 'Guardian del Barrio',
        next_level_target: 2,
        level_progress: 0,
        badges: [
            { id: 'first_rescue', title: 'Primer Rescate', desc: 'Apartaste tu primera comida en Foodlink', unlocked: false },
            { id: 'surprise_fan', title: 'Explorador Sorpresa', desc: 'Rescataste un paquete sorpresa al cierre', unlocked: false },
            { id: 'zero_waste', title: 'Impacto 2 kg', desc: 'Evitaste el desperdicio de al menos 2 kg de alimentos', unlocked: false },
            { id: 'community_hero', title: 'Heroe del Barrio', desc: '5 o mas porciones rescatadas en comercios locales', unlocked: false }
        ]
    };

    const badgesHtml = imp.badges.map((b) => `
        <li class="pf-badge-item${b.unlocked ? ' is-unlocked' : ''}">
            <div class="pf-badge-icon">${icons.award(20)}</div>
            <div class="pf-badge-copy">
                <strong>${escapeHtml(b.title)}</strong>
                <p>${escapeHtml(b.desc)}</p>
            </div>
            <span class="pf-pill ${b.unlocked ? 'pf-pill--sage' : ''}">${b.unlocked ? 'Logrado' : 'Pendiente'}</span>
        </li>
    `).join('');

    return `
        <section class="pf-panel-card">
            <p class="pf-eyebrow">Sostenibilidad y economia</p>
            <h1 class="pf-title">Mi Impacto Ambiental y Ahorro</h1>
            <p class="pf-subtitle">Cada paquete o platillo que rescatas evita emisiones de gases de efecto invernadero y apoya a los comercios de tu barrio.</p>

            <div class="pf-level-banner" style="margin-top:18px">
                <div class="pf-level-top">
                    <div>
                        <span class="pf-eyebrow">Rango actual</span>
                        <h3>${escapeHtml(imp.level_title)}</h3>
                    </div>
                    <span class="pf-pill pf-pill--saffron">${imp.rescues_count} ${imp.rescues_count === 1 ? 'porcion rescatada' : 'porciones rescatadas'}</span>
                </div>
                <div class="pf-level-bar"><span style="width:${Math.max(6, imp.level_progress)}%"></span></div>
                <p style="margin:0;font-size:13px;color:var(--pf-muted)">
                    Siguiente nivel: <strong style="color:var(--pf-cream)">${escapeHtml(imp.next_level_title)}</strong> (${imp.rescues_count}/${imp.next_level_target} porciones)
                </p>
            </div>

            <div class="pf-stats-grid" style="margin-top:16px">
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.kg_saved} kg</span>
                    <span class="pf-stat-lbl">Comida salvada de tirarse</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.co2_avoided_kg} kg</span>
                    <span class="pf-stat-lbl">Emisiones CO2 evitadas</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${formatPrice(imp.money_saved)}</span>
                    <span class="pf-stat-lbl">Ahorro acumulado en MXN</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.water_liters} L</span>
                    <span class="pf-stat-lbl">Agua potable preservada</span>
                </div>
            </div>

            <div style="margin-top:24px">
                <h2 class="pf-section-title">Insignias desbloqueadas <span>${imp.badges.filter((b) => b.unlocked).length}/${imp.badges.length}</span></h2>
                <ul class="pf-badges-grid">${badgesHtml}</ul>
            </div>
        </section>
    `;
}

/* ------------------------------------------------------------------ */
/* 4. Seccion: Favoritos y Alertas                                     */
/* ------------------------------------------------------------------ */

function renderFavoritosSection(): string {
    const favPlaces = state.places.filter((p) => state.favoriteIds.has(p.id) || p.is_favorite);

    if (favPlaces.length === 0) {
        return `
            <section class="pf-panel-card">
                <p class="pf-eyebrow">Seguimiento en vivo</p>
                <h1 class="pf-title">Locales Favoritos y Alertas</h1>
                <p class="pf-subtitle">Guarda tus fondas, panaderias y restaurantes preferidos para enterarte al instante cuando publiquen comida disponible.</p>
                <div class="pf-empty">
                    ${icons.heart(36)}
                    <h3>Aun no sigues ningun establecimiento</h3>
                    <p>En el mapa de exploracion pulsa el icono de corazon sobre cualquier local para agregarlo a tu lista de alertas.</p>
                    <a href="/explorar/" class="pf-btn pf-btn--primary">${icons.map(16)} Explorar lugares cercanos</a>
                </div>
            </section>
        `;
    }

    const cards = favPlaces.map((p) => {
        const offer = p.offers[0];
        const pct = offer ? discountPercent(offer) : null;
        return `
            <li class="pf-fav-card">
                <div class="pf-order-top">
                    <span class="pf-pill">${escapeHtml(PLACE_TYPE_LABEL[p.type] ?? p.type)}</span>
                    <span class="pf-pill pf-pill--saffron">${icons.starFilled(12)} ${(p.rating_avg || 4.8).toFixed(1)}</span>
                </div>
                <h3>${escapeHtml(p.name)}</h3>
                <p style="margin:0;font-size:13px;color:var(--pf-muted)">
                    ${p.distance_m ? `${formatDistance(p.distance_m)} &middot; ` : ''}${escapeHtml(p.address || p.opening_hours || '')}
                </p>
                ${offer ? `
                    <div style="padding:10px 12px;border-radius:10px;background:rgba(138,177,125,0.12);border:1px solid rgba(138,177,125,0.35);font-size:13px">
                        <strong style="color:var(--pf-sage);display:block">${escapeHtml(offer.title)}</strong>
                        <span>${offer.price === 0 ? 'Gratis' : formatPrice(offer.price)}${pct ? ` (-${pct}%)` : ''} &middot; Quedan ${offer.quantity_left}</span>
                    </div>
                ` : `<span style="font-size:12.5px;color:var(--pf-muted)">Sin ofertas activas en este momento</span>`}
                <div class="pf-order-actions">
                    <a href="/explorar/?lugar=${p.id}" class="pf-btn pf-btn--primary pf-btn--sm">Ver en el mapa</a>
                    <button type="button" class="pf-btn pf-btn--subtle pf-btn--sm" data-action="unfav" data-place-id="${p.id}">
                        Quitar de favoritos
                    </button>
                </div>
            </li>
        `;
    }).join('');

    return `
        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Alertas de rescate</p>
                <a href="/explorar/" class="pf-btn pf-btn--ghost pf-btn--sm">${icons.map(15)} Ir al mapa</a>
            </div>
            <h1 class="pf-title">Mis Locales Favoritos (${favPlaces.length})</h1>
            <p class="pf-subtitle">Establecimientos que sigues para recibir avisos de paquetes sorpresa y excedentes del dia.</p>
            <ul class="pf-fav-grid" style="margin-top:18px">${cards}</ul>
        </section>
    `;
}

/* ------------------------------------------------------------------ */
/* 5. Seccion: Mi Negocio                                              */
/* ------------------------------------------------------------------ */

function renderNegocioSection(): string {
    const panel = state.businessPanel;
    const biz = panel?.business ?? null;
    const stats = panel?.stats ?? null;
    const available = panel?.available_businesses ?? [];

    const bizOptions = available.map((b) => `
        <option value="${b.id}"${b.id === biz?.id ? ' selected' : ''}>
            ${escapeHtml(b.name)} (${PLACE_TYPE_LABEL[b.type] ?? b.type})${b.is_owner ? ' · Tu local' : ''}
        </option>
    `).join('');

    const templatesHtml = QUICK_OFFER_TEMPLATES.map((t) => `
        <button type="button" class="pf-tpl-btn" data-action="apply-tpl" data-tpl="${t.id}">
            ${icons.bolt(14)}
            <span>${escapeHtml(t.label)}</span>
        </button>
    `).join('');

    const pendingOrders = (panel?.orders ?? []).filter((o) => o.status === 'reserved');
    const pendingHtml = pendingOrders.length > 0
        ? `<ul class="pf-biz-list">${pendingOrders.map((o) => `
            <li class="pf-biz-row">
                <div>
                    <strong style="display:block;font-size:14px">${escapeHtml(o.pickup_code)} · ${o.quantity}x ${escapeHtml(o.offer_title)}</strong>
                    <span style="font-size:12.5px;color:var(--pf-muted)">${escapeHtml(o.user_name)} &middot; ${o.total_price === 0 ? 'Sin costo (Gratis)' : `Cobrar ${formatPrice(o.total_price)} en caja`}</span>
                </div>
                <button type="button" class="pf-btn pf-btn--primary pf-btn--sm" data-action="redeem-quick" data-code="${escapeHtml(o.pickup_code)}">
                    ${icons.check(14)} Validar entrega
                </button>
            </li>
        `).join('')}</ul>`
        : '<p style="margin:0;color:var(--pf-muted);font-size:13.5px">No hay reservas pendientes de recoger en este momento.</p>';

    const activeOffers = (panel?.offers ?? []).filter((o) => o.status === 'active' && o.quantity_left > 0);
    const activeOffersHtml = activeOffers.length > 0
        ? `<ul class="pf-biz-list">${activeOffers.map((o) => `
            <li class="pf-biz-row">
                <div>
                    <strong style="display:block;font-size:14px">${escapeHtml(o.title)}</strong>
                    <span style="font-size:12.5px;color:var(--pf-muted)">${o.price === 0 ? 'Gratis' : formatPrice(o.price)} (antes ${formatPrice(o.original_price)}) &middot; Quedan ${o.quantity_left}/${o.quantity_total}</span>
                </div>
                <div style="display:flex;gap:8px">
                    <a href="/explorar/?lugar=${biz?.id ?? ''}" class="pf-btn pf-btn--ghost pf-btn--sm">Ver en mapa</a>
                    <button type="button" class="pf-btn pf-btn--subtle pf-btn--sm pf-btn--danger" data-action="close-offer" data-offer-id="${o.id}">
                        Cerrar oferta
                    </button>
                </div>
            </li>
        `).join('')}</ul>`
        : '<p style="margin:0;color:var(--pf-muted);font-size:13.5px">No hay ofertas activas en este momento. Publica una usando las plantillas de arriba.</p>';

    return `
        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Panel para comercios aliados</p>
                <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="toggle-new-biz">
                    ${state.showNewBusinessForm ? 'Cancelar registro' : '+ Registrar nuevo local en el mapa'}
                </button>
            </div>
            <h1 class="pf-title">Gestion de Mi Negocio</h1>
            <p class="pf-subtitle">Publica excedentes en 20 segundos, valida codigos QR de tus clientes y consulta el impacto de tu local.</p>

            ${state.showNewBusinessForm ? `
                <form class="pf-form" id="pf-register-biz-form" style="margin-top:18px;padding:18px;border-radius:14px;background:var(--pf-surface-2);border:1px solid var(--pf-border-strong)">
                    <h2 class="pf-section-title">Dar de alta un nuevo establecimiento</h2>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Nombre del comercio</span>
                            <input type="text" name="name" required placeholder="Ej. Fonda Santa Clara / Panaderia El Sol">
                        </label>
                        <label class="pf-field">
                            <span>Categoria</span>
                            <select name="type">
                                <option value="fonda">Fonda</option>
                                <option value="panaderia">Panaderia</option>
                                <option value="restaurante">Restaurante</option>
                                <option value="puesto">Puesto</option>
                                <option value="cafeteria">Cafeteria</option>
                                <option value="comedor">Comedor comunitario</option>
                                <option value="mercado">Mercado</option>
                            </select>
                        </label>
                    </div>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Direccion</span>
                            <input type="text" name="address" required placeholder="Calle, numero y colonia">
                        </label>
                        <label class="pf-field">
                            <span>Telefono</span>
                            <input type="text" name="phone" placeholder="55 1234 5678">
                        </label>
                    </div>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Horario de servicio</span>
                            <input type="text" name="opening_hours" value="Lun-Sab 9:00-21:00" required>
                        </label>
                        <label class="pf-field">
                            <span>Descripcion breve</span>
                            <input type="text" name="description" placeholder="Especialidad de la casa">
                        </label>
                    </div>
                    <div>
                        <button type="submit" class="pf-btn pf-btn--primary">Guardar y publicar en el mapa</button>
                    </div>
                </form>
            ` : ''}

            ${available.length > 0 ? `
                <div class="pf-field" style="margin-top:18px;max-width:460px">
                    <span>Establecimiento administrado actualmente:</span>
                    <select data-action="select-managed-biz">${bizOptions}</select>
                </div>
            ` : ''}

            ${stats && biz ? `
                <div class="pf-stats-grid" style="margin-top:18px">
                    <div class="pf-stat-box">
                        <span class="pf-stat-val">${stats.kg_rescued} kg</span>
                        <span class="pf-stat-lbl">Comida rescatada en local</span>
                    </div>
                    <div class="pf-stat-box">
                        <span class="pf-stat-val">${formatPrice(stats.revenue_mxn)}</span>
                        <span class="pf-stat-lbl">Ingresos recuperados</span>
                    </div>
                    <div class="pf-stat-box">
                        <span class="pf-stat-val">${stats.completed_orders}</span>
                        <span class="pf-stat-lbl">Pedidos entregados</span>
                    </div>
                    <div class="pf-stat-box">
                        <span class="pf-stat-val">${stats.rating_avg.toFixed(1)}</span>
                        <span class="pf-stat-lbl">Calificacion (${stats.rating_count} resenas)</span>
                    </div>
                </div>
            ` : ''}
        </section>

        ${biz ? `
            <section class="pf-panel-card">
                <h2 class="pf-section-title">${icons.qr(16)} Validar codigo QR de cliente <span>${pendingOrders.length} pendientes</span></h2>
                <form class="pf-redeem-row" id="pf-redeem-form">
                    <input type="text" name="pickup_code" placeholder="Ingresa el codigo del cliente (ej. FL-7K4M92)" required>
                    <button type="submit" class="pf-btn pf-btn--primary">Canjear codigo QR</button>
                </form>
                ${pendingHtml}
            </section>

            <section class="pf-panel-card">
                <h2 class="pf-section-title">${icons.bolt(16)} Publicar oferta de rescate en 20 segundos</h2>
                <p style="margin:0 0 10px;font-size:13px;color:var(--pf-muted)">Toca una plantilla rapida para rellenar los datos o personaliza los campos:</p>
                <div class="pf-tpl-grid">${templatesHtml}</div>

                <form class="pf-form" id="pf-publish-offer-form" data-business-id="${biz.id}">
                    <label class="pf-field">
                        <span>Titulo de la oferta o paquete</span>
                        <input type="text" name="title" required placeholder="Ej. Bolsa sorpresa de pan dulce / Comida corrida">
                    </label>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Modalidad</span>
                            <select name="kind">
                                <option value="paquete_sorpresa">Paquete sorpresa</option>
                                <option value="producto">Platillo / Producto</option>
                            </select>
                        </label>
                        <label class="pf-field">
                            <span>Unidades disponibles</span>
                            <input type="number" name="quantity_total" value="5" min="1" max="100" required>
                        </label>
                    </div>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Precio normal (MXN)</span>
                            <input type="number" name="original_price" value="110" min="0" step="1" required>
                        </label>
                        <label class="pf-field">
                            <span>Precio rescate (0 = Gratis)</span>
                            <input type="number" name="price" value="40" min="0" step="1" required>
                        </label>
                    </div>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Horas limite para recoger</span>
                            <input type="number" name="pickup_hours" value="3" min="0.5" max="12" step="0.5" required>
                        </label>
                        <label class="pf-field">
                            <span>Peso estimado por unidad (kg)</span>
                            <input type="number" name="est_weight_kg" value="0.7" min="0.1" max="10" step="0.05" required>
                        </label>
                    </div>
                    <div class="pf-field-grid">
                        <label class="pf-field">
                            <span>Etiquetas</span>
                            <input type="text" name="tags" placeholder="casero, vegetariano">
                        </label>
                        <label class="pf-field">
                            <span>Alergenos</span>
                            <input type="text" name="allergens" placeholder="gluten, lacteos">
                        </label>
                    </div>
                    <div>
                        <button type="submit" class="pf-btn pf-btn--primary">Publicar oferta en el mapa</button>
                    </div>
                </form>
            </section>

            <section class="pf-panel-card">
                <h2 class="pf-section-title">Ofertas activas de ${escapeHtml(biz.name)} <span>${activeOffers.length}</span></h2>
                ${activeOffersHtml}
            </section>
        ` : ''}
    `;
}

/* ------------------------------------------------------------------ */
/* Eventos e interacciones                                             */
/* ------------------------------------------------------------------ */

function onNavClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (!btn) return;
    setTab(btn.dataset.tab as ProfileTab);
}

function onMainClick(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || target.tagName === 'SELECT') return;
    const action = target.dataset.action;

    switch (action) {
        case 'go-tab':
            setTab((target.dataset.tab as ProfileTab) || 'pedidos');
            break;
        case 'toggle-diet': {
            const tag = String(target.dataset.tag || '');
            if (!tag) break;
            const idx = state.prefs.dietTags.indexOf(tag);
            if (idx >= 0) {
                state.prefs.dietTags.splice(idx, 1);
                if (state.prefs.dietTags.length === 0) state.prefs.dietTags.push('Sin restricciones');
            } else {
                if (tag === 'Sin restricciones') {
                    state.prefs.dietTags = ['Sin restricciones'];
                } else {
                    state.prefs.dietTags = state.prefs.dietTags.filter((t) => t !== 'Sin restricciones');
                    state.prefs.dietTags.push(tag);
                }
            }
            savePrefs(state.prefs);
            renderMain();
            break;
        }
        case 'switch-auth-mode':
            state.authMode = state.authMode === 'login' ? 'register' : 'login';
            renderMain();
            break;
        case 'logout':
            clearStoredUser();
            toast('Sesion cerrada correctamente.');
            window.setTimeout(() => {
                window.location.replace('/');
            }, 350);
            break;
        case 'cancel-order':
            void handleCancelOrder(Number(target.dataset.orderId));
            break;
        case 'redeem-quick':
            void handleRedeemCode(String(target.dataset.code || ''));
            break;
        case 'unfav':
            void handleUnfavorite(Number(target.dataset.placeId));
            break;
        case 'toggle-new-biz':
            state.showNewBusinessForm = !state.showNewBusinessForm;
            renderMain();
            break;
        case 'apply-tpl':
            applyOfferTemplate(String(target.dataset.tpl || ''));
            break;
        case 'close-offer':
            void closeBusinessOffer(Number(target.dataset.offerId)).then(() => {
                toast('Oferta cerrada.');
                void loadAllProfileData();
            });
            break;
    }
}

function onMainChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLSelectElement && target.dataset.action === 'select-managed-biz') {
        state.selectedBusinessId = Number(target.value);
        void loadAllProfileData();
    }
}

async function onMainSubmit(e: Event): Promise<void> {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    e.preventDefault();

    const identity = getActiveUserIdentity();

    if (form.id === 'pf-profile-form') {
        const fd = new FormData(form);
        const newName = String(fd.get('display_name') || '').trim() || identity.name;
        state.prefs.role = fd.get('role') === 'ambos' ? 'ambos' : 'comensal';
        state.prefs.zoneNote = String(fd.get('zone_note') || '').trim();
        savePrefs(state.prefs);

        const stored = getStoredUser();
        if (stored) {
            setStoredUser({ ...stored, name: newName });
        } else {
            localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify({ email: identity.email, name: newName }));
        }

        try {
            await fetch('/api/places/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: identity.email,
                    pickup_alias: newName,
                    dietary_tags: state.prefs.dietTags,
                    notify_favorites: true
                })
            });
        } catch {
            // guardado local respaldado
        }

        toast('Preferencias de perfil guardadas en FOODLINK.');
        renderAll();
        return;
    }

    if (form.id === 'pf-auth-form') {
        const fd = new FormData(form);
        const email = String(fd.get('email') || '').trim().toLowerCase();
        const password = String(fd.get('password') || '');
        const name = String(fd.get('name') || '').trim();

        const endpoint = state.authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.authMode === 'login' ? { email, password } : { name, email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                toast(data.message || 'No se pudo autenticar con el servidor.');
                return;
            }
            if (state.authMode === 'register' && !data.emailSent && data.verificationCode) {
                await sendVerificationEmail(email, name || 'Comensal Foodlink', data.verificationCode);
            }
            if (data.user) {
                setStoredUser(data.user as AuthUser);
                toast(`Bienvenido, ${data.user.name}`);
                await loadAllProfileData();
            }
        } catch {
            // Si el backend MySQL de auth no esta disponible localmente, guarda sesion local
            const fallbackUser: AuthUser = {
                id: Date.now(),
                name: name || email.split('@')[0] || 'Comensal Foodlink',
                email,
                is_verified: true
            };
            setStoredUser(fallbackUser);
            toast(`Sesion iniciada como ${fallbackUser.name}`);
            await loadAllProfileData();
        }
        return;
    }

    if (form.id === 'pf-redeem-form') {
        const input = form.elements.namedItem('pickup_code') as HTMLInputElement | null;
        const code = input?.value.trim() || '';
        if (!code) return;
        await handleRedeemCode(code);
        if (input) input.value = '';
        return;
    }

    if (form.id === 'pf-register-biz-form') {
        const fd = new FormData(form);
        try {
            const res = await registerBusiness({
                email: identity.email,
                name: String(fd.get('name') || ''),
                type: (String(fd.get('type') || 'fonda') as PlaceType),
                description: String(fd.get('description') || ''),
                address: String(fd.get('address') || ''),
                phone: String(fd.get('phone') || ''),
                opening_hours: String(fd.get('opening_hours') || 'Lun-Sab 9:00-21:00'),
                lat: state.center.lat,
                lng: state.center.lng
            });
            state.showNewBusinessForm = false;
            state.selectedBusinessId = res.business.id;
            toast(res.message || 'Establecimiento registrado.');
            await loadAllProfileData();
        } catch (err) {
            toast((err as Error).message || 'Error al registrar negocio.');
        }
        return;
    }

    if (form.id === 'pf-publish-offer-form') {
        const businessId = Number(form.dataset.businessId);
        const fd = new FormData(form);
        try {
            const res = await publishBusinessOffer({
                email: identity.email,
                businessId,
                title: String(fd.get('title') || ''),
                kind: fd.get('kind') === 'paquete_sorpresa' ? 'paquete_sorpresa' : 'producto',
                original_price: Number(fd.get('original_price') || 0),
                price: Number(fd.get('price') || 0),
                quantity_total: Number(fd.get('quantity_total') || 3),
                pickup_hours: Number(fd.get('pickup_hours') || 3),
                est_weight_kg: Number(fd.get('est_weight_kg') || 0.65),
                tags: String(fd.get('tags') || ''),
                allergens: String(fd.get('allergens') || '')
            });
            toast(res.message || 'Oferta publicada en el mapa.');
            form.reset();
            await loadAllProfileData();
        } catch (err) {
            toast((err as Error).message || 'No se pudo publicar la oferta.');
        }
    }
}

async function handleCancelOrder(orderId: number): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        const res = await cancelOrder(orderId, identity.email);
        toast(res.message || 'Reserva cancelada.');
        await loadAllProfileData();
    } catch (err) {
        toast((err as Error).message || 'No se pudo cancelar.');
    }
}

async function handleRedeemCode(code: string): Promise<void> {
    try {
        const res = await redeemOrderCode(code, state.selectedBusinessId);
        toast(res.message || 'Entrega validada.');
        await loadAllProfileData();
    } catch (err) {
        toast((err as Error).message || 'Codigo invalido.');
    }
}

async function handleUnfavorite(businessId: number): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        await toggleFavorite(businessId, identity.email);
        toast('Eliminado de tus favoritos.');
        await loadAllProfileData();
    } catch (err) {
        toast((err as Error).message || 'No se pudo actualizar favoritos.');
    }
}

function applyOfferTemplate(tplId: string): void {
    const tpl = QUICK_OFFER_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const form = mainEl.querySelector<HTMLFormElement>('#pf-publish-offer-form');
    if (!form) return;

    const setVal = (name: string, val: string | number) => {
        const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (input) input.value = String(val);
    };

    setVal('title', tpl.title);
    setVal('kind', tpl.kind);
    setVal('original_price', tpl.original_price);
    setVal('price', tpl.price);
    setVal('quantity_total', tpl.quantity_total);
    setVal('pickup_hours', tpl.pickup_hours);
    setVal('est_weight_kg', tpl.est_weight_kg);
    setVal('tags', tpl.tags);
    setVal('allergens', tpl.allergens);
    toast(`Plantilla cargada: ${tpl.label}`);
}

function toast(message: string, ms = 3200): void {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), ms);
}

init();
