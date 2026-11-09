/**
 * Navegacion en vivo dentro de la pagina: sigue la posicion GPS del usuario,
 * calcula el siguiente giro, el tiempo restante y detecta desvios y llegada.
 */
import type { Route, RouteStep, TravelMode } from './routing.ts';
import { distanceMeters, projectOnPolyline, type LatLng } from './geo.ts';

export interface NavProgress {
    position: LatLng;
    accuracy: number;
    heading: number | null;
    snapped: LatLng;
    distanceFromRoute: number;
    traveled: number;
    remainingDistance: number;
    remainingDuration: number;
    nextStep: RouteStep | null;
    distanceToNextStep: number;
    arrived: boolean;
}

export interface NavigationCallbacks {
    onProgress: (progress: NavProgress) => void;
    /** Se pide una ruta nueva desde la posicion actual (el usuario se desvio). */
    onReroute: (from: LatLng) => void;
    onArrive: () => void;
    onError: (message: string) => void;
}

const OFF_ROUTE_THRESHOLD: Record<TravelMode, number> = { foot: 35, bike: 45, car: 60 };
const ARRIVAL_RADIUS_M = 25;
const REROUTE_COOLDOWN_MS = 15000;

export class NavigationSession {
    private route: Route;
    private destination: LatLng;
    private callbacks: NavigationCallbacks;
    private watchId: number | null = null;
    private offRouteHits = 0;
    private lastRerouteAt = 0;
    private wakeLock: { release: () => Promise<void> } | null = null;
    private finished = false;
    private lastHeading: number | null = null;
    private lastPosition: LatLng | null = null;

    constructor(route: Route, destination: LatLng, callbacks: NavigationCallbacks) {
        this.route = route;
        this.destination = destination;
        this.callbacks = callbacks;
    }

    public start(): void {
        if (!('geolocation' in navigator)) {
            this.callbacks.onError('Tu navegador no permite obtener la ubicación.');
            return;
        }
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.handlePosition(pos),
            (err) => this.callbacks.onError(geolocationErrorMessage(err)),
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
        );
        void this.requestWakeLock();
        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    public stop(): void {
        this.finished = true;
        if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        void this.wakeLock?.release().catch(() => undefined);
        this.wakeLock = null;
    }

    /** Sustituye la ruta (por ejemplo, despues de recalcular por desvio). */
    public setRoute(route: Route): void {
        this.route = route;
        this.offRouteHits = 0;
        if (this.lastPosition) {
            this.evaluate(this.lastPosition, 10, this.lastHeading);
        }
    }

    private onVisibilityChange = (): void => {
        // El navegador libera el wake lock al ocultar la pestana; lo pedimos de nuevo al volver.
        if (document.visibilityState === 'visible' && !this.finished) void this.requestWakeLock();
    };

    private async requestWakeLock(): Promise<void> {
        try {
            const nav = navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } };
            if (nav.wakeLock) this.wakeLock = await nav.wakeLock.request('screen');
        } catch {
            // Sin soporte o sin permiso: la navegacion funciona igual.
        }
    }

    private handlePosition(pos: GeolocationPosition): void {
        if (this.finished) return;
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        let heading = pos.coords.heading;
        if ((heading === null || Number.isNaN(heading)) && this.lastPosition && distanceMeters(this.lastPosition, position) > 4) {
            heading = bearing(this.lastPosition, position);
        }
        if (heading !== null && !Number.isNaN(heading)) this.lastHeading = heading;
        this.lastPosition = position;
        this.evaluate(position, pos.coords.accuracy, this.lastHeading);
    }

    private evaluate(position: LatLng, accuracy: number, heading: number | null): void {
        const { coordinates, cumulative, steps } = this.route;
        const projection = projectOnPolyline(position, coordinates);
        if (!projection) return;

        const lineLength = cumulative[cumulative.length - 1] || this.route.distance;
        const segStart = cumulative[projection.segmentIndex];
        const segEnd = cumulative[projection.segmentIndex + 1] ?? segStart;
        const traveled = segStart + (segEnd - segStart) * projection.t;
        const remainingDistance = Math.max(0, lineLength - traveled);
        const remainingDuration = lineLength > 0 ? this.route.duration * (remainingDistance / lineLength) : 0;

        let nextStep: RouteStep | null = null;
        for (let i = 1; i < steps.length; i++) {
            if (cumulative[steps[i].startIndex] > traveled + 3) {
                nextStep = steps[i];
                break;
            }
        }
        const distanceToNextStep = nextStep ? cumulative[nextStep.startIndex] - traveled : remainingDistance;

        const toDestination = distanceMeters(position, this.destination);
        const arrived = toDestination <= ARRIVAL_RADIUS_M + Math.min(accuracy, 30) * 0.5 || remainingDistance < 12;

        this.callbacks.onProgress({
            position,
            accuracy,
            heading,
            snapped: projection.point,
            distanceFromRoute: projection.distance,
            traveled,
            remainingDistance,
            remainingDuration,
            nextStep,
            distanceToNextStep,
            arrived
        });

        if (arrived) {
            this.callbacks.onArrive();
            return;
        }

        const threshold = OFF_ROUTE_THRESHOLD[this.route.mode] + Math.min(accuracy, 50) * 0.5;
        if (projection.distance > threshold) {
            this.offRouteHits++;
            const now = Date.now();
            if (this.offRouteHits >= 2 && now - this.lastRerouteAt > REROUTE_COOLDOWN_MS) {
                this.lastRerouteAt = now;
                this.offRouteHits = 0;
                this.callbacks.onReroute(position);
            }
        } else {
            this.offRouteHits = 0;
        }
    }
}

function bearing(a: LatLng, b: LatLng): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
        Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function geolocationErrorMessage(err: GeolocationPositionError): string {
    switch (err.code) {
        case err.PERMISSION_DENIED:
            return 'Permiso de ubicación denegado. Actívalo en la configuración del navegador para usar esta función.';
        case err.POSITION_UNAVAILABLE:
            return 'No se pudo determinar tu ubicación. Revisa que el GPS esté activado.';
        case err.TIMEOUT:
            return 'La ubicación tardó demasiado en responder. Intenta de nuevo.';
        default:
            return 'Error al obtener la ubicación.';
    }
}
