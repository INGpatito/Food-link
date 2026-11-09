/**
 * FOODLINK - Explorar (Fase 1 + Fase 2 completa):
 *  - Mapa interactivo con geolocalizacion (interruptor GPS On/Off + pin manual arrastrable).
 *  - Filtros por tipo de oferta (Todo, Gratis, Descuento, Paquete Sorpresa) y por categoria de local.
 *  - Favoritos y alertas en tiempo real cuando tus locales seguidos tienen comida disponible.
 *  - Apartado / Reserva con Codigo QR SVG escaneable (pago directo en el local).
 *  - Resenas verificadas y calificaciones por estrellas.
 *  - Tablero "Mi Impacto" (kg rescatados, CO2 evitado, agua preservada, ahorro en MXN e insignias).
 *  - Panel "Mi Negocio" (estadisticas del local, alta de negocio en el mapa, publicacion rapida de ofertas con plantillas y canje de codigos QR).
 *  - Rutas y navegacion paso a paso en vivo dentro de la pagina.
 * Zero emojis strictly enforced.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getStoredUser, onAuthChange } from '../utils/auth.ts';
import {
    fetchNearby, fetchPlace, geocode, placeStatus, discountPercent,
    createOrder, fetchOrdersAndImpact, cancelOrder, toggleFavorite,
    submitReview, fetchBusinessPanel, registerBusiness, publishBusinessOffer,
    closeBusinessOffer, redeemOrderCode,
    PLACE_TYPE_LABEL,
    type Place, type PlaceType, type Offer, type OfferFilter, type PlaceCategoryFilter,
    type GeocodeResult, type FavoriteAlert, type Order, type ImpactSummary,
    type BusinessPanelResponse
} from './api.ts';
import { fetchRoute, TRAVEL_MODE_LABEL, type Route, type TravelMode } from './routing.ts';
import { NavigationSession, geolocationErrorMessage, type NavProgress } from './navigation.ts';
import {
    distanceMeters, formatDistance, formatDuration, formatClock, formatPrice,
    estimateWalkSeconds, escapeHtml, type LatLng
} from './geo.ts';
import { icons, maneuverIcon } from './icons.ts';
import { renderQrSvg } from './qr.ts';

/* ------------------------------------------------------------------ */
/* Configuracion de mapas y estilos                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_CENTER: LatLng = { lat: 19.4326, lng: -99.1332 }; // Ciudad de Mexico
const LAST_CENTER_KEY = 'foodlink_last_center';
const MAP_STYLE_KEY = 'foodlink_map_style';
const GUEST_PROFILE_KEY = 'foodlink_guest_profile';
const RADIUS_OPTIONS = [1000, 3000, 5000, 10000];
const MOBILE_QUERY = window.matchMedia('(max-width: 860px)');

// La clave se lee solo desde .env (VITE_CARTO_API_KEY); nunca se escribe en el codigo.
// Si no esta configurada, se usan los basemaps publicos de CARTO sin parametro `key`.
const CARTO_KEY = String(import.meta.env.VITE_CARTO_API_KEY || '').trim();
const CARTO_KEY_QUERY = CARTO_KEY ? `?key=${encodeURIComponent(CARTO_KEY)}` : '';
const RETINA = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? '@2x' : '';

type MapStyleId = 'dark' | 'light' | 'night';

interface MapStyleConfig {
    id: MapStyleId;
    label: string;
    url: string;
    className: string;
}

const MAP_STYLES: Record<MapStyleId, MapStyleConfig> = {
    dark: {
        id: 'dark',
        label: 'Oscuro',
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${RETINA}.png${CARTO_KEY_QUERY}`,
        className: 'fx-tiles-voyager-dark'
    },
    light: {
        id: 'light',
        label: 'Claro',
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${RETINA}.png${CARTO_KEY_QUERY}`,
        className: 'fx-tiles-voyager-light'
    },
    night: {
        id: 'night',
        label: 'Nocturno',
        url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${RETINA}.png${CARTO_KEY_QUERY}`,
        className: 'fx-tiles-night-boost'
    }
};

const MAP_STYLE_ORDER: MapStyleId[] = ['dark', 'light', 'night'];

const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> | Rutas: <a href="https://routing.openstreetmap.de" target="_blank" rel="noopener">FOSSGIS</a>';

type View = 'list' | 'detail' | 'route' | 'favorites' | 'orders' | 'impact' | 'business';
type SheetState = 'peek' | 'half' | 'full';
type CenterSource = 'default' | 'stored' | 'gps' | 'search' | 'area' | 'manual';

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
        label: 'Comida corrida del día',
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
        label: 'Lote de pan recién horneado',
        title: 'Bolsa de 6 piezas de pan del día',
        kind: 'paquete_sorpresa',
        original_price: 110,
        price: 38,
        quantity_total: 4,
        pickup_hours: 4,
        est_weight_kg: 0.6,
        tags: 'panadería, vegetariano',
        allergens: 'gluten, huevo, lácteos'
    },
    {
        id: 'free_donation',
        label: 'Donación solidaria gratis',
        title: 'Porción solidaria del día sin costo',
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

interface AppState {
    view: View;
    mapStyle: MapStyleId;
    center: LatLng;
    centerSource: CenterSource;
    centerLabel: string;
    userPos: LatLng | null;
    userAccuracy: number;
    userHeading: number | null;
    locationError: string | null;
    locating: boolean;
    radius: number;
    filter: OfferFilter;
    category: PlaceCategoryFilter;
    places: Place[];
    favoriteIds: Set<number>;
    favoriteAlerts: FavoriteAlert[];
    loading: boolean;
    error: string | null;
    selectedId: number | null;
    offerQtyByOfferId: Record<number, number>;
    reservingOfferId: number | null;
    highlightedOrderId: number | null;
    orders: Order[];
    impact: ImpactSummary | null;
    ordersLoading: boolean;
    reviewStars: number;
    reviewOrderId: number | null;
    businessPanel: BusinessPanelResponse | null;
    businessLoading: boolean;
    selectedBusinessId: number | null;
    showNewBusinessForm: boolean;
    mode: TravelMode;
    route: Route | null;
    routeOrigin: 'gps' | 'point' | null;
    routeLoading: boolean;
    routeError: string | null;
    navigating: boolean;
    followUser: boolean;
    navProgress: NavProgress | null;
    arrived: boolean;
    serverOffsetMs: number;
}

/* ------------------------------------------------------------------ */
/* Identidad de usuario (logueado o perfil local persistente)          */
/* ------------------------------------------------------------------ */

function getActiveUserIdentity(): { email: string; name: string; isLogged: boolean } {
    const stored = getStoredUser();
    if (stored && stored.email) {
        return { email: stored.email.trim().toLowerCase(), name: stored.name || 'Comensal', isLogged: true };
    }
    try {
        const raw = localStorage.getItem(GUEST_PROFILE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.email && parsed?.name) {
                return { email: parsed.email, name: parsed.name, isLogged: false };
            }
        }
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const guest = { email: `comensal_${suffix}@foodlink.local`, name: 'Comensal Foodlink' };
        localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(guest));
        return { ...guest, isLogged: false };
    } catch {
        return { email: 'invitado@foodlink.local', name: 'Comensal Foodlink', isLogged: false };
    }
}

/* ------------------------------------------------------------------ */
/* Estado y referencias                                                */
/* ------------------------------------------------------------------ */

const storedCenter = readStoredCenter();
const storedStyle = readStoredStyle();

const state: AppState = {
    view: 'list',
    mapStyle: storedStyle,
    center: storedCenter ?? DEFAULT_CENTER,
    centerSource: storedCenter ? 'stored' : 'default',
    centerLabel: storedCenter ? 'tu última zona' : 'Ciudad de México',
    userPos: null,
    userAccuracy: 0,
    userHeading: null,
    locationError: null,
    locating: false,
    radius: 3000,
    filter: 'all',
    category: 'all',
    places: [],
    favoriteIds: new Set<number>(),
    favoriteAlerts: [],
    loading: true,
    error: null,
    selectedId: null,
    offerQtyByOfferId: {},
    reservingOfferId: null,
    highlightedOrderId: null,
    orders: [],
    impact: null,
    ordersLoading: false,
    reviewStars: 5,
    reviewOrderId: null,
    businessPanel: null,
    businessLoading: false,
    selectedBusinessId: null,
    showNewBusinessForm: false,
    mode: 'foot',
    route: null,
    routeOrigin: null,
    routeLoading: false,
    routeError: null,
    navigating: false,
    followUser: true,
    navProgress: null,
    arrived: false,
    serverOffsetMs: 0
};

const $ = <T extends HTMLElement>(id: string): T => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Falta el elemento #${id}`);
    return el as T;
};

const appEl = $('fx-app');
const panelEl = $('fx-panel');
const panelBody = $('fx-panel-body');
const sheetHandle = $<HTMLButtonElement>('fx-sheet-handle');
const sheetSummary = $('fx-sheet-summary');
const topbarEl = appEl.querySelector<HTMLElement>('.fx-topbar')!;
const areaBtn = $<HTMLButtonElement>('fx-area-btn');
const recenterBtn = $<HTMLButtonElement>('fx-recenter-btn');
const styleBtn = $<HTMLButtonElement>('fx-style-btn');
const styleLabel = $('fx-style-label');
const zoomInBtn = $<HTMLButtonElement>('fx-zoom-in');
const zoomOutBtn = $<HTMLButtonElement>('fx-zoom-out');
const mobileToggleBtn = $<HTMLButtonElement>('fx-mobile-toggle');
const mobileToggleIcon = $('fx-mobile-toggle-icon');
const mobileToggleText = $('fx-mobile-toggle-text');
const locateBtn = $<HTMLButtonElement>('fx-locate-btn');
const searchForm = $<HTMLFormElement>('fx-search-form');
const searchInput = $<HTMLInputElement>('fx-search-input');
const searchResults = $<HTMLUListElement>('fx-search-results');
const navBanner = $('fx-nav-banner');
const toastEl = $('fx-toast');
const userBadgeEl = document.getElementById('fx-user-badge');

let map: L.Map;
let baseTileLayer: L.TileLayer | null = null;
let placesLayer: L.LayerGroup;
let routeLayer: L.LayerGroup;
let radiusCircle: L.Circle | null = null;
let routeCasing: L.Polyline | null = null;
let routeLine: L.Polyline | null = null;
let userMarker: L.Marker | null = null;
let accuracyCircle: L.Circle | null = null;
const markers = new Map<number, L.Marker>();

let placesAbort: AbortController | null = null;
let routeAbort: AbortController | null = null;
let navSession: NavigationSession | null = null;
let passiveWatchId: number | null = null;
let gpsRequestPending = false;
let toastTimer: number | undefined;
let programmaticMove = false;

/* ------------------------------------------------------------------ */
/* Inicio                                                              */
/* ------------------------------------------------------------------ */

function init(): void {
    if (!getStoredUser()) {
        window.location.replace('/?login=1');
        return;
    }
    onAuthChange((user) => {
        if (!user) window.location.replace('/?login=1');
    });

    hydrateStaticIcons(document.body);
    renderUser();

    map = L.map('fx-map', {
        center: [state.center.lat, state.center.lng],
        zoom: 15,
        minZoom: 4,
        maxZoom: 20,
        zoomControl: false,
        attributionControl: true,
        worldCopyJump: true,
        zoomSnap: 0.5,
        zoomDelta: 1,
        wheelPxPerZoomLevel: 90
    });

    applyMapStyle(state.mapStyle);

    map.attributionControl.setPrefix(false);
    placesLayer = L.layerGroup().addTo(map);
    routeLayer = L.layerGroup().addTo(map);

    syncRadiusCircle();
    syncLocationMarker();

    map.on('moveend', onMapMoveEnd);
    map.on('dragstart', () => {
        if (state.navigating) state.followUser = false;
    });

    bindUi();
    setSheet(MOBILE_QUERY.matches ? 'half' : 'full');

    const initialTab = new URLSearchParams(location.search).get('tab');
    if (initialTab && ['favoritos', 'pedidos', 'impacto', 'negocio', 'cuenta'].includes(initialTab)) {
        location.replace(`/perfil/?tab=${encodeURIComponent(initialTab)}`);
        return;
    }

    renderTabs();
    renderPanel();
    activateGps(true);
    void refreshUserOrdersQuietly();

    window.setTimeout(() => map.invalidateSize(), 120);
    window.addEventListener('resize', () => map.invalidateSize(), { passive: true });
    window.setInterval(updateCountdowns, 30000);

    // Sincronizacion automatica con el servidor y con la app Android
    window.addEventListener('focus', () => {
        void refreshPlacesQuietly();
        void refreshUserOrdersQuietly();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            void refreshPlacesQuietly();
            void refreshUserOrdersQuietly();
        }
    });
    window.setInterval(() => {
        if (document.visibilityState === 'visible' && !state.loading && !state.navigating) {
            void refreshPlacesQuietly();
            void refreshUserOrdersQuietly();
        }
    }, 15000);
}

