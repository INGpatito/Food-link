import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderQrSvg,
  decodeQrSvg,
  generateQrMatrix,
  decodeQrMatrix,
  analyzeQrMatrix,
  verifyQrPayload,
  compareQrPayloads,
  isAlphanumeric,
  ALPHANUMERIC_CHARS,
  VERSIONS
} from '../../src/explorar/qr.ts';

test('Adversarial QR Stress: Character set coverage and isAlphanumeric oracle', () => {
  for (let i = 0; i < ALPHANUMERIC_CHARS.length; i++) {
    const char = ALPHANUMERIC_CHARS[i];
    assert.strictEqual(
      isAlphanumeric(char),
      true,
      `Character "${char}" must be recognized as alphanumeric`
    );
  }

  // Ensure invalid chars are NOT recognized as alphanumeric
  const nonAlphanumeric = ['a', 'z', '@', '#', '!', '_', 'ñ', 'á', '\n', '\t'];
  for (const char of nonAlphanumeric) {
    assert.strictEqual(
      isAlphanumeric(char),
      false,
      `Character "${char}" must NOT be recognized as alphanumeric`
    );
  }
});

test('Adversarial QR Stress: Required lengths (17, 18, 19, 25, 32, 50 chars) zero trailing truncation', () => {
  const lengths = [17, 18, 19, 25, 32, 50];

  for (const len of lengths) {
    // Construct prefix of length len - 1
    const basePrefix = 'FOODLINK:FL-'.padEnd(len - 1, 'X').slice(0, len - 1);
    const payloadA = `${basePrefix}A`;
    const payloadB = `${basePrefix}B`;

    assert.strictEqual(payloadA.length, len, `Payload A must have length ${len}`);
    assert.strictEqual(payloadB.length, len, `Payload B must have length ${len}`);

    // Generate matrices
    const matA = generateQrMatrix(payloadA);
    const matB = generateQrMatrix(payloadB);

    // Matrix dimensions must match
    assert.strictEqual(matA.length, matB.length, `Dimensions must match for length ${len}`);

    // Modules must differ because the last character differs
    const comparison = compareQrPayloads(payloadA, payloadB);
    assert.strictEqual(
      comparison.isIdentical,
      false,
      `Payloads differing only at position ${len} must produce distinct QR matrices (zero truncation)`
    );
    assert.ok(
      comparison.differingModulesCount > 0,
      `There must be differing modules for length ${len}`
    );

    // Round-trip decoding from SVG
    const svgA = renderQrSvg(payloadA);
    const svgB = renderQrSvg(payloadB);

    const decodedSvgA = decodeQrSvg(svgA);
    const decodedSvgB = decodeQrSvg(svgB);

    assert.strictEqual(
      decodedSvgA,
      payloadA,
      `Decoded SVG payload A must exactly match original string of length ${len}`
    );
    assert.strictEqual(
      decodedSvgB,
      payloadB,
      `Decoded SVG payload B must exactly match original string of length ${len}`
    );

    // Round-trip decoding from Matrix directly
    const decodedMatA = decodeQrMatrix(matA);
    const decodedMatB = decodeQrMatrix(matB);

    assert.strictEqual(decodedMatA, payloadA);
    assert.strictEqual(decodedMatB, payloadB);

    // Verification oracle
    const vResultA = verifyQrPayload(payloadA);
    const vResultB = verifyQrPayload(payloadB);

    assert.strictEqual(vResultA.isValid, true, `Payload A of length ${len} must be valid`);
    assert.strictEqual(vResultA.eccValid, true, `Payload A of length ${len} must pass ECC check`);
    assert.strictEqual(vResultB.isValid, true, `Payload B of length ${len} must be valid`);
    assert.strictEqual(vResultB.eccValid, true, `Payload B of length ${len} must pass ECC check`);
  }
});

