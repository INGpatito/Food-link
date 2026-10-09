import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class PostProcessingManager {
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gtaoPass: GTAOPass | null = null;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {}

  public init(isRTX: boolean) {
    if (!isRTX) {
      console.log('PostProcessingManager: Pipeline estándar activado (Composer desactivado).');
      return;
    }

    console.log('PostProcessingManager: Inicializando Pipeline ULTRA RTX 🚀');

    // Create a render target with Alpha format to preserve CSS background
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      generateMipmaps: false,
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);
    
    // 1. Render Scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. GTAO (Ground Truth Ambient Occlusion) - Realistic crevice shadows (Web RTX)
    this.gtaoPass = new GTAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.blendMode = THREE.MultiplyBlending;
    this.composer.addPass(this.gtaoPass);

    // 3. Cinematic Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.22,  // Reduced strength so shadows pop more
      0.65,  // radius
      0.85   // threshold
    );
    this.composer.addPass(this.bloomPass);

    // 4. Output (Tone mapping & sRGB)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  public resize(width: number, height: number) {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
  }

  public render() {
    if (this.composer) {
      this.composer.render();
      return true;
    }
    return false;
  }
}
