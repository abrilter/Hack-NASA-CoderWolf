# Rescate en el Polo Sur Lunar — Proyecto base

Juego web en pixel art (Phaser 3) para el reto Junior Astronaut Mission Trainer, NASA Space Apps 2026.

## Cómo correrlo
1. Instalar **VS Code** y la extensión **Live Server**.
2. Abrir esta carpeta en VS Code.
3. Clic derecho en `index.html` → **Open with Live Server**.

No usen F5 ni doble clic en el archivo: el navegador bloquea la lectura de los datos.

## Cómo está armado
- **Resolución 320×180**, agrandada sin suavizar (pixel art nítido).
- **Dibujos provisionales:** si falta un PNG en `assets/`, el juego dibuja un cuadro de color del mismo tamaño. Así se puede programar sin esperar al arte.
- **Textos** en `datos/textos.json` y **datos NASA** en `datos/datos.json`: se cambian sin tocar el código.
- **Modelo** en `src/modelo/simulacion.js`: calcula las consecuencias de cada decisión con los datos reales.

## Orden de escenas
Carga → Intro → Carta → CentroControl → Equipo → Viaje → Aterrizaje → Ruta → Rescate → Final

## Reparto
Ver `TAREAS.md`. En el código, `TODO(Rol N)` marca lo pendiente de cada rol.

## Fuentes NASA (completar antes de entregar)
- NASA DONKI — https://ccmc.gsfc.nasa.gov/tools/DONKI/
- NASA OSDR RadLab — https://visualization.osdr.nasa.gov/radlab/gui/data-api/
- NASA OSDR — https://osdr.nasa.gov/
- NASA Moon Trek — https://trek.nasa.gov/moon/
- Motor del juego: Phaser 3 — https://phaser.io
