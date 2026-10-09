# Guia de Secciones, Archivos y Personalizacion

Este documento indica con precision la ubicacion de cada seccion de la pagina web y como modificar textos, tamanos de modelos 3D, posiciones, colores de fondo, luces y estilos.

---

## 1. Mapa General de la Estructura

La aplicacion utiliza una arquitectura modular. El archivo principal `index.html` define los contenedores estructurales con identificadores (`id`), y cada seccion se construye y renderiza desde un archivo TypeScript dedicado dentro de `src/sections/` y `src/ui/`.

| Seccion en Pagina | Contenedor en `index.html` | Archivo Fuente para Textos y HTML | Modelo 3D Asociado |
| :--- | :--- | :--- | :--- |
| **Barra de Navegacion** | `<div id="navbar-root">` | `src/ui/Navbar.ts` | Ninguno |
| **Inicio (Hero)** | `<section id="hero-root">` | `src/sections/HeroSection.ts` | Hamburguesa (`burger.glb`) |
| **Origen (Horno/Pizza)** | `<section id="features-root">` | `src/sections/FeaturesSection.ts` | Pizza (`pizza.glb`) |
| **Ensalada (Lo Fresco)** | `<section id="salad-root">` | `src/sections/SaladSection.ts` | Ensalada (`italian_salad.glb`) |
| **Especiales (Pastel)** | `<section id="menu-root">` | `src/sections/MenuSection.ts` | Pastel (`cake.glb`) |
| **Extra (Cupcake/Postre)** | `<section id="extra-root">` | `src/sections/ExtraSection.ts` | Cupcake (`extra_chocolate.glb`) |
| **Pie de Pagina (Footer)** | `<section id="footer-root">` | `src/sections/FooterSection.ts` | Ninguno (salida de modelos) |
| **Modal de Inicio / Registro** | `<div id="login-modal-root">` | `src/ui/LoginModal.ts` | Ninguno |

---

## 2. Como Modificar Textos, Botones y Contenido HTML

Para cambiar textos, titulos, descripciones, etiquetas o precios, abre el archivo correspondiente en `src/sections/`:

### 2.1. Barra de Navegacion (`src/ui/Navbar.ts`)
- **Logo:** Linea 10 (`Foodlink.`).
- **Enlaces de navegacion de escritorio y movil:** Lineas 14-19 y lineas 42-46 (`Inicio`, `Origen`, `Ensalada`, `Especiales`, `Extra`).
- **Boton de sesion:** Lineas 22-24 (`Ingresar` / `Mi Cuenta`).

### 2.2. Seccion Hero / Inicio (`src/sections/HeroSection.ts`)
- **Subtitulo superior:** Linea 9 (`Hamburguesas · pizza · postres`).
- **Titulo principal:** Lineas 11-17 (`Comida Que Entra Por Los Ojos`).
- **Parrafo descriptivo:** Lineas 19-21 (`Hamburguesas, pizza y postres hechos para antojarse...`).
- **Botones de llamada a la accion (CTA):** Lineas 24-29 (`Ver menú`, `Conoce la cocina`).
- **Tarjetas de datos flotantes laterales:** Lineas 34-45 (`The Classic 100% Angus`, `Coccion Carbon & Lena`).

### 2.3. Seccion Origen / Horno (`src/sections/FeaturesSection.ts`) "posiblemente borre esto asi que no le hagan mmucho caso"
- **Texto en marca de agua de fondo:** Linea 9 (`PIZZA`).
- **Capitulo:** Linea 15 (`Capitulo II — El Horno`).
- **Titulo:** Lineas 18-21 (`Masa Madre, Fuego Directo`).
- **Descripcion:** Lineas 23-26 (`Fermentacion lenta de 72 horas...`).
- **Lista de productos y precios:** Lineas 28-41 (`Margarita Clasica $12.00`, `Doble Pepperoni $14.50`, etc.).

### 2.4. Seccion Ensalada (`src/sections/SaladSection.ts`)
- **Capitulo:** Linea 10 (`Capitulo III — Lo Fresco`).
- **Titulo:** Lineas 13-16 (`Ensalada italiana`).
- **Descripcion:** Lineas 18-20 (`Hojas crujientes, aderezo artesanal...`).
- **Lista de productos y precios:** Lineas 22-31 (`Fresca Romana $8.00`, `Caprese Especial $10.50`).
- **Texto de fondo:** Linea 37 (`SALAD`).

