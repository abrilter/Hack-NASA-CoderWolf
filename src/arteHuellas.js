// Dibujos de la escena Huellas (vista desde arriba). Dueño: Rol 3.
// Lee: nada · Escribe: nada (crea texturas de Phaser).
// Mismo método que src/pixelart.js: mapas de letras, "." = transparente.
// Los rovers miran hacia arriba. TODO(Rol 3): si se cambian por PNG, respetar tamaños.
import { crearTextura } from "./pixelart.js";

const K = 0x1a1c2c;
const PALETA = {
  k: K, W: 0xe8ecf4, M: 0xc2c3c7, N: 0x566c86, D: 0x333c57, b: 0x3b5dc9,
  c: 0xbff3ff, y: 0xffcd75, O: 0xef7d57, o: 0xb05a3c, r: 0xff5c5c, P: 0xb18cff, p: 0x7a5cc9
};

// Nuestro rover visto desde arriba 12×16: ruedas delgadas, cabina azul
const ROVER = [
  "....kkkk....", "...kyWWyk...", "kk.kWWWWk.kk", "kNkkWccWkkNk", "kNkWWccWWkNk", "kk.kWWWWk.kk",
  "...kWbbWk...", "...kWbbWk...", "...kWbbWk...", "...kWWWWk...", "kk.kWWWWk.kk", "kNkkMMMMkkNk",
  "kNkkMMMMkkNk", "kk.kMMMMk.kk", "...krMMrk...", "....kkkk...."
];
// Rover de carga de la base 18×22: ruedas anchas, cajas encima
const CARGA = [
  ".....kkkkkkkk.....", "....kyOOOOOOyk....", "kkkkkOOOOOOOOkkkkk", "kDDNkOOccccOOkNDDk", "kDDNkOOccccOOkNDDk",
  "kDDNkOOOOOOOOkNDDk", "kkkkkOOOOOOOOkkkkk", "....kkkkkkkkkk....", "....kooookooook...",
  "....kooookooook...", "....kkkkkkkkkk....", "kkkkkoooookoook.kk", "kDDNkoooookoookkDk",
  "kDDNkkkkkkkkkkkkDk", "kDDNkOOOOOOOOkNDDk", "kkkkkOOOOOOOOkkkkk", "....kOOOOOOOOk....",
  "kkkkkOOOOOOOOkkkkk", "kDDNkOOOOOOOOkNDDk", "kDDNkOOOOOOOOkNDDk", "kkkkkrOOOOOOrkkkkk", ".....kkkkkkkk....."
];
// Guante de Itzel 7×7 (morado, con una "I" blanca)
const GUANTE = [
  ".k.k.k.", "kPkPkPk", "kPPPPPk", "kPPWPPk", "kpPWPpk", ".kpWpk.", "..kkk.."
];
// Piedritas 7×5
const PIEDRAS = ["..kk...", ".kMMk.k", ".kNNkkM", "k.kk.kN", "kM....."];

export function crearTexturasHuellas(escena) {
  crearTextura(escena, "huellas_rover", ROVER, PALETA);
  crearTextura(escena, "huellas_carga", CARGA, PALETA);
  crearTextura(escena, "huellas_guante", GUANTE, PALETA);
  crearTextura(escena, "huellas_piedras", PIEDRAS, PALETA);
}
