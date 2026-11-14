// Misión 3: traje y nave. Dueño: Rol 2 (pantalla) y Rol 4 (números).
// Una sola sala, el hangar, vista 3/4. El astronauta camina (clic en el piso o
// flechas). Al acercarse a un traje o a una nave aparece una burbuja con su
// ventaja (verde) y su costo (rojo); clic o Enter lo elige. Se puede cambiar.
// Con traje y nave elegidos la compuerta pasa de roja a verde → Misión 4.
// Figuras en pixel art hechas con mapas de letras (src/pixelart.js).
// TODO(Rol 3): reemplazar por PNG cuando estén listos.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";
import { crearTexturasEquipo } from "../pixelart.js";

// TODO(Rol 4): ajustar valores para que ninguna opción sea mejor en todo
const TRAJES = [
  { id: "blindado", proteccion: 0.3, gastoO2: 2.5 },
  { id: "ligero",   proteccion: 0.1, gastoO2: 1.6 }
];
const NAVES = [
  { id: "grande",  agilidad: 0.8, combustible: 140, oxigenoExtra: 20, w: 44 },
  { id: "pequena", agilidad: 1.3, combustible: 90,  oxigenoExtra: 0,  w: 30 }
];
const O2_TANQUE = 20;        // si la mochila trae el tanque de oxígeno

