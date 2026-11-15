// Misión 7: el rescate. Dueño: Rol 2 (pantalla), Rol 4 (efectos), Rol 5 (textos).
// Chispa trae una planta que creció en la base: su historia es un estudio real
// de NASA OSDR (OSD-476, plantas sembradas en suelo lunar del Apolo).
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal } from "../ui.js";
import { aplicar, costosRescate } from "../modelo/simulacion.js";
import { crearTexturasEquipo, crearTexturasItzel } from "../pixelart.js";

const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

export class Rescate extends Phaser.Scene {
  constructor() { super("Rescate"); }

  create() {
    crearTexturasEquipo(this);
    crearTexturasItzel(this);
    const t = estado.textos.rescate;
    barras(this, estado);
    titulo(this, t.titulo, 24);

    // Itzel (parpadea y respira), Chispa y la planta que Chispa cuidó en la base
    const itzel = this.add.image(122, 86, "itzel_0").setOrigin(0.5, 1);
    this.add.ellipse(122, 86, 16, 3, 0x1a1c2c, 0.4).setDepth(-1);
    this.tweens.add({ targets: itzel, scaleY: 1.03, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.addEvent({ delay: 2800, loop: true, callback: () => {
      itzel.setTexture("itzel_1");
      this.time.delayedCall(160, () => itzel.setTexture("itzel_0"));
    } });
    this.add.image(160, 78, "chispa_px");
    const planta = this.add.image(182, 86, "planta").setOrigin(0.5, 1).setScale(1.5)
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => this.tarjetaPlanta());
    this.tweens.add({ targets: planta, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const verPlanta = texto(this, 214, 64, t.planta_boton, { tam: 6, color: "#5cff8a", origenX: 0 })
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => this.tarjetaPlanta());
    this.tweens.add({ targets: verPlanta, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    // Itzel se lastimó: con botiquín se cura; sin él, el regreso es más lento
    const herida = estado.lleva("botiquin") ? t.herida_si
      : llenar(t.herida_no, { costo: estado.datos.modelo.sin_botiquin_o2 });
    texto(this, ANCHO / 2, 96, herida, { tam: 6, ancho: 280, color: "#ffcd75" });
    texto(this, ANCHO / 2, 112, t.pregunta, { tam: 7, ancho: 280 });

    const reparar = costosRescate(estado.datos, estado, true).oxigeno - costosRescate(estado.datos, estado, false).oxigeno;
    boton(this, 85, 146, llenar(t.reparar, { costo: reparar }), () => this.decidir(true, t.nota_reparar), 140);
    boton(this, 235, 146, t.salir, () => this.decidir(false, t.nota_salir), 140);

    datoReal(this, estado.datos.planta);

    // La primera vez, Chispa presenta su planta
    this.time.delayedCall(500, () => this.tarjetaPlanta());
  }

  // Tarjeta con el estudio real; se cierra con un clic en cualquier parte
  tarjetaPlanta() {
    if (this.tarjeta) return;
    const t = estado.textos.rescate, p = estado.datos.planta;
    const c = this.add.container(0, 0).setDepth(1000);
    const fondo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.75).setOrigin(0).setInteractive();
    c.add([
      fondo,
      this.add.rectangle(ANCHO / 2 + 3, 25, 260, 128, 0x0b1026, 0.8).setOrigin(0.5, 0),
      this.add.rectangle(ANCHO / 2, 22, 260, 128, COLOR.panel).setOrigin(0.5, 0).setStrokeStyle(1, 0x5cff8a),
      this.add.image(52, 64, "planta").setScale(2.5).setOrigin(0.5, 1),
      this.add.image(52, 82, "chispa_px"),
      texto(this, 72, 28, t.planta_titulo, { tam: 8, color: COLOR.titulo, origenX: 0, align: "left" }),
      texto(this, 72, 42, t.planta_texto, { tam: 6, ancho: 210, origenX: 0, align: "left" })
    ]);
    const fuente = texto(this, ANCHO / 2, 126, `${p.ejemplo ? "DATO DE EJEMPLO" : "Dato real"} · ${p.fuente} · ${p.fecha} ↗`,
      { tam: 5, color: "#5cff8a", ancho: 250 });
    if (p.link) {
      fuente.setInteractive({ useHandCursor: true })
        .on("pointerdown", (ptr, lx, ly, ev) => { ev?.stopPropagation(); window.open(p.link, "_blank", "noopener"); });
    }
    c.add([fuente, texto(this, ANCHO / 2, 138, t.planta_cerrar, { tam: 5, color: COLOR.tenue })]);
    fondo.on("pointerdown", () => { c.destroy(); this.tarjeta = null; });
    this.tarjeta = c;
  }

  decidir(repararRadio, nota) {
    if (this.tarjeta) return;
    aplicar(estado, costosRescate(estado.datos, estado, repararRadio));
    estado.bitacora.push(nota);
    if (!estado.lleva("botiquin")) estado.bitacora.push(estado.textos.rescate.nota_herida);
    estado.bitacora.push(estado.textos.rescate.nota_planta);
    this.scene.start("Final");
  }
}
