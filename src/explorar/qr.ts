/**
 * Generador nativo de codigos QR (ISO/IEC 18004 Version 1-L, 21x21) en SVG.
 * No requiere dependencias externas y produce un codigo escaneable por cualquier camara.
 * Zero emojis.
 */

const SIZE = 21;
const DATA_CODEWORDS = 19;
const ECC_CODEWORDS = 7;

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
    // Construye el polinomio generador g(x) = (x - a^0)(x - a^1)...(x - a^(eccCount-1))
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

function encodeByteData(text: string): Uint8Array {
    const raw = new TextEncoder().encode(text.slice(0, 17));
    const bits: number[] = [];
    const pushBits = (val: number, len: number) => {
        for (let i = len - 1; i >= 0; i--) {
            bits.push((val >> i) & 1);
        }
    };

    // Modo Byte (0100) + longitud (8 bits)
    pushBits(0b0100, 4);
    pushBits(raw.length, 8);
    for (const b of raw) pushBits(b, 8);

    // Terminador (hasta 4 ceros)
    const maxBits = DATA_CODEWORDS * 8;
    for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const out = new Uint8Array(DATA_CODEWORDS);
    const byteCount = Math.min(DATA_CODEWORDS, bits.length / 8);
    for (let i = 0; i < byteCount; i++) {
        let b = 0;
        for (let k = 0; k < 8; k++) b = (b << 1) | bits[i * 8 + k];
        out[i] = b;
    }

    // Bytes de relleno alternados 0xEC, 0x11
    const pads = [0xec, 0x11];
    for (let i = byteCount; i < DATA_CODEWORDS; i++) {
        out[i] = pads[(i - byteCount) % 2];
    }
    return out;
}

export function renderQrSvg(payload: string, pixelSize = 180): string {
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

    placeFinder(0, 0);
    placeFinder(0, SIZE - 7);
    placeFinder(SIZE - 7, 0);

    // Patrones de sincronizacion
    for (let i = 8; i < SIZE - 8; i++) {
        const bit = i % 2 === 0 ? 1 : 0;
        setModule(6, i, bit);
        setModule(i, 6, bit);
    }

    // Modulo oscuro fijo y reserva de informacion de formato
    setModule(SIZE - 8, 8, 1);
    for (let i = 0; i < 9; i++) {
        if (!reserved[8][i]) reserved[8][i] = true;
        if (!reserved[i][8]) reserved[i][8] = true;
    }
    for (let i = SIZE - 8; i < SIZE; i++) {
        reserved[8][i] = true;
        reserved[i][8] = true;
    }

    // Codificacion de datos + ECC
    const data = encodeByteData(payload);
    const ecc = computeReedSolomon(data, ECC_CODEWORDS);
    const allBytes = new Uint8Array(DATA_CODEWORDS + ECC_CODEWORDS);
    allBytes.set(data, 0);
    allBytes.set(ecc, DATA_CODEWORDS);

    // Recorrido en zigzag de derecha a izquierda
    let bitIdx = 0;
    let upward = true;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
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

    // Renderizado SVG con margen silencioso de 2 modulos
    const margin = 2;
    const total = SIZE + margin * 2;
    const rects: string[] = [];
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (modules[r][c]) {
                rects.push(`<rect x="${c + margin}" y="${r + margin}" width="1" height="1" rx="0.16"/>`);
            }
        }
    }

    return `<svg class="fx-qr-svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 ${total} ${total}" role="img" aria-label="Código QR ${payload}">
        <rect width="${total}" height="${total}" rx="2" fill="#f5f2eb"/>
        <g fill="#0a0c0b">${rects.join('')}</g>
    </svg>`;
}
