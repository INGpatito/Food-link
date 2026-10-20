import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { detectGPUCapabilities, type HardwareInfo, type HardwareTier } from './GPUDetector.ts';
import { ClochePlatterRig } from './ClochePlatterRig.ts';
import { FoodDishManager } from './FoodDishManager.ts';
import { StudioLighting } from './StudioLighting.ts';
import { AtmosphericFX } from './AtmosphericFX.ts';
import { OrbitalMorphController } from './OrbitalMorphController.ts';

export interface TelemetryData {
    stageIndex: number;
    dishName: string;
    atmosphere: string;
    rotY: number;
    lift: number;
    scrollProgress: number;
}

/**
 * Master Three.js Scene Manager orchestrating renderer, camera, lighting,
 * procedural platter/cloche rig, dishes, particles, and post-processing.
 * Zero emojis strictly enforced.
 */
export class SceneManager {
    public container: HTMLElement;
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public composer!: EffectComposer;
    public bloomPass!: UnrealBloomPass;
    public rayTracingPass!: ShaderPass;

    public clocheRig!: ClochePlatterRig;
    public dishManager!: FoodDishManager;
    public lightingSetup!: StudioLighting;
    public atmosphericFX!: AtmosphericFX;
    public morphController!: OrbitalMorphController;

    public hardwareInfo: HardwareInfo;
    public renderMode: HardwareTier = 'standard';

    // State Variables
    public currentScroll = 0;
    public targetScroll = 0;
    public scrollVelocity = 0;
    public mouseX = 0;
    public mouseY = 0;
    public targetMouseX = 0;
    public targetMouseY = 0;

    public isDragging = false;
    public prevPointerX = 0;
    public prevPointerY = 0;
    public dragRotX = 0;
    public dragRotY = 0;
    public targetDragRotX = 0;
    public targetDragRotY = 0;

    public inspectMode = false;
    public manualRotX = 0;
    public manualRotY = 0;
    public manualExplode = 0.60;
    public inspectDishIndex = 0;
    public activeStageIndex = 0;

    private currentLookAtY = 0.08;
    private clock = new THREE.Clock();
    private animFrameId: number | null = null;
    private studioEnvMap!: THREE.Texture;

    // Telemetry Callback
    public onTelemetryUpdate?: (data: TelemetryData) => void;
    public onHardwareDetected?: (info: HardwareInfo) => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.hardwareInfo = detectGPUCapabilities();
        this.renderMode = this.hardwareInfo.tier;

