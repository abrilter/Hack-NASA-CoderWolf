# Análisis del juego "Rescate en el Polo Sur Lunar"

NASA Space Apps Challenge 2026 · reto *Junior Astronaut Mission Trainer* · 14 nov 2026

Este documento revisa el código actual, lo compara con el propósito del juego y propone cómo agregar 5 misiones nuevas sin que el equipo se estorbe. **No se modificó ningún archivo del juego**: solo se creó este informe.

---

## 0. Resumen en 10 líneas

1. El juego corre completo de Intro a Final y las misiones 1–5 tienen mucho trabajo encima (pixel art en código, animaciones, sonidos).
2. **El modo prueba `index.html?escena=X` no existe todavía.** `Carga.js` siempre arranca la Intro (`src/escenas/Carga.js:27`).
3. **Con los números actuales nadie puede perder.** Simulé las 192 combinaciones posibles (traje × nave × mochila × escudo × ruta × radio) y las 192 ganan: el oxígeno mínimo final es 13 y la radiación máxima es 22.
4. La causa: el rescate (17–36 h) casi siempre termina antes de que llegue la tormenta (27.7 h), así que la radiación casi no cuenta. "Traje ligero + nave pequeña" domina.
5. Varias decisiones son "gratis" o no tienen efecto: el tanque de oxígeno es obligatorio, la linterna (1 kg) siempre cabe, y el botiquín y la comida no cambian nada.
6. Hay datos de ejemplo que se presentan como reales: la cuenta regresiva de Equipo no tiene etiqueta, y Final dice "Ciencia real" aunque la planta dice "COMPLETAR".
7. El juego nunca revisa a mitad de partida si el oxígeno llegó a 0. Se puede llegar al Rescate con oxígeno negativo.
8. Propongo un rebalanceo verificado con simulación: gana ~72 %, cada traje, nave y ruta es la mejor en algún caso, y ninguna opción domina (sección 2.3).
9. Para crecer, recomiendo **escena propia + "kit de misión" común + un JSON por misión** (sección 3.1). Es lo que mejor aguanta a 5 personas programando en paralelo.
10. Están diseñadas las misiones 7, 9, 10, 11 y 12, con fórmulas, datos NASA, textos, assets y modo prueba, más un plan de trabajo por persona (sección 4).

---

## 1. Análisis del programa

### 1.1 Arquitectura

| Archivo | Qué hace |
|---|---|
| `index.html` | Carga Phaser 3.80.1 desde jsDelivr y `src/main.js` como módulo ES. Sin build. |
| `src/main.js` | Crea el juego a 1280×720 (320×180 × `ZOOM` 4) con `pixelArt: true`. Un plugin (`ZoomPixel`) agranda cada cámara ×4, así las escenas dibujan en coordenadas de 320×180. Registra las 11 escenas. |
| `src/config.js` | `ANCHO`/`ALTO`, `ZOOM`, colores provisionales, lista `ASSETS` (12 PNG que **no existen**: se usan cuadros de color), `OBJETOS` de la mochila y `CAPACIDAD_MOCHILA = 10`. |
| `src/estado.js` | Objeto único compartido: `datos`, `textos`, `nombreClave`, `mochila`, `traje`, `nave`, `mision2`, `oxigeno` (100), `escudo` (40), `radiacion` (0), `bitacora`. `nuevaPartida()` y `lleva(id)`. |
| `src/ui.js` | `texto`, `titulo`, `boton`, `datoReal` (etiqueta "Dato real · …" o "DATO DE EJEMPLO · …"), `barras` (O2/ESC/RAD) y `paginas` (sin uso). |
| `src/pixelart.js` | Dibuja sprites con "mapas de letras" (cada letra es un píxel). Crea astronautas (base/ligero/blindado/técnicos), maniquíes, 2 naves, `chispa_px`, iconos, decorado y los 6 objetos `px_obj_*`. |
| `src/modelo/simulacion.js` | `horasDeLlegada`, `opcionesDeRuta`, `aplicar`, `explicar`. |
| `src/nasa/donki.js` | `cmeReciente(30)`: llama a `DONKI/CMEAnalysis` con `DEMO_KEY` y elige la CME más rápida de 30 días. Si falla, devuelve `null` y queda la CME guardada. |
| `datos/datos.json` | CME, radiación, rover, 2 rutas, zona de aterrizaje y planta. Casi todo tiene `"ejemplo": true`. |
| `datos/textos.json` | Todos los diálogos por escena. |

### 1.2 Cómo se cargan assets y datos

1. `Carga.preload()` pide los 12 PNG de `ASSETS` y los dos JSON. Si un PNG falla, solo hay un aviso en la consola.
2. `Carga.create()` crea un cuadro de color del tamaño correcto para cada PNG que falta, guarda `datos` y `textos` en `estado`, y **espera** a DONKI (hasta 8 s sin internet). Si DONKI responde, reemplaza `estado.datos.cme` y pone `donkiEnVivo = true`.
3. Casi todas las escenas **no usan esos PNG**: llaman a `crearTexturasEquipo` o `crearTexturasMochila` (pixel art en código). Solo `Rescate`, `Ruta` y `Viaje` usan las claves provisionales `itzel`, `chispa` y `fondo_luna` (cuadros de color).

### 1.3 Flujo de escenas

```
Carga → Intro → Carta → Senal → CentroControl → Equipo → Viaje → Aterrizaje → Ruta → Rescate → Final
                                     ↑                                                          │
                                     └──────────────── "Jugar otra vez" ───────────────────────┘
```

Cada escena llama a la siguiente con `this.scene.start("…")` escrito a mano. El orden **no** vive en un solo lugar.

### 1.4 Tabla escena → estado → siguiente

| Escena | Lee del estado | Escribe en el estado | Siguiente |
|---|---|---|---|
| Carga | — | `datos`, `textos`, `donkiEnVivo`, `datos.cme` | Intro |
| Intro | `textos.intro` | — | Carta |
| Carta | `textos.carta` | `nombreClave` | Senal |
| Senal *(no está en el contrato del PDF)* | `textos.centro_control` | **`mision1`** (campo no declarado en `estado.js`) | CentroControl |
| CentroControl | `textos`, **`mision1`** | llama a `nuevaPartida()`, luego `mochila`, `mision2`, `bitacora` | Equipo |
| Equipo | `textos`, `datos.cme`, `mochila` | `traje`, `nave`, `oxigeno` (+nave, +tanque, **sin tope**), `bitacora` | Viaje |
| Viaje | `datos.cme`, `textos`, barras | `escudo`, `oxigeno`, `bitacora` (vía `aplicar`) | Aterrizaje |
| Aterrizaje | `nave` (o `NAVE_PRUEBA`), `datos.zona_aterrizaje`, `textos` | `oxigeno` (−5 por reintento, **sin tope ni piso**), `bitacora` | Ruta |
| Ruta | `datos`, `mochila`, `traje`, `nave`, `escudo` | `oxigeno`, `radiacion`, `bitacora` | Rescate |
| Rescate | `mochila`, `textos` | `oxigeno`, `bitacora` | Final |
| Final | `oxigeno`, `radiacion`, `bitacora`, `nombreClave`, `datos` | — | CentroControl |

### 1.5 Cómo funciona el modelo de simulación (`src/modelo/simulacion.js`)

