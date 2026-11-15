// Misión: el cráter helado. Dueño: Rol 5.
// Lee: misiones.ruta, traje, mochila · Escribe: oxigeno, misiones.crater, bitacora · Sigue: Huellas (Final si se acaba el O2).
// Interior oscuro de un cráter en sombra permanente; el niño avanza con el rover
// (mantener → / D o el clic). Solo se juega si la ruta elegida fue el cráter.
//
// Va justo después de Ruta en ORDEN. Lee la ruta que la escena Ruta guarda en
// estado.misiones.ruta.id ("crater" o "cresta"): con el cráter se juega; con
// la cresta se salta sola a la escena siguiente. En modo prueba, sin ruta
// guardada, se juega como si fuera el cráter
// (index.html?escena=CraterHelado, o &ruta=cresta para probar el salto).
//
// Decisiones (ninguna es gratis):
//  - Linterna (de la mochila): círculo de luz amplio. Sin ella, apenas un halo
//    y el rover va más lento (más tiempo = más oxígeno).
//  - Calefacción encendida: el rover va bien, pero la energía se cobra como
//    oxígeno cada segundo. Apagada: ahorra oxígeno, pero el frío lo va frenando.
//  - Polvo: tapa la pantalla desde los bordes y achica la luz. Limpiar detiene
//    el rover (el tiempo cuesta oxígeno); sin limpiar, las rocas que no se ven a
//    tiempo provocan un choque (oxígeno).
// Lee: mochila, traje. Escribe: oxigeno, bitacora. Números en datos.json → crater_helado.
import { ANCHO, ALTO, COLOR, ORDEN, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto, boton, datoReal, llenar } from "../ui.js";
import { crearTexturasExterior } from "../arteExterior.js";

const SUELO = 126;            // y donde apoyan las ruedas
const ROVER_X = 84;           // el rover se queda aquí; el cráter se mueve hacia él
const FRENTE = ROVER_X + 20;  // frente del rover (donde están los faros)
const BORDE = 44;             // arriba de esta línea se ve el borde del cráter con Sol
const OSCURO = 0x05070f;
const KMH = 0.25;             // misma escala que Exterior: 40 px/s ≈ 10 km/h
// Rocas del camino: [x en el mundo, desfase vertical]
const ROCAS = [[230, 0], [380, 2], [500, -1], [640, 1], [760, 0], [880, 2], [990, -1], [1080, 1]];

export class CraterHelado extends Phaser.Scene {
  constructor() { super("CraterHelado"); }

  create() {
    this.saliendo = false;            // Phaser reutiliza la escena en cada partida
    this.t = estado.textos.crater_helado;
    this.d = estado.datos.crater_helado;
    this.J = this.d.juego;
    this.sig = ORDEN.includes(this.scene.key) ? siguienteEscena(this.scene.key) : "Final";

    // Solo se entra por la ruta del cráter (la elige la escena Ruta)
    const prueba = new URLSearchParams(location.search).get("ruta");
    const ruta = estado.misiones?.ruta?.id ?? (estado.modoPrueba ? (prueba || "crater") : undefined);
    if (ruta !== "crater") { this.scene.start(this.sig); return; }

    const J = this.J;
    this.linterna = estado.lleva("linterna");
    this.vBase = this.linterna ? J.vel_linterna : J.vel_sin_linterna;
    this.radioBase = this.linterna ? J.radio_linterna : J.radio_sin_linterna;
    this.gasto = (estado.traje?.gastoO2 ?? 1.6) * J.o2_por_segundo_traje;   // O2 por segundo
    Object.assign(this, {
      dist: 0, calef: true, frio: 1, polvo: 0, limpiando: 0, pausa: 0, empezo: false, fin: false,
      o2Acum: 0, o2Gastado: 0, tiempo: 0, tCalef: 0, choques: 0, esquivas: 0, limpiezas: 0,
      avisoFrio: false, avisoPolvo: false, apoloDicho: false, presionado: false
    });

    crearTexturasExterior(this);
    this.dibujarFondo();
    this.crearRover();
    this.gOscuro = this.add.graphics().setDepth(500);
    this.gHaz = this.add.graphics().setDepth(505);
    this.gPolvo = this.add.graphics().setDepth(510);
    this.motas = Array.from({ length: 70 }, (_, i) => ({ u: (i * 0.6180339) % 1, k: (i * 37) % 9 }));
    this.crearHud();
    datoReal(this, this.d.temperatura).setDepth(600);

    // Controles: mantener → / D, o mantener el clic fuera de los botones
    this.teclas = this.input.keyboard.addKeys({ der: "RIGHT", d: "D", c: "C", l: "L" });
    this.input.keyboard.on("keydown-C", () => this.alternarCalef());
    this.input.keyboard.on("keydown-L", () => this.limpiar());
    this.input.on("pointerdown", () => (this.presionado = true));
    this.input.on("pointerup", () => (this.presionado = false));
    this.input.on("pointerupoutside", () => (this.presionado = false));

    this.cameras.main.fadeIn(500);
    this.decir(this.t.intro, 5000);
    this.time.delayedCall(5200, () => this.decir(this.linterna ? this.t.intro_linterna : this.t.intro_sin_linterna, 5000));
  }