function applyMapStyle(styleId: MapStyleId): void {
    state.mapStyle = styleId;
    appEl.dataset.mapStyle = styleId;
    const cfg = MAP_STYLES[styleId] ?? MAP_STYLES.dark;
    styleLabel.textContent = cfg.label;

    try {
        localStorage.setItem(MAP_STYLE_KEY, styleId);
    } catch {
        // ignorar
    }

    if (baseTileLayer) {
        map.removeLayer(baseTileLayer);
    }

    baseTileLayer = L.tileLayer(cfg.url, {
        subdomains: 'abcd',
        minZoom: 3,
        maxNativeZoom: 18,
        maxZoom: 20,
        keepBuffer: 6,
        updateWhenIdle: false,
        updateWhenZooming: false,
        crossOrigin: true,
        attribution: TILE_ATTRIBUTION,
        className: cfg.className
    });

    baseTileLayer.on('tileerror', (evt: L.TileErrorEvent) => {
        const img = evt.tile as HTMLImageElement | undefined;
        if (!img || img.dataset.retried === '1') return;
        img.dataset.retried = '1';
        window.setTimeout(() => {
            const sep = img.src.includes('?') ? '&' : '?';
            img.src = `${img.src}${sep}retry=${Date.now()}`;
        }, 600);
    });

    baseTileLayer.addTo(map);
    baseTileLayer.bringToBack();
}

function cycleMapStyle(): void {
    const idx = MAP_STYLE_ORDER.indexOf(state.mapStyle);
    const next = MAP_STYLE_ORDER[(idx + 1) % MAP_STYLE_ORDER.length];
    applyMapStyle(next);
    toast(`Vista del mapa: ${MAP_STYLES[next].label}`, 2000);
}

function bindUi(): void {
    locateBtn.addEventListener('click', toggleGps);

    recenterBtn.addEventListener('click', () => {
        if (state.userPos) {
            state.followUser = true;
            if (MOBILE_QUERY.matches && state.view === 'list') setSheet('peek');
            focusOn(state.userPos, Math.max(map.getZoom(), 16));
            toast('Centrado en tu ubicación GPS', 2200);
        } else {
            activateGps(false);
        }
    });

    styleBtn.addEventListener('click', cycleMapStyle);
    zoomInBtn.addEventListener('click', () => map.zoomIn(1));
    zoomOutBtn.addEventListener('click', () => map.zoomOut(1));

    mobileToggleBtn.addEventListener('click', () => {
        const current = (panelEl.dataset.sheet as SheetState) || 'half';
        setSheet(current === 'peek' ? 'half' : 'peek');
    });

    areaBtn.addEventListener('click', () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng }, 'area', 'esta zona del mapa');
        void loadPlaces();
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        void runSearch();
    });
    searchInput.addEventListener('input', () => {
        if (!searchInput.value.trim()) hideSearchResults();
    });
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target as Node)) hideSearchResults();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!searchResults.hidden) return hideSearchResults();
        if (state.navigating) return;
        if (state.view === 'route') return showDetail();
        if (state.view === 'detail') return showList();
    });

    panelBody.addEventListener('click', onPanelClick);
    panelBody.addEventListener('change', onPanelChange);
    panelBody.addEventListener('submit', onPanelSubmit);
    panelBody.addEventListener('mouseover', (e) => highlightMarker(e, true));
    panelBody.addEventListener('mouseout', (e) => highlightMarker(e, false));
    navBanner.addEventListener('click', onBannerClick);

    bindSheetGestures();
    MOBILE_QUERY.addEventListener('change', () => {
        setSheet(MOBILE_QUERY.matches ? 'half' : 'full');
        window.setTimeout(() => map.invalidateSize(), 60);
    });
}

/* ------------------------------------------------------------------ */
/* Sincronizacion con la seccion dedicada /perfil/                     */
/* ------------------------------------------------------------------ */

function renderTabs(): void {
    const activeOrdersCount = state.orders.filter((o) => o.status === 'reserved').length;
    if (userBadgeEl) {
        if (activeOrdersCount > 0) {
            userBadgeEl.hidden = false;
            userBadgeEl.textContent = String(activeOrdersCount);
        } else {
            userBadgeEl.hidden = true;
        }
    }
}

function switchTab(tab: 'list' | 'favorites' | 'orders' | 'impact' | 'business'): void {
    if (tab === 'favorites') {
        location.href = '/perfil/?tab=favoritos';
        return;
    }
    if (tab === 'orders') {
        location.href = '/perfil/?tab=pedidos';
        return;
    }
    if (tab === 'impact') {
        location.href = '/perfil/?tab=impacto';
        return;
    }
    if (tab === 'business') {
        location.href = '/perfil/?tab=negocio';
        return;
    }
    if (state.navigating) stopNavigation();
    clearRoute();
    state.view = 'list';
    state.selectedId = null;
    refreshMarkerSelection();
    renderTabs();
    renderPanel();
}

/* ------------------------------------------------------------------ */
/* Ubicación GPS y marcador "TÚ"                                      */
/* ------------------------------------------------------------------ */

function activateGps(initial: boolean): void {
    if (!('geolocation' in navigator)) {
        state.locationError = 'Tu dispositivo o navegador no cuenta con servicio de GPS. Puedes mover el pin azul "TU PUNTO" en el mapa o buscar tu colonia arriba.';
        syncLocationMarker();
        if (initial) void loadPlaces();
        renderPanel();
        return;
    }

    state.locating = true;
    gpsRequestPending = true;
    locateBtn.classList.add('is-busy');
    locateBtn.setAttribute('title', 'Buscando señal GPS... Toca para cancelar');
    locateBtn.setAttribute('aria-label', 'Buscando señal GPS... Toca para cancelar');
    recenterBtn.classList.add('is-busy');
    if (!initial) toast('Buscando señal GPS...', 2400);
    renderPanel();

    const applyPosition = (pos: GeolocationPosition) => {
        if (!gpsRequestPending) return;
        gpsRequestPending = false;
        state.locating = false;
        state.locationError = null;

        locateBtn.classList.remove('is-busy');
        recenterBtn.classList.remove('is-busy');
        locateBtn.classList.add('has-gps');
        recenterBtn.classList.add('has-gps');
        locateBtn.setAttribute('title', 'GPS activo. Toca para desactivar');
        locateBtn.setAttribute('aria-label', 'Desactivar GPS');

        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.userPos = p;
        state.userAccuracy = pos.coords.accuracy;
        state.userHeading = pos.coords.heading !== null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : null;

        setCenter(p, 'gps', 'tu ubicación actual');
        syncLocationMarker();
        syncRadiusCircle();
        startPassiveLocationWatch();

        if (state.view === 'list') {
            focusOn(p, 15.5);
        } else if (state.view === 'route') {
            void showRoute();
        }

        if (!initial) toast('GPS activado y ubicación actualizada', 2400);
        void loadPlaces();
    };

    const handleFailure = (err: GeolocationPositionError, triedFallback: boolean) => {
        if (!gpsRequestPending) return;

        if (!triedFallback && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
            navigator.geolocation.getCurrentPosition(
                applyPosition,
                (fallbackErr) => handleFailure(fallbackErr, true),
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
            return;
        }

        gpsRequestPending = false;
        state.locating = false;
        locateBtn.classList.remove('is-busy', 'has-gps');
        recenterBtn.classList.remove('is-busy', 'has-gps');
        locateBtn.setAttribute('title', 'Activar GPS');
        locateBtn.setAttribute('aria-label', 'Activar GPS');

        state.locationError = geolocationErrorMessage(err) + ' También puedes mover el pin azul "TU PUNTO" en el mapa.';
        syncLocationMarker();

        if (!initial) toast('No se pudo obtener el GPS. Puedes arrastrar el pin azul "TU PUNTO" en el mapa.', 4500);
        if (initial) void loadPlaces();
        else renderPanel();
    };

    navigator.geolocation.getCurrentPosition(
        applyPosition,
        (err) => handleFailure(err, false),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 }
    );
}

function deactivateGps(notify = true): void {
    gpsRequestPending = false;
    stopPassiveLocationWatch();

    if (state.navigating) {
        stopNavigation();
    }

    state.userPos = null;
    state.userAccuracy = 0;
    state.userHeading = null;
    state.locating = false;
    state.locationError = null;

    locateBtn.classList.remove('has-gps', 'is-busy');
    recenterBtn.classList.remove('has-gps', 'is-busy');
    locateBtn.setAttribute('title', 'Activar GPS');
    locateBtn.setAttribute('aria-label', 'Activar GPS');

    syncLocationMarker();
    syncRadiusCircle();

    if (state.view === 'route') {
        void showRoute();
    } else {
        renderPanel();
    }

    if (notify) {
        toast('GPS desactivado. Puedes mover el pin azul "TU PUNTO" libremente en el mapa.', 3000);
    }
}

function toggleGps(): void {
    if (state.userPos || state.locating || gpsRequestPending) {
        deactivateGps(true);
    } else {
        activateGps(false);
    }
}

function stopPassiveLocationWatch(): void {
    if (passiveWatchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(passiveWatchId);
        passiveWatchId = null;
    }
}

function startPassiveLocationWatch(): void {
    if (passiveWatchId !== null || !('geolocation' in navigator)) return;
    passiveWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            if (!state.userPos) return;
            if (state.navigating) return;
            state.userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            state.userAccuracy = pos.coords.accuracy;
            if (pos.coords.heading !== null && !Number.isNaN(pos.coords.heading)) {
                state.userHeading = pos.coords.heading;
            }
            syncLocationMarker();
        },
        () => {
            // ignorar
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
}

function syncLocationMarker(): void {
    const hasGps = Boolean(state.userPos);
    const pos = state.userPos ?? state.center;
    const latlng = L.latLng(pos.lat, pos.lng);
    const badgeText = hasGps ? 'TÚ' : 'TU PUNTO';
    const isDraggable = !hasGps && !state.navigating;

    const html = `
        <div class="fx-user-marker${hasGps ? ' is-gps' : ' is-manual'}${state.userHeading !== null ? ' has-heading' : ''}"
             style="--heading:${state.userHeading ?? 0}deg">
            <span class="fx-user-halo"></span>
            <span class="fx-user-heading"></span>
            <span class="fx-user-dot"></span>
            <span class="fx-user-label">${badgeText}</span>
        </div>`;

    if (!userMarker) {
        userMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'fx-user-marker-wrap',
                html,
                iconSize: [0, 0]
            }),
            draggable: isDraggable,
            keyboard: false,
            zIndexOffset: 1500,
            title: hasGps ? 'Tu ubicación actual (GPS)' : 'Tu punto de referencia (arrástralo para ajustar)'
        }).addTo(map);

        userMarker.on('click', () => {
            if (state.userPos) {
                toast(`Tu ubicación GPS (precisión aprox. ±${Math.max(5, Math.round(state.userAccuracy))} m)`, 3000);
            } else {
                toast('Arrastra este pin azul para indicar dónde estás o toca el icono de GPS arriba.', 4000);
            }
        });

        userMarker.on('dragend', () => {
            if (!userMarker) return;
            const ll = userMarker.getLatLng();
            const newPoint = { lat: Number(ll.lat.toFixed(6)), lng: Number(ll.lng.toFixed(6)) };
            setCenter(newPoint, 'manual', 'tu punto seleccionado');
            toast('Ubicación ajustada manualmente', 2600);
            if (state.view === 'route') void showRoute();
            else void loadPlaces();
        });
    } else {
        userMarker.setLatLng(latlng);
        userMarker.setIcon(L.divIcon({
            className: 'fx-user-marker-wrap',
            html,
            iconSize: [0, 0]
        }));
        if (userMarker.dragging) {
            if (isDraggable) userMarker.dragging.enable();
            else userMarker.dragging.disable();
        }
    }

    if (hasGps && state.userAccuracy > 0) {
        if (!accuracyCircle) {
            accuracyCircle = L.circle(latlng, {
                radius: Math.min(state.userAccuracy, 400),
                className: 'fx-accuracy',
                interactive: false,
                weight: 1
            }).addTo(map);
        } else {
            accuracyCircle.setLatLng(latlng).setRadius(Math.min(state.userAccuracy, 400));
        }
    } else if (accuracyCircle) {
        accuracyCircle.remove();
        accuracyCircle = null;
    }
}

function syncRadiusCircle(): void {
    const center = L.latLng(state.center.lat, state.center.lng);
    if (!radiusCircle) {
        radiusCircle = L.circle(center, {
            radius: state.radius,
            className: 'fx-radius-circle',
            interactive: false,
            weight: 1.5
        }).addTo(map);
    } else {
        radiusCircle.setLatLng(center).setRadius(state.radius);
    }
}

