// Carga dibujos, datos y textos. Dueño: Rol 1.
import { ASSETS, ANCHO, ALTO } from "../config.js";
import { estado } from "../estado.js";
import { cmeReciente } from "../nasa/donki.js";
import { texto } from "../ui.js";

export class Carga extends Phaser.Scene {
  constructor() { super("Carga"); }

  preload() {
    texto(this, ANCHO / 2, ALTO / 2, "Contactando a la NASA...");
    // Si un PNG no existe todavía, no pasa nada: se crea un cuadro de color.
    this.load.on("loaderror", archivo => console.info("[assets] falta", archivo.src, "→ se usa cuadro provisional"));
    ASSETS.forEach(a => this.load.image(a.clave, "assets/" + a.archivo));
    this.load.json("datos", "datos/datos.json");
    this.load.json("textos", "datos/textos.json");
  }

  async create() {
    this.crearProvisionales();
    estado.datos = this.cache.json.get("datos");
    estado.textos = this.cache.json.get("textos");

    const cme = await cmeReciente(30);
    if (cme) { estado.datos.cme = cme; estado.donkiEnVivo = true; }

    this.scene.start("Intro");
  }

  // Cuadro de color del tamaño correcto para cada dibujo que falte
  crearProvisionales() {
    ASSETS.forEach(a => {
      if (this.textures.exists(a.clave)) return;
      const g = this.add.graphics();
      g.fillStyle(a.color).fillRect(0, 0, a.w, a.h);
      g.lineStyle(1, 0x000000, 0.4).strokeRect(0, 0, a.w, a.h);
      g.generateTexture(a.clave, a.w, a.h);
      g.destroy();
    });
  }
}
