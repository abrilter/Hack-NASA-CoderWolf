// Punto de entrada. Dueño: Rol 1.
import { ANCHO, ALTO, COLOR, ZOOM } from "./config.js";
import { Carga } from "./escenas/Carga.js";
import { Intro } from "./escenas/Intro.js";
import { Carta } from "./escenas/Carta.js";
import { Senal } from "./escenas/Senal.js";
import { CentroControl } from "./escenas/CentroControl.js";
import { Equipo } from "./escenas/Equipo.js";
import { Aterrizaje } from "./escenas/Aterrizaje.js";
import { Ruta } from "./escenas/Ruta.js";
import { Rescate } from "./escenas/Rescate.js";
import { Final } from "./escenas/Final.js";

import { estado } from "./estado.js";
import { ORDEN } from "./config.js";

// Derrota a mitad de partida: si el oxígeno llegó a 0 o la radiación a 100,
// cualquier cambio de escena después de la Carta va directo al Final
// (donde Chispa explica por qué). Así ninguna escena tiene que revisarlo.
// La partida nueva empieza en la Carta (y en "Jugar otra vez").
const iniciarEscena = Phaser.Scenes.ScenePlugin.prototype.start;
Phaser.Scenes.ScenePlugin.prototype.start = function (clave, datos) {
  const i = ORDEN.indexOf(clave);
  if (i > ORDEN.indexOf("Carta") && clave !== "Final" && estado.causaDerrota()) {
    console.info(`[derrota] ${estado.causaDerrota()}: ${clave} → Final`);
    clave = "Final";
  }
  return iniciarEscena.call(this, clave, datos);
};

// Agranda la cámara de cada escena por ZOOM para que el lienzo tenga más
// resolución, sin cambiar las coordenadas (0..320, 0..180) de las escenas.
class ZoomPixel extends Phaser.Plugins.ScenePlugin {
  boot() {
    this.systems.events.on("start", () => {
      this.systems.cameras.main.setZoom(ZOOM).centerOn(ANCHO / 2, ALTO / 2);
      this.systems.arcadePhysics?.world.setBounds(0, 0, ANCHO, ALTO);
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "juego",
  width: ANCHO * ZOOM,
  height: ALTO * ZOOM,
  pixelArt: true,                       // sin suavizado
  backgroundColor: COLOR.fondo,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade" },
  plugins: { scene: [{ key: "ZoomPixel", plugin: ZoomPixel, mapping: "zoomPixel" }] },
  // Orden de la historia (ver Guía de arranque)
  scene: [Carga, Intro, Carta, Equipo, Aterrizaje, CentroControl, Senal, Viaje, Ruta, Rescate, Final]
});
