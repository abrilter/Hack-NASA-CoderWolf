// Punto de entrada. Dueño: Rol 1.
import { ANCHO, ALTO, COLOR, ZOOM } from "./config.js";
import { Carga } from "./escenas/Carga.js";
import { Intro } from "./escenas/Intro.js";
import { Carta } from "./escenas/Carta.js";
import { Senal } from "./escenas/Senal.js";
import { CentroControl } from "./escenas/CentroControl.js";
import { Equipo } from "./escenas/Equipo.js";
import { Viaje } from "./escenas/Viaje.js";
import { Aterrizaje } from "./escenas/Aterrizaje.js";
import { Ruta } from "./escenas/Ruta.js";
import { Rescate } from "./escenas/Rescate.js";
import { Final } from "./escenas/Final.js";

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
  scene: [Carga, Intro, Carta, Senal, CentroControl, Equipo, Viaje, Aterrizaje, Ruta, Rescate, Final]
});
