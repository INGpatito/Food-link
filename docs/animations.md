# Animaciones, Scroll Narrativo y Proyeccion Orbital

Foodlink combina desplazamiento suave con inercia, coreografia tridimensional continua en Three.js y proyeccion matematica 3D-a-2D para mantener sincronizados el modelo, la campana, las luces y las tarjetas de interfaz en cada fotograma.

---

## 1. Motor de Desplazamiento Suave (Lenis + `SceneManager`)

En [`src/main.ts`](file:///home/pato/footlink/src/main.ts), el desplazamiento de la pagina es gestionado por **Lenis** (`duration: 1.25`, `smoothWheel: true`) y conectado directamente con [`SceneManager`](file:///home/pato/footlink/src/three/SceneManager.ts):

- **Normalizacion continua (`0.0` a `1.0`):** En cada evento de scroll, se calcula el progreso global dividiendo `window.scrollY` entre el alto desplazable total (`maxScroll`) y se asigna a `sceneManager.targetScroll`.
- **Amortiguacion en el bucle de renderizado:** Dentro de `SceneManager.updateFrame()`, `smoothScroll` interpola suavemente hacia `targetScroll` (`smoothScroll += (targetScroll - smoothScroll) * 0.085`), garantizando transiciones de camara, rotacion del plato y apertura de campana libres de saltos incluso con ruedas de raton mecanicas.

---

## 2. Coreografia de las 4 Etapas y la Campana (`ClochePlatterRig`)

El recorrido vertical (`#scroll-root` en [`src/ui/ScrollStory.ts`](file:///home/pato/footlink/src/ui/ScrollStory.ts)) se divide en 4 etapas (`stageFloat = smoothScroll * 3.0`):

1. **Apertura de Campana (`clocheLift`):**
   - Al iniciar el scroll en la Etapa 0, la campana de cristal se eleva verticalmente, rota sutilmente su remate superior (`finial`) y reduce la opacidad de sus materiales para revelar el platillo con claridad.
   - El vapor culinario (`AtmosphericFX`) se intensifica conforme la campana se abre.
2. **Transicion entre Platillos (`FoodDishManager.updateDishTransitions`):**
   - Al avanzar entre etapas (`0 -> 1 -> 2 -> 3`), el platillo saliente reduce su peso visual (`displayWeight`) y escala suavemente mientras el platillo entrante emerge en el centro del pedestal con una rotacion de presentacion.
3. **Despiece Automatico en Scroll y Modo Inspeccion (`explodeDishLayers`):**
   - Durante la ventana de enfoque de cada etapa (o mediante el slider del Modo 3D Libre), las capas del platillo se separan verticalmente siguiendo una curva suave con flotacion sinusoidal (`bobWave`), permitiendo apreciar el interior de cada ingrediente.

---

## 3. Proyeccion Orbital 3D-a-2D (`OrbitalMorphController.ts`)

Uno de los elementos distintivos de la interfaz es el sistema de **4 tarjetas HUD orbitales** administrado por [`src/three/OrbitalMorphController.ts`](file:///home/pato/footlink/src/three/OrbitalMorphController.ts) y [`src/ui/OrbitalMorphLayer.ts`](file:///home/pato/footlink/src/ui/OrbitalMorphLayer.ts):

- **Nodos de Anclaje 3D:** El anillo dorado del plato (`ClochePlatterRig.orbitalRingGroup`) posee 4 nodos octaedricos en rotacion.
- **Proyeccion en Tiempo Real:** En cada fotograma, `OrbitalMorphController.update()` proyecta la posicion 3D de cada cuadrante del anillo hacia coordenadas de pantalla 2D usando `THREE.Vector3.project(camera)`.
- **Tarjetas Siempre Legibles (sin colapso en scroll):**
  - Las 4 tarjetas permanecen visibles en sus anclajes editoriales responsivos durante todo el desplazamiento; ya no se contraen en orbes ni hay que esperar a que el scroll se detenga para volver a leer la informacion.
  - Al cambiar de etapa, [`OrbitalMorphLayer.updateCardContent()`](file:///home/pato/footlink/src/ui/OrbitalMorphLayer.ts) realiza un **intercambio de contenido en sitio** (~170 ms de fundido de salida con desenfoque y una cascada de entrada por elemento), escalonado entre tarjetas en orden de lectura Z (Superior-Izquierda, Superior-Derecha, Inferior-Izquierda, Inferior-Derecha). Cambios rapidos de etapa se agrupan y siempre muestran la etapa mas reciente.
  - La tarjeta principal incluye un contador de etapa (`01 / 04`) y una barra de acento superior que hace un barrido al llegar contenido nuevo y se ilumina levemente mientras se desplaza (`--mc-motion`).
  - Durante el scroll las tarjetas solo flotan unos pixeles en sentido contrario al desplazamiento (deriva amortiguada), respetando `prefers-reduced-motion`.
- **Lineas Guia SVG Bezier (`#orbital-leader-svg`):** Cuatro trayectorias SVG (`<path>`) con puntos de anclaje (`<circle>`) conectan dinamicamente el borde de cada tarjeta HUD con su punto exacto sobre el anillo dorado 3D.

---

## 4. Transiciones Cromatica y Luminica Continua (`StudioLighting.ts`)

A medida que `stageFloat` avanza entre `0` y `3`, [`StudioLighting.updateFromScroll()`](file:///home/pato/footlink/src/three/StudioLighting.ts) interpola en tiempo real:

- Las variables CSS del documento (`--bg-color`, `--ambient-model`, `--ambient-primary`, `--ambient-secondary`) que alimentan los gradientes radiales de [`src/styles/atmosphere.css`](file:///home/pato/footlink/src/styles/atmosphere.css).
- Los colores e intensidades de las luces 3D (`keyLight`, `fillLight`, `rimLight`, `spotLight`, `coreGlowLight`).
- El matiz de los rayos volumetricos y particulas en [`AtmosphericFX`](file:///home/pato/footlink/src/three/AtmosphericFX.ts).
