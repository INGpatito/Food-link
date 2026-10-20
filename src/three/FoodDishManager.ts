import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface FoodStageSpec {
    id: string;
    name: string;
    sectionKey: string;
    stageIndex: number;
    file: string;
    companionFile?: string;
    targetSize: number;
    rotX: number;
    rotY: number;
    rotZ: number;
    posX: number;
    posY: number;
    posZ: number;
    companion?: {
        targetSize: number;
        rotX: number;
        rotY: number;
        rotZ: number;
        posX: number;
        posY: number;
        posZ: number;
    };
}

export interface DishObject {
    spec: FoodStageSpec;
    group: THREE.Group;
    baseScale: number;
    isLoaded: boolean;
    displayWeight: number;
    cachedMaterials: THREE.Material[];
    _dirtyMaterials: boolean;
    _lastOpaque?: boolean;
    _lastOpacity?: number;
}

const FOOD_SHADER_CONFIGS: Record<string, {
    sssColor: string;
    sssIntensity: number;
    rimColor: string;
    rimPower: number;
    rimIntensity: number;
    moisture: number;
    environment: number;
}> = {
    hero:     { sssColor: '#d49a72', sssIntensity: 0.08, rimColor: '#f8e2ca', rimPower: 4.6, rimIntensity: 0.07, moisture: 0.22, environment: 0.55 },
    features: { sssColor: '#c98868', sssIntensity: 0.09, rimColor: '#f2d3b8', rimPower: 4.5, rimIntensity: 0.08, moisture: 0.26, environment: 0.60 },
    salad:    { sssColor: '#7c946c', sssIntensity: 0.05, rimColor: '#dbe4cc', rimPower: 5.2, rimIntensity: 0.05, moisture: 0.20, environment: 0.42 },
    menu:     { sssColor: '#bf9eb2', sssIntensity: 0.08, rimColor: '#f0e0ea', rimPower: 4.9, rimIntensity: 0.08, moisture: 0.30, environment: 0.65 },
    extra:    { sssColor: '#b3846c', sssIntensity: 0.07, rimColor: '#ebd2c0', rimPower: 5.0, rimIntensity: 0.07, moisture: 0.25, environment: 0.68 }
};

export class MaterialEnhancer {
    public timeUniform = { value: 0 };

