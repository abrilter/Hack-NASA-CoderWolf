// Misión: el campo de rocas. Dueño: Rol 2 (Shadia).
// Lee: traje, mochila, oxigeno, datos.rocas · Escribe: oxigeno, mochila (lo que se suelta),
// bitacora y estado.misiones.rocas = { eleccion, dejoRover, oxigeno, soltados } · Sigue: Tormenta.
// El rover llega a un campo de rocas grandes que no puede cruzar:
//  - Rodear con el rover: seguro y largo (gasta más oxígeno), el rover sigue.
//  - Cruzar a pie: corto, pero el oxígeno sube con lo que se carga (mochila +
//    traje) y más con el traje blindado. El rover se queda: en la Tormenta no hay
//    refugio bajo el rover y el regreso es caminando (modelo: tieneRover).
// Antes de cruzar a pie se pueden soltar objetos de la mochila (se pierden para
// el resto de la misión). En la Luna todo pesa la sexta parte (dato real).
// Modo prueba: index.html?escena=Rocas (&traje=blindado&mochila=oxigeno,radio,botiquin).
import { ANCHO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal, llenar, navegarConTeclado } from "../ui.js";
import { opcionesRocas } from "../modelo/simulacion.js";
import { crearTexturasEquipo, crearTexturasMochila } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";

// Ilustración a pantalla completa (la información va encima, en el cielo)
const ESCENA = { y1: 32, y2: 132 };
const SUELO = 122;
const ROVER = { x: 44, y: SUELO };
// Rocas del campo: [x, base, ancho, alto]
const ROCAS = [[112, SUELO, 24, 18], [136, SUELO, 18, 28], [158, SUELO, 28, 22], [182, SUELO, 20, 30], [204, SUELO, 26, 20], [226, SUELO, 18, 14]];
const SALTOS = [[106, 104], [134, 94], [158, 100], [182, 90], [206, 102], [228, 108], [258, SUELO]];   // por encima de las rocas
const PANEL_IZQ = { x: 4, y: 36, w: 150, h: 42 }, PANEL_DER = { x: 166, y: 36, w: 150, h: 56 };

export class Rocas extends Phaser.Scene {
  constructor() { super("Rocas"); }

  create() {
    navegarConTeclado(this);                       // flechas + Enter (ver ui.js)
    this.t = estado.textos.rocas;
    this.marcada = null;                           // Phaser reutiliza la escena: se reinicia aquí
    this.listo = false;
    this.saliendo = false;
    this.soltados = [];
    crearTexturasEquipo(this);
    crearTexturasMochila(this);
    crearTexturasExterior(this);

    barras(this, estado);
    titulo(this, this.t.titulo, 4);
    texto(this, ANCHO / 2, 21, this.t.intro, { tam: 6, ancho: 300, color: "#ffcd75" });
    this.dibujar();
    this.crearMochila();
    this.crearPanel();
    datoReal(this, estado.datos.rocas);
    this.mostrar();
  }

