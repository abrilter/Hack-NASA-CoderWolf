// Misión 6: la ruta hacia Itzel, calculada por el modelo. Dueño: Rol 4 + Rol 2.
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras } from "../ui.js";
import { opcionesDeRuta, aplicar, explicar } from "../modelo/simulacion.js";
import { crearTexturasEquipo } from "../pixelart.js";

const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

export class Ruta extends Phaser.Scene {
  constructor() { super("Ruta"); }

  create() {
    crearTexturasEquipo(this);
    const t = estado.textos.ruta;
    const opciones = opcionesDeRuta(estado.datos, estado);

    // TODO(Rol 3): mapa en pixel art basado en la zona real de Moon Trek
    this.add.image(0, 0, "fondo_luna").setOrigin(0);
    barras(this, estado);
    titulo(this, t.titulo, 26);
    texto(this, ANCHO / 2, 44, llenar(t.tormenta, { horas: Math.max(0, Math.round(opciones[0].hT)) }),
      { tam: 7, color: "#ff8a5c" });

    opciones.forEach((op, i) => {
      const etiqueta = op.id === "refugio"
        ? llenar(t.boton_refugio, { horas: Math.round(op.hR) })
        : llenar(t.boton, { nombre: op.nombre, km: op.km, horas: Math.round(op.hR) });
      boton(this, ANCHO / 2, 74 + i * 26, etiqueta, () => this.resultado(op), 240);
    });

  }

  resultado(op) {
    aplicar(estado, op.efectos);
    const frase = explicar(op, estado.textos.ruta);
    estado.bitacora.push(frase);
    this.children.removeAll(true);
    barras(this, estado);
    this.add.image(ANCHO / 2, 50, "chispa_px");
    texto(this, ANCHO / 2, 70, frase, { ancho: 260 });
    boton(this, ANCHO / 2, 140, "Continuar", () => this.scene.start("Rescate"));
  }
}
