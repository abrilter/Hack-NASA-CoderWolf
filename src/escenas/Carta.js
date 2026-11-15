// Misión 1b: la carta al Control de Misión. Dueño: Rol 5.
// Sin datos personales: el niño elige un nombre clave y un motivo con botones.
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";
import { estrellas } from "./Intro.js";
import { crearTexturasEquipo } from "../pixelart.js";

export class Carta extends Phaser.Scene {
  constructor() { super("Carta"); }

  create() {
    crearTexturasEquipo(this);
    estrellas(this, 40);
    const t = estado.textos.carta;
    titulo(this, t.pregunta_nombre, 20);
    t.nombres.forEach((n, i) =>
      boton(this, ANCHO / 2, 55 + i * 24, n, () => this.motivo(n), 110));
  }

  motivo(nombre) {
    estado.nombreClave = nombre;
    this.tweens.killAll();
    this.children.removeAll(true);
    estrellas(this, 40);
    const t = estado.textos.carta;
    titulo(this, t.pregunta_motivo, 20);
    t.motivos.forEach((m, i) =>
      boton(this, ANCHO / 2, 60 + i * 26, m.texto, () => this.respuesta(m), 220));
  }

  respuesta(m) {
    this.tweens.killAll();
    this.children.removeAll(true);
    estrellas(this, 40);
    titulo(this, "Control de Misión responde", 20);
    texto(this, ANCHO / 2, 55, `${m.respuesta}\n\n${estado.nombreClave}, ${estado.textos.carta.elegido}`, { ancho: 280 });
    boton(this, ANCHO / 2, 150, "Ir al Centro de Control", () => this.scene.start("Senal"), 160);
    // el niño elegido salta de alegría junto a Chispa
    const nino = this.add.image(40, 162, "astro_base_0").setOrigin(0.5, 1);
    const chispa = this.add.image(280, 150, "chispa_px");
    this.tweens.add({ targets: nino, y: 152, duration: 300, yoyo: true, repeat: -1, ease: "Quad.easeOut" });
    this.tweens.add({ targets: chispa, y: 144, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.cameras.main.flash(300, 255, 212, 92);
  }
}
