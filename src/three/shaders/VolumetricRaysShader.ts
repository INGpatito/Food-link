import * as THREE from 'three';
import gsap from 'gsap';
import { SECTION_THEMES } from '../../utils/constants';

export class VolumetricRaysShader {
  public mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private activeSection: string = 'hero';

  constructor() {
    // A large plane that sits behind the models
    const geometry = new THREE.PlaneGeometry(40, 40);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('rgb(245, 175, 75)') },
        uIntensity: { value: 0.15 } // Start slightly visible
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

        // Simplex 2D noise
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod(i, 289.0);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
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
          // Rotate UVs for diagonal rays (top-left to bottom-right)
          float angle = -0.65; // Radians
          float s = sin(angle);
          float c = cos(angle);
          mat2 rot = mat2(c, -s, s, c);
          vec2 rotatedUv = rot * (vUv - 0.5) + 0.5;

          // Ray frequency
          float rayUvX = rotatedUv.x * 6.0;
          
          // Layered noise to create shimmering shafts of light
          float noise1 = snoise(vec2(rayUvX, uTime * 0.08));
          float noise2 = snoise(vec2(rayUvX * 2.0, uTime * 0.15)) * 0.5;
          float noise3 = snoise(vec2(rayUvX * 4.0, uTime * 0.04)) * 0.25;
          
          float totalNoise = (noise1 + noise2 + noise3) / 1.75;
          
          // Remap noise to 0..1 and sharpen it
          float rayStrength = totalNoise * 0.5 + 0.5;
          rayStrength = pow(rayStrength, 3.5); // High contrast rays
          
          // Radial fade (originating from top left)
          // We want rays to be strong at top left, fading as they go down right
          float dist = distance(vUv, vec2(0.1, 0.9));
          float fade = smoothstep(1.8, 0.2, dist);

          // Add a subtle vignette at the edges of the plane so it blends smoothly
          float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) *
                           smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);

          float finalAlpha = rayStrength * fade * edgeFade * uIntensity;

          gl_FragColor = vec4(uColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    // Position it far behind the food
    this.mesh.position.set(0, 0, -8);
  }

  public update(elapsedTime: number) {
    this.material.uniforms.uTime.value = elapsedTime;
  }

  public setSection(section: string) {
    if (this.activeSection === section) return;
    this.activeSection = section;

    let targetColor = '#FFFFFF';
    let targetIntensity = 0.0;

    if (section === 'footer') {
      targetIntensity = 0.05;
      targetColor = '#E86A33';
    } else {
      const theme = SECTION_THEMES[section as keyof typeof SECTION_THEMES];
      if (theme && theme['--ambient-primary']) {
        // Parse rgba string like "rgba(245, 175, 75, 0.55)"
        const rgbaMatch = theme['--ambient-primary'].match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1], 10);
          const g = parseInt(rgbaMatch[2], 10);
          const b = parseInt(rgbaMatch[3], 10);
          targetColor = `rgb(${r}, ${g}, ${b})`;
        }
        
        // Custom intensities per section for perfect balance
        if (section === 'salad') targetIntensity = 0.35; // Super bright morning rays
        else if (section === 'features') targetIntensity = 0.25; // Fire oven rays
        else if (section === 'menu') targetIntensity = 0.12; // Darker mood
        else if (section === 'extra') targetIntensity = 0.18; // Warm chocolate vibe
        else targetIntensity = 0.25; // Hero
      }
    }

    gsap.to(this.material.uniforms.uColor.value, {
      r: new THREE.Color(targetColor).r,
      g: new THREE.Color(targetColor).g,
      b: new THREE.Color(targetColor).b,
      duration: 1.5,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });

    gsap.to(this.material.uniforms.uIntensity, {
      value: targetIntensity,
      duration: 1.5,
      ease: 'power2.inOut',
      overwrite: 'auto'
    });
  }
}
