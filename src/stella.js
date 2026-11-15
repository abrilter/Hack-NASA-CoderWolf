// STELLA, la asistente holográfica de la Misión 2. Dueño: Rol 3 (arte) y Rol 2.
// Lee: nada · Escribe: nada (personaje que usan CentroControl, Exterior y Huellas).
// Personaje en pixel art hecho con mapas de letras (como src/pixelart.js):
// se genera un spritesheet transparente "stella_sheet" (12 cuadros de 21×24)
// y sus animaciones. La clase Stella arma el holograma completo (plataforma,
// haces de luz, brillo, partículas, flotación) y expone estados:
//   reposo · saludo · hablando · pensando · explicando · alerta · exito
// y las transiciones aparecer() / despedida().
// No depende de la lógica de la mochila: solo recibe órdenes de la escena.
// TODO(Rol 3): si se dibuja un PNG, debe respetar este mismo orden de cuadros.

const AN = 21, AL = 24;          // tamaño de cada cuadro
const PALETA = {
  k: 0x29366f,                   // contorno (azul: se distingue sobre la pantalla oscura)
  W: 0xe8f4ff,                   // casco blanco azulado
  H: 0xffffff,                   // brillo
  L: 0x9fd3ff,                   // azul claro
  S: 0x0b1a3a,                   // pantalla del rostro
  c: 0x7ee6ff,                   // ojos y sonrisa cian
  y: 0xffcd75                    // antena y estrellas
};

// Cabeza (filas 0–14): casco, antena, auriculares con estrella y pantalla.
const cabeza = ([e1, e2], [m1, m2]) => [
  ".........kyk.........",
  "..........k..........",
  "......kkkkkkkkk......",
  "....kkWWHHWWWWWkk....",
  "...kWHHWWWWWWWWWWk...",
  "..kWWWkkkkkkkkkWWWk..",
  ".kkWWkSSSSSSSSSkWWkk.",
  "kLkWk" + e1 + "kWkLk",
  "kykWk" + e2 + "kWkyk",
  "kLkWkSSSSSSSSSSSkWkLk",
  "kLkWk" + m1 + "kWkLk",
  ".kkWk" + m2 + "kWkk.",
  "..kWWkkkkkkkkkkkWWk..",
  "...kWWWWWWWWWWWWWk...",
  "....kkkLLLLLLLkkk...."
];
// Cuerpo pequeño (filas 15–23) con la estrella del pecho
const CUERPO = [
  "......kkkkkkkkk......",
  "......kLWWyWWLk......",
  "......kLyyyyyLk......",
  "......kLWyyyWLk......",
  "......kLWyWyWLk......",
  "......kLLWWWLLk......",
  ".......kLLLLLk.......",
  "........kkkkk........",
  "....................."
];
const OJOS = {
  normal:     ["SSccSSSccSS", "SSccSSSccSS"],
  parpadeo:   ["SSSSSSSSSSS", "SScccScccSS"],
  feliz:      ["SSScSSScSSS", "SScScScScSS"],
  arriba:     ["SSccSSSccSS", "SSSSSSSSSSS"],
  preocupado: ["SSSScScSSSS", "SSccSSSccSS"]
};
const BOCAS = {
  sonrisa:    ["SSScSSScSSS", "SSSScccSSSS"],
  habla:      ["SSSScccSSSS", "SSSScccSSSS"],
  grande:     ["SScSSSSScSS", "SSScccccSSS"],
  neutra:     ["SSSSSSSSSSS", "SSSSScSSSSS"],
  preocupada: ["SSSSSSSSSSS", "SSScScScSSS"]
};
// Brazo izquierdo (columnas 0–5, filas 13–21). El derecho es su espejo.
// "." = no cambia el cuadro.
const BRAZOS = {
  abajo:    ["......", "......", "......", "...kkk", "..kWLk", "..kWLk", "..kWLk", "..kHHk", "...kk."],
  abiertos: ["......", "......", "......", "....kk", "...kWk", "..kWLk", ".kWLk.", ".kHHk.", "..kk.."],
  arriba1:  ["......", ".kHHk.", ".kWLk.", "..kWLk", "...kkk", "......", "......", "......", "......"],
  arriba2:  ["kHHk..", "kWLk..", ".kWLk.", "..kWLk", "...kkk", "......", "......", "......", "......"],
  senala:   ["......", "......", "......", ".kkkkk", "kHWWWk", "kHLLLk", ".kkkkk", "......", "......"]
};
// Cuadros: [ojos, boca, brazo izquierdo, brazo derecho]
const CUADROS = [
  ["normal", "sonrisa", "abajo", "abajo"],          // 0 reposo
  ["parpadeo", "sonrisa", "abajo", "abajo"],        // 1 parpadeo
  ["normal", "habla", "abajo", "abajo"],            // 2 hablando A
  ["normal", "sonrisa", "abiertos", "abiertos"],    // 3 hablando B
  ["feliz", "sonrisa", "arriba1", "abajo"],         // 4 saludo A
  ["feliz", "habla", "arriba2", "abajo"],           // 5 saludo B
  ["arriba", "neutra", "abajo", "abajo"],           // 6 pensando
  ["normal", "habla", "abajo", "senala"],           // 7 explicando A
  ["normal", "sonrisa", "abajo", "senala"],         // 8 explicando B
  ["preocupado", "preocupada", "abiertos", "abiertos"], // 9 alerta
  ["feliz", "grande", "arriba1", "arriba1"],        // 10 éxito A
  ["feliz", "grande", "arriba2", "arriba2"]         // 11 éxito B
];
// Animaciones: [cuadro, ms extra]
const ANIMS = {
  reposo:     { f: [[0, 2200], [1, 110], [0, 1500], [1, 110]], repeat: -1 },
  hablando:   { f: [[2, 140], [0, 120], [3, 160], [2, 140]], repeat: -1 },
  saludo:     { f: [[4, 170], [5, 170]], repeat: 3 },
  pensando:   { f: [[6, 1200], [1, 110]], repeat: -1 },
  explicando: { f: [[7, 180], [8, 200]], repeat: -1 },
  alerta:     { f: [[9, 400]], repeat: -1 },
  exito:      { f: [[10, 160], [11, 160]], repeat: 3 }
};
const DURACION = { saludo: 1600, exito: 1600, alerta: 1500, hablando: 1400 };

