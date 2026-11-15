// Misión 5: minijuego de aterrizaje. Dueño: Rol 2.
// La nave cae con la gravedad lunar real (1.62 m/s²). Mantener presionado
// (clic, ↑ o ESPACIO) = propulsor: frena y gasta combustible. En la Luna casi
// no hay aire, así que solo el propulsor puede frenar.
// Fondo, nave y fuego en pixel art hechos con código (src/pixelart.js).
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto, titulo, boton, barras, datoReal } from "../ui.js";
import { crearTextura, crearTexturasEquipo } from "../pixelart.js";

// ---------------------------------------------------------------- física
const GRAVEDAD_LUNA = 1.62;   // m/s² (dato real)
const EMPUJE_BASE = 4.2;      // m/s² de frenado con agilidad 1
const PX_POR_METRO = 1.4;     // escala de la pantalla
const VEL_MAX_BARRA = 20;     // m/s que llena el indicador de velocidad

// D-3: cada nave frena y gasta distinto. El empuje sale de su agilidad
// (Equipo.js) y el gasto de combustible por segundo depende de su tamaño.
const PROPULSOR = {
  grande:  { consumo: 16, escala: 0.5, tobera: 6, fuego: 1 },     // pesada: frena despacio
  pequena: { consumo: 20, escala: 0.5, tobera: 5, fuego: 0.75 }   // ágil: frena fuerte
};
const NAVE_PRUEBA = { id: "pequena", agilidad: 1.3, combustible: 90 };   // si se abre la escena directo

// D-6: dificultad. TODO(Rol 4): ajustar los números.
const DIFICULTAD = {
  facil:   { altura: 50, vel0: 0, segura: 5,   combustible: 1.2 },
  normal:  { altura: 60, vel0: 2, segura: 3.5, combustible: 1 },
  dificil: { altura: 75, vel0: 5, segura: 2.5, combustible: 0.9 }
};

// ---------------------------------------------------------------- escenario
const SUELO = 150;                         // y de las patas al tocar el piso
const NAVE_X = 190;
const ZONA = { x1: 168, x2: 212 };         // D-11: zona de aterrizaje marcada
const HORIZONTE = 120;

// Fuego del propulsor: 2 cuadros. W centro casi blanco, Y amarillo, O naranja, R rojo.
const FUEGO = [
  [
    ".YWWWWY.",
    ".OYWWYO.",
    ".OYWWYO.",
    "..OYWYO.",
    "..OYYO..",
    "..ROYO..",
    "...RO...",
    "...OR...",
    "...R...."
  ],
  [
    ".YWWWWY.",
    "OYWWWWYO",
    ".OYWWYO.",
    ".OYWWYO.",
    "..OYYO..",
    "..OYYR..",
    "..ROOR..",
    "...OR...",
    "...RO...",
    "....R..."
  ]
];
const PALETA_FUEGO = { W: 0xfff6d5, Y: 0xffcd75, O: 0xffa300, R: 0xef5d3c };

export class Aterrizaje extends Phaser.Scene {
  constructor() { super("Aterrizaje"); }

  create(datos = {}) {
    this.t = estado.textos.aterrizaje;
    this.naveDatos = estado.nave || NAVE_PRUEBA;
    this.prop = PROPULSOR[this.naveDatos.id] || PROPULSOR.pequena;
    this.fase = "eligiendo";          // eligiendo → jugando → terminado
    this.presionado = false;

    crearTexturasEquipo(this);
    FUEGO.forEach((f, i) => crearTextura(this, `fuego_${i}`, f, PALETA_FUEGO));

    this.dibujarFondo();
    this.crearZona();
    this.crearNave();
    barras(this, estado);
    this.crearIndicadores();

    // D-9: dato real de la zona de aterrizaje (Moon Trek)
    const z = estado.datos.zona_aterrizaje;
    if (z) datoReal(this, { ...z, fuente: `${z.fuente} · ${z.nombre} (${Math.abs(z.lat)}°S, ${z.lon}°E)` });

    // Controles: clic/toque en cualquier parte, ↑ o ESPACIO
    this.input.on("pointerdown", () => (this.presionado = true));
    this.input.on("pointerup", () => (this.presionado = false));
    this.input.on("pointerupoutside", () => (this.presionado = false));
    this.teclas = this.input.keyboard.createCursorKeys();

    if (datos.dificultad) this.empezar(datos.dificultad);
    else this.mostrarMenu();
  }

