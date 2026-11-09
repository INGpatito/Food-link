# Arquitectura del Proyecto Foodlink

Este documento describe la organizacion general del ecosistema Foodlink, abarcando la plataforma web interactiva 3D con estudio culinario en tiempo real, el backend de autenticacion y la aplicacion movil nativa para Android.

---

## 1. Vision general del sistema

El ecosistema Foodlink se compone de tres piezas integradas:

1. **Cliente Web 3D (Estudio Gastronomico Interactivo):** Aplicacion web desarrollada con Vite, TypeScript, Three.js, Lenis y CSS modular/Tailwind CSS v4. Presenta los platillos sobre un pedestal ceramico con campana de cristal/oro (`ClochePlatterRig`), tarjetas HUD ancladas en 3D (`OrbitalMorphLayer` + `OrbitalMorphController`), despiece multicapa fotorrealista (`LayeredFoodModel`) y un panel de telemetria e inspeccion libre 360° (`StudioHUD`).
2. **Servidor Backend y Base de Datos:** Capa de servicios REST montada sobre Node.js con `mysql2/promise` y `bcryptjs`. Se conecta a la base de datos MariaDB/MySQL en la placa Orange Pi 4 Pro (`FOODLINK`) y despacha correos de verificacion mediante EmailJS.
3. **Aplicacion Movil Android:** Aplicacion nativa desarrollada en Kotlin con Jetpack Compose en `/home/pato/footlink/Foodlink`. Permite registrarse e iniciar sesion desde cualquier red celular o Wi-Fi, compartiendo la misma cuenta y base de datos que la web.

---

## 2. Estructura de directorios

### Frontend Web y Backend (`/home/pato/footlink`)

- **index.html**: Documento raiz que define los contenedores principales del estudio:
  - `#webgl-container`: Canvas de Three.js a pantalla completa.
  - `#navbar-root`: Barra de navegacion superior.
  - `#orbital-morph-layer`: Capa de 4 tarjetas HUD en cuadrantes y lienzo SVG de lineas guia (`#orbital-leader-svg`).
  - `#scroll-root`: Flujo narrativo de 4 etapas de scroll (`#stage-1` a `#stage-4`) y cierre editorial.
  - `#hud-root`: Panel de telemetria, selector de calidad GPU/luz y controles de inspeccion 360°.
  - `#modals-root`: Modal de registro de cocinas y productores (`#join-modal`).
  - `#login-modal-root`: Modal de autenticacion de comensales y modales legales (Terminos y Privacidad).
