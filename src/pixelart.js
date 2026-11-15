// Pixel art hecho con texto: cada letra es un pixel de un color de la paleta.
// "." = transparente. Así se pueden dibujar figuras sin esperar los PNG.
// TODO(Rol 3): cuando existan los PNG, estas figuras sirven de guía de tamaño.

// Crea una textura de Phaser a partir de un mapa de letras
export function crearTextura(escena, clave, mapa, paleta) {
  if (escena.textures.exists(clave)) return clave;
  const ancho = Math.max(...mapa.map(f => f.length));
  const alto = mapa.length;
  const tex = escena.textures.createCanvas(clave, ancho, alto);
  const ctx = tex.getContext();
  mapa.forEach((fila, y) => {
    [...fila].forEach((letra, x) => {
      const color = paleta[letra];
      if (color === undefined) return;
      ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
      ctx.fillRect(x, y, 1, 1);
    });
  });
  tex.refresh();
  return clave;
}

// Colores base (inspirados en paletas tipo PICO-8 / Lospec)
const K = 0x1a1c2c;   // contorno

// ----------------------------------------------------------------- astronauta
// 16×24, mirando a la derecha. A/B/C = colores del traje (principal, sombra,
// detalle). Estilo chibi: casco grande. v/c = visor oscuro y reflejo, G = guantes, D = botas, y/r = luces.
const ASTRO_CUERPO = [
  ".....kkkkkk.....",
  "...kkAAAAAAkk...",
  "..kAAAAAAAAAAk..",
  ".kAAAAAAAAAAAAk.",
  ".kAAkkkkkkkkAAk.",
  ".kAkvvvvvvcckAk.",
  ".kAkvvvvvvvckAk.",
  ".kBkvvvvvvvvkBk.",
  ".kBAkkkkkkkkABk.",
  "..kBBAAAAAABBk..",
  "...kkkBBBBkkk...",
  "..kkkCCCCCCkkk..",
  ".kAAkAAAAAAkAAk.",
  ".kAAkAAyrAAkAAk.",
  ".kBAkAAAAAAkABk.",
  ".kGGkBAAAABkGGk.",
  "..kkkCCCCCCkkk..",
  "....kAAAAAAk...."
];
// Cada traje tiene su propio casco (11 filas) y torso (7 filas) para que se
// distingan a simple vista.
// Blindado: casco ancho con visor de rendija y cresta naranja, hombreras.
const CASCO_BLINDADO = [
  "....kkkkkkkk....",
  "..kkAACCAAAAkk..",
  ".kAAAACCAAAAAAk.",
  "kBAAAAAAAAAAAABk",
  "kBAkkkkkkkkkkABk",
  "kBAkvvvvvvccvkBk",
  "kBAkvvvvvvvvvkBk",
  "kBAkkkkkkkkkkABk",
  "kBBAAAyAAAAAABBk",
  ".kBBBBBBBBBBBBk.",
  "..kkkCCCCCCkkk.."
];
const TORSO_BLINDADO = [
  ".kkkkCCCCCCkkkk.",
  "kBBBkAAAAAAkBBBk",
  ".kAAkACCCCAkAAk.",
  ".kBAkAAyrAAkABk.",
  ".kGGkBAAAABkGGk.",
  "..kkkCCCCCCkkk..",
  "....kBAAAABk...."
];
// Ligero: casco de burbuja transparente (se ve la cara) y cuerpo delgado.
const CASCO_LIGERO = [
  ".....kkkkkk.....",
  "...kkccvvvvkk...",
  "..kcvvvvvvvvvk..",
  ".kcvvvvvvvvvvvk.",
  ".kvvvvSSSSvvvvk.",
  ".kvvvSSSSSSvvvk.",
  ".kvvvSSeSSeSvvk.",
  ".kvvvSSSSSSSvvk.",
  "..kvvvSSSSSvvk..",
  "...kkvvvvvvkk...",
  "...kkkCCCCkkk..."
];
const TORSO_LIGERO = [
  "....kkCCCCkk....",
  "...kAkAAAAkAk...",
  "...kAkAyrAkAk...",
  "...kAkACCAkAk...",
  "...kGkBAABkGk...",
  "....kkCCCCkk....",
  "....kAAAAAAk...."
];
const cuerpoDe = id =>
  id === "blindado" ? [...CASCO_BLINDADO, ...TORSO_BLINDADO] :
  id === "ligero"   ? [...CASCO_LIGERO, ...TORSO_LIGERO] : ASTRO_CUERPO;

