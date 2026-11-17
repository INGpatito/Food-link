/**
 * Generador y decodificador nativo de codigos QR (ISO/IEC 18004).
 * Soporta Modo Alfanumerico (Versiones 1 y 2) y Modo Byte (Versiones 1 a 4).
 * Cero dependencias externas, codificacion y decodificacion sin perdidas.
 * Zero emojis.
 */

export interface QrMatrixAnalysis {
    version: number;
    size: number;
    mode: 'alphanumeric' | 'byte';
    decoded: string;
    darkModulesCount: number;
    lightModulesCount: number;
    eccValid: boolean;
}

export interface QrVerificationResult {
    isValid: boolean;
    payload: string;
    decoded: string;
    version: number;
    size: number;
    mode: 'alphanumeric' | 'byte';
    eccValid: boolean;
    error?: string;
}

export interface VersionSpec {
    version: number;
    size: number;
    dataCodewords: number;
    eccCodewords: number;
    alignmentCenter: [number, number] | null;
    alphaMax: number;
    byteMax: number;
}

// Tabla log/antilog en GF(256) con polinomio primitivo 0x11d
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP[i] = x;
        LOG[x] = i;
        x <<= 1;
        if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
        EXP[i] = EXP[i - 255];
    }
})();

function gfMul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
}

function computeReedSolomon(data: Uint8Array, eccCount: number): Uint8Array {
    let gen = new Uint8Array([1]);
    for (let i = 0; i < eccCount; i++) {
        const next = new Uint8Array(gen.length + 1);
        const factor = EXP[i];
        for (let j = 0; j < gen.length; j++) {
            next[j] ^= gen[j];
            next[j + 1] ^= gfMul(gen[j], factor);
        }
        gen = next;
    }

    const rem = new Uint8Array(eccCount);
    for (let i = 0; i < data.length; i++) {
        const coef = data[i] ^ rem[0];
        for (let j = 0; j < eccCount - 1; j++) {
            rem[j] = rem[j + 1];
        }
        rem[eccCount - 1] = 0;
        if (coef !== 0) {
            for (let j = 0; j < eccCount; j++) {
                rem[j] ^= gfMul(gen[j + 1], coef);
            }
        }
    }
    return rem;
}

export const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const ALPHANUMERIC_MAP: Record<string, number> = {};
for (let i = 0; i < ALPHANUMERIC_CHARS.length; i++) {
    ALPHANUMERIC_MAP[ALPHANUMERIC_CHARS[i]] = i;
}

export function isAlphanumeric(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
        if (!(text[i] in ALPHANUMERIC_MAP)) return false;
    }
    return true;
}

export const VERSIONS: readonly VersionSpec[] = [
    { version: 1, size: 21, dataCodewords: 19, eccCodewords: 7, alignmentCenter: null, alphaMax: 25, byteMax: 17 },
    { version: 2, size: 25, dataCodewords: 34, eccCodewords: 10, alignmentCenter: [18, 18], alphaMax: 47, byteMax: 32 },
    { version: 3, size: 29, dataCodewords: 55, eccCodewords: 15, alignmentCenter: [22, 22], alphaMax: 77, byteMax: 53 },
    { version: 4, size: 33, dataCodewords: 80, eccCodewords: 20, alignmentCenter: [26, 26], alphaMax: 114, byteMax: 78 }
];

export function selectVersionAndMode(text: string): { version: VersionSpec; mode: 'alphanumeric' | 'byte' } {
    const alpha = isAlphanumeric(text);
    const rawBytes = new TextEncoder().encode(text);
    for (const v of VERSIONS) {
        if (alpha && text.length <= v.alphaMax) {
            return { version: v, mode: 'alphanumeric' };
        }
        if (rawBytes.length <= v.byteMax) {
            return { version: v, mode: 'byte' };
        }
    }
    throw new Error(`Payload exceeds maximum capacity: ${text.length} characters / ${rawBytes.length} bytes`);
}

