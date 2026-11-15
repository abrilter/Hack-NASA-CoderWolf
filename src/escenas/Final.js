// Final: resultado, bitácora y fuentes NASA. Dueño: Rol 5.
// Cada fuente dice si es "Dato real" o "Dato de ejemplo" (nunca se presenta un
// ejemplo como real) y se puede tocar para abrir su página.
import { ANCHO, ALTO, COLOR } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton } from "../ui.js";
import { crearTexturasEquipo, crearTextura } from "../pixelart.js";

const LIMITE_TEXTO = 134;          // la bitácora no puede bajar de aquí (abajo van el resumen y los botones)
const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

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
  const z = d.zona_aterrizaje;
  const lista = [
    { tema: "Tormenta solar (CME)", ...d.cme },
    z && { tema: "Zona de aterrizaje", ...z, fuente: `${z.fuente} · ${z.nombre}` },
    d.polo_sur && { tema: "Cráteres donde nunca llega el Sol", ...d.polo_sur },
    { tema: "Rutas del rescate", fuente: d.rutas_fuente, link: d.rutas_link, ejemplo: d.rutas.some(r => r.ejemplo) },
    { tema: "Velocidad del rover", ...d.rover },
    { tema: "Radiación de la tormenta", ...d.radiacion },
    { tema: "Planta de Chispa", ...d.planta },
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
    crearTexturasEquipo(this);                    // chispa_px, planta y naves (por si se abre en modo prueba)
    crearTextura(this, "luna_px", LUNA, { k: CONTORNO, M: 0xc2c3c7, N: 0x566c86 });
    const causa = estado.causaDerrota();          // "oxigeno", "radiacion" o null
    const exito = !causa;
    this.exito = exito;
    this.t = estado.textos.final;
    const t = this.t;

    titulo(this, exito ? t.titulo_exito : t.titulo_fallo, 8);
    const resultado = texto(this, ANCHO / 2, 26, `${estado.nombreClave}: ${exito ? t.exito : t.fallo}`, { ancho: 290 });

    // Si se perdió, Chispa explica por qué (con los números de la partida)
    let y = resultado.y + resultado.height + 4;
    if (causa) {
      const porQue = llenar(t["causa_" + causa], { oxigeno: Math.round(estado.oxigeno), radiacion: Math.round(estado.radiacion) });
      this.add.image(18, y + 6, "chispa_px");
      const chispa = texto(this, 30, y, porQue, { tam: 6, ancho: 270, origenX: 0, align: "left", color: "#ffcd75" });
      y = chispa.y + chispa.height + 4;
    }
    this.bitacora(Math.max(y, 56));

    // Resumen honesto de las fuentes: cuántas son reales y cuántas de ejemplo
    const fuentes = fuentesNASA(estado.datos);
    const reales = fuentes.filter(f => !f.ejemplo).length;
    texto(this, ANCHO / 2, 140, llenar(t.resumen_fuentes, { reales, ejemplo: fuentes.length - reales }),
      { tam: 6, color: COLOR.tenue, ancho: 300 });

    // Mi insignia (con una mini insignia dentro del botón) · Fuentes · Otra vez
    boton(this, 56, 165, "   " + t.mi_insignia, () => this.abrirInsignia(), 98);
    this.miniInsignia();
    boton(this, 160, 165, t.ver_fuentes, () => this.panelFuentes(fuentes), 98);
    boton(this, 264, 165, t.otra_vez, () => { estado.nuevaPartida(); this.scene.start("Equipo"); }, 98);
  }

  miniInsignia() {
    this.mini?.destroy();
    this.mini = dibujarInsignia(this, 20, 165, 6.5, estado.insignia || INSIGNIA_INICIAL).setDepth(10);
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
    c.add([listo.caja, listo.etiqueta]);
  }

  // Bitácora de decisiones: se achica la letra si no cabe; si aun así no cabe,
  // se muestran las primeras líneas y un botón para verla completa.
  bitacora(y) {
    const lineas = estado.bitacora.map(b => "- " + b);
    for (const tam of [6, 5]) {
      const txt = texto(this, ANCHO / 2, y, lineas.join("\n"), { tam, ancho: 290, align: "left" });
      if (y + txt.height <= LIMITE_TEXTO) return;
      txt.destroy();
    }
    let n = lineas.length;
    let txt;
    do {
      txt?.destroy();
      n--;
      txt = texto(this, ANCHO / 2, y, lineas.slice(0, n).join("\n"), { tam: 5, ancho: 290, align: "left" });
    } while (n > 1 && y + txt.height > LIMITE_TEXTO - 8);
    const mas = texto(this, ANCHO / 2, txt.y + txt.height + 1, llenar(this.t.bitacora_mas, { n: lineas.length - n }),
      { tam: 5, color: "#5cff8a" }).setInteractive({ useHandCursor: true });
    mas.on("pointerdown", () => this.panel(this.t.titulo_bitacora, lineas.map(l => ({ texto: l }))));
  }

  panelFuentes(fuentes) {
    this.panel(this.t.titulo_fuentes, fuentes.map(f => ({
      texto: `${f.ejemplo ? "⚠ " + this.t.etiqueta_ejemplo : "✓ " + this.t.etiqueta_real} · ${f.tema}: ${f.fuente}` +
             `${f.fecha ? " · " + f.fecha : ""}${f.link ? " ↗" : ""}`,
      color: f.ejemplo ? "#ffcd75" : "#5cff8a",
      link: f.link
    })), this.t.leyenda_fuentes);
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
    for (const f of filas) {
      if (y > ALTO - 34) break;
      const fila = texto(this, 16, y, f.texto, { tam: 6, ancho: 288, origenX: 0, align: "left", color: f.color || COLOR.texto });
      if (f.link) {
        fila.setInteractive({ useHandCursor: true })
          .on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); window.open(f.link, "_blank", "noopener"); });
      }
      capa.add(fila);
      y += fila.height + 3;
    }
    const cerrar = boton(this, ANCHO / 2, ALTO - 18, this.t.cerrar, () => capa.destroy(), 90);
    capa.add([cerrar.caja, cerrar.etiqueta]);
  }
}