function setCenter(p: LatLng, source: CenterSource, label: string): void {
    state.center = p;
    state.centerSource = source;
    state.centerLabel = label;
    areaBtn.hidden = true;
    syncLocationMarker();
    syncRadiusCircle();
    try {
        localStorage.setItem(LAST_CENTER_KEY, JSON.stringify(p));
    } catch {
        // ignorar
    }
}

function readStoredCenter(): LatLng | null {
    try {
        const raw = localStorage.getItem(LAST_CENTER_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) return { lat: p.lat, lng: p.lng };
    } catch {
        // ignorar
    }
    return null;
}

function readStoredStyle(): MapStyleId {
    try {
        const raw = localStorage.getItem(MAP_STYLE_KEY) as MapStyleId | null;
        if (raw && raw in MAP_STYLES) return raw;
    } catch {
        // ignorar
    }
    return 'dark';
}

/* ------------------------------------------------------------------ */
/* Carga de datos (Lugares, Pedidos, Impacto, Panel de Negocio)        */
/* ------------------------------------------------------------------ */

async function loadPlaces(): Promise<void> {
    placesAbort?.abort();
    placesAbort = new AbortController();
    state.loading = true;
    state.error = null;
    if (state.view === 'list' || state.view === 'favorites') renderPanel();

    try {
        const identity = getActiveUserIdentity();
        const data = await fetchNearby(
            state.center,
            state.radius,
            state.filter,
            { category: state.category, email: identity.email },
            placesAbort.signal
        );
        state.places = data.places;
        if (data.favorite_ids) {
            state.favoriteIds = new Set(data.favorite_ids);
        }
        state.favoriteAlerts = data.active_favorite_alerts ?? [];
        state.serverOffsetMs = Date.parse(data.server_time) - Date.now();
        state.loading = false;
        renderMarkers();
        renderTabs();
        renderPanel();
        updateSheetSummary();
        await openPlaceFromUrl();
    } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        state.loading = false;
        state.error = (error as Error).message || 'No se pudieron cargar los lugares.';
        renderPanel();
        updateSheetSummary();
    }
}

async function refreshPlacesQuietly(): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        const data = await fetchNearby(
            state.center,
            state.radius,
            state.filter,
            { category: state.category, email: identity.email }
        );
        state.places = data.places;
        if (data.favorite_ids) {
            state.favoriteIds = new Set(data.favorite_ids);
        }
        state.favoriteAlerts = data.active_favorite_alerts ?? [];
        state.serverOffsetMs = Date.parse(data.server_time) - Date.now();
        renderMarkers();
        renderTabs();
        if (state.view === 'list' || state.view === 'favorites') {
            renderPanel();
            updateSheetSummary();
        } else if (state.view === 'detail' && state.selectedId !== null) {
            const detail = await fetchPlace(state.selectedId, state.userPos ?? state.center, identity.email);
            const idx = state.places.findIndex((p) => p.id === state.selectedId);
            if (idx >= 0) state.places[idx] = detail.place;
            renderPanel();
        }
    } catch {
        // silencioso
    }
}

async function refreshUserOrdersQuietly(): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        const res = await fetchOrdersAndImpact(identity.email);
        state.orders = res.orders;
        state.impact = res.impact;
        renderTabs();
    } catch {
        // silencioso
    }
}

async function loadOrdersAndImpact(): Promise<void> {
    state.ordersLoading = true;
    renderPanel();
    try {
        const identity = getActiveUserIdentity();
        const res = await fetchOrdersAndImpact(identity.email);
        state.orders = res.orders;
        state.impact = res.impact;
        state.ordersLoading = false;
        renderTabs();
        renderPanel();
    } catch (err) {
        state.ordersLoading = false;
        toast((err as Error).message || 'Error al cargar tus pedidos.');
        renderPanel();
    }
}

async function loadBusinessPanelData(businessId?: number | null): Promise<void> {
    state.businessLoading = true;
    renderPanel();
    try {
        const identity = getActiveUserIdentity();
        const targetId = businessId !== undefined ? businessId : state.selectedBusinessId;
        const data = await fetchBusinessPanel(identity.email, targetId, state.center);
        state.businessPanel = data;
        state.selectedBusinessId = data.business?.id ?? null;
        state.businessLoading = false;
        renderPanel();
    } catch (err) {
        state.businessLoading = false;
        toast((err as Error).message || 'Error al cargar el panel del negocio.');
        renderPanel();
    }
}

let urlPlaceHandled = false;
async function openPlaceFromUrl(): Promise<void> {
    if (urlPlaceHandled) return;
    urlPlaceHandled = true;
    const params = new URLSearchParams(location.search);
    const id = Number(params.get('lugar'));
    const wantsRoute = params.get('ruta') === '1';
    if (!Number.isInteger(id) || id <= 0) return;

    if (!state.places.some((p) => p.id === id)) {
        try {
            const identity = getActiveUserIdentity();
            const data = await fetchPlace(id, state.userPos ?? state.center, identity.email);
            state.places.push(data.place);
            renderMarkers();
        } catch {
            toast('Ese lugar ya no está disponible.');
            return;
        }
    }
    await selectPlace(id);
    if (wantsRoute) {
        await showRoute();
    }
}

function getPlace(id: number | null): Place | null {
    if (id === null) return null;
    return state.places.find((p) => p.id === id) ?? null;
}

function displayDistance(place: Place): number {
    if (state.userPos) return distanceMeters(state.userPos, place);
    return distanceMeters(state.center, place);
}

function sortedPlaces(list: Place[] = state.places): Place[] {
    return [...list].sort((a, b) => displayDistance(a) - displayDistance(b));
}

/* ------------------------------------------------------------------ */
/* Marcadores de negocios                                              */
/* ------------------------------------------------------------------ */

function markerLabel(place: Place): string {
    const status = placeStatus(place);
    if (status === 'free') return `${icons.gift(13)}<span>Gratis</span>`;
    const best = Math.max(0, ...place.offers.map((o) => discountPercent(o) ?? 0));
    if (best > 0) return `<span>-${best}%</span>`;
    const cheapest = Math.min(...place.offers.map((o) => o.price));
    return `<span>${formatPrice(cheapest)}</span>`;
}

function placeIcon(place: Place): L.DivIcon {
    const status = placeStatus(place);
    const selected = place.id === state.selectedId;
    const isFav = state.favoriteIds.has(place.id) || Boolean(place.is_favorite);
    return L.divIcon({
        className: 'fx-marker-wrap',
        html: `<div class="fx-marker fx-marker--${status}${selected ? ' is-selected' : ''}${isFav ? ' is-fav' : ''}" data-marker-id="${place.id}">
                 <div class="fx-marker-bubble">${markerLabel(place)}</div>
                 <div class="fx-marker-tip"></div>
               </div>`,
        iconSize: [0, 0]
    });
}

function renderMarkers(): void {
    placesLayer.clearLayers();
    markers.clear();
    for (const place of state.places) {
        const marker = L.marker([place.lat, place.lng], {
            icon: placeIcon(place),
            title: place.name,
            alt: place.name,
            riseOnHover: true,
            zIndexOffset: place.id === state.selectedId ? 900 : 0
        });
        marker.on('click', () => void selectPlace(place.id));
        marker.addTo(placesLayer);
        markers.set(place.id, marker);
    }
}

function refreshMarkerSelection(): void {
    for (const place of state.places) {
        const marker = markers.get(place.id);
        if (!marker) continue;
        marker.setIcon(placeIcon(place));
        marker.setZIndexOffset(place.id === state.selectedId ? 900 : 0);
    }
}

function highlightMarker(e: Event, on: boolean): void {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-place-id]');
    if (!card) return;
    const id = Number(card.dataset.placeId);
    const el = markers.get(id)?.getElement()?.querySelector('.fx-marker');
    el?.classList.toggle('is-hover', on);
}

/* ------------------------------------------------------------------ */
/* Navegación entre vistas                                             */
/* ------------------------------------------------------------------ */

async function selectPlace(id: number): Promise<void> {
    let place = getPlace(id);
    if (state.navigating) stopNavigation();
    state.selectedId = id;
    state.view = 'detail';
    clearRoute();
    refreshMarkerSelection();
    renderTabs();
    renderPanel();
    panelBody.scrollTop = 0;
    if (MOBILE_QUERY.matches) setSheet('half');
    if (place) {
        focusOn(place, Math.min(17, Math.max(map.getZoom(), 16)));
    }
    updateUrl(id);

    // Carga reseñas frescas y detalle actualizado del servidor
    try {
        const identity = getActiveUserIdentity();
        const detail = await fetchPlace(id, state.userPos ?? state.center, identity.email);
        const idx = state.places.findIndex((p) => p.id === id);
        if (idx >= 0) state.places[idx] = detail.place;
        else state.places.push(detail.place);
        place = detail.place;
        if (state.view === 'detail' && state.selectedId === id) {
            renderPanel();
        }
    } catch {
        // usar copia local
    }
}

function showList(): void {
    if (state.navigating) stopNavigation();
    state.view = 'list';
    state.selectedId = null;
    clearRoute();
    refreshMarkerSelection();
    renderTabs();
    renderPanel();
    updateUrl(null);
}

function showDetail(): void {
    if (state.navigating) stopNavigation();
    state.view = 'detail';
    clearRoute();
    renderTabs();
    renderPanel();
    const place = getPlace(state.selectedId);
    if (place) focusOn(place, Math.min(17, Math.max(map.getZoom(), 16)));
}

function updateUrl(id: number | null): void {
    const url = new URL(location.href);
    if (id === null) url.searchParams.delete('lugar');
    else url.searchParams.set('lugar', String(id));
    history.replaceState(null, '', url);
}

/* ------------------------------------------------------------------ */
/* Acciones Fase 2: Favoritos, Reservas QR, Reseñas y Negocio          */
/* ------------------------------------------------------------------ */

async function handleToggleFavorite(businessId: number): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        const res = await toggleFavorite(businessId, identity.email);
        state.favoriteIds = new Set(res.favorite_ids);
        const place = getPlace(businessId);
        if (place) place.is_favorite = res.is_favorite;
        refreshMarkerSelection();
        renderTabs();
        renderPanel();
        toast(
            res.is_favorite
                ? 'Guardado en tus favoritos. Te avisaremos cuando tenga ofertas.'
                : 'Eliminado de tus favoritos.',
            2600
        );
    } catch (err) {
        toast((err as Error).message || 'No se pudo actualizar favoritos.');
    }
}

async function handleReserveOffer(offerId: number): Promise<void> {
    if (state.reservingOfferId !== null) return;
    const qty = state.offerQtyByOfferId[offerId] || 1;
    state.reservingOfferId = offerId;
    renderPanel();

    try {
        const identity = getActiveUserIdentity();
        const res = await createOrder({
            email: identity.email,
            userName: identity.name,
            offerId,
            quantity: qty
        });

        state.reservingOfferId = null;
        state.highlightedOrderId = res.order.id;
        state.orders.unshift(res.order);
        renderTabs();
        toast(`Reserva lista: código ${res.order.pickup_code}`, 3800);

        // Actualiza inventario local y muestra el ticket QR confirmado en el detalle
        void loadPlaces();
        if (state.selectedId) {
            await selectPlace(state.selectedId);
        } else {
            renderPanel();
        }
        panelBody.scrollTop = 0;
    } catch (err) {
        state.reservingOfferId = null;
        toast((err as Error).message || 'No se pudo apartar la oferta.', 4200);
        renderPanel();
    }
}

async function handleCancelOrderClick(orderId: number): Promise<void> {
    try {
        const identity = getActiveUserIdentity();
        const res = await cancelOrder(orderId, identity.email);
        toast(res.message || 'Reserva cancelada.', 3000);
        await loadOrdersAndImpact();
        void loadPlaces();
    } catch (err) {
        toast((err as Error).message || 'No se pudo cancelar.');
    }
}

async function handleRedeemCode(code: string): Promise<void> {
    try {
        const res = await redeemOrderCode(code, state.selectedBusinessId);
        toast(res.message || 'Código validado y entregado.', 4000);
        if (state.view === 'business') {
            await loadBusinessPanelData();
        }
        void refreshUserOrdersQuietly();
    } catch (err) {
        toast((err as Error).message || 'Código inválido.', 4000);
    }
}

function applyOfferTemplate(tplId: string): void {
    const tpl = QUICK_OFFER_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const form = panelBody.querySelector<HTMLFormElement>('#fx-publish-offer-form');
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
    toast(`Plantilla cargada: ${tpl.label}`, 2200);
}

/* ------------------------------------------------------------------ */
/* Rutas y navegación en vivo                                          */
/* ------------------------------------------------------------------ */

function getRouteOriginPoint(): { point: LatLng; kind: 'gps' | 'point' } {
    if (state.userPos) return { point: state.userPos, kind: 'gps' };
    return { point: state.center, kind: 'point' };
}