function encodeData(text: string, vSpec: VersionSpec, mode: 'alphanumeric' | 'byte'): Uint8Array {
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((val >> i) & 1);
        }
    };

    if (mode === 'alphanumeric') {
        // Modo Alfanumerico (0010) + conteo de caracteres (9 bits para Versiones 1 a 9)
        pushBits(0b0010, 4);
        pushBits(text.length, 9);
        for (let i = 0; i < text.length; i += 2) {
            if (i + 1 < text.length) {
                const val = ALPHANUMERIC_MAP[text[i]] * 45 + ALPHANUMERIC_MAP[text[i + 1]];
                pushBits(val, 11);
            } else {
                pushBits(ALPHANUMERIC_MAP[text[i]], 6);
            }
        }
    } else {
        // Modo Byte (0100) + conteo de bytes (8 bits para Versiones 1 a 9)
        const raw = new TextEncoder().encode(text);
        pushBits(0b0100, 4);
        pushBits(raw.length, 8);
        for (const b of raw) pushBits(b, 8);
    }

    const maxBits = vSpec.dataCodewords * 8;
    // Terminador (hasta 4 ceros sin exceder maxBits)
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    // Relleno a frontera de byte
    while (bits.length % 8 !== 0 && bits.length < maxBits) bits.push(0);

    const out = new Uint8Array(vSpec.dataCodewords);
    const byteCount = Math.min(vSpec.dataCodewords, Math.floor(bits.length / 8));
    for (let i = 0; i < byteCount; i++) {
        let b = 0;
        for (let k = 0; k < 8; k++) b = (b << 1) | bits[i * 8 + k];
        out[i] = b;
    }

    // Codewords de relleno alternados 0xEC, 0x11
    const pads = [0xec, 0x11];
    for (let i = byteCount; i < vSpec.dataCodewords; i++) {
        out[i] = pads[(i - byteCount) % 2];
    }
    return out;
}

