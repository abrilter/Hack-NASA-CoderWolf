// Misión 3: traje y nave. Dueño: Rol 2 (pantalla) y Rol 4 (números).
// Una sola sala, el hangar, vista 3/4. El astronauta camina (clic en el piso o
// flechas). Al acercarse a un traje o a una nave aparece una burbuja con su
// ventaja (verde) y su costo (rojo); clic o Enter lo elige. Se puede cambiar.
// Antes de decidir puede probar: la báscula (peso en la Tierra y en la Luna;
// con el blindado camina más lento) y el arco de radiación (ve cuántos
// puntitos atraviesan el traje). El radar muestra un dato real del polo sur.
// Bit, el robot del hangar, lo acompaña (Chispa está en la Luna con Itzel).
// Con traje y nave elegidos, la nave baja una rampa y el niño sube para
// despegar → Misión 4.
// Figuras en pixel art hechas con mapas de letras (src/pixelart.js).
// TODO(Rol 3): reemplazar por PNG cuando estén listos.
import { ANCHO, ALTO, COLOR, TRAJES, NAVES, O2_TANQUE } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";
import { crearTexturasEquipo } from "../pixelart.js";

// Los números de trajes y naves están en config.js (balance compartido con el
// modelo y el modo prueba). Se verifican con pruebas/balance.html.
const PESO_NINO = 30;        // kg del niño sin traje (para la báscula)
const GRAVEDAD_LUNA = 1 / 6; // en la Luna se pesa la sexta parte
const LENTITUD_BLINDADO = 0.6;
// Probabilidad de que el traje frene un puntito de radiación en el arco
const BLOQUEO = { base: 0, ligero: 0.35, blindado: 0.85 };

const VERDE = 0x5cff8a, ROJO = 0xff5c5c, AMARILLO = 0xffcd75;
const TAM = 6;               // un solo tamaño de letra para todos los rótulos
const PARED = 56;            // donde termina la pared del fondo y empieza el piso
const LIMITES = { x1: 12, x2: ANCHO - 14, y1: 100, y2: 172 };  // pies del astronauta
const VELOCIDAD = 70;        // px por segundo
const CERCA = 14;            // radio normal de la zona de proximidad

// Dónde va cada cosa (coordenadas de 320×180)
const LUGAR = {
  entrada:  { x: 160, y: 150 },
  // vestidor: cápsulas completas sobre el piso, rejilla pegada a sus bases
  capsulas: [32, 88], capsula: { arriba: 58, vidrio: 63, base: 93, piso: 100 }, zonaCapsula: 122,
  rejilla:  { x: 17, y: 100, w: 86, h: 16 },
  // pared: radar con la posición de Itzel (la pantalla interactiva)
  radar:    { x: 120, y: 18, w: 28, h: 22, cx: 134, cy: 28 },
  hud:      { x: 256, y: 33, w: 60, h: 15 },
  // prueba de traje (abajo a la izquierda)
  bascula:  { x: 30, y: 166 },
  arco:     { x: 70, y: 166 },
  // plataformas
  naves:    { grande: 204, pequena: 272 }, pies: 112,
  tecnico:  { x: 172, y: 110 },
  caja:     { x: 152, y: 110 },
  // recorrido del técnico alrededor de las naves (ida y vuelta, sin cruzar nada)
  rondaTecnico: [[170, 108], [170, 142], [238, 142], [238, 126], [238, 142], [284, 142], [284, 124]],
  compuerta:{ x: 306, y: 146 }
};
// Cosas que ocupan piso (rectángulo de los pies: x1, y1, x2, y2). Nadie las atraviesa:
// al hacer clic, el astronauta calcula un camino que las rodea.
const OBSTACULOS = [
  [17, 56, 47, 100], [73, 56, 103, 100],        // cápsulas
  [180, 98, 228, 119], [248, 98, 296, 119],     // naves sobre sus plataformas
  [300, 85, 319, 105],                          // cajas
  [236, 113, 244, 121],                         // cono
  [146, 103, 158, 111],                         // caja de herramientas
  [28, 148, 33, 162],                           // poste de la báscula
  [56, 158, 60, 167], [80, 158, 84, 167],       // columnas del arco
  [295, 128, 319, 165]                          // compuerta
];
const MARGEN = { x: 5, arriba: 2, abajo: 3 };   // medio cuerpo del astronauta
const CELDA = 4;                                // tamaño de la cuadrícula para buscar caminos

// Luces de posición y toberas de cada nave (coordenadas de la sala)
const NAVE_EXTRA = {
  grande:  { luces: [[189, 72], [217, 72], [203, 46]], tobera: [204, 106] },
  pequena: { luces: [[258, 103], [286, 103], [271, 62]], tobera: [272, 107] }
};

export class Equipo extends Phaser.Scene {
  constructor() { super("Equipo"); }

