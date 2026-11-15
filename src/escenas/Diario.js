// Diario de misión: la bitácora final como un libro abierto. Dueño: Rol 5.
// Lee: estado (misiones, mochila, traje, nave, bitacora, nombreClave, insignia) y
// datos.json · Escribe: nada (solo muestra; «Jugar otra vez» → nuevaPartida()).
// Se abre desde el botón «Bitácora» del Final; «Volver» regresa al Final.
// Cada decisión importante es una hoja doble: a la izquierda un dibujo del momento
// (y la nota al margen "¿Y si…?"), a la derecha el texto en primera persona, el
// costo con iconos y un sello. Al final: los mensajes que llegaron a la Tierra
// y la planta de Chispa como recuerdo (la insignia y las fuentes están en el Final). Todas las frases están en textos.json → "diario".
// Modo prueba: index.html?escena=Diario (bitácora de ejemplo en datos/misiones/diario.json)
import { ANCHO, ALTO, COLOR, OBJETOS } from "../config.js";
import { estado } from "../estado.js";
import { texto, boton, llenar } from "../ui.js";
import { crearTextura, crearTexturasMochila, crearAstro32, crearTexturasItzel } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";
import { proteccion, simularCierre, finalDeMision, MENSAJES } from "../modelo/simulacion.js";

// El libro: dos hojas separadas por el lomo
const LIBRO = { x: 6, y: 4, w: 308, h: 158 };
const LOMO = ANCHO / 2;
const HOJA_IZQ = { x: 14, y: 9, w: LOMO - 16 };
const HOJA_DER = { x: LOMO + 2, y: 9, w: LOMO - 16 };
const ALTO_HOJA = 148;
const FOTO = { x: 26, y: 18, w: 110, h: 64 };          // el dibujo de la hoja izquierda
const PAPEL = 0xf4f4f4, RENGLON = 0xc2d3e0, TINTA = "#29366f", TINTA_ROJA = "#b13e53";
const TAPA = 0x29366f, TAPA_OSCURA = 0x1a1c2c, ORO = 0xffcd75;
// "Letra a mano": fuentes redondeadas dibujadas a baja resolución → se ven en pixel
const MANO = "'Segoe Print', 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive";
const MARGEN = "'Courier New', 'Lucida Console', monospace";
const RES_MANO = 2;
// Sellos: cuánto tiene que costar una decisión para que sea "Arriesgado" o "Por poco"
const RIESGO_RAD = 10, MUCHO_O2 = 20;
const SELLO_COLOR = { bien: 0x38b764, arriesgado: 0xef7d57, poco: 0xb13e53 };

const ICONO_O2 = [".kkkkk.", "kBBBBBk", "kBcBBBk", "kBBBBBk", "kBBBBBk", "kBBBBBk", ".kkkkk."];
const ICONO_RAD = ["..kkk..", ".kyyyk.", "kyykyyk", "kykkkyk", "kyykyyk", ".kyyyk.", "..kkk.."];
const PALETA_ICONO = { k: 0x1a1c2c, B: 0x29adff, c: 0xbff3ff, y: 0xffcd75 };

export class Diario extends Phaser.Scene {
  constructor() { super("Diario"); }