export function generateQrMatrix(payload: string): number[][] {
    const { version: vSpec, mode } = selectVersionAndMode(payload);
    const SIZE = vSpec.size;
    const modules: number[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    const reserved: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

    const setModule = (r: number, c: number, val: number) => {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
        modules[r][c] = val;
        reserved[r][c] = true;
    };

    const placeFinder = (topR: number, leftC: number) => {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                const r = topR + dr;
                const c = leftC + dc;
                if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
                const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
                const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
                const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
                setModule(r, c, inOuter && (onBorder || inCenter) ? 1 : 0);
            }
        }
    };

    // Tres patrones de busqueda (superior izq, superior der, inferior izq)
    placeFinder(0, 0);
    placeFinder(0, SIZE - 7);
    placeFinder(SIZE - 7, 0);

    // Patrones de sincronizacion
    for (let i = 8; i < SIZE - 8; i++) {
        const bit = i % 2 === 0 ? 1 : 0;
        setModule(6, i, bit);
        setModule(i, 6, bit);
    }

    // Patron de alineacion para Versiones >= 2
    if (vSpec.alignmentCenter) {
        const [cr, cc] = vSpec.alignmentCenter;
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const r = cr + dr;
                const c = cc + dc;
                const isOuter = Math.abs(dr) === 2 || Math.abs(dc) === 2;
                const isCenter = dr === 0 && dc === 0;
                setModule(r, c, (isOuter || isCenter) ? 1 : 0);
            }
        }
    }

    // Modulo oscuro fijo en (SIZE - 8, 8)
    setModule(SIZE - 8, 8, 1);

    // Reserva de areas de informacion de formato
    for (let i = 0; i < 9; i++) {
        if (!reserved[8][i]) reserved[8][i] = true;
        if (!reserved[i][8]) reserved[i][8] = true;
    }
    for (let i = SIZE - 8; i < SIZE; i++) {
        reserved[8][i] = true;
        reserved[i][8] = true;
    }

    // Codificacion de datos y calculo Reed-Solomon
    const data = encodeData(payload, vSpec, mode);
    const ecc = computeReedSolomon(data, vSpec.eccCodewords);
    const allBytes = new Uint8Array(vSpec.dataCodewords + vSpec.eccCodewords);
    allBytes.set(data, 0);
    allBytes.set(ecc, vSpec.dataCodewords);

    // Colocacion en zigzag de derecha a izquierda
    let bitIdx = 0;
    let upward = true;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5; // Salta sincronizacion vertical
        for (let vert = 0; vert < SIZE; vert++) {
            const r = upward ? SIZE - 1 - vert : vert;
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                if (reserved[r][c]) continue;
                let bit = 0;
                if (bitIdx < allBytes.length * 8) {
                    bit = (allBytes[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
                    bitIdx++;
                }
                // Mascara 0: (r + c) % 2 === 0
                if ((r + c) % 2 === 0) bit ^= 1;
                modules[r][c] = bit;
            }
        }
        upward = !upward;
    }

    // Informacion de formato para Nivel L (01) y Mascara 0 (000) -> 0x77c4 (15 bits)
    const formatBits = 0x77c4;
    const fBit = (i: number) => (formatBits >> i) & 1;

    // Alrededor del buscador superior izquierdo
    const fCols = [0, 1, 2, 3, 4, 5, 7, 8];
    for (let i = 0; i < 8; i++) modules[8][fCols[i]] = fBit(14 - i);
    const fRows = [7, 5, 4, 3, 2, 1, 0];
    for (let i = 0; i < 7; i++) modules[fRows[i]][8] = fBit(6 - i);

    // Esquinas inferior izquierda y superior derecha
    for (let i = 0; i < 7; i++) modules[SIZE - 1 - i][8] = fBit(14 - i);
    for (let i = 0; i < 8; i++) modules[8][SIZE - 8 + i] = fBit(7 - i);

    return modules;
}

export function renderQrSvg(payload: string, pixelSize = 180): string {
    const modules = generateQrMatrix(payload);
    const size = modules.length;
    const margin = 2;
    const total = size + margin * 2;
    const rects: string[] = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (modules[r][c]) {
                rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" rx="0.16"/>`);
            }
        }
    }

    const safeLabel = String(payload)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return `<svg class="fx-qr-svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${total} ${total}" role="img" aria-label="Código QR ${safeLabel}">
        <rect width="${total}" height="${total}" rx="2" fill="#f5f2eb"/>
        <g fill="#0a0c0b">${rects.join('')}</g>
    </svg>`;
}

export function decodeQrMatrix(modules: number[][]): string {
    return analyzeQrMatrix(modules).decoded;
}