const PLATAFORMA = [
  "....kkkkkkkkkkkkk....",
  "..kkccccccccccccckk..",
  ".knnnnnnnnnnnnnnnnnk.",
  "..kkNNNNNNNNNNNNNkk..",
  "....kkkkkkkkkkkkk...."
];
const AVISO = ["...k...", "..kyk..", ".kykyk.", ".kykyk.", "kyyyyyk", "kyykyyk", "kkkkkkk"];
const ESTRELLITA = ["..y..", ".yyy.", "yyyyy", ".yyy.", ".y.y."];

// Una sola vez por juego: texturas transparentes y animaciones
export function crearTexturasStella(escena) {
  const tx = escena.textures;
  if (!tx.exists("stella_sheet")) {
    const lienzo = tx.createCanvas("stella_sheet", AN * CUADROS.length, AL);
    const ctx = lienzo.getContext();
    CUADROS.forEach((def, i) => {
      cuadro(def).forEach((fila, y) => [...fila].forEach((l, x) => {
        if (PALETA[l] === undefined) return;      // "." queda transparente
        ctx.fillStyle = "#" + PALETA[l].toString(16).padStart(6, "0");
        ctx.fillRect(i * AN + x, y, 1, 1);
      }));
      lienzo.add(i, 0, i * AN, 0, AN, AL);
    });
    lienzo.refresh();
  }
  dibujo(escena, "stella_plataforma", PLATAFORMA, { k: 0x1a1c2c, c: 0x7ee6ff, n: 0x29adff, N: 0x29366f });
  dibujo(escena, "stella_aviso", AVISO, { k: 0x1a1c2c, y: 0xffcd75 });
  dibujo(escena, "stella_estrella", ESTRELLITA, { y: 0xfff27a });
  Object.entries(ANIMS).forEach(([n, a]) => {
    if (escena.anims.exists("stella_" + n)) return;
    escena.anims.create({
      key: "stella_" + n, frameRate: 24, repeat: a.repeat,
      frames: a.f.map(([frame, duration]) => ({ key: "stella_sheet", frame, duration }))
    });
  });
}

