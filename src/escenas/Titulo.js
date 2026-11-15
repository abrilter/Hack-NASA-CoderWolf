// Pantalla de título, como el inicio de una película. Dueño: Rol 5 (textos) y Rol 3 (arte).
// Lee: textos.pantalla_titulo · Escribe: nada · Sigue: Intro.
// Cielo con estrellas, el borde de la Luna y un rover que cruza el horizonte.
// Primero "… presenta", luego el nombre del juego en letras pixel amarillas
// (fuente de 5×7 dibujada con mapas de letras, como el resto del arte) y al
// final "Toca o presiona Enter". El primer toque salta la animación; el
// segundo empieza la historia.
import { ANCHO, ALTO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";
import { crearTextura } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";
import { estrellas } from "./Intro.js";

// Fuente pixel de 5×7 ("#" = pixel). El apóstrofo y el espacio son más angostos.
const FUENTE = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."], D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"], F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."], H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"], J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"], L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"], N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"], R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."], T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"], X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."], Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "'": ["##", "##", ".#", "#.", "..", "..", ".."], " ": ["...", "...", "...", "...", "...", "...", "..."]
};
// Amarillo con brillo arriba y naranja abajo, contorno oscuro y sombra morada
const PALETA = { W: 0xfff6d5, Y: 0xfff27a, M: 0xffd45c, O: 0xffa300, k: 0x1a1c2c, s: 0x5d275d };
const FILA_COLOR = ["W", "Y", "Y", "M", "M", "O", "O"];

// Mapa de letras del nombre: letras, contorno (k) y sombra 2 filas abajo (s)
function mapaDelNombre(nombre) {
  const glifos = [...nombre.toUpperCase()].map(c => FUENTE[c]).filter(Boolean);
  const filas = Array.from({ length: 7 }, (_, y) => glifos.map(g => g[y]).join("."));
  const W = filas[0].length + 2, H = 7 + 4;
  const letra = (x, y) => y >= 1 && y <= 7 && x >= 1 && x <= W - 2 && filas[y - 1][x - 1] === "#";
  const mapa = [];
  for (let y = 0; y < H; y++) {
    let fila = "";
    for (let x = 0; x < W; x++) {
      const borde = [-1, 0, 1].some(dx => [-1, 0, 1].some(dy => letra(x + dx, y + dy)));
      if (letra(x, y)) fila += FILA_COLOR[y - 1];
      else if (borde) fila += "k";                                  // contorno (también dentro de las letras)
      else if (letra(x, y - 2) || letra(x - 1, y - 2)) fila += "s";  // sombra debajo del contorno
      else fila += ".";
    }
    mapa.push(fila);
  }
  return mapa;
}

export class Titulo extends Phaser.Scene {
  constructor() { super("Titulo"); }