  // ---------------------------------------------------------------- fondo
  // Polo sur lunar: cielo negro con estrellas, la Tierra baja en el horizonte,
  // montañas iluminadas de lado por el Sol rasante, un cráter en sombra
  // permanente (con hielo) y el suelo gris lleno de crateritos.
  dibujarFondo() {
    const g = this.add.graphics();
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    let semilla = 7;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

    // cielo con franjas tramadas hacia el horizonte
    r(0x05070f, 0, 0, ANCHO, HORIZONTE);
    const franjas = [[70, 0x080b1a], [90, 0x0b1026], [104, 0x111838]];
    franjas.forEach(([y0, c]) => {
      for (let y = y0; y < HORIZONTE; y++) for (let x = 0; x < ANCHO; x++)
        if (y >= y0 + 4 || (x + y) % 2 === 0) r(c, x, y, 1, 1);
    });

    // estrellas (algunas titilan)
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(azar() * ANCHO), y = Math.floor(azar() * 100);
      r(azar() < 0.2 ? 0xa8e4ff : 0x94b0c2, x, y, 1, 1);
    }
    for (let i = 0; i < 10; i++) {
      const e = this.add.rectangle(Math.floor(azar() * ANCHO), Math.floor(azar() * 90), 1, 1, 0xffffff).setOrigin(0);
      this.tweens.add({ targets: e, alpha: 0.2, duration: 600 + azar() * 900, yoyo: true, repeat: -1, delay: azar() * 1000 });
    }

    // la Tierra baja en el horizonte (así se ve desde el polo sur)
    const T = { x: 276, y: 58, r: 9 };
    g.fillStyle(0x1d2b53).fillCircle(T.x, T.y, T.r);           // lado de noche
    g.fillStyle(0x29adff).fillCircle(T.x - 2, T.y, T.r - 1);   // lado de día
    r(0x1d2b53, T.x + 4, T.y - 7, 5, 14);                       // sombra (fase)
    r(0x38b764, T.x - 7, T.y - 3, 4, 3); r(0x38b764, T.x - 3, T.y + 2, 3, 3); r(0x38b764, T.x - 1, T.y - 5, 2, 2);
    r(0xf4f4f4, T.x - 6, T.y + 4, 3, 1); r(0xf4f4f4, T.x - 2, T.y - 7, 4, 1); r(0xf4f4f4, T.x - 9, T.y - 1, 1, 2);

    // montañas lejanas (macizo) con borde izquierdo iluminado
    const alturaLejos = x => 18 + 9 * Math.sin(x / 37) + 6 * Math.sin(x / 13 + 1) + 2 * Math.sin(x / 5);
    for (let x = 0; x < ANCHO; x++) {
      const h = Math.round(alturaLejos(x)), y = HORIZONTE - h;
      r(0x29366f, x, y, 1, h + 20);
      if (alturaLejos(x + 1) > alturaLejos(x)) r(0x566c86, x, y, 1, 3);   // ladera que mira al Sol
      else r(0x333c57, x, y, 1, 1);
    }

    // colinas cercanas
    const alturaCerca = x => 10 + 5 * Math.sin(x / 23 + 2) + 3 * Math.sin(x / 9);
    for (let x = 0; x < ANCHO; x++) {
      const h = Math.round(alturaCerca(x)), y = 138 - h;
      r(0x333c57, x, y, 1, SUELO - y);
      if (alturaCerca(x + 1) > alturaCerca(x)) { r(0x94b0c2, x, y, 1, 1); r(0x566c86, x, y + 1, 1, 4); }
      else r(0x566c86, x, y, 1, 1);
    }

    // cráter en sombra permanente (como Shackleton) con brillitos de hielo
    g.fillStyle(0x0b1026).fillEllipse(70, 140, 92, 14);
    g.fillStyle(0x05070f).fillEllipse(72, 141, 78, 9);
    for (let x = 26; x < 116; x++) if (x % 3) r(0x94b0c2, x, 133 + Math.round(Math.abs(x - 70) / 14), 1, 1);
    [[52, 141], [66, 142], [80, 140], [94, 141], [60, 143]].forEach(([x, y]) => {
      const hielo = this.add.rectangle(x, y, 1, 1, 0xbff3ff).setOrigin(0);
      this.tweens.add({ targets: hielo, alpha: 0.1, duration: 900 + x * 7, yoyo: true, repeat: -1 });
    });