    public enhanceModel(model: THREE.Object3D, sectionKey = 'hero'): void {
        const config = FOOD_SHADER_CONFIGS[sectionKey] || FOOD_SHADER_CONFIGS.hero;

        model.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;

            const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const enhancedMaterials = sourceMaterials.map((material) => {
                const stdMat = material as THREE.MeshStandardMaterial;
                if (!stdMat.isMeshStandardMaterial) return material;
                if (stdMat.userData._foodlinkEnhanced) return material;

                const enhanced = stdMat.clone();
                enhanced.userData._foodlinkEnhanced = true;
                this.preparePbrMaterial(enhanced, config);
                this.injectSurfaceResponse(enhanced, config, sectionKey);
                return enhanced;
            });

            mesh.material = Array.isArray(mesh.material) ? enhancedMaterials : enhancedMaterials[0];
        });
    }

    public update(elapsedTime: number): void {
        this.timeUniform.value = elapsedTime;
    }

    private preparePbrMaterial(material: THREE.MeshStandardMaterial, config: (typeof FOOD_SHADER_CONFIGS)['hero']): void {
        material.metalness = 0;
        material.roughness = THREE.MathUtils.clamp(material.roughness || 0.72, 0.38, 0.95);
        material.envMapIntensity = config.environment;

        const physMat = material as THREE.MeshPhysicalMaterial;
        if (physMat.isMeshPhysicalMaterial) {
            physMat.clearcoat = Math.max(physMat.clearcoat || 0, config.moisture * 0.15);
            physMat.clearcoatRoughness = Math.max(physMat.clearcoatRoughness || 0, 0.24);
        }
    }

    private injectSurfaceResponse(
        material: THREE.MeshStandardMaterial,
        config: (typeof FOOD_SHADER_CONFIGS)['hero'],
        sectionKey: string
    ): void {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uFoodTime = this.timeUniform;
            shader.uniforms.uFoodSssColor = { value: new THREE.Color(config.sssColor) };
            shader.uniforms.uFoodSssIntensity = { value: config.sssIntensity };
            shader.uniforms.uFoodRimColor = { value: new THREE.Color(config.rimColor) };
            shader.uniforms.uFoodRimPower = { value: config.rimPower };
            shader.uniforms.uFoodRimIntensity = { value: config.rimIntensity };
            shader.uniforms.uFoodMoisture = { value: config.moisture };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
                #include <common>
                varying vec3 vFoodWorldNormal;
                varying vec3 vFoodWorldPosition;
                varying vec3 vFoodLocalPosition;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                vec3 worldNormCandidate = mat3(modelMatrix) * normal;
                vFoodWorldNormal = length(worldNormCandidate) > 0.0001 ? normalize(worldNormCandidate) : vec3(0.0, 1.0, 0.0);
                vFoodWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vFoodLocalPosition = position;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
                #include <common>
                uniform float uFoodTime;
                uniform vec3 uFoodSssColor;
                uniform float uFoodSssIntensity;
                uniform vec3 uFoodRimColor;
                uniform float uFoodRimPower;
                uniform float uFoodRimIntensity;
                uniform float uFoodMoisture;
                varying vec3 vFoodWorldNormal;
                varying vec3 vFoodWorldPosition;
                varying vec3 vFoodLocalPosition;

                float foodGrain(vec3 p) {
                    p = fract(p * 13.13);
                    p += vec3(dot(p, p.yzx + 19.19));
                    return fract((p.x + p.y) * p.z);
                }
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <opaque_fragment>',
                `
                float foodNLen = length(vFoodWorldNormal);
                vec3 foodN = (foodNLen > 0.0001 ? vFoodWorldNormal / foodNLen : vec3(0.0, 1.0, 0.0)) * (gl_FrontFacing ? 1.0 : -1.0);
                vec3 toCam = cameraPosition - vFoodWorldPosition;
                vec3 foodV = length(toCam) > 0.0001 ? normalize(toCam) : vec3(0.0, 0.0, 1.0);
                float foodNdotV = clamp(dot(foodN, foodV), 0.0, 1.0);
                vec3 foodLightDirection = normalize(vec3(0.42, 0.84, 0.38));
                vec3 halfCandidate = foodLightDirection + foodV;
                vec3 foodHalfVector = length(halfCandidate) > 0.0001 ? normalize(halfCandidate) : foodLightDirection;

                float grainA = foodGrain(vFoodLocalPosition * 18.0);
                float grainB = foodGrain(vFoodLocalPosition * 47.0 + 2.7);
                float pores = smoothstep(0.73, 0.98, grainA) * (0.025 + 0.035 * grainB);
                outgoingLight *= 1.0 - pores;

                float highlight = pow(clamp(dot(foodN, foodHalfVector), 0.0001, 1.0), mix(36.0, 16.0, uFoodMoisture));
                float shimmer = 0.92 + sin(uFoodTime * 0.85 + grainA * 11.0) * 0.08;
                outgoingLight += mix(uFoodRimColor, vec3(1.0), 0.35) * highlight * uFoodMoisture * 0.09 * shimmer;

                float backLight = pow(clamp(dot(-foodN, foodLightDirection), 0.0001, 1.0), 1.65);
                outgoingLight += outgoingLight * uFoodSssColor * backLight * uFoodSssIntensity;

                float rim = pow(clamp(1.0 - foodNdotV, 0.0001, 1.0), uFoodRimPower);
                outgoingLight += uFoodRimColor * rim * uFoodRimIntensity;

                #include <opaque_fragment>
                `
            );
        };

        material.customProgramCacheKey = () => `foodlink-culinary-v3-${sectionKey}`;
        material.needsUpdate = true;
    }
}

/**
 * Manages 4 culinary food stages, asynchronous GLTF streaming,
 * ergonomic bounding-box normalization, and smoothstep crossfading.
 * Zero emojis strictly enforced.
 */
export class FoodDishManager {
    public dishObjects: DishObject[] = [];
    public normalizedWeights: number[] = [1, 0, 0, 0];
    public materialEnhancer: MaterialEnhancer;

    private mountGroup: THREE.Group;
    private gltfLoader: GLTFLoader;
    private resolvedModelPrefix: string | null = null;
    private onFirstModelLoaded?: () => void;

