import * as THREE from 'three';

/**
 * Atmospheric visual effects: ambient particles, background dust,
 * rising culinary steam, and procedural volumetric rays.
 * Zero emojis strictly enforced.
 */

export class AtmosphericFX {
    private scene: THREE.Scene;
    private platterGroup: THREE.Group;

    // Ambient Gold Particles
    private particleSystem: THREE.Points | null = null;
    private particleGeo: THREE.BufferGeometry | null = null;
    private particleMat: THREE.PointsMaterial | null = null;

    // Background Dust Particles
    private dustSystem: THREE.Points | null = null;
    private dustGeo: THREE.BufferGeometry | null = null;
    private dustMat: THREE.PointsMaterial | null = null;

    // Rising Culinary Steam
    private steamSystem: THREE.Points | null = null;
    private steamGeo: THREE.BufferGeometry | null = null;
    private steamMat: THREE.PointsMaterial | null = null;
    private steamCount = 55;
    private steamSeeds: Float32Array | null = null;

    // Volumetric Rays
    private raysMesh: THREE.Mesh | null = null;
    private raysMaterial: THREE.ShaderMaterial | null = null;
    private rayColors = [
        new THREE.Color(0xf5af4b),
        new THREE.Color(0xf57223),
        new THREE.Color(0x6e9b72),
        new THREE.Color(0xc323a5)
    ];
    private rayIntensities = [0.28, 0.32, 0.16, 0.26];
    private tempCol = new THREE.Color();

    constructor(scene: THREE.Scene, platterGroup: THREE.Group) {
        this.scene = scene;
        this.platterGroup = platterGroup;
        this.initSystems();
    }

