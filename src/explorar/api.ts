/**
 * Cliente de la API de lugares, reservas QR, favoritos, resenas,
 * impacto y panel de negocio (/api/places) de Foodlink.
 */
import type { LatLng } from './geo.ts';

export type PlaceType = 'restaurante' | 'fonda' | 'panaderia' | 'cafeteria' | 'puesto' | 'mercado' | 'comedor' | 'otro';
export type OfferFilter = 'all' | 'free' | 'discount' | 'surprise';
export type PlaceCategoryFilter = 'all' | PlaceType;

export interface Offer {
    id: number;
    business_id?: number;
    title: string;
    description: string | null;
    kind: 'producto' | 'paquete_sorpresa';
    original_price: number;
    price: number;
    quantity_total: number;
    quantity_left: number;
    est_weight_kg?: number;
    pickup_start: string;
    pickup_end: string;
    tags: string[];
    allergens: string | null;
    status?: 'active' | 'sold_out' | 'expired' | 'cancelled';
}

export interface Review {
    id: number;
    business_id: number;
    user_name: string;
    stars: number;
    comment: string | null;
    created_at: string;
}

export interface Place {
    id: number;
    owner_email?: string | null;
    name: string;
    type: PlaceType;
    description: string | null;
    address: string | null;
    phone: string | null;
    lat: number;
    lng: number;
    opening_hours: string | null;
    image_url: string | null;
    rating_avg: number;
    rating_count: number;
    is_verified: boolean;
    is_favorite?: boolean;
    distance_m: number | null;
    offers: Offer[];
    reviews?: Review[];
}

export interface FavoriteAlert {
    id: number;
    name: string;
    offers_count: number;
    distance_m: number | null;
}

export interface NearbyResponse {
    success: boolean;
    message?: string;
    center: LatLng;
    radius: number;
    filter?: OfferFilter;
    category?: PlaceCategoryFilter;
    favorite_ids?: number[];
    active_favorite_alerts?: FavoriteAlert[];
    server_time: string;
    places: Place[];
}

export interface Order {
    id: number;
    user_email: string;
    user_name: string;
    business_id: number;
    business_name: string;
    business_type?: PlaceType;
    business_address: string | null;
    business_phone: string | null;
    business_lat: number;
    business_lng: number;
    offer_id: number;
    offer_title: string;
    offer_kind: 'producto' | 'paquete_sorpresa';
    pickup_start: string;
    pickup_end: string;
    quantity: number;
    unit_price: number;
    original_unit_price: number;
    total_price: number;
    est_weight_kg: number;
    pickup_code: string;
    status: 'reserved' | 'picked_up' | 'cancelled';
    has_review?: boolean;
    created_at: string;
    picked_up_at: string | null;
}

export interface ImpactBadge {
    id: string;
    title: string;
    desc: string;
    unlocked: boolean;
}

export interface ImpactSummary {
    rescues_count: number;
    completed_count: number;
    kg_saved: number;
    co2_avoided_kg: number;
    water_liters: number;
    money_saved: number;
    level_title: string;
    next_level_title: string;
    next_level_target: number;
    level_progress: number;
    badges: ImpactBadge[];
}

export interface BusinessStats {
    active_offers: number;
    pending_orders: number;
    completed_orders: number;
    revenue_mxn: number;
    kg_rescued: number;
    co2_avoided_kg: number;
    rating_avg: number;
    rating_count: number;
}

export interface AvailableBusinessItem {
    id: number;
    name: string;
    type: PlaceType;
    is_owner: boolean;
}

export interface BusinessPanelResponse {
    success: boolean;
    business: Place | null;
    available_businesses: AvailableBusinessItem[];
    offers: Offer[];
    orders: Order[];
    stats: BusinessStats | null;
}

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
    restaurante: 'Restaurante',
    fonda: 'Fonda',
    panaderia: 'Panadería',
    cafeteria: 'Cafetería',
    puesto: 'Puesto',
    mercado: 'Mercado',
    comedor: 'Comedor comunitario',
    otro: 'Comercio'
};

export interface NearbyQueryOptions {
    category?: PlaceCategoryFilter;
    favoritesOnly?: boolean;
    withoutOffers?: boolean;
    email?: string;
}

