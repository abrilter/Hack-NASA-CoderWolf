// Misión 3: traje y nave. Dueño: Rol 2 (pantalla) y Rol 4 (números).
import { ANCHO } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";

// TODO(Rol 4): ajustar valores para que ninguna opción sea mejor en todo
const TRAJES = [
  { nombre: "Blindado", proteccion: 0.3, gastoO2: 2.5, desc: "Protege más, gasta más oxígeno" },
  { nombre: "Ligero",   proteccion: 0.1, gastoO2: 1.6, desc: "Gasta menos, protege menos" }
];
const NAVES = [
  { nombre: "Grande",  agilidad: 0.8, combustible: 140, oxigenoExtra: 20, desc: "+20 oxígeno, lenta" },
  { nombre: "Pequeña", agilidad: 1.3, combustible: 90,  oxigenoExtra: 0,  desc: "Ágil, lleva menos" }
];

export class Equipo extends Phaser.Scene {
  constructor() { super("Equipo"); }

  create() {
    this.elegir(estado.textos.equipo.traje_titulo, TRAJES, t => {
      estado.traje = t;
      this.elegir(estado.textos.equipo.nave_titulo, NAVES, n => {
        estado.nave = n;
        estado.oxigeno += n.oxigenoExtra;
        if (estado.lleva("oxigeno")) estado.oxigeno += 20;   // objeto de la mochila
        this.scene.start("Viaje");
      });
    });
  }

  elegir(t, opciones, alElegir) {
    this.children.removeAll(true);
    titulo(this, t, 16);
    opciones.forEach((o, i) => {
      const x = ANCHO / 4 + i * ANCHO / 2;
      // TODO(Rol 3): mostrar el dibujo del traje / nave encima del botón
      boton(this, x, 80, o.nombre, () => alElegir(o), 110);
      texto(this, x, 96, o.desc, { tam: 7, ancho: 130 });
    });
  }
}