const ASTRO_PIERNAS = [
  [ // quieto
    "....kAAkkAAk....",
    "....kAAkkAAk....",
    "....kBAkkBAk....",
    "....kDDkkDDk....",
    "...kDDDkkDDDk...",
    "...kkkkkkkkkk..."
  ],
  [ // paso
    "...kAAk..kAAk...",
    "..kAAk....kAAk..",
    "..kBAk....kBAk..",
    ".kDDDk....kDDDk.",
    ".kDDDDk...kDDDDk",
    ".kkkkkk...kkkkkk"
  ]
];

// Cada traje cambia los colores A/B/C. "base" es el uniforme antes de elegir.
export const COLORES_TRAJE = {
  base:     { A: 0x3b5dc9, B: 0x29366f, C: 0xffcd75, P: 0x566c86, G: 0xc2c3c7, D: 0x333c57 },
  blindado: { A: 0x566c86, B: 0x333c57, C: 0xff8a5c, P: 0x333c57, G: 0x29366f, D: 0x1a1c2c },
  ligero:   { A: 0xf4f4f4, B: 0xc2c3c7, C: 0x29adff, P: 0x94b0c2, G: 0x29adff, D: 0x3b5dc9 },
  // técnicos de la sala: el mismo astronauta en otros colores
  tecnico:  { A: 0xef7d57, B: 0xb13e53, C: 0xffcd75, P: 0x566c86, G: 0xc2c3c7, D: 0x333c57 },
  tecnico2: { A: 0x38b764, B: 0x257179, C: 0xffcd75, P: 0x566c86, G: 0xc2c3c7, D: 0x333c57 }
};

function paletaAstro(colores, visorVacio = false, id = "") {
  const burbuja = id === "ligero";                       // vidrio claro: se ve la cara
  const visor = burbuja ? 0xa8e4ff : 0x1d2b53;
  return {
    k: K, ...colores,
    v: visorVacio ? (burbuja ? 0x29366f : 0x1a1c2c) : visor,
    c: visorVacio ? (burbuja ? 0xffffff : 0x333c57) : (burbuja ? 0xffffff : 0x7ee6ff),
    S: visorVacio ? 0x29366f : 0xf0bf94,                 // cara
    e: visorVacio ? 0x29366f : 0x1a1c2c,                 // ojos
    y: 0x5cff8a, r: 0xff5c5c
  };
}

// ----------------------------------------------------------------- naves
// Naves en vertical, listas para despegar (punta arriba, motor abajo)
// ----------------------------------------------------------------- naves
// Naves en vertical, más grandes y con detalle. Se dibujan con código y se
// devuelven como mapa de letras, igual que las demás figuras.
// W blanco, H brillo, M gris claro, G sombra, R franja, S franja oscura,
// D metal oscuro, N metal medio, v/c vidrio y reflejo, y luz, k contorno.
function lienzoNave(ancho, alto) {
  const m = Array.from({ length: alto }, () => Array(ancho).fill("."));
  const cx = (ancho - 1) / 2;
  const api = {
    set(x, y, l) { if (x >= 0 && x < ancho && y >= 0 && y < alto) m[y][x] = l; },
    // fila centrada de medio ancho "r": brillo a la izquierda, sombra a la derecha
    fila(y, r, base, luz, sombra, c = cx) {
      const x1 = Math.ceil(c - r), x2 = Math.floor(c + r), n = x2 - x1 + 1;
      for (let x = x1; x <= x2; x++) {
        const i = x - x1;
        let l = base;
        if (luz && i === 1 && n > 5) l = luz;
        if (sombra && i >= n - Math.max(2, Math.round(n * 0.22))) l = sombra;
        api.set(x, y, l);
      }
    },
    rect(x, y, w, h, l) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) api.set(x + i, y + j, l); },
    // ventana redonda con marco, vidrio y reflejo
    ventana(x0, y0, r) {
      for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
        const d = Math.hypot(x, y);
        if (d <= r + 0.9) api.set(x0 + x, y0 + y, d > r - 0.2 ? "k" : "v");
      }
      api.set(x0 - 1, y0 - 1, "c"); api.set(x0, y0 - 1, "c"); api.set(x0 - 1, y0, "c");
    },
    // contorno automático alrededor de todo lo dibujado
    contorno() {
      const copia = m.map(f => [...f]);
      for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
        if (copia[y][x] !== ".") continue;
        const v = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
          const yy = y + b, xx = x + a;
          return yy >= 0 && yy < alto && xx >= 0 && xx < ancho && copia[yy][xx] !== "." && copia[yy][xx] !== "k";
        });
        if (v) m[y][x] = "k";
      }
      return m.map(f => f.join(""));
    }
  };
  return api;
}

