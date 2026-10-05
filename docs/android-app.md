# Aplicacion Movil Android (Foodlink)

Este documento describe la arquitectura de la aplicacion Android ubicada en `/home/pato/footlink/Foodlink`, su integracion con la base de datos de Foodlink y su diseno visual.

## Conexion a la Base de Datos y Acceso Universal

La aplicacion movil se conecta directamente con la API de Foodlink mediante HTTPS:

- **Endpoint base:** `https://papoys.me/api/auth`
- **Operatividad en cualquier red:** Gracias al tunel seguro de Cloudflare, la aplicacion funciona independientemente de si el telefono esta conectado al Wi-Fi de casa, Wi-Fi publico, Wi-Fi escolar o datos moviles (4G/5G). No requiere configuraciones de VPN ni IP locales.
- **Base de datos unificada:** Tanto la aplicacion Android como la pagina web consultan y modifican la misma base de datos MySQL `FOODLINK` alojada en la Orange Pi. Un usuario que crea su cuenta en el telefono puede iniciar sesion en la web y viceversa.

## Estructura del Proyecto Android

- `app/src/main/java/com/example/foodlink/data/model/`:
  - `User.kt`: Modelo de usuario con `id`, `name`, `email` y `isVerified`.
  - `AuthResponse.kt`: Estructura de respuesta de la API con estado y mensajes.
- `app/src/main/java/com/example/foodlink/data/remote/`:
  - `AuthApi.kt`: Cliente de red HTTPS que implementa `login`, `register`, `verify` y `resendCode`.
- `app/src/main/java/com/example/foodlink/data/local/`:
  - `SessionManager.kt`: Almacena la sesion del usuario de forma persistente mediante `SharedPreferences`.
- `app/src/main/java/com/example/foodlink/ui/theme/`:
  - `Color.kt` y `Theme.kt`: Paleta oficial de Foodlink (fondo `#0D0B09`, tarjetas `#211C18`, acentos terracota `#E86A33` y ambar `#F29C38`).
- `app/src/main/java/com/example/foodlink/ui/auth/`:
  - `AuthScreen.kt`: Interfaz completa en Jetpack Compose con pestanas de "INICIAR SESION" y "REGISTRARSE", flujo de verificacion de codigo y pantalla de bienvenida con "Hola, [nombre]".

## Compilacion e Instalacion

Para compilar la aplicacion desde la terminal:

```bash
cd /home/pato/footlink/Foodlink
./gradlew assembleDebug
```

El archivo APK generado se encuentra en:
`app/build/outputs/apk/debug/app-debug.apk`
