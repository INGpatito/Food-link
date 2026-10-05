# Gestion de Modelos 3D

Foodlink utiliza modelos tridimensionales para presentar cada platillo de forma interactiva mientras el usuario navega.

## Modelos utilizados

1. **Hamburguesa (burger.glb):** Modelo representativo de la seccion de inicio (Hero).
2. **Pizza (pizza.glb):** Seccion de origen y coccion en horno de piedra.
3. **Ensalada (italian_salad.glb):** Seccion de frescura e ingredientes naturales.
4. **Pastel (cake.glb):** Seccion de celebracion y especiales.
5. **Cupcake (extra_chocolate.glb):** Seccion de postres y extra chocolate.

## Como agregar o modificar modelos

- Ubica los archivos optimizados dentro de `public/models/`.
- Configura las rutas, escalas y rotaciones iniciales en `src/utils/constants.ts` dentro de `MODEL_CONFIGS`.
- Define la direccion de entrada y salida en `MODEL_TRANSITIONS` para que concuerde con el lado donde se ubica el texto de la seccion.