    public foodStages: FoodStageSpec[] = [
        {
            id: 'burger',
            name: 'HAMBURGUESA DE AUTOR',
            sectionKey: 'hero',
            stageIndex: 0,
            file: 'burger.glb',
            targetSize: 2.78,
            rotX: 0.0,
            rotY: 0.25,
            rotZ: 0.0,
            posX: 0.0,
            posY: 0.0,
            posZ: 0.0
        },
        {
            id: 'pizza',
            name: 'PIZZA ARTESANAL',
            sectionKey: 'features',
            stageIndex: 1,
            file: 'pizza.glb',
            targetSize: 2.96,
            rotX: Math.PI / 2 - 0.22,
            rotY: 0.35,
            rotZ: 0.0,
            posX: 0.0,
            posY: 0.0,
            posZ: 0.0
        },
        {
            id: 'salad',
            name: 'ENSALADA ITALIANA',
            sectionKey: 'salad',
            stageIndex: 2,
            file: 'italian_salad.glb',
            targetSize: 2.92,
            rotX: 0.20,
            rotY: -0.30,
            rotZ: 0.0,
            posX: 0.0,
            posY: 0.0,
            posZ: 0.0
        },
        {
            id: 'dessert',
            name: 'POSTRE & CHOCOLATE',
            sectionKey: 'menu',
            stageIndex: 3,
            file: 'cake.glb',
            companionFile: 'extra_chocolate.glb',
            targetSize: 2.28,
            rotX: 0.12,
            rotY: -0.35,
            rotZ: 0.0,
            posX: -0.34,
            posY: 0.0,
            posZ: 0.08,
            companion: {
                targetSize: 1.48,
                rotX: 0.18,
                rotY: 0.45,
                rotZ: 0.0,
                posX: 0.72,
                posY: 0.0,
                posZ: -0.16
            }
        }
    ];

    constructor(mountGroup: THREE.Group, onFirstModelLoaded?: () => void) {
        this.mountGroup = mountGroup;
        this.onFirstModelLoaded = onFirstModelLoaded;
        this.materialEnhancer = new MaterialEnhancer();
        this.gltfLoader = new GLTFLoader();

        this.setupSpecularGlossinessExtension();
        this.initStageGroups();
    }

