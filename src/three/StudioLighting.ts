import * as THREE from 'three';

/**
 * Section theme chromatic palette definitions.
 */
export interface SectionTheme {
    name: string;
    bg: [number, number, number];
    ambientModel: [number, number, number, number];
    ambientPrimary: [number, number, number, number];
    ambientSecondary: [number, number, number, number];
    glowX: number;
    glowY: number;
    priPosX: number;
    priPosY: number;
    secPosX: number;
    secPosY: number;
}

export const SECTION_THEMES: SectionTheme[] = [
    { // Stage 0: Burger (Hero)
        name: 'hero',
        bg: [32, 22, 16],
        ambientModel: [245, 166, 65, 0.55],
        ambientPrimary: [230, 135, 45, 0.40],
        ambientSecondary: [185, 85, 25, 0.30],
        glowX: 50, glowY: 48,
        priPosX: 25, priPosY: 35,
        secPosX: 75, secPosY: 75
    },
    { // Stage 1: Pizza (Features)
        name: 'features',
        bg: [18, 16, 14],
        ambientModel: [225, 45, 20, 0.45],
        ambientPrimary: [245, 135, 35, 0.30],
        ambientSecondary: [180, 30, 20, 0.25],
        glowX: 50, glowY: 50,
        priPosX: 30, priPosY: 30,
        secPosX: 70, secPosY: 80
    },
    { // Stage 2: Ensalada (Salad)
        name: 'salad',
        bg: [12, 20, 16],
        ambientModel: [48, 88, 58, 0.28],
        ambientPrimary: [62, 102, 72, 0.20],
        ambientSecondary: [36, 68, 48, 0.16],
        glowX: 50, glowY: 50,
        priPosX: 25, priPosY: 30,
        secPosX: 75, secPosY: 80
    },
    { // Stage 3: Pastel & Chocolate (Menu)
        name: 'menu',
        bg: [29, 15, 40],
        ambientModel: [195, 35, 165, 0.45],
        ambientPrimary: [115, 65, 255, 0.35],
        ambientSecondary: [240, 80, 160, 0.25],
        glowX: 50, glowY: 50,
        priPosX: 25, priPosY: 30,
        secPosX: 75, secPosY: 80
    }
];

const LIGHT_PRESETS = {
    hero: {
        ambient: 0.14, hemisphere: 0.28, envIntensity: 0.65,
        key:  { color: 0xffeed8, intensity: 1.85, position: [4.5, 6.0, 5.5] as [number, number, number] },
        fill: { color: 0xe68232, intensity: 0.72, position: [-5.2, 2.0, 3.2] as [number, number, number] },
        rim:  { color: 0xffbe5c, intensity: 1.15, position: [-4.0, 4.5, -4.5] as [number, number, number] },
        spot: { color: 0xfff0d6, intensity: 2.40, position: [0, 8.0, 4.0] as [number, number, number] },
        core: { color: 0xf4a261, intensity: 2.35 }
    },
    features: {
        ambient: 0.12, hemisphere: 0.22, envIntensity: 0.55,
        key:  { color: 0xff7733, intensity: 1.75, position: [-3.8, 6.2, 5.2] as [number, number, number] },
        fill: { color: 0xff3b1f, intensity: 0.65, position: [5.2, 1.4, 2.4] as [number, number, number] },
        rim:  { color: 0xffb32c, intensity: 1.05, position: [4.2, 4.5, -5.0] as [number, number, number] },
        spot: { color: 0xffbb77, intensity: 2.30, position: [0, 8.2, 3.2] as [number, number, number] },
        core: { color: 0xe05a36, intensity: 2.25 }
    },
    salad: {
        ambient: 0.11, hemisphere: 0.22, envIntensity: 0.52,
        key:  { color: 0xf4f0e6, intensity: 1.15, position: [-4.5, 6.4, 5.2] as [number, number, number] },
        fill: { color: 0x5a8a62, intensity: 0.32, position: [5.2, 2.2, 2.4] as [number, number, number] },
        rim:  { color: 0xb8cca4, intensity: 0.42, position: [3.4, 5.2, -4.2] as [number, number, number] },
        spot: { color: 0xf5f8ee, intensity: 1.15, position: [0, 8.2, 4.0] as [number, number, number] },
        core: { color: 0x6e9464, intensity: 0.95 }
    },
    menu: {
        ambient: 0.14, hemisphere: 0.24, envIntensity: 0.60,
        key:  { color: 0xfff5fa, intensity: 1.55, position: [4.2, 5.8, 5.2] as [number, number, number] },
        fill: { color: 0xff2a85, intensity: 0.85, position: [-5.0, 1.8, 2.5] as [number, number, number] },
        rim:  { color: 0xff99d6, intensity: 0.95, position: [-4.2, 5.2, -4.2] as [number, number, number] },
        spot: { color: 0xffd6e7, intensity: 2.15, position: [0, 8.2, 3.2] as [number, number, number] },
        core: { color: 0xc864e6, intensity: 2.50 }
    }
};

