// Piezas de interfaz reutilizables en pixel art. Dueño: Rol 1.
// Lee: estado.textos.comun y LIMITES · Escribe: nada (textos, botones, barras, etiquetas, teclado).
// TODO(Rol 3): cambiar la fuente por una fuente pixel (ej. desde Google Fonts).
import { ANCHO, COLOR, ZOOM } from "./config.js";
import { estado, LIMITES, LIMITE_RADIACION } from "./estado.js";
import { fechaLarga } from "./nasa/sol.js";

const FUENTE = "monospace";
const ALTO_BOTON = 18;

// Llena una plantilla de textos.json: llenar("Gastas {o2} O2", { o2: 5 }) → "Gastas 5 O2"
// Si falta un valor no escribe "undefined": deja el hueco vacío y avisa en la consola
export const llenar = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? (console.warn(`[textos] falta {${k}} en: ${s}`), ""));

export function texto(escena, x, y, contenido, opciones = {}) {
  return escena.add.text(x, y, contenido, {
    fontFamily: FUENTE,
    fontSize: (opciones.tam || 8) + "px",
    color: opciones.color || COLOR.texto,
    align: opciones.align || "center",
    wordWrap: { width: opciones.ancho || ANCHO - 20 },
    lineSpacing: 2
  }).setOrigin(opciones.origenX ?? 0.5, opciones.origenY ?? 0).setResolution(ZOOM);
}

export function titulo(escena, contenido, y = 12) {
  return texto(escena, ANCHO / 2, y, contenido, { tam: 12, color: COLOR.titulo });
}

export function boton(escena, x, y, contenido, alPresionar, ancho = 120) {
  // la zona para tocar es 2 px más grande por cada lado que el dibujo (dedos en pantallas chicas)
  const caja = escena.add.rectangle(x, y, ancho, ALTO_BOTON, COLOR.panel).setStrokeStyle(1, COLOR.borde)
    .setInteractive({ hitArea: new Phaser.Geom.Rectangle(-2, -2, ancho + 4, ALTO_BOTON + 4), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  const etiqueta = texto(escena, x, y, contenido, { ancho: ancho - 6, origenY: 0.5 });
  caja.on("pointerover", () => caja.setFillStyle(0x2c3770));
  caja.on("pointerout", () => caja.setFillStyle(COLOR.panel));
  caja.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); alPresionar(); });
  return { caja, etiqueta };
}

// Etiqueta obligatoria cada vez que se muestra un dato de la NASA.
// Si el registro trae "link", la etiqueta se puede tocar para abrir la fuente.
// Texto de la etiqueta: "Dato real" o "DATO DE EJEMPLO", y para DONKI
// "· en vivo" o "· no en vivo" (registro.en_vivo lo pone Carga.js).
export function etiquetaDato(registro) {
  const t = estado.textos?.comun || {};
  const base = registro.ejemplo ? (t.dato_ejemplo || "DATO DE EJEMPLO") : (t.dato_real || "Dato real");
  const vivo = registro.en_vivo === true ? t.en_vivo
    : registro.en_vivo === false ? t.no_en_vivo + (registro.consultado ? " " + llenar(t.consultado, { fecha: fechaLarga(registro.consultado) }) : "")
    : null;
  return vivo ? `${base} · ${vivo}` : base;
}

export function datoReal(escena, registro) {
  const aviso = etiquetaDato(registro) + " · ";
  const etiqueta = texto(escena, ANCHO / 2, 170,
    aviso + registro.fuente + (registro.fecha ? " · " + registro.fecha : "") + (registro.link ? " ↗" : ""),
    { tam: 6, color: COLOR.tenue });
  if (registro.link) {
    etiqueta.setInteractive({ useHandCursor: true })
      .on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); window.open(registro.link, "_blank", "noopener"); });
  }
  return etiqueta;
}

