// Misión 2: preparar la mochila. Dueño: Rol 2 (pantalla) y Rol 4 (pesos).
// Sala de control con repisas, 6 objetos y la puerta. El astronauta camina
// (clic en el piso o flechas). Clic en un objeto = lo toma o lo deja sin mover
// al astronauta (también Enter/Espacio al estar cerca). Reglas:
//  - La mochila nunca pasa de CAPACIDAD_MOCHILA.
//  - El tanque de oxígeno es OBLIGATORIO: sin él no se sale y, una vez
//    guardado, no se puede quitar.
// Historia: la señal de Chispa ya se identificó en la Misión 1 (Senal.js);
// el monitor muestra el mapa del polo sur. Revisión del equipo y
// última transmisión de Itzel → puerta → Misión 3 (Equipo).
// Las decisiones se guardan en estado.mochila y estado.mision2.
import { ANCHO, ALTO, COLOR, OBJETOS, CAPACIDAD_MOCHILA } from "../config.js";
import { estado } from "../estado.js";
import { texto, boton } from "../ui.js";
import { crearTexturasMochila, crearTextura } from "../pixelart.js";

const PARED = 88;            // donde termina la pared y empieza el piso
const HUD = 162;             // barra de la mochila (abajo)
const LIMITES = { x1: 12, x2: ANCHO - 12, y1: 100, y2: HUD - 6 };
const VELOCIDAD = 70;
const CERCA = 10;
const REPISAS = [70, 130, 190];          // centro de cada mueble
const TABLAS = [52, 80];                 // altura de las dos tablas
const ORDEN = ["oxigeno", "escudo", "radio", "botiquin", "comida", "linterna"];
const OBLIGATORIO = "oxigeno";
const PUERTA = { x: 280, y: 104 };
const MONITOR = { x: 10, y: 24, w: 36, h: 30 };



const ESTRELLA = ["...k...", "..kYk..", "kkkYkkk", "kYYYYYk", ".kYYYk.", ".kYkYk.", ".kk.kk."];

export class CentroControl extends Phaser.Scene {
  constructor() { super("CentroControl"); }

