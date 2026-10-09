import * as THREE from 'three';
import gsap from 'gsap';
import { LightingSetup } from './LightingSetup';
import { ModelLoader } from './ModelLoader';
import { MODEL_PATHS, MODEL_CONFIGS } from '../utils/constants';
import { MaterialEnhancer } from './shaders/MaterialEnhancerShader';
import { VolumetricRaysShader } from './shaders/VolumetricRaysShader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { checkIsHighEndGPU } from '../utils/GPUDeviceDetector';
import { PostProcessingManager } from './PostProcessingManager';

type ModelSection = keyof typeof MODEL_PATHS;
type SceneSection = ModelSection | 'footer';

const ALL_MODEL_SECTIONS: ModelSection[] = ['hero', 'features', 'salad', 'menu', 'extra'];

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lighting: LightingSetup;
  private modelLoader: ModelLoader;
  private postProcessing: PostProcessingManager;
  
  public materialEnhancer: MaterialEnhancer;
  public raysShader: VolumetricRaysShader;

  public models: Partial<Record<ModelSection, THREE.Group>> = {};
  public modelGroup: THREE.Group;
  
  private clock: THREE.Timer;
  private activeSection: SceneSection = 'hero';
  private loadingModels = new Map<ModelSection, Promise<THREE.Group | null>>();
  public activeModelSection: ModelSection | null = null;
  private modelBaseScales = new WeakMap<THREE.Group, THREE.Vector3>();
  
  private mouseNormalized = new THREE.Vector2(0, 0);
  private targetMouseNormalized = new THREE.Vector2(0, 0);
  private isRTX: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.isRTX = checkIsHighEndGPU();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !this.isRTX, // Disable MSAA if we use heavy post-processing targets to save bandwidth
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // RTX Shadow Upgrades
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.isRTX ? THREE.VSMShadowMap : THREE.PCFShadowMap;

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.raysShader = new VolumetricRaysShader();
    this.scene.add(this.raysShader.mesh);

    this.materialEnhancer = new MaterialEnhancer();
    this.lighting = new LightingSetup(this.scene);
    this.modelLoader = new ModelLoader();
    this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);
    
    this.clock = new THREE.Timer();
    this.clock.connect(document);

    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.targetMouseNormalized.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouseNormalized.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public async init() {
    this.lighting.init();
    this.lighting.updateForSection('hero');
    this.postProcessing.init(this.isRTX);
    
    // Añadir reflejos fotorealistas (entorno de estudio fotográfico)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();
    
    this.animate();

    const initialSection = (this.activeSection === 'footer' ? 'hero' : this.activeSection) as ModelSection;
    await this.loadModel(initialSection);

    const remainingSections = ALL_MODEL_SECTIONS.filter((sec) => sec !== initialSection);
    void Promise.all(remainingSections.map((sec) => this.loadModel(sec)));
  }

  public async loadModel(section: ModelSection): Promise<THREE.Group | null> {
    if (this.models[section]) return this.models[section]!;
    if (this.loadingModels.has(section)) return this.loadingModels.get(section)!;

    const loadTask = (async () => {
      try {
        const model = await this.modelLoader.load(MODEL_PATHS[section], section);
        const config = MODEL_CONFIGS[section];
        model.scale.multiplyScalar(config.scale);
        this.materialEnhancer.enhanceModel(model, section);
        this.modelBaseScales.set(model, model.scale.clone());
        model.visible = false;
        
        // Usamos el shader PBR fotorrealista estándar de Three.js (Materiales GLTF puros)
        this.models[section] = model;
        return model;
      } catch (error) {
        console.error(`Fallo la carga del modelo 3D (${section}):`, error);
        return null;
      } finally {
        this.loadingModels.delete(section);
      }
    })();

    this.loadingModels.set(section, loadTask);
    return loadTask;
  }

  // ── Solo actualiza Shaders e Iluminación (el movimiento se hace en animate) ──
  public setActiveModel(section: SceneSection, direction: -1 | 0 | 1 = 1) {
    this.activeSection = section;

    if (section === 'footer') {
      this.raysShader.setSection('footer');
      return;
    }

    this.activeModelSection = section;
    this.lighting.updateForSection(section);
    this.raysShader.setSection(section);
  }

  // ── ADN Spiral Math ──
  private updateModelsScrub(elapsedTime: number) {
    const vh = window.innerHeight;
    const viewportCenter = vh / 2;
    const compactLayout = this.camera.aspect < 1;
    const viewportScale = compactLayout ? Math.min(0.62, Math.max(0.46, this.camera.aspect * 0.95)) : 1;

    for (const section of ALL_MODEL_SECTIONS) {
      const model = this.models[section];
      const el = document.getElementById(`${section}-root`);
      if (!model || !el) continue;

      const rect = el.getBoundingClientRect();
      
      // Ampliamos el rango para que los modelos vecinos se vean espiralar juntos
      if (rect.bottom > -vh * 0.8 && rect.top < vh * 1.8) {
        if (!model.visible) {
          model.visible = true;
          if (model.parent !== this.modelGroup) {
            // Inicializar posición lejos para que no salte al entrar
            model.position.y = -10; 
            this.modelGroup.add(model);
          }
        }

        const elCenter = rect.top + rect.height / 2;
        // Progress: -1 (arriba), 0 (centro), 1 (abajo)
        const progress = (elCenter - viewportCenter) / vh; 

        const config = MODEL_CONFIGS[section];
        const baseRot = config.rotation;
        
        const mobileYMap: Record<string, number> = {
          hero: -1.42, features: -1.86, salad: -1.42, menu: -1.42, extra: -1.86,
        };
        const basePositionY = compactLayout ? (mobileYMap[section] ?? config.position.y) : config.position.y;
        const basePositionX = compactLayout ? 0 : config.position.x;
        
        // ── Matemáticas de la Hélice (ADN) ──
        // En móvil la hélice se estrecha, pero nunca se detiene: todos los platos
        // participan en la misma torsión que el contenido de la página.
        const helixRadius = compactLayout ? 0.52 : 1.4;
        const spiralY = -progress * 6.5; 
        const spiralAngle = progress * Math.PI * 1.2;
        
        const xOrbit = basePositionX + Math.sin(spiralAngle) * helixRadius;
        const zOrbit = config.position.z - Math.abs(Math.sin(spiralAngle)) * 1.2;
        
        const targetX = xOrbit;
        const floatOffset = Math.sin(elapsedTime * 1.5 + progress) * 0.05;
        const targetY = basePositionY + spiralY + floatOffset;
        const targetZ = zOrbit - Math.abs(progress) * 2.5;

        const targetRotX = baseRot.x - this.mouseNormalized.y * 0.10 + progress * 0.3;
        const targetRotY = baseRot.y + spiralAngle + this.mouseNormalized.x * 0.14;
        const targetRotZ = baseRot.z;

        // Sin suavizado en posición y escala para que se muevan EXACTAMENTE con la página
        model.position.x = targetX;
        model.position.y = targetY;
        model.position.z = targetZ;
        
        // Suavizado rápido solo en rotación para que el tilt del ratón sea fluido
        model.rotation.x += (targetRotX - model.rotation.x) * 0.15;
        model.rotation.y += (targetRotY - model.rotation.y) * 0.15;
        model.rotation.z += (targetRotZ - model.rotation.z) * 0.15;

        const targetScale = (this.modelBaseScales.get(model) ?? model.scale).clone().multiplyScalar(viewportScale);
        const scaleMult = Math.max(0.01, 1.0 - Math.abs(progress) * 0.45);
        targetScale.multiplyScalar(scaleMult);
        model.scale.copy(targetScale);

      } else {
        if (model.visible) {
          model.visible = false;
          if (model.parent === this.modelGroup) {
            this.modelGroup.remove(model);
          }
        }
      }
    }
  }

  private animate = (time?: number) => {
    requestAnimationFrame(this.animate);

    this.clock.update(time);
    const elapsedTime = this.clock.getElapsed();

    this.raysShader.update(elapsedTime);
    this.materialEnhancer.update(elapsedTime);
    this.lighting.update(elapsedTime);
    this.mouseNormalized.lerp(this.targetMouseNormalized, 0.05);

    // Ejecutar el scrub continuo de los modelos 3D
    this.updateModelsScrub(elapsedTime);

    if (!this.postProcessing.render()) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing.resize(width, height);
  }

  public getCamera() { return this.camera; }
  public getModelGroup() { return this.modelGroup; }
}
