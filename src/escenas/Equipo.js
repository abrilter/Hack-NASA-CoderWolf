// Misión 3: traje y nave. Dueño: Rol 2 (pantalla) y Rol 4 (números).
// Una sola sala, el hangar, vista 3/4. El astronauta camina (clic en el piso o
// flechas). Al acercarse a un traje o a una nave aparece una burbuja con su
// ventaja (verde) y su costo (rojo); clic o Enter lo elige. Se puede cambiar.
// Antes de decidir puede probar: la báscula (con el blindado camina más lento)
// y el arco de radiación (ve cuántos puntitos atraviesan el traje). La pantalla
// del polo sur da una pista. Con traje y nave elegidos, la nave baja una rampa
// y el niño sube para despegar → Misión 4.
// Figuras en pixel art hechas con mapas de letras (src/pixelart.js).
// TODO(Rol 3): reemplazar por PNG cuando estén listos.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";
import { crearTexturasEquipo } from "../pixelart.js";
import { horasDeLlegada } from "../modelo/simulacion.js";

// TODO(Rol 4): ajustar valores para que ninguna opción sea mejor en todo
// peso: kg del traje (solo se muestra en la báscula y cambia la velocidad al caminar)
const TRAJES = [
  { id: "blindado", proteccion: 0.3, gastoO2: 2.5, peso: 35 },
  { id: "ligero",   proteccion: 0.1, gastoO2: 1.6, peso: 12 }
];
const NAVES = [
  { id: "grande",  agilidad: 0.8, combustible: 140, oxigenoExtra: 20, w: 46 },
  { id: "pequena", agilidad: 1.3, combustible: 90,  oxigenoExtra: 0,  w: 32 }
];
const O2_TANQUE = 20;        // si la mochila trae el tanque de oxígeno
const PESO_NINO = 30;        // kg del niño sin traje (para la báscula)
const LENTITUD_BLINDADO = 0.6;
// Probabilidad de que el traje frene un puntito de radiación en el arco
const BLOQUEO = { base: 0, ligero: 0.35, blindado: 0.85 };

const VERDE = 0x5cff8a, AMARILLO = 0xffcd75;
const PARED = 56;            // donde termina la pared del fondo y empieza el piso
const LIMITES = { x1: 12, x2: ANCHO - 12, y1: 92, y2: 172 };   // pies del astronauta
const VELOCIDAD = 70;        // px por segundo
const CERCA = 24;            // radio de la zona de proximidad
const COMPUERTA = { x: 306, y: 146 };

// Dónde va cada cosa nueva (coordenadas de 320×180)
const LUGAR = {
  entrada:  { x: 140, y: 150 },
  bascula:  { x: 96, y: 156 },
  arco:     { x: 168, y: 156 },
  pantalla: { x: 134, y: 96 },      // en el piso, frente al radar del polo sur
  reloj:    { x: 248, y: 33, w: 62, h: 16 }
};
// Luces de posición y toberas de cada nave (coordenadas de la sala)
const NAVE_EXTRA = {
  grande:  { luces: [[189, 72], [217, 72], [203, 46]], tobera: [204, 106] },
  pequena: { luces: [[258, 103], [286, 103], [271, 62]], tobera: [272, 107] }
};
const TECNICOS = [
  { id: "tecnico",  ruta: [[22, 128], [92, 128]] },
  { id: "tecnico2", ruta: [[236, 154], [288, 154]] }
];

export class Equipo extends Phaser.Scene {
  constructor() { super("Equipo"); }

  create() {
    this.t = estado.textos.equipo;
    this.trajeElegido = null;
    this.naveElegida = null;
    this.activa = null;          // zona en la que está parado el astronauta
    this.saliendo = false;

    crearTexturasEquipo(this);
    this.dibujarSala();
    this.decorarPiso();
    this.crearObjetos();
    this.crearVestidor();
    this.crearHangar();
    this.crearCompuerta();
    this.crearEstaciones();
    this.crearFlechas();
    this.crearPersonajes();
    this.crearTecnicos();
    this.crearBurbuja();
    this.crearAmbiente();

    // Entrada: camina desde abajo hasta el centro
    this.controlActivo = false;
    this.tweens.add({
      targets: this.astro, y: LUGAR.entrada.y, duration: 900,
      onComplete: () => { this.controlActivo = true; this.decir(this.t.bienvenida, 5000); }
    });

    // Controles
    this.destino = null;
    this.alLlegar = null;
    this.input.on("pointerdown", p => {
      if (this.controlActivo && p.worldY > PARED) this.caminarA(p.worldX, p.worldY, null);
    });
    this.teclas = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on("keydown-ENTER", () => this.usarZona());
    this.input.keyboard.on("keydown-SPACE", () => this.usarZona());
  }

