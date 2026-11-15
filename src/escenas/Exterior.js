// Misión 2b: exterior de la estación lunar. Dueño: Rol 2 (pantalla), Rol 3 (arte).
// Lee: textos.exterior · Escribe: misiones.exterior, bitacora · Sigue: Ruta.
// Empieza al salir del Centro de Control con la mochila lista. El astronauta
// camina (WASD / flechas / clic en el suelo) de la esclusa a la zona de
// vehículos, aborda el rover con E y lo CONDUCE siguiendo las balizas hasta el
// punto de exploración. STELLA (src/stella.js) da instrucciones breves.
// Al llegar → siguienteEscena (no resuelve el rescate).
// Registro: estado.misiones.exterior. Mundo de MUNDO × 180 con cámara que sigue.
// Tutorial holográfico, análisis del terreno y emergencias: sistemasRover.js.
import { ALTO, ANCHO, ZOOM, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto, llenar } from "../ui.js";
import { crearTexturasMochila } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";
import { Stella } from "../stella.js";
import { SistemasRover, SIM, SUELTO, BLANDO } from "./sistemasRover.js";
import { tono, sonar } from "../sonidos.js";

const MUNDO = 2000;
const HORIZONTE = 58;
const SUELO = { x1: 20, x2: MUNDO - 20, y1: 74, y2: 174 };   // por donde puede ir el rover
const PIE = { x1: 12, x2: 556, y1: 104, y2: 174 };          // a pie: de la esclusa a la zona de vehículos
const ESCLUSA = { x: 150, y: 98 };
const PLATAFORMA = { x1: 336, x2: 548, y1: 104, y2: 172 };   // zona segura para bajar
const ROVER0 = { x: 440, y: 150 };
const VEL_PIE = 60, CERCA = 24;
// Conducción sencilla para 7–12 años: aceleración progresiva, freno, tope de velocidad
const AUTO = { vmax: 72, vmaxRugoso: 38, acel: 40, freno: 95, reversa: 24, roce: 24, giroDirecto: 3.2, radio: 10 };
const KMH = 0.25;            // 72 px/s ≈ 18 km/h (tope del rover lunar del Apolo)
const METROS = 2;            // 1 px = 2 m
const BALIZAS = [[610, 138], [730, 108], [860, 150], [990, 104], [1120, 146], [1250, 164],
  [1390, 122], [1530, 96], [1660, 136], [1790, 150], [1910, 120]];
const CRATERES = [[670, 165, 16, 7], [800, 90, 18, 8], [930, 165, 14, 6], [1060, 90, 20, 8], [1190, 110, 16, 7],
  [1330, 92, 22, 9], [1460, 160, 18, 8], [1600, 160, 16, 7], [1725, 116, 26, 10, 1], [1860, 164, 14, 6], [1950, 82, 30, 10]];
const ROCAS = [[250, 152, 5, 1], [318, 168, 3, 2], [690, 96, 5, 1], [760, 152, 4, 1], [900, 94, 6, 0], [1010, 152, 5, 1],
  [1150, 104, 4, 1], [1280, 122, 5, 1], [1420, 150, 6, 0], [1505, 132, 4, 1], [1690, 108, 4, 1], [1822, 112, 6, 0]];
const RUGOSO = [{ x1: 1080, x2: 1180, y1: 120, y2: 176 }, { x1: 1480, x2: 1580, y1: 76, y2: 128 }];
// g = grados (tramo 2 suaves; tramo 4 pronunciadas, más que la pendiente cómoda del rover)
const PENDIENTES = [{ x1: 940, x2: 1000, p: 1, g: 12 }, { x1: 1000, x2: 1050, p: -1, g: 12 }, { x1: 1600, x2: 1650, p: 1, g: 16 }, { x1: 1650, x2: 1700, p: -1, g: 16 }];
const SOMBRAS = [[1370, 112, 92, 36], [1950, 96, 64, 24]];
const LETREROS = [[574, 118], [998, 82], [1402, 156], [1702, 98]];
const OSCURO = 0x0b1026;
const dentro = (x, y, r) => x >= r.x1 && x <= r.x2 && y >= (r.y1 ?? 0) && y <= (r.y2 ?? ALTO);
const enElipse = (x, y, [cx, cy, rx, ry], m = 1) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < m * m;

export class Exterior extends Phaser.Scene {
  constructor() { super("Exterior"); }

  create() {
    crearTexturasMochila(this);
    crearTexturasExterior(this);
    this.t = estado.textos.exterior;
    estado.misiones ??= {};
    this.reg = estado.misiones.exterior = { completada: false, choques: 0, balizas: 0, abordajes: 0, bajadas: 0, segundos: 0 };
    // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    this.saliendo = false; this.listo = false; this.stellaVisible = false; this.trasEmergencia = false;
    this.finLinea = null; this.osc = null; this.destino = null; this.irRover = false; this.punteroRover = false; this.puedeAuto = false;
    this.modo = "intro";            // intro · pie · abordando · rover · bajando · final
    this.inicio = this.time.now;
    this.energia = 100;
    this.dijo = {};
    this.espera = {};               // enfriamiento de avisos de STELLA
    this.colaS = [];
    this.siguiente = 0;             // índice de la próxima baliza
    this.paso = 0; this.tiempoPaso = 0; this.patron = 0;
    this.obst = [
      { t: "rect", x1: 0, x2: 300, y1: 0, y2: 100 },            // estación
      { t: "rect", x1: 300, x2: 344, y1: 0, y2: 98 },           // paneles solares
      { t: "circ", x: 515, y: 122, r: 8 },                      // robot de carga
      { t: "rect", x1: 356, x2: 386, y1: 108, y2: 120 },        // vehículo científico
      ...CRATERES.filter(c => !c[4]).map(([x, y, rx, ry]) =>   // el cráter peligroso no choca: provoca la emergencia
        ({ t: "elipse", x, y, rx, ry })),
      ...ROCAS.map(([x, y, r]) => ({ t: "circ", x, y: y - 1, r }))
    ];

    this.dibujarFondo();
    this.dibujarSuelo();
    this.dibujarEstacion();
    this.dibujarVehiculos();
    this.dibujarRuta();
    this.crearAstronauta();
    this.crearRover();
    this.crearHud();
    this.iniciarSistemas();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MUNDO, ALTO);
    cam.startFollow(this.astro, true, 0.15, 0.15);

