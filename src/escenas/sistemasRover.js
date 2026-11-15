// Sistemas del rover para la escena Exterior. Dueño: Rol 2 (pantalla) y Rol 4 (parámetros).
// A. Tutorial holográfico de STELLA al abordar: se oculta al acelerar (W/↑) y
//    se vuelve a consultar con H o el botón "? AYUDA".
// B. Análisis del terreno y emergencias:
//    - pérdida de tracción (sin pausa: el jugador maniobra con el rover),
//    - rover atascado en regolito blando (minijuego de recuperación, con pausa),
//    - rover atrapado en el borde de un cráter (protocolo A/B/C, con pausa),
//    - asistencia robótica y "rescate y reinicio" en la última baliza.
//    Siempre hay salida: nunca se pierde la misión por un error.
// SIMULACIÓN EDUCATIVA: el rover R-1 es ficticio y sus límites (SIM) son
// inventados para el juego. Se inspira en lo que NASA estudió para VIPER
// (ruedas que se mueven por separado, maniobras de recuperación como el
// "gateo", detección de pendientes; VIPER se diseñó para pendientes de unos
// 15°), pero no es VIPER. La asistencia robótica es tecnología ficticia de
// CoderWolf, no de NASA. Los métodos se mezclan en Exterior.prototype.
import { texto } from "../ui.js";
import { Stella } from "../stella.js";

export const SIM = {
  pendComoda: 12,       // ° hasta aquí el R-1 avanza sin problema
  pendRetroceso: 20,    // ° máximo para salir retrocediendo
  velTraccion: 34,      // px/s: más rápido en suelo suelto o pendiente difícil → patina
  velAtasco: 18,        // px/s: entrar más rápido al regolito blando → se atasca
  vmaxBlando: 16,       // px/s: tope dentro del regolito blando (entrar despacio no atasca)
  velCrater: 15,        // px/s: entrar más rápido al borde del cráter → queda atrapado
  estabMin: 45,         // % estabilidad mínima para la recuperación asistida
  energiaMin: 30,       // % energía mínima para la recuperación asistida
  inclAsistidaOk: 25    // ° la recuperación asistida funciona hasta aquí (no es garantía)
};
// Tramo 3: regolito suelto (con un núcleo blando que se puede rodear)
export const SUELTO = [{ x1: 1200, x2: 1340, y1: 128, y2: 176 }];
export const BLANDO = [{ x1: 1285, x2: 1335, y1: 162, y2: 176 }];
// Tramo 4: cráter peligroso junto a la ruta (se evita si se observa el camino)
export const CRATER_PELIGRO = [1725, 116, 26, 10];

const HX = 150, HY = 46, HW = 166, HH = 100;     // holograma de emergencia (derecha)
const TX = 166, TY = 48, TW = 150, TH = 96;      // holograma de ayuda (derecha)
const CIAN = 0x7ee6ff, NARANJA = 0xff8a5c;
const ATENCION = ["pendiente", "rocas", "traccion_aviso", "crater_peligro", "crater", "rugoso"];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const op = (color = "#eef1ff", ancho = 158) => ({ tam: 6, origenX: 0, align: "left", ancho, color });