function cuadro([ojos, boca, izq, der]) {
  const m = [...cabeza(OJOS[ojos], BOCAS[boca]), ...CUERPO].map(f => [...f]);
  const poner = (def, espejo) => def.forEach((fila, i) => [...fila].forEach((l, j) => {
    if (l !== ".") m[13 + i][espejo ? AN - 1 - j : j] = l;
  }));
  poner(BRAZOS[izq], false);
  poner(BRAZOS[der], true);
  return m.map(f => f.join(""));
}

function dibujo(escena, clave, mapa, paleta) {
  if (escena.textures.exists(clave)) return;
  const t = escena.textures.createCanvas(clave, mapa[0].length, mapa.length), ctx = t.getContext();
  mapa.forEach((fila, y) => [...fila].forEach((l, x) => {
    if (paleta[l] === undefined) return;
    ctx.fillStyle = "#" + paleta[l].toString(16).padStart(6, "0");
    ctx.fillRect(x, y, 1, 1);
  }));
  t.refresh();
}

// Holograma completo. (x, y) = centro de la plataforma.
export class Stella {
  constructor(escena, x, y, profundidad = 0) {
    crearTexturasStella(escena);
    this.e = escena;
    this.vivo = true;
    this.base = "reposo";
    this.eventos = [];
    this.c = escena.add.container(x, y).setDepth(profundidad);
    const add = o => { this.c.add(o); return o; };

    // brillo suave y haces verticales que salen de la plataforma
    this.brillo = [add(escena.add.ellipse(0, -13, 26, 28, 0x7ee6ff, 0.07)), add(escena.add.ellipse(0, -12, 18, 20, 0x7ee6ff, 0.09))];
    this.haces = [-8, -4, 0, 4, 8].map(dx => add(escena.add.rectangle(dx, -1, 1, 24, 0x7ee6ff, 0.16).setOrigin(0.5, 1)));
    add(escena.add.image(0, 0, "stella_plataforma"));

    // cuerpo flotante: sprite + indicadores que lo siguen
    this.cuerpo = add(escena.add.container(0, 0));
    this.sprite = escena.add.sprite(0, -2, "stella_sheet", 0).setOrigin(0.5, 1).setAlpha(0.93);
    this.antena = escena.add.rectangle(0, -25.5, 3, 1, 0xfff27a).setVisible(false);
    this.aviso = escena.add.image(12, -24, "stella_aviso").setVisible(false);
    this.puntos = [8, 11, 14].map((dx, i) => escena.add.rectangle(dx, -26 - i, 1, 1, 0x7ee6ff).setVisible(false));
    this.cuerpo.add([this.sprite, this.antena, this.aviso, ...this.puntos]);

    escena.tweens.add({ targets: this.cuerpo, y: -2, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    escena.tweens.add({ targets: this.brillo, alpha: { from: 0.05, to: 0.12 }, duration: 1300, yoyo: true, repeat: -1 });
    escena.tweens.add({ targets: this.antena, alpha: 0.2, duration: 220, yoyo: true, repeat: -1 });
    escena.tweens.add({ targets: this.aviso, y: -25, duration: 300, yoyo: true, repeat: -1 });
    this.puntos.forEach((p, i) => escena.tweens.add({ targets: p, alpha: 0.15, duration: 300, delay: i * 150, yoyo: true, repeat: -1 }));

    // partículas y destellos que suben por los haces
    this.cada(320, () => this.particula(Phaser.Math.Between(-9, 9), 0xbff3ff, 1, Phaser.Math.Between(14, 24)));
    this.cada(450, () => this.particula(Phaser.Utils.Array.GetRandom([-8, -4, 0, 4, 8]), 0x7ee6ff, 3, 25));

    this.sprite.play("stella_reposo");
    this.c.once("destroy", () => this.destruir(true));
  }

  cada(ms, fn) { this.eventos.push(this.e.time.addEvent({ delay: ms, loop: true, callback: fn })); }

  particula(x, color, alto, sube) {
    if (!this.vivo) return;
    const p = this.e.add.rectangle(x, -2, 1, alto, color, 0.7);
    this.c.addAt(p, 2);
    this.e.tweens.add({ targets: p, y: -2 - sube, alpha: 0, duration: 900 + sube * 20, onComplete: () => p.destroy() });
  }

  // Estado que se mantiene (por ejemplo, mientras se muestra una sección)
  estado(n) { this.base = n; this.mostrar(n); }

  // Reacción breve que luego vuelve al estado base
  reaccionar(n, ms) {
    if (!this.vivo) return;
    this.mostrar(n);
    this.vuelta?.remove();
    this.vuelta = this.e.time.delayedCall(ms ?? DURACION[n] ?? 1500, () => this.mostrar(this.base));
  }

  mostrar(n) {
    if (!this.vivo) return;
    this.vuelta?.remove();
    this.sprite.play("stella_" + n);
    this.antena.setVisible(n === "alerta");
    this.aviso.setVisible(n === "alerta");
    this.puntos.forEach(p => p.setVisible(n === "pensando"));
    if (n === "exito") this.estrellas();
  }

  estrellas() {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45, s = this.e.add.image(0, -16, "stella_estrella");
      this.cuerpo.add(s);
      this.e.tweens.add({ targets: s, x: Math.cos(a) * 16, y: -16 + Math.sin(a) * 14, alpha: 0, duration: 900, delay: i * 60, onComplete: () => s.destroy() });
    }
  }

  // Proyección gradual desde la plataforma
  aparecer(alTerminar) {
    if (!this.vivo) return;
    this.sprite.setScale(1, 0).setAlpha(0);
    this.haces.forEach(h => h.setAlpha(0));
    const barrido = this.e.add.rectangle(0, -1, 19, 1, 0xbff3ff, 0.9);
    this.c.add(barrido);
    this.e.tweens.add({ targets: barrido, y: -27, alpha: 0.2, duration: 380, onComplete: () => barrido.destroy() });
    this.e.tweens.add({ targets: this.haces, alpha: 1, duration: 250 });
    this.e.tweens.add({ targets: this.sprite, scaleY: 1, alpha: 0.93, duration: 380, ease: "Quad.easeOut", onComplete: () => alTerminar?.() });
  }

  // Saluda y se desvanece dentro de la plataforma
  despedida(alTerminar) {
    if (!this.vivo) return alTerminar?.();
    this.mostrar("saludo");
    this.e.time.delayedCall(700, () => {
      if (!this.vivo) return alTerminar?.();
      this.e.tweens.add({ targets: this.haces, alpha: 0, duration: 300 });
      this.e.tweens.add({ targets: this.sprite, scaleY: 0, alpha: 0, duration: 350, ease: "Quad.easeIn", onComplete: () => alTerminar?.() });
    });
  }

  destruir(porContenedor = false) {
    if (!this.vivo) return;
    this.vivo = false;
    this.eventos.forEach(e => e.remove());
    this.vuelta?.remove();
    this.e.tweens.killTweensOf([this.cuerpo, this.sprite, this.antena, this.aviso, ...this.puntos, ...this.brillo, ...this.haces]);
    if (!porContenedor) this.c.destroy();
  }
}
