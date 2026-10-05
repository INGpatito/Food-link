# Foodlink

Una experiencia web interactiva para restaurantes que presenta cada platillo del menu mediante modelos 3D y transiciones de color en tiempo real segun te desplazas por la pagina. Resuelve la presentacion estatica tradicional permitiendo que los comensales aprecien los productos desde cualquier angulo antes de ordenar.

## Stack tecnologico asi bien futurista 

- **Lenguaje principal:** TypeScript y JavaScript moderno (ES Modules).
- **Entorno y empaquetador:** Vite con recarga rapida en desarrollo.
- **Renderizado 3D:** Three.js con soporte de modelos en formato GLB y luces dinamicas.
- **Animaciones y scroll:** GSAP (ScrollTrigger) y Lenis para desplazamiento suave.
- **Diseno e interfaz:** HTML5 semantico, CSS moderno y Tailwind CSS v4.
- **Base de datos:** MariaDB / MySQL en Orange Pi 4 Pro (`FOODLINK`) con cifrado **bcrypt** y soporte para verificacion por correo.
- **Aplicacion movil:** Android nativo en Kotlin y Jetpack Compose (en la carpeta `Foodlink`).

## Requisitos previos

Para ejecutar este proyecto en tu computadora necesitas tener instalado:

- **Node.js:** Version 18.0 o superior (recomendado Node 20 LTS o 22).
- **npm:** Version 9.0 o superior (viene incluido con Node.js).
- **Navegador web moderno:** Google Chrome, Firefox, Safari o Microsoft Edge con soporte para WebGL.

## Instalacion y ejecucion rapida

Sigue estos cuatro pasos para tener el proyecto corriendo en menos de 5 minutos:

### 1. Clonar el repositorio

Abre tu terminal y clona el proyecto en tu carpeta de preferencia:

```bash
git clone https://github.com/INGpatito/Foo-tlink.git
cd Foo-tlink
```

### 2. Instalar dependencias

Descarga las librerias necesarias para el proyecto:

```bash
npm install
```

### 3. Configuracion basica de entorno

Copia la plantilla de variables de entorno para crear tu archivo local:

```bash
cp .env.example .env
```

### 4. Iniciar en modo desarrollo

Inicia el servidor local de desarrollo:

```bash
npm run dev
```

Una vez ejecutado el comando, abre tu navegador en la direccion que indique la terminal (usualmente `http://localhost:3000` o `http://localhost:3001`).

Para generar la version lista para publicacion en produccion, ejecuta:

```bash
npm run build
```

## Documentacion tecnica

Si deseas profundizar en el funcionamiento interno de cada modulo, consulta las guias detalladas en la carpeta de documentacion:

- [Arquitectura general](docs/architecture.md): Explicacion de la estructura del codigo fuente, modulos y carpetas.
- [Gestion de modelos 3D](docs/models-3d.md): Como se cargan, calibran y reemplazan los modelos tridimensionales.
- [Animaciones y scroll](docs/animations.md): Detalle de la sincronizacion entre el desplazamiento suave de Lenis y los triggers de GSAP.
- [Base de datos y autenticacion](docs/database-auth.md): Conexion a MySQL en Orange Pi, endpoints de registro/login y flujo de verificacion con EmailJS.
- [Aplicacion Android](docs/android-app.md): Estructura de la app en Jetpack Compose, conexion universal y compilacion.
- [Servidor y despliegue](docs/deployment.md): Configuracion de Orange Pi 4 Pro, PM2, Nginx y Cloudflare Tunnel.
