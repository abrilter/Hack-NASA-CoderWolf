// Misión 2: preparar la mochila. Dueño: Rol 2 (pantalla) y Rol 4 (pesos).
// Lee: traje, nave, mision1, datos.cme · Escribe: mochila, oxigeno (+tanque), mision2, bitacora · Sigue: Exterior.
// Sala de control con repisas, 6 objetos y la puerta. El astronauta camina
// (clic en el piso o flechas). Clic en un objeto = lo toma o lo deja sin mover
// al astronauta (también Enter/Espacio al estar cerca). Reglas:
//  - La mochila nunca pasa de CAPACIDAD_MOCHILA.
//  - El tanque de oxígeno es OBLIGATORIO: sin él no se sale y, una vez
//    guardado, no se puede quitar.
// Historia: el niño identifica la señal de Chispa con el minijuego de STELLA;
// el monitor muestra el mapa del polo sur. Revisión del equipo y
// última transmisión de Itzel → puerta → Exterior. Va después de Equipo y
// Aterrizaje: la puerta no abre si falta el traje o la nave.
// STELLA: monitor-asistente junto a la puerta con 5 apartados (misión, entorno,
// señal, equipo y evaluación de mochila). Orienta, nunca elige por el jugador.
// Las decisiones se guardan en estado.mochila (inventario único, se usa en
// vivo) y estado.mision2.
import { ANCHO, ALTO, COLOR, OBJETOS, CAPACIDAD_MOCHILA, O2_TANQUE, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto, boton, etiquetaDato, llenar } from "../ui.js";
import { crearTexturasMochila, crearTextura, crearAstro32 } from "../pixelart.js";
import { Stella } from "../stella.js";
import { tono, sonar } from "../sonidos.js";
import { fechaLarga } from "../nasa/sol.js";

const PARED = 88;            // donde termina la pared y empieza el piso
const HUD = 162;             // barra de la mochila (abajo)
const PISO = { x1: 12, x2: ANCHO - 12, y1: 100, y2: HUD - 6 };
const VELOCIDAD = 70;
const CERCA = 10;
const REPISAS = [70, 130, 190];          // centro de cada mueble
const TABLAS = [52, 80];                 // altura de las dos tablas
const ORDEN_REPISA = ["oxigeno", "escudo", "radio", "botiquin", "comida", "linterna"];
const OBLIGATORIO = "oxigeno";
const PUERTA = { x: 280, y: 104 };
const MONITOR = { x: 10, y: 24, w: 36, h: 30 };
// Minijuego de respaldo de STELLA: cada pulso es [duración, silencio] en unidades
const SENALES = {
  A: Array(8).fill([2, 2]),
  B: [[1, 1], [1, 1], [3, 3], [1, 1], [1, 1], [3, 3], [1, 1], [1, 1], [3, 3]],
  C: [[3, 1], [1, 3], [2, 1], [1, 1], [3, 2], [1, 1], [2, 3], [1, 1]]
};
const CORRECTA = "B";
const UNIDAD = 5;



const STELLA = { x: 238, y: 41 };       // avatar holográfico (monitor junto a la puerta)
const STELLA_PX = [
  "....cccc....", "..cCCCCCCc..", ".cCCCCCCCCc.", ".cCwwwwwwCc.", ".cCwdwwdwCc.", ".cCwwwwwwCc.",
  ".cCwwddwwCc.", "..cCwwwwCc..", "...cCCCCc...", "....cCCc....", "..cCCCCCCc..", ".cCCCwwCCCc.",
  ".cCCCCCCCCc.", "............"
];
const ESTRELLA = ["...k...", "..kYk..", "kkkYkkk", "kYYYYYk", ".kYYYk.", ".kYkYk.", ".kk.kk."];

export class CentroControl extends Phaser.Scene {
  constructor() { super("CentroControl"); }

  // La mochila ES el estado compartido: no hay copia aparte
  get mochila() { return estado.mochila; }
  set mochila(v) { estado.mochila = v; }

  create() {
    // La partida empieza en la Carta; aquí solo se arma la mochila
    estado.mochila = [];
    this.t = estado.textos.centro_control;
    this.activa = null;
    this.saliendo = false;
    this.entro = false;
    this.modal = null;
    this.stellaPanel = null; this.cerrandoStella = false;   // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    this.cola = null;
    this.pulsos = null;
    this.eventosPanel = [];
    this.eventosSeccion = [];
    this.contenido = null;
    this.sub = null;
    // Registro para el mapa de consecuencias (se completa al salir)
    this.reg = estado.mision2 = {
      objetos: [], pesoTotal: 0, oxigenoIncluido: false,
      alertaVista: false, senalIdentificada: false, intentosMinijuego: 0,
      mapaConsultado: false, revisiones: 0, revisionFinal: false, salidaConfirmada: false,
      stella: { consultada: false, secciones: [], entorno: [], saberMas: [], recomendaciones: [], evaluaciones: 0 }
    };

    crearTexturasMochila(this);
    // el astronauta lleva el traje que eligió en Equipo
    this.astroClave = crearAstro32(this, estado.traje?.id);
    crearTextura(this, "px_estrella", ESTRELLA, { k: 0x1a1c2c, Y: 0xffcd75 });
    this.dibujarSala();
    this.crearMonitor();
    this.crearObjetos();
    this.crearStella();
    this.crearPersonajes();
    this.crearBurbuja();
    this.crearHud();
    this.crearTarjeta();
    const om = boton(this, 288, 150, this.t.omitir, () => this.omitir(), 52);
    this.btnOmitir = [om.caja.setDepth(1500), om.etiqueta.setDepth(1501)];
    this.btnOmitir.forEach(o => o.setVisible(false));
    this.actualizarHud();
    // estado.mision1 queda de una versión vieja (la escena Senal se quitó): la señal se identifica aquí, con STELLA
    Object.assign(this.reg, estado.mision1 || { alertaVista: true });
    if (this.reg.senalIdentificada) this.marcarLocalizada();

    // Entrada: camina desde abajo; luego el robot explica el oxígeno
    this.actualizarControl();
    this.tweens.add({
      targets: this.astro, y: 140, duration: 900,
      onComplete: () => {
        this.entro = true;
        this.stellaDetecta();
        this.hablar([this.t.inicial, this.t.bienvenida]);
      }
    });

    this.destino = null;
    this.alLlegar = null;
    this.input.on("pointerdown", p => {
      if (this.cola) return this.avanzar();
      if (this.tarjeta.visible) return this.cerrarTarjeta();
      if (this.controlActivo && p.worldY > PARED && p.worldY < HUD) this.caminarA(p.worldX, p.worldY, null);
    });
    this.teclas = this.input.keyboard.createCursorKeys();
    ["ENTER", "SPACE"].forEach(k => this.input.keyboard.on("keydown-" + k, () => {
      if (this.cola) this.avanzar();
      else if (this.tarjeta.visible) this.cerrarTarjeta();
      else if (!this.modal) this.usarZona();
    }));

    // Limpieza al cambiar de escena
    this.events.once("shutdown", () => {
      this.input.removeAllListeners();
      this.input.keyboard.removeAllListeners();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.cola = null;
      this.pulsos = null;
      this.modal = null;
      this.contenido = this.sub = null;
    });
  }

