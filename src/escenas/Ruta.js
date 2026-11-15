// Misión 6: la ruta hacia Itzel, calculada por el modelo. Dueño: Rol 4 + Rol 2.
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras } from "../ui.js";
import { opcionesDeRuta, aplicar, explicar } from "../modelo/simulacion.js";

export class Ruta extends Phaser.Scene {
  constructor() { super("Ruta"); }

  create() {
    // TODO(Rol 3): mapa en pixel art basado en la zona real de Moon Trek
    this.add.image(0, 0, "fondo_luna").setOrigin(0);
    barras(this, estado);
    titulo(this, estado.textos.ruta.titulo, 30);

    opcionesDeRuta(estado.datos, estado).forEach((op, i) =>
      boton(this, ANCHO / 2, 70 + i * 26, op.texto, () => this.resultado(op), 240));

  }

  resultado(op) {
    aplicar(estado, op.efectos);
    const frase = explicar(op);
    estado.bitacora.push(frase);
    this.children.removeAll(true);
    barras(this, estado);
    this.add.image(ANCHO / 2, 50, "chispa");
    texto(this, ANCHO / 2, 70, frase, { ancho: 260 });
    boton(this, ANCHO / 2, 140, "Continuar", () => this.scene.start("Rescate"));
  }
}
