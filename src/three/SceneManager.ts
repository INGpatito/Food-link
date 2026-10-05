import * as THREE from 'three';
import gsap from 'gsap';
import { LightingSetup } from './LightingSetup';
import { ModelLoader } from './ModelLoader';
import { MODEL_PATHS, MODEL_CONFIGS, MODEL_TRANSITIONS } from '../utils/constants';

type ModelSection = keyof typeof MODEL_PATHS;
type SceneSection = ModelSection | 'footer';

const ALL_MODEL_SECTIONS: ModelSection[] = ['hero', 'features', 'salad', 'menu', 'extra'];

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lighting: LightingSetup;
  private modelLoader: ModelLoader;
  
  public models: Partial<Record<ModelSection, THREE.Group>> = {};
  public modelGroup: THREE.Group; // Group to hold the active model for floating animations
  
  private clock: THREE.Timer;
  private basePositionY: number = 0;
  private isFloatingEnabled: boolean = true;
  private activeSection: SceneSection = 'hero';
  private initialLoadComplete: boolean = false;
  private loadingModels = new Map<ModelSection, Promise<THREE.Group | null>>();
  public activeModel: THREE.Group | null = null;
  public activeModelSection: ModelSection | null = null;
  private modelBaseScales = new WeakMap<THREE.Group, THREE.Vector3>();
  private transitionTimeline: gsap.core.Timeline | null = null;
  private transitionDirection: -1 | 0 | 1 = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.lighting = new LightingSetup(this.scene);
    this.modelLoader = new ModelLoader();
    this.clock = new THREE.Timer();
    this.clock.connect(document);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public async init() {
    this.lighting.init();
    this.animate();

    // Preload ALL models concurrently so switching is immediate and synchronous
    await Promise.all(ALL_MODEL_SECTIONS.map((sec) => this.loadModel(sec)));

    this.initialLoadComplete = true;
    this.setActiveModel(this.activeSection, 0);
  }

  public async loadModel(section: ModelSection): Promise<THREE.Group | null> {
    if (this.models[section]) return this.models[section]!;

    const pendingLoad = this.loadingModels.get(section);
    if (pendingLoad) return pendingLoad;

    const loadTask = (async () => {
      try {
        const model = await this.modelLoader.load(MODEL_PATHS[section], section);
        this.applyConfig(model, MODEL_CONFIGS[section]);
        this.models[section] = model;

        // If this section is currently requested, activate it immediately
        if (this.initialLoadComplete && this.activeSection === section) {
          this.setActiveModel(section, this.transitionDirection);
        }
        return model;
      } catch (error) {
        console.error(`Falló la carga del modelo 3D (${section}):`, error);
        return null;
      } finally {
        this.loadingModels.delete(section);
      }
    })();

    this.loadingModels.set(section, loadTask);
    return loadTask;
  }

  private applyConfig(model: THREE.Group, config: (typeof MODEL_CONFIGS)[ModelSection]) {
    model.scale.multiplyScalar(config.scale);
    model.position.set(config.position.x, config.position.y, config.position.z);
    model.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
    this.modelBaseScales.set(model, model.scale.clone());
    model.visible = false;
  }

  public preloadModel(section: ModelSection): void {
    void this.loadModel(section);
  }

  private hideAllExcept(keepModel: THREE.Group | null = null): void {
    for (const key of ALL_MODEL_SECTIONS) {
      const model = this.models[key];
      if (model && model !== keepModel) {
        model.visible = false;
        if (model.parent === this.modelGroup) {
          this.modelGroup.remove(model);
        }
      }
    }
  }

  public setActiveModel(section: SceneSection, direction: -1 | 0 | 1 = 1) {
    this.activeSection = section;
    this.transitionDirection = direction;

    // Handle Footer section (no 3D model)
    if (section === 'footer') {
      this.exitActiveModel();
      return;
    }

    const targetModel = this.models[section];

    // If target model hasn't finished loading yet, hide any current model to prevent wrong product
    if (!targetModel) {
      this.hideAllExcept(null);
      this.activeModel = null;
      this.activeModelSection = null;
      void this.loadModel(section);
      return;
    }

    // Already showing target model
    if (
      this.activeModel === targetModel
      && this.activeModelSection === section
      && targetModel.visible
      && !this.transitionTimeline
    ) {
      this.lighting.updateForSection(section);
      return;
    }

    // Kill any in-flight transition
    if (this.transitionTimeline) {
      this.transitionTimeline.kill();
      this.transitionTimeline = null;
    }

    const previousModel = this.activeModel;
    const previousSection = this.activeModelSection;

    // Isolate immediately: hide all other models that are neither previous nor target
    for (const key of ALL_MODEL_SECTIONS) {
      const other = this.models[key];
      if (other && other !== previousModel && other !== targetModel) {
        other.visible = false;
        if (other.parent === this.modelGroup) {
          this.modelGroup.remove(other);
        }
      }
    }

    this.activeModel = targetModel;
    this.activeModelSection = section;
    this.lighting.updateForSection(section);
    this.isFloatingEnabled = false;

    // Target transforms
    const config = MODEL_CONFIGS[section];
    const compactLayout = this.camera.aspect < 1;
    const mobileYMap: Record<string, number> = {
      hero: -1.42,
      features: -1.86,
      salad: -1.42,
      menu: -1.42,
      extra: -1.86,
    };
    const mobileY = mobileYMap[section] ?? config.position.y;
    const targetPosition = new THREE.Vector3(
      compactLayout ? 0 : config.position.x,
      compactLayout ? mobileY : config.position.y,
      config.position.z
    );
    const viewportScale = compactLayout
      ? Math.min(0.62, Math.max(0.46, this.camera.aspect * 0.95))
      : 1;
    const targetScale = (this.modelBaseScales.get(targetModel) ?? targetModel.scale)
      .clone()
      .multiplyScalar(viewportScale);
    const targetRotation = new THREE.Euler(config.rotation.x, config.rotation.y, config.rotation.z);

    this.basePositionY = targetPosition.y;

    targetModel.visible = true;
    if (targetModel.parent !== this.modelGroup) {
      this.modelGroup.add(targetModel);
    }

    const entrySide = MODEL_TRANSITIONS[section].enterFrom;
    const distance = Math.max(0.1, this.camera.position.z - targetPosition.z);
    const horizontalHalfView = distance
      * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
      * this.camera.aspect;
    const offscreenEntryX = entrySide * (horizontalHalfView + 1.8);

    const isDifferentModel = previousModel !== targetModel;

    // If coming from another model, start target model from offscreen
    if (isDifferentModel) {
      targetModel.position.set(offscreenEntryX, targetPosition.y - 0.15, targetPosition.z - 0.25);
      targetModel.scale.copy(targetScale).multiplyScalar(0.85);
      targetModel.rotation.set(
        targetRotation.x + 0.05,
        targetRotation.y + entrySide * 0.3,
        targetRotation.z
      );
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        if (this.transitionTimeline !== timeline) return;
        this.transitionTimeline = null;
        this.isFloatingEnabled = true;

        if (previousModel && isDifferentModel) {
          previousModel.visible = false;
          if (previousModel.parent === this.modelGroup) {
            this.modelGroup.remove(previousModel);
          }
        }
        this.hideAllExcept(targetModel);
      }
    });

    this.transitionTimeline = timeline; // Store reference to the current transition timeline

    // Animate previous model OUT
    if (previousModel && isDifferentModel && previousModel.visible) {
      const exitSide = previousSection ? MODEL_TRANSITIONS[previousSection].exitTo : -1;
      const offscreenExitX = exitSide * (horizontalHalfView + 1.8);
      const exitScale = previousModel.scale.clone().multiplyScalar(0.78);

      timeline.to(previousModel.position, {
        x: offscreenExitX,
        y: previousModel.position.y + 0.15,
        z: previousModel.position.z - 0.25,
        duration: 0.38,
        ease: 'power2.in',
        onComplete: () => {
          previousModel.visible = false;
          if (previousModel.parent === this.modelGroup) {
            this.modelGroup.remove(previousModel);
          }
        }
      }, 0);

      timeline.to(previousModel.scale, {
        x: exitScale.x,
        y: exitScale.y,
        z: exitScale.z,
        duration: 0.38,
        ease: 'power2.in'
      }, 0);
    }

    // Animate target model IN
    const startDelay = (previousModel && isDifferentModel && previousModel.visible) ? 0.05 : 0;
    timeline.to(targetModel.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: isDifferentModel ? 0.52 : 0.35,
      ease: 'power3.out'
    }, startDelay);

    timeline.to(targetModel.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: isDifferentModel ? 0.52 : 0.35,
      ease: 'power3.out'
    }, startDelay);

    timeline.to(targetModel.rotation, {
      x: targetRotation.x,
      y: targetRotation.y,
      z: targetRotation.z,
      duration: isDifferentModel ? 0.52 : 0.35,
      ease: 'power2.out'
    }, startDelay);
  }

  private exitActiveModel(): void {
    if (!this.activeModel) return;

    if (this.transitionTimeline) {
      this.transitionTimeline.kill();
      this.transitionTimeline = null;
    }

    const model = this.activeModel;
    const section = this.activeModelSection;
    this.isFloatingEnabled = false;

    const exitSide = section ? MODEL_TRANSITIONS[section].exitTo : -1;
    const distance = Math.max(0.1, this.camera.position.z - model.position.z);
    const horizontalHalfView = distance
      * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
      * this.camera.aspect;
    const exitX = exitSide * (horizontalHalfView + 1.8);
    const exitScale = model.scale.clone().multiplyScalar(0.75);

    const timeline = gsap.timeline({
      onComplete: () => {
        if (this.transitionTimeline !== timeline) return;
        this.hideAllExcept(null);
        this.activeModel = null;
        this.activeModelSection = null;
        this.transitionTimeline = null;
        this.isFloatingEnabled = true;
      }
    });

    this.transitionTimeline = timeline;
    timeline.to(model.position, {
      x: exitX,
      y: model.position.y + 0.2,
      z: model.position.z - 0.3,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);
    timeline.to(model.scale, {
      x: exitScale.x,
      y: exitScale.y,
      z: exitScale.z,
      duration: 0.4,
      ease: 'power2.in'
    }, 0);
  }

  private animate = (time?: number) => {
    requestAnimationFrame(this.animate);

    this.clock.update(time);
    const elapsedTime = this.clock.getElapsed();

    if (this.isFloatingEnabled && this.activeModel && this.activeModel.visible) {
      this.activeModel.position.y = this.basePositionY + Math.sin(elapsedTime * 1.5) * 0.05;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (this.activeModel && this.activeModelSection) {
      this.setActiveModel(this.activeModelSection, 0);
    }
  }

  public getCamera() { return this.camera; }
  public getModelGroup() { return this.modelGroup; }
}