async function showRoute(): Promise<void> {
    const place = getPlace(state.selectedId);
    if (!place) return;
    state.view = 'route';
    state.routeError = null;

    const origin = getRouteOriginPoint();
    routeAbort?.abort();
    routeAbort = new AbortController();
    state.routeLoading = true;
    state.routeOrigin = origin.kind;
    renderPanel();

    try {
        const route = await fetchRoute(origin.point, place, state.mode, place.name, routeAbort.signal);
        state.route = route;
        state.routeLoading = false;
        if (MOBILE_QUERY.matches) setSheet('half');
        drawRoute(route, true);
        renderPanel();
    } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        state.routeLoading = false;
        state.route = null;
        state.routeError = (error as Error).message;
        clearRoute();
        renderPanel();
    }
}

function drawRoute(route: Route, fit: boolean): void {
    routeLayer.clearLayers();
    const latlngs = route.coordinates.map((c) => L.latLng(c.lat, c.lng));
    routeCasing = L.polyline(latlngs, { className: 'fx-route-casing', weight: 10, interactive: false }).addTo(routeLayer);
    routeLine = L.polyline(latlngs, {
        className: `fx-route-line fx-route-line--${route.mode}`,
        weight: route.mode === 'foot' ? 6 : 5,
        dashArray: route.mode === 'foot' ? '0.1 11' : undefined,
        lineCap: 'round',
        interactive: false
    }).addTo(routeLayer);

    if (fit) fitBoundsVisible(L.latLngBounds(latlngs));
}

function clearRoute(): void {
    routeAbort?.abort();
    routeLayer?.clearLayers();
    routeCasing = null;
    routeLine = null;
    state.route = null;
    state.routeLoading = false;
    state.routeError = null;
}

function startNavigation(): void {
    const place = getPlace(state.selectedId);
    if (!place || !state.route) return;
    if (!state.userPos) {
        toast('Activa tu GPS con el botón de ubicación para guiarte en vivo.', 4500);
        activateGps(false);
        return;
    }

    state.navigating = true;
    state.followUser = true;
    state.arrived = false;
    state.navProgress = null;
    appEl.classList.add('is-navigating');
    if (MOBILE_QUERY.matches) setSheet('peek');
    syncLocationMarker();
    renderBanner();
    renderPanel();
    moveMap(() => map.setView([state.userPos!.lat, state.userPos!.lng], 17.5));

    navSession = new NavigationSession(state.route, place, {
        onProgress: (progress) => {
            state.navProgress = progress;
            state.userPos = progress.position;
            state.userAccuracy = progress.accuracy;
            state.userHeading = progress.heading;
            syncLocationMarker();
            trimRouteLine(progress);
            if (state.followUser) {
                moveMap(() => map.panTo([progress.position.lat, progress.position.lng], { animate: true, duration: 0.6 }));
            }
            renderBanner();
        },
        onReroute: (from) => void reroute(from),
        onArrive: () => {
            state.arrived = true;
            navSession?.stop();
            navSession = null;
            renderBanner();
        },
        onError: (message) => {
            toast(message, 6000);
        }
    });
    navSession.start();
}

async function reroute(from: LatLng): Promise<void> {
    const place = getPlace(state.selectedId);
    if (!place || !navSession) return;
    toast('Te desviaste. Recalculando la ruta...');
    try {
        const route = await fetchRoute(from, place, state.mode, place.name);
        if (!navSession) return;
        state.route = route;
        drawRoute(route, false);
        navSession.setRoute(route);
        renderPanel();
    } catch (error) {
        toast((error as Error).message);
    }
}

function trimRouteLine(progress: NavProgress): void {
    if (!state.route || !routeLine || !routeCasing) return;
    const coords = state.route.coordinates;
    let idx = 0;
    while (idx < state.route.cumulative.length - 1 && state.route.cumulative[idx + 1] <= progress.traveled) idx++;
    const remaining = [progress.snapped, ...coords.slice(idx + 1)].map((c) => L.latLng(c.lat, c.lng));
    routeLine.setLatLngs(remaining);
    routeCasing.setLatLngs(remaining);
}

function stopNavigation(): void {
    navSession?.stop();
    navSession = null;
    state.navigating = false;
    state.navProgress = null;
    state.arrived = false;
    appEl.classList.remove('is-navigating');
    navBanner.hidden = true;
    syncLocationMarker();
    if (MOBILE_QUERY.matches) setSheet('half');
    if (state.route) drawRoute(state.route, true);
    renderPanel();
}

function renderBanner(): void {
    if (!state.navigating) {
        navBanner.hidden = true;
        return;
    }
    navBanner.hidden = false;
    const place = getPlace(state.selectedId);
    const p = state.navProgress;

    if (state.arrived) {
        const offer = place?.offers[0];
        navBanner.innerHTML = `
            <div class="fx-nav-main is-arrived">
                <div class="fx-nav-icon">${icons.check(28)}</div>
                <div class="fx-nav-text">
                    <div class="fx-nav-dist">Llegaste</div>
                    <div class="fx-nav-instr">${escapeHtml(place?.name)}${offer ? ` &middot; ${escapeHtml(offer.title)}` : ''}</div>
                    <div class="fx-nav-hint">Muestra tu código QR en el local y realiza ahí tu pago.</div>
                </div>
            </div>
            <div class="fx-nav-foot">
                <span></span>
                <button type="button" class="fx-btn fx-btn--primary fx-btn--sm" data-action="stop-nav">Terminar</button>
            </div>`;
        return;
    }

    if (!p) {
        navBanner.innerHTML = `
            <div class="fx-nav-main">
                <div class="fx-nav-icon is-pulsing">${icons.locate(26)}</div>
                <div class="fx-nav-text">
                    <div class="fx-nav-dist">Siguiendo tu ubicación</div>
                    <div class="fx-nav-instr">Avanza hacia la ruta marcada en el mapa.</div>
                </div>
            </div>
            <div class="fx-nav-foot">
                <span class="fx-nav-stats">${state.route ? `${formatDuration(state.route.duration)} &middot; ${formatDistance(state.route.distance)}` : ''}</span>
                <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="stop-nav">Salir</button>
            </div>`;
        return;
    }

    const step = p.nextStep;
    const eta = new Date(Date.now() + p.remainingDuration * 1000);
    navBanner.innerHTML = `
        <div class="fx-nav-main">
            <div class="fx-nav-icon">${maneuverIcon(step?.icon ?? 'arrive', 30)}</div>
            <div class="fx-nav-text">
                <div class="fx-nav-dist">${formatDistance(p.distanceToNextStep)}</div>
                <div class="fx-nav-instr">${escapeHtml(step?.instruction ?? `Llegas a ${place?.name ?? 'tu destino'}`)}</div>
            </div>
        </div>
        <div class="fx-nav-foot">
            <span class="fx-nav-stats">
                <strong>${formatDuration(p.remainingDuration)}</strong> &middot; ${formatDistance(p.remainingDistance)} &middot; llegada ${formatClock(eta)}
            </span>
            <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="stop-nav">Salir</button>
        </div>`;
}

function onBannerClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (btn?.dataset.action === 'stop-nav') stopNavigation();
}

/* ------------------------------------------------------------------ */
/* Render del panel según vista activa                                 */
/* ------------------------------------------------------------------ */

function renderPanel(): void {
    panelEl.dataset.view = state.view;
    if (state.view === 'list') panelBody.innerHTML = renderListView();
    else if (state.view === 'detail') panelBody.innerHTML = renderDetailView();
    else if (state.view === 'route') panelBody.innerHTML = renderRouteView();
    else if (state.view === 'favorites') panelBody.innerHTML = renderFavoritesView();
    else if (state.view === 'orders') panelBody.innerHTML = renderOrdersView();
    else if (state.view === 'impact') panelBody.innerHTML = renderImpactView();
    else if (state.view === 'business') panelBody.innerHTML = renderBusinessView();
    updateCountdowns();
    updateSheetSummary();
}

function updateSheetSummary(): void {
    if (state.view === 'detail' || state.view === 'route') {
        const place = getPlace(state.selectedId);
        sheetSummary.textContent = place ? place.name : 'Detalle del lugar';
    } else if (state.view === 'favorites') {
        sheetSummary.textContent = `Tus locales favoritos (${state.favoriteIds.size})`;
    } else if (state.view === 'orders') {
        const active = state.orders.filter((o) => o.status === 'reserved').length;
        sheetSummary.textContent = active > 0 ? `${active} reserva activa con QR` : 'Mis pedidos y códigos QR';
    } else if (state.view === 'impact') {
        sheetSummary.textContent = 'Tu impacto ambiental y ahorro';
    } else if (state.view === 'business') {
        sheetSummary.textContent = 'Panel de gestión del negocio';
    } else if (state.loading) {
        sheetSummary.textContent = 'Buscando comida cerca...';
    } else {
        sheetSummary.textContent = `${state.places.length} ${state.places.length === 1 ? 'lugar disponible' : 'lugares disponibles'} cerca`;
    }
}

function renderListView(): string {
    const filters: Array<[OfferFilter, string]> = [
        ['all', 'Todo'],
        ['free', 'Gratis'],
        ['discount', 'Descuento'],
        ['surprise', 'Sorpresa']
    ];
    const chips = filters.map(([value, label]) => `
        <button type="button" class="fx-chip${state.filter === value ? ' is-active' : ''}" data-action="filter" data-filter="${value}" aria-pressed="${state.filter === value}">
            ${label}
        </button>`).join('');

    const categories: Array<[PlaceCategoryFilter, string]> = [
        ['all', 'Todas'],
        ['fonda', 'Fondas'],
        ['panaderia', 'Panaderías'],
        ['puesto', 'Puestos'],
        ['restaurante', 'Restaurantes'],
        ['cafeteria', 'Cafeterías'],
        ['comedor', 'Comedores']
    ];
    const categoryPills = categories.map(([val, label]) => `
        <button type="button" class="fx-cat-pill${state.category === val ? ' is-active' : ''}" data-action="category" data-category="${val}">
            ${label}
        </button>`).join('');

    const radiusOptions = RADIUS_OPTIONS.map((r) => `<option value="${r}"${r === state.radius ? ' selected' : ''}>${formatDistance(r)}</option>`).join('');

    const activeOrdersCount = state.orders.filter((o) => o.status === 'reserved').length;
    const activeOrdersBanner = activeOrdersCount > 0 ? `
        <div class="fx-fav-alert">
            <span class="fx-fav-alert-icon">${icons.ticket(16)}</span>
            <div class="fx-fav-alert-body">
                <strong>Tienes ${activeOrdersCount} ${activeOrdersCount === 1 ? 'reserva activa con código QR' : 'reservas activas con código QR'}</strong>
                <span>Abre tu pase de recogida en tu sección de Perfil.</span>
            </div>
            <a href="/perfil/?tab=pedidos" class="fx-link-btn">Ver QR</a>
        </div>` : '';

    const favAlertHtml = state.favoriteAlerts.length > 0 ? `
        <div class="fx-fav-alert">
            <span class="fx-fav-alert-icon">${icons.bell(16)}</span>
            <div class="fx-fav-alert-body">
                <strong>Tus favoritos tienen comida hoy:</strong>
                <span>${state.favoriteAlerts.map((a) => `${escapeHtml(a.name)} (${a.offers_count})`).join(' · ')}</span>
            </div>
            <a href="/perfil/?tab=favoritos" class="fx-link-btn">Ver</a>
        </div>` : '';

    let content: string;
    if (state.loading) {
        content = `<ul class="fx-list">${'<li class="fx-skeleton"></li>'.repeat(4)}</ul>`;
    } else if (state.error) {
        content = `
            <div class="fx-empty">
                ${icons.alert(28)}
                <h3>No pudimos cargar los lugares</h3>
                <p>${escapeHtml(state.error)}</p>
                <button type="button" class="fx-btn fx-btn--primary" data-action="retry">Reintentar</button>
            </div>`;
    } else if (state.places.length === 0) {
        const nextRadius = RADIUS_OPTIONS.find((r) => r > state.radius);
        content = `
            <div class="fx-empty">
                ${icons.cloche(30)}
                <h3>Nada por rescatar con este filtro</h3>
                <p>Prueba cambiando la categoría o amplía el radio de búsqueda.</p>
                <div class="fx-row">
                    ${state.filter !== 'all' || state.category !== 'all'
                        ? '<button type="button" class="fx-btn fx-btn--primary fx-btn--sm" data-action="reset-filters">Quitar filtros</button>'
                        : ''}
                    ${nextRadius ? `<button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="radius" data-radius="${nextRadius}">Ampliar a ${formatDistance(nextRadius)}</button>` : ''}
                </div>
            </div>`;
    } else {
        content = `<ul class="fx-list">${sortedPlaces().map(renderPlaceCard).join('')}</ul>`;
    }

    const count = !state.loading && !state.error ? `${state.places.length} ${state.places.length === 1 ? 'lugar' : 'lugares'}` : 'Buscando...';
    const gpsBadge = state.locating
        ? `<button type="button" class="fx-gps-pill is-locating" data-action="toggle-gps" title="Buscando señal GPS... Toca para cancelar">
                <span class="fx-spinner" style="width:11px;height:11px;border-width:1.5px"></span>
                <span>Buscando GPS...</span>
           </button>`
        : state.userPos
            ? `<button type="button" class="fx-gps-pill is-on" data-action="toggle-gps" title="Toca para desactivar el GPS">
                    ${icons.locate(12)}
                    <span>GPS activo</span>
                    <span class="fx-gps-action">&middot; Desactivar</span>
               </button>`
            : `<button type="button" class="fx-gps-pill" data-action="toggle-gps" title="Toca para activar el GPS">
                    ${icons.locate(12)}
                    <span>Activar mi GPS</span>
               </button>`;

    return `
        <div class="fx-list-head">
            <div class="fx-eyebrow-row">
                <p class="fx-eyebrow">Comida por rescatar</p>
                ${gpsBadge}
            </div>
            <h1 class="fx-title">Cerca de ${escapeHtml(state.centerLabel)}</h1>
            <p class="fx-subtitle">${count} a menos de ${formatDistance(state.radius)}</p>
            <div class="fx-controls">
                <div class="fx-chips" role="group" aria-label="Filtrar ofertas">${chips}</div>
                <label class="fx-radius">
                    <span>Radio</span>
                    <select data-action="radius-select" aria-label="Radio de búsqueda">${radiusOptions}</select>
                </label>
            </div>
            <div class="fx-cat-row" role="group" aria-label="Categorías de negocio">${categoryPills}</div>
        </div>
        ${activeOrdersBanner}
        ${favAlertHtml}
        ${state.locationError ? `
            <div class="fx-notice">
                ${icons.locate(16)}
                <div>
                    <p>${escapeHtml(state.locationError)}</p>
                    <button type="button" class="fx-link-btn" data-action="pin-here">Usar el centro actual del mapa como mi ubicación</button>
                </div>
            </div>` : ''}
        ${content}`;
}