function dibujarNaveGrande() {
  const L = lienzoNave(46, 66), cx = 22.5, R = 9.5;
  // punta roja redondeada
  for (let y = 2; y <= 15; y++) L.fila(y, Math.min(R, 0.8 + Math.sqrt((y - 2) * 6.4)), "R", "H", "S", cx);
  L.rect(22, 0, 2, 2, "N"); L.set(22, 0, "y");                       // antena con luz
  // cuerpo
  for (let y = 16; y <= 51; y++) L.fila(y, R, "W", "H", "G", cx);
  for (const y of [16, 27, 39, 51]) for (let x = 14; x <= 31; x++) L.set(x, y, x > 27 ? "N" : "M");   // juntas
  for (const y of [18, 29, 41]) { L.set(15, y, "M"); L.set(30, y, "N"); }                               // remaches
  for (let y = 31; y <= 34; y++) L.fila(y, R, "R", null, "S", cx);                                      // franja
  L.ventana(22, 22, 3); L.ventana(23, 22, 3);                                                           // cabina
  L.set(21, 21, "c"); L.set(22, 21, "c"); L.set(21, 22, "c");
  L.ventana(19, 43, 2); L.ventana(26, 43, 2);                                                           // ventanillas
  for (const x of [17, 19, 26, 28]) L.rect(x, 36, 1, 2, "N");                                           // rejillas
  L.rect(21, 46, 4, 5, "M"); L.rect(21, 46, 4, 1, "N"); L.rect(21, 46, 1, 5, "N"); L.set(24, 48, "N"); // escotilla
  // tanques laterales con punta
  for (const c of [8.5, 36.5]) {
    for (let y = 26; y <= 29; y++) L.fila(y, 0.6 + (y - 26) * 0.9, "R", null, "S", c);
    for (let y = 30; y <= 53; y++) L.fila(y, 3.5, "W", "H", "G", c);
    for (const y of [34, 47]) L.fila(y, 3.5, "R", null, "S", c);
    L.fila(54, 2.5, "D", null, null, c); L.fila(55, 3.5, "D", "N", null, c); L.fila(56, 3.5, "N", null, "D", c);
  }
  for (const y of [36, 37, 48, 49]) { L.rect(12, y, 2, 1, "N"); L.rect(32, y, 2, 1, "D"); }             // uniones
  // tobera principal
  L.fila(52, 7.5, "D", null, null, cx); L.fila(53, 6.5, "N", null, "D", cx);
  for (let y = 54; y <= 58; y++) L.fila(y, 4.5 + (y - 54) * 0.8, "D", "N", null, cx);
  L.fila(59, 8, "N", null, "D", cx);
  // 4 patas de aterrizaje
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 9; i++) { L.set(Math.round(cx + s * (10 + i * 1.05)), 52 + i, "D"); L.set(Math.round(cx + s * (11 + i * 1.05)), 52 + i, "N"); }
    L.rect(Math.round(cx + s * 20.5) - 2, 62, 5, 2, "D"); L.rect(Math.round(cx + s * 20.5) - 2, 62, 5, 1, "N");
    for (let i = 0; i <= 3; i++) L.set(Math.round(cx + s * (5 + i)), 60 + i, "D");
    L.rect(Math.round(cx + s * 9.5) - 1, 63, 3, 1, "N");
  }
  return L.contorno();
}

