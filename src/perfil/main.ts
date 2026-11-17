/**
 * FOODLINK - Seccion dedicada Mi Perfil (/perfil/):
 *  - Resumen de Cuenta y Preferencias (alias, etiquetas alimentarias, sesion).
 *  - Mis Pedidos y Codigos QR escaneables (SVG ISO/IEC 18004) para pago en el local.
 *  - Mi Impacto Ambiental y Ahorro (kg salvados, CO2 evitado, agua preservada, ahorro MXN e insignias).
 *  - Locales Favoritos y Alertas de rescate.
 *  - Panel de Mi Negocio (alta de local, estadisticas, canje de codigos QR y publicacion en 20s con plantillas).
 * Zero emojis strictly enforced.
 */

import { getStoredUser, setStoredUser, clearStoredUser, onAuthChange, type AuthUser } from '../utils/auth.ts';
import {
    fetchNearby, fetchOrdersAndImpact, cancelOrder, toggleFavorite,
    fetchBusinessPanel, registerBusiness, publishBusinessOffer,
    closeBusinessOffer, redeemOrderCode, submitReview, discountPercent,
    geocode, splitBusinessPanelOrders,
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
const PREFS_KEY = 'foodlink_user_prefs';

interface UserPreferences {
    role: 'comensal' | 'comercio' | 'ambos';
    dietTags: string[];
    zoneNote: string;
    pickupAlias: string;
    notifyFavorites: boolean;
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
    description?: string;
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
        description: 'Surtido variado con excedentes frescos del turno en perfecto estado.',
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
        description: 'Menu completo con entrada, guisado del dia y guarnicion casera.',
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
        description: 'Seleccion artesanal de pan dulce y bolleria tradicional del dia.',
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
        description: 'Alimento nutritivo preparado sin costo para apoyo comunitario.',
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
    orderFilter: 'all' | 'reserved' | 'picked_up' | 'cancelled';
    bizOrdersTab: 'pending' | 'history';
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
    loading: boolean;
    hasInitialLoaded: boolean;
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
            const roleVal = parsed?.role;
            const validRole = roleVal === 'ambos' || roleVal === 'comercio' ? roleVal : 'comensal';
            return {
                role: validRole,
                dietTags: Array.isArray(parsed?.dietTags) && parsed.dietTags.length > 0 ? parsed.dietTags : ['Sin restricciones'],
                zoneNote: typeof parsed?.zoneNote === 'string' ? parsed.zoneNote : '',
                pickupAlias: typeof parsed?.pickupAlias === 'string' ? parsed.pickupAlias : '',
                notifyFavorites: typeof parsed?.notifyFavorites === 'boolean' ? parsed.notifyFavorites : true
            };
        }
    } catch {
        // ignorar
    }
    return {
        role: 'comensal',
        dietTags: ['Sin restricciones'],
        zoneNote: '',
        pickupAlias: '',
        notifyFavorites: true
    };
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
    return {
        email: 'invitado@foodlink.local',
        name: 'Comensal Foodlink',
        isLogged: false,
        isVerified: false
    };
}

const copyIcon = (s = 14) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;

function getCountdownInfo(endTimeStr: string): { text: string; isUrgent: boolean; isExpired: boolean } {
    const endMs = new Date(endTimeStr).getTime();
    if (isNaN(endMs)) {
        return { text: 'Horario limite', isUrgent: false, isExpired: false };
    }
    const diffMs = endMs - Date.now();
    if (diffMs <= 0) {
        return { text: 'Tiempo expirado', isUrgent: true, isExpired: true };
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const isUrgent = diffMs < 30 * 60 * 1000;

    let text = '';
    if (hours > 0) {
        text = `Quedan ${hours}h ${minutes}m`;
    } else {
        text = `Quedan ${minutes}m`;
    }
    return { text, isUrgent, isExpired: false };
}

function updateCountdownBadges(): void {
    const badges = document.querySelectorAll<HTMLElement>('.pf-countdown-badge[data-countdown-end]');
    badges.forEach((el) => {
        const end = el.dataset.countdownEnd;
        if (!end) return;
        const info = getCountdownInfo(end);
        el.textContent = info.text;
        el.classList.toggle('is-urgent', info.isUrgent);
    });
}

function openEnlargeQrModal(pickupCode: string, businessName: string): void {
    let modal = document.getElementById('pf-qr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pf-qr-modal';
        modal.className = 'pf-modal';
        document.body.appendChild(modal);
    }
    const svgCode = renderQrSvg(`FOODLINK:${pickupCode}`, 240);
    modal.innerHTML = `
        <div class="pf-modal-dialog">
            <button type="button" class="pf-modal-close" data-action="close-modal" aria-label="Cerrar ventana">
                ${icons.close(16)}
            </button>
            <span class="pf-eyebrow">Pase de recogida en local</span>
            <h2 style="margin:0;font-family:var(--pf-font-display);font-size:24px;color:var(--pf-cream)">
                ${escapeHtml(businessName)}
            </h2>
            <div class="pf-modal-qr-frame">
                ${svgCode}
            </div>
            <div class="pf-qr-code-row" style="justify-content:center">
                <strong class="pf-qr-code" style="font-size:24px">${escapeHtml(pickupCode)}</strong>
                <button type="button" class="pf-copy-btn" data-action="copy-code" data-code="${escapeHtml(pickupCode)}">
                    ${copyIcon(13)} Copiar
                </button>
            </div>
            <p style="margin:0;font-size:13px;color:var(--pf-muted);line-height:1.4">
                Muestra este codigo QR al personal del establecimiento para validar y pagar tu pedido al recoger.
            </p>
        </div>
    `;
    modal.classList.add('is-open');
}

function openCancelConfirmModal(orderId: number, businessName: string): void {
    let modal = document.getElementById('pf-cancel-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pf-cancel-modal';
        modal.className = 'pf-modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="pf-modal-dialog" style="max-width:400px">
            <button type="button" class="pf-modal-close" data-action="close-modal" aria-label="Cerrar ventana">
                ${icons.close(16)}
            </button>
            <div style="width:48px;height:48px;border-radius:50%;background:rgba(224,90,54,0.15);color:var(--pf-terracotta);display:grid;place-items:center">
                ${icons.alert(24)}
            </div>
            <h2 style="margin:0;font-family:var(--pf-font-display);font-size:22px;color:var(--pf-cream)">
                Cancelar reserva
            </h2>
            <p style="margin:0;font-size:13.5px;color:var(--pf-muted);line-height:1.45">
                Deseas cancelar tu pedido en <strong>${escapeHtml(businessName)}</strong>? Esta accion liberara el paquete para que otro comensal pueda rescatarlo.
            </p>
            <div style="display:flex;gap:10px;width:100%;margin-top:8px">
                <button type="button" class="pf-btn pf-btn--ghost" style="flex:1" data-action="close-modal">
                    Conservar reserva
                </button>
                <button type="button" class="pf-btn pf-btn--subtle pf-btn--danger" style="flex:1" data-action="confirm-cancel-order" data-order-id="${orderId}">
                    Si, cancelar
                </button>
            </div>
        </div>
    `;
    modal.classList.add('is-open');
}

let activeReviewStars = 5;

function openReviewModal(orderId: number, businessId: number, businessName: string, offerTitle: string): void {
    activeReviewStars = 5;
    let modal = document.getElementById('pf-review-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pf-review-modal';
        modal.className = 'pf-modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="pf-modal-dialog">
            <button type="button" class="pf-modal-close" data-action="close-modal" aria-label="Cerrar ventana">
                ${icons.close(16)}
            </button>
            <span class="pf-eyebrow">Calificar rescate</span>
            <h2 style="margin:0;font-family:var(--pf-font-display);font-size:24px;color:var(--pf-cream)">
                ${escapeHtml(businessName)}
            </h2>
            <p style="margin:0;font-size:13px;color:var(--pf-muted)">
                ${escapeHtml(offerTitle)}
            </p>
            <form class="pf-review-form" id="pf-review-form" data-order-id="${orderId}" data-business-id="${businessId}">
                <div class="pf-rating-stars" id="pf-review-stars">
                    ${[1, 2, 3, 4, 5].map((s) => `
                        <button type="button" class="pf-star-btn is-active" data-action="select-star" data-star="${s}" aria-label="${s} estrellas">
                            ${icons.starFilled(26)}
                        </button>
                    `).join('')}
                </div>
                <label class="pf-field">
                    <span>Comentario o experiencia (opcional)</span>
                    <textarea name="comment" rows="3" placeholder="Que te parecio la calidad del alimento y el trato en el local?"></textarea>
                </label>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">
                    <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="close-modal">Cancelar</button>
                    <button type="submit" class="pf-btn pf-btn--primary pf-btn--sm">Publicar resena</button>
                </div>
            </form>
        </div>
    `;
    modal.classList.add('is-open');
}

function formatOrderDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function updateOfferDiscountBadge(): void {
    const origInput = document.getElementById('pf-offer-orig-price') as HTMLInputElement | null;
    const priceInput = document.getElementById('pf-offer-price') as HTMLInputElement | null;
    const badge = document.getElementById('pf-discount-badge');
    if (!badge || !origInput || !priceInput) return;

    const orig = Number(origInput.value);
    const price = Number(priceInput.value);

    if (isNaN(orig) || isNaN(price) || orig <= 0) {
        badge.textContent = 'Sin descuento';
        badge.style.display = 'none';
        return;
    }

    if (price > orig) {
        badge.textContent = 'Invalido: mayor al normal';
        badge.style.display = 'inline-flex';
        badge.style.color = 'var(--pf-terracotta)';
        badge.style.borderColor = 'rgba(224,90,54,0.4)';
        badge.style.background = 'rgba(224,90,54,0.12)';
        return;
    }

    if (price === 0) {
        badge.textContent = '100% GRATIS';
        badge.style.display = 'inline-flex';
        badge.style.color = 'var(--pf-sage)';
        badge.style.borderColor = 'rgba(138,177,125,0.45)';
        badge.style.background = 'rgba(138,177,125,0.16)';
        return;
    }

    const pct = Math.round((1 - price / orig) * 100);
    badge.textContent = `${pct}% OFF`;
    badge.style.display = 'inline-flex';
    badge.style.color = 'var(--pf-sage)';
    badge.style.borderColor = 'rgba(138,177,125,0.45)';
    badge.style.background = 'rgba(138,177,125,0.16)';
}

let capturedBizLocation: LatLng | null = null;

const state: ProfileState = {
    tab: 'pedidos',
    orderFilter: 'reserved',
    bizOrdersTab: 'pending',
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
    loading: true,
    hasInitialLoaded: false
};

let isProfileFormDirty = false;

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

    onAuthChange((user) => {
        if (!user) {
            window.location.replace('/?login=1');
            return;
        }
        void loadAllProfileData();
    });

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
    mainEl.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (target && target.closest('#pf-profile-form')) {
            isProfileFormDirty = true;
        }
        if (target && (target.id === 'pf-offer-orig-price' || target.id === 'pf-offer-price')) {
            updateOfferDiscountBadge();
        }
        if (target && target.id === 'pf-offer-pickup-hours') {
            const hours = Number((target as HTMLInputElement).value);
            const chipBtns = mainEl.querySelectorAll<HTMLButtonElement>('.pf-pickup-chip');
            chipBtns.forEach((btn) => {
                const match = Number(btn.dataset.hours) === hours;
                btn.classList.toggle('is-active', match);
                btn.style.background = match ? 'rgba(244, 162, 97, 0.2)' : '';
                btn.style.borderColor = match ? 'var(--pf-saffron)' : '';
                btn.style.color = match ? 'var(--pf-saffron)' : '';
            });
        }
    });
    mainEl.addEventListener('change', onMainChange);
    mainEl.addEventListener('submit', onMainSubmit);

    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('pf-modal')) {
            target.classList.remove('is-open');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.pf-modal.is-open').forEach((m) => m.classList.remove('is-open'));
        }
    });

    window.addEventListener('focus', () => {
        if (!isProfileFormDirty) {
            void loadAllProfileData();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !isProfileFormDirty) {
            void loadAllProfileData();
        }
    });
    window.setInterval(() => {
        if (document.visibilityState === 'visible' && !isProfileFormDirty && !document.activeElement?.matches('input, select, textarea')) {
            void loadAllProfileData();
        }
    }, 12000);

    window.setInterval(() => {
        updateCountdownBadges();
    }, 10000);

    renderAll();
    void loadAllProfileData();
}

