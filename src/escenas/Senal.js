// Misión 1c: la señal de Chispa. Dueño: Rol 2 (pantalla) y Rol 5 (textos).
// Ya elegido, el niño llega al Control de Misión: el receptor capta el collar
// de Chispa, identifica la señal (corto, corto, largo) y ve en el mapa del polo
// sur dónde está → Misión 2 (CentroControl). Resultado en estado.mision1.
// Reutiliza el cuadro de diálogo y los fondos animados de la Intro.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto, boton } from "../ui.js";
import { crearTexturasEquipo, crearTexturasMochila } from "../pixelart.js";
import { Intro } from "./Intro.js";

// Minijuego: cada pulso es [duración, silencio] en unidades
const SENALES = {
  A: Array(8).fill([2, 2]),                                            // uniforme
  B: [[1, 1], [1, 1], [3, 3], [1, 1], [1, 1], [3, 3], [1, 1], [1, 1], [3, 3]],   // corto, corto, largo
  C: [[3, 1], [1, 3], [2, 1], [1, 1], [3, 2], [1, 1], [2, 3], [1, 1]]  // irregular
};
const CORRECTA = "B";
const UNIDAD = 5;            // px por unidad de pulso

export class Senal extends Intro {
  constructor() { super("Senal"); }

  create() {
    this.t = estado.textos.centro_control;
    this.reg = estado.mision1 = { alertaVista: true, senalIdentificada: false, intentosMinijuego: 0, mapaConsultado: false };
    this.eventosPanel = [];
    this.modal = null;
    crearTexturasMochila(this);
    super.create();
    this.events.once("shutdown", () => { this.input.removeAllListeners(); this.input.keyboard.removeAllListeners(); });
  }

  paginas() { return this.t.alerta; }

  dibujar(i) {
    this.control("¡ALERTA!\nSEÑAL DETECTADA", "#ff5c5c");
    if (i === 0) { this.sonar("alerta"); this.cameras.main.shake(300, 0.004); }
    if (i === 1) {
      this.sonar("estatica"); this.time.delayedCall(500, () => this.sonar("ladrido"));
      this.cada(70, () => {   // estática en el monitor
        const p = this.add.rectangle(Phaser.Math.Between(101, 218), Phaser.Math.Between(15, 80), 2, 1, Phaser.Math.RND.pick([0x94b0c2, 0xf4f4f4, 0x566c86]));
        this.time.delayedCall(120, () => p.destroy());
      });
    }
  }

  alTerminar() {
    this.avanzar = () => this.tarjeta?.visible && this.cerrarTarjeta();
    // El minijuego y el mapa ahora se consultan con STELLA en el Centro de Control
    this.continuar();
  }

