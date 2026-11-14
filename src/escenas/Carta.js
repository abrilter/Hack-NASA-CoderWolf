// Misión 1b: la carta al Control de Misión. Dueño: Rol 5.
// Sin datos personales: el niño elige un nombre clave y un motivo con botones.
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";

export class Carta extends Phaser.Scene {
  constructor() { super("Carta"); }

  create() {
    const t = estado.textos.carta;
    titulo(this, t.pregunta_nombre, 20);
    t.nombres.forEach((n, i) =>
      boton(this, ANCHO / 2, 55 + i * 24, n, () => this.motivo(n), 110));
  }

  motivo(nombre) {
    estado.nombreClave = nombre;
    this.children.removeAll(true);
    const t = estado.textos.carta;
    titulo(this, t.pregunta_motivo, 20);
    t.motivos.forEach((m, i) =>
      boton(this, ANCHO / 2, 60 + i * 26, m.texto, () => this.respuesta(m), 220));
  }

  respuesta(m) {
    this.children.removeAll(true);
    titulo(this, "Control de Misión responde", 20);
    texto(this, ANCHO / 2, 55, `${m.respuesta}\n\n${estado.nombreClave}, ${estado.textos.carta.elegido}`, { ancho: 280 });
    boton(this, ANCHO / 2, 150, "Ir al Centro de Control", () => this.scene.start("CentroControl"), 160);
  }
}
