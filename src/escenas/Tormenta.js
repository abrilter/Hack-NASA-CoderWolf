// Misión: la tormenta en campo abierto. Dueño: Rol 5.
// Lee: datos.tormenta, cme, misiones.ruta, misiones.rocas, traje, escudo, mochila · Escribe: oxigeno, radiacion, misiones.tormenta, bitacora · Sigue: Rescate.
// Llega la tormenta solar anunciada: la nube (CME) guardada en estado.datos.cme
// (DONKI en vivo, o la guardada con su etiqueta "Dato de ejemplo").
// Tres opciones, cada una gana algo y cuesta algo:
//  - Saliente de roca: protege mucho (no todo), pero hay que desviarse y esperar.
//  - Debajo del rover: protege un poco, sin desvío. No está si se dejó el rover
//    en el campo de rocas (lo dice estado.misiones.rocas.dejoRover).
//  - Seguir hacia Itzel: solo protegen el traje y el escudo; llega antes.
// Radiación = fuerza × horas × (1 − protección del refugio, el traje y el escudo)
// (modelo/simulacion.js → opcionesTormenta; números en datos.json → tormenta).
// Partículas cayendo: se cuentan las que se detienen y las que pasan.
// Escribe: oxigeno, radiacion, bitacora y estado.misiones.tormenta (lo lee Rescate).
// Modo prueba: index.html?escena=Tormenta (&sinrover=1 para probar sin rover).
import { ANCHO, ALTO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal, navegarConTeclado, llenar } from "../ui.js";
import { opcionesTormenta, aplicar } from "../modelo/simulacion.js";
import { crearTexturasEquipo } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";

const SUELO = 136;                 // donde pisa el astronauta
const ASTRO = { x: 80, alto: 24 };
const ZONA = { x1: 0, x2: 176, y1: 34 };   // recuadro de la ilustración
const REFUGIO_Y = { saliente: 96, rover: 92 };   // donde el refugio frena partículas

export class Tormenta extends Phaser.Scene {
  constructor() { super("Tormenta"); }

  create() {
    navegarConTeclado(this);                      // flechas + Enter (ver ui.js)
    this.t = estado.textos.tormenta;
    if (estado.modoPrueba && new URLSearchParams(location.search).has("sinrover")) estado.misiones.rocas = { dejoRover: true };
    this.opciones = opcionesTormenta(estado.datos, estado);
    this.elegida = null;
    this.marcada = null;               // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    this.listo = false;
    this.particulas = [];
    this.det = 0; this.pasan = 0;
    crearTexturasEquipo(this);
    crearTexturasExterior(this);

    const cme = estado.datos.cme, T = estado.datos.tormenta;
    barras(this, estado);
    titulo(this, this.t.titulo, 4);
    // si en la Ruta ya pasó parte de la tormenta, aquí queda menos
    const queda = this.opciones[0].queda;
    texto(this, ANCHO / 2 + 20, 21, llenar(this.t.info, { vel: cme.velocidad_kms, horas: T.opciones.seguir.espera_h }) +
      (queda < 1 ? " " + llenar(this.t.ya_paso, { pct: Math.round((1 - queda) * 100) }) : ""),
      { tam: 6, ancho: 240, color: "#ff8a5c" });

    this.dibujarFondo();
    this.refugio = this.add.container(0, 0).setDepth(5);
    this.astro = this.add.image(ASTRO.x, SUELO, `astro_${estado.traje?.id || "ligero"}_0`).setOrigin(0.5, 1).setDepth(6);
    this.gPart = this.add.graphics().setDepth(8);
    this.textoContador = texto(this, ZONA.x2 / 2, 36, "", { tam: 6, color: "#eef1ff" }).setDepth(9);
    const pP = this.opciones[0].pPersonal;
    texto(this, ZONA.x2 / 2, 141, llenar(this.t.personal, { n: Math.round(pP * 10) }), { tam: 6, ancho: 170, color: "#7ee6ff" }).setDepth(9);

    this.crearPanel();
    datoReal(this, cme);
    this.decir(this.t.stella);
    this.mostrar(null);
    this.time.addEvent({ delay: 110, loop: true, callback: () => this.lanzar() });
  }

