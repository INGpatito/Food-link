# Original User Request

## 2026-10-12T06:31:59Z

This is a single self-contained fix; keep it small and focused.

Tomar el modelo 3D original de la hamburguesa (public/models/burger.glb) utilizado en la sección Hero y dividirlo en partes/capas físicas independientes (corona de pan brioche, lechuga, tomate, queso, carne, base de pan) conservando sus texturas fotorrealistas originales y su mapeo UV, e integrar el modelo dividido en la sección de Anatomía (#anatomy-root) para que se despiece suavemente al hacer scroll.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Segmentación fotorrealista del modelo original
Dividir el asset original public/models/burger.glb en mallas físicas separadas correspondientes a las capas de ingredientes de la hamburguesa (corona de pan, lechuga, tomate, queso, carne y base de pan). Conservar las texturas PBR fotográficas originales, sésamo, dorados y detalles de sellado sin introducir discos planos artificiales de color sólido ni bordes dentados toscos.

### R2. Ensamblado perfecto en reposo
Cuando el progreso del despiece sea 0%, las capas separadas deben unirse y encajar formando exactamente la apariencia de la hamburguesa original fotorrealista sin huecos visibles ni desalineaciones.

### R3. Despiece dinámico sincronizado con el scroll
Integrar el modelo multicapa en src/three/LayeredFoodModel.ts, src/three/SceneManager.ts y src/sections/AnatomySection.ts de modo que al scrollear a través de #anatomy-root, las capas se separen a lo largo del eje vertical de manera fluida, sincronizadas con el progreso de scroll y los controles interactivos de la sección.

## Acceptance Criteria

### Realismo visual
- [ ] Las capas separadas muestran las texturas fotográficas y el sombreado original de burger.glb.
- [ ] Las piezas no lucen como formas geométricas caricaturescas ni platos planos de un solo color.
- [ ] En estado cerrado (0% de progreso), las piezas reconstituyen fielmente la hamburguesa original.

### Interacción y animación
- [ ] Al deslizar por #anatomy-root, las capas se separan verticalmente de forma suave y continua.
- [ ] La lista de ingredientes de AnatomySection.ts y el indicador de porcentaje reflejan adecuadamente el avance del despiece.

### Calidad de compilación
- [ ] La compilación con npm run build finaliza con código de salida 0 y sin errores de TypeScript.
- [ ] La aplicación se ejecuta en el navegador sin errores en la consola de WebGL.


## 2026-10-14T07:15:00Z

This is a single self-contained fix; keep it small and focused.
Integrar la experiencia 3D de `foodlink_experiencia_3d_interactiva.html` con los modelos GLB de `index.html` (hamburguesa, pizza, ensalada, pastel, chocolate), de modo que al hacer scroll la campana/bandeja se abra progresivamente y presente en su interior cada platillo 3D secuencialmente según la sección activa, preservando la estética visual y el modo de inspección 3D.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Apertura reactiva de la bandeja / campana vinculada al scroll
La escultura 3D central (bandeja/plato y cloche/campana superior) debe responder dinámicamente al desplazamiento del usuario (`scroll`), elevando o abriendo la tapa con una interpolación suave (`lerp` o curva suave) que descubra el interior del recipiente a medida que se avanza en la narrativa.

### R2. Carga e inserción secuencial de modelos GLB dentro del plato
Incorporar los modelos 3D ubicados en `public/models/` (`burger.glb`, `pizza.glb`, `italian_salad.glb`, `cake.glb`, `extra_chocolate.glb`) dentro del grupo central del plato/bandeja:
- Los modelos deben estar correctamente escalados, centrados y apoyados sobre la base del plato.
- Cada etapa o sección de la página debe activar y hacer visible su platillo correspondiente (Etapa 1: Hamburguesa, Etapa 2: Pizza, Etapa 3: Ensalada, Etapa 4: Pastel/Postre), ejecutando una transición limpia de entrada/salida (fade de opacidad, escala o traslación sutil) entre platillos.

### R3. Armonización de iluminación, materiales y post-procesado
Asegurar que los modelos GLB importados reciban adecuadamente la iluminación de estudio, sombras y el pase de post-procesado Bloom existentes en `foodlink_experiencia_3d_interactiva.html`.

### R4. Compatibilidad con el modo de inspección libre
El botón "Inspeccionar escultura 3D" y la interacción de rotación orbital con el cursor deben seguir funcionando fluidamente con el modelo activo visible dentro de la bandeja.

## Acceptance Criteria

### Verificación Funcional y Visual
- [ ] Al hacer scroll desde la parte superior, la campana (`clocheGroup`) se levanta verticalmente y revela el interior de la bandeja.
- [ ] En la Etapa 1 (Hero) se visualiza la hamburguesa 3D centrada sobre el plato.
- [ ] Al descender a las siguientes etapas, el modelo visible cambia de manera secuencial (Pizza en Etapa 2, Ensalada en Etapa 3, Pastel en Etapa 4) sin superponerse ni fallar en la transición.
- [ ] La consola del navegador no presenta errores de carga 404 ni excepciones de `GLTFLoader`.
- [ ] El modo de inspección libre (`toggleInspectMode`) permite orbitar y rotar la bandeja y el platillo seleccionado sin desfasarse de sus coordenadas.
- [ ] No se rompen los estilos Tailwind, fuentes ni componentes HUD ya existentes en `foodlink_experiencia_3d_interactiva.html`.

## 2026-10-14T10:52:59Z

This is a single self-contained fix; keep it small and focused.
Refinar la experiencia en `foodlink_experiencia_3d_interactiva.html`: remover todos los elementos orbitales y estructuras secundarias (halos, satélites, cazuela y cápsula auxiliar), centrar la bandeja horizontalmente en X (0) con un ligero descenso en Y (-0.35) para un encuadre protagonista, implementar transiciones cromáticas continuas del fondo y de la atmósfera ambiental al hacer scroll usando la paleta de colores de cada platillo de `index.html` (`SECTION_THEMES`), e integrar el sistema de iluminación dinámica adaptativa (`LightingSetup`) y los shaders de realce orgánico (`MaterialEnhancer`) para los modelos de comida.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Eliminación total de elementos orbitales y secundarios
Remover completamente de la escena Three.js:
- Los anillos y halos orbitales (`haloGroup`, `primaryHaloRing`, `secondaryHaloRing`, `outerSageRing`, `innerRubyRing`, `orbitalNodes`).
- La nube de satélites flotantes (`satellitesGroup`, `satelliteMeshes`).
- La cazuela tradicional de barro lateral (`cazuelaGroup`) y la cápsula térmica lateral (`rescueVesselGroup`).
- Dejar únicamente la bandeja central, su campana elevable, los platillos GLB y partículas sutiles de polvo ambiental.

### R2. Centrado y ajuste ergonómico de la bandeja
- Configurar el grupo maestro de la bandeja centrado en el eje horizontal ($X = 0$) tanto en modo normal como al hacer scroll.
- Situar la bandeja ligeramente más abajo en el eje vertical ($Y \approx -0.35$ a $-0.45$), proporcionando espacio visual holgado y natural para la elevación de la campana y la apreciación de los alimentos.
- Asegurar que la cámara y el modo de inspección 3D respeten este nuevo centro sin desfasar la órbita.

### R3. Fondo y atmósfera cromática dinámica sincronizada con el scroll
- Vincular el scroll a la paleta de colores de `SECTION_THEMES` de `index.html`:
  - Etapa 1 (Hamburguesa / Hero): `#201610` con resplandor cálido ambarino/dorado.
  - Etapa 2 (Pizza / Features): `#12100E` con resplandor cálido fuego/tomate.
  - Etapa 3 (Ensalada / Salad): `#EAF5E3` (o verde botánico oscuro adaptado al modo dark) con resplandor fresco verde salvia.
  - Etapa 4 (Pastel / Menu): `#1D0F28` con resplandor cereza y ciruela.
- Aplicar la transición de color de forma continua mediante GSAP ScrollTrigger o interpolación por scroll, afectando tanto al `background-color` del body/contenedor como a las variables CSS de iluminación ambiental (`--ambient-model`, `--ambient-primary`).

### R4. Integración de iluminación y shaders de comida de index.html
- Replicar la arquitectura de `LightingSetup.ts` de `index.html` con presets de iluminación dedicados por platillo (ajuste de intensidades y colores para key, fill, rim y spot lights según el platillo activo).
- Incorporar el tratamiento de `MaterialEnhancerShader.ts` para aplicar sutil dispersión subsuperficial (SSS), brillo perimetral (rim) y humedad (moisture) a los materiales de los modelos GLB, evitando apariencias plásticas.

## Acceptance Criteria

### Verificación Visual y Funcional
- [ ] La escena 3D no contiene anillos orbitales, nodos satelitales, cazuela lateral ni cápsula lateral; la bandeja es el único elemento tridimensional central.
- [ ] La bandeja se renderiza centrada en la pantalla horizontalmente ($X=0$) y ligeramente baja en $Y$, permitiendo que la campana se abra sin recortarse en la parte superior.
- [ ] Al hacer scroll a través de las 4 etapas narrativas, el fondo y la atmósfera ambiental cambian progresivamente de color coincidiendo con la paleta de cada platillo.
- [ ] La iluminación del escenario responde dinámicamente al platillo activo (tonos dorados para la hamburguesa, rojos/fuego para la pizza, frescos botánicos para la ensalada, violetas para el pastel).
- [ ] Los modelos GLB presentan las mejoras del shader orgánico (acabado jugoso y natural con respuesta de luz perimetral).
- [ ] El modo de inspección 3D orbital orbita de forma concéntrica alrededor de la bandeja centrada.
- [ ] La consola del navegador permanece limpia, sin errores de WebGL, shaders ni advertencias no controladas.

## 2026-10-16T08:05:14Z

This is a single self-contained fix; keep it small and focused.
Implementar en `index.html` el sistema híbrido de morphing orbital (`orbital-morph-layer`), donde los puntos orbitales 3D que giran alrededor de la campana de cobre se proyectan a pantalla y se transforman fluidamente entre puntos orbitantes (`.is-dot`) y cuadros HUD de información (`.is-card`) con los datos del platillo activo (Hamburguesa, Pizza, Ensalada, Postre) según el desplazamiento por scroll.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Estructura HTML y Estilos CSS de la Capa de Morphing
- Integrar el contenedor fijo `<div id="orbital-morph-layer" aria-live="polite">` con sus 3 artículos interactivos (`#morph-card-0`, `#morph-card-1`, `#morph-card-2`) y la estructura interna semántica (`#mc0-tag`, `#mc0-title`, `#mc0-desc`, `#mc1-title`, `#mc2-metric-l`, etc.).
- Incorporar los estilos CSS proporcionados para `#orbital-morph-layer`, `.orbital-morph-card`, los estados `.is-dot` (punto poligonal con gradiente ámbar/terracota y resplandor) y `.is-card` (vidrio HUD con backdrop-blur, borde sutil y sombra), y la animación de entrada de `.orbital-card-inner`.

### R2. Anclajes 3D y Proyección Espacial a Pantalla (Screen-Space Projection)
- Vincular 3 anclajes orbitales tridimensionales que orbitan suavemente en torno a la campana de cobre (`clocheGroup`) o bandeja en Three.js.
- Proyectar en cada fotograma las coordenadas 3D de cada nodo al espacio de pantalla 2D ($X_{\text{px}}, Y_{\text{px}}$) utilizando `Vector3.project(camera)` para guiar la posición de los puntos en modo `.is-dot`.

### R3. Máquina de Estados y Transición Fluida (Puntos <-> Cuadros)
- Implementar la función `updateOrbitalMorphCards(s, scrollVelocity)` invocada en el ciclo de animación de `index.html`:
  - **Durante transición o desplazamiento rápido (`scrollVelocity > threshold` o zonas intermedias de scroll):** Las tarjetas colapsan a `.is-dot`, orbitando en pantalla en las coordenadas proyectadas 3D.
  - **Al posarse en una sección de platillo (`scrollVelocity` bajo en zona estable de etapa):** Cada nodo se interpola suavemente (`lerp`) desde su posición orbital hacia su anclaje editorial en pantalla (Izquierda `#morph-card-0`, Superior Derecho `#morph-card-1`, Inferior Derecho `#morph-card-2`), cambiando a la clase `.is-card` y revelando los textos.
- Sincronizar dinámicamente los contenidos de texto de los 3 cuadros según el platillo activo:
  - **Etapa 0 (Hamburguesa de Autor):** Propuesta gastronómica, rescate de lote del día, ingredientes de proximidad y trazabilidad.
  - **Etapa 1 (Pizza Artesanal):** Masa madre de 48h, harina de calidad, horno directo, rescate de hornada al cierre.
  - **Etapa 2 (Ensalada Italiana):** Huertos de proximidad, cosecha viva, cultivo directo, frescura de huerta.
  - **Etapa 3 (Postre & Pastel):** Obrador dulce, repostería artesanal, cero merma de fin de jornada.

### R4. Coordinación Visual, Responsividad y Rendimiento
- Asegurar que la capa de morphing no colisione visualmente con la navegación superior ni rompa el responsive en pantallas móviles/tablets (ajustar escalas o posiciones en pantallas pequeñas).
- Evitar *layout thrashing* durante la animación a 60 FPS actualizando transforms (`translate3d`) y opacidades.
- Garantizar que la compilación con `npm run build` termine sin errores de TypeScript ni Vite.

## Acceptance Criteria

### Verificación Visual y Funcional
- [ ] El contenedor `#orbital-morph-layer` y sus estilos CSS están presentes en `index.html`.
- [ ] En reposo en cada etapa, los 3 cuadros se despliegan con la clase `.is-card` mostrando la información correspondiente al platillo visible en la bandeja 3D.
- [ ] Al hacer scroll para cambiar de platillo, los 3 cuadros se contraen fluidamente a puntos orbitantes `.is-dot` y rotan en la posición proyectada de los nodos 3D alrededor de la campana.
- [ ] Al llegar al nuevo platillo, los puntos viajan a sus posiciones de descanso y se transforman nuevamente en cuadros con la nueva información del alimento.
- [ ] Los textos están alineados 100% con la propuesta de Foodlink (sin términos ajenos ni errores de codificación).
- [ ] En pantallas móviles, los cuadros se adaptan ergonómicamente sin desbordar el viewport.
- [ ] `npm run build` ejecuta de forma limpia y exitosa.
## 2026-10-16T09:45:33Z

This is a single self-contained fix; keep it small and focused.
Implementar en `index.html` la transformación dinámica de los 4 nodos orbitales preexistentes del anillo del plato (puntos azules en `orbitNodes`) en 4 cuadros de información (2 a la izquierda y 2 a la derecha), eliminando por completo los 3 puntos añadidos en la campana (puntos rojos) y sustituyendo las tarjetas estáticas duplicadas de fondo para evitar cualquier superposición de textos.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Eliminación de los 3 puntos añadidos sobre la campana (puntos rojos)
- Eliminar de Three.js el grupo `morphAnchorsGroup` y los objetos `morph3DAnchors` que se agregaron a `clocheGroup`.
- Asegurar que sobre la campana de cobre no se rendericen puntos flotantes adicionales.

### R2. Transformación de los 4 nodos orbitales existentes (puntos azules)
- Utilizar los 4 nodos preexistentes en `orbitalRingGroup` (`orbitNodes[0..3]`) que giran sobre el anillo perimetral dorado del plato.
- Proyectar en cada fotograma las coordenadas 3D de cada uno de los 4 `orbitNodes` a coordenadas de pantalla 2D ($X_{\text{px}}, Y_{\text{px}}$) mediante `orbitNodes[i].getWorldPosition(_vec); _vec.project(camera)`.
- En el estado `.is-dot`, los 4 elementos HTML de `#orbital-morph-layer` se posicionan exactamente sobre la proyección 2D de sus respectivos nodos 3D, girando en perfecta sincronía con el anillo.

### R3. Estructura de 4 Tarjetas de Información Dinámicas
- Expandir `#orbital-morph-layer` para manejar 4 tarjetas (`#morph-card-0`, `#morph-card-1`, `#morph-card-2`, `#morph-card-3`):
  - **Tarjeta 0 (Superior Izquierda):** Título del platillo activo y propuesta gastronómica central.
  - **Tarjeta 1 (Inferior Izquierda):** Filosofía artesanal, oficio y compromiso cero desperdicio.
  - **Tarjeta 2 (Superior Derecha):** Ingredientes de proximidad, técnica y origen.
  - **Tarjeta 3 (Inferior Derecha):** Métricas de aprovechamiento, lote del día y trazabilidad.
- Actualizar dinámicamente los contenidos para cada una de las 4 etapas culinarias (Hamburguesa, Pizza, Ensalada, Postre).

### R4. Eliminación de Superposiciones (Reemplazo de Tarjetas Duplicadas)
- Eliminar las tarjetas fijas estáticas del flujo HTML (`stage-1`, etc.) que causaban la superposición visible en la captura del usuario.
- El contenedor principal de scroll mantiene el espacio vertical y la narrativa de scroll, pero la información visual de cada platillo es desplegada exclusivamente por las 4 tarjetas dinámicas de morphing.

### R5. Transición Fluida y Rendimiento
- **Al hacer scroll / transición de platillo:** Las 4 tarjetas se contraen a puntos (`.is-dot`) y regresan suavemente al anillo dorado, girando con los nodos orbitales.
- **Al detenerse en un platillo:** Cada punto viaja hacia su cuadrante de pantalla correspondiente (2 a la izquierda, 2 a la derecha) y se despliega como tarjeta HUD (`.is-card`).
- Rendimiento a 60 FPS sin recolección de basura (*GC*), con transiciones `translate3d` y compilación limpia mediante `npm run build`.

## Acceptance Criteria

### Verificación Visual y Funcional
- [ ] Los 3 puntos flotantes que estaban sobre la campana de cobre han sido eliminados por completo.
- [ ] Los 4 puntos que giran en el anillo dorado del plato son los únicos que originan la animación de transformación.
- [ ] Se despliegan 4 tarjetas de información (2 a la izquierda y 2 a la derecha) al detenerse en cada platillo.
- [ ] No existe ninguna superposición o duplicidad de tarjetas de texto sobre la pantalla.
- [ ] Al cambiar de platillo mediante scroll, las 4 tarjetas se contraen a puntos y giran sobre el anillo antes de desplegar la información del nuevo platillo.
- [ ] Los textos para los 4 platillos son coherentes y auténticos de la propuesta de Foodlink.
- [ ] `npm run build` ejecuta de forma limpia y exitosa.


## 2026-10-16T11:19:45Z

Refactorizar y modularizar la experiencia completa de `index.html` integrándola en la arquitectura TypeScript/Vite de `src/`, descomponiendo el archivo monolítico en módulos desacoplados y legibles (componentes de UI, controladores 3D Three.js, shaders, estilos y utilidades), manteniendo 100% intacta la fidelidad visual, la cinemática de la campana/bandeja, la capa de morphing orbital 3D-a-HUD de 4 nodos, y garantizando la estricta prohibición de emojis en todo el código fuente y la interfaz web.

Working directory: /home/pato/footlink
Integrity mode: development

## Requirements

### R1. Desacoplamiento y Modularización de la Interfaz (UI)
Descomponer la interfaz gráfica en componentes TypeScript/HTML modulares con ciclo de vida claro en `src/ui/` o `src/components/`:
- **Navegación Superior (`Navbar.ts` / `Header.ts`):** Identidad tipográfica FOODLINK, pastillas de navegación de etapas y botón de acción.
- **Capa de Morphing Orbital (`OrbitalMorphLayer.ts`):** Estructura DOM de los 4 artículos interactivos (`#morph-card-0..3`), estados visuales (`.is-dot`, `.is-card`) y sincronización reactiva de textos para los 4 platillos culinarios.
- **Narrativa de Desplazamiento (`ScrollStory.ts`):** Secciones de scroll (`#stage-1..4`) limpias y sin duplicidad de textos estáticos.
- **Telemetría y Controles HUD (`StudioHUD.ts`):** Indicador de etapas, nombres de atmósfera, selector de iluminación de estudio y botón de activación de inspección libre.
- **Modales del Sistema (`Modals.ts`):** Modal de inspección 3D y modal de registro de cocinas/comunidad.

### R2. Arquitectura de Escena y Controladores 3D en `src/three/`
Organizar la lógica Three.js en clases y módulos tipados con responsabilidades únicas:
- **`SceneManager.ts`:** Inicialización de WebGLRenderer, PerspectiveCamera, ciclo de animación `requestAnimationFrame` a 60 FPS y orquestación general.
- **`ClochePlatterRig.ts`:** Geometría procedural de la campana de cobre (`clocheGroup`), bandeja central (`platterGroup`), anillo perimetral dorado (`orbitalRingGroup`) y los 4 nodos orbitales (`orbitNodes`).
- **`FoodDishManager.ts`:** Carga asíncrona segura (`GLTFLoader`), escalado normalizado y centrado ergonómico de los modelos GLB (`burger.glb`, `pizza.glb`, `italian_salad.glb`, `cake.glb`, `extra_chocolate.glb`).
- **`StudioLighting.ts`:** Esquema dinámico de iluminación de estudio con transiciones cromáticas por platillo y soporte para estados lumínicos (*Terracotta*, *Emerald*, *Studio*).
- **`AtmosphericFX.ts`:** Partículas ambientales, vapor culinario ascendente sobre la bandeja y polvo sutil.
- **`OrbitalMorphController.ts`:** Proyección espacial matemática (3D a espacio de pantalla 2D) de los 4 `orbitNodes`, interpolación suave S-curve, máquina de estados y atenuación de escala de los nodos 3D.
- **`GPUDetector.ts`:** Detección automática de GPU de alto rendimiento vs. modo optimizado para portátiles con CPU integrada sin GPU dedicada.

### R3. Organización de Estilos y Punto de Entrada
- Extraer los bloques `<style>` incrustados a archivos CSS organizados en `src/styles/` (p. ej. `fonts.css`, `morph-cards.css`, `atmosphere.css`, `hud.css` o `global.css`).
- Dejar `index.html` como un punto de entrada declarativo y minimalista que cargue los estilos locales y ejecute `<script type="module" src="/src/main.ts"></script>`.
- Orquestar la inicialización en `src/main.ts` conectando la escena 3D, el controlador de scroll y los componentes de interfaz.

### R4. Regla Estricta: Cero Emojis
- Prohibición absoluta de emojis en comentarios de código, nombres de variables, cadenas de texto, mensajes de consola y contenido visible en la web.
- Emplear exclusivamente iconografía tipográfica o SVG vectoriales minimalistas ya definidos en el diseño.

## Acceptance Criteria

### Verificación Funcional y Estructural
- [ ] `index.html` es una plantilla limpia de menos de 100 líneas que delega la lógica a `/src/main.ts` y las hojas de estilos modularizadas.
- [ ] La carpeta `src/` cuenta con una jerarquía clara y desacoplada de componentes UI, módulos 3D y estilos.
- [ ] La experiencia interactiva completa se preserva al 100%:
  - Apertura vertical suave de la campana vinculada al scroll.
  - Rotación orbital de la bandeja y transición secuencial de platillos.
  - Los 4 nodos orbitales del anillo dorado se proyectan a pantalla y transicionan suavemente a los 4 cuadros HUD en reposo (Hamburguesa, Pizza, Ensalada, Postre).
  - El modo de inspección 3D y los modales continúan funcionando con total fluidez.
- [ ] Cero emojis encontrados en todo el repositorio (`src/`, `index.html`, etc.).
- [ ] `npm run build` (`tsc && vite build`) se ejecuta exitosamente con código de salida 0 sin errores de compilación ni excepciones de tipos.
