// Misión 7: el rescate. Dueño: Rol 2 (pantalla), Rol 4 (efectos), Rol 5 (textos).
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras } from "../ui.js";
import { aplicar } from "../modelo/simulacion.js";

export class Rescate extends Phaser.Scene {
  constructor() { super("Rescate"); }

  create() {
    const t = estado.textos.rescate;
    barras(this, estado);
    this.add.image(130, 70, "itzel");
    this.add.image(160, 78, "chispa");
    titulo(this, t.titulo, 24);
    texto(this, ANCHO / 2, 95, t.pregunta, { ancho: 280 });

    // TODO(Rol 4): revisar costos. Sin kit de radio, reparar cuesta más.
    const costoRadio = estado.lleva("radio") ? -5 : -15;
    boton(this, 85, 135, `Reparar radio (${costoRadio} O2)`, () => this.decidir({ oxigeno: costoRadio }, "Reparaste la radio: los datos llegaron a la Tierra a tiempo."), 140);
    boton(this, 235, 135, "Salir ya", () => this.decidir({}, "Saliste rápido; los datos llegarán al volver."), 140);

    // TODO(Rol 5): mostrar aquí el dato real de la planta de Chispa (OSDR)
  }

  decidir(efectos, nota) {
    aplicar(estado, efectos);
    estado.bitacora.push(nota);
    this.scene.start("Final");
  }
}