/**
 * Adaptive studio lighting rig with dynamic 4-stage chromatic shifting.
 * Zero emojis strictly enforced.
 */
export class StudioLighting {
    private scene: THREE.Scene;
    public currentMood = 'terracotta';

    public ambientLight!: THREE.AmbientLight;
    public hemisphereLight!: THREE.HemisphereLight;
    public keyLight!: THREE.DirectionalLight;
    public fillLight!: THREE.DirectionalLight;
    public rimLight!: THREE.DirectionalLight;
    public spotLight!: THREE.SpotLight;
    public coreGlowLight!: THREE.PointLight;
    public underPlatterLight!: THREE.PointLight;
    public cursorLight!: THREE.PointLight;

    public keyTarget = new THREE.Object3D();
    public spotTarget = new THREE.Object3D();

    public _keyCol = new THREE.Color();
    public _fillCol = new THREE.Color();
    public _rimCol = new THREE.Color();
    public _spotCol = new THREE.Color();
    public _coreCol = new THREE.Color();
    private _tempCol = new THREE.Color();

    private _keyPos: [number, number, number] = [0, 0, 0];
    private _fillPos: [number, number, number] = [0, 0, 0];
    private _rimPos: [number, number, number] = [0, 0, 0];
    private _spotPos: [number, number, number] = [0, 0, 0];

    private _emeraldFillCol = new THREE.Color(0x60b885);
    private _emeraldRimCol = new THREE.Color(0xa4d870);
    private _studioKeyCol = new THREE.Color(0xffffff);
    private _studioFillCol = new THREE.Color(0xf0f5ff);

