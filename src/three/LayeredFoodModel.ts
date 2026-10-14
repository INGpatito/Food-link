import * as THREE from 'three';
import { getFoodCapMaterial } from './FoodCapTextures';

export interface LayeredPiece {
  id: string;
  name: string;
  label: string;
  origin: string;
  meshGroup: THREE.Group;
  originalY: number;
  originalRotY: number;
  order: number;
}

interface LayerDef {
  id: string;
  name: string;
  label: string;
  origin: string;
  order: number;
  weight: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

const LAYER_DEFS: LayerDef[] = [
  {
    id: 'bottom_bun',
    name: 'Pan Brioche Base',
    label: 'Pan Brioche Base',
    origin: 'Masa madre de fermentación lenta',
    order: -2,
    weight: -2.2,
    rotX: 0.03,
    rotY: -0.06,
    rotZ: -0.02,
  },
  {
    id: 'patty',
    name: 'Medallón Angus',
    label: 'Medallón Angus',
    origin: 'Vacuno de pasto y circuito corto',
    order: -1,
    weight: -1.1,
    rotX: -0.04,
    rotY: 0.06,
    rotZ: 0.03,
  },
  {
    id: 'cheese',
    name: 'Queso Fundido',
    label: 'Queso Fundido',
    origin: 'Elaboración de ganadería local',
    order: 0,
    weight: -0.2,
    rotX: 0.03,
    rotY: -0.04,
    rotZ: -0.02,
  },
  {
    id: 'tomato',
    name: 'Tomate de Huerta',
    label: 'Tomate de Huerta',
    origin: 'Corte maduro sin cámara de frío',
    order: 1,
    weight: 0.6,
    rotX: -0.03,
    rotY: 0.05,
    rotZ: 0.03,
  },
  {
    id: 'lettuce',
    name: 'Hojas de Huerta',
    label: 'Hojas de Huerta',
    origin: 'Brotes de recolección matutina',
    order: 2,
    weight: 1.5,
    rotX: 0.04,
    rotY: -0.06,
    rotZ: -0.03,
  },
  {
    id: 'top_bun',
    name: 'Pan Brioche Corona',
    label: 'Pan Brioche Corona',
    origin: 'Glaseado y sésamo tostado',
    order: 3,
    weight: 2.6,
    rotX: -0.04,
    rotY: 0.07,
    rotZ: 0.02,
  },
];

interface ExtractedVertex {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  u: number;
  v: number;
}

interface ExtractedTri {
  v0: ExtractedVertex;
  v1: ExtractedVertex;
  v2: ExtractedVertex;
  material: THREE.Material;
}

interface PlaneSplitResult {
  below: ExtractedTri[];
  above: ExtractedTri[];
  cutPointsBelow: ExtractedVertex[];
  cutPointsAbove: ExtractedVertex[];
}

interface CutPlaneProfile {
  cutY: number;
  centerX: number;
  centerZ: number;
  boundaryRadii: Float32Array;
  maxRadius: number;
}

function isTriangleDegenerate(
  v0: ExtractedVertex,
  v1: ExtractedVertex,
  v2: ExtractedVertex
): boolean {
  const d01 = (v1.x - v0.x) ** 2 + (v1.y - v0.y) ** 2 + (v1.z - v0.z) ** 2;
  const d12 = (v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2 + (v2.z - v1.z) ** 2;
  const d20 = (v0.x - v2.x) ** 2 + (v0.y - v2.y) ** 2 + (v0.z - v2.z) ** 2;

  if (d01 < 1e-14 || d12 < 1e-14 || d20 < 1e-14) {
    return true;
  }

  const ax = v1.x - v0.x;
  const ay = v1.y - v0.y;
  const az = v1.z - v0.z;
  const bx = v2.x - v0.x;
  const by = v2.y - v0.y;
  const bz = v2.z - v0.z;
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  const area2 = cx * cx + cy * cy + cz * cz;

  const maxEdgeSq = Math.max(d01, d12, d20);
  if (maxEdgeSq < 1e-14) return true;
  return area2 / (maxEdgeSq * maxEdgeSq) < 1e-10;
}

function addTriangle(
  list: ExtractedTri[],
  v0: ExtractedVertex,
  v1: ExtractedVertex,
  v2: ExtractedVertex,
  material: THREE.Material
): void {
  if (!isTriangleDegenerate(v0, v1, v2)) {
    list.push({ v0, v1, v2, material });
  }
}

function interpolateVertex(
  vA: ExtractedVertex,
  vB: ExtractedVertex,
  t: number,
  cutY: number
): ExtractedVertex {
  const clampedT = Math.min(1, Math.max(0, t));
  const nx = vA.nx + (vB.nx - vA.nx) * clampedT;
  const ny = vA.ny + (vB.ny - vA.ny) * clampedT;
  const nz = vA.nz + (vB.nz - vA.nz) * clampedT;
  const rawLen = Math.hypot(nx, ny, nz);
  const useFallback = rawLen < 1e-6;
  const len = useFallback ? 1 : rawLen;
  const finalNx = useFallback ? vA.nx : nx / len;
  const finalNy = useFallback ? vA.ny : ny / len;
  const finalNz = useFallback ? vA.nz : nz / len;

  return {
    x: vA.x + (vB.x - vA.x) * clampedT,
    y: cutY,
    z: vA.z + (vB.z - vA.z) * clampedT,
    nx: finalNx,
    ny: finalNy,
    nz: finalNz,
    u: vA.u + (vB.u - vA.u) * clampedT,
    v: vA.v + (vB.v - vA.v) * clampedT,
  };
}

/**
 * Mathematical plane clipping: divides triangles across the horizontal plane Y = cutY.
 * Records intersection vertices separately for the below and above portions to derive
 * independent, accurate boundary profiles for each adjacent food layer.
 */
function splitTrianglesByPlane(
  triangles: ExtractedTri[],
  cutY: number
): PlaneSplitResult {
  const below: ExtractedTri[] = [];
  const above: ExtractedTri[] = [];
  const cutPointsBelow: ExtractedVertex[] = [];
  const cutPointsAbove: ExtractedVertex[] = [];

  for (let i = 0; i < triangles.length; i++) {
    const tri = triangles[i];
    const s0 = tri.v0.y >= cutY;
    const s1 = tri.v1.y >= cutY;
    const s2 = tri.v2.y >= cutY;

    const countAbove = (s0 ? 1 : 0) + (s1 ? 1 : 0) + (s2 ? 1 : 0);

    if (countAbove === 3) {
      addTriangle(above, tri.v0, tri.v1, tri.v2, tri.material);
    } else if (countAbove === 0) {
      addTriangle(below, tri.v0, tri.v1, tri.v2, tri.material);
    } else if (countAbove === 1) {
      let vA = tri.v0;
      let vB = tri.v1;
      let vC = tri.v2;

      if (s1) {
        vA = tri.v1;
        vB = tri.v2;
        vC = tri.v0;
      } else if (s2) {
        vA = tri.v2;
        vB = tri.v0;
        vC = tri.v1;
      }

      const tB = (cutY - vA.y) / (vB.y - vA.y);
      const tC = (cutY - vA.y) / (vC.y - vA.y);

      const iAB = interpolateVertex(vA, vB, tB, cutY);
      const iAC = interpolateVertex(vA, vC, tC, cutY);

      cutPointsAbove.push(iAB, iAC);
      cutPointsBelow.push(iAB, iAC);

      addTriangle(above, vA, iAB, iAC, tri.material);
      addTriangle(below, iAB, vB, vC, tri.material);
      addTriangle(below, iAB, vC, iAC, tri.material);
    } else {
      let vA = tri.v0;
      let vB = tri.v1;
      let vC = tri.v2;

      if (!s1) {
        vA = tri.v1;
        vB = tri.v2;
        vC = tri.v0;
      } else if (!s2) {
        vA = tri.v2;
        vB = tri.v0;
        vC = tri.v1;
      }

      const tB = (cutY - vA.y) / (vB.y - vA.y);
      const tC = (cutY - vA.y) / (vC.y - vA.y);

      const iAB = interpolateVertex(vA, vB, tB, cutY);
      const iAC = interpolateVertex(vA, vC, tC, cutY);

      cutPointsBelow.push(iAB, iAC);
      cutPointsAbove.push(iAB, iAC);

      addTriangle(below, vA, iAB, iAC, tri.material);
      addTriangle(above, iAB, vB, vC, tri.material);
      addTriangle(above, iAB, vC, iAC, tri.material);
    }
  }

  return { below, above, cutPointsBelow, cutPointsAbove };
}

/**
 * Computes a robust organic boundary profile for a layer's cut surface.
 * Uses the 60th percentile radius per angular sector to remain snugly inside
 * the layer's outer shell, eliminating any chance of protruding edges or paper-plate artifacts.
 */
function computeCutProfile(
  cutPoints: ExtractedVertex[],
  cutY: number,
  insetFactor: number = 0.96
): CutPlaneProfile {
  const N_SECTORS = 64;
  if (cutPoints.length === 0) {
    return {
      cutY,
      centerX: 0,
      centerZ: 0,
      boundaryRadii: new Float32Array(N_SECTORS).fill(0.36),
      maxRadius: 0.36,
    };
  }

  let sumX = 0;
  let sumZ = 0;
  for (let i = 0; i < cutPoints.length; i++) {
    sumX += cutPoints[i].x;
    sumZ += cutPoints[i].z;
  }
  const centerX = sumX / cutPoints.length;
  const centerZ = sumZ / cutPoints.length;

  const sectorRadii: number[][] = Array.from({ length: N_SECTORS }, () => []);

  for (let i = 0; i < cutPoints.length; i++) {
    const dx = cutPoints[i].x - centerX;
    const dz = cutPoints[i].z - centerZ;
    const r = Math.hypot(dx, dz);
    let ang = Math.atan2(dz, dx);
    if (ang < 0) ang += Math.PI * 2;
    const s = Math.floor((ang / (Math.PI * 2)) * N_SECTORS) % N_SECTORS;
    sectorRadii[s].push(r);
  }

  const rawRadii = new Float32Array(N_SECTORS);
  const counts = new Uint16Array(N_SECTORS);

  for (let s = 0; s < N_SECTORS; s++) {
    const list = sectorRadii[s];
    if (list.length > 0) {
      list.sort((a, b) => a - b);
      const pIdx = Math.floor(list.length * 0.60);
      rawRadii[s] = list[pIdx];
      counts[s] = list.length;
    }
  }

  const filled = new Float32Array(N_SECTORS);
  for (let s = 0; s < N_SECTORS; s++) {
    if (counts[s] > 0) {
      filled[s] = rawRadii[s];
    } else {
      let prevDist = 1;
      while (counts[(s - prevDist + N_SECTORS) % N_SECTORS] === 0 && prevDist < N_SECTORS) prevDist++;
      let nextDist = 1;
      while (counts[(s + nextDist) % N_SECTORS] === 0 && nextDist < N_SECTORS) nextDist++;
      const prevR = rawRadii[(s - prevDist + N_SECTORS) % N_SECTORS] || 0.36;
      const nextR = rawRadii[(s + nextDist) % N_SECTORS] || 0.36;
      const t = prevDist / (prevDist + nextDist);
      filled[s] = prevR + (nextR - prevR) * t;
    }
  }

  const smoothed = new Float32Array(N_SECTORS);
  for (let s = 0; s < N_SECTORS; s++) {
    const p = (s - 1 + N_SECTORS) % N_SECTORS;
    const n = (s + 1) % N_SECTORS;
    smoothed[s] = (filled[p] * 0.25 + filled[s] * 0.5 + filled[n] * 0.25) * insetFactor;
  }

  let maxRadius = 0.001;
  for (let s = 0; s < N_SECTORS; s++) {
    if (smoothed[s] > maxRadius) maxRadius = smoothed[s];
  }

  return {
    cutY,
    centerX,
    centerZ,
    boundaryRadii: smoothed,
    maxRadius,
  };
}

/**
 * Builds a watertight, realistically textured solid cap mesh for a food layer's cut surface.
 * Creates an organic grid of concentric rings matching the boundary profile with subtle crowning.
 */
function createCapMesh(
  profile: CutPlaneProfile,
  layerCenterY: number,
  isTopCap: boolean,
  layerId: string,
  modelHeight: number
): THREE.Mesh {
  const N_RINGS = 5;
  const N_SECTORS = 64;

  const numVerts = 1 + N_RINGS * N_SECTORS;
  const numTris = N_SECTORS + (N_RINGS - 1) * N_SECTORS * 2;

  const positions = new Float32Array(numVerts * 3);
  const uvs = new Float32Array(numVerts * 2);
  const indices = new Uint32Array(numTris * 3);

  // Recess cap by 0.15% inside the layer to let the photorealistic scan shell wrap naturally
  const recess = (isTopCap ? -0.0015 : 0.0015) * modelHeight;
  const localPlaneY = (profile.cutY - layerCenterY) + recess;
  // Subtle organic crowning: +0.002 * modelHeight for top cap, -0.002 for bottom cap
  const crownH = (isTopCap ? 0.002 : -0.002) * modelHeight;

  // Center vertex (index 0)
  positions[0] = profile.centerX;
  positions[1] = localPlaneY + crownH;
  positions[2] = profile.centerZ;
  uvs[0] = 0.5;
  uvs[1] = 0.5;

  let vIdx = 1;
  for (let ring = 1; ring <= N_RINGS; ring++) {
    const f = ring / N_RINGS;
    const hOffset = (1 - f * f) * crownH;
    for (let s = 0; s < N_SECTORS; s++) {
      const ang = (s / N_SECTORS) * Math.PI * 2;
      const r = f * profile.boundaryRadii[s];
      const x = profile.centerX + Math.cos(ang) * r;
      const z = profile.centerZ + Math.sin(ang) * r;
      const y = localPlaneY + hOffset;

      const pPos = vIdx * 3;
      positions[pPos] = x;
      positions[pPos + 1] = y;
      positions[pPos + 2] = z;

      const uPos = vIdx * 2;
      uvs[uPos] = 0.5 + (Math.cos(ang) * r) / (profile.maxRadius * 2);
      uvs[uPos + 1] = 0.5 + (Math.sin(ang) * r) / (profile.maxRadius * 2);

      vIdx++;
    }
  }

  // Triangles
  let tIdx = 0;
  for (let s = 0; s < N_SECTORS; s++) {
    const nextS = (s + 1) % N_SECTORS;
    const vCenter = 0;
    const v1 = 1 + s;
    const v2 = 1 + nextS;

    if (isTopCap) {
      indices[tIdx++] = vCenter;
      indices[tIdx++] = v1;
      indices[tIdx++] = v2;
    } else {
      indices[tIdx++] = vCenter;
      indices[tIdx++] = v2;
      indices[tIdx++] = v1;
    }
  }

  for (let ring = 1; ring < N_RINGS; ring++) {
    const r0Start = 1 + (ring - 1) * N_SECTORS;
    const r1Start = 1 + ring * N_SECTORS;
    for (let s = 0; s < N_SECTORS; s++) {
      const nextS = (s + 1) % N_SECTORS;
      const a = r0Start + s;
      const b = r0Start + nextS;
      const c = r1Start + s;
      const d = r1Start + nextS;

      if (isTopCap) {
        indices[tIdx++] = a;
        indices[tIdx++] = c;
        indices[tIdx++] = b;

        indices[tIdx++] = b;
        indices[tIdx++] = c;
        indices[tIdx++] = d;
      } else {
        indices[tIdx++] = a;
        indices[tIdx++] = b;
        indices[tIdx++] = c;

        indices[tIdx++] = b;
        indices[tIdx++] = d;
        indices[tIdx++] = c;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const material = getFoodCapMaterial(layerId, isTopCap);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Cap_${layerId}_${isTopCap ? 'top' : 'bottom'}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class LayeredFoodModel {
  public group: THREE.Group;
  public pieces: LayeredPiece[] = [];
  public isReady: boolean = false;
  private currentExplosion: number = 0;
  private modelHeight: number = 1.6;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ArtisanalGourmetBurger_Exploded';
  }

  /**
   * Builds the 6 physical layers from the original burger.glb 3D model asset.
   * Performs exact planar clipping to segment layers cleanly while sealing all cut
   * surfaces with organic, photorealistic solid caps so layers never look hollow.
   */
  public async buildFromModel(sourceModel: THREE.Object3D): Promise<void> {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry?.dispose();
        }
      });
    }
    this.pieces = [];
    this.isReady = false;

    this.group.scale.copy(sourceModel.scale);

    const sourceMeshes: THREE.Mesh[] = [];
    sourceModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        sourceMeshes.push(child as THREE.Mesh);
      }
    });

    if (sourceMeshes.length === 0) {
      console.warn('[LayeredFoodModel] No meshes found in source burger model.');
      return;
    }

    sourceModel.updateMatrixWorld(true);
    const invRoot = sourceModel.matrixWorld.clone().invert();

    const allTriangles: ExtractedTri[] = [];
    const defaultMaterial: THREE.Material = new THREE.MeshStandardMaterial({
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    for (const mesh of sourceMeshes) {
      mesh.updateMatrixWorld(true);
      const mToRoot = mesh.matrixWorld.clone().premultiply(invRoot);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mToRoot);

      const geom = mesh.geometry;
      if (!geom.attributes.normal) {
        geom.computeVertexNormals();
      }
      const posAttr = geom.attributes.position;
      const normAttr = geom.attributes.normal as THREE.BufferAttribute;
      const uvAttr = geom.attributes.uv as THREE.BufferAttribute | undefined;
      const indexAttr = geom.index;
      const isIndexed = indexAttr !== null;
      const numTris = isIndexed ? indexAttr.count / 3 : posAttr.count / 3;

      const hasGroups = Boolean(geom.groups && geom.groups.length > 0);
      const isMultiMat = Array.isArray(mesh.material);

      for (let t = 0; t < numTris; t++) {
        const i0 = isIndexed ? indexAttr.getX(t * 3) : t * 3;
        const i1 = isIndexed ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = isIndexed ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

        const p0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0).applyMatrix4(mToRoot);
        const p1 = new THREE.Vector3().fromBufferAttribute(posAttr, i1).applyMatrix4(mToRoot);
        const p2 = new THREE.Vector3().fromBufferAttribute(posAttr, i2).applyMatrix4(mToRoot);

        const n0 = new THREE.Vector3().fromBufferAttribute(normAttr, i0).applyNormalMatrix(normalMatrix).normalize();
        const n1 = new THREE.Vector3().fromBufferAttribute(normAttr, i1).applyNormalMatrix(normalMatrix).normalize();
        const n2 = new THREE.Vector3().fromBufferAttribute(normAttr, i2).applyNormalMatrix(normalMatrix).normalize();

        const u0 = uvAttr ? uvAttr.getX(i0) : 0;
        const v0 = uvAttr ? uvAttr.getY(i0) : 0;
        const u1 = uvAttr ? uvAttr.getX(i1) : 0;
        const v1 = uvAttr ? uvAttr.getY(i1) : 0;
        const u2 = uvAttr ? uvAttr.getX(i2) : 0;
        const v2 = uvAttr ? uvAttr.getY(i2) : 0;

        let triMat: THREE.Material = defaultMaterial;
        if (isMultiMat) {
          const matList = mesh.material as THREE.Material[];
          if (hasGroups) {
            const triStart = t * 3;
            const group = geom.groups.find(
              (g) => triStart >= g.start && triStart < g.start + g.count
            );
            const matIdx = group ? group.materialIndex ?? 0 : 0;
            triMat = matList[matIdx] || matList[0] || defaultMaterial;
          } else {
            triMat = matList[0] || defaultMaterial;
          }
        } else if (mesh.material) {
          triMat = mesh.material as THREE.Material;
        }

        allTriangles.push({
          v0: { x: p0.x, y: p0.y, z: p0.z, nx: n0.x, ny: n0.y, nz: n0.z, u: u0, v: v0 },
          v1: { x: p1.x, y: p1.y, z: p1.z, nx: n1.x, ny: n1.y, nz: n1.z, u: u1, v: v1 },
          v2: { x: p2.x, y: p2.y, z: p2.z, nx: n2.x, ny: n2.y, nz: n2.z, u: u2, v: v2 },
          material: triMat,
        });
      }
    }

    if (allTriangles.length === 0) {
      console.warn('[LayeredFoodModel] No triangles found to segment.');
      return;
    }

    let minY = Infinity;
    let maxY = -Infinity;
    for (const tri of allTriangles) {
      minY = Math.min(minY, tri.v0.y, tri.v1.y, tri.v2.y);
      maxY = Math.max(maxY, tri.v0.y, tri.v1.y, tri.v2.y);
    }
    const H = Math.max(0.001, maxY - minY);
    this.modelHeight = H;

    // Anatomical proportions verified by color & geometry analysis of burger.glb:
    // Layer 0: Pan Brioche Base (0.00 -> 0.22)
    // Layer 1: Medallón Angus   (0.22 -> 0.39)
    // Layer 2: Queso Fundido    (0.39 -> 0.45)
    // Layer 3: Tomate de Huerta (0.45 -> 0.51)
    // Layer 4: Hojas de Huerta  (0.51 -> 0.58)
    // Layer 5: Pan Brioche Corona (0.58 -> 1.00)
    const thresholdRatios = [0.22, 0.39, 0.45, 0.51, 0.58];
    const y0 = minY + thresholdRatios[0] * H;
    const y1 = minY + thresholdRatios[1] * H;
    const y2 = minY + thresholdRatios[2] * H;
    const y3 = minY + thresholdRatios[3] * H;
    const y4 = minY + thresholdRatios[4] * H;

    const split0 = splitTrianglesByPlane(allTriangles, y0);
    const split1 = splitTrianglesByPlane(split0.above, y1);
    const split2 = splitTrianglesByPlane(split1.above, y2);
    const split3 = splitTrianglesByPlane(split2.above, y3);
    const split4 = splitTrianglesByPlane(split3.above, y4);

    const layerBuckets = [
      split0.below,
      split1.below,
      split2.below,
      split3.below,
      split4.below,
      split4.above,
    ];

    // Compute separate, accurate profiles for each specific boundary
    const profile0_botBun = computeCutProfile(split0.cutPointsBelow, y0, 0.94);
    const profile0_patty = computeCutProfile(split0.cutPointsAbove, y0, 0.95);

    const profile1_patty = computeCutProfile(split1.cutPointsBelow, y1, 0.95);
    const profile1_cheese = computeCutProfile(split1.cutPointsAbove, y1, 0.94);

    const profile2_cheese = computeCutProfile(split2.cutPointsBelow, y2, 0.94);
    const profile2_tomato = computeCutProfile(split2.cutPointsAbove, y2, 0.95);

    const profile3_tomato = computeCutProfile(split3.cutPointsBelow, y3, 0.95);
    const profile3_lettuce = computeCutProfile(split3.cutPointsAbove, y3, 0.94);

    const profile4_lettuce = computeCutProfile(split4.cutPointsBelow, y4, 0.94);
    const profile4_topBun = computeCutProfile(split4.cutPointsAbove, y4, 0.95);

    for (let k = 0; k < 6; k++) {
      const tris = layerBuckets[k];
      const def = LAYER_DEFS[k];
      const pieceGroup = new THREE.Group();
      pieceGroup.name = `Layer_${def.id}`;

      let layerMinY = Infinity;
      let layerMaxY = -Infinity;
      for (const tri of tris) {
        layerMinY = Math.min(layerMinY, tri.v0.y, tri.v1.y, tri.v2.y);
        layerMaxY = Math.max(layerMaxY, tri.v0.y, tri.v1.y, tri.v2.y);
      }
      const layerCenterY = tris.length > 0 ? (layerMinY + layerMaxY) / 2 : 0;
      pieceGroup.position.y = layerCenterY;

      if (tris.length > 0) {
        const matGroups = new Map<THREE.Material, ExtractedTri[]>();
        for (const tri of tris) {
          let list = matGroups.get(tri.material);
          if (!list) {
            list = [];
            matGroups.set(tri.material, list);
          }
          list.push(tri);
        }

        matGroups.forEach((matTris, mat) => {
          const numTris = matTris.length;
          const posArray = new Float32Array(numTris * 9);
          const normArray = new Float32Array(numTris * 9);
          const uvArray = new Float32Array(numTris * 6);

          for (let i = 0; i < numTris; i++) {
            const tri = matTris[i];
            const po = i * 9;
            posArray[po] = tri.v0.x;     posArray[po + 1] = tri.v0.y - layerCenterY; posArray[po + 2] = tri.v0.z;
            posArray[po + 3] = tri.v1.x; posArray[po + 4] = tri.v1.y - layerCenterY; posArray[po + 5] = tri.v1.z;
            posArray[po + 6] = tri.v2.x; posArray[po + 7] = tri.v2.y - layerCenterY; posArray[po + 8] = tri.v2.z;

            const no = i * 9;
            normArray[no] = tri.v0.nx;     normArray[no + 1] = tri.v0.ny; normArray[no + 2] = tri.v0.nz;
            normArray[no + 3] = tri.v1.nx; normArray[no + 4] = tri.v1.ny; normArray[no + 5] = tri.v1.nz;
            normArray[no + 6] = tri.v2.nx; normArray[no + 7] = tri.v2.ny; normArray[no + 8] = tri.v2.nz;

            const uo = i * 6;
            uvArray[uo] = tri.v0.u;     uvArray[uo + 1] = tri.v0.v;
            uvArray[uo + 2] = tri.v1.u; uvArray[uo + 3] = tri.v1.v;
            uvArray[uo + 4] = tri.v2.u; uvArray[uo + 5] = tri.v2.v;
          }

          const layerGeom = new THREE.BufferGeometry();
          layerGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
          layerGeom.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
          layerGeom.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

          const layerMat = mat.clone();
          layerMat.side = THREE.DoubleSide;

          const layerMesh = new THREE.Mesh(layerGeom, layerMat);
          layerMesh.castShadow = true;
          layerMesh.receiveShadow = true;
          pieceGroup.add(layerMesh);
        });
      }

      // Add solid caps sealed to each layer's exact contours:
      if (k === 0) {
        // Layer 0: Pan Brioche Base (top cap)
        const topCap = createCapMesh(profile0_botBun, layerCenterY, true, 'bottom_bun', H);
        pieceGroup.add(topCap);
      } else if (k === 1) {
        // Layer 1: Medallón Angus (bottom & top caps)
        const botCap = createCapMesh(profile0_patty, layerCenterY, false, 'patty', H);
        const topCap = createCapMesh(profile1_patty, layerCenterY, true, 'patty', H);
        pieceGroup.add(botCap);
        pieceGroup.add(topCap);
      } else if (k === 2) {
        // Layer 2: Queso Fundido (bottom & top caps)
        const botCap = createCapMesh(profile1_cheese, layerCenterY, false, 'cheese', H);
        const topCap = createCapMesh(profile2_cheese, layerCenterY, true, 'cheese', H);
        pieceGroup.add(botCap);
        pieceGroup.add(topCap);
      } else if (k === 3) {
        // Layer 3: Tomate de Huerta (bottom & top caps)
        const botCap = createCapMesh(profile2_tomato, layerCenterY, false, 'tomato', H);
        const topCap = createCapMesh(profile3_tomato, layerCenterY, true, 'tomato', H);
        pieceGroup.add(botCap);
        pieceGroup.add(topCap);
      } else if (k === 4) {
        // Layer 4: Hojas de Huerta (bottom & top caps)
        const botCap = createCapMesh(profile3_lettuce, layerCenterY, false, 'lettuce', H);
        const topCap = createCapMesh(profile4_lettuce, layerCenterY, true, 'lettuce', H);
        pieceGroup.add(botCap);
        pieceGroup.add(topCap);
      } else if (k === 5) {
        // Layer 5: Pan Brioche Corona (bottom cap)
        const botCap = createCapMesh(profile4_topBun, layerCenterY, false, 'top_bun', H);
        pieceGroup.add(botCap);
      }

      this.registerPiece(pieceGroup, def.id, def.name, def.origin, def.order);
    }

    this.isReady = true;
    this.setExplosion(this.currentExplosion);
  }

  private registerPiece(meshGroup: THREE.Group, id: string, name: string, origin: string, order: number) {
    this.group.add(meshGroup);
    this.pieces.push({
      id,
      name,
      label: name,
      origin,
      meshGroup,
      originalY: meshGroup.position.y,
      originalRotY: meshGroup.rotation.y,
      order,
    });
  }

  public buildFromMesh(sourceMesh?: THREE.Mesh) {
    if (sourceMesh) {
      void this.buildFromModel(sourceMesh);
    }
  }

  public setExplosion(progress: number) {
    this.currentExplosion = Math.min(1, Math.max(0, progress));
    if (!this.isReady) return;

    const spreadDistance = (this.modelHeight || 1.6) * 0.18;
    const displacementWeights: Record<string, number> = {
      top_bun: 2.6,
      lettuce: 1.5,
      tomato: 0.6,
      cheese: -0.2,
      patty: -1.1,
      bottom_bun: -2.2,
    };

    const rotationWeights: Record<string, { rotX: number; rotY: number; rotZ: number }> = {
      top_bun: { rotX: -0.04, rotY: 0.08, rotZ: 0.02 },
      lettuce: { rotX: 0.05, rotY: -0.07, rotZ: -0.03 },
      tomato: { rotX: -0.03, rotY: 0.05, rotZ: 0.03 },
      cheese: { rotX: 0.03, rotY: -0.04, rotZ: -0.02 },
      patty: { rotX: -0.04, rotY: 0.06, rotZ: 0.03 },
      bottom_bun: { rotX: 0.03, rotY: -0.06, rotZ: -0.02 },
    };

    this.pieces.forEach((piece) => {
      const weight = displacementWeights[piece.id] ?? piece.order;
      const rot = rotationWeights[piece.id] ?? { rotX: 0, rotY: 0.05 * piece.order, rotZ: 0 };

      piece.meshGroup.position.y = piece.originalY + (weight * spreadDistance * this.currentExplosion);
      piece.meshGroup.rotation.y = piece.originalRotY + (rot.rotY * this.currentExplosion);
      piece.meshGroup.rotation.x = rot.rotX * this.currentExplosion;
      piece.meshGroup.rotation.z = rot.rotZ * this.currentExplosion;
    });
  }
}