  // ---------------------------------------------------------------- sala
  dibujarSala() {
    const g = this.add.graphics().setDepth(-10);
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    const marco = (x, y, w, h, c) => { r(c, x, y, w, 1); r(c, x, y + h - 1, w, 1); r(c, x, y, 1, h); r(c, x + w - 1, y, 1, h); };

    // pared de paneles (igual que el hangar)
    r(0x2a3a7a, 0, 0, ANCHO, PARED);
    for (let y = 4; y < PARED - 6; y += 8) for (let x = 0; x < ANCHO; x += 8) {
      r(0x3a4f99, x, y, 8, 1); r(0x3a4f99, x, y, 1, 8);
      r(0x22306a, x, y + 7, 8, 1); r(0x22306a, x + 7, y, 1, 8);
    }
    r(0x1a1c2c, 0, 0, ANCHO, 4);
    for (let x = 36; x < ANCHO; x += 64) { r(0xffcd75, x, 0, 10, 2); r(0xfff27a, x + 2, 0, 6, 1); }
    r(0x1a1c2c, 0, PARED - 6, ANCHO, 6);
    for (let x = 2; x < ANCHO; x += 8) r(0xffcd75, x, PARED - 4, 4, 3);

    // cartel del título
    r(0x1a1c2c, 84, 5, 152, 15); r(0x1d2650, 85, 6, 150, 13); marco(85, 6, 150, 13, 0xffcd75);

    // monitor con el polo sur de la Luna (cráter en sombra)
    r(0x1a1c2c, 8, 22, 40, 34); r(0x0b1026, 10, 24, 36, 30); marco(9, 23, 38, 32, 0x333c57);
    [[14, 27], [22, 30], [33, 26], [41, 31], [18, 35]].forEach(([x, y]) => r(0xf4f4f4, x, y, 1, 1));
    for (let x = 10; x < 46; x++) {
      const alto = 11 + Math.round(Math.sin(x / 5) * 2);
      r(0x94b0c2, x, 54 - alto, 1, alto); r(0xc2c3c7, x, 54 - alto, 1, 1);
    }
    g.fillStyle(0x1a1c2c).fillEllipse(28, 49, 18, 6);
    r(0x1a1c2c, 6, 56, 44, 9); r(0x566c86, 7, 57, 42, 2); r(0x333c57, 7, 59, 42, 5);
    [0xff5c5c, 0x5cff8a, 0x29adff, 0xffcd75, 0xff5c5c, 0x5cff8a, 0x29adff].forEach((c, i) => r(c, 10 + i * 5, 60, 3, 2));

    // muebles con dos tablas
    REPISAS.forEach(x => {
      r(0x1a1c2c, x - 22, 23, 44, PARED - 23);
      r(0x333c57, x - 21, 24, 42, PARED - 24);
      r(0x29366f, x - 19, 26, 38, PARED - 28);
      r(0x566c86, x - 21, 24, 42, 2);
      r(0x566c86, x - 21, 24, 2, PARED - 24); r(0x566c86, x + 19, 24, 2, PARED - 24);
      TABLAS.forEach(y => { r(0xc2c3c7, x - 21, y, 42, 1); r(0x94b0c2, x - 21, y + 1, 42, 1); r(0x1a1c2c, x - 21, y + 2, 42, 1); });
    });

    // puerta (marco; las hojas se abren al salir)
    const px = PUERTA.x;
    r(0x1a1c2c, px - 16, 42, 32, PARED - 42);
    r(0x0b1026, px - 14, 46, 28, PARED - 46);
    r(0x5cff8a, px - 6, 37, 12, 3);
    this.hojas = [-1, 1].map(s => {
      const h = this.add.graphics({ x: px + s * 14, y: 46 }).setDepth(-9);
      const x0 = s < 0 ? 0 : -13;
      h.fillStyle(0x566c86).fillRect(x0, 0, 13, PARED - 46);
      h.fillStyle(0x94b0c2).fillRect(x0, 0, 1, PARED - 46);
      h.fillStyle(0x333c57).fillRect(x0 + 4, 8, 5, 8);
      h.fillStyle(0x29adff).fillRect(x0 + 5, 9, 2, 2);
      for (let i = 0; i < 3; i++) h.fillStyle(i % 2 ? 0x1a1c2c : 0xffcd75).fillRect(x0 + 1 + i * 4, PARED - 50, 4, 3);
      return h;
    });
    // luz y candado: la puerta queda bloqueada mientras falte el oxígeno
    this.luzPuerta = this.add.rectangle(px, 37, 12, 3, 0xff5c5c).setOrigin(0.5, 0).setDepth(-8);
    this.candadoPuerta = this.candado(px, 62, -7);

    // piso de baldosas
    r(0x5a6890, 0, PARED, ANCHO, ALTO - PARED);
    for (let y = PARED; y < ALTO; y += 16) for (let x = 0; x < ANCHO; x += 16) {
      r(0x6f7da3, x, y, 15, 1); r(0x6f7da3, x, y, 1, 15);
      r(0x434f74, x, y + 15, 16, 1); r(0x434f74, x + 15, y, 1, 16);
    }
    r(0x1a1c2c, 0, PARED, ANCHO, 2);
    // tapete frente a la puerta
    r(0x38b764, px - 14, PARED + 4, 28, 10); r(0x257179, px - 12, PARED + 6, 24, 6);

    this.add.image(240, 104, "planta").setOrigin(0.5, 1).setDepth(104);
    this.add.image(22, 150, "bote").setOrigin(0.5, 1).setDepth(150);

    texto(this, 160, 8, this.t.titulo, { tam: 7, ancho: 146 }).setDepth(-5);
    texto(this, px, 31, this.t.puerta, { tam: 5, color: "#5cff8a" }).setDepth(-5);
  }

  // Candado en pixel art (forma, no solo color)
  candado(x, y, prof) {
    const c = this.add.graphics({ x, y }).setDepth(prof);
    c.fillStyle(0x1a1c2c).fillRect(-4, -9, 8, 2).fillRect(-4, -8, 2, 5).fillRect(2, -8, 2, 5).fillRect(-5, -3, 10, 9);
    c.fillStyle(0xffcd75).fillRect(-4, -2, 8, 7);
    c.fillStyle(0x1a1c2c).fillRect(-1, 0, 2, 3);
    return c;
  }

  // ---------------------------------------------------------------- monitor de la señal
  crearMonitor() {
    if (!this.textures.exists("estatica")) {
      const g = this.make.graphics({ add: false });
      for (let i = 0; i < 380; i++) g.fillStyle(Phaser.Utils.Array.GetRandom([0x94b0c2, 0x566c86, 0xf4f4f4, 0x1a1c2c]))
        .fillRect(Phaser.Math.Between(0, MONITOR.w - 1), Phaser.Math.Between(0, MONITOR.h - 1), 1, 1);
      g.generateTexture("estatica", MONITOR.w, MONITOR.h);
      g.destroy();
    }
    this.ruido = this.add.image(MONITOR.x, MONITOR.y, "estatica").setOrigin(0).setDepth(-8).setVisible(false);
    this.alertaMonitor = this.add.rectangle(MONITOR.x, MONITOR.y, MONITOR.w, MONITOR.h, 0xff5c5c).setOrigin(0).setDepth(-8).setVisible(false);
    this.signoMonitor = texto(this, 28, 30, "!", { tam: 12, color: "#fff27a" }).setDepth(-7).setVisible(false);
    this.indicador = texto(this, 28, 5, this.t.indicador, { tam: 6, ancho: 46, color: "#fff27a" })
      .setBackgroundColor("#b13e53").setPadding(2, 1).setDepth(-6).setVisible(false);
    this.zonaMonitor = this.add.zone(28, 39, 40, 34);
    this.zonaMonitor.on("pointerdown", (p, lx, ly, ev) => {
      ev.stopPropagation();
      if (this.cola) return this.avanzar();
      if (!this.controlActivo) return;
      this.abrirStella(3, true);   // la señal se analiza con STELLA
    });
  }

  // Se activa al examinar el primer objeto o tras explorar un rato. Una sola vez.
  intentarAlerta() {
    if (this.reg.alertaVista || this.reg.senalIdentificada || this.saliendo) return;
    if (!this.controlActivo) return void this.time.delayedCall(1500, () => this.intentarAlerta());
    this.reg.alertaVista = true;
    const a = this.t.alerta;
    this.alertaMonitor.setVisible(true);
    this.parpadeo = this.tweens.add({ targets: [this.alertaMonitor, this.signoMonitor], alpha: { from: 0.15, to: 0.8 }, duration: 300, yoyo: true, repeat: -1 });
    this.signoMonitor.setVisible(true);
    this.hablar([
      () => {
        this.sonar("alerta");
        this.tweens.add({ targets: this.chispa, angle: { from: -12, to: 12 }, duration: 80, yoyo: true, repeat: 5, onComplete: () => this.chispa.setAngle(0) });
        return 600;
      },
      a[0],
      () => { this.ruido.setVisible(true); this.sonar("estatica"); this.time.delayedCall(500, () => this.sonar("ladrido")); return 1200; },
      a[1], a[2], a[3]
    ], () => this.mostrarIndicador(), null, true);
  }

  mostrarIndicador() {
    this.chispa.setAngle(0);
    this.ruido.setVisible(false);
    this.indicador.setVisible(true);
    this.parpadeoIndicador = this.tweens.add({ targets: this.indicador, alpha: { from: 1, to: 0.35 }, duration: 450, yoyo: true, repeat: -1 });
    this.zonaMonitor.setInteractive({ useHandCursor: true });
  }