    this.k = this.input.keyboard.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", W: "W", A: "A", S: "S", D: "D" });
    this.input.keyboard.on("keydown-E", () => this.usarE());
    ["ENTER", "SPACE"].forEach(k => this.input.keyboard.on("keydown-" + k, () => {
      if (this.modo === "emergencia") return;           // ahí las teclas manejan el holograma
      if (this.modo === "final") this.usarE(); else this.saltarLinea();
    }));
    this.input.keyboard.on("keydown-H", () => this.alternarAyuda());
    this.input.keyboard.on("keydown", ev => this.teclaSistemas(ev));
    this.input.on("pointerdown", p => {
      if (this.modo === "final") return this.usarE();
      // en el rover: mantener el clic en el suelo = ir hacia ese punto (zona central, sin el HUD)
      if (this.modo === "rover") { if (p.y / ZOOM >= 40 && p.y / ZOOM < 150) this.punteroRover = true; return; }
      if (this.modo !== "pie" || p.y / ZOOM < 40) return;
      // clic sobre el rover: caminar hasta él y subir solo
      const R = this.rover;
      if (Math.abs(p.worldX - R.x) < 24 && p.worldY > R.y - 30 && p.worldY < R.y + 8) {
        this.irRover = true;
        this.destino = { x: Phaser.Math.Clamp(R.x, PIE.x1, PIE.x2), y: Phaser.Math.Clamp(R.y + 6, PIE.y1, PIE.y2) };
        return;
      }
      if (p.worldY < PIE.y1 - 12) return;
      this.irRover = false;
      this.destino = { x: Phaser.Math.Clamp(p.worldX, PIE.x1, PIE.x2), y: Phaser.Math.Clamp(p.worldY, PIE.y1, PIE.y2) };
    });

    this.events.once("shutdown", () => {
      this.input.removeAllListeners();
      this.input.keyboard.removeAllListeners();
      this.motor(false);
      this.tweens.killAll();
      this.time.removeAllEvents();
    });