| Cálculo | Fórmula actual | Unidades |
|---|---|---|
| Llegada de la tormenta | `hT = 149 600 000 / v / 3600` | h (v en km/s) |
| Protección | `p = min(0.9, escudo/100 × 0.5 + traje.proteccion + 0.2 si lleva escudo)` | 0–0.9 |
| Horas de rescate | `hR = (km / (rover_kmh × nave.agilidad) + subida_m / 500) × (1.5 si ruta oscura y sin linterna)` | h |
| Oxígeno | `−(hR × traje.gastoO2 + subida_m / 100)` | puntos |
| Radiación | `max(0, hR − hT) × dosis_juego_por_hora × (1 − p)` | puntos (100 = pierde) |
| Refugio | `hEspera = hT + 12`; oxígeno `−hEspera × gasto × 0.8`; radiación 0 | — |
| `aplicar` | oxígeno entre 0 y **120**, radiación ≥ 0, escudo entre 0 y 100 | — |

### 1.6 Errores, riesgos e inconsistencias

Gravedad: 🔴 rompe el propósito o el contrato · 🟡 riesgo real · ⚪ detalle.

| # | Gravedad | Dónde | Problema | Arreglo sugerido |
|---|---|---|---|---|
| 1 | 🔴 | `Carga.js:27` | **No existe el modo prueba** `?escena=`. Además, si una escena se abriera sola, `estado.textos` y `estado.datos` serían `null` y casi todas fallarían en la primera línea (`estado.textos.equipo…`). | Que Carga lea `?escena=`, cargue JSON, aplique un `ESTADO_PRUEBA` y salte a esa escena (sección 3.3). |
| 2 | 🔴 | Todo el flujo | **Nadie puede perder** (simulación, sección 2.2). | Rebalanceo de la sección 2.3. |
| 3 | 🔴 | Todas | El juego **no revisa la derrota a mitad de partida**. Con reintentos en Aterrizaje (`Aterrizaje.js:367`) el oxígeno puede ser negativo y la partida sigue hasta Rescate. Y en el Final no hay una explicación de Chispa sobre *por qué* se perdió. | Helper común `revisarDerrota()` tras cada cambio de recursos, que lleve a Final con `estado.causaDerrota`. |
| 4 | 🔴 | `Final.js:19` | Dice "Ciencia real: …" e incluye la planta (`"COMPLETAR"`, `ejemplo: true`) y la CME de ejemplo. Presenta datos de ejemplo como reales. Tampoco muestra enlaces. | Listar cada fuente con su etiqueta real/ejemplo y su `link`. |
| 5 | 🔴 | `Equipo.js:502` | La cuenta regresiva "TORMENTA EN" usa la CME **sin etiqueta** de dato real o de ejemplo. | Poner `datoReal(this, estado.datos.cme)` también en Equipo. |
| 6 | 🟡 | `Equipo.js:691-693`, `simulacion.js:50` | El tope de oxígeno no es consistente. Equipo suma sin tope (hasta 100+20+20 = **140**), pero `aplicar` recorta a 120. Con 140, "Cargar escudo (−10 O2)" en realidad cuesta 20 (140 → 130 → tope 120), y "Ahorrar" conserva 140. La barra se llena a partir de 100. | Un solo `cambiar(recurso, delta)` en `estado.js` con los mismos límites para todos. |
| 7 | 🟡 | `estado.js` | `mision1` no está declarado y `nuevaPartida()` no lo reinicia. El contrato del PDF no menciona `mision1`, `mision2` ni la escena Senal. | Declararlo y anotarlo en el contrato. |
| 8 | 🟡 | `config.js` | El tanque de O2 es **obligatorio** (decisión de diseño de la Misión 2). Eso le quita a la mochila su decisión principal según el PDF. Además da +20 O2 que nunca se puede rechazar. | Aceptarlo, pero contarlo como oxígeno base (ver 2.3) o volverlo opcional. |
| 9 | 🟡 | `simulacion.js` | El **botiquín y la comida no tienen ningún efecto**. La **linterna (1 kg) siempre cabe** en una mochila llena (4+5+1 = 10). | Darles efecto y subir la linterna a 2 kg (2.3). |
| 10 | 🟡 | `simulacion.js:40-44` | El refugio no incluye el viaje hasta Itzel después de la espera. Esperar "teletransporta" al jugador. | Refugio = esperar la tormenta + ir por la ruta segura. |
| 11 | 🟡 | `simulacion.js` | La radiación expuesta no tiene límite: si el rescate tarda 100 h, se acumulan 100 h de tormenta aunque una tormenta real dura horas. | `expuesto = min(duración, max(0, hR − hT))`. |
| 12 | 🟡 | `simulacion.js` | `rover_kmh × agilidad de la nave` mezcla dos cosas: el rover no anda más rápido por la nave en que llegaste. | Que la nave cambie las **horas de viaje** (la grande es "lenta", como dice el PDF) y no la velocidad del rover. |
| 13 | 🟡 | `donki.js` | `DEMO_KEY` permite pocas llamadas por hora por IP; en una feria con muchas computadoras se agota. Si la CME más rápida del mes es lenta (por ejemplo 400 km/s), la tormenta tarda **104 h** y deja de importar. | Clave propia (C-6). Si v < 1000 km/s, usar una CME rápida **real** guardada, con su fecha. |
| 14 | 🟡 | `Viaje.js` | "Ahorrar energía" no hace nada porque el recurso energía no existe. Es una opción literalmente gratis. | Cuando exista `energia`, "ahorrar" debe dar +energía y "cargar escudo" debe costar energía. |
| 15 | 🟡 | `Rescate.js:13-14`, `Ruta.js:28`, `Viaje.js:16` | Usan los cuadros provisionales `itzel` y `chispa`, aunque ya existe `chispa_px` en pixel art. Dos "Chispas" distintas. | Usar `chispa_px` en todas. |
| 16 | ⚪ | `Rescate.js`, `Viaje.js`, `Ruta.js`, `Final.js`, `simulacion.js:explicar` | Textos escritos en el código ("Reparar radio", "Misión cumplida!", las frases de Chispa). Rompe la regla de "todos los diálogos en textos.json". | Moverlos a `textos.json`. |
| 17 | ⚪ | `Equipo.js:19-27`, `Aterrizaje.js:19-30` | Los números de balance (trajes, naves, dificultad) están en el código, no en `datos.json`. El dueño del modelo tiene que editar escenas de otros. | Pasarlos al JSON de su misión. |
| 18 | ⚪ | `Senal.js` / `CentroControl.js` | Unas 200 líneas copiadas (paneles, mapa, sonidos Web Audio, tarjeta). | Pasarlas al "kit de misión" (3.2). |
| 19 | ⚪ | `ui.js` | Fuente `monospace` a 5–6 px: difícil de leer para un niño de 7 años. | Fuente pixel con tamaño mínimo de 7 px en textos de lectura. |
| 20 | ⚪ | Repositorio | La rama `master` no tiene commits, no hay ramas por persona y `LEEME.md` menciona un `TAREAS.md` que no existe. | Primer commit y ramas antes de repartir. |
| 21 | ⚪ | `Final.js:23` | "Jugar otra vez" salta Intro, Carta y Senal. Está bien, pero hay que decidirlo a propósito. | — |

