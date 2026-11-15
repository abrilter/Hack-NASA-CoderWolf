// ===========================================================================
// MODELO DE SIMULACIÓN. Dueño: Rol 4.
// Calcula opciones y consecuencias con los datos reales + elecciones previas.
// Lee: estado y datos.json · Escribe: solo con aplicar() (recursos, con sus límites).
// Regla: ninguna opción gratis; los números NASA vienen de datos.json/DONKI.
// Los números de balance están en config.js (trajes, naves, mochila) y en
// datos.json → "modelo". Se verifican con pruebas/balance.html.
// ===========================================================================
import { LIMITES, LIMITE_RADIACION } from "../estado.js";
import { llenar } from "../ui.js";

const KM_SOL_TIERRA = 149_600_000;

// Horas que tarda la nube (CME) en llegar desde el Sol: distancia ÷ velocidad
export function horasDeLlegada(velocidadKms) {
  return KM_SOL_TIERRA / velocidadKms / 3600;
}

// Horas que faltan para la tormenta cuando ya aterrizaste: a la llegada de la
// CME se le restan las horas de vuelo de la nave (la grande es más lenta).
export function horasTormentaAlAterrizar(datos, estado) {
  return horasDeLlegada(datos.cme.velocidad_kms) - (estado.nave?.horasViaje ?? 0);
}

// Qué parte de la radiación se bloquea (0 = nada, 0.9 = casi todo)
export function proteccion(estado) {
  const traje = estado.traje?.proteccion || 0;
  const extra = estado.lleva("escudo") ? 0.2 : 0;           // objeto de la mochila
  return Math.min(0.9, (estado.escudo / 100) * 0.5 + traje + extra);
}

// Horas que tarda el rover en recorrer una ruta (más lento en lo oscuro sin linterna)
function tramo(ruta, datos, estado) {
  const oscuro = ruta.oscura && !estado.lleva("linterna");
  const horas = (ruta.km / datos.rover.kmh + ruta.subida_m / 500) * (oscuro ? datos.modelo.factor_oscuro : 1);
  return { horas, oscuro };
}

// Opciones de la escena Ruta: una por cada ruta de datos.json.
// Devuelve números (horas, efectos); los textos los arma la escena.
export function opcionesDeRuta(datos, estado) {
  const M = datos.modelo;
  const hT = horasTormentaAlAterrizar(datos, estado);
  const D = M.duracion_tormenta_h;
  const gastoO2 = estado.traje?.gastoO2 || 2;                // O2 por hora
  const dosisHora = datos.radiacion.dosis_juego_por_hora * (1 - proteccion(estado));

  const rutas = datos.rutas.map(r => {
    const { horas: hR, oscuro } = tramo(r, datos, estado);
    // solo cuenta el tiempo bajo la tormenta, y la tormenta dura D horas
    const expuesto = Math.min(D, Math.max(0, hR - hT));
    // parte_escena: la parte del camino que se juega en otra escena (el cráter
    // helado). Esa parte la cobra la escena; aquí solo se cobra el resto del
    // oxígeno. La radiación usa el tiempo completo: las horas afuera son reales.
    const parteEscena = r.parte_escena || 0;
    return {
      id: r.id, nombre: r.nombre, km: r.km, hR, hT, expuesto, oscuro, parteEscena,
      efectos: {
        oxigeno: -Math.round((hR * gastoO2 + r.subida_m / 100) * (1 - parteEscena)),
        radiacion: Math.round(expuesto * dosisHora)
      }
    };
  });

  return rutas;
}

// ---------------------------------------------------------------- tormenta
// Fuerza de la tormenta (puntos de radiación por hora sin protección): la dosis
// de juego, más fuerte si la nube (CME) de DONKI viene más rápida.
export function fuerzaTormenta(datos) {
  const T = datos.tormenta, v = datos.cme?.velocidad_kms || T.vel_referencia_kms;
  return datos.radiacion.dosis_juego_por_hora * Math.min(T.factor_max, Math.max(T.factor_min, v / T.vel_referencia_kms));
}

// ¿Sigue el rover? Lo deja la escena Rocas si el niño cruza a pie
// (estado.misiones.rocas.dejoRover). Si esa escena no se jugó, el rover sigue.
export const tieneRover = estado => estado.misiones?.rocas?.dejoRover !== true;

