// Misión 7: el rescate. Dueño: Rol 5 (Rol 2 pantalla, Rol 4 efectos).
// El niño encuentra a Itzel agotada y con poco aire. Pasos:
//  0. Encuentro: Itzel habla (dato real de OSDR sobre la Estación Espacial:
//     es contexto, no algo que le pasó en la Luna) y Chispa muestra su planta.
//  1. Aire: compartir tu tanque con una manguera (los dos siguen; tu oxígeno
//     baja bastante) o dejarle tu reserva y volver por otra (ella espera sola;
//     cuesta tiempo y radiación si la tormenta sigue).
//  2. Regreso: en el rover (rápido, gasta más) o caminando a su paso (lento,
//     gasta oxígeno de los dos). Sin rover (se dejó en las rocas), solo caminar.
//  3. Radio: repararla para avisar a la Tierra o salir ya → Final.
// Los costos dependen del oxígeno que queda y de cómo terminó la tormenta
// (modelo/simulacion.js → opcionesRescate; números en datos.json → rescate_aire).
// Escribe: oxigeno, radiacion, bitacora. Modo prueba: index.html?escena=Rescate
// (&sinrover=1 para probar sin rover).
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal } from "../ui.js";
import { aplicar, costosRescate, opcionesRescate } from "../modelo/simulacion.js";
import { crearTexturasEquipo, crearTexturasItzel } from "../pixelart.js";

const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

export class Rescate extends Phaser.Scene {
  constructor() { super("Rescate"); }

  create() {
    crearTexturasEquipo(this);
    crearTexturasItzel(this);
    if (estado.modoPrueba && new URLSearchParams(location.search).has("sinrover")) estado.misiones.rocas = { dejoRover: true };
    this.t = estado.textos.rescate;
    this.barras = this.add.container(0, 0);
    this.pintarBarras();
    titulo(this, this.t.titulo, 24);

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
    const verPlanta = texto(this, 214, 64, this.t.planta_boton, { tam: 6, color: "#5cff8a", origenX: 0 })
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => this.tarjetaPlanta());
    this.tweens.add({ targets: verPlanta, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    this.paso(0);
    // La primera vez, Chispa presenta su planta
    this.time.delayedCall(500, () => this.tarjetaPlanta());
  }

  pintarBarras() {
    this.barras.removeAll(true);
    const antes = this.children.list.length;
    barras(this, estado);
    this.barras.add(this.children.list.slice(antes));
  }

  // Cada paso dibuja su texto y sus botones en una capa que se cambia
  paso(n) {
    this.capa?.destroy();
    this.capa = this.add.container(0, 0);
    this.etiqueta?.destroy();
    const t = this.t, c = this.capa;
    if (n === 0) {
      c.add([
        texto(this, ANCHO / 2, 92, t.encuentro, { tam: 7, ancho: 290, color: "#ffcd75" }),
        texto(this, ANCHO / 2, 106, t.itzel_dice, { tam: 6, ancho: 290 })
      ]);
      this.boton(ANCHO / 2, 146, t.seguir, () => this.paso(1), 120);
      this.etiqueta = datoReal(this, estado.datos.itzel_estacion);
      return;
    }
    this.etiqueta = datoReal(this, estado.datos.planta);
    const ops = opcionesRescate(estado.datos, estado), tor = estado.misiones.tormenta;
    if (n === 1) this.dosOpciones(t.aire_pregunta, t.aire, ops.aire, (id, op) => this.decidir("aire", id, op, 2));
    if (n === 2) {
      const pie = estado.lleva("botiquin") ? t.herida_si : llenar(t.herida_no, { costo: estado.datos.modelo.sin_botiquin_o2 });
      this.dosOpciones(t.regreso_pregunta, t.regreso, ops.regreso, (id, op) => this.decidir("regreso", id, op, 3),
        ops.regreso.rover.disponible ? pie : t.sin_rover);
    }
    if (n === 3) {
      c.add(texto(this, ANCHO / 2, 108, t.pregunta, { tam: 7, ancho: 280 }));
      const reparar = costosRescate(estado.datos, estado, true).oxigeno - costosRescate(estado.datos, estado, false).oxigeno;
      this.boton(85, 146, llenar(t.reparar, { costo: reparar }), () => this.final(true, t.nota_reparar), 140);
      this.boton(235, 146, t.salir, () => this.final(false, t.nota_salir), 140);
    }
    if (n === 1 && tor?.tormentaPendiente) c.add(texto(this, ANCHO / 2, 103, t.tormenta_sigue, { tam: 6, color: "#ff8a5c" }));
  }

  // Pregunta con dos opciones: cada una muestra lo que gana, lo que cuesta y sus números
  dosOpciones(pregunta, textos, ops, alElegir, nota) {
    const c = this.capa;
    c.add(texto(this, ANCHO / 2, 92, pregunta, { tam: 7, ancho: 290 }));
    if (nota) c.add(texto(this, ANCHO / 2, 103, nota, { tam: 6, ancho: 290, color: "#ffcd75" }));
    Object.entries(ops).forEach(([id, op], i) => {
      const x = i ? 235 : 85, info = textos[id], e = op.efectos;
      const costo = e.radiacion > 0 ? llenar(this.t.costo_rad, { o2: e.oxigeno, rad: e.radiacion }) : llenar(this.t.costo, { o2: e.oxigeno });
      c.add([
        texto(this, x, 112, info.gana, { tam: 6, ancho: 145, color: "#5cff8a" }),
        texto(this, x, 121, info.cuesta, { tam: 6, ancho: 145, color: "#ff8a5c" }),
        texto(this, x, 131, costo, { tam: 6, ancho: 145, color: "#eef1ff" })
      ]);
      const b = this.boton(x, 150, info.nombre, () => alElegir(id, op), 136);
      if (op.disponible === false) { b.caja.disableInteractive().setAlpha(0.35); b.etiqueta.setAlpha(0.45); }
    });
  }

  boton(x, y, txt, fn, ancho) {
    const b = boton(this, x, y, txt, () => { if (!this.tarjeta) fn(); }, ancho);
    this.capa.add([b.caja, b.etiqueta]);
    return b;
  }

  decidir(tipo, id, op, siguiente) {
    aplicar(estado, op.efectos);
    estado.bitacora.push(llenar(this.t["nota_" + tipo][id], { o2: op.efectos.oxigeno, rad: op.efectos.radiacion }));
    this.pintarBarras();
    if (estado.causaDerrota()) return this.scene.start("Final");
    this.paso(siguiente);
  }

  final(repararRadio, nota) {
    aplicar(estado, costosRescate(estado.datos, estado, repararRadio));
    estado.bitacora.push(nota);
    if (!estado.lleva("botiquin")) estado.bitacora.push(this.t.nota_herida);
    estado.bitacora.push(this.t.nota_planta);
    this.scene.start("Final");
  }

  // Tarjeta con el estudio real; se cierra con un clic en cualquier parte
  tarjetaPlanta() {
    if (this.tarjeta) return;
    const t = this.t, p = estado.datos.planta;
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
}
