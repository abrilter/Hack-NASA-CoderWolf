// Final: resultado, bitácora y fuentes NASA. Dueño: Rol 5.
import { ANCHO, COLOR } from "../config.js";
import { estado, LIMITE_RADIACION } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";

export class Final extends Phaser.Scene {
  constructor() { super("Final"); }

  create() {
    const exito = estado.oxigeno > 0 && estado.radiacion < LIMITE_RADIACION;
    const t = estado.textos.final;

    titulo(this, exito ? "Misión cumplida!" : "La misión regresó", 8);
    texto(this, ANCHO / 2, 26, `${estado.nombreClave}: ${exito ? t.exito : t.fallo}`, { ancho: 290 });
    texto(this, ANCHO / 2, 56, estado.bitacora.map(b => "- " + b).join("\n"), { tam: 6, ancho: 290, align: "left" });

    const d = estado.datos;
    texto(this, ANCHO / 2, 138,
      `Ciencia real: ${d.cme.fuente} (${d.cme.fecha}) · ${d.radiacion.fuente} · ${d.rutas_fuente} · ${d.planta.fuente}`,
      { tam: 6, color: COLOR.tenue, ancho: 300 });

    // TODO(Rol 3 + Rol 5): pantalla para diseñar la insignia de misión
    boton(this, ANCHO / 2, 165, "Jugar otra vez", () => this.scene.start("CentroControl"));
  }
}
