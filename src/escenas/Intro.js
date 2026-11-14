// Misión 1a: la historia inicial. Dueño: Rol 5 (textos) y Rol 3 (fondos).
import { estado } from "../estado.js";
import { paginas } from "../ui.js";

export class Intro extends Phaser.Scene {
  constructor() { super("Intro"); }

  create() {
    // TODO(Rol 3): un fondo por página (estrellas, TV, base dañada, Control)
    paginas(this, estado.textos.intro, () => this.scene.start("Carta"));
  }
}