Revisé que **todas las claves de `textos.json` que usa el código existen**; no hay textos faltantes. Sí hay claves que nadie usa (`centro_control.tomar` y `no_cabe`).

---

## 2. Evaluación contra el propósito

### 2.1 Decisiones actuales

| Misión | Decisión | Costo | ¿Opción gratis o dominante? | Dato NASA |
|---|---|---|---|---|
| 1 Noticia y carta | Nombre clave y motivo | Ninguno (a propósito) | — (entrada emocional) | — |
| 1c Señal | Identificar la señal (minijuego) | Solo reintentos | No es una decisión con costo | Mapa de cráteres en sombra (LRO), sin enlace |
| 2 Mochila | Qué llevar en 10 kg | Peso | **Sí.** Tanque obligatorio; linterna siempre cabe; botiquín y comida sin efecto | Cráteres sin luz (LRO), sin enlace |
| 3 Traje y nave | Blindado o ligero; grande o pequeña | O2/h y protección; O2 extra o agilidad | **Ligero + pequeña domina** con los números actuales | — |
| 4 Alerta solar | Cargar escudo o ahorrar | −10 O2 (en realidad −20 si hay 140) | **"Ahorrar" es gratis**: la radiación casi nunca llega | CME de DONKI (o de ejemplo) |
| 5 Aterrizaje | Cuándo frenar y la dificultad | Combustible; −5 O2 por reintento | Fácil siempre conviene (no cambia nada después) | Gravedad 1.62 m/s², Shackleton (Moon Trek) |
| 6 Ruta | Cráter, cresta o refugio | O2 y radiación | Casi siempre gana cualquier ruta | Rutas, rover y RadLab: **todo de ejemplo** |
| 7 Rescate | Reparar la radio o salir | −5 / −15 O2 | "Salir" es gratis (la radio no cambia el final) | Planta OSDR: **falta** |

### 2.2 Simulación del modelo actual

Repliqué en Python el modelo y el flujo real (Equipo → Viaje → Ruta → Rescate) con la CME guardada (1500 km/s, `hT` = 27.7 h) y todas las mochilas "llenas" (no tiene sentido dejar kilos libres).

| Combinación | Cráter | Cresta | Refugio |
|---|---|---|---|
| Ligero + pequeña + escudo + linterna | 17.3 h · O2 67 · Rad 0 | 22.1 h · O2 82 · Rad 0 | 39.7 h · O2 69 · Rad 0 |
| Blindado + grande + escudo + linterna | 25.0 h · O2 32 · Rad 0 | 35.6 h · O2 28 · Rad 9 | 39.7 h · O2 41 · Rad 0 |
| Peor caso de radiación (ligero + grande, sin escudo) | — | 35.6 h · O2 60 · **Rad 22** | — |

**Resultado: 192 de 192 combinaciones ganan.** La radiación nunca pasa de 22 (el límite es 100) y el oxígeno nunca baja de 13. Ligero + pequeña es igual o mejor que todo en todas las rutas. El juego enseña "elige lo que sea, todo sale bien", lo contrario de la regla de oro.

### 2.3 Rebalanceo propuesto (verificado)

Busqué automáticamente entre unas 17 000 combinaciones de parámetros con estos criterios:

- Ganar entre 55 % y 80 % de las partidas, para que sea retador pero amable con niños.
- Cada traje, nave y ruta es la mejor opción en algún escenario.
- Ninguna opción gana en todo.
- Robusto ante distintas CME reales (1200, 1500 y 2000 km/s).

#### Cambios de números

| Parámetro | Actual | Propuesto | Por qué |
|---|---|---|---|
| Traje blindado (protección, O2/h) | 0.30, 2.5 | **0.40, 2.2** | Que proteger valga la pena. |
| Traje ligero (protección, O2/h) | 0.10, 1.6 | **0.05, 1.6** | Más contraste: barato en aire, malo en radiación. |
| Nave grande: O2 extra | +20 | **+10** | Ya no basta para todo. |
| **Horas de viaje que faltan al aterrizar** *(nuevo)* | — | **grande 12 h · pequeña 2 h** | El PDF ya dice que la grande es "lenta". La tormenta queda más cerca. |
| Velocidad del rover | 0.5 × agilidad | **0.5 km/h** (sin agilidad) | La agilidad se queda en el Aterrizaje. |
| Ruta cráter (km, subida) | 8, 2500 m | **10, 2000 m** | Medir en Moon Trek (E-6) y ajustar. |
| Ruta cresta (km, subida) | 14, 300 m | **16, 100 m** | Larga y plana. |
| Dosis de juego por hora | 4 | **20** | Que la tormenta sí asuste. Es un valor de juego escalado desde RadLab (ver 2.4). |
| **Duración de la tormenta** *(nuevo)* | sin límite | **12 h** | Exposición máxima realista. |
| Refugio | esperar `hT`+12 y ya | **esperar `hT`+12 (O2 × 0.5, en reposo) y luego ir por la cresta**; −10 O2 extra sin comida | El refugio es seguro pero caro, y la comida importa. |
| Botiquín | sin efecto | **−8 O2 en Rescate si no se lleva** (Itzel está herida y regresan más lento) | Da sentido al objeto. |
| Linterna | 1 kg | **2 kg** | Ya no cabe "gratis" junto con oxígeno y escudo. |
| Tope de oxígeno | 120 en `aplicar`, sin tope en Equipo | **Un solo tope (150)** en `estado.cambiar` | Consistencia. |
| CME en vivo lenta (< 1000 km/s) | se usa igual | **usar una CME rápida real guardada** (C-7) | Que la tormenta siempre importe. Sigue siendo un dato real con fecha. |

#### Fórmulas propuestas para `simulacion.js`

```
hT        = 149 600 000 / v_CME / 3600 − horasViaje[nave]        (h)
hR        = (km / rover_kmh + subida_m / 500) × (1.5 si cráter y sin linterna)   (h)
expuesto  = min(D, max(0, hR − hT))                               (h, D = 12)
prot      = min(0.9, escudo/100 × 0.5 + traje.proteccion + 0.2 si lleva escudo)
radiación = expuesto × dosis × (1 − prot)
O2 ruta   = hR × traje.gasto + subida_m / 100
Refugio:  espera = hT + D;  hR = espera + cresta
          O2 = espera × gasto × 0.5 + (hR − espera) × gasto + subida/100 + (10 si no hay comida)
Rescate:  −8 O2 si no hay botiquín
```

#### Cálculos de ejemplo (CME 1500 km/s)

**Blindado + pequeña + mochila (oxígeno, escudo, linterna), ahorra energía.**
`hT` = 27.7 − 2 = **25.7 h**. Oxígeno inicial = 100 + 0 + 20 (tanque) = 120. Protección = 0.40×0.5 + 0.40 + 0.20 = **0.80**.

- **Cráter:** hR = 10/0.5 + 2000/500 = 24 h, que es menor que 25.7, así que no hay exposición. O2 = 120 − (24×2.2 + 20) − 8 (sin botiquín) = **39** ✓, Rad 0.
- **Cresta:** hR = 32 + 0.2 = 32.2 h, con exposición de 6.5 h. Rad = 6.5 × 20 × 0.2 = **26**. O2 = 120 − (70.8 + 1) − 8 = **40** ✓.
- **Refugio:** espera = 37.7 h. O2 = 120 − (41.5 + 70.8 + 1 + 10 sin comida) − 8 = **−11 ✗**. *Pierde: el refugio no es para el traje blindado si no llevas comida.*