test('Adversarial QR Stress: Extreme string contents (consecutive spaces, colons, all-chars sequence)', () => {
  const extremeStrings = [
    // All 45 valid alphanumeric characters
    ALPHANUMERIC_CHARS,
    // Consecutive colons
    '::::::::::::::::::::::::::::::::::::::::::::::::::', // 50 colons
    // Consecutive spaces
    '                                                  ', // 50 spaces
    // Alternating symbols
    '+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+', // 50 chars
    // Numbers only
    '01234567890123456789012345678901234567890123456789', // 50 chars
    // Letters only
    'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX', // 50 chars
    // Short boundary strings
    'A',
    'AB',
    'ABC',
    'FOODLINK:',
    'FOODLINK:FL-0',
    // Odd length boundary (17 chars: 8 pairs + 1 single char)
    'FOODLINK:FL-12345',
    // 25 chars (Version 1 Alphanumeric upper limit)
    '1234567890123456789012345',
    // 26 chars (Version 2 Alphanumeric lower limit)
    '12345678901234567890123456',
    // 47 chars (Version 2 Alphanumeric upper limit)
    '12345678901234567890123456789012345678901234567',
    // 48 chars (Version 3 Alphanumeric lower limit)
    '123456789012345678901234567890123456789012345678',
    // 77 chars (Version 3 Alphanumeric upper limit)
    '12345678901234567890123456789012345678901234567890123456789012345678901234567'
  ];

  for (const str of extremeStrings) {
    const analysis = analyzeQrMatrix(generateQrMatrix(str));
    assert.strictEqual(
      analysis.decoded,
      str,
      `Decoded string must strictly match input: "${str.slice(0, 20)}..." (length ${str.length})`
    );
    assert.strictEqual(analysis.eccValid, true, `ECC must be valid for "${str.slice(0, 20)}..."`);
    assert.strictEqual(analysis.mode, 'alphanumeric');

    // Also verify decodeQrSvg roundtrip
    const svg = renderQrSvg(str);
    const decodedFromSvg = decodeQrSvg(svg);
    assert.strictEqual(decodedFromSvg, str);
  }
});

test('Adversarial QR Stress: Byte mode strings at boundary lengths (17, 18, 19, 25, 32, 50 chars)', () => {
  // Lowercase and special characters trigger Byte mode
  const byteLengths = [17, 18, 19, 25, 32, 50];

  for (const len of byteLengths) {
    const raw = 'foodlink:fl-abc'.padEnd(len, 'z').slice(0, len);
    assert.strictEqual(raw.length, len);
    assert.strictEqual(isAlphanumeric(raw), false, 'Must be detected as non-alphanumeric (byte mode)');

    const matrix = generateQrMatrix(raw);
    const analysis = analyzeQrMatrix(matrix);

    assert.strictEqual(analysis.mode, 'byte');
    assert.strictEqual(analysis.decoded, raw);
    assert.strictEqual(analysis.eccValid, true);

    const svg = renderQrSvg(raw);
    const decodedSvg = decodeQrSvg(svg);
    assert.strictEqual(decodedSvg, raw);
  }
});

test('Adversarial QR Stress: Pseudorandom generator fuzzing (100 random payloads)', () => {
  let seed = 123456789;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let iteration = 0; iteration < 100; iteration++) {
    const len = Math.floor(pseudoRandom() * 50) + 1; // Length between 1 and 50
    let payload = '';
    for (let c = 0; c < len; c++) {
      const idx = Math.floor(pseudoRandom() * ALPHANUMERIC_CHARS.length);
      payload += ALPHANUMERIC_CHARS[idx];
    }

    const svg = renderQrSvg(payload);
    const decoded = decodeQrSvg(svg);
    assert.strictEqual(
      decoded,
      payload,
      `Fuzz test failed at iteration ${iteration} for payload length ${len}: "${payload}"`
    );

    const verification = verifyQrPayload(payload);
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.eccValid, true);
  }
});

test('Adversarial QR Stress: Payload capacity overflow rejection', () => {
  // Version 4 max alphanumeric is 114 chars. 115 should throw an error.
  const overflowAlpha = 'A'.repeat(115);
  assert.throws(
    () => generateQrMatrix(overflowAlpha),
    /Payload exceeds maximum capacity/,
    'Alphanumeric payload exceeding v4 capacity must throw an explicit error'
  );

  // Version 4 max byte is 78 bytes. 79 should throw an error.
  const overflowByte = 'a'.repeat(79);
  assert.throws(
    () => generateQrMatrix(overflowByte),
    /Payload exceeds maximum capacity/,
    'Byte payload exceeding v4 capacity must throw an explicit error'
  );
});