  create() {
    estado.nuevaPartida();
    this.t = estado.textos.centro_control;
    this.mochila = [];
    this.activa = null;
    this.saliendo = false;
    this.entro = false;
    this.modal = null;
    this.cola = null;
    this.pulsos = null;
    this.eventosPanel = [];
    // Registro para el mapa de consecuencias (se completa al salir)
    this.reg = estado.mision2 = {
      objetos: [], pesoTotal: 0, oxigenoIncluido: false,
      alertaVista: false, senalIdentificada: false, intentosMinijuego: 0,
      mapaConsultado: false, revisiones: 0, revisionFinal: false
    };

    crearTexturasMochila(this);
    crearTextura(this, "px_estrella", ESTRELLA, { k: 0x1a1c2c, Y: 0xffcd75 });
    this.dibujarSala();
    this.crearMonitor();
    this.crearObjetos();
    this.crearPersonajes();
    this.crearBurbuja();
    this.crearHud();
    this.crearTarjeta();
    const om = boton(this, 288, 150, this.t.omitir, () => this.omitir(), 52);
    this.btnOmitir = [om.caja.setDepth(1500), om.etiqueta.setDepth(1501)];
    this.btnOmitir.forEach(o => o.setVisible(false));
    this.actualizarHud();
    // La señal y el mapa se resolvieron en la Misión 1 (escena Senal): aquí el monitor solo muestra el mapa
    Object.assign(this.reg, estado.mision1 || { alertaVista: true });
    this.indicador.setVisible(true);
    this.marcarLocalizada();
    this.zonaMonitor.setInteractive({ useHandCursor: true });

    // Entrada: camina desde abajo; luego el robot explica el oxígeno
    this.actualizarControl();
    this.tweens.add({
      targets: this.astro, y: 140, duration: 900,
      onComplete: () => {
        this.entro = true;
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
      this.abrirMapa();
    });
  }

  // Se activa al examinar el primer objeto o tras explorar un rato. Una sola vez.
  intentarAlerta() {
    if (this.reg.alertaVista || this.saliendo) return;
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
    this.indicador.setText(this.t.localizada).setBackgroundColor("#257179").setColor("#eef1ff").setAlpha(1);
  }

  // ---------------------------------------------------------------- objetos
  crearObjetos() {
    this.zonas = [];
    this.iconos = {};
    ORDEN.forEach((id, i) => {
      const o = OBJETOS.find(x => x.id === id);
      const x = REPISAS[Math.floor(i / 2)] + (i % 2 ? 10 : -10), y = TABLAS[i % 2];
      const s = this.add.image(x, y, "px_" + o.clave).setOrigin(0.5, 1).setDepth(-5).setInteractive({ useHandCursor: true });
      texto(this, x, y + 2, o.peso + " kg" + (id === OBLIGATORIO ? " ★" : ""), { tam: 5, color: "#ffcd75" }).setDepth(-5);
      const zona = { tipo: "objeto", o, x, y: LIMITES.y1 + 4 };
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
    this.astro = this.add.image(150, ALTO + 30, "astro32_0").setOrigin(0.5, 1);
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
    this.luzPuerta.setFillStyle(o2 ? 0x5cff8a : 0xff5c5c);
    this.candadoPuerta.setVisible(!o2);
    this.candadoTanque.setVisible(o2);
  }

  lleva(id) { return this.mochila.includes(id); }
  peso(lista = this.mochila) { return lista.reduce((s, id) => s + OBJETOS.find(o => o.id === id).peso, 0); }
  llenar(plantilla, o) { return plantilla.replace(/\{(\w+)\}/g, (_, k) => o[k]); }

  alternar(o) {
    const nombre = this.t.nombres[o.id];
    if (this.lleva(o.id)) {
      // el tanque obligatorio no se puede quitar
      if (o.id === OBLIGATORIO) return this.decir(this.t.oxigeno_fijo);
      this.mochila = this.mochila.filter(id => id !== o.id);
      this.decir(this.llenar(this.t.dejar, { nombre }));
    } else {
      const exceso = this.peso() + o.peso - CAPACIDAD_MOCHILA;
      if (exceso > 0) {
        this.decir(this.llenar(this.t.exceso, { nombre, kg: exceso }), 6000);
        this.cameras.main.shake(150, 0.003);
        return;
      }
      if (o.id === OBLIGATORIO) { this.mochila.unshift(o.id); this.decir(this.t.oxigeno_ok); }
      else { this.mochila.push(o.id); this.decir(this.t.reacciones[o.id]); }
    }
    this.iconos[o.id].setAlpha(this.lleva(o.id) ? 0.25 : 1);
    this.actualizarHud();
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
    this.btn(272, 163, t.volver, () => this.cerrarPanel(), 56);
  }

  // ---------------------------------------------------------------- revisión
  salir() {
    if (this.saliendo || !this.controlActivo) return;
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
        this.add.image(26, y, "px_obj_" + id).setScale(0.625),
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
    const robot = this.lineaRobot(obs.join(" "));
    this.btn(80, 163, t.modificar, () => this.cerrarPanel(), 110);
    this.btn(240, 163, t.continuar, () => {
      // validación final
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
    Object.assign(this.reg, { objetos: [...this.mochila], pesoTotal: this.peso(), oxigenoIncluido: this.lleva(OBLIGATORIO) });
    estado.mision2 = this.reg;
    estado.bitacora.push(`Mochila: ${this.mochila.map(id => this.t.nombres[id]).join(", ")} (${this.peso()} kg).`);

    this.sonar("bien");
    this.tweens.add({ targets: this.hojas, scaleX: 0, duration: 400 });
    this.tweens.add({ targets: this.astro, x: PUERTA.x, y: PARED + 2, duration: 600, delay: 400 });
    this.tweens.add({ targets: [this.astro, this.sombra, this.chispa, this.sombraChispa], alpha: 0, duration: 300, delay: 900 });
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Equipo"));
    });
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

  // ---------------------------------------------------------------- movimiento
  caminarA(x, y, alLlegar) {
    this.destino = {
      x: Phaser.Math.Clamp(x, LIMITES.x1, LIMITES.x2),
      y: Phaser.Math.Clamp(y, LIMITES.y1, LIMITES.y2)
    };
    this.alLlegar = alLlegar;
  }

  update(tiempo, delta) {
    const dt = delta / 1000;
    const camina = this.controlActivo ? this.mover(dt) : !this.entro;

    this.tiempoPaso += delta;
    if (camina && this.tiempoPaso > 160) { this.tiempoPaso = 0; this.paso = 1 - this.paso; }
    if (!camina) this.paso = 0;
    this.astro.setTexture(`astro32_${this.paso}`).setDepth(this.astro.y);
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
    this.astro.x = Phaser.Math.Clamp(this.astro.x + (dx / n) * VELOCIDAD * dt, LIMITES.x1, LIMITES.x2);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + (dy / n) * VELOCIDAD * dt, LIMITES.y1, LIMITES.y2);
    if (dx) this.astro.setFlipX(dx < 0);
    return true;
  }

  usarZona(zona = this.activa) {
    if (!zona || !this.controlActivo) return;
    if (zona.tipo === "objeto") this.alternar(zona.o);
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
    const s = this.iconos[cerca.o.id];
    this.foco.setPosition(s.x, s.y - 8).setVisible(true);
    this.mostrarBurbuja(cerca);
    this.time.delayedCall(2500, () => this.intentarAlerta());
  }
}