  // ---------------------------------------------------------------- sala
  // Fondo estilo "centro de control": pared de paneles azules, monitores,
  // consola, ventanal redondeado con la Luna y la Tierra, piso de baldosas.
  dibujarSala() {
    const g = this.add.graphics();
    const r = (color, x, y, w, h) => g.fillStyle(color).fillRect(x, y, w, h);
    const marco = (x, y, w, h, color) => { r(color, x, y, w, 1); r(color, x, y + h - 1, w, 1); r(color, x, y, 1, h); r(color, x + w - 1, y, 1, h); };

    // pared: paneles cuadrados de 8×8 con luz arriba-izquierda y sombra abajo-derecha
    r(0x2a3a7a, 0, 0, ANCHO, PARED);
    for (let y = 4; y < PARED - 6; y += 8) for (let x = 0; x < ANCHO; x += 8) {
      r(0x3a4f99, x, y, 8, 1); r(0x3a4f99, x, y, 1, 8);
      r(0x22306a, x, y + 7, 8, 1); r(0x22306a, x + 7, y, 1, 8);
    }
    // franja del techo con luces amarillas
    r(0x1a1c2c, 0, 0, ANCHO, 4);
    for (let x = 36; x < ANCHO; x += 64) { r(0xffcd75, x, 0, 10, 2); r(0xfff27a, x + 2, 0, 6, 1); }
    // zócalo con franja de peligro amarillo y negro
    r(0x1a1c2c, 0, PARED - 6, ANCHO, 6);
    for (let x = 2; x < ANCHO; x += 8) r(0xffcd75, x, PARED - 4, 4, 3);

    // letrero "Centro de Control" (arriba a la izquierda) con la Luna
    r(0x1a1c2c, 6, 1, 78, 22); r(0x1d2650, 7, 2, 76, 20); marco(7, 2, 76, 20, 0x4fd1ff); marco(8, 3, 74, 18, 0x29366f);
    g.fillStyle(0x94b0c2).fillCircle(18, 12, 6);
    r(0x566c86, 15, 9, 3, 2); r(0x566c86, 19, 13, 2, 2); r(0x566c86, 16, 15, 2, 1);
    // cartel del título de la misión (centro arriba)
    r(0x1a1c2c, 88, 1, 146, 15); r(0x1d2650, 89, 2, 144, 13); marco(89, 2, 144, 13, 0xffcd75);
    r(0xffa300, 95, 5, 4, 7); r(0xffcd75, 96, 4, 2, 1); r(0x29adff, 96, 6, 2, 2);   // cohete
    // ventanal redondeado (arriba a la derecha) con la Tierra y la superficie de la Luna
    const V = { x: 245, y: 4, w: 68, h: 22 };
    r(0x1a1c2c, V.x - 4, V.y - 2, V.w + 8, V.h + 4); r(0x1a1c2c, V.x - 2, V.y - 4, V.w + 4, V.h + 8);
    r(0x566c86, V.x - 3, V.y - 1, V.w + 6, V.h + 2); r(0x566c86, V.x - 1, V.y - 3, V.w + 2, V.h + 6);
    r(0x94b0c2, V.x - 1, V.y - 1, V.w + 2, V.h + 2);
    r(0x0b1026, V.x, V.y, V.w, V.h);
    [[6, 4], [18, 8], [30, 3], [44, 6], [58, 3], [12, 11], [50, 10]].forEach(([x, y]) => r(0xf4f4f4, V.x + x, V.y + y, 1, 1));
    g.fillStyle(0x29adff).fillCircle(V.x + 36, V.y + 7, 4);                      // la Tierra
    r(0x5cff8a, V.x + 34, V.y + 5, 2, 2); r(0x5cff8a, V.x + 37, V.y + 8, 2, 1);
    for (let x = 0; x < V.w; x++) {
      const alto = 7 + Math.round(Math.sin(x / 8) * 2 + Math.sin(x / 3.5) * 0.7);
      r(0x94b0c2, V.x + x, V.y + V.h - alto, 1, alto); r(0xc2c3c7, V.x + x, V.y + V.h - alto, 1, 1);
    }
    [[8, 2], [26, 3], [48, 2]].forEach(([x, w]) => r(0x566c86, V.x + x, V.y + V.h - 3, w * 2, 1));

    // tres monitores: radar, vista de la Tierra sobre la Luna y gráfica
    const monitor = (x, y, w, h) => { r(0x1a1c2c, x, y, w, h); r(0x0b1026, x + 2, y + 2, w - 4, h - 4); marco(x + 1, y + 1, w - 2, h - 2, 0x333c57); };
    monitor(120, 18, 28, 22);                                       // radar
    g.lineStyle(1, 0x29adff, 0.9).strokeCircle(134, 28, 7).strokeCircle(134, 28, 3);
    r(0x29adff, 126, 28, 17, 1); r(0x29adff, 134, 20, 1, 17); r(0xff5c5c, 137, 25, 2, 2);
    r(0x5cff8a, 124, 35, 6, 1); r(0x5cff8a, 124, 37, 4, 1);
    monitor(151, 16, 48, 26);                                       // Tierra sobre la Luna
    [[156, 20], [163, 26], [170, 19], [192, 22], [158, 30]].forEach(([x, y]) => r(0xf4f4f4, x, y, 1, 1));
    for (let x = 153; x < 197; x++) {
      const alto = 6 + Math.round(Math.sin(x / 6) * 1.5);
      r(0x94b0c2, x, 40 - alto, 1, alto); r(0xc2c3c7, x, 40 - alto, 1, 1);
    }
    g.fillStyle(0x29adff).fillCircle(183, 26, 6);
    r(0x5cff8a, 180, 23, 3, 3); r(0x5cff8a, 185, 27, 3, 2); r(0xf4f4f4, 181, 21, 2, 1);
    monitor(202, 18, 28, 22);                                       // gráfica de barras
    // consolas con botones debajo de cada monitor
    [[122, 24], [149, 52], [204, 24]].forEach(([x, w]) => {
      r(0x1a1c2c, x, 41, w, 9); r(0x566c86, x + 1, 42, w - 2, 2); r(0x333c57, x + 1, 44, w - 2, 5);
      const colores = [0xff5c5c, 0x5cff8a, 0x29adff, 0xffcd75];
      for (let i = 0; x + 3 + i * 5 < x + w - 3; i++) r(colores[i % 4], x + 3 + i * 5, 45, 3, 2);
    });

    // reloj con la cuenta regresiva de la tormenta (bajo el ventanal)
    const R = LUGAR.reloj;
    r(0x1a1c2c, R.x, R.y, R.w, R.h); r(0x0b1026, R.x + 1, R.y + 1, R.w - 2, R.h - 2); marco(R.x + 1, R.y + 1, R.w - 2, R.h - 2, 0xb13e53);

    // piso: baldosas 16×16 gris azulado con juntas
    r(0x5a6890, 0, PARED, ANCHO, ALTO - PARED);
    for (let y = PARED; y < ALTO; y += 16) for (let x = 0; x < ANCHO; x += 16) {
      r(0x6f7da3, x, y, 15, 1); r(0x6f7da3, x, y, 1, 15);           // luz
      r(0x434f74, x, y + 15, 16, 1); r(0x434f74, x + 15, y, 1, 16); // junta
    }
    r(0x1a1c2c, 0, PARED, ANCHO, 2);                               // sombra de la pared

    // tanques de oxígeno junto a las cápsulas
    [104, 112].forEach(x => {
      r(0x1a1c2c, x - 1, 28, 7, 22);
      r(0x29adff, x, 30, 5, 19); r(0x7ee6ff, x + 1, 31, 1, 16);
      r(0xc2c3c7, x + 1, 27, 3, 2);
    });
    g.setDepth(-10);

    // cajas de carga (abajo a la izquierda), ordenadas por profundidad
    [[14, 172, 18], [30, 172, 14], [18, 158, 12]].forEach(([x, y, t]) => {
      const c = this.add.graphics().setDepth(y);
      c.fillStyle(0x1a1c2c).fillRect(x - t / 2 - 1, y - t - 1, t + 2, t + 2);
      c.fillStyle(0xbe7a4a).fillRect(x - t / 2, y - t, t, t);
      c.fillStyle(0xe0a46a).fillRect(x - t / 2, y - t, t, 2);
      c.fillStyle(0x7a4a2a).fillRect(x - t / 2, y - t / 2, t, 1).fillRect(x - 1, y - t, 1, t);
    });

    texto(this, 51, 3, this.t.centro, { tam: 7, color: "#eef1ff", ancho: 52 }).setDepth(-5);
    texto(this, 165, 4, this.t.titulo, { tam: 7, color: "#eef1ff", ancho: 130 }).setDepth(-5);
    texto(this, R.x + R.w / 2, R.y + 1, this.t.reloj, { tam: 5, color: "#ff8a5c" }).setDepth(-5);
    this.textoReloj = texto(this, R.x + R.w / 2, R.y + 7, "", { tam: 7, color: "#ff5c5c" }).setDepth(-5);
  }

