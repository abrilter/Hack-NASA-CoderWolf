// Alerta solar en pleno vuelo. Dueño: Rol 2 + Rol 4.
// Lee: datos.cme (el Sol real de DONKI o una tormenta famosa: nasa/sol.js), nave, datos.viaje ·
// Escribe: escudo u oxigeno, bitacora y estado.misiones.viaje = { eleccion, horasGanadas, combustibleFactor } · Sigue: Aterrizaje.
// Camino a la Luna llega el aviso: la NASA detectó una nube del Sol. Tres opciones:
//  - Cargar el escudo: la tormenta pega menos (sube estado.escudo), pero usa oxígeno.
//  - Acelerar: se aterriza unas horas antes de la tormenta, pero con menos
//    combustible para el aterrizaje (Aterrizaje lo lee).
//  - Guardar el aire: se llega con todo el oxígeno, sin protección extra.
// Desde aquí la tormenta de la partida ya no cambia (fijarTormenta).
// Modo prueba: index.html?escena=Viaje (&nave=grande).
import { ANCHO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal, llenar, navegarConTeclado } from "../ui.js";
import { horasDeLlegada, opcionesViaje, aplicar } from "../modelo/simulacion.js";
import { fijarTormenta, velocidadDeJuego, fechaLarga } from "../nasa/sol.js";
import { crearTexturasEquipo } from "../pixelart.js";

const ESCENA = { y1: 38, y2: 132 };
const SOL = { x: 6, y: 64, r: 30 };
const NAVE = { x: 150, y: 88 };
const LUNA = { x: 292, y: 96, r: 16 };
const PANEL = { x: 194, y: 42, w: 122, h: 34 };
const IDS = ["escudo", "acelerar", "guardar"];

export class Viaje extends Phaser.Scene {
  constructor() { super("Viaje"); }

  create() {
    fijarTormenta();                               // desde aquí la tormenta de la partida ya no cambia
    navegarConTeclado(this);                       // flechas + Enter (ver ui.js)
    this.t = estado.textos.viaje;
    this.marcada = null;                           // Phaser reutiliza la escena: se reinicia aquí
    this.listo = false;
    this.saliendo = false;
    this.ops = opcionesViaje(estado.datos);
    crearTexturasEquipo(this);

    const cme = estado.datos.cme;
    barras(this, estado);
    titulo(this, this.t.titulo, 4);
    texto(this, ANCHO / 2, 20, llenar(this.t.aviso, {
      fecha: fechaLarga(cme.fecha), vel: cme.velocidad_kms,
      horas: Math.round(horasDeLlegada(velocidadDeJuego(estado.datos))), viaje: estado.nave?.horasViaje ?? 2
    }), { tam: 6, ancho: 300, color: "#ff8a5c" });

    this.dibujar();
    this.crearOpciones();
    datoReal(this, cme);
    this.mostrar();
  }