// Barras de recursos (esquina superior izquierda). Cada escena muestra solo
// las que usa, por ejemplo: barras(this, estado, ["oxigeno", "energia"])
const BARRAS = {
  oxigeno:   ["O2",  COLOR.oxigeno],
  escudo:    ["ESC", COLOR.escudo],
  radiacion: ["RAD", COLOR.radiacion],
  energia:   ["ENE", COLOR.energia]
};
// La barra llena = el máximo de ese recurso (oxígeno 150, radiación 100 = se pierde),
// así se nota cuando el tanque o la nave grande suman oxígeno.
const LARGO_BARRA = 40;
const maximo = id => (id === "radiacion" ? LIMITE_RADIACION : LIMITES[id]?.[1] ?? 100);
export function barras(escena, e, recursos = ["oxigeno", "radiacion"]) {
  recursos.forEach((id, i) => {
    const [nombre, color] = BARRAS[id];
    const y = 6 + i * 8;
    texto(escena, 4, y - 3, nombre, { tam: 6, origenX: 0, align: "left" });
    escena.add.rectangle(24, y, LARGO_BARRA, 4, 0x0a0f24).setOrigin(0, 0.5);
    const largo = Math.round(LARGO_BARRA * Phaser.Math.Clamp(e[id] / maximo(id), 0, 1));
    escena.add.rectangle(24, y, largo, 4, color).setOrigin(0, 0.5);
  });
}

// Teclado para las escenas de solo botones (Carta, Tormenta, Rescate, Final):
// flechas o TAB mueven un marco amarillo entre lo que se puede tocar, Enter o
// Espacio lo activan y Esc toca el fondo de una tarjeta abierta (la cierra).
// Con el ratón o el dedo no cambia nada: el marco aparece al usar una flecha.
export function navegarConTeclado(escena) {
  let marco = null, actual = null;
  // se vuelve a crear si la escena borró sus objetos (la Carta lo hace entre preguntas)
  const elMarco = () => (marco?.scene ? marco : (marco = escena.add.rectangle(0, 0, 1, 1).setOrigin(0).setDepth(5000).setVisible(false)));
  const raiz = o => { while (o.parentContainer) o = o.parentContainer; return o; };
  const visible = o => { for (let x = o; x; x = x.parentContainer) if (!x.visible || x.alpha === 0 || !x.active) return false; return true; };
  const tapa = o => { const b = o.getBounds(); return b.width >= ANCHO * 0.9 && b.height >= 160; };   // fondo de tarjeta
  const todos = () => {
    const lista = [];
    const ver = arr => arr.forEach(o => { if (o.list) ver(o.list); else if (o.input?.enabled && visible(o)) lista.push(o); });
    ver(escena.children.list);
    return lista;
  };
  // con una tarjeta abierta, solo cuenta lo que está encima de su fondo
  const opciones = () => {
    const lista = todos(), fondos = lista.filter(tapa);
    const piso = fondos.length ? Math.max(...fondos.map(o => raiz(o).depth)) : -Infinity;
    return lista.filter(o => !tapa(o) && raiz(o).depth >= piso)
      .sort((a, b) => { const A = a.getBounds(), B = b.getBounds(); return Math.round(A.centerY / 6) - Math.round(B.centerY / 6) || A.centerX - B.centerX; });
  };
  const tocar = o => o.emit("pointerdown", escena.input.activePointer, 0, 0, { stopPropagation() {} });
  const mover = paso => {
    const lista = opciones();
    if (!lista.length) return;
    const i = lista.indexOf(actual);
    actual = escena.focoTeclado = lista[i < 0 ? (paso > 0 ? 0 : lista.length - 1) : (i + paso + lista.length) % lista.length];
  };
  const k = escena.input.keyboard;
  ["RIGHT", "DOWN", "TAB"].forEach(t => k.on("keydown-" + t, ev => { ev.preventDefault?.(); mover(1); }));
  ["LEFT", "UP"].forEach(t => k.on("keydown-" + t, () => mover(-1)));
  ["ENTER", "SPACE"].forEach(t => k.on("keydown-" + t, () => { if (actual && opciones().includes(actual)) tocar(actual); }));
  k.on("keydown-ESC", () => { const f = todos().filter(tapa).sort((a, b) => raiz(b).depth - raiz(a).depth)[0]; if (f) tocar(f); });
  k.addCapture("TAB");
  const seguir = () => {
    if (!actual) return marco?.scene && marco.setVisible(false);
    if (!opciones().includes(actual)) { actual = null; return elMarco().setVisible(false); }
    const b = actual.getBounds();
    elMarco().setPosition(b.x - 1.5, b.y - 1.5).setSize(b.width + 3, b.height + 3).setStrokeStyle(1, 0xfff27a).setVisible(true);
  };
  escena.events.on("update", seguir);
  escena.events.once("shutdown", () => escena.events.off("update", seguir));
}