export async function fetchNearby(
    center: LatLng,
    radius: number,
    filter: OfferFilter,
    options?: NearbyQueryOptions,
    signal?: AbortSignal
): Promise<NearbyResponse> {
    const params = new URLSearchParams({
        lat: center.lat.toFixed(6),
        lng: center.lng.toFixed(6),
        radius: String(Math.round(radius)),
        filter
    });
    if (options?.category && options.category !== 'all') {
        params.set('category', options.category);
    }
    if (options?.favoritesOnly) {
        params.set('favoritesOnly', '1');
    }
    if (options?.withoutOffers) {
        params.set('withoutOffers', '1');
    }
    if (options?.email) {
        params.set('email', options.email);
    }
    const response = await fetch(`/api/places/nearby?${params}`, { signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Error ${response.status} al consultar lugares.`);
    }
    return data as NearbyResponse;
}

export async function fetchPlace(
    id: number,
    origin?: LatLng | null,
    email?: string
): Promise<{ place: Place; server_time: string }> {
    const params = new URLSearchParams();
    if (origin) {
        params.set('lat', origin.lat.toFixed(6));
        params.set('lng', origin.lng.toFixed(6));
    }
    if (email) {
        params.set('email', email);
    }
    const response = await fetch(`/api/places/${id}?${params}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Lugar no encontrado.');
    }
    return data;
}

export async function createOrder(params: {
    email: string;
    userName: string;
    offerId: number;
    quantity: number;
}): Promise<{ order: Order; message: string }> {
    const response = await fetch('/api/places/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo completar la reserva.');
    }
    return data;
}

export async function fetchOrdersAndImpact(email: string): Promise<{ orders: Order[]; impact: ImpactSummary }> {
    const params = new URLSearchParams({ email });
    const response = await fetch(`/api/places/orders?${params}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudieron cargar tus pedidos.');
    }
    return data;
}

export async function cancelOrder(orderId: number, email: string): Promise<{ message: string }> {
    const response = await fetch(`/api/places/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo cancelar la reserva.');
    }
    return data;
}

export async function toggleFavorite(businessId: number, email: string): Promise<{ is_favorite: boolean; favorite_ids: number[] }> {
    const response = await fetch('/api/places/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, email })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo actualizar favoritos.');
    }
    return data;
}

export async function submitReview(params: {
    email: string;
    userName: string;
    businessId: number;
    orderId?: number | null;
    stars: number;
    comment: string;
}): Promise<{ review: Review; rating_avg: number; rating_count: number; message: string }> {
    const response = await fetch('/api/places/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo guardar la reseña.');
    }
    return data;
}

export async function fetchBusinessPanel(
    email: string,
    businessId?: number | null,
    center?: LatLng
): Promise<BusinessPanelResponse> {
    const params = new URLSearchParams({ email });
    if (businessId) params.set('businessId', String(businessId));
    if (center) {
        params.set('lat', center.lat.toFixed(6));
        params.set('lng', center.lng.toFixed(6));
    }
    const response = await fetch(`/api/places/business/panel?${params}`);
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo cargar el panel del negocio.');
    }
    return data as BusinessPanelResponse;
}

export async function registerBusiness(params: {
    email: string;
    name: string;
    type: PlaceType;
    description: string;
    address: string;
    phone: string;
    opening_hours: string;
    lat: number;
    lng: number;
}): Promise<{ business: Place; message: string }> {
    const response = await fetch('/api/places/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo registrar el negocio.');
    }
    return data;
}

export async function publishBusinessOffer(params: {
    email: string;
    businessId: number;
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
}): Promise<{ offer: Offer; message: string }> {
    const response = await fetch('/api/places/business/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo publicar la oferta.');
    }
    return data;
}

export async function closeBusinessOffer(offerId: number): Promise<{ message: string }> {
    const response = await fetch(`/api/places/business/offers/${offerId}/close`, {
        method: 'POST'
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo cerrar la oferta.');
    }
    return data;
}

export async function redeemOrderCode(pickupCode: string, businessId?: number | null): Promise<{ order: Order; message: string }> {
    const response = await fetch('/api/places/business/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup_code: pickupCode, businessId })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo validar el código.');
    }
    return data;
}

/** Estado visual de un lugar segun sus ofertas activas. */
export type PlaceStatus = 'free' | 'discount' | 'low' | 'none';

export function placeStatus(place: Place): PlaceStatus {
    if (place.offers.length === 0) return 'none';
    if (place.offers.some((o) => o.price === 0)) return 'free';
    const totalLeft = place.offers.reduce((sum, o) => sum + o.quantity_left, 0);
    if (totalLeft <= 2) return 'low';
    return 'discount';
}

export function discountPercent(offer: Offer): number | null {
    if (offer.original_price <= 0 || offer.price >= offer.original_price) return null;
    return Math.round((1 - offer.price / offer.original_price) * 100);
}

/** Resultado de geocodificacion (direccion -> coordenadas) con Nominatim / OpenStreetMap. */
export interface GeocodeResult {
    label: string;
    lat: number;
    lng: number;
}

export async function geocode(query: string, near?: LatLng): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '6',
        'accept-language': 'es',
        countrycodes: 'mx'
    });
    if (near) {
        const d = 0.25;
        params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (!response.ok) throw new Error('No se pudo buscar la dirección.');
    const rows = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    return rows.map((r) => ({
        label: r.display_name,
        lat: Number(r.lat),
        lng: Number(r.lon)
    }));
}
