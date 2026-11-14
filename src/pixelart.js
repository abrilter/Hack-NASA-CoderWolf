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
// El blindado cambia el torso: hombreras y placa en el pecho
const TORSO_BLINDADO = [
  ".kkkkCCCCCCkkkk.",
  "kBBBkAAAAAAkBBBk",
  ".kAAkACCCCAkAAk.",
  ".kBAkAAyrAAkABk.",
  ".kGGkBAAAABkGGk.",
  "..kkkCCCCCCkkk..",
  "....kBAAAABk...."
];
const cuerpoDe = id => id === "blindado" ? [...ASTRO_CUERPO.slice(0, 11), ...TORSO_BLINDADO] : ASTRO_CUERPO;

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
  blindado: { A: 0x8a93b8, B: 0x566c86, C: 0xff8a5c, P: 0x333c57, G: 0x566c86, D: 0x29366f },
  ligero:   { A: 0xf4f4f4, B: 0xc2c3c7, C: 0xffa300, P: 0x94b0c2, G: 0xffa300, D: 0x566c86 }
};

function paletaAstro(colores, visorVacio = false) {
  return {
    k: K, ...colores,
    v: visorVacio ? 0x1a1c2c : 0x1d2b53,
    c: visorVacio ? 0x333c57 : 0x7ee6ff,
    y: 0x5cff8a, r: 0xff5c5c
  };
}

// ----------------------------------------------------------------- naves
const NAVE_GRANDE = [
  "..............kkk",
  ".............kRRk",
  "............kRRRk",
  "...........kRRRRk",
  "..........kkkkkkkkkkkkkkkkkkkkkkk",
  ".........kWWWWWWWWWWWWWWWWWWWWWWWkk",
  "........kWWWWWWWWWWWWWWWWWWWWWWWWWWkk",
  "..kkk..kWWWWWWWWWWWWWWWWWWWWWWWWWkkkkk",
  ".kDDDkkWWkvvkWWkvvkWWkvvkWWWWWWWkVVVVVkk",
  ".kDDDkWWWkvckWWkvckWWkvckWWWWWWWkVVVVcVVk",
  ".kDDDkWWWWkkWWWWkkWWWWkkWWWWWWWWkVVVVVVVVk",
  ".kDDDkRRRRRRRRRRRRRRRRRRRRRRRRRRRkkkkkkkkWWk",
  ".kDDDkWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWk",
  "..kkkkGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGk",
  ".....kGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGkk",
  "......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "........kGk....................kGk",
  ".......kGk......................kGk",
  "......kGk........................kGk",
  ".....kkkk........................kkkk"
];
const NAVE_PEQUENA = [
  "....kkk",
  "....kRRk",
  "....kRRRkkkkkkkk",
  "..kkkRRWWWWWWWWWkkkk",
  ".kDDkWWWWWWWWWWWkVVcVkk",
  ".kDDkWWWWWWWWWWWkVVVVVVkk",
  ".kDDkRRRRRRRRRRRRkkkkkkkWWkk",
  ".kDDkWWWWWWWWWWWWWWWWWWWWWWWkk",
  "..kkkGGGGGGGGGGGGGGGGGGGGGGkk",
  "....kkkkkkkkkkkkkkkkkkkkkkk",
  "......kGk...........kGk",
  ".....kkkk..........kkkk"
];
const PALETA_NAVE = (franja) => ({
  k: K, W: 0xe8ecf4, G: 0x94b0c2, R: franja, D: 0x333c57, v: 0x29adff, c: 0xbff3ff, V: 0x29adff
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

// Crea todas las figuras de la escena Equipo
export function crearTexturasEquipo(escena) {
  Object.entries(COLORES_TRAJE).forEach(([id, colores]) => {
    ASTRO_PIERNAS.forEach((piernas, f) =>
      crearTextura(escena, `astro_${id}_${f}`, [...cuerpoDe(id), ...piernas], paletaAstro(colores)));
    // traje colgado: mismo dibujo con el casco vacío
    crearTextura(escena, `maniqui_${id}`, [...cuerpoDe(id), ...ASTRO_PIERNAS[0]], paletaAstro(colores, true));
  });
  crearTextura(escena, "nave_grande", NAVE_GRANDE, PALETA_NAVE(0xff5c5c));
  crearTextura(escena, "nave_pequena", NAVE_PEQUENA, PALETA_NAVE(0xffa300));
  crearTextura(escena, "chispa_px", CHISPA, PALETA_CHISPA);
  crearTextura(escena, "icono_traje", ICONO_TRAJE, PALETA_ICONO);
  crearTextura(escena, "icono_cohete", ICONO_COHETE, PALETA_ICONO);
}