        // Scene & Fog
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x201610, 0.032);

        // Camera
        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.15, 9.2);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.22;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // Studio Environment & Post Processing
        this.setupStudioEnvironment();
        this.setupPostProcessing();

        // Subsystems
        this.clocheRig = new ClochePlatterRig();
        this.scene.add(this.clocheRig.masterGroup);

        this.dishManager = new FoodDishManager(this.clocheRig.foodPlatterMount, () => {
            if (this.clocheRig.loadingPlaceholderGroup) {
                this.clocheRig.loadingPlaceholderGroup.visible = false;
            }
        });

        this.lightingSetup = new StudioLighting(this.scene);
        this.atmosphericFX = new AtmosphericFX(this.scene, this.clocheRig.platterGroup);

        this.morphController = new OrbitalMorphController(
            this.camera,
            this.clocheRig.orbitalRingGroup,
            this.clocheRig.orbitNodes,
            [null, null, null, null]
        );

        // Apply detected tier
        this.applyRenderMode(this.renderMode);

        // Bind events
        this.bindEvents();

        // Start background GLTF loading
        this.dishManager.loadAllModels();
    }

    private setupStudioEnvironment(): void {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x0b0e0d);

        // Warm top softbox
        const topPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(24, 24),
            new THREE.MeshBasicMaterial({ color: 0xfff6e8, side: THREE.DoubleSide })
        );
        topPanel.position.set(0, 10, 0);
        topPanel.rotation.x = Math.PI / 2;
        envScene.add(topPanel);

        // Terracotta warm rim panel
        const leftPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 13),
            new THREE.MeshBasicMaterial({ color: 0xe86842, side: THREE.DoubleSide })
        );
        leftPanel.position.set(-10, 2.5, 3);
        leftPanel.lookAt(0, 0, 0);
        envScene.add(leftPanel);

        // Sage cool fill panel
        const rightPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 13),
            new THREE.MeshBasicMaterial({ color: 0x95be88, side: THREE.DoubleSide })
        );
        rightPanel.position.set(10, 1.5, -2);
        rightPanel.lookAt(0, 0, 0);
        envScene.add(rightPanel);

        // Saffron front accent halo
        const frontStrip = new THREE.Mesh(
            new THREE.RingGeometry(4.8, 6.2, 64),
            new THREE.MeshBasicMaterial({ color: 0xf8b06a, side: THREE.DoubleSide })
        );
        frontStrip.position.set(0, 2.2, 9);
        envScene.add(frontStrip);

        // Warm back kicker strip
        const backStrip = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 4),
            new THREE.MeshBasicMaterial({ color: 0xffd29c, side: THREE.DoubleSide })
        );
        backStrip.position.set(0, 5.5, -9);
        backStrip.lookAt(0, 0, 0);
        envScene.add(backStrip);

        // Bottom floor bounce
        const bottomPanel = new THREE.Mesh(
            new THREE.PlaneGeometry(24, 24),
            new THREE.MeshBasicMaterial({ color: 0x16110e, side: THREE.DoubleSide })
        );
        bottomPanel.position.set(0, -10, 0);
        bottomPanel.rotation.x = -Math.PI / 2;
        envScene.add(bottomPanel);

        this.studioEnvMap = pmremGenerator.fromScene(envScene, 0.035).texture;
        pmremGenerator.dispose();
        this.scene.environment = this.studioEnvMap;
    }

    private setupPostProcessing(): void {
        const depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
        depthTexture.format = THREE.DepthFormat;
        depthTexture.type = THREE.UnsignedIntType;

        const composerTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            depthTexture: depthTexture,
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter
        });

        this.composer = new EffectComposer(this.renderer, composerTarget);
        this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Ray Traced Lighting Pass
        const RayTracingLightingShader = {
            name: 'RayTracingLightingShader',
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: depthTexture },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uCameraNear: { value: 0.1 },
                uCameraFar: { value: 100.0 },
                uActiveLightCol: { value: new THREE.Color(0xffeed8) },
                uCoreCol: { value: new THREE.Color(0xf4a261) },
                uTime: { value: 0.0 },
                uRayTraceIntensity: { value: 0.0 },
                uSampleCount: { value: 32 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                #include <common>
                #include <packing>
                uniform sampler2D tDiffuse;
                uniform sampler2D tDepth;
                uniform vec2 uResolution;
                uniform float uCameraNear;
                uniform float uCameraFar;
                uniform vec3 uActiveLightCol;
                uniform vec3 uCoreCol;
                uniform float uTime;
                uniform float uRayTraceIntensity;
                uniform int uSampleCount;
                varying vec2 vUv;

                float readDepth(vec2 coord) {
                    float fragCoordZ = texture2D(tDepth, clamp(coord, 0.001, 0.999)).x;
                    float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
                    return viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
                }

                float hash(vec2 p) {
                    p = fract(p * vec2(123.34, 456.21));
                    p += dot(p, p + 45.32);
                    return fract(p.x * p.y);
                }

                void main() {
                    vec4 baseColor = texture2D(tDiffuse, vUv);
                    if (uRayTraceIntensity <= 0.001) {
                        gl_FragColor = baseColor;
                        return;
                    }

                    float centerDepth = readDepth(vUv);
                    if (centerDepth > 0.995) {
                        gl_FragColor = baseColor;
                        return;
                    }

                    vec2 texel = 1.0 / max(uResolution, vec2(1.0));

                    float dL = readDepth(vUv - vec2(texel.x * 2.0, 0.0));
                    float dR = readDepth(vUv + vec2(texel.x * 2.0, 0.0));
                    float dD = readDepth(vUv - vec2(0.0, texel.y * 2.0));
                    float dU = readDepth(vUv + vec2(0.0, texel.y * 2.0));

                    vec3 dX = vec3(texel.x * 2.0, 0.0, dR - dL);
                    vec3 dY = vec3(0.0, texel.y * 2.0, dU - dD);
                    vec3 normal = normalize(cross(dX, dY) + vec3(0.0, 0.0, 0.0001));
                    if (normal.z < 0.0) normal = -normal;

                    vec3 viewDir = normalize(vec3(vUv - 0.5, 0.72));
                    vec3 reflectDir = reflect(-viewDir, normal);

                    float jitter = hash(vUv * uResolution + fract(uTime) * 60.0);
                    vec2 rayStep = normalize(reflectDir.xy + vec2(0.0001)) * texel * 4.5;
                    vec2 rayPos = vUv + rayStep * (1.0 + jitter * 0.5);

                    vec3 rayReflect = vec3(0.0);
                    float maxSteps = float(uSampleCount);

                    for (int i = 0; i < 36; i++) {
                        if (float(i) >= maxSteps) break;
                        if (rayPos.x < 0.0 || rayPos.x > 1.0 || rayPos.y < 0.0 || rayPos.y > 1.0) break;

                        float sDepth = readDepth(rayPos);
                        float expectedDepth = centerDepth + reflectDir.z * float(i) * 0.02;

                        if (sDepth < expectedDepth && abs(sDepth - expectedDepth) < 0.065) {
                            vec4 hitColor = texture2D(tDiffuse, rayPos);
                            float fresnel = pow(clamp(1.0 - dot(normal, viewDir), 0.0, 1.0), 2.5);
                            float edgeFade = smoothstep(0.0, 0.12, min(min(rayPos.x, 1.0 - rayPos.x), min(rayPos.y, 1.0 - rayPos.y)));
                            rayReflect = hitColor.rgb * (0.35 + 0.65 * fresnel) * edgeFade;
                            break;
                        }
                        rayPos += rayStep * (1.0 + float(i) * 0.035);
                    }

                    vec3 bounceGI = vec3(0.0);
                    float bounceRadius = 0.022;
                    for (int j = 0; j < 8; j++) {
                        float angle = float(j) * (6.283185 / 8.0) + jitter * 0.7;
                        vec2 offset = vec2(cos(angle), sin(angle)) * bounceRadius;
                        vec4 neighbor = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999));
                        float nD = readDepth(vUv + offset);
                        float w = clamp(1.0 - abs(nD - centerDepth) * 24.0, 0.0, 1.0);
                        bounceGI += neighbor.rgb * w * 0.125;
                    }

                    vec2 lightStep = vec2(0.35, 0.65) * texel * 3.0;
                    float contactOcclusion = 0.0;
                    vec2 shadowPos = vUv + lightStep * (1.4 + jitter);
                    for (int k = 1; k <= 6; k++) {
                        if (shadowPos.x >= 0.0 && shadowPos.x <= 1.0 && shadowPos.y >= 0.0 && shadowPos.y <= 1.0) {
                            float sDepth = readDepth(shadowPos);
                            if (sDepth < centerDepth - 0.0025 && (centerDepth - sDepth) < 0.042) {
                                contactOcclusion += (1.0 - float(k) / 6.0) * 0.16;
                            }
                        }
                        shadowPos += lightStep * 1.45;
                    }

                    vec3 foodBounceTint = uCoreCol * 0.18 * (1.0 - centerDepth);

                    vec3 finalColor = baseColor.rgb;
                    finalColor += rayReflect * 0.75 * uRayTraceIntensity;
                    finalColor += (bounceGI * 0.36 + foodBounceTint * 0.42) * uRayTraceIntensity;
                    finalColor *= (1.0 - contactOcclusion * 0.55 * uRayTraceIntensity);

                    gl_FragColor = vec4(finalColor, baseColor.a);
                }
            `
        };

        this.rayTracingPass = new ShaderPass(RayTracingLightingShader);
        this.composer.addPass(this.rayTracingPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.52,
            0.44,
            0.76
        );
        this.composer.addPass(this.bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    public applyRenderMode(mode: HardwareTier): void {
        this.renderMode = mode;
        const isPerf = (mode === 'performance');
        const isRTX = (mode === 'raytracing');

        this.scene.environment = this.studioEnvMap;

        if (isRTX) {
            this.scene.environmentIntensity = 0.85;
            this.renderer.toneMappingExposure = 1.28;
            this.rayTracingPass.enabled = true;
            this.rayTracingPass.uniforms.uRayTraceIntensity.value = 1.0;
            this.rayTracingPass.uniforms.uSampleCount.value = 32;

            this.lightingSetup.keyLight.castShadow = true;
            this.lightingSetup.spotLight.castShadow = true;
            this.lightingSetup.keyLight.shadow.mapSize.set(2048, 2048);
            this.lightingSetup.spotLight.shadow.mapSize.set(2048, 2048);
            this.lightingSetup.coreGlowLight.visible = true;
            this.lightingSetup.cursorLight.visible = true;
            this.lightingSetup.underPlatterLight.visible = true;

            this.bloomPass.enabled = true;
            this.bloomPass.strength = 0.52;

            const targetDpr = Math.min(window.devicePixelRatio, 2.0);
            this.renderer.setPixelRatio(targetDpr);
            this.composer.setPixelRatio(targetDpr);
        } else if (isPerf) {
            this.scene.environmentIntensity = 0.45;
            this.renderer.toneMappingExposure = 1.18;
            this.rayTracingPass.enabled = false;
            this.rayTracingPass.uniforms.uRayTraceIntensity.value = 0.0;

            this.lightingSetup.keyLight.castShadow = false;
            this.lightingSetup.spotLight.castShadow = false;
            this.lightingSetup.coreGlowLight.visible = false;
            this.lightingSetup.cursorLight.visible = false;
            this.lightingSetup.underPlatterLight.visible = false;

            this.bloomPass.enabled = false;

            this.renderer.setPixelRatio(1.0);
            this.composer.setPixelRatio(1.0);
        } else {
            this.scene.environmentIntensity = 0.68;
            this.renderer.toneMappingExposure = 1.22;
            this.rayTracingPass.enabled = false;
            this.rayTracingPass.uniforms.uRayTraceIntensity.value = 0.0;

            this.lightingSetup.keyLight.castShadow = true;
            this.lightingSetup.spotLight.castShadow = false;
            this.lightingSetup.keyLight.shadow.mapSize.set(1024, 1024);
            this.lightingSetup.coreGlowLight.visible = true;
            this.lightingSetup.cursorLight.visible = true;
            this.lightingSetup.underPlatterLight.visible = true;

            this.bloomPass.enabled = true;
            this.bloomPass.strength = 0.55;

            const targetDpr = Math.min(window.devicePixelRatio, 1.75);
            this.renderer.setPixelRatio(targetDpr);
            this.composer.setPixelRatio(targetDpr);
        }
    }

    public setRenderMode(mode: HardwareTier): void {
        this.applyRenderMode(mode);
    }

    public setLightingMood(mood: string): void {
        this.lightingSetup.setMood(mood);
        if (mood === 'terracotta') {
            this.bloomPass.strength = 0.55;
        } else if (mood === 'emerald') {
            this.bloomPass.strength = 0.65;
        } else if (mood === 'studio') {
            this.bloomPass.strength = 0.42;
        }
    }

    public toggleInspect(enabled?: boolean): boolean {
        this.inspectMode = typeof enabled === 'boolean' ? enabled : !this.inspectMode;
        if (this.inspectMode) {
            this.manualRotY = this.clocheRig.masterGroup.rotation.y;
            this.manualRotX = this.clocheRig.masterGroup.rotation.x;
            this.inspectDishIndex = this.activeStageIndex;
        }
        return this.inspectMode;
    }

    public setInspectDish(index: number): void {
        this.inspectDishIndex = index;
    }

    public setManualExplode(val: number): void {
        this.manualExplode = val;
    }

    public activeModelSection: string | null = 'hero';

    public setActiveModel(section: string, _direction?: number): void {
        this.activeModelSection = section;
        const sectionMap: Record<string, number> = {
            hero: 0,
            features: 1,
            salad: 2,
            menu: 3,
            extra: 3,
            anatomy: 0,
            footer: 3
        };
        if (typeof sectionMap[section] === 'number') {
            this.setInspectDish(sectionMap[section]);
        }
    }

    public setExplosionProgress(val: number): void {
        this.setManualExplode(val);
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private smoothstep(min: number, max: number, value: number): number {
        const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }

    public start(): void {
        if (this.animFrameId !== null) return;
        this.animate();
    }

    public stop(): void {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    private animate = (): void => {
        this.animFrameId = requestAnimationFrame(this.animate);

        const elapsedTime = this.clock.getElapsedTime();

        this.currentScroll = this.lerp(this.currentScroll, this.targetScroll, 0.065);
        this.scrollVelocity = Math.abs(this.targetScroll - this.currentScroll);
        this.mouseX = this.lerp(this.mouseX, this.targetMouseX, 0.06);
        this.mouseY = this.lerp(this.mouseY, this.targetMouseY, 0.06);

        const s = this.currentScroll;

        // Stage calculation
        if (s < 0.24) this.activeStageIndex = 0;
        else if (s < 0.54) this.activeStageIndex = 1;
        else if (s < 0.82) this.activeStageIndex = 2;
        else this.activeStageIndex = 3;

        const displayStage = this.inspectMode ? this.inspectDishIndex : this.activeStageIndex;

        // Camera framing
        const aspect = this.camera.aspect || (window.innerWidth / window.innerHeight);
        const aspectFactor = aspect < 1.0 ? (1.0 / Math.max(0.45, aspect)) * 0.92 : (aspect < 1.3 ? 1.15 : 1.0);

        const targetLookAtY = this.inspectMode ? -0.06 : 0.08;
        this.currentLookAtY = this.lerp(this.currentLookAtY, targetLookAtY, 0.08);

        this.clocheRig.masterGroup.position.set(0, -0.38, 0);

        if (this.inspectMode) {
            this.clocheRig.masterGroup.rotation.y = this.lerp(this.clocheRig.masterGroup.rotation.y, this.manualRotY, 0.12);
            this.clocheRig.masterGroup.rotation.x = this.lerp(this.clocheRig.masterGroup.rotation.x, this.manualRotX, 0.12);
            this.clocheRig.masterGroup.rotation.z = this.lerp(this.clocheRig.masterGroup.rotation.z, 0, 0.1);

            this.camera.position.x = this.lerp(this.camera.position.x, 0, 0.08);
            this.camera.position.y = this.lerp(this.camera.position.y, 1.12, 0.08);
            this.camera.position.z = this.lerp(this.camera.position.z, 8.9 * aspectFactor, 0.08);
        } else {
            this.dragRotY = this.lerp(this.dragRotY, this.targetDragRotY, 0.12);
            this.dragRotX = this.lerp(this.dragRotX, this.targetDragRotX, 0.12);

            const targetRotY = s * Math.PI * 2.2 + elapsedTime * 0.14 + this.mouseX * 0.28 + this.dragRotY;
            const targetRotX = 0.12 + Math.sin(s * Math.PI * 2) * 0.16 - this.mouseY * 0.18 + this.dragRotX;
            const targetRotZ = Math.sin(s * Math.PI) * 0.08;

            const diffY = ((targetRotY - this.clocheRig.masterGroup.rotation.y) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            this.clocheRig.masterGroup.rotation.y += diffY * 0.10;
            this.clocheRig.masterGroup.rotation.x = this.lerp(this.clocheRig.masterGroup.rotation.x, targetRotX, 0.10);
            this.clocheRig.masterGroup.rotation.z = this.lerp(this.clocheRig.masterGroup.rotation.z, targetRotZ, 0.08);

            const camX = this.mouseX * 0.20;
            const camY = 1.15 + this.mouseY * 0.18;
            const camZ = 9.2 * aspectFactor;
            this.camera.position.set(camX, camY, camZ);
        }

        this.camera.lookAt(0, this.currentLookAtY, 0);

        // Cloche and platter kinematics
        const platterFloatY = Math.sin(elapsedTime * 1.4) * 0.025;
        const heroReveal = this.smoothstep(0.01, 0.16, s);
        const hoverBreathing = Math.sin(elapsedTime * 1.6) * 0.03 * heroReveal;
        const baseOpenLift = heroReveal * 2.55;

        const clocheLift = this.inspectMode
            ? (this.lerp(0.0, 2.6, this.manualExplode) + hoverBreathing)
            : (baseOpenLift + hoverBreathing);

        const clocheOpenFactor = Math.min(1.0, clocheLift / 2.2);

        this.clocheRig.update(
            elapsedTime,
            s,
            clocheLift,
            clocheOpenFactor,
            platterFloatY,
            this.lightingSetup._coreCol
        );

        // Dishes update
        this.dishManager.update(s, elapsedTime, this.inspectMode, this.inspectDishIndex);

        // Lighting and atmosphere update
        this.lightingSetup.updateWeights(
            this.dishManager.normalizedWeights,
            elapsedTime,
            platterFloatY,
            this.mouseX,
            this.mouseY,
            clocheOpenFactor
        );

        // Atmospheric FX update
        this.atmosphericFX.update(
            elapsedTime,
            s,
            this.dishManager.normalizedWeights,
            clocheOpenFactor,
            this.renderMode
        );

        // Orbital morph update
        this.morphController.update(s, this.scrollVelocity, this.inspectMode, this.inspectDishIndex);

        // Telemetry
        if (this.onTelemetryUpdate) {
            const rotYVal = (((this.clocheRig.masterGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
            const dishNames = ['HAMBURGUESA DE AUTOR', 'PIZZA ARTESANAL', 'ENSALADA ITALIANA', 'POSTRE & CHOCOLATE'];
            const atmoNames = ['CALIDO AMBAR', 'FUEGO TOMATE', 'SAGE BOTANICO', 'CIRUELA & CACAO'];

            this.onTelemetryUpdate({
                stageIndex: displayStage,
                dishName: dishNames[displayStage] || 'DEGUSTACION',
                atmosphere: atmoNames[displayStage] || 'ATMOSFERA',
                rotY: parseFloat(rotYVal.toFixed(2)),
                lift: parseFloat(clocheLift.toFixed(2)),
                scrollProgress: s
            });
        }

        // Render pass
        if (this.renderMode === 'performance') {
            this.renderer.render(this.scene, this.camera);
        } else {
            if (this.renderMode === 'raytracing' && this.rayTracingPass) {
                const saladWeight = this.dishManager?.normalizedWeights?.[2] || 0;

                // Specific RTX salad calibration: soften bloom and exposure to prevent overexposed white saturation
                const targetBloom = THREE.MathUtils.lerp(0.52, 0.26, saladWeight);
                const targetThreshold = THREE.MathUtils.lerp(0.76, 0.85, saladWeight);
                const targetExposure = THREE.MathUtils.lerp(1.28, 1.10, saladWeight);

                this.bloomPass.strength = targetBloom;
                this.bloomPass.threshold = targetThreshold;
                this.renderer.toneMappingExposure = targetExposure;

                this.rayTracingPass.uniforms.uTime.value = elapsedTime;
                this.rayTracingPass.uniforms.uActiveLightCol.value.copy(this.lightingSetup._keyCol);
                this.rayTracingPass.uniforms.uCoreCol.value.copy(this.lightingSetup._coreCol);
            }
            this.composer.render();
        }
    };

    private onPointerStart = (clientX: number, clientY: number, target: EventTarget | null): void => {
        const el = target as HTMLElement | null;
        if (el && typeof el.closest === 'function' && el.closest('.interactive-el')) return;

        this.isDragging = true;
        this.prevPointerX = clientX;
        this.prevPointerY = clientY;
        document.body.classList.add('is-dragging-3d');
    };

    private onPointerMove = (clientX: number, clientY: number): void => {
        this.targetMouseX = (clientX / window.innerWidth) * 2 - 1;
        this.targetMouseY = -(clientY / window.innerHeight) * 2 + 1;

        if (this.isDragging) {
            const dx = clientX - this.prevPointerX;
            const dy = clientY - this.prevPointerY;
            const rotYSpeed = 0.0075;
            const rotXSpeed = 0.0065;

            this.targetDragRotY += dx * rotYSpeed;
            this.targetDragRotX = Math.max(-0.65, Math.min(0.75, this.targetDragRotX + dy * rotXSpeed));

            if (this.inspectMode) {
                this.manualRotY += dx * 0.008;
                this.manualRotX = Math.max(-0.8, Math.min(0.8, this.manualRotX + dy * 0.008));
            }

            this.prevPointerX = clientX;
            this.prevPointerY = clientY;
        }
    };

    private onPointerEnd = (): void => {
        if (this.isDragging) {
            this.isDragging = false;
            document.body.classList.remove('is-dragging-3d');
        }
    };

    public onResize = (): void => {
        const pr = this.renderMode === 'performance' ? 1.0 : (this.renderMode === 'raytracing' ? Math.min(window.devicePixelRatio, 2.0) : Math.min(window.devicePixelRatio, 1.75));
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(pr);
        this.composer.setPixelRatio(pr);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.bloomPass.setSize(window.innerWidth, window.innerHeight);

        if (this.rayTracingPass) {
            this.rayTracingPass.uniforms.uResolution.value.set(window.innerWidth * pr, window.innerHeight * pr);
        }
        this.morphController.updateEditorialAnchors();
    };

    private bindEvents(): void {
        window.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            this.onPointerStart(e.clientX, e.clientY, e.target);
        });

        window.addEventListener('mousemove', (e) => {
            this.onPointerMove(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', this.onPointerEnd);
        window.addEventListener('blur', this.onPointerEnd);
        document.addEventListener('mouseleave', this.onPointerEnd);

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 0) return;
            const touch = e.touches[0];
            this.onPointerStart(touch.clientX, touch.clientY, e.target);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 0) return;
            const touch = e.touches[0];
            this.onPointerMove(touch.clientX, touch.clientY);
        }, { passive: true });

        window.addEventListener('touchend', this.onPointerEnd);
        window.addEventListener('touchcancel', this.onPointerEnd);

        window.addEventListener('resize', this.onResize);
    }

    public destroy(): void {
        this.stop();
        window.removeEventListener('resize', this.onResize);
        this.atmosphericFX.dispose();
        this.renderer.dispose();
        if (this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }
    }
}
