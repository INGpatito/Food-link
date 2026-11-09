# Gestion de Modelos 3D, Pedestal Cloche y Despiece Multicapa

Foodlink presenta cada platillo del menu como una pieza de estudio tridimensional interactiva montada sobre un pedestal ceramico con campana (`ClochePlatterRig`), soporte de despiece por ingredientes (`LayeredFoodModel`) y modo de inspeccion libre de 360°.

---

## 1. Platillos y etapas del menu (`FoodDishManager.ts`)

Los modelos se almacenan en `public/models/` en formato binario `.glb` y son administrados por [`FoodDishManager`](file:///home/pato/footlink/src/three/FoodDishManager.ts) a traves de 4 etapas (`FOOD_STAGES`):

| Etapa | ID / Clave | Platillo | Archivo(s) GLB en `public/models/` | Caracteristica 3D Especial |
| :--- | :--- | :--- | :--- | :--- |
| **Etapa 0** | `burger` (`hero`) | Hamburguesa de Autor | `burger.glb` | Segmentacion en **6 capas solidas** (`LayeredFoodModel`) con texturas de corte PBR (`FoodCapTextures`). |
| **Etapa 1** | `pizza` (`features`) | Pizza Artesanal | `pizza.glb` | Separacion de rebanada frontal y levitacion suave al hacer despiece. |
| **Etapa 2** | `salad` (`salad`) | Ensalada Italiana | `italian_salad.glb` | Expansion radial y vertical de las piezas del bowl durante el despiece. |
| **Etapa 3** | `cake` (`menu`) | Postre & Pastel | `cake.glb` + `extra_chocolate.glb` | Escena compuesta: pastel principal acompañado del cupcake de chocolate (`companionFile`). |

### Normalizacion automatica de escala y centrado
Al cargar cada archivo `.glb`, `FoodDishManager.normalizeAndPlaceModel()` calcula su `THREE.Box3`, obtiene la dimension maxima y escala automaticamente el modelo hacia el `targetSize` definido en `FOOD_STAGES`, apoyando su base exactamente sobre la montura del plato (`foodPlatterMount`).

---

## 2. Pedestal y Campana Cinematografica (`ClochePlatterRig.ts`)

El archivo [`src/three/ClochePlatterRig.ts`](file:///home/pato/footlink/src/three/ClochePlatterRig.ts) construye de forma 100% procedural la estructura fisica donde se sirven los platillos:

- **Plato Ceramico (`platterGroup`):** Geometria torneada (`THREE.LatheGeometry`) con acabado ceramico oscuro (`darkCeramic`), plato interior de gres crema (`creamStoneware`) y bordes de laton dorado (`brassGold`).
- **Campana de Cristal y Oro (`clocheGroup`):** Domo semiesferico con material fisico translucido (`glassDome`), arcos meridianos dorados y remate superior (`finial`). Se eleva y desvanece dinamicamente conforme el usuario hace scroll o mueve el control deslizante.
- **Anillo Orbital de Telemetria (`orbitalRingGroup`):** Anillo perimetral dorado con **4 nodos octaedricos (`orbitNodes`)** que giran alrededor del plato y sirven como puntos de anclaje 3D para las 4 tarjetas HUD de la interfaz.
- **Indicador Holografico de Carga (`loadingPlaceholderGroup`):** Nucleo y anillo luminoso que giran sobre el plato mientras se completa la descarga asincrona de un modelo 3D.

---

## 3. Despiece Multicapa Fotorrealista (`LayeredFoodModel.ts` + `FoodCapTextures.ts`)

Para que la hamburguesa (`burger.glb`) pueda separarse en sus ingredientes reales sin perder sus texturas fotograficas ni verse hueca por dentro:

### 3.1. Corte Geometrico en 6 Capas (`src/three/LayeredFoodModel.ts`)
`buildLayeredBurgerFromGLTF()` analiza la geometria del modelo original y la divide mediante 5 planos de corte horizontales (`CUT_FRACTIONS = [0.22, 0.42, 0.51, 0.62, 0.73]`) en 6 grupos independientes (`LAYER_DEFS`):

1. `bottom_bun` — **Pan Brioche Base** (`order: -2`)
2. `patty` — **Medallon Angus** (`order: -1`)
3. `cheese` — **Queso Fundido** (`order: 0`)
4. `tomato` — **Tomate de Huerta** (`order: 1`)
5. `lettuce` — **Hojas de Huerta** (`order: 2`)
6. `top_bun` — **Pan Brioche Corona** (`order: 3`)

Cuando el progreso de despiece es `0%`, las 6 piezas encajan con precision milimetrica reconstituyendo la hamburguesa original sin costuras visibles.

### 3.2. Tapas Solidas con Texturas PBR Procedurales (`src/three/FoodCapTextures.ts`)
Al cortar una malla 3D con un plano, quedan aberturas planas. Para que cada ingrediente sea un volumen solido y apetitoso, `LayeredFoodModel` construye tapas (`buildConstrainedCapMesh`) con relieve organico y les asigna materiales PBR generados en [`src/three/FoodCapTextures.ts`](file:///home/pato/footlink/src/three/FoodCapTextures.ts):

- **Brioche (`createBriocheTexture`):** Miga dorada aireada con poros de fermentacion y halo de mantequilla tostada en plancha.
- **Carne Angus (`createPattyTexture`):** Grano de carne asada al carbon, marmoleo, pimienta y costra caramelizada.
- **Queso Cheddar (`createCheeseTexture`):** Superficie cremosa dorada con baja rugosidad (`roughness: 0.28`) y brillo lacteo.
- **Tomate (`createTomatoTexture`):** Pulpa rubi jugosa, columela central, cavidades loculares y semillas ambar.
- **Lechuga (`createLettuceTexture`):** Hojas verde esmeralda con nervaduras radiales crujientes.

---

## 4. Modo de Inspeccion Libre 360° (`StudioHUD.ts`)

El usuario puede activar el **Modo 3D Libre** desde el boton `Modo 3D Libre` en la barra inferior (`StudioHUD`) o al final de la pagina:

- **Rotacion Orbital 360°:** Arrastrando con el raton o deslizando el dedo en pantalla tactil sobre el platillo para inspeccionarlo desde cualquier angulo horizontal y vertical.
- **Selector Directo de Platillo:** Botones rapidos (`Hamburguesa`, `Pizza`, `Ensalada`, `Pastel`) para cambiar el modelo en el pedestal sin hacer scroll.
- **Slider de Campana y Capas (`#inspect-cloche-slider`):**
  - De `0%` a `50%`: Controla la elevacion progresiva de la campana (`Cloche`).
  - De `50%` a `100%`: Separa progresivamente las capas e ingredientes del platillo activo (`explodeDishLayers`).

---

## 5. Como agregar o modificar un modelo 3D

1. Coloca el archivo `.glb` optimizado dentro de `public/models/`.
2. Edita el arreglo `FOOD_STAGES` en [`src/three/FoodDishManager.ts`](file:///home/pato/footlink/src/three/FoodDishManager.ts) (o `MODEL_CONFIGS` en [`src/utils/constants.ts`](file:///home/pato/footlink/src/utils/constants.ts)) para ajustar:
   - `file`: Nombre del archivo en `public/models/`.
   - `targetSize`: Tamano normalizado en unidades de escena (por ejemplo `2.05` para la hamburguesa, `2.38` para la pizza).
   - `rotX`, `rotY`, `rotZ`: Orientacion inicial en radianes.
   - `posX`, `posY`, `posZ`: Desplazamiento fino sobre el plato.
