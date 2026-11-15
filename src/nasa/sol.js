// "El Sol de hoy": qué tormenta solar usa la partida. Dueño: Rol 4.
// Lee: datos.json (modelo, cme_historicas) y la consulta a DONKI ·
// Escribe: estado.datos.cme, estado.donkiEnVivo y (solo en este navegador) la última consulta buena.
//
// El juego NUNCA espera a la NASA:
//  1. Arranca al instante con un respaldo real: la última consulta buena
//     guardada en este navegador o, si no hay, una tormenta famosa de datos.json.
//  2. Consulta DONKI en segundo plano (máximo 8 s).
//  3. Si el dato llega antes de la Ruta (la primera escena que usa la tormenta),
//     la partida usa la nube real más reciente. Si llega después, se guarda para
//     la próxima partida: la tormenta no cambia a mitad del juego.
//  Si la NASA contesta pero no hubo nubes rápidas, el Sol "está tranquilo" y se
//  entrena con una tormenta real del pasado.
import { estado } from "../estado.js";
import { cmeReciente } from "./donki.js";

const CLAVE_GUARDADA = "stellas-ride-ultima-cme";   // dato público de la NASA, no es personal
const DIAS = 30;

// estado: "consultando" · "en_vivo" · "tranquilo" · "sin_red"
export const sol = { estado: "consultando", fijada: false, enVivo: null };

export function iniciarSol(sinRed) {
  const M = estado.datos.modelo;
  estado.donkiEnVivo = false;
  estado.datos.cme = guardada() || historica();
  sol.fijada = false;
  if (sinRed) { sol.estado = "sin_red"; return Promise.resolve(); }
  sol.estado = "consultando";
  return cmeReciente(DIAS, M.cme_min_kms ?? 0).then(r => {
    if (r.estado === "ok") {
      guardar(r.cme);
      sol.estado = "en_vivo";
      sol.enVivo = { ...r.cme, en_vivo: true };
      if (!sol.fijada) { estado.datos.cme = sol.enVivo; estado.donkiEnVivo = true; }
    } else if (r.estado === "tranquilo") {
      sol.estado = "tranquilo";
      if (!sol.fijada) estado.datos.cme = historica();
      if (r.mas) console.info(`[Sol] la nube más rápida del mes va a ${r.mas.velocidad_kms} km/s: el Sol está tranquilo`);
    } else sol.estado = "sin_red";
  });
}

// La escena que ya usó la tormenta (Ruta, Tormenta) la congela para el resto de la partida
export function fijarTormenta() { sol.fijada = true; }

// Al empezar otra partida (Equipo): si el dato en vivo llegó tarde, ahora sí se usa
export function soltarTormenta() {
  sol.fijada = false;
  if (sol.enVivo) { estado.datos.cme = sol.enVivo; estado.donkiEnVivo = true; }
}

// Velocidad que usa el modelo: la real, dentro de un rango jugable.
// (En pantalla siempre se muestra la velocidad real.)
export function velocidadDeJuego(datos) {
  const M = datos.modelo, v = datos.cme?.velocidad_kms || 1500;
  return Math.min(M.cme_max_juego_kms ?? Infinity, Math.max(M.cme_min_kms ?? 0, v));
}

// "2024-05-10" → "10 de mayo de 2024"
export function fechaLarga(iso) {
  const meses = estado.textos?.comun?.meses || [];
  const [a, m, d] = (iso || "").split("-").map(Number);
  return a && m && d && meses[m - 1] ? `${d} de ${meses[m - 1]} de ${a}` : iso || "";
}

// Tormenta famosa del pasado (todas con su fuente NASA en datos.json)
function historica() {
  const lista = (estado.datos.cme_historicas || []).filter(h => h.velocidad_kms);
  const h = lista[Math.floor(Math.random() * lista.length)] || estado.datos.cme;
  return { ...h, en_vivo: false };
}

// Última consulta buena de este navegador (puede faltar: ventana privada, sin permiso…)
function guardada() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_GUARDADA) || "null");
    if (g?.velocidad_kms && g.fecha) return { ...g, en_vivo: false };
  } catch { /* sin almacenamiento: se usa la tormenta famosa */ }
  return null;
}

function guardar(cme) {
  try { localStorage.setItem(CLAVE_GUARDADA, JSON.stringify({ ...cme, consultado: new Date().toISOString().slice(0, 10) })); }
  catch { /* sin almacenamiento: no pasa nada */ }
}