  create() {
    this.t = estado.textos.equipo;
    this.trajeElegido = null;
    this.naveElegida = null;
    this.activa = null;          // zona en la que está parado el astronauta
    this.saliendo = false;
    this.zonas = [];

    crearTexturasEquipo(this);
    this.dibujarSala();
    this.decorarPiso();
    this.crearVestidor();
    this.crearHangar();
    this.crearCompuerta();
    this.crearEstaciones();
    this.crearFlechas();
    this.crearPersonajes();
    this.crearTecnico();
    this.crearBurbujas();
    this.crearIndicador();
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

  // Rótulo con el tamaño único de la escena
  rotulo(x, y, s, color = "#eef1ff", profundidad = -8) {
    return texto(this, x, y, s, { tam: TAM, color }).setDepth(profundidad);
  }

  // ---------------------------------------------------------------- sala
  // Pared: paneles azules, letrero del hangar, tres monitores y ventanal con la Luna.
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

    // letrero "Hangar de la Estación Terrestre" en dos renglones (esquina superior izquierda)
    r(0x1a1c2c, 4, 11, 86, 24); r(0x1d2650, 5, 12, 84, 22); marco(5, 12, 84, 22, 0xffcd75);
    r(0xffa300, 11, 19, 4, 7); r(0xffcd75, 12, 18, 2, 1); r(0x29adff, 12, 20, 2, 2);  // cohete
    // ventanal redondeado (arriba a la derecha): estrellas y la Luna
    const V = { x: 245, y: 4, w: 68, h: 22 };
    r(0x1a1c2c, V.x - 4, V.y - 2, V.w + 8, V.h + 4); r(0x1a1c2c, V.x - 2, V.y - 4, V.w + 4, V.h + 8);
    r(0x566c86, V.x - 3, V.y - 1, V.w + 6, V.h + 2); r(0x566c86, V.x - 1, V.y - 3, V.w + 2, V.h + 6);
    r(0x94b0c2, V.x - 1, V.y - 1, V.w + 2, V.h + 2);
    r(0x0b1026, V.x, V.y, V.w, V.h);
    [[5, 4], [14, 15], [22, 6], [30, 18], [9, 11], [58, 4], [63, 16], [52, 19], [26, 12], [61, 9]]
      .forEach(([x, y]) => r(0xf4f4f4, V.x + x, V.y + y, 1, 1));
    const L = { x: V.x + 42, y: V.y + 11 };                               // la Luna
    g.fillStyle(0x94b0c2).fillCircle(L.x, L.y, 8);
    g.fillStyle(0xc2c3c7).fillCircle(L.x - 1, L.y - 1, 7);
    g.fillStyle(0xe4e6ec).fillCircle(L.x - 2, L.y - 2, 4);
    [[-3, -3, 2], [2, 1, 2], [-1, 4, 1], [4, -3, 1], [-5, 2, 1]]
      .forEach(([dx, dy, rr]) => g.fillStyle(0x94b0c2).fillCircle(L.x + dx, L.y + dy, rr));   // cráteres

    // tres monitores: radar del polo sur, la Luna y gráfica
    const monitor = (x, y, w, h) => { r(0x1a1c2c, x, y, w, h); r(0x0b1026, x + 2, y + 2, w - 4, h - 4); marco(x + 1, y + 1, w - 2, h - 2, 0x333c57); };
    const Rd = LUGAR.radar;
    monitor(Rd.x, Rd.y, Rd.w, Rd.h);                                           // radar
    g.lineStyle(1, 0x29adff, 0.9).strokeCircle(Rd.cx, Rd.cy, 7).strokeCircle(Rd.cx, Rd.cy, 3);
    r(0x29adff, Rd.cx - 8, Rd.cy, 17, 1); r(0x29adff, Rd.cx, Rd.cy - 8, 1, 17); r(0xff5c5c, Rd.cx + 3, Rd.cy - 3, 2, 2);
    r(0x5cff8a, 124, 35, 6, 1); r(0x5cff8a, 124, 37, 4, 1);
    monitor(151, 16, 48, 26);                                                  // la Luna en el espacio
    [[156, 20], [163, 33], [170, 19], [192, 22], [158, 30], [195, 35], [178, 37]].forEach(([x, y]) => r(0xf4f4f4, x, y, 1, 1));
    g.fillStyle(0x94b0c2).fillCircle(178, 29, 8);
    g.fillStyle(0xc2c3c7).fillCircle(177, 28, 7);
    g.fillStyle(0xe4e6ec).fillCircle(176, 27, 4);
    [[-3, -3, 2], [2, 1, 2], [-1, 4, 1], [4, -3, 1]].forEach(([dx, dy, rr]) => g.fillStyle(0x94b0c2).fillCircle(178 + dx, 29 + dy, rr));
    monitor(202, 18, 28, 22);                                                  // gráfica de barras
    // consolas con botones debajo de cada monitor
    [[122, 24], [149, 52], [204, 24]].forEach(([x, w]) => {
      r(0x1a1c2c, x, 41, w, 9); r(0x566c86, x + 1, 42, w - 2, 2); r(0x333c57, x + 1, 44, w - 2, 5);
      const colores = [0xff5c5c, 0x5cff8a, 0x29adff, 0xffcd75];
      for (let i = 0; x + 3 + i * 5 < x + w - 3; i++) r(colores[i % 4], x + 3 + i * 5, 45, 3, 2);
    });

    // tubos de oxígeno en la pared, junto a las cápsulas
    [104, 112].forEach(x => {
      r(0x1a1c2c, x - 1, 28, 7, 22);
      r(0x29adff, x, 30, 5, 19); r(0x7ee6ff, x + 1, 31, 1, 16);
      r(0xc2c3c7, x + 1, 27, 3, 2);
    });

    // piso: baldosas 16×16 gris azulado con juntas
    r(0x5a6890, 0, PARED, ANCHO, ALTO - PARED);
    for (let y = PARED; y < ALTO; y += 16) for (let x = 0; x < ANCHO; x += 16) {
      r(0x6f7da3, x, y, 15, 1); r(0x6f7da3, x, y, 1, 15);           // luz
      r(0x434f74, x, y + 15, 16, 1); r(0x434f74, x + 15, y, 1, 16); // junta
    }
    r(0x1a1c2c, 0, PARED, ANCHO, 2);                               // sombra de la pared
    g.setDepth(-10);

    texto(this, 51, 15, this.t.titulo, { tam: 6, color: "#eef1ff", ancho: 72 }).setDepth(-5);
  }