  // ---------------------------------------------------------------- ilustración
  dibujarFondo() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x05070f).fillRect(ZONA.x1, ZONA.y1, ZONA.x2, SUELO - ZONA.y1);
    for (let i = 0; i < 30; i++) g.fillStyle(0x94b0c2).fillRect((i * 37) % ZONA.x2, ZONA.y1 + ((i * 23) % 60), 1, 1);
    // el Sol pegado al horizonte (polo sur), de donde llegan las partículas
    g.fillStyle(0xffcd75).fillCircle(168, 100, 7);
    g.fillStyle(0xfff27a).fillCircle(168, 100, 4);
    // colinas y suelo
    for (let x = 0; x < ZONA.x2; x++) {
      const h = Math.round(10 + 5 * Math.sin(x / 17) + 2 * Math.sin(x / 6));
      g.fillStyle(0x333c57).fillRect(x, 112 - h, 1, h + 24);
      g.fillStyle(0x566c86).fillRect(x, 112 - h, 1, 1);
    }
    g.fillStyle(0x94b0c2).fillRect(0, SUELO, ZONA.x2, 16);
    g.fillStyle(0xc2c3c7).fillRect(0, SUELO, ZONA.x2, 1);
    g.lineStyle(1, 0x333c57).strokeRect(ZONA.x1 + 0.5, ZONA.y1 + 0.5, ZONA.x2 - 1, SUELO + 16 - ZONA.y1);
  }

  // Dibuja el refugio de la opción marcada
  dibujarRefugio(id) {
    this.refugio.removeAll(true);
    this.tweens.killTweensOf(this.astro);
    this.astro.setPosition(ASTRO.x, SUELO).setAngle(0).setScale(1);
    if (id === "saliente") {
      const g = this.add.graphics();
      g.fillStyle(0x1a1c2c).fillRect(30, 60, 26, SUELO - 60);         // pared de roca
      g.fillStyle(0x566c86).fillRect(32, 62, 22, SUELO - 62);
      g.fillStyle(0x1a1c2c).fillRect(30, 88, 104, 10);                 // saliente encima
      g.fillStyle(0x566c86).fillRect(32, 89, 100, 7);
      g.fillStyle(0x94b0c2).fillRect(32, 89, 100, 1);
      this.refugio.add(g);
      this.astro.setX(ASTRO.x);
    } else if (id === "rover") {
      // el rover apoyado en el suelo y el astronauta agachado debajo
      const c = this.add.container(ASTRO.x + 2, SUELO).setScale(2);
      c.add([this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), this.add.image(-13, -6, "rover_rueda"), this.add.image(11, -6, "rover_rueda")]);
      this.refugio.add(c);
      this.astro.setScale(1, 0.5);
    } else if (id === "seguir") {
      this.tweens.add({ targets: this.astro, x: ASTRO.x + 8, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  // ---------------------------------------------------------------- partículas
  lanzar() {
    if (this.listo) return;
    const objetivo = ASTRO.x + Phaser.Math.Between(-7, 7);
    const vx = -42, vy = 105, y0 = ZONA.y1 + 2;
    const t = (SUELO - ASTRO.alto - y0) / vy;
    this.particulas.push({ x: objetivo - vx * t, y: y0, vx, vy, refugioVisto: false });
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000, g = this.gPart.clear();
    const op = this.marcada && this.opciones.find(o => o.id === this.marcada);
    const lineaRefugio = op ? REFUGIO_Y[op.id] : null;
    const cabeza = SUELO - this.astro.displayHeight;   // agachado bajo el rover, la cabeza queda más abajo
    this.particulas = this.particulas.filter(p => {
      const yAntes = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      // el refugio detiene una parte (nunca todas)
      if (lineaRefugio && !p.refugioVisto && yAntes < lineaRefugio && p.y >= lineaRefugio) {
        p.refugioVisto = true;
        if (Math.random() < op.pRefugio) { this.chispa(p.x, lineaRefugio, 0xffffff); this.det++; return false; }
      }
      // el traje y el escudo detienen otra parte; las demás pasan
      if (p.y >= cabeza) {
        if (Math.random() < (op ? op.pPersonal : this.opciones[0].pPersonal)) { this.chispa(p.x, cabeza, 0x7ee6ff); this.det++; }
        else { this.chispa(p.x, cabeza + 6, 0xff5c5c); this.pasan++; this.astro.setTint(0xff8a5c); this.time.delayedCall(90, () => this.astro.clearTint()); }
        return false;
      }
      g.fillStyle(0xfff27a).fillRect(Math.round(p.x), Math.round(p.y), 1, 2);
      g.fillStyle(0xffa300, 0.6).fillRect(Math.round(p.x + 1), Math.round(p.y - 2), 1, 2);
      return p.x > 0;
    });
    this.textoContador.setText(llenar(this.t.contador, { det: this.det, pasan: this.pasan }));
  }

  chispa(x, y, color) {
    const c = this.add.rectangle(x, y, 2, 2, color).setDepth(9);
    this.tweens.add({ targets: c, scale: 2.5, alpha: 0, duration: 260, onComplete: () => c.destroy() });
  }

  // ---------------------------------------------------------------- panel de opciones
  crearPanel() {
    const P = { x: 180, y: 34, w: 136 };
    this.add.rectangle(P.x, P.y, P.w, 118, COLOR.panel, 0.92).setOrigin(0).setStrokeStyle(1, COLOR.borde);
    this.botones = this.opciones.map((op, i) => {
      const info = this.t.opciones[op.id];
      const b = boton(this, P.x + P.w / 2, P.y + 12 + i * 21, info.nombre, () => this.marcar(op.id), P.w - 10);
      if (!op.disponible) { b.caja.disableInteractive().setAlpha(0.35); b.etiqueta.setAlpha(0.45); }
      return { op, b };
    });
    this.detalle = texto(this, P.x + 5, P.y + 74, "", { tam: 6, ancho: P.w - 10, origenX: 0, align: "left" });
    this.bElegir = boton(this, P.x + P.w / 2, 162, this.t.elegir, () => this.elegir(), 90);
    this.bElegir.caja.setVisible(false); this.bElegir.etiqueta.setVisible(false);
  }

  marcar(id) {
    if (this.listo) return;
    this.marcada = id;
    this.det = 0; this.pasan = 0;
    this.particulas = [];
    this.botones.forEach(({ op, b }) => op.disponible && b.caja.setStrokeStyle(op.id === id ? 2 : 1, op.id === id ? 0xfff27a : COLOR.borde));
    this.dibujarRefugio(id);
    this.mostrar(id);
  }

  mostrar(id) {
    const sinRover = !this.opciones.find(o => o.id === "rover").disponible;
    if (!id) {
      this.detalle.setText(this.t.toca + (sinRover ? "\n" + this.t.sin_rover : "")).setColor(COLOR.tenue);
      return;
    }
    const op = this.opciones.find(o => o.id === id), info = this.t.opciones[id];
    this.detalle.setColor("#eef1ff").setText(`+ ${info.gana}\n− ${info.cuesta}\n` +
      llenar(this.t.detalle, { n: Math.round(op.pTotal * 10), o2: op.efectos.oxigeno, rad: op.efectos.radiacion }) +
      (op.extraComida ? "\n" + llenar(this.t.sin_comida, { o2: -op.extraComida }) : ""));
    this.bElegir.caja.setVisible(true); this.bElegir.etiqueta.setVisible(true);
  }

  decir(frase) {
    const d = texto(this, ZONA.x2 / 2, 120, frase, { tam: 6, ancho: 168 }).setBackgroundColor("#1d2650").setPadding(2, 1).setDepth(10);
    this.time.delayedCall(4500, () => d.destroy());
  }

  // ---------------------------------------------------------------- elegir
  elegir() {
    if (this.listo || !this.marcada) return;
    this.listo = true;
    const op = this.opciones.find(o => o.id === this.marcada), info = this.t.opciones[op.id];
    aplicar(estado, op.efectos);
    estado.misiones.tormenta = { eleccion: op.id, horasPerdidas: op.horasPerdidas, tormentaPendiente: op.tormentaPendiente,
      oxigeno: op.efectos.oxigeno, radiacion: op.efectos.radiacion };
    estado.bitacora.push(llenar(this.t.bitacora, { nombre: info.nombre, rad: op.efectos.radiacion, o2: Math.abs(op.efectos.oxigeno) }));

    this.botones.forEach(({ b }) => { b.caja.disableInteractive(); b.etiqueta.setAlpha(0.6); });
    this.bElegir.caja.destroy(); this.bElegir.etiqueta.destroy();
    const extra = op.tormentaPendiente ? this.t.resultado_seguir : llenar(this.t.resultado_refugio, { horas: op.horasPerdidas });
    this.detalle.setText(llenar(this.t.resultado, { rad: op.efectos.radiacion, o2: Math.abs(op.efectos.oxigeno) }) + "\n" + extra).setColor("#ffcd75");
    barras(this, estado);
    boton(this, 248, 162, this.t.continuar, () => this.scene.start(siguienteEscena(this.scene.key)), 90);
  }
}
