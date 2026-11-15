// Final: cuatro finales, bitácora en cadena, "¿Y si…?", la planta, fuentes NASA
// Lee: todo el estado y datos.json · Escribe: insignia; «Jugar otra vez» → nuevaPartida() · Sigue: Equipo.
// e insignia. Dueño: Rol 5.
// Finales (ninguno castiga), según oxígeno, radiación y los 2 mensajes del Rescate:
//   misión completa (tormenta + hielo) · hielo en secreto (tormenta + ayuda)
//   rescate sin aviso (ayuda + hielo) · evacuación (oxígeno 0 o radiación 100:
//   Chispa explica qué decisión lo causó).
// Cada fuente dice si es "Dato real" o "Dato de ejemplo" (nunca se presenta un
// ejemplo como real) y se puede tocar para abrir su página.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, navegarConTeclado, llenar } from "../ui.js";
import { crearTexturasMochila, crearTextura } from "../pixelart.js";
import { crearTexturasExterior } from "../arteExterior.js";
import { finalDeMision, proteccion } from "../modelo/simulacion.js";
import { fechaLarga } from "../nasa/sol.js";


// ---------------------------------------------------------------- insignia (A-10)
const FORMAS = ["circulo", "escudo", "hexagono", "estrella"];
const COLORES = [0x3b5dc9, 0xa47de0, 0xef7d57, 0x38b764];
const SIMBOLOS = ["luna_px", "nave_pequena", "planta", "chispa_px"];
const ORO = 0xffcd75, CONTORNO = 0x1a1c2c;
const INSIGNIA_INICIAL = { forma: "circulo", color: COLORES[0], simbolo: "luna_px" };
const LUNA = [
  "...kkkkk...",
  "..kMMMMMk..",
  ".kMMNMMMMk.",
  "kMMNNMMMMMk",
  "kMMMMMMNMMk",
  "kMMMMMMNNMk",
  "kMNMMMMMMMk",
  "kMMMMMMMMMk",
  ".kMMMNMMMk.",
  "..kMMMMMk..",
  "...kkkkk..."
];

// Iconos de las tarjetas de fuentes (mapas de letras, como pixelart.js)
const ICONOS = {
  ico_sol: ["....y..y....", "..y......y..", "....YYYY....", "y..YYYYYY..y", "...YYYYYY...", "...YYYYYY...", "y..YYYYYY..y", "....YYYY....", "..y......y..", "....y..y...."],
  ico_frio: [".....c.....", "..c..c..c..", "...c.c.c...", "....ccc....", "ccccccccccc", "....ccc....", "...c.c.c...", "..c..c..c..", ".....c....."],
  ico_huella: ["..kkkk..", ".kMMMMk.", ".kMMMMk.", ".kMMMMk.", "..kMMk..", "..kkkk..", ".kMMMMk.", ".kMMMMk.", "..kkkk.."],
  ico_rad: ["...kkkkk...", "..kyyyyyk..", ".kyykkkyyk.", "kyyk...kyyk", "kyy.kkk.yyk", "kyy.kYk.yyk", "kkkk.k.kkkk", "..kyyyyyk..", "...kkkkk..."]
};
const PALETA_ICONOS = { k: CONTORNO, y: 0xef7d57, Y: 0xffcd75, c: 0xbff3ff, M: 0x94b0c2 };
// qué dibujo lleva cada tema (por palabras del tema)
function iconoFuente(tema = "") {
  const t = tema.toLowerCase();
  if (/radiaci|radiation/.test(t)) return "ico_rad";
  if (/planta|plant/.test(t)) return "planta";
  if (/rover|velocidad|speed/.test(t)) return "rover_cuerpo";
  if (/huella|footprint|track/.test(t)) return "ico_huella";
  if (/polvo|dust/.test(t)) return "roca_1";
  if (/luz|light/.test(t)) return "px_obj_linterna";
  if (/fr[ií]o|hielo|cr[aá]ter|sombra|cold|ice|crater|shadow/.test(t)) return "ico_frio";
  if (/hueso|m[uú]sculo|estaci|bone|muscle|station/.test(t)) return "astro32_0";
  if (/tormenta|cme|sol|storm|sun/.test(t)) return "ico_sol";
  return "luna_px";
}