  // ---------------------------------------------------------------- dibujo del cráter
  dibujarFondo() {
    const largo = this.J.largo_px + ANCHO + 60;
    this.add.rectangle(0, 0, ANCHO, ALTO, OSCURO).setOrigin(0).setDepth(-10);

    // estrellas y borde lejano del cráter, iluminado por el Sol (casi no se mueve)
    this.lejos = this.add.container(0, 0).setDepth(-5);
    const gl = this.add.graphics();
    for (let i = 0; i < 40; i++) gl.fillStyle(i % 5 ? 0x94b0c2 : 0xf4f4f4).fillRect((i * 53) % (ANCHO + 120), (i * 17) % 26, 1, 1);
    for (let x = 0; x < ANCHO + 120; x++) {
      const h = Math.round(8 + 5 * Math.sin(x / 19) + 3 * Math.sin(x / 7 + 1));
      gl.fillStyle(0x333c57).fillRect(x, BORDE - h, 1, h);
      gl.fillStyle(0xc2c3c7).fillRect(x, BORDE - h, 1, 1);             // filo con luz del Sol
      if ((x + h) % 3 === 0) gl.fillStyle(0x94b0c2).fillRect(x, BORDE - h + 1, 1, 1);
    }
    this.lejos.add(gl);

    // paredes y piso del cráter (se mueven con el rover; solo se ven con luz)
    this.medio = this.add.container(0, 0).setDepth(0);
    const gm = this.add.graphics();
    for (let x = 0; x < largo; x++) {
      const h = Math.round(18 + 8 * Math.sin(x / 31) + 4 * Math.sin(x / 11));
      gm.fillStyle(0x1d2650).fillRect(x, BORDE, 1, h + 10);
      if (x % 4 === 0) gm.fillStyle(0x29366f).fillRect(x, BORDE + h, 1, 2);
    }
    this.medio.add(gm);

    this.mundo = this.add.container(0, 0).setDepth(1);
    const g = this.add.graphics();
    g.fillStyle(0x333c57).fillRect(0, 84, largo, ALTO - 84);
    g.fillStyle(0x566c86).fillRect(0, SUELO - 6, largo, 14);              // huella por donde va el rover
    for (let x = 0; x < largo; x += 3) {
      g.fillStyle(0x29366f).fillRect(x, 86 + ((x * 7) % 34), 1, 1);
      g.fillStyle(0x94b0c2).fillRect(x, SUELO - 6 + ((x * 13) % 14), 1, 1);
      g.fillStyle(0x29366f).fillRect(x, SUELO + 10 + ((x * 11) % 40), 1, 1);
    }
    // crateritos
    for (let x = 60; x < largo; x += 90) {
      const y = 96 + (x % 3) * 8, w = 10 + (x % 5) * 3;
      g.fillStyle(0x1d2650).fillEllipse(x, y, w, w / 3);
      g.fillStyle(0x566c86).fillRect(x - w / 4, y + 2, w / 2, 1);
    }
    this.mundo.add(g);
    // hielo escondido en la sombra: brilla solo cuando la luz lo alcanza
    for (let x = 40; x < largo; x += 47) {
      const hielo = this.add.rectangle(x, 100 + ((x * 3) % 60), 1, 1, 0xbff3ff);
      this.mundo.add(hielo);
      this.tweens.add({ targets: hielo, alpha: 0.15, duration: 500 + (x % 7) * 120, yoyo: true, repeat: -1 });
    }
    // rocas del camino
    this.rocas = ROCAS.map(([x, dy]) => {
      const r = this.add.graphics();
      r.fillStyle(0x1a1c2c).fillEllipse(x, SUELO - 2 + dy, 14, 9);
      r.fillStyle(0x566c86).fillEllipse(x, SUELO - 3 + dy, 12, 7);
      r.fillStyle(0x94b0c2).fillRect(x - 3, SUELO - 6 + dy, 4, 1);
      this.mundo.add(r);
      return { x, y: SUELO - 3 + dy, lista: false };
    });
    // salida del cráter: baliza verde
    const sx = this.J.largo_px + ROVER_X + 30;
    this.mundo.add([this.add.rectangle(sx, SUELO - 12, 2, 18, 0xc2c3c7), this.add.rectangle(sx + 4, SUELO - 20, 6, 4, 0x5cff8a)]);
  }