**Ligero + grande + mochila (oxígeno, linterna, radio, botiquín), ahorra energía.**
`hT` = 27.7 − 12 = **15.7 h**. Oxígeno inicial = 100 + 10 + 20 = 130. Protección = 0.2 + 0.05 = **0.25**.

- **Cráter:** hR = 24 h, con exposición de 8.3 h. Rad = 8.3 × 20 × 0.75 = **124 ✗**. *Pierde por radiación.*
- **Refugio:** espera = 27.7 h. O2 = 130 − (22.2 + 51.5 + 1 + 10) = **45** ✓, Rad 0. *Con el traje ligero, lo inteligente es refugiarse.*

#### Resultados de la simulación (linterna de 2 kg, 3 velocidades de CME, 360 partidas)

| Medida | Actual | Propuesto |
|---|---|---|
| Partidas que se ganan | 100 % | **72 %** |
| Gana con blindado / ligero | 100 % / 100 % | 83 % / 62 % |
| Gana con nave grande / pequeña | 100 % / 100 % | 69 % / 76 % |
| Gana con cargar escudo / ahorrar | 100 % / 100 % | 73 % / 72 % |
| Mejor ruta (cresta / cráter / refugio) | casi siempre cresta o cráter, sin consecuencias | **59 / 19 / 42** de 120 escenarios |
| Traje: veces que el blindado es mejor / que el ligero es mejor | ligero siempre | **25 / 35** |
| Nave: veces que la grande es mejor / que la pequeña es mejor | pequeña siempre | **40 / 20** |

Ninguna opción gana siempre y cada elección cambia cuál ruta conviene, que es justo lo que pide E-9 ("la mejor ruta cambia según lo que se eligió antes"). "Cargar escudo" es la mejor opción solo en 14 de 60 casos: está bien, porque es un seguro. Además, cuando exista el recurso energía (misiones nuevas), "ahorrar" dará energía y el dilema será más parejo.

> Los números de rutas, rover y dosis siguen siendo **de juego** hasta que el responsable de E-6, E-7 y E-8 los mida. Al cambiar un dato real hay que volver a correr la prueba de combinaciones (E-9). Recomiendo convertir esta simulación en una página de prueba en JS (`pruebas/balance.html`) que importe `simulacion.js`.

### 2.4 Cómo usar RadLab sin mentir

RadLab da dosis en **µSv/h**. El juego usa "puntos de radiación". Propuesta:

- Mostrar el dato real: "Durante una tormenta, la dosis medida fue de X µSv/h (fuente: RadLab, fecha)".
- Usar un factor fijo y declarado: `puntos/h = µSv/h × k`.
- Etiquetar el 20 como "**valor de juego** basado en …". Así el niño ve el número real y entiende que el juego lo escala.

---

## 3. Cómo agregar misiones más complejas

### 3.1 Tres patrones posibles

| | A. Clase base grande (`MisionBase` con mucho comportamiento) | B. Misiones 100 % definidas en JSON (un motor genérico) | C. Escena propia + kit de helpers + JSON por misión *(híbrido)* |
|---|---|---|---|
| Cómo es | Cada misión hereda de una clase que trae diálogo, decisiones, barras y salida. | Un archivo JSON describe pantallas, opciones y efectos; una sola escena los "interpreta". | Cada misión es su propia escena. Importa funciones pequeñas de `src/mision/kit.js` y lee su `datos/misiones/<id>.json`. La clase base es mínima. |
| Minijuegos (aterrizaje, cráter, reentrada) | Bien | **Muy difícil**: el JSON no puede describir física | Bien |
| Choques entre 5 personas | **Altos**: todos tocan la clase base | Medios: todos dependen del motor | **Bajos**: cada quien en su carpeta; el kit casi no cambia |
| Curva para principiantes | Media (herencia y `super`) | Baja para textos, alta para el motor | Baja: "llama a esta función" |
| Riesgo en un hackathon | Si la base falla, fallan todas | El motor es un cuello de botella | Bajo |

**Recomendación: C.** La clase base solo hace 4 cosas (estado de prueba, leer su JSON, aplicar efectos con revisión de derrota, ir a la siguiente escena). Todo lo demás son funciones opcionales del kit. Encaja con lo que ya existe: Equipo y CentroControl ya son escenas propias, y solo hay que pasar sus partes repetidas al kit.

### 3.2 Plantilla del patrón C

Estructura de archivos por misión:

```
src/escenas/<Mision>.js          ← solo lo toca el dueño
datos/misiones/<id>.json         ← sus textos, datos NASA y estado de prueba
assets/<id>/                     ← sus PNG (opcionales: hay cuadros de color de respaldo)
```

Kit común (núcleo, se acuerda entre todos):

```js
// src/mision/MisionBase.js
import { estado } from "../estado.js";
import { siguienteEscena } from "../config.js";

export class MisionBase extends Phaser.Scene {
  constructor(id) { super(id); this.id = id; }

  // Cada misión llama a this.preparar() al inicio de create()
  preparar() {
    this.m = this.cache.json.get("m_" + this.id) || {};   // datos/misiones/<id>.json
    this.t = this.m.textos || {};
    this.d = this.m.datos || {};
    this.reg = estado.misiones[this.id] ??= {};           // registro propio
  }

  // Aplica costos, anota la bitácora y revisa si se perdió
  decidir(efectos, nota) {
    for (const [r, delta] of Object.entries(efectos)) estado.cambiar(r, delta);
    if (nota) estado.bitacora.push(nota);
    const causa = estado.causaDerrota();
    if (causa) { this.scene.start("Final"); return false; }
    return true;
  }

  terminar() { this.scene.start(siguienteEscena(this.id)); }
}
```

```js
// src/mision/kit.js: funciones sueltas, cada misión usa las que quiera
export function opcionesConCosto(escena, opciones, alElegir) { /* botones con "+ventaja" en verde y "−costo" en rojo */ }
export function chispaDice(escena, frase, ms) { /* globo de Chispa con chispa_px */ }
export function tarjetaNASA(escena, { titulo, texto, fuente, link, fecha, ejemplo }) { /* tarjeta + etiqueta real/ejemplo + enlace */ }
export function cargarAssets(escena, lista) { /* PNG de assets/<id>/ con cuadro de color si falta */ }
export function sonar(escena, tipo) { /* los sonidos Web Audio que hoy están copiados en Senal y CentroControl */ }
```

Ejemplo de JSON por misión:

```json
{
  "textos": { "titulo": "...", "intro": ["..."], "opciones": { "a": { "nombre": "...", "ventaja": "...", "costo": "..." } } },
  "datos":  { "temperatura_K": 40, "fuente": "NASA LRO Diviner", "link": "...", "fecha": "2009-10-09", "ejemplo": true },
  "prueba": { "mochila": ["oxigeno", "linterna"], "energia": 60 }
}
```

Reglas del patrón:

