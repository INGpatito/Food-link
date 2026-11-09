# Guia de Secciones, Archivos y Personalizacion

Este documento indica con precision la ubicacion de cada componente de la pagina web actual y como modificar textos, tarjetas orbitales, modelos 3D, tipografias locales, colores de fondo, iluminacion y estilos.

---

## 1. Mapa General de la Estructura Actual

El archivo principal [`index.html`](file:///home/pato/footlink/index.html) define los contenedores estructurales y [`src/main.ts`](file:///home/pato/footlink/src/main.ts) monta cada modulo de interfaz y el motor 3D:

| Componente en Pagina | Contenedor en `index.html` | Archivo Fuente Principal | Funcion / Modelo 3D Asociado |
| :--- | :--- | :--- | :--- |
| **Escena 3D WebGL** | `<div id="webgl-container">` | [`src/three/SceneManager.ts`](file:///home/pato/footlink/src/three/SceneManager.ts) | Pedestal `ClochePlatterRig` + 4 etapas de platillos |
| **Barra de Navegacion** | `<header id="navbar-root">` | [`src/ui/Navbar.ts`](file:///home/pato/footlink/src/ui/Navbar.ts) | Navegacion por etapas, "Registrar Cocina" e "Iniciar Sesion" |
| **Tarjetas Orbitales HUD** | `<div id="orbital-morph-layer">` | [`src/ui/OrbitalMorphLayer.ts`](file:///home/pato/footlink/src/ui/OrbitalMorphLayer.ts) | 4 tarjetas de cuadrante + lineas SVG conectadas al anillo 3D |
| **Etapas de Scroll (0 a 3)** | `<main id="scroll-root">` | [`src/ui/ScrollStory.ts`](file:///home/pato/footlink/src/ui/ScrollStory.ts) | Etapas: `burger.glb`, `pizza.glb`, `italian_salad.glb`, `cake.glb` |
| **Panel Studio HUD y 360°** | `<div id="hud-root">` | [`src/ui/StudioHUD.ts`](file:///home/pato/footlink/src/ui/StudioHUD.ts) | Telemetria, selector GPU/Luz y Modo 3D Libre (360° + slider) |
| **Modal Registro de Cocinas** | `<div id="modals-root">` | [`src/ui/Modals.ts`](file:///home/pato/footlink/src/ui/Modals.ts) | Formulario para afiliar restaurantes y productores (`#join-modal`) |
| **Modal Login y Legales** | `<div id="login-modal-root">` | [`src/ui/LoginModal.ts`](file:///home/pato/footlink/src/ui/LoginModal.ts) | Login, registro, verificacion 6 digitos, Terminos y Privacidad |
| **Seccion Anatomia (Modular)** | `#anatomy-root` (opcional) | [`src/sections/AnatomySection.ts`](file:///home/pato/footlink/src/sections/AnatomySection.ts) | Vista dedicada de despiece de capas e ingredientes |

---

## 2. Como Modificar Textos, Tarjetas y Contenido HTML

### 2.1. Tarjetas Orbitales de cada Platillo (`src/ui/OrbitalMorphLayer.ts`)
Las 4 tarjetas flotantes que rodean al pedestal cambian dinamicamente su contenido segun la etapa activa. Para editar sus etiquetas, titulos, descripciones o metricas, modifica el arreglo `DISH_CARD_DATA` en [`src/ui/OrbitalMorphLayer.ts`](file:///home/pato/footlink/src/ui/OrbitalMorphLayer.ts):
- **Indice `0`:** Tarjetas de la **Hamburguesa de Autor** (`Origen Verificado`, `Ficha Tecnica`, `Coccion Directa`, `Productor Local`).
- **Indice `1`:** Tarjetas de la **Pizza Artesanal** (`Fermentacion Lenta`, `Horno de Piedra`, `Ingredientes DOP`, `Maestro Pizzero`).
- **Indice `2`:** Tarjetas de la **Ensalada Italiana** (`Cosecha del Dia`, `Perfil Nutricional`, `Aderezo en Frio`, `Huerta Asociada`).
- **Indice `3`:** Tarjetas del **Postre & Pastel** (`Reposteria de Autor`, `Balance Dulce`, `Textura & Capas`, `Obrador Artesanal`).

### 2.2. Titulos y Narrativa de las 4 Etapas (`src/ui/ScrollStory.ts`)
Para cambiar los encabezados de cada etapa durante el scroll o el bloque de cierre ("Red Gastronomica Directa"):
- Abre [`src/ui/ScrollStory.ts`](file:///home/pato/footlink/src/ui/ScrollStory.ts).
- Edita las secciones `#stage-1` (Hamburguesa), `#stage-2` (Pizza), `#stage-3` (Ensalada), `#stage-4` (Postre & Pastel) y el bloque final `.scroll-finale-card`.

### 2.3. Barra de Navegacion (`src/ui/Navbar.ts`)
- En [`src/ui/Navbar.ts`](file:///home/pato/footlink/src/ui/Navbar.ts) puedes modificar el nombre de la marca (`Foodlink`), los nombres de las etapas (`Hamburguesa`, `Pizza`, `Ensalada`, `Postre`) y los textos de los botones de accion (`Registrar Cocina`, `Iniciar Sesion` / `Mi Cuenta`).

### 2.4. Controles del Studio HUD y Modo 3D Libre (`src/ui/StudioHUD.ts`)
- En [`src/ui/StudioHUD.ts`](file:///home/pato/footlink/src/ui/StudioHUD.ts) se configuran los botones de modos de iluminacion (`Terracotta`, `Emerald`, `Studio`), los niveles de GPU (`Performance`, `Standard`, `Raytracing RTX`) y la barra de herramientas del **Modo 3D Libre (360°)**.

### 2.5. Modales de Registro de Cocinas, Login y Textos Legales
- **Registro de Cocinas:** Edita [`src/ui/Modals.ts`](file:///home/pato/footlink/src/ui/Modals.ts) (`#join-modal`).
- **Autenticacion y Textos Legales:** Edita [`src/ui/LoginModal.ts`](file:///home/pato/footlink/src/ui/LoginModal.ts) para personalizar los formularios de acceso y el contenido completo de los modales de **Terminos y Condiciones** y **Politica de Privacidad**.

---

## 3. Como Modificar los Modelos 3D y el Despiece en Capas

### 3.1. Escala, Posicion y Rotacion en el Pedestal (`src/three/FoodDishManager.ts`)
El tamano y orientacion de cada platillo sobre el plato ceramico se configura en `FOOD_STAGES` dentro de [`src/three/FoodDishManager.ts`](file:///home/pato/footlink/src/three/FoodDishManager.ts):

```typescript
export const FOOD_STAGES: FoodStageSpec[] = [
    {
        id: 'burger',
        name: 'Hamburguesa de Autor',
        sectionKey: 'hero',
        stageIndex: 0,
        file: 'burger.glb',
        targetSize: 2.05,   // Tamano normalizado sobre el plato
        rotX: 0.04,
        rotY: -0.35,
        rotZ: 0.0,
        posX: 0.0,
        posY: 0.02,
        posZ: 0.0
    },
    // ... etapas pizza, salad, cake
];
```

### 3.2. Capas del Despiece de la Hamburguesa (`src/three/LayeredFoodModel.ts` y `FoodCapTextures.ts`)
- **Nombres, etiquetas y peso de separacion vertical:** Edita `LAYER_DEFS` en [`src/three/LayeredFoodModel.ts`](file:///home/pato/footlink/src/three/LayeredFoodModel.ts).
- **Alturas de corte geometrico:** Ajusta `CUT_FRACTIONS = [0.22, 0.42, 0.51, 0.62, 0.73]` en [`src/three/LayeredFoodModel.ts`](file:///home/pato/footlink/src/three/LayeredFoodModel.ts).
- **Texturas internas de cada ingrediente:** Ajusta las funciones `createBriocheTexture`, `createPattyTexture`, `createCheeseTexture`, `createTomatoTexture` y `createLettuceTexture` en [`src/three/FoodCapTextures.ts`](file:///home/pato/footlink/src/three/FoodCapTextures.ts).

---

## 4. Tipografias Locales Autoalojadas (`src/styles/fonts.css`)

Todas las tipografias del proyecto estan descargadas localmente en `public/fonts/` en formato `.woff2` y declaradas en [`src/styles/fonts.css`](file:///home/pato/footlink/src/styles/fonts.css), eliminando peticiones externas a Google Fonts:

- `--font-display`: `'Cormorant Garamond'` (Titulares editoriales serif).
- `--font-sans`: `'Plus Jakarta Sans'` (Cuerpo de texto e interfaz limpia).
- `--font-mono`: `'JetBrains Mono'` (Telemetria HUD, coordenadas y codigos).
- Tipografias complementarias incluidas: `'Fraunces'`, `'Syne'` y `'Space Mono'`.

---

## 5. Como Modificar Colores, Atmosfera e Iluminacion 3D

### 5.1. Temas Cromaticos y Luces por Etapa (`src/three/StudioLighting.ts`)
En [`src/three/StudioLighting.ts`](file:///home/pato/footlink/src/three/StudioLighting.ts):
- `SECTION_THEMES`: Define los colores RGB de fondo (`bg`) y halos ambientales (`ambientModel`, `ambientPrimary`, `ambientSecondary`) para cada una de las 4 etapas.
- `LIGHT_PRESETS`: Define la intensidad, color hexadecimal y posicion `(x, y, z)` de las luces `key`, `fill`, `rim`, `spot` y `core` para cada platillo.

### 5.2. Hojas de Estilo Modulares (`src/styles/`)
- [`src/styles/global.css`](file:///home/pato/footlink/src/styles/global.css): Variables globales e importacion de modulos.
- [`src/styles/atmosphere.css`](file:///home/pato/footlink/src/styles/atmosphere.css): Gradientes atmosfericos de fondo y viñeta.
- [`src/styles/navbar.css`](file:///home/pato/footlink/src/styles/navbar.css): Barra de navegacion superior.
- [`src/styles/morph-cards.css`](file:///home/pato/footlink/src/styles/morph-cards.css): Tarjetas orbitales HUD, bordes translucidos y lineas SVG.
- [`src/styles/hud.css`](file:///home/pato/footlink/src/styles/hud.css): Panel Studio HUD inferior, selector de GPU/luz y controles de inspeccion 360°.
- [`src/styles/auth.css`](file:///home/pato/footlink/src/styles/auth.css): Ventanas modales de login, verificacion y documentos legales.

---

## 6. Como Probar y Compilar Tus Cambios

1. **Modo desarrollo con recarga en vivo (HMR):**
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3001` en tu navegador.
2. **Compilacion de produccion y verificacion TypeScript:**
   ```bash
   npm run build
   ```
