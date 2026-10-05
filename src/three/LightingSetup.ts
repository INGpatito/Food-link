import * as THREE from 'three';

export class LightingSetup {
  private scene: THREE.Scene;
  
  private ambientLight!: THREE.AmbientLight;
  private dirLightMain!: THREE.DirectionalLight;
  private dirLightFill!: THREE.DirectionalLight;
  private spotLight!: THREE.SpotLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public init() {
    // Base ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Main directional (Key light)
    this.dirLightMain = new THREE.DirectionalLight(0xfff5e6, 2.0); // Warm tone
    this.dirLightMain.position.set(5, 5, 5);
    this.scene.add(this.dirLightMain);

    // Fill light (Cool tone to balance)
    this.dirLightFill = new THREE.DirectionalLight(0xddeeff, 1.0);
    this.dirLightFill.position.set(-5, 0, -5);
    this.scene.add(this.dirLightFill);

    // Spotlight for dramatic effect
    this.spotLight = new THREE.SpotLight(0xffffff, 5.0);
    this.spotLight.position.set(0, 10, 0);
    this.spotLight.angle = Math.PI / 6;
    this.spotLight.penumbra = 0.5;
    this.scene.add(this.spotLight);
  }

  public updateForSection(section: 'hero' | 'features' | 'salad' | 'menu' | 'extra') {
    switch (section) {
      case 'hero': // Burger — warm golden highlights
        this.ambientLight.intensity = 0.5;
        this.dirLightMain.intensity = 2.5;
        this.dirLightMain.color.setHex(0xfff5e6);
        this.dirLightMain.position.set(5, 2, 5);
        this.dirLightFill.intensity = 0.5;
        this.dirLightFill.color.setHex(0xddeeff);
        this.spotLight.intensity = 0;
        break;

      case 'features': // Pizza — warm overhead, tomato red accent
        this.ambientLight.intensity = 1.0;
        this.dirLightMain.intensity = 1.2;
        this.dirLightMain.color.setHex(0xffe8d6);
        this.dirLightMain.position.set(0, 10, 0);
        this.dirLightFill.intensity = 0.8;
        this.dirLightFill.color.setHex(0xe86a33);
        this.spotLight.intensity = 2.0;
        break;

      case 'salad': // Salad — bright, natural daylight feel
        this.ambientLight.intensity = 0.9;
        this.dirLightMain.intensity = 1.6;
        this.dirLightMain.color.setHex(0xfff9f0);
        this.dirLightMain.position.set(-3, 8, 5);
        this.dirLightFill.intensity = 0.8;
        this.dirLightFill.color.setHex(0xc8e6a0);
        this.spotLight.intensity = 1.2;
        break;

      case 'menu': // Cake — dramatic violet & berry fill
        this.ambientLight.intensity = 0.6;
        this.dirLightMain.intensity = 2.5;
        this.dirLightMain.color.setHex(0xffeeff);
        this.dirLightMain.position.set(3, 5, 5);
        this.dirLightFill.intensity = 1.5;
        this.dirLightFill.color.setHex(0x6b4eff);
        this.spotLight.intensity = 1.0;
        break;

      case 'extra': // Chocolate Cupcake — moody, warm cocoa tones
        this.ambientLight.intensity = 0.45;
        this.dirLightMain.intensity = 2.2;
        this.dirLightMain.color.setHex(0xffe0c0);
        this.dirLightMain.position.set(5, 5, -3);
        this.dirLightFill.intensity = 1.0;
        this.dirLightFill.color.setHex(0xc7452a);
        this.spotLight.intensity = 2.5;
        break;
    }
  }
}