// Opciones de la escena Tormenta. Radiación = fuerza × horas × (1 − protección),
// donde la protección junta el refugio con el traje y el escudo.
export function opcionesTormenta(datos, estado) {
  const T = datos.tormenta, pP = proteccion(estado);
  const gasto = estado.traje?.gastoO2 || 2;
  // La Ruta ya cobró las horas que el niño pasó afuera bajo la tormenta: aquí
  // solo cuenta la parte de la tormenta que queda (para no cobrarla dos veces).
  const queda = parteRestanteTormenta(datos, estado);
  const f = fuerzaTormenta(datos) * queda;
  // Esperar en un refugio (saliente o rover) sin comida cansa más: se gasta más oxígeno.
  const sinComida = !estado.lleva("comida");
  return Object.entries(T.opciones).map(([id, o]) => {
    const pTotal = 1 - (1 - o.proteccion) * (1 - pP);
    const espera = o.horas_perdidas > 0, extraComida = espera && sinComida ? datos.modelo.sin_comida_o2 : 0;
    return {
      queda,
      id, disponible: id !== "rover" || tieneRover(estado),
      pRefugio: o.proteccion, pPersonal: pP, pTotal,
      horasPerdidas: o.horas_perdidas, tormentaPendiente: !!o.tormenta_pendiente, extraComida,
      efectos: {
        oxigeno: -Math.round((o.desvio_h + o.espera_h) * gasto * o.o2_factor) - extraComida,
        // durante el desvío no hay refugio; durante la espera, sí
        radiacion: Math.round(f * (o.desvio_h * (1 - pP) + o.espera_h * (1 - pTotal)))
      }
    };
  });
}

// Qué parte de la tormenta falta por vivir después de la Ruta (1 = toda).
// Horas que la ruta pasó bajo la tormenta = horas de la ruta − horas hasta que llegó,
// entre 0 y la duración de la tormenta. Nunca baja de un mínimo (el pico llega igual).
export function parteRestanteTormenta(datos, estado) {
  const r = estado.misiones?.ruta;
  if (!r?.horas) return 1;
  const D = datos.modelo.duracion_tormenta_h;
  const expuesto = Math.min(D, Math.max(0, r.horas - horasTormentaAlAterrizar(datos, estado)));
  return Math.max(datos.tormenta.parte_minima, 1 - expuesto / D);
}

// ---------------------------------------------------------------- rescate
// Decisiones del Rescate: el aire de Itzel y el regreso. Dependen de lo que
// queda de oxígeno y de cómo terminó la tormenta (estado.misiones.tormenta).
export function opcionesRescate(datos, estado) {
  const R = datos.rescate_aire, f = fuerzaTormenta(datos), pP = proteccion(estado), g = estado.traje?.gastoO2 || 2;
  const tor = estado.misiones?.tormenta || { horasPerdidas: 0, tormentaPendiente: false };
  const resto = tor.tormentaPendiente ? 1 : R.tormenta_residual;      // si la tormenta sigue, afuera hay más radiación
  const rad = h => Math.round(f * h * (1 - pP) * resto);
  return {
    aire: {
      // compartir el tanque: baja una parte de TU oxígeno, más si Itzel esperó mucho
      manguera: { efectos: { oxigeno: -Math.max(R.manguera_min, Math.round(estado.oxigeno * R.manguera_fraccion) + tor.horasPerdidas * R.itzel_por_hora_espera), radiacion: 0 } },
      // dejarle tu reserva y volver por otra: menos oxígeno, pero horas afuera
      reserva: { efectos: { oxigeno: -Math.round(R.reserva_o2 + R.reserva_horas * g), radiacion: rad(R.reserva_horas) } }
    },
    regreso: {
      rover: { disponible: tieneRover(estado), efectos: { oxigeno: -R.rover_o2, radiacion: rad(R.rover_horas) } },
      caminar: { efectos: { oxigeno: -Math.round(R.caminar_horas * g * R.caminar_dos), radiacion: rad(R.caminar_horas) } }
    }
  };
}

