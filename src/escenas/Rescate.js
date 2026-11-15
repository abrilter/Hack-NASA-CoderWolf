// Misión final: el rescate ("Tres mensajes"). Dueño: Rol 5.
// Pasos:
//  0. Reencuentro: en la última posición conocida no hay nadie. Una lucecita
//     entre las rocas es Chispa, que reconoce al niño y lo guía hasta Itzel,
//     refugiada bajo una saliente de roca con la planta de la base. Itzel da un
//     dato real de OSDR sobre la Estación Espacial (contexto, no algo que le
//     pasó en la Luna).
//  1. Aire: compartir tu tanque con la manguera (tu oxígeno baja bastante) o
//     dejarle la reserva y volver por otra (tiempo y radiación si sigue la tormenta).
//  2. Radio: se repara (poco oxígeno con el kit de la mochila, más sin él).
//     "Tres mensajes, energía para dos": el niño elige 2 de 3 y cada mensaje
//     viaja 1.3 s a la Tierra y la respuesta 1.3 s de vuelta.
//  3. Regreso: rover (rápido, gasta más) o caminar a su paso. Sin rover, caminar.
//     "Vengan por nosotros" manda una nave de apoyo: el regreso gasta menos.
// Todo queda en estado.misiones.rescate (el Final arma los finales, la bitácora
// en cadena y el "¿Y si…?"). Números: modelo/simulacion.js + datos.json.
// Modo prueba: index.html?escena=Rescate (&sinrover=1 para probar sin rover).
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal } from "../ui.js";
import { aplicar, opcionesRescate, costoRadio, efectosRegreso, tieneRover, MENSAJES } from "../modelo/simulacion.js";
import { crearTexturasEquipo, crearTexturasItzel } from "../pixelart.js";

const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const SUELO = 92;
const LUZ = { x: 262, y: 84 };                 // la lucecita de Chispa entre las rocas
const ITZEL = { x: 150, y: SUELO };
const SEG_LUZ = 1.3;                           // 384 400 km ÷ 299 792 km/s ≈ 1.28 s

export class Rescate extends Phaser.Scene {
  constructor() { super("Rescate"); }

  create() {
    crearTexturasEquipo(this);
    crearTexturasItzel(this);
    if (estado.modoPrueba && new URLSearchParams(location.search).has("sinrover")) estado.misiones.rocas = { dejoRover: true };
    this.t = estado.textos.rescate;
    this.reg = estado.misiones.rescate = { mensajes: [] };
    this.barras = this.add.container(0, 0).setDepth(20);
    this.pintarBarras();
    titulo(this, this.t.titulo, 24).setDepth(20);
    this.dibujarLugar();
    this.paso("llegada");
  }

  pintarBarras() {
    this.barras.removeAll(true);
    const antes = this.children.list.length;
    barras(this, estado);
    this.barras.add(this.children.list.slice(antes));
  }

