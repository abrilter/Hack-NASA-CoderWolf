// Misión 6: la ruta hacia Itzel, calculada por el modelo. Dueño: Rol 4 + Rol 2.
// Lee: datos (rutas, modelo, cme), traje, nave, mochila, escudo · Escribe: oxigeno, radiacion, misiones.ruta, bitacora · Sigue: CraterHelado.
// Mapa del polo sur lunar visto desde arriba. El Sol va pegado al horizonte y
// da vueltas alrededor del polo, así que las sombras de los montes giran
// despacio (tiempo acelerado). Los fondos de los cráteres nunca reciben luz.
// Dos rutas desde la base hasta la última señal de Itzel:
//  - Cráter: corta, en sombra y empinada. Lleva a la escena del cráter helado.
//  - Cresta: larga y con luz. Más horas afuera: más oxígeno y más radiación
//    si llega la tormenta. No pasa por el cráter.
// Al pasar el cursor (o tocar) una ruta se ven su tiempo y sus costos; el
// botón del panel la elige. Números: modelo/simulacion.js + datos.json.
// La ruta elegida queda en estado.misiones.ruta para la escena siguiente.
// Modo prueba: index.html?escena=Ruta (estado de ejemplo de config.js).
import { ANCHO, COLOR, siguienteEscena } from "../config.js";
import { estado } from "../estado.js";
import { titulo, texto, boton, barras, datoReal, llenar } from "../ui.js";
import { opcionesDeRuta, aplicar, explicar, estimarCruceCrater } from "../modelo/simulacion.js";
import { crearTextura, crearTexturasEquipo } from "../pixelart.js";
import { fijarTormenta } from "../nasa/sol.js";


// ---------------------------------------------------------------- mapa (coordenadas de 320×180)
const MAPA = { x: 12, y: 30, w: 202, h: 130 };
const PANEL = { x: 220, y: 30, w: 94, h: 130 };
const INICIO = { x: 30, y: 140 };             // base lunar
const ITZEL = { x: 190, y: 48 };              // última señal conocida
const CRATER = { x: 108, y: 92, rx: 34, ry: 28 };
// Cráteres chicos (también con el fondo siempre oscuro)
const CRATERES = [CRATER, { x: 46, y: 64, rx: 12, ry: 10 }, { x: 168, y: 108, rx: 9, ry: 7 }];
// Montes que dan sombra larga (el Sol está bajo)
const MONTES = [[34, 100, 6], [86, 46, 7], [150, 128, 5], [204, 146, 5], [134, 40, 5]];
// Rutas (puntos del camino)
const CAMINOS = {
  crater: [[30, 140], [66, 118], [108, 92], [150, 68], [190, 48]],
  cresta: [[30, 140], [70, 152], [140, 151], [186, 130], [204, 92], [190, 48]]
};
const COLOR_RUTA = { crater: 0x7ee6ff, cresta: 0xffcd75 };
const VUELTA_SOL = 0.12;                      // radianes por segundo (tiempo acelerado)
const CERCA_RUTA = 7;                         // px para "estar sobre" una ruta

// Íconos con mapas de letras
const ICONO_BASE = ["..kkk..", ".kWWWk.", "kWOWOWk", "kOOOOOk", "kkkkkkk"];
const ICONO_ITZEL = ["..kkk..", ".kRRRk.", "kRRWRRk", ".kRRRk.", "..kRk..", "...k..."];
const PALETA_ICONOS = { k: 0x1a1c2c, W: 0xf4f4f4, O: 0xef7d57, R: 0xff5c5c };

