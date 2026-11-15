// MODO PRUEBA de la escena Equipo (Misión 3). Abre pruebas/equipo.html con Live Server.
// Carga los datos y textos, arma una mochila de prueba y arranca solo esta escena.
//   pruebas/equipo.html            → mochila sin tanque (estación de oxígeno apagada)
//   pruebas/equipo.html?tanque=1   → mochila con tanque (estación encendida, +20 O2)
import { ANCHO, ALTO, COLOR, ZOOM } from "../src/config.js";
import { estado } from "../src/estado.js";
import { Equipo } from "../src/escenas/Equipo.js";
import { texto } from "../src/ui.js";

const conTanque = new URLSearchParams(location.search).get("tanque") === "1";

class CargaPrueba extends Phaser.Scene {
  constructor() { super("CargaPrueba"); }
  preload() {
    this.load.json("datos", "../datos/datos.json");
    this.load.json("textos", "../datos/textos.json");
    // los dibujos de assets/ no hacen falta: Equipo usa sus propias figuras
  }
  create() {
    estado.datos = this.cache.json.get("datos");
    estado.textos = this.cache.json.get("textos");
    estado.nuevaPartida();
    estado.mochila = conTanque ? ["oxigeno", "radio"] : ["radio", "linterna"];
    console.info("[prueba] mochila:", estado.mochila.join(", "), "· oxígeno:", estado.oxigeno);
    this.scene.start("Equipo");
  }
}

// Reemplaza a la Misión 4: muestra lo que Equipo dejó en el estado compartido
class Viaje extends Phaser.Scene {
  constructor() { super("Viaje"); }
  create() {
    const r = `Traje: ${estado.traje?.id} · Nave: ${estado.nave?.id} · Oxígeno: ${estado.oxigeno}`;
    console.info("[prueba] fin de la Misión 3 →", r, estado.bitacora);
    texto(this, ANCHO / 2, 70, "Fin de la prueba (aquí empezaría la Misión 4)");
    texto(this, ANCHO / 2, 90, r, { tam: 7, color: COLOR.tenue });
  }
}

// Mismo zoom que el juego (ver src/main.js)
class ZoomPixel extends Phaser.Plugins.ScenePlugin {
  boot() {
    this.systems.events.on("start", () => this.systems.cameras.main.setZoom(ZOOM).centerOn(ANCHO / 2, ALTO / 2));
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: "juego",
  width: ANCHO * ZOOM, height: ALTO * ZOOM, pixelArt: true, backgroundColor: COLOR.fondo,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  plugins: { scene: [{ key: "ZoomPixel", plugin: ZoomPixel, mapping: "zoomPixel" }] },
  scene: [CargaPrueba, Equipo, Viaje]
});
