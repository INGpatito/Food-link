import * as THREE from 'three';
import gsap from 'gsap';

type FoodSection = 'hero' | 'features' | 'salad' | 'menu' | 'extra';

interface LightPreset {
  ambient: number;
  hemisphere: number;
  envIntensity: number;
  key: { color: number; intensity: number; position: [number, number, number] };
  fill: { color: number; intensity: number; position: [number, number, number] };
  rim: { color: number; intensity: number; position: [number, number, number] };
  spot: { color: number; intensity: number; position: [number, number, number] };
}

const PRESETS: Record<FoodSection, LightPreset> = {
  hero: { // Burger - Sunny, bright, warm
    ambient: 0.05, hemisphere: 0.3, envIntensity: 0.85,
    key:  { color: 0xfff0df, intensity: 0.8, position: [4.5, 5.5, 5.5] },
    fill: { color: 0xff9900, intensity: 0.2, position: [-5, 1.5, 3] },
    rim:  { color: 0xff3300, intensity: 0.3, position: [-4, 4, -4] },
    spot: { color: 0xfff2df, intensity: 1.5, position: [0, 7, 4] },
  },
  features: { // Pizza - Dark, oven fire, tomato red & golden crust
    ambient: 0.02, hemisphere: 0.05, envIntensity: 0.15,
    key:  { color: 0xff5500, intensity: 1.2, position: [-3.5, 6, 5] },
    fill: { color: 0xff0000, intensity: 0.4, position: [5, 1, 2] },
    rim:  { color: 0xffaa00, intensity: 0.5, position: [4, 4, -5] },
    spot: { color: 0xffaa55, intensity: 1.8, position: [0, 8, 3] },
  },
  salad: { // Salad - Crisp, morning light, leafy green & lemon
    ambient: 0.08, hemisphere: 0.4, envIntensity: 0.95,
    key:  { color: 0xffffff, intensity: 0.8, position: [-4.5, 6, 5] },
    fill: { color: 0x55ff00, intensity: 0.3, position: [5, 2, 2] },
    rim:  { color: 0xffff00, intensity: 0.4, position: [3, 5, -4] },
    spot: { color: 0xeeffcc, intensity: 1.5, position: [0, 8, 4] },
  },
  menu: { // Cake - Nighttime, cherry pink & vanilla white
    ambient: 0.02, hemisphere: 0.08, envIntensity: 0.2,
    key:  { color: 0xffffff, intensity: 0.9, position: [4, 5.5, 5] },
    fill: { color: 0xff0066, intensity: 0.6, position: [-5, 1.5, 2] },
    rim:  { color: 0xff99cc, intensity: 0.5, position: [-4, 5, -4] },
    spot: { color: 0xffccdd, intensity: 1.6, position: [0, 8, 3] },
  },
  extra: { // Cupcake - Rich glossy chocolate, warm studio lighting
    ambient: 0.05, hemisphere: 0.1, envIntensity: 0.45,
    key:  { color: 0xffeedd, intensity: 1.5, position: [-2, 5, 5] },
    fill: { color: 0xaa5533, intensity: 0.8, position: [4, 2, 2] },
    rim:  { color: 0xffffff, intensity: 1.0, position: [0, 5, -5] },
    spot: { color: 0xffeebb, intensity: 2.0, position: [-2, 8, 2] },
  },
};

/** A small, warm studio rig that adapts to the food currently on screen. */
export class LightingSetup {
  private scene: THREE.Scene;
  private ambientLight!: THREE.AmbientLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private spotLight!: THREE.SpotLight;
  private keyTarget = new THREE.Object3D();
  private spotTarget = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public init() {
    this.ambientLight = new THREE.AmbientLight(0xfff2df, 0.05);
    this.hemisphereLight = new THREE.HemisphereLight(0xfff5e7, 0x3b261b, 0.3);

    this.keyLight = new THREE.DirectionalLight(0xffe0bc, 0.85);
    this.fillLight = new THREE.DirectionalLight(0xff9d5c, 0.15);
    this.rimLight = new THREE.DirectionalLight(0xffbf80, 0.25);
    this.spotLight = new THREE.SpotLight(0xffecd1, 1.5, 18, Math.PI / 5.2, 0.78, 1.7);

    this.keyLight.position.set(4.5, 5.5, 5.5);
    this.fillLight.position.set(-5, 1.5, 3);
    this.rimLight.position.set(-4, 4, -4);
    this.spotLight.position.set(0, 7, 4);
    this.keyTarget.position.set(0, 0, 0);
    this.spotTarget.position.set(0, -0.3, 0);

    this.keyLight.target = this.keyTarget;
    this.spotLight.target = this.spotTarget;
    this.keyLight.castShadow = true;
    this.spotLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.00025;
    this.spotLight.shadow.mapSize.set(1024, 1024);
    this.spotLight.shadow.bias = -0.0002;

    this.scene.add(
      this.ambientLight,
      this.hemisphereLight,
      this.keyLight,
      this.fillLight,
      this.rimLight,
      this.spotLight,
      this.keyTarget,
      this.spotTarget,
    );
  }

  public updateForSection(section: FoodSection) {
    const preset = PRESETS[section];
    
    gsap.to(this.ambientLight, { intensity: preset.ambient, duration: 0.8, ease: 'power2.out' });
    gsap.to(this.hemisphereLight, { intensity: preset.hemisphere, duration: 0.8, ease: 'power2.out' });
    gsap.to(this.scene, { environmentIntensity: preset.envIntensity, duration: 0.8, ease: 'power2.out' });
    
    this.animateLight(this.keyLight, preset.key);
    this.animateLight(this.fillLight, preset.fill);
    this.animateLight(this.rimLight, preset.rim);
    this.animateLight(this.spotLight, preset.spot);
  }

  /** Barely perceptible breathing keeps specular reflections from feeling frozen. */
  public update(elapsedTime: number) {
    const drift = Math.sin(elapsedTime * 0.48) * 0.13;
    this.spotTarget.position.x = drift;
    this.spotTarget.position.y = -0.25 + Math.cos(elapsedTime * 0.35) * 0.08;
  }

  private animateLight(
    light: THREE.DirectionalLight | THREE.SpotLight,
    value: LightPreset['key']
  ) {
    gsap.to(light, { intensity: value.intensity, duration: 0.8, ease: 'power2.out' });
    gsap.to(light.position, { x: value.position[0], y: value.position[1], z: value.position[2], duration: 0.8, ease: 'power2.out' });
    
    const targetColor = new THREE.Color(value.color);
    gsap.to(light.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration: 0.8, ease: 'power2.out' });
  }
}
