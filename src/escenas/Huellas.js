// Misión: Huellas. Dueño: Rol 2 (pantalla) y Rol 4 (números en datos.json → huellas).
// Lee: datos.huellas · Escribe: oxigeno, bitacora · Sigue: Tormenta.
// Vista desde arriba del suelo lunar. Dos rastros de ruedas se separan: uno es
// del rover de Itzel y el otro de un rover de carga de la base. El niño acerca
// la lupa (ratón o flechas/WASD) a los círculos "?" de cada rastro y ve 3 pistas:
// ancho de rueda, profundidad de la marca y un objeto caído (solo junto al de Itzel).
// STELLA da una pista si el niño tarda. Cuál rastro es el correcto cambia al azar.
// Costos: cada pista nueva gasta oxígeno (tiempo); acertar no cuesta nada;
// fallar recorre un tramo de más, gasta oxígeno y regresa a la bifurcación.
// Estado que usa: oxigeno y bitacora.
import { ANCHO, ALTO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto, barras, boton, datoReal, llenar } from "../ui.js";
import { crearTexturasHuellas } from "../arteHuellas.js";
import { Stella } from "../stella.js";


const SUELO = 146;                       // el suelo va de y=0 a SUELO; abajo, la barra de STELLA
const BIF = { x: 160, y: 122 };          // bifurcación
const INICIO = { x: 160, y: 150 };
// Curva de cada rastro: [control, final]
const CURVAS = [[[150, 60], [50, 6]], [[170, 60], [270, 6]]];
const PUNTOS = [0.3, 0.55, 0.8];         // dónde están las 3 pistas sobre cada rastro
const PISTAS = ["ancho", "prof", "obj"];
// Cómo se ve cada rastro: separación entre ruedas, ancho de rueda, color, borde (hundido)
const ESTILO = {
  itzel: { sep: 9,  rueda: 2, color: 0x6c6f7d, borde: null },
  carga: { sep: 14, rueda: 4, color: 0x464956, borde: 0xa3a6b2 }
};
const LUPA_R = 20;
const ESPERA_AYUDA = 15000;              // ms sin hacer nada antes de que STELLA ayude

export class Huellas extends Phaser.Scene {
  constructor() { super("Huellas"); }

  create() {
    this.t = estado.textos.huellas;
    this.saliendo = false;            // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    this.d = estado.datos.huellas;
    this.correcto = Math.random() < 0.5 ? 0 : 1;     // 0 = izquierda, 1 = derecha
    this.tipos = this.correcto === 0 ? ["itzel", "carga"] : ["carga", "itzel"];
    this.curvas = CURVAS.map(([c, f]) => new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(BIF.x, BIF.y), new Phaser.Math.Vector2(...c), new Phaser.Math.Vector2(...f)));
    this.vistas = new Set();
    this.descartado = [false, false];
    this.errores = 0;
    this.ocupado = true;
    this.ayuda = 0;
    this.ultima = this.time.now;

    crearTexturasHuellas(this);
    this.dibujarSuelo();
    this.dibujarRastros();
    this.crearPistas();
    this.rover = this.add.image(INICIO.x, INICIO.y + 10, "huellas_rover").setDepth(5);
    this.crearBarra();
    this.crearLupa();
    this.hud();

    // El rover llega a la bifurcación y STELLA explica
    this.tweens.add({
      targets: this.rover, y: BIF.y + 12, duration: 1200, ease: "Sine.easeOut",
      onComplete: () => {
        this.ocupado = false;
        this.decir(this.t.intro, "hablando");
        this.time.delayedCall(4500, () => { if (!this.ocupado) this.decir(this.t.ficha, "explicando"); });
        this.time.delayedCall(9500, () => { if (!this.ocupado && !this.vistas.size) this.decir(llenar(this.t.decidir, { n: this.d.o2_pista }), "hablando"); });
      }
    });