function dibujarNavePequena() {
  const L = lienzoNave(32, 50), cx = 15.5, R = 5.5;
  // punta larga y afilada
  for (let y = 1; y <= 13; y++) L.fila(y, Math.min(R, 0.5 + (y - 1) * 0.42), "R", y > 6 ? "H" : null, "S", cx);
  L.set(15, 0, "y"); L.set(16, 0, "N");
  // cuerpo esbelto
  for (let y = 14; y <= 37; y++) L.fila(y, R, "W", "H", "G", cx);
  for (const y of [14, 26, 37]) for (let x = 11; x <= 20; x++) L.set(x, y, x > 18 ? "N" : "M");
  for (let y = 27; y <= 29; y++) L.fila(y, R, "R", null, "S", cx);
  // cabina grande ovalada
  for (let y = 16; y <= 23; y++) {
    const r = y < 18 || y > 21 ? 2.5 : 3.5;
    for (let x = Math.ceil(cx - r - 1); x <= Math.floor(cx + r + 1); x++) L.set(x, y, "k");
    if (y > 16 && y < 23) for (let x = Math.ceil(cx - r); x <= Math.floor(cx + r); x++) L.set(x, y, "v");
  }
  L.set(14, 18, "c"); L.set(15, 18, "c"); L.set(14, 19, "c"); L.set(13, 19, "c");
  for (const x of [13, 18]) L.rect(x, 32, 1, 2, "N");                // rejillas
  // alerones en flecha
  for (const s of [-1, 1]) for (let y = 30; y <= 41; y++) {
    const w = Math.min(8, (y - 30) * 0.95);
    for (let i = 0; i <= w; i++) { if (y > 38 && i < w - 4) continue; L.set(Math.round(cx + s * (6 + i)), y, s > 0 || i > w - 1.5 ? "S" : "R"); }
  }
  for (let y = 35; y <= 41; y++) L.rect(15, y, 2, 1, y < 37 ? "R" : "S");   // aleta central
  // tobera
  L.fila(38, 4.5, "D", null, null, cx); L.fila(39, 3.5, "N", null, "D", cx);
  for (let y = 40; y <= 43; y++) L.fila(y, 2.5 + (y - 40) * 0.7, "D", "N", null, cx);
  L.fila(44, 5, "N", null, "D", cx);
  // 3 patas
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 6; i++) L.set(Math.round(cx + s * (6.5 + i * 0.9)), 41 + i, "D");
    L.rect(Math.round(cx + s * 12.5) - 1, 47, 4, 2, "D"); L.rect(Math.round(cx + s * 12.5) - 1, 47, 4, 1, "N");
  }
  L.rect(15, 45, 2, 3, "D"); L.rect(14, 48, 4, 1, "N");
  return L.contorno();
}

const NAVE_GRANDE = dibujarNaveGrande();
const NAVE_PEQUENA = dibujarNavePequena();
const PALETA_NAVE = (franja, franjaOscura) => ({
  k: K, W: 0xe8ecf4, H: 0xffffff, M: 0xc2c3c7, G: 0x94b0c2, R: franja, S: franjaOscura,
  D: 0x333c57, N: 0x566c86, v: 0x29adff, c: 0xbff3ff, y: 0xfff27a
});