// Cuánto oxígeno cuesta más o menos cruzar el cráter helado (para avisarlo en
// la Ruta). Usa los mismos números que la escena CraterHelado: tiempo de cruce
// según la linterna × (gasto del traje + calefacción), más un poco por limpiar.
export function estimarCruceCrater(datos, estado) {
  const J = datos.crater_helado?.juego;
  if (!J) return 0;
  const vel = estado.lleva("linterna") ? J.vel_linterna : J.vel_sin_linterna;
  const segundos = J.largo_px / vel;
  const porSegundo = (estado.traje?.gastoO2 ?? 1.6) * J.o2_por_segundo_traje + J.o2_calefaccion;
  return Math.round(segundos * porSegundo * 1.15);
}

// ---------------------------------------------------------------- cierre de la misión
// Rescate: aire → reparar la radio → 2 de 3 mensajes → regreso. Las mismas
// funciones sirven para jugar y para el "¿Y si…?" del Final.
export const MENSAJES = ["tormenta", "ayuda", "hielo"];

// Reparar la radio: poco oxígeno con el kit de la mochila, más sin él
export const costoRadio = (datos, e) => ({ oxigeno: -(e.lleva("radio") ? datos.modelo.radio_con_kit_o2 : datos.modelo.radio_sin_kit_o2) });

// Regreso: el mensaje "vengan por nosotros" manda una nave de apoyo (gasta menos
// oxígeno); sin botiquín, Itzel agotada camina más despacio.
export function efectosRegreso(datos, e, id, mensajes = []) {
  const ef = opcionesRescate(datos, e).regreso[id].efectos;
  let oxigeno = ef.oxigeno;
  if (mensajes.includes("ayuda")) oxigeno = Math.round(oxigeno * datos.rescate_aire.ayuda_factor);
  if (!e.lleva("botiquin")) oxigeno -= datos.modelo.sin_botiquin_o2;
  return { oxigeno, radiacion: ef.radiacion };
}

// Copia del estado para recalcular sin tocar la partida real
export function copiaEstado(e, cambios = {}) {
  return {
    oxigeno: e.oxigeno, radiacion: e.radiacion, escudo: e.escudo, traje: e.traje, nave: e.nave,
    mochila: [...(e.mochila || [])], misiones: e.misiones || {}, ...cambios,
    lleva(id) { return this.mochila.includes(id); },
    cambiar(r, d) { const [mn, mx] = LIMITES[r] || [-Infinity, Infinity]; return (this[r] = Math.max(mn, Math.min(mx, (this[r] || 0) + d))); }
  };
}

// Juega el cierre completo desde antes de la decisión del aire
export function simularCierre(datos, inicio, { aire, mensajes, regreso }) {
  const e = copiaEstado(inicio);
  aplicar(e, opcionesRescate(datos, e).aire[aire].efectos);
  aplicar(e, costoRadio(datos, e));
  aplicar(e, efectosRegreso(datos, e, tieneRover(e) ? regreso : "caminar", mensajes));
  return e;
}

// Cuál de los cuatro finales: evacuación (sin oxígeno o con radiación al
// límite) o, si todos están a salvo, según los dos mensajes enviados.
export function finalDeMision(e, mensajes) {
  if (e.oxigeno <= 0 || e.radiacion >= LIMITE_RADIACION) return "evacuacion";
  if (!mensajes) return "completa";
  if (!mensajes.includes("tormenta")) return "sin_aviso";
  if (!mensajes.includes("hielo")) return "hielo_secreto";
  return "completa";
}

// Aplica los efectos de una decisión con los mismos límites para todos
// (estado.cambiar en estado.js). Ej.: aplicar(estado, { oxigeno: -10, escudo: 30 })
export function aplicar(estado, efectos) {
  for (const [recurso, delta] of Object.entries(efectos)) if (delta) estado.cambiar(recurso, delta);
}

// Frase de Chispa explicando el resultado (plantillas en textos.json → ruta)
export function explicar(op, t) {
  const n = x => Math.max(0, Math.round(x));
  let frase;
  if (op.expuesto <= 0) {
    frase = llenar(t.antes, { hT: n(op.hT), hR: n(op.hR), dif: n(op.hT - op.hR) });
  } else {
    frase = llenar(t.expuestos, { hT: n(op.hT), hR: n(op.hR), exp: n(op.expuesto) });
  }
  if (op.oscuro) frase += t.sin_linterna;
  return frase;
}
