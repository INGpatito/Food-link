import * as THREE from 'three';

/**
 * Values kept deliberately subtle: the source assets remain the hero, while the
 * shader adds the small, imperfect light response that makes food read less like
 * a plastic render.
 */
export interface FoodShaderConfig {
  sssColor: string;
  sssIntensity: number;
  rimColor: string;
  rimPower: number;
  rimIntensity: number;
  moisture: number;
  environment: number;
}

export const FOOD_SHADER_CONFIGS: Record<string, FoodShaderConfig> = {
  hero:     { sssColor: '#c99470', sssIntensity: 0.06, rimColor: '#f6dfc6', rimPower: 5.0, rimIntensity: 0.05, moisture: 0.15, environment: 0.40 }, // Menos plástico, más orgánico
  features: { sssColor: '#bd8468', sssIntensity: 0.07, rimColor: '#edcfb4', rimPower: 4.8, rimIntensity: 0.06, moisture: 0.20, environment: 0.50 }, // Pizza mate
  salad:    { sssColor: '#9bae7e', sssIntensity: 0.09, rimColor: '#e1e9cc', rimPower: 5.1, rimIntensity: 0.07, moisture: 0.35, environment: 0.70 }, // La ensalada sí necesita verse húmeda y fresca
  menu:     { sssColor: '#b59aaa', sssIntensity: 0.06, rimColor: '#eadce4', rimPower: 5.2, rimIntensity: 0.06, moisture: 0.25, environment: 0.55 },
  extra:    { sssColor: '#a97e68', sssIntensity: 0.05, rimColor: '#e6cdbb', rimPower: 5.4, rimIntensity: 0.05, moisture: 0.20, environment: 0.60 }, // Cupcake equilibrado
};

type TimeUniform = { value: number };

export class MaterialEnhancer {
  private timeUniforms: TimeUniform[] = [];

  /** Apply a one-time PBR and shader pass to all food materials in a model. */
  public enhanceModel(model: THREE.Object3D, sectionKey: string = 'hero'): void {
    const config = FOOD_SHADER_CONFIGS[sectionKey] || FOOD_SHADER_CONFIGS.hero;

    model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;

      const mesh = child as THREE.Mesh;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // glTF files occasionally share one material across meshes. Cloning avoids
      // one food item's treatment leaking into another item's material instance.
      const enhancedMaterials = sourceMaterials.map((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial)) {
          return material;
        }

        const enhanced = material.clone();
        this.preparePbrMaterial(enhanced, config);
        this.injectSurfaceResponse(enhanced, config);
        return enhanced;
      });

      mesh.material = Array.isArray(mesh.material) ? enhancedMaterials : enhancedMaterials[0];
    });
  }

  /** Shared scene clock; avoids one requestAnimationFrame loop per material. */
  public update(elapsedTime: number): void {
    this.timeUniforms.forEach((uniform) => {
      uniform.value = elapsedTime;
    });
  }

  private preparePbrMaterial(
    material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    config: FoodShaderConfig
  ) {
    material.metalness = 0;
    material.roughness = THREE.MathUtils.clamp(material.roughness || 0.75, 0.45, 1.0);
    material.envMapIntensity = config.environment;

    if (material instanceof THREE.MeshPhysicalMaterial) {
      // A restrained clearcoat only catches the studio lights on moist icing,
      // cheese and vegetables; it is not strong enough to turn bread into plastic.
      material.clearcoat = Math.max(material.clearcoat, config.moisture * 0.10);
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness, 0.28);
    }
  }

  private injectSurfaceResponse(
    material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
    config: FoodShaderConfig
  ) {
    const foodTime: TimeUniform = { value: 0 };
    this.timeUniforms.push(foodTime);

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFoodTime = foodTime;
      shader.uniforms.uFoodSssColor = { value: new THREE.Color(config.sssColor) };
      shader.uniforms.uFoodSssIntensity = { value: config.sssIntensity };
      shader.uniforms.uFoodRimColor = { value: new THREE.Color(config.rimColor) };
      shader.uniforms.uFoodRimPower = { value: config.rimPower };
      shader.uniforms.uFoodRimIntensity = { value: config.rimIntensity };
      shader.uniforms.uFoodMoisture = { value: config.moisture };

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        /* glsl */ `
          #include <common>
          varying vec3 vFoodWorldNormal;
          varying vec3 vFoodWorldPosition;
          varying vec3 vFoodLocalPosition;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
          #include <begin_vertex>
          vFoodWorldNormal = normalize(mat3(modelMatrix) * normal);
          vFoodWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vFoodLocalPosition = position;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        /* glsl */ `
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
            p += dot(p, p.yzx + 19.19);
            return fract((p.x + p.y) * p.z);
          }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        /* glsl */ `
          vec3 foodN = normalize(vFoodWorldNormal);
          vec3 foodV = normalize(cameraPosition - vFoodWorldPosition);
          float foodNdotV = clamp(dot(foodN, foodV), 0.0, 1.0);
          vec3 foodLightDirection = normalize(vec3(0.42, 0.84, 0.38));
          vec3 foodHalfVector = normalize(foodLightDirection + foodV);

          // Tiny tonal irregularities keep broad areas (bun, cream, cheese) from
          // reading as a perfectly uniform digital surface.
          float grainA = foodGrain(vFoodLocalPosition * 18.0);
          float grainB = foodGrain(vFoodLocalPosition * 47.0 + 2.7);
          float pores = smoothstep(0.73, 0.98, grainA) * (0.025 + 0.035 * grainB);
          outgoingLight *= 1.0 - pores;

          // A soft, view-dependent moisture highlight. The moving term is nearly
          // imperceptible: it gives oil and glaze life without looking glittery.
          float highlight = pow(max(dot(foodN, foodHalfVector), 0.0), mix(38.0, 18.0, uFoodMoisture));
          float shimmer = 0.93 + sin(uFoodTime * 0.7 + grainA * 11.0) * 0.07;
          outgoingLight += mix(uFoodRimColor, vec3(1.0), 0.35) * highlight * uFoodMoisture * 0.075 * shimmer;

          // Warm edge translucency suggests thin leaves, cheese and soft food
          // without replacing the physically based lighting from the glTF.
          float backLight = pow(clamp(dot(-foodN, foodLightDirection), 0.0, 1.0), 1.7);
          outgoingLight += outgoingLight * uFoodSssColor * backLight * uFoodSssIntensity;

          float rim = pow(1.0 - foodNdotV, uFoodRimPower);
          outgoingLight += uFoodRimColor * rim * uFoodRimIntensity;

          #include <opaque_fragment>
        `
      );
    };

    material.customProgramCacheKey = () => 'foodlink-culinary-surface-v2';
    material.needsUpdate = true;
  }
}