1. Una misión **solo** escribe sus recursos compartidos (con `decidir`) y `estado.misiones.<id>`. Si necesita un campo nuevo compartido, se acuerda en la reunión y se agrega a la tabla del contrato.
2. Ninguna misión escribe `scene.start("OtraEscena")`: usa `this.terminar()`. El orden vive en `config.js`.
3. Todo número que decide consecuencias va en el JSON con `fuente`, `link`, `fecha` y `ejemplo`.
4. Cada misión trae su bloque `"prueba"` y funciona con `index.html?escena=<Id>`.

### 3.3 Cambios mínimos al núcleo (acordar primero, ~1.5 h entre todos)

| Archivo | Cambio |
|---|---|
| `src/config.js` | `export const ORDEN = ["Intro","Carta","Senal","CentroControl","Equipo","Viaje","Aterrizaje","Ruta","Crater","Rescate","Hielo","Antena","Refugio","Regreso","Final"]`, `export const siguienteEscena = id => ORDEN[ORDEN.indexOf(id) + 1] ?? "Final"` y `export const MISIONES_JSON = ["crater","hielo","antena","refugio","regreso"]`. Cambiar la linterna a 2 kg. |
| `src/estado.js` | Campos nuevos (tabla de abajo). `cambiar(recurso, delta)` con límites únicos (O2 0–150, energía 0–100, escudo 0–100, radiación ≥ 0). `causaDerrota()` devuelve `"oxigeno"`, `"radiacion"` o `null`. `nuevaPartida()` reinicia todo, incluido `mision1`. |
| `src/escenas/Carga.js` | Cargar `datos/misiones/<id>.json` como `m_<id>`. **Modo prueba:** leer `new URLSearchParams(location.search).get("escena")`; si existe, aplicar `ESTADO_PRUEBA` más el bloque `prueba` de esa misión y hacer `scene.start(escena)` (sin esperar a DONKI si se pasa `&sinred=1`). |
| `src/main.js` | Importar y registrar las 5 escenas nuevas (una línea por misión). |
| `src/ui.js` | `barras(escena, estado, recursos = ["oxigeno","escudo","radiacion"])`, para mostrar solo las barras de esa misión e incluir energía con su icono. `datoReal` con enlace clicable (`window.open(link)`). |
| `src/modelo/simulacion.js` | El rebalanceo de 2.3. |
| `Aterrizaje.js` *(con permiso de Angel)* | Al aterrizar, escribir `estado.combustibleRestante`. Usar `estado.cambiar("oxigeno", -5)`. |

Campos nuevos del estado:

| Campo | Valor inicial | Lo escribe | Lo lee |
|---|---|---|---|
| `energia` | `60` | Viaje (ahorrar +20), Cráter, Hielo, Antena, Refugio | Cráter, Hielo, Antena, Refugio |
| `hielo_kg` | `0` | Cráter, Hielo | Hielo, Regreso |
| `chispaEncontrado` | `false` | Cráter | Rescate, Final |
| `estacionDSN` | `null` | Antena | Final |
| `mensajeEnviado` | `false` | Antena | Final |
| `combustibleRestante` | `null` | Aterrizaje | Regreso |
| `carga` | `[]` | Regreso | Final |
| `misiones` | `{}` | cada misión, solo su clave | la misma misión y Final |
| `mision1` | `null` | Senal | CentroControl |

**Sobre "pocos recursos a la vez":** la energía es el 5.º recurso. Para no saturar, cada escena muestra solo las barras que usa. Por ejemplo, Hielo muestra O2 y energía; Refugio muestra O2, energía y radiación.

### 3.4 Orden y numeración

El cráter oscuro va **antes** del rescate porque la historia ya dice que "Chispa se perdió en un cráter". El Rescate actual pasa a ser la Misión 8, así la numeración que pediste (7, 9, 10, 11, 12) queda continua.

```
… 5 Aterrizaje → 6 Ruta → 7 Cráter oscuro (Chispa) → 8 Rescate (Itzel) → 9 Hielo → 10 Hablar con la Tierra → 11 Refugio → 12 Regreso → Final
```

Esto alarga la partida. Recomiendo un **modo corto** (`ORDEN_CORTO` sin las misiones 9–11) para ferias y para los niños de 7–8 años.

---

### 3.5 Misión 7 · El cráter oscuro

**Idea:** Chispa está en un cráter de sombra permanente. El niño baja con la linterna, sigue el parpadeo del collar y decide cuánta luz usar y cuánto hielo recoger.

| Concepto | Detalle |
|---|---|
| Archivos | `src/escenas/Crater.js`, `datos/misiones/crater.json`, `assets/crater/` |
| Lee | `mochila` (linterna), `traje`, `oxigeno`, `energia` |
| Escribe | `oxigeno`, `energia`, `hielo_kg`, `chispaEncontrado`, `misiones.crater = { pasos, luzUsada, hieloRecogido }`, `bitacora` |
| Mecánica | Cuadrícula de 20×10 casillas de 16 px, oscura. La linterna ilumina un radio que depende del nivel. El collar de Chispa parpadea cada 3 s y deja ver su dirección un instante. Hay 4–6 casillas con hielo que brilla. |

**Fórmulas (por casilla caminada):**

| Nivel de linterna | Radio visible | Energía/paso |
|---|---|---|
| Apagada | 0 (solo el collar) | 0 |
| Baja | 2 casillas | 0.3 |
| Alta | 4 casillas | 1.0 |

- Sin linterna en la mochila, solo existe "apagada".
- Calefacción del traje por el frío: **+0.2 energía/paso**. Oxígeno: **0.15 × traje.gasto por paso**.
- Si la energía llega a 0, la linterna se apaga sola y la calefacción falla: el oxígeno por paso se duplica (respiras más con frío).
- Recoger un bloque de hielo: **+0.5 kg de hielo, −2 O2, −2 energía**. Máximo 3 kg (el recolector es pequeño).
- Conversión que se muestra: `°C = K − 273.15`, es decir, 40 K = −233 °C.

**Decisión y costo:** mucha luz encuentra a Chispa rápido pero gasta energía, que hará falta en el Refugio. Poca luz ahorra energía pero hace caminar más (más oxígeno). Recoger hielo da oxígeno futuro (Misión 9) pero cuesta oxígeno y energía ahora. Nada es gratis.

**Dato NASA:** el instrumento Diviner del LRO midió unos **40 K (−233 °C)** en el sitio de impacto de LCROSS dentro del cráter Cabeus, uno de los lugares más fríos medidos en el sistema solar. Hay una fuente que da 37 K como promedio anual.

- Fuente: Paige et al. (2010), *Science*, "Diviner Lunar Radiometer Observations of Cold Traps in the Moon's South Polar Region".
- Cómo obtenerlo: en NASA Moon Trek (trek.nasa.gov/moon) buscar la capa *Diviner* de temperatura, ir a Cabeus (~85°S, 35°O) y leer el valor. Anotar el enlace y la fecha, y cambiar `ejemplo` a `false` cuando esté verificado.

**Textos para niños:**

- *"¡Aquí abajo nunca ha llegado el Sol! Hace −233 °C: mucho más frío que un congelador."*
- *"Mi linterna gasta batería. ¿Luz fuerte para ver lejos, o luz suave para ahorrar?"*
- *"¡Brilla! Es hielo de agua. Si lo llevamos, después podemos convertirlo en aire para respirar."*
- *"¡GUAU! Chispa te reconoce y mueve la cola."* (Chispa es el robot perro de Itzel.)

