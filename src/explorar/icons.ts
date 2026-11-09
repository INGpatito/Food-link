/**
 * Iconos SVG en linea para el mapa de rescate (sin emojis, igual que el resto del sitio).
 */

const svg = (body: string, size = 18, extra = ''): string =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
    cloche: (s = 18) => svg('<path d="M12 4v2"/><path d="M4 18h16"/><path d="M5 18a7 7 0 0114 0"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>', s),
    search: (s = 18) => svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', s),
    locate: (s = 18) => svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>', s),
    back: (s = 18) => svg('<path d="M15 18l-6-6 6-6"/>', s),
    close: (s = 18) => svg('<path d="M6 6l12 12M18 6L6 18"/>', s),
    clock: (s = 16) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', s),
    pin: (s = 16) => svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>', s),
    phone: (s = 16) => svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>', s),
    route: (s = 18) => svg('<circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="5" r="2.2"/><path d="M8.2 19H15a3.5 3.5 0 000-7H9a3.5 3.5 0 010-7h6.8"/>', s),
    navigate: (s = 18) => svg('<path d="M12 2l7 19-7-4-7 4 7-19z" fill="currentColor" stroke="none"/>', s),
    walk: (s = 18) => svg('<circle cx="13" cy="4" r="1.8"/><path d="M10 21l2-6 3 3v3"/><path d="M8 11l3-3.5 3 1.5 2 3"/><path d="M11 7.5L10 14"/>', s),
    bike: (s = 18) => svg('<circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8"/><path d="M10 9L8.5 6H7"/><path d="M12 17l3-8"/>', s),
    car: (s = 18) => svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r="0.8" fill="currentColor"/><circle cx="16.5" cy="13.5" r="0.8" fill="currentColor"/>', s),
    check: (s = 18) => svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', s),
    tag: (s = 14) => svg('<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor"/>', s),
    gift: (s = 14) => svg('<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-2-4-6-4-6-1.5S9 9 12 9zM12 9c2-4 6-4 6-1.5S15 9 12 9z"/>', s),
    alert: (s = 14) => svg('<path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r="0.6" fill="currentColor"/>', s),
    crosshair: (s = 18) => svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>', s),
    shield: (s = 13) => svg('<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>', s),
    user: (s = 16) => svg('<circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0114 0"/>', s),
    list: (s = 18) => svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor"/><circle cx="3.5" cy="12" r="1" fill="currentColor"/><circle cx="3.5" cy="18" r="1" fill="currentColor"/>', s),
    layers: (s = 18) => svg('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/>', s),
    map: (s = 18) => svg('<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15"/><path d="M15 6v15"/>', s),
    plus: (s = 18) => svg('<path d="M12 5v14M5 12h14"/>', s),
    minus: (s = 18) => svg('<path d="M5 12h14"/>', s),
    heart: (s = 16) => svg('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>', s),
    heartFilled: (s = 16) => svg('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" fill="currentColor"/>', s),
    star: (s = 14) => svg('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.5z"/>', s),
    starFilled: (s = 14) => svg('<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.5z" fill="currentColor"/>', s),
    qr: (s = 18) => svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="5.5" y="5.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="16.5" y="5.5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="5.5" y="16.5" width="2" height="2" fill="currentColor" stroke="none"/><path d="M14 14h3v3h-3zM18 17h3v4h-3zM14 19h2v2h-2zM19 14h2v2h-2z"/>', s),
    ticket: (s = 18) => svg('<path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v1.5a2 2 0 000 3V15a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.5a2 2 0 000-3V9z"/><path d="M9.5 7v10" stroke-dasharray="2 2"/>', s),
    leaf: (s = 18) => svg('<path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5.1-6C9.5 14.5 12 13 13 12"/>', s),
    store: (s = 18) => svg('<path d="M3 9l1.8-5h14.4L21 9"/><path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0"/><path d="M5 12v8h14v-8"/><path d="M9 20v-5h6v5"/>', s),
    bell: (s = 16) => svg('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>', s),
    bolt: (s = 15) => svg('<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>', s),
    chart: (s = 16) => svg('<path d="M18 20V10M12 20V4M6 20v-6"/>', s),
    award: (s = 18) => svg('<circle cx="12" cy="8.5" r="5.5"/><path d="M8.5 13l-1.5 8 5-2.5 5 2.5-1.5-8"/>', s)
};

const MANEUVER_ROTATION: Record<string, number> = {
    straight: 0,
    'slight right': 40,
    right: 90,
    'sharp right': 135,
    uturn: 180,
    'sharp left': -135,
    left: -90,
    'slight left': -40
};

/** Icono de maniobra para las instrucciones paso a paso. */
export function maneuverIcon(kind: string, size = 22): string {
    if (kind === 'arrive') return icons.pin(size);
    if (kind === 'roundabout') {
        return svg('<circle cx="12" cy="13" r="4.5"/><path d="M12 8.5V3M9.5 1.8L12 3l2.5-1.2"/><path d="M12 17.5V22"/>', size);
    }
    if (kind === 'uturn') {
        return svg('<path d="M8 21V10a4 4 0 018 0v4"/><path d="M13 11l3 3 3-3"/>', size);
    }
    const angle = MANEUVER_ROTATION[kind] ?? 0;
    return svg('<path d="M12 21V8"/><path d="M7 12l5-5 5 5"/>', size, `style="transform: rotate(${angle}deg)"`);
}