// Puntos del contorno de cada forma (null = círculo)
function puntosForma(forma, cx, cy, r) {
  const poligono = (n, a0, radio) => Array.from({ length: n }, (_, i) => {
    const a = a0 + i * 2 * Math.PI / n;
    return { x: cx + Math.cos(a) * radio(i), y: cy + Math.sin(a) * radio(i) };
  });
  if (forma === "escudo") return [[-1, -0.85], [1, -0.85], [1, 0.15], [0, 1], [-1, 0.15]].map(([x, y]) => ({ x: cx + x * r, y: cy + y * r }));
  if (forma === "hexagono") return poligono(6, Math.PI / 6, () => r);
  if (forma === "estrella") return poligono(10, -Math.PI / 2, i => (i % 2 ? r * 0.55 : r));
  return null;
}

// Dibuja una insignia completa; devuelve un contenedor para moverla o borrarla
export function dibujarInsignia(escena, cx, cy, r, ins, exito = false) {
  const c = escena.add.container(0, 0);
  const g = escena.add.graphics();
  c.add(g);
  const capa = (color, radio) => {
    const p = puntosForma(ins.forma, cx, cy, radio);
    g.fillStyle(color);
    if (p) g.fillPoints(p, true); else g.fillCircle(cx, cy, radio);
  };
  capa(CONTORNO, r + 1.5);
  capa(ORO, r);                     // borde dorado
  capa(ins.color, r * 0.8);         // color elegido
  // símbolo al centro, escalado en múltiplos enteros para que el pixel art se vea nítido
  const img = escena.textures.get(ins.simbolo).getSourceImage();
  const caja = r * (ins.forma === "estrella" ? 0.75 : 1.05);
  const v = Math.min(caja / img.width, caja / img.height);
  c.add(escena.add.image(cx, cy + (ins.forma === "escudo" ? -r * 0.08 : 0), ins.simbolo).setScale(v >= 1 ? Math.floor(v) : v));
  // misión cumplida: tres estrellas doradas arriba
  if (exito) [-0.55, 0, 0.55].forEach((dx, i) => {
    const e = puntosForma("estrella", cx + dx * r, cy - r - (i === 1 ? 5 : 2), Math.max(2, r * 0.12));
    g.fillStyle(CONTORNO).fillPoints(puntosForma("estrella", cx + dx * r, cy - r - (i === 1 ? 5 : 2), Math.max(2, r * 0.12) + 1), true);
    g.fillStyle(ORO).fillPoints(e, true);
  });
  return c;
}

// Todas las fuentes NASA que usa el juego, con su etiqueta real/ejemplo
export function fuentesNASA(d) {
  const z = d.zona_aterrizaje, T = estado.textos.final.temas;
  const lista = [
    { tema: T.cme, ...d.cme },
    z && { tema: T.zona, ...z, fuente: `${z.fuente} · ${z.nombre}` },
    d.polo_sur && { tema: T.polo_sur, ...d.polo_sur },
    { tema: T.rutas, fuente: d.rutas_fuente, link: d.rutas_link, ejemplo: d.rutas.some(r => r.ejemplo) },
    { tema: T.rover, ...d.rover },
    { tema: T.radiacion, ...d.radiacion },
    { tema: T.planta, ...d.planta },
    d.luz_polo_sur && { tema: T.luz, ...d.luz_polo_sur },
    d.crater_helado && { tema: T.frio, ...d.crater_helado.temperatura },
    d.crater_helado?.polvo && { tema: T.polvo, ...d.crater_helado.polvo },
    d.itzel_estacion && { tema: d.itzel_estacion.tema, ...d.itzel_estacion },
    d.planta_espacio && { tema: d.planta_espacio.tema, ...d.planta_espacio },
    ...(d.fuentes_extra || []).filter(f => f.tema)
  ].filter(Boolean);
  // Una fuente sin nombre todavía ("COMPLETAR") siempre cuenta como ejemplo
  return lista.map(f => {
    const pendiente = !f.fuente || /COMPLETAR/i.test(f.fuente);
    return { ...f, fuente: pendiente ? "fuente por completar" : f.fuente, ejemplo: f.ejemplo || pendiente };
  });
}