  // ---------------------------------------------------------------- el lugar
  dibujarLugar() {
    const g = this.add.graphics();
    // suelo y rocas
    g.fillStyle(0x333c57).fillRect(0, SUELO, ANCHO, 4);
    for (let x = 0; x < ANCHO; x += 3) g.fillStyle(0x29366f).fillRect(x, SUELO + 1 + (x % 3), 1, 1);
    [[232, 82, 14], [252, 86, 10], [284, 80, 16], [40, 84, 12], [70, 88, 8]].forEach(([x, y, r]) => {
      g.fillStyle(0x1a1c2c).fillEllipse(x, y + 1, r * 2 + 2, r + 2);
      g.fillStyle(0x566c86).fillEllipse(x, y, r * 2, r);
      g.fillStyle(0x94b0c2).fillRect(x - r / 2, y - r / 2 + 1, r / 2, 1);
    });
    // saliente de roca (el mismo tipo de refugio que en la tormenta)
    g.fillStyle(0x1a1c2c).fillRect(196, 46, 16, SUELO - 46);
    g.fillStyle(0x566c86).fillRect(198, 48, 12, SUELO - 48);
    g.fillStyle(0x1a1c2c).fillRect(100, 46, 112, 9);
    g.fillStyle(0x566c86).fillRect(102, 47, 108, 6);
    g.fillStyle(0x94b0c2).fillRect(102, 47, 108, 1);

    // Itzel y la planta, en la sombra de la saliente hasta que Chispa guía al niño
    this.itzel = this.add.image(ITZEL.x, ITZEL.y, "itzel_0").setOrigin(0.5, 1);
    this.tweens.add({ targets: this.itzel, scaleY: 1.03, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.time.addEvent({ delay: 2800, loop: true, callback: () => {
      this.itzel.setTexture("itzel_1");
      this.time.delayedCall(160, () => this.itzel.setTexture("itzel_0"));
    } });
    this.planta = this.add.image(178, SUELO, "planta").setOrigin(0.5, 1).setScale(1.5)
      .setInteractive({ useHandCursor: true }).on("pointerdown", () => this.tarjetaPlanta());
    this.sombra = this.add.rectangle(100, 55, 98, SUELO - 55, 0x05070f, 0.93).setOrigin(0).setDepth(2);

    // la lucecita de Chispa entre las rocas
    this.luz = this.add.circle(LUZ.x, LUZ.y, 2, 0x7ee6ff).setDepth(3);
    this.tweens.add({ targets: this.luz, scale: 2.2, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
    this.chispa = this.add.image(LUZ.x, LUZ.y, "chispa_px").setAlpha(0).setDepth(4);
  }

  // Encontrar a Chispa y que guíe hasta Itzel
  seguirLuz() {
    this.capa?.destroy();
    this.tweens.killTweensOf(this.luz);
    this.tweens.add({ targets: this.luz, scale: 5, alpha: 0, duration: 500 });
    this.tweens.add({ targets: this.chispa, alpha: 1, y: LUZ.y - 6, duration: 500 });
    this.texto1(this.t.chispa_aparece);
    this.tweens.add({ targets: this.chispa, x: ITZEL.x - 22, y: SUELO - 14, duration: 1800, delay: 1100, ease: "Sine.easeInOut",
      onComplete: () => {
        this.tweens.add({ targets: this.sombra, alpha: 0, duration: 700 });
        this.tweens.add({ targets: this.chispa, y: "-=3", duration: 500, yoyo: true, repeat: -1 });
        this.time.delayedCall(800, () => this.paso("encuentro"));
      } });
  }

  texto1(frase) {
    this.capa?.destroy();
    this.capa = this.add.container(0, 0);
    this.capa.add(texto(this, ANCHO / 2, 100, frase, { tam: 7, ancho: 290, color: "#ffcd75" }));
  }

  // ---------------------------------------------------------------- pasos
  paso(n) {
    this.capa?.destroy();
    this.capa = this.add.container(0, 0);
    this.etiqueta?.destroy(); this.etiqueta = null;
    const t = this.t, c = this.capa;
    if (n === "llegada") {
      c.add(texto(this, ANCHO / 2, 100, t.llegada, { tam: 7, ancho: 290 }));
      this.boton(ANCHO / 2, 146, t.ir_luz, () => this.seguirLuz(), 140);
      return;
    }
    if (n === "encuentro") {
      c.add([
        texto(this, ANCHO / 2, 98, t.itzel_refugio + " " + t.encuentro, { tam: 6, ancho: 296, color: "#ffcd75" }),
        texto(this, ANCHO / 2, 117, t.itzel_dice, { tam: 6, ancho: 296 })
      ]);
      this.boton(ANCHO / 2, 152, t.seguir, () => this.paso("aire"), 120);
      this.etiqueta = datoReal(this, estado.datos.itzel_estacion);
      return;
    }
    if (n !== "mensajes") this.etiqueta = datoReal(this, estado.datos.planta);
    if (n === "aire") {
      this.reg.inicio = { oxigeno: estado.oxigeno, radiacion: estado.radiacion };   // para el "¿Y si…?"
      const ops = opcionesRescate(estado.datos, estado);
      const sigue = estado.misiones.tormenta?.tormentaPendiente ? t.tormenta_sigue : null;
      this.dosOpciones(t.aire_pregunta, t.aire, ops.aire, (id, op) => this.decidir("aire", id, op.efectos, "radio"), sigue);
    }
    if (n === "radio") {
      const ef = costoRadio(estado.datos, estado);
      c.add([
        texto(this, ANCHO / 2, 98, t.radio_titulo, { tam: 7, ancho: 290 }),
        texto(this, ANCHO / 2, 116, estado.lleva("radio") ? t.radio_kit : t.radio_sin_kit,
          { tam: 6, ancho: 290, color: estado.lleva("radio") ? "#5cff8a" : "#ff8a5c" })
      ]);
      this.boton(ANCHO / 2, 146, llenar(t.reparar_radio, { o2: ef.oxigeno }), () => {
        aplicar(estado, ef);
        this.reg.radio = ef.oxigeno;
        estado.bitacora.push(llenar(t.nota_radio, { o2: ef.oxigeno }));
        this.pintarBarras();
        if (estado.causaDerrota()) return this.scene.start("Final");
        this.paso("mensajes");
      }, 150);
    }
    if (n === "mensajes") this.elegirMensajes();
    if (n === "regreso") {
      const m = this.reg.mensajes;
      const ops = {
        rover: { disponible: tieneRover(estado), efectos: efectosRegreso(estado.datos, estado, "rover", m) },
        caminar: { efectos: efectosRegreso(estado.datos, estado, "caminar", m) }
      };
      const nota = !ops.rover.disponible ? t.sin_rover : m.includes("ayuda") ? t.ayuda_viene
        : (estado.lleva("botiquin") ? t.herida_si : llenar(t.herida_no, { costo: estado.datos.modelo.sin_botiquin_o2 }));
      this.dosOpciones(t.regreso_pregunta, t.regreso, ops, (id, op) => this.decidir("regreso", id, op.efectos, "fin"), nota);
    }
  }

  // ---------------------------------------------------------------- tres mensajes, energía para dos
  elegirMensajes() {
    const t = this.t.mensajes, c = this.capa, sel = new Set();
    c.add([
      texto(this, ANCHO / 2, 95, t.titulo, { tam: 7, color: COLOR.titulo }),
      texto(this, ANCHO / 2, 104, t.explica, { tam: 6, ancho: 290 })
    ]);
    const lleva = texto(this, ANCHO / 2, 152, "", { tam: 5, color: COLOR.tenue });
    c.add(lleva);
    let enviar = null;
    const pintar = () => {
      tarjetas.forEach(({ id, caja }) => caja.setStrokeStyle(sel.has(id) ? 2 : 1, sel.has(id) ? 0xfff27a : COLOR.borde)
        .setFillStyle(sel.has(id) ? 0x29366f : COLOR.panel));
      lleva.setText(llenar(t.lleva, { n: sel.size }));
      enviar?.caja.destroy(); enviar?.etiqueta.destroy(); enviar = null;
      if (sel.size === 2) enviar = this.boton(ANCHO / 2, 167, t.enviar, () => this.enviar([...sel]), 120);
    };
    const tarjetas = MENSAJES.map((id, i) => {
      const x = 58 + i * 102, info = t[id];
      const caja = this.add.rectangle(x, 130, 98, 34, COLOR.panel).setStrokeStyle(1, COLOR.borde)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", (p, lx, ly, ev) => {
          ev?.stopPropagation();
          if (sel.has(id)) sel.delete(id); else if (sel.size < 2) sel.add(id);
          pintar();
        });
      c.add([caja, texto(this, x, 115, "“" + info.nombre + "”", { tam: 6, ancho: 94, color: COLOR.titulo }),
        texto(this, x, 132, info.efecto, { tam: 5, ancho: 94 })]);
      return { id, caja };
    });
    pintar();
  }

  // Cada mensaje viaja 1.3 s a la Tierra y la respuesta 1.3 s de vuelta
  enviar(lista) {
    this.reg.mensajes = MENSAJES.filter(id => lista.includes(id));
    estado.bitacora.push(llenar(this.t.nota_mensajes, { lista: this.reg.mensajes.map(id => "«" + this.t.mensajes[id].nombre + "»").join(" y ") }));
    this.capa.destroy();
    this.etiqueta?.destroy(); this.etiqueta = null;
    const t = this.t.mensajes, c = this.capa = this.add.container(0, 0);
    const LUNA = { x: 34, y: 136 }, TIERRA = { x: 286, y: 112 };
    const g = this.add.graphics();
    g.fillStyle(0xc2c3c7).fillCircle(LUNA.x, LUNA.y, 8);
    g.fillStyle(0x566c86).fillCircle(LUNA.x - 3, LUNA.y - 2, 2).fillCircle(LUNA.x + 3, LUNA.y + 3, 1.5);
    g.fillStyle(0x29adff).fillCircle(TIERRA.x, TIERRA.y, 10);
    g.fillStyle(0x38b764).fillCircle(TIERRA.x - 3, TIERRA.y - 2, 3).fillCircle(TIERRA.x + 4, TIERRA.y + 3, 2);
    for (let k = 0; k <= 30; k++) g.fillStyle(0x333c57).fillRect(LUNA.x + (TIERRA.x - LUNA.x) * k / 30, LUNA.y + (TIERRA.y - LUNA.y) * k / 30, 1, 1);
    c.add([g,
      texto(this, LUNA.x, LUNA.y + 10, t.luna, { tam: 5, color: COLOR.tenue }),
      texto(this, TIERRA.x, TIERRA.y + 12, t.tierra, { tam: 5, color: COLOR.tenue }),
      texto(this, ANCHO / 2, 95, llenar(t.viaja, { s: SEG_LUZ }), { tam: 6, ancho: 290, color: "#7ee6ff" })]);
    const nombre = texto(this, ANCHO / 2, 106, "", { tam: 7, color: COLOR.titulo, ancho: 290 });
    const reloj = texto(this, ANCHO / 2, 128, "", { tam: 6, color: "#eef1ff" });
    const respuesta = texto(this, ANCHO / 2, 141, "", { tam: 6, ancho: 230, color: "#5cff8a" });
    const punto = this.add.circle(LUNA.x, LUNA.y, 2, 0xfff27a).setVisible(false);
    c.add([nombre, reloj, respuesta, punto]);

    const viajar = (de, a, etiqueta, listo) => {
      punto.setPosition(de.x, de.y).setVisible(true);
      const cuenta = { s: 0 };
      this.tweens.add({ targets: cuenta, s: SEG_LUZ, duration: SEG_LUZ * 1000, onUpdate: () => reloj.setText(`${etiqueta}  ${cuenta.s.toFixed(1)} s`) });
      this.tweens.add({ targets: punto, x: a.x, y: a.y, duration: SEG_LUZ * 1000, onComplete: () => {
        punto.setVisible(false);
        const flash = this.add.circle(a.x, a.y, 4, 0xfff27a, 0.8);
        c.add(flash);
        this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
        listo();
      } });
    };
    const uno = i => {
      if (i >= this.reg.mensajes.length) {
        reloj.setText("");
        this.boton(ANCHO / 2, 165, this.t.seguir, () => this.paso("regreso"), 110);
        return;
      }
      const id = this.reg.mensajes[i];
      nombre.setText("“" + t[id].nombre + "”");
      respuesta.setText("");
      viajar(LUNA, TIERRA, t.ida, () => this.time.delayedCall(300, () =>
        viajar(TIERRA, LUNA, t.vuelta, () => { respuesta.setText(t[id].respuesta); this.time.delayedCall(1600, () => uno(i + 1)); })));
    };
    uno(0);
  }

  // ---------------------------------------------------------------- tarjetas de decisión
  // Pregunta con dos tarjetas: cada una muestra lo que gana, lo que cuesta y sus números
  dosOpciones(pregunta, textos, ops, alElegir, nota) {
    const c = this.capa;
    c.add(texto(this, ANCHO / 2, 96, pregunta, { tam: 7, ancho: 290 }));
    if (nota) c.add(texto(this, ANCHO / 2, 106, nota, { tam: 6, ancho: 290, color: "#ffcd75" }));
    Object.entries(ops).forEach(([id, op], i) => {
      const x = i ? 235 : 85, info = textos[id], e = op.efectos;
      const costo = e.radiacion > 0 ? llenar(this.t.costo_rad, { o2: e.oxigeno, rad: e.radiacion }) : llenar(this.t.costo, { o2: e.oxigeno });
      c.add([
        texto(this, x, 115, info.gana, { tam: 6, ancho: 145, color: "#5cff8a" }),
        texto(this, x, 124, info.cuesta, { tam: 6, ancho: 145, color: "#ff8a5c" }),
        texto(this, x, 134, costo, { tam: 6, ancho: 145, color: "#eef1ff" })
      ]);
      const b = this.boton(x, 152, info.nombre, () => alElegir(id, op), 136);
      if (op.disponible === false) { b.caja.disableInteractive().setAlpha(0.35); b.etiqueta.setAlpha(0.45); }
    });
  }

  boton(x, y, txt, fn, ancho) {
    const b = boton(this, x, y, txt, () => { if (!this.tarjeta) fn(); }, ancho);
    this.capa.add([b.caja, b.etiqueta]);
    return b;
  }

  decidir(tipo, id, efectos, siguiente) {
    aplicar(estado, efectos);
    this.reg[tipo] = id;
    this.reg[tipo + "Efectos"] = efectos;
    estado.bitacora.push(llenar(this.t["nota_" + tipo][id], { o2: efectos.oxigeno, rad: efectos.radiacion }));
    this.pintarBarras();
    if (siguiente === "fin" || estado.causaDerrota()) {
      if (!estado.causaDerrota()) estado.bitacora.push(this.t.nota_planta);
      return this.scene.start("Final");
    }
    this.paso(siguiente);
  }

  // Tarjeta con el estudio real de la planta; se cierra con un clic en cualquier parte
  tarjetaPlanta() {
    if (this.tarjeta) return;
    const t = this.t, p = estado.datos.planta;
    const c = this.add.container(0, 0).setDepth(1000);
    const fondo = this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.75).setOrigin(0).setInteractive();
    c.add([
      fondo,
      this.add.rectangle(ANCHO / 2 + 3, 25, 260, 128, 0x0b1026, 0.8).setOrigin(0.5, 0),
      this.add.rectangle(ANCHO / 2, 22, 260, 128, COLOR.panel).setOrigin(0.5, 0).setStrokeStyle(1, 0x5cff8a),
      this.add.image(52, 64, "planta").setScale(2.5).setOrigin(0.5, 1),
      this.add.image(52, 82, "chispa_px"),
      texto(this, 72, 28, t.planta_titulo, { tam: 8, color: COLOR.titulo, origenX: 0, align: "left" }),
      texto(this, 72, 42, t.planta_texto, { tam: 6, ancho: 210, origenX: 0, align: "left" })
    ]);
    const fuente = texto(this, ANCHO / 2, 126, `${p.ejemplo ? "DATO DE EJEMPLO" : "Dato real"} · ${p.fuente} · ${p.fecha} ↗`,
      { tam: 5, color: "#5cff8a", ancho: 250 });
    if (p.link) {
      fuente.setInteractive({ useHandCursor: true })
        .on("pointerdown", (ptr, lx, ly, ev) => { ev?.stopPropagation(); window.open(p.link, "_blank", "noopener"); });
    }
    c.add([fuente, texto(this, ANCHO / 2, 138, t.planta_cerrar, { tam: 5, color: COLOR.tenue })]);
    fondo.on("pointerdown", () => { c.destroy(); this.tarjeta = null; });
    this.tarjeta = c;
  }
}
