// Misión 4: alerta solar con dato real de DONKI. Dueño: Rol 2 + Rol 4.
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras } from "../ui.js";
import { horasDeLlegada, aplicar } from "../modelo/simulacion.js";

export class Viaje extends Phaser.Scene {
  constructor() { super("Viaje"); }

  create() {
    const cme = estado.datos.cme;
    const t = estado.textos.viaje;
    const horas = Math.round(horasDeLlegada(cme.velocidad_kms));

    barras(this, estado);
    this.add.image(ANCHO - 20, 20, "chispa");
    titulo(this, t.titulo, 30);
    texto(this, ANCHO / 2, 55, t.aviso.replace("{velocidad}", cme.velocidad_kms).replace("{horas}", horas), { ancho: 280 });

    // TODO(Rol 3): destello de tormenta solar animado
    this.cameras.main.flash(300, 255, 200, 100);

    boton(this, 85, 125, "Cargar escudo (-10 O2)", () => this.decidir({ escudo: 30, oxigeno: -10 }, "Cargaste el escudo."), 140);
    boton(this, 235, 125, "Ahorrar energía", () => this.decidir({}, "Ahorraste energía."), 140);
  }

  decidir(efectos, nota) {
    aplicar(estado, efectos);
    estado.bitacora.push(nota);
    this.scene.start("Aterrizaje");
  }
}