const VERDE = 0x5cff8a, ROJO = 0xff5c5c;
const PARED = 56;            // donde termina la pared del fondo y empieza el piso
const LIMITES = { x1: 12, x2: ANCHO - 12, y1: 92, y2: 172 };   // pies del astronauta
const VELOCIDAD = 70;        // px por segundo
const CERCA = 24;            // radio de la zona de proximidad
const COMPUERTA = { x: 306, y: 146 };

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
    this.crearVestidor();
    this.crearHangar();
    this.crearCompuerta();
    this.crearFlechas();
    this.crearPersonajes();
    this.crearBurbuja();

    // Entrada: camina desde abajo hasta el centro
    this.controlActivo = false;
    this.tweens.add({
      targets: this.astro, y: 150, duration: 900,
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
  dibujarSala() {
    const g = this.add.graphics();
    const r = (color, x, y, w, h) => g.fillStyle(color).fillRect(x, y, w, h);

    // pared del fondo: paneles metálicos con remaches
    r(0x29366f, 0, 0, ANCHO, PARED);
    r(0x1a1c2c, 0, 0, ANCHO, 3);                                   // techo
    for (let x = 0; x < ANCHO; x += 32) {
      r(0x333c57, x, 3, 1, PARED - 7);                             // junta
      r(0x3b5dc9, x + 1, 3, 1, PARED - 7);                         // brillo
      r(0x566c86, x + 4, 6, 1, 1); r(0x566c86, x + 27, 6, 1, 1);   // remaches
    }
    r(0x333c57, 0, 30, ANCHO, 1);                                  // línea media
    // luces del techo
    for (let x = 20; x < ANCHO; x += 64) { r(0xfff27a, x, 3, 12, 2); r(0xffcd75, x + 2, 5, 8, 1); }
    // zócalo con franja de peligro
    r(0x1a1c2c, 0, PARED - 5, ANCHO, 5);
    for (let x = 0; x < ANCHO; x += 8) r(0xffcd75, x, PARED - 4, 4, 3);

    // ventanal del hangar con estrellas y la Luna
    r(0x1a1c2c, 176, 7, 140, 38);
    r(0x0b1026, 178, 9, 136, 34);
    [[186, 14], [200, 30], [214, 18], [232, 38], [258, 12], [278, 34], [304, 36], [222, 26], [196, 20], [300, 14]]
      .forEach(([x, y]) => r(0xf4f4f4, x, y, 1, 1));
    r(0xc2c3c7, 284, 14, 10, 10); r(0x94b0c2, 286, 16, 3, 3); r(0x94b0c2, 290, 20, 2, 2);   // Luna
    r(0x1a1c2c, 245, 9, 2, 34);                                    // marco central

    // separación vestidor / hangar
    r(0x1a1c2c, 124, 3, 5, PARED - 8);
    r(0x566c86, 125, 3, 3, PARED - 8);

    // piso: baldosas 16×16 con brillo y sombra
    r(0x566c86, 0, PARED, ANCHO, ALTO - PARED);
    for (let y = PARED; y < ALTO; y += 16) {
      for (let x = 0; x < ANCHO; x += 16) {
        r(0x333c57, x, y + 15, 16, 1);                             // sombra abajo
        r(0x333c57, x + 15, y, 1, 16);                             // sombra derecha
        r(0x94b0c2, x, y, 15, 1);                                  // brillo arriba
        if ((x + y) % 48 === 8) r(0x4a5a74, x + 4, y + 5, 2, 1);  // rayones
      }
    }
    r(0x1a1c2c, 0, PARED, ANCHO, 2);                               // sombra de la pared

    // pantalla en la pared con el mapa del polo sur lunar
    r(0x1a1c2c, 132, 14, 40, 26);
    r(0x0b1026, 134, 16, 36, 22);
    g.lineStyle(1, 0x29adff, 0.6).strokeCircle(152, 27, 8).strokeCircle(152, 27, 4);
    r(0x29adff, 144, 27, 17, 1); r(0x29adff, 152, 19, 1, 17);
    r(0xff5c5c, 155, 24, 2, 2);                                    // Itzel
    r(0x5cff8a, 136, 35, 8, 1); r(0x5cff8a, 136, 33, 5, 1);        // datos
    // consola debajo de la pantalla
    r(0x1a1c2c, 132, 42, 40, 9);
    r(0x566c86, 133, 43, 38, 4);
    [[136, 0xff5c5c], [142, 0x5cff8a], [148, 0xffcd75], [160, 0x29adff], [166, 0x5cff8a]]
      .forEach(([x, c]) => r(c, x, 44, 3, 2));

    // tanques de oxígeno en la pared del vestidor
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

    texto(this, 60, 8, this.t.vestidor, { tam: 6, color: COLOR.tenue }).setDepth(-5);
    texto(this, 152, 10, this.t.hangar, { tam: 6, color: COLOR.tenue }).setDepth(-5);
  }

  // ---------------------------------------------------------------- opciones
  crearVestidor() {
    this.zonas = [];
    TRAJES.forEach((traje, i) => {
      const x = 32 + i * 56;
      // cápsula de vidrio: base, tapa, soporte y el traje colgado
      const g = this.add.graphics().setDepth(70);
      g.fillStyle(0x1a1c2c).fillRect(x - 15, 66, 30, 9);              // base
      g.fillStyle(0x566c86).fillRect(x - 14, 67, 28, 3);
      g.fillStyle(0x333c57).fillRect(x - 14, 70, 28, 4);
      g.fillStyle(0x5cff8a).fillRect(x - 2, 71, 4, 1);                 // lucecita
      g.fillStyle(0x1a1c2c).fillRect(x - 15, 16, 30, 6);               // tapa
      g.fillStyle(0x566c86).fillRect(x - 14, 17, 28, 3);
      g.fillStyle(0x333c57).fillRect(x - 1, 22, 2, 44);                // soporte del maniquí
      const traje3 = this.add.image(x, 66, `maniqui_${traje.id}`).setOrigin(0.5, 1).setDepth(71);
      const capsula = this.add.rectangle(x, 44, 28, 44, 0x4fd1ff, 0.10)
        .setStrokeStyle(1, 0xbff3ff, 0.5).setDepth(72);
      this.add.rectangle(x - 10, 40, 2, 30, 0xffffff, 0.25).setDepth(72);   // reflejo del vidrio
      const zona = { tipo: "traje", opcion: traje, x, y: 98, foco: capsula, piezas: [traje3] };
      capsula.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });
  }

  crearHangar() {
    NAVES.forEach((nave, i) => {
      const x = 204 + i * 68, y = 84;           // y = donde apoyan las patas
      // plataforma con franja de peligro
      const g = this.add.graphics().setDepth(y - 2);
      g.fillStyle(0x1a1c2c).fillEllipse(x, y, nave.w + 18, 13);
      g.fillStyle(0xffcd75).fillEllipse(x, y - 1, nave.w + 16, 10);
      g.fillStyle(0x333c57).fillEllipse(x, y - 1, nave.w + 10, 7);
      const plataforma = this.add.ellipse(x, y - 1, nave.w + 18, 12).setDepth(y - 1);
      const sprite = this.add.image(x, y, `nave_${nave.id}`).setOrigin(0.5, 1).setDepth(y);
      const zona = { tipo: "nave", opcion: nave, x, y: 104, foco: plataforma, piezas: [sprite] };
      sprite.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });
  }

  crearCompuerta() {
    const x = COMPUERTA.x, y = COMPUERTA.y;
    // puerta corrediza de dos hojas con franjas de peligro abajo
    const g = this.add.graphics().setDepth(y - 1);
    g.fillStyle(0x1a1c2c).fillRect(x - 10, y - 17, 20, 34);
    g.fillStyle(0x566c86).fillRect(x - 8, y - 15, 7, 28);
    g.fillStyle(0x566c86).fillRect(x + 1, y - 15, 7, 28);
    g.fillStyle(0x94b0c2).fillRect(x - 8, y - 15, 1, 28).fillRect(x + 1, y - 15, 1, 28);   // brillo
    g.fillStyle(0x333c57).fillRect(x - 6, y - 8, 3, 6).fillRect(x + 3, y - 8, 3, 6);       // ventanitas
    for (let i = 0; i < 4; i++) g.fillStyle(i % 2 ? 0x1a1c2c : 0xffcd75).fillRect(x - 8 + i * 4, y + 13, 4, 3);
    this.marcoCompuerta = this.add.rectangle(x, y, 20, 34).setStrokeStyle(2, ROJO).setDepth(y);
    this.luzCompuerta = this.add.rectangle(x, y - 21, 8, 3, ROJO).setDepth(y);
    const zona = { tipo: "compuerta", x: COMPUERTA.x - 16, y: COMPUERTA.y + 8, foco: this.marcoCompuerta, piezas: [] };
    this.marcoCompuerta.setInteractive({ useHandCursor: true })
      .on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
    this.zonas.push(zona);
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

    // Flecha hacia la compuerta, apagada hasta tener las dos cosas
    this.flechaCompuerta = flecha(284, 154, false, VERDE).setVisible(false);
    this.parpadeoCompuerta = this.tweens.add({ targets: this.flechaCompuerta, alpha: 0.2, duration: 400, yoyo: true, repeat: -1, paused: true });
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
    this.astro = this.add.image(ANCHO / 2, ALTO + 30, "astro_base_0").setOrigin(0.5, 1);

    this.sombraChispa = this.add.ellipse(0, 0, 8, 3, 0x1a1c2c, 0.3);
    this.chispa = this.add.image(ANCHO / 2 + 24, 112, "chispa_px");
    this.dialogo = texto(this, 0, 0, "", { tam: 6, ancho: 120, origenY: 1 })
      .setBackgroundColor("#1d2650").setPadding(2, 1).setDepth(1000).setVisible(false);
  }

  decir(frase, ms = 3000) {
    this.dialogo.setText(frase).setVisible(true);
    this.time.removeEvent(this.ocultarDialogo);
    this.ocultarDialogo = this.time.delayedCall(ms, () => this.dialogo.setVisible(false));
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
    if (zona.tipo === "compuerta") return this.burbuja.setVisible(false);
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
    else this.intentarSalir();
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
    this.revisarCompuerta();
  }

  elegirNave(nave) {
    this.naveElegida = nave;
    // La elegida iluminada, la otra en penumbra
    this.zonas.filter(z => z.tipo === "nave").forEach(z => {
      const sel = z.opcion === nave;
      z.piezas.forEach(p => p.setAlpha(sel ? 1 : 0.35));
      z.foco.setStrokeStyle(sel ? 2 : 0, VERDE);
    });
    this.marcarFlecha("nave");
    this.decir(this.llenar(this.t.chispa_nave, { nombre: this.t.opciones[nave.id].nombre.toLowerCase() }));
    this.revisarCompuerta();
  }

  listos() { return this.trajeElegido && this.naveElegida; }

  revisarCompuerta() {
    if (!this.listos() || this.flechaCompuerta.visible) return;
    this.marcoCompuerta.setStrokeStyle(2, VERDE);
    this.luzCompuerta.setFillStyle(VERDE);
    this.flechaCompuerta.setVisible(true);
    this.parpadeoCompuerta.resume();
    this.time.delayedCall(1200, () => this.decir(this.t.chispa_listos));
  }

  intentarSalir() {
    if (!this.trajeElegido) return this.decir(this.t.chispa_falta_traje);
    if (!this.naveElegida) return this.decir(this.t.chispa_falta_nave);
    if (this.saliendo) return;
    this.saliendo = true;
    this.controlActivo = false;

    estado.traje = this.trajeElegido;
    estado.nave = this.naveElegida;
    estado.oxigeno += this.naveElegida.oxigenoExtra;
    const tanque = estado.lleva("oxigeno");
    if (tanque) { estado.oxigeno += O2_TANQUE; this.decir(this.t.chispa_tanque); }
    estado.bitacora.push(`Equipo: ${this.t.opciones[this.trajeElegido.id].nombre} y ${this.t.opciones[this.naveElegida.id].nombre}.`);

    this.tweens.add({ targets: this.astro, x: COMPUERTA.x + 4, alpha: 0, duration: 500, delay: tanque ? 900 : 0 });
    this.cameras.main.fadeOut(500, 0, 0, 0, null);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Viaje"));
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

    const n = Math.hypot(dx, dy);
    this.astro.x = Phaser.Math.Clamp(this.astro.x + (dx / n) * VELOCIDAD * dt, LIMITES.x1, LIMITES.x2);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + (dy / n) * VELOCIDAD * dt, LIMITES.y1, LIMITES.y2);
    if (dx) this.astro.setFlipX(dx < 0);
    return true;
  }

  revisarProximidad() {
    let cerca = null, mejor = CERCA;
    this.zonas.forEach(z => {
      const d = Phaser.Math.Distance.Between(this.astro.x, this.astro.y, z.x, z.y);
      if (d < mejor) { mejor = d; cerca = z; }
    });
    if (cerca === this.activa) return;

    // Apaga la anterior
    if (this.activa) {
      const a = this.activa;
      if (a.tipo === "traje") a.foco.setFillStyle(0x4fd1ff, 0.12);
      if (a.tipo === "nave" && a.opcion !== this.naveElegida) a.foco.setStrokeStyle(0);
    }
    this.activa = cerca;
    if (!cerca) return this.burbuja.setVisible(false);

    // Ilumina la nueva
    if (cerca.tipo === "traje") cerca.foco.setFillStyle(0xfff27a, 0.35);
    if (cerca.tipo === "nave" && cerca.opcion !== this.naveElegida) cerca.foco.setStrokeStyle(2, 0xfff27a);
    if (cerca.tipo === "compuerta") {
      if (this.listos()) return this.intentarSalir();
      if (!this.trajeElegido) this.decir(this.t.chispa_falta_traje);
      else this.decir(this.t.chispa_falta_nave);
    }
    this.mostrarBurbuja(cerca);
  }
}
