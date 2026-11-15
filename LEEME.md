# Stella's Ride · Rescate en el Polo Sur Lunar

Juego web en pixel art (Phaser 3) para el reto **Junior Astronaut Mission Trainer**, NASA Space Apps 2026. Es para niñas y niños de 7 a 12 años. No pide cuentas, no guarda datos personales y no se instala nada.

## Cómo correrlo
1. Instalar **VS Code** y la extensión **Live Server**.
2. Abrir esta carpeta en VS Code.
3. Clic derecho en `index.html` → **Open with Live Server**.

No abran `index.html` con doble clic: el navegador bloquea la lectura de los datos.

**Sin internet también funciona.** Phaser está copiado en `lib/phaser.min.js` (versión 3.80.1; si falta, se usa el CDN).

**El Sol de hoy.** La tormenta del juego es la nube del Sol (CME) más rápida de los últimos 30 días según NASA DONKI. El juego **nunca espera** a la NASA (`src/nasa/sol.js`):
1. Arranca al instante con un respaldo real: la última consulta buena guardada en ese navegador o, al azar, una de 5 tormentas famosas verificadas en DONKI (`datos.json → cme_historicas`: San Patricio 2015, Halloween 2021, mayo 2024, octubre 2024 y septiembre 2017).
2. Consulta DONKI en segundo plano (máximo 8 s). Si el dato llega antes de la Ruta, la partida usa la nube real más reciente ("Dato real · en vivo"); si llega después, la usa la siguiente partida.
3. Si el Sol estuvo tranquilo, se entrena con una tormenta real del pasado. Sin red, la etiqueta dice "no en vivo".
4. En pantalla se ve la velocidad real; el modelo la limita entre 1000 y 1700 km/s (`modelo.cme_max_juego_kms`) para que siempre se pueda jugar.
La clave de api.nasa.gov del equipo está en `src/nasa/donki.js` (1000 consultas por hora). Para agregar tormentas famosas verificadas: `pruebas/tormentas.html`.

**Controles:**
- **Ratón o dedo:** todas las escenas.
- **Teclado:** flechas y Enter en todas las escenas. Donde se camina, las flechas o WASD mueven al astronauta. En las escenas de botones, las flechas mueven un marco amarillo, Enter elige y Esc cierra una tarjeta.

## Orden de la historia
Carga → Titulo (pantalla de inicio) → Intro → Carta → Equipo (traje y nave) → Viaje (alerta solar) → Aterrizaje → CentroControl (mochila) → Exterior (rover) → Ruta → CraterHelado (solo si se eligió el cráter) → Huellas → Rocas → Tormenta → Rescate → Final

El orden está en `ORDEN` (`src/config.js`). Si el oxígeno llega a 0 o la radiación a 100, el siguiente cambio de escena va al Final, donde Chispa explica por qué. "Jugar otra vez" empieza en Equipo.

## Carpetas
| Ruta | Qué hay |
|---|---|
| `index.html` | La página del juego |
| `lib/phaser.min.js` | Phaser 3.80.1 (copia local) |
| `src/main.js` | Arranca el juego y manda al Final si se perdió |
| `src/config.js` | Tamaños, colores, `ORDEN` y números de balance (trajes, naves, mochila, aterrizaje) |
| `src/estado.js` | Estado compartido entre escenas (recursos, equipo, mochila, bitácora, `misiones`) |
| `src/ui.js` | Piezas comunes: `texto`, `boton`, `barras`, `datoReal`, `etiquetaDato`, `llenar`, `navegarConTeclado` |
| `src/sonidos.js` | Sonidos con Web Audio (sin archivos) |
| `src/modelo/simulacion.js` | Modelo de decisiones: calcula los costos con los datos NASA y las elecciones previas |
| `src/nasa/donki.js` | Consulta a NASA DONKI (máximo 8 s) |
| `src/nasa/sol.js` | Elige la tormenta de la partida: en vivo, guardada o famosa (sin hacer esperar) |
| `src/escenas/` | Una escena por archivo; cada una dice en su cabecera qué lee y qué escribe |
| `src/pixelart.js`, `src/arte*.js`, `src/stella.js` | Dibujos hechos con código (mapas de letras) |
| `src/pruebas.js` | Barra para saltar escenas (solo con `?dev=1`) |
| `datos/datos.json` | Datos NASA (con fuente y enlace) y números de juego |
| `datos/textos.json` | Todos los textos del juego |
| `pruebas/balance.html` | Juega todas las partidas posibles con el modelo real |
| `pruebas/tormentas.html` | Busca tormentas reales en DONKI para agregarlas a `cme_historicas` |
| `REVISION.md` | Revisión técnica final |