    private initSystems(): void {
        const paletteColors = [
            new THREE.Color(0xf4a261),
            new THREE.Color(0xe05a36),
            new THREE.Color(0x8ab17d),
            new THREE.Color(0xffd4b8),
            new THREE.Color(0xd97525)
        ];

        // 1. Ambient Gold Particles (170 points)
        const particleCount = 170;
        this.particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;

            const c = paletteColors[i % paletteColors.length];
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        this.particleMat = new THREE.PointsMaterial({
            size: 0.048,
            vertexColors: true,
            transparent: true,
            opacity: 0.58,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(this.particleGeo, this.particleMat);
        this.scene.add(this.particleSystem);

        // 2. Secondary Background Dust Layer (65 points)
        const dustCount = 65;
        this.dustGeo = new THREE.BufferGeometry();
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);

        for (let i = 0; i < dustCount; i++) {
            dustPositions[i * 3]     = (Math.random() - 0.5) * 24;
            dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 18;
            dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;

            const c = paletteColors[Math.floor(Math.random() * paletteColors.length)];
            dustColors[i * 3]     = c.r * 0.45;
            dustColors[i * 3 + 1] = c.g * 0.45;
            dustColors[i * 3 + 2] = c.b * 0.45;
        }

        this.dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        this.dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

        this.dustMat = new THREE.PointsMaterial({
            size: 0.075,
            vertexColors: true,
            transparent: true,
            opacity: 0.24,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false
        });

        this.dustSystem = new THREE.Points(this.dustGeo, this.dustMat);
        this.scene.add(this.dustSystem);

        // 3. Rising Culinary Steam (55 points above platter)
        this.steamGeo = new THREE.BufferGeometry();
        const steamPositions = new Float32Array(this.steamCount * 3);
        this.steamSeeds = new Float32Array(this.steamCount);

        for (let i = 0; i < this.steamCount; i++) {
            const r = Math.random() * 1.15;
            const theta = Math.random() * Math.PI * 2;
            steamPositions[i * 3] = Math.cos(theta) * r;
            steamPositions[i * 3 + 1] = Math.random() * 2.2;
            steamPositions[i * 3 + 2] = Math.sin(theta) * r;
            this.steamSeeds[i] = Math.random() * 100;
        }

        this.steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
        this.steamMat = new THREE.PointsMaterial({
            color: 0xfff0dd,
            size: 0.065,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.steamSystem = new THREE.Points(this.steamGeo, this.steamMat);
        this.platterGroup.add(this.steamSystem);

        // 4. Procedural Volumetric Rays (38x38 plane)
        const raysGeo = new THREE.PlaneGeometry(38, 38);
        this.raysMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0xf5af4b) },
                uIntensity: { value: 0.25 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform float uIntensity;
                varying vec2 vUv;

                vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
                float snoise(vec2 v){
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod(i, 289.0);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m;
                    m = m*m;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                void main() {
                    float angle = -0.65;
                    float s = sin(angle);
                    float c = cos(angle);
                    mat2 rot = mat2(c, -s, s, c);
                    vec2 rotatedUv = rot * (vUv - 0.5) + 0.5;

                    float rayUvX = rotatedUv.x * 6.0;
                    float noise1 = snoise(vec2(rayUvX, uTime * 0.09));
                    float noise2 = snoise(vec2(rayUvX * 2.0, uTime * 0.16)) * 0.5;
                    float totalNoise = (noise1 + noise2) / 1.5;

                    float rayStrength = pow(totalNoise * 0.5 + 0.5, 3.3);
                    float dist = distance(vUv, vec2(0.15, 0.88));
                    float fade = smoothstep(1.75, 0.18, dist);
                    float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) *
                                     smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

                    gl_FragColor = vec4(uColor, rayStrength * fade * edgeFade * uIntensity);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        this.raysMesh = new THREE.Mesh(raysGeo, this.raysMaterial);
        this.raysMesh.position.set(0, 0.5, -4.8);
        this.scene.add(this.raysMesh);
    }

    public update(
        elapsedTime: number,
        s: number,
        normalizedWeights: number[],
        clocheOpenFactor: number,
        renderMode: string
    ): void {
        const isPerf = (renderMode === 'performance');

        // Toggle visibility based on tier
        if (this.particleSystem) this.particleSystem.visible = !isPerf;
        if (this.dustSystem) this.dustSystem.visible = !isPerf;
        if (this.steamSystem) this.steamSystem.visible = !isPerf;
        if (this.raysMesh) this.raysMesh.visible = !isPerf;

        if (isPerf) return;

        // Animate Ambient Gold Particles
        if (this.particleSystem) {
            this.particleSystem.rotation.y = elapsedTime * 0.025 + s * 0.65;
            this.particleSystem.position.y = (s - 0.5) * 1.5;
        }

        // Animate Dust Particles
        if (this.dustSystem) {
            this.dustSystem.rotation.y = -elapsedTime * 0.018 + s * 0.4;
            this.dustSystem.position.y = (s - 0.5) * 1.0;
        }

        // Animate Culinary Steam
        if (this.steamSystem && this.steamGeo && this.steamMat && this.steamSeeds) {
            const hotDishWeight = normalizedWeights[0] + normalizedWeights[1] * 1.1 + normalizedWeights[3] * 0.35;
            this.steamMat.opacity = Math.min(0.26, clocheOpenFactor * hotDishWeight * 0.24);

            const posArr = this.steamGeo.attributes.position.array as Float32Array;
            for (let i = 0; i < this.steamCount; i++) {
                posArr[i * 3 + 1] += 0.007;
                posArr[i * 3] += Math.sin(elapsedTime * 1.5 + this.steamSeeds[i]) * 0.0018;
                posArr[i * 3 + 2] += Math.cos(elapsedTime * 1.3 + this.steamSeeds[i]) * 0.0018;
                if (posArr[i * 3 + 1] > 2.2) {
                    posArr[i * 3 + 1] = 0.15;
                }
            }
            this.steamGeo.attributes.position.needsUpdate = true;
        }

        // Animate Volumetric Rays
        if (this.raysMaterial) {
            this.raysMaterial.uniforms.uTime.value = elapsedTime;
            let r = 0, g = 0, b = 0, intensity = 0;
            for (let i = 0; i < 4; i++) {
                const w = normalizedWeights[i];
                if (w <= 0.0001) continue;
                const c = this.rayColors[i];
                r += c.r * w;
                g += c.g * w;
                b += c.b * w;
                intensity += this.rayIntensities[i] * w;
            }
            this.tempCol.setRGB(r, g, b);
            this.raysMaterial.uniforms.uColor.value.copy(this.tempCol);
            this.raysMaterial.uniforms.uIntensity.value = intensity;
        }
    }

    public dispose(): void {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleGeo?.dispose();
            this.particleMat?.dispose();
        }
        if (this.dustSystem) {
            this.scene.remove(this.dustSystem);
            this.dustGeo?.dispose();
            this.dustMat?.dispose();
        }
        if (this.steamSystem) {
            this.platterGroup.remove(this.steamSystem);
            this.steamGeo?.dispose();
            this.steamMat?.dispose();
        }
        if (this.raysMesh) {
            this.scene.remove(this.raysMesh);
            this.raysMesh.geometry.dispose();
            this.raysMaterial?.dispose();
        }
    }
}
