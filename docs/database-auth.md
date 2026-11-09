# Base de Datos, Autenticacion y Modales de Plataforma

Este documento describe la arquitectura del sistema de acceso unificado de Foodlink, la conexion con la base de datos MySQL en la Orange Pi 4 Pro, los endpoints de la API REST, el servicio de confirmacion de cuentas mediante EmailJS y los modales interactivos de la plataforma.

---

## 1. Servidor de Base de Datos (Orange Pi 4 Pro)

La base de datos se ejecuta en el servidor de la Orange Pi 4 Pro (`orangepi4pro`).

- **Motor:** MariaDB / MySQL 10.x.
- **Base de datos:** `FOODLINK`.
- **Usuario:** `root`.
- **Puerto:** `3306`.
- **Acceso:** Habilitado localmente y accesible a traves de la red interna / Tailscale.

### Esquema de la tabla `users`

La tabla almacena los datos de los usuarios registrados tanto desde la web como desde la aplicacion movil:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. Endpoints de la API REST

Los endpoints estan disponibles tanto en el entorno de desarrollo local ([`server/authPlugin.ts`](file:///home/pato/footlink/server/authPlugin.ts)) como en el servidor de produccion ([`server/standalone.mjs`](file:///home/pato/footlink/server/standalone.mjs)) en `https://papoys.me/api/auth/`:

### Registro de usuario
- **Ruta:** `POST /api/auth/register`
- **Body JSON:** `{ "name": "...", "email": "...", "password": "..." }`
- **Comportamiento:** Valida datos, comprueba que el correo no este registrado, cifra la contrasena con `bcryptjs` (salt rounds: 10), genera un codigo numerico aleatorio de 6 digitos y guarda el registro en la base de datos con `is_verified = 0`. Retorna los datos basicos del usuario y el codigo de verificacion.

### Inicio de sesion
- **Ruta:** `POST /api/auth/login`
- **Body JSON:** `{ "email": "...", "password": "..." }`
- **Comportamiento:** Busca al usuario por su correo electronico, compara la contrasena usando `bcrypt.compare` y, si es correcta, devuelve la informacion de sesion del comensal.

### Verificacion de codigo
- **Ruta:** `POST /api/auth/verify`
- **Body JSON:** `{ "email": "...", "code": "..." }`
- **Comportamiento:** Valida que el codigo de 6 digitos coincida con el `verification_token` almacenado. Si es valido, actualiza `is_verified = 1`, limpia el token y confirma la activacion de la cuenta.

### Reenvio de codigo
- **Ruta:** `POST /api/auth/resend-code`
- **Body JSON:** `{ "email": "..." }`
- **Comportamiento:** Genera un nuevo codigo numerico de 6 digitos, actualiza el registro en la base de datos y despacha el correo nuevamente.

### Consulta de estado de cuenta
- **Ruta:** `GET /api/auth/me?email=...`
- **Comportamiento:** Consulta el estado actual de verificacion y datos del usuario.

---

## 3. Servicio de Correo (EmailJS)

El envio de correos de confirmacion se gestiona en [`src/services/emailService.ts`](file:///home/pato/footlink/src/services/emailService.ts) utilizando la libreria `@emailjs/browser`:

- **Plantilla HTML personalizada:** Ubicada en [`docs/email-template.html`](file:///home/pato/footlink/docs/email-template.html). Presenta un diseno oscuro calido acorde a la identidad de Foodlink, con tarjeta de codigo monoespaciado de facil lectura.
- **Variables de entorno requeridas:**
  - `VITE_EMAILJS_SERVICE_ID`: Identificador del servicio de correo conectado.
  - `VITE_EMAILJS_TEMPLATE_ID`: Identificador de la plantilla en el panel de EmailJS.
  - `VITE_EMAILJS_PUBLIC_KEY`: Clave publica de la cuenta de EmailJS.
- **Privacidad del codigo:** El codigo generado de 6 digitos no se expone en la pantalla de la interfaz y viaja unicamente a la direccion de correo del usuario.

---

## 4. Modales de Interfaz Web (`LoginModal.ts` y `Modals.ts`)

1. **Modal de Autenticacion de Comensales ([`src/ui/LoginModal.ts`](file:///home/pato/footlink/src/ui/LoginModal.ts)):**
   - Permite alternar entre **Iniciar Sesion**, **Crear Cuenta**, **Verificacion de Codigo de 6 Digitos** y vista de **Mi Cuenta** (cuando el usuario tiene sesion activa).
   - Incluye ventanas modales dedicadas para consultar los **Terminos y Condiciones** y la **Politica de Privacidad** sin abandonar el flujo de registro.
2. **Modal de Registro de Cocinas y Productores ([`src/ui/Modals.ts`](file:///home/pato/footlink/src/ui/Modals.ts)):**
   - Accesible desde la barra de navegacion (`Registrar Cocina`) y desde el cierre del recorrido narrativo.
   - Permite a cocinas de autor, restaurantes y productores artesanales postularse a la red gastronomica indicando nombre del proyecto, especialidad culinaria, ubicacion y correo de contacto.

---

## 5. Integracion Unificada: Web y Android

1. **Credenciales compartidas:** Un usuario que se registre en la pagina web (`https://papoys.me`) puede iniciar sesion inmediatamente en la aplicacion movil Android, y viceversa.
2. **Acceso universal:** La aplicacion Android consume `https://papoys.me/api/auth/`, garantizando funcionamiento sin importar a que red Wi-Fi o red celular este conectado el dispositivo.
3. **Persistencia local:**
   - En la web, la sesion se guarda en `localStorage` bajo la clave `foodlink_user` mediante [`src/utils/auth.ts`](file:///home/pato/footlink/src/utils/auth.ts).
   - En Android, la sesion se persiste mediante `SharedPreferences` en `SessionManager.kt`.