    // suelo
    r(0x94b0c2, 0, SUELO - 2, ANCHO, ALTO - SUELO + 2);
    r(0xc2c3c7, 0, SUELO - 2, ANCHO, 1);
    for (let y = SUELO + 4; y < ALTO; y++) for (let x = 0; x < ANCHO; x++)
      if ((x * 7 + y * 13) % 11 === 0) r(0x8796b0, x, y, 1, 1);
    // crateritos: hueco oscuro y borde claro abajo a la derecha
    [[18, 156, 10], [104, 160, 14], [250, 155, 9], [292, 161, 12], [140, 163, 6], [232, 164, 7]].forEach(([x, y, w]) => {
      g.fillStyle(0x566c86).fillEllipse(x, y, w, Math.max(3, w / 3));
      g.fillStyle(0xc2c3c7).fillRect(x - w / 4, y + Math.max(2, w / 6), w / 2, 1);
    });
    for (let i = 0; i < 30; i++) r(0x566c86, Math.floor(azar() * ANCHO), SUELO + 1 + Math.floor(azar() * 16), azar() < 0.3 ? 2 : 1, 1);

    // franja de abajo para el texto de la fuente
    r(0x1a1c2c, 0, 166, ANCHO, ALTO - 166);
    r(0x333c57, 0, 166, ANCHO, 1);
  }

  // D-11: plataforma de aterrizaje marcada con balizas que parpadean
  crearZona() {
    const g = this.add.graphics();
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    const w = ZONA.x2 - ZONA.x1;
    r(0xc2c3c7, ZONA.x1, SUELO - 2, w, 3);
    r(0xe8ecf4, ZONA.x1, SUELO - 2, w, 1);
    for (let x = ZONA.x1 + 2; x < ZONA.x2 - 2; x += 6) r(0xffcd75, x, SUELO, 3, 1);
    // banderines en los bordes
    [ZONA.x1, ZONA.x2 - 1].forEach(x => { r(0x566c86, x, SUELO - 10, 1, 9); r(0xff5c5c, x + (x === ZONA.x1 ? 1 : -4), SUELO - 10, 4, 3); });
    this.balizas = [ZONA.x1 + 3, ZONA.x2 - 4].map(x => {
      r(0x333c57, x - 1, SUELO - 4, 3, 2);
      return this.add.rectangle(x, SUELO - 5, 1, 1, 0x5cff8a).setOrigin(0);
    });
    this.tweens.add({ targets: this.balizas, alpha: 0.15, duration: 500, yoyo: true, repeat: -1 });
    texto(this, (ZONA.x1 + ZONA.x2) / 2, SUELO + 4, this.t.zona, { tam: 6, color: "#1a1c2c" });
  }

  crearNave() {
    const clave = this.naveDatos.id === "grande" ? "nave_grande" : "nave_pequena";
    // el fuego va detrás de la nave para que la tobera lo tape arriba
    this.fuego = this.add.image(NAVE_X, 0, "fuego_0").setOrigin(0.5, 0).setVisible(false);
    this.nave = this.add.image(NAVE_X, 0, clave).setOrigin(0.5, 1).setScale(this.prop.escala);
    this.sombra = this.add.ellipse(NAVE_X, SUELO, 20, 3, 0x333c57, 0.6);
    this.cuadroFuego = 0;
    this.time.addEvent({ delay: 70, loop: true, callback: () => {
      this.cuadroFuego = 1 - this.cuadroFuego;
      this.fuego.setTexture(`fuego_${this.cuadroFuego}`);
      this.fuego.setScale(this.prop.fuego, this.prop.fuego * (Math.random() < 0.5 ? 1 : 1.25));
    } });
    this.colocarNave(SUELO - 40 * PX_POR_METRO);
  }

  colocarNave(y) {
    this.nave.y = y;
    this.fuego.y = y - this.prop.tobera * this.prop.escala;
    // la sombra crece y se oscurece al acercarse al piso
    const cerca = Phaser.Math.Clamp(1 - (SUELO - y) / 100, 0.2, 1);
    this.sombra.setScale(cerca, 1).setAlpha(cerca * 0.7);
  }

  // ---------------------------------------------------------------- indicadores (D-5)
  crearIndicadores() {
    const P = { x: 4, y: 28, w: 74, h: 62 };
    this.add.rectangle(P.x, P.y, P.w, P.h, COLOR.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLOR.borde);
    this.textoAlt = texto(this, P.x + 4, P.y + 3, "", { tam: 6, origenX: 0, align: "left" });
    this.textoVel = texto(this, P.x + 4, P.y + 14, "", { tam: 6, origenX: 0, align: "left" });
    this.textoComb = texto(this, P.x + 4, P.y + 32, "", { tam: 6, origenX: 0, align: "left" });
    texto(this, P.x + 4, P.y + 50, "g Luna 1.62 m/s²", { tam: 6, origenX: 0, align: "left", color: COLOR.tenue });
    this.barrasHud = this.add.graphics();
    this.P = P;
    this.textoAviso = texto(this, NAVE_X, 34, "", { tam: 7, color: "#ff5c5c" });
    this.instruccion = texto(this, ANCHO / 2 + 40, 4, "", { tam: 7, ancho: 220 });
  }

  dibujarIndicadores() {
    const { x, y, w } = this.P;
    const g = this.barrasHud.clear();
    const bw = w - 8;
    const alt = Math.max(0, (SUELO - this.nave.y) / PX_POR_METRO);
    const segura = this.vy <= this.dif.segura;

    this.textoAlt.setText(`Altura ${alt.toFixed(0)} m`);
    this.textoVel.setText(`Vel ${Math.abs(this.vy).toFixed(1)} m/s ${this.vy >= 0 ? "↓" : "↑"}`)
      .setColor(segura ? "#5cff8a" : "#ff5c5c");
    this.textoComb.setText(`Combustible ${Math.max(0, Math.round(this.combustible))}`);

    // velocidad: barra con marca de velocidad segura
    const v = Phaser.Math.Clamp(Math.max(0, this.vy) / VEL_MAX_BARRA, 0, 1);
    g.fillStyle(0x0a0f24).fillRect(x + 4, y + 24, bw, 4);
    g.fillStyle(segura ? 0x5cff8a : 0xff5c5c).fillRect(x + 4, y + 24, Math.round(bw * v), 4);
    g.fillStyle(0xffcd75).fillRect(x + 4 + Math.round(bw * this.dif.segura / VEL_MAX_BARRA), y + 23, 1, 6);

    // combustible
    const c = Phaser.Math.Clamp(this.combustible / this.combustibleMax, 0, 1);
    g.fillStyle(0x0a0f24).fillRect(x + 4, y + 42, bw, 4);
    g.fillStyle(c > 0.25 ? 0xffa300 : 0xff5c5c).fillRect(x + 4, y + 42, Math.round(bw * c), 4);
  }

  // ---------------------------------------------------------------- menú (D-6, D-10)
  mostrarMenu() {
    this.instruccion.setText("");
    const op = estado.textos.equipo?.opciones?.[this.naveDatos.id];
    const empuje = (EMPUJE_BASE * this.naveDatos.agilidad).toFixed(1);
    const menu = [
      this.add.rectangle(ANCHO / 2 + 40, 92, 220, 128, 0x0b1026, 0.92).setStrokeStyle(1, COLOR.borde),
      titulo(this, this.t.titulo, 32).setX(ANCHO / 2 + 40),
      texto(this, ANCHO / 2 + 40, 48, this.t.explicacion, { tam: 7, ancho: 204 }),
      texto(this, ANCHO / 2 + 40, 92, this.t.tu_nave
        .replace("{nave}", op?.nombre || "Nave")
        .replace("{empuje}", empuje)
        .replace("{combustible}", this.naveDatos.combustible), { tam: 6, ancho: 204, color: "#ffcd75" }),
      texto(this, ANCHO / 2 + 40, 112, this.t.elige, { tam: 7 })
    ];
    ["facil", "normal", "dificil"].forEach((id, i) => {
      const b = boton(this, ANCHO / 2 + 40 + (i - 1) * 68, 136, `${i + 1}. ${this.t.dificultades[id]}`, () => this.elegir(id), 62);
      menu.push(b.caja, b.etiqueta);
    });
    this.menu = menu;
    this.input.keyboard.once("keydown-ONE", () => this.elegir("facil"));
    this.input.keyboard.once("keydown-TWO", () => this.elegir("normal"));
    this.input.keyboard.once("keydown-THREE", () => this.elegir("dificil"));
  }

  elegir(id) {
    if (this.fase !== "eligiendo") return;
    this.menu.forEach(o => o.destroy());
    this.empezar(id);
  }

  // ---------------------------------------------------------------- juego
  empezar(id) {
    this.dificultad = id;
    this.dif = DIFICULTAD[id];
    this.vy = this.dif.vel0;
    this.combustibleMax = Math.round(this.naveDatos.combustible * this.dif.combustible);
    this.combustible = this.combustibleMax;
    this.empuje = EMPUJE_BASE * this.naveDatos.agilidad;
    this.colocarNave(SUELO - this.dif.altura * PX_POR_METRO);
    this.instruccion.setText(this.t.instruccion);
    this.presionado = false;
    this.fase = "jugando";
    this.dibujarIndicadores();
  }

  update(_, ms) {
    if (this.fase !== "jugando") return;
    const dt = Math.min(ms, 50) / 1000;          // evita saltos si la pestaña se pausa
    const quiere = this.presionado || this.teclas.up.isDown || this.teclas.space.isDown;
    const frena = quiere && this.combustible > 0;

    // D-1: la gravedad lunar acelera la caída. D-2: el propulsor frena y gasta.
    this.vy += GRAVEDAD_LUNA * dt;
    if (frena) {
      this.vy -= this.empuje * dt;
      this.combustible = Math.max(0, this.combustible - this.prop.consumo * dt);
    }
    let y = this.nave.y + this.vy * PX_POR_METRO * dt;
    const techo = this.nave.displayHeight + 8;
    if (y < techo) { y = techo; this.vy = Math.max(0, this.vy); }
    this.colocarNave(Math.min(y, SUELO));
    this.fuego.setVisible(frena);
    if (frena && SUELO - this.nave.y < 30) this.levantarPolvo();

    this.textoAviso.setText(quiere && this.combustible <= 0 ? this.t.sin_combustible : "");
    this.dibujarIndicadores();
    if (this.nave.y >= SUELO) this.fin();
  }

  // el chorro levanta polvo que sale volando hacia los lados (sin aire que lo frene)
  levantarPolvo() {
    if (Math.random() < 0.6) return;
    const lado = Math.random() < 0.5 ? -1 : 1;
    const p = this.add.rectangle(NAVE_X + lado * 3, SUELO - 1, 1, 1, 0xc2c3c7);
    this.tweens.add({
      targets: p, x: p.x + lado * (20 + Math.random() * 30), y: p.y - Math.random() * 6,
      alpha: 0, duration: 500 + Math.random() * 300, onComplete: () => p.destroy()
    });
  }

  // ---------------------------------------------------------------- resultado (D-4)
  fin() {
    this.fase = "terminado";
    this.fuego.setVisible(false);
    this.textoAviso.setText("");
    this.instruccion.setText("");
    const vel = this.vy;
    const ok = vel <= this.dif.segura;
    this.dibujarIndicadores();

    if (ok) {
      for (let i = 0; i < 10; i++) this.levantarPolvo();
    } else {
      this.cameras.main.shake(300, 0.01);
      this.tweens.add({ targets: this.nave, angle: 18, duration: 400, ease: "Bounce.easeOut" });
    }

    const cx = ANCHO / 2 + 40;
    this.add.rectangle(cx, 76, 220, 92, 0x0b1026, 0.92).setStrokeStyle(1, ok ? 0x5cff8a : 0xff5c5c);
    titulo(this, ok ? this.t.titulo_exito : this.t.titulo_fallo, 36).setX(cx);
    const msg = (ok ? this.t.exito : this.t.fallo)
      .replace("{vel}", vel.toFixed(1)).replace("{segura}", this.dif.segura);
    texto(this, cx, 54, msg, { tam: 7, ancho: 204 });

    if (ok) {
      estado.bitacora.push(`Aterrizaste en el polo sur lunar a ${vel.toFixed(1)} m/s.`);
      boton(this, cx, 108, "Buscar a Itzel", () => this.scene.start("Ruta"));
    } else {
      estado.oxigeno -= 5;
      boton(this, cx - 52, 108, "Reintentar (-5 O2)", () => this.scene.restart({ dificultad: this.dificultad }), 100);
      boton(this, cx + 52, 108, "Cambiar dificultad", () => this.scene.restart({}), 100);
    }
  }
}