export class Final extends Phaser.Scene {
  constructor() { super("Final"); }

  create() {
    navegarConTeclado(this);                      // flechas + Enter (ver ui.js)
    crearTexturasMochila(this);                   // chispa_px, planta, naves y objetos (por si se abre en modo prueba)
    crearTexturasExterior(this);                  // rover y rocas (iconos de las fuentes)
    Object.entries(ICONOS).forEach(([clave, mapa]) => crearTextura(this, clave, mapa, PALETA_ICONOS));
    crearTextura(this, "luna_px", LUNA, { k: CONTORNO, M: 0xc2c3c7, N: 0x566c86 });
    this.t = estado.textos.final;
    this.capaInsignia = null;          // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    const t = this.t, r = estado.misiones?.rescate;
    this.final = estado.causaDerrota() ? "evacuacion" : finalDeMision(estado, r?.mensajes?.length ? r.mensajes : null);
    this.exito = this.final === "completa";       // insignia dorada con estrellas
    const f = t.finales[this.final];

    titulo(this, f.titulo, 6);
    this.dibujarFinal(this.final);
    const cuerpo = texto(this, 126, 24, `${estado.nombreClave || t.sin_nombre}: ${f.texto}`, { tam: 6, ancho: 186, origenX: 0, align: "left" });
    const voz = this.final === "evacuacion" ? this.porQueEvacuacion() : f.voz;
    if (this.final === "evacuacion" || this.final === "completa") this.add.image(132, cuerpo.y + cuerpo.height + 8, "chispa_px");
    const dice = texto(this, 142, cuerpo.y + cuerpo.height + 3, voz, { tam: 6, ancho: 170, origenX: 0, align: "left", color: "#ffcd75" });

    // El Sol de verdad: la tormenta de la partida salió del Sol real (DONKI en vivo o una famosa)
    this.lineaSol(Math.max(dice.y + dice.height + 5, 96));

    // Resumen honesto de las fuentes: cuántas son reales y cuántas de ejemplo
    const fuentes = fuentesNASA(estado.datos);
    const reales = fuentes.filter(x => !x.ejemplo).length;
    texto(this, ANCHO / 2, 129, llenar(t.resumen_fuentes, { reales, ejemplo: fuentes.length - reales }),
      { tam: 5, color: COLOR.tenue, ancho: 300 });

    // Bitácora (el diario de misión: decisiones, "¿Y si…?" y la planta) · Mi insignia · Fuentes / Otra vez
    boton(this, 56, 145, t.b_bitacora, () => this.scene.start("Diario"), 98);
    boton(this, 160, 145, "   " + t.mi_insignia, () => this.abrirInsignia(), 98);
    this.miniInsignia();
    boton(this, 264, 145, t.ver_fuentes, () => this.panelFuentes(fuentes), 98);
    boton(this, 160, 167, t.otra_vez, () => { estado.nuevaPartida(); this.scene.start("Equipo"); }, 98);
  }