// distancia de un punto a un segmento
function distSegmento(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export class Ruta extends Phaser.Scene {
  constructor() { super("Ruta"); }

  create() {
    fijarTormenta();                  // desde aquí la tormenta de la partida ya no cambia
    this.t = estado.textos.ruta;
    this.angSol = -2.4;                       // el Sol empieza arriba a la izquierda
    this.marcada = null;                      // ruta bajo el cursor o tocada
    this.fijada = false;                      // Phaser reutiliza la escena en cada partida: estas banderas se reinician aquí
    this.elegida = false;
    this.saliendo = false;
    crearTexturasEquipo(this);
    crearTextura(this, "ruta_base", ICONO_BASE, PALETA_ICONOS);
    crearTextura(this, "ruta_itzel", ICONO_ITZEL, PALETA_ICONOS);

    this.opciones = {};
    opcionesDeRuta(estado.datos, estado).forEach(o => (this.opciones[o.id] = o));

    barras(this, estado);
    titulo(this, this.t.titulo, 4);
    const hT = Math.max(0, Math.round(Object.values(this.opciones)[0].hT));
    texto(this, ANCHO / 2, 19, llenar(this.t.tormenta, { horas: hT }), { tam: 6, color: "#ff8a5c" });

    this.dibujarTerreno();
    this.gSombras = this.add.graphics();      // sombras y bordes iluminados (se mueven)
    this.gRutas = this.add.graphics();
    this.crearMarcas();
    this.crearPanel();
    this.dibujarRutas();
    this.dibujarSombras();

    const d = estado.datos.luz_polo_sur;
    if (d) datoReal(this, d);

    // cursor sobre el mapa: marca la ruta más cercana; clic/toque la deja marcada
    this.input.on("pointermove", p => { if (!this.fijada) this.marcar(this.rutaEn(p.worldX, p.worldY)); });
    this.input.on("pointerdown", p => {
      const id = this.rutaEn(p.worldX, p.worldY);
      if (id) { this.fijada = true; this.marcar(id); }
    });
    // teclado: las flechas cambian de ruta; Enter o Espacio la elige y luego continúa
    const k = this.input.keyboard;
    ["LEFT", "RIGHT", "UP", "DOWN"].forEach(t => k.on("keydown-" + t, () => {
      if (this.elegida) return;
      this.fijada = true;
      this.marcar(this.marcada === "crater" ? "cresta" : "crater");
    }));
    ["ENTER", "SPACE"].forEach(t => k.on("keydown-" + t, () => (this.elegida ? this.continuar() : this.elegir())));
  }

  continuar() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.scene.start(siguienteEscena(this.scene.key));
  }

  // ---------------------------------------------------------------- terreno fijo
  dibujarTerreno() {
    const g = this.add.graphics();
    const r = (c, x, y, w, h) => g.fillStyle(c).fillRect(x, y, w, h);
    const { x, y, w, h } = MAPA;
    let semilla = 11;
    const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);

    // suelo con puntitos
    r(0x333c57, x - 1, y - 1, w + 2, h + 2);
    r(0x8796b0, x, y, w, h);
    for (let i = 0; i < 260; i++) r(azar() < 0.5 ? 0x94b0c2 : 0x566c86, x + Math.floor(azar() * w), y + Math.floor(azar() * h), 1, 1);

    // la cresta: franja alta y siempre con luz
    const c = CAMINOS.cresta;
    for (let i = 0; i < c.length - 1; i++) {
      g.lineStyle(13, 0xa9b6cc).lineBetween(...c[i], ...c[i + 1]);
      g.lineStyle(7, 0xc2c3c7).lineBetween(...c[i], ...c[i + 1]);
    }
    c.forEach(([px, py]) => { g.fillStyle(0xa9b6cc).fillCircle(px, py, 6); g.fillStyle(0xc2c3c7).fillCircle(px, py, 3); });

    // cráteres: borde claro y fondo siempre oscuro
    CRATERES.forEach(k => {
      g.fillStyle(0x566c86).fillEllipse(k.x, k.y, k.rx * 2 + 4, k.ry * 2 + 4);
      g.fillStyle(0x0b1026).fillEllipse(k.x, k.y, k.rx * 2, k.ry * 2);
      g.fillStyle(0x05070f).fillEllipse(k.x + 1, k.y + 1, k.rx * 1.6, k.ry * 1.6);
    });
    // brillitos de hielo en el fondo del cráter grande
    [[96, 96], [112, 86], [120, 100], [104, 104], [90, 88]].forEach(([hx, hy], i) => {
      const hielo = this.add.rectangle(hx, hy, 1, 1, 0xbff3ff).setOrigin(0);
      this.tweens.add({ targets: hielo, alpha: 0.1, duration: 800 + i * 230, yoyo: true, repeat: -1 });
    });

    // montes
    MONTES.forEach(([mx, my, mr]) => {
      g.fillStyle(0x566c86).fillCircle(mx, my, mr);
      g.fillStyle(0x94b0c2).fillCircle(mx - 1, my - 1, mr - 2);
    });
  }

  // ---------------------------------------------------------------- sombras que giran
  // El Sol está en la dirección angSol, casi al ras del suelo: cada monte da
  // una sombra larga hacia el lado contrario, y el borde de cada cráter se
  // ilumina solo del lado que mira al Sol. El fondo de los cráteres no cambia.
  dibujarSombras() {
    const g = this.gSombras.clear();
    const dx = Math.cos(this.angSol), dy = Math.sin(this.angSol);
    MONTES.forEach(([mx, my, mr]) => {
      const L = mr * 5, px = -dy * mr, py = dx * mr;
      g.fillStyle(0x05070f, 0.55).fillPoints([
        { x: mx + px, y: my + py }, { x: mx - px, y: my - py },
        { x: mx - px - dx * L, y: my - py - dy * L }, { x: mx + px - dx * L, y: my + py - dy * L }
      ], true);
    });
    CRATERES.forEach(k => {
      for (let a = -0.9; a <= 0.9; a += 0.05) {
        const ang = this.angSol + a;
        g.fillStyle(0xe8ecf4, 0.9 - Math.abs(a) * 0.6)
          .fillRect(Math.round(k.x + Math.cos(ang) * (k.rx + 1)), Math.round(k.y + Math.sin(ang) * (k.ry + 1)), 1, 1);
      }
    });
    // el Sol en la orilla del mapa, en su dirección
    const cx = MAPA.x + MAPA.w / 2, cy = MAPA.y + MAPA.h / 2;
    const k = Math.min((MAPA.w / 2 - 4) / Math.max(0.01, Math.abs(dx)), (MAPA.h / 2 - 4) / Math.max(0.01, Math.abs(dy)));
    this.sol.setPosition(cx + dx * k, cy + dy * k);
    this.textoSol.setPosition(this.sol.x, this.sol.y + (dy > 0 ? -10 : 4));
  }

  update(_, ms) {
    if (this.elegida) return;
    this.angSol += VUELTA_SOL * Math.min(ms, 50) / 1000;
    this.dibujarSombras();
  }

  // ---------------------------------------------------------------- base, Itzel y rótulos
  crearMarcas() {
    this.add.image(INICIO.x, INICIO.y, "ruta_base").setScale(1.5);
    texto(this, INICIO.x, INICIO.y - 12, this.t.inicio, { tam: 5 });
    const itz = this.add.image(ITZEL.x, ITZEL.y, "ruta_itzel").setOrigin(0.5, 1).setScale(1.5);
    this.tweens.add({ targets: itz, y: ITZEL.y - 2, duration: 500, yoyo: true, repeat: -1 });
    texto(this, ITZEL.x - 2, ITZEL.y - 17, this.t.itzel, { tam: 5, color: "#ff8a5c" });
    texto(this, CRATER.x, CRATER.y + CRATER.ry + 3, this.t.nombre_crater, { tam: 5, color: "#7ee6ff" });
    texto(this, 104, 136, this.t.nombre_cresta, { tam: 5, color: "#ffcd75" });

    this.sol = this.add.circle(0, 0, 3, 0xfff27a).setStrokeStyle(1, 0xffa300);
    this.textoSol = texto(this, 0, 0, this.t.sol, { tam: 5, color: "#fff27a" });
    // rótulo de tiempo acelerado, con flechas que parpadean
    const rot = texto(this, MAPA.x + 3, MAPA.y + 2, "▶▶ " + this.t.tiempo_acelerado, { tam: 5, origenX: 0, color: "#fff27a" });
    this.tweens.add({ targets: rot, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------- rutas
  dibujarRutas() {
    const g = this.gRutas.clear();
    Object.entries(CAMINOS).forEach(([id, puntos]) => {
      const activa = this.marcada === id, apagada = this.marcada && !activa;
      const color = COLOR_RUTA[id], alfa = apagada ? 0.35 : 1, grosor = activa ? 2 : 1;
      let paso = 0;
      for (let i = 0; i < puntos.length - 1; i++) {
        const [x1, y1] = puntos[i], [x2, y2] = puntos[i + 1];
        const largo = Math.hypot(x2 - x1, y2 - y1);
        for (let s = 0; s < largo; s++, paso++) {
          if (paso % 5 > 2) continue;                    // línea punteada
          const x = Math.round(x1 + (x2 - x1) * s / largo), y = Math.round(y1 + (y2 - y1) * s / largo);
          if (activa) g.fillStyle(0x1a1c2c, alfa).fillRect(x - 1, y - 1, grosor + 2, grosor + 2);
          g.fillStyle(color, alfa).fillRect(x, y, grosor, grosor);
        }
      }
    });
  }

  // ¿Qué ruta está bajo el punto (x, y)? null si ninguna
  rutaEn(x, y) {
    let mejor = null, dist = CERCA_RUTA;
    Object.entries(CAMINOS).forEach(([id, puntos]) => {
      for (let i = 0; i < puntos.length - 1; i++) {
        const d = distSegmento(x, y, puntos[i], puntos[i + 1]);
        if (d < dist) { dist = d; mejor = id; }
      }
    });
    return mejor;
  }

  marcar(id) {
    if (this.marcada === id || this.elegida) return;
    this.marcada = id;
    this.dibujarRutas();
    this.mostrarPanel();
  }

  // ---------------------------------------------------------------- panel de información
  crearPanel() {
    const { x, y, w, h } = PANEL, cx = x + w / 2, ancho = w - 8;
    this.add.rectangle(x, y, w, h, COLOR.panel, 0.92).setOrigin(0).setStrokeStyle(1, COLOR.borde);
    this.pTitulo = texto(this, cx, y + 4, "", { tam: 7, ancho, color: COLOR.titulo });
    this.pDatos = texto(this, x + 4, y + 16, "", { tam: 6, ancho, origenX: 0, align: "left" });
    this.pGana = texto(this, x + 4, y + 52, "", { tam: 5, ancho, origenX: 0, align: "left", color: "#5cff8a" });
    this.pCuesta = texto(this, x + 4, y + 78, "", { tam: 5, ancho, origenX: 0, align: "left", color: "#ff8a5c" });
    this.bIr = boton(this, cx, y + h - 11, this.t.ir, () => this.elegir(), w - 12);
    this.mostrarPanel();
  }

  mostrarPanel() {
    const id = this.marcada;
    this.bIr.caja.setVisible(!!id);
    this.bIr.etiqueta.setVisible(!!id);
    if (!id) {
      const d = estado.datos.luz_polo_sur;
      this.pTitulo.setText(this.t.pasa_cursor);
      this.pDatos.setText("").setY(PANEL.y + 30);
      this.pGana.setText(d ? d.texto : "").setColor(COLOR.texto);
      this.pCuesta.setText("");
      return;
    }
    const op = this.opciones[id], info = this.t.rutas[id];
    const rad = op.efectos.radiacion;
    this.pTitulo.setText(info.nombre);
    this.pDatos.setText([
      llenar(this.t.tiempo, { horas: Math.round(op.hR) }),
      llenar(this.t.oxigeno, { o2: op.efectos.oxigeno }),
      rad > 0 ? llenar(this.t.radiacion, { rad }) : this.t.radiacion_no
    ].join("\n")).setY(PANEL.y + 16);
    this.pGana.setText("+ " + info.gana).setColor("#5cff8a");
    // el cráter se cruza jugando: se avisa cuánto oxígeno más cuesta (según la luz)
    const cruce = op.parteEscena ? " " + llenar(this.t.cruce_crater, { o2: estimarCruceCrater(estado.datos, estado) }) : "";
    this.pCuesta.setText("− " + info.cuesta + (op.oscuro ? " " + this.t.sin_linterna_corto : "") + cruce);
  }

  // ---------------------------------------------------------------- elegir
  elegir() {
    const id = this.marcada;
    if (!id || this.elegida) return;
    this.elegida = true;
    const op = this.opciones[id], nombre = this.t.rutas[id].nombre;
    aplicar(estado, op.efectos);
    const frase = explicar(op, this.t);
    // la escena siguiente lee esta clave para saber por dónde se fue
    estado.misiones.ruta = { id, horas: Math.round(op.hR), oxigeno: op.efectos.oxigeno, radiacion: op.efectos.radiacion };
    estado.bitacora.push(llenar(this.t.bitacora, { nombre, horas: Math.round(op.hR) }) + " " + frase);

    this.children.removeAll(true);
    barras(this, estado);
    this.add.image(ANCHO / 2, 50, "chispa_px");
    texto(this, ANCHO / 2, 70, frase, { ancho: 260 });
    // Sigue a CraterHelado: con la cresta, esa escena se salta sola.
    boton(this, ANCHO / 2, 140, this.t.continuar, () => this.continuar());
  }
}