## Para probar
- **Barra de pruebas:** `index.html?dev=1&sinred=1`. Arriba a la derecha aparecen la escena actual, el oxígeno, **◀**, **Saltar ▶** y una lista de escenas.
- **Abrir una escena sola:** `index.html?escena=Ruta`. Se puede cambiar el estado:
  `&traje=blindado&nave=grande&mochila=oxigeno,linterna&oxigeno=80`. Con `&sinred=1` no se consulta DONKI. También `&sinrover=1` (Tormenta y Rescate) y `&ruta=cresta` (CraterHelado).
- **Balance:** abrir `pruebas/balance.html` con Live Server (`?vel=1500` cambia la velocidad de la CME). Muestra cuántos equipos pueden ganar, qué tanto gana cada opción y si algún objeto no cambia nada. Si cambian un número de balance, recarguen la página.

## Reglas para programar
- Para cambiar un recurso usen `estado.cambiar("oxigeno", -5)` o `aplicar(estado, {...})`: así todos respetan los límites (oxígeno 0–150; escudo y energía 0–100).
- Cada escena va a la siguiente con `this.scene.start(siguienteEscena(this.scene.key))`.
- Los registros de cada misión van en `estado.misiones.<id>`. No agreguen claves nuevas al estado sin avisar.
- Phaser reutiliza la escena en cada partida: las banderas (`saliendo`, `listo`, lo marcado…) se reinician en `create()`.
- Los textos van en `datos/textos.json` y los números en `datos/datos.json` o `src/config.js`.
- Todo dato NASA en pantalla lleva su etiqueta con `datoReal()`: "Dato real" o "DATO DE EJEMPLO" (más "en vivo" / "no en vivo" en DONKI).

## Fuentes NASA
| Dato | Fuente | Enlace |
|---|---|---|
| Tormentas solares (CME) | NASA DONKI – CMEAnalysis | https://ccmc.gsfc.nasa.gov/tools/DONKI/ · API: https://api.nasa.gov |
| Zona de aterrizaje y rutas | NASA Moon Trek | https://trek.nasa.gov/moon/ |
| Cráteres de sombra permanente | NASA LRO | https://science.nasa.gov/mission/lro/ |
| Luz y sombras largas en el polo sur | NASA Science | https://science.nasa.gov/resource/shadows-near-the-moons-south-pole/ |
| Velocidad del rover (VIPER: 0.36–0.72 km/h; el juego usa 0.5) | NASA VIPER | https://assets.science.nasa.gov/content/dam/science/psd/lunar-science/documents/2025-02-13_VIPER_Updated_Technical_Briefing_Presentation-Shared.pdf |
| Frío en los cráteres (Diviner) | NASA SVS / LRO Diviner | https://svs.gsfc.nasa.gov/cgi-bin/details.cgi?aid=10595 |
| Huellas del Apolo | NASA LRO, Apolo 17 | https://science.nasa.gov/resource/lro-apollo-17-landing-site-lithograph/ |
| Gravedad de la Luna | NASA Moon Fact Sheet | https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html |
| Plantas en suelo lunar | NASA OSDR · OSD-476 | https://osdr.nasa.gov/bio/repo/data/studies/OSD-476 |
| Plantas en la Estación Espacial | NASA OSDR · OSD-38 (BRIC-20) | https://osdr.nasa.gov/bio/repo/data/studies/OSD-38 |
| Hueso y músculo en la Estación Espacial | NASA OSDR | https://osdr.nasa.gov/bio/ |
| Radiación | NASA OSDR RadLab (aún de ejemplo) | https://visualization.osdr.nasa.gov/radlab/gui/data-api/ |
| Polvo lunar en el Apolo | NASA NTRS · Gaier (2005) | https://ntrs.nasa.gov/citations/20050160460 |

El juego muestra esta lista completa al final ("Fuentes NASA"), con su etiqueta real o de ejemplo. Motor del juego: Phaser 3, https://phaser.io