  create() {
    crearTexturasMochila(this);                     // objetos, chispa_px, planta, naves
    crearTexturasExterior(this);                    // rover y rocas
    crearTexturasItzel(this);
    crearTextura(this, "icono_o2", ICONO_O2, PALETA_ICONO);
    crearTextura(this, "icono_rad", ICONO_RAD, PALETA_ICONO);
    this.t = estado.textos.diario;
    this.paginas = this.armarPaginas();
    this.actual = 0;
    this.pasando = false;

    this.dibujarLibro();
    this.capaIzq = null;
    this.capaDer = null;
    this.mostrar(0);

    // navegación: flechas, clic en las esquinas o en el borde de cada hoja
    this.input.keyboard?.on("keydown-RIGHT", () => this.pasar(1));
    this.input.keyboard?.on("keydown-LEFT", () => this.pasar(-1));
    this.esquinaDer = this.esquina(LIBRO.x + LIBRO.w - 2, 1);
    this.esquinaIzq = this.esquina(LIBRO.x + 2, -1);

    this.indicador = texto(this, ANCHO / 2, ALTO - 13, "", { tam: 6, color: COLOR.tenue });
    boton(this, 40, ALTO - 9, this.t.volver, () => this.scene.start("Final"), 60);
    this.otraVez = boton(this, ANCHO - 50, ALTO - 9, this.t.otra_vez, () => { estado.nuevaPartida(); this.scene.start("Equipo"); }, 84);
    this.actualizarNavegacion();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ================================================================ contenido
  // Cada página: { clave, titulo, frases[], dibujo(capa), o2, rad, sello, ysi, extra(capa, y) }
  armarPaginas() {
    const t = this.t, P = t.paginas, tx = estado.textos, m = estado.misiones || {}, r = m.rescate || {};
    const nombres = tx.centro_control?.nombres || {};
    const paginas = [];
    const add = p => paginas.push(p);
    const porCosto = (o2 = 0, rad = 0) => (rad >= RIESGO_RAD ? "arriesgado" : o2 <= -MUCHO_O2 ? "poco" : "bien");

    // portada
    add({ clave: "portada", portada: true, dibujo: c => this.dibujoPortada(c) });

    // mochila
    if (estado.mochila?.length) {
      const kg = estado.mochila.reduce((s, id) => s + (this.pesoObjeto(id)), 0);
      const linterna = estado.lleva("linterna"), escudo = estado.lleva("escudo");
      add({
        clave: "mochila", titulo: P.mochila.titulo,
        frases: [llenar(P.mochila.texto, { objetos: estado.mochila.map(id => nombres[id] || id).join(", "), kg }),
          linterna ? P.mochila.linterna_si : P.mochila.linterna_no],
        sello: !linterna && !escudo ? "arriesgado" : "bien",
        ysi: !linterna ? P.mochila.ysi_linterna : !escudo ? P.mochila.ysi_escudo : null,
        dibujo: c => this.dibujoMochila(c)
      });
    }

    // traje y nave
    if (estado.traje && estado.nave) {
      const n = Math.round(proteccion(estado) * 10);
      add({
        clave: "equipo", titulo: P.equipo.titulo,
        frases: [llenar(P.equipo.texto, { traje: tx.equipo?.opciones?.[estado.traje.id]?.nombre || estado.traje.id,
          nave: tx.equipo?.opciones?.[estado.nave.id]?.nombre || estado.nave.id }), llenar(P.equipo.efecto, { n })],
        sello: n < 3 ? "arriesgado" : "bien",
        ysi: P.equipo.ysi[estado.traje.id],
        dibujo: c => this.dibujoEquipo(c)
      });
    }

    // ruta
    if (m.ruta) {
      const oscuro = m.ruta.id === "crater" && !estado.lleva("linterna");
      add({
        clave: "ruta", titulo: P.ruta.titulo,
        frases: [P.ruta[m.ruta.id] || m.ruta.id, m.ruta.horas ? llenar(P.ruta.horas, { horas: m.ruta.horas }) : ""].filter(Boolean),
        o2: m.ruta.oxigeno, rad: m.ruta.radiacion,
        sello: oscuro ? "arriesgado" : porCosto(m.ruta.oxigeno, m.ruta.radiacion),
        ysi: P.ruta.ysi[m.ruta.id],
        dibujo: c => this.dibujoRuta(c, m.ruta.id)
      });
    }

    // cráter helado
    if (m.crater) {
      const choques = m.crater.choques || 0;
      add({
        clave: "crater", titulo: P.crater.titulo,
        frases: [P.crater.texto, choques ? llenar(P.crater.choques, { choques }) : P.crater.choques_0],
        o2: m.crater.oxigeno,
        sello: choques >= 3 ? "poco" : porCosto(m.crater.oxigeno),
        ysi: choques ? P.crater.ysi : null,
        dibujo: c => this.dibujoCrater(c)
      });
    }

    // huellas (solo queda en la bitácora: se reconoce por la frase de error)
    const huellas = estado.bitacora.find(b => b.startsWith((estado.textos.huellas.bitacora_bien || "").split(":")[0]));
    if (huellas) {
      const plantillaMal = tx.huellas?.bitacora_mal || "";
      const mal = plantillaMal && huellas.startsWith(plantillaMal.split("{")[0]);
      add({
        clave: "huellas", titulo: P.huellas.titulo,
        frases: [mal ? P.huellas.mal : P.huellas.bien],
        o2: mal ? -(estado.datos.huellas?.o2_error || 0) : 0,
        sello: mal ? "poco" : "bien",
        ysi: mal ? P.huellas.ysi_mal : null,
        dibujo: c => this.dibujoHuellas(c, mal)
      });
    }

    // rocas (si existe esa escena): dejar el rover o rodear
    if (m.rocas) {
      const pie = m.rocas.dejoRover === true || m.rocas.sinRover === true;
      const o2 = m.rocas.o2 ? -Math.abs(m.rocas.o2) : m.rocas.oxigeno || 0;
      add({
        clave: "rocas", titulo: P.rocas.titulo, frases: [pie ? P.rocas.pie : P.rocas.rodear], o2,
        sello: pie ? "arriesgado" : porCosto(o2), ysi: P.rocas.ysi[pie ? "pie" : "rodear"],
        dibujo: c => this.dibujoRocas(c, pie)
      });
    }

    // tormenta
    if (m.tormenta) {
      const e = m.tormenta.eleccion;
      add({
        clave: "tormenta", titulo: P.tormenta.titulo, frases: [P.tormenta[e] || e],
        o2: m.tormenta.oxigeno, rad: m.tormenta.radiacion,
        sello: e === "seguir" ? "arriesgado" : porCosto(m.tormenta.oxigeno, m.tormenta.radiacion),
        ysi: P.tormenta.ysi[e],
        dibujo: c => this.dibujoTormenta(c, e)
      });
    }

    // rescate: aire, mensajes (con la radio) y regreso
    const ysiCierre = this.ysiCierre(r);
    if (r.aire) {
      const ef = r.aireEfectos || {};
      add({
        clave: "aire", titulo: P.aire.titulo, frases: [P.aire[r.aire]], o2: ef.oxigeno, rad: ef.radiacion,
        sello: porCosto(ef.oxigeno, ef.radiacion), ysi: ysiCierre.aire,
        dibujo: c => this.dibujoAire(c, r.aire)
      });
    }
    if (r.mensajes?.length) {
      const lista = r.mensajes.map(id => "«" + tx.rescate.mensajes[id].nombre + "»").join(` ${estado.textos.comun.y} `);
      const falta = MENSAJES.find(id => !r.mensajes.includes(id));
      add({
        clave: "mensajes", titulo: P.mensajes.titulo,
        frases: [r.radio ? P.mensajes.radio : "", llenar(P.mensajes.texto, { lista })].filter(Boolean),
        o2: r.radio || 0,
        sello: r.mensajes.includes("tormenta") ? "bien" : "arriesgado",
        ysi: falta ? llenar(P.mensajes.ysi, { falta: tx.rescate.mensajes[falta].nombre, efecto: tx.rescate.mensajes[falta].efecto }) : null,
        dibujo: c => this.dibujoMensajes(c)
      });
    }
    if (r.regreso) {
      const ef = r.regresoEfectos || {};
      add({
        clave: "regreso", titulo: P.regreso.titulo, frases: [P.regreso[r.regreso]], o2: ef.oxigeno, rad: ef.radiacion,
        sello: porCosto(ef.oxigeno, ef.radiacion), ysi: ysiCierre.regreso,
        dibujo: c => this.dibujoRegreso(c, r.regreso)
      });
    }

    // últimas páginas: lo que llegó a la Tierra y el recuerdo de Chispa
    add({ clave: "tierra", titulo: t.tierra.titulo, especial: (c, x, y, w) => this.paginaTierra(c, x, y, w, r), dibujo: c => this.dibujoTierra(c) });
    add({ clave: "planta", titulo: t.planta.titulo, especial: (c, x, y, w) => this.paginaPlanta(c, x, y, w), dibujo: c => this.dibujoPlanta(c) });
    return paginas;
  }

  pesoObjeto(id) { return OBJETOS.find(o => o.id === id)?.peso ?? 0; }

  // "¿Y si…?" del aire y del regreso: vuelve a jugar el cierre con la otra opción
  ysiCierre(r) {
    const P = this.t.paginas, out = {};
    if (!r.inicio || !r.aire || !r.regreso || !r.mensajes?.length) return out;
    const base = { ...estado, ...r.inicio, mochila: estado.mochila, misiones: estado.misiones };
    const real = { aire: r.aire, mensajes: r.mensajes, regreso: r.regreso };
    const frase = (cambio, decision) => {
      try {
        const e = simularCierre(estado.datos, base, { ...real, ...cambio });
        const final = finalDeMision(e, real.mensajes);
        return llenar(this.t.ysi_simulado, { decision, o2: Math.max(0, Math.round(e.oxigeno)), rad: Math.round(e.radiacion) })
          + (final === "evacuacion" ? " " + this.t.ysi_evacuacion : "");
      } catch (err) { console.warn("[Diario] no se pudo simular el ¿Y si…?", err); return null; }
    };
    const otroAire = r.aire === "manguera" ? "reserva" : "manguera";
    out.aire = frase({ aire: otroAire }, this.t.decisiones[otroAire]) || P.aire.ysi?.[r.aire];
    const conRover = estado.misiones?.rocas?.dejoRover !== true && estado.misiones?.rocas?.sinRover !== true;
    const otroRegreso = r.regreso === "rover" ? "caminar" : "rover";
    out.regreso = conRover ? frase({ regreso: otroRegreso }, this.t.decisiones[otroRegreso]) : this.t.paginas.regreso.sin_rover;
    return out;
  }

  // ================================================================ libro
  dibujarLibro() {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x0b1026).fillRect(0, 0, ANCHO, ALTO);
    // tapas (asoman por los bordes) con esquinas doradas
    g.fillStyle(TAPA_OSCURA).fillRect(LIBRO.x - 1, LIBRO.y - 1, LIBRO.w + 2, LIBRO.h + 3);
    g.fillStyle(TAPA).fillRect(LIBRO.x, LIBRO.y, LIBRO.w, LIBRO.h + 1);
    [[LIBRO.x, LIBRO.y], [LIBRO.x + LIBRO.w - 6, LIBRO.y], [LIBRO.x, LIBRO.y + LIBRO.h - 5], [LIBRO.x + LIBRO.w - 6, LIBRO.y + LIBRO.h - 5]]
      .forEach(([x, y]) => g.fillStyle(ORO).fillRect(x, y, 6, 6));
    // canto de las hojas (varias hojas apiladas)
    [3, 2, 1].forEach(d => {
      g.fillStyle(d % 2 ? 0xc2c3c7 : 0xe4e6ec).fillRect(HOJA_IZQ.x - d, HOJA_IZQ.y + d, HOJA_IZQ.w + d, ALTO_HOJA);
      g.fillStyle(d % 2 ? 0xc2c3c7 : 0xe4e6ec).fillRect(HOJA_DER.x, HOJA_DER.y + d, HOJA_DER.w + d, ALTO_HOJA);
    });
    // hojas con renglones y margen
    [HOJA_IZQ, HOJA_DER].forEach(h => this.hoja(g, h.x, h.y, h.w));
    // lomo: sombra a cada lado
    g.fillStyle(0x94b0c2).fillRect(LOMO - 4, HOJA_IZQ.y, 2, ALTO_HOJA).fillRect(LOMO + 2, HOJA_IZQ.y, 2, ALTO_HOJA);
    g.fillStyle(0x566c86).fillRect(LOMO - 2, HOJA_IZQ.y, 4, ALTO_HOJA);
    // cinta para marcar la página
    g.fillStyle(0xb13e53).fillRect(LOMO + 30, LIBRO.y + LIBRO.h - 2, 4, 9).fillTriangle(LOMO + 30, LIBRO.y + LIBRO.h + 7, LOMO + 34, LIBRO.y + LIBRO.h + 7, LOMO + 32, LIBRO.y + LIBRO.h + 4);
  }