    this.cameras.main.fadeIn(500);
    this.salirEsclusa();
  }

  // ================================================================ dibujo
  // Capa con paralaje en coordenadas de 320×180 (compensa el zoom de la cámara)
  capa(sf, prof) {
    return this.add.container((ANCHO * ZOOM - ANCHO) / 2 * (1 - sf), (ALTO * ZOOM - ALTO) / 2 * (1 - sf)).setScrollFactor(sf).setDepth(prof);
  }

  dibujarFondo() {
    const rnd = new Phaser.Math.RandomDataGenerator(["cielo"]);
    // cielo y estrellas (fijos)
    const cielo = this.capa(0, -300), g = this.add.graphics();
    cielo.add(g);
    g.fillStyle(0x05070f).fillRect(0, 0, ANCHO, ALTO);
    for (let i = 0; i < 70; i++) g.fillStyle(rnd.pick([0xf4f4f4, 0x94b0c2, 0x566c86]), 1).fillRect(rnd.between(0, ANCHO), rnd.between(0, HORIZONTE), 1, 1);
    for (let i = 0; i < 8; i++) {
      const e = this.add.rectangle(rnd.between(4, ANCHO - 4), rnd.between(2, 40), 1, 1, 0xffffff);
      cielo.add(e);
      this.tweens.add({ targets: e, alpha: 0.2, duration: rnd.between(600, 1400), yoyo: true, repeat: -1, delay: rnd.between(0, 900) });
    }
    // la Tierra en el cielo
    g.fillStyle(0x29366f).fillCircle(262, 16, 7);
    g.fillStyle(0x3b5dc9).fillCircle(263, 16, 6);
    g.fillStyle(0x38b764).fillRect(260, 13, 3, 3).fillRect(264, 17, 3, 2);
    g.fillStyle(0xf4f4f4).fillRect(261, 11, 4, 1).fillRect(259, 19, 3, 1);

    // montañas lejanas y colinas (paralaje)
    const sierra = (sf, prof, largo, y0, alto, color, luz) => {
      const c = this.capa(sf, prof), m = this.add.graphics();
      c.add(m);
      const pts = [{ x: -10, y: HORIZONTE + 4 }];
      for (let x = -10; x <= largo; x += rnd.between(14, 30)) pts.push({ x, y: y0 - rnd.between(0, alto) });
      pts.push({ x: largo + 20, y: HORIZONTE + 4 });
      m.fillStyle(color).fillPoints(pts, true);
      m.lineStyle(1, luz);
      for (let i = 1; i < pts.length - 2; i++) if (pts[i].y < pts[i + 1].y) m.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    };
    sierra(0.25, -290, ANCHO + (MUNDO - ANCHO) * 0.25 + 20, 52, 24, 0x2e3142, 0x4a4e63);
    sierra(0.55, -280, ANCHO + (MUNDO - ANCHO) * 0.55 + 20, 62, 12, 0x404457, 0x5d6274);
  }

  dibujarSuelo() {
    const rnd = new Phaser.Math.RandomDataGenerator(["suelo"]);
    const g = this.add.graphics().setDepth(-200);
    // franjas: más claro al fondo, más oscuro cerca
    [[HORIZONTE, 0x8b8e9e], [70, 0x7f8292], [90, 0x767989], [115, 0x6d7080], [145, 0x656878]].forEach(([y, c]) => g.fillStyle(c).fillRect(0, y, MUNDO, ALTO - y));
    for (let x = 0; x < MUNDO; x += 3) g.fillStyle(0x8b8e9e).fillRect(x, HORIZONTE - (rnd.frac() < 0.3 ? 1 : 0), 3, 1);
    // manchas, guijarros y microcráteres
    for (let i = 0; i < 260; i++) {
      const x = rnd.between(0, MUNDO), y = rnd.between(HORIZONTE + 4, ALTO);
      g.fillStyle(rnd.pick([0x5d6070, 0x9a9dac, 0x7c7f90]), 0.5).fillEllipse(x, y, rnd.between(6, 22), rnd.between(2, 5));
    }
    for (let i = 0; i < 500; i++) g.fillStyle(rnd.pick([0x4a4d5e, 0xb4b6c4]), 1).fillRect(rnd.between(0, MUNDO), rnd.between(HORIZONTE + 2, ALTO), 1, 1);
    for (let i = 0; i < 40; i++) {
      const x = rnd.between(0, MUNDO), y = rnd.between(HORIZONTE + 6, ALTO - 4), r = rnd.between(2, 5);
      g.fillStyle(0xa8abb8).fillEllipse(x, y + 1, r * 2 + 2, r + 1);
      g.fillStyle(0x4a4d5e).fillEllipse(x, y, r * 2, r);
    }
    // pendientes suaves: lado iluminado y lado en sombra, con curvas de nivel
    PENDIENTES.forEach(({ x1, x2, p }) => {
      g.fillStyle(p > 0 ? 0xffffff : 0x1a1c2c, 0.07).fillRect(x1, HORIZONTE + 8, x2 - x1, ALTO);
      g.lineStyle(1, p > 0 ? 0x9a9dac : 0x5d6070, 0.8);
      for (let x = x1 + 8; x < x2; x += 12) g.lineBetween(x, HORIZONTE + 14, x + 4 * p, ALTO);
    });
    // zonas irregulares: muchas piedritas
    RUGOSO.forEach(r => {
      g.fillStyle(0x5d6070, 0.35).fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      for (let i = 0; i < 90; i++) {
        const x = rnd.between(r.x1 + 2, r.x2 - 2), y = rnd.between(r.y1 + 2, r.y2 - 2);
        g.fillStyle(0x3e4150).fillRect(x, y + 1, 3, 1);
        g.fillStyle(0xa8abb8).fillRect(x, y, 2, 1);
      }
    });
    // cráteres (obstáculos): borde iluminado, interior oscuro
    const c = this.add.graphics().setDepth(-150);
    CRATERES.forEach(([x, y, rx, ry]) => {
      c.fillStyle(0xa8abb8).fillEllipse(x, y + 1, rx * 2 + 6, ry * 2 + 4);
      c.fillStyle(0x3e4150).fillEllipse(x, y, rx * 2, ry * 2);
      c.fillStyle(0x2a2c3a).fillEllipse(x, y - 1, rx * 2 - 4, ry * 2 - 3);
      c.fillStyle(0x5a5d6c).fillEllipse(x + 2, y + ry * 0.45, rx * 1.2, ry * 0.7);
    });
    // rocas
    ROCAS.forEach(([x, y, , tipo]) => this.add.image(x, y, "roca_" + tipo).setOrigin(0.5, 1).setDepth(y));
    // sombras permanentes (encima de todo lo del suelo)
    const s = this.add.graphics().setDepth(400);
    SOMBRAS.forEach(([x, y, rx, ry]) => {
      s.fillStyle(0x05070f, 0.25).fillEllipse(x, y, rx * 2 + 24, ry * 2 + 12);
      s.fillStyle(0x05070f, 0.4).fillEllipse(x, y, rx * 2, ry * 2);
    });
  }

  dibujarEstacion() {
    const g = this.add.graphics().setDepth(90);
    const caja = (x, y, w, h, color, borde = 0x1a1c2c) => g.fillStyle(borde).fillRect(x - 1, y - 1, w + 2, h + 2).fillStyle(color).fillRect(x, y, w, h);
    // antena de celosía (izquierda)
    g.lineStyle(1, 0x94b0c2);
    g.lineBetween(36, 52, 40, 14).lineBetween(44, 52, 40, 14);
    for (let y = 20; y < 52; y += 6) g.lineBetween(37 + (52 - y) / 10, y, 43 - (52 - y) / 10, y + 4);
    // módulo habitable largo
    caja(20, 50, 120, 46, 0xc2c3c7);
    g.fillStyle(0xe8ecf4).fillRect(20, 50, 120, 6);
    g.fillStyle(0x94b0c2).fillRect(20, 88, 120, 8);
    g.fillStyle(0x3b5dc9).fillRect(20, 62, 120, 4);
    [34, 52, 70, 88, 106].forEach(x => { g.fillStyle(0x1a1c2c).fillCircle(x, 76, 4); g.fillStyle(0xffcd75).fillCircle(x, 76, 3); g.fillStyle(0xfff27a).fillRect(x - 2, 74, 2, 1); });
    // módulo cúpula
    const domo = (r, color) => g.fillStyle(color).slice(206, 96, r, Math.PI, Math.PI * 2).fillPath();
    domo(47, 0x1a1c2c);
    domo(46, 0xc2c3c7);
    g.fillStyle(0xe8ecf4).fillEllipse(192, 60, 26, 7);
    g.fillStyle(0x3b5dc9).fillRect(164, 80, 85, 4);
    [176, 192, 220, 236].forEach(x => { g.fillStyle(0x1a1c2c).fillRect(x - 4, 66, 9, 7); g.fillStyle(0x29adff).fillRect(x - 3, 67, 7, 5); });
    // torre de comunicaciones con antena de plato
    caja(252, 40, 40, 56, 0xe8ecf4);
    g.fillStyle(0x94b0c2).fillRect(252, 88, 40, 8);
    g.fillStyle(0xef7d57).fillRect(252, 48, 40, 3);
    g.fillStyle(0x1a1c2c).fillRect(262, 58, 20, 10);
    g.fillStyle(0x29adff).fillRect(263, 59, 18, 8);
    g.lineStyle(1, 0x94b0c2).lineBetween(272, 40, 272, 22);
    g.fillStyle(0xe8ecf4).slice(272, 22, 11, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340)).fillPath();
    g.lineStyle(1, 0x566c86).lineBetween(272, 18, 272, 12);
    // esclusa (entrada) delante de los módulos
    caja(128, 64, 44, 32, 0x94b0c2);
    g.fillStyle(0xc2c3c7).fillRect(128, 64, 44, 4);
    for (let x = 136; x < 166; x += 4) g.fillStyle(x % 8 ? 0x1a1c2c : 0xffcd75).fillRect(x, 70, 4, 2);
    g.fillStyle(0x1a1c2c).fillRect(141, 73, 18, 25);
    g.fillStyle(0x0b1026).fillRect(142, 74, 16, 24);
    this.puerta = this.add.rectangle(142, 74, 16, 24, 0x566c86).setOrigin(0).setDepth(91);
    this.puertaLinea = this.add.rectangle(150, 74, 1, 24, 0x333c57).setOrigin(0.5, 0).setDepth(91);
    texto(this, 76, 54, this.t.letrero_base, { tam: 6, color: "#29366f" }).setDepth(91);
    // paneles solares casi verticales (el Sol queda muy bajo en el polo sur)
    [[304, 46], [326, 50]].forEach(([x, y]) => {
      g.fillStyle(0x566c86).fillRect(x + 7, y + 30, 3, 98 - y - 30);
      caja(x, y, 17, 32, 0x29366f, 0x94b0c2);
      g.lineStyle(1, 0x3b5dc9);
      for (let i = 1; i < 4; i++) g.lineBetween(x + 1, y + i * 8, x + 16, y + i * 8);
      g.lineBetween(x + 8, y, x + 8, y + 32);
    });
    // luces de señalización
    [[40, 13, 0xff5c5c], [272, 11, 0xff5c5c], [150, 66, 0x5cff8a], [20, 49, 0xffcd75], [140, 49, 0xffcd75], [292, 39, 0xffcd75]].forEach(([x, y, c], i) => {
      const l = this.add.rectangle(x, y, 2, 2, c).setDepth(92);
      this.tweens.add({ targets: l, alpha: 0.15, duration: 500 + i * 90, yoyo: true, repeat: -1 });
    });
  }

  dibujarVehiculos() {
    const p = PLATAFORMA, g = this.add.graphics().setDepth(-140);
    g.fillStyle(0x333c57).fillRect(p.x1 - 2, p.y1 - 2, p.x2 - p.x1 + 4, p.y2 - p.y1 + 4);
    g.fillStyle(0x566c86).fillRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1);
    g.lineStyle(1, 0x4a5a70);
    for (let x = p.x1 + 16; x < p.x2; x += 16) g.lineBetween(x, p.y1, x, p.y2);
    for (let y = p.y1 + 16; y < p.y2; y += 16) g.lineBetween(p.x1, y, p.x2, y);
    for (let x = p.x1; x < p.x2; x += 8) {        // franjas de precaución
      g.fillStyle((x / 8) % 2 ? 0x1a1c2c : 0xffcd75).fillRect(x, p.y1, 8, 2).fillRect(x, p.y2 - 2, 8, 2);
    }
    g.lineStyle(1, 0xe8ecf4).strokeRect(412, 132, 56, 26);     // lugar del rover
    texto(this, 440, 160, "R-1", { tam: 6, color: "#ffcd75" }).setDepth(-139);
    texto(this, 442, 106, this.t.letrero_vehiculos, { tam: 6, color: "#ffcd75" }).setDepth(-139);
    // balizas de las esquinas
    [[p.x1 + 3, p.y1 + 4], [p.x2 - 3, p.y1 + 4], [p.x1 + 3, p.y2], [p.x2 - 3, p.y2]].forEach(([x, y], i) => this.baliza(x, y, 0xffcd75, 600 + i * 70));
    // vehículos estacionados
    this.add.image(372, 120, "vehiculo_ciencia").setOrigin(0.5, 1).setDepth(120);
    this.robot = this.add.image(515, 126, "robot_carga").setOrigin(0.5, 1).setDepth(126);
    this.tweens.add({ targets: this.robot, y: 125, duration: 700, yoyo: true, repeat: -1 });
    [[372, 120, 34], [515, 126, 14]].forEach(([x, y, w]) => this.add.ellipse(x, y, w, 4, 0x1a1c2c, 0.4).setDepth(y - 1));
  }

  baliza(x, y, color, ms) {
    this.add.image(x, y, "baliza").setOrigin(0.5, 1).setDepth(y);
    const luz = this.add.rectangle(x, y - 14, 3, 2, color).setDepth(y + 0.1);
    const halo = this.add.circle(x, y - 14, 4, color, 0.25).setDepth(y + 0.1);
    this.tweens.add({ targets: [luz, halo], alpha: 0.2, duration: ms, yoyo: true, repeat: -1 });
    return { luz, halo };
  }

  dibujarRuta() {
    // huellas del camino entre balizas
    const g = this.add.graphics().setDepth(-160), pts = [[PLATAFORMA.x2, ROVER0.y], ...BALIZAS];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], n = Math.hypot(x2 - x1, y2 - y1) / 7;
      for (let j = 0; j < n; j++) {
        const x = x1 + (x2 - x1) * j / n, y = y1 + (y2 - y1) * j / n;
        g.fillStyle(0x9a9dac, 0.55).fillRect(x, y - 4, 4, 1).fillRect(x, y + 3, 4, 1);
      }
    }
    LETREROS.forEach(([x, y]) => this.add.image(x, y, "letrero").setOrigin(0.5, 1).setDepth(y));
    this.balizas = BALIZAS.map(([x, y], i) => {
      if (i < BALIZAS.length - 1) return { x, y, ...this.baliza(x, y, 0xffcd75, 450) };
      // baliza de exploración: más grande, con anillo que pulsa
      this.add.image(x, y, "baliza_grande").setOrigin(0.5, 1).setDepth(y);
      const luz = this.add.rectangle(x, y - 23, 5, 3, 0x7ee6ff).setDepth(y + 0.1);
      const anillo = this.add.ellipse(x, y, 30, 10).setStrokeStyle(1, 0x7ee6ff).setDepth(-130);
      this.tweens.add({ targets: luz, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: anillo, scale: 1.6, alpha: 0, duration: 1300, repeat: -1 });
      return { x, y, luz, final: true };
    });
    // flecha que indica a dónde ir (rover o siguiente baliza)
    this.guia = this.add.triangle(0, 0, 0, 0, 6, 0, 3, 4, 0xfff27a).setDepth(650);
  }

  crearAstronauta() {
    this.sombra = this.add.ellipse(ESCLUSA.x, ESCLUSA.y, 14, 4, 0x1a1c2c, 0.4).setAlpha(0);
    this.astro = this.add.image(ESCLUSA.x, ESCLUSA.y, "astro32_0").setOrigin(0.5, 1).setAlpha(0).setDepth(95);
  }

  crearRover() {
    const c = this.add.container(ROVER0.x, ROVER0.y);
    const sombra = this.add.ellipse(0, 0, 40, 6, 0x1a1c2c, 0.45);
    this.ruedas = [-13, 11].map(x => this.add.image(x, -6, "rover_rueda"));
    this.carro = this.add.container(0, 0);
    this.piloto = this.add.image(-3.5, -13, "rover_piloto").setOrigin(0.5, 1).setVisible(false);
    const antena = this.add.rectangle(-17.5, -20.5, 1, 1, 0xfff27a);
    this.tweens.add({ targets: antena, alpha: 0.1, duration: 300, yoyo: true, repeat: -1 });
    this.carro.add([this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), this.piloto, antena]);
    c.add([sombra, ...this.ruedas, this.carro]);
    this.rover = { c, x: ROVER0.x, y: ROVER0.y, ang: 0, v: 0, giro: 0 };
    // faros: aparte para que se vean dentro de las sombras (profundidad mayor)
    this.faros = this.add.container(ROVER0.x, ROVER0.y).setDepth(401).setAlpha(0);
    const luz = this.add.graphics();
    luz.fillStyle(0xfff27a, 0.18).fillTriangle(19, -11, 64, -24, 64, 2);
    luz.fillStyle(0xfff27a, 0.12).fillTriangle(19, -11, 46, -18, 46, -4);
    this.faros.add([luz, this.add.rectangle(19, -11, 2, 2, 0xfff27a)]);
  }

  // ================================================================ HUD (fijo en pantalla)
  crearHud() {
    const t = this.t.hud;
    this.hud = this.capa(0, 1000);
    const panel = (x, y, w, h) => this.add.rectangle(x, y, w, h, OSCURO, 0.82).setOrigin(0).setStrokeStyle(1, 0x7ee6ff);
    const txt = (x, y, s, color = "#a7b0d8") => texto(this, x, y, s, { tam: 6, origenX: 0, align: "left", color });

    // objetivo (a pie)
    this.objetivo = this.add.container(0, 0);
    const objTxt = txt(8, 6, this.t.objetivo, "#eef1ff");
    this.objetivo.add([panel(4, 4, objTxt.width + 8, 12), objTxt]);

    // panel de conducción
    this.panelRover = this.add.container(0, 0).setAlpha(0);
    this.barra = (x, y, color) => {
      const fondo = this.add.rectangle(x, y, 50, 4, 0x1a1c2c).setOrigin(0).setStrokeStyle(1, 0x333c57);
      const lleno = this.add.rectangle(x, y, 50, 4, color).setOrigin(0);
      this.panelRover.add([fondo, lleno]);
      return lleno;
    };
    this.panelRover.add([panel(4, 4, 100, 30), txt(8, 6, t.velocidad), txt(8, 19, t.energia), panel(214, 4, 102, 40)]);
    this.barraVel = this.barra(8, 14, 0x29adff);
    this.barraEne = this.barra(8, 27, 0x5cff8a);
    this.txtVel = txt(62, 11, "0 km/h", "#eef1ff");
    this.txtEne = txt(62, 24, "100%", "#eef1ff");
    this.panelRover.add([this.txtVel, this.txtEne]);
    this.panelRover.add(this.add.circle(228, 18, 9, 0x1a1c2c).setStrokeStyle(1, 0x333c57));
    this.flecha = this.add.image(228, 18, "flecha_nav");
    this.txtBaliza = txt(240, 7, "");
    this.txtFalta = txt(240, 16, "", "#eef1ff");
    this.panelRover.add([this.flecha, this.txtBaliza, this.txtFalta, txt(218, 31, t.senal, "#ffcd75")]);
    // señal de Chispa: 5 barras + luz que parpadea con su patrón (corto, corto, largo)
    this.barrasSenal = [0, 1, 2, 3, 4].map(i => this.add.rectangle(282 + i * 5, 39, 3, 2 + i * 1.5, 0x333c57).setOrigin(0, 1));
    this.ledSenal = this.add.circle(310, 35, 2, 0xffcd75);
    this.panelRover.add([...this.barrasSenal, this.ledSenal]);

    // línea de STELLA (aparece solo cuando habla)
    this.comm = this.add.container(0, 0).setAlpha(0);
    this.commTxt = texto(this, 36, 151, "", { tam: 6, ancho: 196, origenX: 0, align: "left" });
    this.stella = new Stella(this, 19, 175);
    this.comm.add([panel(4, 147, 234, 30), this.stella.c, this.commTxt]);

    // aviso de interacción (en el mundo, sobre el objeto)
    this.aviso = this.add.container(0, 0).setDepth(700).setVisible(false);
    this.avisoFondo = this.add.rectangle(0, 0, 10, 11, OSCURO, 0.88).setStrokeStyle(1, 0xfff27a);
    this.avisoTxt = texto(this, 0, 0, "", { tam: 6, origenY: 0.5, color: "#fff27a" });
    this.aviso.add([this.avisoFondo, this.avisoTxt]);

    // cartel final
    this.cartel = this.add.container(0, 0).setVisible(false);
    // el aviso de "continuar" va dentro del cuadro (cuadro de y 55 a 93)
    this.cartelSub = texto(this, 160, 79, this.t.continuar, { tam: 6, color: "#a7b0d8" }).setVisible(false);
    this.cartel.add([this.add.rectangle(160, 74, 236, 38, OSCURO, 0.9).setStrokeStyle(2, 0xffcd75),
      texto(this, 160, 61, this.t.punto, { tam: 9, color: "#ffd45c" }), this.cartelSub]);

    this.hud.add([this.objetivo, this.panelRover, this.comm, this.cartel]);
  }

  mostrarAviso(s, x, y) {
    if (this.avisoTxt.text !== s) {
      this.avisoTxt.setText(s);
      this.avisoFondo.setSize(this.avisoTxt.width + 8, 11);
    }
    this.aviso.setPosition(Phaser.Math.Clamp(x, this.avisoTxt.width / 2 + 4, MUNDO - this.avisoTxt.width / 2 - 4), y).setVisible(true);
  }

  // ================================================================ STELLA
  decir(s, anim = "hablando", urgente = false) {
    if (urgente) this.colaS = [];
    if (!urgente && this.time.now < this.hablaHasta) return this.colaS.push([s, anim]);
    this.linea(s, anim);
  }

  linea(s, anim) {
    const dur = Math.max(2800, s.length * 62);
    if (this.comm.alpha < 1) {
      this.tweens.add({ targets: this.comm, alpha: 1, duration: 200 });
      if (!this.stellaVisible) { this.stellaVisible = true; this.stella.aparecer(); }
    }
    this.commTxt.setText(s);
    this.stella.reaccionar(anim, anim === "hablando" ? dur : undefined);
    this.hablaHasta = this.time.now + dur;
    this.tono(990, 0, 0.05, "sine", 0.03);
    this.finLinea?.remove();
    this.finLinea = this.time.delayedCall(dur, () => this.saltarLinea());
  }

  saltarLinea() {
    this.finLinea?.remove();
    this.hablaHasta = 0;
    const sig = this.colaS.shift();
    if (sig) return this.linea(...sig);
    if (this.modo !== "final") this.tweens.add({ targets: this.comm, alpha: 0, duration: 300 });
  }

  // Aviso con enfriamiento (no repetir a cada cuadro)
  avisar(clave, anim, ms = 8000) {
    if ((this.espera[clave] || 0) > this.time.now) return;
    this.espera[clave] = this.time.now + ms;
    this.registrarAviso(clave);
    this.decir(this.t[clave], anim, true);
  }

  // ================================================================ secuencias
  salirEsclusa() {
    this.sonar("puerta");
    this.tweens.add({ targets: [this.puerta, this.puertaLinea], scaleY: 0, duration: 500, delay: 400 });
    this.tweens.add({
      targets: [this.astro, this.sombra], alpha: 1, y: 112, duration: 700, delay: 900,
      onUpdate: () => { this.astro.setDepth(this.astro.y); this.sombra.y = this.astro.y; },
      onComplete: () => {
        this.tweens.add({ targets: [this.puerta, this.puertaLinea], scaleY: 1, duration: 400 });
        this.modo = "pie";
        this.decir(this.t.bienvenida, "saludo");
      }
    });
  }

  abordar() {
    this.modo = "abordando";
    this.destino = null;
    this.aviso.setVisible(false);
    const r = this.rover, lado = this.astro.x < r.x ? -1 : 1;
    this.sonar("bien");
    this.tweens.add({
      targets: this.astro, x: r.x + lado * 4, y: r.y + 3, duration: 300,
      onUpdate: () => this.astro.setDepth(r.y + 5),
      onComplete: () => this.tweens.add({   // salto al asiento
        targets: this.astro, x: r.x - 3, y: r.y - 10, duration: 320, ease: "Quad.easeOut",
        onComplete: () => {
          this.astro.setVisible(false);
          this.sombra.setVisible(false);
          this.piloto.setVisible(true);
          this.tweens.add({ targets: this.carro, y: 2, duration: 90, yoyo: true });   // la suspensión se hunde
          this.time.delayedCall(250, () => this.entrarRover());
        }
      })
    });
  }

  entrarRover() {
    this.modo = "rover";
    this.reg.abordajes++;
    this.cameras.main.startFollow(this.rover.c, true, 0.1, 0.1);
    this.tweens.add({ targets: this.panelRover, alpha: 1, duration: 300 });
    this.tweens.add({ targets: this.objetivo, alpha: 0, duration: 300 });
    this.motor(true);
    this.sonar("arranque");
    if (!this.dijo.activado) {         // primer abordaje: tutorial holográfico
      this.dijo.activado = true;
      this.mostrarTutorial();
      this.decir(this.t.tutorial.stella, "saludo", true);
      this.decir(this.t.activado, "exito");
    }
  }

  intentarBajar() {
    const r = this.rover;
    if (Math.abs(r.v) > 1) return this.avisar("bajar_detente", "alerta", 2500);
    if (!dentro(r.x, r.y, PLATAFORMA)) return this.avisar("bajar_zona", "alerta", 2500);
    const lugar = [[0, 12], [0, -10], [-26, 0], [26, 0]].map(([dx, dy]) => [r.x + dx, r.y + dy])
      .find(([x, y]) => dentro(x, y, PIE) && !this.choca(x, y, 4, false));
    if (!lugar) return this.avisar("bajar_zona", "alerta", 2500);
    this.modo = "bajando";
    this.puedeAuto = false;            // no volver a subir solo hasta alejarse
    this.punteroRover = false;
    this.ocultarTutorial();
    r.v = 0;
    this.motor(false);
    this.reg.bajadas++;
    this.piloto.setVisible(false);
    this.astro.setPosition(r.x - 3, r.y - 10).setVisible(true).setDepth(r.y + 5);
    this.sombra.setVisible(true);
    this.tweens.add({
      targets: this.astro, x: lugar[0], y: lugar[1], duration: 360, ease: "Quad.easeIn",
      onComplete: () => {
        this.modo = "pie";
        this.cameras.main.startFollow(this.astro, true, 0.15, 0.15);
        this.tweens.add({ targets: this.panelRover, alpha: 0, duration: 300 });
        this.tweens.add({ targets: this.objetivo, alpha: 1, duration: 300 });
      }
    });
  }

  llegar() {
    this.modo = "final";
    this.aviso.setVisible(false);
    this.guia.setVisible(false);
    this.cerrarTraccion();
    this.ocultarTutorial();
    this.inclino.setVisible(false);
    this.reg.energiaUsada = Math.round(100 - this.energia);
    Object.assign(this.reg, { completada: true, balizas: BALIZAS.length, segundos: Math.round((this.time.now - this.inicio) / 1000) });
    estado.bitacora.push(llenar(this.t.bitacora, { choques: this.reg.choques }));
    this.sonar("bien");
    this.time.delayedCall(900, () => {
      this.decir(this.t.llegada, "exito", true);
      this.stella.estado("exito");
      this.finLinea?.remove();        // la línea final se queda en pantalla
      this.cartel.setVisible(true).setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: this.cartel, alpha: 1, duration: 300 });
      this.tweens.add({ targets: this.cartel, scale: 1, duration: 300, ease: "Back.easeOut" });
    });
    this.time.delayedCall(3600, () => { this.listo = true; this.cartelSub.setVisible(true); });
  }

  continuar() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.motor(false);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
  }

  // ================================================================ interacción (E)
  cercanos() {
    const a = this.astro, r = this.rover;
    if (Phaser.Math.Distance.Between(a.x, a.y, r.x, r.y) < CERCA + 8) return { rover: true, x: r.x, y: r.y - 30 };
    const info = this.t.info;
    return [{ x: ESCLUSA.x, y: 106, s: info.esclusa }, { x: 322, y: 102, s: info.paneles },
      { x: 372, y: 124, s: info.ciencia }, { x: 515, y: 130, s: info.carga }]
      .find(o => Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y) < CERCA);
  }

  usarE() {
    if (this.modo === "final") return this.listo && this.continuar();
    if (this.modo === "rover") return this.intentarBajar();
    if (this.modo !== "pie") return;
    const o = this.cercanos();
    if (o?.rover) this.abordar();
    else if (o) this.decir(o.s, "explicando", true);
  }

  // ================================================================ colisiones
  choca(x, y, r, conRover) {
    if (conRover) {
      const v = this.rover;
      if (x > v.x - 20 - r && x < v.x + 20 + r && y > v.y - 6 && y < v.y + 4) return true;
    }
    return this.obst.find(o =>
      o.t === "circ" ? Math.hypot(x - o.x, y - o.y) < o.r + r
        : o.t === "elipse" ? ((x - o.x) / (o.rx + r)) ** 2 + ((y - o.y) / (o.ry + r * 0.6)) ** 2 < 1
          : x > o.x1 - r && x < o.x2 + r && y > o.y1 - r * 0.6 && y < o.y2 + r * 0.6);
  }

  zona(x, y) {
    return {
      rugoso: RUGOSO.some(z => dentro(x, y, z)),
      suelto: SUELTO.some(z => dentro(x, y, z)),
      blando: BLANDO.some(z => dentro(x, y, z)),
      grados: PENDIENTES.find(z => x >= z.x1 && x <= z.x2)?.g || 0,
      pend: PENDIENTES.find(z => x >= z.x1 && x <= z.x2)?.p || 0,
      sombra: SOMBRAS.some(s => enElipse(x, y, s))
    };
  }

  // ================================================================ ciclo
  update(tiempo, delta) {
    const dt = Math.min(delta, 50) / 1000;
    let camina = this.modo === "abordando";
    if (this.modo === "pie") camina = this.moverPie(dt);
    if (this.modo === "rover" || this.modo === "final" || this.modo === "bajando") this.conducir(dt, tiempo);

    if (this.astro.visible) {
      this.tiempoPaso += delta;
      if (camina && this.tiempoPaso > 160) { this.tiempoPaso = 0; this.paso = 1 - this.paso; }
      if (!camina) this.paso = 0;
      this.astro.setTexture(`astro32_${this.paso}`);
      if (this.modo === "pie") this.astro.setDepth(this.astro.y);
      this.sombra.setPosition(this.astro.x, this.astro.y).setDepth(this.astro.y - 0.5);
    }
    this.actualizarGuia();
  }

  moverPie(dt) {
    const k = this.k, a = this.astro;
    let dx = 0, dy = 0;
    if (k.left.isDown || k.A.isDown) dx = -1; else if (k.right.isDown || k.D.isDown) dx = 1;
    if (k.up.isDown || k.W.isDown) dy = -1; else if (k.down.isDown || k.S.isDown) dy = 1;
    if (dx || dy) this.destino = null;
    else if (this.destino) {
      const vx = this.destino.x - a.x, vy = this.destino.y - a.y, d = Math.hypot(vx, vy);
      if (d < 2) this.destino = null; else { dx = vx / d; dy = vy / d; }
    }
    let movio = false;
    if (dx || dy) {
      const n = Math.hypot(dx, dy), paso = VEL_PIE * dt / n;
      const nx = Phaser.Math.Clamp(a.x + dx * paso, PIE.x1, PIE.x2), ny = Phaser.Math.Clamp(a.y + dy * paso, PIE.y1, PIE.y2);
      if (nx !== a.x && !this.choca(nx, a.y, 4, true)) { a.x = nx; movio = true; }
      if (ny !== a.y && !this.choca(a.x, ny, 4, true)) { a.y = ny; movio = true; }
      if (!movio) this.destino = null;                  // bloqueado: deja de caminar
      if (dx) a.setFlipX(dx < 0);
      if (dx > 0 && a.x >= PIE.x2 - 1) this.avisar("borde", "explicando");
    }
    // subir al rover: basta con caminar hasta él (o hacerle clic). Después de
    // bajar hay que alejarse un poco para que no se vuelva a subir solo.
    const dRover = Phaser.Math.Distance.Between(a.x, a.y, this.rover.x, this.rover.y);
    if (dRover > CERCA + 20) this.puedeAuto = true;
    const o = this.cercanos();
    if (o?.rover && (this.irRover || (this.puedeAuto && movio))) {
      this.irRover = false;
      this.abordar();
      return false;
    }
    // aviso "Presiona E" (para revisar cosas de la base)
    if (o) this.mostrarAviso(o.rover ? this.t.abordar : this.t.revisar, o.x, o.rover ? o.y : o.y - 34);
    else this.aviso.setVisible(false);
    return movio;
  }

  conducir(dt, tiempo) {
    const k = this.k, R = this.rover, manda = this.modo === "rover";
    const z = this.zona(R.x, R.y);
    const vmax = z.blando ? SIM.vmaxBlando : z.rugoso ? AUTO.vmaxRugoso : AUTO.vmax;
    // Controles directos (para 7–12 años): la flecha o el clic dicen HACIA DÓNDE ir
    // en la pantalla. El rover gira solo hacia ahí (también detenido) y avanza
    // cuando ya apunta en esa dirección.
    const patina = this.emerg?.tipo === "traccion";      // pérdida de tracción: las ruedas giran, el rover casi no avanza
    const { dx, dy } = manda ? this.direccionDeseada() : { dx: 0, dy: 0 };
    const hayRumbo = dx !== 0 || dy !== 0;
    const dif = hayRumbo ? Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - R.ang) : 0;
    // en la emergencia de tracción, la dirección contraria = retroceder despacio
    const atras = hayRumbo && patina && Math.abs(dif) > 2.3;
    const acel = hayRumbo && !atras && Math.abs(dif) < 0.9;
    if (hayRumbo && !atras) R.ang += Phaser.Math.Clamp(dif, -AUTO.giroDirecto * dt, AUTO.giroDirecto * dt);
    const hacia0 = (v, d) => v > 0 ? Math.max(0, v - d) : Math.min(0, v + d);
    if (acel && this.tutoAbierto) this.ocultarTutorial(); // empezar a conducir oculta el tutorial

    if (z.rugoso && Math.abs(R.v) > AUTO.vmaxRugoso + 6) this.avisar("rugoso", "alerta");
    if (acel && patina) R.v = hacia0(R.v, AUTO.freno * 0.4 * dt);
    else if (acel) R.v = R.v < 0 ? hacia0(R.v, AUTO.freno * dt) : Math.min(vmax, R.v + AUTO.acel * dt);
    else if (atras) R.v = R.v > 0 ? hacia0(R.v, AUTO.freno * dt) : Math.max(-AUTO.reversa, R.v - AUTO.acel * 0.6 * dt);
    else R.v = hacia0(R.v, (manda ? AUTO.roce : AUTO.freno) * dt);
    if (R.v > vmax) R.v = Math.max(vmax, R.v - AUTO.freno * 0.6 * dt);   // la zona irregular frena

    const subida = 1 - 0.25 * z.pend * Math.cos(R.ang);                   // subir cuesta, bajar ayuda
    const avance = R.v * subida * dt * (patina && R.v > 0 ? 0.15 : 1);
    const nx = Phaser.Math.Clamp(R.x + Math.cos(R.ang) * avance, SUELO.x1, SUELO.x2);
    const ny = Phaser.Math.Clamp(R.y + Math.sin(R.ang) * avance * 0.8, SUELO.y1, SUELO.y2);
    const golpe = this.choca(nx, ny, AUTO.radio, false);
    if (golpe) this.choque(golpe);
    else { R.x = nx; R.y = ny; }
    if (acel) { this.energia = Math.max(15, this.energia - dt * (patina ? 2 : 1.1)); this.reg.aceleradorSeg += dt; }

    // dibujo: ruedas que giran, suspensión, inclinación y faros
    const der = Math.cos(R.ang) >= 0, rapidez = Math.abs(R.v) / AUTO.vmax;
    const giroRueda = avance / 6 + (patina && acel ? 0.7 : 0);
    this.ruedas.forEach(w => { w.rotation += giroRueda; });
    const amp = (z.rugoso ? 1.6 : 0.6) * Math.min(1, rapidez * 1.5);
    this.carro.y = Math.round(Math.sin(tiempo / (z.rugoso ? 45 : 85)) * amp);
    const inclina = (der ? 1 : -1) * Math.sin(R.ang) * 0.3 - z.pend * 0.12;
    R.c.rotation += (inclina - R.c.rotation) * Math.min(1, dt * 8);
    R.c.setPosition(R.x, R.y).setScale(der ? 1 : -1, 1).setDepth(R.y);
    this.faros.setPosition(R.x, R.y + this.carro.y).setScale(der ? 1 : -1, 1).setRotation(R.c.rotation);
    this.faros.alpha += ((z.sombra && this.modo !== "bajando" ? 1 : 0) - this.faros.alpha) * Math.min(1, dt * 6);
    if (Math.abs(R.v) > 20 && tiempo - (this.polvoT || 0) > 110) { this.polvoT = tiempo; this.polvo(R.x - Math.cos(R.ang) * 16, R.y); }

    if (this.modo !== "bajando") this.actualizarHudRover(z);
    if (manda) { this.revisarRuta(z); this.revisarPeligros(z, acel, dt); }
    if (this.osc) {
      const c = this.sound.context.currentTime;
      this.osc.o.frequency.setTargetAtTime(38 + Math.abs(R.v) * 1.1, c, 0.1);
      this.osc.g.gain.setTargetAtTime(0.006 + rapidez * 0.012, c, 0.1);
    }
  }

  // Hacia dónde quiere ir el niño: flechas/WASD (8 direcciones) o el clic sostenido
  direccionDeseada() {
    const k = this.k;
    let dx = ((k.right.isDown || k.D.isDown) ? 1 : 0) - ((k.left.isDown || k.A.isDown) ? 1 : 0);
    let dy = ((k.down.isDown || k.S.isDown) ? 1 : 0) - ((k.up.isDown || k.W.isDown) ? 1 : 0);
    if (!dx && !dy && this.punteroRover) {
      const p = this.input.activePointer;
      if (!p.isDown) this.punteroRover = false;
      else {
        const w = p.positionToCamera(this.cameras.main), R = this.rover;
        if (Math.hypot(w.x - R.x, w.y - R.y) > 12) { dx = w.x - R.x; dy = w.y - R.y; }
      }
    }
    return { dx, dy };
  }

  choque(o) {
    if (o !== true) this.golpeados.add(o);
    const R = this.rover, fuerte = Math.abs(R.v) > 14;
    R.v = -R.v * 0.3;
    if (!fuerte || this.time.now < (this.choqueT || 0)) return;
    this.choqueT = this.time.now + 600;
    this.reg.choques++;
    this.cameras.main.shake(120, 0.004);
    this.sonar("choque");
    this.avisar("choque", "alerta", 6000);
  }

  polvo(x, y) {
    const p = this.add.circle(x + Phaser.Math.Between(-2, 2), y - 2, Phaser.Math.Between(1, 2), 0xb4b6c4, 0.6).setDepth(y - 1);
    this.tweens.add({ targets: p, y: y - 7, alpha: 0, scale: 2, duration: 600, onComplete: () => p.destroy() });
  }

  revisarRuta(z) {
    const R = this.rover;
    // balizas: se marcan al pasar cerca (y todas las anteriores)
    for (let i = this.siguiente; i < this.balizas.length; i++) {
      const b = this.balizas[i];
      if (Phaser.Math.Distance.Between(R.x, R.y, b.x, b.y) > 28) continue;
      if (b.final) return this.llegar();
      for (let j = this.siguiente; j <= i; j++) { this.balizas[j].luz.setFillStyle(0x5cff8a); this.balizas[j].halo.setFillStyle(0x5cff8a, 0.25); }
      this.siguiente = i + 1;
      this.reg.balizas = this.siguiente;
      this.tono(1320, 0, 0.08, "square", 0.03);
      if (this.trasEmergencia) { this.trasEmergencia = false; this.decir(this.t.ruta_recuperada, "exito"); }
      break;
    }
    if (R.x > PLATAFORMA.x2 + 16 && !this.dijo.balizas) { this.dijo.balizas = true; this.decir(this.t.balizas); }
    if (z.sombra && !this.dijo.sombra) { this.dijo.sombra = true; this.decir(this.t.sombra, "explicando", true); }
    if (R.x > 1500 && !this.dijo.cerca) { this.dijo.cerca = true; this.decir(this.t.cerca, "pensando"); }
    if (Math.abs(R.v) > 12 && CRATERES.some(c => !c[4] && enElipse(R.x, R.y, [c[0], c[1], c[2] + 22, c[3] + 14]))) this.avisar("crater", "alerta");
  }

  restante() {
    const R = this.rover, b = this.balizas;
    let d = Phaser.Math.Distance.Between(R.x, R.y, b[this.siguiente].x, b[this.siguiente].y);
    for (let i = this.siguiente; i < b.length - 1; i++) d += Phaser.Math.Distance.Between(b[i].x, b[i].y, b[i + 1].x, b[i + 1].y);
    return d * METROS;
  }

  actualizarHudRover() {
    const R = this.rover, t = this.t.hud, sig = this.balizas[Math.min(this.siguiente, this.balizas.length - 1)];
    const kmh = Math.round(Math.abs(R.v) * KMH);
    this.barraVel.width = 50 * Math.abs(R.v) / AUTO.vmax;
    this.barraEne.width = 50 * this.energia / 100;
    this.barraEne.setFillStyle(this.energia > 40 ? 0x5cff8a : 0xffcd75);
    this.txtVel.setText((R.v < -1 ? "R " : "") + kmh + " km/h");
    this.txtEne.setText(Math.round(this.energia) + "%");
    this.flecha.rotation = Phaser.Math.Angle.Between(R.x, R.y, sig.x, sig.y);
    const m = this.restante();
    this.txtBaliza.setText(llenar(t.baliza, { n: Math.min(this.siguiente + 1, this.balizas.length), total: this.balizas.length }));
    this.txtFalta.setText(llenar(t.faltan, { d: m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m / 10) * 10 + " m" }));
    // señal de Chispa: más barras y parpadeo más rápido al acercarse
    const fin = this.balizas[this.balizas.length - 1];
    const cerca = 1 - Phaser.Math.Clamp(Phaser.Math.Distance.Between(R.x, R.y, fin.x, fin.y) / (fin.x - ROVER0.x), 0, 1);
    const n = Phaser.Math.Clamp(Math.ceil(cerca * 5), 1, 5);
    this.barrasSenal.forEach((b, i) => b.setFillStyle(i < n ? 0xffcd75 : 0x333c57));
    this.patron += this.game.loop.delta / (170 - cerca * 100);
    this.ledSenal.setAlpha([1, 0, 1, 0, 1, 1, 1, 0, 0, 0][Math.floor(this.patron) % 10] ? 1 : 0.15);
  }

  actualizarGuia() {
    const objetivo = this.modo === "pie" ? { x: this.rover.x, y: this.rover.y - 30 }
      : this.modo === "rover" ? this.balizas[Math.min(this.siguiente, this.balizas.length - 1)] : null;
    this.guia.setVisible(!!objetivo && !(this.modo === "pie" && this.aviso.visible));
    if (objetivo) this.guia.setPosition(objetivo.x - 3, objetivo.y - (this.modo === "pie" ? 6 : (objetivo.final ? 34 : 24)) + Math.round(Math.sin(this.time.now / 150) * 1.5));
  }

  // ================================================================ sonido (Web Audio, sin archivos)
  tono(...a) { return tono(this, ...a); }      // src/sonidos.js
  sonar(tipo) { sonar(this, tipo); }

  // Zumbido del motor: sube con la velocidad
  motor(encender) {
    const ctx = this.sound.context;
    if (!ctx) return;
    if (encender && !this.osc) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = 38;
      g.gain.value = 0.006;
      o.connect(g).connect(ctx.destination);
      o.start();
      this.osc = { o, g };
    } else if (!encender && this.osc) {
      this.osc.o.stop();
      this.osc.o.disconnect();
      this.osc = null;
    }
  }
}

// Tutorial holográfico, análisis del terreno y emergencias (src/escenas/sistemasRover.js)
Object.assign(Exterior.prototype, SistemasRover);