    private lastBgHex = '';
    private lastAmStr = '';
    private lastApStr = '';
    private lastAsStr = '';

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.init();
    }

    public init(): void {
        this.ambientLight = new THREE.AmbientLight(0xfff2df, 0.14);
        this.hemisphereLight = new THREE.HemisphereLight(0xfff5e7, 0x3b261b, 0.28);

        this.keyLight = new THREE.DirectionalLight(0xffeed8, 1.85);
        this.fillLight = new THREE.DirectionalLight(0xe68232, 0.72);
        this.rimLight = new THREE.DirectionalLight(0xffbe5c, 1.15);
        this.spotLight = new THREE.SpotLight(0xfff0d6, 2.4, 24, Math.PI / 4.8, 0.75, 1.5);

        this.keyLight.position.set(4.5, 6.0, 5.5);
        this.fillLight.position.set(-5.2, 2.0, 3.2);
        this.rimLight.position.set(-4.0, 4.5, -4.5);
        this.spotLight.position.set(0, 8.0, 4.0);

        this.keyTarget.position.set(0, -0.35, 0);
        this.spotTarget.position.set(0, -0.35, 0);

        this.keyLight.target = this.keyTarget;
        this.spotLight.target = this.spotTarget;

        // Shadow configuration to avoid acne or clipping
        this.keyLight.castShadow = true;
        this.keyLight.shadow.mapSize.set(1024, 1024);
        this.keyLight.shadow.camera.near = 0.5;
        this.keyLight.shadow.camera.far = 18;
        this.keyLight.shadow.camera.left = -3.8;
        this.keyLight.shadow.camera.right = 3.8;
        this.keyLight.shadow.camera.top = 4.2;
        this.keyLight.shadow.camera.bottom = -3.2;
        this.keyLight.shadow.bias = -0.0004;
        this.keyLight.shadow.normalBias = 0.02;

        this.spotLight.castShadow = true;
        this.spotLight.shadow.mapSize.set(1024, 1024);
        this.spotLight.shadow.camera.near = 1.0;
        this.spotLight.shadow.camera.far = 18;
        this.spotLight.shadow.bias = -0.0003;
        this.spotLight.shadow.normalBias = 0.02;

        // Core culinary light above dish
        this.coreGlowLight = new THREE.PointLight(0xf4a261, 2.35, 11, 1.6);
        this.coreGlowLight.position.set(0, 0.25, 0);

        // Under-platter warm bounce light
        this.underPlatterLight = new THREE.PointLight(0xe05a36, 1.25, 7, 1.8);
        this.underPlatterLight.position.set(0, -1.15, 0.5);

        // Cursor interactive light
        this.cursorLight = new THREE.PointLight(0xffeed8, 1.15, 10.0, 1.8);
        this.cursorLight.position.set(0, 1.0, 3.6);

        this.scene.add(
            this.ambientLight,
            this.hemisphereLight,
            this.keyLight,
            this.fillLight,
            this.rimLight,
            this.spotLight,
            this.coreGlowLight,
            this.underPlatterLight,
            this.cursorLight,
            this.keyTarget,
            this.spotTarget
        );
    }

    public setMood(mood: string): void {
        this.currentMood = mood;
    }

    public updateAtmosphere(weights: number[]): void {
        let r = 0, g = 0, b = 0;
        let amR = 0, amG = 0, amB = 0, amA = 0;
        let apR = 0, apG = 0, apB = 0, apA = 0;
        let asR = 0, asG = 0, asB = 0, asA = 0;

        for (let i = 0; i < 4; i++) {
            const w = weights[i];
            if (w <= 0.0001) continue;
            const t = SECTION_THEMES[i];
            r += t.bg[0] * w;
            g += t.bg[1] * w;
            b += t.bg[2] * w;

            amR += t.ambientModel[0] * w;
            amG += t.ambientModel[1] * w;
            amB += t.ambientModel[2] * w;
            amA += t.ambientModel[3] * w;

            apR += t.ambientPrimary[0] * w;
            apG += t.ambientPrimary[1] * w;
            apB += t.ambientPrimary[2] * w;
            apA += t.ambientPrimary[3] * w;

            asR += t.ambientSecondary[0] * w;
            asG += t.ambientSecondary[1] * w;
            asB += t.ambientSecondary[2] * w;
            asA += t.ambientSecondary[3] * w;
        }

        const bgHex = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
        const amStr = `rgba(${Math.round(amR)}, ${Math.round(amG)}, ${Math.round(amB)}, ${amA.toFixed(3)})`;
        const apStr = `rgba(${Math.round(apR)}, ${Math.round(apG)}, ${Math.round(apB)}, ${apA.toFixed(3)})`;
        const asStr = `rgba(${Math.round(asR)}, ${Math.round(asG)}, ${Math.round(asB)}, ${asA.toFixed(3)})`;

        if (bgHex !== this.lastBgHex) {
            this.lastBgHex = bgHex;
            document.body.style.backgroundColor = bgHex;
            document.documentElement.style.setProperty('--bg-primary', bgHex);
            if (this.scene && this.scene.fog) {
                (this.scene.fog as THREE.FogExp2).color.setRGB(r / 255, g / 255, b / 255);
            }
        }
        if (amStr !== this.lastAmStr) {
            this.lastAmStr = amStr;
            document.documentElement.style.setProperty('--ambient-model', amStr);
        }
        if (apStr !== this.lastApStr) {
            this.lastApStr = apStr;
            document.documentElement.style.setProperty('--ambient-primary', apStr);
        }
        if (asStr !== this.lastAsStr) {
            this.lastAsStr = asStr;
            document.documentElement.style.setProperty('--ambient-secondary', asStr);
        }
    }

    public updateWeights(
        weights: number[],
        elapsedTime: number,
        platterBaseY = 0,
        mouseX = 0,
        mouseY = 0,
        clocheOpenFactor = 0
    ): void {
        const keys: (keyof typeof LIGHT_PRESETS)[] = ['hero', 'features', 'salad', 'menu'];
        let amb = 0, hemi = 0, env = 0;
        let keyInt = 0, fillInt = 0, rimInt = 0, spotInt = 0, coreInt = 0;

        this._keyCol.setRGB(0, 0, 0);
        this._fillCol.setRGB(0, 0, 0);
        this._rimCol.setRGB(0, 0, 0);
        this._spotCol.setRGB(0, 0, 0);
        this._coreCol.setRGB(0, 0, 0);

        this._keyPos = [0, 0, 0];
        this._fillPos = [0, 0, 0];
        this._rimPos = [0, 0, 0];
        this._spotPos = [0, 0, 0];

        for (let i = 0; i < 4; i++) {
            const w = weights[i];
            if (w <= 0.0001) continue;
            const p = LIGHT_PRESETS[keys[i]];

            amb += p.ambient * w;
            hemi += p.hemisphere * w;
            env += p.envIntensity * w;

            keyInt += p.key.intensity * w;
            this._tempCol.setHex(p.key.color);
            this._keyCol.r += this._tempCol.r * w;
            this._keyCol.g += this._tempCol.g * w;
            this._keyCol.b += this._tempCol.b * w;
            this._keyPos[0] += p.key.position[0] * w;
            this._keyPos[1] += p.key.position[1] * w;
            this._keyPos[2] += p.key.position[2] * w;

            fillInt += p.fill.intensity * w;
            this._tempCol.setHex(p.fill.color);
            this._fillCol.r += this._tempCol.r * w;
            this._fillCol.g += this._tempCol.g * w;
            this._fillCol.b += this._tempCol.b * w;
            this._fillPos[0] += p.fill.position[0] * w;
            this._fillPos[1] += p.fill.position[1] * w;
            this._fillPos[2] += p.fill.position[2] * w;

            rimInt += p.rim.intensity * w;
            this._tempCol.setHex(p.rim.color);
            this._rimCol.r += this._tempCol.r * w;
            this._rimCol.g += this._tempCol.g * w;
            this._rimCol.b += this._tempCol.b * w;
            this._rimPos[0] += p.rim.position[0] * w;
            this._rimPos[1] += p.rim.position[1] * w;
            this._rimPos[2] += p.rim.position[2] * w;

            spotInt += p.spot.intensity * w;
            this._tempCol.setHex(p.spot.color);
            this._spotCol.r += this._tempCol.r * w;
            this._spotCol.g += this._tempCol.g * w;
            this._spotCol.b += this._tempCol.b * w;
            this._spotPos[0] += p.spot.position[0] * w;
            this._spotPos[1] += p.spot.position[1] * w;
            this._spotPos[2] += p.spot.position[2] * w;

            coreInt += p.core.intensity * w;
            this._tempCol.setHex(p.core.color);
            this._coreCol.r += this._tempCol.r * w;
            this._coreCol.g += this._tempCol.g * w;
            this._coreCol.b += this._tempCol.b * w;
        }

        if (this.currentMood === 'emerald') {
            amb *= 1.25;
            this._fillCol.lerp(this._emeraldFillCol, 0.38);
            this._rimCol.lerp(this._emeraldRimCol, 0.28);
        } else if (this.currentMood === 'studio') {
            amb *= 1.32;
            hemi *= 1.22;
            this._keyCol.lerp(this._studioKeyCol, 0.30);
            this._fillCol.lerp(this._studioFillCol, 0.35);
        }

        this.ambientLight.intensity = amb;
        this.hemisphereLight.intensity = hemi;

        this.keyLight.intensity = keyInt;
        this.keyLight.color.copy(this._keyCol);
        this.keyLight.position.set(this._keyPos[0], this._keyPos[1], this._keyPos[2]);
        this.keyTarget.position.set(0, -0.38 + platterBaseY, 0);

        this.fillLight.intensity = fillInt;
        this.fillLight.color.copy(this._fillCol);
        this.fillLight.position.set(this._fillPos[0], this._fillPos[1], this._fillPos[2]);

        this.rimLight.intensity = rimInt;
        this.rimLight.color.copy(this._rimCol);
        this.rimLight.position.set(this._rimPos[0], this._rimPos[1], this._rimPos[2]);

        this.spotLight.intensity = spotInt;
        this.spotLight.color.copy(this._spotCol);
        this.spotLight.position.set(this._spotPos[0], this._spotPos[1], this._spotPos[2]);

        const drift = Math.sin(elapsedTime * 0.55) * 0.14;
        this.spotTarget.position.x = drift;
        this.spotTarget.position.y = -0.35 + platterBaseY + Math.cos(elapsedTime * 0.4) * 0.08;

        // Core light intensifies as cloche opens
        const openBoost = 0.65 + 0.55 * clocheOpenFactor;
        this.coreGlowLight.intensity = coreInt * openBoost * (1.0 + Math.sin(elapsedTime * 2.1) * 0.12);
        this.coreGlowLight.color.copy(this._coreCol);
        this.coreGlowLight.position.y = 0.15 + platterBaseY + Math.sin(elapsedTime * 1.4) * 0.04;

        if (this.underPlatterLight) {
            this.underPlatterLight.color.copy(this._coreCol);
            this.underPlatterLight.intensity = 1.1 + Math.sin(elapsedTime * 1.8) * 0.25;
        }

        if (this.cursorLight) {
            this.cursorLight.position.set(mouseX * 4.0, mouseY * 2.8 + 0.6, 3.6);
            this.cursorLight.color.copy(this._coreCol);
        }

        this.scene.environmentIntensity = env;
        this.updateAtmosphere(weights);
    }
}