  lineaSol(y) {
    const t = this.t, c = estado.datos.cme;
    if (!c?.fecha) return;
    const plantilla = c.en_vivo ? t.sol_vivo : c.nombre ? t.sol_famosa : t.sol_real;
    // columna derecha, debajo de lo que dice Chispa (a la izquierda está la ilustración)
    const linea = texto(this, 126, Math.min(y, 112), llenar(plantilla, { fecha: fechaLarga(c.fecha), vel: c.velocidad_kms, nombre: c.nombre }),
      { tam: 5, ancho: 186, origenX: 0, align: "left", color: "#ff8a5c" });
    if (c.link) linea.setInteractive({ useHandCursor: true })
      .on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); window.open(c.link, "_blank", "noopener"); });
  }

  miniInsignia() {
    this.mini?.destroy();
    this.mini = dibujarInsignia(this, 124, 145, 6.5, estado.insignia || INSIGNIA_INICIAL, this.exito).setDepth(10);
  }

  // ---------------------------------------------------------------- ilustración de cada final
  dibujarFinal(id) {
    const g = this.add.graphics(), X = 8, Y = 22, W = 112, H = 98;
    g.fillStyle(0x05070f).fillRect(X, Y, W, H);
    g.lineStyle(1, 0x333c57).strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);
    for (let i = 0; i < 24; i++) g.fillStyle(0x94b0c2).fillRect(X + 3 + (i * 37) % (W - 6), Y + 3 + (i * 23) % (H - 6), 1, 1);
    const cx = X + W / 2, cy = Y + H / 2 + 6;
    const tierra = () => {
      g.fillStyle(0x29adff).fillCircle(cx, cy, 24);
      g.fillStyle(0x38b764).fillCircle(cx - 8, cy - 5, 7).fillCircle(cx + 9, cy + 8, 5).fillCircle(cx + 6, cy - 12, 3);
    };
    if (id === "completa") {
      tierra();
      // auroras: cintas verdes y moradas sobre el polo (en vez de apagones)
      [[0x5cff8a, 0], [0xa47de0, 4], [0x5cff8a, 8]].forEach(([c, d]) => {
        for (let x = -18; x <= 18; x++) g.fillStyle(c, 0.8).fillRect(cx + x, cy - 30 - d + Math.round(Math.sin(x / 4 + d) * 2), 1, 2);
      });
      const brillo = this.add.circle(cx + 30, Y + 12, 4, 0xffcd75);
      this.tweens.add({ targets: brillo, scale: 1.6, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    } else if (id === "sin_aviso") {
      tierra();
      // satélites: algunos fallan unas horas
      [[-34, -26, true], [30, -30, false], [36, 16, true], [-36, 20, false]].forEach(([dx, dy, falla]) => {
        g.fillStyle(0xc2c3c7).fillRect(cx + dx - 2, cy + dy - 1, 4, 2);
        g.fillStyle(0x29adff).fillRect(cx + dx - 5, cy + dy - 1, 2, 2).fillRect(cx + dx + 3, cy + dy - 1, 2, 2);
        if (falla) {
          const x = this.add.text(cx + dx, cy + dy - 8, "✕", { fontSize: "6px", color: "#ff5c5c" }).setOrigin(0.5).setResolution(4);
          this.tweens.add({ targets: x, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
        }
      });
    } else if (id === "hielo_secreto") {
      // la Luna con hielo escondido en un cráter
      g.fillStyle(0xc2c3c7).fillCircle(cx, cy, 26);
      g.fillStyle(0x566c86).fillCircle(cx - 8, cy + 6, 6).fillCircle(cx + 10, cy - 8, 4);
      [[-10, 7], [-6, 4], [-8, 9]].forEach(([dx, dy]) => {
        const h = this.add.rectangle(cx + dx, cy + dy, 1, 1, 0xbff3ff);
        this.tweens.add({ targets: h, alpha: 0.1, duration: 500 + dx * -30, yoyo: true, repeat: -1 });
      });
    } else {
      // evacuación: una nave automática baja por todos
      g.fillStyle(0x94b0c2).fillRect(X + 1, Y + H - 18, W - 2, 17);
      g.fillStyle(0xc2c3c7).fillRect(X + 1, Y + H - 18, W - 2, 1);
      const nave = this.add.image(cx, Y + 20, "nave_pequena").setScale(0.5).setOrigin(0.5, 1);
      this.tweens.add({ targets: nave, y: Y + H - 18, duration: 2600, ease: "Sine.easeOut" });
      this.add.image(cx - 26, Y + H - 18, "chispa_px").setOrigin(0.5, 1);
    }
  }

  // ---------------------------------------------------------------- evacuación: ¿qué decisión lo causó?
  porQueEvacuacion() {
    const recurso = estado.oxigeno <= 0 ? "oxigeno" : "radiacion";
    const pasos = this.cadena().filter(p => p[recurso]);
    const peor = pasos.sort((a, b) => Math.abs(b[recurso]) - Math.abs(a[recurso]))[0];
    if (!peor) return llenar(this.t["causa_" + recurso], { oxigeno: Math.round(estado.oxigeno), radiacion: Math.round(estado.radiacion) });
    return llenar(this.t.finales.evacuacion.voz, {
      recurso: this.t["recurso_" + recurso], decision: peor.decision,
      valor: recurso === "oxigeno" ? `${peor.oxigeno} O2` : `+${peor.radiacion} ${this.t.recurso_radiacion}`
    });
  }

  // ---------------------------------------------------------------- bitácora en cadena
  // Cada decisión con su consecuencia, de la mochila al último mensaje
  cadena() {
    const t = this.t, tx = estado.textos, m = estado.misiones || {}, pasos = [];
    const efectos = (o2, rad) => rad > 0 ? llenar(t.c_efectos, { o2, rad }) : llenar(t.c_solo_o2, { o2 });
    const add = (decision, consecuencia, oxigeno = 0, radiacion = 0) => pasos.push({ decision, consecuencia, oxigeno, radiacion });
    const nombres = tx.centro_control?.nombres || {};
    if (estado.mochila?.length) add(llenar(t.c_mochila, { objetos: estado.mochila.map(id => nombres[id] || id).join(", ") }),
      estado.lleva("linterna") ? t.c_linterna_si : t.c_linterna_no);
    if (estado.traje && estado.nave) add(llenar(t.c_equipo, {
      traje: tx.equipo?.opciones?.[estado.traje.id]?.nombre || estado.traje.id,
      nave: tx.equipo?.opciones?.[estado.nave.id]?.nombre || estado.nave.id
    }), llenar(t.c_equipo_efecto, { n: Math.round(proteccion(estado) * 10) }));
    // la barra de pruebas puede dejar una ruta sin números: entonces solo se nombra
    if (m.viaje) add(tx.viaje.opciones[m.viaje.eleccion].nombre, m.viaje.oxigeno ? efectos(m.viaje.oxigeno, 0) : "", m.viaje.oxigeno || 0);
    if (m.ruta) add(tx.ruta?.rutas?.[m.ruta.id]?.nombre || m.ruta.id,
      m.ruta.oxigeno === undefined ? "" : efectos(m.ruta.oxigeno, m.ruta.radiacion), m.ruta.oxigeno || 0, m.ruta.radiacion || 0);
    if (m.crater) add(t.c_crater, llenar(t.c_crater_efecto, { o2: m.crater.oxigeno, choques: m.crater.choques }), m.crater.oxigeno);
    const huellas = estado.bitacora.find(b => b.startsWith((estado.textos.huellas.bitacora_bien || "").split(":")[0]));
    if (huellas) add(huellas, "");
    if (m.rocas) add(tx.rocas.opciones[m.rocas.eleccion].nombre, efectos(m.rocas.oxigeno, 0), m.rocas.oxigeno || 0);
    if (m.tormenta) add(tx.tormenta.opciones[m.tormenta.eleccion].nombre, efectos(m.tormenta.oxigeno, m.tormenta.radiacion), m.tormenta.oxigeno, m.tormenta.radiacion);
    const r = m.rescate;
    if (r?.aire) add(tx.rescate.aire[r.aire].nombre, efectos(r.aireEfectos.oxigeno, r.aireEfectos.radiacion), r.aireEfectos.oxigeno, r.aireEfectos.radiacion);
    if (r?.radio) add(tx.rescate.nota_radio.split(" (")[0], llenar(t.c_solo_o2, { o2: r.radio }), r.radio);
    (r?.mensajes || []).forEach(id => add(llenar(t.c_mensaje, { nombre: tx.rescate.mensajes[id].nombre }), tx.rescate.mensajes[id].efecto));
    if (r?.regreso) add(tx.rescate.regreso[r.regreso].nombre, efectos(r.regresoEfectos.oxigeno, r.regresoEfectos.radiacion), r.regresoEfectos.oxigeno, r.regresoEfectos.radiacion);
    return pasos;
  }

  // ---------------------------------------------------------------- diseñador de insignia
  abrirInsignia() {
    this.disenando = { ...(estado.insignia || INSIGNIA_INICIAL) };
    this.dibujarDisenador();
  }

  dibujarDisenador() {
    this.capaInsignia?.destroy();
    const t = this.t, ins = this.disenando;
    const c = this.capaInsignia = this.add.container(0, 0).setDepth(1000);
    c.add([
      this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.85).setOrigin(0).setInteractive(),
      this.add.rectangle(8, 6, ANCHO - 16, ALTO - 12, COLOR.panel).setOrigin(0).setStrokeStyle(1, COLOR.borde),
      texto(this, ANCHO / 2, 10, t.titulo_insignia, { tam: 8, color: COLOR.titulo })
    ]);

    // vista previa grande con la cinta del nombre clave
    c.add(dibujarInsignia(this, 78, 82, 36, ins, this.exito));
    c.add([
      this.add.rectangle(78, 132, 104, 13, COLOR.panel).setStrokeStyle(1, ORO),
      texto(this, 78, 132, estado.nombreClave || "???", { tam: 7, color: COLOR.titulo, origenY: 0.5 }),
      texto(this, 78, 146, t.insignia_mision, { tam: 5, color: COLOR.tenue })
    ]);

    // tres filas de opciones: forma, color y símbolo
    const fila = (y, etiqueta, opciones, actual, dibujar, elegir) => {
      c.add(texto(this, 156, y, etiqueta, { tam: 6, origenX: 0, align: "left", color: COLOR.tenue }));
      opciones.forEach((op, i) => {
        const x = 172 + i * 34, cy = y + 19, sel = op === actual;
        const caja = this.add.rectangle(x, cy, 30, 22, 0x0b1026).setStrokeStyle(sel ? 2 : 1, sel ? ORO : 0x333c57)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); elegir(op); this.dibujarDisenador(); });
        c.add(caja);
        c.add(dibujar(op, x, cy));
      });
    };
    fila(24, t.forma, FORMAS, ins.forma,
      (op, x, y) => dibujarInsignia(this, x, y, 8, { ...ins, forma: op, simbolo: "luna_px" }),
      op => (ins.forma = op));
    fila(64, t.color, COLORES, ins.color,
      (op, x, y) => this.add.rectangle(x, y, 18, 12, op).setStrokeStyle(1, ORO),
      op => (ins.color = op));
    fila(104, t.simbolo, SIMBOLOS, ins.simbolo,
      (op, x, y) => { const img = this.textures.get(op).getSourceImage(); return this.add.image(x, y, op).setScale(Math.min(18 / img.width, 16 / img.height)); },
      op => (ins.simbolo = op));

    const listo = boton(this, 232, 162, t.lista, () => {
      estado.insignia = { ...ins };
      this.capaInsignia.destroy();
      this.capaInsignia = null;
      this.miniInsignia();
    }, 100);
    const bajar = boton(this, 78, 162, t.descargar, () => this.descargarInsignia(), 100);
    c.add([listo.caja, listo.etiqueta, bajar.caja, bajar.etiqueta]);
  }

  // Guarda la insignia (con la cinta del nombre clave) como PNG en el dispositivo.
  // Toma una foto de esa parte de la pantalla: el juego se dibuja ZOOM veces más
  // grande por dentro, así que la imagen sale nítida.
  descargarInsignia() {
    estado.insignia = { ...this.disenando };
    const z = this.cameras.main.zoom, area = { x: 18, y: 32, w: 120, h: 120 };   // insignia, estrellas y cinta
    this.game.renderer.snapshotArea(area.x * z, area.y * z, area.w * z, area.h * z, img => {
      const nombre = (estado.nombreClave || "astronauta").normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();
      const a = document.createElement("a");
      a.href = img.src;
      a.download = `insignia-${nombre}.png`;
      document.body.append(a);
      a.click();
      a.remove();
    });
    // aviso corto dentro del diseñador
    const aviso = texto(this, 78, 172, this.t.descargado, { tam: 5, color: "#5cff8a" }).setDepth(1001);
    this.capaInsignia?.add(aviso);
    this.time.delayedCall(2500, () => aviso.destroy());
  }

  // Fuentes NASA como tarjetas con dibujo (6 por página): cada una con una idea
  // sencilla. Los enlaces siguen en datos.json para el equipo.
  panelFuentes(fuentes, pagina = 0) {
    this.capaFuentes?.destroy();
    const t = this.t, POR_PAGINA = 6, total = Math.ceil(fuentes.length / POR_PAGINA);
    const capa = this.capaFuentes = this.add.container(0, 0).setDepth(1000);
    capa.add([
      this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.85).setOrigin(0).setInteractive(),
      this.add.rectangle(8, 6, ANCHO - 16, ALTO - 12, COLOR.panel).setOrigin(0).setStrokeStyle(1, COLOR.borde),
      texto(this, ANCHO / 2, 9, t.fuentes_titulo, { tam: 8, color: COLOR.titulo }),
      texto(this, ANCHO / 2, 20, t.fuentes_sub, { tam: 5, color: COLOR.tenue, ancho: 290 })
    ]);
    fuentes.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA).forEach((f, i) =>
      capa.add(this.tarjetaFuente(f, 16 + (i % 3) * 98, 31 + Math.floor(i / 3) * 60)));

    // la tormenta está simplificada: se avisa junto a su tarjeta (primera página)
    const nota = estado.textos.tormenta?.nota_simplificacion;
    if (nota && pagina === 0) capa.add(texto(this, ANCHO / 2, 149, "* " + nota, { tam: 5, color: COLOR.tenue, ancho: 290 }));

    const b = [];
    if (pagina > 0) b.push(this.botonChico(36, ALTO - 15, "◂", () => this.panelFuentes(fuentes, pagina - 1), 20));
    if (pagina < total - 1) b.push(this.botonChico(ANCHO - 36, ALTO - 15, "▸", () => this.panelFuentes(fuentes, pagina + 1), 20));
    b.push(this.botonChico(ANCHO / 2, ALTO - 15, this.t.cerrar, () => { capa.destroy(); this.capaFuentes = null; }, 48));
    capa.add(b.flatMap(x => [x.caja, x.etiqueta]));
    capa.add(texto(this, ANCHO - 72, ALTO - 18, llenar(t.fuentes_pagina, { n: pagina + 1, total }), { tam: 5, color: COLOR.tenue }));
    return capa;
  }

  // Tarjeta para niños: un dibujo grande y una idea sencilla (sin abrir páginas).
  // La idea sale de textos.json → final.fuentes_ideas (por tema); si un tema no
  // tiene idea escrita, se usa el nombre del tema.
  // botón más bajito que el de ui.js (12 px de alto, letra 6) para el panel de fuentes
  botonChico(x, y, contenido, alPresionar, ancho) {
    const caja = this.add.rectangle(x, y, ancho, 12, COLOR.panel).setStrokeStyle(1, COLOR.borde).setInteractive({ useHandCursor: true });
    const etiqueta = texto(this, x, y, contenido, { tam: 6, ancho: ancho - 4, origenY: 0.5 });
    caja.on("pointerover", () => caja.setFillStyle(0x2c3770));
    caja.on("pointerout", () => caja.setFillStyle(COLOR.panel));
    caja.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); alPresionar(); });
    return { caja, etiqueta };
  }

  tarjetaFuente(f, x, y) {
    const t = this.t, W = 92, H = 56, c = this.add.container(x, y);
    c.add(this.add.rectangle(0, 0, W, H, 0x0b1026).setOrigin(0).setStrokeStyle(1, f.ejemplo ? 0xef7d57 : 0x38b764));
    // dibujo según el tema, al doble de tamaño
    const clave = iconoFuente(f.tema);
    const img = this.textures.get(clave).getSourceImage();
    const v = Math.min(26 / img.width, 20 / img.height);
    c.add(this.add.image(16, 13, clave).setScale(v >= 1 ? Math.floor(v) : v));
    // tema y sello (real o de ejemplo) al lado del dibujo
    const tema = texto(this, 32, 3, t.fuentes_cortos?.[f.tema] || f.tema, { tam: 5, ancho: W - 35, origenX: 0, align: "left", color: COLOR.titulo });
    const sello = texto(this, 32, tema.y + tema.height + 1, f.ejemplo ? t.fuentes_ejemplo : t.fuentes_real,
      { tam: 5, origenX: 0, color: f.ejemplo ? "#ef7d57" : "#5cff8a" });
    // la idea, en palabras de niño
    const idea = texto(this, 4, 27, t.fuentes_ideas?.[f.tema] || f.tema, { tam: 6, ancho: W - 8, origenX: 0, align: "left" });
    if (idea.height > H - 29) idea.setFontSize("5px");
    c.add([tema, sello, idea]);
    return c;
  }

  // Panel encima de todo con una lista; las filas con link se pueden tocar
  panel(tituloPanel, filas, nota) {
    const capa = this.add.container(0, 0).setDepth(1000);
    capa.add([
      this.add.rectangle(0, 0, ANCHO, ALTO, 0x0b1026, 0.85).setOrigin(0).setInteractive(),   // bloquea lo de atrás
      this.add.rectangle(8, 6, ANCHO - 16, ALTO - 12, COLOR.panel).setOrigin(0).setStrokeStyle(1, COLOR.borde),
      texto(this, ANCHO / 2, 10, tituloPanel, { tam: 8, color: COLOR.titulo })
    ]);
    let y = 26;
    if (nota) {
      const n = texto(this, ANCHO / 2, y, nota, { tam: 5, color: COLOR.tenue, ancho: 290 });
      capa.add(n);
      y += n.height + 4;
    }
    // con muchas filas, letra un poco más chica para que quepan todas
    const tam = filas.length > 9 ? 5 : 6, espacio = tam === 5 ? 1 : 3;
    for (const f of filas) {
      if (y > ALTO - 32) break;
      const fila = texto(this, 16, y, f.texto, { tam, ancho: 288, origenX: 0, align: "left", color: f.color || COLOR.texto });
      if (f.link) {
        fila.setInteractive({ useHandCursor: true })
          .on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); window.open(f.link, "_blank", "noopener"); });
      }
      capa.add(fila);
      y += fila.height + espacio;
    }
    const cerrar = boton(this, ANCHO / 2, ALTO - 18, this.t.cerrar, () => capa.destroy(), 90);
    capa.add([cerrar.caja, cerrar.etiqueta]);
    return capa;
  }
}
