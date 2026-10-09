# Sistema de Shaders y Renderizado Visual

Este documento detalla la arquitectura de shaders personalizados implementada en Foodlink para dotar a los modelos 3D y al entorno de una estetica organica, apetitosa y de alta fidelidad, eliminando el aspecto plano o plastico de los materiales basicos.

---

## 1. Arquitectura General del Sistema

El pipeline visual opera sobre el canvas WebGL transparente integrado con la interfaz HTML:

1. **Material Enhancer Shader (Nivel de Geometria/Material):** Inyeccion directa en los materiales PBR de cada platillo (`MeshStandardMaterial` y `MeshPhysicalMaterial`) mediante `onBeforeCompile`, calculando Subsurface Scattering (SSS) en la penumbra, resplandor Fresnel aterciopelado en la silueta y control de micro-rugosidad.
2. **Culinary Particles Shader (Nivel de Ambiente Volumetrico):** Sistema de particulas con calculo en GPU de corrientes de conveccion helicoidal, dispersion de especias flotantes (sesamo tostado, hierbas, azucar glass), atenuacion de tamano en perspectiva y respuesta elastica al cursor.
3. **Iluminacion Calida de Estudio (Lighting Setup):** Esquema de iluminacion calibrado con luz principal cenital a 45 grados, luz de relleno calida y luz ambiental balanceada para acentuar el volumen tridimensional.
4. **Integracion Transparente:** El renderizador WebGL opera con canal alfa completo y mapeo tonal ACES Filmic (`ACESFilmicToneMapping`), garantizando que la tipografia, los gradientes editoriales CSS del fondo y los controles interactivos se mantengan nitidos y legibles.

---

## 2. Material Enhancer Shader

Archivo: `src/three/shaders/MaterialEnhancerShader.ts`

### Problema Tecnico Resuelto
Los modelos 3D de alimentos suelen presentar reflejos especulares blancos y concentrados que simulan plastico rigido o juguetes. En la comida real (panecillos horneados, carne sellada, queso fundido, vegetales frescos):
- La luz penetra levemente en las capas externas y se dispersa (dispersion subsuperficial / SSS).
- Las superficies tienen micro-rugosidad porosa en lugar de brillo especular de espejo.
- Los bordes capturan un fino halo de dispersion aterciopelada (Fresnel).

### Implementacion GLSL
El shader inyecta calculos matematicos en los bloques `<common>` y `<dithering_fragment>` del compilador de Three.js:

- **Subsurface Scattering en la Penumbra:**
  Se calcula la zona de transicion donde la luz directa pasa a la sombra (el terminador) y se modula con el color base real de la textura (`gl_FragColor.rgb`), enriqueciendo los ingredientes sin manchar ni desteñir los colores originales:
  ```glsl
  vec3 foodKeyLight = normalize(vec3(0.5, 0.8, 0.6));
  float foodNdotL = dot(geometryNormal, foodKeyLight);
  float foodPenumbra = smoothstep(-0.25, 0.05, foodNdotL) * (1.0 - smoothstep(0.05, 0.40, foodNdotL));
  vec3 foodSssGlow = gl_FragColor.rgb * uSssColor * (foodPenumbra * uSssIntensity * 0.35);
  ```

- **Velvet Fresnel Rim Sheen:**
  Agrega un sutil halo aterciopelado en angulos rasantes respecto a la camara, acentuando el volumen perimetral del platillo:
  ```glsl
  float foodNdotV = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
  float foodFresnel = pow(1.0 - foodNdotV, uRimPower);
  vec3 foodRimGlow = mix(gl_FragColor.rgb, uRimColor, 0.35) * (foodFresnel * uRimIntensity * 0.28);
  ```

- **Control de Micro-Rugosidad:**
  Se ajusta la rugosidad base a valores organicos (`Math.max(material.roughness, 0.62)`) y metalicidad en cero, eliminando reflejos plasticos duros.

- **Lustre Especular Focalizado:**
  Calcula un micro-brillo especular enfocado con un vector medio (Half-Vector), imitando la reflexion de humedad o grasa natural de alimentos recien preparados.

### Calibraciones por Seccion
- **Hero (Hamburguesa):** Tono ambar dorado para corteza tostada y cheddar fundido.
- **Features (Pizza):** Resplandor calido para salsa de tomate horneada y mozzarella.
- **Salad (Ensalada Italiana):** Dispersion verde fresca para hojas y vegetales crujientes.
- **Menu (Pastel de Celebracion):** Halo frambuesa/violeta sutil para glaseados y bayas.
- **Extra (Tacos / Chocolate):** Tono caramelo y cacao para postres.

---

## 3. Culinary Particles Shader

Archivo: `src/three/shaders/CulinaryParticlesShader.ts`

- **Geometria Instanciada:** 180 puntos distribuidos en el volumen que rodea a los platillos.
- **Conveccion Helicoidal:** Las particulas experimentan un movimiento ascendente continuo combinado con un vortice sinusoidal que simula especias finas (sesamo, hojuelas de oregano, azucar glass, chispas doradas) suspendidas en el vapor caliente.
- **Disipacion por Cursor:** Al pasar el raton cerca de una particula, esta sufre una fuerza de repulsion normalizada suave.
- **Atenuacion de Punto (Point Size Attenuation):** La escala varia de forma inversamente proporcional a la distancia Z de la camara, integrando el campo de profundidad visual.

---

## 4. Rendimiento y Compatibilidad

- **60 FPS Estables:** Todos los calculos matematicos complejos se ejecutan en GPU; no hay bucles pesados en CPU durante el bucle de animacion.
- **Carga Prioritaria:** El modelo 3D inicial de la seccion visible se carga inmediatamente; los modelos restantes se predescargan en segundo plano de forma no bloqueante.
- **Preservacion de Accesibilidad y Diseno:** El canvas WebGL se mantiene como capa transparente con `pointer-events: none`, asegurando que la tipografia, botones, formularios de inicio de sesion y fondos editoriales CSS permanezcan perfectamente nitidos e interactivos.