- **public/**:
  - `models/`: Modelos 3D en formato GLB (`burger.glb`, `pizza.glb`, `italian_salad.glb`, `cake.glb`, `extra_chocolate.glb`).
  - `fonts/`: Tipografias autoalojadas en formato `.woff2` (`Cormorant Garamond`, `Plus Jakarta Sans`, `JetBrains Mono`, `Fraunces`, `Syne`, `Space Mono`).
- **src/main.ts**: Punto de entrada de la aplicacion. Inicializa los componentes de UI, instancia `SceneManager`, vincula las tarjetas orbitales con el motor 3D y ejecuta el bucle de animacion sincronizado con Lenis.
- **src/three/**: Motor de renderizado 3D, iluminacion, fisica visual y post-procesado:
  - `SceneManager.ts`: Orquestador principal de la escena Three.js, camara, `EffectComposer` (`RenderPass`, `UnrealBloomPass`, `rayTracingPass`, `OutputPass`), transiciones de scroll e interaccion de usuario (arrastre 360° e inspeccion libre).
  - `ClochePlatterRig.ts`: Construye proceduralmente el plato ceramico oscuro, los anillos dorados con 4 nodos orbitales y la campana (`cloche`) translucida que se eleva al hacer scroll.
  - `FoodDishManager.ts`: Carga y administra los platillos de las 4 etapas, aplica el shader `MaterialEnhancer`, coordina el modelo multicapa de la hamburguesa y gestiona la separacion de capas (`explodeDishLayers`).
  - `LayeredFoodModel.ts`: Divide geometricamente la malla de `burger.glb` mediante planos de corte horizontales en 6 capas independientes (Pan Brioche Base, Medallon Angus, Queso Fundido, Tomate de Huerta, Hojas de Huerta, Pan Brioche Corona) y genera mallas cerradas solidas.
  - `FoodCapTextures.ts`: Genera texturas `CanvasTexture` PBR procedurales (color, rugosidad y mapa de relieve/bump) para sellar las superficies de corte de cada ingrediente de la hamburguesa.
  - `OrbitalMorphController.ts`: Proyecta las coordenadas 3D de los nodos del anillo dorado al espacio 2D de la pantalla y posiciona las 4 tarjetas HUD junto con sus curvas SVG Bezier.
  - `StudioLighting.ts`: Sistema de iluminacion adaptativa de estudio con 4 presets de etapa (`hero`, `features`, `salad`, `menu`) y 3 modos ambientales (`terracotta`, `emerald`, `studio`).
  - `AtmosphericFX.ts`: Sistemas de particulas de polvo dorado, vapor culinario ascendente y rayos volumetricos (`VolumetricRaysShader`).
  - `GPUDetector.ts`: Detecta automaticamente el modelo de GPU mediante `WEBGL_debug_renderer_info` y selecciona el perfil optimo (`performance`, `standard` o `raytracing`).
  - `PostProcessingManager.ts`, `ModelLoader.ts`, `LightingSetup.ts`, `CameraController.ts`: Modulos de soporte y compatibilidad para carga de modelos, iluminacion y post-procesado.
  - `shaders/`:
    - `MaterialEnhancerShader.ts`: Inyeccion GLSL (`onBeforeCompile`) para Subsurface Scattering (SSS), Fresnel rim sheen y micro-rugosidad organica.
    - `CulinaryParticlesShader.ts`: Shader de particulas con conveccion helicoidal y repulsion al cursor.
    - `VolumetricRaysShader.ts`: Shader para haces de luz volumetrica (God-Rays) tras el pedestal.
- **src/ui/**: Componentes de interfaz de usuario activos en la experiencia principal:
  - `Navbar.ts`: Barra de navegacion superior con enlaces a las 4 etapas, indicador de etapa activa, boton "Unirse / Registrar Cocina" y boton de sesion ("Iniciar Sesion" / "Mi Cuenta").
  - `OrbitalMorphLayer.ts`: Renderiza las 4 tarjetas de informacion nutricional/origen y sincroniza sus textos (`DISH_CARD_DATA`) al cambiar de platillo.
  - `ScrollStory.ts`: Renderiza las 4 secciones de narrativa (`#stage-1` a `#stage-4`) y el bloque de cierre con acceso a registro de cocinas y exploracion libre 3D.
  - `StudioHUD.ts`: Panel inferior e indicadores de telemetria (`FPS`, angulo de plato, elevacion de campana), selector de calidad grafica, selector de luz y barra de control del **Modo 3D Libre (360°)**.
  - `Modals.ts`: Ventana modal para registro de cocinas y productores (`#join-modal`).
  - `LoginModal.ts`: Ventana modal de autenticacion (login, registro, verificacion por codigo de 6 digitos, perfil de usuario) y modales legales de **Terminos y Condiciones** y **Politica de Privacidad**.
- **src/sections/**: Componentes de secciones modulares y vista de anatomia:
  - `AnatomySection.ts`: Seccion interactiva de anatomia culinaria y despiece en capas con controles de ensamblaje/despiece.
  - `HeroSection.ts`, `FeaturesSection.ts`, `SaladSection.ts`, `MenuSection.ts`, `ExtraSection.ts`, `FooterSection.ts`: Plantillas de secciones individuales de platillos.
- **src/styles/**: Hojas de estilo modulares:
  - `global.css`: Punto de entrada CSS que importa los modulos, Tailwind CSS v4 y variables globales.
  - `fonts.css`: Declaraciones `@font-face` para todas las fuentes `.woff2` locales en `public/fonts/`.
  - `atmosphere.css`: Fondos dinamicos, halos radiales y grano cinematografico.
  - `navbar.css`: Estilos de la barra de navegacion superior.
  - `morph-cards.css`: Estilos de las tarjetas orbitales HUD y conectores SVG.
  - `hud.css`: Estilos del panel Studio HUD, controles de inspeccion 360° y modales de cocina.
  - `auth.css`: Estilos del modal de inicio de sesion, verificacion y modales legales.
- **src/services/**:
  - `emailService.ts`: Despacho de correos de confirmacion mediante la API de EmailJS.
- **src/utils/**:
  - `auth.ts`: Manejo de sesion local (`localStorage`) y eventos reactivos de usuario.
  - `constants.ts`: Configuraciones de modelos, rutas, temas de color y camara.
  - `GPUDeviceDetector.ts`: Utilidad de deteccion de capacidades de GPU y bateria para ajuste de calidad.
  - `helpers.ts`: Funciones auxiliares matematicas y de formato.
- **server/**:
  - `db.ts`: Pool de conexiones y consultas preparadas a MySQL en Orange Pi 4 Pro.
  - `authPlugin.ts`: Middleware REST (`/api/auth/*`) integrado en el servidor Vite.
  - `standalone.mjs`: Servidor HTTP de produccion en Node.js gestionado con PM2.

---

### Aplicacion Android (`/home/pato/footlink/Foodlink`)

- **app/src/main/java/com/example/foodlink/**:
  - `MainActivity.kt`: Actividad principal que carga el tema oscuro y la pantalla de acceso.
  - `data/model/`: Modelos `User.kt` y `AuthResponse.kt`.
  - `data/remote/`: Cliente `AuthApi.kt` conectado a `https://papoys.me/api/auth/`.
  - `data/local/`: `SessionManager.kt` para almacenamiento seguro de sesion con `SharedPreferences`.
  - `ui/theme/`: Paleta de colores oficial (`Color.kt`) y tema visual de Foodlink (`Theme.kt`).
  - `ui/auth/`: `AuthScreen.kt` con soporte de login, registro, verificacion y bienvenida con "Hola, [nombre]".

---

## 3. Flujo de renderizado y datos

1. **Inicializacion WebGL y Deteccion de Hardware:** Al cargar `src/main.ts`, `SceneManager` crea el contexto WebGL, construye el `ClochePlatterRig`, inicializa `StudioLighting` y `AtmosphericFX`, y ejecuta `GPUDetector` para activar el perfil grafico adecuado (`Performance`, `Standard` o `Raytracing RTX`).
2. **Carga Progresiva de Platillos:** `FoodDishManager` carga prioritariamente el platillo inicial (`burger.glb`), genera su version segmentada de 6 capas (`LayeredFoodModel`) con texturas de corte (`FoodCapTextures`) y predescarga en segundo plano el resto del menu (`pizza.glb`, `italian_salad.glb`, `cake.glb`, `extra_chocolate.glb`).
3. **Sincronizacion Scroll <-> 3D <-> HUD:** Lenis emite la posicion de scroll normalizada (`0.0` a `1.0`), con la cual `SceneManager` interpola la apertura de la campana, la transicion entre las 4 etapas de platillos, el color de la iluminacion y la posicion de las 4 tarjetas orbitales (`OrbitalMorphController`).
4. **Flujo de Autenticacion Unificado:**
   - El comensal se registra o inicia sesion desde `LoginModal.ts` o la app Android.
   - La solicitud viaja por HTTPS a `https://papoys.me/api/auth/` (enrutado por Cloudflare Tunnel hacia la Orange Pi 4 Pro).
   - El backend cifra la contrasena con `bcryptjs`, almacena el usuario en la tabla `users` de `FOODLINK` y envia el codigo de 6 digitos mediante EmailJS.
   - Una vez verificado (`is_verified = 1`), la sesion queda activa tanto en web como en dispositivos moviles.
