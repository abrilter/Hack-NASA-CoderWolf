// Misión 3: traje y nave. Dueño: Rol 2 (pantalla) y Rol 4 (números).
// Una sola sala, el hangar, vista 3/4. El astronauta camina (clic en el piso o
// flechas). Al acercarse a un traje o a una nave aparece una burbuja con su
// ventaja (verde) y su costo (rojo); clic o Enter lo elige. Se puede cambiar.
// Con traje y nave elegidos la compuerta pasa de roja a verde → Misión 4.
// V1: todo con rectángulos de colores. TODO(Rol 3): cambiar por dibujos 16×16.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { texto } from "../ui.js";

// TODO(Rol 4): ajustar valores para que ninguna opción sea mejor en todo
const TRAJES = [
  { id: "blindado", proteccion: 0.3, gastoO2: 2.5, color: 0x8a93b8 },
  { id: "ligero",   proteccion: 0.1, gastoO2: 1.6, color: 0xf2f2f2 }
];
const NAVES = [
  { id: "grande",  agilidad: 0.8, combustible: 140, oxigenoExtra: 20, w: 46, h: 26 },
  { id: "pequena", agilidad: 1.3, combustible: 90,  oxigenoExtra: 0,  w: 26, h: 16 }
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
    // pared del fondo
    g.fillStyle(0x1a2147).fillRect(0, 0, ANCHO, PARED);
    g.fillStyle(0x121833).fillRect(0, PARED - 4, ANCHO, 4);               // zócalo
    // ventanal del hangar con estrellas
    g.fillStyle(0x050816).fillRect(178, 8, 136, 36);
    g.lineStyle(2, 0x2c3770).strokeRect(178, 8, 136, 36);
    g.lineBetween(246, 8, 246, 44);
    g.fillStyle(0xffffff);
    [[186, 14], [200, 30], [214, 18], [232, 38], [258, 12], [270, 28], [290, 20], [304, 36], [222, 26]]
      .forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    // piso con baldosas 16×16
    g.fillStyle(0x3a3f52).fillRect(0, PARED, ANCHO, ALTO - PARED);
    g.lineStyle(1, 0x30344a);
    for (let x = 0; x <= ANCHO; x += 16) g.lineBetween(x, PARED, x, ALTO);
    for (let y = PARED; y <= ALTO; y += 16) g.lineBetween(0, y, ANCHO, y);
    // separación vestidor / hangar
    g.fillStyle(0x2c3770).fillRect(124, 4, 4, PARED - 4);
    g.setDepth(-10);

    texto(this, 62, 2, this.t.vestidor, { tam: 6, color: COLOR.tenue }).setDepth(-5);
    texto(this, 246, 46, this.t.hangar, { tam: 6, color: COLOR.tenue }).setDepth(-5);
  }

  // ---------------------------------------------------------------- opciones
  crearVestidor() {
    this.zonas = [];
    TRAJES.forEach((traje, i) => {
      const x = 32 + i * 56;
      // cápsula de vidrio con pedestal
      this.add.rectangle(x, 72, 28, 8, 0x2c3770).setDepth(72);                       // pedestal
      const capsula = this.add.rectangle(x, 46, 26, 46, 0x4fd1ff, 0.12)
        .setStrokeStyle(1, 0x4fd1ff, 0.6).setDepth(73);
      // traje en el maniquí: cuerpo + casco
      const cuerpo = this.add.rectangle(x, 52, 14, 22, traje.color).setDepth(72);
      const casco = this.add.rectangle(x, 36, 10, 9, traje.color).setStrokeStyle(1, 0x4fd1ff).setDepth(72);
      const franja = this.add.rectangle(x, 50, 14, 3, traje.id === "ligero" ? 0xffa94d : 0x5a6288).setDepth(72);
      const zona = { tipo: "traje", opcion: traje, x, y: 98, foco: capsula, piezas: [cuerpo, casco, franja] };
      capsula.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });
  }

  crearHangar() {
    NAVES.forEach((nave, i) => {
      const x = 206 + i * 66, y = 76;
      this.add.ellipse(x, y + nave.h / 2 + 2, nave.w + 16, 10, 0x2c3770).setDepth(y - 1);   // plataforma
      const casco = this.add.rectangle(x, y, nave.w, nave.h, 0xc0c8e8).setDepth(y);
      const punta = this.add.triangle(x + nave.w / 2 + 5, y, 0, 0, 10, nave.h / 2, 0, nave.h, 0xc0c8e8).setDepth(y);
      const cabina = this.add.rectangle(x + nave.w / 4, y - 2, 6, 5, 0x4fd1ff).setDepth(y);
      const zona = { tipo: "nave", opcion: nave, x, y: 104, foco: casco, piezas: [casco, punta, cabina] };
      casco.setInteractive({ useHandCursor: true }).on("pointerdown", (p, lx, ly, ev) => this.irAZona(zona, ev));
      this.zonas.push(zona);
    });
  }

  crearCompuerta() {
    const x = COMPUERTA.x, y = COMPUERTA.y;
    this.marcoCompuerta = this.add.rectangle(x, y, 18, 32, 0x121833).setStrokeStyle(2, ROJO).setDepth(y);
    this.luzCompuerta = this.add.rectangle(x, y - 22, 8, 4, ROJO).setDepth(y);
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
    const iT = [this.add.rectangle(128, 126, 6, 7, 0xf2f2f2), this.add.rectangle(128, 120, 4, 4, 0xf2f2f2)];
    // Nave (derecha): flecha + icono de cohete
    const iN = [this.add.rectangle(192, 124, 4, 9, 0xc0c8e8), this.add.triangle(192, 118, 0, 4, 2, 0, 4, 4, ROJO)];
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
    this.astro = this.add.image(ANCHO / 2, ALTO + 34, "astronauta").setOrigin(0.5, 1);
    // TODO(Rol 3): cuando exista el spritesheet, usar un traje por animación
    // en lugar de este rectángulo encima.
    this.trajePuesto = this.add.rectangle(0, 0, 20, 16, 0xffffff).setVisible(false);

    this.chispa = this.add.image(ANCHO / 2 + 24, 112, "chispa");
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
      .forEach(z => z.piezas.forEach(p => p.setAlpha(z.opcion === traje ? 0.15 : 1)));
    this.trajePuesto.setFillStyle(traje.color).setVisible(true);
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
    if (this.controlActivo) this.mover(dt);

    // El traje puesto sigue al astronauta
    this.trajePuesto.setPosition(this.astro.x, this.astro.y - 12).setDepth(this.astro.y + 0.5);
    this.astro.setDepth(this.astro.y);

    // Chispa flota detrás del astronauta, con un poco de retraso
    const lado = this.astro.flipX ? 1 : -1;
    const cx = this.astro.x + lado * 22, cy = this.astro.y - 34 + Math.sin(tiempo / 250) * 2;
    this.chispa.x += (cx - this.chispa.x) * Math.min(1, dt * 3);
    this.chispa.y += (cy - this.chispa.y) * Math.min(1, dt * 3);
    this.chispa.setDepth(this.astro.y + 1);
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
        return;
      }
      dx = vx / d; dy = vy / d;
    }
    if (!dx && !dy) return;

    const n = Math.hypot(dx, dy);
    this.astro.x = Phaser.Math.Clamp(this.astro.x + (dx / n) * VELOCIDAD * dt, LIMITES.x1, LIMITES.x2);
    this.astro.y = Phaser.Math.Clamp(this.astro.y + (dy / n) * VELOCIDAD * dt, LIMITES.y1, LIMITES.y2);
    if (dx) this.astro.setFlipX(dx < 0);
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