**Assets:** fondo del cráter (320×180), tiles de suelo y hielo (16×16, 2 cuadros de brillo), cono o círculo de luz generado en código, collar de Chispa (8×8, 2 cuadros), astronauta (reusar `astro_*`).

**Modo prueba:** `index.html?escena=Crater`, con `prueba: { "mochila": ["oxigeno","linterna"], "energia": 60 }`. Probar también sin linterna (`"mochila": ["oxigeno","escudo"]`).

---

### 3.6 Misión 9 · Hielo que da vida

**Idea:** de regreso en la base de Itzel hay poco aire. El niño excava suelo lunar, descubre que solo una parte es hielo y decide cuánto convertir en oxígeno.

| Concepto | Detalle |
|---|---|
| Archivos | `src/escenas/Hielo.js`, `datos/misiones/hielo.json`, `assets/hielo/` |
| Lee | `hielo_kg`, `oxigeno`, `energia` |
| Escribe | `oxigeno`, `energia`, `hielo_kg`, `misiones.hielo = { baldes, hieloObtenido, convertido }`, `bitacora` |
| Mecánica | (1) Excavar baldes de 10 kg de suelo con un taladro (clic sostenido). (2) Una báscula muestra cuánto hielo salió. (3) Una máquina convierte el hielo en oxígeno con una palanca de "cuánto convertir". |

**Fórmulas:**

- **Hielo por balde** = 10 kg × p, donde p sale al azar con semilla entre 2.7 % y 8.5 % (es 5.6 % ± 2.9 %, la incertidumbre real de la medición), es decir, unos 0.56 kg en promedio. Sirve para enseñar que *los datos reales tienen margen de error*.
- **Costo por balde:** −3 energía (taladro) y −2 O2 (esfuerzo).
- **Química:** 2 H₂O → 2 H₂ + O₂. **1 kg de agua da 0.89 kg de O₂** (16/18).
- **Energía real** de la electrólisis: unos 286 kJ/mol, que son **≈ 4.4 kWh por kg de agua** (mínimo teórico).
- **Equivalencia de juego** (declarada en pantalla como "valor de juego"): 1 kg de hielo convertido da **+10 O2** y cuesta **−12 energía**.
- **Para entender:** una persona respira cerca de **0.84 kg de O₂ al día** (estándar de diseño de NASA, por verificar), así que 1 kg de hielo es aire para casi un día.

**Decisión y costo:** ¿cuántos baldes excavar (oxígeno y energía ahora) y cuánto hielo convertir? Convertir gasta la energía que el Refugio necesitará. Guardar hielo da puntos de ciencia en el Regreso, pero pesa (más combustible).

**Dato NASA:** en 2009, la misión LCROSS chocó en el cráter Cabeus y midió que el material expulsado tenía **5.6 % ± 2.9 % de agua** por masa (Colaprete et al., 2010, *Science*). Cómo obtenerlo: página de la misión LCROSS en nasa.gov o el artículo de *Science*. Guardar el enlace y la fecha 2009-10-09.

**Textos para niños:**

- *"De cada 100 cubetas de tierra lunar, unas 6 son hielo. ¡Hay que excavar mucho!"*
- *"El agua está hecha de hidrógeno y oxígeno. Con electricidad los separamos y… ¡aire para respirar!"*
- *"La máquina gasta mucha batería. ¿Convertimos todo ahora o guardamos energía para la tormenta?"*

**Assets:** fondo del taller con la base (320×180), taladro (32×32, 2 cuadros), balde (16×16), máquina de electrólisis (32×32, 3 cuadros de burbujas), icono de batería (8×8).

**Modo prueba:** `?escena=Hielo`, con `prueba: { "hielo_kg": 1.5, "energia": 50, "oxigeno": 40 }`.

---

### 3.7 Misión 10 · Hablar con la Tierra

**Idea:** los datos de Itzel deben llegar a la Tierra. Desde el polo sur, la Tierra se ve muy baja en el horizonte. Hay que subir a una cresta para verla, elegir la antena de la Red de Espacio Profundo (DSN) que esté mirando a la Luna y enviar el mensaje, que tarda 1.3 s en llegar.

| Concepto | Detalle |
|---|---|
| Archivos | `src/escenas/Antena.js`, `datos/misiones/antena.json`, `assets/antena/` |
| Lee | `oxigeno`, `energia`, `mochila` (radio), `misiones.rescate` (si se reparó la radio en la Misión 8) |
| Escribe | `oxigeno`, `energia`, `estacionDSN`, `mensajeEnviado`, `misiones.antena`, `bitacora` |
| Paso 1 · Subir | Tres alturas: 50, 150 o 300 m. |
| Paso 2 · Antena | Un globo terráqueo que gira con la hora UTC; el niño elige Goldstone, Madrid o Canberra. |
| Paso 3 · Enviar | Un paquete de luz viaja por la pantalla: 1.3 s de ida y 1.3 s de vuelta para la confirmación. |

**Fórmulas:**

- **Horizonte desde una altura h:** el ángulo extra que se ve es `δ = √(2h / R)` radianes, con R = 1737 km (radio lunar). Por ejemplo, h = 300 m da δ ≈ 1.07°. Es una fórmula real y sencilla.
- **¿Se ve la Tierra?** Sí, si `elevaciónTierra + δ > relieveLocal`. La elevación de la Tierra sube y baja durante el mes por la **libración**. En el juego: un valor de −2° a +3° según el "día", con relieve de 0.5°.
- **Costo de subir:** −h/100 O2 (igual que en Ruta). Esperar 1 h a que la Tierra suba cuesta −traje.gasto O2.
- **Antena correcta:** cada complejo mira a la Luna cuando la Luna está "sobre" su lado de la Tierra. Longitudes reales: Goldstone **116.9° O**, Madrid **4.2° O**, Canberra **149.0° E** (unos 120° de separación, para que siempre haya una mirando). Modelo simplificado de juego: longitud sublunar `λ = −15° × (horaUTC − 12) + desfaseFase`. Gana la estación con menor |Δλ|, y es visible si |Δλ| < 75°.
- **Retraso:** 384 400 km ÷ 299 792 km/s ≈ **1.28 s** de ida y unos 2.6 s de ida y vuelta.
- **Envío:** paquete completo −15 energía (llegan todos los datos) o comprimido −5 energía (llega la mitad). Antena equivocada: el mensaje se pierde y reintentar cuesta otra vez la energía.
- **Si la radio se reparó en el Rescate:** el envío cuesta la mitad.

**Decisión y costo:** subir alto cuesta oxígeno pero asegura ver la Tierra; quedarse bajo y esperar cuesta tiempo (oxígeno). Paquete completo contra comprimido es energía contra datos. La antena es una decisión de conocimiento, no de costo, pero equivocarse cuesta.

**Dato NASA:** la Deep Space Network tiene tres complejos (Goldstone en California, Madrid en España y Canberra en Australia). Cómo obtenerlo: **DSN Now** (eyes.nasa.gov/dsn/dsn.html) muestra en vivo qué antena habla con qué nave. Usar una captura con fecha como respaldo sin internet. El retraso de la luz se calcula con la distancia media Tierra–Luna (NASA Moon Fact Sheet).

**Textos para niños:**

