# Animaciones y Desplazamiento

Foodlink combina dos herramientas principales para crear una experiencia de navegacion suave:

## Herramientas principales

1. **Lenis:** Controla la inercia del scroll para que el movimiento sea fluido en cualquier navegador o rueda de raton.
2. **GSAP & ScrollTrigger:** Supervisa la posicion del scroll para activar el modelo 3D correspondiente y transformar gradualmente los colores de fondo e iluminacion.

## Logica de activacion

- Cada seccion se activa cuando su parte central cruza el 50% de la ventana del navegador.
- Los fondos cambian mediante transiciones de color continuas entre secciones contiguas.
- Los clics en la barra de navegacion inician inmediatamente el cambio visual mientras la pagina se desliza hacia la seccion elegida.
