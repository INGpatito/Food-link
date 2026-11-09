# Sistema de Shaders, Iluminacion de Estudio y Perfiles de GPU

Este documento detalla la arquitectura de shaders personalizados, texturas procedurales PBR, efectos atmosfericos y niveles de renderizado adaptativo implementados en Foodlink para dotar a los alimentos y al pedestal de una estetica organica, apetitosa y cinematografica.

---

## 1. Arquitectura General del Pipeline Visual

El pipeline de renderizado en [`src/three/SceneManager.ts`](file:///home/pato/footlink/src/three/SceneManager.ts) combina cinco subsistemas principales:

1. **Material Enhancer Shader (`FoodDishManager.ts` / `MaterialEnhancerShader.ts`):** Inyeccion GLSL en materiales PBR (`MeshStandardMaterial` y `MeshPhysicalMaterial`) mediante `onBeforeCompile`, calculando Subsurface Scattering (SSS) en la penumbra, resplandor Fresnel perimetral y micro-grano organico.
2. **Texturas PBR Procedurales de Corte (`FoodCapTextures.ts`):** Generacion dinamica de mapas `CanvasTexture` de alta resolucion (`1024x1024`) con canales `map`, `bumpMap` y `roughness` personalizados para sellar solidamente cada capa del despiece de la hamburguesa.
3. **Efectos Atmosfericos y Rayos Volumetricos (`AtmosphericFX.ts` + `VolumetricRaysShader.ts`):** Particulas doradas en suspension, vapor culinario ascendente desde el plato y haces de luz volumetrica (God-Rays) detras del pedestal.
4. **Iluminacion de Estudio Dinamica (`StudioLighting.ts`):** Rig de 9 fuentes de luz (Ambiental, Hemisferica, Key, Fill, Rim, Spot cenital, Core Glow, Under-Platter y Cursor Light) con 4 presets de platillo y 3 modos cromaticos seleccionables en el HUD (`Terracotta`, `Emerald`, `Studio`).
5. **Post-Procesado y Perfiles de GPU (`EffectComposer` + `GPUDetector.ts`):** Pipeline con `RenderPass`, `UnrealBloomPass`, `rayTracingPass` (GI screen-space, reflexiones especulares de piso y dispersion cromatica sutil) y `OutputPass` con mapeo tonal `ACESFilmicToneMapping`.

---

## 2. Material Enhancer Shader (Superficies Culinarias)

Archivos: [`src/three/FoodDishManager.ts`](file:///home/pato/footlink/src/three/FoodDishManager.ts) y [`src/three/shaders/MaterialEnhancerShader.ts`](file:///home/pato/footlink/src/three/shaders/MaterialEnhancerShader.ts)

### Problema Tecnico Resuelto
Los modelos 3D estandar suelen presentar brillos especulares rigidos que recuerdan al plastico. En alimentos reales (pan brioche horneado, carne sellada, queso cheddar fundido, hojas frescas):
- La luz penetra levemente en las capas superficiales y se dispersa en el terminador de sombra (Subsurface Scattering / SSS).
- Las superficies poseen micro-porosidad natural y un lustre humedo focalizado (`moisture`).
- Los contornos capturan un fino halo aterciopelado (Fresnel).

### Implementacion GLSL
El shader inyecta calculos en `<common>`, `<begin_vertex>` y `<dithering_fragment>`:

- **Subsurface Scattering (SSS) en la Penumbra:**
  Calcula la transicion luz-sombra (`foodPenumbra`) y la modula con el color base de la textura y `uFoodSssColor`:
  ```glsl
  float foodNdotL = dot(N, keyDir);
  float penumbra = smoothstep(-0.28, 0.08, foodNdotL) * (1.0 - smoothstep(0.08, 0.48, foodNdotL));
  vec3 sssContrib = gl_FragColor.rgb * uFoodSssColor * (penumbra * uFoodSssIntensity);
  ```
- **Fresnel Rim Sheen y Lustre Humedo:**
  Agrega un contorno suave dependiente del angulo de vision (`NdotV`) y un destello especular de humedad (`specGlaze`) controlado por `uFoodMoisture`.
- **Calibracion por Etapa (`FOOD_SHADER_CONFIGS`):**
  - `hero` (Hamburguesa): Calidez ambar tostada (`#d49a72`).
  - `features` (Pizza): Tono terracota horneado (`#c98868`).
  - `salad` (Ensalada): Dispersion verde clorofila (`#7c946c`).
  - `menu` / `extra` (Pastel y Chocolate): Matices frambuesa y cacao (`#bf9eb2` / `#b3846c`).

---

## 3. Texturas PBR de Seccion Transversal (`FoodCapTextures.ts`)

Archivo: [`src/three/FoodCapTextures.ts`](file:///home/pato/footlink/src/three/FoodCapTextures.ts)

Cuando [`LayeredFoodModel.ts`](file:///home/pato/footlink/src/three/LayeredFoodModel.ts) segmenta la hamburguesa en 6 capas, las superficies internas de corte reciben materiales `MeshStandardMaterial` con texturas generadas proceduralmente en memoria (sin peso extra de descarga):

- **Pan Brioche (`bottom_bun`, `top_bun`):** Miga dorada con nubes de densidad de masa, anillo de sellado en mantequilla y 480 alveolos de fermentacion con relieve (`bumpScale: 0.015`).
- **Medallon Angus (`patty`):** Textura carnica tostada con grano grueso, marmoleo de grasa, motas de pimienta y marcas de parrilla (`bumpScale: 0.024`).
- **Queso Fundido (`cheese`):** Superficie cremosa de cheddar con pliegues suaves y acabado satinado (`roughness: 0.28`).
- **Tomate de Huerta (`tomato`):** Anillo exterior de pulpa rubi, columela carnosa, 4 camaras loculares de gel y semillas color ambar dispuestas radialmente.
- **Hojas de Huerta (`lettuce`):** Verde esmeralda con nervaduras blancas ramificadas desde el tallo central.

---

## 4. Efectos Atmosfericos y Rayos Volumetricos (`AtmosphericFX.ts`)

Archivos: [`src/three/AtmosphericFX.ts`](file:///home/pato/footlink/src/three/AtmosphericFX.ts), [`src/three/shaders/VolumetricRaysShader.ts`](file:///home/pato/footlink/src/three/shaders/VolumetricRaysShader.ts) y [`src/three/shaders/CulinaryParticlesShader.ts`](file:///home/pato/footlink/src/three/shaders/CulinaryParticlesShader.ts)

- **Particulas Doradas y Polvo de Fondo:** Dos sistemas `THREE.Points` (170 particulas principales + 65 de profundidad) con mezcla aditiva (`AdditiveBlending`) que orbitan suavemente alrededor del pedestal.
- **Vapor Culinario Ascendente (`steamSystem`):** 55 particulas sobre la montura del plato que ascienden con oscilacion helicoidal y aumentan su intensidad cuando se levanta la campana (`clocheLift`).
- **Rayos Volumetricos (`VolumetricRaysShader`):** Plano de fondo con shader procedural que proyecta haces de luz diagonales suaves cuyo color e intensidad se adaptan automaticamente a cada etapa del menu.

---

## 5. Deteccion de GPU y Perfiles de Calidad (`GPUDetector.ts` + `StudioHUD.ts`)

Archivos: [`src/three/GPUDetector.ts`](file:///home/pato/footlink/src/three/GPUDetector.ts) y [`src/three/SceneManager.ts`](file:///home/pato/footlink/src/three/SceneManager.ts)

Al iniciar, `GPUDetector` inspecciona la extension `WEBGL_debug_renderer_info` para identificar la tarjeta grafica (por ejemplo, NVIDIA RTX, Apple Silicon Serie M, Radeon RX o graficos integrados) y configura uno de los **3 niveles de renderizado**, los cuales tambien pueden cambiarse manualmente en cualquier momento desde el panel inferior (`StudioHUD`):

| Perfil en HUD | Clave (`TierName`) | Pixel Ratio | Sombras y Luces | Post-Procesado (`EffectComposer`) |
| :--- | :--- | :--- | :--- | :--- |
| **Performance** | `performance` | `1.0` | Sombras desactivadas, luces secundarias simplificadas | Desactivado (render directo ultraligero para 60 FPS en graficos integrados/moviles). |
| **Standard** | `standard` | Hasta `1.5` | Sombras `PCFSoftShadowMap` (`1024x1024`), rig completo | `RenderPass` + `UnrealBloomPass` + `OutputPass`. |
| **Raytracing RTX** | `raytracing` | Hasta `2.0` | Sombras de alta resolucion (`2048x2048`), reflexion fisica completa en campana | Activa `rayTracingPass` (oclusion ambiental direccional, rebote GI calido, reflejo especular de piso y aberracion cromatica sutil) + `UnrealBloomPass`. |
