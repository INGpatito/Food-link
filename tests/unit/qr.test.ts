import test from 'node:test';
import assert from 'node:assert/strict';
import { renderQrSvg } from '../../src/explorar/qr.ts';

// Helper to extract binary QR module matrix from SVG
function extractModuleMatrix(svg: string): { matrix: number[][]; size: number; margin: number } {
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(viewBoxMatch, 'SVG must contain viewBox="0 0 W H"');
  const total = parseInt(viewBoxMatch[1], 10);

  // In Foodlink QR generator, margin is 2 modules
  const margin = 2;
  const size = total - margin * 2;

  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  const rectRegex = /<rect x="(\d+)" y="(\d+)" width="1" height="1"/g;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = rectRegex.exec(svg)) !== null) {
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    const r = y - margin;
    const c = x - margin;
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = 1;
      count++;
    }
  }

  assert.ok(count > 0, 'Extracted module count must be greater than zero');
  return { matrix, size, margin };
}

function matrixToString(matrix: number[][]): string {
  return matrix.map((row) => row.join('')).join('\n');
}

test('QR Unit: Valid SVG structure and attributes', () => {
  const payload = 'FOODLINK:FL-7K4M92';
  const svg = renderQrSvg(payload, 200);

  assert.ok(svg.startsWith('<svg'), 'SVG must start with <svg tag');
  assert.ok(svg.endsWith('</svg>'), 'SVG must end with </svg> tag');
  assert.ok(svg.includes('width="200"'), 'SVG must respect specified pixelSize');
  assert.ok(svg.includes('height="200"'), 'SVG must respect specified pixelSize');
  assert.ok(svg.includes('role="img"'), 'SVG must have role="img"');
  assert.ok(svg.includes(`aria-label="Código QR ${payload}"`), 'SVG must have aria-label with payload');
});

test('QR Unit: 18-byte pickup code encoding produces valid matrix and finder patterns', () => {
  const payload = 'FOODLINK:FL-7K4M92'; // exactly 18 characters
  const svg = renderQrSvg(payload, 180);
  const { matrix, size } = extractModuleMatrix(svg);

  // Version 1 (21x21) or Version 2 (25x25)
  assert.ok(size === 21 || size === 25, `Matrix size must be 21 or 25, got ${size}`);

  // Check top-left finder pattern (7x7 with center 3x3 filled)
  assert.strictEqual(matrix[0][0], 1, 'Top-left finder module (0,0) must be 1');
  assert.strictEqual(matrix[0][6], 1, 'Top-left finder module (0,6) must be 1');
  assert.strictEqual(matrix[6][0], 1, 'Top-left finder module (6,0) must be 1');
  assert.strictEqual(matrix[6][6], 1, 'Top-left finder module (6,6) must be 1');
  assert.strictEqual(matrix[3][3], 1, 'Top-left finder center (3,3) must be 1');

  // Check top-right finder pattern
  assert.strictEqual(matrix[0][size - 7], 1, 'Top-right finder module must be 1');
  assert.strictEqual(matrix[0][size - 1], 1, 'Top-right finder module must be 1');
  assert.strictEqual(matrix[6][size - 7], 1, 'Top-right finder module must be 1');

  // Check bottom-left finder pattern
  assert.strictEqual(matrix[size - 7][0], 1, 'Bottom-left finder module must be 1');
  assert.strictEqual(matrix[size - 1][0], 1, 'Bottom-left finder module must be 1');
  assert.strictEqual(matrix[size - 7][6], 1, 'Bottom-left finder module must be 1');
});

test('QR Unit: Zero trailing-character truncation on 18-byte codes', () => {
  // Payloads differing ONLY in the 18th character
  const codeA = 'FOODLINK:FL-7K4M92';
  const codeB = 'FOODLINK:FL-7K4M93';

  const svgA = renderQrSvg(codeA);
  const svgB = renderQrSvg(codeB);

  const matA = extractModuleMatrix(svgA);
  const matB = extractModuleMatrix(svgB);

  const strA = matrixToString(matA.matrix);
  const strB = matrixToString(matB.matrix);

  assert.notStrictEqual(
    strA,
    strB,
    'QR module matrix must NOT collide when the 18th character differs (zero trailing truncation)'
  );
});

test('QR Unit: Distinct codes produce distinct QR matrices', () => {
  const codes = [
    'FOODLINK:FL-ABCDEF',
    'FOODLINK:FL-ABCDEG',
    'FOODLINK:FL-111111',
    'FOODLINK:FL-111112',
    'FOODLINK:FL-999998',
    'FOODLINK:FL-999999'
  ];

  const seenMatrices = new Set<string>();

  for (const code of codes) {
    const svg = renderQrSvg(code);
    const { matrix } = extractModuleMatrix(svg);
    const representation = matrixToString(matrix);

    assert.ok(
      !seenMatrices.has(representation),
      `Matrix for code ${code} must be unique and not collide with previous codes`
    );
    seenMatrices.add(representation);
  }
});

test('QR Unit: Boundary payload lengths (17, 18, 19, 32 bytes)', () => {
  const lengths = [
    { len: 17, text: 'FOODLINK:FL-12345' },
    { len: 18, text: 'FOODLINK:FL-123456' },
    { len: 19, text: 'FOODLINK:FL-1234567' },
    { len: 32, text: 'FOODLINK:FL-0123456789ABCDEFGHIJ' }
  ];

  const generated = new Map<number, string>();

  for (const item of lengths) {
    assert.strictEqual(item.text.length, item.len);
    const svg = renderQrSvg(item.text);
    const { matrix, size } = extractModuleMatrix(svg);
    assert.ok(size >= 21, `Size must be at least 21 for length ${item.len}`);

    const repr = matrixToString(matrix);
    generated.set(item.len, repr);
  }

  // Verify all boundary lengths produce distinct module layouts
  const representations = Array.from(generated.values());
  const uniqueCount = new Set(representations).size;
  assert.strictEqual(uniqueCount, lengths.length, 'All boundary lengths must produce distinct QR matrices');
});

test('QR Unit: 17 vs 18 byte payload prefix preservation', () => {
  const code17 = 'FOODLINK:FL-7K4M9';
  const code18 = 'FOODLINK:FL-7K4M92';

  const svg17 = renderQrSvg(code17);
  const svg18 = renderQrSvg(code18);

  const mat17 = extractModuleMatrix(svg17);
  const mat18 = extractModuleMatrix(svg18);

  assert.notStrictEqual(
    matrixToString(mat17.matrix),
    matrixToString(mat18.matrix),
    '17-char and 18-char codes must produce different matrices'
  );
});