  crearRover() {
    const c = this.add.container(ROVER_X, SUELO).setDepth(506);
    this.ruedas = [-13, 11].map(x => this.add.image(x, -6, "rover_rueda"));
    this.carro = this.add.container(0, 0);
    this.carro.add([this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), this.add.image(-3.5, -13, "rover_piloto").setOrigin(0.5, 1)]);
    c.add([this.add.ellipse(0, 0, 40, 6, 0x1a1c2c, 0.5), ...this.ruedas, this.carro]);
    this.rover = c;
    this.luz = { x: FRENTE + 10, y: SUELO - 4 };    // a la altura de las rocas del camino
  }

  // ---------------------------------------------------------------- HUD
  crearHud() {
    const t = this.t, P = 600;
    this.add.rectangle(0, 0, ANCHO, 15, 0x0b1026, 0.85).setOrigin(0).setDepth(P);
    texto(this, 4, 3, "O2", { tam: 6, origenX: 0, color: "#7ee6ff" }).setDepth(P);
    this.add.rectangle(18, 7, 40, 4, 0x0a0f24).setOrigin(0, 0.5).setDepth(P);
    this.barraO2 = this.add.rectangle(18, 7, 40, 4, COLOR.oxigeno).setOrigin(0, 0.5).setDepth(P);
    this.textoO2 = texto(this, 62, 3, "", { tam: 6, origenX: 0 }).setDepth(P);
    // avance del cruce
    texto(this, 104, 3, t.progreso, { tam: 6, origenX: 0, color: COLOR.tenue }).setDepth(P);
    this.add.rectangle(130, 7, 80, 3, 0x29366f).setOrigin(0, 0.5).setDepth(P);
    this.barraAvance = this.add.rectangle(130, 7, 0, 3, 0x5cff8a).setOrigin(0, 0.5).setDepth(P);
    this.textoVel = texto(this, 216, 3, "", { tam: 6, origenX: 0 }).setDepth(P);
    texto(this, ANCHO - 4, 3, t.afuera, { tam: 6, origenX: 1, color: "#7ee6ff" }).setDepth(P);

    // botones de decisión
    const fijar = b => { b.caja.setDepth(P); b.etiqueta.setDepth(P + 1); return b; };
    this.btnCalef = fijar(boton(this, 58, 154, t.calef_si, () => this.alternarCalef(), 104));
    this.btnLimpiar = fijar(boton(this, 166, 154, t.limpiar, () => this.limpiar(), 96));
    texto(this, 270, 150, t.avanzar, { tam: 6, ancho: 90, color: COLOR.tenue }).setDepth(P);

    // STELLA habla arriba
    this.dialogo = texto(this, ANCHO / 2, 20, "", { tam: 6, ancho: 250 })
      .setBackgroundColor("#1d2650").setPadding(3, 2).setDepth(610).setVisible(false);
  }

  decir(frase, ms = 4000) {
    this.dialogo.setText(frase).setVisible(true);
    this.time.removeEvent(this.ocultar);
    this.ocultar = this.time.delayedCall(ms, () => this.dialogo.setVisible(false));
  }

  // ---------------------------------------------------------------- decisiones
  alternarCalef() {
    if (this.fin) return;
    this.calef = !this.calef;
    this.btnCalef.etiqueta.setText(this.calef ? this.t.calef_si : this.t.calef_no);
    this.btnCalef.caja.setStrokeStyle(1, this.calef ? COLOR.borde : 0xff8a5c);
    this.decir(this.calef ? this.t.dice_calef_si : this.t.dice_calef_no, 4500);
  }

  limpiar() {
    if (this.fin || this.limpiando > 0 || this.polvo < 0.05) return;
    this.limpiando = this.J.limpiar_segundos;
    this.polvoInicial = this.polvo;
    this.limpiezas++;
    this.btnLimpiar.etiqueta.setText(this.t.limpiando);
    if (!this.apoloDicho) { this.apoloDicho = true; this.decir(this.t.polvo_apolo, 5500); }
  }

  // ---------------------------------------------------------------- juego
  update(_, ms) {
    if (this.fin || !this.teclas) return;          // sin teclas = la escena se saltó
    const dt = Math.min(ms, 50) / 1000, J = this.J;
    const quiere = this.presionado || this.teclas.der.isDown || this.teclas.d.isDown;
    if (quiere) this.empezo = true;

    // frío: sin calefacción el rover se va frenando; con ella se recupera
    this.frio = this.calef ? Math.min(1, this.frio + J.frio_recupera * dt) : Math.max(J.frio_min, this.frio - J.frio_baja * dt);
    if (!this.calef && this.frio < 0.6 && !this.avisoFrio) { this.avisoFrio = true; this.decir(this.t.aviso_frio, 5000); }

    // limpiar y chocar detienen el rover
    if (this.limpiando > 0) {
      this.limpiando -= dt;
      this.polvo = Math.max(0, this.polvoInicial * (this.limpiando / J.limpiar_segundos));
      if (this.limpiando <= 0) { this.polvo = 0; this.btnLimpiar.etiqueta.setText(this.t.limpiar); }
    }
    if (this.pausa > 0) this.pausa -= dt;
    const detenido = this.limpiando > 0 || this.pausa > 0;
    const v = quiere && !detenido ? this.vBase * this.frio : 0;

    // avance, polvo y oxígeno (el tiempo cuenta desde que empieza a avanzar)
    this.dist = Math.min(J.largo_px, this.dist + v * dt);
    this.polvo = Math.min(1, this.polvo + J.polvo_por_segundo * dt * (v / J.vel_linterna));
    if (this.polvo > 0.5 && !this.avisoPolvo) { this.avisoPolvo = true; this.decir(this.t.aviso_polvo, 5000); }
    if (this.empezo) {
      this.tiempo += dt;
      if (this.calef) this.tCalef += dt;
      this.o2Acum += (this.gasto + (this.calef ? J.o2_calefaccion : 0)) * dt;
      while (this.o2Acum >= 1) { this.o2Acum -= 1; this.gastar(1); }
    }

    // la luz se achica con el polvo; una luz grande alumbra más adelante
    const r = this.radioBase * (1 - J.polvo_luz * this.polvo);
    this.luz.x = FRENTE + Math.round(r * 0.6);
    this.revisarRocas(r, v);
    this.moverMundo(v, dt);
    this.dibujarOscuridad(r);
    this.dibujarPolvo();
    this.actualizarHud(v);

    if (estado.causaDerrota()) return this.terminar(true);
    if (this.dist >= J.largo_px) this.terminar(false);
  }

  gastar(n) {
    estado.cambiar("oxigeno", -n);
    this.o2Gastado += n;
  }

  // Cada roca se decide cuando está a la "distancia de reacción" del frente del
  // rover (más lejos cuanto más rápido va, como al manejar): si en ese momento
  // está dentro de la luz, se ve a tiempo y se esquiva; si no, el rover choca.
  revisarRocas(r, v) {
    const reaccion = Math.max(8, v * this.J.reaccion_segundos);
    for (const k of this.rocas) {
      if (k.lista) continue;
      const sx = k.x - this.dist;
      if (sx - FRENTE > reaccion) continue;
      k.lista = true;
      const vista = (sx - this.luz.x) ** 2 + (k.y - this.luz.y) ** 2 < r * r;
      if (vista) {
        this.esquivas++;
        this.tweens.add({ targets: this.carro, y: -7, duration: 160, yoyo: true, ease: "Quad.easeOut" });
      } else {
        this.choques++;
        this.gastar(this.J.choque_o2);
        this.pausa = this.J.choque_pausa;
        this.cameras.main.shake(250, 0.008);
        this.decir(llenar(this.t.choque, { o2: this.J.choque_o2 }), 3000);
      }
    }
  }

  moverMundo(v, dt) {
    this.mundo.x = -Math.round(this.dist);
    this.medio.x = -Math.round(this.dist * 0.5);
    this.lejos.x = -Math.round(this.dist * 0.08);
    this.ruedas.forEach(w => (w.angle += v * dt * 6));
    this.carro.y = this.carro.y < -0.5 ? this.carro.y : (v > 0 ? Math.round(Math.sin(this.dist / 6) * 0.6) : 0);
  }

  // Oscuridad en franjas de 2 px: todo negro menos un círculo de luz (con un
  // borde en penumbra). Así se ve pixelado, como el resto del juego.
  dibujarOscuridad(r) {
    const g = this.gOscuro.clear(), h = this.gHaz.clear();
    const cx = this.luz.x, cy = this.luz.y, r2 = r * 1.45;
    for (let y = BORDE; y < ALTO; y += 2) {
      const dy = y + 1 - cy;
      const a2 = r2 * r2 - dy * dy > 0 ? Math.round(Math.sqrt(r2 * r2 - dy * dy)) : -1;
      const a1 = r * r - dy * dy > 0 ? Math.round(Math.sqrt(r * r - dy * dy)) : -1;
      g.fillStyle(OSCURO, 0.95);
      if (a2 < 0) { g.fillRect(0, y, ANCHO, 2); continue; }
      g.fillRect(0, y, Math.max(0, cx - a2), 2);
      g.fillRect(cx + a2, y, ANCHO, 2);
      g.fillStyle(OSCURO, 0.62);
      if (a1 < 0) g.fillRect(cx - a2, y, 2 * a2, 2);
      else { g.fillRect(cx - a2, y, a2 - a1, 2); g.fillRect(cx + a1, y, a2 - a1, 2); }
    }
    // haz de los faros
    h.fillStyle(0xfff27a, 0.07).fillTriangle(ROVER_X + 18, SUELO - 12, cx + r, cy - r * 0.5, cx + r, cy + r * 0.5);
  }

  // El polvo entra desde los bordes y se acumula en la cámara y los faros del rover
  dibujarPolvo() {
    const g = this.gPolvo.clear(), b = Math.round(this.polvo * this.J.polvo_borde);
    if (b < 1) return;
    g.fillStyle(0x6b6157, 0.9);
    g.fillRect(0, 15, ANCHO, Math.round(b * 0.5));                 // arriba (debajo del HUD)
    g.fillRect(0, ALTO - b * 0.7, ANCHO, b * 0.7);                 // abajo
    g.fillRect(0, 15, b, ALTO);                                    // izquierda
    g.fillRect(ANCHO - b, 15, b, ALTO);                            // derecha
    // motas sueltas en el borde interior (pixel art)
    g.fillStyle(0x8a7e70, 0.85);
    for (const m of this.motas) {
      const p = m.u * 2 * (ANCHO + ALTO);
      let x, y;
      if (p < ANCHO) { x = p; y = 15 + b * 0.5 + m.k; }
      else if (p < ANCHO + ALTO) { x = ANCHO - b - m.k; y = p - ANCHO; }
      else if (p < 2 * ANCHO + ALTO) { x = p - ANCHO - ALTO; y = ALTO - b * 0.7 - m.k; }
      else { x = b + m.k; y = p - 2 * ANCHO - ALTO; }
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  actualizarHud(v) {
    const o2 = Math.round(estado.oxigeno);
    this.textoO2.setText(String(o2)).setColor(o2 <= 20 ? "#ff5c5c" : "#eef1ff");
    this.barraO2.width = Math.max(0, Math.min(40, o2 * 0.4));
    this.barraAvance.width = 80 * this.dist / this.J.largo_px;
    this.textoVel.setText(llenar(this.t.velocidad, { kmh: Math.round(v * KMH) }));
  }

  // ---------------------------------------------------------------- final
  terminar(sinOxigeno) {
    this.fin = true;
    this.presionado = false;
    const t = this.t, pct = this.tiempo ? Math.round(100 * this.tCalef / this.tiempo) : 100;
    estado.bitacora.push(llenar(t.bitacora, { o2: this.o2Gastado, choques: this.choques, limpiezas: this.limpiezas }));
    // registro para la bitácora en cadena del Final
    estado.misiones.crater = { oxigeno: -this.o2Gastado, choques: this.choques, limpiezas: this.limpiezas };
    if (sinOxigeno) return this.time.delayedCall(600, () => this.scene.start("Final"));

    const consejo = this.choques ? t.consejo_choques : pct < 50 ? t.consejo_frio : t.consejo_bien;
    const P = 700;
    this.add.rectangle(ANCHO / 2, 84, 236, 104, 0x0b1026, 0.94).setStrokeStyle(1, 0x5cff8a).setDepth(P);
    texto(this, ANCHO / 2, 38, t.fin_titulo, { tam: 9, color: COLOR.titulo }).setDepth(P);
    texto(this, ANCHO / 2, 56, llenar(t.fin_lineas, {
      o2: this.o2Gastado, esquivas: this.esquivas, choques: this.choques, limpiezas: this.limpiezas, calef: pct
    }), { tam: 6, ancho: 220 }).setDepth(P);
    texto(this, ANCHO / 2, 98, consejo, { tam: 6, ancho: 220, color: "#ffcd75" }).setDepth(P);
    const seguir = () => { if (this.saliendo) return; this.saliendo = true; this.scene.start(this.sig); };
    const b = boton(this, ANCHO / 2, 124, t.continuar, seguir, 100);
    ["ENTER", "SPACE"].forEach(k => this.input.keyboard.once("keydown-" + k, seguir));   // también con teclado
    b.caja.setDepth(P); b.etiqueta.setDepth(P + 1);
    [this.btnCalef, this.btnLimpiar].forEach(x => { x.caja.disableInteractive().setAlpha(0.4); x.etiqueta.setAlpha(0.4); });
  }
}