export function decodeQrSvg(svg: string, margin = 2): string {
    const vbMatch = svg.match(/viewBox=["']\s*0\s+0\s+(\d+)\s+(\d+)\s*["']/i);
    if (!vbMatch) {
        throw new Error('SVG invalido: viewBox no encontrado');
    }
    const total = parseInt(vbMatch[1], 10);
    const size = total - margin * 2;
    if (size < 21) {
        throw new Error(`Dimension de matriz invalida en SVG: ${size}`);
    }
    const modules: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

    const rectMatches = svg.matchAll(/<rect\b([^>]+)>/gi);
    for (const match of rectMatches) {
        const attrs = match[1];
        const xMatch = attrs.match(/\bx=["'](\d+)["']/);
        const yMatch = attrs.match(/\by=["'](\d+)["']/);
        const wMatch = attrs.match(/\bwidth=["'](\d+)["']/);
        const hMatch = attrs.match(/\bheight=["'](\d+)["']/);
        if (xMatch && yMatch && (!wMatch || wMatch[1] === '1') && (!hMatch || hMatch[1] === '1')) {
            const x = parseInt(xMatch[1], 10);
            const y = parseInt(yMatch[1], 10);
            const c = x - margin;
            const r = y - margin;
            if (r >= 0 && r < size && c >= 0 && c < size) {
                modules[r][c] = 1;
            }
        }
    }

    return decodeQrMatrix(modules);
}

export function decodeQr(input: string | number[][]): string {
    if (Array.isArray(input)) {
        return decodeQrMatrix(input);
    }
    if (typeof input === 'string') {
        if (input.includes('<svg')) {
            return decodeQrSvg(input);
        }
        return decodeQrSvg(input);
    }
    throw new Error('Tipo de entrada no soportado para decodeQr');
}

export function analyzeQrMatrix(modules: number[][]): QrMatrixAnalysis {
    const SIZE = modules.length;
    const versionNum = (SIZE - 17) / 4;
    const vSpec = VERSIONS.find(v => v.version === versionNum);
    if (!vSpec) {
        throw new Error(`Tamano o version QR no soportada: ${SIZE} (Version ${versionNum})`);
    }

    let darkCount = 0;
    let lightCount = 0;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (modules[r][c] === 1) darkCount++;
            else lightCount++;
        }
    }

    // Reconstruccion de mascara reservada
    const reserved: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const markReserved = (r: number, c: number) => {
        if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) reserved[r][c] = true;
    };

    const placeFinderReserved = (topR: number, leftC: number) => {
        for (let dr = -1; dr <= 7; dr++) {
            for (let dc = -1; dc <= 7; dc++) {
                markReserved(topR + dr, leftC + dc);
            }
        }
    };
    placeFinderReserved(0, 0);
    placeFinderReserved(0, SIZE - 7);
    placeFinderReserved(SIZE - 7, 0);

    for (let i = 8; i < SIZE - 8; i++) {
        markReserved(6, i);
        markReserved(i, 6);
    }

    if (vSpec.alignmentCenter) {
        const [cr, cc] = vSpec.alignmentCenter;
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                markReserved(cr + dr, cc + dc);
            }
        }
    }

    markReserved(SIZE - 8, 8);

    for (let i = 0; i < 9; i++) {
        markReserved(8, i);
        markReserved(i, 8);
    }
    for (let i = SIZE - 8; i < SIZE; i++) {
        markReserved(8, i);
        markReserved(i, 8);
    }

    // Lectura de informacion de formato
    const fCols = [0, 1, 2, 3, 4, 5, 7, 8];
    const fRows = [7, 5, 4, 3, 2, 1, 0];
    let rawFormat = 0;
    for (let i = 0; i < 8; i++) rawFormat = (rawFormat << 1) | (modules[8][fCols[i]] & 1);
    for (let i = 0; i < 7; i++) rawFormat = (rawFormat << 1) | (modules[fRows[i]][8] & 1);
    const unmaskedFormat = rawFormat ^ 0x5412;
    const mask = (unmaskedFormat >> 10) & 0x7;

    const isMask = (r: number, c: number): boolean => {
        if (mask === 0) return (r + c) % 2 === 0;
        if (mask === 1) return r % 2 === 0;
        if (mask === 2) return c % 3 === 0;
        if (mask === 3) return (r + c) % 3 === 0;
        if (mask === 4) return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        if (mask === 5) return ((r * c) % 2 + (r * c) % 3) === 0;
        if (mask === 6) return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
        return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
    };

    const bits: number[] = [];
    let upward = true;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < SIZE; vert++) {
            const r = upward ? SIZE - 1 - vert : vert;
            for (let j = 0; j < 2; j++) {
                const c = right - j;
                if (reserved[r][c]) continue;
                let bit = modules[r][c] & 1;
                if (isMask(r, c)) bit ^= 1;
                bits.push(bit);
            }
        }
        upward = !upward;
    }

    // Extraccion de codewords
    const totalCodewords = vSpec.dataCodewords + vSpec.eccCodewords;
    const extractedCodewords = new Uint8Array(totalCodewords);
    for (let i = 0; i < totalCodewords; i++) {
        let b = 0;
        for (let k = 0; k < 8; k++) {
            b = (b << 1) | bits[i * 8 + k];
        }
        extractedCodewords[i] = b;
    }

    const dataCodewords = extractedCodewords.slice(0, vSpec.dataCodewords);
    const eccCodewords = extractedCodewords.slice(vSpec.dataCodewords);
    const computedEcc = computeReedSolomon(dataCodewords, vSpec.eccCodewords);
    let eccMatches = true;
    for (let i = 0; i < vSpec.eccCodewords; i++) {
        if (eccCodewords[i] !== computedEcc[i]) {
            eccMatches = false;
            break;
        }
    }

    let bitIdx = 0;
    const readBits = (len: number): number => {
        let val = 0;
        for (let i = 0; i < len; i++) val = (val << 1) | bits[bitIdx++];
        return val;
    };

    const modeBits = readBits(4);
    let decoded = '';
    let modeName: 'alphanumeric' | 'byte';

    if (modeBits === 0b0010) {
        modeName = 'alphanumeric';
        const count = readBits(9);
        let charsRead = 0;
        while (charsRead < count) {
            if (count - charsRead >= 2) {
                const val = readBits(11);
                const c1 = Math.floor(val / 45);
                const c2 = val % 45;
                decoded += ALPHANUMERIC_CHARS[c1] + ALPHANUMERIC_CHARS[c2];
                charsRead += 2;
            } else {
                const val = readBits(6);
                decoded += ALPHANUMERIC_CHARS[val];
                charsRead += 1;
            }
        }
    } else if (modeBits === 0b0100) {
        modeName = 'byte';
        const count = readBits(8);
        const outBytes = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
            outBytes[i] = readBits(8);
        }
        decoded = new TextDecoder().decode(outBytes);
    } else {
        throw new Error(`Modo de codificacion desconocido o no soportado: 0b${modeBits.toString(2).padStart(4, '0')}`);
    }

    return {
        version: vSpec.version,
        size: SIZE,
        mode: modeName,
        decoded,
        darkModulesCount: darkCount,
        lightModulesCount: lightCount,
        eccValid: eccMatches
    };
}

export function verifyQrPayload(payload: string): QrVerificationResult {
    try {
        const matrix = generateQrMatrix(payload);
        const analysis = analyzeQrMatrix(matrix);
        return {
            isValid: analysis.decoded === payload && analysis.eccValid,
            payload,
            decoded: analysis.decoded,
            version: analysis.version,
            size: analysis.size,
            mode: analysis.mode,
            eccValid: analysis.eccValid
        };
    } catch (err: unknown) {
        return {
            isValid: false,
            payload,
            decoded: '',
            version: 0,
            size: 0,
            mode: 'byte',
            eccValid: false,
            error: err instanceof Error ? err.message : String(err)
        };
    }
}

export function compareQrPayloads(payloadA: string, payloadB: string): {
    matrixADimensions: number;
    matrixBDimensions: number;
    differingModulesCount: number;
    isIdentical: boolean;
} {
    const mA = generateQrMatrix(payloadA);
    const mB = generateQrMatrix(payloadB);
    const dimA = mA.length;
    const dimB = mB.length;
    if (dimA !== dimB) {
        return {
            matrixADimensions: dimA,
            matrixBDimensions: dimB,
            differingModulesCount: Math.abs(dimA * dimA - dimB * dimB),
            isIdentical: false
        };
    }

    let diffs = 0;
    for (let r = 0; r < dimA; r++) {
        for (let c = 0; c < dimA; c++) {
            if (mA[r][c] !== mB[r][c]) diffs++;
        }
    }
    return {
        matrixADimensions: dimA,
        matrixBDimensions: dimB,
        differingModulesCount: diffs,
        isIdentical: diffs === 0
    };
}
