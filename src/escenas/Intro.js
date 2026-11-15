// Misión 1a: la historia inicial como cuento animado. Dueño: Rol 5 (textos) y Rol 3 (fondos).
// Lee: textos.intro · Escribe: nada · Sigue: Carta.
// Cada página tiene su dibujo en pixel art (misma paleta y figuras que la Misión 3)
// y un cuadro de diálogo abajo que escribe el texto letra por letra.
// Clic, Enter o Espacio: completa el texto o pasa a la siguiente página.
import { ANCHO, ALTO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";
import { crearTexturasEquipo, crearTextura } from "../pixelart.js";

const K = 0x1a1c2c, CAJA = 128;   // contorno y dónde empieza el cuadro de diálogo

// Familia vista de espaldas, iluminada por la Luna (h pelo, n piel, S/s ropa, P pantalón, d zapatos)
const ADULTO = ["...hhhh...", "..hhhhhh..", "..hhhhhh..", "..hhhhhh..", "...hhhh...", "....nn....", "..SSSSSS..", ".SSSSSSSS.",
  ".SsSSSSsS.", ".SsSSSSsS.", ".SsSSSSsS.", ".nsSSSSsn.", "..SSSSSS..", "..PPPPPP..", "..PPPPPP..", "..PP..PP..",
  "..PP..PP..", "..PP..PP..", "..PP..PP..", "..dd..dd.."];
const MAMA = ["...hhhh...", "..hhhhhh..", "..hhhhhh..", "..hhhhhh..", "..hhhhhh..", ".hhhhhhhh.", ".hhSSSShh.", ".SSSSSSSS.",
  ".SsSSSSsS.", ".SsSSSSsS.", ".nsSSSSsn.", "..SSSSSS..", "..ssssss..", "..PPPPPP..", "..PP..PP..", "..PP..PP..",
  "..PP..PP..", "..dd..dd.."];
const NINO = ["........n", ".......n.", "..hhh.n..", ".hhhhhS..", ".hhhhhS..", "..hhhS...", ".SSSSS...", "SSSSSS...",
  "nsSSsS...", ".SSSS....", ".PPPP....", ".PP.PP...", ".PP.PP...", ".dd.dd..."];
const FAMILIA = {
  papa: [ADULTO, { h: 0x333c57, n: 0x8f563b, S: 0x3b5dc9, s: 0x29366f, P: 0x333c57, d: 0x1a1c2c }],
  mama: [MAMA, { h: 0x5d275d, n: 0x8f563b, S: 0xb13e53, s: 0x5d275d, P: 0x29366f, d: 0x1a1c2c }],
  nino: [NINO, { h: 0x333c57, n: 0xb86f50, S: 0xef7d57, s: 0xb13e53, P: 0x3b5dc9, d: 0x1a1c2c }]
};

// Estrellas que parpadean (también se usan en la Carta)
export function estrellas(escena, n = 50, alto = ALTO) {
  for (let i = 0; i < n; i++) {
    const s = escena.add.rectangle(Phaser.Math.Between(0, ANCHO), Phaser.Math.Between(0, alto), 1, 1, i % 6 ? 0xeef1ff : 0xffcd75);
    escena.tweens.add({ targets: s, alpha: 0.15, duration: Phaser.Math.Between(400, 1600), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
  }
}

export class Intro extends Phaser.Scene {
  constructor(clave = "Intro") { super(clave); }

  create() {
    crearTexturasEquipo(this);
    Object.entries(FAMILIA).forEach(([id, [mapa, paleta]]) => crearTextura(this, "fam_" + id, mapa, paleta));
    this.paso = 0;
    const avanzar = () => this.avanzar?.();
    this.input.on("pointerdown", avanzar);
    this.input.keyboard.on("keydown-ENTER", avanzar);
    this.input.keyboard.on("keydown-SPACE", avanzar);
    this.mostrar();
  }

  mostrar() {
    const p = this.paginas()[this.paso];
    if (!p) return this.alTerminar();
    this.tweens.killAll(); this.time.removeAllEvents(); this.children.removeAll(true);
    this.cameras.main.fadeIn(300);
    this.dibujar(this.paso);
    this.dialogo(typeof p === "string" ? { titulo: "Control de Misión", texto: p } : p);
  }

  // Las escenas hijas (Senal) cambian estas tres
  paginas() { return estado.textos.intro; }
  dibujar(i) { [this.noche, this.alerta, this.problemas, this.control][i]?.call(this); }
  alTerminar() {
    this.avanzar = null;
    this.cameras.main.fadeOut(400);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena("Intro")));
  }

  // Tramado pixel: pinta en g un rectángulo con puntos alternados
  trama(g, color, x, y, w, h) {
    g.fillStyle(color);
    for (let j = y; j < y + h; j++) for (let i = x + (j % 2); i < x + w; i += 2) g.fillRect(i, j, 1, 1);
  }

  // Cordillera de 1 px de ancho con ladera iluminada (como en el Aterrizaje)
  cordillera(g, base, altura, color, luz, hasta = CAJA) {
    for (let x = 0; x < ANCHO; x++) {
      const y = Math.round(base - altura(x));
      g.fillStyle(color).fillRect(x, y, 1, hasta - y);
      g.fillStyle(altura(x + 1) > altura(x) ? luz : color).fillRect(x, y, 1, 2);
    }
  }

  tierra(g, x, y, r) {
    this.bola(g, 0x1d2650, x, y, r + 2, r + 2, false, 0.6);                    // atmósfera
    this.bola(g, 0x1d2b53, x, y, r); this.bola(g, 0x29adff, x - 2, y, r - 2);   // noche y día
    this.bola(g, 0x38b764, x - 5, y - 2, 3, 2); this.bola(g, 0x38b764, x, y + 4, 2, 3); this.bola(g, 0x38b764, x - 1, y - 6, 2, 1);
    g.fillStyle(0xf4f4f4).fillRect(x - r + 3, y + 2, 5, 1).fillRect(x - 4, y - r + 3, 6, 1).fillRect(x + 1, y, 3, 1);
  }

  // ---------------------------------------------------------------- diálogo
  dialogo(p) {
    const g = this.add.graphics().setDepth(100);
    g.fillStyle(K).fillRect(4, CAJA, ANCHO - 8, ALTO - CAJA - 3);
    g.fillStyle(COLOR.panel).fillRect(5, CAJA + 1, ANCHO - 10, ALTO - CAJA - 5);
    g.lineStyle(1, COLOR.borde).strokeRect(5.5, CAJA + 1.5, ANCHO - 11, ALTO - CAJA - 6);
    texto(this, 12, CAJA - 6, p.titulo || "", { tam: 8, color: COLOR.titulo, origenX: 0, align: "left" })
      .setBackgroundColor("#1a1c2c").setPadding(3, 1).setDepth(101);
    const cuerpo = texto(this, 13, CAJA + 9, "", { tam: 7, ancho: ANCHO - 26, origenX: 0, align: "left" }).setDepth(101);
    const flecha = texto(this, ANCHO - 14, ALTO - 13, "▼", { tam: 6, color: COLOR.titulo }).setDepth(101).setVisible(false);
    this.tweens.add({ targets: flecha, y: "+=2", duration: 300, yoyo: true, repeat: -1 });

    let n = 0;
    const fin = () => { escribir.remove(); cuerpo.setText(p.texto); flecha.setVisible(true); n = p.texto.length; };
    const escribir = this.time.addEvent({ delay: 28, repeat: p.texto.length - 1,
      callback: () => (++n >= p.texto.length ? fin() : cuerpo.setText(p.texto.slice(0, n))) });
    this.avanzar = () => (n < p.texto.length ? fin() : (this.paso++, this.mostrar()));
  }

  // ---------------------------------------------------------------- dibujos
  // Ayudantes pixel: todo se pinta en filas de 1 px para que se vea nítido
  bola(g, color, cx, cy, rx, ry = rx, soloArriba = false, alfa = 1) {
    g.fillStyle(color, alfa);
    for (let dy = -ry; dy <= (soloArriba ? 0 : ry); dy++) {
      const w = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2));
      g.fillRect(Math.round(cx) - w, Math.round(cy) + dy, 2 * w + 1, 1);
    }
  }

  cielo(g, franjas) {
    g.fillStyle(0x05070f).fillRect(0, 0, ANCHO, CAJA);
    franjas.forEach(([y, c]) => { this.trama(g, c, 0, y, ANCHO, 4); g.fillStyle(c).fillRect(0, y + 4, ANCHO, CAJA); });
    // Vía Láctea: banda diagonal de puntitos
    const R = Phaser.Math.RND;
    for (let i = 0; i < 500; i++) {
      const x = R.between(0, ANCHO), y = Math.round(x * 0.22 + 4 + (R.frac() + R.frac() + R.frac() - 1.5) * 22);
      if (y > 0 && y < 70) g.fillStyle(R.pick([0x1d2650, 0x29366f, 0x3b2a5d, 0x5d275d]), 0.8).fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 6; i++) {   // estrellas grandes en cruz
      const x = R.between(10, ANCHO - 10), y = R.between(4, 60);
      g.fillStyle(0x94b0c2).fillRect(x - 1, y, 3, 1).fillRect(x, y - 1, 1, 3).fillStyle(0xffffff).fillRect(x, y, 1, 1);
    }
  }

  crater(g, x, y, w, h = Math.max(3, Math.round(w / 3))) {
    this.bola(g, 0xc2c3c7, x, y + 1, w / 2, h);           // borde iluminado abajo
    this.bola(g, 0x566c86, x, y, w / 2, h);
    this.bola(g, 0x333c57, x, y - 1, w / 2 - 1, h - 1);   // interior en sombra
  }

  // 1. Noche de estrellas: la familia mira pasar la Estación Espacial
  noche() {
    Phaser.Math.RND.sow(["noche"]);
    const g = this.add.graphics();
    this.cielo(g, [[52, 0x080b1a], [72, 0x0b1026], [88, 0x111838]]);
    estrellas(this, 50, 95);
    const f = this.add.graphics();
    // Luna llena con halo y mares
    this.bola(f, 0x1d2650, 272, 24, 13); this.bola(f, 0x29366f, 272, 24, 11);
    this.bola(f, 0xc2c3c7, 272, 24, 9); this.bola(f, 0xf4f4f4, 271, 23, 8);
    [[268, 21, 2], [274, 27, 2], [275, 20, 1], [269, 28, 1]].forEach(([x, y, r]) => this.bola(f, 0xc2c3c7, x, y, r));
    // pueblo lejano: casitas con ventanas encendidas
    const lejos = x => 12 + 7 * Math.sin(x / 31) + 4 * Math.sin(x / 11 + 1);
    this.cordillera(f, 104, lejos, 0x1d2650, 0x29366f);
    [[22, 0], [34, 2], [48, 1], [214, 2], [228, 0], [292, 1], [306, 3]].forEach(([x, d]) => {
      const y = Math.round(104 - lejos(x)) + 4 + d;
      f.fillStyle(0x111838).fillRect(x - 5, y, 11, 8);
      for (let i = 0; i < 4; i++) f.fillRect(x - 5 + i, y - 1 - i, 11 - 2 * i, 1);   // techo
      f.fillStyle(0xffcd75).fillRect(x - 3, y + 2, 2, 2).fillStyle(0xffa300).fillRect(x + 2, y + 2, 2, 3);
    });
    // colina donde está la familia, con pasto iluminado por la Luna
    const colina = x => 10 + 14 * Math.exp(-(((x - 160) / 80) ** 2));
    this.cordillera(f, CAJA, colina, 0x0b1026, 0x29366f);
    for (let x = 0; x < ANCHO; x += 2) f.fillStyle(0x1d2650).fillRect(x, Math.round(CAJA - colina(x)) - 1 - (x % 3 === 0 ? 1 : 0), 1, 2);
    // árbol a la izquierda
    f.fillStyle(0x080b1a).fillRect(58, 88, 3, 22);
    [[59, 82, 10, 7], [52, 88, 7, 5], [66, 87, 7, 5], [59, 76, 7, 5]].forEach(([x, y, rx, ry]) => this.bola(f, 0x080b1a, x, y, rx, ry));
    [[55, 78], [62, 75], [51, 85], [67, 83]].forEach(([x, y]) => f.fillStyle(0x1d2650).fillRect(x, y, 2, 1));
    // telescopio en tripié
    f.fillStyle(0x566c86).fillRect(186, 96, 1, 8).fillRect(184, 99, 1, 6).fillRect(188, 99, 1, 6);
    for (let i = 0; i < 7; i++) f.fillStyle(i < 2 ? 0x94b0c2 : 0xc2c3c7).fillRect(183 + i, 95 - i, 2, 2);
    // la familia, de espaldas, mirando al cielo
    const suelo = x => Math.round(CAJA - colina(x)) + 1;
    [["papa", 140], ["mama", 170], ["nino", 155]].forEach(([id, x]) => this.add.image(x, suelo(x), "fam_" + id).setOrigin(0.5, 1));
    // luciérnagas
    for (let i = 0; i < 7; i++) {
      const l = this.add.rectangle(Phaser.Math.Between(20, 300), Phaser.Math.Between(96, 122), 1, 1, 0xfff27a);
      this.tweens.add({ targets: l, x: `+=${Phaser.Math.Between(-14, 14)}`, y: `-=${Phaser.Math.Between(3, 8)}`, alpha: 0.1,
        duration: Phaser.Math.Between(1200, 2400), yoyo: true, repeat: -1 });
    }
    // la luz que cruza muy rápido: la Estación Espacial con su estela
    const iss = this.add.rectangle(-6, 78, 2, 1, 0xffffff).setDepth(5);
    this.tweens.add({ targets: iss, x: ANCHO + 6, y: 14, duration: 2600, repeat: -1, repeatDelay: 1600 });
    this.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (iss.x < 0 || iss.x > ANCHO) return;
      const e = this.add.rectangle(iss.x, iss.y, 1, 1, 0xfff27a).setDepth(4);
      this.tweens.add({ targets: e, alpha: 0, duration: 450, onComplete: () => e.destroy() });
    } });
  }

  // Superficie del polo sur con la base, la Tierra y el Sol
  luna() {
    Phaser.Math.RND.sow(["luna"]);
    const c = this.add.graphics();
    this.cielo(c, [[54, 0x080b1a], [66, 0x0b1026]]);
    this.tierra(c, 272, 30, 11);
    estrellas(this, 40, 70);
    // Sol con halo que palpita (detrás de las montañas)
    const halo = this.add.graphics();
    [[44, 0.12], [38, 0.2], [33, 0.3]].forEach(([r, a]) => this.bola(halo, 0xff8a5c, 0, 0, r, r, false, a));
    this.tweens.add({ targets: halo, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    const g = this.add.graphics();
    this.bola(g, 0xffa300, 0, 0, 28); this.bola(g, 0xffcd75, 0, 0, 25); this.bola(g, 0xfff27a, -3, -3, 17);
    // macizo lejano y colinas cercanas
    this.cordillera(g, 90, x => 14 + 7 * Math.sin(x / 37) + 5 * Math.sin(x / 13 + 1) + 2 * Math.sin(x / 5), 0x29366f, 0x566c86);
    this.cordillera(g, 102, x => 6 + 4 * Math.sin(x / 23 + 2) + 2 * Math.sin(x / 9), 0x333c57, 0x94b0c2);
    // suelo con tramado, rocas y cráteres
    g.fillStyle(0x94b0c2).fillRect(0, 100, ANCHO, CAJA - 100).fillStyle(0xc2c3c7).fillRect(0, 100, ANCHO, 1);
    for (let y = 103; y < CAJA; y++) for (let x = 0; x < ANCHO; x++) if ((x * 7 + y * 13) % 11 === 0) g.fillStyle(0x8796b0).fillRect(x, y, 1, 1);
    [[22, 122, 18], [124, 106, 10], [300, 108, 12], [196, 124, 12]].forEach(([x, y, w]) => this.crater(g, x, y, w));
    [[110, 116], [170, 122], [282, 122], [12, 106], [212, 105]].forEach(([x, y]) => {
      g.fillStyle(0x566c86).fillRect(x, y, 4, 2).fillRect(x + 1, y - 1, 2, 1).fillStyle(0xc2c3c7).fillRect(x + 1, y - 1, 1, 1);
    });
    // cráter grande en sombra permanente con brillitos de hielo
    this.bola(g, 0xc2c3c7, 244, 115, 30, 8); this.bola(g, 0x333c57, 244, 114, 29, 7); this.bola(g, 0x0b1026, 245, 113, 26, 5);
    [[232, 113], [244, 112], [255, 114], [238, 115]].forEach(([x, y], i) => {
      const h = this.add.rectangle(x, y, 1, 1, 0xbff3ff);
      this.tweens.add({ targets: h, alpha: 0.1, duration: 700 + i * 230, yoyo: true, repeat: -1 });
    });
    // base: módulo con domo, ventanas y paneles solares
    const r = (col, x, y, w, h) => g.fillStyle(col).fillRect(x, y, w, h);
    this.bola(g, K, 58, 92, 21, 13, true); this.bola(g, 0xc2c3c7, 58, 92, 20, 12, true); this.bola(g, 0xf4f4f4, 54, 88, 12, 6, true);
    r(K, 37, 92, 43, 13); r(0xc2c3c7, 38, 92, 41, 12); r(0x94b0c2, 38, 99, 41, 5);
    [44, 50, 66, 72].forEach(x => { r(K, x - 1, 93, 5, 4); r(0xffcd75, x, 94, 3, 2); });
    r(K, 54, 92, 9, 13); r(0x333c57, 55, 93, 7, 12); r(0x29adff, 57, 95, 3, 2);
    [0, 1, 2].forEach(i => r(0x566c86, 53 + 2 * i, 105 + i, 11 - 4 * i, 1));   // escalones
    for (let p = 0; p < 2; p++) {   // paneles solares a la izquierda
      const x = 6 + p * 15;
      r(0x566c86, x + 6, 96, 1, 9); r(K, x, 88, 13, 8); r(0x29366f, x + 1, 89, 11, 6);
      for (let i = 1; i < 11; i += 3) r(0x29adff, x + i, 89, 1, 6);
      r(0x29adff, x + 1, 91, 11, 1);
    }
    // torre de radio con antena parabólica y luz roja
    for (let y = 64; y < 105; y++) { r(0x566c86, 88, y, 1, 1); r(0x566c86, 94, y, 1, 1); r(0x333c57, 89 + ((y >> 1) % 5), y, 1, 1); }
    this.bola(g, 0xc2c3c7, 92, 62, 6, 3, true); r(0x94b0c2, 86, 62, 13, 1); r(0x566c86, 91, 56, 1, 6);
    const luz = this.add.rectangle(91, 55, 2, 2, 0xff5c5c);
    this.tweens.add({ targets: luz, alpha: 0.1, duration: 500, yoyo: true, repeat: -1 });
    r(0xc2c3c7, 104, 88, 1, 17); r(0xf4f4f4, 105, 88, 7, 5); r(0x29adff, 105, 90, 7, 1);   // bandera
    // vehículo explorador
    r(K, 14, 106, 20, 7); r(0xffcd75, 15, 107, 18, 5); r(0xffa300, 15, 110, 18, 2); r(0x566c86, 20, 104, 7, 3);
    [17, 24, 31].forEach(x => { this.bola(g, K, x, 113, 2); r(0x566c86, x, 113, 1, 1); });
    // huellas de la base hacia Itzel
    for (let x = 66; x < 146; x += 6) r(0x8796b0, x, 108 + (x % 12 ? 0 : 1), 2, 1);
    this.bola(g, K, 150, 112, 7, 1, false, 0.5);
    this.itzel = this.add.image(150, 112, "astro_ligero_0").setOrigin(0.5, 1);
    return g;
  }

  // 2. Noticia urgente: Chispa detecta la tormenta solar
  alerta() {
    this.luna();
    const chispa = this.add.image(176, 104, "chispa_px");
    this.tweens.add({ targets: chispa, y: 100, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const aviso = texto(this, 176, 82, "!", { tam: 12, color: "#ff5c5c" });
    this.tweens.add({ targets: aviso, alpha: 0, duration: 250, yoyo: true, repeat: -1 });
    // partículas de la tormenta saliendo del Sol
    this.time.addEvent({ delay: 90, loop: true, callback: () => {
      const p = this.add.rectangle(20, Phaser.Math.Between(4, 60), 3, 1, Phaser.Math.RND.pick([0xff8a5c, 0xffcd75]));
      this.tweens.add({ targets: p, x: ANCHO + 4, y: `+=${Phaser.Math.Between(10, 50)}`, duration: 1400, onComplete: () => p.destroy() });
    } });
  }

  // 3. Problemas: radio rota, Chispa cae al cráter, el oxígeno se acaba
  problemas() {
    const g = this.luna();
    this.cameras.main.shake(500, 0.006);
    // chispas en la antena rota
    this.time.addEvent({ delay: 160, loop: true, callback: () => {
      const s = this.add.rectangle(92 + Phaser.Math.Between(-5, 5), 60 + Phaser.Math.Between(-3, 3), 1, 1, 0xfff27a).setDepth(2);
      this.time.delayedCall(140, () => s.destroy());
    } });
    // cráter y Chispa cayendo
    const chispa = this.add.image(214, 104, "chispa_px");
    this.tweens.add({ targets: chispa, x: 244, y: 114, angle: 360, scale: 0.4, alpha: 0, duration: 1200, delay: 600,
      repeat: -1, repeatDelay: 900 });
    // barra de oxígeno de Itzel bajando
    this.add.rectangle(150, 74, 24, 4, K).setStrokeStyle(1, COLOR.borde);
    const o2 = this.add.rectangle(139, 74, 22, 2, COLOR.oxigeno).setOrigin(0, 0.5);
    texto(this, 150, 64, "O2", { tam: 6 });
    this.tweens.add({ targets: o2, width: 3, fillColor: 0xff5c5c, duration: 2500, yoyo: true, repeat: -1, hold: 600 });
    this.tweens.add({ targets: this.itzel, angle: 4, duration: 400, yoyo: true, repeat: -1 });
  }

  // 4. Se busca rescatista: el Control de Misión (misma pared que la Misión 3)
  control(anuncio = "SE BUSCA\nRESCATISTA", color = COLOR.titulo) {
    const g = this.add.graphics();
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    r(0x2a3a7a, 0, 0, ANCHO, 100);
    for (let y = 4; y < 94; y += 8) for (let x = 0; x < ANCHO; x += 8) {
      r(0x3a4f99, x, y, 8, 1); r(0x3a4f99, x, y, 1, 8); r(0x22306a, x, y + 7, 8, 1); r(0x22306a, x + 7, y, 1, 8);
    }
    r(K, 0, 0, ANCHO, 4);
    for (let x = 36; x < ANCHO; x += 64) { r(0xffcd75, x, 0, 10, 2); r(0xfff27a, x + 2, 0, 6, 1); }
    r(K, 0, 94, ANCHO, 6);
    for (let x = 2; x < ANCHO; x += 8) r(0xffcd75, x, 96, 4, 3);
    r(0x333c57, 0, 100, ANCHO, CAJA - 100);
    for (let x = 0; x < ANCHO; x += 16) r(0x29366f, x, 100, 1, CAJA - 100);
    // monitor grande con el anuncio
    r(K, 98, 12, 124, 72); r(0x0b1026, 100, 14, 120, 68);
    g.lineStyle(1, COLOR.borde).strokeRect(100.5, 14.5, 119, 67);
    const aviso = texto(this, 160, 20, anuncio, { tam: 8, color });
    this.tweens.add({ targets: aviso, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    // radar: barrido verde en un monitor pequeño de la pared
    r(K, 18, 20, 44, 34); r(0x0b1026, 20, 22, 40, 30);
    g.lineStyle(1, 0x257179).strokeCircle(40, 37, 12).strokeCircle(40, 37, 6);
    const barrido = this.add.rectangle(40, 37, 12, 1, 0x5cff8a).setOrigin(0, 0.5);
    this.tweens.add({ targets: barrido, angle: 360, duration: 2000, repeat: -1 });
    // consola con botones que parpadean
    r(K, 236, 30, 70, 24); r(0x1d2650, 237, 31, 68, 22);
    [0xff5c5c, 0x5cff8a, 0xffcd75, 0x29adff].forEach((c, i) => {
      const b = this.add.rectangle(245 + i * 16, 42, 6, 4, c);
      this.tweens.add({ targets: b, alpha: 0.25, duration: 300 + i * 170, yoyo: true, repeat: -1 });
    });
    if (color === COLOR.titulo) this.add.image(160, 80, "astro_base_0").setOrigin(0.5, 1).setTintFill(0x29366f);
    else this.add.image(160, 70, "chispa_px").setScale(2);   // en la alerta: el collar de Chispa
    const duda = texto(this, 160, 52, "?", { tam: 12, color: "#4fd1ff" });
    this.tweens.add({ targets: duda, y: 49, duration: 400, yoyo: true, repeat: -1 });
    // técnicos caminando
    [["astro_tecnico_0", 30, 80], ["astro_tecnico2_0", 290, 240]].forEach(([clave, x1, x2]) => {
      const t = this.add.image(x1, 120, clave).setOrigin(0.5, 1).setFlipX(x2 < x1);
      this.tweens.add({ targets: t, x: x2, duration: 2200, yoyo: true, repeat: -1, hold: 500, repeatDelay: 500,
        onYoyo: () => t.toggleFlipX(), onRepeat: () => t.toggleFlipX() });
    });
  }
}