  marcarLocalizada() {
    this.parpadeo?.remove();
    this.parpadeoIndicador?.remove();
    this.alertaMonitor.setVisible(false);
    this.signoMonitor.setVisible(false);
    this.stellaDetecta();
    this.indicador.setText(this.t.localizada).setBackgroundColor("#257179").setColor("#eef1ff").setAlpha(1).setVisible(true);
  }

  // ---------------------------------------------------------------- objetos
  crearObjetos() {
    this.zonas = [];
    this.iconos = {};
    ORDEN_REPISA.forEach((id, i) => {
      const o = OBJETOS.find(x => x.id === id);
      const x = REPISAS[Math.floor(i / 2)] + (i % 2 ? 10 : -10), y = TABLAS[i % 2];
      const s = this.add.image(x, y, "px_" + o.clave).setOrigin(0.5, 1).setDepth(-5).setInteractive({ useHandCursor: true });
      texto(this, x, y + 2, o.peso + " kg" + (id === OBLIGATORIO ? " ★" : ""), { tam: 5, color: "#ffcd75" }).setDepth(-5);
      const zona = { tipo: "objeto", o, x, y: PISO.y1 + 4 };
      // Tocar un objeto lo toma o lo deja sin mover al astronauta
      s.on("pointerdown", (p, lx, ly, ev) => {
        ev.stopPropagation();
        if (this.cola) return this.avanzar();
        if (this.tarjeta.visible) return this.cerrarTarjeta();
        if (this.controlActivo) this.alternar(o);
      });
      this.zonas.push(zona);
      this.iconos[id] = s;
    });
    // distintivo del tanque obligatorio: estrella y candado al guardarlo
    const ox = this.iconos[OBLIGATORIO];
    this.add.image(ox.x + 8, ox.y - 15, "px_estrella").setDepth(-4);
    this.candadoTanque = this.candado(ox.x, ox.y - 4, -4).setVisible(false);

    const puerta = { tipo: "puerta", x: PUERTA.x, y: PUERTA.y, r: 14 };
    this.add.zone(PUERTA.x, 66, 30, 44).setInteractive({ useHandCursor: true })
      .on("pointerdown", (p, lx, ly, ev) => {
        ev.stopPropagation();
        if (this.cola) return this.avanzar();
        if (!this.controlActivo) return;
        if (this.activa === puerta) this.salir();
        else this.caminarA(puerta.x, puerta.y, null);   // se cruza al llegar (proximidad)
      });
    this.zonas.push(puerta);
    this.foco = this.add.rectangle(0, 0, 20, 20).setStrokeStyle(1, 0xfff27a).setDepth(-4).setVisible(false);
  }

  // ---------------------------------------------------------------- personajes
  crearPersonajes() {
    this.paso = 0;
    this.tiempoPaso = 0;
    this.sombra = this.add.ellipse(0, 0, 14, 4, 0x1a1c2c, 0.4);
    this.astro = this.add.image(150, ALTO + 30, `${this.astroClave}_0`).setOrigin(0.5, 1);
    this.sombraChispa = this.add.ellipse(0, 0, 8, 3, 0x1a1c2c, 0.3);
    this.chispa = this.add.image(174, 120, "chispa_px");
    this.dialogo = texto(this, 0, 0, "", { tam: 6, ancho: 150, origenY: 1 })
      .setBackgroundColor("#1d2650").setPadding(2, 1).setDepth(1000).setVisible(false);
  }

  decir(frase, ms) {
    this.dialogo.setText(frase).setVisible(true);
    this.time.removeEvent(this.ocultarDialogo);
    this.ocultarDialogo = this.time.delayedCall(ms || Math.max(3000, frase.length * 55), () => this.dialogo.setVisible(false));
  }

  // Diálogo que avanza con clic, toque, Enter o Espacio. Los pasos que son
  // funciones hacen un efecto y devuelven cuántos ms esperar.
  hablar(pasos, alTerminar, txt = null, omitible = false) {
    this.cola = { pasos: [...pasos], alTerminar, txt };
    this.time.removeEvent(this.ocultarDialogo);
    this.btnOmitir.forEach(o => o.setVisible(omitible));
    this.actualizarControl();
    this.avanzar();
  }

  avanzar() {
    const c = this.cola;
    if (!c) return;
    this.time.removeEvent(this.esperaCola);
    const p = c.pasos.shift();
    if (p === undefined) return this.terminarCola();
    if (typeof p === "function") {
      this.esperaCola = this.time.delayedCall(p() || 0, () => this.avanzar());
      return;
    }
    if (c.txt) c.txt.setText(p + "  ▸");
    else this.dialogo.setText(p + "  ▸").setVisible(true);
  }

  terminarCola() {
    const c = this.cola;
    if (!c) return;
    this.cola = null;
    this.time.removeEvent(this.esperaCola);
    this.btnOmitir.forEach(o => o.setVisible(false));
    if (!c.txt) this.dialogo.setVisible(false);
    this.actualizarControl();
    c.alTerminar?.();
  }

  omitir() { this.terminarCola(); }

  actualizarControl() {
    this.controlActivo = this.entro && !this.modal && !this.cola && !this.tarjeta?.visible && !this.saliendo;
    if (!this.controlActivo) { this.destino = null; this.alLlegar = null; }
  }

  crearBurbuja() {
    this.burbuja = this.add.container(0, 0).setDepth(1001).setVisible(false);
    const fondo = this.add.rectangle(0, 0, 120, 28, COLOR.panel).setStrokeStyle(1, COLOR.borde).setOrigin(0.5, 0);
    this.bNombre = texto(this, 0, 2, "", { tam: 6, ancho: 116, color: COLOR.titulo });
    this.bDesc = texto(this, 0, 10, "", { tam: 5, ancho: 116 });
    this.bAccion = texto(this, 0, 20, this.t.accion, { tam: 5, ancho: 116, color: COLOR.tenue });
    this.burbuja.add([fondo, this.bNombre, this.bDesc, this.bAccion]);
  }

  mostrarBurbuja(zona) {
    if (zona.tipo === "stella") {
      const st = this.t.stella;
      this.bNombre.setText(st.nombre);
      this.bDesc.setText(st.ticker);
      this.bAccion.setText(st.accion).setColor(COLOR.tenue);
      return this.burbuja.setPosition(Phaser.Math.Clamp(zona.x, 62, ANCHO - 62), 110).setVisible(true);
    }
    const o = zona.o;
    this.bNombre.setText(`${this.t.nombres[o.id]} · ${o.peso} kg`);
    this.bDesc.setText(this.t.objetos[o.id]);
    this.bAccion.setText(o.id !== OBLIGATORIO ? this.t.accion : this.lleva(o.id) ? this.t.obligatorio_guardado : this.t.obligatorio);
    this.bAccion.setColor(o.id === OBLIGATORIO ? COLOR.titulo : COLOR.tenue);
    this.burbuja.setPosition(Phaser.Math.Clamp(zona.x, 62, ANCHO - 62), 110).setVisible(true);
  }

  // ---------------------------------------------------------------- mochila
  crearHud() {
    this.add.rectangle(0, HUD, ANCHO, ALTO - HUD, COLOR.panel).setOrigin(0).setDepth(900);
    this.add.rectangle(0, HUD, ANCHO, 1, COLOR.borde).setOrigin(0).setDepth(900);
    texto(this, 4, HUD + 5, this.t.mochila, { tam: 6, origenX: 0, align: "left" }).setDepth(901);
    this.segmentos = Array.from({ length: CAPACIDAD_MOCHILA }, (_, i) =>
      this.add.rectangle(42 + i * 7, HUD + 6, 6, 6, 0x0a0f24).setOrigin(0).setStrokeStyle(1, 0x333c57).setDepth(901));
    this.textoPeso = texto(this, 116, HUD + 5, "", { tam: 6, origenX: 0, align: "left" }).setDepth(901);
    // distintivo del equipo obligatorio
    this.add.rectangle(150, HUD + 2, 72, 15, 0x0b1026).setOrigin(0).setStrokeStyle(1, 0xffcd75).setDepth(901);
    texto(this, 186, HUD + 2, this.t.obligatorio, { tam: 5, color: COLOR.titulo }).setDepth(902);
    this.textoO2 = texto(this, 186, HUD + 9, "", { tam: 5 }).setDepth(902);
    this.iconosHud = [];
  }

