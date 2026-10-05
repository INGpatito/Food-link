export const THEME_COLORS = {
  brand1: '#FBE5C8',
  brand2: '#F2A65A',
  brand3: '#E86A33',
  brand4: '#C7452A',
  brand5: '#5B8A2B',
  charcoal: '#181512',
  violet: '#6B4EFF',
  plum: '#26192F'
};

export const MODEL_PATHS = {
  hero: new URL('../../public/models/burger.glb', import.meta.url).href,
  features: new URL('../../public/models/pizza.glb', import.meta.url).href,
  salad: new URL('../../public/models/italian_salad.glb', import.meta.url).href,
  menu: new URL('../../public/models/cake.glb', import.meta.url).href,
  extra: new URL('../../public/models/extra_chocolate.glb', import.meta.url).href,
};

export const MODEL_CONFIGS = {
  hero: {
    scale: 1.0,
    position: { x: 1.4, y: -0.12, z: 0 },
    rotation: { x: 0.2, y: -0.3, z: 0 }
  },
  features: {
    scale: 1.0,
    position: { x: -1.3, y: -0.12, z: 0 },
    rotation: { x: Math.PI / 2 - 0.35, y: 0.3, z: 0 }
  },
  salad: {
    scale: 1.25,
    position: { x: 1.3, y: -0.18, z: 0 },
    rotation: { x: 0.45, y: -0.3, z: 0 }
  },
  menu: {
    scale: 0.95,
    position: { x: 1.35, y: -0.2, z: 0 },
    rotation: { x: 0.25, y: -0.4, z: 0 }
  },
  extra: {
    scale: 0.60,
    position: { x: -1.3, y: -0.18, z: 0 },
    rotation: { x: 0.2, y: 0.3, z: 0 }
  },
};

// Model enters/exits from the SAME side as its section text:
// Hero=text LEFT, Features=text RIGHT, Salad=text LEFT, Menu=text LEFT, Extra=text RIGHT
// enterFrom/exitTo: -1 = left, 1 = right
export const MODEL_TRANSITIONS = {
  hero:     { enterFrom: -1, exitTo: -1 },
  features: { enterFrom:  1, exitTo:  1 },
  salad:    { enterFrom: -1, exitTo: -1 },
  menu:     { enterFrom: -1, exitTo: -1 },
  extra:    { enterFrom:  1, exitTo:  1 },
} as const;

export const SECTION_THEMES = {
  hero: {
    backgroundColor: '#F8EDE0',
    color: '#181512',
    '--ambient-model': 'rgba(235, 110, 35, 0.65)',
    '--ambient-primary': 'rgba(245, 175, 75, 0.55)',
    '--ambient-secondary': 'rgba(215, 65, 35, 0.35)',
    '--model-glow-x': '72%',
    '--model-glow-y': '48%',
    '--ambient-primary-pos': '20% 30%',
    '--ambient-secondary-pos': '50% 85%'
  },
  features: {
    backgroundColor: '#12100E',
    color: '#FBE5C8',
    '--ambient-model': 'rgba(225, 45, 20, 0.65)',
    '--ambient-primary': 'rgba(245, 135, 35, 0.50)',
    '--ambient-secondary': 'rgba(180, 30, 20, 0.40)',
    '--model-glow-x': '28%',
    '--model-glow-y': '50%',
    '--ambient-primary-pos': '80% 30%',
    '--ambient-secondary-pos': '50% 85%'
  },
  salad: {
    backgroundColor: '#EAF5E3',
    color: '#181512',
    '--ambient-model': 'rgba(68, 170, 45, 0.60)',
    '--ambient-primary': 'rgba(165, 220, 75, 0.55)',
    '--ambient-secondary': 'rgba(245, 205, 70, 0.45)',
    '--model-glow-x': '72%',
    '--model-glow-y': '50%',
    '--ambient-primary-pos': '20% 30%',
    '--ambient-secondary-pos': '50% 85%'
  },
  menu: {
    backgroundColor: '#1D0F28',
    color: '#ffffff',
    '--ambient-model': 'rgba(195, 35, 165, 0.70)',
    '--ambient-primary': 'rgba(115, 65, 255, 0.60)',
    '--ambient-secondary': 'rgba(240, 80, 160, 0.38)',
    '--model-glow-x': '72%',
    '--model-glow-y': '50%',
    '--ambient-primary-pos': '20% 30%',
    '--ambient-secondary-pos': '50% 85%'
  },
  extra: {
    backgroundColor: '#140B07',
    color: '#FBE5C8',
    '--ambient-model': 'rgba(225, 105, 25, 0.65)',
    '--ambient-primary': 'rgba(180, 60, 20, 0.50)',
    '--ambient-secondary': 'rgba(245, 175, 80, 0.35)',
    '--model-glow-x': '28%',
    '--model-glow-y': '50%',
    '--ambient-primary-pos': '80% 30%',
    '--ambient-secondary-pos': '50% 85%'
  },
  footer: {
    backgroundColor: '#12100E',
    color: '#FBE5C8',
    '--ambient-model': 'rgba(232, 106, 51, 0.40)',
    '--ambient-primary': 'rgba(242, 166, 90, 0.28)',
    '--ambient-secondary': 'rgba(199, 69, 42, 0.22)',
    '--model-glow-x': '50%',
    '--model-glow-y': '60%',
    '--ambient-primary-pos': '50% 30%',
    '--ambient-secondary-pos': '50% 85%'
  }
} as const;
