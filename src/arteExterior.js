// Dibujos del exterior de la estación (escena Exterior). Dueño: Rol 3.
// Lee: nada · Escribe: nada (crea texturas de Phaser).
// Mismo método que src/pixelart.js: mapas de letras, "." = transparente.
// Todo mira a la derecha. TODO(Rol 3): si se cambian por PNG, respetar tamaños.

const K = 0x1a1c2c;
const fila = (s, n) => s.padEnd(n, ".").slice(0, n);
const mapa = (n, filas) => filas.map(f => fila(f, n));

// Rover principal 40×16 (vista lateral). Las ruedas y el piloto van aparte.
// Caja de carga atrás, asiento, parabrisas, cofre, faro (Y) y luz trasera (r).
export const ROVER = mapa(40, [
  "..y",
  "..k",
  "..k..................kkk",
  ".kkkkkkkkkkkk........kcck",
  ".kMMMMMMMMMMk.........kck",
  ".kWWWWWWWWWWk.kk......kck",
  ".kyyyyyyyyyyk.kbk.....kck",
  ".kWWDWWWWDWWk.kbkssss.kck..kkkkkkkkk",
  ".kWWWWWWWWWWkkkbkkkkkkkkkkkWWWWWWWWWkk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkWWWWWWWWWWWYk",
  "kWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWYYk",
  "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbk",
  "rMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMk",
  ".kkkkNNNkkkkkkkkkkkkkkkkkkkkkNNNkkkkkkk",
  "......kNk.....................kNk",
  "......kNk.....................kNk"
]);
// Rueda grande 12×12 (el hueco del rin deja ver que gira)
export const RUEDA = [
  "....kkkk....",
  "..kkDDDDkk..",
  ".kDDNDDNDDk.",
  ".kDkkkkkkDk.",
  "kDNkMMMMkNDk",
  "kDDkMGkMkDDk",
  "kDDkMkGMkDDk",
  "kDNkMMMMkNDk",
  ".kDkkkkkkDk.",
  ".kDDNDDNDDk.",
  "..kkDDDDkk..",
  "....kkkk...."
];
// Astronauta sentado en el rover 9×10 (casco y hombros)
export const PILOTO = [
  "..kkkkk..",
  ".kWWWWWk.",
  "kWWkkkkkk",
  "kWkvvvcck",
  "kWkvvvvvk",
  "kWWkkkkkk",
  ".kWWWWWk.",
  ".kAACAAk.",
  "kAAAAAAAk",
  "kkkkkkkkk"
];
// Robot pequeño de carga 16×15
export const ROBOT_CARGA = [
  "....kkkkkkkk....",
  "....kOOyyOOk....",
  "....kOOyyOOk....",
  "..kkkkkkkkkkkk..",
  "..kWWWWWWWWWWk..",
  "..kWkkkkkkkWWk..",
  "..kWkcBBBckWWk..",
  "..kWkkkkkkkWWk..",
  "..kWWWWWWWWWWk..",
  "..kbbbbbbbbbbk..",
  "..kkkkkkkkkkkk..",
  ".kDDDDDDDDDDDDk.",
  "kDNkNNkNNkNNkNDk",
  "kDDDDDDDDDDDDDDk",
  ".kkkkkkkkkkkkkk."
];
// Vehículo científico 36×21: antena de plato, panel solar, taladro
export const VEHICULO_CIENCIA = mapa(36, [
  "...........................kkk",
  ".........................kkWWWk",
  "........................kWWWWk",
  ".........................kkkk",
  "...kkkkkkkkkkkkkk..........kk",
  "...kBcBBcBBcBBcBk..........kk",
  "...kkkkkkkkkkkkkk..........kk",
  ".........kk................kk",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "..kWWWWWWWWWWWWWWWWWWWWWWWWWWWkk",
  "..kWWkkkkkWWWWWWWWWWWWWkkkkkWWWk",
  "..kWWkcccckWWOOOOOOOWWWkcccckWWk",
  "..kWWkcccckWWWWWWWWWWWWkcccckWWk",
  "..kWWkkkkkWWWWWWWWWWWWWkkkkkWWWk",
  "..kOOOOOOOOOOOOOOOOOOOOOOOOOOOOk",
  "..kMMMMMMMMMMMMMMMMMMMMMMMMMMMMkkkk",
  "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkMMk",
  "...kNNk...kNNk...kNNk...kNNk....kGk",
  "..kDNNDk.kDNNDk.kDNNDk.kDNNDk...kGk",
  "..kDDDDk.kDDDDk.kDDDDk.kDDDDk...kYk",
  "...kkkk...kkkk...kkkk...kkkk.....k"
]);
// Baliza de navegación 5×16 (la luz que parpadea va encima, en la escena)
export const BALIZA = [
  ".kkk.", "kLLLk", "kLLLk", ".kkk.", "..k..", "..M..", "..y..", "..M..",
  "..M..", "..y..", "..M..", "..M..", "..M..", ".kMk.", "kNNNk", "kkkkk"
];
// Baliza de exploración 11×26 (el punto final)
export const BALIZA_GRANDE = [
  "...kkkkk...", "..kLLLLLk..", "..kLLLLLk..", "..kLLLLLk..", "...kkkkk...", "....kMk....",
  "...kyyyk...", "....kMk....", "....kMk....", "...kyyyk...", "....kMk....", "....kMk....",
  "...kyyyk...", "....kMk....", "....kMk....", "...kkMkk...", "..kWWWWWk..", "..kWbbbWk..",
  "..kWbcbWk..", "..kWbbbWk..", "..kWWWWWk..", ".kkkkkkkkk.", "kNNNNNNNNNk", "kDDDDDDDDDk",
  "kkkkkkkkkkk", "..........."
];
// Letrero con flecha 13×14
export const LETRERO = [
  "kkkkkkkkkkkkk", "kbbbbbbbbbbbk", "kbbbbbbybbbbk", "kbyyyyyyybbbk", "kbyyyyyyyybbk",
  "kbyyyyyyybbbk", "kbbbbbbybbbbk", "kbbbbbbbbbbbk", "kkkkkkkkkkkkk", "......k......",
  "......M......", "......M......", ".....kMk.....", "....kNNNk...."
];
// Rocas lunares (tres tamaños)
export const ROCAS = [
  ["....kkkkk.....", "..kkLLLMMkk...", ".kLLLMMMMMMk..", "kLLMMMMMMMDDk.", "kLMMMMMMDDDDDk", "kMMMMDDDDDDDDk", ".kDDDDDDDDDDk.", "..kkkkkkkkkk.."],
  ["...kkkk...", "..kLLMMk..", ".kLLMMMMk.", "kLMMMMMDDk", "kMMMDDDDDk", ".kkkkkkkk."],
  [".kkk..", "kLMMk.", "kMDDDk", ".kkkk."]
];
// Flecha de navegación del HUD 9×9 (apunta a la derecha; se gira)
export const FLECHA = [
  "....k....", "....kk...", "kkkkkyk..", "kyyyyyyk.", "kyyyyyyyk", "kyyyyyyk.", "kkkkkyk..", "....kk...", "....k...."
];