  // ---------------------------------------------------------------- piso pintado
  // Rejilla del vestidor, círculos punteados alrededor
  // de las plataformas y mangueras de combustible (desde el zócalo).
  decorarPiso() {
    const g = this.add.graphics().setDepth(-9);
    const r = (color, x, y, w, h) => g.fillStyle(color).fillRect(x, y, w, h);
    // rejilla: ancho exacto de las dos cápsulas, pegada a sus bases, una baldosa de alto
    const Rj = LUGAR.rejilla;
    r(0x1a1c2c, Rj.x, Rj.y, Rj.w, Rj.h); r(0x434f74, Rj.x + 1, Rj.y + 1, Rj.w - 2, Rj.h - 2);
    for (let x = Rj.x + 3; x < Rj.x + Rj.w - 1; x += 3) r(0x333c57, x, Rj.y + 1, 1, Rj.h - 2);
    for (let y = Rj.y + 4; y < Rj.y + Rj.h - 1; y += 4) r(0x333c57, Rj.x + 1, y, Rj.w - 2, 1);
    // círculo punteado limpio alrededor de cada plataforma
    NAVES.forEach(nave => {
      const cx = LUGAR.naves[nave.id], cy = LUGAR.pies - 1;
      const rx = (nave.w + 10) / 2 + 6, ry = Math.round(rx * 0.3);
      const puntos = Math.round(Math.PI * (rx + ry) / 3);            // un punto cada ~6 px
      for (let i = 0; i < puntos; i++) {
        const t = (i / puntos) * Math.PI * 2;
        r(0xffcd75, Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), 1, 1);
      }
    });
    // mangueras de combustible: salen del zócalo y llegan a cada plataforma
    [[[238, 52], [246, 92], [226, 106]], [[292, 52], [300, 90], [294, 106]]].forEach(([b, c, d]) => {
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, u = 1 - t;
        const x = u * u * b[0] + 2 * u * t * c[0] + t * t * d[0];
        const y = u * u * b[1] + 2 * u * t * c[1] + t * t * d[1];
        r(0x1a1c2c, Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        r(0x566c86, Math.round(x), Math.round(y) - 1, 1, 1);
      }
      r(0xffcd75, d[0] - 2, d[1] - 1, 4, 3);                          // conector
    });
  }

  // ---------------------------------------------------------------- vestidor
  crearVestidor() {
    const K = LUGAR.capsula;
    TRAJES.forEach((traje, i) => {
      const x = LUGAR.capsulas[i];
      // cápsula de vidrio completa sobre el piso: tapa, vidrio, base y el traje colgado
      const g = this.add.graphics().setDepth(K.piso - 2);
      g.fillStyle(0x1a1c2c).fillRect(x - 15, K.arriba, 30, 5);             // tapa
      g.fillStyle(0x566c86).fillRect(x - 14, K.arriba + 1, 28, 3);
      g.fillStyle(0x333c57).fillRect(x - 1, K.vidrio, 2, K.base - K.vidrio);  // soporte del maniquí
      g.fillStyle(0x1a1c2c).fillRect(x - 15, K.base, 30, K.piso - K.base);    // base
      g.fillStyle(0x566c86).fillRect(x - 14, K.base + 1, 28, 2);
      g.fillStyle(0x333c57).fillRect(x - 14, K.base + 3, 28, 3);
      g.fillStyle(0x5cff8a).fillRect(x - 2, K.base + 4, 4, 1);              // lucecita
      const maniqui = this.add.image(x, K.base, `maniqui_${traje.id}`).setOrigin(0.5, 1).setDepth(K.piso - 1);
      const alto = K.base - K.vidrio;
      const capsula = this.add.rectangle(x, K.vidrio + alto / 2, 28, alto, 0x4fd1ff, 0.10)
        .setStrokeStyle(1, 0xbff3ff, 0.5).setDepth(K.piso);
      this.add.rectangle(x - 10, K.vidrio + alto / 2 - 2, 2, alto - 10, 0xffffff, 0.25).setDepth(K.piso);   // reflejo
      const zona = { tipo: "traje", opcion: traje, x, y: LUGAR.zonaCapsula, foco: capsula, piezas: [maniqui] };
      capsula.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });

  }

  // ---------------------------------------------------------------- plataformas
  crearHangar() {
    this.lucesNave = [];
    this.naves = {};
    const y = LUGAR.pies;
    NAVES.forEach(nave => {
      const x = LUGAR.naves[nave.id];
      // plataforma con franja de peligro, proporcional al ancho de la nave
      const pw = nave.w + 10, ph = Math.round(pw * 0.24);
      const g = this.add.graphics().setDepth(y - 2);
      g.fillStyle(0x1a1c2c).fillEllipse(x, y, pw, ph);
      g.fillStyle(0xffcd75).fillEllipse(x, y - 1, pw - 2, ph - 3);
      g.fillStyle(0x333c57).fillEllipse(x, y - 1, pw - 8, ph - 6);
      const plataforma = this.add.ellipse(x, y - 1, pw, ph - 1).setDepth(y - 1);
      const sprite = this.add.image(x, y, `nave_${nave.id}`).setOrigin(0.5, 1).setDepth(y);
      const luces = NAVE_EXTRA[nave.id].luces.map(([lx, ly], k) =>
        this.add.rectangle(lx, ly, 2, 2, k === 1 ? VERDE : ROJO).setDepth(y + 0.5));
      this.lucesNave.push(...luces.map((img, k) => ({ img, k, nave: nave.id })));
      const zona = { tipo: "nave", opcion: nave, x, y: y + 22, foco: plataforma, piezas: [sprite] };
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

    // cajas junto a la nave pequeña y un cono entre las plataformas (fuera de los pasillos)
    [[305, 104, 10], [314, 104, 8], [309, 94, 7]].forEach(([x, yy, t]) => {
      const c = this.add.graphics().setDepth(yy);
      c.fillStyle(0x1a1c2c).fillRect(x - t / 2 - 1, yy - t - 1, t + 2, t + 2);
      c.fillStyle(0xbe7a4a).fillRect(x - t / 2, yy - t, t, t);
      c.fillStyle(0xe0a46a).fillRect(x - t / 2, yy - t, t, 1);
      c.fillStyle(0x7a4a2a).fillRect(x - t / 2, yy - t / 2, t, 1);
    });
    this.add.image(240, 120, "cono").setOrigin(0.5, 1).setDepth(120);
  }

  // Compuerta: roja (luz grande y marco) mientras falte algo; verde con resplandor al estar listos
  crearCompuerta() {
    const { x, y } = LUGAR.compuerta;
    const g = this.add.graphics().setDepth(y - 1);
    g.fillStyle(0x1a1c2c).fillRect(x - 10, y - 17, 20, 34);
    g.fillStyle(0x566c86).fillRect(x - 8, y - 15, 7, 28);
    g.fillStyle(0x566c86).fillRect(x + 1, y - 15, 7, 28);
    g.fillStyle(0x94b0c2).fillRect(x - 8, y - 15, 1, 28).fillRect(x + 1, y - 15, 1, 28);   // brillo
    g.fillStyle(0x333c57).fillRect(x - 6, y - 8, 3, 6).fillRect(x + 3, y - 8, 3, 6);       // ventanitas
    for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? 0x1a1c2c : 0xffcd75).fillRect(x - 8 + i * 4, y + 13, 4, 3);
    this.resplandorCompuerta = this.add.ellipse(x - 6, y + 17, 36, 10, VERDE, 0.25).setDepth(-8).setVisible(false);
    this.marcoCompuerta = this.add.rectangle(x, y, 22, 36).setStrokeStyle(2, ROJO).setDepth(y);
    this.halo = this.add.rectangle(x, y - 22, 16, 7, ROJO, 0.3).setDepth(y);
    this.luzCompuerta = this.add.rectangle(x, y - 22, 12, 4, ROJO).setDepth(y + 0.1);
    this.tweens.add({ targets: this.halo, alpha: 0.05, duration: 600, yoyo: true, repeat: -1 });
    this.zonas.push({ tipo: "compuerta", x: x - 16, y: y + 8, r: 12 });
  }

  actualizarCompuerta() {
    const c = this.listos() ? VERDE : ROJO;
    this.marcoCompuerta.setStrokeStyle(2, c);
    this.luzCompuerta.setFillStyle(c);
    this.halo.setFillStyle(c, 0.3);
    this.resplandorCompuerta.setVisible(!!this.listos());
  }

  // ---------------------------------------------------------------- estaciones de prueba
  // Báscula y arco de radiación, abajo a la izquierda.
  crearEstaciones() {
    // rótulos: encima de cada estación su nombre, debajo de ambas "Prueba de traje"
    const B0 = LUGAR.bascula, A0 = LUGAR.arco;
    texto(this, B0.x, B0.y - 41, this.t.rotulo_bascula, { tam: 5, color: "#eef1ff" }).setDepth(B0.y);
    texto(this, A0.x, A0.y - 37, this.t.rotulo_arco, { tam: 5, color: "#eef1ff" }).setDepth(A0.y);
    texto(this, (B0.x + A0.x) / 2, B0.y + 5, this.t.zona_pruebas, { tam: 5, color: "#ffcd75" }).setDepth(-8);

    // báscula: plataforma y pantalla que muestra el peso en la Tierra y en la Luna
    const B = LUGAR.bascula, gb = this.add.graphics().setDepth(B.y - 4);
    gb.fillStyle(0x1a1c2c).fillRect(B.x - 1, B.y - 20, 3, 16);                 // poste
    gb.fillStyle(0x1a1c2c).fillRect(B.x - 15, B.y - 34, 30, 15);               // pantalla
    gb.fillStyle(0x0b1026).fillRect(B.x - 14, B.y - 33, 28, 13);
    const gp = this.add.graphics().setDepth(B.y - 6);
    gp.fillStyle(0x1a1c2c).fillRect(B.x - 10, B.y - 4, 21, 7);                 // plataforma
    gp.fillStyle(0x94b0c2).fillRect(B.x - 9, B.y - 3, 19, 4);
    gp.fillStyle(0xffcd75).fillRect(B.x - 9, B.y + 1, 19, 1);
    this.textoTierra = texto(this, B.x, B.y - 33, "-- kg", { tam: 5, color: "#5cff8a" }).setDepth(B.y - 3);
    this.textoLuna = texto(this, B.x, B.y - 27, "", { tam: 5, color: "#7ee6ff" }).setDepth(B.y - 3);
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

    // radar del polo sur: al acercarse, burbuja con un dato real
    const Rd = LUGAR.radar;
    this.marcoRadar = this.add.rectangle(Rd.cx, Rd.y + Rd.h / 2, Rd.w, Rd.h).setStrokeStyle(1, AMARILLO).setDepth(-5).setVisible(false);
    this.zonas.push({ tipo: "pantalla", x: Rd.cx + 2, y: LIMITES.y1, r: 13 });
  }

  // Flecha verde hacia la rampa, apagada hasta tener traje y nave
  crearFlechas() {
    this.flechaRampa = this.add.triangle(0, 0, 0, 8, 4, 0, 8, 8, VERDE).setDepth(-1).setVisible(false);
    this.parpadeoRampa = this.tweens.add({ targets: this.flechaRampa, alpha: 0.2, duration: 400, yoyo: true, repeat: -1, paused: true });
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

    // Bit, el robot del hangar
    this.sombraBit = this.add.ellipse(0, 0, 8, 3, 0x1a1c2c, 0.3);
    this.bit = this.add.image(LUGAR.entrada.x + 24, 112, "bit");
    this.dialogo = texto(this, 0, 0, "", { tam: TAM, ancho: 120, origenY: 1 })
      .setBackgroundColor("#1d2650").setPadding(2, 1).setDepth(1000).setVisible(false);
  }

  decir(frase, ms = 3000) {
    this.dialogo.setText(frase).setVisible(true);
    this.time.removeEvent(this.ocultarDialogo);
    this.ocultarDialogo = this.time.delayedCall(ms, () => this.dialogo.setVisible(false));
  }

  // Un técnico que camina alrededor de las naves y se detiene a revisarlas.
  // Su caja de herramientas queda junto a la nave grande.
  crearTecnico() {
    const C = LUGAR.caja;
    const caja = this.add.graphics().setDepth(C.y + 1);
    caja.fillStyle(0x1a1c2c).fillRect(C.x - 5, C.y - 6, 11, 7);
    caja.fillStyle(0xb13e53).fillRect(C.x - 4, C.y - 5, 9, 5);
    caja.fillStyle(0xef7d57).fillRect(C.x - 4, C.y - 5, 9, 1);
    caja.fillStyle(0xc2c3c7).fillRect(C.x - 1, C.y - 7, 3, 1);
    const [x, y] = LUGAR.rondaTecnico[0];
    this.sombraTecnico = this.add.ellipse(x, y, 14, 4, 0x1a1c2c, 0.4);
    this.tecnico = this.add.image(x, y, "astro_tecnico2_0").setOrigin(0.5, 1).setDepth(y);
    this.globoTecnico = texto(this, x, y - 26, "", { tam: TAM, ancho: 100, origenY: 1 })
      .setBackgroundColor("#3b2a1d").setPadding(2, 1).setDepth(1000).setVisible(false);
    this.ronda = { i: 0, paso: 1, espera: 1500, cuadro: 0, tiempo: 0 };
    this.indiceDato = 0;
    this.tecnicoEnfriar = 0;
    this.tecnicoHablando = 0;
  }

  actualizarTecnico(delta) {
    const tc = this.tecnico, R = this.ronda, puntos = LUGAR.rondaTecnico;
    this.tecnicoEnfriar -= delta;
    this.tecnicoHablando -= delta;
    const cerca = Phaser.Math.Distance.Between(this.astro.x, this.astro.y, tc.x, tc.y) < 22;
    if (cerca && this.tecnicoEnfriar <= 0 && this.controlActivo) {
      const datos = this.t.tecnicos;
      this.globoTecnico.setText(datos[this.indiceDato++ % datos.length]).setVisible(true);
      this.tecnicoHablando = 4500; this.tecnicoEnfriar = 8000;
    }
    if (this.tecnicoHablando <= 0) this.globoTecnico.setVisible(false);

    let camina = false;
    if (this.tecnicoHablando > 0) tc.setFlipX(this.astro.x < tc.x);       // se detiene y mira al niño
    else if (R.espera > 0) R.espera -= delta;                              // revisa la nave
    else {
      const [mx, my] = puntos[R.i];
      const dx = mx - tc.x, dy = my - tc.y, d = Math.hypot(dx, dy), v = 20 * delta / 1000;
      if (d <= v) {
        tc.setPosition(mx, my);
        if (R.i + R.paso < 0 || R.i + R.paso >= puntos.length) { R.paso *= -1; R.espera = 2000; }
        else if (R.i === 3 || R.i === 6) R.espera = 1500;                   // se detiene junto a cada nave
        R.i += R.paso;
      } else {
        tc.x += dx / d * v; tc.y += dy / d * v;
        if (Math.abs(dx) > 0.5) tc.setFlipX(dx < 0);
        camina = true;
      }
    }
    R.tiempo += delta;
    if (R.tiempo > (camina ? 200 : 600)) { R.tiempo = 0; R.cuadro = 1 - R.cuadro; }
    tc.setTexture(`astro_tecnico2_${camina || this.tecnicoHablando <= 0 ? R.cuadro : 0}`).setDepth(tc.y);
    this.sombraTecnico.setPosition(tc.x, tc.y).setDepth(tc.y - 0.5);
    this.globoTecnico.setPosition(Phaser.Math.Clamp(tc.x, 54, ANCHO - 54), tc.y - 26);
  }

  // ---------------------------------------------------------------- indicador
  // Arriba a la derecha: traje y nave (gris si falta, a color con palomita si
  // ya eligió) y el oxígeno con el que saldrá.
  crearIndicador() {
    const H = LUGAR.hud, prof = 2000;
    this.add.rectangle(H.x, H.y, H.w, H.h, 0x1a1c2c).setOrigin(0).setDepth(prof);
    this.add.rectangle(H.x + 1, H.y + 1, H.w - 2, H.h - 2, 0x1d2650).setOrigin(0).setStrokeStyle(1, 0x4fd1ff).setDepth(prof);
    this.hudTraje = this.add.image(H.x + 8, H.y + 7, "icono_traje").setDepth(prof + 1);
    this.hudNave = this.add.image(H.x + 20, H.y + 7, "icono_cohete").setDepth(prof + 1);
    this.hudPalomitaTraje = this.add.image(H.x + 12, H.y + 11, "palomita_chica").setDepth(prof + 2).setVisible(false);
    this.hudPalomitaNave = this.add.image(H.x + 24, H.y + 11, "palomita_chica").setDepth(prof + 2).setVisible(false);
    [this.hudTraje, this.hudNave].forEach(i => i.setTint(0x566c86).setAlpha(0.7));
    texto(this, H.x + 35, H.y + 4, "O", { tam: TAM, color: "#7ee6ff" }).setDepth(prof + 1);
    texto(this, H.x + 39, H.y + 7, "2", { tam: 4, color: "#7ee6ff" }).setDepth(prof + 1);   // subíndice
    this.o2Mostrado = this.oxigenoAlSalir();
    this.hudO2 = texto(this, H.x + 51, H.y + 4, String(this.o2Mostrado), { tam: TAM, color: "#eef1ff" }).setDepth(prof + 1);
  }

  // Oxígeno con el que saldrá: el actual + tanque de la mochila + extra de la nave
  oxigenoAlSalir() {
    return estado.oxigeno + (estado.lleva("oxigeno") ? O2_TANQUE : 0) + (this.naveElegida ? this.naveElegida.oxigenoExtra : 0);
  }

  actualizarIndicador() {
    const marcar = (img, palomita, listo) => {
      if (listo) img.clearTint().setAlpha(1); else img.setTint(0x566c86).setAlpha(0.7);
      palomita.setVisible(!!listo);
    };
    marcar(this.hudTraje, this.hudPalomitaTraje, this.trajeElegido);
    marcar(this.hudNave, this.hudPalomitaNave, this.naveElegida);

    // el oxígeno cambia con una animación corta y un aviso flotante (+20, -20…)
    const nuevo = this.oxigenoAlSalir(), cambio = nuevo - this.o2Mostrado;
    if (!cambio) return;
    const H = LUGAR.hud, contador = { v: this.o2Mostrado };
    this.o2Mostrado = nuevo;
    this.tweens.add({ targets: contador, v: nuevo, duration: 600, onUpdate: () => this.hudO2.setText(String(Math.round(contador.v))) });
    const aviso = texto(this, H.x + 51, H.y + H.h + 1, (cambio > 0 ? "+" : "") + cambio, { tam: TAM, color: cambio > 0 ? "#5cff8a" : "#ff5c5c" }).setDepth(2002);
    this.tweens.add({ targets: aviso, y: H.y + H.h + 8, alpha: 0, duration: 1200, onComplete: () => aviso.destroy() });
  }

  // ---------------------------------------------------------------- ambiente
  // Radar que gira, luces que parpadean, dron, vapor y polvo en la luz del ventanal.
  crearAmbiente() {
    this.gRadar = this.add.graphics().setDepth(-9.5);
    this.anguloRadar = 0;
    this.time.addEvent({ delay: 120, loop: true, callback: () => {
      const g = this.gRadar.clear(), { cx, cy } = LUGAR.radar;
      this.anguloRadar += 0.35;
      for (let k = 1; k <= 7; k++) g.fillStyle(0x7ee6ff, 0.9).fillRect(Math.round(cx + Math.cos(this.anguloRadar) * k), Math.round(cy + Math.sin(this.anguloRadar) * k), 1, 1);
      if (Math.sin(this.anguloRadar) < -0.3) g.fillStyle(0xffffff).fillRect(cx + 3, cy - 3, 2, 2);   // eco de Itzel
      // gráfica: barras y líneas que cambian
      g.fillStyle(0x0b1026).fillRect(204, 20, 24, 18);
      for (let i = 0; i < 4; i++) g.fillStyle(0x7ee6ff).fillRect(205, 22 + i * 3, 2 + Math.floor(Math.random() * 6), 1);
      for (let i = 0; i < 5; i++) {
        const h = 3 + Math.floor(Math.random() * 11);
        g.fillStyle(i % 2 ? 0x29adff : 0x7ee6ff).fillRect(214 + i * 3, 37 - h, 2, h);
      }
    } });

    // luces del techo con parpadeo leve
    this.focos = [];
    for (let x = 36; x < ANCHO; x += 64) this.focos.push(this.add.rectangle(x, 0, 10, 2, 0xfff27a).setOrigin(0).setDepth(-5));
    this.time.addEvent({ delay: 200, loop: true, callback: () =>
      this.focos.forEach(f => f.setAlpha(Math.random() < 0.08 ? 0.2 : 1)) });

    // haz de luz del ventanal con polvo flotando
    this.add.graphics().setDepth(-8).fillStyle(0xfff8d0, 0.06)
      .fillPoints([{ x: 245, y: 26 }, { x: 313, y: 26 }, { x: 262, y: 160 }, { x: 186, y: 160 }], true);
    this.polvo = Array.from({ length: 14 }, () => ({
      t: Math.random(), u: Math.random(), v: 0.03 + Math.random() * 0.04,
      img: this.add.rectangle(0, 0, 1, 1, 0xfff8d0).setOrigin(0).setAlpha(0.6).setDepth(500)
    }));

    // dron que revisa la nave grande (no pasa por el indicador)
    this.dron = this.add.image(184, 40, "dron").setDepth(400);
    this.rayoDron = this.add.rectangle(184, 44, 1, 14, 0x29adff, 0.5).setOrigin(0.5, 0).setDepth(399).setVisible(false);
    this.tweens.add({ targets: this.dron, x: 236, duration: 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut", hold: 1200, repeatDelay: 1200 });

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

  animarAmbiente(delta) {
    const dt = delta / 1000;
    this.polvo.forEach(p => {
      p.t += p.v * dt; p.u += Math.sin(p.t * 9) * 0.002;
      if (p.t > 1) { p.t = 0; p.u = Math.random(); }
      const y = 26 + p.t * 134, x0 = 245 - p.t * 59, ancho = 68 + p.t * 8;
      p.img.setPosition(Math.round(x0 + Phaser.Math.Clamp(p.u, 0, 1) * ancho), Math.round(y));
    });
    const sobreNave = Math.abs(this.dron.x - LUGAR.naves.grande) < 6;
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

  // ---------------------------------------------------------------- burbujas
  crearBurbujas() {
    // opción (traje o nave): ventaja en verde y costo en rojo
    this.burbuja = this.add.container(0, 0).setDepth(1001).setVisible(false);
    this.fondoBurbuja = this.add.rectangle(0, 0, 120, 34, COLOR.panel).setStrokeStyle(1, COLOR.borde).setOrigin(0.5, 0);
    this.bNombre = texto(this, 0, 2, "", { tam: TAM, ancho: 116 });
    this.bVentaja = texto(this, 0, 10, "", { tam: TAM, ancho: 116, color: "#5cff8a" });
    this.bCosto = texto(this, 0, 18, "", { tam: TAM, ancho: 116, color: "#ff5c5c" });
    this.bAccion = texto(this, 0, 26, "", { tam: TAM, ancho: 116, color: COLOR.tenue });
    this.burbuja.add([this.fondoBurbuja, this.bNombre, this.bVentaja, this.bCosto, this.bAccion]);

    // dato real del radar (polo sur lunar) con su fuente NASA
    // si datos.json no trae el dato (o no cargó), la escena sigue funcionando
    const dato = estado.datos?.polo_sur || { texto: this.t.tecnicos[0], fuente: "NASA", ejemplo: true };
    if (!estado.datos?.polo_sur) console.warn("[Equipo] falta datos.polo_sur en datos/datos.json: se usa un dato de ejemplo");
    // a la izquierda del radar, para no tapar el radar ni el indicador
    this.burbujaDato = this.add.container(78, 26).setDepth(1002).setVisible(false);
    const etiqueta = texto(this, 0, 3, dato.ejemplo ? this.t.dato_ejemplo : this.t.dato_real, { tam: TAM, color: "#ffcd75" });
    const cuerpo = texto(this, 0, 11, dato.texto, { tam: TAM, ancho: 140 });
    const fuente = texto(this, 0, 13 + cuerpo.height, dato.fuente, { tam: 5, ancho: 140, color: COLOR.tenue });
    const alto = Math.ceil(fuente.y + fuente.height + 3);
    const fondo = this.add.rectangle(0, 0, 148, alto, COLOR.panel).setStrokeStyle(1, AMARILLO).setOrigin(0.5, 0);
    this.burbujaDato.add([fondo, etiqueta, cuerpo, fuente]);
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
    // trajes: debajo de la rejilla; naves: arriba, entre el título y el indicador
    const x = Phaser.Math.Clamp(zona.x, 62, ANCHO - 62);
    this.burbuja.setPosition(x, zona.tipo === "traje" ? 132 : 18).setVisible(true);
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
    this.decir(this.llenar(this.t.bit_traje, { nombre: this.t.opciones[traje.id].nombre.toLowerCase() }));
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
    this.decir(this.llenar(this.t.bit_nave, { nombre: this.t.opciones[nave.id].nombre.toLowerCase() }));
    this.revisarListos();
  }

  listos() { return this.trajeElegido && this.naveElegida; }

  // Actualiza indicador y compuerta; con traje y nave, la nave elegida baja su rampa
  revisarListos() {
    this.actualizarIndicador();
    this.actualizarCompuerta();
    if (!this.listos()) return;
    const n = this.naves[this.naveElegida.id];
    if (this.rampa && this.rampa.nave === this.naveElegida.id) return;
    const primera = !this.rampa;
    if (this.rampa) { this.rampa.g.destroy(); this.zonas = this.zonas.filter(z => z.tipo !== "rampa"); }

    const g = this.add.graphics().setPosition(n.x, LUGAR.pies - 8).setDepth(LUGAR.pies + 1);
    for (let j = 0; j < 30; j++) {
      const w = 8 + Math.round(j * 0.2);
      g.fillStyle(0x1a1c2c).fillRect(-w / 2 - 1, j, w + 2, 1);
      g.fillStyle(j % 4 === 0 ? 0x566c86 : 0x94b0c2).fillRect(-w / 2, j, w, 1);
      g.fillStyle(0xffcd75).fillRect(-w / 2, j, 1, 1).fillRect(w / 2 - 1, j, 1, 1);
    }
    g.scaleY = 0;
    this.tweens.add({ targets: g, scaleY: 1, duration: 900, ease: "Bounce.easeOut" });
    this.rampa = { g, nave: this.naveElegida.id };
    this.zonas.push({ tipo: "rampa", x: n.x, y: LUGAR.pies + 26, r: 7 });

    this.flechaRampa.setPosition(n.x, LUGAR.pies + 34).setVisible(true);
    this.parpadeoRampa.resume();
    if (primera) this.time.delayedCall(1200, () => this.decir(this.t.bit_listos));
  }

  // Subir a la nave y despegar → Misión 4
  abordar() {
    if (!this.listos() || this.saliendo) return;
    this.saliendo = true;
    this.controlActivo = false;
    this.burbuja.setVisible(false);
    this.burbujaDato.setVisible(false);
    this.flechaRampa.setVisible(false);

    estado.traje = this.trajeElegido;
    estado.nave = this.naveElegida;
    estado.oxigeno += this.naveElegida.oxigenoExtra;
    const tanque = estado.lleva("oxigeno");
    if (tanque) { estado.oxigeno += O2_TANQUE; this.decir(this.t.bit_tanque); }
    estado.bitacora.push(`Equipo: ${this.t.opciones[this.trajeElegido.id].nombre} y ${this.t.opciones[this.naveElegida.id].nombre}.`);

    const n = this.naves[this.naveElegida.id];
    // sube por la rampa y entra
    this.tweens.add({ targets: this.astro, x: n.x, y: LUGAR.pies + 2, duration: 900, delay: tanque ? 900 : 200 });
    this.tweens.add({ targets: [this.astro, this.sombra, this.bit, this.sombraBit], alpha: 0, duration: 300, delay: tanque ? 1700 : 1000 });
    // la rampa se recoge, se encienden los motores y la nave despega
    this.time.delayedCall(tanque ? 2100 : 1400, () => {
      this.tweens.add({ targets: this.rampa.g, scaleY: 0, duration: 400 });
      const fuego = this.add.rectangle(n.x, LUGAR.pies, 8, 6, 0xffa300).setOrigin(0.5, 0).setDepth(n.sprite.depth - 0.1);
      this.time.addEvent({ delay: 60, loop: true, callback: () => fuego.setFillStyle(Math.random() < 0.5 ? 0xffa300 : 0xfff27a).setScale(0.8 + Math.random() * 0.5, 0.8 + Math.random()) });
      this.cameras.main.shake(1800, 0.004);
      this.tweens.add({ targets: [n.sprite, fuego, ...n.luces], y: "-=170", duration: 1800, delay: 500, ease: "Cubic.easeIn" });
      this.time.delayedCall(1900, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Viaje"));
      });
    });
  }

  // ---------------------------------------------------------------- movimiento
  // ¿Se puede pararse aquí sin atravesar nada?
  libre(x, y) {
    if (x < LIMITES.x1 || x > LIMITES.x2 || y < LIMITES.y1 || y > LIMITES.y2) return false;
    return !OBSTACULOS.some(([a, b, c, d]) =>
      x > a - MARGEN.x && x < c + MARGEN.x && y > b - MARGEN.arriba && y < d + MARGEN.abajo);
  }

  // ¿Hay camino recto (sin obstáculos) entre dos puntos?
  despejado(x1, y1, x2, y2) {
    const pasos = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2);
    for (let i = 1; i <= pasos; i++) if (!this.libre(x1 + (x2 - x1) * i / pasos, y1 + (y2 - y1) * i / pasos)) return false;
    return true;
  }

  // Busca un camino que rodee los obstáculos (cuadrícula de 4 px, 8 direcciones)
  buscarCamino(x0, y0, x1, y1) {
    if (this.despejado(x0, y0, x1, y1)) return [[x1, y1]];
    const cols = Math.ceil(ANCHO / CELDA), filas = Math.ceil(ALTO / CELDA);
    const celda = (x, y) => [Math.floor(x / CELDA), Math.floor(y / CELDA)];
    const centro = (i, j) => [i * CELDA + CELDA / 2, j * CELDA + CELDA / 2];
    const [si, sj] = celda(x0, y0), [ti, tj] = celda(x1, y1);
    const costo = new Float32Array(cols * filas).fill(Infinity), de = new Int32Array(cols * filas).fill(-1);
    const abiertos = [[0, si, sj]];
    costo[sj * cols + si] = 0;
    let llegada = -1;
    while (abiertos.length) {
      abiertos.sort((a, b) => a[0] - b[0]);
      const [, i, j] = abiertos.shift(), k = j * cols + i;
      if (i === ti && j === tj) { llegada = k; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= cols || nj >= filas) continue;
        const [cx, cy] = centro(ni, nj);
        if (!(ni === ti && nj === tj) && !this.libre(cx, cy)) continue;
        if (di && dj && (!this.libre(...centro(i + di, j)) || !this.libre(...centro(i, j + dj)))) continue;   // sin cortar esquinas
        const nk = nj * cols + ni, c = costo[k] + (di && dj ? 1.414 : 1);
        if (c < costo[nk]) { costo[nk] = c; de[nk] = k; abiertos.push([c + Math.hypot(ti - ni, tj - nj), ni, nj]); }
      }
    }
    if (llegada < 0) return null;
    const puntos = [];
    for (let k = llegada; k >= 0 && k !== sj * cols + si; k = de[k]) puntos.unshift(centro(k % cols, Math.floor(k / cols)));
    puntos[puntos.length - 1] = [x1, y1];
    // quita puntos intermedios cuando hay línea recta libre
    const ruta = [];
    let desde = [x0, y0], i = 0;
    while (i < puntos.length) {
      let j = puntos.length - 1;
      while (j > i && !this.despejado(desde[0], desde[1], puntos[j][0], puntos[j][1])) j--;
      ruta.push(puntos[j]); desde = puntos[j]; i = j + 1;
    }
    return ruta;
  }

  // El punto libre más cercano (si se hace clic encima de algo)
  puntoLibre(x, y) {
    if (this.libre(x, y)) return [x, y];
    for (let r = 2; r < 60; r += 2)
      for (let a = 0; a < 16; a++) {
        const px = x + Math.cos(a / 16 * Math.PI * 2) * r, py = y + Math.sin(a / 16 * Math.PI * 2) * r;
        if (this.libre(px, py)) return [px, py];
      }
    return [this.astro.x, this.astro.y];
  }

  caminarA(x, y, alLlegar) {
    const [fx, fy] = this.puntoLibre(Phaser.Math.Clamp(x, LIMITES.x1, LIMITES.x2), Phaser.Math.Clamp(y, LIMITES.y1, LIMITES.y2));
    this.ruta = this.buscarCamino(this.astro.x, this.astro.y, fx, fy) || [[fx, fy]];
    this.destino = { x: fx, y: fy };
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

    // Bit flota detrás del astronauta, con un poco de retraso
    const lado = this.astro.flipX ? 1 : -1;
    const cx = this.astro.x + lado * 16, piso = this.astro.y - 2;
    this.bit.x += (cx - this.bit.x) * Math.min(1, dt * 3);
    this.bit.y += (piso - 22 + Math.sin(tiempo / 250) * 2 - this.bit.y) * Math.min(1, dt * 3);
    this.bit.setFlipX(this.astro.flipX).setDepth(piso + 1);
    this.sombraBit.setPosition(this.bit.x, piso).setDepth(piso - 1);
    this.dialogo.setPosition(Phaser.Math.Clamp(this.bit.x, 64, ANCHO - 64), Math.max(this.bit.y - 10, 22));

    this.actualizarTecnico(delta);
    this.animarAmbiente(delta);
    if (this.controlActivo) this.revisarProximidad();
  }

  mover(dt) {
    let dx = 0, dy = 0;
    if (this.teclas.left.isDown) dx = -1;
    else if (this.teclas.right.isDown) dx = 1;
    if (this.teclas.up.isDown) dy = -1;
    else if (this.teclas.down.isDown) dy = 1;

    if (dx || dy) { this.destino = null; this.ruta = null; this.alLlegar = null; }
    else if (this.destino && this.ruta && this.ruta.length) {
      // sigue el camino punto por punto, rodeando lo que haya
      const [px, py] = this.ruta[0];
      const vx = px - this.astro.x, vy = py - this.astro.y;
      const d = Math.hypot(vx, vy);
      if (d < 2) {
        this.astro.setPosition(px, py);                   // justo en el punto del camino
        this.ruta.shift();
        if (this.ruta.length) return true;
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
    const nx = this.astro.x + (dx / n) * v * dt, ny = this.astro.y + (dy / n) * v * dt;
    if (this.ruta && this.ruta.length) {                  // tramo del camino ya revisado: libre de obstáculos
      this.astro.setPosition(nx, ny);
      if (dx) this.astro.setFlipX(dx < 0);
      return true;
    }
    // con flechas: se desliza a lo largo de los obstáculos en vez de atravesarlos
    let movio = false;
    if (this.libre(nx, this.astro.y)) { this.astro.x = nx; movio = true; }
    if (this.libre(this.astro.x, ny)) { this.astro.y = ny; movio = true; }
    if (!movio && this.destino) { this.ruta = this.buscarCamino(this.astro.x, this.astro.y, this.destino.x, this.destino.y); if (!this.ruta) this.destino = null; }
    if (dx) this.astro.setFlipX(dx < 0);
    return movio;
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
      if (a.tipo === "traje") a.foco.setFillStyle(0x4fd1ff, 0.10);
      if (a.tipo === "nave" && a.opcion !== this.naveElegida) a.foco.setStrokeStyle(0);
      if (a.tipo === "bascula") { this.textoTierra.setText("-- kg"); this.textoLuna.setText(""); }
      if (a.tipo === "pantalla") { this.marcoRadar.setVisible(false); this.burbujaDato.setVisible(false); }
    }
    this.activa = cerca;
    if (!cerca) return this.burbuja.setVisible(false);

    // Ilumina la nueva
    if (cerca.tipo === "traje") cerca.foco.setFillStyle(0xfff27a, 0.35);
    if (cerca.tipo === "nave" && cerca.opcion !== this.naveElegida) cerca.foco.setStrokeStyle(2, 0xfff27a);
    if (cerca.tipo === "bascula") {
      const traje = TRAJES.find(t => t.id === this.trajeVisible);
      const tierra = PESO_NINO + (traje ? traje.peso : 0), luna = Math.round(tierra * GRAVEDAD_LUNA);
      this.textoTierra.setText(this.llenar(this.t.pantalla_tierra, { kg: tierra }));
      this.textoLuna.setText(this.llenar(this.t.pantalla_luna, { kg: luna }));
      this.decir(this.llenar(this.t.bascula, { tierra, luna }) + " " + (traje ? this.t.bascula_luna : this.t.bascula_base), 5500);
    }
    if (cerca.tipo === "arco") this.decir(this.t["arco_" + this.trajeVisible], 4000);
    if (cerca.tipo === "pantalla") { this.marcoRadar.setVisible(true); this.burbujaDato.setVisible(true); this.decir(this.t.pista, 5500); }
    if (cerca.tipo === "compuerta") this.decir(this.listos() ? this.t.bit_listos : this.t.bit_falta);
    if (cerca.tipo === "rampa") return this.abordar();
    this.mostrarBurbuja(cerca);
  }
}
