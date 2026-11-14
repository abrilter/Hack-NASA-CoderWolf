// Misión 2: preparar la mochila. Dueño: Rol 2.
// El astronauta camina (clic en el piso o flechas); clic en un objeto = camina
// hasta él y lo toma o lo deja. La mochila no pasa de CAPACIDAD_MOCHILA.
import { ANCHO, COLOR, OBJETOS, CAPACIDAD_MOCHILA } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";

const PISO = 140;

export class CentroControl extends Phaser.Scene {
  constructor() { super("CentroControl"); }

  create() {
    estado.nuevaPartida();
    const t = estado.textos.centro_control;

    this.add.image(0, 0, "fondo_control").setOrigin(0);
    this.add.rectangle(ANCHO / 2, PISO + 16, ANCHO, 16, COLOR.suelo);   // piso
    this.add.rectangle(130, 96, 220, 3, COLOR.panel);                    // repisa
    titulo(this, t.titulo, 4);

    // Objetos en la repisa
    this.iconos = {};
    OBJETOS.forEach((o, i) => {
      const x = 40 + i * 36;
      const s = this.add.image(x, 86, o.clave).setInteractive({ useHandCursor: true });
      s.on("pointerdown", (p, lx, ly, ev) => { ev.stopPropagation(); this.caminarA(x, () => this.alternar(o)); });
      this.iconos[o.id] = s;
    });

    // Puerta a la siguiente escena
    boton(this, 290, 110, "Salir", () => this.caminarA(290, () => this.scene.start("Equipo")), 50);

    // Astronauta
    this.astro = this.physics.add.sprite(160, PISO, "astronauta").setCollideWorldBounds(true);
    // TODO(Rol 2 + Rol 3): animaciones "quieto" y "caminar" cuando exista el spritesheet

    this.info = texto(this, ANCHO / 2, 24, t.instruccion, { tam: 6, color: COLOR.tenue });
    this.textoMochila = texto(this, 4, 168, "", { tam: 7, origenX: 0, align: "left" });
    this.actualizarMochila();

    this.destinoX = null;
    this.alLlegar = null;
    this.input.on("pointerdown", p => { if (p.worldY > 110) this.caminarA(p.worldX, null); });
    this.teclas = this.input.keyboard.createCursorKeys();
  }

  caminarA(x, alLlegar) { this.destinoX = Phaser.Math.Clamp(x, 16, ANCHO - 16); this.alLlegar = alLlegar; }

  update() {
    let dir = 0;
    if (this.teclas.left.isDown) { dir = -1; this.destinoX = null; }
    else if (this.teclas.right.isDown) { dir = 1; this.destinoX = null; }
    else if (this.destinoX !== null) {
      const d = this.destinoX - this.astro.x;
      if (Math.abs(d) < 2) {
        this.destinoX = null;
        const f = this.alLlegar; this.alLlegar = null;
        if (f) f();
      } else dir = Math.sign(d);
    }
    this.astro.setVelocityX(dir * 70);
    if (dir) this.astro.setFlipX(dir < 0);
  }

  peso() { return estado.mochila.reduce((s, id) => s + OBJETOS.find(o => o.id === id).peso, 0); }

  alternar(o) {
    const t = estado.textos.centro_control;
    if (estado.lleva(o.id)) {
      estado.mochila = estado.mochila.filter(id => id !== o.id);
    } else if (this.peso() + o.peso <= CAPACIDAD_MOCHILA) {
      estado.mochila.push(o.id);
    } else {
      this.info.setText(t.no_cabe);
      return;
    }
    this.info.setText(t.objetos[o.id] + ` (${o.peso} kg)`);
    this.iconos[o.id].setAlpha(estado.lleva(o.id) ? 0.3 : 1);
    this.actualizarMochila();
  }

  actualizarMochila() {
    this.textoMochila.setText(`Mochila: ${this.peso()}/${CAPACIDAD_MOCHILA} kg  [${estado.mochila.join(", ")}]`);
  }
}
