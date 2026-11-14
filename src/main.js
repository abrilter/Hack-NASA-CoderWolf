// Punto de entrada. Dueño: Rol 1.
import { ANCHO, ALTO, COLOR } from "./config.js";
import { Carga } from "./escenas/Carga.js";
import { Intro } from "./escenas/Intro.js";
import { Carta } from "./escenas/Carta.js";
import { CentroControl } from "./escenas/CentroControl.js";
import { Equipo } from "./escenas/Equipo.js";
import { Viaje } from "./escenas/Viaje.js";
import { Aterrizaje } from "./escenas/Aterrizaje.js";
import { Ruta } from "./escenas/Ruta.js";
import { Rescate } from "./escenas/Rescate.js";
import { Final } from "./escenas/Final.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "juego",
  width: ANCHO,
  height: ALTO,
  pixelArt: true,                       // sin suavizado
  backgroundColor: COLOR.fondo,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade" },
  // Orden de la historia (ver Guía de arranque)
  scene: [Carga, Intro, Carta, CentroControl, Equipo, Viaje, Aterrizaje, Ruta, Rescate, Final]
});