  continuar() {
    this.avanzar = null;
    this.cameras.main.fadeOut(400);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("CentroControl"));
  }

  actualizarControl() {}
  marcarLocalizada() {}
  llenar(plantilla, o) { return plantilla.replace(/\{(\w+)\}/g, (_, k) => o[k]); }

  crearTarjeta() {
    this.tarjeta = this.add.container(ANCHO / 2, 36).setDepth(2000).setVisible(false);
    this.tjTitulo = texto(this, 14, 5, "", { tam: 7, ancho: 180, color: COLOR.titulo });
    this.tjTexto = texto(this, 14, 18, "", { tam: 6, ancho: 180 });
    this.tjFuente = texto(this, 0, 68, "", { tam: 5, ancho: 214, color: COLOR.tenue });
    this.tjCerrar = texto(this, 0, 77, "", { tam: 5, ancho: 214, color: "#5cff8a" });
    this.tarjeta.add([
      this.add.rectangle(3, 3, 224, 88, 0x0b1026, 0.8).setOrigin(0.5, 0),
      this.add.rectangle(0, 0, 224, 88, COLOR.panel).setStrokeStyle(1, 0xffcd75).setOrigin(0.5, 0),
      this.add.ellipse(-90, 50, 34, 10, 0x1a1c2c),
      this.add.image(-90, 30, "px_obj_linterna").setScale(2),
      this.tjTitulo, this.tjTexto, this.tjFuente, this.tjCerrar
    ]);
  }

  mostrarTarjeta(clave) {
    const tj = this.t[clave];
    this.tjTitulo.setText(tj.titulo);
    this.tjTexto.setText(tj.texto);
    this.tjFuente.setText(tj.fuente);
    this.tjCerrar.setText(tj.cerrar);
    this.tarjeta.setVisible(true);
    this.burbuja?.setVisible(false);
    this.actualizarControl();
  }

  cerrarTarjeta() {
    this.tarjeta.setVisible(false);

    this.actualizarControl();
  }

  // ---------------------------------------------------------------- paneles
  abrirPanel(titulo, colorTitulo = COLOR.titulo) {
    this.cerrarPanel();
    this.modal = this.add.container(0, 0).setDepth(1900);
    this.modal.add([
      this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.6).setOrigin(0).setInteractive(),   // bloquea la sala
      this.add.rectangle(10, 6, 300, 168, COLOR.panel).setOrigin(0).setStrokeStyle(1, COLOR.borde),
      texto(this, ANCHO / 2, 10, titulo, { tam: 7, color: colorTitulo, ancho: 290 })
    ]);
    this.burbuja?.setVisible(false);
    this.foco?.setVisible(false);

    this.actualizarControl();
    return this.modal;
  }

  cerrarPanel() {
    if (!this.modal) return;
    this.eventosPanel.forEach(e => e.remove());
    this.eventosPanel = [];
    this.tweens.killTweensOf(this.modal.list);
    this.modal.destroy();
    this.modal = null;
    this.pulsos = null;
    this.actualizarControl();
  }

  // Botón dentro del panel abierto
  btn(x, y, txt, fn, ancho) {
    const b = boton(this, x, y, txt, fn, ancho);
    this.modal.add([b.caja, b.etiqueta]);
    return b;
  }

  luego(ms, fn) { const e = this.time.delayedCall(ms, fn); this.eventosPanel.push(e); return e; }
  cada(ms, fn) { const e = this.time.addEvent({ delay: ms, loop: true, callback: fn }); this.eventosPanel.push(e); return e; }

  // Franja inferior del panel donde habla el robot
  lineaRobot(inicial) {
    this.modal.add([
      this.add.rectangle(16, 122, 288, 30, 0x0b1026, 0.6).setOrigin(0).setStrokeStyle(1, 0x333c57),
      this.add.image(30, 137, "chispa_px")
    ]);
    const tx = texto(this, 42, 125, inicial, { tam: 6, ancho: 256, origenX: 0, align: "left" });
    this.modal.add(tx);
    return tx;
  }

  // ---------------------------------------------------------------- minijuego
  abrirMinijuego() {
    const t = this.t.mini, m = this.abrirPanel(t.titulo);
    const g = this.add.graphics();
    m.add(g);
    // leyenda: la diferencia está en la LONGITUD del pulso, no en el color
    g.fillStyle(0x7ee6ff).fillRect(96, 25, UNIDAD, 6).fillRect(170, 25, UNIDAD * 3, 6);
    m.add([texto(this, 104, 23, t.corto, { tam: 6, origenX: 0 }), texto(this, 188, 23, t.largo, { tam: 6, origenX: 0 })]);

    this.pulsos = [];
    const filas = {};
    Object.keys(SENALES).forEach((l, i) => {
      const y = 48 + i * 25;
      const nombre = this.llenar(t.senal, { l });
      const b = this.btn(44, y, nombre, () => this.elegirSenal(l, filas), 56);
      g.fillStyle(0x0b1026).fillRect(80, y - 9, 192, 18);
      g.lineStyle(1, 0x333c57).strokeRect(80, y - 9, 192, 18);
      let x = 86;
      const rects = SENALES[l].map(([d, s]) => {
        const r = this.add.rectangle(x, y, d * UNIDAD, 8, 0x29adff).setOrigin(0, 0.5);
        x += (d + s) * UNIDAD;
        return r;
      });
      const cabezal = this.add.rectangle(82, y, 1, 16, 0xfff27a);
      m.add([...rects, cabezal]);
      this.tweens.add({ targets: cabezal, x: 270, duration: 3600, repeat: -1 });
      this.pulsos.push({ rects, cabezal });
      this.btn(289, y, "♪", () => this.sonarPatron(SENALES[l]), 18);
      filas[l] = { b, nombre, rects };
    });
    this.textoRobot = this.lineaRobot(t.explica);

  }

  elegirSenal(l, filas) {
    if (this.reg.senalIdentificada) return;
    const t = this.t.mini, f = filas[l];
    this.reg.intentosMinijuego++;
    if (l !== CORRECTA) {
      f.b.etiqueta.setText("✗ " + f.nombre);
      this.textoRobot.setText(t.mal);
      this.sonar("mal");
      this.tweens.add({ targets: f.rects, x: "+=2", duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this.reg.senalIdentificada = true;
    f.b.etiqueta.setText("✓ " + f.nombre);
    f.b.caja.setStrokeStyle(2, 0x5cff8a);
    this.textoRobot.setText(t.bien);
    this.sonar("bien");
    this.tweens.add({ targets: f.rects, scaleY: 1.8, duration: 160, yoyo: true, repeat: 3 });
    // destellos
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, d = this.add.rectangle(176, f.rects[0].y, 2, 2, 0xfff27a);
      this.modal.add(d);
      this.tweens.add({ targets: d, x: 176 + Math.cos(a) * 60, y: f.rects[0].y + Math.sin(a) * 22, alpha: 0, duration: 700 });
    }
    this.marcarLocalizada();
    this.btn(250, 163, t.ver_mapa, () => this.abrirMapa(), 90);
  }

  // ---------------------------------------------------------------- mapa
  abrirMapa() {
    const t = this.t.mapa, m = this.abrirPanel(t.titulo);
    const primeraVez = !this.reg.mapaConsultado;
    this.reg.mapaConsultado = true;
    const g = this.add.graphics();
    m.add(g);
    // superficie vista desde arriba
    g.fillStyle(0x0b1026).fillRect(18, 22, 180, 96);
    g.lineStyle(1, 0x333c57).strokeRect(18, 22, 180, 96);
    [[24, 28], [40, 110], [186, 30], [176, 108], [30, 70], [190, 72]].forEach(([x, y]) => g.fillStyle(0xf4f4f4).fillRect(x, y, 1, 1));
    g.fillStyle(0x94b0c2).fillCircle(108, 70, 45);
    g.fillStyle(0x566c86);
    [[80, 50, 6], [88, 98, 5], [128, 42, 4], [70, 80, 4], [146, 58, 3]].forEach(([x, y, r]) => g.fillCircle(x, y, r));
    // zona de cráteres en sombra permanente
    g.fillStyle(0x1a1c2c);
    [[118, 78, 16, 10], [134, 70, 12, 8], [128, 90, 14, 8], [146, 84, 10, 7]].forEach(([x, y, w, h]) => g.fillEllipse(x, y, w, h));
    // polo sur
    g.fillStyle(0xf4f4f4).fillRect(106, 64, 5, 1).fillRect(108, 62, 1, 5);
    // base lunar (casita con bandera)
    const base = (x, y) => {
      g.fillStyle(0x1a1c2c).fillRect(x - 5, y - 4, 10, 8);
      g.fillStyle(0xf4f4f4).fillRect(x - 4, y - 3, 8, 6);
      g.fillStyle(0x29adff).fillRect(x - 1, y, 2, 3);
      g.fillStyle(0x1a1c2c).fillRect(x + 3, y - 9, 1, 6);
      g.fillStyle(0xff5c5c).fillRect(x + 4, y - 9, 3, 2);
    };
    base(70, 58);
    // ruta provisional: puntos de la base a la zona de la señal
    const ruta = (x1, y1, x2, y2, x3, y3) => {
      for (let i = 0; i <= 1; i += 0.06) {
        const x = (1 - i) ** 2 * x1 + 2 * (1 - i) * i * x2 + i * i * x3, y = (1 - i) ** 2 * y1 + 2 * (1 - i) * i * y2 + i * i * y3;
        g.fillStyle(0xffcd75).fillRect(Math.round(x), Math.round(y), 2, 2);
      }
    };
    ruta(76, 62, 92, 84, 124, 82);
    // región aproximada de la señal (sin la posición exacta de Itzel)
    const senal = this.add.circle(136, 82, 11).setStrokeStyle(1, 0xfff27a);
    m.add([senal, texto(this, 136, 77, "?", { tam: 7, color: "#fff27a" })]);
    this.tweens.add({ targets: senal, scale: 1.3, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    // leyenda (cada elemento tiene su forma)
    const lx = 210, fila = (y, txt) => m.add(texto(this, lx + 12, y, txt, { tam: 6, ancho: 80, origenX: 0, align: "left" }));
    base(lx + 4, 33); fila(28, t.base);
    g.fillStyle(0xf4f4f4).fillRect(lx + 1, 46, 7, 1).fillRect(lx + 4, 43, 1, 7); fila(43, t.polo);
    g.fillStyle(0x1a1c2c).fillEllipse(lx + 4, 61, 10, 6); fila(58, t.crateres);
    m.add(this.add.circle(lx + 4, 77, 4).setStrokeStyle(1, 0xfff27a)); fila(73, t.senal);
    [0, 4, 8].forEach(d => g.fillStyle(0xffcd75).fillRect(lx + d - 1, 99, 2, 2)); fila(96, t.ruta);

    this.lineaRobot(t.robot);
    this.btn(272, 163, "Continuar ▸", () => this.continuar(), 56);
  }

  // ---------------------------------------------------------------- sonidos (Web Audio, sin archivos)
  tono(f, ini, dur, forma = "square", vol = 0.04) {
    const ctx = this.sound.context;
    if (!ctx) return null;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + ini, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = forma;
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
    return { o, t0 };
  }

  sonar(tipo) {
    const ctx = this.sound.context;
    if (!ctx) return;
    if (tipo === "alerta") [0, 0.18, 0.36].forEach(i => this.tono(1200, i, 0.12));
    if (tipo === "bien") [660, 880, 1100].forEach((f, i) => this.tono(f, i * 0.1, 0.15));
    if (tipo === "mal") [300, 200].forEach((f, i) => this.tono(f, i * 0.15, 0.15));
    if (tipo === "ladrido") [0, 0.28].forEach(i => {
      const s = this.tono(520, i, 0.16, "sawtooth", 0.025);
      s?.o.frequency.exponentialRampToValueAtTime(240, s.t0 + 0.16);
    });
    if (tipo === "estatica") {
      if (ctx.state === "suspended") ctx.resume();
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = b;
      g.gain.value = 0.02;
      s.connect(g).connect(ctx.destination);
      s.start();
    }
  }

  sonarPatron(patron) {
    let t = 0;
    patron.forEach(([d, s]) => { this.tono(880, t, d * 0.1); t += (d + s) * 0.1; });
  }

}