### 2.5. Seccion Especiales / Pastel (`src/sections/MenuSection.ts`)
- **Etiqueta superior:** Lineas 7-9 (`Edicion de aniversario`).
- **Titulo:** Lineas 11-14 (`Cake Festejo`).
- **Descripcion:** Lineas 16-18 (`Un pastel especial lleno de sabor...`).
- **Insignias de ingredientes:** Lineas 20-23 (`Frutos rojos`, `Crema batida`).
- **Boton de pedido interactivo:** Lineas 26-28 (`Anadir al pedido · $25.00`).

### 2.6. Seccion Extra / Postres (`src/sections/ExtraSection.ts`)
- **Texto de fondo:** Lineas 8-11 (`CUP CAKE`).
- **Etiqueta:** Lineas 15-17 (`Postre Especial`).
- **Titulo:** Lineas 19-22 (`Extra Chocolate`).
- **Descripcion:** Lineas 24-26 (`Magia pura en forma de cupcake...`).
- **Boton de pedido interactivo:** Lineas 34-36 (`Anadir al pedido · $6.50`).

### 2.7. Pie de Pagina / Footer (`src/sections/FooterSection.ts`)
- **Subtitulo:** Linea 6 (`Un buen cierre`).
- **Titulo:** Lineas 7-9 (`Listo para probar?`).
- **Boton final:** Lineas 10-12 (`Explora el menu`).
- **Marca de agua final:** Linea 15 (`BUEN PROVECHO`).

### 2.8. Modal de Autenticacion (`src/ui/LoginModal.ts`)
- Formularios de inicio de sesion, registro, campos de texto, mensajes de validacion y enlaces de terminos legales.

---

## 3. Como Modificar los Modelos 3D (Tamano, Posicion y Rotacion)

Todos los parametros de escala, traslacion y rotacion de los modelos se configuran de manera centralizada en:

**Archivo:** `src/utils/constants.ts`

### 3.1. Configuracion de Escala y Posicion (`MODEL_CONFIGS`)
Dentro del objeto `MODEL_CONFIGS` (lineas 20-46 de `src/utils/constants.ts`):

```typescript
export const MODEL_CONFIGS = {
  hero: {
    scale: 1.0,                                    // Tamano general del modelo (ejemplo: 1.2 para agrandar)
    position: { x: 1.4, y: -0.12, z: 0 },          // x: horizontal (+ derecha, - izquierda), y: altura, z: profundidad
    rotation: { x: 0.2, y: -0.3, z: 0 }            // Orientacion inicial en radianes
  },
  features: {
    scale: 1.0,                                    // Tamano de la Pizza
    position: { x: -1.3, y: -0.12, z: 0 },
    rotation: { x: Math.PI / 2 - 0.35, y: 0.3, z: 0 }
  },
  salad: {
    scale: 1.25,                                   // Tamano de la Ensalada
    position: { x: 1.3, y: -0.18, z: 0 },
    rotation: { x: 0.45, y: -0.3, z: 0 }
  },
  menu: {
    scale: 0.95,                                   // Tamano del Pastel
    position: { x: 1.35, y: -0.2, z: 0 },
    rotation: { x: 0.25, y: -0.4, z: 0 }
  },
  extra: {
    scale: 0.60,                                   // Tamano del Cupcake
    position: { x: -1.3, y: -0.18, z: 0 },
    rotation: { x: 0.2, y: 0.3, z: 0 }
  },
};
```
### 3.1.1 agragar un efecto de carga 

### 3.2. Ajuste para Pantallas de Celulares (Movil)
En dispositivos moviles (pantallas verticales), el archivo `src/three/SceneManager.ts` (lineas 200-215) aplica compensaciones automaticas para que el modelo no tape el texto:
- `mobileYMap`: Ajusta la altura `y` en celular para cada platillo.
- `viewportScale`: Escala proporcionalmente el tamano del platillo en pantallas pequenas.

### 3.3. Direccion de Entrada y Salida al Desplazar la Pagina
En `src/utils/constants.ts` (`MODEL_TRANSITIONS`, lineas 51-57):
- `-1`: El modelo entra y sale por el lado izquierdo.
- `1`: El modelo entra y sale por el lado derecho.

### 3.4. Reemplazar o Agregar un Archivo 3D
- Coloca el archivo `.glb` dentro de la carpeta `public/models/`.
- Asocia la ruta en `MODEL_PATHS` de `src/utils/constants.ts` (lineas 12-18).

---

## 4. Como Modificar Colores y Temas Visuales

El diseno visual cuenta con tres capas de color faciles de editar:

### 4.1. Colores de Fondo de Cada Seccion
Para cambiar el color de fondo general cuando el usuario navega a cada platillo:

**Archivo:** `src/styles/global.css` (lineas 62-90)

```css
body[data-section="hero"] {
  background-color: #F8EDE0;   /* Crema calido (Inicio) */
  color: var(--charcoal);
}

body[data-section="features"] {
  background-color: #12100E;   /* Carbon profundo (Horno/Pizza) */
  color: var(--c1);
}

body[data-section="salad"] {
  background-color: #EAF5E3;   /* Verde claro fresco (Ensalada) */
  color: var(--charcoal);
}

body[data-section="menu"] {
  background-color: #1D0F28;   /* Ciruela / Púrpura (Pastel) */
  color: #ffffff;
}

body[data-section="extra"] {
  background-color: #140B07;   /* Chocolate tostado (Cupcake) */
  color: var(--c1);
}

body[data-section="footer"] {
  background-color: #12100E;   /* Carbon (Pie de pagina) */
  color: var(--c1);
}
```

### 4.2. Paleta Global de la Marca (Tailwind y Variables CSS)
**Archivo:** `src/styles/global.css` (lineas 3-33)
- `--color-brand-1` (`--c1`): `#FBE5C8` (Crema claro)
- `--color-brand-2` (`--c2`): `#F2A65A` (Ambar dorado)
- `--color-brand-3` (`--c3`): `#E86A33` (Naranja fuego)
- `--color-brand-4` (`--c4`): `#C7452A` (Terracota intenso)
- `--color-brand-5` (`--c5`): `#5B8A2B` (Verde albahaca fresca)
- `--color-charcoal`: `#181512` (Carbon oscuro)
- `--color-violet`: `#6B4EFF` (Violeta vibrante)
- `--color-plum`: `#26192F` (Ciruela profundo)

### 4.3. Halos Ambientales Suaves Detras del Platillo
El resplandor circular difuminado que acompana a cada modelo se configura en:

**Archivo:** `src/utils/constants.ts` (`SECTION_THEMES`, lineas 59-126)
- `--ambient-model`: Color e intensidad del resplandor principal (ejemplo: `rgba(235, 110, 35, 0.65)`).
- `--ambient-primary`: Halo secundario decorativo.
- `--model-glow-x` y `--model-glow-y`: Posicion en pantalla del resplandor (72% a la derecha para Inicio/Ensalada/Pastel, 28% a la izquierda para Pizza/Cupcake).

---

## 5. Como Modificar los Shaders y Apariencia de los Alimentos

Para ajustar como la luz interactua con los modelos 3D (evitando el brillo plastico):

**Archivo:** `src/three/shaders/MaterialEnhancerShader.ts` (`FOOD_SHADER_CONFIGS`, lineas 13-54)

Parametros configurables por platillo:
- `sssColor`: Tono del halo de calidez interna en la penumbra (ejemplo: `#ff9944` ambar para pan/queso, `#88dd33` para lechuga).
- `sssIntensity`: Que tanta calidez y jugosidad se transfiere en las sombras (rango recomendado: `0.4` a `0.7`).
- `rimColor`: Color del resplandor suave en la silueta externa (ejemplo: `#ffcc77`).
- `rimPower`: Concentracion del halo en el borde (valores mas altos hacen el halo mas fino).
- `rimIntensity`: Brillo del contorno perimetral.
- `moisture`: Nivel de brillo de humedad o grasa natural del alimento.

Para particulas de especias flotantes (sesamo, oregano, azucar glass):
**Archivo:** `src/three/shaders/CulinaryParticlesShader.ts` (`PARTICLE_THEMES`, lineas 64-71).

---

## 6. Como Modificar la Iluminacion de Estudio 3D

Para ajustar la direccion, intensidad o color de las luces que iluminan los modelos:

**Archivo:** `src/three/LightingSetup.ts` (lineas 39-90)
- `this.dirLightMain.intensity`: Intensidad de la luz principal cenital.
- `this.dirLightMain.color`: Tono de la luz principal (ejemplo: `#fff5e6` para luz calida).
- `this.dirLightMain.position.set(x, y, z)`: Angulo desde el que incide la luz.
- `this.dirLightFill`: Luz de relleno que suaviza las sombras en el lado opuesto.
- `this.ambientLight`: Nivel de luz base general.

---

## 7. Como Probar los Cambios en Tu Computadora

1. Iniciar servidor de desarrollo en tiempo real:
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3001` en tu navegador. Los cambios que guardes en los archivos se reflejaran de inmediato gracias a Vite Hot Module Replacement (HMR).

2. Validar que la compilacion de produccion no tenga errores:
   ```bash
   npm run build
   ```