  create() {
    const t = estado.textos.pantalla_titulo;
    this.listo = false;               // Phaser reutiliza la escena: se reinicia aquí
    this.saliendo = false;
    crearTexturasExterior(this);
    const clave = "titulo_" + t.nombre;
    crearTextura(this, clave, mapaDelNombre(t.nombre), PALETA);

    this.add.rectangle(0, 0, ANCHO, ALTO, 0x05070f).setOrigin(0);
    estrellas(this, 70, ALTO);
    this.dibujarLuna();
    this.crearRover();
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.estrellaFugaz() });

    // franjas de cine arriba y abajo
    const franjas = [this.add.rectangle(0, 0, ANCHO, 16, 0x000000).setOrigin(0, 1), this.add.rectangle(0, ALTO, ANCHO, 16, 0x000000).setOrigin(0, 0)];
    franjas.forEach(f => f.setDepth(50));
    this.tweens.add({ targets: franjas[0], y: 16, duration: 900, ease: "Sine.easeOut" });
    this.tweens.add({ targets: franjas[1], y: ALTO - 16, duration: 900, ease: "Sine.easeOut" });

    // nombre del juego: escala entera para que los pixeles queden parejos
    const ancho = this.textures.get(clave).getSourceImage().width;
    this.px = Math.max(1, Math.min(4, Math.floor((ANCHO - 20) / ancho)));
    this.titulo = this.add.image(ANCHO / 2, 52, clave).setScale(this.px).setAlpha(0).setDepth(20);
    this.brillo = this.add.image(ANCHO / 2, 52, clave).setScale(this.px).setAlpha(0).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    this.presenta = texto(this, ANCHO / 2, ALTO / 2 - 6, t.presenta, { tam: 8, color: COLOR.tenue }).setAlpha(0).setDepth(20);
    this.sub = texto(this, ANCHO / 2, 52 + this.titulo.displayHeight / 2 + 6, t.subtitulo, { tam: 8, color: "#eef1ff" }).setAlpha(0).setDepth(20);
    this.empezar = texto(this, ANCHO / 2, 98, t.empezar, { tam: 7, color: COLOR.titulo }).setAlpha(0).setDepth(20);

    // la película: presenta → nombre con destello → subtítulo → "empezar"
    this.tweens.chain({ targets: this.presenta, tweens: [
      { alpha: 1, duration: 700, delay: 500 }, { alpha: 0, duration: 600, delay: 1000 }
    ] });
    this.time.delayedCall(2900, () => {
      this.titulo.setScale(this.px * 2).setAlpha(0);
      this.tweens.add({ targets: this.titulo, alpha: 1, scale: this.px, duration: 900, ease: "Cubic.easeOut",
        onComplete: () => { this.cameras.main.flash(250, 255, 212, 92); this.destello(); } });
    });
    this.time.delayedCall(4200, () => this.tweens.add({ targets: this.sub, alpha: 1, duration: 700 }));
    this.time.delayedCall(5000, () => this.mostrarEmpezar());

    const tocar = () => (this.listo ? this.seguir() : this.saltar());
    this.input.on("pointerdown", tocar);
    ["ENTER", "SPACE"].forEach(k => this.input.keyboard.on("keydown-" + k, tocar));
    this.cameras.main.fadeIn(600);
  }

  // borde de la Luna abajo, con cráteres y la Tierra arriba a la derecha
  dibujarLuna() {
    const g = this.add.graphics().setDepth(5);
    const cx = ANCHO / 2, cy = ALTO + 112, r = 182;
    g.fillStyle(0x29366f).fillCircle(cx, cy, r + 2);
    g.fillStyle(0x566c86).fillCircle(cx, cy, r);
    g.fillStyle(0x94b0c2).fillCircle(cx - 6, cy + 4, r - 4);
    [[96, 140, 8], [130, 128, 6], [196, 132, 8], [236, 146, 7], [160, 150, 11], [70, 158, 7], [260, 160, 6]].forEach(([x, y, rr]) => {
      g.fillStyle(0x566c86).fillEllipse(x, y, rr * 2, rr * 0.8);
      g.fillStyle(0xc2c3c7).fillEllipse(x + 1, y + 1, rr * 1.6, rr * 0.5);
    });
    const T = { x: 292, y: 24 };
    g.fillStyle(0x1d2650).fillCircle(T.x, T.y, 9);
    g.fillStyle(0x29adff).fillCircle(T.x - 1, T.y, 7);
    g.fillStyle(0x38b764).fillRect(T.x - 5, T.y - 2, 3, 3).fillRect(T.x, T.y + 2, 2, 2);
    this.lunaR = r; this.lunaC = { x: cx, y: cy };
  }

  // rover que cruza el borde de la Luna con los faros encendidos
  crearRover() {
    const c = this.add.container(-30, 0).setDepth(6);
    const faro = this.add.triangle(0, 0, 18, -10, 42, -15, 42, -4, 0xfff27a, 0.2).setOrigin(0);
    const ruedas = [this.add.image(-13, -6, "rover_rueda"), this.add.image(11, -6, "rover_rueda")];
    c.add([faro, this.add.image(-20, -21, "rover_cuerpo").setOrigin(0), ...ruedas]);
    // recorre solo la parte visible del borde; aparece y desaparece suave en las orillas
    const pos = { p: 0 }, X1 = 50, X2 = ANCHO - 50;
    c.setAlpha(0);
    this.tweens.add({ targets: pos, p: 1, duration: 12000, repeat: -1, repeatDelay: 1500,
      onUpdate: () => {
        const x = X1 + (X2 - X1) * pos.p, dx = x - this.lunaC.x, alto = Math.sqrt(Math.max(1, this.lunaR ** 2 - dx * dx));
        c.setPosition(Math.round(x), Math.round(this.lunaC.y - alto) + 1).setRotation(Math.atan2(dx, alto))
          .setAlpha(Math.min(1, pos.p / 0.08, (1 - pos.p) / 0.08));
        ruedas.forEach(w => { w.rotation += 0.15; });
      } });
  }

  estrellaFugaz() {
    const x = Phaser.Math.Between(40, ANCHO - 60), y = Phaser.Math.Between(20, 50);
    const e = this.add.rectangle(x, y, 6, 1, 0xffffff).setDepth(4).setRotation(0.35);
    this.tweens.add({ targets: e, x: x + 50, y: y + 18, alpha: 0, duration: 700, onComplete: () => e.destroy() });
  }

  // el nombre brilla de vez en cuando
  destello() {
    this.brillo.setAlpha(0);
    this.tweens.add({ targets: this.brillo, alpha: 0.45, duration: 500, yoyo: true, repeat: -1, repeatDelay: 1800, ease: "Sine.easeInOut" });
  }

  mostrarEmpezar() {
    if (this.listo) return;
    this.listo = true;
    this.empezar.setAlpha(1);
    this.tweens.add({ targets: this.empezar, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
  }

  // primer toque: saltar la animación y dejar todo en su lugar
  saltar() {
    this.time.removeAllEvents();
    this.tweens.killTweensOf([this.presenta, this.titulo, this.sub]);
    this.presenta.setAlpha(0);
    this.titulo.setScale(this.px).setAlpha(1);
    this.sub.setAlpha(1);
    this.destello();
    this.time.addEvent({ delay: 2600, loop: true, callback: () => this.estrellaFugaz() });
    this.mostrarEmpezar();
  }

  seguir() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start(siguienteEscena(this.scene.key)));
  }
}