async function loadAllProfileData(): Promise<void> {
    if (isProfileFormDirty && state.tab === 'cuenta') {
        return;
    }
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
        const validSelected = bizRes.available_businesses.some((b) => b.id === state.selectedBusinessId);
        state.selectedBusinessId = validSelected ? state.selectedBusinessId : (bizRes.business?.id ?? null);

        const hasActive = state.orders.some((o) => o.status === 'reserved');
        if (!hasActive && state.orderFilter === 'reserved' && state.orders.length > 0) {
            state.orderFilter = 'all';
        }

        if (profRes?.success && profRes.profile) {
            const prof = profRes.profile;
            if (Array.isArray(prof.dietary_tags)) {
                state.prefs.dietTags = prof.dietary_tags.length > 0 ? prof.dietary_tags : ['Sin restricciones'];
            }
            if (typeof prof.pickup_alias === 'string' && prof.pickup_alias) {
                state.prefs.pickupAlias = prof.pickup_alias;
            }
            if (prof.role && (prof.role === 'comensal' || prof.role === 'comercio' || prof.role === 'ambos')) {
                state.prefs.role = prof.role;
            }
            if (typeof prof.zone_note === 'string') {
                state.prefs.zoneNote = prof.zone_note;
            }
            if (prof.notify_favorites !== undefined && prof.notify_favorites !== null) {
                state.prefs.notifyFavorites = Boolean(prof.notify_favorites);
            }
            savePrefs(state.prefs);
        }
    } catch (err) {
        toast((err as Error).message || 'No se pudieron sincronizar algunos datos.');
    } finally {
        state.loading = false;
        state.hasInitialLoaded = true;
        renderAll();
    }
}

function setTab(tab: ProfileTab): void {
    isProfileFormDirty = false;
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
    if (isProfileFormDirty && state.tab === 'cuenta') {
        return;
    }
    renderMain();
}

