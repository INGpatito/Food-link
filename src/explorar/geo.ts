/**
 * Utilidades geograficas y de formato para el mapa de Foodlink.
 */

export interface LatLng {
    lat: number;
    lng: number;
}

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Distancia en metros entre dos puntos (Haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface ProjectionResult {
    /** Indice del segmento [i, i+1] mas cercano. */
    segmentIndex: number;
    /** Fraccion (0..1) dentro del segmento. */
    t: number;
    /** Distancia del punto a la linea, en metros. */
    distance: number;
    /** Punto proyectado sobre la linea. */
    point: LatLng;
}

/**
 * Proyecta un punto sobre una polilinea usando una aproximacion plana local
 * (suficientemente precisa para distancias urbanas).
 */
export function projectOnPolyline(p: LatLng, line: LatLng[], fromIndex = 0): ProjectionResult | null {
    if (line.length < 2) return null;
    const cosLat = Math.cos(toRad(p.lat));
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * cosLat;

    let best: ProjectionResult | null = null;
    for (let i = Math.max(0, fromIndex); i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const ax = (a.lng - p.lng) * mPerDegLng;
        const ay = (a.lat - p.lat) * mPerDegLat;
        const bx = (b.lng - p.lng) * mPerDegLng;
        const by = (b.lat - p.lat) * mPerDegLat;
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = ax + t * dx;
        const py = ay + t * dy;
        const d = Math.sqrt(px * px + py * py);
        if (!best || d < best.distance) {
            best = {
                segmentIndex: i,
                t,
                distance: d,
                point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t }
            };
        }
    }
    return best;
}

/** Distancias acumuladas a lo largo de una polilinea (en metros). */
export function cumulativeDistances(line: LatLng[]): number[] {
    const acc = [0];
    for (let i = 1; i < line.length; i++) {
        acc.push(acc[i - 1] + distanceMeters(line[i - 1], line[i]));
    }
    return acc;
}

export function formatDistance(meters: number): string {
    if (!Number.isFinite(meters)) return '--';
    if (meters < 50) return `${Math.max(5, Math.round(meters / 5) * 5)} m`;
    if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
    if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters / 1000)} km`;
}

export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) return '--';
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatClock(date: Date): string {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Estimacion rapida del tiempo caminando en linea recta (con factor de calles). */
export function estimateWalkSeconds(meters: number): number {
    return (meters * 1.3) / 1.25;
}

export function formatPrice(value: number): string {
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: value % 1 === 0 ? 0 : 2 });
}

export function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