function renderPlaceCard(place: Place): string {
    const status = placeStatus(place);
    const offer = place.offers[0];
    const dist = displayDistance(place);
    const pct = offer ? discountPercent(offer) : null;
    const more = place.offers.length - 1;
    const isFav = state.favoriteIds.has(place.id) || Boolean(place.is_favorite);
    const rating = (place.rating_avg || 4.8).toFixed(1);

    return `
        <li class="fx-card-item">
            <div class="fx-card" data-action="select" data-place-id="${place.id}" role="button" tabindex="0">
                <div class="fx-card-top">
                    <span class="fx-status fx-status--${status}"></span>
                    <span class="fx-card-type">${PLACE_TYPE_LABEL[place.type] ?? 'Comercio'}</span>
                    <span class="fx-card-rating">${icons.starFilled(12)} ${rating}</span>
                    <span class="fx-card-dist">${formatDistance(dist)} &middot; ${formatDuration(estimateWalkSeconds(dist))}</span>
                    <button type="button"
                            class="fx-fav-btn${isFav ? ' is-fav' : ''}"
                            data-action="fav"
                            data-place-id="${place.id}"
                            aria-label="${isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}"
                            title="${isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}">
                        ${isFav ? icons.heartFilled(15) : icons.heart(15)}
                    </button>
                </div>
                <h3 class="fx-card-name">${escapeHtml(place.name)}</h3>
                ${offer ? `
                    <p class="fx-card-offer">${offer.kind === 'paquete_sorpresa' ? `<span class="fx-kind">${icons.gift(12)} Sorpresa</span>` : ''}${escapeHtml(offer.title)}</p>
                    <div class="fx-card-bottom">
                        ${priceHtml(offer, pct)}
                        <span class="fx-countdown" data-ends="${offer.pickup_end}">${countdownText(offer.pickup_end)}</span>
                        <span class="fx-left${offer.quantity_left <= 2 ? ' is-low' : ''}">Quedan ${offer.quantity_left}</span>
                    </div>
                    ${more > 0 ? `<p class="fx-card-more">+${more} ${more === 1 ? 'oferta más disponible' : 'ofertas más disponibles'}</p>` : ''}
                ` : '<p class="fx-card-offer is-muted">Sin ofertas activas en este momento</p>'}
            </div>
        </li>`;
}

function priceHtml(offer: Offer, pct: number | null): string {
    if (offer.price === 0) return '<span class="fx-price is-free">Gratis</span>';
    return `
        <span class="fx-price">${formatPrice(offer.price)}</span>
        ${offer.original_price > offer.price ? `<s class="fx-price-old">${formatPrice(offer.original_price)}</s>` : ''}
        ${pct ? `<span class="fx-badge">-${pct}%</span>` : ''}`;
}

function renderDetailView(): string {
    const place = getPlace(state.selectedId);
    if (!place) return renderListView();
    const dist = displayDistance(place);
    const isFav = state.favoriteIds.has(place.id) || Boolean(place.is_favorite);
    const rating = (place.rating_avg || 4.8).toFixed(1);
    const ratingCount = place.rating_count || 1;

    const offers = place.offers.length
        ? place.offers.map(renderOfferCard).join('')
        : '<p class="fx-muted">Este lugar no tiene ofertas activas en este momento.</p>';

    const reviews = place.reviews ?? [];
    const reviewsList = reviews.length
        ? `<ul class="fx-reviews-list">${reviews.map((r) => `
            <li class="fx-review-card">
                <div class="fx-review-head">
                    <strong>${escapeHtml(r.user_name)}</strong>
                    <span class="fx-review-stars">${icons.starFilled(12).repeat(Math.max(1, Math.min(5, r.stars)))}</span>
                </div>
                ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ''}
            </li>`).join('')}</ul>`
        : '<p class="fx-muted">Sé la primera persona en dejar una reseña para este local.</p>';

    const starButtons = [1, 2, 3, 4, 5].map((n) => `
        <button type="button"
                class="fx-star-pick${n <= state.reviewStars ? ' is-on' : ''}"
                data-action="set-stars"
                data-stars="${n}"
                aria-label="${n} estrellas">
            ${n <= state.reviewStars ? icons.starFilled(18) : icons.star(18)}
        </button>`).join('');

    const activeOrderForPlace = state.orders.find(
        (o) => o.business_id === place.id && o.status === 'reserved'
    );
    const activeTicketHtml = activeOrderForPlace ? `
        <div class="fx-order-card is-highlighted" style="margin-bottom:14px">
            <div class="fx-order-top">
                <span class="fx-order-status is-reserved">Reserva lista · Muestra en local</span>
                <span class="fx-order-code">${escapeHtml(activeOrderForPlace.pickup_code)}</span>
            </div>
            <p class="fx-order-offer">${activeOrderForPlace.quantity}x ${escapeHtml(activeOrderForPlace.offer_title)}</p>
            <div class="fx-qr-ticket">
                <div class="fx-qr-frame">${renderQrSvg(`FOODLINK:${activeOrderForPlace.pickup_code}`, 124)}</div>
                <div class="fx-qr-info">
                    <span class="fx-qr-label">Código de recogida</span>
                    <strong class="fx-qr-code-big">${escapeHtml(activeOrderForPlace.pickup_code)}</strong>
                    <p>Presenta este QR al llegar y realiza ahí tu pago (${activeOrderForPlace.total_price === 0 ? 'Gratis' : formatPrice(activeOrderForPlace.total_price)}).</p>
                </div>
            </div>
            <div class="fx-order-actions">
                <a href="/perfil/?tab=pedidos" class="fx-btn fx-btn--primary fx-btn--sm">
                    ${icons.ticket(15)} Ver en Mi Perfil (Pedidos)
                </a>
                <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="route">
                    ${icons.route(15)} Cómo llegar
                </button>
            </div>
        </div>
    ` : '';

    return `
        <div class="fx-view-head">
            <button type="button" class="fx-back" data-action="back-list">${icons.back(16)} Lista</button>
            <button type="button"
                    class="fx-fav-pill${isFav ? ' is-fav' : ''}"
                    data-action="fav"
                    data-place-id="${place.id}">
                ${isFav ? icons.heartFilled(14) : icons.heart(14)}
                <span>${isFav ? 'En tus favoritos' : 'Guardar favorito'}</span>
            </button>
        </div>
        ${activeTicketHtml}
        <div class="fx-place">
            <p class="fx-eyebrow">
                ${PLACE_TYPE_LABEL[place.type] ?? 'Comercio'}
                ${place.is_verified ? `<span class="fx-verified">${icons.shield(12)} Verificado</span>` : ''}
                <span class="fx-rating-pill">${icons.starFilled(12)} ${rating} (${ratingCount})</span>
            </p>
            <h2 class="fx-place-name">${escapeHtml(place.name)}</h2>
            ${place.description ? `<p class="fx-place-desc">${escapeHtml(place.description)}</p>` : ''}
            <ul class="fx-meta">
                <li>${icons.pin(15)} <span>${formatDistance(dist)} ${state.userPos ? 'de tu ubicación' : 'de tu punto'}${place.address ? ` &middot; ${escapeHtml(place.address)}` : ''}</span></li>
                ${place.opening_hours ? `<li>${icons.clock(15)} <span>${escapeHtml(place.opening_hours)}</span></li>` : ''}
                ${place.phone ? `<li>${icons.phone(15)} <a href="tel:${escapeHtml(place.phone)}">${escapeHtml(place.phone)}</a></li>` : ''}
            </ul>
            <button type="button" class="fx-btn fx-btn--ghost fx-btn--block" data-action="route">
                ${icons.route(18)} Cómo llegar en el mapa
            </button>
        </div>
        <div class="fx-section">
            <h3 class="fx-section-title">Ofertas para rescatar hoy <span>${place.offers.length}</span></h3>
            <ul class="fx-offers">${offers}</ul>
            <p class="fx-pay-note">${icons.tag(13)} Apartas gratis con código QR y pagas directamente en el local al recoger.</p>
        </div>
        <div class="fx-section">
            <h3 class="fx-section-title">Reseñas de la comunidad <span>${rating} ${icons.starFilled(13)}</span></h3>
            <form class="fx-review-form" id="fx-review-form" data-business-id="${place.id}">
                <div class="fx-review-form-top">
                    <span>Tu calificación:</span>
                    <div class="fx-star-picker">${starButtons}</div>
                </div>
                <div class="fx-review-input-row">
                    <input type="text" name="comment" maxlength="280" placeholder="Comparte qué tal estuvo la comida y el trato al recoger..." required>
                    <button type="submit" class="fx-btn fx-btn--primary fx-btn--sm">Publicar</button>
                </div>
            </form>
            ${reviewsList}
        </div>`;
}

