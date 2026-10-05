# Guia de Despliegue y Servidor (Orange Pi 4 Pro)

Este documento detalla como esta configurado el entorno de produccion de Foodlink en la placa Orange Pi 4 Pro, el enrutamiento con Nginx, la ejecucion del backend con PM2 y la publicacion global mediante Cloudflare Tunnel.

---

## 1. Descripcion general de la infraestructura

- **Dispositivo:** Orange Pi 4 Pro (`orangepi4pro`).
- **Sistema operativo:** Linux (Ubuntu / Debian ARM64).
- **Dominio publico:** `https://papoys.me`
- **Tunel seguro:** Cloudflare Tunnel (`cloudflared`).
- **Servidor web y proxy:** Nginx 1.22+.
- **Gestor de procesos:** PM2.
- **Base de datos:** MariaDB / MySQL 10.x local en el puerto 3306 (`FOODLINK`).

---

## 2. Servidor Backend en Produccion (PM2)

Para servir las peticiones de registro, inicio de sesion y verificacion fuera del entorno de desarrollo de Vite, se utiliza el servidor independiente en `server/standalone.mjs`.

### Comandos de gestion de PM2

- **Iniciar el servicio:**
  ```bash
  cd /home/orangepi/Food-link/footlink
  pm2 start server/standalone.mjs --name foodlink-api
  pm2 save
  ```
- **Verificar estado:**
  ```bash
  pm2 status
  ```
- **Consultar registros en tiempo real:**
  ```bash
  pm2 logs foodlink-api
  ```
- **Reiniciar el servicio:**
  ```bash
  pm2 reload foodlink-api
  ```

El servicio corre localmente en `http://127.0.0.1:3005` y se comunica de manera directa con la base de datos MySQL local `FOODLINK`.

---

## 3. Configuracion de Nginx

Nginx cumple dos funciones principales:
1. Servir los archivos estaticos optimizados de la web desde la carpeta `dist`.
2. Redirigir todas las llamadas a la API (`/api/`) hacia el proceso de Node.js en el puerto 3005.

Archivo de configuracion en `/etc/nginx/sites-available/papoys`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name papoys.me www.papoys.me;

    root /home/orangepi/Food-link/footlink/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Para aplicar cambios en Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Tunel de Cloudflare (`cloudflared`)

Cloudflare Tunnel expone de forma segura el puerto 80 de la Orange Pi a internet sin necesidad de abrir puertos en el router ni contratar una IP publica fija.

Configuracion en `/home/orangepi/.cloudflared/config.yml`:

```yaml
tunnel: 4ca9b323-1426-49ad-a112-e11dd49935c5
credentials-file: /home/orangepi/.cloudflared/4ca9b323-1426-49ad-a112-e11dd49935c5.json

ingress:
  - hostname: papoys.me
    service: http://localhost:80
  - hostname: "*.papoys.me"
    service: http://localhost:80
  - service: http_status:404
```

El servicio corre como demonio en segundo plano (`systemctl is-active cloudflared`).

---

## 5. Proceso de actualizacion y sincronizacion

Cuando realices modificaciones en el codigo fuente desde tu equipo de desarrollo, compila y sincroniza hacia la Orange Pi siguiendo estos pasos:

1. **Compilar la version de produccion en tu maquina local:**
   ```bash
   npm run build
   ```

2. **Sincronizar mediante rsync:**
   ```bash
   rsync -avz --exclude 'node_modules' --exclude '.git' -e "sshpass -p orangepi ssh -o StrictHostKeyChecking=no" /home/pato/footlink/ orangepi@orangepi4pro:/home/orangepi/Food-link/footlink/
   ```

3. **Reiniciar el servicio en la Orange Pi si hubo cambios en el backend:**
   ```bash
   sshpass -p orangepi ssh orangepi@orangepi4pro "pm2 reload foodlink-api"
   ```
