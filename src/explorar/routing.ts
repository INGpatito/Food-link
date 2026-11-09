/**
 * Calculo de rutas dentro de la pagina usando el servidor OSRM publico y gratuito
 * de FOSSGIS (routing.openstreetmap.de), el mismo que usa openstreetmap.org.
 * No requiere API key. Perfiles: a pie, bicicleta y automovil.
 */
import { cumulativeDistances, type LatLng } from './geo.ts';

export type TravelMode = 'foot' | 'bike' | 'car';

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = {
    foot: 'A pie',
    bike: 'Bici',
    car: 'Auto'
};

const PROFILE_URL: Record<TravelMode, string> = {
    foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
    bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
    car: 'https://routing.openstreetmap.de/routed-car/route/v1/driving'
};

interface OsrmManeuver {
    type: string;
    modifier?: string;
    location: [number, number];
    bearing_after?: number;
    exit?: number;
}

interface OsrmStep {
    name: string;
    ref?: string;
    distance: number;
    duration: number;
    maneuver: OsrmManeuver;
    geometry: { coordinates: [number, number][] };
}

export interface RouteStep {
    instruction: string;
    /** Clave del icono de maniobra (ver icons.ts). */
    icon: string;
    distance: number;
    duration: number;
    location: LatLng;
    /** Indice del primer punto de este paso dentro de Route.coordinates. */
    startIndex: number;
}

export interface Route {
    mode: TravelMode;
    distance: number;
    duration: number;
    coordinates: LatLng[];
    /** Distancia acumulada hasta cada punto de coordinates. */
    cumulative: number[];
    steps: RouteStep[];
}

const MODIFIER_TEXT: Record<string, string> = {
    uturn: 'Da vuelta en U',
    'sharp right': 'Gira bruscamente a la derecha',
    right: 'Gira a la derecha',
    'slight right': 'Gira ligeramente a la derecha',
    straight: 'Sigue derecho',
    'slight left': 'Gira ligeramente a la izquierda',
    left: 'Gira a la izquierda',
    'sharp left': 'Gira bruscamente a la izquierda'
};

const KEEP_TEXT: Record<string, string> = {
    'sharp right': 'Mantente a la derecha',
    right: 'Mantente a la derecha',
    'slight right': 'Mantente a la derecha',
    straight: 'Sigue derecho',
    'slight left': 'Mantente a la izquierda',
    left: 'Mantente a la izquierda',
    'sharp left': 'Mantente a la izquierda'
};

const ORDINALS = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];

function cardinal(bearing = 0): string {
    const dirs = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
    return dirs[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

function streetName(step: OsrmStep): string {
    const name = (step.name || '').trim();
    if (name) return name;
    return (step.ref || '').trim();
}

/** Convierte una maniobra de OSRM en una instruccion en espanol. */
function buildInstruction(step: OsrmStep, isLast: boolean, destinationName: string): { text: string; icon: string } {
    const { type, modifier = 'straight', bearing_after, exit } = step.maneuver;
    const name = streetName(step);
    const onName = name ? ` por ${name}` : '';
    const atName = name ? ` en ${name}` : '';

    switch (type) {
        case 'depart':
            return { text: `Dirígete al ${cardinal(bearing_after)}${onName}`, icon: 'straight' };
        case 'arrive':
            return {
                text: isLast ? `Llegas a ${destinationName}` : 'Llegas al punto intermedio',
                icon: 'arrive'
            };
        case 'roundabout':
        case 'rotary':
        case 'roundabout turn': {
            const ord = exit && exit > 0 ? ORDINALS[exit - 1] || `${exit}.ª` : '';
            const exitText = ord ? `toma la ${ord} salida` : 'sal de la glorieta';
            return { text: `En la glorieta, ${exitText}${onName}`, icon: 'roundabout' };
        }
        case 'exit roundabout':
        case 'exit rotary':
            return { text: `Sal de la glorieta${onName}`, icon: modifier };
        case 'fork':
        case 'use lane':
            return { text: `${KEEP_TEXT[modifier] || 'Continúa'}${onName}`, icon: modifier };
        case 'merge':
            return { text: `Incorpórate${onName}`, icon: modifier };
        case 'on ramp':
            return { text: `Toma la rampa de entrada${onName}`, icon: modifier };
        case 'off ramp':
            return { text: `Toma la salida${onName}`, icon: modifier };
        case 'continue':
        case 'new name':
            if (modifier === 'straight') return { text: `Continúa derecho${onName}`, icon: 'straight' };
            return { text: `${MODIFIER_TEXT[modifier] || 'Continúa'}${onName}`, icon: modifier };
        case 'end of road':
        case 'turn':
        default:
            return { text: `${MODIFIER_TEXT[modifier] || 'Continúa'}${atName}`, icon: modifier };
    }
}

export async function fetchRoute(
    from: LatLng,
    to: LatLng,
    mode: TravelMode,
    destinationName: string,
    signal?: AbortSignal
): Promise<Route> {
    const coords = `${from.lng.toFixed(6)},${from.lat.toFixed(6)};${to.lng.toFixed(6)},${to.lat.toFixed(6)}`;
    const url = `${PROFILE_URL[mode]}/${coords}?overview=false&geometries=geojson&steps=true&alternatives=false`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(response.status === 429
            ? 'El servidor de rutas está saturado. Intenta de nuevo en unos segundos.'
            : 'No se pudo calcular la ruta.');
    }
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
        throw new Error('No se encontró una ruta hasta este lugar.');
    }

    const osrmRoute = data.routes[0];
    const osrmSteps: OsrmStep[] = osrmRoute.legs.flatMap((leg: { steps: OsrmStep[] }) => leg.steps);

    // Construimos la linea completa a partir de la geometria de cada paso
    // para conocer en que punto empieza cada maniobra.
    const coordinates: LatLng[] = [];
    const steps: RouteStep[] = [];
    osrmSteps.forEach((step, idx) => {
        const points = step.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        const startIndex = Math.max(0, coordinates.length - (coordinates.length > 0 ? 1 : 0));
        // Evita duplicar el punto compartido entre pasos consecutivos
        points.forEach((pt, i) => {
            if (i === 0 && coordinates.length > 0) return;
            coordinates.push(pt);
        });
        const { text, icon } = buildInstruction(step, idx === osrmSteps.length - 1, destinationName);
        steps.push({
            instruction: text,
            icon,
            distance: step.distance,
            duration: step.duration,
            location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
            startIndex
        });
    });

    if (coordinates.length < 2) {
        coordinates.push({ ...from }, { ...to });
    }

    return {
        mode,
        distance: osrmRoute.distance,
        duration: osrmRoute.duration,
        coordinates,
        cumulative: cumulativeDistances(coordinates),
        steps
    };
}