  // ---------------------------------------------------------------- ilustración
  dibujar() {
    const g = this.add.graphics(), { y1, y2 } = ESCENA;
    g.fillStyle(0x05070f).fillRect(0, y1, ANCHO, y2 - y1);
    for (let i = 0; i < 46; i++) g.fillStyle(0x94b0c2).fillRect((i * 41) % ANCHO, y1 + 2 + ((i * 17) % 56), 1, 1);
    // la Tierra baja en el horizonte (polo sur)
    g.fillStyle(0x1d2b53).fillCircle(300, 96, 6); g.fillStyle(0x29adff).fillCircle(299, 96, 5); g.fillStyle(0x38b764).fillRect(297, 94, 2, 2);
    // colinas lejanas y suelo
    for (let x = 0; x < ANCHO; x++) {
      const h = Math.round(8 + 4 * Math.sin(x / 19) + 2 * Math.sin(x / 7));
      g.fillStyle(0x29366f).fillRect(x, SUELO - 14 - h, 1, h + 14);
    }
    g.fillStyle(0x94b0c2).fillRect(0, SUELO, ANCHO, y2 - SUELO);
    g.fillStyle(0xc2c3c7).fillRect(0, SUELO, ANCHO, 1);
    for (let x = 2; x < ANCHO; x += 5) g.fillStyle(0x8796b0).fillRect(x, SUELO + 3 + (x % 3) * 2, 1, 1);
    // rocas: sombra larga (Sol bajo), cuerpo y lado iluminado
    ROCAS.forEach(([x, base, w, h]) => {
      g.fillStyle(0x333c57, 0.8).fillEllipse(x + w * 0.6, base + 2, w * 1.6, 5);
      g.fillStyle(0x1a1c2c).fillEllipse(x, base - h / 2, w + 2, h + 2);
      g.fillStyle(0x566c86).fillEllipse(x, base - h / 2, w, h);
      g.fillStyle(0x94b0c2).fillEllipse(x - w / 5, base - h * 0.62, w * 0.45, h * 0.4);
    });
    // Itzel espera al otro lado (lucecita)
    const luz = this.add.circle(282, SUELO - 6, 2, 0xfff27a);
    this.tweens.add({ targets: luz, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // rover detenido y el astronauta junto a él
    this.rover = this.add.container(ROVER.x, ROVER.y);
    this.rover.add([this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), this.add.image(-13, -6, "rover_rueda"), this.add.image(11, -6, "rover_rueda")]);
    this.astro = this.add.image(ROVER.x + 34, SUELO, `astro_${estado.traje?.id || "ligero"}_0`).setOrigin(0.5, 1).setScale(0.5);

    // paneles semitransparentes en el cielo
    [PANEL_IZQ, PANEL_DER].forEach(P => this.add.rectangle(P.x, P.y, P.w, P.h, COLOR.panel, 0.82).setOrigin(0).setStrokeStyle(1, COLOR.borde));
  }

  // ---------------------------------------------------------------- mochila: peso y soltar objetos
  crearMochila() {
    const P = PANEL_IZQ;
    this.textoCarga = texto(this, P.x + 4, P.y + 3, "", { tam: 5, ancho: P.w - 8, origenX: 0, align: "left" });
    const nombres = estado.textos.centro_control?.nombres || {};
    this.iconos = (estado.mochila || []).map((id, i) => {
      const x = P.x + 12 + i * 21, y = P.y + P.h - 10;
      const caja = this.add.rectangle(x, y, 18, 14, 0x0b1026).setStrokeStyle(1, COLOR.borde)
        .setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); this.soltar(id); });
      const img = this.add.image(x, y, "px_obj_" + id).setScale(0.75);
      const tache = texto(this, x, y, "✕", { tam: 8, color: "#ff5c5c", origenY: 0.5 }).setVisible(false);
      return { id, caja, img, tache, nombre: nombres[id] || id };
    });
  }

  soltar(id) {
    if (this.listo) return;
    this.soltados = this.soltados.includes(id) ? this.soltados.filter(x => x !== id) : [...this.soltados, id];
    this.mostrar();
  }

  // ---------------------------------------------------------------- panel de opciones
  crearPanel() {
    const P = PANEL_DER;
    this.botones = ["rodear", "pie"].map((id, i) =>
      ({ id, b: boton(this, i ? 238 : 82, 143, this.t.opciones[id].nombre, () => this.marcar(id), 150) }));
    this.detalle = texto(this, P.x + 4, P.y + 3, "", { tam: 5, ancho: P.w - 8, origenX: 0, align: "left" });
    this.bElegir = boton(this, 268, 162, this.t.elegir, () => this.elegir(), 90);
    this.bElegir.caja.setVisible(false); this.bElegir.etiqueta.setVisible(false);
  }

  marcar(id) {
    if (this.listo) return;
    this.marcada = id;
    this.botones.forEach(({ id: k, b }) => b.caja.setStrokeStyle(k === id ? 2 : 1, k === id ? 0xfff27a : COLOR.borde));
    this.mostrar();
  }

  // Actualiza la carga, los objetos soltados y el detalle de la opción marcada
  mostrar() {
    const ops = opcionesRocas(estado.datos, estado, this.soltados), kg = ops.pie.kg;
    this.textoCarga.setText(llenar(this.t.carga, { kg, luna: Math.round(kg / 6) }));
    this.iconos.forEach(o => {
      const fuera = this.soltados.includes(o.id);
      o.img.setAlpha(fuera ? 0.3 : 1); o.tache.setVisible(fuera);
    });
    const id = this.marcada;
    if (!id) { this.detalle.setText(this.t.toca).setColor(COLOR.tenue); return; }
    const op = ops[id], info = this.t.opciones[id];
    const extra = id === "pie" ? [ops.pie.blindado ? this.t.blindado : null, this.t.soltar].filter(Boolean) : [];
    this.detalle.setColor("#eef1ff").setText([`+ ${info.gana}`, `− ${info.cuesta}`, llenar(this.t.detalle, { o2: op.efectos.oxigeno }), ...extra].join("\n"));
    this.bElegir.caja.setVisible(true); this.bElegir.etiqueta.setVisible(true);
  }

  // ---------------------------------------------------------------- elegir
  elegir() {
    if (this.listo || !this.marcada) return;
    this.listo = true;
    const id = this.marcada;
    // soltar objetos solo cuenta si se cruza a pie (con el rover, todo va en el rover)
    const soltados = id === "pie" ? this.soltados : [];
    const op = opcionesRocas(estado.datos, estado, soltados)[id];
    estado.cambiar("oxigeno", op.efectos.oxigeno);
    if (soltados.length) {
      estado.mochila = estado.mochila.filter(x => !soltados.includes(x));
      const nombres = this.iconos.filter(o => soltados.includes(o.id)).map(o => o.nombre).join(", ");
      estado.bitacora.push(llenar(this.t.bitacora_soltar, { lista: nombres }));
    }
    estado.misiones.rocas = { eleccion: id, dejoRover: op.dejaRover, oxigeno: op.efectos.oxigeno, soltados };
    const o2 = Math.abs(op.efectos.oxigeno);
    estado.bitacora.push(llenar(id === "pie" ? this.t.bitacora_pie : this.t.bitacora_rodear, { o2, kg: op.kg ?? 0 }));

    this.botones.forEach(({ b }) => { b.caja.disableInteractive(); b.etiqueta.setAlpha(0.6); });
    this.iconos.forEach(o => o.caja.disableInteractive());
    this.bElegir.caja.destroy(); this.bElegir.etiqueta.destroy();
    barras(this, estado);
    if (id === "pie") this.cruzarAPie(); else this.rodear();
    this.detalle.setColor("#ffcd75").setText(llenar(id === "pie" ? this.t.resultado_pie : this.t.resultado_rodear, { o2 }));
    this.time.delayedCall(2400, () => boton(this, 268, 162, this.t.continuar, () => this.seguir(), 90));
  }

  // el rover da la vuelta por abajo del campo de rocas
  rodear() {
    this.tweens.add({ targets: this.astro, x: ROVER.x, alpha: 0, duration: 300 });
    this.tweens.chain({ targets: this.rover, tweens: [
      { x: 92, y: SUELO + 9, duration: 600, delay: 300 },
      { x: 240, duration: 1300 },
      { x: 262, y: SUELO, duration: 500 }
    ] });
  }

  // a saltitos lentos (en la Luna todo pesa la sexta parte); el rover se queda
  cruzarAPie() {
    const pasos = SALTOS.map(([x, y]) => ({ x, y, duration: 420, ease: "Sine.easeInOut" }));
    this.tweens.chain({ targets: this.astro, tweens: pasos });
  }

  seguir() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
  }
}
