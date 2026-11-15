// Misión 5: minijuego de aterrizaje. Dueño: Rol 2.
// Lee: nave, traje · Escribe: oxigeno (−al reintentar), bitacora · Sigue: CentroControl.
// La nave cae con la gravedad lunar real (1.62 m/s²). Mantener presionado
// (clic, ↑ o ESPACIO) = propulsor: frena y gasta combustible. En la Luna casi
// no hay aire, así que solo el propulsor puede frenar.
// Junto a la zona de aterrizaje está la base lunar. Solo si el aterrizaje es
// correcto, el astronauta baja de la nave, camina hasta la base y entra →
// siguiente escena (preparar el equipo). Si falla, solo puede reintentar.
// Fondo, nave y fuego en pixel art hechos con código (src/pixelart.js).
import { ANCHO, ALTO, COLOR, siguienteEscena, DIFICULTAD_ATERRIZAJE, O2_REINTENTO_ATERRIZAJE } from "../config.js";
import { estado } from "../estado.js";
import { texto, titulo, boton, barras, navegarConTeclado } from "../ui.js";
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

// D-6: dificultad (números en config.js → DIFICULTAD_ATERRIZAJE)
const DIFICULTAD = DIFICULTAD_ATERRIZAJE;

// ---------------------------------------------------------------- escenario
const SUELO = 150;                         // y de las patas al tocar el piso
const NAVE_X = 190;
const ZONA = { x1: 168, x2: 212 };         // D-11: zona de aterrizaje marcada
const HORIZONTE = 120;
// Base lunar pegada al borde izquierdo (coordenadas de 320×180); la cúpula chica
// queda medio cortada por la orilla, como si la base siguiera fuera de cuadro.
const BASE = { cx: 36, w: 50, h: 26, puertaX: 72, chicaX: 2 };

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
    navegarConTeclado(this);          // flechas + Enter en el menú y en "Reintentar" (ver ui.js)
    this.t = estado.textos.aterrizaje;
    this.naveDatos = estado.nave || NAVE_PRUEBA;
    this.prop = PROPULSOR[this.naveDatos.id] || PROPULSOR.pequena;
    this.fase = "eligiendo";          // eligiendo → jugando → terminado
    this.entrando = false;            // true mientras entra a la base
    this.presionado = false;

    crearTexturasEquipo(this);
    FUEGO.forEach((f, i) => crearTextura(this, `fuego_${i}`, f, PALETA_FUEGO));

    this.dibujarFondo();
    this.dibujarBase();
    this.crearZona();
    this.crearNave();
    barras(this, estado);
    this.crearIndicadores();

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
  // montañas iluminadas de lado por el Sol rasante y el suelo gris lleno de
  // crateritos.
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

  // ---------------------------------------------------------------- base lunar
  // Base blanca con franjas naranjas a la izquierda: cúpula principal con
  // ventanas y antena, cúpula chica con paneles solares y el módulo de entrada
  // (esclusa) con la puerta mirando a la plataforma (hacia la derecha).
  dibujarBase() {
    const g = this.add.graphics();
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    const piso = SUELO - 2;
    const C = {
      borde: 0x333c57, blanco: 0xf4f4f4, brillo: 0xffffff, sombra: 0xc2c3c7,
      naranja: 0xef7d57, naranjaClaro: 0xffa300, naranjaOscuro: 0xb13e53
    };

    // cúpula hecha por filas: blanca con juntas naranjas, franja naranja abajo,
    // lado iluminado a la izquierda (Sol rasante) y sombra a la derecha
    const cupula = (cx, w, h, paneles) => {
      for (let y = 0; y < h; y++) {
        const mitad = Math.round((w / 2) * Math.sqrt(1 - (y / h) ** 2));
        if (mitad <= 0) continue;
        const fila = piso - y, franja = y < 3 || y % paneles === 0;
        r(C.borde, cx - mitad - 1, fila, mitad * 2 + 2, 1);
        r(franja ? C.naranja : C.blanco, cx - mitad, fila, mitad * 2, 1);
        r(franja ? C.naranjaClaro : C.brillo, cx - mitad, fila, Math.max(1, Math.round(mitad * 0.35)), 1);
        r(franja ? C.naranjaOscuro : C.sombra, cx + Math.round(mitad * 0.55), fila, Math.round(mitad * 0.45), 1);
      }
      r(C.borde, cx - 2, piso - h, 5, 1);
    };

    // antena con plato y luz roja que parpadea
    const ax = BASE.cx - 6, arriba = piso - BASE.h;
    r(0x566c86, ax, arriba - 12, 1, 14);
    r(C.blanco, ax - 3, arriba - 13, 7, 1);
    r(C.naranja, ax - 2, arriba - 12, 5, 1);
    const luzAntena = this.add.rectangle(ax, arriba - 15, 1, 1, 0xff5c5c).setOrigin(0);
    this.tweens.add({ targets: luzAntena, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });

    // paneles solares detrás de la cúpula chica (pegada a la orilla izquierda)
    r(0x566c86, BASE.chicaX + 2, piso - 22, 1, 22);
    for (let i = 0; i < 3; i++) {
      r(0x1d2b53, BASE.chicaX - 4 + i * 4, piso - 28, 3, 6);
      r(0x29adff, BASE.chicaX - 4 + i * 4, piso - 28, 3, 1);
    }

    cupula(BASE.cx, BASE.w, BASE.h, 5);
    // túnel entre las cúpulas (blanco con franja naranja)
    const t1 = BASE.chicaX, t2 = BASE.cx - 20;
    r(C.borde, t1, piso - 7, t2 - t1, 7);
    r(C.blanco, t1, piso - 6, t2 - t1, 6);
    r(C.brillo, t1, piso - 6, t2 - t1, 1);
    r(C.naranja, t1, piso - 3, t2 - t1, 2);
    cupula(BASE.chicaX, 22, 12, 4);

    // ventanas con luz cálida que titila
    [-16, -6, 4, 14].forEach((dx, i) => {
      r(C.borde, BASE.cx + dx - 1, piso - 13, 5, 4);
      const v = this.add.rectangle(BASE.cx + dx, piso - 12, 3, 2, 0xfff27a).setOrigin(0);
      this.tweens.add({ targets: v, alpha: 0.55, duration: 900 + i * 230, yoyo: true, repeat: -1 });
    });

    // módulo de entrada (esclusa) naranja con franja blanca; la puerta mira a la derecha
    const px = BASE.puertaX;
    r(C.borde, px - 12, piso - 15, 18, 15);
    r(C.naranja, px - 11, piso - 14, 16, 14);
    r(C.naranjaClaro, px - 11, piso - 14, 16, 1);
    r(C.naranjaOscuro, px - 11, piso - 13, 4, 13);
    r(C.blanco, px - 11, piso - 4, 16, 2);
    r(0x1a1c2c, px - 3, piso - 11, 7, 11);                     // marco de la puerta
    this.puerta = this.add.rectangle(px - 2, piso - 10, 5, 10, C.sombra).setOrigin(0);
    this.luzPuerta = this.add.rectangle(px, piso - 13, 1, 1, 0x5cff8a).setOrigin(0);
    this.tweens.add({ targets: this.luzPuerta, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });

    // camino de la puerta a la plataforma y letrero
    for (let x = px + 6; x < ZONA.x1 - 2; x += 4) r(0x566c86, x, SUELO, 2, 1);
    texto(this, BASE.cx - 4, arriba - 24, this.t.base, { tam: 5, color: "#ffa300" });
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
    texto(this, P.x + 4, P.y + 50, this.t.hud_gravedad, { tam: 6, origenX: 0, align: "left", color: COLOR.tenue });
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

    this.textoAlt.setText(this.t.hud_altura.replace("{m}", alt.toFixed(0)));
    this.textoVel.setText(this.t.hud_vel.replace("{v}", Math.abs(this.vy).toFixed(1)).replace("{dir}", this.vy >= 0 ? "↓" : "↑"))
      .setColor(segura ? "#5cff8a" : "#ff5c5c");
    this.textoComb.setText(this.t.hud_combustible.replace("{c}", Math.max(0, Math.round(this.combustible))));

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
    const msg = (ok ? this.t.exito : this.t.fallo)
      .replace("{vel}", vel.toFixed(1)).replace("{segura}", this.dif.segura);
    this.panelFin = [
      this.add.rectangle(cx, 76, 220, 92, 0x0b1026, 0.92).setStrokeStyle(1, ok ? 0x5cff8a : 0xff5c5c),
      titulo(this, ok ? this.t.titulo_exito : this.t.titulo_fallo, 36).setX(cx),
      texto(this, cx, 54, msg, { tam: 7, ancho: 204 })
    ];

    if (ok) {
      // Solo con un aterrizaje correcto se entra a la base (sola, sin botón)
      estado.bitacora.push(this.t.bitacora.replace("{vel}", vel.toFixed(1)));
      this.panelFin.push(texto(this, cx, 108, this.t.entrando_base, { tam: 6, color: "#5cff8a" }));
      this.time.delayedCall(2500, () => this.entrarBase());
    } else {
      estado.cambiar("oxigeno", -O2_REINTENTO_ATERRIZAJE);
      boton(this, cx - 52, 108, this.t.reintentar.replace("{o2}", O2_REINTENTO_ATERRIZAJE), () => this.scene.restart({ dificultad: this.dificultad }), 100);
      boton(this, cx + 52, 108, this.t.cambiar_dificultad, () => this.scene.restart({}), 100);
    }
  }

  // ---------------------------------------------------------------- entrar a la base
  // El astronauta baja de la nave, camina hasta la esclusa, la puerta se abre,
  // entra y se ve un letrero de bienvenida → siguiente escena.
  entrarBase() {
    if (this.entrando) return;
    this.entrando = true;
    this.panelFin.forEach(o => o.destroy());

    const traje = estado.traje?.id || "ligero", piso = SUELO - 1;
    const astro = this.add.image(NAVE_X, piso, `astro_${traje}_0`).setOrigin(0.5, 1).setScale(0.5).setAlpha(0)
      .setFlipX(BASE.puertaX < NAVE_X);              // mira hacia la base
    const sombra = this.add.ellipse(NAVE_X, piso, 8, 2, 0x333c57, 0.6).setAlpha(0);
    let paso = 0;
    const caminar = this.time.addEvent({ delay: 150, loop: true, paused: true, callback: () => {
      paso = 1 - paso;
      astro.setTexture(`astro_${traje}_${paso}`);
      sombra.x = astro.x;
    } });

    this.tweens.chain({ tweens: [
      // baja de la nave
      { targets: [astro, sombra], alpha: 1, duration: 400 },
      // camina hasta la puerta
      { targets: astro, x: BASE.puertaX + 0.5, duration: 1800,
        onStart: () => { caminar.paused = false; },
        onComplete: () => {
          caminar.paused = true;
          astro.setTexture(`astro_${traje}_0`);
          sombra.x = astro.x;
          this.abrirPuerta();
        } },
      // espera a que se abra y entra
      { targets: [astro, sombra], alpha: 0, delay: 600, duration: 400, onComplete: () => this.cerrarPuerta() }
    ] });
  }

  abrirPuerta() {
    this.luzPuerta.setFillStyle(0xfff27a);
    this.brillo = this.add.rectangle(this.puerta.x, this.puerta.y, 5, 9, 0xfff27a, 0.85).setOrigin(0);
    this.children.moveBelow(this.brillo, this.puerta);
    this.tweens.add({ targets: this.puerta, scaleY: 0, duration: 400 });
  }

  cerrarPuerta() {
    this.tweens.add({ targets: this.puerta, scaleY: 1, duration: 400, onComplete: () => {
      this.brillo?.destroy();
      this.luzPuerta.setFillStyle(0x5cff8a);
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.bienvenida());
    } });
  }

  // Dentro de la base: letrero de bienvenida y luego a preparar el equipo
  bienvenida() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026).setOrigin(0);
    // pasillo: piso, paredes y luces del techo
    this.add.rectangle(0, 120, ANCHO, 60, 0x1d2650).setOrigin(0);
    this.add.rectangle(0, 120, ANCHO, 1, 0x4fd1ff).setOrigin(0);
    for (let x = 20; x < ANCHO; x += 40) {
      const l = this.add.rectangle(x, 24, 12, 2, 0xfff27a);
      this.tweens.add({ targets: l, alpha: 0.4, duration: 600 + x, yoyo: true, repeat: -1 });
    }
    const traje = estado.traje?.id || "ligero";
    this.add.image(60, 150, `astro_${traje}_0`).setOrigin(0.5, 1);
    titulo(this, this.t.base_titulo, 52);
    texto(this, ANCHO / 2, 76, this.t.base_texto, { tam: 7, ancho: 250 });
    // sigue sola a preparar el equipo (un clic lo adelanta)
    let listo = false;
    const seguir = () => {
      if (listo) return;
      listo = true;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
    };
    this.time.delayedCall(4500, seguir);
    this.input.once("pointerdown", seguir);
  }
}