    this.teclas = this.input.keyboard.addKeys("UP,DOWN,LEFT,RIGHT,W,A,S,D");
    this.input.keyboard.on("keydown-ONE", () => this.elegir(0));
    this.input.keyboard.on("keydown-TWO", () => this.elegir(1));
    this.input.on("pointermove", p => { if (p.worldY < SUELO) this.ponerLupa(p.worldX, p.worldY); });
  }

  // ---------------------------------------------------------------- dibujo
  dibujarSuelo() {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x7f828e).fillRect(0, 0, ANCHO, SUELO);
    const azar = new Phaser.Math.RandomDataGenerator(["huellas"]);   // mismo suelo siempre
    for (let i = 0; i < 260; i++) {
      g.fillStyle(azar.pick([0x8d909c, 0x737683, 0x6b6e7a]))
        .fillRect(azar.between(0, ANCHO), azar.between(0, SUELO), azar.between(1, 2), 1);
    }
    // cráteres pequeños lejos de los rastros
    [[24, 70, 12], [292, 76, 14], [110, 18, 7], [214, 26, 8], [40, 128, 9], [282, 132, 10], [160, 30, 6]].forEach(([x, y, r]) => {
      g.fillStyle(0x5e616d).fillEllipse(x, y, r * 2, r * 1.4);
      g.fillStyle(0x6f727e).fillEllipse(x + 1, y + 1, r * 1.6, r * 1.1);
      g.fillStyle(0x9a9daa).fillRect(x - r * 0.6, y + r * 0.55, r * 1.2, 1);
    });
    // rocas
    [[78, 96], [240, 100], [128, 140], [196, 136], [300, 40], [14, 30]].forEach(([x, y], i) => {
      g.fillStyle(0x1a1c2c).fillRect(x - 1, y + 2, 5 + i % 2, 2);
      g.fillStyle(0xa6a9b6).fillRect(x, y, 4 + i % 2, 3);
    });
    // zonas sin explorar al final de cada rastro
    [50, 270].forEach(x => g.fillStyle(0x0b1026, 0.35).fillEllipse(x, 4, 46, 20));
  }

  // Marcas de las dos ruedas a lo largo de una curva (o una recta)
  marcas(g, puntoEn, estilo, n) {
    for (let i = 0; i <= n; i++) {
      const u = i / n, p = puntoEn(u), q = puntoEn(Math.min(1, u + 0.01)), r = puntoEn(Math.max(0, u - 0.01));
      const ang = Math.atan2(q.y - r.y, q.x - r.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      [-1, 1].forEach(s => {
        const x = p.x + nx * s * estilo.sep / 2, y = p.y + ny * s * estilo.sep / 2;
        if (estilo.borde) g.fillStyle(estilo.borde).fillRect(x - estilo.rueda / 2 + 1, y + 1, estilo.rueda, 1);
        g.fillStyle(i % 2 ? estilo.color : Phaser.Display.Color.ValueToColor(estilo.color).darken(8).color)
          .fillRect(x - estilo.rueda / 2, y - estilo.rueda / 2, estilo.rueda, estilo.rueda);
      });
    }
  }

  dibujarRastros() {
    const g = this.add.graphics().setDepth(-8);
    // tramo común (los dos rovers pasaron por aquí)
    const recta = u => ({ x: INICIO.x, y: INICIO.y + 10 + (BIF.y - INICIO.y - 10) * u });
    ["carga", "itzel"].forEach(tipo => this.marcas(g, recta, ESTILO[tipo], 20));
    this.curvas.forEach((c, i) => this.marcas(g, u => c.getPoint(u), ESTILO[this.tipos[i]], 90));
  }

  // Círculos "?" sobre cada rastro y el objeto caído junto al de Itzel
  crearPistas() {
    this.pistas = [];
    this.curvas.forEach((c, lado) => {
      PUNTOS.forEach((u, k) => {
        let p = c.getPoint(u);
        if (PISTAS[k] === "obj") {             // a un costado, hacia afuera
          const tg = c.getTangent(u);
          let nx = -tg.y, ny = tg.x;                   // perpendicular al rastro
          if (nx * (lado === 0 ? -1 : 1) < 0) { nx = -nx; ny = -ny; }
          p = { x: p.x + nx * 13, y: p.y + ny * 13 };
        }
        const tipo = this.tipos[lado];
        if (PISTAS[k] === "obj") {
          this.add.image(p.x, p.y, tipo === "itzel" ? "huellas_guante" : "huellas_piedras").setScale(tipo === "itzel" ? 0.6 : 1).setDepth(-6);
        }
        const aro = this.add.circle(p.x, p.y, 6).setStrokeStyle(1, 0x29adff).setDepth(2);
        const signo = texto(this, p.x, p.y, "?", { tam: 6, color: "#bff3ff", origenY: 0.5 }).setDepth(2);
        this.tweens.add({ targets: aro, scale: 1.25, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
        this.pistas.push({ id: `${lado}_${PISTAS[k]}`, lado, clase: PISTAS[k], tipo, x: p.x, y: p.y, aro, signo });
      });
    });
  }

  // ---------------------------------------------------------------- barra de STELLA y botones
  crearBarra() {
    this.barra = this.add.container(0, 0).setDepth(20);
    const fondo = this.add.rectangle(0, SUELO, ANCHO, ALTO - SUELO, 0x0b1026).setOrigin(0).setStrokeStyle(1, COLOR.borde);
    this.stella = new Stella(this, 18, 177);
    this.linea = texto(this, 34, SUELO + 4, "", { tam: 6, ancho: 210, origenX: 0, align: "left" });
    this.barra.add([fondo, this.stella.c, this.linea]);
    this.botones = this.t.botones.map((s, i) => {
      const y = SUELO + 9 + i * 15;
      const caja = this.add.rectangle(282, y, 64, 12, COLOR.panel).setStrokeStyle(1, COLOR.borde)
        .setInteractive({ useHandCursor: true });
      const et = texto(this, 282, y, s, { tam: 6, origenY: 0.5 });
      caja.on("pointerover", () => !this.descartado[i] && caja.setFillStyle(0x2c3770));
      caja.on("pointerout", () => caja.setFillStyle(COLOR.panel));
      caja.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); this.elegir(i); });
      this.barra.add([caja, et]);
      return { caja, et };
    });
  }

  decir(s, gesto = "hablando") {
    this.linea.setText(s);
    this.stella.estado(gesto);
  }

  // Barra de oxígeno (se vuelve a dibujar cuando cambia)
  hud() {
    this.hudObjs?.forEach(o => o.destroy());
    const n = this.children.list.length;
    barras(this, estado, ["oxigeno"]);
    this.hudObjs = this.children.list.slice(n);
    this.hudObjs.forEach(o => o.setDepth(21));
  }

  restarO2(n, x, y) {
    estado.cambiar("oxigeno", -n);
    this.hud();
    const f = texto(this, x, y, llenar(this.t.menos_o2, { n }), { tam: 6, color: "#4fd1ff", origenY: 0.5 }).setDepth(30);
    this.tweens.add({ targets: f, y: y - 12, alpha: 0, duration: 1200, onComplete: () => f.destroy() });
  }

  // ---------------------------------------------------------------- lupa
  crearLupa() {
    this.lupa = this.add.container(BIF.x + 40, 90).setDepth(10);
    this.vidrio = this.add.circle(0, 0, LUPA_R, 0xbff3ff, 0.12);
    this.contenido = this.add.container(0, 0);
    this.aroLupa = this.add.circle(0, 0, LUPA_R).setStrokeStyle(2, 0xc2c3c7);
    const mango = this.add.rectangle(LUPA_R * 0.72, LUPA_R * 0.72, 5, 14, 0x566c86)
      .setOrigin(0.5, 0).setAngle(-45).setStrokeStyle(1, 0x1a1c2c);
    const brillo = this.add.rectangle(-8, -11, 5, 1, 0xffffff, 0.6).setAngle(-30);
    this.lupa.add([mango, this.vidrio, this.contenido, this.aroLupa, brillo]);
    this.mascara = this.make.graphics({}, false).fillStyle(0xffffff).fillCircle(0, 0, LUPA_R - 1);
    this.contenido.setMask(this.mascara.createGeometryMask());
    this.enfocada = null;
    this.enfoque = 0;
  }

  ponerLupa(x, y) {
    this.lupa.setPosition(Phaser.Math.Clamp(x, 4, ANCHO - 4), Phaser.Math.Clamp(y, 4, SUELO - 4));
  }

  // Dibuja lo que se ve con aumento dentro de la lupa
  verDentro(p) {
    this.contenido.removeAll(true);
    const add = o => { this.contenido.add(o); return o; };
    const g = add(this.add.graphics());
    const itzel = p.tipo === "itzel";
    g.fillStyle(0x8d909c).fillCircle(0, 0, LUPA_R);
    if (p.clase === "ancho") {
      const w = itzel ? 6 : 14;
      for (let y = -LUPA_R; y < LUPA_R; y += 4) {
        g.fillStyle(0x5e616d).fillRect(-w / 2, y, w, 2);
        g.fillStyle(0x6f727e).fillRect(-w / 2, y + 2, w, 2);
      }
      // regla con cuadritos de 3 px
      g.fillStyle(0x1a1c2c).fillRect(-12, 5, 24, 5);
      for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0xffcd75 : 0xe8ecf4).fillRect(-12 + i * 3, 6, 3, 3);
    } else if (p.clase === "prof") {
      // corte del suelo: la marca se ve como un hueco
      const hondo = itzel ? 2 : 9;
      g.fillStyle(0x1d2650).fillRect(-LUPA_R, -LUPA_R, LUPA_R * 2, LUPA_R);
      g.fillStyle(0x7f828e).fillRect(-LUPA_R, -3, LUPA_R * 2, LUPA_R + 3);
      g.fillStyle(0x2a2c38).fillRect(-7, -3, 14, hondo);
      g.fillStyle(0x464956).fillRect(-7, -3 + hondo - 1, 14, 1);
      g.fillStyle(0xa3a6b2).fillRect(-9, -4, 2, 1).fillRect(7, -4, 2, 1);
    } else {
      add(this.add.image(0, -3, itzel ? "huellas_guante" : "huellas_piedras").setScale(itzel ? 3 : 2));
    }
    add(texto(this, 0, 10, this.t.lupa[`${p.clase}_${p.tipo}`], { tam: 6, color: "#1a1c2c", origenY: 0 }));
  }

  revisarLupa(dt) {
    if (this.ocupado) return;
    const cerca = this.pistas.find(p => Phaser.Math.Distance.Between(p.x, p.y, this.lupa.x, this.lupa.y) < 9);
    if (cerca !== this.enfocada) {
      this.enfocada = cerca;
      this.enfoque = 0;
      this.contenido.removeAll(true);
      this.aroLupa.setStrokeStyle(2, 0xc2c3c7);
    }
    if (!cerca) return;
    this.enfoque += dt;
    if (this.enfoque < 400 || this.contenido.length) return;
    // enfocada: se ve la pista
    this.aroLupa.setStrokeStyle(2, 0xffcd75);
    this.verDentro(cerca);
    this.decir(this.t.pistas[`${cerca.clase}_${cerca.tipo}`], "explicando");
    if (!this.vistas.has(cerca.id)) {
      this.vistas.add(cerca.id);
      this.ultima = this.time.now;
      this.restarO2(this.d.o2_pista, cerca.x, cerca.y - 10);
      this.tweens.killTweensOf(cerca.aro);
      cerca.aro.setScale(1).setAlpha(1).setStrokeStyle(1, 0x5cff8a);
      cerca.signo.setText("✓").setColor("#5cff8a");
      if (this.vistas.size === this.pistas.length) this.time.delayedCall(2500, () => !this.ocupado && this.decir(llenar(this.t.decidir, { n: this.d.o2_pista })));
    }
  }

  // STELLA ayuda si el niño tarda (cada vez más directa)
  revisarAyuda() {
    if (this.ocupado || this.ayuda >= this.t.ayuda.length || this.time.now - this.ultima < ESPERA_AYUDA) return;
    const lado = this.t.lados[this.correcto];
    this.decir(llenar(this.t.ayuda[this.ayuda], { lado }), "pensando");
    if (this.ayuda === this.t.ayuda.length - 1) {
      const obj = this.pistas.find(p => p.lado === this.correcto && p.clase === "obj");
      const chispa = this.add.star(obj.x + 4, obj.y - 4, 4, 1, 3, 0xfff27a).setDepth(3);
      this.tweens.add({ targets: chispa, alpha: 0.2, angle: 90, duration: 400, yoyo: true, repeat: -1 });
    }
    this.ayuda++;
    this.ultima = this.time.now;
  }

  // ---------------------------------------------------------------- elegir rastro
  elegir(lado) {
    if (this.ocupado || this.descartado[lado]) return;
    this.ocupado = true;
    this.enfocada = null;
    this.contenido.removeAll(true);
    this.lupa.setVisible(false);
    this.recorrer(lado, 0, 1, () => (lado === this.correcto ? this.acertar(lado) : this.fallar(lado)));
  }

  // Mueve el rover sobre el rastro (de "desde" a "hasta", 0 = bifurcación)
  recorrer(lado, desde, hasta, alTerminar) {
    const c = this.curvas[lado];
    const ida = hasta > desde;
    const paso = { u: desde };
    this.tweens.add({
      targets: paso, u: hasta, duration: 2400, ease: "Sine.easeInOut",
      onUpdate: () => {
        const p = c.getPoint(paso.u), tg = c.getTangent(paso.u);
        this.rover.setPosition(p.x, p.y).setRotation(Math.atan2(tg.y, tg.x) + Math.PI / 2 + (ida ? 0 : Math.PI));
      },
      onComplete: alTerminar
    });
  }

  fallar(lado) {
    this.errores++;
    const fin = this.curvas[lado].getPoint(1);
    const carga = this.add.image(fin.x + (lado === 0 ? -16 : 16), fin.y + 12, "huellas_carga").setDepth(4).setAlpha(0);
    this.tweens.add({ targets: carga, alpha: 1, duration: 400 });
    this.stella.reaccionar("alerta", 1500);
    this.decir(llenar(this.t.error, { o2: this.d.o2_error }), "alerta");
    this.cameras.main.shake(150, 0.002);
    this.time.delayedCall(2200, () => {
      this.restarO2(this.d.o2_error, this.rover.x, this.rover.y + 14);
      this.recorrer(lado, 1, 0, () => {
        this.rover.setRotation(0).setPosition(BIF.x, BIF.y + 12);
        this.descartado[lado] = true;
        this.marcarDescartado(lado);
        this.decir(this.t.volver, "explicando");
        this.lupa.setVisible(true);
        this.ultima = this.time.now;
        this.ocupado = false;
      });
    });
  }

  marcarDescartado(lado) {
    const p = this.curvas[lado].getPoint(0.42);
    const g = this.add.graphics().setDepth(3).lineStyle(2, 0xff5c5c);
    g.lineBetween(p.x - 5, p.y - 5, p.x + 5, p.y + 5).lineBetween(p.x + 5, p.y - 5, p.x - 5, p.y + 5);
    const b = this.botones[lado];
    b.caja.setFillStyle(0x1a1c2c).disableInteractive();
    b.et.setColor(COLOR.tenue);
  }

  acertar(lado) {
    this.stella.estado("exito");
    this.decir(this.t.bien, "exito");
    const nota = this.errores ? this.t.bitacora_mal : this.t.bitacora_bien;
    estado.bitacora.push(llenar(nota, { pistas: this.vistas.size, o2: this.d.o2_error, lado: this.t.lados[lado] }));
    this.time.delayedCall(2200, () => this.mostrarDato());
  }

  // Tarjeta con el dato real y botón para seguir
  mostrarDato() {
    this.barra.setVisible(false);
    this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.7).setOrigin(0).setDepth(40);
    this.add.rectangle(ANCHO / 2, 86, 250, 116, COLOR.panel).setStrokeStyle(1, COLOR.borde).setDepth(41);
    this.add.image(60, 54, "huellas_rover").setScale(2).setDepth(42);
    texto(this, ANCHO / 2, 36, this.t.dato_titulo, { tam: 10, color: COLOR.titulo }).setDepth(42);
    texto(this, ANCHO / 2, 60, this.d.texto, { tam: 7, ancho: 226 }).setDepth(42);
    datoReal(this, this.d).setDepth(42);
    const b = boton(this, ANCHO / 2, 128, this.t.continuar, () => {
      if (this.saliendo) return;
      this.saliendo = true;
      this.cameras.main.fadeOut(500);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
    });
    b.caja.setDepth(42); b.etiqueta.setDepth(43);
    this.input.keyboard.once("keydown-ENTER", () => b.caja.emit("pointerdown"));
  }

  // ---------------------------------------------------------------- bucle
  update(_, dt) {
    dt = Math.min(dt, 50);                    // tope, igual que las demás escenas
    if (!this.ocupado) {
      const k = this.teclas, v = 0.08 * dt;
      const dx = (k.RIGHT.isDown || k.D.isDown) - (k.LEFT.isDown || k.A.isDown);
      const dy = (k.DOWN.isDown || k.S.isDown) - (k.UP.isDown || k.W.isDown);
      if (dx || dy) this.ponerLupa(this.lupa.x + dx * v, this.lupa.y + dy * v);
    }
    this.mascara.setPosition(this.lupa.x, this.lupa.y);
    this.revisarLupa(dt);
    this.revisarAyuda();
  }
}
