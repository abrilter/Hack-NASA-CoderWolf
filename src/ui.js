// Piezas de interfaz reutilizables en pixel art. Dueño: Rol 1.
// TODO(Rol 3): cambiar la fuente por una fuente pixel (ej. desde Google Fonts).
import { ANCHO, COLOR } from "./config.js";

const FUENTE = "monospace";

export function texto(escena, x, y, contenido, opciones = {}) {
  return escena.add.text(x, y, contenido, {
    fontFamily: FUENTE,
    fontSize: (opciones.tam || 8) + "px",
    color: opciones.color || COLOR.texto,
    align: opciones.align || "center",
    wordWrap: { width: opciones.ancho || ANCHO - 20 },
    lineSpacing: 2
  }).setOrigin(opciones.origenX ?? 0.5, opciones.origenY ?? 0).setResolution(4);
}

export function titulo(escena, contenido, y = 12) {
  return texto(escena, ANCHO / 2, y, contenido, { tam: 12, color: COLOR.titulo });
}

export function boton(escena, x, y, contenido, alPresionar, ancho = 120) {
  const caja = escena.add.rectangle(x, y, ancho, 18, COLOR.panel)
    .setStrokeStyle(1, COLOR.borde).setInteractive({ useHandCursor: true });
  const etiqueta = texto(escena, x, y, contenido, { ancho: ancho - 6, origenY: 0.5 });
  caja.on("pointerover", () => caja.setFillStyle(0x2c3770));
  caja.on("pointerout", () => caja.setFillStyle(COLOR.panel));
  caja.on("pointerdown", (p, lx, ly, ev) => { ev?.stopPropagation(); alPresionar(); });
  return { caja, etiqueta };
}

// Etiqueta obligatoria cada vez que se muestra un dato de la NASA
export function datoReal(escena, registro) {
  const aviso = registro.ejemplo ? "DATO DE EJEMPLO · " : "Dato real · ";
  return texto(escena, ANCHO / 2, 170, aviso + registro.fuente + (registro.fecha ? " · " + registro.fecha : ""),
    { tam: 6, color: COLOR.tenue });
}

// Barras de oxígeno, escudo y radiación (esquina superior izquierda)
export function barras(escena, estado) {
  [["O2", estado.oxigeno, COLOR.oxigeno], ["ESC", estado.escudo, COLOR.escudo], ["RAD", estado.radiacion, COLOR.radiacion]]
    .forEach(([nombre, valor, color], i) => {
      const y = 6 + i * 8;
      texto(escena, 4, y - 3, nombre, { tam: 6, origenX: 0, align: "left" });
      escena.add.rectangle(24, y, 40, 4, 0x0a0f24).setOrigin(0, 0.5);
      escena.add.rectangle(24, y, Math.max(0, Math.min(40, valor * 0.4)), 4, color).setOrigin(0, 0.5);
    });
}

// Muestra una lista de páginas de texto con botón "Siguiente"
export function paginas(escena, lista, alTerminar) {
  let i = 0;
  const t = titulo(escena, "", 20);
  const p = texto(escena, ANCHO / 2, 50, "", { ancho: 280 });
  const b = boton(escena, ANCHO / 2, 150, "Siguiente", () => { i++; mostrar(); });
  function mostrar() {
    if (i >= lista.length) return alTerminar();
    t.setText(lista[i].titulo || "");
    p.setText(lista[i].texto);
  }
  mostrar();
  return b;
}