function renderUserCard(): void {
    const id = getActiveUserIdentity();
    userCardEl.classList.toggle('is-tab-hidden-mobile', state.tab !== 'cuenta');

    if (state.loading && !state.hasInitialLoaded) {
        userCardEl.innerHTML = `
            <div class="pf-user-top">
                <div class="pf-skeleton pf-skeleton-circle"></div>
                <div class="pf-user-info" style="width:60%">
                    <div class="pf-skeleton pf-skeleton-line" style="width:70%;height:20px;margin-bottom:6px"></div>
                    <div class="pf-skeleton pf-skeleton-line" style="width:90%;height:12px"></div>
                </div>
            </div>
            <div class="pf-user-badges" style="margin-top:12px">
                <div class="pf-skeleton pf-skeleton-pill"></div>
                <div class="pf-skeleton pf-skeleton-pill"></div>
            </div>
            <div class="pf-user-quickstats" style="margin-top:16px">
                <div class="pf-mini-stat"><div class="pf-skeleton pf-skeleton-line" style="width:24px;height:18px;margin:0 auto 4px"></div><span class="pf-skeleton pf-skeleton-line" style="width:48px;height:10px;margin:0 auto"></span></div>
                <div class="pf-mini-stat"><div class="pf-skeleton pf-skeleton-line" style="width:24px;height:18px;margin:0 auto 4px"></div><span class="pf-skeleton pf-skeleton-line" style="width:48px;height:10px;margin:0 auto"></span></div>
                <div class="pf-mini-stat"><div class="pf-skeleton pf-skeleton-line" style="width:24px;height:18px;margin:0 auto 4px"></div><span class="pf-skeleton pf-skeleton-line" style="width:48px;height:10px;margin:0 auto"></span></div>
            </div>
        `;
        return;
    }

    const initial = (id.name.trim().charAt(0) || 'C').toUpperCase();
    const activeOrders = state.orders.filter((o) => o.status === 'reserved').length;
    const kgSaved = state.impact?.kg_saved ?? 0;
    const favCount = state.favoriteIds.size;
    const levelProgress = state.impact?.level_progress ?? 0;
    const ringCircumference = 163.36;
    const ringOffset = ringCircumference * (1 - Math.min(1, Math.max(0, levelProgress / 100)));

    userCardEl.innerHTML = `
        <div class="pf-user-top">
            <div class="pf-avatar-wrap">
                <svg class="pf-avatar-ring" viewBox="0 0 60 60">
                    <defs>
                        <linearGradient id="pf-avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#e05a36" />
                            <stop offset="50%" stop-color="#f4a261" />
                            <stop offset="100%" stop-color="#8ab17d" />
                        </linearGradient>
                    </defs>
                    <circle class="pf-avatar-ring-track" cx="30" cy="30" r="26" />
                    <circle class="pf-avatar-ring-bar" cx="30" cy="30" r="26" stroke-dasharray="${ringCircumference}" stroke-dashoffset="${ringOffset}" />
                </svg>
                <div class="pf-avatar">${escapeHtml(initial)}</div>
            </div>
            <div class="pf-user-info">
                <h2 class="pf-user-name">${escapeHtml(id.name)}</h2>
                <span class="pf-user-email">${escapeHtml(id.email)}</span>
                ${state.prefs.zoneNote ? `
                    <span style="font-size:11.5px;color:var(--pf-muted);display:flex;align-items:center;gap:4px;margin-top:2px;flex-wrap:wrap;overflow-wrap:anywhere">
                        ${icons.pin(12)} Zona: ${escapeHtml(state.prefs.zoneNote)}
                    </span>
                ` : ''}
            </div>
        </div>
        <div class="pf-user-badges">
            ${id.isLogged
                ? (id.isVerified
                    ? `<span class="pf-pill pf-pill--sage">${icons.shield(12)} Verificado</span>`
                    : `<span class="pf-pill pf-pill--terracotta">${icons.shield(12)} Sin verificar</span>`)
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

function renderSkeletonSection(tab: ProfileTab): string {
    switch (tab) {
        case 'cuenta':
            return `
                <section class="pf-panel-card">
                    <div class="pf-eyebrow-row">
                        <div class="pf-skeleton pf-skeleton-pill" style="width:160px"></div>
                    </div>
                    <div class="pf-skeleton pf-skeleton-title" style="margin-top:12px;width:45%"></div>
                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px"></div>

                    <div class="pf-form" style="margin-top:24px;display:flex;flex-direction:column;gap:18px">
                        <div class="pf-field-grid">
                            <div style="display:flex;flex-direction:column;gap:8px">
                                <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                                <div class="pf-skeleton pf-skeleton-btn" style="width:100%;height:46px;border-radius:8px"></div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:8px">
                                <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                                <div class="pf-skeleton pf-skeleton-btn" style="width:100%;height:46px;border-radius:8px"></div>
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div class="pf-skeleton pf-skeleton-btn" style="width:100%;height:46px;border-radius:8px"></div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px">
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap">
                                <div class="pf-skeleton pf-skeleton-pill" style="width:110px;height:32px"></div>
                                <div class="pf-skeleton pf-skeleton-pill" style="width:90px;height:32px"></div>
                                <div class="pf-skeleton pf-skeleton-pill" style="width:100px;height:32px"></div>
                                <div class="pf-skeleton pf-skeleton-pill" style="width:85px;height:32px"></div>
                            </div>
                        </div>
                        <div class="pf-skeleton pf-skeleton-btn" style="margin-top:8px"></div>
                    </div>
                </section>
            `;
        case 'pedidos':
            return `
                <section class="pf-panel-card">
                    <div class="pf-eyebrow-row">
                        <div class="pf-skeleton pf-skeleton-pill" style="width:140px"></div>
                    </div>
                    <div class="pf-skeleton pf-skeleton-title" style="margin-top:12px;width:50%"></div>
                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px;margin-bottom:24px"></div>

                    <div class="pf-skeleton-grid">
                        <div class="pf-skeleton-card">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <div class="pf-skeleton pf-skeleton-pill" style="width:90px"></div>
                                <div class="pf-skeleton pf-skeleton-pill" style="width:70px"></div>
                            </div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:60%;height:20px;margin-top:6px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div style="display:flex;gap:16px;align-items:center;margin-top:12px">
                                <div class="pf-skeleton" style="width:120px;height:120px;border-radius:8px;flex-shrink:0"></div>
                                <div style="display:flex;flex-direction:column;gap:8px;flex:1">
                                    <div class="pf-skeleton pf-skeleton-line"></div>
                                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium"></div>
                                    <div class="pf-skeleton pf-skeleton-btn" style="width:110px;height:34px;margin-top:4px"></div>
                                </div>
                            </div>
                        </div>
                        <div class="pf-skeleton-card">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <div class="pf-skeleton pf-skeleton-pill" style="width:90px"></div>
                                <div class="pf-skeleton pf-skeleton-pill" style="width:70px"></div>
                            </div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:65%;height:20px;margin-top:6px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div style="display:flex;gap:16px;align-items:center;margin-top:12px">
                                <div class="pf-skeleton" style="width:120px;height:120px;border-radius:8px;flex-shrink:0"></div>
                                <div style="display:flex;flex-direction:column;gap:8px;flex:1">
                                    <div class="pf-skeleton pf-skeleton-line"></div>
                                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium"></div>
                                    <div class="pf-skeleton pf-skeleton-btn" style="width:110px;height:34px;margin-top:4px"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        case 'impacto':
            return `
                <section class="pf-panel-card">
                    <div class="pf-eyebrow-row">
                        <div class="pf-skeleton pf-skeleton-pill" style="width:150px"></div>
                    </div>
                    <div class="pf-skeleton pf-skeleton-title" style="margin-top:12px;width:40%"></div>
                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px;margin-bottom:24px"></div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:16px;margin-bottom:24px">
                        <div class="pf-skeleton-card" style="align-items:center;text-align:center;padding:24px">
                            <div class="pf-skeleton pf-skeleton-circle" style="width:64px;height:64px"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:60px;height:24px;margin-top:10px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short" style="margin-top:4px"></div>
                        </div>
                        <div class="pf-skeleton-card" style="align-items:center;text-align:center;padding:24px">
                            <div class="pf-skeleton pf-skeleton-circle" style="width:64px;height:64px"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:60px;height:24px;margin-top:10px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short" style="margin-top:4px"></div>
                        </div>
                        <div class="pf-skeleton-card" style="align-items:center;text-align:center;padding:24px">
                            <div class="pf-skeleton pf-skeleton-circle" style="width:64px;height:64px"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:60px;height:24px;margin-top:10px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short" style="margin-top:4px"></div>
                        </div>
                        <div class="pf-skeleton-card" style="align-items:center;text-align:center;padding:24px">
                            <div class="pf-skeleton pf-skeleton-circle" style="width:64px;height:64px"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:60px;height:24px;margin-top:10px"></div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short" style="margin-top:4px"></div>
                        </div>
                    </div>
                </section>
            `;
        case 'favoritos':
            return `
                <section class="pf-panel-card">
                    <div class="pf-eyebrow-row">
                        <div class="pf-skeleton pf-skeleton-pill" style="width:160px"></div>
                    </div>
                    <div class="pf-skeleton pf-skeleton-title" style="margin-top:12px;width:45%"></div>
                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px;margin-bottom:24px"></div>

                    <div class="pf-skeleton-grid">
                        <div class="pf-skeleton-card">
                            <div style="display:flex;gap:12px;align-items:center">
                                <div class="pf-skeleton pf-skeleton-circle"></div>
                                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                                    <div class="pf-skeleton pf-skeleton-line" style="width:70%;height:18px"></div>
                                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                                </div>
                            </div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px"></div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
                                <div class="pf-skeleton pf-skeleton-pill" style="width:80px"></div>
                                <div class="pf-skeleton pf-skeleton-btn" style="width:100px;height:32px"></div>
                            </div>
                        </div>
                        <div class="pf-skeleton-card">
                            <div style="display:flex;gap:12px;align-items:center">
                                <div class="pf-skeleton pf-skeleton-circle"></div>
                                <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                                    <div class="pf-skeleton pf-skeleton-line" style="width:70%;height:18px"></div>
                                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                                </div>
                            </div>
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px"></div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
                                <div class="pf-skeleton pf-skeleton-pill" style="width:80px"></div>
                                <div class="pf-skeleton pf-skeleton-btn" style="width:100px;height:32px"></div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
        case 'negocio':
            return `
                <section class="pf-panel-card">
                    <div class="pf-eyebrow-row">
                        <div class="pf-skeleton pf-skeleton-pill" style="width:160px"></div>
                    </div>
                    <div class="pf-skeleton pf-skeleton-title" style="margin-top:12px;width:40%"></div>
                    <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--medium" style="margin-top:8px;margin-bottom:24px"></div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px;margin-bottom:20px">
                        <div class="pf-skeleton-card">
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:50%;height:28px"></div>
                        </div>
                        <div class="pf-skeleton-card">
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:50%;height:28px"></div>
                        </div>
                        <div class="pf-skeleton-card">
                            <div class="pf-skeleton pf-skeleton-line pf-skeleton-line--short"></div>
                            <div class="pf-skeleton pf-skeleton-line" style="width:50%;height:28px"></div>
                        </div>
                    </div>
                    <div class="pf-skeleton-card" style="height:160px"></div>
                </section>
            `;
    }
}

function renderMain(): void {
    if (state.loading && !state.hasInitialLoaded) {
        mainEl.innerHTML = renderSkeletonSection(state.tab);
        return;
    }
    if (state.tab === 'cuenta') mainEl.innerHTML = renderCuentaSection();
    else if (state.tab === 'pedidos') mainEl.innerHTML = renderPedidosSection();
    else if (state.tab === 'impacto') mainEl.innerHTML = renderImpactoSection();
    else if (state.tab === 'favoritos') mainEl.innerHTML = renderFavoritosSection();
    else if (state.tab === 'negocio') {
        mainEl.innerHTML = renderNegocioSection();
        updateOfferDiscountBadge();
    }
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
            <p class="pf-subtitle">Personaliza tu nombre, tu alias para las recogidas con QR, tus preferencias alimentarias y tus notificaciones.</p>

            ${id.isLogged ? (
                id.isVerified ? `
                    <div class="pf-verify-banner" style="margin-top:16px;background:rgba(138,177,125,0.08);border-color:rgba(138,177,125,0.3)">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0">
                            <span class="pf-pill pf-pill--sage">${icons.shield(12)} Correo verificado</span>
                            <span style="font-size:13px;color:var(--pf-cream);min-width:0;overflow-wrap:anywhere">Tu cuenta <strong>${escapeHtml(id.email)}</strong> esta verificada y activa.</span>
                        </div>
                    </div>
                ` : `
                    <div class="pf-verify-banner" style="margin-top:16px">
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                                <span class="pf-pill pf-pill--terracotta">${icons.shield(12)} Verificacion pendiente</span>
                                <strong style="color:var(--pf-saffron);font-size:14px">Confirma tu correo electronico</strong>
                            </div>
                            <p style="margin:2px 0 0;font-size:13px;color:var(--pf-muted);overflow-wrap:anywhere">
                                Ingresa el codigo de 6 digitos enviado a <strong>${escapeHtml(id.email)}</strong> para confirmar tu cuenta y habilitar todas las funciones.
                            </p>
                        </div>
                        <div class="pf-verify-row">
                            <input type="text" class="pf-verify-input" id="pf-verify-code-input" placeholder="123456" maxlength="6" pattern="[0-9]{6}">
                            <button type="button" class="pf-btn pf-btn--primary pf-btn--sm" data-action="verify-code">
                                ${icons.check(14)} Verificar codigo
                            </button>
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="resend-code">
                                Reenviar codigo
                            </button>
                        </div>
                    </div>
                `
            ) : ''}

            <form class="pf-form" id="pf-profile-form" style="margin-top:18px">
                <div class="pf-field-grid">
                    <label class="pf-field">
                        <span>Nombre de la cuenta</span>
                        <input type="text" name="account_name" value="${escapeHtml(id.name)}" required>
                    </label>
                    <label class="pf-field">
                        <span>Alias para recoger pedidos (distinto al nombre)</span>
                        <input type="text" name="pickup_alias" value="${escapeHtml(state.prefs.pickupAlias)}" placeholder="Ej. Pato / Alex">
                    </label>
                </div>
                <div class="pf-field-grid">
                    <label class="pf-field">
                        <span>Tipo de uso en Foodlink</span>
                        <select name="role">
                            <option value="comensal"${state.prefs.role === 'comensal' ? ' selected' : ''}>Comensal (Busco comida para rescatar)</option>
                            <option value="comercio"${state.prefs.role === 'comercio' ? ' selected' : ''}>Comercio aliado (Vender excedentes)</option>
                            <option value="ambos"${state.prefs.role === 'ambos' ? ' selected' : ''}>Comensal y Comercio (Ambos roles)</option>
                        </select>
                    </label>
                    <label class="pf-field">
                        <span>Colonia o zona habitual de busqueda</span>
                        <input type="text" name="zone_note" value="${escapeHtml(state.prefs.zoneNote)}" placeholder="Ej. Roma Norte, Centro, Coyoacan...">
                    </label>
                </div>
                <div class="pf-field">
                    <span>Preferencias alimentarias</span>
                    <div class="pf-tags-selector">${dietPills}</div>
                </div>
                <label class="pf-field" style="display:flex;flex-direction:row;align-items:center;gap:10px;cursor:pointer;margin-top:4px">
                    <input type="checkbox" name="notify_favorites"${state.prefs.notifyFavorites ? ' checked' : ''} style="width:18px;height:18px;accent-color:var(--pf-saffron)">
                    <span style="font-size:13.5px;color:var(--pf-cream);user-select:none">Recibir alertas en vivo cuando mis locales favoritos publiquen paquetes sorpresa</span>
                </label>
                <div style="margin-top:12px">
                    <button type="submit" class="pf-btn pf-btn--primary">Guardar preferencias</button>
                </div>
            </form>
        </section>
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

    const reservedOrders = state.orders.filter((o) => o.status === 'reserved');
    const pickedOrders = state.orders.filter((o) => o.status === 'picked_up');
    const cancelledOrders = state.orders.filter((o) => o.status === 'cancelled');

    const filter = state.orderFilter;
    const filteredOrders = state.orders.filter((ord) => {
        if (filter === 'all') return true;
        return ord.status === filter;
    });

    const filterBar = `
        <div class="pf-orders-filter-bar">
            <button type="button" class="pf-filter-pill${filter === 'reserved' ? ' is-active' : ''}" data-action="filter-orders" data-filter="reserved">
                Activos (${reservedOrders.length})
            </button>
            <button type="button" class="pf-filter-pill${filter === 'picked_up' ? ' is-active' : ''}" data-action="filter-orders" data-filter="picked_up">
                Entregados (${pickedOrders.length})
            </button>
            <button type="button" class="pf-filter-pill${filter === 'cancelled' ? ' is-active' : ''}" data-action="filter-orders" data-filter="cancelled">
                Cancelados (${cancelledOrders.length})
            </button>
            <button type="button" class="pf-filter-pill${filter === 'all' ? ' is-active' : ''}" data-action="filter-orders" data-filter="all">
                Todos (${state.orders.length})
            </button>
        </div>
    `;

    const cardsHtml = filteredOrders.length > 0
        ? filteredOrders.map((ord) => {
            const isReserved = ord.status === 'reserved';
            const isPicked = ord.status === 'picked_up';
            const statusLabel = isReserved ? 'Activo' : isPicked ? 'Entregado' : 'Cancelado';
            const pillClass = isReserved ? 'pf-pill--sage' : isPicked ? 'pf-pill--saffron' : '';

            let countdownBadge = '';
            if (isReserved && ord.pickup_end) {
                const cInfo = getCountdownInfo(ord.pickup_end);
                countdownBadge = `<span class="pf-countdown-badge${cInfo.isUrgent ? ' is-urgent' : ''}" data-countdown-end="${escapeHtml(ord.pickup_end)}">${icons.clock(12)} ${escapeHtml(cInfo.text)}</span>`;
            }

            const targetSlugOrId = (ord as any).slug ?? ord.business_id;

            return `
                <li class="pf-order-card pf-boarding-pass${isReserved ? ' is-reserved' : ''}">
                    <div class="pf-order-top">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                            <span class="pf-pill ${pillClass}">${statusLabel}</span>
                            <span class="pf-pill">${escapeHtml(ord.pickup_code)}</span>
                        </div>
                        ${countdownBadge}
                    </div>

                    <h3 class="pf-order-biz">${escapeHtml(ord.business_name)}</h3>
                    <p class="pf-order-offer">${ord.quantity}x ${escapeHtml(ord.offer_title)}</p>

                    <div class="pf-order-contact">
                        <span><strong>Ventana de recogida:</strong> ${formatClock(new Date(ord.pickup_start))} - ${formatClock(new Date(ord.pickup_end))}</span>
                        ${ord.business_address ? `<span><strong>Direccion:</strong> ${escapeHtml(ord.business_address)}</span>` : ''}
                        ${ord.business_phone ? `<span><strong>Telefono:</strong> <a href="tel:${escapeHtml(ord.business_phone)}">${escapeHtml(ord.business_phone)}</a></span>` : ''}
                    </div>

                    <div class="pf-order-meta">
                        <span>${ord.total_price === 0 ? 'Sin costo (Gratis)' : `Pago en el local: ${formatPrice(ord.total_price)}`}</span>
                        <span>&middot;</span>
                        <span>~${ord.est_weight_kg} kg rescatados</span>
                    </div>

                    <div class="pf-ticket-divider">
                        <span class="pf-ticket-notch pf-ticket-notch--left"></span>
                        <span class="pf-ticket-notch pf-ticket-notch--right"></span>
                    </div>

                    ${isReserved ? `
                        <div class="pf-qr-box">
                            <div class="pf-qr-frame" data-action="enlarge-qr" data-code="${escapeHtml(ord.pickup_code)}" data-biz="${escapeHtml(ord.business_name)}" title="Toca para ampliar el codigo QR">
                                ${renderQrSvg('FOODLINK:' + ord.pickup_code, 160)}
                            </div>
                            <div class="pf-qr-info">
                                <span class="pf-eyebrow">Codigo de entrega</span>
                                <div class="pf-qr-code-row">
                                    <strong class="pf-qr-code">${escapeHtml(ord.pickup_code)}</strong>
                                    <button type="button" class="pf-copy-btn" data-action="copy-code" data-code="${escapeHtml(ord.pickup_code)}">
                                        ${copyIcon(13)} Copiar
                                    </button>
                                </div>
                                <p>Muestra este codigo QR al llegar al negocio antes de las ${formatClock(new Date(ord.pickup_end))}.</p>
                            </div>
                        </div>
                        <div class="pf-order-actions">
                            <a href="/explorar/?lugar=${targetSlugOrId}&ruta=1" class="pf-btn pf-btn--primary pf-btn--sm">
                                ${icons.route(15)} Como llegar en mapa
                            </a>
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="enlarge-qr" data-code="${escapeHtml(ord.pickup_code)}" data-biz="${escapeHtml(ord.business_name)}">
                                ${icons.qr(15)} Ampliar QR
                            </button>
                            <button type="button" class="pf-btn pf-btn--subtle pf-btn--sm pf-btn--danger" data-action="cancel-order-prompt" data-order-id="${ord.id}" data-biz="${escapeHtml(ord.business_name)}">
                                Cancelar reserva
                            </button>
                        </div>
                    ` : (isPicked ? `
                        <div class="pf-order-actions">
                            <a href="/explorar/?lugar=${targetSlugOrId}" class="pf-btn pf-btn--ghost pf-btn--sm">
                                Ver negocio en el mapa
                            </a>
                            ${!ord.has_review ? `
                                <button type="button" class="pf-btn pf-btn--primary pf-btn--sm" data-action="review-order" data-order-id="${ord.id}" data-biz-id="${ord.business_id}" data-biz-name="${escapeHtml(ord.business_name)}" data-offer-title="${escapeHtml(ord.offer_title)}">
                                    ${icons.starFilled(14)} Calificar rescate
                                </button>
                            ` : `
                                <span class="pf-pill pf-pill--sage">${icons.check(12)} Rescate calificado</span>
                            `}
                        </div>
                    ` : `
                        <div class="pf-order-actions">
                            <a href="/explorar/?lugar=${targetSlugOrId}" class="pf-btn pf-btn--ghost pf-btn--sm">
                                Ver negocio en el mapa
                            </a>
                        </div>
                    `)}
                </li>
            `;
        }).join('')
        : `
            <div class="pf-empty" style="grid-column:1/-1;padding:32px 16px">
                ${icons.ticket(32)}
                <h3>No hay pedidos ${filter === 'reserved' ? 'activos' : filter === 'picked_up' ? 'entregados' : filter === 'cancelled' ? 'cancelados' : ''}</h3>
                <p>Puedes seleccionar otra pestana o explorar ofertas cercanas en el mapa.</p>
            </div>
        `;

    return `
        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Pases de recogida e historial</p>
                <a href="/explorar/" class="pf-btn pf-btn--ghost pf-btn--sm">${icons.map(15)} Reservar otra comida</a>
            </div>
            <h1 class="pf-title">Mis Pedidos y Codigos QR</h1>
            <p class="pf-subtitle">Presenta tu codigo QR al llegar al negocio para validar y pagar ahi mismo tu rescate.</p>
            <div style="margin-top:18px">
                ${filterBar}
                <ul class="pf-orders-grid" style="margin-top:14px">${cardsHtml}</ul>
            </div>
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

    const gaugeCircumference = 314.16; // 2 * PI * 50
    const gaugeOffset = gaugeCircumference * (1 - Math.min(1, Math.max(0, imp.level_progress / 100)));

    const badgesHtml = imp.badges.map((b) => {
        let progressPct = 0;
        if (b.unlocked) {
            progressPct = 100;
        } else if (b.id === 'first_rescue') {
            progressPct = imp.rescues_count >= 1 ? 100 : 0;
        } else if (b.id === 'zero_waste') {
            progressPct = Math.min(100, Math.round((imp.kg_saved / 2) * 100));
        } else if (b.id === 'community_hero') {
            progressPct = Math.min(100, Math.round((imp.rescues_count / 5) * 100));
        } else {
            progressPct = imp.rescues_count > 0 ? 50 : 0;
        }

        return `
            <li class="pf-badge-item${b.unlocked ? ' is-unlocked' : ''}">
                <div class="pf-badge-icon">${icons.award(20)}</div>
                <div class="pf-badge-copy">
                    <strong>${escapeHtml(b.title)}</strong>
                    <p>${escapeHtml(b.desc)}</p>
                    <div class="pf-badge-progress-bar">
                        <div class="pf-badge-progress-fill" style="width:${b.unlocked ? 100 : Math.max(5, progressPct)}%"></div>
                    </div>
                </div>
                <span class="pf-pill ${b.unlocked ? 'pf-pill--sage' : ''}">${b.unlocked ? 'Logrado' : `${progressPct}%`}</span>
            </li>
        `;
    }).join('');

    const mealEquiv = Math.max(1, Math.round(imp.kg_saved / 0.5));
    const carKmEquiv = Math.max(1, Math.round(imp.co2_avoided_kg * 4.2));
    const showersEquiv = Math.max(1, Math.round(imp.water_liters / 70));

    return `
        <section class="pf-panel-card">
            <p class="pf-eyebrow">Sostenibilidad y economia</p>
            <h1 class="pf-title">Mi Impacto Ambiental y Ahorro</h1>
            <p class="pf-subtitle">Cada paquete o platillo que rescatas evita emisiones de gases de efecto invernadero y apoya a los comercios de tu barrio.</p>

            <div class="pf-level-banner" style="margin-top:18px">
                <div class="pf-level-top">
                    <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
                        <div class="pf-gauge-wrapper">
                            <svg class="pf-gauge-svg" viewBox="0 0 120 120">
                                <defs>
                                    <linearGradient id="pf-impact-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#e05a36" />
                                        <stop offset="50%" stop-color="#f4a261" />
                                        <stop offset="100%" stop-color="#8ab17d" />
                                    </linearGradient>
                                </defs>
                                <circle class="pf-gauge-track" cx="60" cy="60" r="50" />
                                <circle class="pf-gauge-bar" cx="60" cy="60" r="50" stroke-dasharray="${gaugeCircumference}" stroke-dashoffset="${gaugeOffset}" />
                            </svg>
                            <div class="pf-gauge-content">
                                <span class="pf-gauge-percent">${Math.round(imp.level_progress)}%</span>
                                <span class="pf-gauge-label">Nivel</span>
                            </div>
                        </div>
                        <div>
                            <span class="pf-eyebrow">Rango de impacto</span>
                            <h3 style="margin:2px 0 0;font-family:var(--pf-font-display);font-size:28px;color:var(--pf-cream)">${escapeHtml(imp.level_title)}</h3>
                            <p style="margin:4px 0 0;font-size:13px;color:var(--pf-muted)">
                                Siguiente nivel: <strong style="color:var(--pf-cream)">${escapeHtml(imp.next_level_title)}</strong> (${imp.rescues_count}/${imp.next_level_target} porciones)
                            </p>
                        </div>
                    </div>
                    <span class="pf-pill pf-pill--saffron">${imp.rescues_count} ${imp.rescues_count === 1 ? 'porcion rescatada' : 'porciones rescatadas'}</span>
                </div>
                <div class="pf-level-bar" style="margin-top:8px"><span style="width:${Math.max(6, imp.level_progress)}%"></span></div>
            </div>

            <div class="pf-stats-grid" style="margin-top:16px">
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.kg_saved} kg</span>
                    <span class="pf-stat-lbl">Comida salvada de tirarse</span>
                    <span class="pf-stat-equiv">Equivale a ~${mealEquiv} comidas completas</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.co2_avoided_kg} kg</span>
                    <span class="pf-stat-lbl">Emisiones CO2 evitadas</span>
                    <span class="pf-stat-equiv">Equivale a ~${carKmEquiv} km en auto</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${formatPrice(imp.money_saved)}</span>
                    <span class="pf-stat-lbl">Ahorro acumulado en MXN</span>
                    <span class="pf-stat-equiv">Frente al precio regular</span>
                </div>
                <div class="pf-stat-box">
                    <span class="pf-stat-val">${imp.water_liters} L</span>
                    <span class="pf-stat-lbl">Agua potable preservada</span>
                    <span class="pf-stat-equiv">Equivale a ~${showersEquiv} duchas de 5 min</span>
                </div>
            </div>

            <div style="margin-top:24px">
                <h2 class="pf-section-title">Insignias y logros <span>${imp.badges.filter((b) => b.unlocked).length}/${imp.badges.length}</span></h2>
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

    const alertsBannerHtml = state.favoriteAlerts.length > 0 ? `
        <div class="pf-alerts-banner" style="margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <span class="pf-pulse-badge">
                    <span class="pf-pulse-dot"></span>
                    Alertas activas
                </span>
                <div>
                    <strong>${state.favoriteAlerts.length} ${state.favoriteAlerts.length === 1 ? 'local favorito tiene' : 'locales favoritos tienen'} comida disponible para rescatar ahora</strong>
                    <p style="margin:2px 0 0;font-size:13px;color:var(--pf-muted)">
                        ${state.favoriteAlerts.map((a) => `${escapeHtml(a.name)} (${a.offers_count} ${a.offers_count === 1 ? 'oferta' : 'ofertas'})`).join(', ')}
                    </p>
                </div>
            </div>
            <a href="/explorar/?filtro=favoritos" class="pf-btn pf-btn--primary pf-btn--sm">
                ${icons.map(15)} Ver en mapa
            </a>
        </div>
    ` : '';

    const cards = favPlaces.map((p) => {
        const offer = p.offers && p.offers.length > 0 ? p.offers[0] : null;
        const pct = offer ? discountPercent(offer) : null;
        const hasActiveOffer = Boolean(offer && offer.quantity_left > 0);
        const targetSlugOrId = (p as any).slug ?? p.id;

        return `
            <li class="pf-fav-card">
                <div class="pf-order-top">
                    <span class="pf-pill">${escapeHtml(PLACE_TYPE_LABEL[p.type] ?? p.type)}</span>
                    <span class="pf-pill pf-pill--saffron">${icons.starFilled(12)} ${(p.rating_avg || 4.8).toFixed(1)}</span>
                    ${hasActiveOffer ? `
                        <span class="pf-pulse-badge">
                            <span class="pf-pulse-dot"></span>
                            Oferta activa
                        </span>
                    ` : ''}
                </div>
                <h3>${escapeHtml(p.name)}</h3>
                <p style="margin:0;font-size:13px;color:var(--pf-muted)">
                    ${p.distance_m !== null && p.distance_m !== undefined ? `${formatDistance(p.distance_m)} &middot; ` : ''}${escapeHtml(p.address || p.opening_hours || '')}
                </p>
                ${offer ? `
                    <div style="padding:10px 12px;border-radius:10px;background:rgba(138,177,125,0.12);border:1px solid rgba(138,177,125,0.35);font-size:13px">
                        <strong style="color:var(--pf-sage);display:block">${escapeHtml(offer.title)}</strong>
                        <span>${offer.price === 0 ? 'Gratis' : formatPrice(offer.price)}${pct ? ` (-${pct}%)` : ''} &middot; Quedan ${offer.quantity_left}</span>
                    </div>
                ` : `<span style="font-size:12.5px;color:var(--pf-muted)">Sin ofertas activas en este momento</span>`}
                <div class="pf-order-actions">
                    <a href="/explorar/?lugar=${targetSlugOrId}" class="pf-btn pf-btn--primary pf-btn--sm">
                        Ver en el mapa
                    </a>
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
            ${alertsBannerHtml}
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

    const { pending: pendingOrders, history: historyOrders } = splitBusinessPanelOrders(panel?.orders);

    const activeOffers = (panel?.offers ?? []).filter((o) => o.status === 'active' && o.quantity_left > 0);

    if (!biz && !state.showNewBusinessForm) {
        return `
            <section class="pf-panel-card">
                <div class="pf-eyebrow-row">
                    <p class="pf-eyebrow">Red de Comercios Aliados</p>
                </div>
                <div class="pf-onboarding-card">
                    <span class="pf-eyebrow" style="color:var(--pf-saffron)">Impacto economico y sustentabilidad</span>
                    <h1 style="margin:0;font-family:var(--pf-font-display);font-size:clamp(24px,3.5vw,36px);color:var(--pf-cream);line-height:1.15">
                        Unete a la Red de Comercios Aliados de Foodlink
                    </h1>
                    <p style="margin:0;font-size:15px;color:var(--pf-muted);max-width:65ch;line-height:1.55">
                        Transforma los excedentes diarios de tu panaderia, fonda o restaurante en ingresos tangibles mientras evitas el desperdicio de alimentos y conectas con nuevos comensales de tu colonia.
                    </p>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px;margin-top:8px">
                        <div style="padding:16px;border-radius:var(--pf-radius-sm);background:rgba(245,242,235,0.03);border:1px solid var(--pf-border);display:flex;flex-direction:column;gap:8px">
                            <div style="color:var(--pf-sage)">${icons.chart(22)}</div>
                            <strong style="color:var(--pf-cream);font-size:14px">Recupera hasta el 40% del costo de tus mermas</strong>
                            <p style="margin:0;font-size:12.5px;color:var(--pf-muted);line-height:1.4">Convierte alimentos preparados frescos y de calidad que no se vendieron en liquidez directa.</p>
                        </div>
                        <div style="padding:16px;border-radius:var(--pf-radius-sm);background:rgba(245,242,235,0.03);border:1px solid var(--pf-border);display:flex;flex-direction:column;gap:8px">
                            <div style="color:var(--pf-saffron)">${icons.shield(22)}</div>
                            <strong style="color:var(--pf-cream);font-size:14px">Cero comisiones fijas, 100% transparente</strong>
                            <p style="margin:0;font-size:12.5px;color:var(--pf-muted);line-height:1.4">Sin mensualidades ni costos ocultos. Solo publicas cuando tienes paquetes sorpresa disponibles.</p>
                        </div>
                        <div style="padding:16px;border-radius:var(--pf-radius-sm);background:rgba(245,242,235,0.03);border:1px solid var(--pf-border);display:flex;flex-direction:column;gap:8px">
                            <div style="color:var(--pf-terracotta)">${icons.qr(22)}</div>
                            <strong style="color:var(--pf-cream);font-size:14px">Clientes locales recogen en tu tienda con codigo QR</strong>
                            <p style="margin:0;font-size:12.5px;color:var(--pf-muted);line-height:1.4">Sin repartidores ni esperas: el cliente llega directamente a tu mostrador y valida su pase digital.</p>
                        </div>
                    </div>

                    <div style="margin-top:12px">
                        <p class="pf-eyebrow" style="margin-bottom:12px;color:var(--pf-saffron)">Como funciona el ciclo de rescate</p>
                        <div class="pf-onboarding-steps">
                            <div class="pf-onboarding-step">
                                <span class="pf-onboarding-num">1</span>
                                <strong>1. Registra tu local</strong>
                                <p>Ingresa el nombre, direccion y horario de tu establecimiento en menos de un minuto.</p>
                            </div>
                            <div class="pf-onboarding-step">
                                <span class="pf-onboarding-num">2</span>
                                <strong>2. Publica excedentes en 20s</strong>
                                <p>Selecciona una plantilla rapida, define precio de rescate y ventana de recogida.</p>
                            </div>
                            <div class="pf-onboarding-step">
                                <span class="pf-onboarding-num">3</span>
                                <strong>3. Escanea QR y cobra en caja</strong>
                                <p>Valida el codigo en la entrega y recibe el pago directo de tus comensales locales.</p>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                        <button type="button" class="pf-btn pf-btn--primary" data-action="toggle-new-biz">
                            ${icons.store(16)} + Registrar mi establecimiento
                        </button>
                        <span style="font-size:13px;color:var(--pf-muted)">Activacion inmediata en el mapa de exploracion</span>
                    </div>
                </div>
            </section>
        `;
    }

    const newBizFormHtml = state.showNewBusinessForm ? `
        <form class="pf-form" id="pf-register-biz-form" style="margin-top:18px;padding:22px;border-radius:14px;background:var(--pf-surface-2);border:1px solid var(--pf-border-strong)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                <h2 class="pf-section-title" style="margin:0">Dar de alta un nuevo establecimiento</h2>
                <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="toggle-new-biz">Cancelar registro</button>
            </div>
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
                    <span>Direccion completa</span>
                    <input type="text" name="address" required placeholder="Calle, numero y colonia">
                    <div style="display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap">
                        <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="use-current-location">
                            ${icons.locate(14)} Usar mi ubicacion actual
                        </button>
                        <span id="pf-geo-status" style="font-size:12px;color:var(--pf-muted)"></span>
                    </div>
                </label>
                <label class="pf-field">
                    <span>Telefono de contacto</span>
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
                    <input type="text" name="description" placeholder="Especialidad de la casa o concepto culinario">
                </label>
            </div>
            <div style="margin-top:6px">
                <button type="submit" class="pf-btn pf-btn--primary">Guardar y publicar en el mapa</button>
            </div>
        </form>
    ` : '';

    if (!biz) {
        return `
            <section class="pf-panel-card">
                <div class="pf-eyebrow-row">
                    <p class="pf-eyebrow">Panel para comercios aliados</p>
                    <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="toggle-new-biz">
                        Volver a informacion
                    </button>
                </div>
                <h1 class="pf-title">Registro de Establecimiento</h1>
                <p class="pf-subtitle">Completa los datos de tu local para comenzar a publicar excedentes de comida.</p>
                ${newBizFormHtml}
            </section>
        `;
    }

    const pendingHtml = pendingOrders.length > 0
        ? `<ul class="pf-biz-list">${pendingOrders.map((o) => `
            <li class="pf-biz-row">
                <div>
                    <strong style="display:block;font-size:14px">${escapeHtml(o.pickup_code)} · ${o.quantity}x ${escapeHtml(o.offer_title)}</strong>
                    <span style="font-size:12.5px;color:var(--pf-muted)">Cliente: ${escapeHtml(o.user_name)} &middot; ${o.total_price === 0 ? 'Sin costo (Gratis)' : `Cobrar ${formatPrice(o.total_price)} en caja`} &middot; Limite: ${formatClock(new Date(o.pickup_end))}</span>
                </div>
                <button type="button" class="pf-btn pf-btn--primary pf-btn--sm" data-action="redeem-quick" data-code="${escapeHtml(o.pickup_code)}" data-biz-id="${biz.id}">
                    ${icons.check(14)} Validar entrega
                </button>
            </li>
        `).join('')}</ul>`
        : '<p style="margin:0;color:var(--pf-muted);font-size:13.5px">No hay reservas pendientes de recoger en este momento.</p>';

    const historyHtml = historyOrders.length > 0
        ? `<ul class="pf-biz-list">${historyOrders.map((o) => `
            <li class="pf-biz-row">
                <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                        ${o.status === 'picked_up'
                            ? `<span class="pf-pill pf-pill--sage">${icons.check(12)} Entregado</span>`
                            : `<span class="pf-pill pf-pill--terracotta">${icons.close(12)} Cancelado</span>`}
                        <strong style="font-size:14px">${escapeHtml(o.pickup_code)} · ${o.quantity}x ${escapeHtml(o.offer_title)}</strong>
                    </div>
                    <span style="font-size:12.5px;color:var(--pf-muted)">Cliente: ${escapeHtml(o.user_name)} &middot; ${o.picked_up_at ? `Entregado: ${formatOrderDate(o.picked_up_at)}` : `Fecha: ${formatOrderDate(o.created_at)}`} &middot; Importe: ${o.total_price === 0 ? 'Gratis' : formatPrice(o.total_price)}</span>
                </div>
                <span style="font-family:var(--pf-font-mono);font-size:13.5px;font-weight:600;color:var(--pf-cream)">${o.total_price === 0 ? 'Gratis' : formatPrice(o.total_price)}</span>
            </li>
        `).join('')}</ul>`
        : '<p style="margin:0;color:var(--pf-muted);font-size:13.5px">No hay pedidos historicos registrados todavia.</p>';

    const activeOffersHtml = activeOffers.length > 0
        ? `<ul class="pf-biz-list">${activeOffers.map((o) => `
            <li class="pf-biz-row">
                <div>
                    <strong style="display:block;font-size:14px">${escapeHtml(o.title)}</strong>
                    <span style="font-size:12.5px;color:var(--pf-muted)">${o.price === 0 ? 'Gratis' : formatPrice(o.price)} (antes ${formatPrice(o.original_price)}) &middot; Quedan ${o.quantity_left}/${o.quantity_total}</span>
                    ${o.description ? `<p style="margin:4px 0 0;font-size:12px;color:var(--pf-muted)">${escapeHtml(o.description)}</p>` : ''}
                </div>
                <div style="display:flex;gap:8px">
                    <a href="/explorar/?lugar=${biz.id}" class="pf-btn pf-btn--ghost pf-btn--sm">Ver en mapa</a>
                    <button type="button" class="pf-btn pf-btn--subtle pf-btn--sm pf-btn--danger" data-action="close-offer" data-offer-id="${o.id}">
                        Cerrar oferta
                    </button>
                </div>
            </li>
        `).join('')}</ul>`
        : '<p style="margin:0;color:var(--pf-muted);font-size:13.5px">No hay ofertas activas en este momento. Publica una usando las plantillas de abajo.</p>';

    return `
        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <p class="pf-eyebrow">Panel de Administracion</p>
                <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm" data-action="toggle-new-biz">
                    ${state.showNewBusinessForm ? 'Cancelar registro' : '+ Registrar otro local'}
                </button>
            </div>
            <h1 class="pf-title">Gestion de Mi Negocio</h1>
            <p class="pf-subtitle">Administra tu establecimiento <strong>${escapeHtml(biz.name)}</strong>, valida codigos QR y publica nuevos excedentes.</p>

            ${newBizFormHtml}

            ${available.length > 1 ? `
                <div class="pf-field" style="margin-top:18px;max-width:460px">
                    <span>Cambiar de establecimiento administrado:</span>
                    <select data-action="select-managed-biz">${bizOptions}</select>
                </div>
            ` : ''}

            ${stats ? `
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

        <section class="pf-panel-card">
            <h2 class="pf-section-title">${icons.qr(16)} Validar codigo QR de cliente <span>Entrega en caja</span></h2>
            <p style="margin:0 0 14px;font-size:13px;color:var(--pf-muted)">Ingresa o escanea el codigo que presenta el cliente para validar la entrega y autorizar el cobro:</p>
            <form class="pf-redeem-row" id="pf-redeem-form">
                <input type="text" name="pickup_code" placeholder="Ingresa el codigo (ej. FL-7K4M92)" required>
                <button type="submit" class="pf-btn pf-btn--primary">Canjear codigo QR</button>
            </form>
        </section>

        <section class="pf-panel-card">
            <div class="pf-eyebrow-row">
                <h2 class="pf-section-title" style="margin:0">${icons.ticket(16)} Gestion de Pedidos</h2>
            </div>
            <div class="pf-biz-tabs" style="margin-top:10px">
                <button type="button" class="pf-biz-tab-btn ${state.bizOrdersTab === 'pending' ? 'is-active' : ''}" data-action="set-biz-orders-tab" data-tab="pending">
                    Pendientes de recoger (${pendingOrders.length})
                </button>
                <button type="button" class="pf-biz-tab-btn ${state.bizOrdersTab === 'history' ? 'is-active' : ''}" data-action="set-biz-orders-tab" data-tab="history">
                    Historial de pedidos (${historyOrders.length})
                </button>
            </div>
            ${state.bizOrdersTab === 'pending' ? pendingHtml : historyHtml}
        </section>

        <section class="pf-panel-card">
            <h2 class="pf-section-title">Ofertas activas de ${escapeHtml(biz.name)} <span>${activeOffers.length}</span></h2>
            ${activeOffersHtml}
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
                <label class="pf-field">
                    <span>Descripcion o contenido del paquete (opcional)</span>
                    <input type="text" name="description" placeholder="Ej. Incluye 4 piezas surtidas del dia y baguette artesanal">
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
                        <input type="number" name="original_price" id="pf-offer-orig-price" value="110" min="0" step="1" required>
                    </label>
                    <label class="pf-field">
                        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
                            <span>Precio rescate (0 = Gratis)</span>
                            <span class="pf-discount-preview" id="pf-discount-badge">-64% OFF</span>
                        </div>
                        <input type="number" name="price" id="pf-offer-price" value="40" min="0" step="1" required>
                    </label>
                </div>
                <div class="pf-field-grid">
                    <label class="pf-field">
                        <span>Ventana de recogida</span>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm pf-pickup-chip" data-action="set-pickup-hours" data-hours="1">1 hora</button>
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm pf-pickup-chip" data-action="set-pickup-hours" data-hours="2">2 horas</button>
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm pf-pickup-chip is-active" data-action="set-pickup-hours" data-hours="3" style="background:rgba(244,162,97,0.2);border-color:var(--pf-saffron);color:var(--pf-saffron)">3 horas</button>
                            <button type="button" class="pf-btn pf-btn--ghost pf-btn--sm pf-pickup-chip" data-action="set-pickup-hours" data-hours="5">Cierre de turno (5h)</button>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                            <input type="number" name="pickup_hours" id="pf-offer-pickup-hours" value="3" min="0.5" max="12" step="0.5" required style="max-width:140px">
                            <span style="font-size:13px;color:var(--pf-muted)">horas a partir de ahora</span>
                        </div>
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
                <div style="margin-top:6px">
                    <button type="submit" class="pf-btn pf-btn--primary">Publicar oferta en el mapa</button>
                </div>
            </form>
        </section>
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
    const identity = getActiveUserIdentity();

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
            isProfileFormDirty = true;
            const container = target.closest('.pf-tags-selector') || mainEl.querySelector('.pf-tags-selector');
            if (container) {
                const buttons = container.querySelectorAll<HTMLButtonElement>('.pf-tag-toggle');
                buttons.forEach((btn) => {
                    const btnTag = btn.dataset.tag;
                    if (btnTag) {
                        btn.classList.toggle('is-on', state.prefs.dietTags.includes(btnTag));
                    }
                });
            }
            break;
        }
        case 'verify-code': {
            const input = document.getElementById('pf-verify-code-input') as HTMLInputElement | null;
            const code = input?.value.trim() || '';
            if (!code) {
                toast('Ingresa el codigo de 6 digitos.');
                return;
            }
            void (async () => {
                try {
                    const res = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: identity.email, code })
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok || !data?.success) {
                        toast(data?.message || 'Codigo de verificacion incorrecto.');
                        return;
                    }
                    const stored = getStoredUser();
                    if (stored) {
                        setStoredUser({ ...stored, is_verified: true });
                    }
                    toast(data?.message || 'Cuenta verificada correctamente.');
                    await loadAllProfileData();
                } catch (err) {
                    toast((err as Error).message || 'Error al verificar codigo.');
                }
            })();
            break;
        }
        case 'resend-code': {
            void (async () => {
                try {
                    const res = await fetch('/api/auth/resend-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: identity.email })
                    });
                    const data = await res.json().catch(() => null);
                    if (!res.ok || !data?.success) {
                        toast(data?.message || 'No se pudo reenviar el codigo.');
                        return;
                    }
                    toast(data?.message || 'Nuevo codigo enviado a tu correo.');
                } catch (err) {
                    toast((err as Error).message || 'Error al reenviar codigo.');
                }
            })();
            break;
        }
        case 'filter-orders': {
            const filter = target.dataset.filter as 'all' | 'reserved' | 'picked_up' | 'cancelled';
            if (filter) {
                state.orderFilter = filter;
                renderMain();
            }
            break;
        }
        case 'enlarge-qr': {
            const code = String(target.dataset.code || '');
            const biz = String(target.dataset.biz || 'Foodlink');
            if (code) {
                openEnlargeQrModal(code, biz);
            }
            break;
        }
        case 'copy-code': {
            const code = String(target.dataset.code || '');
            if (!code) break;
            void (async () => {
                try {
                    await navigator.clipboard.writeText(code);
                    target.classList.add('is-copied');
                    const originalHtml = target.innerHTML;
                    target.innerHTML = `${icons.check(13)} Copiado`;
                    window.setTimeout(() => {
                        target.classList.remove('is-copied');
                        target.innerHTML = originalHtml;
                    }, 2000);
                    toast(`Codigo ${code} copiado al portapapeles.`);
                } catch {
                    toast(`Codigo: ${code}`);
                }
            })();
            break;
        }
        case 'cancel-order-prompt': {
            const orderId = Number(target.dataset.orderId);
            const biz = String(target.dataset.biz || 'el local');
            if (orderId) {
                openCancelConfirmModal(orderId, biz);
            }
            break;
        }
        case 'confirm-cancel-order': {
            const orderId = Number(target.dataset.orderId);
            const modal = document.getElementById('pf-cancel-modal');
            if (modal) modal.classList.remove('is-open');
            if (orderId) {
                void handleCancelOrder(orderId);
            }
            break;
        }
        case 'review-order': {
            const orderId = Number(target.dataset.orderId);
            const bizId = Number(target.dataset.bizId);
            const bizName = String(target.dataset.bizName || '');
            const offerTitle = String(target.dataset.offerTitle || '');
            if (orderId && bizId) {
                openReviewModal(orderId, bizId, bizName, offerTitle);
            }
            break;
        }
        case 'select-star': {
            const star = Number(target.dataset.star || 5);
            activeReviewStars = star;
            const container = document.getElementById('pf-review-stars');
            if (container) {
                const starBtns = container.querySelectorAll<HTMLButtonElement>('.pf-star-btn');
                starBtns.forEach((b) => {
                    const val = Number(b.dataset.star || 0);
                    b.classList.toggle('is-active', val <= star);
                });
            }
            break;
        }
        case 'close-modal': {
            const modal = target.closest('.pf-modal');
            if (modal) modal.classList.remove('is-open');
            break;
        }
        case 'logout':
            clearStoredUser();
            toast('Sesion cerrada correctamente.');
            window.setTimeout(() => {
                window.location.replace('/');
            }, 350);
            break;
        case 'set-biz-orders-tab': {
            const tab = target.dataset.tab as 'pending' | 'history';
            if (tab && (tab === 'pending' || tab === 'history')) {
                state.bizOrdersTab = tab;
                renderMain();
            }
            break;
        }
        case 'set-pickup-hours': {
            const hours = Number(target.dataset.hours);
            if (!isNaN(hours)) {
                const hoursInput = document.getElementById('pf-offer-pickup-hours') as HTMLInputElement | null;
                if (hoursInput) hoursInput.value = String(hours);
                const container = target.closest('.pf-field') || mainEl;
                const chipBtns = container.querySelectorAll<HTMLButtonElement>('.pf-pickup-chip');
                chipBtns.forEach((btn) => {
                    const match = btn === target;
                    btn.classList.toggle('is-active', match);
                    btn.style.background = match ? 'rgba(244, 162, 97, 0.2)' : '';
                    btn.style.borderColor = match ? 'var(--pf-saffron)' : '';
                    btn.style.color = match ? 'var(--pf-saffron)' : '';
                });
            }
            break;
        }
        case 'use-current-location': {
            if (!navigator.geolocation) {
                toast('La geolocalizacion no esta soportada por este navegador.');
                break;
            }
            const statusEl = document.getElementById('pf-geo-status');
            if (statusEl) {
                statusEl.textContent = 'Obteniendo GPS en alta precision...';
                statusEl.style.color = 'var(--pf-saffron)';
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    capturedBizLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    if (statusEl) {
                        statusEl.textContent = `GPS capturado (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
                        statusEl.style.color = 'var(--pf-sage)';
                    }
                    toast('Coordenadas capturadas exitosamente desde tu ubicacion actual.');
                },
                (err) => {
                    if (statusEl) {
                        statusEl.textContent = 'No se pudo obtener GPS.';
                        statusEl.style.color = 'var(--pf-terracotta)';
                    }
                    toast('Aviso: no se pudo obtener el GPS (' + err.message + '). Se usara geocodificacion.');
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
            break;
        }
        case 'cancel-order':
            void handleCancelOrder(Number(target.dataset.orderId));
            break;
        case 'redeem-quick': {
            const code = String(target.dataset.code || '');
            const bizId = Number(target.dataset.bizId) || state.businessPanel?.business?.id || state.selectedBusinessId;
            if (code) {
                void handleRedeemCode(code, bizId);
            }
            break;
        }
        case 'unfav':
            void handleUnfavorite(Number(target.dataset.placeId));
            break;
        case 'toggle-new-biz':
            state.showNewBusinessForm = !state.showNewBusinessForm;
            capturedBizLocation = null;
            renderMain();
            break;
        case 'apply-tpl':
            applyOfferTemplate(String(target.dataset.tpl || ''));
            break;
        case 'close-offer': {
            const offerId = Number(target.dataset.offerId);
            if (!offerId) break;
            target.setAttribute('disabled', 'true');
            void (async () => {
                try {
                    const res = await closeBusinessOffer(offerId, identity.email);
                    toast(res.message || 'Oferta finalizada correctamente.');
                    await loadAllProfileData();
                } catch (err) {
                    toast((err as Error).message || 'No se pudo cerrar la oferta.');
                } finally {
                    target.removeAttribute('disabled');
                }
            })();
            break;
        }
    }
}

function onMainChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (target && target.closest('#pf-profile-form')) {
        isProfileFormDirty = true;
    }
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
        const accountName = String(fd.get('account_name') || '').trim() || identity.name;
        const pickupAlias = String(fd.get('pickup_alias') || '').trim();
        const roleVal = String(fd.get('role') || 'comensal');
        const role = (['comensal', 'comercio', 'ambos'].includes(roleVal) ? roleVal : 'comensal') as 'comensal' | 'comercio' | 'ambos';
        const zoneNote = String(fd.get('zone_note') || '').trim();
        const notifyFavorites = fd.has('notify_favorites');

        state.prefs.role = role;
        state.prefs.zoneNote = zoneNote;
        state.prefs.pickupAlias = pickupAlias;
        state.prefs.notifyFavorites = notifyFavorites;
        savePrefs(state.prefs);

        try {
            const res = await fetch('/api/places/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_email: identity.email,
                    name: accountName,
                    pickup_alias: pickupAlias,
                    role: role,
                    zone_note: zoneNote,
                    dietary_tags: state.prefs.dietTags,
                    notify_favorites: notifyFavorites
                })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                toast(data?.message || 'Error al guardar preferencias en el servidor.');
                return;
            }

            const stored = getStoredUser();
            if (stored && accountName) {
                setStoredUser({ ...stored, name: accountName });
            }

            isProfileFormDirty = false;
            toast('Preferencias de perfil guardadas en FOODLINK.');
            renderAll();
        } catch (err) {
            toast((err as Error).message || 'Error de conexion al guardar preferencias.');
        }
        return;
    }

    if (form.id === 'pf-review-form') {
        const orderId = Number(form.dataset.orderId);
        const businessId = Number(form.dataset.businessId);
        const textarea = form.elements.namedItem('comment') as HTMLTextAreaElement | null;
        const comment = textarea?.value.trim() || '';

        try {
            const res = await submitReview({
                email: identity.email,
                userName: identity.name,
                businessId,
                orderId,
                stars: activeReviewStars,
                comment
            });
            toast(res.message || 'Gracias por calificar tu rescate.');
            const modal = document.getElementById('pf-review-modal');
            if (modal) modal.classList.remove('is-open');
            const targetOrder = state.orders.find((o) => o.id === orderId);
            if (targetOrder) targetOrder.has_review = true;
            renderAll();
        } catch (err) {
            toast((err as Error).message || 'No se pudo guardar la calificacion.');
        }
        return;
    }

    if (form.id === 'pf-redeem-form') {
        const input = form.elements.namedItem('pickup_code') as HTMLInputElement | null;
        const code = input?.value.trim().toUpperCase() || '';
        if (!code) {
            toast('Ingresa el codigo de recogida del cliente.');
            return;
        }
        const bizId = state.businessPanel?.business?.id || state.selectedBusinessId;
        if (!bizId) {
            toast('No hay un establecimiento seleccionado para canjear.');
            return;
        }
        await handleRedeemCode(code, bizId);
        if (input) input.value = '';
        return;
    }

    if (form.id === 'pf-register-biz-form') {
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim();
        const address = String(fd.get('address') || '').trim();
        const type = (String(fd.get('type') || 'fonda') as PlaceType);
        const description = String(fd.get('description') || '').trim();
        const phone = String(fd.get('phone') || '').trim();
        const openingHours = String(fd.get('opening_hours') || 'Lun-Sab 9:00-21:00').trim();

        if (!name || !address) {
            toast('Por favor completa el nombre y la direccion del establecimiento.');
            return;
        }

        const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registrando establecimiento...';
        }

        let lat = state.center.lat;
        let lng = state.center.lng;

        if (capturedBizLocation) {
            lat = capturedBizLocation.lat;
            lng = capturedBizLocation.lng;
        } else {
            try {
                const geoResults = await geocode(address, state.center);
                if (geoResults && geoResults.length > 0) {
                    lat = geoResults[0].lat;
                    lng = geoResults[0].lng;
                } else {
                    toast('No se encontraron coordenadas exactas para la direccion; se utilizo la zona actual como referencia.');
                }
            } catch {
                toast('Servicio de mapas no disponible en este momento; se utilizo la zona actual.');
            }
        }

        try {
            const res = await registerBusiness({
                email: identity.email,
                name,
                type,
                description,
                address,
                phone,
                opening_hours: openingHours,
                lat,
                lng
            });
            state.showNewBusinessForm = false;
            capturedBizLocation = null;
            state.selectedBusinessId = res.business.id;
            toast(res.message || 'Establecimiento registrado exitosamente en Foodlink.');
            await loadAllProfileData();
        } catch (err) {
            toast((err as Error).message || 'Error al registrar el establecimiento.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar y publicar en el mapa';
            }
        }
        return;
    }

    if (form.id === 'pf-publish-offer-form') {
        const businessId = Number(form.dataset.businessId);
        const fd = new FormData(form);
        const originalPrice = Number(fd.get('original_price') || 0);
        const price = Number(fd.get('price') || 0);

        if (price > originalPrice) {
            toast('El precio de rescate no puede ser mayor que el precio normal.');
            return;
        }

        const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Publicando oferta...';
        }

        try {
            const res = await publishBusinessOffer({
                email: identity.email,
                businessId,
                title: String(fd.get('title') || ''),
                description: String(fd.get('description') || '').trim() || undefined,
                kind: fd.get('kind') === 'paquete_sorpresa' ? 'paquete_sorpresa' : 'producto',
                original_price: originalPrice,
                price: price,
                quantity_total: Number(fd.get('quantity_total') || 3),
                pickup_hours: Number(fd.get('pickup_hours') || 3),
                est_weight_kg: Number(fd.get('est_weight_kg') || 0.65),
                tags: String(fd.get('tags') || ''),
                allergens: String(fd.get('allergens') || '')
            });
            toast(res.message || 'Oferta publicada en el mapa.');
            form.reset();
            updateOfferDiscountBadge();
            await loadAllProfileData();
        } catch (err) {
            toast((err as Error).message || 'No se pudo publicar la oferta.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publicar oferta en el mapa';
            }
        }
        return;
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

async function handleRedeemCode(code: string, businessId?: number | null): Promise<void> {
    const targetBizId = businessId || state.businessPanel?.business?.id || state.selectedBusinessId;
    if (!targetBizId) {
        toast('Selecciona un establecimiento antes de validar el codigo.');
        return;
    }
    try {
        const res = await redeemOrderCode(code, targetBizId);
        toast(res.message || 'Entrega validada y canjeada exitosamente.');
        await loadAllProfileData();
    } catch (err) {
        toast((err as Error).message || 'Error al validar el codigo de recogida.');
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
    if (tpl.description) setVal('description', tpl.description);
    setVal('kind', tpl.kind);
    setVal('original_price', tpl.original_price);
    setVal('price', tpl.price);
    setVal('quantity_total', tpl.quantity_total);
    setVal('pickup_hours', tpl.pickup_hours);
    setVal('est_weight_kg', tpl.est_weight_kg);
    setVal('tags', tpl.tags);
    setVal('allergens', tpl.allergens);

    const chipBtns = form.querySelectorAll<HTMLButtonElement>('.pf-pickup-chip');
    chipBtns.forEach((btn) => {
        const match = Number(btn.dataset.hours) === tpl.pickup_hours;
        btn.classList.toggle('is-active', match);
        btn.style.background = match ? 'rgba(244, 162, 97, 0.2)' : '';
        btn.style.borderColor = match ? 'var(--pf-saffron)' : '';
        btn.style.color = match ? 'var(--pf-saffron)' : '';
    });

    updateOfferDiscountBadge();
    toast(`Plantilla cargada: ${tpl.label}`);
}

function toast(message: string, ms = 3200): void {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), ms);
}

init();