// Robot auxiliar de rescate 20×13 (ficticio, CoderWolf): gancho de remolque a la derecha
export const ROBOT_RESCATE = mapa(20, [
  ".....kk", ".....kr", "...kkkkkkkkk", "..kOOOOOOOOOk", "..kOkcckOOOOk..kkk", "..kOkcckOOOOkkkNNNk",
  "..kOOOOOOOOOkNNkkNk", "..kWWWWWWWWWk.k..yk", ".kkkkkkkkkkkkk...kk", "kDDDDDDDDDDDDDk",
  "kDNkNNkNNkNNkNDk", "kDDDDDDDDDDDDDDk", ".kkkkkkkkkkkkkk"
]);
// Letrero de peligro 9×14 (triángulo con "!")
export const AVISO = [
  "....k....", "...kyk...", "..kyyyk..", "..kykyk..", ".kyykyyk.", ".kyykyyk.", "kyyyyyyyk",
  "kyyykyyyk", "kkkkkkkkk", "....k....", "....M....", "....M....", "...kMk...", "..kNNNk.."
];

export const PALETA = {
  k: K, W: 0xe8ecf4, M: 0xc2c3c7, G: 0x94b0c2, N: 0x566c86, D: 0x333c57,
  b: 0x3b5dc9, B: 0x29adff, c: 0xbff3ff, y: 0xffcd75, Y: 0xfff27a, s: 0x29366f,
  r: 0xff5c5c, O: 0xef7d57, v: 0x29366f, A: 0x3b5dc9, C: 0xffcd75, L: 0x5d6274
};
const PALETA_ROCA = { k: K, L: 0xb4b6c4, M: 0x8b8e9e, D: 0x5d6070 };

export const DIBUJOS = {
  rover_cuerpo: [ROVER, PALETA], rover_rueda: [RUEDA, PALETA], rover_piloto: [PILOTO, PALETA],
  robot_carga: [ROBOT_CARGA, PALETA], vehiculo_ciencia: [VEHICULO_CIENCIA, PALETA],
  baliza: [BALIZA, PALETA], baliza_grande: [BALIZA_GRANDE, PALETA], letrero: [LETRERO, PALETA],
  roca_0: [ROCAS[0], PALETA_ROCA], roca_1: [ROCAS[1], PALETA_ROCA], roca_2: [ROCAS[2], PALETA_ROCA],
  flecha_nav: [FLECHA, PALETA], robot_rescate: [ROBOT_RESCATE, PALETA], aviso: [AVISO, PALETA]
};

// Piloto con los colores del traje elegido (A principal, C detalle).
// Devuelve la clave de la textura: rover_piloto_<id>.
export function crearPiloto(escena, colores, id) {
  const clave = `rover_piloto_${id}`;
  dibujar(escena, clave, PILOTO, colores ? { ...PALETA, A: colores.A, C: colores.C } : PALETA);
  return clave;
}

function dibujar(escena, clave, m, paleta) {
  if (escena.textures.exists(clave)) return;
  const t = escena.textures.createCanvas(clave, Math.max(...m.map(f => f.length)), m.length), ctx = t.getContext();
  m.forEach((f, y) => [...f].forEach((l, x) => {
    if (paleta[l] === undefined) return;
    ctx.fillStyle = "#" + paleta[l].toString(16).padStart(6, "0");
    ctx.fillRect(x, y, 1, 1);
  }));
  t.refresh();
}

export function crearTexturasExterior(escena) {
  Object.entries(DIBUJOS).forEach(([clave, [m, paleta]]) => {
    if (escena.textures.exists(clave)) return;
    const t = escena.textures.createCanvas(clave, Math.max(...m.map(f => f.length)), m.length), ctx = t.getContext();
    m.forEach((f, y) => [...f].forEach((l, x) => {
      if (paleta[l] === undefined) return;
      ctx.fillStyle = "#" + paleta[l].toString(16).padStart(6, "0");
      ctx.fillRect(x, y, 1, 1);
    }));
    t.refresh();
  });
}
