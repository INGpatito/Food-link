import * as THREE from 'three';
import gsap from 'gsap';
import { LightingSetup } from './LightingSetup';
import { ModelLoader } from './ModelLoader';
import { MODEL_PATHS, MODEL_CONFIGS, SECTION_THEMES } from '../utils/constants';
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
  
  private rtxCursorGroup: THREE.Group | null = null;
  private cursorLight: THREE.PointLight | null = null;

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
    // CRÍTICO: Limitar PixelRatio a 1.25 máximo si estamos usando Post-Procesado pesado. 
    // Hacer GTAO/Bloom en pantallas retina o 4K (PixelRatio 2) asfixia incluso a las mejores gráficas.
    this.renderer.setPixelRatio(this.isRTX ? Math.min(window.devicePixelRatio, 1.25) : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Sombras estándar de alto rendimiento
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    if (this.isRTX) {
      document.body.classList.add('rtx-enabled');
      document.documentElement.style.setProperty('--rt-light-color', 'rgb(245, 166, 65)');
      this.rtxCursorGroup = new THREE.Group();
      
      // Luz física atada al cursor (Efecto sutil, elegante y fotorealista)
      // Parámetros: Color, Intensidad baja (0.8), Distancia corta (5.0), Decaimiento físico realista (2.0)
      this.cursorLight = new THREE.PointLight(0xffffff, 0.8, 5.0, 2.0);
      this.cursorLight.castShadow = true;
      this.cursorLight.shadow.mapSize.width = 1024; // Alta resolución para sombras limpias
      this.cursorLight.shadow.mapSize.height = 1024;
      this.cursorLight.shadow.bias = -0.001;
      this.cursorLight.shadow.radius = 12; // Penumbra extremadamente suave
      
      this.rtxCursorGroup.add(this.cursorLight);
      this.scene.add(this.rtxCursorGroup);
    }

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

    // Actualizar dinámicamente el color de la luz del cursor (Web RTX)
    if (this.cursorLight) {
      const theme = SECTION_THEMES[section as keyof typeof SECTION_THEMES];
      let targetColor = '#ffffff'; // Default
      
      if (theme && theme['--ambient-primary']) {
        const rgbaMatch = theme['--ambient-primary'].match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbaMatch) {
          targetColor = `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`;
        }
      }

      document.documentElement.style.setProperty('--rt-light-color', targetColor);

      gsap.to(this.cursorLight.color, {
        r: new THREE.Color(targetColor).r,
        g: new THREE.Color(targetColor).g,
        b: new THREE.Color(targetColor).b,
        duration: 1.5,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    }
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

        // En dispositivos móviles (compactLayout), bajamos los modelos 3D a la mitad 
        // inferior de la pantalla (valores Y negativos) para que el texto esté arriba.
        // La pantalla va de +2.07 (top) a -2.07 (bottom). El centro del hueco inferior es ~ -1.0.
        const mobileYMap: Record<string, number> = {
          hero: -0.85, features: -1.05, salad: -0.95, menu: -0.95, extra: -1.0,
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

    // Mover el Cursor 3D si estamos en modo RTX
    if (this.rtxCursorGroup) {
      const vector = new THREE.Vector3(this.mouseNormalized.x, this.mouseNormalized.y, 0.5);
      vector.unproject(this.camera);
      const dir = vector.sub(this.camera.position).normalize();
      const distance = (1.5 - this.camera.position.z) / dir.z; // Plano Z=1.5 (Frente a los modelos)
      const targetPos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      this.rtxCursorGroup.position.lerp(targetPos, 0.12); // Movimiento cinematográfico con "peso"

      // Proyectar física de luz RT a la tipografía del DOM (0 a 1)
      const normX = this.mouseNormalized.x * 0.5 + 0.5;
      const normY = -this.mouseNormalized.y * 0.5 + 0.5;
      document.documentElement.style.setProperty('--rt-light-x', normX.toFixed(3));
      document.documentElement.style.setProperty('--rt-light-y', normY.toFixed(3));
    }

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
