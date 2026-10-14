import * as THREE from 'three';

/**
 * Generates photorealistic procedural PBR materials and canvas textures for the solid
 * cross-sectional caps of the dissected gourmet burger.
 *
 * Each layer receives authentic food interiors:
 * - Brioche Bun: warm golden bread crumb with soft dough density, delicate yeast pores, and butter-toasted sear.
 * - Angus Patty: coarse grilled beef grain, caramelized sear crust, roasted marbling, and juicy sheen.
 * - Melted Cheese: rich golden farmhouse cheddar with soft melted folds and silky gloss.
 * - Tomato: ripe succulent ruby pulp, fleshy columella, locular seed chambers with amber seeds.
 * - Lettuce: vibrant garden emerald greens with pale branching leaf ribs and crisp cell texture.
 */

const textureCache = new Map<string, THREE.CanvasTexture>();

function createNoiseOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  minR: number,
  maxR: number,
  colors: string[]
) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = minR + Math.random() * (maxR - minR);
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Brioche bread crumb texture: warm, golden, airy dough with natural yeast pores and toasted butter glaze.
 */
function createBriocheTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Warm artisanal brioche base
  ctx.fillStyle = '#e5cca0';
  ctx.fillRect(0, 0, size, size);

  // 2. Soft organic dough density clouds
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 80 + Math.random() * 240;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const isLight = Math.random() > 0.5;
    grad.addColorStop(0, isLight ? 'rgba(250, 238, 215, 0.38)' : 'rgba(215, 185, 140, 0.32)');
    grad.addColorStop(1, 'rgba(229, 204, 160, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Toasted butter sear ring (gourmet flat-top grill mark)
  const searGrad = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size * 0.44);
  searGrad.addColorStop(0, 'rgba(195, 135, 60, 0.35)');
  searGrad.addColorStop(0.5, 'rgba(215, 155, 75, 0.42)');
  searGrad.addColorStop(0.85, 'rgba(180, 120, 50, 0.25)');
  searGrad.addColorStop(1, 'rgba(229, 204, 160, 0)');
  ctx.fillStyle = searGrad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 4. Fine bread crumb micro-pores
  createNoiseOverlay(ctx, size, size, 4500, 1.2, 3.5, [
    'rgba(180, 135, 80, 0.38)',
    'rgba(160, 115, 65, 0.42)',
    'rgba(205, 165, 115, 0.28)',
  ]);

  // 5. Medium yeast bubble cavities with soft light rim
  for (let i = 0; i < 480; i++) {
    const x = 40 + Math.random() * (size - 80);
    const y = 40 + Math.random() * (size - 80);
    const r = 3.5 + Math.random() * 5.5;

    ctx.fillStyle = 'rgba(150, 100, 50, 0.50)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 248, 230, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x - 0.5, y - 0.5, r, Math.PI * 0.9, Math.PI * 1.8);
    ctx.stroke();
  }

  // 6. Perimeter warm crust vignette
  const borderVignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size * 0.50);
  borderVignette.addColorStop(0, 'rgba(170, 110, 45, 0)');
  borderVignette.addColorStop(1, 'rgba(145, 90, 35, 0.42)');
  ctx.fillStyle = borderVignette;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Angus beef patty texture: coarse ground chuck with caramelized grill sear crust, roasted marbling, and juicy sheen.
 */
function createPattyTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep roasted beef base
  ctx.fillStyle = '#341c12';
  ctx.fillRect(0, 0, size, size);

  // 2. Coarse ground meat chunks & grain
  createNoiseOverlay(ctx, size, size, 6000, 2.5, 7.5, [
    'rgba(72, 42, 28, 0.75)',
    'rgba(38, 18, 11, 0.80)',
    'rgba(88, 52, 34, 0.65)',
    'rgba(26, 12, 7, 0.90)',
  ]);

  // 3. Marbling fat specks and pepper flakes
  createNoiseOverlay(ctx, size, size, 700, 1.5, 3.8, [
    'rgba(140, 88, 56, 0.55)',
    'rgba(118, 70, 44, 0.50)',
    'rgba(16, 8, 4, 0.90)', // Cracked pepper
  ]);

  // 4. Diagonal grill sear marks
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4);
  const grillSpacing = 85;
  for (let x = -size; x < size; x += grillSpacing) {
    ctx.fillStyle = 'rgba(18, 9, 4, 0.52)';
    ctx.fillRect(x - 12, -size, 24, size * 2);
    ctx.fillStyle = 'rgba(100, 50, 24, 0.25)';
    ctx.fillRect(x - 22, -size, 10, size * 2);
    ctx.fillRect(x + 12, -size, 10, size * 2);
  }
  ctx.restore();

  // 5. Glistening juice droplets
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2.0 + Math.random() * 4.5;
    const gloss = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, r);
    gloss.addColorStop(0, 'rgba(255, 235, 205, 0.35)');
    gloss.addColorStop(0.5, 'rgba(210, 140, 70, 0.20)');
    gloss.addColorStop(1, 'rgba(52, 28, 18, 0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Melted cheddar cheese texture: creamy golden cheddar melt swirls with silky butterfat gloss.
 */
function createCheeseTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich golden cheddar base
  ctx.fillStyle = '#f39c12';
  ctx.fillRect(0, 0, size, size);

  // 2. Melt gradients and soft organic cheese swirls
  for (let i = 0; i < 45; i++) {
    const x1 = Math.random() * size;
    const y1 = Math.random() * size;
    const x2 = x1 + (Math.random() - 0.5) * 380;
    const y2 = y1 + (Math.random() - 0.5) * 380;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    const isDeep = Math.random() > 0.4;
    grad.addColorStop(0, isDeep ? 'rgba(210, 85, 0, 0.30)' : 'rgba(248, 185, 55, 0.38)');
    grad.addColorStop(1, 'rgba(243, 156, 18, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 45 + Math.random() * 85;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(
      (x1 + x2) / 2 + (Math.random() - 0.5) * 80,
      (y1 + y2) / 2 + (Math.random() - 0.5) * 80,
      x2,
      y2
    );
    ctx.stroke();
  }

  // 3. Butterfat gloss highlights
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 25 + Math.random() * 65;
    const gloss = ctx.createRadialGradient(x, y, 0, x, y, r);
    gloss.addColorStop(0, 'rgba(255, 248, 220, 0.38)');
    gloss.addColorStop(1, 'rgba(243, 156, 18, 0)');
    ctx.fillStyle = gloss;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Fresh tomato slice texture: succulent ruby red pulp, fleshy septa walls, 5 locular chambers with amber seeds and translucent jelly.
 */
function createTomatoTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Succulent vine-ripe red flesh base
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(0, 0, size, size);

  // 2. Fleshy central columella core
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 115);
  coreGrad.addColorStop(0, '#d32f2f');
  coreGrad.addColorStop(0.7, '#c62828');
  coreGrad.addColorStop(1, '#b71c1c');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 115, 0, Math.PI * 2);
  ctx.fill();

  // 3. 5 organic locular seed chambers
  const numLocules = 5;
  for (let i = 0; i < numLocules; i++) {
    const ang = i * (Math.PI * 2 / numLocules);
    const lx = cx + Math.cos(ang) * 255;
    const ly = cy + Math.sin(ang) * 255;

    const poolGrad = ctx.createRadialGradient(lx, ly, 15, lx, ly, 125);
    poolGrad.addColorStop(0, '#7f1212');
    poolGrad.addColorStop(0.6, '#9c1818');
    poolGrad.addColorStop(1, 'rgba(183, 28, 28, 0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.arc(lx, ly, 125, 0, Math.PI * 2);
    ctx.fill();

    for (let s = 0; s < 4; s++) {
      const sang = ang + (s - 1.5) * 0.35;
      const sx = lx + Math.cos(sang) * 55;
      const sy = ly + Math.sin(sang) * 55;

      ctx.fillStyle = 'rgba(150, 25, 25, 0.65)';
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 11, 8, sang, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff9c4';
      ctx.beginPath();
      ctx.ellipse(sx - 2, sy - 2, 5, 3, sang, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Fleshy septa dividing walls between chambers
  for (let i = 0; i < numLocules; i++) {
    const ang = (i + 0.5) * (Math.PI * 2 / numLocules);
    const ex = cx + Math.cos(ang) * 390;
    const ey = cy + Math.sin(ang) * 390;

    const wallGrad = ctx.createLinearGradient(cx, cy, ex, ey);
    wallGrad.addColorStop(0, '#d32f2f');
    wallGrad.addColorStop(0.5, '#c62828');
    wallGrad.addColorStop(1, '#a81818');

    ctx.strokeStyle = wallGrad;
    ctx.lineWidth = 55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  // 5. Outer pericarp wall & skin rim
  const rimGrad = ctx.createRadialGradient(cx, cy, size * 0.38, cx, cy, size * 0.50);
  rimGrad.addColorStop(0, 'rgba(183, 28, 28, 0)');
  rimGrad.addColorStop(0.7, 'rgba(155, 20, 20, 0.45)');
  rimGrad.addColorStop(1, 'rgba(125, 12, 12, 0.85)');
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 6. Wet specular highlights
  for (let i = 0; i < 75; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 5.5;
    ctx.fillStyle = 'rgba(255, 225, 225, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Crisp garden lettuce texture: rich, gourmet emerald-to-forest greens with delicate leaf veins and crisp ruffled layers.
 */
function createLettuceTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Deep gourmet garden green base (not pale mint!)
  ctx.fillStyle = '#22543d';
  ctx.fillRect(0, 0, size, size);

  // 2. Leaf cell mottling & ruffled gradients in rich leaf tones
  createNoiseOverlay(ctx, size, size, 2200, 10, 35, [
    'rgba(47, 133, 90, 0.55)',
    'rgba(34, 84, 61, 0.60)',
    'rgba(56, 161, 105, 0.45)',
    'rgba(20, 60, 40, 0.70)',
    'rgba(72, 187, 120, 0.35)',
  ]);

  // 3. Branching leaf vein network radiating outwards
  for (let v = 0; v < 16; v++) {
    const ang = v * (Math.PI * 2 / 16) + (Math.random() - 0.5) * 0.2;
    const ex = cx + Math.cos(ang) * 440;
    const ey = cy + Math.sin(ang) * 440;

    // Primary pale green rib
    ctx.strokeStyle = 'rgba(154, 230, 180, 0.65)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Secondary veins
    for (const bOffset of [-0.35, 0.35]) {
      const midDist = 170 + Math.random() * 130;
      const bx = cx + Math.cos(ang) * midDist;
      const by = cy + Math.sin(ang) * midDist;
      const endBx = bx + Math.cos(ang + bOffset) * (85 + Math.random() * 65);
      const endBy = by + Math.sin(ang + bOffset) * (85 + Math.random() * 65);

      ctx.strokeStyle = 'rgba(198, 246, 213, 0.50)';
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(endBx, endBy);
      ctx.stroke();
    }
  }

  // 4. Subtle crisp leaf sheen
  for (let i = 0; i < 45; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 85;
    const sheen = ctx.createRadialGradient(x, y, 0, x, y, r);
    sheen.addColorStop(0, 'rgba(230, 255, 235, 0.20)');
    sheen.addColorStop(1, 'rgba(34, 84, 61, 0)');
    ctx.fillStyle = sheen;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Returns a cached procedural texture for the given layer ID.
 */
export function getFoodTexture(layerId: string): THREE.CanvasTexture {
  if (!textureCache.has(layerId)) {
    let tex: THREE.CanvasTexture;
    switch (layerId) {
      case 'bottom_bun':
      case 'top_bun':
        tex = createBriocheTexture();
        break;
      case 'patty':
        tex = createPattyTexture();
        break;
      case 'cheese':
        tex = createCheeseTexture();
        break;
      case 'tomato':
        tex = createTomatoTexture();
        break;
      case 'lettuce':
        tex = createLettuceTexture();
        break;
      default:
        tex = createBriocheTexture();
    }
    textureCache.set(layerId, tex);
  }
  return textureCache.get(layerId)!;
}

/**
 * Returns an enhanced PBR material tuned specifically for the food layer's physical surface.
 */
export function getFoodCapMaterial(layerId: string, isTopCap: boolean): THREE.MeshStandardMaterial {
  const map = getFoodTexture(layerId);

  let roughness = 0.85;
  let metalness = 0.0;

  switch (layerId) {
    case 'bottom_bun':
    case 'top_bun':
      roughness = 0.88;
      metalness = 0.0;
      break;
    case 'patty':
      roughness = 0.46; // Glistening roasted meat juices
      metalness = 0.04;
      break;
    case 'cheese':
      roughness = 0.30; // Silky melted gloss
      metalness = 0.0;
      break;
    case 'tomato':
      roughness = 0.18; // Wet, juicy, glossy fresh tomato
      metalness = 0.0;
      break;
    case 'lettuce':
      roughness = 0.54; // Crisp garden leaf
      metalness = 0.0;
      break;
  }

  const material = new THREE.MeshStandardMaterial({
    map,
    roughness,
    metalness,
    side: THREE.DoubleSide,
    name: `CapMat_${layerId}_${isTopCap ? 'top' : 'bottom'}`,
  });

  return material;
}