function renderOfferCard(offer: Offer): string {
    const pct = discountPercent(offer);
    const tags = offer.tags.filter((t) => t.toLowerCase() !== 'gratis');
    const selectedQty = Math.min(offer.quantity_left, Math.max(1, state.offerQtyByOfferId[offer.id] || 1));
    const isBusy = state.reservingOfferId === offer.id;
    const totalToPay = offer.price * selectedQty;
    const weightKg = ((offer.est_weight_kg || 0.65) * selectedQty).toFixed(2);

    return `
        <li class="fx-offer">
            <div class="fx-offer-head">
                <h4>${escapeHtml(offer.title)}</h4>
                ${offer.kind === 'paquete_sorpresa' ? `<span class="fx-kind">${icons.gift(12)} Paquete sorpresa</span>` : ''}
            </div>
            ${offer.description ? `<p class="fx-offer-desc">${escapeHtml(offer.description)}</p>` : ''}
            <div class="fx-offer-price">${priceHtml(offer, pct)}</div>
            <div class="fx-offer-meta">
                <span>${icons.clock(14)} Recoge de ${formatClock(new Date(offer.pickup_start))} a ${formatClock(new Date(offer.pickup_end))}</span>
                <span class="fx-countdown" data-ends="${offer.pickup_end}">${countdownText(offer.pickup_end)}</span>
            </div>
            <div class="fx-stock">
                <div class="fx-stock-bar"><span style="width:${Math.max(6, Math.min(100, (offer.quantity_left / Math.max(1, offer.quantity_total)) * 100))}%"></span></div>
                <span class="${offer.quantity_left <= 2 ? 'is-low' : ''}">Quedan ${offer.quantity_left} de ${offer.quantity_total} &middot; ~${weightKg} kg</span>
            </div>
            ${tags.length ? `<div class="fx-tags">${tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            ${offer.allergens ? `<p class="fx-allergens">${icons.alert(13)} Contiene: ${escapeHtml(offer.allergens)}</p>` : ''}
            <div class="fx-offer-actions">
                <div class="fx-qty-ctrl" aria-label="Cantidad a apartar">
                    <button type="button" data-action="qty-dec" data-offer-id="${offer.id}" ${selectedQty <= 1 ? 'disabled' : ''}>-</button>
                    <span>${selectedQty}</span>
                    <button type="button" data-action="qty-inc" data-offer-id="${offer.id}" data-max="${offer.quantity_left}" ${selectedQty >= offer.quantity_left ? 'disabled' : ''}>+</button>
                </div>
                <button type="button"
                        class="fx-btn fx-btn--primary fx-reserve-btn"
                        data-action="reserve"
                        data-offer-id="${offer.id}"
                        ${isBusy || offer.quantity_left <= 0 ? 'disabled' : ''}>
                    ${icons.qr(16)}
                    <span>${isBusy ? 'Generando QR...' : `Apartar con QR · ${totalToPay === 0 ? 'Gratis' : formatPrice(totalToPay)}`}</span>
                </button>
            </div>
        </li>`;
}

function renderFavoritesView(): string {
    const favPlaces = sortedPlaces(state.places.filter((p) => state.favoriteIds.has(p.id) || p.is_favorite));

    if (favPlaces.length === 0) {
        return `
            <div class="fx-section-header">
                <p class="fx-eyebrow">Tus guardados</p>
                <h2 class="fx-title">Locales favoritos</h2>
                <p class="fx-subtitle">Recibe alertas inmediatas cuando tus lugares preferidos publiquen paquetes u ofertas.</p>
            </div>
            <div class="fx-empty">
                ${icons.heart(32)}
                <h3>Aún no tienes favoritos</h3>
                <p>Toca el icono de corazón en cualquier fonda, panadería o restaurante del mapa para seguirlo.</p>
                <button type="button" class="fx-btn fx-btn--primary" data-action="go-tab" data-tab="list">Explorar lugares cercanos</button>
            </div>`;
    }

    return `
        <div class="fx-section-header">
            <p class="fx-eyebrow">Seguimiento y alertas</p>
            <h2 class="fx-title">Tus favoritos (${favPlaces.length})</h2>
            <p class="fx-subtitle">Locales con comida rescatada activa hoy cerca de ti</p>
        </div>
        <ul class="fx-list">${favPlaces.map(renderPlaceCard).join('')}</ul>`;
}

function renderOrdersView(): string {
    if (state.ordersLoading && state.orders.length === 0) {
        return `<div class="fx-section-header"><h2 class="fx-title">Mis pedidos</h2></div><ul class="fx-list">${'<li class="fx-skeleton"></li>'.repeat(3)}</ul>`;
    }

    if (state.orders.length === 0) {
        return `
            <div class="fx-section-header">
                <p class="fx-eyebrow">Pases de recogida</p>
                <h2 class="fx-title">Mis pedidos con QR</h2>
                <p class="fx-subtitle">Tus códigos QR para mostrar en el local aparecerán aquí.</p>
            </div>
            <div class="fx-empty">
                ${icons.ticket(32)}
                <h3>Aún no tienes reservas</h3>
                <p>Elige cualquier oferta en el mapa y pulsa "Apartar con QR". No necesitas pagar en línea: pagas al recoger en el establecimiento.</p>
                <button type="button" class="fx-btn fx-btn--primary" data-action="go-tab" data-tab="list">Buscar comida para rescatar</button>
            </div>`;
    }

    const cards = state.orders.map((ord) => {
        const isReserved = ord.status === 'reserved';
        const isPicked = ord.status === 'picked_up';
        const isHighlighted = ord.id === state.highlightedOrderId;
        const statusLabel = isReserved ? 'Activo · Mostrar en local' : isPicked ? 'Entregado' : 'Cancelado';
        const statusClass = isReserved ? 'is-reserved' : isPicked ? 'is-picked' : 'is-cancelled';
        const qrSvg = isReserved ? renderQrSvg(`FOODLINK:${ord.pickup_code}`, 156) : '';

        return `
            <li class="fx-order-card ${statusClass}${isHighlighted ? ' is-highlighted' : ''}">
                <div class="fx-order-top">
                    <span class="fx-order-status ${statusClass}">${statusLabel}</span>
                    <span class="fx-order-code">${escapeHtml(ord.pickup_code)}</span>
                </div>
                <h3 class="fx-order-biz">${escapeHtml(ord.business_name)}</h3>
                <p class="fx-order-offer">${ord.quantity}x ${escapeHtml(ord.offer_title)}</p>
                <div class="fx-order-meta">
                    <span>${ord.total_price === 0 ? 'Sin costo (Gratis)' : `Pagar en local: ${formatPrice(ord.total_price)}`}</span>
                    <span>&middot;</span>
                    <span>~${ord.est_weight_kg} kg rescatados</span>
                </div>
                ${isReserved ? `
                    <div class="fx-qr-ticket">
                        <div class="fx-qr-frame">${qrSvg}</div>
                        <div class="fx-qr-info">
                            <span class="fx-qr-label">Código de recogida</span>
                            <strong class="fx-qr-code-big">${escapeHtml(ord.pickup_code)}</strong>
                            <p>Presenta este QR al llegar a <strong>${escapeHtml(ord.business_name)}</strong> antes de las ${formatClock(new Date(ord.pickup_end))}.</p>
                            <span class="fx-countdown" data-ends="${ord.pickup_end}">${countdownText(ord.pickup_end)}</span>
                        </div>
                    </div>
                    <div class="fx-order-actions">
                        <button type="button" class="fx-btn fx-btn--primary fx-btn--sm" data-action="order-route" data-place-id="${ord.business_id}">
                            ${icons.route(15)} Cómo llegar
                        </button>
                        <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="redeem-quick" data-code="${escapeHtml(ord.pickup_code)}">
                            ${icons.check(15)} Ya lo recogí
                        </button>
                        <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm fx-btn--danger" data-action="cancel-order" data-order-id="${ord.id}">
                            Cancelar
                        </button>
                    </div>
                ` : ''}
                ${isPicked && !ord.has_review ? `
                    <div class="fx-order-actions">
                        <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="select" data-place-id="${ord.business_id}">
                            ${icons.starFilled(14)} Dejar reseña al negocio
                        </button>
                    </div>
                ` : ''}
            </li>`;
    }).join('');

    return `
        <div class="fx-section-header">
            <p class="fx-eyebrow">Reservas y códigos QR</p>
            <h2 class="fx-title">Mis pedidos (${state.orders.length})</h2>
            <p class="fx-subtitle">Muestra tu código QR en el establecimiento y paga al recibir tu comida.</p>
        </div>
        <ul class="fx-orders-list">${cards}</ul>`;
}

function renderImpactView(): string {
    const imp = state.impact ?? {
        rescues_count: 0,
        completed_count: 0,
        kg_saved: 0,
        co2_avoided_kg: 0,
        water_liters: 0,
        money_saved: 0,
        level_title: 'Semilla Solidaria',
        next_level_title: 'Guardián del Barrio',
        next_level_target: 2,
        level_progress: 0,
        badges: [
            { id: 'first_rescue', title: 'Primer Rescate', desc: 'Apartaste tu primera comida en Foodlink', unlocked: false },
            { id: 'surprise_fan', title: 'Explorador Sorpresa', desc: 'Rescataste un paquete sorpresa al cierre', unlocked: false },
            { id: 'zero_waste', title: 'Impacto 2 kg', desc: 'Evitaste el desperdicio de al menos 2 kg de alimentos', unlocked: false },
            { id: 'community_hero', title: 'Héroe del Barrio', desc: '5 o más porciones rescatadas en comercios locales', unlocked: false }
        ]
    };

    const badgesHtml = imp.badges.map((b) => `
        <li class="fx-badge-card${b.unlocked ? ' is-unlocked' : ''}">
            <div class="fx-badge-icon">${icons.award(20)}</div>
            <div>
                <strong>${escapeHtml(b.title)}</strong>
                <p>${escapeHtml(b.desc)}</p>
            </div>
            <span class="fx-badge-state">${b.unlocked ? 'Logrado' : 'Pendiente'}</span>
        </li>`).join('');

    return `
        <div class="fx-section-header">
            <p class="fx-eyebrow">Huella ecológica y ahorro</p>
            <h2 class="fx-title">Mi impacto Foodlink</h2>
            <p class="fx-subtitle">Cada rescate evita que comida en buen estado termine en la basura.</p>
        </div>

        <div class="fx-level-card">
            <div class="fx-level-top">
                <div>
                    <span class="fx-eyebrow">Nivel actual</span>
                    <h3>${escapeHtml(imp.level_title)}</h3>
                </div>
                <span class="fx-level-count">${imp.rescues_count} ${imp.rescues_count === 1 ? 'rescate' : 'rescates'}</span>
            </div>
            <div class="fx-level-bar"><span style="width:${Math.max(6, imp.level_progress)}%"></span></div>
            <p class="fx-level-next">Siguiente rango: <strong>${escapeHtml(imp.next_level_title)}</strong> (${imp.rescues_count}/${imp.next_level_target} porciones)</p>
        </div>

        <div class="fx-impact-grid">
            <div class="fx-impact-stat">
                <span class="fx-impact-val">${imp.kg_saved} kg</span>
                <span class="fx-impact-lbl">Comida salvada</span>
            </div>
            <div class="fx-impact-stat">
                <span class="fx-impact-val">${imp.co2_avoided_kg} kg</span>
                <span class="fx-impact-lbl">CO2 evitado</span>
            </div>
            <div class="fx-impact-stat">
                <span class="fx-impact-val">${formatPrice(imp.money_saved)}</span>
                <span class="fx-impact-lbl">Ahorro estimado</span>
            </div>
            <div class="fx-impact-stat">
                <span class="fx-impact-val">${imp.water_liters} L</span>
                <span class="fx-impact-lbl">Agua preservada</span>
            </div>
        </div>

        <div class="fx-section">
            <h3 class="fx-section-title">Insignias de rescate <span>${imp.badges.filter((b) => b.unlocked).length}/${imp.badges.length}</span></h3>
            <ul class="fx-badges-list">${badgesHtml}</ul>
        </div>`;
}

function renderBusinessView(): string {
    const panel = state.businessPanel;
    const biz = panel?.business ?? null;
    const stats = panel?.stats ?? null;
    const available = panel?.available_businesses ?? [];

    const bizOptions = available.map((b) => `
        <option value="${b.id}"${b.id === biz?.id ? ' selected' : ''}>
            ${escapeHtml(b.name)} (${PLACE_TYPE_LABEL[b.type] ?? b.type})${b.is_owner ? ' · Tu local' : ''}
        </option>`).join('');

    const templatesHtml = QUICK_OFFER_TEMPLATES.map((t) => `
        <button type="button" class="fx-tpl-btn" data-action="apply-tpl" data-tpl="${t.id}">
            ${icons.bolt(13)}
            <span>${escapeHtml(t.label)}</span>
        </button>`).join('');

    const pendingOrders = (panel?.orders ?? []).filter((o) => o.status === 'reserved');
    const pendingHtml = pendingOrders.length > 0
        ? `<ul class="fx-biz-orders">${pendingOrders.map((o) => `
            <li class="fx-biz-order-row">
                <div>
                    <strong>${escapeHtml(o.pickup_code)} · ${o.quantity}x ${escapeHtml(o.offer_title)}</strong>
                    <p>${escapeHtml(o.user_name)} &middot; ${o.total_price === 0 ? 'Gratis' : `Cobrar ${formatPrice(o.total_price)} en caja`}</p>
                </div>
                <button type="button" class="fx-btn fx-btn--primary fx-btn--sm" data-action="redeem-quick" data-code="${escapeHtml(o.pickup_code)}">
                    ${icons.check(14)} Entregar
                </button>
            </li>`).join('')}</ul>`
        : '<p class="fx-muted">No hay reservas pendientes de recoger en este momento.</p>';

    const activeOffers = (panel?.offers ?? []).filter((o) => o.status === 'active' && o.quantity_left > 0);
    const activeOffersHtml = activeOffers.length > 0
        ? `<ul class="fx-biz-orders">${activeOffers.map((o) => `
            <li class="fx-biz-order-row">
                <div>
                    <strong>${escapeHtml(o.title)}</strong>
                    <p>${o.price === 0 ? 'Gratis' : formatPrice(o.price)} (antes ${formatPrice(o.original_price)}) &middot; Quedan ${o.quantity_left}/${o.quantity_total}</p>
                </div>
                <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="close-offer" data-offer-id="${o.id}">
                    Cerrar
                </button>
            </li>`).join('')}</ul>`
        : '<p class="fx-muted">Sin ofertas activas. Publica una arriba en 20 segundos.</p>';

    return `
        <div class="fx-section-header">
            <div class="fx-eyebrow-row">
                <p class="fx-eyebrow">Panel para comercios</p>
                <button type="button" class="fx-link-btn" data-action="toggle-new-biz">
                    ${state.showNewBusinessForm ? 'Cancelar alta' : '+ Dar de alta mi negocio'}
                </button>
            </div>
            <h2 class="fx-title">Gestión de local y QR</h2>
            <p class="fx-subtitle">Publica excedentes del día, canjea códigos QR y consulta tus estadísticas.</p>
        </div>

        ${state.showNewBusinessForm ? `
            <form class="fx-card-form" id="fx-register-business-form">
                <h3 class="fx-section-title">Registrar nuevo establecimiento en el mapa</h3>
                <p class="fx-form-hint">Se ubicará en las coordenadas actuales de tu pin azul (${state.center.lat.toFixed(4)}, ${state.center.lng.toFixed(4)}).</p>
                <label class="fx-field">
                    <span>Nombre del negocio</span>
                    <input type="text" name="name" required placeholder="Ej. Fonda Santa Clara / Panadería El Sol">
                </label>
                <div class="fx-field-grid">
                    <label class="fx-field">
                        <span>Tipo de comercio</span>
                        <select name="type">
                            <option value="fonda">Fonda</option>
                            <option value="panaderia">Panadería</option>
                            <option value="restaurante">Restaurante</option>
                            <option value="puesto">Puesto</option>
                            <option value="cafeteria">Cafetería</option>
                            <option value="comedor">Comedor comunitario</option>
                            <option value="mercado">Mercado</option>
                        </select>
                    </label>
                    <label class="fx-field">
                        <span>Teléfono</span>
                        <input type="text" name="phone" placeholder="55 1234 5678">
                    </label>
                </div>
                <label class="fx-field">
                    <span>Dirección</span>
                    <input type="text" name="address" required placeholder="Calle y número, Colonia">
                </label>
                <label class="fx-field">
                    <span>Horario de atención</span>
                    <input type="text" name="opening_hours" value="Lun-Sáb 9:00-21:00" required>
                </label>
                <label class="fx-field">
                    <span>Descripción breve</span>
                    <input type="text" name="description" placeholder="Especialidad de la casa y tipo de comida">
                </label>
                <button type="submit" class="fx-btn fx-btn--primary fx-btn--block">Guardar y colocar en el mapa</button>
            </form>
        ` : ''}

        ${available.length > 0 ? `
            <div class="fx-biz-selector">
                <label>
                    <span>Establecimiento activo:</span>
                    <select data-action="select-managed-biz">${bizOptions}</select>
                </label>
            </div>
        ` : ''}

        ${stats && biz ? `
            <div class="fx-impact-grid fx-impact-grid--compact">
                <div class="fx-impact-stat">
                    <span class="fx-impact-val">${stats.kg_rescued} kg</span>
                    <span class="fx-impact-lbl">Evitados de tirar</span>
                </div>
                <div class="fx-impact-stat">
                    <span class="fx-impact-val">${formatPrice(stats.revenue_mxn)}</span>
                    <span class="fx-impact-lbl">Ingresos recuperados</span>
                </div>
                <div class="fx-impact-stat">
                    <span class="fx-impact-val">${stats.completed_orders}</span>
                    <span class="fx-impact-lbl">Pedidos entregados</span>
                </div>
                <div class="fx-impact-stat">
                    <span class="fx-impact-val">${stats.rating_avg.toFixed(1)}</span>
                    <span class="fx-impact-lbl">${stats.rating_count} reseñas</span>
                </div>
            </div>

            <div class="fx-section">
                <h3 class="fx-section-title">${icons.qr(16)} Validar código QR de cliente <span>${pendingOrders.length} pendientes</span></h3>
                <form class="fx-redeem-form" id="fx-redeem-form">
                    <input type="text" name="pickup_code" placeholder="Código del cliente (ej. FL-7K4M92)" required>
                    <button type="submit" class="fx-btn fx-btn--primary fx-btn--sm">Canjear QR</button>
                </form>
                ${pendingHtml}
            </div>

            <div class="fx-section">
                <h3 class="fx-section-title">${icons.bolt(15)} Publicar oferta en 20 segundos</h3>
                <div class="fx-tpl-grid">${templatesHtml}</div>
                <form class="fx-card-form" id="fx-publish-offer-form" data-business-id="${biz.id}">
                    <label class="fx-field">
                        <span>Título de la oferta o paquete</span>
                        <input type="text" name="title" required placeholder="Ej. Bolsa sorpresa de pan dulce / Comida corrida">
                    </label>
                    <div class="fx-field-grid">
                        <label class="fx-field">
                            <span>Modalidad</span>
                            <select name="kind">
                                <option value="paquete_sorpresa">Paquete sorpresa</option>
                                <option value="producto">Platillo / Producto</option>
                            </select>
                        </label>
                        <label class="fx-field">
                            <span>Unidades disponibles</span>
                            <input type="number" name="quantity_total" value="5" min="1" max="100" required>
                        </label>
                    </div>
                    <div class="fx-field-grid">
                        <label class="fx-field">
                            <span>Precio normal (MXN)</span>
                            <input type="number" name="original_price" value="110" min="0" step="1" required>
                        </label>
                        <label class="fx-field">
                            <span>Precio rescate (0 = Gratis)</span>
                            <input type="number" name="price" value="40" min="0" step="1" required>
                        </label>
                    </div>
                    <div class="fx-field-grid">
                        <label class="fx-field">
                            <span>Horas para recoger</span>
                            <input type="number" name="pickup_hours" value="3" min="0.5" max="12" step="0.5" required>
                        </label>
                        <label class="fx-field">
                            <span>Peso aprox. por unidad (kg)</span>
                            <input type="number" name="est_weight_kg" value="0.7" min="0.1" max="10" step="0.05" required>
                        </label>
                    </div>
                    <div class="fx-field-grid">
                        <label class="fx-field">
                            <span>Etiquetas</span>
                            <input type="text" name="tags" placeholder="casero, vegetariano">
                        </label>
                        <label class="fx-field">
                            <span>Alérgenos</span>
                            <input type="text" name="allergens" placeholder="gluten, lácteos">
                        </label>
                    </div>
                    <button type="submit" class="fx-btn fx-btn--primary fx-btn--block">Publicar oferta en el mapa</button>
                </form>
            </div>

            <div class="fx-section">
                <h3 class="fx-section-title">Ofertas activas de ${escapeHtml(biz.name)} <span>${activeOffers.length}</span></h3>
                ${activeOffersHtml}
            </div>
        ` : '<div class="fx-empty"><span class="fx-spinner"></span><p>Cargando datos del negocio...</p></div>'}`;
}

function renderRouteView(): string {
    const place = getPlace(state.selectedId);
    if (!place) return renderListView();

    const modes = (Object.keys(TRAVEL_MODE_LABEL) as TravelMode[]).map((mode) => `
        <button type="button" class="fx-mode${state.mode === mode ? ' is-active' : ''}" data-action="mode" data-mode="${mode}" aria-pressed="${state.mode === mode}">
            ${mode === 'foot' ? icons.walk(18) : mode === 'bike' ? icons.bike(18) : icons.car(18)}
            <span>${TRAVEL_MODE_LABEL[mode]}</span>
        </button>`).join('');

    let body: string;
    if (state.routeLoading) {
        body = '<div class="fx-route-summary is-loading"><span class="fx-spinner"></span> Calculando la mejor ruta...</div>';
    } else if (state.routeError) {
        body = `
            <div class="fx-empty fx-empty--compact">
                ${icons.alert(24)}
                <p>${escapeHtml(state.routeError)}</p>
                <div class="fx-row">
                    <button type="button" class="fx-btn fx-btn--primary fx-btn--sm" data-action="locate">${icons.locate(15)} Usar mi ubicación</button>
                    <button type="button" class="fx-btn fx-btn--ghost fx-btn--sm" data-action="route">Reintentar</button>
                </div>
            </div>`;
    } else if (state.route) {
        const r = state.route;
        const eta = new Date(Date.now() + r.duration * 1000);
        const steps = r.steps.map((s, i) => `
            <li>
                <button type="button" class="fx-step" data-action="step" data-step="${i}">
                    <span class="fx-step-icon">${maneuverIcon(s.icon, 20)}</span>
                    <span class="fx-step-text">${escapeHtml(s.instruction)}</span>
                    ${s.distance > 0 ? `<span class="fx-step-dist">${formatDistance(s.distance)}</span>` : ''}
                </button>
            </li>`).join('');

        body = `
            <div class="fx-route-summary">
                <div class="fx-route-time">${formatDuration(r.duration)}</div>
                <div class="fx-route-info">
                    <span>${formatDistance(r.distance)}</span>
                    <span>Llegada aprox. ${formatClock(eta)}</span>
                </div>
            </div>
            <p class="fx-route-origin-note">
                ${state.routeOrigin === 'gps'
                    ? `${icons.locate(14)} Ruta desde tu ubicación GPS actual`
                    : `${icons.pin(14)} Ruta desde tu punto azul en el mapa (puedes arrastrarlo para ajustar tu salida)`}
            </p>
            ${state.navigating
                ? '<button type="button" class="fx-btn fx-btn--ghost fx-btn--block" data-action="stop-nav">Detener navegación</button>'
                : `<button type="button" class="fx-btn fx-btn--primary fx-btn--block" data-action="start-nav">
                       ${icons.navigate(16)} ${state.userPos ? 'Iniciar navegación en vivo' : 'Activar GPS e iniciar navegación'}
                   </button>`}
            <h3 class="fx-section-title">Indicaciones paso a paso <span>${r.steps.length}</span></h3>
            <ol class="fx-steps">${steps}</ol>`;
    } else {
        body = '';
    }

    return `
        <div class="fx-view-head">
            <button type="button" class="fx-back" data-action="back-detail">${icons.back(16)} ${escapeHtml(place.name)}</button>
        </div>
        <p class="fx-eyebrow">Ruta hacia</p>
        <h2 class="fx-place-name fx-place-name--sm">${escapeHtml(place.name)}</h2>
        <div class="fx-modes" role="group" aria-label="Medio de transporte">${modes}</div>
        ${body}`;
}

/* ------------------------------------------------------------------ */
/* Eventos del panel                                                   */
/* ------------------------------------------------------------------ */

function onPanelClick(e: Event): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || target.tagName === 'SELECT') return;
    const action = target.dataset.action;

    switch (action) {
        case 'select':
            void selectPlace(Number(target.dataset.placeId));
            break;
        case 'fav':
            e.stopPropagation();
            void handleToggleFavorite(Number(target.dataset.placeId));
            break;
        case 'filter':
            state.filter = (target.dataset.filter as OfferFilter) || 'all';
            void loadPlaces();
            break;
        case 'category':
            state.category = (target.dataset.category as PlaceCategoryFilter) || 'all';
            void loadPlaces();
            break;
        case 'reset-filters':
            state.filter = 'all';
            state.category = 'all';
            void loadPlaces();
            break;
        case 'go-tab':
            switchTab((target.dataset.tab as 'list' | 'favorites' | 'orders' | 'impact' | 'business') || 'list');
            break;
        case 'qty-dec': {
            const offerId = Number(target.dataset.offerId);
            const cur = state.offerQtyByOfferId[offerId] || 1;
            state.offerQtyByOfferId[offerId] = Math.max(1, cur - 1);
            renderPanel();
            break;
        }
        case 'qty-inc': {
            const offerId = Number(target.dataset.offerId);
            const max = Number(target.dataset.max || 10);
            const cur = state.offerQtyByOfferId[offerId] || 1;
            state.offerQtyByOfferId[offerId] = Math.min(max, cur + 1);
            renderPanel();
            break;
        }
        case 'reserve':
            void handleReserveOffer(Number(target.dataset.offerId));
            break;
        case 'cancel-order':
            void handleCancelOrderClick(Number(target.dataset.orderId));
            break;
        case 'order-route': {
            const placeId = Number(target.dataset.placeId);
            void selectPlace(placeId).then(() => showRoute());
            break;
        }
        case 'redeem-quick':
            void handleRedeemCode(String(target.dataset.code || ''));
            break;
        case 'set-stars':
            state.reviewStars = Number(target.dataset.stars) || 5;
            renderPanel();
            break;
        case 'toggle-new-biz':
            state.showNewBusinessForm = !state.showNewBusinessForm;
            renderPanel();
            break;
        case 'apply-tpl':
            applyOfferTemplate(String(target.dataset.tpl || ''));
            break;
        case 'close-offer':
            void closeBusinessOffer(Number(target.dataset.offerId)).then(() => {
                toast('Oferta cerrada.');
                void loadBusinessPanelData();
                void loadPlaces();
            });
            break;
        case 'radius':
            state.radius = Number(target.dataset.radius) || state.radius;
            syncRadiusCircle();
            fitRadius();
            void loadPlaces();
            break;
        case 'retry':
            void loadPlaces();
            break;
        case 'back-list':
            showList();
            break;
        case 'back-detail':
            showDetail();
            break;
        case 'route':
            void showRoute();
            break;
        case 'mode':
            state.mode = (target.dataset.mode as TravelMode) || 'foot';
            if (state.navigating) stopNavigation();
            void showRoute();
            break;
        case 'start-nav':
            startNavigation();
            break;
        case 'stop-nav':
            stopNavigation();
            break;
        case 'locate':
        case 'toggle-gps':
            toggleGps();
            break;
        case 'pin-here': {
            const c = map.getCenter();
            state.locationError = null;
            setCenter({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) }, 'manual', 'tu punto en el mapa');
            toast('Punto fijado en el centro del mapa. Puedes arrastrar el pin azul cuando quieras.', 3500);
            void loadPlaces();
            break;
        }
        case 'step': {
            const step = state.route?.steps[Number(target.dataset.step)];
            if (step) {
                if (state.navigating) state.followUser = false;
                if (MOBILE_QUERY.matches) setSheet('peek');
                focusOn(step.location, 17.5);
            }
            break;
        }
    }
}

function onPanelChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLSelectElement && target.dataset.action === 'radius-select') {
        state.radius = Number(target.value) || 3000;
        syncRadiusCircle();
        fitRadius();
        void loadPlaces();
    } else if (target instanceof HTMLSelectElement && target.dataset.action === 'select-managed-biz') {
        const bizId = Number(target.value);
        state.selectedBusinessId = bizId;
        void loadBusinessPanelData(bizId);
    }
}

async function onPanelSubmit(e: Event): Promise<void> {
    const form = e.target as HTMLFormElement;
    if (!form || form.tagName !== 'FORM') return;
    e.preventDefault();

    const identity = getActiveUserIdentity();

    if (form.id === 'fx-review-form') {
        const businessId = Number(form.dataset.businessId);
        const commentInput = form.elements.namedItem('comment') as HTMLInputElement | null;
        const comment = commentInput?.value.trim() || '';
        if (!comment) return;

        try {
            const res = await submitReview({
                email: identity.email,
                userName: identity.name,
                businessId,
                stars: state.reviewStars,
                comment
            });
            toast(res.message || 'Reseña publicada.', 2800);
            await selectPlace(businessId);
        } catch (err) {
            toast((err as Error).message || 'No se pudo publicar la reseña.');
        }
        return;
    }

    if (form.id === 'fx-redeem-form') {
        const input = form.elements.namedItem('pickup_code') as HTMLInputElement | null;
        const code = input?.value.trim() || '';
        if (!code) return;
        await handleRedeemCode(code);
        if (input) input.value = '';
        return;
    }

    if (form.id === 'fx-register-business-form') {
        const fd = new FormData(form);
        const pos = state.userPos ?? state.center;
        try {
            const res = await registerBusiness({
                email: identity.email,
                name: String(fd.get('name') || ''),
                type: (String(fd.get('type') || 'fonda') as PlaceType),
                description: String(fd.get('description') || ''),
                address: String(fd.get('address') || ''),
                phone: String(fd.get('phone') || ''),
                opening_hours: String(fd.get('opening_hours') || 'Lun-Sáb 9:00-21:00'),
                lat: pos.lat,
                lng: pos.lng
            });
            state.showNewBusinessForm = false;
            state.selectedBusinessId = res.business.id;
            toast(res.message || 'Negocio registrado en el mapa.', 3200);
            await loadBusinessPanelData(res.business.id);
            void loadPlaces();
        } catch (err) {
            toast((err as Error).message || 'No se pudo registrar el negocio.');
        }
        return;
    }

    if (form.id === 'fx-publish-offer-form') {
        const businessId = Number(form.dataset.businessId);
        const fd = new FormData(form);
        try {
            const res = await publishBusinessOffer({
                email: identity.email,
                businessId,
                title: String(fd.get('title') || ''),
                kind: (fd.get('kind') === 'paquete_sorpresa' ? 'paquete_sorpresa' : 'producto'),
                original_price: Number(fd.get('original_price') || 0),
                price: Number(fd.get('price') || 0),
                quantity_total: Number(fd.get('quantity_total') || 3),
                pickup_hours: Number(fd.get('pickup_hours') || 3),
                est_weight_kg: Number(fd.get('est_weight_kg') || 0.65),
                tags: String(fd.get('tags') || ''),
                allergens: String(fd.get('allergens') || '')
            });
            toast(res.message || 'Oferta publicada.', 3200);
            form.reset();
            await loadBusinessPanelData(businessId);
            void loadPlaces();
        } catch (err) {
            toast((err as Error).message || 'Error al publicar oferta.');
        }
    }
}

/* ------------------------------------------------------------------ */
/* Búsqueda de direcciones                                             */
/* ------------------------------------------------------------------ */

async function runSearch(): Promise<void> {
    const query = searchInput.value.trim();
    if (query.length < 3) {
        toast('Escribe al menos 3 letras.');
        return;
    }
    searchResults.hidden = false;
    searchResults.innerHTML = '<li class="fx-search-status"><span class="fx-spinner"></span> Buscando...</li>';
    try {
        const c = map.getCenter();
        const results = await geocode(query, { lat: c.lat, lng: c.lng });
        if (results.length === 0) {
            searchResults.innerHTML = '<li class="fx-search-status">Sin resultados. Prueba con otra calle, colonia o ciudad.</li>';
            return;
        }
        searchResults.innerHTML = results.map((r, i) => `
            <li><button type="button" role="option" data-result="${i}">${icons.pin(14)} <span>${escapeHtml(r.label)}</span></button></li>`).join('');
        searchResults.querySelectorAll<HTMLButtonElement>('[data-result]').forEach((btn) => {
            btn.addEventListener('click', () => chooseSearchResult(results[Number(btn.dataset.result)]));
        });
    } catch (error) {
        searchResults.innerHTML = `<li class="fx-search-status">${escapeHtml((error as Error).message)}</li>`;
    }
}

function chooseSearchResult(result: GeocodeResult): void {
    hideSearchResults();
    const shortLabel = result.label.split(',').slice(0, 2).join(',').trim();
    searchInput.value = shortLabel;
    searchInput.blur();
    const p = { lat: result.lat, lng: result.lng };
    state.locationError = null;
    setCenter(p, 'search', shortLabel);

    if (state.view !== 'list') showList();
    focusOn(p, 15);
    void loadPlaces();
}

function hideSearchResults(): void {
    searchResults.hidden = true;
    searchResults.innerHTML = '';
}

/* ------------------------------------------------------------------ */
/* Mapa: encuadre teniendo en cuenta el panel                          */
/* ------------------------------------------------------------------ */

interface Insets { top: number; right: number; bottom: number; left: number }

function overlayInsets(): Insets {
    const mapRect = map.getContainer().getBoundingClientRect();
    const top = Math.max(12, topbarEl.getBoundingClientRect().bottom - mapRect.top + 12);
    const panelRect = panelEl.getBoundingClientRect();
    const bannerRect = navBanner.hidden ? null : navBanner.getBoundingClientRect();
    const topWithBanner = bannerRect ? Math.max(top, bannerRect.bottom - mapRect.top + 12) : top;

    if (MOBILE_QUERY.matches) {
        const sheetOverlap = Math.max(16, mapRect.bottom - panelRect.top + 16);
        return { top: topWithBanner, right: 56, bottom: Math.min(mapRect.height * 0.58, sheetOverlap), left: 14 };
    }
    return { top: topWithBanner, right: 64, bottom: 24, left: Math.max(12, panelRect.right - mapRect.left + 16) };
}

function focusOn(p: LatLng, zoom: number): void {
    const safeZoom = Math.min(18.5, Math.max(4, zoom));
    const insets = overlayInsets();
    const size = map.getSize();
    const visibleCenterX = insets.left + (size.x - insets.left - insets.right) / 2;
    const visibleCenterY = insets.top + (size.y - insets.top - insets.bottom) / 2;
    const offset = L.point(visibleCenterX - size.x / 2, visibleCenterY - size.y / 2);
    const targetPoint = map.project([p.lat, p.lng], safeZoom).subtract(offset);
    moveMap(() => map.flyTo(map.unproject(targetPoint, safeZoom), safeZoom, { duration: 0.55 }));
}

function fitBoundsVisible(bounds: L.LatLngBounds): void {
    const insets = overlayInsets();
    moveMap(() => map.flyToBounds(bounds, {
        paddingTopLeft: [insets.left, insets.top],
        paddingBottomRight: [insets.right, insets.bottom],
        maxZoom: 17.5,
        duration: 0.55
    }));
}

function fitRadius(): void {
    const bounds = L.latLng(state.center.lat, state.center.lng).toBounds(state.radius * 2);
    fitBoundsVisible(bounds);
}

function moveMap(fn: () => void): void {
    programmaticMove = true;
    fn();
    const release = (): void => {
        window.setTimeout(() => { programmaticMove = false; }, 50);
    };
    map.once('moveend', release);
    window.setTimeout(() => {
        map.off('moveend', release);
        programmaticMove = false;
    }, 1500);
}

function onMapMoveEnd(): void {
    if (programmaticMove || state.navigating || state.view !== 'list') return;
    const c = map.getCenter();
    const moved = distanceMeters(state.center, { lat: c.lat, lng: c.lng });
    areaBtn.hidden = moved < Math.max(250, state.radius * 0.3);
}

/* ------------------------------------------------------------------ */
/* Hoja inferior deslizable (móvil)                                    */
/* ------------------------------------------------------------------ */

function setSheet(sheet: SheetState): void {
    panelEl.dataset.sheet = sheet;
    appEl.dataset.sheet = sheet;
    panelEl.style.removeProperty('--drag-y');

    if (sheet === 'peek') {
        mobileToggleIcon.innerHTML = icons.list(17);
        mobileToggleText.textContent = 'Ver lista';
    } else {
        mobileToggleIcon.innerHTML = icons.map(17);
        mobileToggleText.textContent = 'Ver mapa';
    }
}

function bindSheetGestures(): void {
    const order: SheetState[] = ['peek', 'half', 'full'];
    let startY = 0;
    let deltaY = 0;
    let dragging = false;

    sheetHandle.addEventListener('pointerdown', (e) => {
        if (!MOBILE_QUERY.matches) return;
        dragging = true;
        startY = e.clientY;
        deltaY = 0;
        panelEl.classList.add('is-dragging');
        sheetHandle.setPointerCapture(e.pointerId);
    });

    sheetHandle.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        deltaY = e.clientY - startY;
        panelEl.style.setProperty('--drag-y', `${deltaY.toFixed(0)}px`);
    });

    const finishDrag = (): void => {
        if (!dragging) return;
        dragging = false;
        panelEl.classList.remove('is-dragging');
        panelEl.style.removeProperty('--drag-y');

        const current = order.indexOf((panelEl.dataset.sheet as SheetState) || 'half');
        let next = current;
        if (Math.abs(deltaY) < 10) {
            next = current === order.length - 1 ? 0 : current + 1;
        } else if (deltaY < -35) {
            next = Math.min(order.length - 1, current + 1);
        } else if (deltaY > 35) {
            next = Math.max(0, current - 1);
        }
        setSheet(order[next]);
    };

    sheetHandle.addEventListener('pointerup', finishDrag);
    sheetHandle.addEventListener('pointercancel', finishDrag);
}

/* ------------------------------------------------------------------ */
/* Utilidades de UI                                                    */
/* ------------------------------------------------------------------ */

function countdownText(endIso: string): string {
    const end = Date.parse(endIso);
    const now = Date.now() + state.serverOffsetMs;
    const remaining = end - now;
    if (remaining <= 0) return 'Ya cerró';
    const minutes = Math.round(remaining / 60000);
    if (minutes < 60) return `Cierra en ${Math.max(1, minutes)} min`;
    return `Hasta las ${formatClock(new Date(end))}`;
}

function updateCountdowns(): void {
    document.querySelectorAll<HTMLElement>('[data-ends]').forEach((el) => {
        const text = countdownText(el.dataset.ends || '');
        el.textContent = text;
        const remaining = Date.parse(el.dataset.ends || '') - (Date.now() + state.serverOffsetMs);
        el.classList.toggle('is-urgent', remaining > 0 && remaining < 30 * 60000);
    });
}

function toast(message: string, ms = 3200): void {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), ms);
}

function renderUser(): void {
    const user = getStoredUser();
    const label = document.getElementById('fx-user-label');
    if (user && label) {
        label.textContent = user.name.trim().split(' ')[0] || user.name;
        document.getElementById('fx-user')?.classList.add('is-logged');
    }
}

function hydrateStaticIcons(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
        const name = el.dataset.icon as keyof typeof icons;
        if (icons[name]) el.innerHTML = icons[name](18);
    });
}

init();
