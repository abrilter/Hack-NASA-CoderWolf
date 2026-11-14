// Misión 5: minijuego de aterrizaje. Dueño: Rol 2.
// Gravedad lunar real 1.62 m/s². Mantener presionado (o flecha arriba) = propulsor.
import { ANCHO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto, titulo, boton } from "../ui.js";

const GRAVEDAD_LUNA = 1.62;   // m/s²
const PX_POR_METRO = 5;
const SUELO = 160;
const VEL_SEGURA = 15;         // m/s

export class Aterrizaje extends Phaser.Scene {
  constructor() { super("Aterrizaje"); }

  create() {
    this.add.image(0, 0, "fondo_luna").setOrigin(0);
    this.add.rectangle(ANCHO / 2, SUELO + 10, ANCHO, 20, COLOR.suelo);
    this.nave = this.add.image(ANCHO / 2, 20, "nave");
    // TODO(Rol 3): fuego del propulsor (2 cuadros) debajo de la nave

    this.vy = 0;
    this.combustible = estado.nave.combustible;
    this.empuje = 4.2 * estado.nave.agilidad;
    this.terminado = false;

    texto(this, ANCHO / 2, 4, estado.textos.aterrizaje.instruccion, { tam: 7 });
    this.info = texto(this, 4, 16, "", { tam: 7, origenX: 0, align: "left" });

    this.presionado = false;
    this.input.on("pointerdown", () => (this.presionado = true));
    this.input.on("pointerup", () => (this.presionado = false));
    this.teclas = this.input.keyboard.createCursorKeys();
  }

  update(_, ms) {
    if (this.terminado) return;
    const dt = ms / 1000;
    const frena = (this.presionado || this.teclas.up.isDown) && this.combustible > 0;
    this.vy += GRAVEDAD_LUNA * dt;
    if (frena) { this.vy -= this.empuje * dt; this.combustible -= 20 * dt; }
    this.nave.y += this.vy * PX_POR_METRO * dt;
    this.info.setText(`Vel: ${this.vy.toFixed(1)} m/s\nComb: ${Math.max(0, Math.round(this.combustible))}`);
    if (this.nave.y >= SUELO - 16) this.fin();
  }

  fin() {
    this.terminado = true;
    const t = estado.textos.aterrizaje;
    const ok = this.vy <= VEL_SEGURA;
    titulo(this, ok ? "Aterrizaje!" : "Ups!", 60);
    texto(this, ANCHO / 2, 80, ok ? t.exito : t.fallo, { ancho: 260 });
    if (ok) {
      estado.bitacora.push("Aterrizaste en el polo sur lunar.");
      boton(this, ANCHO / 2, 130, "Buscar a Itzel", () => this.scene.start("Ruta"));
    } else {
      estado.oxigeno -= 5;
      boton(this, ANCHO / 2, 130, "Reintentar (-5 O2)", () => this.scene.restart(), 140);
    }
  }
}