export const SistemasRover = {
  iniciarSistemas() {
    Object.assign(this.reg, {
      aceleradorSeg: 0, ayudaConsultada: 0, advertencias: { dadas: 0, atendidas: 0 },
      obstaculosEvitados: 0, emergencias: { traccion: 0, atascos: 0, crateres: 0 },
      recuperaciones: [], decisiones: [], asistencias: 0, reinicios: 0, energiaUsada: 0
    });
    this.emerg = null;
    this.holo = this.holoT = null;
    this.tutoAbierto = false;
    this.patinaT = 0;
    this.inmuneTraccion = 0;
    this.atajos = {};
    this.golpeados = new Set();
    this.cercaObst = new Set();
    this.firme = { x: this.rover.x, y: this.rover.y };   // último punto estable
    this.dibujarPeligros();
    this.crearTutorial();
    this.crearInclinometro();
    this.btn(this.panelRover, 274, 165, 42, this.t.tutorial.boton, () => this.alternarAyuda());
  },

  // ================================================================ dibujo de zonas peligrosas
  dibujarPeligros() {
    const rnd = new Phaser.Math.RandomDataGenerator(["regolito"]), g = this.add.graphics().setDepth(-170);
    SUELTO.forEach(r => {
      g.fillStyle(0xa39d8c, 0.35).fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      for (let i = 0; i < 70; i++) {
        const x = rnd.between(r.x1, r.x2 - 6), y = rnd.between(r.y1 + 2, r.y2 - 2);
        g.fillStyle(0xc9c3b0, 0.6).fillRect(x, y, 5, 1);
        g.fillStyle(0x6e6a5e, 0.5).fillRect(x + 1, y + 1, 4, 1);
      }
    });
    BLANDO.forEach(r => {
      const cx = (r.x1 + r.x2) / 2, cy = (r.y1 + r.y2) / 2, w = r.x2 - r.x1, h = r.y2 - r.y1;
      g.fillStyle(0x4e4a44, 0.6).fillEllipse(cx, cy, w + 6, h + 6);
      g.lineStyle(1, 0x7a7466, 0.7);
      [0.8, 0.55, 0.3].forEach(k => g.strokeEllipse(cx, cy, w * k, h * k));
    });
    const [cx, cy, rx, ry] = CRATER_PELIGRO, c = this.add.graphics().setDepth(-149);
    c.fillStyle(0x1a1c2c, 0.55).fillEllipse(cx, cy - 1, rx * 1.4, ry * 1.2);
    for (let i = 0; i < 9; i++) {           // postes de precaución en el borde
      const a = Math.PI * (0.05 + i * 0.1125), x = cx + Math.cos(a) * (rx + 9), y = cy + Math.sin(a) * (ry + 6);
      c.fillStyle(0x1a1c2c).fillRect(x - 1, y - 5, 3, 6);
      c.fillStyle(i % 2 ? 0xffcd75 : NARANJA).fillRect(x, y - 4, 1, 4);
    }
    [[1206, 127], [1282, 176], [1688, 131]].forEach(([x, y]) => this.add.image(x, y, "aviso").setOrigin(0.5, 1).setDepth(y));
  },

  // ================================================================ piezas holográficas
  panelHolo(c, x, y, w, h, color = CIAN) {
    const g = this.add.graphics();
    g.fillStyle(0x0b2a4a, 0.62).fillRect(x, y, w, h);
    g.lineStyle(1, color, 0.9).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.lineStyle(1, 0x29adff, 0.35).strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    for (let yy = y + 3; yy < y + h - 2; yy += 3) g.fillStyle(CIAN, 0.05).fillRect(x + 1, yy, w - 2, 1);
    g.fillStyle(0xffffff, 0.9);
    [[x, y], [x + w - 4, y], [x, y + h - 1], [x + w - 4, y + h - 1]].forEach(([a, b]) => g.fillRect(a, b, 4, 1));
    const brillo = this.add.rectangle(x, y, w, h).setOrigin(0).setStrokeStyle(1, color, 0.6);
    this.tweens.add({ targets: brillo, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
    c.add([g, brillo]);
    this.barrido(c, x, y, w, h);
  },

  barrido(c, x, y, w, h) {
    const b = this.add.rectangle(x + 1, y, w - 2, 1, 0xbff3ff, 0.9).setOrigin(0);
    c.add(b);
    this.tweens.add({ targets: b, y: y + h - 1, alpha: 0.1, duration: 350, onComplete: () => b.destroy() });
  },

  // Botón holográfico (fijo en pantalla). tecla: atajo mientras hay emergencia.
  btn(c, x, y, w, etiqueta, fn, { activo = true, tecla } = {}) {
    const fondo = activo ? 0x123a5a : 0x1a1c2c;
    const caja = this.add.rectangle(x, y, w, 11, fondo, 0.85).setOrigin(0)
      .setStrokeStyle(1, activo ? CIAN : 0x566c86).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const tx = texto(this, x + 3, y + 2, etiqueta, { tam: 6, origenX: 0, align: "left", ancho: w - 4, color: activo ? "#eef1ff" : "#94b0c2" });
    caja.on("pointerover", () => caja.setFillStyle(0x1d4a72, 0.95));
    caja.on("pointerout", () => caja.setFillStyle(fondo, 0.85));
    caja.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); fn(); });
    c.add([caja, tx]);
    if (tecla) this.atajos[tecla] = fn;
    return caja;
  },

  teclaSistemas(ev) {
    if (this.modo !== "emergencia") return;
    this.atajos[ev.key.length === 1 ? ev.key.toLowerCase() : ev.key]?.();
  },

  // ================================================================ A. tutorial holográfico
  crearTutorial() {
    const t = this.t.tutorial, c = this.tuto = this.add.container(0, 0).setVisible(false).setAlpha(0);
    this.panelHolo(c, TX, TY, TW, TH);
    c.add(texto(this, TX + 6, TY + 4, t.titulo, { tam: 7, origenX: 0, color: "#7ee6ff" }));
    t.filas.forEach(([teclas, accion], i) => {
      const y = TY + 16 + i * 12;
      teclas.forEach((k, j) => this.teclaDibujo(c, TX + 28 + j * 13, y, k));
      c.add(texto(this, TX + 56, y + 2, accion, op("#eef1ff", 92)));
    });
    const pista = texto(this, TX + 6, TY + 87, t.arrancar, op("#fff27a", 140));
    this.tweens.add({ targets: pista, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
    this.tutoStella = new Stella(this, TX + 13, TY + 62);
    c.add([pista, this.tutoStella.c]);
    this.tutoX = this.btn(c, TX + TW - 16, TY + 3, 13, "✕", () => this.ocultarTutorial());
    this.tutoX.disableInteractive();
    this.hud.add(c);
  },

  teclaDibujo(c, x, y, s) {
    c.add([
      this.add.rectangle(x, y + 1, 11, 10, 0x0b1026).setOrigin(0),
      this.add.rectangle(x, y, 11, 10, 0x1d2650, 0.95).setOrigin(0).setStrokeStyle(1, CIAN),
      texto(this, x + 5.5, y + 5, s, { tam: 7, origenY: 0.5 })
    ]);
  },

  mostrarTutorial() {
    if (this.modo !== "rover" || this.tutoAbierto) return;
    this.tutoAbierto = true;
    this.tweens.killTweensOf(this.tuto);
    this.tuto.setVisible(true).setAlpha(0).setY(-4);
    this.tweens.add({ targets: this.tuto, alpha: 1, y: 0, duration: 260, ease: "Quad.easeOut" });
    this.barrido(this.tuto, TX, TY, TW, TH);
    this.tutoX.setInteractive({ useHandCursor: true });
    this.tutoStella.aparecer(() => this.tutoStella.reaccionar("saludo"));
    if (!this.holo) this.cameras.main.setFollowOffset(-60, 0);   // el rover queda a la vista, a la izquierda
  },

  ocultarTutorial() {
    if (!this.tutoAbierto) return;
    this.tutoAbierto = false;
    this.tutoX.disableInteractive();
    this.tweens.killTweensOf(this.tuto);
    this.tweens.add({ targets: this.tuto, alpha: 0, duration: 350, onComplete: () => this.tuto.setVisible(false) });
    if (!this.holo) this.cameras.main.setFollowOffset(0, 0);
  },

  alternarAyuda() {
    if (this.modo !== "rover") return;
    if (this.tutoAbierto) return this.ocultarTutorial();
    this.reg.ayudaConsultada++;
    this.mostrarTutorial();
  },

  // ================================================================ inclinómetro (aviso, sin pausa)
  crearInclinometro() {
    const c = this.inclino = this.add.container(0, 0).setVisible(false);
    this.panelHolo(c, 108, 4, 102, 30, 0xffcd75);
    this.inclinoG = this.add.graphics();
    this.inclinoTxt = texto(this, 140, 16, "", op("#eef1ff", 68));
    c.add([texto(this, 112, 6, this.t.em.inclinacion, op("#ffcd75", 90)), this.inclinoG, this.inclinoTxt]);
    this.hud.add(c);
  },

  estadoIncl(g) {
    const t = this.t.em;
    return g < SIM.pendComoda ? t.seguro : g <= SIM.pendRetroceso ? t.precaucion : t.peligro;
  },

  // Semicírculo con zonas (segura / precaución / peligro) y aguja. 0°..30°
  pintarGauge(g, x, y, r, grados) {
    g.clear();
    const ang = v => Math.PI + clamp(v, 0, 30) / 30 * Math.PI;
    [[0, SIM.pendComoda, CIAN], [SIM.pendComoda, SIM.pendRetroceso, 0xffcd75], [SIM.pendRetroceso, 30, 0xff5c5c]].forEach(([a, b, col]) => {
      g.lineStyle(2, col, 0.9).beginPath();
      g.arc(x, y, r, ang(a), ang(b));
      g.strokePath();
    });
    const a = ang(grados);
    g.lineStyle(1, 0xffffff).lineBetween(x, y, x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
    g.fillStyle(0xffffff).fillRect(x - 1, y - 1, 2, 2);
  },

  // ================================================================ análisis del terreno (cada cuadro)
  analizarTerreno(z) {
    const R = this.rover, [cx, cy, rx, ry] = CRATER_PELIGRO;
    const m = Math.hypot((R.x - cx) / (rx + 6), (R.y - cy) / (ry + 4));   // < 1 = dentro del borde peligroso
    const borde = m < 1.9 ? 8 + 14 * clamp((1.9 - m) / 0.9, 0, 1) : 0;
    const hacia = ((cx - R.x) * Math.cos(R.ang) + (cy - R.y) * Math.sin(R.ang)) * R.v > 0;   // va hacia el cráter
    return { m, hacia, incl: Math.round(Math.max(z.grados, borde) + (z.rugoso ? 2 : 0)) };
  },

  revisarPeligros(z, acel, dt) {
    if (this.modo !== "rover") return;
    const R = this.rover, a = this.analizarTerreno(z), e = this.emerg;
    if (!z.blando && a.m > 1.4) { this.firme.x = R.x; this.firme.y = R.y; }
    if (acel) this.reg.energiaUsada = Math.round(100 - this.energia);

    const verIncl = a.incl >= 10 && !this.holoT;
    this.inclino.setVisible(verIncl);
    if (verIncl) {
      this.pintarGauge(this.inclinoG, 124, 30, 10, a.incl);
      this.inclinoTxt.setText(a.incl + "°\n" + this.estadoIncl(a.incl));
    }
    if (e?.tipo === "traccion") return this.seguirTraccion(acel, dt);

    // emergencias según la gravedad (nunca automáticas por solo acercarse)
    if (z.blando && Math.abs(R.v) > SIM.velAtasco) return this.emergenciaAtasco();
    if (a.m < 1 && a.hacia) {
      if (Math.abs(R.v) >= SIM.velCrater) return this.emergenciaCrater(Math.abs(R.v));
      R.v = -Math.sign(R.v) * 10;                      // despacio: solo resbala un poco hacia atrás
      this.avisar("crater_leve", "alerta", 4000);
    }
    const dificil = z.suelto || z.grados > SIM.pendComoda;
    if (acel && dificil && R.v > SIM.velTraccion && this.time.now > this.inmuneTraccion) {
      this.patinaT += dt;
      if (this.patinaT > 0.2) this.avisar("traccion_aviso", "alerta", 9000);
      if (this.patinaT > 1.1) return this.emergenciaTraccion();
    } else this.patinaT = Math.max(0, this.patinaT - dt * 0.5);

    // recomendaciones del copiloto (cada una con enfriamiento)
    if (a.m < 1.9 && Math.abs(R.v) > 10) this.avisar("crater_peligro", "alerta", 9000);
    if (z.grados >= SIM.pendComoda && R.v > 40) this.avisar("pendiente", "alerta", 10000);
    if (Math.abs(R.v) > 25 && this.rocaDelante()) this.avisar("rocas", "explicando", 12000);
    if (this.energia < 40 && !this.dijo.bateria) { this.dijo.bateria = true; this.decir(this.t.bateria, "alerta"); }
    this.contarObstaculos();
    this.revisarAtencion();
  },

  rocaDelante() {
    const R = this.rover, dx = Math.cos(R.ang) * Math.sign(R.v), dy = Math.sin(R.ang) * Math.sign(R.v);
    return this.obst.some(o => {
      if (o.t !== "circ" || o.r > 6) return false;
      const vx = o.x - R.x, vy = o.y - R.y, d = Math.hypot(vx, vy);
      return d < o.r + 30 && (vx * dx + vy * dy) / d > 0.7;
    });
  },

  // Obstáculo evitado: el rover pasó cerca (< 18 px) y se alejó sin chocar con él
  contarObstaculos() {
    const R = this.rover;
    this.obst.forEach(o => {
      if (o.t === "rect") return;
      const d = o.t === "circ" ? Math.hypot(R.x - o.x, R.y - o.y) - o.r : (Math.hypot((R.x - o.x) / o.rx, (R.y - o.y) / o.ry) - 1) * o.rx;
      if (d < 18) this.cercaObst.add(o);
      else if (d > 40 && this.cercaObst.delete(o) && !this.golpeados.has(o)) this.reg.obstaculosEvitados++;
    });
  },

  // Se llama desde avisar(): ¿el jugador hizo caso (frenó o cambió de rumbo)?
  registrarAviso(clave) {
    if (!ATENCION.includes(clave) || !this.rover) return;
    this.reg.advertencias.dadas++;
    this.avisoPend = { v: Math.abs(this.rover.v), ang: this.rover.ang, t: this.time.now };
  },

  revisarAtencion() {
    const p = this.avisoPend, R = this.rover;
    if (!p || this.time.now - p.t < 2500) return;
    if (Math.abs(R.v) < p.v * 0.7 || Math.abs(Phaser.Math.Angle.Wrap(R.ang - p.ang)) > 0.35) this.reg.advertencias.atendidas++;
    this.avisoPend = null;
  },

  // ================================================================ emergencia 1: pérdida de tracción (sin pausa)
  emergenciaTraccion() {
    const t = this.t.em, c = this.holoT = this.add.container(0, 0).setAlpha(0);
    this.emerg = { tipo: "traccion", paso: 0, sinW: 0, atras: 0, wT: 0 };
    this.reg.emergencias.traccion++;
    this.patinaT = 0;
    this.ocultarTutorial();
    this.inclino.setVisible(false);
    this.panelHolo(c, 106, 4, 106, 62, NARANJA);
    c.add(texto(this, 110, 6, "⚠ " + t.traccion_titulo, op("#ff8a5c", 100)));
    c.add(texto(this, 110, 15, t.traccion, op("#a7b0d8", 44)));
    c.add(this.add.rectangle(156, 17, 50, 4, 0x1a1c2c).setOrigin(0).setStrokeStyle(1, 0x333c57));
    this.barraTraccion = this.add.rectangle(156, 17, 12, 4, NARANJA).setOrigin(0);
    this.pasosT = t.traccion_pasos.map((s, i) => texto(this, 110, 27 + i * 12, s, op("#eef1ff", 100)));
    c.add([this.barraTraccion, ...this.pasosT]);
    this.hud.add(c);
    this.pintarPasosT();
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.tweens.add({ targets: this.barraTraccion, alpha: 0.3, duration: 250, yoyo: true, repeat: -1 });
    this.decir(t.traccion_stella, "alerta", true);
    this.alarma();
  },

  pintarPasosT() {
    const p = this.emerg?.paso ?? 3;
    this.pasosT.forEach((tx, i) => tx.setText((i < p ? "✓ " : i === p ? "▶ " : "· ") + this.t.em.traccion_pasos[i])
      .setColor(i < p ? "#5cff8a" : i === p ? "#fff27a" : "#94b0c2"));
  },

  // 1) detenerse  2) soltar el acelerador un momento  3) retroceder despacio
  seguirTraccion(acel, dt) {
    const e = this.emerg, R = this.rover;
    if (acel) {
      e.sinW = 0;
      e.wT += dt;
      if (e.wT > 1.5) this.avisar("suelta", "alerta", 3000);
      if (e.wT > 3.2) return this.emergenciaAtasco();   // seguir acelerando entierra las ruedas
    }
    if (e.paso === 0 && !acel && Math.abs(R.v) < 1) this.pasoTraccion();
    else if (e.paso === 1 && !acel && (e.sinW += dt) > 0.8) this.pasoTraccion();
    else if (e.paso === 2 && R.v < 0 && (e.atras -= R.v * dt) > 14) this.pasoTraccion();
  },

  pasoTraccion() {
    const e = this.emerg, t = this.t.em;
    e.paso++;
    this.tono(880 + e.paso * 220, 0, 0.08, "square", 0.03);
    this.pintarPasosT();
    if (e.paso < 3) return;
    this.reg.recuperaciones.push({ tipo: "traccion", metodo: "maniobra", exito: true });
    this.tweens.killTweensOf(this.barraTraccion);
    this.barraTraccion.setAlpha(1).setFillStyle(0x5cff8a);
    this.tweens.add({ targets: this.barraTraccion, width: 50, duration: 400 });
    this.sonar("bien");
    this.decir(t.traccion_exito, "exito", true);
    this.decir(t.traccion_consejo, "explicando");
    this.emerg = null;
    this.inmuneTraccion = this.time.now + 6000;
    this.trasEmergencia = true;
    this.time.delayedCall(1600, () => this.cerrarTraccion());
  },

  cerrarTraccion() {
    const c = this.holoT;
    if (!c) return;
    this.holoT = null;
    if (this.emerg?.tipo === "traccion") this.emerg = null;
    this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
  },

  // ================================================================ holograma de emergencia (pausa la conducción)
  entrarEmergencia() {
    this.modo = "emergencia";
    this.ocultarTutorial();
    this.inclino.setVisible(false);
    this.aviso.setVisible(false);
    this.patinaT = 0;
  },

  abrirHolo(titulo) {
    this.cerrarHolo(true);
    const c = this.holo = this.add.container(0, 0).setAlpha(0);
    this.panelHolo(c, HX, HY, HW, HH, NARANJA);
    this.holoTitulo = texto(this, HX + 5, HY + 3, "⚠ " + titulo, op("#ff8a5c", HW - 10));
    this.holoLista = this.add.container(0, 0);
    c.add([this.holoTitulo, this.holoLista]);
    this.hud.add(c);
    this.tweens.add({ targets: c, alpha: 1, duration: 220 });
    this.cameras.main.setFollowOffset(-70, 0);     // el rover queda visible a la izquierda
    this.alarma();
    return c;
  },

  cerrarHolo(inmediato = false) {
    const c = this.holo;
    if (!c) return;
    this.emerg?.tweenMarca?.remove();
    this.holo = null;
    this.atajos = {};
    if (inmediato) c.destroy();
    else this.tweens.add({ targets: c, alpha: 0, duration: 250, onComplete: () => c.destroy() });
    if (!this.tutoAbierto) this.cameras.main.setFollowOffset(0, 0);
  },

  limpiarLista() {
    this.emerg?.tweenMarca?.remove();
    this.holoLista.removeAll(true);
    this.atajos = {};
    return this.holoLista;
  },

  // Esquema del rover visto desde arriba con sus cuatro ruedas
  esquema(h, x, y) {
    const g = this.add.graphics();
    g.fillStyle(CIAN, 0.18).fillRect(x - 7, y - 11, 14, 22);
    g.lineStyle(1, CIAN, 0.8).strokeRect(x - 7, y - 11, 14, 22);
    g.fillStyle(CIAN, 0.6).fillTriangle(x, y - 15, x - 3, y - 12, x + 3, y - 12);
    const ruedas = [[-11, -7], [11, -7], [-11, 7], [11, 7]].map(([dx, dy]) => this.add.rectangle(x + dx, y + dy, 5, 7, 0x29adff).setStrokeStyle(1, CIAN));
    const marcas = ruedas.map(r => texto(this, r.x, r.y - 4, "", { tam: 6, color: "#fff27a" }));
    const etiqueta = texto(this, x, y + 16, "", { tam: 6, color: "#a7b0d8", ancho: 44 });
    h.addAt([g, ...ruedas, ...marcas, etiqueta], h.list.indexOf(this.holoLista));   // debajo de la lista (y de la tarjeta)
    return { ruedas, marcas, etiqueta };
  },

  // Ruedas en problemas: color + "!" (no depende solo del color)
  marcarRuedas(es, malas, txt) {
    es.ruedas.forEach((r, i) => {
      const mal = malas.includes(i);
      r.setFillStyle(mal ? NARANJA : 0x29adff);
      es.marcas[i].setText(mal ? "!" : "");
    });
    es.etiqueta.setText(txt);
  },

  gatear(es) {
    this.tweens.add({ targets: es.ruedas.slice(0, 2), y: "-=2", duration: 120, yoyo: true });
    this.tweens.add({ targets: es.ruedas.slice(2), y: "-=2", duration: 120, yoyo: true, delay: 170 });
  },

  opcionReinicio(L) {
    this.btn(L, HX + 4, HY + HH - 13, HW - 8, this.t.em.reinicio, () => this.reiniciarBaliza(), { tecla: "r" });
  },

  pregunta(L, s, y = 58) { L.add(texto(this, HX + 4, y, s, op("#7ee6ff"))); },

  // Opciones con explicación: la equivocada no castiga, solo enseña
  elegir(L, pregunta, opciones, emergencia, alAcertar) {
    this.pregunta(L, pregunta);
    opciones.forEach(([s, ok, porque], i) => this.btn(L, HX + 2, 76 + i * 13, 158, (i + 1) + ". " + s, () => {
      this.reg.decisiones.push({ emergencia, eleccion: s, correcta: ok });
      this.decir(porque, ok ? "exito" : "alerta", true);
      if (ok) alAcertar();
    }, { tecla: String(i + 1) }));
    this.opcionReinicio(L);
  },

  // Panel de "¡a salvo!" con consejo educativo y continuar
  cerrarConExito(L, { titulo, exito, consejo, dato }) {
    const e = this.emerg;
    if (!e.dicho) {
      e.dicho = true;
      this.sonar("bien");
      this.decir(exito, "exito", true);
      this.decir(consejo, "explicando");
      this.stella.estrellas();
    }
    L.add(texto(this, HX + 46, 60, "✓ " + titulo, { tam: 7, origenX: 0, color: "#5cff8a", ancho: 116 }));
    if (dato) this.btn(L, HX + 44, 92, 118, this.t.em.ver_dato, () => this.datoNasa(), { tecla: "d" });
    this.btn(L, HX + 44, 106, 118, this.t.em.continuar, () => this.terminarEmergencia(), { tecla: "Enter" });
  },

  datoNasa() {
    const t = this.t.em, L = this.limpiarLista();
    this.reg.decisiones.push({ emergencia: "atasco", eleccion: "consultó el dato NASA", correcta: true });
    L.add([
      this.add.rectangle(HX + 2, HY + 2, HW - 4, HH - 4, 0x0b2a4a, 0.97).setOrigin(0),
      texto(this, HX + 6, HY + 4, "★ " + t.dato_titulo, op("#ffcd75")),
      texto(this, HX + 6, HY + 14, t.dato_viper, op("#eef1ff", 154)),
      texto(this, HX + 6, HY + 52, t.dato_sim, op("#a7b0d8", 154))
    ]);
    this.btn(L, HX + 44, HY + HH - 15, 76, t.volver, () => this.pintarAtasco(), { tecla: "Enter" });
  },

  // Rover de vuelta a jugar (tras resolver o reiniciar)
  terminarEmergencia() {
    const R = this.rover, sig = this.balizas[Math.min(this.siguiente, this.balizas.length - 1)];
    this.cerrarHolo();
    this.tweens.killTweensOf([R, R.c]);
    this.emerg = null;
    this.modo = "rover";
    R.v = 0;
    R.ang = Phaser.Math.Angle.Between(R.x, R.y, sig.x, sig.y);
    R.c.rotation = 0;
    this.carro.y = 0;
    this.colocarRover();
    this.motor(true);
    this.inmuneTraccion = this.time.now + 5000;
    this.trasEmergencia = true;
  },

  colocarRover() {
    const R = this.rover;
    R.c.setPosition(R.x, R.y).setDepth(R.y);
    this.faros.setPosition(R.x, R.y).setRotation(R.c.rotation);
  },

  // Punto estable para salir: el último terreno firme, un poco más lejos
  puntoSeguro(extra = 14) {
    const R = this.rover, f = this.firme;
    let dx = f.x - R.x, dy = f.y - R.y, d = Math.hypot(dx, dy);
    if (d < 1) { dx = -Math.cos(R.ang); dy = -Math.sin(R.ang); d = 1; }
    const p = { x: f.x + dx / d * extra, y: clamp(f.y + dy / d * extra, 76, 172) };
    return this.choca(p.x, p.y, 10, false) ? { x: f.x, y: f.y } : p;
  },

  retroceder(fin) {
    const R = this.rover, p = this.puntoSeguro();
    this.motor(true);
    this.sonar("arranque");
    this.tweens.add({
      targets: R, x: p.x, y: p.y, duration: 1000, ease: "Sine.easeInOut",
      onUpdate: () => { this.ruedas.forEach(w => { w.rotation -= 0.12; }); this.colocarRover(); if (Math.random() < 0.25) this.polvo(R.x, R.y); },
      onComplete: () => { this.carro.y = 0; this.tweens.add({ targets: R.c, rotation: 0, duration: 200 }); fin(); }
    });
  },

  reiniciarBaliza() {
    const e = this.emerg, R = this.rover, cam = this.cameras.main, t = this.t.em;
    const b = this.balizas[Math.max(0, this.siguiente - 1)];
    this.reg.reinicios++;
    this.reg.decisiones.push({ emergencia: e?.tipo, eleccion: "rescate y reinicio en la última baliza", correcta: true });
    this.limpiarLista();
    cam.fadeOut(350, 0, 0, 0);
    cam.once("camerafadeoutcomplete", () => {
      e?.robot?.img?.destroy();
      e?.robot?.cuerda?.destroy();
      this.tweens.killTweensOf([R, R.c]);
      R.x = b.x;
      R.y = clamp(b.y + 8, 76, 172);
      this.firme = { x: R.x, y: R.y };
      this.terminarEmergencia();
      cam.fadeIn(350);
      this.decir(t.reinicio_stella, "explicando", true);
    });
  },

  // ================================================================ emergencia 2: rover atascado
  emergenciaAtasco() {
    const t = this.t.em, R = this.rover;
    this.cerrarTraccion();
    this.entrarEmergencia();
    this.reg.emergencias.atascos++;
    R.v = 0;
    this.carro.y = 2;                                // se hunde un poco
    this.cameras.main.shake(160, 0.003);
    this.sonar("choque");
    const e = this.emerg = { tipo: "atasco", paso: 0, impulsos: 0 };
    e.esquema = this.esquema(this.abrirHolo(t.atasco_titulo), 172, 100);
    this.decir(t.atasco_stella, "alerta", true);
    this.pintarAtasco();
  },

  pintarAtasco() {
    const e = this.emerg, t = this.t.em, L = this.limpiarLista();
    this.marcarRuedas(e.esquema, e.paso >= 5 ? [] : [2, 3], e.paso >= 5 ? t.ruedas_ok : t.ruedas_hundidas);
    if (e.paso >= 5) return this.cerrarConExito(L, { titulo: t.liberado, exito: t.atasco_exito, consejo: t.atasco_consejo, dato: true });
    if (e.paso === 2) return this.elegirManiobra(L);
    if (e.paso === 3) return this.impulsos(L);
    t.atasco_pasos.forEach((s, i) => {
      const y = 58 + i * 12;
      if (i === e.paso) this.btn(L, 194, y, 118, "▶ " + s, () => this.accionAtasco(i), { tecla: "Enter" });
      else L.add(texto(this, 197, y + 2, (i < e.paso ? "✓ " : "· ") + s, op(i < e.paso ? "#5cff8a" : "#94b0c2", 116)));
    });
    this.opcionReinicio(L);
  },

  accionAtasco(i) {
    const e = this.emerg, t = this.t.em;
    this.tono(990, 0, 0.06, "square", 0.03);
    if (i === 0) { this.motor(false); this.decir(t.motores, "explicando", true); }
    if (i === 1) {
      this.decir(t.modo_rec, "explicando", true);
      this.tweens.add({ targets: e.esquema.ruedas, alpha: 0.4, duration: 150, yoyo: true, repeat: 3 });
    }
    if (i === 4) {
      this.limpiarLista();
      return this.retroceder(() => {
        this.reg.recuperaciones.push({ tipo: "atasco", metodo: "maniobra de gateo", exito: true });
        e.paso = 5;
        this.pintarAtasco();
      });
    }
    e.paso++;
    this.pintarAtasco();
  },

  elegirManiobra(L) {
    const L2 = this.add.container(0, 0);    // a la derecha del esquema
    L.add(L2);
    L2.x = 44;
    const t = this.t.em;
    L2.add(texto(this, HX + 4, 58, t.maniobra_pregunta, op("#7ee6ff", 116)));
    t.maniobras.forEach(([s, ok, porque], i) => this.btn(L2, HX + 2, 76 + i * 13, 118, (i + 1) + ". " + s, () => {
      this.reg.decisiones.push({ emergencia: "atasco", eleccion: s, correcta: ok });
      this.decir(porque, ok ? "exito" : "alerta", true);
      if (ok) { this.emerg.paso = 3; this.pintarAtasco(); }
    }, { tecla: String(i + 1) }));
    this.opcionReinicio(L);
  },

  // Minijuego: impulsar cuando la marca pase por la zona ▼ (3 veces)
  impulsos(L) {
    const e = this.emerg, t = this.t.em, x0 = 196, w = 112, y = 94;
    const txt = texto(this, 196, 58, llenar(t.impulsos, { n: e.impulsos }), op("#eef1ff", 116));
    const barra = this.add.rectangle(x0, y, w, 6, 0x1a1c2c, 0.8).setOrigin(0, 0.5).setStrokeStyle(1, CIAN);
    const zona = this.add.rectangle(x0, y, 22, 6, 0x5cff8a, 0.55).setOrigin(0, 0.5);
    const flecha = texto(this, x0, y - 11, "▼", { tam: 6, color: "#5cff8a" });
    const marca = this.add.rectangle(x0, y, 2, 10, 0xfff27a);
    L.add([txt, barra, zona, flecha, marca]);
    const nueva = () => { zona.x = x0 + Phaser.Math.Between(8, w - 30); flecha.x = zona.x + 11; };
    nueva();
    e.tweenMarca = this.tweens.add({ targets: marca, x: x0 + w, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.btn(L, 196, 106, 60, t.impulsar, () => {
      if (marca.x < zona.x - 1 || marca.x > zona.x + 23) {
        this.reg.decisiones.push({ emergencia: "atasco", eleccion: "impulso fuera de tiempo", correcta: false });
        if (this.time.now > (this.miniAviso || 0)) { this.miniAviso = this.time.now + 2000; this.decir(t.impulso_mal, "alerta", true); }
        return;
      }
      e.impulsos++;
      this.tono(660 + e.impulsos * 110, 0, 0.1, "square", 0.04);
      this.gatear(e.esquema);
      txt.setText(llenar(t.impulsos, { n: e.impulsos }));
      if (e.impulsos < 3) return nueva();
      e.tweenMarca.remove();
      this.atajos = {};
      this.decir(t.impulsos_ok, "exito", true);
      e.paso = 4;
      this.time.delayedCall(500, () => this.emerg === e && this.pintarAtasco());
    }, { tecla: " " });
    this.opcionReinicio(L);
  },

  // ================================================================ emergencia 3: cráter
  emergenciaCrater(vel) {
    const t = this.t.em, R = this.rover, [cx, cy] = CRATER_PELIGRO;
    this.cerrarTraccion();
    this.entrarEmergencia();
    this.reg.emergencias.crateres++;
    // gravedad según la velocidad de entrada: despacio = más fácil de salir
    const incl = Math.round(clamp(14 + (vel - SIM.velCrater) * 0.5, 14, 30));
    const estab = Math.round(clamp(100 - (incl - 12) * 3.5, 20, 95));
    const e = this.emerg = { tipo: "crater", incl, estab, analizado: false, fallos: 0 };
    R.v = 0;
    // resbala un poco hacia adentro y se queda inclinado en el borde (sin caer)
    const a = Math.atan2(cy - R.y, cx - R.x);
    this.tweens.add({ targets: R, x: R.x + Math.cos(a) * 6, y: R.y + Math.sin(a) * 3, duration: 500, ease: "Quad.easeOut", onUpdate: () => this.colocarRover() });
    this.tweens.add({ targets: R.c, rotation: (cx >= R.x ? 1 : -1) * 0.22, duration: 500 });
    this.carro.y = 1;
    for (let i = 0; i < 6; i++) this.polvo(R.x + Phaser.Math.Between(-12, 12), R.y);
    this.cameras.main.shake(200, 0.004);
    this.sonar("choque");
    this.decir(t.crater_stella, "alerta", true);
    this.time.delayedCall(600, () => {
      if (this.emerg !== e) return;
      this.abrirHolo(t.crater_titulo);
      this.pintarCrater();
    });
  },

  pintarCrater() {
    const e = this.emerg, t = this.t.em, L = this.limpiarLista(), x = HX + 4, ok = e.analizado;
    const g = this.add.graphics();
    this.pintarGauge(g, 298, 72, 11, ok ? e.incl : 0);
    L.add([g,
      texto(this, 298, 75, ok ? this.estadoIncl(e.incl) : "", { tam: 6, color: "#eef1ff" }),
      texto(this, x, 59, llenar(t.st_incl, { g: ok ? e.incl + "°" : "?" }), op("#eef1ff", 130)),
      texto(this, x, 67, llenar(t.st_limite, { g: SIM.pendRetroceso }), op("#a7b0d8", 130)),
      texto(this, x, 75, llenar(t.st_estab, { e: ok ? e.estab + "%" : "?", n: Math.round(this.energia) + "%" }), op("#eef1ff", 130))
    ]);
    if (!ok) {
      this.btn(L, x - 2, 90, 158, t.comprobar, () => {
        e.analizado = true;
        this.tono(1200, 0, 0.08, "sine", 0.04);
        this.decir(llenar(t.analisis, { g: e.incl, e: e.estab }), "pensando", true);
        this.pintarCrater();
      }, { tecla: "Enter" });
      return this.opcionReinicio(L);
    }
    const A = e.incl <= SIM.pendRetroceso;
    const B = e.estab >= SIM.estabMin && this.energia >= SIM.energiaMin;
    const C = (!A && !B) || e.fallos > 0;
    [[t.opA, A, t.noA, () => this.craterA()], [t.opB, B, t.noB, () => this.craterB()], [t.opC, C, t.noC, () => this.asistenciaRobotica()]]
      .forEach(([s, disp, no, fn], i) => this.btn(L, x - 2, 88 + i * 13, 158, s + (disp ? "" : " " + t.no_disp), () => {
        this.reg.decisiones.push({ emergencia: "crater", eleccion: s, disponible: disp });
        if (!disp) return this.decir(llenar(no, { g: e.incl, lim: SIM.pendRetroceso }), "explicando", true);
        fn();
      }, { activo: disp, tecla: "abc"[i] }));
    this.opcionReinicio(L);
  },

  craterA() {
    this.limpiarLista();
    this.decir(this.t.em.A_proceso, "explicando", true);
    this.retroceder(() => this.exitoCrater("retroceso lento"));
  },

  craterB() {
    const e = this.emerg, t = this.t.em, L = this.limpiarLista();
    this.energia = Math.max(15, this.energia - 12);
    this.pregunta(L, t.B_proceso);
    this.decir(t.B_proceso, "pensando", true);
    this.tweens.add({ targets: this.carro, y: 0, duration: 140, yoyo: true, repeat: 4 });
    this.time.delayedCall(1300, () => {
      if (this.emerg !== e) return;
      if (e.incl <= SIM.inclAsistidaOk) return this.retroceder(() => this.exitoCrater("recuperación asistida"));
      e.fallos++;
      this.reg.recuperaciones.push({ tipo: "crater", metodo: "recuperación asistida", exito: false });
      this.decir(t.B_falla, "alerta", true);
      this.pintarCrater();
    });
  },

  exitoCrater(metodo) {
    const t = this.t.em;
    this.reg.recuperaciones.push({ tipo: "crater", metodo, exito: true });
    this.cerrarConExito(this.limpiarLista(), {
      titulo: t.estabilizado, exito: metodo === "asistencia robótica" ? t.robot_exito : t.crater_exito, consejo: t.crater_consejo
    });
  },

  // ================================================================ asistencia robótica (ficticia, CoderWolf)
  asistenciaRobotica() {
    const e = this.emerg, t = this.t.em;
    this.reg.asistencias++;
    e.robot = { paso: 0 };
    this.holoTitulo.setText("⚠ " + t.asist_titulo);
    this.decir(t.asist_stella, "pensando", true);
    this.pintarRobot();
  },

  pintarRobot() {
    const e = this.emerg, r = e.robot, t = this.t.em, L = this.limpiarLista(), x = HX + 4;
    if (r.paso === 0) {
      this.pregunta(L, t.asist_enlace);
      const barra = this.add.rectangle(x, 82, 0, 4, CIAN).setOrigin(0);
      L.add([this.add.rectangle(x, 82, 156, 4, 0x1a1c2c).setOrigin(0).setStrokeStyle(1, 0x333c57), barra]);
      this.tweens.add({
        targets: barra, width: 156, duration: 1000,
        onComplete: () => { if (this.emerg === e && r.paso === 0) this.btn(L, x - 2, 92, 158, t.asist_enviar, () => this.llamarRobot(), { tecla: "Enter" }); }
      });
    }
    if (r.paso === 1) this.pregunta(L, t.asist_camino);
    if (r.paso === 2) {
      this.pregunta(L, t.robot_llego);
      this.btn(L, x - 2, 82, 158, t.asist_analizar, () => this.analizarRobot(), { tecla: "Enter" });
    }
    if (r.paso === 3) return this.elegir(L, r.resultado + " " + t.asist_apoyo_p, t.apoyos, "asistencia", () => {
      r.paso = 4;
      this.limpiarLista();
      this.moverRobot(r.apoyo, 700, () => this.pintarRobot());
    });
    if (r.paso === 4) return this.elegir(L, t.asist_remolque_p, t.remolques, "asistencia", () => this.remolcar());
    if (r.paso === 5) this.pregunta(L, t.asist_remolcando);
    this.opcionReinicio(L);
  },

  // Punto fuera del cráter cerca del rover (para que el robot no entre)
  fueraDelCrater(dx, dy) {
    const R = this.rover, [cx, cy, rx, ry] = CRATER_PELIGRO;
    return [[-dx, dy], [dx, dy], [0, dy + 12], [-dx, -dy]].map(([a, b]) => ({ x: R.x + a, y: clamp(R.y + b, 78, 172) }))
      .find(p => Math.hypot((p.x - cx) / (rx + 8), (p.y - cy) / (ry + 6)) > 1.3) || { x: R.x - dx, y: clamp(R.y + dy, 78, 172) };
  },

  moverRobot(p, ms, fin) {
    const img = this.emerg.robot.img;
    img.setFlipX(p.x < img.x);
    this.tweens.add({
      targets: img, x: p.x, y: p.y, duration: ms, ease: "Sine.easeInOut",
      onUpdate: () => img.setDepth(img.y), onComplete: () => fin?.()
    });
  },

  llamarRobot() {
    const e = this.emerg, r = e.robot, R = this.rover, cam = this.cameras.main, t = this.t.em;
    const [cx, cy] = CRATER_PELIGRO;
    r.paso = 1;
    this.pintarRobot();
    this.tono(660, 0, 0.1, "sine", 0.04);
    this.tono(990, 0.12, 0.1, "sine", 0.04);
    r.seguro = this.puntoSeguro(18);
    const d = Math.hypot(r.seguro.x - cx, r.seguro.y - cy) || 1;
    r.apoyo = { x: r.seguro.x + (r.seguro.x - cx) / d * 26, y: clamp(r.seguro.y + (r.seguro.y - cy) / d * 10, 78, 172) };
    const cerca = this.fueraDelCrater(40, 12);
    r.img = this.add.image(cam.worldView.x - 20, cerca.y, "robot_rescate").setOrigin(0.5, 1).setDepth(cerca.y);
    this.tweens.add({ targets: r.img, angle: 3, duration: 120, yoyo: true, repeat: 14 });   // traqueteo al avanzar
    this.moverRobot(cerca, 1800, () => {
      if (this.emerg !== e) return;
      r.paso = 2;
      r.img.setFlipX(R.x < r.img.x);
      this.decir(t.robot_llego, "hablando", true);
      this.pintarRobot();
    });
  },

  analizarRobot() {
    const e = this.emerg, r = e.robot, R = this.rover;
    this.limpiarLista();
    const scan = this.add.rectangle(R.x - 22, R.y - 10, 2, 24, CIAN, 0.6).setDepth(600);
    this.tono(1400, 0, 0.3, "sine", 0.02);
    this.tweens.add({
      targets: scan, x: R.x + 22, duration: 450, yoyo: true,
      onComplete: () => {
        scan.destroy();
        if (this.emerg !== e) return;
        r.resultado = llenar(this.t.em.asist_resultado, { g: e.incl });
        r.paso = 3;
        this.pintarRobot();
      }
    });
  },

  remolcar() {
    const e = this.emerg, r = e.robot, R = this.rover;
    r.paso = 5;
    this.pintarRobot();
    r.img.setFlipX(R.x < r.img.x);
    r.cuerda = this.add.graphics().setDepth(600);
    const lejos = { x: r.apoyo.x + (r.apoyo.x - r.seguro.x) * 0.6, y: clamp(r.apoyo.y + (r.apoyo.y - r.seguro.y) * 0.6, 78, 172) };
    const dibujar = () => {
      const lado = r.img.flipX ? -1 : 1;
      r.cuerda.clear().lineStyle(1, 0xffcd75).lineBetween(r.img.x + lado * 8, r.img.y - 6, R.x, R.y - 9);
      this.colocarRover();
    };
    this.motor(true);
    this.tweens.add({ targets: R.c, rotation: 0, duration: 1600 });
    this.tweens.add({ targets: R, x: r.seguro.x, y: r.seguro.y, duration: 1700, ease: "Sine.easeInOut", onUpdate: dibujar });
    this.tweens.add({
      targets: r.img, x: lejos.x, y: lejos.y, duration: 1700, ease: "Sine.easeInOut",
      onComplete: () => {
        r.cuerda.destroy();
        if (this.emerg !== e) return;
        // el robot regresa a la estación
        const img = r.img;
        img.setFlipX(true);
        this.tweens.add({ targets: img, x: this.cameras.main.worldView.x - 30, duration: 2200, onComplete: () => img.destroy() });
        this.carro.y = 0;
        this.exitoCrater("asistencia robótica");
      }
    });
  },

  alarma() { [0, 0.2].forEach(i => this.tono(1000, i, 0.1, "square", 0.04)); }
};