    private setupSpecularGlossinessExtension(): void {
        const LEGACY_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
        this.gltfLoader.register((parser: any) => ({
            name: LEGACY_SPECULAR_GLOSSINESS,
            getMaterialType: (materialIndex: number) => {
                const material = parser.json.materials?.[materialIndex];
                return material?.extensions?.[LEGACY_SPECULAR_GLOSSINESS]
                    ? THREE.MeshStandardMaterial
                    : null;
            },
            extendMaterialParams: (materialIndex: number, materialParams: any) => {
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

    private initStageGroups(): void {
        this.foodStages.forEach((spec, idx) => {
            const stageGroup = new THREE.Group();
            stageGroup.name = `dish-stage-${spec.id}`;
            stageGroup.visible = (idx === 0);
            this.mountGroup.add(stageGroup);

            this.dishObjects.push({
                spec,
                group: stageGroup,
                baseScale: 1.0,
                isLoaded: false,
                displayWeight: (idx === 0 ? 1.0 : 0.0),
                cachedMaterials: [],
                _dirtyMaterials: true
            });
        });
    }

    private getCandidatePrefixes(): string[] {
        const win = window as any;
        if (win.__FOODLINK_MODELS_PATH__) {
            return [win.__FOODLINK_MODELS_PATH__.replace(/\/?$/, '/')];
        }
        if (this.resolvedModelPrefix) {
            return [this.resolvedModelPrefix];
        }
        const pathBase = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        const candidates = [
            'models/',
            '/models/',
            pathBase + 'models/',
            'public/models/',
            '/public/models/',
            pathBase + 'public/models/'
        ];
        return Array.from(new Set(candidates.map(p => p.replace(/\/\/+/g, '/'))));
    }

    private async loadGLTFSafe(filename: string): Promise<any> {
        const prefixes = this.getCandidatePrefixes();
        let lastErr: any = null;

        for (const prefix of prefixes) {
            const url = prefix + filename;
            try {
                const gltf = await this.gltfLoader.loadAsync(url);
                this.resolvedModelPrefix = prefix;
                return gltf;
            } catch (err) {
                lastErr = err;
            }
        }
        throw lastErr;
    }

    private prepareSubModel(source: THREE.Object3D, options: {
        targetSize?: number;
        rotX?: number;
        rotY?: number;
        rotZ?: number;
        posX?: number;
        posY?: number;
        posZ?: number;
        envMapIntensity?: number;
    } = {}): THREE.Group {
        const {
            targetSize = 1.85,
            rotX = 0,
            rotY = 0,
            rotZ = 0,
            posX = 0,
            posY = 0,
            posZ = 0,
            envMapIntensity = 1.15
        } = options;

        source.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh) {
                if (mesh.geometry && !mesh.geometry.attributes.normal) {
                    mesh.geometry.computeVertexNormals();
                }
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((mat) => {
                    const stdMat = mat as THREE.MeshStandardMaterial;
                    if (stdMat.isMeshStandardMaterial || (stdMat as any).isMeshPhysicalMaterial) {
                        stdMat.envMapIntensity = envMapIntensity;
                        stdMat.roughness = THREE.MathUtils.clamp(stdMat.roughness ?? 0.6, 0.25, 1.0);
                        if (stdMat.map) stdMat.map.colorSpace = THREE.SRGBColorSpace;
                        if (stdMat.emissiveMap) stdMat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                        stdMat.needsUpdate = true;
                    }
                });
            }
        });

        const rotGroup = new THREE.Group();
        rotGroup.add(source);
        if (rotX !== 0 || rotY !== 0 || rotZ !== 0) {
            rotGroup.rotation.set(rotX, rotY, rotZ);
        }
        rotGroup.updateMatrixWorld(true);

        const bbox = new THREE.Box3().setFromObject(rotGroup);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        rotGroup.position.x = -center.x;
        rotGroup.position.z = -center.z;
        rotGroup.position.y = -bbox.min.y;

        const maxDim = Math.max(size.x, size.z, size.y * 0.95);
        const scaleFactor = targetSize / (maxDim || 1);

        const scaleGroup = new THREE.Group();
        scaleGroup.add(rotGroup);
        scaleGroup.scale.setScalar(scaleFactor);

        const wrapper = new THREE.Group();
        wrapper.add(scaleGroup);
        wrapper.position.set(posX, posY, posZ);

        return wrapper;
    }

    private cacheDishMaterials(dishEntry: DishObject): void {
        const mats = new Set<THREE.Material>();
        dishEntry.group.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && mesh.material) {
                const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                list.forEach((m) => {
                    if (!m.userData._origInit) {
                        m.userData._origInit = true;
                        m.userData._origTransparent = Boolean(m.transparent);
                        m.userData._origDepthWrite = Boolean(m.depthWrite);
                        m.userData._origOpacity = typeof m.opacity === 'number' ? m.opacity : 1.0;
                    }
                    mats.add(m);
                });
            }
        });
        dishEntry.cachedMaterials = Array.from(mats);
        dishEntry._dirtyMaterials = true;
    }

    private async loadFoodDish(dishEntry: DishObject): Promise<void> {
        const spec = dishEntry.spec;
        try {
            const gltf = await this.loadGLTFSafe(spec.file);
            const prepared = this.prepareSubModel(gltf.scene, {
                targetSize: spec.targetSize,
                rotX: spec.rotX,
                rotY: spec.rotY,
                rotZ: spec.rotZ,
                posX: spec.posX,
                posY: spec.posY,
                posZ: spec.posZ,
                envMapIntensity: 1.2
            });
            this.materialEnhancer.enhanceModel(prepared, spec.sectionKey);
            dishEntry.group.add(prepared);

            if (spec.companionFile && spec.companion) {
                try {
                    const companionGltf = await this.loadGLTFSafe(spec.companionFile);
                    const preparedComp = this.prepareSubModel(companionGltf.scene, {
                        targetSize: spec.companion.targetSize,
                        rotX: spec.companion.rotX,
                        rotY: spec.companion.rotY,
                        rotZ: spec.companion.rotZ,
                        posX: spec.companion.posX,
                        posY: spec.companion.posY,
                        posZ: spec.companion.posZ,
                        envMapIntensity: 1.25
                    });
                    this.materialEnhancer.enhanceModel(preparedComp, 'extra');
                    dishEntry.group.add(preparedComp);
                } catch (compErr) {
                    console.warn(`Companion model ${spec.companionFile} notice:`, compErr);
                }
            }

            this.cacheDishMaterials(dishEntry);
            dishEntry.isLoaded = true;
            dishEntry.baseScale = 1.0;

            if (dishEntry.spec.stageIndex === 0 && this.onFirstModelLoaded) {
                this.onFirstModelLoaded();
            }
        } catch (err) {
            console.warn(`Aviso: Cargando modelo de respaldo para ${spec.file}:`, err);
        }
    }

    public async loadAllModels(): Promise<void> {
        try {
            await this.loadFoodDish(this.dishObjects[0]);
        } catch (heroErr) {
            console.warn('Hero dish model notice:', heroErr);
        } finally {
            this.dishObjects.slice(1).forEach((dish) => {
                this.loadFoodDish(dish);
            });
        }
    }

    private smoothstep(min: number, max: number, value: number): number {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    public update(s: number, elapsedTime: number, isInspectMode: boolean, inspectDishIndex: number): void {
        this.materialEnhancer.update(elapsedTime);

        // Smoothstep sequential weights
        const w0 = 1.0 - this.smoothstep(0.18, 0.28, s);
        const w1 = this.smoothstep(0.18, 0.28, s) * (1.0 - this.smoothstep(0.48, 0.58, s));
        const w2 = this.smoothstep(0.48, 0.58, s) * (1.0 - this.smoothstep(0.78, 0.88, s));
        const w3 = this.smoothstep(0.78, 0.88, s);
        const scrollWeights = [w0, w1, w2, w3];

        this.dishObjects.forEach((dish, idx) => {
            if (!dish.group) return;
            const targetWeight = isInspectMode
                ? (inspectDishIndex === idx ? 1.0 : 0.0)
                : scrollWeights[idx];

            dish.displayWeight = this.lerp(
                dish.displayWeight ?? targetWeight,
                targetWeight,
                isInspectMode ? 0.14 : 0.22
            );
            if (Math.abs(dish.displayWeight - targetWeight) < 0.001) {
                dish.displayWeight = targetWeight;
            }
            const weight = dish.displayWeight;

            if (weight <= 0.002) {
                if (dish.group.visible) dish.group.visible = false;
            } else {
                if (!dish.group.visible) dish.group.visible = true;
                const ease = Math.sin(weight * Math.PI * 0.5);
                dish.group.scale.setScalar(dish.baseScale * (0.20 + 0.80 * ease));
                dish.group.position.y = (1.0 - ease) * 0.25;
                dish.group.rotation.y = (1.0 - ease) * 0.35 + Math.sin(elapsedTime * 0.6) * 0.03;

                const isFullyOpaque = weight >= 0.98;
                const targetOpacity = isFullyOpaque ? 1.0 : Math.min(1.0, weight * 1.25);
                const targetTransparent = !isFullyOpaque;
                const targetDepthWrite = isFullyOpaque || targetOpacity > 0.5;

                if (
                    dish._dirtyMaterials ||
                    dish._lastOpaque !== isFullyOpaque ||
                    Math.abs((dish._lastOpacity ?? -1) - targetOpacity) > 0.005
                ) {
                    dish._dirtyMaterials = false;
                    dish._lastOpaque = isFullyOpaque;
                    dish._lastOpacity = targetOpacity;

                    const mats = dish.cachedMaterials || [];
                    for (let i = 0; i < mats.length; i++) {
                        const m = mats[i] as any;
                        m.transparent = targetTransparent || (Boolean(m.userData._origTransparent) && isFullyOpaque);
                        m.opacity = isFullyOpaque ? m.userData._origOpacity : targetOpacity * m.userData._origOpacity;
                        m.depthWrite = targetDepthWrite;
                    }
                }
            }
        });

        const dw0 = this.dishObjects[0]?.displayWeight ?? w0;
        const dw1 = this.dishObjects[1]?.displayWeight ?? w1;
        const dw2 = this.dishObjects[2]?.displayWeight ?? w2;
        const dw3 = this.dishObjects[3]?.displayWeight ?? w3;
        const sumWeight = dw0 + dw1 + dw2 + dw3 || 1.0;
        this.normalizedWeights = [dw0 / sumWeight, dw1 / sumWeight, dw2 / sumWeight, dw3 / sumWeight];
    }
}
