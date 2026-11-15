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

const ZONA = { x2: 176, y1: 34, y2: 132 };         // recuadro de la ilustración
const SUELO = 122;
const ROVER = { x: 30, y: SUELO };
// Rocas del campo: [x, base, ancho, alto]
const ROCAS = [[66, SUELO, 22, 18], [88, SUELO, 16, 26], [104, SUELO, 26, 20], [124, SUELO, 18, 30], [142, SUELO, 22, 16]];
const SALTOS = [[62, 104], [84, 96], [104, 102], [124, 92], [144, 106], [164, SUELO]];   // por encima de las rocas

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
    texto(this, ANCHO / 2 + 20, 21, this.t.intro, { tam: 6, ancho: 240, color: "#ffcd75" });
    this.dibujar();
    this.crearMochila();
    this.crearPanel();
    datoReal(this, estado.datos.rocas);
    this.mostrar();
  }

  // ---------------------------------------------------------------- ilustración
  dibujar() {
    const g = this.add.graphics();
    g.fillStyle(0x05070f).fillRect(0, ZONA.y1, ZONA.x2, ZONA.y2 - ZONA.y1);
    for (let i = 0; i < 26; i++) g.fillStyle(0x94b0c2).fillRect((i * 41) % ZONA.x2, ZONA.y1 + 2 + ((i * 17) % 50), 1, 1);
    // colinas lejanas y suelo
    for (let x = 0; x < ZONA.x2; x++) {
      const h = Math.round(8 + 4 * Math.sin(x / 19) + 2 * Math.sin(x / 7));
      g.fillStyle(0x29366f).fillRect(x, SUELO - 14 - h, 1, h + 14);
    }
    g.fillStyle(0x94b0c2).fillRect(0, SUELO, ZONA.x2, ZONA.y2 - SUELO);
    g.fillStyle(0xc2c3c7).fillRect(0, SUELO, ZONA.x2, 1);
    for (let x = 2; x < ZONA.x2; x += 5) g.fillStyle(0x8796b0).fillRect(x, SUELO + 3 + (x % 3) * 2, 1, 1);
    // rocas: sombra larga (Sol bajo), cuerpo y lado iluminado
    ROCAS.forEach(([x, base, w, h]) => {
      g.fillStyle(0x333c57, 0.8).fillEllipse(x + w * 0.6, base + 2, w * 1.6, 5);
      g.fillStyle(0x1a1c2c).fillEllipse(x, base - h / 2, w + 2, h + 2);
      g.fillStyle(0x566c86).fillEllipse(x, base - h / 2, w, h);
      g.fillStyle(0x94b0c2).fillEllipse(x - w / 5, base - h * 0.62, w * 0.45, h * 0.4);
    });
    g.lineStyle(1, 0x333c57).strokeRect(0.5, ZONA.y1 + 0.5, ZONA.x2 - 1, ZONA.y2 - ZONA.y1 - 1);
    // Itzel espera al otro lado (lucecita)
    const luz = this.add.circle(170, SUELO - 6, 2, 0xfff27a);
    this.tweens.add({ targets: luz, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // rover detenido y el astronauta junto a él
    this.rover = this.add.container(ROVER.x, ROVER.y).setScale(0.75);
    this.rover.add([this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), this.add.image(-13, -6, "rover_rueda"), this.add.image(11, -6, "rover_rueda")]);
    this.astro = this.add.image(ROVER.x + 22, SUELO, `astro_${estado.traje?.id || "ligero"}_0`).setOrigin(0.5, 1).setScale(0.5);
  }

  // ---------------------------------------------------------------- mochila: peso y soltar objetos
  crearMochila() {
    this.textoCarga = texto(this, 4, 135, "", { tam: 5, ancho: 172, origenX: 0, align: "left" });
    const nombres = estado.textos.centro_control?.nombres || {};
    this.iconos = (estado.mochila || []).map((id, i) => {
      const x = 12 + i * 22, y = 158;
      const caja = this.add.rectangle(x, y, 18, 14, COLOR.panel).setStrokeStyle(1, COLOR.borde)
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
    const P = { x: 180, y: 34, w: 136 };
    this.add.rectangle(P.x, P.y, P.w, 118, COLOR.panel, 0.92).setOrigin(0).setStrokeStyle(1, COLOR.borde);
    this.botones = ["rodear", "pie"].map((id, i) =>
      ({ id, b: boton(this, P.x + P.w / 2, P.y + 12 + i * 21, this.t.opciones[id].nombre, () => this.marcar(id), P.w - 10) }));
    this.detalle = texto(this, P.x + 5, P.y + 54, "", { tam: 6, ancho: P.w - 10, origenX: 0, align: "left" });
    this.bElegir = boton(this, P.x + P.w / 2, 162, this.t.elegir, () => this.elegir(), 90);
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
    this.time.delayedCall(1800, () => boton(this, 248, 162, this.t.continuar, () => this.seguir(), 90));
  }

  // el rover da la vuelta por abajo del campo de rocas
  rodear() {
    this.tweens.add({ targets: this.astro, x: ROVER.x, alpha: 0, duration: 300 });
    this.tweens.chain({ targets: this.rover, tweens: [
      { x: 60, y: SUELO + 8, duration: 700, delay: 300 },
      { x: 150, duration: 1100 },
      { x: 166, y: SUELO, duration: 500 }
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
