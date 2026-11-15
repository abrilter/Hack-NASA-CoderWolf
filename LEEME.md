# Rescate en el Polo Sur Lunar — Proyecto base

Juego web en pixel art (Phaser 3) para el reto Junior Astronaut Mission Trainer, NASA Space Apps 2026.

## Cómo correrlo
1. Instalar **VS Code** y la extensión **Live Server**. xd
2. Abrir esta carpeta en VS Code.
3. Clic derecho en `index.html` → **Open with Live Server**.

No usen F5 ni doble clic en el archivo: el navegador bloquea la lectura de los datos.

## Modo prueba (abrir una escena sola)
Agreguen `?escena=NombreEscena` a la dirección. Ejemplos:
- `index.html?escena=Ruta`: abre la Ruta con el estado de prueba (traje ligero, nave pequeña, mochila con oxígeno y escudo).
- `index.html?escena=Ruta&traje=blindado&nave=grande&mochila=oxigeno,linterna&oxigeno=80`: cambia lo que quieran probar.
- `&sinred=1`: no consulta DONKI y arranca al instante.
- Recursos que se pueden cambiar: `oxigeno`, `escudo`, `radiacion`, `energia`, `hielo_kg`, `combustibleRestante`.

Si el nombre de la escena no existe, la consola muestra la lista de escenas válidas.

## Prueba de balance
Abran `pruebas/balance.html` con Live Server. Juega las 360 combinaciones de traje, nave, mochila, escudo y ruta con el modelo real y revisa que ninguna opción gane siempre.
Los números de balance están en `src/config.js` (trajes, naves, pesos de la mochila) y en `datos/datos.json` → `"modelo"`. **Si cambian uno, recarguen esa página y revisen que todo siga en verde.**

## Reglas del estado compartido
- Para cambiar un recurso usen `estado.cambiar("oxigeno", -5)` o `aplicar(estado, {...})`: así todos respetan los mismos límites (oxígeno 0–150, escudo y energía 0–100).
- Si el oxígeno llega a 0 o la radiación a 100, el siguiente cambio de escena va directo al Final, donde Chispa explica por qué. Ninguna escena tiene que revisarlo.
- El orden de la historia está en `ORDEN` (`src/config.js`). Las misiones nuevas usan `siguienteEscena(this.scene.key)`.

## Cómo está armado
- **Resolución 320×180**, agrandada sin suavizar (pixel art nítido).
- **Dibujos provisionales:** si falta un PNG en `assets/`, el juego dibuja un cuadro de color del mismo tamaño. Así se puede programar sin esperar al arte.
- **Textos** en `datos/textos.json` y **datos NASA** en `datos/datos.json`: se cambian sin tocar el código.
- **Modelo** en `src/modelo/simulacion.js`: calcula las consecuencias de cada decisión con los datos reales.

## Orden de escenas
Carga → Intro → Carta → Equipo (traje y cohete) → Aterrizaje → CentroControl (mochila) → Final

## Reparto
Ver `TAREAS.md`. En el código, `TODO(Rol N)` marca lo pendiente de cada rol.

## Fuentes NASA (completar antes de entregar)
- NASA DONKI — https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA OSDR RadLab — https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- NASA OSDR — https://osdr.nasa.gov/
- NASA Moon Trek — https://trek.nasa.gov/moon/
- Motor del juego: Phaser 3 — https://phaser.io
