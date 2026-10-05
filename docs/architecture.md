# Arquitectura del Proyecto Foodlink

Este documento describe la organizacion general del ecosistema Foodlink, abarcando la plataforma web interactiva 3D, el backend de autenticacion y la aplicacion movil nativa para Android.

---

## 1. Vision general del sistema

El ecosistema Foodlink se compone de tres piezas integradas:

1. **Cliente Web 3D:** Aplicacion web interactiva desarrollada con Vite, TypeScript, Three.js y Tailwind CSS. Permite visualizar y rotar los platillos en 3D mientras el usuario explora el menu.
2. **Servidor Backend y Base de Datos:** Capa de servicios REST montada sobre Node.js con `mysql2/promise` y `bcryptjs`. Se conecta a la base de datos MariaDB/MySQL en la placa Orange Pi 4 Pro y despacha correos mediante EmailJS.
3. **Aplicacion Movil Android:** Aplicacion nativa desarrollada en Kotlin con Jetpack Compose en `/home/pato/footlink/Foodlink`. Permite registrarse e iniciar sesion desde cualquier red celular o Wi-Fi, compartiendo la misma cuenta y base de datos que la web.

---

## 2. Estructura de directorios

### Frontend Web y Backend (`/home/pato/footlink`)

- **public/models/**: Modelos tridimensionales optimizados en formato GLB (hamburguesa, pizza, ensalada, pastel y cupcake).
- **src/main.ts**: Punto de entrada de la web. Inicializa los modulos visuales, la escena de Three.js y el controlador de scroll.
- **src/three/**: Motor de renderizado 3D con Three.js.
  - `SceneManager.ts`: Gestiona la escena, camara, precarga de modelos y transiciones de posicion/rotacion.
  - `ModelLoader.ts`: Carga los archivos GLB y normaliza su escala.
  - `LightingSetup.ts`: Configura luces direccionales y ambientales segun cada seccion.
  - `CameraController.ts`: Ajusta la perspectiva de la camara durante la navegacion.
- **src/animations/**:
  - `ScrollAnimations.ts`: Sincroniza el desplazamiento suave de Lenis con los triggers de GSAP ScrollTrigger para transiciones continuas de color de fondo y aparicion de modelos.
- **src/sections/**: Componentes de interfaz de cada seccion:
  - `HeroSection.ts`: Seccion principal (hamburguesa).
  - `FeaturesSection.ts`: Seccion de origen (pizza).
  - `SaladSection.ts`: Seccion de frescura (ensalada italiana).
  - `MenuSection.ts`: Seccion de especiales (pastel cake).
  - `ExtraSection.ts`: Seccion de postres (cupcake de chocolate).
  - `FooterSection.ts`: Pie de pagina con enlaces de contacto.
- **src/ui/**: Elementos flotantes de interfaz de usuario:
  - `Navbar.ts`: Barra de navegacion adaptativa con actualizacion dinamica del perfil ("Ingresar" vs "Mi Cuenta").
  - `LoginModal.ts`: Ventana modal para inicio de sesion, registro, verificacion de codigo y perfil de comensal.
- **src/services/**:
  - `emailService.ts`: Despacho de correos de confirmacion mediante la API de EmailJS.
- **src/utils/**:
  - `auth.ts`: Manejo de sesion local del comensal (`localStorage`) y notificacion de eventos de cambio de estado.
  - `constants.ts`: Constantes de paleta de colores, rutas de modelos 3D y configuracion de camaras.
  - `helpers.ts`: Funciones auxiliares para interpolacion y formateo.
- **server/**:
  - `db.ts`: Pool de conexiones y consultas preparadas a MySQL en Orange Pi.
  - `authPlugin.ts`: Middleware de autenticacion para el servidor de desarrollo de Vite.
  - `standalone.mjs`: Servidor HTTP nativo en Node.js para ejecucion en produccion con PM2.

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

## 3. Flujo de datos y autenticacion

1. El usuario introduce sus datos en la web o en la app Android.
2. La solicitud viaja por HTTPS hacia `https://papoys.me/api/auth/` (enrutado a traves del tunel de Cloudflare hacia la Orange Pi).
3. El backend verifica o inserta el registro en la tabla `users` de la base de datos `FOODLINK`.
4. Las contraseñas se almacenan cifradas con `bcryptjs` (cost factor 10).
5. Se genera un codigo numerico de 6 digitos y EmailJS envia la plantilla de verificacion al correo del usuario.
6. El usuario confirma el codigo y su cuenta queda activada (`is_verified = 1`), permitiendo el acceso en cualquier dispositivo.