  actualizarHud() {
    const p = this.peso(), lleno = p === CAPACIDAD_MOCHILA, o2 = this.lleva(OBLIGATORIO);
    this.segmentos.forEach((s, i) => s.setFillStyle(i < p ? (lleno ? 0xffcd75 : 0x5cff8a) : 0x0a0f24));
    this.textoPeso.setText(`${p}/${CAPACIDAD_MOCHILA} kg`);
    this.textoO2.setText(o2 ? this.t.hud_o2_si : this.t.hud_o2_no).setColor(o2 ? "#5cff8a" : "#ff8a5c");
    this.iconosHud.forEach(i => i.destroy());
    this.iconosHud = this.mochila.map((id, i) => this.add.image(234 + i * 14, HUD + 9, "px_obj_" + id).setScale(0.75).setDepth(901));
    this.luzPuerta.setFillStyle(o2 && estado.traje && estado.nave ? 0x5cff8a : 0xff5c5c);
    this.candadoPuerta.setVisible(!o2 || !estado.traje || !estado.nave);   // cerrada sin oxígeno, traje o cohete
    this.candadoTanque.setVisible(o2);
  }

  lleva(id) { return this.mochila.includes(id); }
  peso(lista = this.mochila) { return lista.reduce((s, id) => s + OBJETOS.find(o => o.id === id).peso, 0); }
  llenar(plantilla, o) { return llenar(plantilla, o); }

  alternar(o) {
    const nombre = this.t.nombres[o.id];
    if (this.lleva(o.id)) {
      // el tanque obligatorio no se puede quitar
      if (o.id === OBLIGATORIO) { this.stellaSala.reaccionar("alerta"); return this.decir(this.t.oxigeno_fijo); }
      this.mochila = this.mochila.filter(id => id !== o.id);
      this.decir(this.t.prefijo_stella + this.t.stella.consejos.dejar[o.id]);
    } else {
      const exceso = this.peso() + o.peso - CAPACIDAD_MOCHILA;
      if (exceso > 0) {
        this.decir(this.llenar(this.t.exceso, { nombre, kg: exceso }), 6000);
        this.cameras.main.shake(150, 0.003);
        this.stellaSala.reaccionar("alerta");
        return;
      }
      if (o.id === OBLIGATORIO) { this.mochila.unshift(o.id); this.decir(this.t.oxigeno_ok); }
      else { this.mochila.push(o.id); this.decir(this.t.prefijo_stella + this.t.stella.consejos.tomar[o.id]); }
      if (o.id === "linterna") this.mostrarTarjeta("tarjeta");
    }
    this.iconos[o.id].setAlpha(this.lleva(o.id) ? 0.25 : 1);
    this.actualizarHud();
    this.stellaDetecta();
    if (this.activa?.o === o) this.mostrarBurbuja(this.activa);
    this.time.delayedCall(2500, () => this.intentarAlerta());   // primer objeto examinado
  }