- *"Desde aquí la Tierra se asoma apenitas por el horizonte. ¡Si subimos, la veremos mejor!"*
- *"La Tierra gira. ¿Qué antena está mirando hacia nosotros justo ahora?"*
- *"Tu mensaje viaja a la velocidad de la luz… y aun así tarda 1.3 segundos. ¡La Luna está lejísimos!"*

**Assets:** fondo de la cresta con la Tierra en el horizonte (320×180, 3 alturas o un desplazamiento vertical), globo terráqueo (48×48, 8 cuadros de giro), 3 iconos de antena (16×16), paquete de luz (8×8).

**Modo prueba:** `?escena=Antena`, con `prueba: { "energia": 50, "oxigeno": 60, "horaUTC": 20 }`.

---

### 3.8 Misión 11 · El refugio

**Idea:** llega una tormenta de partículas solares (SEP). Todos se resguardan. Cada turno es 1 hora, y el niño reparte poca energía entre aire, calefacción y escudo. Los paneles solares producen poco porque el Sol está casi en el horizonte.

| Concepto | Detalle |
|---|---|
| Archivos | `src/escenas/Refugio.js`, `src/nasa/sep.js` (del dueño, no del núcleo), `datos/misiones/refugio.json`, `assets/refugio/` |
| Lee | `oxigeno`, `energia`, `traje`, `escudo`, `radiacion` |
| Escribe | `oxigeno`, `energia`, `radiacion`, `misiones.refugio = { turnos, reparto[], panelesVerticales }`, `bitacora` |
| Turno 0 | Decidir si salir a poner los paneles en vertical (−5 O2 y +5 de radiación) o dejarlos horizontales. |
| Turnos 1 a 6 | Repartir los puntos de energía disponibles entre tres botones: Aire, Calor y Escudo (0 a 3 cada uno). |

**Fórmulas por turno:**

- **Producción de los paneles:** `Pmax × sin(elevSol)` si están horizontales, o `Pmax × cos(elevSol)` si están verticales, con Pmax = 10. Con el Sol a 1.5°: horizontal ≈ **0.3**, vertical ≈ **10**. Con 7°: horizontal ≈ 1.2, vertical ≈ 9.9.
- **Energía disponible** = batería (`estado.energia`) + producción. Cada punto asignado cuesta 4 de energía.
- **Aire** (puntos a): con a = 0, −6 O2; con a = 1, −3; con a ≥ 2, −1.
- **Calor** (c): con c = 0 hace frío y cuesta −3 O2 extra (tiritar hace respirar más).
- **Escudo** (s): `radiación += dosisSEP × (1 − 0.25·s) × (1 − traje.proteccion)`, con dosisSEP = 15 por hora (valor de juego).

**Decisión y costo:** no alcanza para todo. Aire contra calor contra escudo, cada hora. Salir a poner los paneles verticales cuesta ahora y paga después. Es el mejor ejemplo de "ninguna opción gratis".

**Dato NASA:**