  // una hoja de cuaderno: papel, renglones y la línea roja del margen
  hoja(g, x, y, w) {
    g.fillStyle(PAPEL).fillRect(x, y, w, ALTO_HOJA);
    for (let ry = y + 18; ry < y + ALTO_HOJA - 4; ry += 9) g.fillStyle(RENGLON).fillRect(x + 4, ry, w - 8, 1);
    g.fillStyle(0xf2b8b8).fillRect(x + 10, y + 2, 1, ALTO_HOJA - 4);
  }

  // esquina doblada que se puede tocar para pasar la página
  esquina(x, dir) {
    const y = LIBRO.y + LIBRO.h - 2;
    const g = this.add.graphics().setDepth(50);
    const pts = dir > 0 ? [[x, y - 14], [x, y], [x - 14, y]] : [[x, y - 14], [x, y], [x + 14, y]];
    g.fillStyle(0xe4e6ec).fillTriangle(...pts.flat());
    g.lineStyle(1, 0x94b0c2).strokeTriangle(...pts.flat());
    const flecha = texto(this, x - dir * 5, y - 7, dir > 0 ? "▸" : "◂", { tam: 7, color: TINTA }).setDepth(51);
    const zona = this.add.zone(x - dir * 9, y - 9, 22, 22).setInteractive({ useHandCursor: true }).setDepth(52);
    zona.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); this.pasar(dir); });
    this.tweens.add({ targets: flecha, x: flecha.x + dir * 1.5, duration: 450, yoyo: true, repeat: -1 });
    return { g, flecha, zona };
  }

  actualizarNavegacion() {
    const ult = this.paginas.length - 1;
    this.indicador.setText(llenar(this.t.pagina, { n: this.actual + 1, total: this.paginas.length }));
    [[this.esquinaIzq, this.actual > 0], [this.esquinaDer, this.actual < ult]].forEach(([e, ver]) => {
      e.g.setVisible(ver); e.flecha.setVisible(ver);
      if (ver) e.zona.setInteractive(); else e.zona.disableInteractive();
    });
    const fin = this.actual === ult;
    this.otraVez.caja.setVisible(fin); this.otraVez.etiqueta.setVisible(fin);
    if (fin) this.otraVez.caja.setInteractive(); else this.otraVez.caja.disableInteractive();
  }

  // ================================================================ pasar página
  pasar(dir) {
    const nueva = this.actual + dir;
    if (this.pasando || nueva < 0 || nueva >= this.paginas.length) return;
    this.pasando = true;
    this.actual = nueva;
    this.actualizarNavegacion();
    // la hoja que gira: tapa la hoja de un lado, se dobla hacia el lomo y
    // aparece del otro lado (dos medios giros cortos)
    const [desde, hacia] = dir > 0 ? [HOJA_DER, HOJA_IZQ] : [HOJA_IZQ, HOJA_DER];
    const vieja = dir > 0 ? this.capaDer : this.capaIzq;
    const hojaGira = (h, origen) => {
      const g = this.add.graphics().setDepth(100);
      this.hoja(g, 0, 0, h.w);
      const c = this.add.container(origen === 0 ? LOMO : LOMO, h.y, [g]).setDepth(100);
      g.x = origen === 0 ? 0 : -h.w;              // pegada al lomo
      return c;
    };
    const lado1 = hojaGira(desde, dir > 0 ? 0 : 1);
    vieja?.destroy();
    this.armarLado(dir > 0 ? "der" : "izq", nueva);
    this.tweens.add({
      targets: lado1, scaleX: 0, duration: 120, ease: "Sine.easeIn",
      onComplete: () => {
        lado1.destroy();
        const lado2 = hojaGira(hacia, dir > 0 ? 1 : 0).setScale(0, 1);
        this.tweens.add({
          targets: lado2, scaleX: 1, duration: 120, ease: "Sine.easeOut",
          onComplete: () => {
            (dir > 0 ? this.capaIzq : this.capaDer)?.destroy();
            this.armarLado(dir > 0 ? "izq" : "der", nueva);
            lado2.destroy();
            this.pasando = false;
          }
        });
      }
    });
  }

  mostrar(i) {
    this.capaIzq?.destroy(); this.capaDer?.destroy();
    this.armarLado("izq", i); this.armarLado("der", i);
  }

  armarLado(lado, i) {
    const p = this.paginas[i];
    const c = this.add.container(0, 0).setDepth(10);
    if (lado === "izq") { this.capaIzq = c; this.ladoIzquierdo(c, p); }
    else { this.capaDer = c; this.ladoDerecho(c, p); }
  }

  // ================================================================ hoja izquierda
  ladoIzquierdo(c, p) {
    this.marco(c);
    p.dibujo?.(c);
    // nota al margen "¿Y si…?" con otra letra, un poco torcida
    if (p.ysi) {
      const nota = this.add.container(HOJA_IZQ.x + 16, FOTO.y + FOTO.h + 10).setAngle(-2);
      const titulo = this.add.text(0, 0, this.t.ysi, { fontFamily: MARGEN, fontSize: "7px", fontStyle: "bold", color: TINTA_ROJA }).setResolution(RES_MANO);
      const cuerpo = this.ajustar(this.add.text(0, 10, p.ysi, { fontFamily: MARGEN, fontSize: "6px", fontStyle: "italic", color: TINTA_ROJA,
        wordWrap: { width: HOJA_IZQ.w - 26 }, lineSpacing: 1 }).setResolution(RES_MANO), ALTO_HOJA - FOTO.h - 32);
      nota.add([titulo, cuerpo]);
      c.add(nota);
    } else if (!p.portada) {
      c.add(this.mano(HOJA_IZQ.x + 16, FOTO.y + FOTO.h + 12, "~ " + (p.titulo || "") + " ~", { tam: 7, color: "#94b0c2", ancho: HOJA_IZQ.w - 26 }));
    }
  }

  // el "recuadro" donde va el dibujo: una foto pegada con cinta
  marco(c) {
    const g = this.add.graphics();
    g.fillStyle(0x94b0c2).fillRect(FOTO.x - 2, FOTO.y - 1, FOTO.w + 5, FOTO.h + 5);
    g.fillStyle(0xffffff).fillRect(FOTO.x - 3, FOTO.y - 3, FOTO.w + 6, FOTO.h + 6);
    g.fillStyle(0x0b1026).fillRect(FOTO.x, FOTO.y, FOTO.w, FOTO.h);
    for (let i = 0; i < 14; i++) g.fillStyle(0x566c86).fillRect(FOTO.x + 3 + (i * 37) % (FOTO.w - 6), FOTO.y + 3 + (i * 19) % 26, 1, 1);
    g.fillStyle(0xffcd75, 0.75).fillRect(FOTO.x - 8, FOTO.y - 5, 16, 6).fillRect(FOTO.x + FOTO.w - 8, FOTO.y + FOTO.h - 2, 16, 6);
    c.add(g);
  }

  // ================================================================ hoja derecha
  ladoDerecho(c, p) {
    const H = HOJA_DER, x = H.x + 16, w = H.w - 24;
    if (p.portada) return this.paginaPortada(c, x, w);

    c.add(this.mano(x, H.y + 5, p.titulo, { tam: 9, color: "#3b5dc9", ancho: w }));
    if (p.especial) return p.especial(c, x, H.y + 22, w);

    // 1 o 2 frases en primera persona; si no caben, letra un poco más chica
    const espacio = 74;
    const cuerpo = this.ajustar(this.mano(x, H.y + 22, p.frases.join(" "), { tam: 8, color: TINTA, ancho: w }), espacio);
    c.add(cuerpo);

    // costo con iconos (abajo, pequeño)
    const yc = H.y + ALTO_HOJA - 16;
    const o2 = Math.round(p.o2 || 0), rad = Math.round(p.rad || 0);
    if (!o2 && !rad) c.add(this.mano(x, yc - 1, this.t.costo_nada, { tam: 6, color: "#566c86", ancho: w }));
    else {
      let cx = x;
      [[o2, "icono_o2", "O2"], [rad > 0 ? "+" + rad : rad, "icono_rad", "RAD"]].forEach(([v, icono, nombre]) => {
        if (!v || v === "+0") return;
        c.add(this.add.image(cx + 3, yc + 4, icono));
        const et = texto(this, cx + 9, yc, `${v > 0 && icono === "icono_o2" ? "+" : ""}${v} ${nombre}`, { tam: 6, color: TINTA, origenX: 0, align: "left" });
        c.add(et);
        cx += 16 + et.width;
      });
    }

    // sello
    if (p.sello) c.add(this.sello(H.x + H.w - 38, H.y + ALTO_HOJA - 40, p.sello));
  }

  sello(x, y, tipo) {
    const color = SELLO_COLOR[tipo];
    const s = this.add.container(x, y).setAngle(tipo === "bien" ? -10 : 8);
    const et = this.add.text(0, 0, this.t.sellos[tipo], { fontFamily: "monospace", fontSize: "7px", fontStyle: "bold",
      color: "#" + color.toString(16).padStart(6, "0") }).setOrigin(0.5).setResolution(RES_MANO);
    const w = Math.ceil(et.width) + 8, h = 13;
    const g = this.add.graphics();
    g.lineStyle(1, color, 0.9).strokeRect(-w / 2, -h / 2, w, h).strokeRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
    s.add([g, et]).setAlpha(0.9);
    return s;
  }

  // texto "a mano": letra redondeada a baja resolución
  mano(x, y, contenido, { tam = 8, color = TINTA, ancho = 120, origenX = 0 } = {}) {
    return this.add.text(x, y, contenido, { fontFamily: MANO, fontSize: tam + "px", color, wordWrap: { width: ancho }, lineSpacing: 0 })
      .setOrigin(origenX, 0).setResolution(RES_MANO);
  }

  // achica la letra hasta que el texto quepa en "alto" (para que no se corte)
  ajustar(t, alto) {
    let tam = parseInt(t.style.fontSize, 10);
    while (t.height > alto && tam > 5) t.setFontSize(--tam + "px");
    return t;
  }

  // ================================================================ páginas especiales
  paginaPortada(c, x, w) {
    const H = HOJA_DER, t = this.t;
    c.add(this.mano(x, H.y + 14, t.titulo, { tam: 12, color: "#3b5dc9", ancho: w }));
    c.add(this.mano(x, H.y + 36, llenar(t.de, { nombre: estado.nombreClave || estado.textos.final.sin_nombre }), { tam: 9, color: TINTA, ancho: w }));
    const final = this.final();
    c.add(this.ajustar(this.mano(x, H.y + 60, llenar(t.portada_final, { final: estado.textos.final.finales[final].titulo }), { tam: 8, color: TINTA, ancho: w }), 40));
    c.add(this.mano(x, H.y + ALTO_HOJA - 22, t.portada_pasa, { tam: 7, color: "#566c86", ancho: w }));
  }

  final() {
    const r = estado.misiones?.rescate;
    return estado.causaDerrota() ? "evacuacion" : finalDeMision(estado, r?.mensajes?.length ? r.mensajes : null);
  }

  paginaTierra(c, x, y, w, r) {
    const tx = estado.textos.rescate;
    if (!r.mensajes?.length) return c.add(this.mano(x, y, this.t.tierra.vacio, { tam: 8, ancho: w }));
    let yy = y;
    r.mensajes.forEach(id => {
      const nombre = this.mano(x, yy, "✉ «" + tx.mensajes[id].nombre + "»", { tam: 7, color: "#3b5dc9", ancho: w });
      const resp = this.mano(x + 4, yy + nombre.height, tx.mensajes[id].respuesta, { tam: 7, color: TINTA, ancho: w - 4 });
      c.add([nombre, resp]);
      yy += nombre.height + resp.height + 6;
    });
    // si no caben, se achica todo lo de la hoja
    const alto = yy - y, libre = ALTO_HOJA - 32;
    if (alto > libre) c.list.slice(1).forEach(o => o.setScale(libre / alto).setY(y + (o.y - y) * libre / alto));
  }

  // la planta: solo el recuerdo y una curiosidad que me contó Chispa
  paginaPlanta(c, x, y, w) {
    const P = this.t.planta;
    const intro = this.mano(x, y, P.texto, { tam: 8, color: TINTA, ancho: w });
    const etiqueta = this.mano(x, y + intro.height + 6, P.curiosidad_titulo, { tam: 7, color: "#257179", ancho: w });
    const yDato = etiqueta.y + etiqueta.height + 1;
    const dato = this.ajustar(this.mano(x, yDato, P.curiosidad, { tam: 7, color: TINTA, ancho: w }), HOJA_DER.y + ALTO_HOJA - 8 - yDato);
    c.add([intro, etiqueta, dato]);
  }

  // ================================================================ dibujos (hoja izquierda)
  g(c) { const g = this.add.graphics(); c.add(g); return g; }
  get cx() { return FOTO.x + FOTO.w / 2; }
  get cy() { return FOTO.y + FOTO.h / 2; }
  suelo(g, color = 0x566c86) { g.fillStyle(color).fillRect(FOTO.x, FOTO.y + FOTO.h - 14, FOTO.w, 14); }

  dibujoPortada(c) {
    const g = this.g(c);
    this.suelo(g, 0x94b0c2);
    this.tierra(g, FOTO.x + 92, FOTO.y + 16, 9);
    const astro = crearAstro32(this, estado.traje?.id);
    c.add(this.add.image(this.cx - 12, FOTO.y + FOTO.h - 10, astro + "_0").setOrigin(0.5, 1).setScale(1.5));
    g.fillStyle(0xc2c3c7).fillRect(this.cx + 14, FOTO.y + 20, 1, 34);
    g.fillStyle(0xb13e53).fillRect(this.cx + 15, FOTO.y + 20, 14, 9);
    g.fillStyle(ORO).fillRect(this.cx + 20, FOTO.y + 23, 3, 3);
    c.add(this.add.image(this.cx + 32, FOTO.y + FOTO.h - 12, "chispa_px").setOrigin(0.5, 1));
  }

  dibujoMochila(c) {
    const g = this.g(c), lista = estado.mochila, x = this.cx, y = FOTO.y + 6;
    g.fillStyle(0x1a1c2c).fillRoundedRect(x - 17, y - 1, 34, 34, 6);                      // contorno
    g.fillStyle(0x3b5dc9).fillRoundedRect(x - 16, y, 32, 32, 5);                          // cuerpo
    g.fillStyle(0x29366f).fillRect(x - 6, y - 4, 12, 3).fillRect(x - 7, y - 4, 1, 4).fillRect(x + 6, y - 4, 1, 4);   // asa
    g.fillStyle(0x29366f).fillRoundedRect(x - 16, y, 32, 11, { tl: 5, tr: 5, bl: 2, br: 2 });   // tapa
    g.fillStyle(0x41a6f6).fillRect(x - 14, y + 2, 28, 1);
    g.fillStyle(0x29366f).fillRect(x - 10, y + 10, 3, 18).fillRect(x + 7, y + 10, 3, 18);   // correas
    g.fillStyle(0xffcd75).fillRect(x - 11, y + 13, 5, 3).fillRect(x + 6, y + 13, 5, 3);    // hebillas
    g.fillStyle(0x29366f).fillRoundedRect(x - 6, y + 18, 12, 10, 2);                      // bolsillo
    g.fillStyle(0x41a6f6).fillRect(x - 4, y + 20, 8, 1);
    lista.forEach((id, i) => c.add(this.add.image(x + (i - (lista.length - 1) / 2) * 17, FOTO.y + 52, "px_obj_" + id).setScale(0.9)));
  }

  dibujoEquipo(c) {
    const g = this.g(c);
    this.suelo(g);
    const astro = crearAstro32(this, estado.traje.id);
    c.add(this.add.image(this.cx - 24, FOTO.y + FOTO.h - 10, astro + "_0").setOrigin(0.5, 1).setScale(1.25));
    c.add(this.add.image(this.cx + 26, FOTO.y + FOTO.h - 8, "nave_" + estado.nave.id).setOrigin(0.5, 1).setScale(0.8));
  }

  // rover con el astronauta adentro (mismo armado que en Exterior)
  rover(c, x, y, escala = 1, voltear = false) {
    const r = this.add.container(x, y).setScale(voltear ? -escala : escala, escala);
    r.add([this.add.ellipse(0, 1, 40, 4, 0x1a1c2c, 0.5), this.add.image(-20, -21, "rover_cuerpo").setOrigin(0),
      this.piloto(), ...[-13, 11].map(dx => this.add.image(dx, -6, "rover_rueda"))]);
    c.add(r);
    return r;
  }
  // piloto sentado: la mitad de arriba del astronauta con el traje elegido
  piloto() {
    return this.add.image(-4, -12, crearAstro32(this, estado.traje?.id) + "_0")
      .setCrop(0, 0, 32, 21).setOrigin(0.5, 21 / 32).setScale(0.6);
  }
  astro(c, x, y, escala = 1, cuadro = 0) {      // el astronauta con el traje que se eligió
    const img = this.add.image(x, y, crearAstro32(this, estado.traje?.id) + "_" + cuadro).setOrigin(0.5, 1).setScale(escala);
    c.add(img);
    return img;
  }
  itzel(c, x, y, escala = 1) {                  // Itzel con su traje morado
    const img = this.add.image(x, y, "itzel_0").setOrigin(0.5, 1).setScale(escala);
    c.add(img);
    return img;
  }
  // ondas de radio: arcos con centro en (x, y) que se abren hacia el ángulo "a"
  ondas(g, x, y, a, radios, color) {
    g.lineStyle(1, color);
    radios.forEach(rr => { g.beginPath(); g.arc(x, y, rr, a - 0.35, a + 0.35); g.strokePath(); });
  }
  tierra(g, x, y, r) {
    g.fillStyle(0x1a1c2c).fillCircle(x, y, r + 1);
    g.fillStyle(0x29adff).fillCircle(x, y, r);
    const k = r / 9;                                                   // continentes escalados al tamaño
    g.fillStyle(0x38b764)
      .fillRect(x - 6 * k, y - 5 * k, 5 * k, 4 * k).fillRect(x - 5 * k, y - 1 * k, 3 * k, 4 * k)
      .fillRect(x + 1 * k, y - 3 * k, 4 * k, 3 * k).fillRect(x + 2 * k, y, 3 * k, 5 * k).fillRect(x - 1 * k, y + 5 * k, 2 * k, 2 * k);
    g.fillStyle(0xf4f4f4).fillRect(x - 4 * k, y - 7 * k, 6 * k, Math.max(1, k)).fillRect(x + 1 * k, y + 3 * k, 5 * k, Math.max(1, k));   // nubes
    g.fillStyle(0x1a1c2c, 0.35).slice(x, y, r, -Math.PI / 2, Math.PI / 2, false).fillPath();   // lado de noche
  }

  dibujoRuta(c, id) {
    const g = this.g(c), abajo = FOTO.y + FOTO.h;
    if (id === "crater") {
      // como la foto del cráter: el rover baja al cráter oscuro con su huella detrás
      g.fillStyle(0x333c57).fillEllipse(this.cx + 8, this.cy + 10, 96, 34);
      g.fillStyle(0x1a1c2c).fillEllipse(this.cx + 8, this.cy + 12, 76, 22);
      [[-14, 10], [16, 16], [30, 8], [2, 6]].forEach(([dx, dy]) => g.fillStyle(0xbff3ff).fillRect(this.cx + 8 + dx, this.cy + dy, 2, 1));
      for (let i = 0; i < 7; i++) g.fillStyle(0x566c86).fillRect(FOTO.x + 4 + i * 4, FOTO.y + 26 + i * 2, 2, 1).fillRect(FOTO.x + 4 + i * 4, FOTO.y + 29 + i * 2, 2, 1);
      c.add(this.add.image(this.cx + 30, this.cy + 14, "roca_1"));
      c.add(this.add.image(this.cx - 16, this.cy + 16, "roca_2"));
      this.rover(c, this.cx - 16, this.cy + 6, 0.7);
    } else {
      // la cresta: loma con luz, el rover arriba
      g.fillStyle(ORO).fillCircle(FOTO.x + 12, FOTO.y + 10, 6);
      g.fillStyle(0x566c86).fillPoints([{ x: FOTO.x, y: abajo }, { x: FOTO.x, y: this.cy + 6 }, { x: this.cx - 10, y: this.cy - 8 },
        { x: this.cx + 20, y: this.cy - 6 }, { x: FOTO.x + FOTO.w, y: this.cy + 8 }, { x: FOTO.x + FOTO.w, y: abajo }], true);
      g.fillStyle(0x94b0c2).fillPoints([{ x: FOTO.x, y: this.cy + 6 }, { x: this.cx - 10, y: this.cy - 8 }, { x: this.cx + 20, y: this.cy - 6 },
        { x: this.cx + 16, y: this.cy - 3 }, { x: this.cx - 10, y: this.cy - 5 }, { x: FOTO.x, y: this.cy + 9 }], true);
      g.fillStyle(0x1a1c2c).fillEllipse(this.cx + 30, abajo - 8, 30, 8);           // el cráter queda abajo, a oscuras
      this.rover(c, this.cx + 4, this.cy - 6, 0.7);
    }
    // banderita de Itzel
    g.fillStyle(0xb13e53).fillRect(FOTO.x + FOTO.w - 12, FOTO.y + FOTO.h - 24, 1, 10).fillRect(FOTO.x + FOTO.w - 11, FOTO.y + FOTO.h - 24, 6, 4);
  }

  dibujoCrater(c) {
    const g = this.g(c);
    g.fillStyle(0x333c57).fillEllipse(this.cx, this.cy + 8, 90, 36);
    g.fillStyle(0x1a1c2c).fillEllipse(this.cx, this.cy + 10, 70, 24);
    [[-20, 8], [6, 14], [22, 6], [-6, 4]].forEach(([dx, dy]) => g.fillStyle(0xbff3ff).fillRect(this.cx + dx, this.cy + dy, 2, 1));
    c.add(this.add.image(this.cx - 26, this.cy + 6, "roca_1"));
    c.add(this.add.image(this.cx + 30, this.cy + 12, "roca_2"));
    this.rover(c, this.cx, this.cy + 12, 0.7);
  }

  dibujoHuellas(c, mal) {
    // todo el rastro va sobre el suelo: más chico y más junto mientras más lejos
    const g = this.g(c), horiz = FOTO.y + 22, abajo = FOTO.y + FOTO.h;
    g.fillStyle(0x94b0c2).fillRect(FOTO.x, horiz, FOTO.w, FOTO.h - 22);
    g.fillStyle(0xa9bccb).fillRect(FOTO.x, horiz + 18, FOTO.w, 4);
    this.tierra(g, FOTO.x + FOTO.w - 14, FOTO.y + 11, 8);
    // huellas de bota de Itzel (izquierda), de cerca a lejos
    for (let i = 0; i < 7; i++) {
      const f = 1 - i / 8, y = abajo - 5 - i * 5.5 * f - i * 1.5, x = this.cx - 32 + i * 3 + (i % 2 ? 3 : -3) * f;
      g.fillStyle(0x566c86).fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(3 * f)), Math.max(1, Math.round(2 * f)));
    }
    this.itzel(c, this.cx - 10, horiz + 4, 0.4);
    // marcas de ruedas del rover de carga (derecha): dos líneas de rayitas
    for (let i = 0; i < 8; i++) {
      const f = 1 - i / 10, y = abajo - 4 - i * 4.5;
      g.fillStyle(0x566c86).fillRect(Math.round(this.cx + 18 + i * 2), Math.round(y), Math.max(1, Math.round(4 * f)), 1)
        .fillRect(Math.round(this.cx + 30 + i), Math.round(y), Math.max(1, Math.round(4 * f)), 1);
    }
    if (mal) g.lineStyle(2, 0xb13e53).lineBetween(this.cx + 16, horiz + 8, this.cx + 40, abajo - 6).lineBetween(this.cx + 40, horiz + 8, this.cx + 16, abajo - 6);
    else g.lineStyle(2, 0x38b764).lineBetween(this.cx - 44, abajo - 14, this.cx - 40, abajo - 10).lineBetween(this.cx - 40, abajo - 10, this.cx - 33, abajo - 20);
  }

  dibujoRocas(c, pie) {
    const g = this.g(c);
    this.suelo(g);
    [[-8, 0], [10, -4], [26, 2]].forEach(([dx, dy]) => c.add(this.add.image(this.cx + dx, FOTO.y + FOTO.h - 12 + dy, "roca_0").setOrigin(0.5, 1)));
    const r = this.rover(c, FOTO.x + 22, FOTO.y + FOTO.h - 8, 0.6);
    if (pie) {
      r.list[2].setVisible(false);                                   // el rover se queda vacío
      this.astro(c, this.cx + 12, FOTO.y + 34, 0.6, 1);
    }
  }

  dibujoTormenta(c, eleccion) {
    const g = this.g(c), piso = FOTO.y + FOTO.h - 14;
    this.suelo(g);
    g.fillStyle(ORO).fillCircle(FOTO.x + 12, FOTO.y + 10, 7);
    const x = this.cx + 14;
    // refugio: el saliente (techo de roca) o el rover tapan los rayos
    const techo = eleccion === "saliente" ? { x1: x - 22, x2: x + 26, y: piso - 26 }
      : eleccion === "rover" ? { x1: x - 22, x2: x + 22, y: piso - 22 } : null;
    // la radiación cae inclinada desde el Sol (rayitas en diagonal)
    for (let i = 0; i < 26; i++) {
      const rx = FOTO.x + 22 + (i * 17) % 82, ry = FOTO.y + 3 + (i * 11) % 40;
      for (let k = 0; k < 5; k++) {
        const px = rx + k, py = ry + k;
        if (py > piso - 1 || px > FOTO.x + FOTO.w - 1) break;
        if (techo && px >= techo.x1 && px <= techo.x2 && py >= techo.y) break;
        g.fillStyle(k === 4 ? 0xffcd75 : 0xef7d57).fillRect(px, py, 1, 1);
      }
    }
    if (eleccion === "saliente") {
      g.fillStyle(0x566c86).fillRect(x - 20, piso - 26, 44, 6);
      g.fillStyle(0x333c57).fillRect(x + 18, piso - 26, 6, 26).fillRect(x - 20, piso - 21, 44, 1);
      this.astro(c, x, piso + 2, 0.6);
    } else if (eleccion === "rover") {
      // el rover grande arriba y el astronauta acostado abajo, entre las ruedas
      this.rover(c, x, piso + 1, 1.25).list[2].setVisible(false);   // nadie manejando: el astronauta está abajo
      g.fillStyle(0x1a1c2c, 0.5).fillEllipse(x - 1, piso + 1, 26, 3);
      const acostado = this.add.image(x - 2, piso - 4, crearAstro32(this, estado.traje?.id) + "_0").setScale(0.4).setAngle(-90);
      c.add(acostado);
    } else this.astro(c, x, piso + 2, 0.6, 1);
  }

  dibujoAire(c, aire) {
    const g = this.g(c), y = FOTO.y + FOTO.h - 10;
    this.suelo(g);
    if (aire === "manguera") {
      // un tubo sale de mi tanque y llega al traje de Itzel; cuelga hacia abajo
      const ax = this.cx - 22, ix = this.cx + 22;
      this.astro(c, ax, y);
      c.add(this.add.image(ax - 12, y - 8, "px_obj_oxigeno").setScale(0.6));
      this.itzel(c, ix, y);
      const x0 = ax - 9, y0 = y - 12, x1 = ix - 4, y1 = y - 14, ym = y + 2;
      const punto = t => ({ x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ym + t * t * y1 });
      for (let i = 0; i <= 30; i++) { const p = punto(i / 30); g.fillStyle(0x29adff).fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
      [0.25, 0.5, 0.75].forEach(t => { const p = punto(t); g.fillStyle(0xbff3ff).fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 1); });   // burbujas de aire
    } else {
      // le dejo mi reserva a Itzel y voy por otra
      this.itzel(c, this.cx + 22, y);
      c.add(this.add.image(this.cx + 8, y - 5, "px_obj_oxigeno").setScale(0.7));
      this.astro(c, this.cx - 30, y, 1, 1).setFlipX(true);
      for (let i = 0; i < 5; i++) g.fillStyle(0x333c57).fillRect(this.cx - 18 + i * 6, y - 1 + (i % 2), 2, 1);
    }
  }

  // antena parabólica en el suelo apuntando a la Tierra
  antena(c, g, recibir) {
    const piso = FOTO.y + FOTO.h - 14, dx = FOTO.x + 26, dy = piso - 12;
    const tx = FOTO.x + FOTO.w - 16, ty = FOTO.y + 14;
    const a = Math.atan2(ty - dy, tx - dx);
    this.tierra(g, tx, ty, 9);
    g.fillStyle(0x94b0c2).fillRect(dx - 1, dy, 3, 12).fillRect(dx - 5, piso - 1, 11, 2);
    const plato = this.add.graphics();
    plato.fillStyle(0xe4e6ec).fillEllipse(0, 0, 4, 18);
    plato.fillStyle(0x94b0c2).fillEllipse(-1, 0, 2, 14);
    plato.fillStyle(0xc2c3c7).fillRect(0, -1, 7, 2);
    plato.fillStyle(recibir ? 0x5cff8a : ORO).fillRect(7, -1, 2, 2);
    c.add(this.add.container(dx, dy - 2, [plato]).setRotation(a));
    // la señal: de la antena a la Tierra (enviar) o de la Tierra a la antena (recibir)
    const d = Math.hypot(tx - dx, ty - dy);
    if (recibir) {
      this.ondas(g, tx, ty, a + Math.PI, [d - 14, d - 26, d - 38], 0x5cff8a);
      const luz = this.add.rectangle(dx + 6, piso - 4, 2, 2, 0x5cff8a);
      this.tweens.add({ targets: luz, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
      c.add(luz);
    } else this.ondas(g, dx, dy - 2, a, [12, 24, 36, 48], ORO);
    for (let i = 0.2; i < 0.9; i += 0.08) g.fillStyle(recibir ? 0x5cff8a : ORO, 0.6).fillRect(Math.round(dx + (tx - dx) * i), Math.round(dy + (ty - dy) * i), 1, 1);
  }

  dibujoMensajes(c) {
    const g = this.g(c);
    this.suelo(g);
    this.antena(c, g, false);
    this.astro(c, FOTO.x + 44, FOTO.y + FOTO.h - 10, 0.6);
  }

  dibujoTierra(c) {
    const g = this.g(c);
    this.suelo(g);
    this.antena(c, g, true);
    this.astro(c, FOTO.x + 44, FOTO.y + FOTO.h - 10, 0.6);
    this.itzel(c, FOTO.x + 56, FOTO.y + FOTO.h - 10, 0.6);
  }

  dibujoRegreso(c, regreso) {
    const g = this.g(c), y = FOTO.y + FOTO.h - 10;
    this.suelo(g, 0x94b0c2);
    this.base(g, FOTO.x + FOTO.w - 22, y);
    if (regreso === "rover") this.rover(c, this.cx - 12, y, 0.8);
    else {
      this.astro(c, this.cx - 16, y, 0.75, 1);
      this.itzel(c, this.cx, y, 0.75);
      for (let i = 0; i < 6; i++) g.fillStyle(0x566c86).fillRect(FOTO.x + 6 + i * 6, y - 2 + (i % 2), 2, 1);
    }
  }
  base(g, x, y) {
    const K = 0x1a1c2c;
    g.fillStyle(K).fillRect(x - 31, y - 21, 6, 1);                                       // panel solar
    g.fillStyle(0x29366f).fillRect(x - 33, y - 26, 10, 5);
    g.fillStyle(0x3b5dc9).fillRect(x - 32, y - 25, 3, 3).fillRect(x - 28, y - 25, 3, 3);
    g.fillStyle(K).fillRect(x - 29, y - 21, 1, 21);
    g.fillStyle(K).fillCircle(x, y - 13, 12);                                            // cúpula
    g.fillStyle(0xf4f4f4).fillCircle(x, y - 13, 11);
    g.fillStyle(0xc2c3c7).fillRect(x - 11, y - 13, 22, 2);
    g.fillStyle(K).fillRect(x - 17, y - 13, 34, 14);                                     // módulo
    g.fillStyle(0xe4e6ec).fillRect(x - 16, y - 12, 32, 12);
    g.fillStyle(0xef7d57).fillRect(x - 16, y - 9, 32, 2);                                 // franja naranja
    g.fillStyle(0x29adff).fillRect(x - 13, y - 6, 4, 3).fillRect(x + 9, y - 6, 4, 3);    // ventanas con luz
    g.fillStyle(K).fillRect(x - 4, y - 7, 8, 7);                                         // puerta
    g.fillStyle(0x566c86).fillRect(x - 3, y - 6, 6, 6);
    g.fillStyle(0x5cff8a).fillRect(x + 4, y - 5, 1, 1);
    g.fillStyle(K).fillRect(x + 4, y - 30, 1, 7);                                        // antena con luz
    g.fillStyle(0xff5c5c).fillRect(x + 3, y - 31, 3, 2);
  }

  dibujoPlanta(c) {
    // la hojita "pegada" en la foto con cinta
    const g = this.g(c);
    g.fillStyle(0x257179).fillRect(FOTO.x, FOTO.y, FOTO.w, FOTO.h);
    c.add(this.add.image(this.cx, this.cy + 4, "planta").setScale(3));
    g.fillStyle(0xffcd75, 0.8).fillRect(this.cx - 22, this.cy - 22, 16, 5).fillRect(this.cx + 8, this.cy + 22, 16, 5);
    c.add(this.add.image(this.cx + 38, this.cy + 18, "chispa_px"));
  }
}
