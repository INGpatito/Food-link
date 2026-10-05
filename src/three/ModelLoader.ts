import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const LEGACY_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
const DISPLAY_MODEL_SIZE = 2.7;

export class ModelLoader {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();

    // Three.js no longer includes this legacy glTF material extension. The new
    // pizza uses it for its diffuse texture, so map that data to a standard PBR material.
    this.loader.register((parser) => ({
      name: LEGACY_SPECULAR_GLOSSINESS,
      getMaterialType: (materialIndex) => {
        const material = parser.json.materials?.[materialIndex];
        return material?.extensions?.[LEGACY_SPECULAR_GLOSSINESS]
          ? THREE.MeshStandardMaterial
          : null;
      },
      extendMaterialParams: (materialIndex, materialParams) => {
        const extension = parser.json.materials?.[materialIndex]?.extensions?.[LEGACY_SPECULAR_GLOSSINESS];
        if (!extension) return null;

        const diffuseFactor = extension.diffuseFactor ?? [1, 1, 1, 1];
        materialParams.color = new THREE.Color().setRGB(
          diffuseFactor[0],
          diffuseFactor[1],
          diffuseFactor[2],
          THREE.LinearSRGBColorSpace
        );
        materialParams.opacity = diffuseFactor[3] ?? 1;
        materialParams.metalness = 0;
        materialParams.roughness = THREE.MathUtils.clamp(
          1 - (extension.glossinessFactor ?? 0.65),
          0.25,
          1
        );

        if (extension.diffuseTexture) {
          return parser.assignTexture(
            materialParams,
            'map',
            extension.diffuseTexture,
            THREE.SRGBColorSpace
          );
        }

        return null;
      }
    }));
  }

  public async load(url: string, sectionName?: string): Promise<THREE.Group> {
    try {
      const gltf = await this.loader.loadAsync(url);
      const source = gltf.scene;

      source.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      source.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(source);
      const size = bounds.getSize(new THREE.Vector3());
      const largestDimension = Math.max(size.x, size.y, size.z);

      if (bounds.isEmpty() || !Number.isFinite(largestDimension) || largestDimension <= 0) {
        throw new Error('El archivo no contiene una geometría visible.');
      }

      const center = bounds.getCenter(new THREE.Vector3());
      source.position.sub(center);

      const normalizedModel = new THREE.Group();
      normalizedModel.name = sectionName || source.name || 'FoodModel';
      normalizedModel.add(source);
      normalizedModel.scale.setScalar(DISPLAY_MODEL_SIZE / largestDimension);

      return normalizedModel;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo cargar el modelo 3D "${url}": ${reason}`, { cause: error });
    }
  }
}