  // ---------------------------------------------------------------- tarjeta NASA
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
      this.tjIcono = this.add.image(-90, 30, "px_obj_linterna").setScale(2),
      this.tjTitulo, this.tjTexto, this.tjFuente, this.tjCerrar
    ]);
  }

  mostrarTarjeta(clave) {
    const tj = typeof clave === "string" ? this.t[clave] : clave;
    this.tjIcono.setTexture(tj.icono || "px_obj_linterna").setScale(tj.icono === "astro32_0" ? 1 : 2);
    this.tjTitulo.setText(tj.titulo);
    this.tjTexto.setText(tj.texto);
    this.tjFuente.setText(tj.fuente);
    this.tjCerrar.setText(tj.cerrar);
    this.tarjeta.setVisible(true);
    this.burbuja.setVisible(false);
    this.actualizarControl();
  }

  cerrarTarjeta() {
    this.tarjeta.setVisible(false);
    if (!this.modal && this.activa?.tipo === "objeto") this.activa = null;   // vuelve la burbuja
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
    this.burbuja.setVisible(false);
    this.foco.setVisible(false);
    this.dialogo.setVisible(false);
    this.actualizarControl();
    return this.modal;
  }

  cerrarPanel() {
    if (!this.modal) return;
    this.limpiarContenido();
    this.tabs = null;
    this.stellaPanel = null;
    this.cerrandoStella = false;
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
  lineaRobot(inicial, avatar = "chispa_px") {
    if (avatar === "stella") return this.lineaStella(inicial);
    this.modal.add([
      this.add.rectangle(16, 122, 288, 30, 0x0b1026, 0.6).setOrigin(0).setStrokeStyle(1, 0x333c57),
      this.add.image(30, 137, avatar)
    ]);
    const tx = texto(this, 42, 125, inicial, { tam: 6, ancho: 256, origenX: 0, align: "left" });
    this.modal.add(tx);
    return tx;
  }

  // ---------------------------------------------------------------- mapa
  // Franja inferior con STELLA holográfica (en vez del ícono del robot)
  lineaStella(inicial) {
    this.modal.add(this.add.rectangle(16, 122, 288, 30, 0x0b1026, 0.6).setOrigin(0).setStrokeStyle(1, 0x333c57));
    this.stellaPanel = new Stella(this, 30, 150);
    this.modal.add(this.stellaPanel.c);
    const tx = texto(this, 44, 125, inicial, { tam: 6, ancho: 256, origenX: 0, align: "left" });
    this.modal.add(tx);
    return tx;
  }

  // ---------------------------------------------------------------- minijuego de respaldo (STELLA)
  // La señal se identifica aquí (antes había una escena Senal aparte). Si llega
  // sin identificar, STELLA ofrece este análisis para no dejar al jugador atorado.
  abrirMinijuego() {
    const s = this.t.stella.senal;
    this.miniStella = true;
    const t = this.miniTxt = { ...this.t.mini, titulo: s.titulo, explica: s.explica, mal: s.mal, bien: s.bien };
    const m = this.abrirPanel(t.titulo, "#7ee6ff");
    const g = this.add.graphics();
    m.add(g);
    // leyenda: la diferencia está en la LONGITUD del pulso, no en el color
    g.fillStyle(0x7ee6ff).fillRect(96, 25, UNIDAD, 6).fillRect(170, 25, UNIDAD * 3, 6);
    m.add([texto(this, 104, 23, t.corto, { tam: 6, origenX: 0 }), texto(this, 188, 23, t.largo, { tam: 6, origenX: 0 })]);
    this.pulsos = [];
    const filas = {};
    Object.keys(SENALES).forEach((l, i) => {
      const y = 48 + i * 25, nombre = this.llenar(t.senal, { l });
      const b = this.btn(44, y, nombre, () => this.elegirSenal(l, filas), 56);
      g.fillStyle(0x0b1026).fillRect(80, y - 9, 192, 18);
      g.lineStyle(1, 0x333c57).strokeRect(80, y - 9, 192, 18);
      let x = 86;
      const rects = SENALES[l].map(([d, sil]) => {
        const r = this.add.rectangle(x, y, d * UNIDAD, 8, 0x29adff).setOrigin(0, 0.5);
        x += (d + sil) * UNIDAD;
        return r;
      });
      const cabezal = this.add.rectangle(82, y, 1, 16, 0xfff27a);
      m.add([...rects, cabezal]);
      this.tweens.add({ targets: cabezal, x: 270, duration: 3600, repeat: -1 });
      this.pulsos.push({ rects, cabezal });
      this.btn(289, y, "♪", () => this.sonarPatron(SENALES[l]), 18);
      filas[l] = { b, nombre, rects };
    });
    this.textoRobot = this.lineaRobot(t.explica, "stella");
    this.stellaPanel.estado("pensando");
    this.btn(50, 163, t.volver, () => this.volver(), 60);
  }

  elegirSenal(l, filas) {
    if (this.reg.senalIdentificada) return;
    const t = this.miniTxt, f = filas[l];
    this.reg.intentosMinijuego = (this.reg.intentosMinijuego || 0) + 1;
    if (l !== CORRECTA) {
      f.b.etiqueta.setText("✗ " + f.nombre);
      this.textoRobot.setText(t.mal);
      this.stellaPanel?.reaccionar("alerta", 1200);
      this.sonar("mal");
      this.tweens.add({ targets: f.rects, x: "+=2", duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this.reg.senalIdentificada = true;
    f.b.etiqueta.setText("✓ " + f.nombre);
    f.b.caja.setStrokeStyle(2, 0x5cff8a);
    this.textoRobot.setText(t.bien);
    this.stellaPanel?.estado("exito");
    this.sonar("bien");
    this.tweens.add({ targets: f.rects, scaleY: 1.8, duration: 160, yoyo: true, repeat: 3 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, d = this.add.rectangle(176, f.rects[0].y, 2, 2, 0xfff27a);
      this.modal.add(d);
      this.tweens.add({ targets: d, x: 176 + Math.cos(a) * 60, y: f.rects[0].y + Math.sin(a) * 22, alpha: 0, duration: 700 });
    }
    this.marcarLocalizada();
    this.luego(3000, () => { this.abrirStella(3); this.stellaLinea.setText(t.bien); this.stellaPanel.estado("exito"); });
  }

  // Volver desde el minijuego o el mapa: a STELLA si se abrió desde ahí
  volver() { this.miniStella ? this.abrirStella(3) : this.cerrarPanel(); }

  abrirMapa(desdeStella = false) {
    this.miniStella = desdeStella;
    const t = this.t.mapa, m = this.abrirPanel(t.titulo, desdeStella ? "#7ee6ff" : COLOR.titulo);
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

    this.lineaRobot(desdeStella ? this.t.stella.senal.mapa : t.robot, desdeStella ? "stella" : "chispa_px");
    this.stellaPanel?.estado("explicando");
    this.btn(200, 163, t.dato, () => this.mostrarTarjeta("tarjeta_mapa"), 70);
    this.btn(272, 163, t.volver, () => this.volver(), 56);
    if (primeraVez) this.luego(2200, () => this.mostrarTarjeta("tarjeta_mapa"));
  }

  // ---------------------------------------------------------------- STELLA (monitor en la sala)
  // Pared libre entre la última repisa y la puerta. Pantalla con avatar
  // holográfico, luz de disponible, indicación "▶ TOCAR" y letrero que corre.
  crearStella() {
    const st = this.t.stella, X = STELLA.x;
    crearTextura(this, "stella_px", STELLA_PX, { c: 0x7ee6ff, C: 0x29adff, w: 0xbff3ff, d: 0x1d2b53 });
    const g = this.add.graphics().setDepth(-9);
    g.fillStyle(0x1a1c2c).fillRect(215, 23, 46, 55);
    g.fillStyle(0x333c57).fillRect(216, 24, 44, 53);
    g.fillStyle(0x0b1026).fillRect(218, 26, 40, 30);                 // pantalla
    g.lineStyle(1, 0x7ee6ff, 0.6).strokeRect(217.5, 25.5, 41, 31);
    g.fillStyle(0x29366f).fillRect(217, 58, 42, 8);                   // consola
    g.fillStyle(0x0b1026).fillRect(217, 67, 42, 9);                   // banda del letrero
    // STELLA animada (src/stella.js) proyectada sobre su plataforma
    this.stellaSala = new Stella(this, X, 54, -8);
    this.stellaSala.aparecer();
    this.ledStella = this.add.rectangle(255, 62, 3, 3, 0x5cff8a).setDepth(-7);
    this.tweens.add({ targets: this.ledStella, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    texto(this, 220, 59, st.tocar, { tam: 5, origenX: 0, color: "#7ee6ff" }).setDepth(-7);
    // letrero que corre dentro de la banda
    const banda = this.make.graphics({ add: false }).fillRect(217, 67, 42, 9);
    const ticker = texto(this, 260, 68, st.ticker, { tam: 5, origenX: 0, ancho: 400, color: "#7ee6ff" }).setDepth(-6);
    ticker.setMask(banda.createGeometryMask());
    this.tweens.add({ targets: ticker, x: { from: 260, to: 216 - ticker.width }, duration: 9000, repeat: -1 });

    const abrir = (p, lx, ly, ev) => {
      ev.stopPropagation();
      if (this.cola) return this.avanzar();
      if (this.controlActivo) this.abrirStella(undefined, true);
    };
    this.add.zone(X, 50, 46, 54).setInteractive({ useHandCursor: true }).on("pointerdown", abrir);
    this.zonas.push({ tipo: "stella", x: X, y: PISO.y1 + 4, r: 12 });
  }

  // Pequeña animación cuando STELLA detecta información nueva
  stellaDetecta() {
    [0, 250].forEach(d => {
      const c = this.add.circle(STELLA.x, STELLA.y, 4).setStrokeStyle(1, 0x7ee6ff).setDepth(-6);
      this.tweens.add({ targets: c, scale: 4, alpha: 0, duration: 700, delay: d, onComplete: () => c.destroy() });
    });
    this.stellaSala.reaccionar("hablando");
  }

  // Texto según la edad (preparado; aún no hay selector global de nivel)
  txtNivel(v) {
    if (typeof v === "string") return v;
    return v[estado.nivel || this.t.stella.nivel_defecto] || v.explorador;
  }

  // ---------------------------------------------------------------- STELLA (interfaz)
  abrirStella(sec = this.stellaSec || 1, saludo = false) {
    const st = this.t.stella, r = this.reg.stella;
    this.abrirPanel(st.titulo, "#7ee6ff");
    r.consultada = true;
    this.stellaLinea = this.lineaRobot("", "stella");
    this.tabs = st.secciones.map((nombre, i) => ({ nombre, b: this.btn(50, 32 + i * 19, nombre, () => this.seccionStella(i + 1), 64) }));
    this.btn(272, 163, st.cerrar, () => this.cerrarStella(), 56);
    this.seccionStella(sec);
    if (saludo) {
      this.stellaLinea.setText(st.bienvenida);
      this.stellaPanel.aparecer(() => this.stellaPanel?.reaccionar("saludo"));
    }
  }

  cerrarStella() {
    if (this.cerrandoStella) return;
    if (!this.stellaPanel) return this.cerrarPanel();
    this.cerrandoStella = true;
    this.stellaPanel.despedida(() => this.cerrarPanel());
  }

  seccionStella(n) {
    const clave = ["mision", "entorno", "senal", "equipo", "mochila"][n - 1], r = this.reg.stella;
    this.stellaSec = n;
    if (!r.secciones.includes(clave)) r.secciones.push(clave);
    this.limpiarContenido();
    this.contenido = this.add.container(0, 0);
    this.modal.add(this.contenido);
    this.tabs.forEach((tb, i) => {
      const on = i + 1 === n;
      tb.b.caja.setStrokeStyle(on ? 2 : 1, on ? 0x7ee6ff : COLOR.borde);
      tb.b.etiqueta.setText((on ? "▸ " : "") + tb.nombre);
    });
    this["stella_" + clave]();
  }

  limpiarContenido() {
    if (this.tarjeta.visible) this.cerrarTarjeta();   // la tarjeta "Saber más" es de la sección anterior
    this.eventosSeccion.forEach(e => e.remove());
    this.eventosSeccion = [];
    [this.sub, this.contenido].forEach(c => { if (c) { this.tweens.killTweensOf(c.list); c.destroy(); } });
    this.sub = this.contenido = null;
  }

  c(...objs) { this.contenido.add(objs); return objs[0]; }
  cbtn(x, y, txt, fn, ancho) { const b = boton(this, x, y, txt, fn, ancho); this.c(b.caja, b.etiqueta); return b; }
  encabezado(txt) { this.c(texto(this, 197, 24, txt, { tam: 6, color: "#7ee6ff", ancho: 210 })); }

  // 1. Estado de la misión
  stella_mision() {
    const t = this.t.stella.mision;
    this.encabezado(t.titulo);
    t.lineas.forEach((l, i) => this.c(texto(this, 94, 37 + i * 10, l, { tam: 6, origenX: 0, align: "left", ancho: 210 })));
    this.c(texto(this, 94, 103, t.aviso, { tam: 5, origenX: 0, align: "left", ancho: 210, color: COLOR.tenue }));
    this.stellaLinea.setText(t.dialogo);
    this.stellaPanel.estado("explicando");
    this.cbtn(98, 163, t.boton, () => this.seccionStella(2), 160);
  }

  // 2. Condiciones del entorno lunar (4 categorías)
  stella_entorno() {
    const t = this.t.stella.entorno;
    this.botonesCat = ["A", "B", "C", "D"].map((k, i) => [k, this.cbtn(117 + i * 53, 31, t[k].boton, () => this.categoria(k), 50)]);
    this.cbtn(60, 163, t.saber, () => this.saberMas(), 70);
    this.categoria(this.catActual || "A");
  }

  categoria(k) {
    const t = this.t.stella.entorno, d = t[k], r = this.reg.stella;
    this.catActual = k;
    if (this.tarjeta.visible) this.cerrarTarjeta();   // la tarjeta "Saber más" era de otra categoría
    if (!r.entorno.includes(k)) r.entorno.push(k);
    this.botonesCat.forEach(([kk, b]) => b.caja.setStrokeStyle(kk === k ? 2 : 1, kk === k ? 0x7ee6ff : COLOR.borde));
    if (this.sub) { this.tweens.killTweensOf(this.sub.list); this.sub.destroy(); }
    this.eventosSeccion.forEach(e => e.remove());
    this.eventosSeccion = [];
    this.sub = this.add.container(0, 0);
    this.contenido.add(this.sub);
    const g = this.add.graphics(), s = (...o) => { this.sub.add(o); return o[0]; };
    s(g);
    g.fillStyle(0x0b1026).fillRect(92, 42, 70, 66);
    g.lineStyle(1, 0x333c57).strokeRect(92, 42, 70, 66);
    this["ilustrar" + k](g, s);
    const x = 168;
    s(texto(this, x, 42, t.rec, { tam: 6, origenX: 0, color: "#7ee6ff" }),
      texto(this, x, 51, d.recomendacion, { tam: 6, origenX: 0, align: "left", ancho: 134 }),
      this.add.image(x + 6, 92, d.icono).setScale(d.icono === "astro32_0" ? 0.5 : d.icono === "stella_px" ? 1 : 0.75),
      texto(this, x + 14, 88, d.objeto, { tam: 6, origenX: 0, align: "left", ancho: 122 }),
      texto(this, x, 102, d.fuente, { tam: 5, origenX: 0, align: "left", ancho: 134, color: COLOR.tenue }));
    this.stellaLinea.setText(this.txtNivel(d.explica));
    this.stellaPanel.estado(k === "C" ? "alerta" : "explicando");   // tormenta solar = alerta
  }

  saberMas() {
    const k = this.catActual, d = this.t.stella.entorno[k], r = this.reg.stella;
    if (!r.saberMas.includes(k)) r.saberMas.push(k);
    let tj = d.mas;
    if (k === "C") {   // registro de DONKI que ya usa el juego (real o de ejemplo)
      const cme = estado.datos.cme;
      tj = { ...tj, texto: this.llenar(tj.texto, { fecha: fechaLarga(cme.fecha), vel: cme.velocidad_kms }),
        fuente: etiquetaDato(cme) + " · " + cme.fuente + " — ccmc.gsfc.nasa.gov/tools/DONKI" };
    }
    this.mostrarTarjeta({ ...tj, icono: d.icono, cerrar: this.t.tarjeta.cerrar });
  }

  // Ilustraciones animadas dentro del recuadro 92..162 × 42..108
  ilustrarA(g, s) {      // cráter con una parte iluminada y sombra permanente
    [[98, 48], [120, 46], [150, 52], [140, 60]].forEach(([x, y]) => g.fillStyle(0xf4f4f4).fillRect(x, y, 1, 1));
    g.fillStyle(0x566c86).fillRect(93, 82, 68, 25);
    g.fillStyle(0x94b0c2).fillEllipse(128, 88, 56, 16);
    g.fillStyle(0x1a1c2c).fillEllipse(131, 89, 46, 11);
    g.fillStyle(0xc2c3c7).fillEllipse(111, 89, 9, 9);
    g.fillStyle(0xffcd75).fillCircle(98, 76, 4);
    const haz = s(this.add.triangle(0, 0, 100, 76, 116, 84, 112, 92, 0xfff27a, 0.35).setOrigin(0));
    this.tweens.add({ targets: haz, alpha: 0.1, duration: 900, yoyo: true, repeat: -1 });
    s(texto(this, 134, 97, this.t.sombra, { tam: 5, color: COLOR.tenue }));
  }

  ilustrarB(g, s) {      // termómetro que baja y cráter frío
    g.fillStyle(0x566c86).fillRect(93, 92, 68, 15);
    g.fillStyle(0x1a1c2c).fillEllipse(140, 97, 34, 9);
    g.fillStyle(0x1a1c2c).fillRect(103, 48, 9, 44).fillCircle(107.5, 96, 6);
    g.fillStyle(0xf4f4f4).fillRect(105, 50, 5, 40);
    g.fillStyle(0x29adff).fillCircle(107.5, 96, 4.5);
    for (let y = 52; y < 90; y += 6) g.fillStyle(0x94b0c2).fillRect(113, y, 3, 1);
    const mercurio = s(this.add.rectangle(107.5, 93, 3, 40, 0x29adff).setOrigin(0.5, 1));
    this.tweens.add({ targets: mercurio, scaleY: 0.15, duration: 1400, yoyo: true, repeat: -1 });
    [[128, 50], [146, 58], [136, 70]].forEach(([x, y], i) => {
      const copo = s(texto(this, x, y, "*", { tam: 8, color: "#bff3ff" }));
      this.tweens.add({ targets: copo, y: y + 12, alpha: 0.2, duration: 1600, delay: i * 400, yoyo: true, repeat: -1 });
    });
  }

  ilustrarC(g, s) {      // Sol con actividad e indicador de riesgo SIMULADO
    const rayos = s(this.add.graphics({ x: 110, y: 62 }));
    rayos.lineStyle(2, 0xffcd75);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; rayos.lineBetween(Math.cos(a) * 11, Math.sin(a) * 11, Math.cos(a) * 15, Math.sin(a) * 15); }
    this.tweens.add({ targets: rayos, angle: 360, duration: 6000, repeat: -1 });
    s(this.add.circle(110, 62, 9, 0xffa300), this.add.circle(108, 60, 5, 0xffcd75));
    [0, 1, 2, 3].forEach(i => {
      const p = s(this.add.rectangle(122, 56 + i * 4, 2, 2, 0xfff27a));
      this.tweens.add({ targets: p, x: 158, alpha: 0, duration: 1200, delay: i * 300, repeat: -1 });
    });
    [4, 7, 10].forEach((h, i) => {
      const b = s(this.add.rectangle(136 + i * 8, 104, 6, h, i < 2 ? 0xff8a5c : 0x0b1026).setOrigin(0, 1).setStrokeStyle(1, 0xff8a5c));
      if (i === 1) this.tweens.add({ targets: b, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    });
    s(texto(this, 94, 97, this.t.stella.entorno.C.simulado, { tam: 5, origenX: 0, color: COLOR.tenue }));
  }

  ilustrarD(g, s) {      // rocas, pendiente, cráter y polvo que flota
    g.fillStyle(0x566c86).fillRect(93, 96, 68, 11).fillTriangle(110, 96, 161, 96, 161, 66);
    g.fillStyle(0x94b0c2).fillTriangle(130, 96, 161, 96, 161, 74);
    g.fillStyle(0x1a1c2c).fillEllipse(116, 103, 16, 4);
    [[102, 98, 4], [126, 92, 3], [148, 84, 4], [152, 99, 3]].forEach(([x, y, r]) => {
      g.fillStyle(0x1a1c2c).fillCircle(x, y, r + 1);
      g.fillStyle(0xc2c3c7).fillCircle(x, y, r);
    });
    [[100, 94], [108, 96], [124, 90], [140, 88], [146, 80], [132, 94]].forEach(([x, y], i) => {
      const p = s(this.add.rectangle(x, y, 1, 1, 0xf4f4f4));
      this.tweens.add({ targets: p, x: x + 8, y: y - 6, alpha: 0, duration: 1500, delay: i * 250, repeat: -1 });
    });
  }

  // 3. Señal de Chispa (usa el mismo minijuego y mapa de la sala)
  stella_senal() {
    const t = this.t.stella.senal, ok = this.reg.senalIdentificada;
    this.encabezado(t.titulo);
    const g = this.c(this.add.graphics());
    g.fillStyle(0x0b1026).fillRect(96, 38, 204, 30);
    g.lineStyle(1, 0x333c57).strokeRect(96, 38, 204, 30);
    const barras = Array.from({ length: 34 }, (_, i) => this.c(this.add.rectangle(102 + i * 5.8, 53, 3, 3, 0x7ee6ff)));
    this.eventosSeccion.push(this.time.addEvent({ delay: 120, loop: true,
      callback: () => barras.forEach(b => b.setScale(1, Phaser.Math.Between(1, ok ? 7 : 3))) }));
    this.c(texto(this, 96, 76, ok ? this.llenar(t.ok, { n: this.reg.intentosMinijuego }) : t.sin, { tam: 6, origenX: 0, color: ok ? "#5cff8a" : COLOR.texto }),
      texto(this, 96, 90, t.aviso, { tam: 5, origenX: 0, align: "left", ancho: 206, color: COLOR.tenue }));
    this.stellaLinea.setText(ok ? t.activa : t.detecta);
    this.stellaPanel.estado(ok ? "hablando" : "pensando");
    // el mapa es opcional: solo si el jugador lo pide
    this.cbtn(80, 163, ok ? t.ver_mapa : t.iniciar, () => ok ? this.abrirMapa(true) : this.abrirMinijuego(), 100);
  }

  // 4. Análisis de equipo: orienta, no elige
  stella_equipo() {
    const t = this.t.stella.equipo, filas = [];
    this.encabezado(t.titulo);
    ORDEN_REPISA.forEach((id, i) => {
      const o = OBJETOS.find(x => x.id === id), y = 40 + i * 12, lleva = this.lleva(id), obl = id === OBLIGATORIO;
      const fila = this.add.rectangle(92, y - 6, 212, 11, 0x0b1026, 0.5).setOrigin(0).setStrokeStyle(1, 0x333c57).setInteractive({ useHandCursor: true });
      fila.on("pointerdown", (p, lx, ly, ev) => {
        ev.stopPropagation();
        filas.forEach(f => f.setStrokeStyle(1, 0x333c57));
        fila.setStrokeStyle(2, 0x7ee6ff);
        this.stellaLinea.setText(t.rec[id]);
        this.stellaPanel?.estado("explicando");
        if (!this.reg.stella.recomendaciones.includes(id)) this.reg.stella.recomendaciones.push(id);
      });
      filas.push(fila);
      this.c(fila, this.add.image(100, y, "px_obj_" + id).setScale(0.75),
        texto(this, 108, y - 4, this.t.nombres[id], { tam: 6, origenX: 0 }),
        texto(this, 200, y - 4, o.peso + " kg", { tam: 6, origenX: 0 }),
        texto(this, 226, y - 4, obl ? t.obligatorio : t.opcional, { tam: 6, origenX: 0, color: obl ? COLOR.titulo : COLOR.tenue }),
        texto(this, 297, y - 4, lleva ? "✓" : "·", { tam: 6, color: lleva ? "#5cff8a" : COLOR.tenue }));
    });
    this.c(texto(this, 96, 108, t.leyenda, { tam: 5, origenX: 0, color: COLOR.tenue }));
    this.stellaLinea.setText(t.intro);
    this.stellaPanel.estado("hablando");
  }

  // 5. Evaluación de la mochila (lee el inventario compartido en ese momento)
  stella_mochila() {
    const t = this.t.stella.mochila, p = this.peso(), o2 = this.lleva(OBLIGATORIO);
    this.reg.stella.evaluaciones++;
    this.encabezado(t.titulo);
    if (!this.mochila.length) this.c(texto(this, 96, 34, t.vacia, { tam: 6, origenX: 0, color: COLOR.tenue }));
    this.mochila.forEach((id, i) => this.c(this.add.image(102 + i * 16, 39, "px_obj_" + id).setScale(0.75)));
    this.c(texto(this, 200, 33, this.llenar(t.peso, { kg: p }), { tam: 6, origenX: 0 }),
      texto(this, 200, 42, this.llenar(t.libre, { kg: Math.max(0, CAPACIDAD_MOCHILA - p) }), { tam: 6, origenX: 0 }),
      texto(this, 200, 51, o2 ? t.o2_si : t.o2_no, { tam: 6, origenX: 0, color: o2 ? "#5cff8a" : "#ff8a5c" }));
    for (let i = 0; i < CAPACIDAD_MOCHILA; i++)
      this.c(this.add.rectangle(96 + i * 9, 52, 8, 6, i < p ? 0x5cff8a : 0x0a0f24).setOrigin(0).setStrokeStyle(1, 0x333c57));
    const cubre = this.mochila.map(id => t.cubre_obj[id]);
    const limita = ORDEN_REPISA.filter(id => !this.lleva(id)).map(id => t.limita_obj[id]);
    this.c(texto(this, 96, 63, t.cubre, { tam: 6, origenX: 0, color: "#7ee6ff" }),
      texto(this, 200, 63, t.limita, { tam: 6, origenX: 0, color: "#7ee6ff" }),
      texto(this, 96, 72, cubre.join("\n") || "—", { tam: 6, origenX: 0, align: "left", ancho: 100 }),
      texto(this, 200, 72, limita.join("\n") || "—", { tam: 6, origenX: 0, align: "left", ancho: 104, color: COLOR.tenue }));
    this.stellaLinea.setText(this.evaluar());
    const problema = !o2 || p > CAPACIDAD_MOCHILA;
    this.stellaPanel.estado("pensando");   // analiza y luego responde
    this.eventosSeccion.push(this.time.delayedCall(900, () => this.stellaPanel?.estado(problema ? "alerta" : "hablando")));
    this.cbtn(84, 163, t.boton, () => {
      const v = this.evaluar();
      if (!this.lleva(OBLIGATORIO) || this.peso() > CAPACIDAD_MOCHILA) { this.stellaPanel?.reaccionar("alerta"); return this.stellaLinea.setText(v); }
      this.abrirRevision();
    }, 130);
  }

  evaluar() {
    const e = this.t.stella.mochila.eval;
    if (!this.lleva(OBLIGATORIO)) return e.falta;
    if (this.peso() > CAPACIDAD_MOCHILA) return e.exceso;
    return e[["linterna", "radio", "escudo"].find(id => this.lleva(id))] || e.base;
  }

  // ---------------------------------------------------------------- revisión
  salir() {
    if (this.saliendo || !this.controlActivo) return;
    if (!estado.traje || !estado.nave) {
      this.decir(this.t.falta_traje_nave, 5500);
      this.tweens.add({ targets: this.candadoPuerta, x: "+=2", duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    if (!this.lleva(OBLIGATORIO)) {
      this.decir(this.t.falta_oxigeno, 5500);
      this.tweens.add({ targets: this.candadoPuerta, x: "+=2", duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this.abrirRevision();
  }

  abrirRevision() {
    const t = this.t.revision, m = this.abrirPanel(t.titulo);
    this.reg.revisiones++;
    const p = this.peso(), o2 = this.lleva(OBLIGATORIO);
    m.add(texto(this, 20, 22, t.objetos, { tam: 6, origenX: 0, color: COLOR.tenue }));
    this.mochila.forEach((id, i) => {
      const o = OBJETOS.find(x => x.id === id), y = 37 + i * 12;
      m.add([
        this.add.image(26, y, "px_obj_" + id).setScale(0.75),
        texto(this, 36, y - 4, `${this.t.nombres[id]} · ${o.peso} kg${id === OBLIGATORIO ? " ★" : ""}`, { tam: 6, origenX: 0, align: "left", ancho: 130 })
      ]);
    });
    const x = 176;
    m.add([
      texto(this, x, 24, this.llenar(t.peso, { kg: p }), { tam: 6, origenX: 0 }),
      texto(this, x, 36, this.llenar(t.libre, { kg: Math.max(0, CAPACIDAD_MOCHILA - p) }), { tam: 6, origenX: 0 }),
      texto(this, x, 66, o2 ? t.o2_si : t.o2_no, { tam: 6, origenX: 0, color: o2 ? "#5cff8a" : "#ff8a5c" }),
      texto(this, x, 76, this.t.obligatorio, { tam: 5, origenX: 0, color: COLOR.titulo })
    ]);
    for (let i = 0; i < CAPACIDAD_MOCHILA; i++)
      m.add(this.add.rectangle(x + i * 9, 50, 8, 7, i < p ? 0x5cff8a : 0x0a0f24).setOrigin(0).setStrokeStyle(1, 0x333c57));

    const obs = [
      this.lleva("linterna") ? t.linterna_si : t.linterna_no,
      this.lleva("radio") ? t.radio_si : t.radio_no
    ];
    if (o2) obs.push(t.oxigeno_si);
    const robot = this.lineaRobot(obs.join(" "), "stella");
    this.stellaPanel.estado(o2 ? "exito" : "alerta");
    this.btn(80, 163, t.modificar, () => this.cerrarPanel(), 110);
    this.btn(240, 163, t.continuar, () => {
      // validación final
      if (!this.lleva(OBLIGATORIO) || this.peso() > CAPACIDAD_MOCHILA) this.stellaPanel?.reaccionar("alerta");
      if (!this.lleva(OBLIGATORIO)) return robot.setText(t.sin_oxigeno);
      if (this.peso() > CAPACIDAD_MOCHILA) return robot.setText(t.exceso);
      this.reg.revisionFinal = true;
      this.abrirTransmision();
    }, 100);
  }

  // ---------------------------------------------------------------- transmisión de Itzel
  abrirTransmision() {
    const t = this.t.transmision, m = this.abrirPanel(t.titulo, "#ff8a5c");
    const g = this.add.graphics();
    m.add(g);
    g.fillStyle(0x0b1026).fillRect(22, 26, 276, 34);
    g.lineStyle(1, 0x333c57).strokeRect(22, 26, 276, 34);
    const barras = Array.from({ length: 46 }, (_, i) => this.add.rectangle(32 + i * 5.6, 43, 3, 4, 0x5cff8a));
    m.add(barras);
    let viva = true;
    this.cada(90, () => barras.forEach(b => b.setScale(1, viva ? Phaser.Math.Between(1, 7) : 0.25)));

    const mensaje = texto(this, 160, 64, "", { tam: 6, ancho: 270 });
    const ladrido = texto(this, 160, 92, t.ladrido, { tam: 6, color: COLOR.tenue }).setVisible(false);
    const corte = texto(this, 160, 104, t.corte, { tam: 7, color: "#ff5c5c" }).setVisible(false);
    m.add([mensaje, ladrido, corte]);
    let omitir = null, terminado = false;

    const fin = () => {
      if (terminado) return;
      terminado = true;
      this.eventosPanel.filter(e => e !== bucle).forEach(e => e.remove());
      viva = false;
      mensaje.setText(t.mensaje);
      ladrido.setVisible(true);
      corte.setVisible(true);
      this.lineaRobot(t.robot);
      omitir.caja.setVisible(false); omitir.etiqueta.setVisible(false);
      const rescate = this.btn(160, 163, t.boton, () => this.terminar(), 130);
      this.tweens.add({ targets: rescate.caja, scaleX: 1.05, scaleY: 1.1, duration: 400, yoyo: true, repeat: -1 });
    };
    const bucle = this.eventosPanel[0];
    omitir = this.btn(280, 163, this.t.omitir, fin, 52);

    // secuencia: interferencia, mensaje letra por letra, ladrido, corte
    this.sonar("estatica");
    let n = 0;
    const escribir = this.cada(35, () => {
      mensaje.setText(t.mensaje.slice(0, ++n));
      if (n < t.mensaje.length) return;
      escribir.remove();
      this.luego(500, () => { this.sonar("ladrido"); ladrido.setVisible(true); });
      this.luego(1700, () => { viva = false; this.sonar("estatica"); corte.setVisible(true); });
      this.luego(2700, fin);
    });
  }

  // ---------------------------------------------------------------- salida
  terminar() {
    if (this.saliendo) return;
    this.cerrarPanel();
    this.saliendo = true;
    this.actualizarControl();
    this.burbuja.setVisible(false);

    // Se guarda la decisión para las siguientes misiones
    estado.mochila = [...this.mochila];
    if (this.lleva(OBLIGATORIO)) estado.cambiar("oxigeno", O2_TANQUE);   // el tanque suma oxígeno al salir
    Object.assign(this.reg, { salidaConfirmada: true, objetos: [...this.mochila], pesoTotal: this.peso(), oxigenoIncluido: this.lleva(OBLIGATORIO) });
    estado.mision2 = this.reg;
    estado.bitacora.push(llenar(this.t.bitacora, { lista: this.mochila.map(id => this.t.nombres[id]).join(", "), kg: this.peso() }));

    this.sonar("bien");
    this.tweens.add({ targets: this.hojas, scaleX: 0, duration: 400 });
    this.tweens.add({ targets: this.astro, x: PUERTA.x, y: PARED + 2, duration: 600, delay: 400 });
    this.tweens.add({ targets: [this.astro, this.sombra, this.chispa, this.sombraChispa], alpha: 0, duration: 300, delay: 900 });
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
    });
  }

  // ---------------------------------------------------------------- sonidos (Web Audio, sin archivos)
  tono(...a) { return tono(this, ...a); }      // src/sonidos.js
  sonar(tipo) { sonar(this, tipo); }

  sonarPatron(patron) {
    let t = 0;
    patron.forEach(([d, s]) => { this.tono(880, t, d * 0.1); t += (d + s) * 0.1; });
  }

  // ---------------------------------------------------------------- movimiento
  caminarA(x, y, alLlegar) {
    this.destino = {
      x: Phaser.Math.Clamp(x, PISO.x1, PISO.x2),
      y: Phaser.Math.Clamp(y, PISO.y1, PISO.y2)
    };
    this.alLlegar = alLlegar;
  }

  update(tiempo, delta) {
    delta = Math.min(delta, 50);              // tope, igual que las demás escenas
    const dt = delta / 1000;
    const camina = this.controlActivo ? this.mover(dt) : !this.entro;

    this.tiempoPaso += delta;
    if (camina && this.tiempoPaso > 160) { this.tiempoPaso = 0; this.paso = 1 - this.paso; }
    if (!camina) this.paso = 0;
    this.astro.setTexture(`${this.astroClave}_${this.paso}`).setDepth(this.astro.y);
    this.sombra.setPosition(this.astro.x, this.astro.y).setDepth(this.astro.y - 0.5);

    // Chispa flota detrás del astronauta
    const lado = this.astro.flipX ? 1 : -1;
    const cx = this.astro.x + lado * 16, piso = this.astro.y - 2;
    this.chispa.x += (cx - this.chispa.x) * Math.min(1, dt * 3);
    this.chispa.y += (piso - 22 + Math.sin(tiempo / 250) * 2 - this.chispa.y) * Math.min(1, dt * 3);
    this.chispa.setFlipX(this.astro.flipX).setDepth(piso + 1);
    this.sombraChispa.setPosition(this.chispa.x, piso).setDepth(piso - 1);
    this.dialogo.setPosition(Phaser.Math.Clamp(this.chispa.x, 79, ANCHO - 79), Math.max(this.chispa.y - 10, 30));

    if (this.ruido.visible) this.ruido.setFlip(Math.random() < 0.5, Math.random() < 0.5);
    // minijuego: el pulso se ilumina cuando pasa el cabezal
    this.pulsos?.forEach(({ rects, cabezal }) => rects.forEach(r =>
      r.setFillStyle(cabezal.x >= r.x && cabezal.x <= r.x + r.width ? 0xbff3ff : 0x29adff)));

    if (this.controlActivo) this.revisarProximidad();
  }

  mover(dt) {
    let dx = 0, dy = 0;
    if (this.teclas.left.isDown) dx = -1;
    else if (this.teclas.right.isDown) dx = 1;
    if (this.teclas.up.isDown) dy = -1;
    else if (this.teclas.down.isDown) dy = 1;

    if (dx || dy) { this.destino = null; this.alLlegar = null; }
    else if (this.destino) {
      const vx = this.destino.x - this.astro.x, vy = this.destino.y - this.astro.y;
      const d = Math.hypot(vx, vy);
      if (d < 2) {
        this.destino = null;
        const f = this.alLlegar; this.alLlegar = null;
        if (f) f();
        return false;
      }
      dx = vx / d; dy = vy / d;
    }
    if (!dx && !dy) return false;
    const n = Math.hypot(dx, dy);
    this.astro.x = Phaser.Math.Clamp(this.astro.x + (dx / n) * VELOCIDAD * dt, PISO.x1, PISO.x2);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + (dy / n) * VELOCIDAD * dt, PISO.y1, PISO.y2);
    if (dx) this.astro.setFlipX(dx < 0);
    return true;
  }

  usarZona(zona = this.activa) {
    if (!zona || !this.controlActivo) return;
    if (zona.tipo === "objeto") this.alternar(zona.o);
    else if (zona.tipo === "stella") this.abrirStella(undefined, true);
    else this.salir();
  }

  revisarProximidad() {
    let cerca = null, mejor = Infinity;
    this.zonas.forEach(z => {
      const d = Phaser.Math.Distance.Between(this.astro.x, this.astro.y, z.x, z.y);
      if (d < (z.r || CERCA) && d < mejor) { mejor = d; cerca = z; }
    });
    if (cerca === this.activa) return;
    this.activa = cerca;
    this.foco.setVisible(false);
    this.burbuja.setVisible(false);
    if (!cerca) return;
    if (cerca.tipo === "puerta") return this.salir();
    if (cerca.o) { const s = this.iconos[cerca.o.id]; this.foco.setPosition(s.x, s.y - 8).setVisible(true); }
    this.mostrarBurbuja(cerca);
    this.time.delayedCall(2500, () => this.intentarAlerta());
  }
}
