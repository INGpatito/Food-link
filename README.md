# Foodlink

Una experiencia web gastronomica e interactiva en 3D que presenta cada platillo del menu sobre un pedestal y campana (Cloche) cinematografica, con tarjetas editoriales orbitales, despiece multicapa fotorrealista, iluminacion de estudio adaptativa y telemetria en tiempo real. Resuelve la presentacion estatica tradicional permitiendo que los comensales exploren los platillos desde cualquier angulo (incluyendo modo de inspeccion libre 360°) antes de ordenar.

## Stack tecnologico

- **Lenguaje principal:** TypeScript y JavaScript moderno (ES Modules).
- **Entorno y empaquetador:** Vite con recarga rapida en desarrollo (HMR).
- **Renderizado 3D y Post-Procesado:** Three.js con modelos GLB, rig procedural de plato y campana (`ClochePlatterRig`), despiece multicapa con texturas PBR procedurales (`LayeredFoodModel` + `FoodCapTextures`), particulas y rayos volumetricos (`AtmosphericFX`) y pipeline `EffectComposer` (`UnrealBloomPass` + `rayTracingPass` con deteccion automatica de GPU).
- **Animaciones y scroll:** Lenis para desplazamiento con inercia suave, GSAP (`ScrollTrigger`) y proyeccion 3D-a-2D en tiempo real (`OrbitalMorphController`) con lineas guia SVG dinamicas.
- **Diseno, interfaz y tipografia:** HTML5 semantico, CSS modular (`fonts.css`, `atmosphere.css`, `navbar.css`, `morph-cards.css`, `hud.css`, `auth.css`), Tailwind CSS v4 y tipografias `.woff2` autoalojadas localmente (`Cormorant Garamond`, `Plus Jakarta Sans`, `JetBrains Mono`, `Fraunces`, `Syne`, `Space Mono`) sin dependencias externas.
- **Base de datos y backend:** MariaDB / MySQL en Orange Pi 4 Pro (`FOODLINK`) con cifrado **bcrypt**, verificacion por correo mediante EmailJS y registro de cocinas/productores locales.
- **Aplicacion movil:** Android nativo en Kotlin y Jetpack Compose (en la carpeta `Foodlink`).

## Caracteristicas principales

1. **Recorrido Narrativo en 4 Etapas (`ScrollStory`):**
   - **Etapa 0 — Hamburguesa de Autor (`burger.glb`):** Medallon Angus, pan brioche y despiece interactivo en 6 capas solidas.
   - **Etapa 1 — Pizza Artesanal (`pizza.glb`):** Masa madre de 72 horas y coccion en horno de lena.
   - **Etapa 2 — Ensalada Italiana (`italian_salad.glb`):** Hojas organicas y cosecha de huerta local.
   - **Etapa 3 — Postre & Pastel (`cake.glb` + `extra_chocolate.glb`):** Pastel de celebracion acompañado de cupcake de cacao.
2. **Tarjetas Orbitales y Lineas Guia (`OrbitalMorphLayer` + `OrbitalMorphController`):** Cuatro tarjetas HUD distribuidas en cuadrantes que orbitan y se anclan en tiempo real a los nodos 3D del anillo dorado mediante conectores SVG Bezier.
3. **Despiece Multicapa Fotorrealista (`LayeredFoodModel` + `FoodCapTextures`):** Segmentacion geometrica del modelo `burger.glb` en 6 ingredientes independientes con tapas de corte texturizadas proceduralmente (miga de brioche tostada, carne asada, cheddar fundido, pulpa y semillas de tomate, hojas de lechuga) para evitar geometrias huecas al separar las capas.
4. **Studio HUD y Modo Inspeccion 360° (`StudioHUD`):**
   - Selector de nivel grafico con deteccion automatica de GPU (`Performance`, `Standard`, `Raytracing RTX`).
   - Selector de atmosfera luminica (`Terracotta`, `Emerald`, `Studio`).
   - **Modo 3D Libre (360°):** Permite rotar el platillo con el cursor o pantalla tactil, cambiar de platillo al instante y controlar manualmente la apertura de la campana y la separacion en capas mediante un control deslizante.
5. **Autenticacion, Registro de Cocinas y Marco Legal (`LoginModal` + `Modals`):**
   - Inicio de sesion, registro de comensales, verificacion por codigo de 6 digitos y perfil de usuario.
   - Modal para afiliacion de cocinas y productores (`#join-modal`).
   - Modales interactivos de **Terminos y Condiciones** y **Politica de Privacidad**.

## Requisitos previos

Para ejecutar este proyecto en tu computadora necesitas tener instalado:

- **Node.js:** Version 18.0 o superior (recomendado Node 20 LTS o 22).
- **npm:** Version 9.0 o superior (incluido con Node.js).
- **Navegador web moderno:** Google Chrome, Firefox, Safari o Microsoft Edge con soporte para WebGL 2.

## Instalacion y ejecucion rapida

Sigue estos cuatro pasos para tener el proyecto corriendo en menos de 5 minutos:

### 1. Clonar el repositorio

```bash
git clone https://github.com/INGpatito/Foo-tlink.git
cd Foo-tlink
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configuracion basica de entorno

Copia la plantilla de variables de entorno para crear tu archivo local:

```bash
cp .env.example .env
```

### 4. Iniciar en modo desarrollo

```bash
npm run dev
```

Abre tu navegador en la direccion que indique la terminal (por defecto `http://localhost:3001`).

Para generar la version optimizada para produccion, ejecuta:

```bash
npm run build
```

## Documentacion tecnica

Consulta las guias detalladas en la carpeta `docs/` para profundizar en cada subsistema:

- [Arquitectura general](docs/architecture.md): Estructura completa de carpetas, modulos 3D, capas UI, estilos y flujo de datos.
- [Gestion de modelos 3D y despiece](docs/models-3d.md): Carga de modelos GLB, rig de campana (`ClochePlatterRig`), segmentacion multicapa (`LayeredFoodModel`) y modo de inspeccion 360°.
- [Animaciones, scroll y proyeccion orbital](docs/animations.md): Sincronizacion con Lenis, coreografia de camara/campana y proyeccion 3D-a-2D de tarjetas orbitales.
- [Sistema de shaders, iluminacion y GPU](docs/shaders-system.md): Shaders PBR (`MaterialEnhancer`), particulas y rayos volumetricos (`AtmosphericFX`), texturas de corte (`FoodCapTextures`) y perfiles de GPU (`RTX / Standard / Performance`).
- [Guia de secciones y personalizacion](docs/secciones-y-personalizacion.md): Como editar textos de tarjetas, etapas de scroll, tipografias locales, temas de color, iluminacion y modelos.
- [Base de datos y autenticacion](docs/database-auth.md): Conexion a MySQL en Orange Pi 4 Pro, endpoints REST, verificacion con EmailJS y modales de registro/legales.
- [Aplicacion Android](docs/android-app.md): Estructura de la app movil en Kotlin + Jetpack Compose, conexion HTTPS universal y compilacion de APK.
- [Servidor y despliegue](docs/deployment.md): Configuracion en Orange Pi 4 Pro, PM2, servidor standalone y Cloudflare Tunnel (`https://papoys.me`).