  // ---------------------------------------------------------------- piso pintado
  // Tapete frente al vestidor, carril amarillo hacia las naves, círculos de
  // zona de despegue y mangueras de combustible de la pared a las naves.
  decorarPiso() {
    const g = this.add.graphics().setDepth(-9);
    const r = (color, x, y, w, h) => g.fillStyle(color).fillRect(x, y, w, h);
    // tapete / rejilla frente al vestidor
    r(0x1a1c2c, 10, 88, 100, 24); r(0x434f74, 11, 89, 98, 22);
    for (let x = 13; x < 108; x += 4) r(0x333c57, x, 89, 1, 22);
    for (let y = 91; y < 111; y += 4) r(0x333c57, 11, y, 98, 1);
    for (let x = 11; x < 109; x += 8) { r(0xffcd75, x, 89, 4, 1); r(0xffcd75, x, 110, 4, 1); }
    // carril con líneas amarillas hacia las naves
    for (let x = 196; x < 300; x += 10) { r(0xffcd75, x, 132, 6, 1); r(0xffcd75, x, 146, 6, 1); }
    for (let i = 0; i < 3; i++) {                                   // chevrones del carril
      const x = 214 + i * 26;
      for (let k = 0; k < 4; k++) { r(0xd9b35f, x + k, 135 + k, 1, 1); r(0xd9b35f, x + k, 142 - k, 1, 1); }
    }
    // círculos de "zona de despegue" alrededor de cada plataforma
    [[204, 111, 36, 12], [272, 111, 27, 10]].forEach(([cx, cy, rx, ry]) => {
      for (let a = 0; a < 360; a += 9) {
        if ((a / 9) % 2) continue;
        const t = a * Math.PI / 180;
        r(0xffcd75, Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 2, 1);
      }
    });
    // mangueras de combustible: bajan por la pared y llegan a cada plataforma
    [[[238, 34], [238, 56], [246, 92], [226, 106]], [[316, 34], [316, 56], [318, 92], [294, 106]]].forEach(([a, b, c, d]) => {
      r(0x1a1c2c, a[0] - 1, a[1], 3, b[1] - a[1]); r(0x566c86, a[0], a[1], 1, b[1] - a[1]);
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, u = 1 - t;
        const x = u * u * u * b[0] + 3 * u * u * t * c[0] + 3 * u * t * t * c[0] + t * t * t * d[0];
        const y = u * u * u * b[1] + 3 * u * u * t * c[1] + 3 * u * t * t * d[1] + t * t * t * d[1];
        r(0x1a1c2c, Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        r(0x566c86, Math.round(x), Math.round(y) - 1, 1, 1);
      }
      r(0xffcd75, d[0] - 2, d[1] - 1, 4, 3);                          // conector
    });
  }

  // ---------------------------------------------------------------- objetos
  // Objetos con profundidad: el astronauta pasa por detrás o por delante.
  crearObjetos() {
    this.add.image(9, 72, "planta").setOrigin(0.5, 1).setDepth(72);
    this.add.image(122, 70, "bote").setOrigin(0.5, 1).setDepth(70);
    this.add.image(172, 102, "cono").setOrigin(0.5, 1).setDepth(102);
    this.add.image(238, 128, "cono").setOrigin(0.5, 1).setDepth(128);
    this.add.image(306, 112, "cono").setOrigin(0.5, 1).setDepth(112);

    // banca
    const b = this.add.graphics().setDepth(146);
    b.fillStyle(0x1a1c2c).fillRect(52, 138, 28, 5).fillRect(55, 142, 3, 4).fillRect(74, 142, 3, 4);
    b.fillStyle(0x566c86).fillRect(53, 139, 26, 2);
    b.fillStyle(0x29adff).fillRect(58, 137, 3, 2).fillRect(62, 137, 3, 2);           // guantes olvidados

    // tanques de gas entre las naves
    const t = this.add.graphics().setDepth(84);
    [[234, 0x38b764], [239, 0x29adff], [244, 0xef7d57]].forEach(([x, c], i) => {
      t.fillStyle(0x1a1c2c).fillRect(x - 1, 70 + i % 2, 5, 14 - i % 2);
      t.fillStyle(c).fillRect(x, 71 + i % 2, 3, 12 - i % 2);
      t.fillStyle(0xc2c3c7).fillRect(x + 1, 69 + i % 2, 1, 2);
    });

    // carrito de herramientas
    const c = this.add.graphics().setDepth(170);
    c.fillStyle(0x1a1c2c).fillRect(242, 156, 22, 13);
    c.fillStyle(0xb13e53).fillRect(243, 157, 20, 10);
    c.fillStyle(0xef7d57).fillRect(243, 157, 20, 2);
    c.fillStyle(0x1a1c2c).fillRect(243, 161, 20, 1).fillRect(243, 164, 20, 1);
    c.fillStyle(0xc2c3c7).fillRect(251, 162, 4, 1).fillRect(251, 165, 4, 1);         // manijas
    c.fillStyle(0xc2c3c7).fillRect(246, 154, 7, 1).fillRect(245, 153, 2, 3);          // llave inglesa
    c.fillStyle(0xffcd75).fillRect(257, 152, 1, 4);                                   // destornillador
    c.fillStyle(0x1a1c2c).fillRect(244, 168, 3, 2).fillRect(259, 168, 3, 2);          // ruedas
  }