  // ---------------------------------------------------------------- el espacio entre la Tierra y la Luna
  dibujar() {
    const { y1, y2 } = ESCENA, g = this.add.graphics();
    g.fillStyle(0x05070f).fillRect(0, y1, ANCHO, y2 - y1);
    for (let i = 0; i < 60; i++) g.fillStyle(i % 7 ? 0x94b0c2 : 0xffcd75).fillRect((i * 53) % ANCHO, y1 + 2 + ((i * 29) % (y2 - y1 - 4)), 1, 1);
    // la Tierra quedó atrás y la Luna está adelante
    g.fillStyle(0x1d2b53).fillCircle(52, 118, 8); g.fillStyle(0x29adff).fillCircle(51, 118, 7);
    g.fillStyle(0x38b764).fillRect(48, 115, 3, 3).fillRect(53, 120, 2, 2);
    g.fillStyle(0x566c86).fillCircle(LUNA.x, LUNA.y, LUNA.r + 1);
    g.fillStyle(0xc2c3c7).fillCircle(LUNA.x, LUNA.y, LUNA.r);
    [[-5, -4, 3], [4, 3, 4], [-2, 7, 2], [6, -7, 2]].forEach(([dx, dy, r]) => g.fillStyle(0x94b0c2).fillCircle(LUNA.x + dx, LUNA.y + dy, r));
    texto(this, 52, 128, this.t.tierra, { tam: 5, color: COLOR.tenue, origenY: 1 });
    texto(this, LUNA.x, LUNA.y + LUNA.r + 2, this.t.luna, { tam: 5, color: COLOR.tenue });

    // el Sol en la esquina, palpitando, y la nube (CME) que sale en ondas.
    // Todo eso queda recortado al recuadro de la ilustración (máscara).
    const forma = this.make.graphics({}, false).fillStyle(0xffffff).fillRect(0, y1, ANCHO, y2 - y1);
    this.capaSol = this.add.container(0, 0).setMask(forma.createGeometryMask());
    const halo = this.add.circle(SOL.x, SOL.y, SOL.r + 10, 0xff8a5c, 0.25);
    this.tweens.add({ targets: halo, scale: 1.15, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
    this.capaSol.add([halo, this.add.circle(SOL.x, SOL.y, SOL.r, 0xffa300), this.add.circle(SOL.x - 3, SOL.y - 3, SOL.r - 8, 0xfff27a)]);
    texto(this, SOL.x + 18, SOL.y + SOL.r + 2, this.t.sol, { tam: 5, color: "#ffcd75" });
    this.time.addEvent({ delay: 1100, loop: true, callback: () => this.onda() });
    this.onda();

    // la nave apuntando a la Luna, con su fuego
    this.nave = this.add.container(NAVE.x, NAVE.y);
    this.fuego = this.add.rectangle(-14, 0, 8, 4, 0xffa300).setOrigin(1, 0.5);
    const sprite = this.add.image(0, 0, `nave_${estado.nave?.id || "pequena"}`).setAngle(90).setScale(0.5);
    this.escudoNave = this.add.circle(0, 0, 18, 0x4fd1ff, 0.18).setStrokeStyle(1, 0x7ee6ff).setVisible(false);
    this.nave.add([this.fuego, sprite, this.escudoNave]);
    this.tweens.add({ targets: this.nave, y: NAVE.y - 3, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.addEvent({ delay: 80, loop: true, callback: () => this.fuego.setFillStyle(Math.random() < 0.5 ? 0xffa300 : 0xfff27a).setScale(0.8 + Math.random() * 0.4, 1) });

    // marco rojo de alerta que parpadea y el letrero
    const marco = this.add.rectangle(0.5, y1 + 0.5, ANCHO - 1, y2 - y1 - 1).setOrigin(0).setStrokeStyle(2, 0xff5c5c);
    this.tweens.add({ targets: marco, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    this.add.rectangle(PANEL.x, PANEL.y, PANEL.w, PANEL.h, COLOR.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLOR.borde);
  }

  // una onda de la nube del Sol que avanza hacia la Luna
  onda() {
    if (this.listo && this.marcada === "acelerar") return;
    const o = this.add.circle(SOL.x, SOL.y, SOL.r + 4).setStrokeStyle(2, 0xff8a5c, 0.9);
    this.capaSol.add(o);
    this.tweens.add({ targets: o, scale: 8, alpha: 0, duration: 3200, ease: "Sine.easeOut", onComplete: () => o.destroy() });
  }

  // ---------------------------------------------------------------- opciones
  crearOpciones() {
    this.botones = IDS.map((id, i) => ({ id, b: boton(this, 56 + i * 104, 143, this.t.opciones[id].nombre, () => this.marcar(id), 100) }));
    this.detalle = texto(this, PANEL.x + 4, PANEL.y + 3, "", { tam: 5, ancho: PANEL.w - 8, origenX: 0, align: "left" });
    this.bElegir = boton(this, 268, 162, this.t.elegir, () => this.elegir(), 90);
    this.bElegir.caja.setVisible(false); this.bElegir.etiqueta.setVisible(false);
  }

  marcar(id) {
    if (this.listo) return;
    this.marcada = id;
    this.botones.forEach(({ id: k, b }) => b.caja.setStrokeStyle(k === id ? 2 : 1, k === id ? 0xfff27a : COLOR.borde));
    this.mostrar();
  }

  mostrar() {
    const id = this.marcada;
    if (!id) { this.detalle.setText(this.t.toca).setColor(COLOR.tenue); return; }
    const info = this.t.opciones[id], op = this.ops[id];
    const datos = { o2: Math.abs(op.efectos.oxigeno || 0), h: op.horasGanadas || 0 };
    this.detalle.setColor("#eef1ff").setText(`+ ${llenar(info.gana, datos)}\n− ${llenar(info.cuesta, datos)}`);
    this.bElegir.caja.setVisible(true); this.bElegir.etiqueta.setVisible(true);
  }

  elegir() {
    if (this.listo || !this.marcada) return;
    this.listo = true;
    const id = this.marcada, op = this.ops[id];
    aplicar(estado, op.efectos);
    estado.misiones.viaje = { eleccion: id, horasGanadas: op.horasGanadas || 0, combustibleFactor: op.combustibleFactor || 1,
      oxigeno: op.efectos.oxigeno || 0, escudo: op.efectos.escudo || 0 };
    estado.bitacora.push(llenar(this.t.bitacora, { nombre: this.t.opciones[id].nombre }));

    this.botones.forEach(({ b }) => { b.caja.disableInteractive(); b.etiqueta.setAlpha(0.6); });
    this.bElegir.caja.destroy(); this.bElegir.etiqueta.destroy();
    barras(this, estado);
    this.detalle.setColor("#ffcd75").setText(this.t.resultado[id]);
    if (id === "escudo") {
      this.escudoNave.setVisible(true).setScale(0.3);
      this.tweens.add({ targets: this.escudoNave, scale: 1, duration: 500, ease: "Back.easeOut" });
    } else if (id === "acelerar") {
      this.tweens.killTweensOf(this.nave);
      this.fuego.setSize(18, 5);
      this.tweens.add({ targets: this.nave, x: LUNA.x - 44, duration: 1600, ease: "Cubic.easeIn" });
    }
    this.time.delayedCall(1200, () => boton(this, 268, 162, this.t.continuar, () => this.seguir(), 90));
  }

  seguir() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
  }
}