// ----------------------------------------------------------------- Chispa
const CHISPA = [
  ".....kk.....",
  ".....rr.....",
  ".....kk.....",
  "...kkkkkk...",
  "..kYYYYYYk..",
  ".kYYYYYYYYk.",
  ".kYkkkkkkYk.",
  ".kYkvvcvkYk.",
  ".kYkkkkkkYk.",
  ".kOYYYYYYOk.",
  "..kOOOOOOk..",
  "...kkkkkk...",
  "....c..c...."
];
const PALETA_CHISPA = { k: K, Y: 0xffcd75, O: 0xef7d57, r: 0xff5c5c, v: 0x5cff8a, c: 0xbff3ff };

// ----------------------------------------------------------------- iconos piso
const ICONO_TRAJE = [
  "..kkk..",
  ".kwwwk.",
  ".kvvck.",
  ".kkkkk.",
  "kwwwwwk",
  "kwkokwk",
  ".kwkwk.",
  ".kk.kk."
];
const ICONO_COHETE = [
  "...k...",
  "..kwk..",
  ".kwwwk.",
  ".kwvwk.",
  ".kwwwk.",
  "kkwwwkk",
  "krkrkrk",
  "..ooo..",
  "...o..."
];
const PALETA_ICONO = { k: K, w: 0xf4f4f4, v: 0x29adff, c: 0xbff3ff, o: 0xffa300, r: 0xff5c5c };


// ----------------------------------------------------------------- decorado
const CONO = [
  "...k...",
  "..kOk..",
  "..kWk..",
  ".kOOOk.",
  ".kWWWk.",
  "kOOOOOk",
  "kkkkkkk"
];
const BOTE = [
  ".kkkkkk.",
  "kMMMMMMk",
  "kkkkkkkk",
  ".kMNNMk.",
  ".kMNNMk.",
  ".kMNNMk.",
  ".kMNNMk.",
  ".kkkkkk."
];
const PLANTA = [
  "...g.....",
  "..gGg.g..",
  ".gGGgGGg.",
  "gGgGGGgGg",
  ".gGGGgGg.",
  "..gGgGg..",
  "...kGk...",
  "..kkkkk..",
  ".kCCCCCk.",
  ".kCcccCk.",
  ".kCCCCCk.",
  "..kCCCk..",
  "..kkkkk.."
];
const DRON = [
  "kkk.....kkk",
  ".k...k...k.",
  ".kkkkkkkkk.",
  "..kNNNNNk..",
  "..kNyNNvk..",
  "...kkkkk...",
  "....k.k...."
];
const PALETA_DECORADO = {
  k: K, O: 0xef7d57, W: 0xf4f4f4, M: 0x94b0c2, N: 0x566c86,
  g: 0x257179, G: 0x38b764, C: 0xbe7a4a, c: 0xe0a46a, y: 0xff5c5c, v: 0x29adff
};

// Crea todas las figuras de la escena Equipo
export function crearTexturasEquipo(escena) {
  Object.entries(COLORES_TRAJE).forEach(([id, colores]) => {
    ASTRO_PIERNAS.forEach((piernas, f) =>
      crearTextura(escena, `astro_${id}_${f}`, [...cuerpoDe(id), ...piernas], paletaAstro(colores, false, id)));
    // traje colgado: mismo dibujo con el casco vacío
    crearTextura(escena, `maniqui_${id}`, [...cuerpoDe(id), ...ASTRO_PIERNAS[0]], paletaAstro(colores, true, id));
  });
  crearTextura(escena, "nave_grande", NAVE_GRANDE, PALETA_NAVE(0xff5c5c, 0xb13e53));
  crearTextura(escena, "nave_pequena", NAVE_PEQUENA, PALETA_NAVE(0xffa300, 0xc4680a));
  crearTextura(escena, "chispa_px", CHISPA, PALETA_CHISPA);
  crearTextura(escena, "icono_traje", ICONO_TRAJE, PALETA_ICONO);
  crearTextura(escena, "icono_cohete", ICONO_COHETE, PALETA_ICONO);
  crearTextura(escena, "cono", CONO, PALETA_DECORADO);
  crearTextura(escena, "bote", BOTE, PALETA_DECORADO);
  crearTextura(escena, "planta", PLANTA, PALETA_DECORADO);
  crearTextura(escena, "dron", DRON, PALETA_DECORADO);
}