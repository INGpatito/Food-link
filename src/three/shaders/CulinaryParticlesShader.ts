import * as THREE from 'three';
import gsap from 'gsap';

const VERTEX_SHADER = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;

attribute float aScale;
attribute vec3 aVelocity;
attribute float aPhase;

varying float vAlpha;

void main() {
  vec3 pos = position;

  // Helical convection swirl (rising steam and aromatic seasoning updraft)
  float t = uTime * 0.35 + aPhase;
  float swirlAngle = uTime * 0.42 + aPhase + pos.y * 0.32;
  float swirlRadius = 0.22 + 0.14 * sin(aPhase * 2.0);
  pos.x += cos(swirlAngle) * swirlRadius + sin(t * 1.1 + pos.y * 0.5) * 0.28;
  pos.y += mod(pos.y + uTime * aVelocity.y * 0.2 + 5.0, 10.0) - 5.0;
  pos.z += sin(swirlAngle) * swirlRadius + cos(t * 0.9 + pos.x * 0.4) * 0.28;

  // Subtle mouse repel / swirl
  vec2 mouseDir = pos.xy - uMouse * 4.0;
  float mouseDist = length(mouseDir);
  if (mouseDist < 2.5) {
    float force = (1.0 - mouseDist / 2.5) * 0.4;
    pos.xy += normalize(mouseDir + vec2(0.001)) * force;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation
  gl_PointSize = aScale * (140.0 / -mvPosition.z);

  // Soft glimmering alpha
  vAlpha = 0.4 + 0.6 * sin(t * 2.5);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uColorCore;

varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float distSq = dot(p, p);
  if (distSq > 0.25) discard;

  // Soft Gaussian falloff
  float glow = exp(-distSq * 16.0);
  float core = exp(-distSq * 64.0);
  vec3 col = mix(uColor, uColorCore, core);

  gl_FragColor = vec4(col, glow * vAlpha * 0.85);
}
`;

export const PARTICLE_THEMES: Record<string, { color: string; core: string }> = {
  hero: { color: '#c49b7c', core: '#f0e3d2' },
  features: { color: '#aa7661', core: '#e9cdb7' },
  salad: { color: '#93a57a', core: '#e3e9d2' },
  menu: { color: '#a58ca7', core: '#eadde8' },
  extra: { color: '#a87b63', core: '#ead3c0' },
  footer: { color: '#ad8068', core: '#ead9c9' }
};

export class CulinaryParticlesShader {
  public points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private currentMouse = new THREE.Vector2(0, 0);
  private targetMouse = new THREE.Vector2(0, 0);

  constructor(count: number = 180) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Scatter within a volume around the food model
      positions[i3] = (Math.random() - 0.5) * 8.0;
      positions[i3 + 1] = (Math.random() - 0.5) * 7.0;
      positions[i3 + 2] = (Math.random() - 0.5) * 5.0 + 0.5;

      scales[i] = Math.random() * 0.7 + 0.35;
      velocities[i3] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = Math.random() * 0.2 + 0.05;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const defaultTheme = PARTICLE_THEMES.hero;

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor: { value: new THREE.Color(defaultTheme.color) },
        uColorCore: { value: new THREE.Color(defaultTheme.core) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, this.material);

    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  public update(time: number): void {
    this.material.uniforms.uTime.value = time;
    this.currentMouse.lerp(this.targetMouse, 0.05);
    this.material.uniforms.uMouse.value.copy(this.currentMouse);
  }

  public setSection(sectionKey: string): void {
    const theme = PARTICLE_THEMES[sectionKey] || PARTICLE_THEMES.hero;

    gsap.to(this.material.uniforms.uColor.value, {
      r: new THREE.Color(theme.color).r,
      g: new THREE.Color(theme.color).g,
      b: new THREE.Color(theme.color).b,
      duration: 0.8,
      ease: 'power2.out'
    });

    gsap.to(this.material.uniforms.uColorCore.value, {
      r: new THREE.Color(theme.core).r,
      g: new THREE.Color(theme.core).g,
      b: new THREE.Color(theme.core).b,
      duration: 0.8,
      ease: 'power2.out'
    });
  }
}