- **Tormenta:** endpoint `https://api.nasa.gov/DONKI/SEP?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD&api_key=CLAVE`. Devuelve `sepID`, `eventTime`, `instruments` y `linkedEvents`. Usar el SEP más reciente; si no hay, uno real guardado con fecha (igual que C-7). DONKI no da la dosis: la dosis sale de RadLab y se etiqueta como valor de juego.
- **El Sol en el horizonte:** según NASA, en el polo sur el Sol se mueve alrededor del horizonte sin pasar de **≈1.5°** (NASA SVS #4944). Una presentación técnica de NASA indica que en muchos sitios de aterrizaje de Artemis **nunca sube más de 7°**. Recomiendo decir "*entre 1.5° y 7°, según el lugar*" y que el juego elija un valor de ese rango, con la fuente.
- **Paneles verticales:** NASA desarrolla paneles solares verticales para el polo sur lunar justamente por eso (programa *Vertical Solar Array Technology*, por verificar).

**Textos para niños:**

- *"¡Alerta! El Sol lanzó partículas muy rápidas. Nos quedamos en el refugio 6 horas."*
- *"Aquí el Sol está tan bajito que casi no calienta los paneles. ¿Y si los ponemos de pie, como girasoles?"*
- *"Tenemos poca batería: ¿más aire, más calor o más escudo esta hora?"*

**Assets:** interior del refugio (320×180), panel solar horizontal y vertical (32×32), 3 iconos de recurso (8×8), partículas de la tormenta (2×2, generadas en código), Itzel sentada (32×32).

**Modo prueba:** `?escena=Refugio`, con `prueba: { "energia": 40, "oxigeno": 70, "radiacion": 20, "traje": "ligero" }`. Probar también `&sinred=1` para el SEP guardado.

---

### 3.9 Misión 12 · Regreso a casa

**Idea:** hay que despegar de la Luna. Lo que se lleve pesa y cuesta combustible. Después viene la reentrada a la Tierra y el amerizaje, inspirados en Artemis II.

| Concepto | Detalle |
|---|---|
| Archivos | `src/escenas/Regreso.js`, `datos/misiones/regreso.json`, `assets/regreso/` |
| Lee | `combustibleRestante` (o `nave.combustible` si es `null`), `hielo_kg`, `chispaEncontrado`, `mensajeEnviado`, `mochila` |
| Escribe | `carga`, `misiones.regreso = { combustibleUsado, intentosReentrada, calorMax, velAmerizaje }`, `bitacora` |
| Parte A · Carga | Báscula con lo que se puede llevar: muestras de hielo (`hielo_kg`), la planta de Chispa (1 kg), rocas (3 kg), el disco de datos (1 kg, solo si no se enviaron en la Misión 10). Itzel, el niño y Chispa siempre van. |
| Parte B · Reentrada | Mantener la cápsula dentro de un "corredor" de ángulo con ↑/↓. Muy plano: rebota contra la atmósfera. Muy inclinado: se calienta demasiado. |
| Parte C · Paracaídas | Abrir primero los pequeños y luego los grandes a la altura correcta, para amerizar suave. |

**Fórmulas:**

- **Combustible para despegar** (ecuación del cohete simplificada): `extra = carga_kg × (e^(Δv/ve) − 1)`, con Δv ≈ 1.87 km/s (despegue lunar al estilo Apollo) y ve ≈ 3 km/s. Eso da e^(0.62) − 1 ≈ **0.86 kg de combustible por cada kg de carga**. Mostrar como "cada kilo extra necesita casi otro kilo de combustible".
- Si `combustibleBase + extra > combustibleRestante`, hay que dejar algo.
- **Reentrada:** velocidad inicial **39 600 km/h**. Corredor de ángulo de juego: entre −5.5° y −7.5° (**valor de juego**, inspirado en los corredores reales de reentrada; por verificar). Calor por segundo = k × (ángulo − ángulo mínimo) × velocidad. Si el calor llega a 100, el escudo térmico falla y se reintenta sin castigo, solo queda en la bitácora.
- **Amerizaje:** la meta es menos de 35 km/h. Artemis II amerizó a unos 30 km/h.

**Decisión y costo:** llevar muestras y la planta (ciencia para el Final) contra combustible. Bajar rápido es menos tiempo con calor pero más riesgo; bajar suave es más tiempo con calor. Enseña que las misiones reales eligen con cuidado qué traer de vuelta.

**Dato NASA:** Orion de **Artemis II** amerizó en el Pacífico, frente a San Diego, el **10 de abril de 2026**. Reentró a unos **39 600 km/h (24 600 mph)** y tocó el agua a unos **30 km/h**. NASA voló una trayectoria más directa e inclinada para cuidar el escudo térmico. Cómo obtenerlo: página de la misión Artemis II en nasa.gov (usar el valor oficial final de velocidad si ya está publicado; las cifras de arriba son de la cobertura de prensa del día).

**Textos para niños:**

- *"Cada kilo que llevemos necesita casi otro kilo de combustible. ¿Qué es lo más importante para traer a casa?"*
- *"¡Entramos a la atmósfera a casi 40 000 km/h! Mantén la cápsula en la franja verde."*
- *"¡Paracaídas! Primero los pequeños… ahora los grandes. ¡Splash!"*

**Assets:** fondo lunar del despegue (reusar el del Aterrizaje), báscula de carga (32×32), cápsula (32×32, con resplandor de 3 cuadros), fondo de atmósfera y océano (320×180), paracaídas (16×16 y 32×32).

**Modo prueba:** `?escena=Regreso`, con `prueba: { "combustibleRestante": 40, "hielo_kg": 2, "chispaEncontrado": true, "mensajeEnviado": false }`.

---

## 4. Plan de trabajo

### 4.1 Antes de repartir: núcleo (todos juntos, ~1.5 h)

| ID | Tarea | Horas | Bloquea a |
|---|---|---|---|
| N-0 | Primer commit, rama por persona, `.gitignore` | 0.25 | todos |
| N-1 | Modo prueba `?escena=` + `ESTADO_PRUEBA` + `&sinred=1` en `Carga.js` | 0.5 | todos |
| N-2 | `estado.js`: campos nuevos, `cambiar()`, `causaDerrota()`, `nuevaPartida()` completo | 0.25 | todos |
| N-3 | `config.js`: `ORDEN`, `siguienteEscena`, `MISIONES_JSON`, linterna de 2 kg | 0.15 | todos |
| N-4 | `MisionBase.js` + `kit.js` (mover sonidos y tarjeta desde Senal y CentroControl) | 0.5 | misiones nuevas |
| N-5 | `ui.js`: `barras` configurable con energía y `datoReal` con enlace | 0.25 | todos |
| N-6 | Revisar juntos la tabla del contrato (sección 3.3) y anotarla en el LEEME | 0.15 | — |

### 4.2 Arreglos urgentes del juego actual (Sprint 1, en paralelo con las misiones)

| Tarea | Dueño sugerido | Horas |
|---|---|---|
| Rebalanceo de `simulacion.js` (2.3) + página de prueba de combinaciones (E-9) | Persona 5 | 1.5 |
| Etiquetas real/ejemplo en Equipo y en Final; fuentes con enlace (A-9) | Leslie (Final) + Shadia (Equipo) | 0.75 |
| Derrota a mitad de partida y Chispa explicando la causa en Final | Leslie | 0.75 |
| Textos escritos en el código → `textos.json` | cada dueño en su escena | 0.25 c/u |
| Usar `chispa_px` en Viaje, Ruta y Rescate | dueños respectivos | 0.1 c/u |

### 4.3 Una misión nueva por persona

La asignación sigue la experiencia que cada persona ya ganó en el juego:

| Persona | Misión nueva | Por qué encaja | Horas aprox. |
|---|---|---|---|
| **Jonathan** | 7 · El cráter oscuro | Ya domina caminar, proximidad y objetos (Centro de Control) | 7 |
| **Persona 5** | 9 · Hielo que da vida | Es la misión con más fórmulas; es dueña del modelo | 6 |
| **Leslie** | 10 · Hablar con la Tierra | Sigue a la decisión de la radio en el Rescate, que es suyo | 7 |
| **Shadia** | 11 · El refugio | Ya conectó DONKI (CME); SEP usa la misma API | 7 |
| **Angel** | 12 · Regreso a casa | Ya hizo la física del Aterrizaje; la reentrada es parecida | 8 |

Cada misión se divide igual que en el backlog:

1. **Debe** (Sprint 1): escena con cuadros de color, decisión con costo, JSON con datos de ejemplo, modo prueba funcionando.
2. **Debería** (Sprint 2): dato NASA real con fuente y enlace, pixel art, textos revisados por otra persona.
3. **Podría** (Sprint 3): sonidos y animaciones; ajuste de números tras probar con un niño.

### 4.4 Orden sugerido

```
1. Núcleo N-0…N-6 (juntos)               ─┐
2. Rebalanceo + derrota + etiquetas        ├─ el juego actual queda "honesto" y perdible
3. Misiones 7, 9, 10, 11, 12 en paralelo  ─┘  (cada una se prueba sola con ?escena=)
4. Unión cada 2 h: jugar la partida completa (modo corto y modo completo)
5. Volver a correr la prueba de combinaciones con todas las misiones
6. Prueba con un niño → ajustar números → publicar en GitHub Pages
```

**Riesgo principal:** 5 misiones nuevas son mucho para lo que queda del hackathon. Si falta tiempo, prioricen **7 (Cráter) y 11 (Refugio)**: son las que más refuerzan la historia y los dos datos NASA más fuertes (Diviner y DONKI SEP). El resto puede entrar como "modo completo" después.

---

## Fuentes consultadas para este informe

- Paige et al. (2010), *Diviner Lunar Radiometer Observations of Cold Traps in the Moon's South Polar Region*, Science: https://openpolar.no/Record/craaas:10.1126%2Fscience.1187726
- Diviner observa el impacto de LCROSS (~40 K antes del impacto): https://phys.org/news/2009-10-diviner-lcross-impact.html
- Space.com, cráteres lunares entre los lugares más fríos: https://www.space.com/7311-moon-craters-coldest-place-solar-system.html
- NASA SVS, la Tierra y el Sol desde el polo sur lunar (Sol a ±1.5°): https://svs.gsfc.nasa.gov/4944
- NASA NTRS, estudio de iluminación para Artemis (Sol a 1–2°): https://ntrs.nasa.gov/citations/20240011393
- NASA NTRS, presentación (Sol < 7° en muchos sitios de aterrizaje): https://ntrs.nasa.gov/api/citations/20230006101/downloads/PowerPoint%20Presentation.pdf
- Artemis II, regreso y amerizaje (Live Science): https://www.livescience.com/space/space-exploration/im-at-a-loss-for-words-artemis-ii-mission-comes-home-to-joy-and-cheers-after-historic-10-day-mission
- Artemis II, reentrada (Scientific American): https://scientificamerican.com/article/watch-live-nasas-artemis-ii-crew-returns-to-earth
- Artemis II, cobertura del amerizaje (Las Vegas Sun / AP): https://lasvegassun.com/news/2026/apr/10/artemis-iis-grand-moon-finale-is-almost-here-with/

Datos que **no** verifiqué en línea y que el dueño de cada misión debe confirmar antes de marcarlos como reales: LCROSS 5.6 % ± 2.9 % (Colaprete et al. 2010), 0.84 kg de O₂ por persona al día, coordenadas de los complejos DSN, Δv del despegue lunar (~1.87 km/s), el programa de paneles verticales y el corredor de ángulo de reentrada.