  // ---------------------------------------------------------------- opciones
  crearVestidor() {
    this.zonas = [];
    TRAJES.forEach((traje, i) => {
      const x = 32 + i * 56, dy = 8;     // dy: baja la cápsula bajo el letrero
      // cápsula de vidrio: base, tapa, soporte y el traje colgado
      const g = this.add.graphics().setDepth(78);
      g.fillStyle(0x1a1c2c).fillRect(x - 15, 66 + dy, 30, 9);              // base
      g.fillStyle(0x566c86).fillRect(x - 14, 67 + dy, 28, 3);
      g.fillStyle(0x333c57).fillRect(x - 14, 70 + dy, 28, 4);
      g.fillStyle(0x5cff8a).fillRect(x - 2, 71 + dy, 4, 1);                 // lucecita
      g.fillStyle(0x1a1c2c).fillRect(x - 15, 16 + dy, 30, 6);               // tapa
      g.fillStyle(0x566c86).fillRect(x - 14, 17 + dy, 28, 3);
      g.fillStyle(0x333c57).fillRect(x - 1, 22 + dy, 2, 44);                // soporte del maniquí
      const traje3 = this.add.image(x, 66 + dy, `maniqui_${traje.id}`).setOrigin(0.5, 1).setDepth(79);
      const capsula = this.add.rectangle(x, 44 + dy, 28, 44, 0x4fd1ff, 0.10)
        .setStrokeStyle(1, 0xbff3ff, 0.5).setDepth(80);
      this.add.rectangle(x - 10, 40 + dy, 2, 30, 0xffffff, 0.25).setDepth(80);   // reflejo del vidrio
      const zona = { tipo: "traje", opcion: traje, x, y: 98 + dy, foco: capsula, piezas: [traje3] };
      capsula.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });
  }

  crearHangar() {
    this.lucesNave = [];
    this.naves = {};
    NAVES.forEach((nave, i) => {
      const x = 204 + i * 68, y = 112;          // y = donde apoyan las patas
      // plataforma con franja de peligro, proporcional al ancho de la nave
      const pw = nave.w + 10, ph = Math.round(pw * 0.24);
      const g = this.add.graphics().setDepth(y - 2);
      g.fillStyle(0x1a1c2c).fillEllipse(x, y, pw, ph);
      g.fillStyle(0xffcd75).fillEllipse(x, y - 1, pw - 2, ph - 3);
      g.fillStyle(0x333c57).fillEllipse(x, y - 1, pw - 8, ph - 6);
      const plataforma = this.add.ellipse(x, y - 1, pw, ph - 1).setDepth(y - 1);
      const sprite = this.add.image(x, y, `nave_${nave.id}`).setOrigin(0.5, 1).setDepth(y);
      // luces de posición que parpadean
      const luces = NAVE_EXTRA[nave.id].luces.map(([lx, ly], k) =>
        this.add.rectangle(lx, ly, 2, 2, k === 2 ? 0xff5c5c : (k ? VERDE : 0xff5c5c)).setDepth(y + 0.5));
      this.lucesNave.push(...luces.map((img, k) => ({ img, k, nave: nave.id })));
      const zona = { tipo: "nave", opcion: nave, x, y: 132, foco: plataforma, piezas: [sprite] };
      sprite.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
      this.naves[nave.id] = { x, sprite, luces, zona };
    });
    let paso = 0;
    this.time.addEvent({ delay: 450, loop: true, callback: () => {
      paso++;
      this.lucesNave.forEach(l => {
        const apagada = this.naveElegida && this.naveElegida.id !== l.nave;
        l.img.setVisible(!apagada && (paso + l.k) % 2 === 0);
      });
    } });
  }

  // La compuerta queda como decorado: ahora se sale subiendo a la nave
  crearCompuerta() {
    const x = COMPUERTA.x, y = COMPUERTA.y;
    const g = this.add.graphics().setDepth(y - 1);
    g.fillStyle(0x1a1c2c).fillRect(x - 10, y - 17, 20, 34);
    g.fillStyle(0x566c86).fillRect(x - 8, y - 15, 7, 28);
    g.fillStyle(0x566c86).fillRect(x + 1, y - 15, 7, 28);
    g.fillStyle(0x94b0c2).fillRect(x - 8, y - 15, 1, 28).fillRect(x + 1, y - 15, 1, 28);   // brillo
    g.fillStyle(0x333c57).fillRect(x - 6, y - 8, 3, 6).fillRect(x + 3, y - 8, 3, 6);       // ventanitas
    for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? 0x1a1c2c : 0xffcd75).fillRect(x - 8 + i * 4, y + 13, 4, 3);
    g.fillStyle(0xffcd75).fillRect(x - 4, y - 21, 8, 3);
  }

  // ---------------------------------------------------------------- estaciones
  // Báscula y arco de radiación para probar los trajes antes de decidir.
  crearEstaciones() {
    // báscula: plataforma con pantalla en un poste
    const B = LUGAR.bascula, gb = this.add.graphics().setDepth(B.y - 4);
    gb.fillStyle(0x1a1c2c).fillRect(B.x - 1, B.y - 22, 3, 18);                 // poste
    gb.fillStyle(0x1a1c2c).fillRect(B.x - 10, B.y - 30, 21, 10);               // pantalla
    gb.fillStyle(0x0b1026).fillRect(B.x - 9, B.y - 29, 19, 8);
    const gp = this.add.graphics().setDepth(B.y - 6);
    gp.fillStyle(0x1a1c2c).fillRect(B.x - 10, B.y - 4, 21, 7);                 // plataforma
    gp.fillStyle(0x94b0c2).fillRect(B.x - 9, B.y - 3, 19, 4);
    gp.fillStyle(0xffcd75).fillRect(B.x - 9, B.y + 1, 19, 1);
    this.textoPeso = texto(this, B.x, B.y - 29, "-- kg", { tam: 5, color: "#5cff8a" }).setDepth(B.y - 3);
    this.zonas.push({ tipo: "bascula", x: B.x, y: B.y, r: 9 });

    // arco de radiación: dos columnas y un techo con luces
    const A = LUGAR.arco, ga = this.add.graphics();
    ga.fillStyle(0x1a1c2c).fillRect(A.x - 14, A.y - 30, 28, 4);                // techo
    ga.fillStyle(0xffcd75).fillRect(A.x - 13, A.y - 29, 26, 2);
    for (let x = A.x - 11; x < A.x + 12; x += 4) ga.fillStyle(0xb13e53).fillRect(x, A.y - 27, 2, 1);
    ga.setDepth(A.y + 2);
    const columna = x => {
      const c = this.add.graphics().setDepth(A.y + 1);
      c.fillStyle(0x1a1c2c).fillRect(x - 2, A.y - 27, 4, 28);
      c.fillStyle(0x566c86).fillRect(x - 1, A.y - 26, 2, 26);
      c.fillStyle(0xfff27a).fillRect(x - 1, A.y - 20, 2, 2).fillRect(x - 1, A.y - 12, 2, 2);
    };
    columna(A.x - 12); columna(A.x + 12);
    this.rayos = [];
    this.time.addEvent({ delay: 110, loop: true, callback: () => {
      const y = A.y - 24 + Math.floor(Math.random() * 22);
      const img = this.add.rectangle(A.x - 10, y, 2, 1, 0xfff27a).setDepth(1000);
      this.rayos.push({ img, x: A.x - 10, y });
    } });
    this.zonas.push({ tipo: "arco", x: A.x, y: A.y, r: 9 });

    // pantalla del polo sur (radar): al acercarse, Chispa da una pista
    this.marcoRadar = this.add.rectangle(134, 29, 28, 22).setStrokeStyle(1, AMARILLO).setDepth(-5).setVisible(false);
    this.zonas.push({ tipo: "pantalla", x: LUGAR.pantalla.x, y: LUGAR.pantalla.y, r: 18 });
  }

  // Flechas en el piso que parpadean hasta que el niño elige
  crearFlechas() {
    const flecha = (x, y, izq, color) => izq
      ? this.add.triangle(x, y, 8, 0, 0, 4, 8, 8, color)
      : this.add.triangle(x, y, 0, 0, 8, 4, 0, 8, color);

    // Traje (izquierda): flecha + icono de traje
    const fT = flecha(114, 124, true, COLOR.borde);
    const iT = [this.add.image(127, 124, "icono_traje")];
    // Nave (derecha): flecha + icono de cohete
    const iN = [this.add.image(193, 124, "icono_cohete")];
    const fN = flecha(206, 124, false, COLOR.borde);

    this.flechas = {
      traje: this.crearIndicador([fT, ...iT], 126, 124),
      nave: this.crearIndicador([fN, ...iN], 192, 124)
    };

    // Flecha hacia la rampa, apagada hasta tener las dos cosas
    this.flechaRampa = this.add.triangle(0, 0, 0, 8, 4, 0, 8, 8, VERDE).setDepth(-1).setVisible(false);
    this.parpadeoRampa = this.tweens.add({ targets: this.flechaRampa, alpha: 0.2, duration: 400, yoyo: true, repeat: -1, paused: true });
  }

  crearIndicador(piezas, xCheck, yCheck) {
    piezas.forEach(p => p.setDepth(-1));
    const parpadeo = this.tweens.add({ targets: piezas, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    const check = texto(this, xCheck, yCheck, "✓", { tam: 10, color: "#5cff8a", origenY: 0.5 }).setVisible(false).setDepth(-1);
    return { piezas, parpadeo, check };
  }

  marcarFlecha(tipo) {
    const f = this.flechas[tipo];
    f.parpadeo.stop();
    f.piezas.forEach(p => p.setVisible(false));
    f.check.setVisible(true);
  }

  // ---------------------------------------------------------------- personajes
  crearPersonajes() {
    // Astronauta: origen en los pies para ordenar por profundidad (vista 3/4)
    // Uniforme azul al entrar; al elegir traje cambia a "blindado" o "ligero".
    this.trajeVisible = "base";
    this.paso = 0;               // cuadro de la caminata (0 quieto, 1 paso)
    this.tiempoPaso = 0;
    this.sombra = this.add.ellipse(0, 0, 14, 4, 0x1a1c2c, 0.4);
    this.astro = this.add.image(LUGAR.entrada.x, ALTO + 30, "astro_base_0").setOrigin(0.5, 1);

    this.sombraChispa = this.add.ellipse(0, 0, 8, 3, 0x1a1c2c, 0.3);
    this.chispa = this.add.image(LUGAR.entrada.x + 24, 112, "chispa_px");
    this.dialogo = texto(this, 0, 0, "", { tam: 6, ancho: 120, origenY: 1 })
      .setBackgroundColor("#1d2650").setPadding(2, 1).setDepth(1000).setVisible(false);
  }

  decir(frase, ms = 3000) {
    this.dialogo.setText(frase).setVisible(true);
    this.time.removeEvent(this.ocultarDialogo);
    this.ocultarDialogo = this.time.delayedCall(ms, () => this.dialogo.setVisible(false));
  }

  // Técnicos que caminan entre dos puntos y cuentan datos reales
  crearTecnicos() {
    this.indiceDato = 0;
    this.tecnicos = TECNICOS.map(def => {
      const [x, y] = def.ruta[0];
      const img = this.add.image(x, y, `astro_${def.id}_0`).setOrigin(0.5, 1);
      const sombra = this.add.ellipse(x, y, 14, 4, 0x1a1c2c, 0.4);
      const globo = texto(this, x, y - 26, "", { tam: 5, ancho: 100, origenY: 1 })
        .setBackgroundColor("#3b2a1d").setPadding(2, 1).setDepth(1000).setVisible(false);
      return { def, img, sombra, globo, meta: 1, espera: 0, paso: 0, tiempoPaso: 0, enfriar: 0, hablando: 0 };
    });
  }

  actualizarTecnicos(delta) {
    const dt = delta / 1000;
    this.tecnicos.forEach(tc => {
      const cerca = Phaser.Math.Distance.Between(this.astro.x, this.astro.y, tc.img.x, tc.img.y) < 22;
      tc.enfriar -= delta;
      tc.hablando -= delta;
      if (cerca && tc.enfriar <= 0 && this.controlActivo) {
        const datos = this.t.tecnicos;
        tc.globo.setText(datos[this.indiceDato++ % datos.length]).setVisible(true);
        tc.hablando = 4500; tc.enfriar = 8000;
      }
      if (tc.hablando <= 0) tc.globo.setVisible(false);

      let camina = false;
      if (tc.hablando > 0) tc.img.setFlipX(this.astro.x < tc.img.x);       // mira al niño
      else if (tc.espera > 0) tc.espera -= delta;                           // revisa la nave
      else {
        const [mx, my] = tc.def.ruta[tc.meta];
        const dx = mx - tc.img.x;
        if (Math.abs(dx) < 1) { tc.meta = 1 - tc.meta; tc.espera = 1800; }
        else { tc.img.x += Math.sign(dx) * Math.min(Math.abs(dx), 18 * dt); tc.img.y = my; tc.img.setFlipX(dx < 0); camina = true; }
      }
      tc.tiempoPaso += delta;
      if (camina && tc.tiempoPaso > 200) { tc.tiempoPaso = 0; tc.paso = 1 - tc.paso; }
      if (!camina) tc.paso = 0;
      tc.img.setTexture(`astro_${tc.def.id}_${tc.paso}`).setDepth(tc.img.y);
      tc.sombra.setPosition(tc.img.x, tc.img.y).setDepth(tc.img.y - 0.5);
      tc.globo.setPosition(Phaser.Math.Clamp(tc.img.x, 54, ANCHO - 54), tc.img.y - 26);
    });
  }

  // ---------------------------------------------------------------- ambiente
  // Pantallas que cambian, luces que parpadean, reloj, dron, vapor y polvo.
  crearAmbiente() {
    // pantallas animadas: barrido del radar y gráfica que cambia
    this.gPantallas = this.add.graphics().setDepth(-9.5);
    this.anguloRadar = 0;
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.dibujarPantallas() });

    // luces del techo con parpadeo leve
    this.focos = [];
    for (let x = 36; x < ANCHO; x += 64) this.focos.push(this.add.rectangle(x, 0, 10, 2, 0xfff27a).setOrigin(0).setDepth(-5));
    this.time.addEvent({ delay: 200, loop: true, callback: () =>
      this.focos.forEach(f => f.setAlpha(Math.random() < 0.08 ? 0.2 : 1)) });

    // cuenta regresiva de la tormenta (horas reales calculadas con DONKI)
    this.segundosTormenta = Math.round(horasDeLlegada(estado.datos.cme.velocidad_kms) * 3600);
    const reloj = () => {
      const s = Math.max(0, this.segundosTormenta--);
      const dos = n => String(n).padStart(2, "0");
      this.textoReloj.setText(`${dos(Math.floor(s / 3600))}:${dos(Math.floor(s / 60) % 60)}:${dos(s % 60)}`);
    };
    reloj();
    this.time.addEvent({ delay: 1000, loop: true, callback: reloj });

    // haz de luz del ventanal con polvo flotando
    this.add.graphics().setDepth(-8).fillStyle(0xfff8d0, 0.06)
      .fillPoints([{ x: 245, y: 26 }, { x: 313, y: 26 }, { x: 262, y: 160 }, { x: 186, y: 160 }], true);
    this.polvo = Array.from({ length: 14 }, () => ({
      t: Math.random(), u: Math.random(), v: 0.03 + Math.random() * 0.04,
      img: this.add.rectangle(0, 0, 1, 1, 0xfff8d0).setOrigin(0).setAlpha(0.6).setDepth(500)
    }));

    // dron que va y viene sobre las naves y las revisa con un rayo
    this.dron = this.add.image(186, 40, "dron").setDepth(400);
    this.rayoDron = this.add.rectangle(186, 44, 1, 14, 0x29adff, 0.5).setOrigin(0.5, 0).setDepth(399).setVisible(false);
    this.tweens.add({ targets: this.dron, x: 296, duration: 7000, yoyo: true, repeat: -1, ease: "Sine.easeInOut", hold: 1200, repeatDelay: 1200 });

    // vapor en las toberas
    this.time.addEvent({ delay: 380, loop: true, callback: () => {
      Object.entries(NAVE_EXTRA).forEach(([id, n]) => {
        if (this.saliendo || (this.naveElegida && this.naveElegida.id !== id && Math.random() < 0.7)) return;
        const [x, y] = n.tobera;
        const p = this.add.rectangle(x, y, 3, 2, 0xc2c3c7, 0.7).setDepth(113);
        this.tweens.add({ targets: p, x: x + (Math.random() - 0.5) * 18, y: y + 3, alpha: 0, duration: 1000, onComplete: () => p.destroy() });
      });
    } });
  }

  dibujarPantallas() {
    const g = this.gPantallas.clear();
    // radar: línea que gira y un eco que se enciende
    this.anguloRadar += 0.35;
    const a = this.anguloRadar;
    for (let k = 1; k <= 6; k++) g.fillStyle(0x7ee6ff, 0.9).fillRect(Math.round(134 + Math.cos(a) * k), Math.round(28 + Math.sin(a) * k), 1, 1);
    if (Math.sin(a) < -0.3) g.fillStyle(0xff5c5c).fillRect(137, 25, 2, 2);
    // gráfica: barras y líneas que cambian
    g.fillStyle(0x0b1026).fillRect(204, 20, 24, 18);
    for (let i = 0; i < 4; i++) g.fillStyle(0x7ee6ff).fillRect(205, 22 + i * 3, 2 + Math.floor(Math.random() * 6), 1);
    for (let i = 0; i < 5; i++) {
      const h = 3 + Math.floor(Math.random() * 11);
      g.fillStyle(i % 2 ? 0x29adff : 0x7ee6ff).fillRect(214 + i * 3, 37 - h, 2, h);
    }
  }

  animarAmbiente(delta) {
    const dt = delta / 1000;
    // polvo dentro del haz de luz
    this.polvo.forEach(p => {
      p.t += p.v * dt; p.u += Math.sin(p.t * 9) * 0.002;
      if (p.t > 1) { p.t = 0; p.u = Math.random(); }
      const y = 26 + p.t * 134, x0 = 245 - p.t * 59, ancho = 68 + p.t * 8;
      p.img.setPosition(Math.round(x0 + Phaser.Math.Clamp(p.u, 0, 1) * ancho), Math.round(y));
    });
    // rayo del dron cuando pasa sobre una nave
    const sobreNave = Object.values(this.naves).some(n => Math.abs(this.dron.x - n.x) < 6);
    this.dron.y = 38 + Math.round(Math.sin(this.time.now / 300));
    this.rayoDron.setPosition(Math.round(this.dron.x), this.dron.y + 4).setVisible(sobreNave && Math.floor(this.time.now / 120) % 2 === 0);
    // puntitos de radiación del arco: el traje frena algunos
    const A = LUGAR.arco, dentro = Math.abs(this.astro.x - A.x) < 8 && Math.abs(this.astro.y - A.y) < 7;
    this.rayos = this.rayos.filter(rayo => {
      const antes = rayo.x;
      rayo.x += 55 * dt;
      if (dentro && !rayo.revisado && antes < this.astro.x && rayo.x >= this.astro.x) {
        rayo.revisado = true;
        if (Math.random() < BLOQUEO[this.trajeVisible]) {           // el traje lo frena
          rayo.img.setFillStyle(0xffffff).setScale(0.5, 1);
          this.time.delayedCall(80, () => rayo.img.destroy());
          return false;
        }
        rayo.img.setFillStyle(0xff8a5c);                              // lo atraviesa
      }
      if (rayo.x > A.x + 10) { rayo.img.destroy(); return false; }
      rayo.img.setPosition(Math.round(rayo.x), rayo.y);
      return true;
    });
  }

  // ---------------------------------------------------------------- burbuja
  crearBurbuja() {
    this.burbuja = this.add.container(0, 0).setDepth(1001).setVisible(false);
    this.fondoBurbuja = this.add.rectangle(0, 0, 120, 34, COLOR.panel).setStrokeStyle(1, COLOR.borde).setOrigin(0.5, 0);
    this.bNombre = texto(this, 0, 2, "", { tam: 6, ancho: 116 });
    this.bVentaja = texto(this, 0, 10, "", { tam: 6, ancho: 116, color: "#5cff8a" });
    this.bCosto = texto(this, 0, 18, "", { tam: 6, ancho: 116, color: "#ff5c5c" });
    this.bAccion = texto(this, 0, 26, "", { tam: 5, ancho: 116, color: COLOR.tenue });
    this.burbuja.add([this.fondoBurbuja, this.bNombre, this.bVentaja, this.bCosto, this.bAccion]);
  }

  // Cambia {proteccion}, {gastoO2}, etc. por los números de la opción
  llenar(plantilla, o) {
    return plantilla.replace(/\{(\w+)\}/g, (_, k) => k === "proteccion" ? Math.round(o.proteccion * 100) : o[k]);
  }

  mostrarBurbuja(zona) {
    if (zona.tipo !== "traje" && zona.tipo !== "nave") return this.burbuja.setVisible(false);
    const info = this.t.opciones[zona.opcion.id];
    const elegida = zona.opcion === this.trajeElegido || zona.opcion === this.naveElegida;
    this.bNombre.setText(info.nombre);
    this.bVentaja.setText(this.llenar(info.ventaja, zona.opcion));
    this.bCosto.setText(this.llenar(info.costo, zona.opcion));
    this.bAccion.setText(elegida ? this.t.elegido : this.t.elegir);
    const x = Phaser.Math.Clamp(zona.x, 62, ANCHO - 62);
    this.burbuja.setPosition(x, zona.tipo === "traje" ? 112 : 2).setVisible(true);
  }

  // ---------------------------------------------------------------- elegir
  irAZona(zona, ev) {
    ev?.stopPropagation();
    if (!this.controlActivo) return;
    this.caminarA(zona.x, zona.y, () => this.usarZona(zona));
  }

  usarZona(zona = this.activa) {
    if (!zona || !this.controlActivo) return;
    if (zona.tipo === "traje") this.elegirTraje(zona.opcion);
    else if (zona.tipo === "nave") this.elegirNave(zona.opcion);
    else if (zona.tipo === "rampa") this.abordar();
    else return;
    this.mostrarBurbuja(zona);
  }

  elegirTraje(traje) {
    this.trajeElegido = traje;
    // El traje elegido "sale" de su cápsula y se ve puesto en el astronauta
    this.zonas.filter(z => z.tipo === "traje")
      .forEach(z => z.piezas.forEach(p => p.setVisible(z.opcion !== traje)));
    this.trajeVisible = traje.id;
    this.astro.setTexture(`astro_${traje.id}_${this.paso}`);
    this.cameras.main.flash(150, 255, 255, 255);
    this.marcarFlecha("traje");
    this.decir(this.llenar(this.t.chispa_traje, { nombre: this.t.opciones[traje.id].nombre.toLowerCase() }));
    this.revisarListos();
  }

  elegirNave(nave) {
    this.naveElegida = nave;
    // La elegida iluminada, la otra en penumbra y con las luces apagadas
    this.zonas.filter(z => z.tipo === "nave").forEach(z => {
      const sel = z.opcion === nave;
      z.piezas.forEach(p => p.setAlpha(sel ? 1 : 0.35));
      z.foco.setStrokeStyle(sel ? 2 : 0, VERDE);
    });
    this.marcarFlecha("nave");
    this.decir(this.llenar(this.t.chispa_nave, { nombre: this.t.opciones[nave.id].nombre.toLowerCase() }));
    this.revisarListos();
  }

  listos() { return this.trajeElegido && this.naveElegida; }

  // Con traje y nave, la nave elegida baja su rampa (si cambia de nave, la rampa se mueve)
  revisarListos() {
    if (!this.listos()) return;
    const n = this.naves[this.naveElegida.id];
    if (this.rampa && this.rampa.nave === this.naveElegida.id) return;
    const primera = !this.rampa;
    if (this.rampa) { this.rampa.g.destroy(); this.zonas = this.zonas.filter(z => z.tipo !== "rampa"); }

    const g = this.add.graphics().setPosition(n.x, 104).setDepth(113);
    for (let j = 0; j < 30; j++) {
      const w = 8 + Math.round(j * 0.2);
      g.fillStyle(0x1a1c2c).fillRect(-w / 2 - 1, j, w + 2, 1);
      g.fillStyle(j % 4 === 0 ? 0x566c86 : 0x94b0c2).fillRect(-w / 2, j, w, 1);
      g.fillStyle(0xffcd75).fillRect(-w / 2, j, 1, 1).fillRect(w / 2 - 1, j, 1, 1);
    }
    g.scaleY = 0;
    this.tweens.add({ targets: g, scaleY: 1, duration: 900, ease: "Bounce.easeOut" });
    this.rampa = { g, nave: this.naveElegida.id };
    this.zonas.push({ tipo: "rampa", x: n.x, y: 140, r: 10 });

    this.flechaRampa.setPosition(n.x, 152).setVisible(true);
    this.parpadeoRampa.resume();
    if (primera) this.time.delayedCall(1200, () => this.decir(this.t.chispa_listos));
  }

  // Subir a la nave y despegar → Misión 4
  abordar() {
    if (!this.listos() || this.saliendo) return;
    this.saliendo = true;
    this.controlActivo = false;
    this.burbuja.setVisible(false);
    this.flechaRampa.setVisible(false);

    estado.traje = this.trajeElegido;
    estado.nave = this.naveElegida;
    estado.oxigeno += this.naveElegida.oxigenoExtra;
    const tanque = estado.lleva("oxigeno");
    if (tanque) { estado.oxigeno += O2_TANQUE; this.decir(this.t.chispa_tanque); }
    estado.bitacora.push(`Equipo: ${this.t.opciones[this.trajeElegido.id].nombre} y ${this.t.opciones[this.naveElegida.id].nombre}.`);

    const n = this.naves[this.naveElegida.id];
    // sube por la rampa y entra
    this.tweens.add({ targets: this.astro, x: n.x, y: 114, duration: 900, delay: tanque ? 900 : 200 });
    this.tweens.add({ targets: [this.astro, this.sombra, this.chispa, this.sombraChispa], alpha: 0, duration: 300, delay: tanque ? 1700 : 1000 });
    // la rampa se recoge, se encienden los motores y la nave despega
    this.time.delayedCall(tanque ? 2100 : 1400, () => {
      this.tweens.add({ targets: this.rampa.g, scaleY: 0, duration: 400 });
      const fuego = this.add.rectangle(n.x, 112, 8, 6, 0xffa300).setOrigin(0.5, 0).setDepth(n.sprite.depth - 0.1);
      this.time.addEvent({ delay: 60, loop: true, callback: () => fuego.setFillStyle(Math.random() < 0.5 ? 0xffa300 : 0xfff27a).setScale(0.8 + Math.random() * 0.5, 0.8 + Math.random()) });
      this.cameras.main.shake(1800, 0.004);
      const piezas = [n.sprite, fuego, ...n.luces];
      this.tweens.add({ targets: piezas, y: "-=170", duration: 1800, delay: 500, ease: "Cubic.easeIn" });
      this.time.delayedCall(1900, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Viaje"));
      });
    });
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
    const camina = this.controlActivo ? this.mover(dt) : !this.saliendo;   // al entrar también camina

    // Caminata de 2 cuadros
    this.tiempoPaso += delta;
    if (camina && this.tiempoPaso > 160) { this.tiempoPaso = 0; this.paso = 1 - this.paso; }
    if (!camina) this.paso = 0;
    this.astro.setTexture(`astro_${this.trajeVisible}_${this.paso}`).setDepth(this.astro.y);
    this.sombra.setPosition(this.astro.x, this.astro.y).setDepth(this.astro.y - 0.5);

    // Chispa flota detrás del astronauta, con un poco de retraso
    const lado = this.astro.flipX ? 1 : -1;
    const cx = this.astro.x + lado * 16, piso = this.astro.y - 2;
    this.chispa.x += (cx - this.chispa.x) * Math.min(1, dt * 3);
    this.chispa.y += (piso - 22 + Math.sin(tiempo / 250) * 2 - this.chispa.y) * Math.min(1, dt * 3);
    this.chispa.setFlipX(this.astro.flipX).setDepth(piso + 1);
    this.sombraChispa.setPosition(this.chispa.x, piso).setDepth(piso - 1);
    this.dialogo.setPosition(Phaser.Math.Clamp(this.chispa.x, 64, ANCHO - 64), Math.max(this.chispa.y - 10, 22));

    this.actualizarTecnicos(delta);
    this.animarAmbiente(delta);
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

    // con el traje blindado se camina más lento: así se siente el costo
    const v = VELOCIDAD * (this.trajeVisible === "blindado" ? LENTITUD_BLINDADO : 1);
    const n = Math.hypot(dx, dy);
    this.astro.x = Phaser.Math.Clamp(this.astro.x + (dx / n) * v * dt, LIMITES.x1, LIMITES.x2);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + (dy / n) * v * dt, LIMITES.y1, LIMITES.y2);
    if (dx) this.astro.setFlipX(dx < 0);
    return true;
  }

  revisarProximidad() {
    let cerca = null, mejor = Infinity;
    this.zonas.forEach(z => {
      const d = Phaser.Math.Distance.Between(this.astro.x, this.astro.y, z.x, z.y);
      if (d < (z.r || CERCA) && d < mejor) { mejor = d; cerca = z; }
    });
    if (cerca === this.activa) return;

    // Apaga la anterior
    if (this.activa) {
      const a = this.activa;
      if (a.tipo === "traje") a.foco.setFillStyle(0x4fd1ff, 0.12);
      if (a.tipo === "nave" && a.opcion !== this.naveElegida) a.foco.setStrokeStyle(0);
      if (a.tipo === "bascula") this.textoPeso.setText("-- kg");
      if (a.tipo === "pantalla") this.marcoRadar.setVisible(false);
    }
    this.activa = cerca;
    if (!cerca) return this.burbuja.setVisible(false);

    // Ilumina la nueva
    if (cerca.tipo === "traje") cerca.foco.setFillStyle(0xfff27a, 0.35);
    if (cerca.tipo === "nave" && cerca.opcion !== this.naveElegida) cerca.foco.setStrokeStyle(2, 0xfff27a);
    if (cerca.tipo === "bascula") {
      const traje = TRAJES.find(t => t.id === this.trajeVisible);
      const peso = PESO_NINO + (traje ? traje.peso : 0);
      this.textoPeso.setText(peso + " kg");
      this.decir(this.llenar(this.t.bascula, { peso }) + " " + this.t["bascula_" + this.trajeVisible], 4000);
    }
    if (cerca.tipo === "arco") this.decir(this.t["arco_" + this.trajeVisible], 4000);
    if (cerca.tipo === "pantalla") { this.marcoRadar.setVisible(true); this.decir(this.t.pista, 5500); }
    if (cerca.tipo === "rampa") return this.abordar();
    this.mostrarBurbuja(cerca);
  }
}
